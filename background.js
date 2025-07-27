// PhantomView Background Service Worker
console.log('PhantomView background service worker initialized');

// Handle extension icon click to open window
chrome.action.onClicked.addListener(function(tab) {
    console.log('Extension icon clicked!');
    checkTradingSiteAndOpen(tab);
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
                height: 280px !important;
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
                margin-bottom: 16px !important;
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
                
                <div style="padding: 20px; height: calc(100% - 65px); display: flex; flex-direction: column; justify-content: center;">
                    <div style="margin-bottom: 20px;">
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
                if (username) {
                    alert('Welcome to PhantomView, ' + username + '!');
                    // TODO: Connect to chat and show analytics for this CA
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
                margin-bottom: 16px !important;
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
                        <div style="margin-bottom: 20px;">
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
                height: 250px !important;
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
