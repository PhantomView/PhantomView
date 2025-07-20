# PhantomView Changelog

## [0.2.5] - 2025-01-XX

### ✨ New Features
- **Multi-Screen Setup Flow**: Complete redesign with username entry, website selection, and token input
- **Channel-Based Chat System**: Each token now has its own dedicated chat channel
- **User Management**: Automatic user joining/leaving with active users list
- **Social Media Integration**: Added social links (X, GitHub, Telegram) to the main popup
- **Website Selection**: Choose between BullX and Axiom before entering token
- **Manual Overlay Control**: Overlay only opens when user explicitly joins a channel

### 🔧 Technical Improvements
- **Chrome Storage Integration**: Channels stored in Chrome's local storage
- **Automatic Channel Cleanup**: Empty channels are automatically deleted
- **Real-time Message Sync**: Messages appear instantly across all overlay instances
- **Enhanced Error Handling**: Better connection error handling and user feedback
- **Improved UI/UX**: Cleaner interface with better visual hierarchy

### 🐛 Bug Fixes
- Fixed connection errors when opening overlay
- Resolved content script injection issues
- Improved message passing between extension components
- Fixed overlay positioning and display issues

### 📱 UI/UX Changes
- **Streamlined Popup**: Three-step process (Username → Website → Token)
- **Channel-Specific Overlays**: Each token opens its own chat instance
- **User Highlighting**: Current user appears in bold in active users list
- **Close/Minimize Buttons**: Proper overlay controls with channel cleanup
- **Social Media Section**: Easy access to project social channels

### 🔒 Security & Performance
- **Permission Optimization**: Updated host permissions for better security
- **Storage Management**: Efficient channel data storage and cleanup
- **Memory Management**: Automatic cleanup of unused channels

### 📋 Migration Notes
- Previous chat history format has been updated to channel-based system
- Users will need to re-enter their username on first use
- New channel system provides better isolation between different tokens

---

## Previous Versions

### [1.0] - Initial Release
- Basic chat overlay functionality
- Automatic token detection
- Simple user interface
- Firebase integration (removed in 0.2.5) 