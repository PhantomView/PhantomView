
# Firebase Realtime Database Setup Guide

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter a project name (e.g., "phantomview-viewers")
4. Follow the setup wizard (you can disable Google Analytics if you want)

## Step 2: Enable Realtime Database

1. In your Firebase project, go to "Realtime Database" in the left sidebar
2. Click "Create database"
3. Choose a location (pick the closest to your users)
4. Start in test mode (we'll secure it later)

## Step 3: Get Your Configuration

1. In Firebase Console, click the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (</>)
5. Register your app with a nickname (e.g., "PhantomView Extension")
6. Copy the configuration object

## Step 4: Update Firebase Config

1. Open `firebase-config.js` in your project
2. Replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  databaseURL: "https://your-project-id-default-rtdb.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

## Step 5: Test the Extension

1. Load your extension in Chrome
2. Go to a CA page on Axiom (e.g., `/meme/[some-address]`)
3. Click the PhantomView extension icon
4. You should see the viewer count in the header
5. Check Firebase Console to see the data being stored

## How It Works

- When a user visits a CA page, the extension extracts the CA address
- It increments a viewer count in Firebase for that specific CA
- Every 5 seconds, it polls for updates from other viewers
- When the user leaves the page, it decrements the count
- The viewer count is displayed next to the blinking eye icon

## Database Structure

The data will be stored in Firebase like this:
```
viewers/
  CA_ADDRESS_1/
    count/
      1703123456789: 1
      1703123456790: 1
      1703123456791: -1
  CA_ADDRESS_2/
    count/
      1703123456789: 1
```

The total viewer count is calculated by summing all the timestamp entries.

## Security Rules (Optional)

Later, you can add security rules to your Firebase database:

```json
{
  "rules": {
    "viewers": {
      "$ca": {
        "count": {
          ".read": true,
          ".write": true
        }
      }
    }
  }
}
```

This allows anyone to read/write viewer counts but keeps the structure organized. 