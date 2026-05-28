# 🎮 Game to DeepSeek Bridge

> A Chrome Extension + Python automation system that captures in-game text, queries DeepSeek AI instantly, and pastes the answer back — all with a single hotkey.

---

## 📌 Overview

**Game to DeepSeek Bridge** is a productivity automation tool built as a Chrome Manifest V3 extension paired with a lightweight Python local server.

Press `Ctrl+Shift+5` at any moment in your game, and the extension silently reads your clipboard, forwards the text to [DeepSeek Chat](https://chat.deepseek.com), waits for the AI to finish responding, then automatically copies the answer back to your clipboard and pastes it — without you ever switching windows.

---

## ✨ Features

- 🔑 **One-Hotkey Workflow** — `Ctrl+Shift+5` triggers the entire pipeline end-to-end
- 📋 **Clipboard Interception** — Reads game text via a sandboxed Offscreen Document (no popup needed)
- 🤖 **Automated AI Query** — Injects the text into DeepSeek's chat input and submits it programmatically
- 👁️ **Smart Response Detection** — Uses a `MutationObserver` to detect when the AI finishes streaming
- 📤 **Auto-Paste Back** — Overwrites your clipboard with the AI answer and triggers `Ctrl+V` via a local Python server
- 🔇 **DeepThink / Web Search Auto-Disable** — Turns off extra DeepSeek features to keep responses fast
- 🔔 **Desktop Notifications** — Status updates at every step so you always know what's happening
- 🛟 **Graceful Fallback** — If the Python paster is offline, the answer is still silently copied to clipboard

---

## 🏗️ Architecture

```
[ Game / Any App ]
       │  Ctrl+C to copy text
       ▼
[ Hotkey: Ctrl+Shift+5 ]
       │
       ▼
[ background.js ]  ──────────────────────►  [ offscreen.js ]
  (reads clipboard)                          (execCommand paste)
       │
       ▼
[ content.js @ chat.deepseek.com ]
  (injects text → fires submit)
       │
       ▼
[ DeepSeek AI ]  ─── streams response ───►  [ MutationObserver ]
                                                     │
       ◄─────────────────────────────────────────────┘
       │
       ▼
[ background.js ]  ──────────────────────►  [ offscreen.js ]
  (writes answer to clipboard)               (execCommand copy)
       │
       ▼
[ auto_paste_server.py ]  ──────────────►  [ Game / Any App ]
  (HTTP :11499 → PyAutoGUI Ctrl+V)
```

---

## 📁 Project Structure

```
game-deepseek-bridge/
├── manifest.json           # Chrome Extension config (Manifest V3)
├── background.js           # Service Worker: orchestrates the full pipeline
├── content.js              # Injected into DeepSeek: types, submits, waits, extracts
├── offscreen.html          # Hidden page required for Clipboard API access in MV3
├── offscreen.js            # Handles clipboard read/write via execCommand
├── auto_paste_server.py    # Local HTTP server (port 11499) that simulates Ctrl+V
└── icon.png                # Extension icon (128x128)
```

---

## 🚀 Setup & Installation

### 1. Clone the Repository

```bash
git clone https://github.com/KrishLalakiya/Game-to-DeepSeek-Bridge.git
cd DeepSeek-Game-Bridge
```

### 2. Load the Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer Mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the cloned project folder

The extension will appear in your toolbar as **"Game to DeepSeek Bridge"**.

### 3. Set Up the Python Auto-Paste Server

Install the required dependency:

```bash
pip install pyautogui
```

Run the server:

```bash
python auto_paste_server.py
```

Keep this terminal open while playing. You should see:

```
[ON] Auto-paste server listening on port 11499
```

### 4. Open DeepSeek

Go to [https://chat.deepseek.com](https://chat.deepseek.com) and keep the tab open in Chrome.

---

## 🎯 How to Use

1. Run `python auto_paste_server.py` in a terminal
2. Open `chat.deepseek.com` in Chrome
3. In your game, copy any text with `Ctrl+C`
4. Press `Ctrl+Shift+5`
5. Watch the answer auto-paste into your game ✅

---

## ⚙️ Configuration

| Setting | File | Default |
|---|---|---|
| Hotkey | `manifest.json` → `commands` | `Ctrl+Shift+5` |
| Auto-paste server port | `auto_paste_server.py` & `background.js` | `11499` |
| AI response debounce delay | `content.js` → `waitForAIResponse` | `1200ms` |
| Submit delay after text injection | `content.js` → `processDeepSeekQuery` | `100ms` |

---

## 🛡️ Permissions Explained

| Permission | Reason |
|---|---|
| `clipboardRead` / `clipboardWrite` | Capture game text and return AI answers |
| `offscreen` | Required by Chrome MV3 to access clipboard in background |
| `tabs` | Locate the DeepSeek tab and send messages |
| `scripting` | Inject content scripts dynamically if needed |
| `notifications` | Show status updates at each pipeline stage |
| `host: chat.deepseek.com` | Run the content script on DeepSeek |
| `host: 127.0.0.1:11499` | Communicate with the local Python paster |

---

## 🐛 Troubleshooting

**"DeepSeek tab not ready!" notification**

Refresh the `chat.deepseek.com` tab with `F5` and try again.

**Nothing happens after pressing hotkey**

Check that the hotkey isn't conflicting with another extension at `chrome://extensions/shortcuts`.

**Auto-paste isn't working**

Make sure `auto_paste_server.py` is running. The extension will fall back to clipboard copy — use `Ctrl+V` manually.

**Answer extracted incorrectly**

DeepSeek may have updated their DOM. Check the selectors in `content.js` (`.ds-markdown`, `.prose`, `.chat-message`).

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| Browser Extension | Chrome Manifest V3 (Service Worker + Content Script + Offscreen Document) |
| Extension Logic | Vanilla JavaScript |
| Auto-paste Server | Python 3 — `http.server`, `pyautogui`, `threading` |

---

## 🤝 Contributing

Pull requests are welcome! If DeepSeek updates their UI and selectors break, please open an issue with the new DOM structure.





