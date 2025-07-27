// PhantomView Background Service Worker
console.log('PhantomView background service worker initialized');

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
                    console.log('Opening chatroom with CA:', response.caAddress);
                    // Get coin name from the checkTradingSite response
                    chrome.tabs.sendMessage(tabId, {action: 'checkTradingSite'}, function(tradingResponse) {
                        const coinName = tradingResponse && tradingResponse.coinName ? tradingResponse.coinName : null;
                        openChatroom(tabId, request.username, response.caAddress, coinName);
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
                right: 0 !important;
            }
            .message-persistent-reactions {
                position: absolute !important;
                top: -8px !important;
                display: flex !important;
                gap: 4px !important;
                z-index: 2147483648 !important;
            }
            .message.own .message-persistent-reactions {
                left: 0px !important;
            }
            .message.other .message-persistent-reactions {
                right: 0px !important;
            }
            .persistent-reaction {
                background: rgba(255, 255, 255, 0.1) !important;
                border: 1px solid rgba(255, 255, 255, 0.2) !important;
                border-radius: 12px !important;
                padding: 2px 6px !important;
                font-size: 10px !important;
                color: white !important;
                display: flex !important;
                align-items: center !important;
                gap: 2px !important;
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
                        <div class="message other system">
                            <div class="message-header">System</div>
                            <div class="message-content">Welcome to the chat! Messages are temporary and will disappear after 5 minutes.</div>
                        </div>
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
                    
                    overlay.remove();
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
                
                // Sanitize message
                const message = sanitizeMessage(rawMessage);
                
                // Check message length
                if (message.length < MIN_MESSAGE_LENGTH) {
                    showWarning('Message too short');
                    return;
                }
                
                if (message.length > MAX_MESSAGE_LENGTH) {
                    showWarning('Message too long (max 200 characters)');
                    return;
                }
                
                // Check for spam
                if (isSpam()) {
                    showWarning('Please slow down - too many messages');
                    return;
                }
                
                // Check for links
                if (containsLinks(message)) {
                    showWarning('Links are not allowed for safety');
                    return;
                }
                
                // Check for suspicious content
                if (containsSuspiciousContent(message)) {
                    showWarning('Message contains potentially unsafe content');
                    return;
                }
                
                // Check for repeated characters (spam)
                const repeatedChars = /(.)\1{4,}/;
                if (repeatedChars.test(message)) {
                    showWarning('Message contains too many repeated characters');
                    return;
                }
                
                // All checks passed - send message
                // Clear input first
                chatInput.value = '';
                
                // Send message to Firebase for real-time chat
                sendMessageToFirebase(message, username, caAddress);
                console.log('Message sent:', message);
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
                
                // Create reactions popup
                const reactionsPopup = document.createElement('div');
                reactionsPopup.className = 'message-reactions';
                reactionsPopup.innerHTML = `
                    <button class="reaction-button" data-reaction="❤️">
                        ❤️ <span class="reaction-count">${reactions['❤️']}</span>
                    </button>
                    <button class="reaction-button" data-reaction="👍">
                        👍 <span class="reaction-count">${reactions['👍']}</span>
                    </button>
                    <button class="reaction-button" data-reaction="👎">
                        👎 <span class="reaction-count">${reactions['👎']}</span>
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
                        
                        // Refresh all message reactions after a short delay
                        setTimeout(() => {
                            refreshAllMessageReactions();
                        }, 1000);
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
            }
            
            // Function to update message reactions in Firebase
            function updateMessageReaction(messageKey, reaction, caAddress) {
                const sanitizedCA = caAddress.replace(/[^A-Za-z0-9]/g, '');
                const messageRef = `${firebaseConfig.databaseURL}/chats/${sanitizedCA}/activeMessages/${messageKey}/reactions/${reaction}.json`;
                
                console.log('Updating reaction:', reaction, 'for message:', messageKey, 'at URL:', messageRef);
                
                // Get current reaction count and increment
                fetch(messageRef).then(response => {
                    console.log('Fetch response status:', response.status);
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    return response.json();
                }).then(currentCount => {
                    console.log('Current reaction count:', currentCount);
                    const newCount = (currentCount || 0) + 1;
                    console.log('New reaction count will be:', newCount);
                    
                    return fetch(messageRef, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newCount)
                    }).then(response => {
                        console.log('PUT response status:', response.status);
                        if (response.ok) {
                            console.log(`Reaction ${reaction} successfully updated to count ${newCount}`);
                        } else {
                            console.error('Failed to update reaction:', response.status, response.statusText);
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
                        
                        fetch(reactionsRef).then(response => {
                            if (!response.ok) {
                                throw new Error(`HTTP ${response.status}`);
                            }
                            return response.json();
                        }).then(reactionsData => {
                            console.log('Refreshing reactions for message:', messageKey, 'Data:', reactionsData);
                            let reactionsHTML = '';
                            if (reactionsData && typeof reactionsData === 'object' && Object.keys(reactionsData).length > 0) {
                                Object.entries(reactionsData).forEach(([emoji, count]) => {
                                    if (count > 0) {
                                        reactionsHTML += `<div class="persistent-reaction">${emoji} ${count}</div>`;
                                    }
                                });
                            }
                            
                            if (reactionsHTML) {
                                const persistentReactions = messageElement.querySelector('.message-persistent-reactions');
                                if (persistentReactions) {
                                    persistentReactions.innerHTML = reactionsHTML;
                                    console.log('Refreshed reactions for message:', messageKey, 'HTML:', reactionsHTML);
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
                
                // Poll for new messages every 100ms (faster updates)
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
                }, 100);
                
                // Cleanup old messages every 30 seconds
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
                }, 30000);
                
                // Store intervals for cleanup when chatroom closes
                window.messageInterval = messageInterval;
                window.cleanupInterval = cleanupInterval;
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
                        
                        // Create message with empty reactions first
                        messageElement.innerHTML = `
                            <div class="message-header">${messageData.username}</div>
                            <div class="message-content">${messageData.message}</div>
                            <div class="message-persistent-reactions"></div>
                        `;
                        addReactionFunctionality(messageElement);
                        chatMessages.appendChild(messageElement);
                        
                        // Fetch reactions for this message
                        const sanitizedCA = caAddress.replace(/[^A-Za-z0-9]/g, '');
                        const reactionsRef = `${firebaseConfig.databaseURL}/chats/${sanitizedCA}/activeMessages/${key}/reactions.json`;
                        
                        console.log('Fetching reactions for message:', key, 'from:', reactionsRef);
                        
                        fetch(reactionsRef).then(response => {
                            console.log('Reactions response status:', response.status);
                            if (!response.ok) {
                                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                            }
                            return response.json();
                        }).then(reactionsData => {
                            console.log('Reactions data received:', reactionsData);
                            let reactionsHTML = '';
                            if (reactionsData && typeof reactionsData === 'object' && Object.keys(reactionsData).length > 0) {
                                Object.entries(reactionsData).forEach(([emoji, count]) => {
                                    if (count > 0) {
                                        reactionsHTML += `<div class="persistent-reaction">${emoji} ${count}</div>`;
                                        console.log('Adding reaction display:', emoji, count);
                                    }
                                });
                            }
                            
                            if (reactionsHTML) {
                                const persistentReactions = messageElement.querySelector('.message-persistent-reactions');
                                if (persistentReactions) {
                                    persistentReactions.innerHTML = reactionsHTML;
                                    console.log('Updated persistent reactions for message:', key, 'HTML:', reactionsHTML);
                                } else {
                                    console.error('Persistent reactions container not found for message:', key);
                                }
                            } else {
                                console.log('No reactions to display for message:', key);
                            }
                        }).catch(error => {
                            console.error('Error fetching reactions for message:', key, error);
                        });
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
                fetch(userRef, { method: 'DELETE' });
            }

            function pollOnlineUsers(caAddress, updateCallback) {
                const sanitizedCA = caAddress.replace(/[^A-Za-z0-9]/g, '');
                const usersRef = `${firebaseConfig.databaseURL}/chats/${sanitizedCA}/onlineUsers.json`;
                console.log('Polling online users from:', usersRef);
                setInterval(() => {
                    fetch(usersRef).then(r => r.json()).then(data => {
                        console.log('Online users data received:', data);
                        if (data) {
                            // Extract usernames from the user objects
                            const usernames = Object.values(data).map(user => user.username).filter(Boolean);
                            console.log('Extracted usernames:', usernames);
                            updateCallback(usernames);
                        } else {
                            console.log('No online users data');
                            updateCallback([]);
                        }
                    }).catch(error => {
                        console.error('Error polling online users:', error);
                        updateCallback([]);
                    });
                }, 500);
            }

            // --- INTEGRATE INTO CHATROOM UI ---
            setUserOnline(username, caAddress);
            window.addEventListener('beforeunload', function() {
                setUserOffline(username, caAddress);
            });

            let onlineUsernames = [username];
            pollOnlineUsers(caAddress, function(usernames) {
                console.log('Online users received:', usernames);
                onlineUsernames = usernames;
                // Update the online count in the UI
                const viewerCountElement = document.getElementById('viewer-count');
                if (viewerCountElement) {
                    viewerCountElement.textContent = usernames.length;
                    console.log('Updated viewer count to:', usernames.length);
                }
            });
            
            function createUsersPopup() {
                const popup = document.createElement('div');
                popup.className = 'users-popup';
                popup.innerHTML = `
                    <div class="users-popup-header">
                        <span>Online Users (${onlineUsernames.length})</span>
                        <button class="users-popup-close" id="users-popup-close">×</button>
                    </div>
                    ${onlineUsernames.map(u => `
                        <div class="user-item${u === username ? ' current' : ''}">
                            <div class="user-avatar">${u.charAt(0).toUpperCase()}</div>
                            <div>${u}${u === username ? ' (You)' : ''}</div>
                        </div>
                    `).join('')}
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
            
            onlineUsersSection.addEventListener('click', toggleUsersPopup);
            
            // Add click to copy CA address functionality
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
            
            // Header-only draggable functionality
            let isDragging = false;
            let startX, startY;
            let startLeft, startTop;
            const header = overlay.querySelector('.phantomview-header');
            
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
        },
        args: [username, caAddress, coinName]
    });
}
