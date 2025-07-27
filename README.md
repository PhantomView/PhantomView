# PhantomView v0.8.7

Real-time viewer analytics & embedded chat for Solana trading platforms.

A Google Chrome extension that provides live viewer analytics and chat interface for Solana memecoins. PhantomView overlays on trading websites to show real-time data and community features.

## 🚀 Features

### **v0.8.7 New Features:**
- **💬 Real-time Chat**: Live chat functionality with Firebase integration
- **👥 User Presence**: See real usernames of users currently viewing the same CA
- **💖 Message Reactions**: React to messages with hearts, thumbs up/down
- **🛡️ Chat Protection**: Spam protection, link filtering, and content moderation
- **📱 Draggable Users Popup**: Movable users list with close functionality
- **📋 CA Copy Feature**: Click CA address to copy full contract address
- **💰 Coin Name Display**: Shows actual coin name (e.g., "$PEPE", "$DOGE") in chat title
- **🔄 Enhanced Scrolling**: Smart auto-scroll that respects user reading position
- **⚡ Faster Updates**: Reduced polling intervals for near real-time experience

### **v0.3.0 Features:**
- **🔍 CA Detection**: Automatically detects when users are viewing Contract Address (CA) pages
- **👤 Login UI**: New streamlined login interface for CA pages with username input and Join button
- **🎯 Smart UI Routing**: Different interfaces based on page type:
  - **CA Pages**: Login popup (Axiom, Neo BullX, DexScreener, LetsBonk)
  - **Trading Sites**: "Coin not found" error popup
  - **Other Sites**: Full analytics dashboard
- **🖱️ Header-Only Dragging**: Extension can only be moved by clicking and holding the header
- **✋ Hand Cursor**: Intuitive grab/grabbing cursors for dragging

### **Core Features:**
- **📊 Live Analytics**: Real-time memecoin data including holders, pro traders, insiders, and bundlers
- **💬 Chat Interface**: Community chat functionality with real-time messaging
- **🎨 Modern UI**: Dark theme with semi-transparent overlay
- **📍 Persistent Overlay**: Stays on screen until manually closed
- **🔄 Movable Interface**: Drag to reposition anywhere on the page
- **🌐 Multi-Site Support**: Works on various Solana trading platforms

## 📋 Supported Platforms

### **CA Detection (v0.8.7):**
- **Axiom Trade**: `https://axiom.trade/meme/[CA]`
- **Neo BullX**: `https://neo.bullx.io/terminal?chainId=[ID]&address=[CA]`
- **DexScreener**: `https://dexscreener.com/solana/[CA]`
- **LetsBonk**: `https://letsbonk.fun/token/[CA]`
- **Birdeye**: `https://birdeye.so/token/[CA]`
- **Solscan**: `https://solscan.io/token/[CA]`
- **Solana.fm**: `https://solana.fm/token/[CA]`
- **Jupiter**: `https://jup.ag/swap/[CA]`
- **Pump.fun**: `https://pump.fun/token/[CA]`
- **Bonkbot**: `https://bonkbot.com/token/[CA]`
- **Tensor**: `https://tensor.trade/token/[CA]`

### **General Trading Sites:**
- Solscan.io
- Solana.com
- Raydium.io
- DexScreener.com
- And more...

## 🛠️ Installation

### **Manual Installation:**
1. **Download**: Clone or download this repository
2. **Open Chrome**: Go to `chrome://extensions/`
3. **Enable Developer Mode**: Toggle the switch in the top right
4. **Load Extension**: Click "Load unpacked" and select the `phantomview` folder
5. **Pin Extension**: Click the puzzle piece icon and pin PhantomView to your toolbar

### **From Source:**
```bash
git clone https://github.com/PhantomView/PhantomView.git
cd PhantomView
# Follow manual installation steps above
```

## 🎮 Usage

### **On CA Pages:**
1. Navigate to a supported CA page (Axiom, Neo BullX, DexScreener, LetsBonk, etc.)
2. Click the PhantomView icon in your toolbar
3. Enter your username and click "Join"
4. Access live analytics and real-time chat for that specific token

### **On Other Trading Sites:**
1. Visit any Solana trading platform
2. Click the PhantomView icon
3. View general analytics or "Coin not found" message

### **On Regular Websites:**
1. Click the PhantomView icon
2. View the full analytics dashboard
3. Enter username to join the community

## 🔧 Technical Details

### **Architecture:**
- **Manifest V3**: Modern Chrome extension architecture
- **Content Scripts**: Inject into web pages for data extraction
- **Background Service Worker**: Handles extension logic and messaging
- **Overlay System**: Injects UI directly into pages for seamless integration
- **Firebase Integration**: Real-time database for chat and user presence

### **File Structure:**
```
phantomview/
├── manifest.json          # Extension configuration
├── background.js          # Service worker (main logic)
├── content.js            # Content script (page injection)
├── firebase-config.js    # Firebase configuration
├── FIREBASE_SETUP.md     # Firebase setup documentation
├── icons/                # Extension icons
│   ├── PhantomViewtransparent.png
│   ├── PhantomView-32-optimized.png
│   └── PhantomView-48-optimized.png
└── README.md             # This file
```

## 🎨 UI Components

### **Login Popup (CA Pages):**
- Compact 320x280px design
- Username input field
- "Join" button
- Draggable header
- Semi-transparent background

### **Chatroom Interface:**
- Real-time message display
- User presence tracking
- Message reactions (hearts, thumbs up/down)
- Draggable users popup
- CA address copy functionality
- Coin name display in title

### **Analytics Dashboard:**
- Live statistics display
- Holder counts
- Pro trader metrics
- Insider percentages
- Bundler statistics

### **Error Popup:**
- "Coin not found" message
- Red error icon
- Clean, minimal design

## 🤝 Contributing

We welcome contributions! Please feel free to submit issues, feature requests, or pull requests.

### **Development Setup:**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

- **Email**: developer@phantomview.org
- **Issues**: [GitHub Issues](https://github.com/PhantomView/PhantomView/issues)
- **Discussions**: [GitHub Discussions](https://github.com/PhantomView/PhantomView/discussions)

## 🔄 Version History

### **v0.8.7** (Current)
- Added real-time chat functionality with Firebase integration
- Implemented user presence tracking with real usernames
- Added message reactions (hearts, thumbs up/down)
- Enhanced chat protection (spam, links, content filtering)
- Added draggable users popup with close functionality
- Implemented CA address copy-to-clipboard feature
- Added coin name display in chat title
- Improved scrolling behavior to respect user reading position
- Reduced polling intervals for faster real-time updates
- Added support for more trading platforms (Birdeye, Solscan, etc.)

### **v0.3.0** (Previous)
- Added CA detection for multiple trading platforms
- Implemented login UI for CA pages
- Added header-only dragging functionality
- Updated cursor to hand icons
- Improved icon sizing and optimization

### **v0.2.5** (Previous)
- Channel-based chat system
- Multi-screen setup process
- User management features
- Social media integration
- Manual overlay control

---

**PhantomView** - Bringing the Solana memecoin community together with real-time analytics and chat! 🚀 