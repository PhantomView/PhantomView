// PhantomView Content Script
console.log('PhantomView content script loaded');

// List of trading websites that should show "Coin not found" popup
const TRADING_SITES = [
    'axiom.trade',
    'neo.bullx.io',
    'raydium.io',
    'dexscreener.com',
    'letsbonk.fun'
];

// Check if current page is a trading site
function isTradingSite() {
    const currentHost = window.location.hostname;
    return TRADING_SITES.some(site => currentHost.includes(site));
}

// Check if current page is a CA (Contract Address) page
function isCAPage() {
    const currentUrl = window.location.href;
    const currentHost = window.location.hostname;
    
    // Check for CA patterns on different sites
    if (currentHost.includes('axiom.trade') && currentUrl.includes('/meme/')) {
        return true;
    }
    if (currentHost.includes('neo.bullx.io') && currentUrl.includes('/terminal?chainId=') && currentUrl.includes('&address=')) {
        return true;
    }
    if (currentHost.includes('dexscreener.com') && currentUrl.includes('/solana/')) {
        return true;
    }
    if (currentHost.includes('letsbonk.fun') && currentUrl.includes('/token/')) {
        return true;
    }
    
    return false;
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
        console.log('Is trading site:', isTrading, 'Is CA page:', isCA, 'Current host:', window.location.hostname);
        sendResponse({ 
            success: true, 
            isTradingSite: isTrading,
            isCAPage: isCA,
            hostname: window.location.hostname,
            url: window.location.href
        });
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
