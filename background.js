let chatWindowId = null;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'phantomview_expand',
    title: 'Open PhantomView in Window',
    contexts: ['action', 'page'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'phantomview_expand') {
    // openOrFocusChatWindow(); // This line is removed
  }
});

chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === chatWindowId) {
    chatWindowId = null;
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('Background script received message:', msg);
  
  if (msg.type === 'OPEN_EXPANDED_WINDOW') {
    // openOrFocusChatWindow(); // This line is removed
    sendResponse && sendResponse({ success: true });
  }
  
  if (msg.type === 'OPEN_OVERLAY_WITH_TOKEN') {
    console.log('Attempting to open overlay with token:', msg.token, 'username:', msg.username, 'website:', msg.website);
    
    // Send message to content script to open overlay with specific token
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      console.log('Found tabs:', tabs);
      if (tabs[0]) {
        console.log('Target tab:', tabs[0].url);
        
        // Check if we can inject the content script first
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['content.js']
        }).then(() => {
          console.log('Content script injected successfully');
          // Now send the message
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'OPEN_OVERLAY_WITH_TOKEN',
            token: msg.token,
            username: msg.username,
            website: msg.website
          }).then((response) => {
            console.log('Message sent successfully, response:', response);
            sendResponse && sendResponse({ success: true });
          }).catch((error) => {
            console.error('Failed to send message to content script:', error);
            // Fallback: try to open overlay directly
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'SHOW_OVERLAY'
            }).catch((fallbackError) => {
              console.error('Fallback also failed:', fallbackError);
              sendResponse && sendResponse({ success: false, error: fallbackError.message });
            });
          });
        }).catch((error) => {
          console.error('Failed to inject content script:', error);
          sendResponse && sendResponse({ success: false, error: error.message });
        });
      } else {
        console.error('No active tab found');
        sendResponse && sendResponse({ success: false, error: 'No active tab found' });
      }
    });
    
    // Return true to indicate we will send a response asynchronously
    return true;
  }
}); 