let currentUsername = '';
let selectedWebsite = '';

document.addEventListener('DOMContentLoaded', () => {
  const usernameScreen = document.getElementById('username-screen');
  const websiteScreen = document.getElementById('website-screen');
  const coinScreen = document.getElementById('coin-screen');
  
  const usernameInput = document.getElementById('username-input');
  const continueBtn = document.getElementById('continue-btn');
  const bullxBtn = document.getElementById('bullx-btn');
  const axiomBtn = document.getElementById('axiom-btn');
  const coinInput = document.getElementById('coin-input');
  const joinChannelBtn = document.getElementById('join-channel-btn');
  
  const backToUsernameBtn = document.getElementById('back-to-username-btn');
  const backToWebsiteBtn = document.getElementById('back-to-website-btn');
  
  const displayUsername = document.getElementById('display-username');
  const displayUsername2 = document.getElementById('display-username-2');
  const displayWebsite = document.getElementById('display-website');

  // Check if username is already set in storage
  chrome.storage.local.get(['phantomview_username'], (result) => {
    if (result.phantomview_username) {
      currentUsername = result.phantomview_username;
      showWebsiteScreen();
    }
  });

  // Handle continue button (username setup)
  continueBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (username) {
      currentUsername = username;
      // Save username to storage
      chrome.storage.local.set({ phantomview_username: username });
      showWebsiteScreen();
    } else {
      alert('Please enter a username');
    }
  });

  // Handle website selection
  bullxBtn.addEventListener('click', () => {
    selectedWebsite = 'BullX';
    showCoinScreen();
  });

  axiomBtn.addEventListener('click', () => {
    selectedWebsite = 'Axiom';
    showCoinScreen();
  });

  // Handle join channel button (coin token)
  joinChannelBtn.addEventListener('click', () => {
    const coinToken = coinInput.value.trim();
    if (coinToken) {
      console.log('Join channel clicked with:', {
        token: coinToken,
        username: currentUsername,
        website: selectedWebsite
      });
      
      // Send message to background script to open overlay with specific token
      const message = {
        type: 'OPEN_OVERLAY_WITH_TOKEN',
        token: coinToken,
        username: currentUsername,
        website: selectedWebsite
      };
      
      console.log('Sending message to background script:', message);
      
      chrome.runtime.sendMessage(message, (response) => {
        console.log('Received response from background script:', response);
        
        if (chrome.runtime.lastError) {
          console.error('Error sending message:', chrome.runtime.lastError);
          alert('Error: Could not open overlay. Please make sure you are on a supported website and try again.');
        } else if (response && response.success) {
          console.log('Overlay opened successfully');
          // Close the popup
          window.close();
        } else {
          console.error('Failed to open overlay, response:', response);
          alert('Failed to open overlay. Please try again.');
        }
      });
    } else {
      alert('Please enter a coin token');
    }
  });

  // Handle back buttons
  backToUsernameBtn.addEventListener('click', () => {
    showUsernameScreen();
  });

  backToWebsiteBtn.addEventListener('click', () => {
    showWebsiteScreen();
  });

  // Handle Enter key press in input fields
  usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      continueBtn.click();
    }
  });

  coinInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      joinChannelBtn.click();
    }
  });

  function showUsernameScreen() {
    usernameScreen.style.display = 'flex';
    websiteScreen.style.display = 'none';
    coinScreen.style.display = 'none';
    usernameInput.focus();
  }

  function showWebsiteScreen() {
    usernameScreen.style.display = 'none';
    websiteScreen.style.display = 'flex';
    coinScreen.style.display = 'none';
    displayUsername.textContent = currentUsername;
  }

  function showCoinScreen() {
    usernameScreen.style.display = 'none';
    websiteScreen.style.display = 'none';
    coinScreen.style.display = 'flex';
    displayUsername2.textContent = currentUsername;
    displayWebsite.textContent = selectedWebsite;
    coinInput.focus();
  }

  console.log('PhantomView extension loaded');
}); 