const COMMENT_BORDER_SIZE = 2
const COMMENT_MARGIN = 8
const YUI_LIB = 'http://localhost:8000/scripts/container-min.js'
const SYNC_LIB = 'http://localhost:8000/sync.js'
const ACCEPTED_ORIGINS = ['https://www.youtube.com', 'http://localhost:8000']

firstRun = true

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

function processHTMLNode(html, removeScripts = false, idPrefix = '') {
    newdoc = new DOMParser().parseFromString(html, 'text/html')
    if (removeScripts){
        while (newdoc.querySelector('script')){
            newdoc.querySelector('script').remove()
        }
    }
    if(idPrefix != ''){
        //get all elems with id and add yt- prefix
        newdoc.body.querySelectorAll('[id]').forEach(elem => {
            elem.id = idPrefix + "-" + elem.id
        })        
    }
    return newdoc
}

// if in manifest.json
async function getRemoteHTMLNode(file) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({type: 'getHTML', data: file}, async (html) => {
            resolve(html)
        }
    )})
}

function main() {
    /*var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://unpkg.com/react-player/dist/ReactPlayer.standalone.js';
    document.head.appendChild(script);*/

    //TODO test on youtube.com
    if(window.location == window.parent.location){
        if(!window.location.href.includes('youtube.com')){
            if(firstRun){
                initLocalhost()
            }
        } else {
            if(firstRun){
                initYouTubeParent()
            }
        }
    } else if (window.location != window.parent.location && window.location.href.includes('youtube.com')) {
        if(firstRun){
            initYouTube()
        }
    }
    firstRun = false

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

            if(window.location != window.parent.location){
                getRemoteHTMLNode('yt_new.htm').then(html => {
                    inputHTMLBody = processHTMLNode(html, true, 'yt');
                    document.body.insertAdjacentElement('beforeend', inputHTMLBody.body)
                    createYoutubeSettingsButton();
                    createYouTubeSettingsUIPane();
                })
            }
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



function initYouTube(){
    registerProxyHandler(ACCEPTED_ORIGINS)
}

function initYouTubeParent(){

}

function initLocalhost(){
    window.addEventListener("message", function(event) {
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

// function feedCurrentExtract(e = undefined){
//     //send msg to localhost window parent iframe to pause the video
//     let pauseMessage = {type: 'feedCurrentExtract'}
//     window.parent.postMessage(JSON.stringify(pauseMessage), 'http://localhost:8000')
// }

function createMenuItem(label) {
    const ytpPanelMenuItem = document.createElement('div')
    ytpPanelMenuItem.classList.add('ytp-menuitem')

    const ytpPanelMenuItemLabel = document.createElement('div')
    ytpPanelMenuItemLabel.classList.add('ytp-menuitem-label')
    ytpPanelMenuItemLabel.innerHTML = label

    const ytpPanelMenuItemContent = document.createElement('div')
    ytpPanelMenuItemContent.classList.add('ytp-menuitem-content')
    
    const ytpPanelMenuItemContentDiv = document.createElement('div')
    ytpPanelMenuItemContentDiv.classList.add('ytp-menuitem-content-div')

    ytpPanelMenuItemContent.append(ytpPanelMenuItemContentDiv)
    ytpPanelMenuItem.appendChild(ytpPanelMenuItemLabel)
    ytpPanelMenuItem.appendChild(ytpPanelMenuItemContent)

    return ytpPanelMenuItem
}

function createYouTubeSettingsUIPane(){
    const settingsPane = document.createElement('div')
    settingsPane.classList.add('ytp-popup')
    settingsPane.classList.add('ytp-settings-menu')
    settingsPane.style.display = ''
    settingsPane.style.width = '600px'
    settingsPane.style.height = '150px'
    settingsPane.id = 'ytp-supermemo-settings-pane'

    const ytpPanel = document.createElement('div')
    ytpPanel.classList.add('ytp-panel')

    const ytpPanelMenu = document.createElement('div')
    ytpPanelMenu.classList.add('ytp-panel-menu')

let elements = [
{id: "mark", onclick: function() {setAt('resume', 0, true);}},
{id: "resume", onclick: function() {goTo('resume');}},
{id: "resumevideoat", dblclick: function() {resetAt('resume');}, 
onfocus: function() {this.select();}, 
onchange: function() {this.value = convertDuration2HHMMSS(convertHHMMSS2Duration(this.value));}, 
onclick: function() {setAt('resume', 0, true);}, onscroll: function() {console.log('scroll');}},
{id: "restoreResumeAt", onclick: function() {resetAt('resume');}},
{id: "start", onclick: function() {setAt('start', 0, true);}},
{id: "goToStart", onclick: function() {goTo('start');}},
{id: "startvideoat", dblclick: function() {resetAt('start');this.select();}, 
onfocus: function() {this.select();}, 
onchange: function() {this.value = convertDuration2HHMMSS(convertHHMMSS2Duration(this.value));var that = this;imposeBoundaries(0, that);}, 
onclick: function() {setAt('start', 0, true);this.select();}},
{id: "restoreStartAt", onclick: function() {resetAt('start');}},
{id: "restoreStopAt", onclick: function() {resetAt('stop');}},
{id: "stopvideoat", dblclick: function() {resetAt('stop');}, 
onfocus: function() {this.select();}, 
onchange: function() {this.value = convertDuration2HHMMSS(convertHHMMSS2Duration(this.value));var that = this;imposeBoundaries(0, that);}, 
onclick: function() {setAt('stop', 0, true);this.select();}},
{id: "goToStop", onclick: function() {goTo('stop');}},
{id: "stop", onclick: function() {setAt('stop', 0, true);}},
{id: "test", onclick: function() {testExtract();}},
{id: "reset", onclick: function() {resetExtract();}},
{id: "extract", onclick: function() {addExtract(0);}},
{id: "extracts", onchange: function(){ feedCurrentExtract(); }, onclick: function(){ feedCurrentExtract(); }},
{id: "removeCurrentExtract", onclick: function(){ removeCurrentExtract(); }},
{id: "back", onclick: function(){ prevElement(); }},
{id: "learn", onclick: function(){ beginLearning(); }},
{id: "rep", onclick: function(){ nextRep(); }},
{id: "fwd", onclick: function(){ nextElement(); }},
{id: "dismiss", onclick: function(){ dismissElement(); }},
{id: "extractm5", onclick: function(){ addExtract(-5); }},
{id: "extract5", onclick: function(){ addExtract(5); }},
{id: "rewindResume", onclick: function(){ move('resume', 'rewind'); }},
{id: "rewindStart", onclick: function(){ move('start', 'rewind'); }},
{id: "rewindStop", onclick: function(){ move('stop', 'rewind'); }},
{id: "forwardResume", onclick: function(){ move('resume', 'forward'); }},
{id: "forwardStart", onclick: function(){ move('start', 'forward'); }},
{id: "forwardStop", onclick: function(){ move('stop', 'forward'); }}
];

    for (var i = 0; i < elements.length; i++) {
        var element = document.getElementById(elements[i].id) || document.getElementById("yt-" + elements[i].id);
        if (elements[i].onclick) element.onclick = elements[i].onclick;
        if (elements[i].dblclick) element.ondblclick = elements[i].dblclick;
        if (elements[i].onchange) element.onchange = elements[i].onchange;
        if (elements[i].onfocus) element.onfocus = elements[i].onfocus;
        if (elements[i].onscroll) element.onscroll = elements[i].onscroll;
        if (elements[i].onclick) element.onclick = elements[i].onclick;
    }

    let firstGroup = document.getElementsByClassName("ctrlGrp firstCtrlGrp")[0]
    let secondGroup = document.getElementsByClassName("ctrlGrp secondCtrlGrp")[0]

    // let firstGroupDirect = firstGroup.children[0].children[0]
    // let secondGroupDirect = secondGroup.children[0].children[0]

    //loop through second group and redefine all handlers as is
    let ytpExtractPanelMenuItem = createMenuItem('Extracts')
    let ytpMarkerPanelMenuItem = createMenuItem('Marker')
    let ytpClipPanelMenuItem = createMenuItem('Clip')

    ytpExtractPanelMenuItem.querySelector('.ytp-menuitem-content-div').appendChild(secondGroup.children[1])
    ytpMarkerPanelMenuItem.querySelector('.ytp-menuitem-content-div').appendChild(firstGroup.children[0])
    //append is move
    ytpClipPanelMenuItem.querySelector('.ytp-menuitem-content-div').appendChild(firstGroup.children[0])

    ytpPanelMenu.appendChild(ytpExtractPanelMenuItem)
    ytpPanelMenu.appendChild(ytpMarkerPanelMenuItem)
    ytpPanelMenu.appendChild(ytpClipPanelMenuItem)
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