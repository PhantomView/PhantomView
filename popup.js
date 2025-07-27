document.addEventListener('DOMContentLoaded', function() {
    const usernameInput = document.getElementById('usernameInput');
    const joinBtn = document.getElementById('joinBtn');
    const closeBtn = document.getElementById('closeBtn');

    // Handle join button click
    joinBtn.addEventListener('click', function() {
        const username = usernameInput.value.trim();
        
        if (username) {
            // Store username in chrome storage
            chrome.storage.local.set({ 'phantomview_username': username }, function() {
                console.log('Username saved:', username);
                
                // Here you would typically connect to your analytics service
                // For now, we'll just show a success message
                joinBtn.textContent = 'Joined!';
                joinBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                
                // Reset button after 2 seconds
                setTimeout(() => {
                    joinBtn.textContent = 'Join';
                    joinBtn.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)';
                }, 2000);
                
                // TODO: Initialize live analytics and chat functionality
                initializePhantomView(username);
            });
        } else {
            // Show error state
            usernameInput.style.borderColor = '#ef4444';
            usernameInput.placeholder = 'Please enter a username';
            
            setTimeout(() => {
                usernameInput.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                usernameInput.placeholder = 'Enter username';
            }, 3000);
        }
    });

    // Handle enter key in input field
    usernameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            joinBtn.click();
        }
    });

    // Handle close button - close the window
    closeBtn.addEventListener('click', function() {
        window.close();
    });

    // Prevent window from closing when clicking outside
    // This is handled by the window type being 'popup' in the background script
    document.addEventListener('click', function(e) {
        // Prevent any clicks from closing the window
        e.stopPropagation();
    });

    // Initialize PhantomView functionality
    function initializePhantomView(username) {
        console.log('Initializing PhantomView for user:', username);
        
        // TODO: Connect to WebSocket for live analytics
        // TODO: Initialize chat room
        // TODO: Start tracking memecoin analytics
        
        // For now, we'll simulate some live data updates
        simulateLiveAnalytics();
    }

    // Simulate live analytics updates
    function simulateLiveAnalytics() {
        const statValues = document.querySelectorAll('.stat-value');
        
        setInterval(() => {
            statValues.forEach(stat => {
                if (stat.textContent.includes('%')) {
                    // Update percentage values
                    const currentValue = parseFloat(stat.textContent);
                    const newValue = currentValue + (Math.random() - 0.5) * 2;
                    stat.textContent = newValue.toFixed(2) + '%';
                } else if (!isNaN(parseInt(stat.textContent))) {
                    // Update numeric values
                    const currentValue = parseInt(stat.textContent);
                    const change = Math.floor(Math.random() * 10) - 5;
                    const newValue = Math.max(0, currentValue + change);
                    stat.textContent = newValue.toString();
                }
            });
        }, 5000); // Update every 5 seconds
    }

    // Load saved username if exists
    chrome.storage.local.get(['phantomview_username'], function(result) {
        if (result.phantomview_username) {
            usernameInput.value = result.phantomview_username;
        }
    });

    // Focus on input field when window opens
    usernameInput.focus();

    // Prevent window from being closed by user interaction outside
    window.addEventListener('beforeunload', function(e) {
        // This prevents the window from closing when user clicks outside
        // The window will only close when the close button is clicked
        return false;
    });
});
