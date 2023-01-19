chrome.webRequest.onBeforeSendHeaders.addListener(
    details => {
        /* EXPERIMENTAL (broken )
        for (var i = 0; i < details.requestHeaders.length; ++i) {
            if (details.requestHeaders[i].name === 'Origin')
                details.requestHeaders[i].value = 'https://www.youtube.com';
        } 
        return {requestHeaders: details.requestHeaders};    */
        const newRequestHeaders = details.requestHeaders.filter(header => {
            return header.name.toLowerCase() !== "origin"
        })
        return {requestHeaders: newRequestHeaders}
    },
    {urls: ["https://www.youtube.com/*", "https://localhost:8000/*"]},
    ["blocking", "requestHeaders", chrome.webRequest.OnBeforeSendHeadersOptions.EXTRA_HEADERS].filter(Boolean)
)

export async function activateContext(){
    return true
}
