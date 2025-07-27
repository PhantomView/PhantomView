// Debug script for PhantomView extension
console.log('PhantomView debug script loaded');

// Test if chrome API is available
if (typeof chrome !== 'undefined') {
    console.log('Chrome API is available');
    console.log('Extension ID:', chrome.runtime.id);
    
    // Test if background script is working
    chrome.runtime.sendMessage({action: 'test'}, function(response) {
        console.log('Background script response:', response);
    });
} else {
    console.log('Chrome API not available');
}

// Test window creation
function testWindowCreation() {
    if (typeof chrome !== 'undefined' && chrome.windows) {
        chrome.windows.create({
            url: 'popup.html',
            type: 'popup',
            width: 450,
            height: 600
        }, function(window) {
            console.log('Window created:', window);
        });
    } else {
        console.log('Windows API not available');
    }
}

// Export for testing
window.testWindowCreation = testWindowCreation;