# PhantomView Extension Troubleshooting Guide

## 🚨 Extension Not Loading - Step by Step Fix

### **Step 1: Check Extension Status**

1. **Open Chrome Extensions Page**
   - Go to `chrome://extensions/`
   - Look for "PhantomView" in the list

2. **Check for Errors**
   - If you see red error messages, note them down
   - Common errors: "Manifest file is missing or unreadable"

### **Step 2: Reload the Extension**

1. **If PhantomView is in the list:**
   - Click the "Reload" button (🔄 icon)
   - Wait for it to reload

2. **If PhantomView is NOT in the list:**
   - Make sure "Developer mode" is ON (top-right toggle)
   - Click "Load unpacked"
   - Navigate to `/Users/x/Documents/Cursor Projects/phantomview`
   - Select the folder and click "Select"

### **Step 3: Verify Files Exist**

Run this command in terminal:
```bash
cd "/Users/x/Documents/Cursor Projects/phantomview"
ls -la
```

You should see:
- ✅ `manifest.json`
- ✅ `background.js`
- ✅ `popup.html`
- ✅ `popup.css`
- ✅ `popup.js`
- ✅ `content.js`
- ✅ `icons/` folder

### **Step 4: Check Manifest Syntax**

Run this command:
```bash
cd "/Users/x/Documents/Cursor Projects/phantomview"
cat manifest.json | python3 -m json.tool
```

If there's an error, the JSON is invalid.

### **Step 5: Test Extension Loading**

1. **Open the debug page:**
   ```bash
   open debug-manual.html
   ```

2. **Click "Check Extension"**
   - Should show "✅ Extension API Available"
   - If not, the extension isn't loaded

### **Step 6: Common Issues & Solutions**

#### **Issue 1: "Manifest file is missing or unreadable"**
**Solution:**
- Make sure you're selecting the correct folder
- The folder should contain `manifest.json` directly inside it

#### **Issue 2: "Extension API Not Available"**
**Solution:**
- The extension isn't loaded in Chrome
- Follow Step 2 above

#### **Issue 3: Extension icon not appearing in toolbar**
**Solution:**
- Go to `chrome://extensions/`
- Find PhantomView and make sure it's enabled
- Click the puzzle piece icon in toolbar to pin it

#### **Issue 4: Clicking icon does nothing**
**Solution:**
- Check console for errors (F12 → Console)
- Try reloading the extension
- Check that `background.js` is working

### **Step 7: Manual Test**

1. **Open debug page:**
   ```bash
   open debug-manual.html
   ```

2. **Test each function:**
   - Click "Check Extension"
   - Click "Test Window Creation"
   - Click "Test Background Script"

3. **Check console logs** for any errors

### **Step 8: Alternative Loading Method**

If the extension still won't load:

1. **Remove the extension completely:**
   - Go to `chrome://extensions/`
   - Click "Remove" on PhantomView

2. **Clear Chrome cache:**
   - Go to `chrome://settings/clearBrowserData`
   - Clear "Cached images and files"

3. **Reload Chrome completely**

4. **Load the extension again:**
   - Go to `chrome://extensions/`
   - Enable Developer mode
   - Click "Load unpacked"
   - Select the phantomview folder

### **Step 9: Verify Success**

After loading, you should see:
- ✅ PhantomView in extensions list
- ✅ No red error messages
- ✅ Extension icon in toolbar
- ✅ Clicking icon opens a window

### **Step 10: Test Trading Sites**

1. **Go to a trading site:**
   - https://axiom.trade/
   - https://dexscreener.com/
   - https://raydium.io/

2. **Click PhantomView icon**
   - Should show "Coin not found" popup

3. **Go to any other site**
   - Click PhantomView icon
   - Should show normal interface

## 🆘 Still Not Working?

If the extension still won't load:

1. **Check Chrome version** - Make sure it's up to date
2. **Try a different browser** - Test in Edge or Firefox
3. **Check file permissions** - Make sure all files are readable
4. **Contact support** - Share the error messages you see

## 📞 Debug Information

When asking for help, include:
- Chrome version
- Error messages from `chrome://extensions/`
- Console errors (F12 → Console)
- Results from debug-manual.html 