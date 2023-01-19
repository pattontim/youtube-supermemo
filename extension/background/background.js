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
            fetchSuperMemoTimelineCommentsFromLocal(request)
                .then(sendResponse)
                .catch(e => {
                    console.error(e)
                }
            )
            return true
        }
    } 
});

async function fetchSuperMemoTimelineCommentsFromLocal(request){
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

