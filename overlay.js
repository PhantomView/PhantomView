// Overlay chat logic (moveable, pin, input)
const messagesDiv = document.getElementById('messages');
const usersDiv = document.getElementById('users');
const dragHandle = document.getElementById('drag-handle');
const minimizeBtn = document.getElementById('minimize-btn');
const closeBtn = document.getElementById('close-btn');
const input = document.getElementById('msg-input');
const sendBtn = document.getElementById('send-btn');

let pinned = false;
let currentUsername = '';
let currentToken = '';
let currentWebsite = '';
let currentChannelId = '';

// Get parameters from URL
function getUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  currentUsername = urlParams.get('username') || 'Anonymous';
  currentToken = urlParams.get('token') || '';
  currentWebsite = urlParams.get('website') || '';
  
  // Create channel ID from token and website
  currentChannelId = `${currentWebsite}_${currentToken}`;
  
  console.log('Overlay loaded with:', { 
    username: currentUsername, 
    token: currentToken, 
    website: currentWebsite,
    channelId: currentChannelId 
  });
}

// Initialize with URL parameters
getUrlParameters();

// Channel management functions
function getChannelData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['channels'], (data) => {
      const channels = data.channels || {};
      resolve(channels);
    });
  });
}

function saveChannelData(channels) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ channels: channels }, resolve);
  });
}

async function joinChannel() {
  const channels = await getChannelData();
  
  // Create channel if it doesn't exist
  if (!channels[currentChannelId]) {
    channels[currentChannelId] = {
      token: currentToken,
      website: currentWebsite,
      messages: [],
      users: [],
      createdAt: Date.now()
    };
  }
  
  // Add user to channel if not already present
  if (!channels[currentChannelId].users.includes(currentUsername)) {
    channels[currentChannelId].users.push(currentUsername);
  }
  
  await saveChannelData(channels);
  
  // Load channel data
  loadChannelData();
  
  // Set up periodic cleanup check
  setInterval(checkChannelCleanup, 30000); // Check every 30 seconds
}

async function leaveChannel() {
  const channels = await getChannelData();
  
  if (channels[currentChannelId]) {
    // Remove user from channel
    channels[currentChannelId].users = channels[currentChannelId].users.filter(
      user => user !== currentUsername
    );
    
    // Delete channel if no users left
    if (channels[currentChannelId].users.length === 0) {
      delete channels[currentChannelId];
      console.log('Channel deleted:', currentChannelId);
    }
    
    await saveChannelData(channels);
  }
}

async function loadChannelData() {
  const channels = await getChannelData();
  const channel = channels[currentChannelId];
  
  if (channel) {
    // Load messages
    messagesDiv.innerHTML = '';
    channel.messages.forEach(msg => addMessage(msg));
    
    // Load users
    updateUsers(channel.users);
  }
}

async function checkChannelCleanup() {
  const channels = await getChannelData();
  let hasChanges = false;
  
  // Check for channels with no users and delete them
  Object.keys(channels).forEach(channelId => {
    if (channels[channelId].users.length === 0) {
      delete channels[channelId];
      hasChanges = true;
      console.log('Cleaned up empty channel:', channelId);
    }
  });
  
  if (hasChanges) {
    await saveChannelData(channels);
  }
}

// Initialize channel
joinChannel();

function addMessage(msg) {
  const div = document.createElement('div');
  div.textContent = msg;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function updateUsers(users) {
  usersDiv.innerHTML = '';
  users.forEach(user => {
    const div = document.createElement('div');
    div.textContent = user;
    // Highlight current user
    if (user === currentUsername) {
      div.style.fontWeight = 'bold';
      div.style.color = '#fff';
    }
    usersDiv.appendChild(div);
  });
}

sendBtn.onclick = sendMessage;
input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

async function sendMessage() {
  const msg = input.value.trim();
  if (!msg) return;
  
  // Always use "Me:" for the current user's messages
  const messageText = 'Me: ' + msg;
  addMessage(messageText);
  
  // Save message to channel
  const channels = await getChannelData();
  if (channels[currentChannelId]) {
    channels[currentChannelId].messages.push(messageText);
    await saveChannelData(channels);
  }
  
  input.value = '';
}

// Minimize logic: send message to parent to minimize
minimizeBtn.onclick = () => {
  window.parent.postMessage({ type: 'phantomview-minimize' }, '*');
};

// Close logic: leave channel and close overlay
closeBtn.onclick = async () => {
  await leaveChannel();
  window.parent.postMessage({ type: 'phantomview-close' }, '*');
};

// Moveable overlay logic
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
dragHandle.addEventListener('mousedown', (e) => {
  isDragging = true;
  dragOffsetX = e.clientX;
  dragOffsetY = e.clientY;
  window.parent.postMessage({ type: 'phantomview-start-drag', x: dragOffsetX, y: dragOffsetY }, '*');
});
document.addEventListener('mouseup', () => {
  isDragging = false;
  window.parent.postMessage({ type: 'phantomview-stop-drag' }, '*');
});
document.addEventListener('mousemove', (e) => {
  if (isDragging) {
    window.parent.postMessage({ type: 'phantomview-drag', x: e.clientX, y: e.clientY }, '*');
  }
});

// Listen for storage changes (e.g., new messages from other contexts)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.channels) {
    const channels = changes.channels.newValue || {};
    const channel = channels[currentChannelId];
    
    if (channel) {
      // Update messages
      messagesDiv.innerHTML = '';
      channel.messages.forEach(msg => addMessage(msg));
      
      // Update users
      updateUsers(channel.users);
    }
  }
});

// Clean up when window is closed or unloaded
window.addEventListener('beforeunload', () => {
  leaveChannel();
});

// Also clean up when the overlay is minimized/closed
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'phantomview-minimize') {
    // Don't leave channel on minimize, only on actual close
  }
}); 