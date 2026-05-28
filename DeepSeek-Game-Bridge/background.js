// background.js
console.log("The Background Script is alive and running!");
// --- 1. Manage the Offscreen Document ---
async function setupOffscreenDocument(path) {
    // Check if it already exists
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL(path)]
    });

    if (existingContexts.length > 0) return; // Already running

    // Create the offscreen document
    await chrome.offscreen.createDocument({
        url: path,
        reasons: ['CLIPBOARD'], // Chrome requires a valid reason
        justification: 'Read from and write to the system clipboard securely.'
    });
}

// --- 2. The Main Hotkey Trigger ---
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'trigger-process') {
        console.log("Hotkey pressed! Waking up offscreen document...");

        // Ensure the offscreen doc is ready
        await setupOffscreenDocument('offscreen.html');

        // Grab the text you just copied in your game
        const copiedText = await chrome.runtime.sendMessage({
            target: 'offscreen',
            action: 'read_clipboard'
        });

        if (!copiedText) {
            showNotification("Nothing found in your clipboard!");
            return;
        }

        console.log("Captured from game:", copiedText);
        showNotification("Processing: " + copiedText.substring(0, 30) + "...");

        // Find the DeepSeek tab and pass the torch
        const tabs = await chrome.tabs.query({ url: "*://chat.deepseek.com/*" });
        if (tabs.length === 0) {
            showNotification("Error: Please open chat.deepseek.com in a pinned tab.");
            return;
        }

        // Try to send to Content Script in any available tab (helps if one tab is sleeping/discarded)
        let deliverySuccess = false;
        for (let tab of tabs) {
            try {
                await chrome.tabs.sendMessage(tab.id, {
                    action: "inject_and_submit",
                    text: copiedText
                });
                deliverySuccess = true;
                break; // Stop after first successful injection
            } catch (error) {
                console.warn("Skipping unresponsive tab:", tab.id, error.message);
            }
        }

        if (!deliverySuccess) {
            console.error("Connection failed: No DeepSeek tabs were ready to receive.");
            showNotification("Error: DeepSeek tab not ready! PLEASE REFRESH (F5) the chat.deepseek.com page.");
        }
    }
});

// --- 3. Listen for the Final Answer from DeepSeek ---
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === "deepseek_answer_ready") {

        // Make sure offscreen is ready to write
        await setupOffscreenDocument('offscreen.html');

        // Overwrite the user's system clipboard with the AI's answer
        await chrome.runtime.sendMessage({
            target: 'offscreen',
            action: 'write_clipboard',
            text: message.answer
        });

        // Trigger the Python auto-paster
        try {
            await fetch('http://127.0.0.1:11499/paste');
            console.log("Triggered auto-paster successfully.");
            showNotification("Answer copied and auto-pasted into game!");
        } catch (e) {
            console.error("Auto-paster fetch failed:", e);
            showNotification("Answer copied! Press Ctrl+V in your game. (Auto-paster offline)");
        }
    }
});

// Helper: Desktop Notifications
function showNotification(message) {
    chrome.notifications.create({
        type: "basic",
        iconUrl: "icon.png", // Just create a blank 128x128 image named icon.png in your folder for now
        title: "DeepSeek Bridge",
        message: message
    });
}