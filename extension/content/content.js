const COMMENT_BORDER_SIZE = 2
const COMMENT_MARGIN = 8

main()

//TODO test
onLocationHrefChange(() => {
    removeTimelineBar()
    main()
    //TODO remove UI button and pane
})

async function waitForVideoDuration() {
    return new Promise((resolve) => {
        const interval = setInterval(() => {
            if (getVideo() && getVideo().duration) {
                clearInterval(interval);
                resolve()
            }
        }, 250)
    })
}

async function injectHTML(file, removeScripts = false) {
    console.log('injecting html from file: ' + file)
    const html = await fetch(/*chrome.runtime.getURL(file)*/file).then(async r => {
        fulldoc  = await r.text()
        newdoc = new DOMParser().parseFromString(fulldoc, 'text/html')
        if (removeScripts){
            while (newdoc.body.querySelector('script')){
                newdoc.body.querySelector('script').remove()
            }
        }
        body = newdoc.body        
        return body
    })
    document.body.insertAdjacentElement('beforeend', body)
}

function main() {
    /*var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://unpkg.com/react-player/dist/ReactPlayer.standalone.js';
    document.head.appendChild(script);*/

    if(window.location == window.parent.location){
        //debugger;
        window.addEventListener("message", function(event) {
            //permit all messages from localhost and youtube.com
            if (event.origin != "http://localhost:8000" || event.origin != "https://www.youtube.com") {
                return; 
            }
            debugger;
                
          }, false);
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.type == 'getAtData') {
                getAtData()
                    .then(sendResponse)
                    .catch(e => {
                        console.error(e)
                    }
                )
            }
        });
        // TODO use this
        //injectHTML('./yt_new.htm', true);
        return;
    }

    //TODO event listener for video loaded
    waitForVideoDuration().then(() => {
        const videoId = getVideoId()
        if (!videoId) {
            return
        }
        activateContext().then(() => {
            fetchSuperMemoAtData().then(atData => {
                let startTime = parseTimestamp(atData.startAt);
                startTLC = newTimelineComment(
                    { timestamp:atData.startAt, time:startTime, text:atData.startAt + " " + "Start"});
                let stopTime = parseTimestamp(atData.stopAt);
                stopTLC = newTimelineComment(
                    {timestamp:atData.stopAt, time:stopTime, text:atData.stopAt + " " + "Stop"});
                if (videoId !== getVideoId()) {
                    return;
                }
                showTimelineComments([startTLC, stopTLC])
            })
            createYoutubeSettingsButton();
            createYouTubeSettingsUIPane();
        })
    })
}

function getVideoId() {
    if (window.location.pathname == '/watch') {
        return parseParams(window.location.href)['v']
    } else if (window.location.pathname.startsWith('/yt_new.htm')) {
        return parseParams(window.location.href)['videoid']
    } else if (window.location.pathname.startsWith('/embed/')) {
        return window.location.pathname.substring('/embed/'.length)
    } else {
        return null
    }
}

function getVideo() {
    return document.querySelector('#movie_player video')
}

function newTimelineComment(tlc) {
    return {
        timestamp: tlc.timestamp,
        time: tlc.time,
        text: tlc.text
    }
}

async function activateContext(){
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({type: 'activateContext'}, resolve)
        }
    )
}

async function fetchSuperMemoAtData() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({type: 'getAtData'}, resolve)
    });
}


function showTimelineComments(timelineComments) {
    const tlBar = getOrCreateTimelineBar()
    if (!tlBar) {
        return
    }
    const videoDuration = getVideo().duration
    if (!videoDuration) {
        return
    }
    for (const tc of timelineComments) {
        if (tc.time > videoDuration) {
            continue
        }
        const stamp = document.createElement('div')
        stamp.classList.add('__youtube-timestamps__stamp')
        const offset = tc.time / videoDuration * 100
        stamp.style.left = `calc(${offset}% - 2px)`
        tlBar.appendChild(stamp)
        stamp.addEventListener('mouseenter', () => {
            showComment(tc)
        })
        stamp.addEventListener('mouseleave', () => {
            hideComment()
        })
    }
}

function getOrCreateTimelineBar() {
    let tlBar = document.querySelector('.__youtube-timestamps__timeline__bar')
    if (!tlBar) {
        let container = document.querySelector('#movie_player .ytp-timed-markers-container')
        if (!container) {
            container = document.querySelector('#movie_player .ytp-progress-list')
        }
        if (!container) {
            return null
        }
        tlBar = document.createElement('div')
        tlBar.classList.add('__youtube-timestamps__timeline__bar')
        container.appendChild(tlBar)
    }
    return tlBar
}

function removeTimelineBar() {
    const tlBar = document.querySelector('.__youtube-timestamps__timeline__bar')
    if (tlBar) {
        tlBar.remove()
    }
}

function getTooltip() {
    return document.querySelector('#movie_player .ytp-tooltip')
}

function enableYouTubePIPButton() {
    const button = document.querySelector('.ytp-pip-button')
    if (button) {
        button.style.display = ''
    }
}

function createYoutubeSettingsButton() {
    //add a new "Start/Sto" button to the left of the subtitle button on the youtube player
    const button = document.createElement('button')
    button.classList.add('ytp-button')
    button.classList.add('ytp-supermemo-button')

    const icon = document.createElement('div')
    icon.classList.add('ytp-button-icon')
    icon.classList.add('ytp-supermemo-button-icon')

    const iconImage = document.createElement('img')
    iconImage.src = chrome.runtime.getURL('icons/icon16.png')
    iconImage.classList.add('ytp-supermemo-button-icon')

    icon.appendChild(iconImage)
    button.appendChild(icon)

    button.addEventListener('click', () => {
        //toggle existing ytp settings menu
        let settingsDiv = document.getElementById('ytp-supermemo-settings-pane')
        if (settingsDiv) {
            //settingsDiv.style.display = settingsDiv.style.display === 'none' ? '' : 'none'
            if(settingsDiv.style.display === 'none'){
                settingsDiv.style.display = ''
                //send msg to localhost window parent iframe to pause the video
                let pauseMessage = {type: 'pausePlayer'}
                window.parent.postMessage(JSON.stringify(pauseMessage), 'http://localhost:8000')

                //activate the extract feature on the host
            }  else {
                settingsDiv.style.display = 'none'
                //send msg to localhost to resume the video
                let resumeMessage = {type: 'playPlayer'}
                window.parent.postMessage(JSON.stringify(resumeMessage), 'http://localhost:8000')
            }
        } else {
            //create new ytp settings menu
            // settingsDiv = document.createElement('div')
            // settingsDiv.classList.add('ytp-settings-menu')
            // settingsDiv.style.display = ''
            // const settingsPane = createYouTubeSettingsUIPane()
            // settingsDiv.appendChild(settingsPane)
        }
    })
    
    const buttonContainer = document.querySelector('.ytp-right-controls')
    buttonContainer.insertBefore(button, buttonContainer.firstChild)

    return button
}

function createYouTubeSettingsUIPane(){
    //craft another ytp-popup which when shown simply shows the textt "hello world"
    //this is the similar to the ytp-popup that is shown when you click the settings button
    const settingsPane = document.createElement('div')
    settingsPane.classList.add('ytp-popup')
    settingsPane.classList.add('ytp-settings-menu')
    settingsPane.style.display = ''
    settingsPane.style.width = '251px'
    settingsPane.style.height = '137px'
    settingsPane.id = 'ytp-supermemo-settings-pane'

    const ytpPanel = document.createElement('div')
    ytpPanel.classList.add('ytp-panel')

    const ytpPanelMenu = document.createElement('div')
    ytpPanelMenu.classList.add('ytp-panel-menu')

    const ytpPanelMenuItem = document.createElement('div')
    ytpPanelMenuItem.classList.add('ytp-menuitem')

    const ytpPanelMenuItemLabel = document.createElement('div')
    ytpPanelMenuItemLabel.classList.add('ytp-menuitem-label')
    ytpPanelMenuItemLabel.innerHTML = 'hello world'

    const ytpPanelMenuItemContent = document.createElement('div')
    ytpPanelMenuItemContent.classList.add('ytp-menuitem-content')

    ytpPanelMenuItem.appendChild(ytpPanelMenuItemLabel)
    ytpPanelMenuItem.appendChild(ytpPanelMenuItemContent)
    ytpPanelMenu.appendChild(ytpPanelMenuItem)
    ytpPanel.appendChild(ytpPanelMenu)
    settingsPane.appendChild(ytpPanel)

    //in html5-video-player, add this ytp-popup after
    let innerPlayer = document.getElementById('movie_player')
    innerPlayer.appendChild(settingsPane);

    return settingsPane
    //in the html5-video-player, 
}

function showComment(timelineComment) {
    const tooltip = getTooltip()
    if (!tooltip) {
        return
    }
    let comment_pane = getOrCreateCommentPane()
    if (!comment_pane) {
        return
    }
    comment_pane.style.display = ''
    const textNode = comment_pane.querySelector('.__youtube-timestamps__comment__pane__text')
    textNode.innerHTML = ''
    textNode.appendChild(highlightTimestamp(timelineComment.text, timelineComment.timestamp))

    const tooltipBgWidth = tooltip.querySelector('.ytp-tooltip-bg').style.width
    const commentWidth = tooltipBgWidth.endsWith('px') ? parseFloat(tooltipBgWidth) : 160
    comment_pane.style.width = (commentWidth + 2*COMMENT_BORDER_SIZE) + 'px'

    const halfCommentWidth = commentWidth / 2
    const playerRect = document.querySelector('#movie_player .ytp-progress-bar').getBoundingClientRect()
    const pivot = comment_pane.parentElement.getBoundingClientRect().left
    const minPivot = playerRect.left + halfCommentWidth
    const maxPivot = playerRect.right - halfCommentWidth
    let commentLeft
    if (pivot < minPivot) {
        commentLeft = playerRect.left - pivot
    } else if (pivot > maxPivot) {
        commentLeft = -commentWidth + (playerRect.right - pivot)
    } else {
        commentLeft = -halfCommentWidth
    }
    comment_pane.style.left = (commentLeft - COMMENT_BORDER_SIZE) + 'px'

    const textAboveVideoComment = tooltip.querySelector('.ytp-tooltip-edu')
    if (textAboveVideoComment) {
        comment_pane.style.bottom = (10 + textAboveVideoComment.clientHeight) + 'px'
    }

    const tooltipTop = tooltip.style.top
    if (tooltipTop.endsWith('px')) {
        let commentHeight = parseFloat(tooltipTop) - 2*COMMENT_MARGIN
        if (textAboveVideoComment) {
            commentHeight -= textAboveVideoComment.clientHeight
        }
        if (commentHeight > 0) {
            comment_pane.style.maxHeight = commentHeight + 'px'
        }
    }
}

function getOrCreateCommentPane() {
    const tooltip = getTooltip()
    if (!tooltip) {
        return
    }
    let comment_pane = tooltip.querySelector('.__youtube-timestamps__comment__pane')
    if (!comment_pane) {
        comment_pane = document.createElement('div')
        comment_pane.classList.add('__youtube-timestamps__comment__pane')
        const commentWrapper = document.createElement('div')
        commentWrapper.classList.add('__youtube-timestamps__comment__pane-wrapper')
        commentWrapper.appendChild(comment_pane)
        tooltip.insertAdjacentElement('afterbegin', commentWrapper)

        const nameElement = document.createElement('span')
        nameElement.classList.add('__youtube-timestamps__comment__pane__name')

        const textElement = document.createElement('div')
        textElement.classList.add('__youtube-timestamps__comment__pane__text')
        comment_pane.appendChild(textElement)
    }
    return comment_pane
}

function highlightTimestamp(text, fragment) {
    const para = document.createElement('p')
    //create a span 
    const span = document.createElement('span')
    span.classList.add('__youtube-timestamps__comment__pane__text-stamp')
    span.innerHTML = fragment
    para.innerHTML = text.replace(fragment, span.outerHTML)
    //para.innerHTML = text.replace(new RegExp(fragment, 'g'), '<span class="__youtube-timestamps__comment__pane__text-stamp">$&</span>')
    return para
}


function hideComment() {
    let comment_pane = document.querySelector('.__youtube-timestamps__comment__pane')
    if (comment_pane) {
        comment_pane.style.display = 'none'
    }
}

//SO: https://stackoverflow.com/a/3855394/
function parseParams(href) {
    const noHash = href.split('#')[0]
    const paramString = noHash.split('?')[1]
    const params = {}
    if (paramString) {
        const paramsArray = paramString.split('&')
        for (const kv of paramsArray) {
            const tmparr = kv.split('=')
            params[tmparr[0]] = tmparr[1]
        }
    }
    return params
}

function parseTimestamp(ts) {
    const parts = ts.split(':').reverse()
    const secs = parseInt(parts[0])
    if (secs > 59) {
        return null
    }
    const mins = parseInt(parts[1])
    if (mins > 59) {
        return null
    }
    const hours = parseInt(parts[2]) || 0
    return secs + (60 * mins) + (60 * 60 * hours)
}



function onLocationHrefChange(callback) {
    let currentHref = document.location.href
    const observer = new MutationObserver(() => {
        if (currentHref != document.location.href) {
            currentHref = document.location.href
            callback()
        }
    })
    observer.observe(document.querySelector("body"), {childList: true, subtree: true})
}

/* ========= localhost methods ======== */
async function getAtData(){
    startAt = this.document.getElementById('startvideoat').value;
    stopAt = this.document.getElementById('stopvideoat').value;
    return {startAt, stopAt};
}