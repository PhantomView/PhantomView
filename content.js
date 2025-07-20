// Detect token/coin identifier from URL on BullX and Axiom (but don't auto-open overlay)
(function() {
  let tokenId = null;
  const url = window.location.href;
  if (url.includes('bullx.app/token/')) {
    tokenId = url.split('bullx.app/token/')[1].split(/[?#]/)[0];
  } else if (url.includes('app.axiom.xyz/token/')) {
    tokenId = url.split('app.axiom.xyz/token/')[1].split(/[?#]/)[0];
  }
  // Don't automatically send token or open overlay - wait for user action
  // if (tokenId) {
  //   chrome.runtime.sendMessage({ type: 'TOKEN_ID', tokenId });
  // }

  function injectChatOverlay(token = null, username = null, website = null) {
    try {
      if (!document.getElementById('phantomview-chat-iframe')) {
        const chatFrame = document.createElement('iframe');
        chatFrame.id = 'phantomview-chat-iframe';
        
        // Add token, username, and website as URL parameters if provided
        let overlayUrl = chrome.runtime.getURL('overlay.html');
        if (token) {
          overlayUrl += `?token=${encodeURIComponent(token)}`;
          if (username) {
            overlayUrl += `&username=${encodeURIComponent(username)}`;
          }
          if (website) {
            overlayUrl += `&website=${encodeURIComponent(website)}`;
          }
        }
        
        chatFrame.src = overlayUrl;
        chatFrame.style.position = 'fixed';
        chatFrame.style.bottom = '20px';
        chatFrame.style.right = '20px';
        chatFrame.style.width = '340px';
        chatFrame.style.height = '420px';
        chatFrame.style.zIndex = '999999';
        chatFrame.style.border = 'none';
        chatFrame.style.borderRadius = '10px';
        chatFrame.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        chatFrame.style.background = 'transparent';
        chatFrame.allow = 'clipboard-write;';
        chatFrame.style.resize = 'both';
        chatFrame.style.overflow = 'auto';
        chatFrame.style.pointerEvents = 'auto';
        chatFrame.setAttribute('data-pinned', 'false');
        document.body.appendChild(chatFrame);
        
        console.log('PhantomView overlay injected successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error injecting chat overlay:', error);
      return false;
    }
  }

  // Listen for messages from popup and background script
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    try {
      console.log('Content script received message:', msg);
      
      if (msg && msg.type === 'SHOW_OVERLAY') {
        const success = injectChatOverlay();
        sendResponse && sendResponse({ success: success });
      }
      
      if (msg && msg.type === 'OPEN_OVERLAY_WITH_TOKEN') {
        const success = injectChatOverlay(msg.token, msg.username, msg.website);
        sendResponse && sendResponse({ success: success });
      }
      
      // Always send a response to prevent connection errors
      if (!sendResponse) {
        sendResponse({ success: true });
      }
    } catch (error) {
      console.error('Error handling message in content script:', error);
      sendResponse && sendResponse({ success: false, error: error.message });
    }
    
    // Return true to indicate we will send a response asynchronously
    return true;
  });

  // Remove all code related to the old expand button (phantomview-expand-btn). Only use maximizeBtn.
  // --- Maximize button creation (only once) ---
  let maximizeBtn = document.getElementById('phantomview-maximize-btn');
  if (!maximizeBtn) {
    maximizeBtn = document.createElement('button');
    maximizeBtn.id = 'phantomview-maximize-btn';
    maximizeBtn.title = 'Maximize chat';
    maximizeBtn.style.position = 'fixed';
    maximizeBtn.style.bottom = '24px';
    maximizeBtn.style.right = '24px';
    maximizeBtn.style.width = '44px';
    maximizeBtn.style.height = '44px';
    maximizeBtn.style.borderRadius = '50%';
    maximizeBtn.style.zIndex = '100000';
    maximizeBtn.style.border = '1px solid #232323';
    maximizeBtn.style.background = '#181818';
    maximizeBtn.style.display = 'none';
    maximizeBtn.style.alignItems = 'center';
    maximizeBtn.style.justifyContent = 'center';
    maximizeBtn.style.cursor = 'pointer';
    maximizeBtn.style.boxShadow = '0 2px 8px #000a';
    maximizeBtn.innerHTML = '<img src="icons/white-empty-speech-bubble-free-png.png" alt="Maximize" style="width:28px;height:28px;display:block;margin:auto;">';
    document.body.appendChild(maximizeBtn);
    maximizeBtn.onclick = () => {
      const frame = document.getElementById('phantomview-chat-iframe');
      if (frame) {
        frame.style.display = 'block';
      }
      maximizeBtn.style.display = 'none';
      if (frame) {
        frame.style.transform = '';
        frame.style.left = '';
        frame.style.top = '';
        frame.style.right = '20px';
        frame.style.bottom = '20px';
      }
    };
  }

  let overlayPos = { x: null, y: null, left: null, top: null };
  let isDragging = false;

  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'phantomview-minimize') {
      const frame = document.getElementById('phantomview-chat-iframe');
      if (frame) frame.style.display = 'none';
      maximizeBtn.style.display = 'flex';
    } else if (event.data && event.data.type === 'phantomview-start-drag') {
      const frame = document.getElementById('phantomview-chat-iframe');
      isDragging = true;
      if (frame) {
        const rect = frame.getBoundingClientRect();
        overlayPos.left = rect.left;
        overlayPos.top = rect.top;
      }
      overlayPos.x = event.data.x;
      overlayPos.y = event.data.y;
    } else if (event.data && event.data.type === 'phantomview-drag' && isDragging) {
      const frame = document.getElementById('phantomview-chat-iframe');
      const dx = event.data.x - overlayPos.x;
      const dy = event.data.y - overlayPos.y;
      overlayPos.left += dx;
      overlayPos.top += dy;
      frame.style.right = 'auto';
      frame.style.bottom = 'auto';
      frame.style.left = '0px';
      frame.style.top = '0px';
      frame.style.transform = `translate(${overlayPos.left}px, ${overlayPos.top}px)`;
      overlayPos.x = event.data.x;
      overlayPos.y = event.data.y;
    } else if (event.data && event.data.type === 'phantomview-stop-drag') {
      isDragging = false;
    } else if (event.data && event.data.type === 'phantomview-resize') {
      const frame = document.getElementById('phantomview-chat-iframe');
      if (frame) {
        frame.style.width = event.data.width + 'px';
        frame.style.height = event.data.height + 'px';
      }
    } else if (event.data && event.data.type === 'phantomview-reset-position') {
      const frame = document.getElementById('phantomview-chat-iframe');
      if (frame) {
        frame.style.transform = '';
        frame.style.left = '';
        frame.style.top = '';
        frame.style.right = '20px';
        frame.style.bottom = '20px';
      }
    } else if (event.data && event.data.type === 'phantomview-close') {
      // Handle overlay close - remove the iframe
      const frame = document.getElementById('phantomview-chat-iframe');
      if (frame) {
        frame.remove();
        console.log('PhantomView overlay removed');
      }
      maximizeBtn.style.display = 'none';
    }
  });

  // Use MutationObserver to re-inject if removed
  const observer = new MutationObserver(() => {
    // Don't auto-inject overlay - only inject when explicitly requested
    // injectChatOverlay();
  });
  observer.observe(document.body, { childList: true, subtree: false });
  
  // Signal that content script is ready
  console.log('PhantomView content script loaded successfully');
})(); 