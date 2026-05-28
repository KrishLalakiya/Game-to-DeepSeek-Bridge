chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.target !== 'offscreen') return false;

    if (request.action === 'read_clipboard') {
        readClipboard().then(sendResponse);
        return true; 
    }

    if (request.action === 'write_clipboard') {
        writeClipboard(request.text).then(sendResponse);
        return true;
    }
});

async function readClipboard() {
    try {
        // Because navigator.clipboard hangs indefinitely without a UI focus state,
        // we MUST use the classic DOM document.execCommand inside an offscreen textarea!
        // Thanks to the 'clipboardRead' manifest permission, this won't require a gesture.
        const target = document.getElementById('clipboard-target');
        target.value = ''; 
        target.focus();
        document.execCommand('paste'); 
        return target.value;
    } catch (err) {
        console.error('Failed to read clipboard:', err);
        return null;
    }
}

async function writeClipboard(text) {
    try {
        const target = document.getElementById('clipboard-target');
        target.value = text;
        target.select();
        document.execCommand('copy'); 
        return true;
    } catch (err) {
        console.error('Failed to write clipboard:', err);
        return false;
    }
}
