// PhantomView Background Service Worker
console.log('PhantomView background service worker initialized');

// Import security module
importScripts('security.js');

// Global variables
let currentCA = null;
let currentUsername = null;

// Handle extension icon click to open window
chrome.action.onClicked.addListener(function(tab) {
    console.log('Extension icon clicked!');
    checkTradingSiteAndOpen(tab);
});

// Handle viewer count updates from content script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'updateViewerCount') {
        // Update viewer count in both header (if exists) and chatroom (if exists)
        const viewerCountElements = document.querySelectorAll('#viewer-count');
        viewerCountElements.forEach(element => {
            element.textContent = request.count.toString();
        });
    } else if (request.action === 'joinChatroom') {
        console.log('Join chatroom request received:', request);

        // Security validation
        const usernameValidation = phantomViewSecurity.validateUsername(request.username);
        if (!usernameValidation.valid) {
            sendResponse({ success: false, error: usernameValidation.error });
            phantomViewSecurity.logSecurityEvent('INVALID_USERNAME', { 
                username: request.username, 
                error: usernameValidation.error 
            });
            return true;
        }

        // Check if user is blocked
        if (phantomViewSecurity.isUserBlocked(usernameValidation.username)) {
            sendResponse({ success: false, error: 'User is blocked' });
            phantomViewSecurity.logSecurityEvent('BLOCKED_USER_ATTEMPT', { 
                username: usernameValidation.username 
            });
            return true;
        }

        // Get the tabId from the sender
        const tabId = sender.tab.id;
        console.log('Using tabId from sender:', tabId);

        // Send immediate response to prevent timeout
        sendResponse({ success: true, message: 'Processing join request...' });

        // Get current CA and coin name from content script
        chrome.tabs.sendMessage(tabId, {action: 'getCurrentCA'}, function(response) {
            console.log('CA response:', response);
            if (chrome.runtime.lastError) {
                console.error('Error getting CA:', chrome.runtime.lastError);
                return;
            }

            if (response && response.caAddress) {
                // Validate CA address
                const caValidation = phantomViewSecurity.validateCAAddress(response.caAddress);
                if (!caValidation.valid) {
                    console.error('Invalid CA address:', caValidation.error);
                    phantomViewSecurity.logSecurityEvent('INVALID_CA_ADDRESS', { 
                        caAddress: response.caAddress, 
                        error: caValidation.error 
                    });
                    return;
                }

                console.log('Opening chatroom with CA:', caValidation.caAddress);
                // Get coin name from the checkTradingSite response
                chrome.tabs.sendMessage(tabId, {action: 'checkTradingSite'}, function(tradingResponse) {
                    const coinName = tradingResponse && tradingResponse.coinName ? tradingResponse.coinName : null;
                    openChatroom(tabId, usernameValidation.username, caValidation.caAddress, coinName);
                });
            } else {
                console.error('No CA address received');
            }
        });
        
        return true; // Keep message channel open for async response
    }
});

// Function to check if user is on a trading site and open appropriate window
function checkTradingSiteAndOpen(tab) {
    console.log('Checking trading site for tab:', tab.url);
    
    // Check if the current tab is on a trading site
    chrome.tabs.sendMessage(tab.id, {action: 'checkTradingSite'}, function(response) {
        if (chrome.runtime.lastError) {
            console.log('Content script not available, opening normal popup');
            openNormalPopup(tab.id);
        } else if (response && response.isTradingSite) {
            if (response.isCAPage) {
                console.log('CA page detected, opening login popup');
                // Request current viewer count from content script
                chrome.tabs.sendMessage(tab.id, {action: 'getViewerCount'}, function(viewerResponse) {
                    if (viewerResponse && viewerResponse.count !== undefined) {
                        // Store the count to use when popup opens
                        window.currentViewerCount = viewerResponse.count;
                    }
                });
                openLoginPopup(tab.id);
            } else {
                console.log('Trading site detected, opening coin not found popup');
                openCoinNotFoundPopup(tab.id);
            }
        } else {
            console.log('Not a trading site, opening normal popup');
            openNormalPopup(tab.id);
        }
    });
}

// Function to open login popup for CA pages
function openLoginPopup(tabId) {
    console.log('Opening login popup for CA page');
    
    // Inject CSS for the login popup
    chrome.scripting.insertCSS({
        target: {tabId: tabId},
        css: `
            #phantomview-overlay {
                position: fixed !important;
                bottom: 20px !important;
                right: 20px !important;
                width: 320px !important;
                height: 210px !important;
                background: rgba(0, 0, 0, 0.6) !important;
                border-radius: 16px !important;
                z-index: 2147483647 !important;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7) !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                color: white !important;
                overflow: hidden !important;
                border: 2px solid rgba(255, 255, 255, 0.2) !important;
                pointer-events: auto !important;
                user-select: none !important;
                backdrop-filter: blur(10px) !important;
            }
            #phantomview-overlay * {
                box-sizing: border-box !important;
            }
            #phantomview-overlay:hover {
                box-shadow: 0 25px 70px rgba(0, 0, 0, 0.8) !important;
            }
            .phantomview-header {
                background: rgba(17, 17, 17, 0.6) !important;
                padding: 12px 20px !important;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                cursor: grab !important;
            }
            .phantomview-header.dragging {
                cursor: grabbing !important;
                transition: none !important;
            }
            .phantomview-input {
                background: rgba(255, 255, 255, 0.1) !important;
                border: 1px solid rgba(255, 255, 255, 0.2) !important;
                border-radius: 8px !important;
                padding: 12px 16px !important;
                color: white !important;
                font-size: 14px !important;
                width: 100% !important;
                margin-bottom: 15px !important;
            }
            .phantomview-input::placeholder {
                color: rgba(255, 255, 255, 0.6) !important;
            }
            .phantomview-button {
                background: rgba(255, 255, 255, 0.6) !important;
                border: none !important;
                border-radius: 8px !important;
                padding: 12px 24px !important;
                color: #000000 !important;
                font-weight: 600 !important;
                cursor: pointer !important;
                transition: all 0.2s !important;
                width: 100% !important;
            }
            .phantomview-button:hover {
                transform: translateY(-2px) !important;
                box-shadow: 0 8px 20px rgba(255, 255, 255, 0.3) !important;
            }
            @keyframes blink {
                0%, 50% { opacity: 1; }
                51%, 100% { opacity: 0.3; }
            }
        `
    });
    
    // Inject the login popup HTML
    chrome.scripting.executeScript({
        target: {tabId: tabId},
        func: function() {
            // Remove existing overlay if present
            const existingOverlay = document.getElementById('phantomview-overlay');
            if (existingOverlay) {
                existingOverlay.remove();
            }
            
            const overlay = document.createElement('div');
            overlay.id = 'phantomview-overlay';
            overlay.innerHTML = `
                <div class="phantomview-header">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <h1 style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px; margin: 0;">PhantomView</h1>
                        <div style="width: 28px; height: 28px; position: relative;">
                            <img src="${chrome.runtime.getURL('icons/PhantomViewtransparent.png')}" 
                                 style="width: 100%; height: 100%; object-fit: contain;" 
                                 alt="PhantomView">
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="animation: blink 2s infinite;">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="white"/>
                        </svg>
                        <span id="viewer-count" style="font-size: 14px; font-weight: 600; color: #ffffff;">0</span>
                    </div>
                    <button id="phantomview-close" style="background: none; border: none; color: #ffffff; font-size: 18px; cursor: pointer; padding: 4px; border-radius: 4px; transition: all 0.2s;">×</button>
                </div>
                
                <div style="padding: 20px; height: calc(100% - 65px); display: flex; flex-direction: column; justify-content: center; align-items: center;">
                    <div style="                margin-bottom: 15px; margin-top: 15px; width: 100%; max-width: 280px;">
                        <input type="text" id="phantomview-username" class="phantomview-input" placeholder="Enter username">
                        <button id="phantomview-join" class="phantomview-button">Join</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            
            // Add close functionality
            document.getElementById('phantomview-close').addEventListener('click', function() {
                document.getElementById('phantomview-overlay').remove();
            });
            
            // Add join functionality
            document.getElementById('phantomview-join').addEventListener('click', function() {
                const username = document.getElementById('phantomview-username').value.trim();
                console.log('Join button clicked, username:', username);
                
                if (username) {
                    // Send message to background script to handle the join
                    chrome.runtime.sendMessage({
                        action: 'joinChatroom',
                        username: username
                    });
                } else {
                    alert('Please enter a username');
                }
            });
            
            // Header-only draggable functionality
            let isDragging = false;
            let startX, startY;
            let startLeft, startTop;
            const header = overlay.querySelector('.phantomview-header');
            
            header.addEventListener('mousedown', function(e) {
                // Don't start dragging if clicking on interactive elements
                if (e.target.closest('#phantomview-close')) {
                    return;
                }
                
                isDragging = true;
                header.classList.add('dragging');
                
                // Get current position
                const rect = overlay.getBoundingClientRect();
                startX = e.clientX;
                startY = e.clientY;
                startLeft = rect.left;
                startTop = rect.top;
                
                // Remove bottom/right positioning
                overlay.style.bottom = 'auto';
                overlay.style.right = 'auto';
                overlay.style.left = startLeft + 'px';
                overlay.style.top = startTop + 'px';
            });
            
            document.addEventListener('mousemove', function(e) {
                if (!isDragging) return;
                
                e.preventDefault();
                
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                
                overlay.style.left = (startLeft + deltaX) + 'px';
                overlay.style.top = (startTop + deltaY) + 'px';
            });
            
            document.addEventListener('mouseup', function() {
                if (isDragging) {
                    isDragging = false;
                    header.classList.remove('dragging');
                }
            });
            
            // Prevent overlay from being removed when clicking outside
            // The overlay will stay persistent until manually closed
        }
    });
}

// Function to open normal popup as movable overlay
function openNormalPopup(tabId) {
    console.log('Opening normal popup as movable overlay');
    
    // Inject CSS for the movable overlay
    chrome.scripting.insertCSS({
        target: {tabId: tabId},
        css: `
            #phantomview-overlay {
                position: fixed !important;
                bottom: 20px !important;
                right: 20px !important;
                width: 320px !important;
                height: 450px !important;
                background: rgba(0, 0, 0, 0.6) !important;
                border-radius: 16px !important;
                z-index: 2147483647 !important;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7) !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                color: white !important;
                overflow: hidden !important;
                border: 2px solid rgba(255, 255, 255, 0.2) !important;
                pointer-events: auto !important;
                user-select: none !important;
                backdrop-filter: blur(10px) !important;
            }
            #phantomview-overlay * {
                box-sizing: border-box !important;
            }
            #phantomview-overlay:hover {
                box-shadow: 0 25px 70px rgba(0, 0, 0, 0.8) !important;
            }
            .phantomview-header {
                background: rgba(17, 17, 17, 0.6) !important;
                padding: 12px 20px !important;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                cursor: grab !important;
            }
            .phantomview-header.dragging {
                cursor: grabbing !important;
                transition: none !important;
            }
            .phantomview-input {
                background: rgba(255, 255, 255, 0.1) !important;
                border: 1px solid rgba(255, 255, 255, 0.2) !important;
                border-radius: 8px !important;
                padding: 12px 16px !important;
                color: white !important;
                font-size: 14px !important;
                width: 100% !important;
                margin-bottom: 15px !important;
            }
            .phantomview-input::placeholder {
                color: rgba(255, 255, 255, 0.6) !important;
            }
            .phantomview-button {
                background: rgba(255, 255, 255, 0.6) !important;
                border: none !important;
                border-radius: 8px !important;
                padding: 12px 24px !important;
                color: #000000 !important;
                font-weight: 600 !important;
                cursor: pointer !important;
                transition: all 0.2s !important;
                width: 100% !important;
            }
            .phantomview-button:hover {
                transform: translateY(-2px) !important;
                box-shadow: 0 8px 20px rgba(255, 255, 255, 0.3) !important;
            }
            .phantomview-stat {
                background: rgba(255, 255, 255, 0.05) !important;
                border-radius: 8px !important;
                padding: 12px !important;
                text-align: center !important;
                margin-bottom: 8px !important;
            }
            .phantomview-stat-value {
                font-size: 16px !important;
                font-weight: 700 !important;
                color: #ffffff !important;
            }
            .phantomview-stat-label {
                font-size: 11px !important;
                color: rgba(255, 255, 255, 0.7) !important;
                margin-top: 4px !important;
            }
        `
    });
    
    // Inject the movable overlay HTML
    chrome.scripting.executeScript({
        target: {tabId: tabId},
        func: function() {
            // Remove existing overlay if present
            const existingOverlay = document.getElementById('phantomview-overlay');
            if (existingOverlay) {
                existingOverlay.remove();
            }
            
            const overlay = document.createElement('div');
            overlay.id = 'phantomview-overlay';
            overlay.innerHTML = `
                <div class="phantomview-header">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <h1 style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px; margin: 0;">PhantomView</h1>
                        <div style="width: 28px; height: 28px; position: relative;">
                            <img src="${chrome.runtime.getURL('icons/PhantomViewtransparent.png')}" 
                                 style="width: 100%; height: 100%; object-fit: contain;" 
                                 alt="PhantomView">
                        </div>
                    </div>
                    <button id="phantomview-close" style="background: none; border: none; color: #ffffff; font-size: 18px; cursor: pointer; padding: 4px; border-radius: 4px; transition: all 0.2s;">×</button>
                </div>
                
                <div style="padding: 20px; height: calc(100% - 65px); display: flex; flex-direction: column;">
                    <div style="flex: 1; display: flex; flex-direction: column;">
                        <div style="margin-bottom: 10px;">
                            <input type="text" id="phantomview-username" class="phantomview-input" placeholder="Enter username">
                            <button id="phantomview-join" class="phantomview-button">Join Chat</button>
                        </div>
                        
                        <div style="flex: 1; display: flex; flex-direction: column; gap: 10px;">
                            <div class="phantomview-stat">
                                <div class="phantomview-stat-value" id="holders">2,847</div>
                                <div class="phantomview-stat-label">Holders</div>
                            </div>
                            <div class="phantomview-stat">
                                <div class="phantomview-stat-value" id="proTraders">127</div>
                                <div class="phantomview-stat-label">Pro Traders</div>
                            </div>
                            <div class="phantomview-stat">
                                <div class="phantomview-stat-value" id="insiders">12.5%</div>
                                <div class="phantomview-stat-label">Insiders</div>
                            </div>
                            <div class="phantomview-stat">
                                <div class="phantomview-stat-value" id="bundlers">87.3%</div>
                                <div class="phantomview-stat-label">Bundlers</div>
                            </div>
                        </div>
                        
                        <div style="margin-top: 12px; font-size: 10px; color: rgba(255, 255, 255, 0.6); text-align: center;">
                            Live Analytics
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            
            // Add close functionality
            document.getElementById('phantomview-close').addEventListener('click', function() {
                document.getElementById('phantomview-overlay').remove();
            });
            
            // Add join functionality
            document.getElementById('phantomview-join').addEventListener('click', function() {
                const username = document.getElementById('phantomview-username').value.trim();
                if (username) {
                    alert('Welcome to PhantomView, ' + username + '!');
                    // TODO: Connect to chat
                } else {
                    alert('Please enter a username');
                }
            });
            
            // Header-only draggable functionality
            let isDragging = false;
            let startX, startY;
            let startLeft, startTop;
            const header = overlay.querySelector('.phantomview-header');
            
            header.addEventListener('mousedown', function(e) {
                // Don't start dragging if clicking on interactive elements
                if (e.target.closest('#phantomview-close') || 
                    e.target.closest('#phantomview-join') || 
                    e.target.closest('#phantomview-username') ||
                    e.target.closest('.phantomview-input') ||
                    e.target.closest('.phantomview-button')) {
                    return;
                }
                
                isDragging = true;
                header.classList.add('dragging');
                
                // Get current position
                const rect = overlay.getBoundingClientRect();
                startX = e.clientX;
                startY = e.clientY;
                startLeft = rect.left;
                startTop = rect.top;
                
                // Remove bottom/right positioning
                overlay.style.bottom = 'auto';
                overlay.style.right = 'auto';
                overlay.style.left = startLeft + 'px';
                overlay.style.top = startTop + 'px';
            });
            
            document.addEventListener('mousemove', function(e) {
                if (!isDragging) return;
                
                e.preventDefault();
                
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                
                overlay.style.left = (startLeft + deltaX) + 'px';
                overlay.style.top = (startTop + deltaY) + 'px';
            });
            
            document.addEventListener('mouseup', function() {
                if (isDragging) {
                    isDragging = false;
                    header.classList.remove('dragging');
                }
            });
            
            // Prevent overlay from being removed when clicking outside
            // The overlay will stay persistent until manually closed
        }
    });
}

// Function to open coin not found popup as movable overlay
function openCoinNotFoundPopup(tabId) {
    console.log('Opening coin not found popup as movable overlay');
    
    // Inject CSS for the movable overlay
    chrome.scripting.insertCSS({
        target: {tabId: tabId},
        css: `
            #phantomview-overlay {
                position: fixed !important;
                bottom: 20px !important;
                right: 20px !important;
                width: 320px !important;
                height: 210px !important;
                background: rgba(0, 0, 0, 0.6) !important;
                border-radius: 16px !important;
                z-index: 2147483647 !important;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7) !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                color: white !important;
                overflow: hidden !important;
                border: 2px solid rgba(255, 255, 255, 0.2) !important;
                pointer-events: auto !important;
                user-select: none !important;
                backdrop-filter: blur(10px) !important;
            }
            #phantomview-overlay * {
                box-sizing: border-box !important;
            }
            #phantomview-overlay:hover {
                box-shadow: 0 25px 70px rgba(0, 0, 0, 0.8) !important;
            }
            .phantomview-header {
                background: rgba(17, 17, 17, 0.6) !important;
                padding: 12px 20px !important;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                cursor: grab !important;
            }
            .phantomview-header.dragging {
                cursor: grabbing !important;
                transition: none !important;
            }
        `
    });
    
    // Inject the movable overlay HTML
    chrome.scripting.executeScript({
        target: {tabId: tabId},
        func: function() {
            // Remove existing overlay if present
            const existingOverlay = document.getElementById('phantomview-overlay');
            if (existingOverlay) {
                existingOverlay.remove();
            }
            
            const overlay = document.createElement('div');
            overlay.id = 'phantomview-overlay';
            overlay.innerHTML = `
                <div class="phantomview-header">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <h1 style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px; margin: 0;">PhantomView</h1>
                        <div style="width: 28px; height: 28px; position: relative;">
                            <img src="${chrome.runtime.getURL('icons/PhantomViewtransparent.png')}" 
                                 style="width: 100%; height: 100%; object-fit: contain;" 
                                 alt="PhantomView">
                        </div>
                    </div>
                    <button id="phantomview-close" style="background: none; border: none; color: #ffffff; font-size: 18px; cursor: pointer; padding: 4px; border-radius: 4px; transition: all 0.2s;">×</button>
                </div>
                
                <div style="padding: 20px; height: calc(100% - 65px); display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 15px;">
                    <div style="display: flex; justify-content: center; align-items: center;">
                        <div style="width: 60px; height: 60px; background: rgba(239, 68, 68, 0.6); border-radius: 50%; display: flex; justify-content: center; align-items: center; box-shadow: 0 3px 15px rgba(239, 68, 68, 0.3); position: relative;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
                                <path d="M6 6L18 18M18 6L6 18" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                    </div>
                    <div style="font-size: 16px; font-weight: 600; color: #ffffff; text-align: center; letter-spacing: -0.3px;">
                        Coin not found
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            
            // Add close functionality
            document.getElementById('phantomview-close').addEventListener('click', function() {
                document.getElementById('phantomview-overlay').remove();
            });
            
            // Header-only draggable functionality
            let isDragging = false;
            let startX, startY;
            let startLeft, startTop;
            const header = overlay.querySelector('.phantomview-header');
            
            header.addEventListener('mousedown', function(e) {
                // Don't start dragging if clicking on interactive elements
                if (e.target.closest('#phantomview-close')) {
                    return;
                }
                
                isDragging = true;
                header.classList.add('dragging');
                
                // Get current position
                const rect = overlay.getBoundingClientRect();
                startX = e.clientX;
                startY = e.clientY;
                startLeft = rect.left;
                startTop = rect.top;
                
                // Remove bottom/right positioning
                overlay.style.bottom = 'auto';
                overlay.style.right = 'auto';
                overlay.style.left = startLeft + 'px';
                overlay.style.top = startTop + 'px';
            });
            
            document.addEventListener('mousemove', function(e) {
                if (!isDragging) return;
                
                e.preventDefault();
                
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                
                overlay.style.left = (startLeft + deltaX) + 'px';
                overlay.style.top = (startTop + deltaY) + 'px';
            });
            
            document.addEventListener('mouseup', function() {
                if (isDragging) {
                    isDragging = false;
                    header.classList.remove('dragging');
                }
            });
            
            // Prevent overlay from being removed when clicking outside
            // The overlay will stay persistent until manually closed
        }
    });
}

// Handle extension installation
chrome.runtime.onInstalled.addListener(function(details) {
    console.log('Extension installed/updated:', details);
    if (details.reason === 'install') {
        console.log('PhantomView extension installed');
        
        // Initialize default settings
        chrome.storage.local.set({
            'phantomview_settings': {
                'autoConnect': true,
                'notifications': true,
                'theme': 'dark'
            }
        }, function() {
            console.log('Default settings initialized');
        });
    }
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('Message received:', request);
    
    switch (request.action) {
        case 'test':
            console.log('Test message received');
            sendResponse({success: true, message: 'Background script is working'});
            break;
            
        case 'getAnalytics':
            // TODO: Fetch real-time Solana memecoin analytics
            sendResponse({
                success: true,
                data: {
                    holders: Math.floor(Math.random() * 5000) + 1000,
                    proTraders: Math.floor(Math.random() * 200) + 50,
                    insiders: (Math.random() * 20).toFixed(2) + '%',
                    bundlers: (Math.random() * 100).toFixed(2) + '%',
                    lpBurned: 'Active',
                    dexPaid: 'Confirmed'
                }
            });
            break;
            
        case 'connectChat':
            // TODO: Initialize WebSocket connection for chat
            sendResponse({
                success: true,
                message: 'Chat connection established'
            });
            break;
            
        default:
            sendResponse({
                success: false,
                error: 'Unknown action'
            });
    }
    
    return true; // Keep message channel open for async response
});

// Handle tab updates to inject content scripts when needed
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url) {
        // Check if we're on a Solana-related page
        if (tab.url.includes('solscan.io') || 
            tab.url.includes('solana.com') || 
            tab.url.includes('raydium.io') ||
            tab.url.includes('dexscreener.com')) {
            
            console.log('Solana-related page detected:', tab.url);
            
            // TODO: Inject analytics tracking for memecoin data
            chrome.tabs.sendMessage(tabId, {
                action: 'trackMemecoin',
                url: tab.url
            }).catch(() => {
                // Content script not ready yet, ignore
            });
        }
    }
});

// Periodic analytics update (every 30 seconds)
setInterval(() => {
    // TODO: Fetch latest memecoin analytics from APIs
    console.log('Updating PhantomView analytics...');
    
    // Simulate analytics update
    const mockData = {
        timestamp: Date.now(),
        holders: Math.floor(Math.random() * 5000) + 1000,
        proTraders: Math.floor(Math.random() * 200) + 50,
        insiders: (Math.random() * 20).toFixed(2) + '%',
        bundlers: (Math.random() * 100).toFixed(2) + '%'
    };
    
    // Store latest analytics
    chrome.storage.local.set({
        'phantomview_latest_analytics': mockData
    });
    
}, 30000);

// Function to open chatroom UI
function openChatroom(tabId, username, caAddress, coinName) {
    console.log('=== OPENING CHATROOM ===');
    console.log('Tab ID:', tabId);
    console.log('Username:', username);
    console.log('CA Address:', caAddress);
    console.log('Coin Name:', coinName);
    
    // Store current user info
    currentUsername = username;
    currentCA = caAddress;
    
    // Inject CSS for the chatroom
    chrome.scripting.insertCSS({
        target: {tabId: tabId},
        css: `
            #phantomview-overlay {
                position: fixed !important;
                bottom: 20px !important;
                right: 20px !important;
                width: 380px !important;
                height: 500px !important;
                background: rgba(0, 0, 0, 0.6) !important;
                border-radius: 16px !important;
                z-index: 2147483647 !important;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7) !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                color: white !important;
                overflow: hidden !important;
                border: 2px solid rgba(255, 255, 255, 0.2) !important;
                pointer-events: auto !important;
                user-select: none !important;
                backdrop-filter: blur(10px) !important;
            }
            #phantomview-overlay * {
                box-sizing: border-box !important;
            }
            .phantomview-header {
                background: rgba(17, 17, 17, 0.6) !important;
                padding: 12px 20px !important;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                cursor: grab !important;
            }
            .phantomview-header.dragging {
                cursor: grabbing !important;
                transition: none !important;
            }
            .chatroom-content {
                display: flex !important;
                flex-direction: column !important;
                height: calc(100% - 65px) !important;
            }
            .chatroom-header {
                background: rgba(17, 17, 17, 0.4) !important;
                padding: 12px 20px !important;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
            }
            .chatroom-messages {
                overflow-y: auto !important;
                flex: 1 1 0 !important;
                padding: 16px !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 12px !important;
                cursor: default !important;
            }
            .message {
                background: rgba(255, 255, 255, 0.1) !important;
                border-radius: 12px !important;
                padding: 8px 12px !important;
                max-width: 80% !important;
                word-wrap: break-word !important;
                position: relative !important;
            }
            .message.own {
                background: rgba(255, 255, 255, 0.1) !important;
                align-self: flex-end !important;
            }
            .message.other {
                background: rgba(255, 255, 255, 0.1) !important;
                align-self: flex-start !important;
            }
            .message-header {
                font-size: 12px !important;
                font-weight: 600 !important;
                margin-bottom: 4px !important;
                opacity: 0.8 !important;
            }
            .message-content {
                font-size: 14px !important;
                line-height: 1.4 !important;
                position: relative !important;
            }
            .message-reactions {
                position: absolute !important;
                background: rgba(17, 17, 17, 0.98) !important;
                border: 2px solid rgba(255, 255, 255, 0.3) !important;
                border-radius: 12px !important;
                padding: 8px !important;
                display: flex !important;
                gap: 8px !important;
                z-index: 2147483649 !important;
                backdrop-filter: blur(15px) !important;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5) !important;
                animation: fadeIn 0.2s ease-out !important;
                min-width: 120px !important;
                max-width: 200px !important;
                pointer-events: auto !important;
            }
            .message.own .message-reactions {
                top: -50px !important;
                right: 0 !important;
            }
            .message.other .message-reactions {
                top: -50px !important;
                left: 0 !important;
            }
            .message-persistent-reactions {
                position: absolute !important;
                top: -8px !important;
                display: flex !important;
                flex-direction: row !important;
                gap: 4px !important;
                z-index: 2147483648 !important;
            }
            .message.own .message-persistent-reactions {
                right: 100% !important;
                margin-right: -15px !important;
                justify-content: flex-end !important;
            }
            .message.other .message-persistent-reactions {
                left: 100% !important;
                margin-left: -15px !important;
                justify-content: flex-start !important;
            }
            .persistent-reaction {
                background: rgba(255, 255, 255, 0.1) !important;
                border: 1px solid rgba(255, 255, 255, 0.2) !important;
                border-radius: 12px !important;
                padding: 2px 6px !important;
                font-size: 10px !important;
                color: white !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                gap: 1px !important;
                cursor: pointer !important;
                transition: all 0.2s !important;
            }
            .persistent-reaction:hover {
                background: rgba(255, 255, 255, 0.2) !important;
                transform: scale(1.1) !important;
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .reaction-button {
                background: rgba(255, 255, 255, 0.1) !important;
                border: none !important;
                border-radius: 6px !important;
                padding: 6px 8px !important;
                color: white !important;
                font-size: 12px !important;
                cursor: pointer !important;
                transition: all 0.2s !important;
                display: flex !important;
                align-items: center !important;
                gap: 4px !important;
            }
            .reaction-button:hover {
                background: rgba(255, 255, 255, 0.2) !important;
                transform: scale(1.1) !important;
            }
            .reaction-count {
                font-size: 10px !important;
                opacity: 0.8 !important;
            }
            .chatroom-input {
                background: rgba(255, 255, 255, 0.1) !important;
                border: none !important;
                border-radius: 8px !important;
                padding: 12px 16px !important;
                color: white !important;
                font-size: 15px !important;
                width: 100% !important;
                outline: none !important;
                cursor: text !important;
            }
            .chatroom-input::placeholder {
                color: rgba(255, 255, 255, 0.6) !important;
            }
            .chatroom-input-section {
                padding: 16px !important;
                border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
                display: flex !important;
                gap: 8px !important;
            }
            .send-button {
                background: rgba(255, 255, 255, 0.6) !important;
                border: none !important;
                border-radius: 8px !important;
                padding: 12px 16px !important;
                color: #000000 !important;
                font-weight: 600 !important;
                cursor: pointer !important;
                transition: all 0.2s !important;
                white-space: nowrap !important;
            }
            .send-button:hover {
                background: rgba(255, 255, 255, 0.8) !important;
                transform: translateY(-2px) !important;
                box-shadow: 0 8px 20px rgba(255, 255, 255, 0.3) !important;
            }
            .online-users {
                background: rgba(17, 17, 17, 0.4) !important;
                padding: 8px 16px !important;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
                font-size: 12px !important;
                opacity: 0.8 !important;
            }
            #ca-address:hover {
                cursor: pointer !important;
                opacity: 1 !important;
            }
            .users-popup {
                position: absolute !important;
                top: 50px !important;
                left: 20px !important;
                right: 20px !important;
                background: rgba(17, 17, 17, 0.95) !important;
                border: 1px solid rgba(255, 255, 255, 0.2) !important;
                border-radius: 12px !important;
                padding: 16px !important;
                height: 300px !important;
                overflow-y: auto !important;
                z-index: 2147483648 !important;
                backdrop-filter: blur(10px) !important;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5) !important;
                cursor: grab !important;
            }
            .users-popup.dragging {
                cursor: grabbing !important;
                transition: none !important;
            }
            .users-popup-header {
                font-size: 14px !important;
                font-weight: 600 !important;
                margin-bottom: 12px !important;
                color: white !important;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
                padding-bottom: 8px !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                cursor: grab !important;
            }
            .users-popup-close {
                background: none !important;
                border: none !important;
                color: #ffffff !important;
                font-size: 16px !important;
                cursor: pointer !important;
                padding: 4px !important;
                border-radius: 4px !important;
                transition: all 0.2s !important;
                width: 24px !important;
                height: 24px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }
            .users-popup-close:hover {
                background: rgba(255, 255, 255, 0.1) !important;
            }
            .user-item {
                padding: 8px 12px !important;
                margin: 8px 0 !important;
                background: rgba(255, 255, 255, 0.1) !important;
                border-radius: 8px !important;
                font-size: 13px !important;
                color: white !important;
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
            }
            .user-item.current {
                background: rgba(59, 130, 246, 0.3) !important;
                border: 1px solid rgba(59, 130, 246, 0.5) !important;
            }
            .user-avatar {
                width: 20px !important;
                height: 20px !important;
                border-radius: 50% !important;
                background: linear-gradient(45deg, #667eea 0%, #764ba2 100%) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-size: 10px !important;
                font-weight: 600 !important;
                color: white !important;
            }
            @keyframes blink {
                0%, 50% { opacity: 1; }
                51%, 100% { opacity: 0.3; }
            }
        `
    });
    
    // Inject the chatroom HTML
    chrome.scripting.executeScript({
        target: {tabId: tabId},
        func: function(username, caAddress, coinName) {
            // Remove existing overlay if present
            const existingOverlay = document.getElementById('phantomview-overlay');
            if (existingOverlay) {
                existingOverlay.remove();
            }
            
            const overlay = document.createElement('div');
            overlay.id = 'phantomview-overlay';
            overlay.innerHTML = `
                <div class="phantomview-header">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <h1 style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px; margin: 0;">PhantomView</h1>
                        <div style="width: 28px; height: 28px; position: relative;">
                            <img src="${chrome.runtime.getURL('icons/PhantomViewtransparent.png')}" 
                                 style="width: 100%; height: 100%; object-fit: contain;" 
                                 alt="PhantomView">
                        </div>
                    </div>
                    <button id="phantomview-close" style="background: none; border: none; color: #ffffff; font-size: 18px; cursor: pointer; padding: 4px; border-radius: 4px; transition: all 0.2s;">×</button>
                </div>
                
                <div class="chatroom-content">
                    <div class="chatroom-header">
                        <div>
                            <div style="font-size: 16px; font-weight: 600;">$${coinName || caAddress.substring(0, 8) + '...' + caAddress.substring(caAddress.length - 8)}</div>
                            <div style="font-size: 12px; opacity: 0.7; cursor: pointer;" id="ca-address" title="Click to copy full CA address">CA: ${caAddress.substring(0, 8)}...${caAddress.substring(caAddress.length - 8)}</div>
                        </div>
                        <div style="font-size: 12px; opacity: 0.7;">Welcome, ${username}!</div>
                    </div>
                    
                    <div class="online-users" id="online-users-section" style="cursor: pointer;">
                        <span id="viewer-count">1</span> users online
                    </div>
                    
                    <div class="chatroom-messages" id="chat-messages">
                    </div>
                    
                    <div class="chatroom-input-section">
                        <input type="text" id="chat-input" class="chatroom-input" placeholder="Type your message..." maxlength="200">
                        <button id="send-button" class="send-button">Send</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            
            // Add close button functionality
            const closeButton = document.getElementById('phantomview-close');
            if (closeButton) {
                closeButton.addEventListener('click', function() {
                    console.log('Close button clicked - removing overlay');
                    
                    // Cleanup intervals when chatroom closes
                    if (window.messageInterval) {
                        clearInterval(window.messageInterval);
                        window.messageInterval = null;
                    }
                    if (window.cleanupInterval) {
                        clearInterval(window.cleanupInterval);
                        window.cleanupInterval = null;
                    }
                    if (window.reactionInterval) {
                        clearInterval(window.reactionInterval);
                        window.reactionInterval = null;
                    }
                    
                    overlay.remove();
                });
            }
            


            // Add click to copy official CA functionality
            const officialCAElement = document.getElementById('official-ca');
            if (officialCAElement) {
                officialCAElement.addEventListener('click', function() {
                    const caAddress = 'UcNEqoS1XDocaXs93YGLD4yMUfApTCyrrjVPWQXbonk';
                    navigator.clipboard.writeText(caAddress).then(function() {
                        // Show temporary feedback
                        const originalText = officialCAElement.textContent;
                        const originalColor = officialCAElement.style.color;
                        officialCAElement.textContent = 'CA copied!';
                        officialCAElement.style.color = '#10b981';
                        
                        setTimeout(function() {
                            officialCAElement.textContent = originalText;
                            officialCAElement.style.color = originalColor;
                        }, 1500);
                    }).catch(function(err) {
                        console.error('Failed to copy official CA address:', err);
                        // Fallback for older browsers
                        const textArea = document.createElement('textarea');
                        textArea.value = caAddress;
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                        
                        // Show feedback
                        const originalText = officialCAElement.textContent;
                        const originalColor = officialCAElement.style.color;
                        officialCAElement.textContent = 'CA copied!';
                        officialCAElement.style.color = '#10b981';
                        
                        setTimeout(function() {
                            officialCAElement.textContent = originalText;
                            officialCAElement.style.color = originalColor;
                        }, 1500);
                    });
                });
            }

            // Add click to copy CA address functionality (under token name)
            const caAddressElement = document.getElementById('ca-address');
            if (caAddressElement) {
                caAddressElement.addEventListener('click', function() {
                    navigator.clipboard.writeText(caAddress).then(function() {
                        // Show temporary feedback
                        const originalText = caAddressElement.textContent;
                        caAddressElement.textContent = 'CA copied!';
                        caAddressElement.style.opacity = '1';
                        caAddressElement.style.color = '#4CAF50';
                        
                        setTimeout(function() {
                            caAddressElement.textContent = originalText;
                            caAddressElement.style.opacity = '0.7';
                            caAddressElement.style.color = '';
                        }, 1500);
                    }).catch(function(err) {
                        console.error('Failed to copy CA address:', err);
                        // Fallback for older browsers
                        const textArea = document.createElement('textarea');
                        textArea.value = caAddress;
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                        
                        // Show feedback
                        const originalText = caAddressElement.textContent;
                        caAddressElement.textContent = 'CA copied!';
                        caAddressElement.style.opacity = '1';
                        caAddressElement.style.color = '#4CAF50';
                        
                        setTimeout(function() {
                            caAddressElement.textContent = originalText;
                            caAddressElement.style.opacity = '0.7';
                            caAddressElement.style.color = '';
                        }, 1500);
                    });
                });
            }



            // Add draggable functionality to the header
            let isDragging = false;
            let startX, startY;
            let startLeft, startTop;
            const header = overlay.querySelector('.phantomview-header');
            
            if (header) {
                header.addEventListener('mousedown', function(e) {
                    if (e.target.closest('#phantomview-close')) {
                        return;
                    }
                    
                    isDragging = true;
                    header.classList.add('dragging');
                    
                    const rect = overlay.getBoundingClientRect();
                    startX = e.clientX;
                    startY = e.clientY;
                    startLeft = rect.left;
                    startTop = rect.top;
                    
                    overlay.style.bottom = 'auto';
                    overlay.style.right = 'auto';
                    overlay.style.left = startLeft + 'px';
                    overlay.style.top = startTop + 'px';
                });
                
                document.addEventListener('mousemove', function(e) {
                    if (!isDragging) return;
                    
                    e.preventDefault();
                    
                    const deltaX = e.clientX - startX;
                    const deltaY = e.clientY - startY;
                    
                    overlay.style.left = (startLeft + deltaX) + 'px';
                    overlay.style.top = (startTop + deltaY) + 'px';
                });
                
                document.addEventListener('mouseup', function() {
                    if (isDragging) {
                        isDragging = false;
                        header.classList.remove('dragging');
                    }
                });
            }
            
            // Add send message functionality
            const chatInput = document.getElementById('chat-input');
            const sendButton = document.getElementById('send-button');
            const chatMessages = document.getElementById('chat-messages');
            
            // Chat protection variables
            let messageCount = 0;
            let lastMessageTime = 0;
            const SPAM_THRESHOLD = 5; // Max messages in 10 seconds
            const SPAM_WINDOW = 10000; // 10 seconds
            const MIN_MESSAGE_LENGTH = 1;
            const MAX_MESSAGE_LENGTH = 200;
            
            function containsLinks(text) {
                const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
                return urlPattern.test(text);
            }
            
            function containsSuspiciousContent(text) {
                const suspiciousPatterns = [
                    /(telegram|discord|twitter|t\.me|discord\.gg)/gi,
                    /(private|dm|message|contact)/gi,
                    /(wallet|seed|private key|mnemonic)/gi,
                    /(airdrop|free|claim|reward)/gi
                ];
                
                return suspiciousPatterns.some(pattern => pattern.test(text));
            }
            
            function isSpam() {
                const now = Date.now();
                if (now - lastMessageTime < SPAM_WINDOW) {
                    messageCount++;
                    if (messageCount > SPAM_THRESHOLD) {
                        return true;
                    }
                } else {
                    messageCount = 1;
                }
                lastMessageTime = now;
                return false;
            }
            
            function sanitizeMessage(message) {
                // Remove HTML tags
                message = message.replace(/<[^>]*>/g, '');
                // Remove script tags
                message = message.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
                // Remove excessive whitespace
                message = message.replace(/\s+/g, ' ').trim();
                return message;
            }
            
            function showWarning(message, duration = 3000) {
                const warningElement = document.createElement('div');
                warningElement.className = 'message other';
                warningElement.innerHTML = `
                    <div class="message-header">System</div>
                    <div class="message-content" style="color: #ff6b6b;">⚠️ ${message}</div>
                `;
                chatMessages.appendChild(warningElement);
                chatMessages.scrollTop = chatMessages.scrollHeight;
                
                // Remove warning after duration
                setTimeout(() => {
                    warningElement.remove();
                }, duration);
            }
            
            function sendMessage() {
                const rawMessage = chatInput.value.trim();
                
                // Check if message is empty
                if (!rawMessage) {
                    return;
                }
                
                // Clear input immediately for better UX
                chatInput.value = '';
                
                // Local security validation (since phantomViewSecurity isn't available in injected context)
                const messageValidation = validateMessageLocal(rawMessage, username);
                if (!messageValidation.valid) {
                    showWarning(messageValidation.error);
                    // Restore the message if validation failed
                    chatInput.value = rawMessage;
                    return;
                }
                
                // Send message to Firebase for real-time chat
                sendMessageToFirebase(messageValidation.message, username, caAddress);
                console.log('Message sent:', messageValidation.message);
            }
            
            // Local message validation function for injected script context
            function validateMessageLocal(message, userId) {
                if (!message || typeof message !== 'string') {
                    return { valid: false, error: 'Message is required' };
                }

                // Quick length check first
                if (message.length < 1) {
                    return { valid: false, error: 'Message cannot be empty' };
                }
                
                if (message.length > 200) {
                    return { valid: false, error: 'Message must be 200 characters or less' };
                }

                // Fast sanitization - only remove dangerous characters
                let sanitized = message.trim();
                sanitized = sanitized.replace(/[<>]/g, ''); // Remove potentially dangerous characters
                
                // Quick suspicious content check with optimized patterns
                const lowerInput = sanitized.toLowerCase();
                
                // Combined pattern for faster checking
                const suspiciousPattern = /(javascript:|on\w+\s*=|iframe|union|select|insert|update|delete|drop|create|alter|cmd|command|exec|system|shell|[;&|`$()]|\.\.\/|\.\.\\|telegram|discord|twitter|t\.me|discord\.gg|t\.co|airdrop|free|claim|reward|bonus|giveaway|click here|verify|confirm|claim now)/gi;
                
                if (suspiciousPattern.test(lowerInput)) {
                    return { valid: false, error: 'Message contains potentially unsafe content' };
                }
                
                // Quick spam check - only check for excessive repeated characters
                const repeatedChars = /(.)\1{5,}/; // 6+ repeated characters
                if (repeatedChars.test(sanitized)) {
                    return { valid: false, error: 'Message contains too many repeated characters' };
                }
                
                // Quick caps check - only for longer messages
                if (sanitized.length > 15) {
                    const capsRatio = (sanitized.match(/[A-Z]/g) || []).length / sanitized.length;
                    if (capsRatio > 0.8) { // Increased threshold for faster processing
                        return { valid: false, error: 'Message contains too many capital letters' };
                    }
                }
                
                // Quick link check
                if (lowerInput.includes('http') || lowerInput.includes('www.')) {
                    return { valid: false, error: 'Links are not allowed for safety' };
                }
                
                return { valid: true, message: sanitized };
            }
            
            // Reaction functionality
            function addReactionFunctionality(messageElement) {
                let reactionTimeout = null;
                let reactions = {
                    '❤️': 0,
                    '👍': 0,
                    '👎': 0
                };
                
                // Add hold event listener with better detection to the entire message bubble
                messageElement.addEventListener('mousedown', function(e) {
                    console.log('Mouse down on message bubble - starting hold timer', messageElement.dataset.messageKey);
                    reactionTimeout = setTimeout(() => {
                        console.log('Hold timer completed - showing reactions', messageElement.dataset.messageKey);
                        showReactions(messageElement, reactions);
                    }, 300); // 300ms hold (slightly longer for stability)
                });
                
                messageElement.addEventListener('mouseup', function(e) {
                    console.log('Mouse up on message bubble - clearing hold timer');
                    if (reactionTimeout) {
                        clearTimeout(reactionTimeout);
                        reactionTimeout = null;
                    }
                });
                
                messageElement.addEventListener('mouseleave', function(e) {
                    console.log('Mouse leave on message bubble - clearing hold timer');
                    if (reactionTimeout) {
                        clearTimeout(reactionTimeout);
                        reactionTimeout = null;
                    }
                });
                
                // Add touch events for mobile support
                messageElement.addEventListener('touchstart', function(e) {
                    console.log('Touch start on message bubble - starting hold timer');
                    reactionTimeout = setTimeout(() => {
                        console.log('Touch hold timer completed - showing reactions', messageElement.dataset.messageKey);
                        showReactions(messageElement, reactions);
                    }, 300); // 300ms hold (slightly longer for stability)
                });
                
                messageElement.addEventListener('touchend', function(e) {
                    console.log('Touch end on message bubble - clearing hold timer');
                    if (reactionTimeout) {
                        clearTimeout(reactionTimeout);
                        reactionTimeout = null;
                    }
                });
                
                // Prevent context menu on long press
                messageElement.addEventListener('contextmenu', function(e) {
                    e.preventDefault();
                });
            }
            
            function showReactions(messageElement, reactions) {
                console.log('Showing reactions popup for message');
                
                // Remove existing reactions
                const existingReactions = messageElement.querySelector('.message-reactions');
                if (existingReactions) {
                    existingReactions.remove();
                }
                
                // Get the message key to fetch current reaction counts
                const messageKey = messageElement.dataset.messageKey;
                const sanitizedCA = caAddress.replace(/[^A-Za-z0-9]/g, '');
                const reactionsRef = `${firebaseConfig.databaseURL}/chats/${sanitizedCA}/activeMessages/${messageKey}/reactions.json`;
                
                // Fetch current reaction counts from Firebase
                fetch(reactionsRef).then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    return response.json();
                }).then(currentReactions => {
                    console.log('Current reactions from Firebase:', currentReactions);
                    
                                         // Create reactions popup with current counts
                     const reactionsPopup = document.createElement('div');
                     reactionsPopup.className = 'message-reactions';
                     reactionsPopup.innerHTML = `
                         <button class="reaction-button" data-reaction="❤️">
                             ❤️ <span class="reaction-count">${currentReactions['❤️'] || 0}</span>
                         </button>
                         <button class="reaction-button" data-reaction="👍">
                             👍 <span class="reaction-count">${currentReactions['👍'] || 0}</span>
                         </button>
                         <button class="reaction-button" data-reaction="👎">
                             👎 <span class="reaction-count">${currentReactions['👎'] || 0}</span>
                         </button>
                     `;
                     
                     // Calculate position based on message size and position
                     const messageRect = messageElement.getBoundingClientRect();
                     const isOwnMessage = messageElement.classList.contains('own');
                     
                     // Simple positioning - popup will appear above the message
                     // The CSS handles the positioning automatically
                     
                     // Function to hide reactions
                     function hideReactions() {
                         if (reactionsPopup.parentNode) {
                             reactionsPopup.remove();
                             console.log('Reactions popup hidden');
                         }
                     }
                     
                     // Add click handlers for reactions
                     reactionsPopup.addEventListener('click', function(e) {
                         if (e.target.classList.contains('reaction-button')) {
                             const reaction = e.target.dataset.reaction;
                             
                             // Get the message key from the message element
                             const messageKey = messageElement.dataset.messageKey;
                             if (messageKey) {
                                 // Update reaction in Firebase
                                 updateMessageReaction(messageKey, reaction, caAddress);
                                 
                                 // Refresh all message reactions immediately and then again after a delay
                                 refreshAllMessageReactions();
                                 setTimeout(() => {
                                     refreshAllMessageReactions();
                                 }, 500);
                             }
                             
                             // Add visual feedback
                             e.target.style.background = 'rgba(59, 130, 246, 0.3)';
                             setTimeout(() => {
                                 e.target.style.background = '';
                             }, 200);
                             
                             console.log(`Reaction added: ${reaction} to message`);
                             
                             // Hide reactions after clicking a reaction
                             setTimeout(hideReactions, 300);
                         }
                     });
                     
                     // Add reactions to message
                     messageElement.appendChild(reactionsPopup);
                     console.log('Reactions popup added to message');
                     
                     // Add click-outside listener to hide reactions
                     setTimeout(() => {
                         document.addEventListener('click', function hideOnClickOutside(e) {
                             if (!reactionsPopup.contains(e.target) && !messageElement.contains(e.target)) {
                                 hideReactions();
                                 document.removeEventListener('click', hideOnClickOutside);
                             }
                         });
                     }, 200);
                 }).catch(error => {
                     console.error('Error fetching reaction counts:', error);
                 });
            }
            
            // Function to update message reactions in Firebase
            function updateMessageReaction(messageKey, reaction, caAddress) {
                // Validate reaction emoji
                const validReactions = ['❤️', '👍', '👎'];
                if (!validReactions.includes(reaction)) {
                    console.log('Invalid reaction attempted:', reaction);
                    return;
                }
                
                const sanitizedCA = caAddress.replace(/[^A-Za-z0-9]/g, '');
                const userReactionRef = `${firebaseConfig.databaseURL}/chats/${sanitizedCA}/activeMessages/${messageKey}/userReactions/${username}/${reaction}.json`;
                const totalReactionRef = `${firebaseConfig.databaseURL}/chats/${sanitizedCA}/activeMessages/${messageKey}/reactions/${reaction}.json`;
                const orderRef = `${firebaseConfig.databaseURL}/chats/${sanitizedCA}/activeMessages/${messageKey}/reactionOrder.json`;
                
                console.log('Updating reaction:', reaction, 'for message:', messageKey, 'by user:', username);
                
                // Check if current user has already reacted
                fetch(userReactionRef).then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    return response.json();
                }).then(userHasReacted => {
                    const hasReacted = userHasReacted === true;
                    
                    // Toggle user's reaction
                    const newUserReaction = !hasReacted;
                    
                    // Update user's reaction status
                    return fetch(userReactionRef, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newUserReaction)
                    }).then(response => {
                        if (response.ok) {
                            console.log(`User reaction ${reaction} updated to:`, newUserReaction);
                            
                            // Get current total count and update it
                            return fetch(totalReactionRef).then(response => {
                                if (!response.ok) {
                                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                                }
                                return response.json();
                            }).then(currentTotalCount => {
                                const totalCount = currentTotalCount || 0;
                                let newTotalCount;
                                
                                if (newUserReaction) {
                                    // User is adding reaction
                                    newTotalCount = totalCount + 1;
                                    console.log('Adding reaction, new total count will be:', newTotalCount);
                                } else {
                                    // User is removing reaction
                                    newTotalCount = totalCount - 1;
                                    console.log('Removing reaction, new total count will be:', newTotalCount);
                                }
                                
                                // Update total reaction count
                                return fetch(totalReactionRef, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(newTotalCount)
                                }).then(response => {
                                    if (response.ok) {
                                        console.log(`Total reaction ${reaction} count updated to: ${newTotalCount}`);
                                        
                                        // Update order: add if reaction count > 0, remove if reaction count becomes 0
                                        return fetch(orderRef).then(response => response.json()).then(orderData => {
                                            const order = orderData || [];
                                            
                                            if (newTotalCount > 0 && !order.includes(reaction)) {
                                                // Add to order if reaction count > 0 and not already in order
                                                order.push(reaction);
                                                return fetch(orderRef, {
                                                    method: 'PUT',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify(order)
                                                });
                                            } else if (newTotalCount === 0 && order.includes(reaction)) {
                                                // Remove from order if reaction count becomes 0
                                                const newOrder = order.filter(emoji => emoji !== reaction);
                                                return fetch(orderRef, {
                                                    method: 'PUT',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify(newOrder)
                                                });
                                            }
                                        });
                                    } else {
                                        console.error('Failed to update total reaction count:', response.status, response.statusText);
                                    }
                                    return response;
                                });
                            });
                        } else {
                            console.error('Failed to update user reaction:', response.status, response.statusText);
                        }
                        return response;
                    });
                }).catch(error => {
                    console.error('Error updating reaction:', error);
                });
            }
            
            // Function to refresh all message reactions
            function refreshAllMessageReactions() {
                console.log('Refreshing all message reactions...');
                const messages = document.querySelectorAll('.message');
                const sanitizedCA = caAddress.replace(/[^A-Za-z0-9]/g, '');
                
                messages.forEach(messageElement => {
                    const messageKey = messageElement.dataset.messageKey;
                    if (messageKey) {
                        const reactionsRef = `${firebaseConfig.databaseURL}/chats/${sanitizedCA}/activeMessages/${messageKey}/reactions.json`;
                        const orderRef = `${firebaseConfig.databaseURL}/chats/${sanitizedCA}/activeMessages/${messageKey}/reactionOrder.json`;
                        
                        // Fetch both reactions and order data in parallel
                        Promise.all([
                            fetch(reactionsRef).then(response => {
                                if (!response.ok) {
                                    throw new Error(`HTTP ${response.status}`);
                                }
                                return response.json();
                            }),
                            fetch(orderRef).then(response => response.json()).catch(() => [])
                        ]).then(([reactionsData, orderData]) => {
                            console.log('Refreshing reactions for message:', messageKey, 'Data:', reactionsData, 'Order:', orderData);
                            
                            if (reactionsData && typeof reactionsData === 'object' && Object.keys(reactionsData).length > 0) {
                                let reactionsHTML = '';
                                const order = orderData || [];
                                
                                // Display reactions in chronological order (first added stays on left, new ones to the right)
                                order.forEach(emoji => {
                                    const count = reactionsData[emoji];
                                    if (count > 0) {
                                        reactionsHTML += `<div class="persistent-reaction">${emoji}</div>`;
                                    }
                                });
                                
                                // If no order data or empty order, fallback to original order
                                if (reactionsHTML === '' && order.length === 0) {
                                    const sortedReactions = Object.entries(reactionsData)
                                        .filter(([emoji, count]) => count > 0);
                                    
                                    sortedReactions.forEach(([emoji, count]) => {
                                        reactionsHTML += `<div class="persistent-reaction">${emoji}</div>`;
                                    });
                                }
                                
                                const persistentReactions = messageElement.querySelector('.message-persistent-reactions');
                                if (persistentReactions) {
                                    if (reactionsHTML) {
                                        persistentReactions.innerHTML = reactionsHTML;
                                        console.log('Updated persistent reactions for message:', messageKey, 'HTML:', reactionsHTML);
                                    } else {
                                        // Clear reactions if no active reactions
                                        persistentReactions.innerHTML = '';
                                        console.log('Cleared persistent reactions for message:', messageKey);
                                    }
                                }
                            }
                        }).catch(error => {
                            console.error('Error refreshing reactions for message:', messageKey, error);
                        });
                    }
                });
            }
            
            // Firebase chat functionality
            const firebaseConfig = {
                apiKey: "AIzaSyCZvGEWyk_bcw-G0Ath48GNDL9eNRvpugc",
                authDomain: "phantomview-339cd.firebaseapp.com",
                databaseURL: "https://phantomview-339cd-default-rtdb.firebaseio.com",
                projectId: "phantomview-339cd",
                storageBucket: "phantomview-339cd.firebasestorage.app",
                messagingSenderId: "845378171405",
                appId: "1:845378171405:web:4f2040047eb85dbd881b44"
            };
            
            function sendMessageToFirebase(message, username, caAddress) {
                const sanitizedCA = caAddress.replace(/[^A-Za-z0-9]/g, '');
                const presenceRef = `${firebaseConfig.databaseURL}/chats/${sanitizedCA}/activeMessages.json`;
                
                const messageData = {
                    username: username,
                    message: message,
                    timestamp: Date.now(),
                    reactions: {
                        '❤️': 0,
                        '👍': 0,
                        '👎': 0
                    }
                };
                
                // Store message temporarily for active users only
                fetch(presenceRef, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        [Date.now()]: messageData
                    })
                }).then(response => {
                    if (response.ok) {
                        console.log('Message broadcast to active users');
                    } else {
                        console.error('Failed to broadcast message:', response.status);
                        // Show warning if Firebase fails
                        showWarning('Failed to send message - please try again');
                    }
                }).catch(error => {
                    console.error('Error broadcasting message:', error);
                    // Show warning if Firebase fails
                    showWarning('Failed to send message - please try again');
                });
            }
            
            function listenForMessages(caAddress) {
                const sanitizedCA = caAddress.replace(/[^A-Za-z0-9]/g, '');
                const presenceRef = `${firebaseConfig.databaseURL}/chats/${sanitizedCA}/activeMessages.json`;
                
                // Poll for new messages every 500ms (reduced frequency for better performance)
                const messageInterval = setInterval(() => {
                    fetch(presenceRef).then(response => response.json()).then(data => {
                        if (data) {
                            // Filter out old messages (older than 5 minutes)
                            const now = Date.now();
                            const fiveMinutesAgo = now - (5 * 60 * 1000);
                            const activeMessages = {};
                            
                            Object.entries(data).forEach(([key, messageData]) => {
                                if (messageData.timestamp > fiveMinutesAgo) {
                                    activeMessages[key] = messageData;
                                }
                            });
                            
                            updateChatMessages(activeMessages, username);
                        }
                    }).catch(error => {
                        console.error('Error fetching active messages:', error);
                    });
                }, 500); // Increased from 100ms to 500ms
                
                // Cleanup old messages every 60 seconds (reduced frequency)
                const cleanupInterval = setInterval(() => {
                    fetch(presenceRef).then(response => response.json()).then(data => {
                        if (data) {
                            const now = Date.now();
                            const fiveMinutesAgo = now - (5 * 60 * 1000);
                            const activeMessages = {};
                            
                            Object.entries(data).forEach(([key, messageData]) => {
                                if (messageData.timestamp > fiveMinutesAgo) {
                                    activeMessages[key] = messageData;
                                }
                            });
                            
                            // Update with only active messages (removes old ones)
                            fetch(presenceRef, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify(activeMessages)
                            });
                        }
                    }).catch(error => {
                        console.error('Error cleaning up old messages:', error);
                    });
                }, 60000); // Increased from 30000ms to 60000ms
                
                // Poll for reaction updates every 3000ms (3 seconds) - much less frequent for better performance
                const reactionInterval = setInterval(() => {
                    refreshAllMessageReactions();
                }, 3000); // Increased from 1000ms to 3000ms
                
                // Store intervals for cleanup when chatroom closes
                window.messageInterval = messageInterval;
                window.cleanupInterval = cleanupInterval;
                window.reactionInterval = reactionInterval;
            }
            
            // Store last message keys to avoid re-rendering all messages
            let lastMessageKeys = [];

            function isUserAtBottom(element, threshold = 40) {
                return element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
            }

            function updateChatMessages(messagesData, currentUsername) {
                // Get all message keys (Firebase keys)
                const messageEntries = Object.entries(messagesData || {});
                // If nothing changed, do nothing
                const newKeys = messageEntries.map(([key]) => key);
                if (JSON.stringify(newKeys) === JSON.stringify(lastMessageKeys)) return;
                lastMessageKeys = newKeys;

                // Check if user is at the bottom before updating
                const shouldScroll = isUserAtBottom(chatMessages);

                // Remove only non-system messages
                const existingMessages = chatMessages.querySelectorAll('.message:not(.system)');
                existingMessages.forEach(msg => msg.remove());

                // Add messages from Firebase
                messageEntries.forEach(([key, messageData]) => {
                    if (messageData.username && messageData.message) {
                        const messageElement = document.createElement('div');
                        const isOwnMessage = messageData.username === currentUsername;
                        messageElement.className = `message ${isOwnMessage ? 'own' : 'other'}`;
                        // Set message key for reaction tracking
                        messageElement.dataset.messageKey = key;
                        
                        // Create message with empty reactions first (reactions will be updated separately)
                        messageElement.innerHTML = `
                            <div class="message-header">${messageData.username}</div>
                            <div class="message-content">${messageData.message}</div>
                            <div class="message-persistent-reactions"></div>
                        `;
                        addReactionFunctionality(messageElement);
                        chatMessages.appendChild(messageElement);
                    }
                });

                // Only scroll if user was at the bottom
                if (shouldScroll) {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            }
            
            // Start listening for messages
            listenForMessages(caAddress);
            
            sendButton.addEventListener('click', sendMessage);
            chatInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });
            
            // Focus on input
            chatInput.focus();
            
            // Add reaction functionality to existing messages
            const existingMessages = document.querySelectorAll('.message');
            existingMessages.forEach(message => {
                addReactionFunctionality(message);
            });
            
            // Add users popup functionality
            const onlineUsersSection = document.getElementById('online-users-section');
            let usersPopup = null;
            let isUsersPopupOpen = false;
            
            function createUsersPopup() {
                const popup = document.createElement('div');
                popup.className = 'users-popup';
                
                // Create user list HTML
                let userListHTML = '';
                let actualUserCount = 1; // Start with current user
                
                // Add all users from the global online users array
                if (window.onlineUsernames && window.onlineUsernames.length > 0) {
                    console.log('Adding users to popup:', window.onlineUsernames);
                    
                    // Remove duplicates and filter out current user from the array
                    const uniqueOtherUsers = [...new Set(window.onlineUsernames)].filter(user => user !== username);
                    console.log('Unique other users:', uniqueOtherUsers);
                    
                    // First, add the current user at the top
                    userListHTML += `
                        <div class="user-item current">
                            <div class="user-avatar">${username.charAt(0).toUpperCase()}</div>
                            <div>${username} (You)</div>
                        </div>
                    `;
                    
                    // Then add all other unique users
                    uniqueOtherUsers.forEach(user => {
                        console.log(`Adding other user: ${user}`);
                        userListHTML += `
                            <div class="user-item">
                                <div class="user-avatar">${user.charAt(0).toUpperCase()}</div>
                                <div>${user}</div>
                            </div>
                        `;
                        actualUserCount++; // Increment count for each additional user
                    });
                } else {
                    console.log('No online users data, showing fallback');
                    // Fallback to just showing current user if no data
                    userListHTML = `
                        <div class="user-item current">
                            <div class="user-avatar">${username.charAt(0).toUpperCase()}</div>
                            <div>${username} (You)</div>
                        </div>
                    `;
                }
                
                popup.innerHTML = `
                    <div class="users-popup-header">
                        <span>Online Users (${actualUserCount})</span>
                        <button class="users-popup-close" id="users-popup-close">×</button>
                    </div>
                    ${userListHTML}
                `;
                return popup;
            }
            
            function toggleUsersPopup() {
                if (isUsersPopupOpen) {
                    // Close popup
                    if (usersPopup) {
                        usersPopup.remove();
                        usersPopup = null;
                    }
                    isUsersPopupOpen = false;
                } else {
                    // Open popup
                    usersPopup = createUsersPopup();
                    const chatroomContent = document.querySelector('.chatroom-content');
                    chatroomContent.appendChild(usersPopup);
                    isUsersPopupOpen = true;
                    
                    // Add close button functionality using event delegation
                    usersPopup.addEventListener('click', function(e) {
                        if (e.target.id === 'users-popup-close') {
                            console.log('Users popup close button clicked');
                            usersPopup.remove();
                            usersPopup = null;
                            isUsersPopupOpen = false;
                        }
                    });
                    
                    // Add draggable functionality
                    let isDragging = false;
                    let startX, startY;
                    let startLeft, startTop;
                    const header = usersPopup.querySelector('.users-popup-header');
                    
                    header.addEventListener('mousedown', function(e) {
                        if (e.target.closest('#users-popup-close')) {
                            return;
                        }
                        
                        isDragging = true;
                        usersPopup.classList.add('dragging');
                        
                        const rect = usersPopup.getBoundingClientRect();
                        startX = e.clientX;
                        startY = e.clientY;
                        startLeft = rect.left;
                        startTop = rect.top;
                        
                        usersPopup.style.position = 'fixed';
                        usersPopup.style.left = startLeft + 'px';
                        usersPopup.style.top = startTop + 'px';
                        usersPopup.style.right = 'auto';
                    });
                    
                    document.addEventListener('mousemove', function(e) {
                        if (!isDragging) return;
                        
                        e.preventDefault();
                        
                        const deltaX = e.clientX - startX;
                        const deltaY = e.clientY - startY;
                        
                        usersPopup.style.left = (startLeft + deltaX) + 'px';
                        usersPopup.style.top = (startTop + deltaY) + 'px';
                    });
                    
                    document.addEventListener('mouseup', function() {
                        if (isDragging) {
                            isDragging = false;
                            usersPopup.classList.remove('dragging');
                        }
                    });
                    
                    // Close popup when clicking outside
                    setTimeout(() => {
                        document.addEventListener('click', function closePopup(e) {
                            if (!usersPopup.contains(e.target) && !onlineUsersSection.contains(e.target)) {
                                usersPopup.remove();
                                usersPopup = null;
                                isUsersPopupOpen = false;
                                document.removeEventListener('click', closePopup);
                            }
                        });
                    }, 100);
                }
            }
            
            if (onlineUsersSection) {
                onlineUsersSection.addEventListener('click', toggleUsersPopup);
            }
            
            // --- USER PRESENCE TRACKING ---
            function setUserOnline(username, caAddress) {
                const sanitizedCA = caAddress.replace(/[^A-Za-z0-9]/g, '');
                // Use a simple key for the username to avoid encoding issues
                const userKey = username.replace(/[^A-Za-z0-9]/g, '_');
                const userRef = `${firebaseConfig.databaseURL}/chats/${sanitizedCA}/onlineUsers/${userKey}.json`;
                console.log('Setting user online:', username, 'at:', userRef);
                fetch(userRef, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: username, timestamp: Date.now() })
                }).then(response => {
                    if (response.ok) {
                        console.log('User set online successfully:', username);
                    } else {
                        console.error('Failed to set user online:', response.status);
                    }
                }).catch(error => {
                    console.error('Error setting user online:', error);
                });
            }

            function setUserOffline(username, caAddress) {
                const sanitizedCA = caAddress.replace(/[^A-Za-z0-9]/g, '');
                // Use a simple key for the username to avoid encoding issues
                const userKey = username.replace(/[^A-Za-z0-9]/g, '_');
                const userRef = `${firebaseConfig.databaseURL}/chats/${sanitizedCA}/onlineUsers/${userKey}.json`;
                console.log('Setting user offline:', username, 'at:', userRef);
                fetch(userRef, { 
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' }
                }).then(response => {
                    if (response.ok) {
                        console.log('User set offline successfully:', username);
                    } else {
                        console.error('Failed to set user offline:', response.status);
                    }
                }).catch(error => {
                    console.error('Error setting user offline:', error);
                });
            }

            function pollOnlineUsers(caAddress, updateCallback) {
                const sanitizedCA = caAddress.replace(/[^A-Za-z0-9]/g, '');
                const usersRef = `${firebaseConfig.databaseURL}/chats/${sanitizedCA}/onlineUsers.json`;
                console.log('Starting to poll online users from:', usersRef);
                
                let lastUsernames = []; // Store last usernames to avoid unnecessary updates
                
                // Do an immediate fetch first
                fetch(usersRef).then(r => r.json()).then(data => {
                    console.log('Initial online users data:', data);
                    if (data) {
                        const usernames = Object.values(data).map(user => user.username).filter(Boolean);
                        console.log('Initial usernames:', usernames);
                        lastUsernames = usernames;
                        updateCallback(usernames);
                    } else {
                        console.log('No initial online users data');
                        lastUsernames = [];
                        updateCallback([]);
                    }
                }).catch(error => {
                    console.error('Error in initial fetch:', error);
                    lastUsernames = [];
                    updateCallback([]);
                });
                
                // Store the interval ID so we can clear it later
                const intervalId = setInterval(() => {
                    fetch(usersRef).then(r => r.json()).then(data => {
                        console.log('Online users data received:', data);
                        if (data) {
                            // Extract usernames from the user objects
                            const usernames = Object.values(data).map(user => user.username).filter(Boolean);
                            console.log('Extracted usernames:', usernames);
                            
                            // Only update if the usernames have actually changed
                            if (JSON.stringify(usernames.sort()) !== JSON.stringify(lastUsernames.sort())) {
                                console.log('Usernames changed, updating...');
                                lastUsernames = usernames;
                                updateCallback(usernames);
                            } else {
                                console.log('Usernames unchanged, skipping update');
                            }
                        } else {
                            console.log('No online users data');
                            if (lastUsernames.length > 0) {
                                lastUsernames = [];
                                updateCallback([]);
                            }
                        }
                    }).catch(error => {
                        console.error('Error polling online users:', error);
                        // Only update if we had users before
                        if (lastUsernames.length > 0) {
                            lastUsernames = [];
                            updateCallback([]);
                        }
                    });
                }, 3000); // Increased to 3 seconds to reduce flickering
                
                // Store the interval ID globally so we can clear it when needed
                window.onlineUsersPollingInterval = intervalId;
                
                // Return the interval ID for manual cleanup
                return intervalId;
            }

            // --- USERNAME VALIDATION ---
            function checkUsernameAvailability(username, caAddress, callback) {
                const sanitizedCA = caAddress.replace(/[^A-Za-z0-9]/g, '');
                const usersRef = `${firebaseConfig.databaseURL}/chats/${sanitizedCA}/onlineUsers.json`;
                
                fetch(usersRef).then(response => response.json()).then(data => {
                    if (data) {
                        // Check if username already exists
                        const existingUsernames = Object.values(data).map(user => user.username).filter(Boolean);
                        const isUsernameTaken = existingUsernames.includes(username);
                        callback(!isUsernameTaken);
                    } else {
                        // No users online, username is available
                        callback(true);
                    }
                }).catch(error => {
                    console.error('Error checking username availability:', error);
                    // If there's an error, allow the username (fail-safe)
                    callback(true);
                });
            }

            // --- INTEGRATE INTO CHATROOM UI ---
            checkUsernameAvailability(username, caAddress, function(isAvailable) {
                if (isAvailable) {
                    setUserOnline(username, caAddress);
                    
                    // Multiple cleanup mechanisms for when user leaves
                    function cleanupUser() {
                        console.log('Cleaning up user:', username);
                        setUserOffline(username, caAddress);
                        
                        // Clear the polling interval to stop updates
                        if (window.onlineUsersPollingInterval) {
                            console.log('Clearing online users polling interval');
                            clearInterval(window.onlineUsersPollingInterval);
                            window.onlineUsersPollingInterval = null;
                        }
                    }
                    
                    // Cleanup on page unload
                    window.addEventListener('beforeunload', cleanupUser);
                    
                    // Cleanup on page visibility change (user switches tabs)
                    document.addEventListener('visibilitychange', function() {
                        if (document.visibilityState === 'hidden') {
                            console.log('Page hidden, setting user offline');
                            setUserOffline(username, caAddress);
                        } else {
                            console.log('Page visible, setting user online');
                            setUserOnline(username, caAddress);
                            
                            // Restart polling if it was stopped
                            if (!window.onlineUsersPollingInterval) {
                                console.log('Restarting online users polling');
                                pollOnlineUsers(caAddress, function(usernames) {
                                    console.log('Online users received from Firebase:', usernames);
                                    window.onlineUsernames = usernames;
                                    const viewerCountElement = document.getElementById('viewer-count');
                                    if (viewerCountElement) {
                                        viewerCountElement.textContent = usernames.length;
                                    }
                                });
                            }
                        }
                    });
                    
                    // Cleanup on extension close button
                    const closeButton = document.getElementById('phantomview-close');
                    if (closeButton) {
                        const originalClick = closeButton.onclick;
                        closeButton.addEventListener('click', function(e) {
                            cleanupUser();
                            if (originalClick) originalClick.call(this, e);
                        });
                    }
                    
                    // Cleanup on window focus/blur
                    window.addEventListener('blur', function() {
                        console.log('Window lost focus, setting user offline');
                        setUserOffline(username, caAddress);
                    });
                    
                    window.addEventListener('focus', function() {
                        console.log('Window gained focus, setting user online');
                        setUserOnline(username, caAddress);
                    });
                    
                } else {
                    // Username is taken, show error and close chatroom
                    const errorMessage = document.createElement('div');
                    errorMessage.className = 'message other system';
                    errorMessage.innerHTML = `
                        <div class="message-header">System</div>
                        <div class="message-content" style="color: #ff6b6b;">⚠️ Username "${username}" is already taken. Please choose a different username.</div>
                    `;
                    const chatMessages = document.getElementById('chat-messages');
                    chatMessages.appendChild(errorMessage);
                    
                    // Close the chatroom after 3 seconds
                    setTimeout(() => {
                        const closeButton = document.getElementById('phantomview-close');
                        if (closeButton) {
                            closeButton.click();
                        }
                    }, 3000);
                    
                    return; // Don't continue with chatroom setup
                }
            });

            // Initialize global online users array and start polling (outside username validation)
            window.onlineUsernames = [username];
            
            // Start polling for online users immediately
            console.log('Starting initial polling for online users');
            const pollingInterval = pollOnlineUsers(caAddress, function(usernames) {
                console.log('Online users received from Firebase:', usernames);
                console.log('Setting window.onlineUsernames to:', usernames);
                window.onlineUsernames = usernames;
                
                // Calculate the actual viewer count (current user + other unique users)
                const uniqueOtherUsers = [...new Set(usernames)].filter(user => user !== username);
                const actualViewerCount = 1 + uniqueOtherUsers.length; // Current user + others
                
                // Update the online count in the UI
                const viewerCountElement = document.getElementById('viewer-count');
                if (viewerCountElement) {
                    viewerCountElement.textContent = actualViewerCount;
                    console.log('Updated viewer count to:', actualViewerCount);
                }
                
                // Debug: Log the current state
                console.log('Current online users array:', window.onlineUsernames);
                console.log('Unique other users:', uniqueOtherUsers);
                console.log('Actual viewer count:', actualViewerCount);
                console.log('Current viewer count element:', viewerCountElement);
            });

            // Send personal system message to the user when they join
            function sendPersonalSystemMessage() {
                const systemMessage = {
                    username: 'System',
                    message: 'Welcome to PhantomView, Official CA: UpDorZ5TkYPoXviYzYcC9SXMt6arT2caHm9epDbbonk',
                    timestamp: Date.now(),
                    type: 'system'
                };
                
                // Add the system message to the chat for this user only
                const chatMessages = document.getElementById('chat-messages');
                if (chatMessages) {
                    const messageElement = document.createElement('div');
                    messageElement.className = 'message other system';
                    messageElement.innerHTML = `
                        <div class="message-header">System</div>
                        <div class="message-content">Welcome to PhantomView, Official CA: <span id="official-ca" style="cursor: pointer; text-decoration: underline; color: #3B82F6;">UpDorZ5TkYPoXviYzYcC9SXMt6arT2caHm9epDbbonk</span></div>
                    `;
                    chatMessages.appendChild(messageElement);
                    
                    // Add click to copy functionality to the new system message
                    const officialCAElement = messageElement.querySelector('#official-ca');
                    if (officialCAElement) {
                        officialCAElement.addEventListener('click', function() {
                            const caAddress = 'UpDorZ5TkYPoXviYzYcC9SXMt6arT2caHm9epDbbonk';
                            navigator.clipboard.writeText(caAddress).then(function() {
                                // Show temporary feedback
                                const originalText = officialCAElement.textContent;
                                const originalColor = officialCAElement.style.color;
                                officialCAElement.textContent = 'CA copied!';
                                officialCAElement.style.color = '#10b981';
                                
                                setTimeout(function() {
                                    officialCAElement.textContent = originalText;
                                    officialCAElement.style.color = originalColor;
                                }, 1500);
                            }).catch(function(err) {
                                console.error('Failed to copy official CA address:', err);
                                // Fallback for older browsers
                                const textArea = document.createElement('textarea');
                                textArea.value = caAddress;
                                document.body.appendChild(textArea);
                                textArea.select();
                                document.execCommand('copy');
                                document.body.removeChild(textArea);
                                
                                // Show feedback
                                const originalText = officialCAElement.textContent;
                                const originalColor = officialCAElement.style.color;
                                officialCAElement.textContent = 'CA copied!';
                                officialCAElement.style.color = '#10b981';
                                
                                setTimeout(function() {
                                    officialCAElement.textContent = originalText;
                                    officialCAElement.style.color = originalColor;
                                }, 1500);
                            });
                        });
                    }
                    
                    // Scroll to the new message
                    messageElement.scrollIntoView({ behavior: 'smooth' });
                }
            }

            // Send the personal system message after a short delay
            setTimeout(sendPersonalSystemMessage, 500);
        },
        args: [username, caAddress, coinName]
    });
}
