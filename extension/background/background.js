import * as youtubei from './youtubei.js'

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type == 'fetchSuperMemoTimelineComments') {
        fetchSuperMemoTimelineComments()
            .then(sendResponse)
            .catch(e => {
                console.error(e)
            }
        )
        return true
    } else if (request.type == 'activateContext') {
        activateContext()
            .then(sendResponse)
            .catch(e => {
                console.error(e)
            }
        ) 
        return true
    } 
    // proxy getAtData requests between two content scripts
    else if (request.type == 'getAtData') {
        //TODO check if sender is youtube.com
        if(sender.url.includes("youtube.com")) {
            //getAtData to localhost content script
            requestFromLocal(request)
                .then(sendResponse)
                .catch(e => {
                    console.error(e)
                }
            )
            return true
        }
    } else if(request.type == 'getHTML'){
        //TODO check if sender is localhost
        if(sender.url.includes("localhost")) {
            getHTML(request.data)
                .then(sendResponse)
                .catch(e => {
                    console.error(e)
                }
            )
            return true
        }    
    } 
});

async function getHTML(path){
    return new Promise((resolve) => {
        let extPath = chrome.runtime.getURL(path)
        fetch(extPath)
            .then(response => response.text())
            .then(html => {
                resolve(html)
            }
        )
    })
}

async function requestFromLocal(request){
    return new Promise((resolve) => {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            let activeLocalTab = tabs.filter(tab => tab.url.includes("localhost"))[0];
            chrome.tabs.sendMessage(activeLocalTab.id, request, resolve);
        })
    })
}

async function activateContext(){
    return await youtubei.activateContext();
}

