// Firebase configuration for PhantomView Extension
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

// Export for use in content scripts
window.SimpleViewerTracker = SimpleViewerTracker; 