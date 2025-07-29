// PhantomView Content Script
console.log('PhantomView content script loaded');

// Firebase configuration
const firebaseConfig = {
  apiKey: "FIREBASE_API_KEY_PLACEHOLDER", // Removed exposed key - will be loaded securely
  authDomain: "phantomview-339cd.firebaseapp.com",
  databaseURL: "https://phantomview-339cd-default-rtdb.firebaseio.com",
  projectId: "phantomview-339cd",
  storageBucket: "phantomview-339cd.firebasestorage.app",
  messagingSenderId: "845378171405",
  appId: "1:845378171405:web:4f2040047eb85dbd881b44"
};

// Simple viewer tracking using fetch API (no Firebase SDK needed)
class SimpleViewerTracker {
  constructor() {
    this.currentCA = null;
    this.intervalId = null;
    this.baseUrl = firebaseConfig.databaseURL;
  }

  // Start tracking viewers for a specific CA
  async startTracking(caAddress) {
    this.currentCA = this.sanitizeCA(caAddress);
    
    // Increment viewer count
    await this.updateViewerCount(1);
    
    // Start polling for updates every 5 seconds
    this.intervalId = setInterval(() => {
      this.pollViewerCount();
    }, 5000);
    
    console.log(`Started tracking viewers for CA: ${caAddress}`);
  }

  // Stop tracking current CA
  async stopTracking() {
    if (this.currentCA) {
      // Decrement viewer count
      await this.updateViewerCount(-1);
      
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      
      this.currentCA = null;
      console.log('Stopped tracking viewers');
    }
  }

  // Update viewer count in Firebase
  async updateViewerCount(increment) {
    if (!this.currentCA) return;
    
    try {
      const url = `${this.baseUrl}/viewers/${this.currentCA}/count.json`;
      console.log('Updating viewer count:', { url, increment, currentCA: this.currentCA });
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [Date.now()]: increment // Use timestamp as key for atomic updates
        })
      });
      
      console.log('Firebase response:', response.status, response.statusText);
      
      if (!response.ok) {
        console.error('Failed to update viewer count:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);
      } else {
        console.log('Successfully updated viewer count');
      }
    } catch (error) {
      console.error('Error updating viewer count:', error);
    }
  }

  // Poll for viewer count updates
  async pollViewerCount() {
    if (!this.currentCA) return;
    
    try {
      const url = `${this.baseUrl}/viewers/${this.currentCA}/count.json`;
      console.log('Polling viewer count from:', url);
      
      const response = await fetch(url);
      console.log('Poll response:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Poll data received:', data);
        if (data) {
          // Calculate total count from all timestamp entries
          const totalCount = Object.values(data).reduce((sum, val) => sum + (val || 0), 0);
          console.log('Calculated total count:', totalCount);
          this.updateViewerCountDisplay(totalCount);
        } else {
          console.log('No data received from Firebase');
        }
      } else {
        console.error('Failed to poll viewer count:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error polling viewer count:', error);
    }
  }

  // Update the viewer count in the UI
  updateViewerCountDisplay(count) {
    const viewerCountElement = document.getElementById('viewer-count');
    if (viewerCountElement) {
      viewerCountElement.textContent = Math.max(0, count).toString();
    }
    
    // Also send message to background script to update popup if it exists
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        action: 'updateViewerCount',
        count: count
      });
    }
  }

  // Sanitize CA address for Firebase key
  sanitizeCA(caAddress) {
    return caAddress.replace(/[.#$[\]]/g, '_');
  }
}

// Global viewer tracker
let viewerTracker = null;
let currentCA = null;

// Initialize viewer tracker when content script loads
async function initializeViewerTracker() {
    try {
        // Create viewer tracker instance directly
        viewerTracker = new SimpleViewerTracker();
        
        console.log('Viewer tracker initialized in content script');
    } catch (error) {
        console.error('Failed to initialize viewer tracker:', error);
    }
}

// Initialize when content script loads
initializeViewerTracker();

// Start viewer tracking automatically when page loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const caAddress = extractCAAddress();
        console.log('DOMContentLoaded - CA address extracted:', caAddress);
        console.log('Viewer tracker available:', !!viewerTracker);
        
        if (caAddress && viewerTracker) {
            console.log('Auto-starting viewer tracking for CA:', caAddress);
            viewerTracker.startTracking(caAddress);
            currentCA = caAddress;
        } else {
            console.log('Cannot start tracking - CA address:', caAddress, 'Viewer tracker:', !!viewerTracker);
        }
    }, 2000); // Wait 2 seconds for page to fully load
});

// List of trading websites that should show "Coin not found" popup
const TRADING_SITES = [
    'axiom.trade',
    'neo.bullx.io',
    'raydium.io',
    'dexscreener.com',
    'letsbonk.fun',
    'birdeye.so',
    'solscan.io',
    'solana.fm',
    'jup.ag',
    'pump.fun',
    'bonkbot.com',
    'tensor.trade'
];

// Check if current page is a trading site
function isTradingSite() {
    const currentHost = window.location.hostname;
    return TRADING_SITES.some(site => currentHost.includes(site));
}

// Extract CA address from current page
function extractCAAddress() {
    const currentUrl = window.location.href;
    const currentHost = window.location.hostname;
    
    // Extract CA from different sites
    if (currentHost.includes('axiom.trade') && currentUrl.includes('/meme/')) {
        const match = currentUrl.match(/\/meme\/([A-Za-z0-9]+)/);
        return match ? match[1] : null;
    }
    if (currentHost.includes('neo.bullx.io') && currentUrl.includes('/terminal?chainId=') && currentUrl.includes('&address=')) {
        const match = currentUrl.match(/&address=([A-Za-z0-9]+)/);
        return match ? match[1] : null;
    }
    if (currentHost.includes('dexscreener.com') && currentUrl.includes('/solana/')) {
        const match = currentUrl.match(/\/solana\/([A-Za-z0-9]+)/);
        return match ? match[1] : null;
    }
    if (currentHost.includes('letsbonk.fun') && currentUrl.includes('/token/')) {
        const match = currentUrl.match(/\/token\/([A-Za-z0-9]+)/);
        return match ? match[1] : null;
    }
    if (currentHost.includes('birdeye.so') && currentUrl.includes('/token/')) {
        const match = currentUrl.match(/\/token\/([A-Za-z0-9]+)/);
        return match ? match[1] : null;
    }
    if (currentHost.includes('solscan.io') && currentUrl.includes('/token/')) {
        const match = currentUrl.match(/\/token\/([A-Za-z0-9]+)/);
        return match ? match[1] : null;
    }
    if (currentHost.includes('solana.fm') && currentUrl.includes('/token/')) {
        const match = currentUrl.match(/\/token\/([A-Za-z0-9]+)/);
        return match ? match[1] : null;
    }
    if (currentHost.includes('jup.ag') && currentUrl.includes('/swap/')) {
        const match = currentUrl.match(/\/swap\/([A-Za-z0-9]+)/);
        return match ? match[1] : null;
    }
    if (currentHost.includes('pump.fun') && currentUrl.includes('/token/')) {
        const match = currentUrl.match(/\/token\/([A-Za-z0-9]+)/);
        return match ? match[1] : null;
    }
    if (currentHost.includes('bonkbot.com') && currentUrl.includes('/token/')) {
        const match = currentUrl.match(/\/token\/([A-Za-z0-9]+)/);
        return match ? match[1] : null;
    }
    if (currentHost.includes('tensor.trade') && currentUrl.includes('/token/')) {
        const match = currentUrl.match(/\/token\/([A-Za-z0-9]+)/);
        return match ? match[1] : null;
    }
    
    // Generic CA pattern matching for any site
    const caPattern = /[A-Za-z0-9]{32,44}/;
    const match = currentUrl.match(caPattern);
    if (match) {
        return match[0];
    }
    
    return null;
}

// Extract coin name from current page
function extractCoinName() {
    const currentUrl = window.location.href;
    const currentHost = window.location.hostname;
    
    // Try to find coin name from page title first
    const title = document.title;
    const titleMatch = title.match(/[A-Z]{3,10}/);
    if (titleMatch) {
        return titleMatch[0];
    }
    
    // Try to find coin name from various selectors
    const selectors = [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        '[class*="title"]', '[class*="name"]', '[class*="coin"]',
        '[class*="token"]', '[class*="symbol"]', '[class*="meme"]'
    ];
    
    for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
            const text = element.textContent.trim();
            // Look for patterns that might be coin names (3-10 chars, mostly uppercase)
            const coinPattern = /^[A-Z]{3,10}$/;
            if (coinPattern.test(text) && text.length >= 3) {
                return text;
            }
        }
    }
    
    // Check URL for coin name
    const urlMatch = currentUrl.match(/[A-Z]{3,10}/);
    if (urlMatch) {
        return urlMatch[0];
    }
    
    return null;
}

// Check if current page is a CA (Contract Address) page
function isCAPage() {
    return extractCAAddress() !== null;
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('Content script received message:', request);
    
    if (request.action === 'trackMemecoin') {
        trackMemecoinData(request.url);
        sendResponse({ success: true });
    } else if (request.action === 'checkTradingSite') {
        const isTrading = isTradingSite();
        const isCA = isCAPage();
        const caAddress = extractCAAddress();
        const coinName = extractCoinName();
        console.log('Is trading site:', isTrading, 'Is CA page:', isCA, 'CA address:', caAddress, 'Coin name:', coinName, 'Current host:', window.location.hostname);
        
        // Start tracking viewers if this is a CA page
        if (isCA && caAddress && viewerTracker) {
            if (currentCA !== caAddress) {
                // Stop tracking previous CA if different
                if (currentCA) {
                    viewerTracker.stopTracking();
                }
                // Start tracking new CA
                viewerTracker.startTracking(caAddress);
                currentCA = caAddress;
            }
        }
        
        sendResponse({ 
            success: true, 
            isTradingSite: isTrading,
            isCAPage: isCA,
            caAddress: caAddress,
            coinName: coinName,
            hostname: window.location.hostname,
            url: window.location.href
        });
    } else if (request.action === 'getViewerCount') {
        // Return current viewer count if available
        let count = 0;
        if (viewerTracker && viewerTracker.currentCA) {
            // Try to get current count from Firebase
            try {
                const url = `${viewerTracker.baseUrl}/viewers/${viewerTracker.currentCA}/count.json`;
                fetch(url).then(response => response.json()).then(data => {
                    if (data) {
                        const totalCount = Object.values(data).reduce((sum, val) => sum + (val || 0), 0);
                        sendResponse({ count: Math.max(0, totalCount) });
                    } else {
                        sendResponse({ count: 0 });
                    }
                }).catch(() => sendResponse({ count: 0 }));
            } catch (error) {
                sendResponse({ count: 0 });
            }
        } else {
            sendResponse({ count: 0 });
        }
        return true; // Keep message channel open for async response
    } else if (request.action === 'getCurrentCA') {
        // Return current CA address
        console.log('getCurrentCA requested, currentCA:', currentCA);
        sendResponse({ caAddress: currentCA });
    }
    
    return true;
});

// Function to track memecoin data from the current page
function trackMemecoinData(url) {
    console.log('Tracking memecoin data from:', url);
    
    let memecoinData = {
        url: url,
        timestamp: Date.now(),
        tokenAddress: null,
        tokenName: null,
        price: null,
        marketCap: null,
        volume: null,
        holders: null
    };
    
    // Extract data based on the website
    if (url.includes('solscan.io')) {
        extractSolscanData(memecoinData);
    } else if (url.includes('dexscreener.com')) {
        extractDexScreenerData(memecoinData);
    } else if (url.includes('raydium.io')) {
        extractRaydiumData(memecoinData);
    }
    
    // Send data to background script
    chrome.runtime.sendMessage({
        action: 'memecoinData',
        data: memecoinData
    });
}

// Extract data from Solscan
function extractSolscanData(data) {
    try {
        // Look for token address in URL
        const urlMatch = window.location.pathname.match(/\/token\/([A-Za-z0-9]+)/);
        if (urlMatch) {
            data.tokenAddress = urlMatch[1];
        }
        
        // Extract token name
        const nameElement = document.querySelector('h1, .token-name, [data-testid="token-name"]');
        if (nameElement) {
            data.tokenName = nameElement.textContent.trim();
        }
        
        // Extract price
        const priceElement = document.querySelector('.price, .token-price, [data-testid="price"]');
        if (priceElement) {
            data.price = parseFloat(priceElement.textContent.replace(/[^0-9.]/g, ''));
        }
        
        // Extract market cap
        const marketCapElement = document.querySelector('.market-cap, .mcap, [data-testid="market-cap"]');
        if (marketCapElement) {
            data.marketCap = marketCapElement.textContent.trim();
        }
        
        // Extract holders count
        const holdersElement = document.querySelector('.holders, .holder-count, [data-testid="holders"]');
        if (holdersElement) {
            data.holders = parseInt(holdersElement.textContent.replace(/[^0-9]/g, ''));
        }
        
    } catch (error) {
        console.error('Error extracting Solscan data:', error);
    }
}

// Extract data from DexScreener
function extractDexScreenerData(data) {
    try {
        // Look for token address in URL
        const urlMatch = window.location.pathname.match(/\/solana\/([A-Za-z0-9]+)/);
        if (urlMatch) {
            data.tokenAddress = urlMatch[1];
        }
        
        // Extract token name
        const nameElement = document.querySelector('h1, .token-name, [data-testid="token-name"]');
        if (nameElement) {
            data.tokenName = nameElement.textContent.trim();
        }
        
        // Extract price
        const priceElement = document.querySelector('.price, .token-price, [data-testid="price"]');
        if (priceElement) {
            data.price = parseFloat(priceElement.textContent.replace(/[^0-9.]/g, ''));
        }
        
        // Extract volume
        const volumeElement = document.querySelector('.volume, .token-volume, [data-testid="volume"]');
        if (volumeElement) {
            data.volume = volumeElement.textContent.trim();
        }
        
    } catch (error) {
        console.error('Error extracting DexScreener data:', error);
    }
}

// Extract data from Raydium
function extractRaydiumData(data) {
    try {
        // Look for token address in URL
        const urlMatch = window.location.pathname.match(/\/swap\/([A-Za-z0-9]+)/);
        if (urlMatch) {
            data.tokenAddress = urlMatch[1];
        }
        
        // Extract token name
        const nameElement = document.querySelector('.token-name, .pair-name, [data-testid="token-name"]');
        if (nameElement) {
            data.tokenName = nameElement.textContent.trim();
        }
        
        // Extract price
        const priceElement = document.querySelector('.price, .token-price, [data-testid="price"]');
        if (priceElement) {
            data.price = parseFloat(priceElement.textContent.replace(/[^0-9.]/g, ''));
        }
        
    } catch (error) {
        console.error('Error extracting Raydium data:', error);
    }
}

// Monitor page changes for dynamic content
const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
            // Check if new memecoin data has been loaded
            const newElements = mutation.addedNodes;
            newElements.forEach(function(node) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // Look for price or market data updates
                    const priceElements = node.querySelectorAll('.price, .market-cap, .volume');
                    if (priceElements.length > 0) {
                        // Re-extract data when new information is available
                        setTimeout(() => {
                            trackMemecoinData(window.location.href);
                        }, 1000);
                    }
                }
            });
        }
    });
});

// Start observing the document for changes
observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Initial data extraction when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            trackMemecoinData(window.location.href);
        }, 2000);
    });
} else {
    setTimeout(() => {
        trackMemecoinData(window.location.href);
    }, 2000);
}

// Cleanup viewer tracking when page unloads
window.addEventListener('beforeunload', function() {
    if (viewerTracker && currentCA) {
        viewerTracker.stopTracking();
        currentCA = null;
    }
});
