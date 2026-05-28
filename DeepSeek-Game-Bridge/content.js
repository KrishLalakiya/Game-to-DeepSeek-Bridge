chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "inject_and_submit") {
        console.log("DeepSeek Bridge: Received raw text:", request.text);
        processDeepSeekQuery(request.text);
    }
});

async function processDeepSeekQuery(text) {
    // DeepSeek uses `chat-input` ID, but we fallback to any visible/last textarea if their DOM changes
    let inputBox = document.getElementById('chat-input');
    if (!inputBox) {
        const textareas = document.querySelectorAll('textarea');
        inputBox = textareas[textareas.length - 1];
    }
    
    if (!inputBox) {
        console.error("DeepSeek Bridge: Could not find any textarea on " + window.location.href);
        return;
    }

    console.log("DeepSeek Bridge: Injecting into:", inputBox);

    // Disable DeepThink and Web Search if they are automatically turned on by previous sessions
    disableExtraFeatures();

    // Focus the box first (required for many rich text frameworks)
    inputBox.focus();

    // 1. First method: Native document command (Often works natively and fires all framework events)
    const success = document.execCommand('insertText', false, text);

    // 2. Fallback method: React/Vue synthetic value overrides
    if (!success || inputBox.value !== text) {
        console.log("DeepSeek Bridge: execCommand fallback to React value setter.");
        const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
        nativeTextAreaValueSetter.call(inputBox, text);
        
        // Dispatch all relevant events to wake up the framework
        inputBox.dispatchEvent(new Event('input', { bubbles: true }));
        inputBox.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Wait for the UI to update the Send Arrow button (deepseek disables the button when empty)
    setTimeout(() => {
        console.log("DeepSeek Bridge: Firing Submit Events");
        
        // Method 1: The true Native Enter Key sequence
        inputBox.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13 }));
        inputBox.dispatchEvent(new KeyboardEvent('keypress', { bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13 }));
        inputBox.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13 }));

        // Method 2: Physical Click on the Send Arrow
        // On DeepSeek, the active send button lacks text and is situated at the edge. We can locate all icon buttons
        // near the text area and select the last one, which is predictably the send button!
        let searchArea = inputBox.closest('form') || inputBox.parentElement.parentElement.parentElement || document.body;
        let iconButtons = Array.from(searchArea.querySelectorAll('button, div[role="button"], .ds-icon-button')).filter(el => {
            return el.querySelector('svg') && (el.innerText || "").trim() === "";
        });
        
        let sendButton = iconButtons[iconButtons.length - 1]; // The very last icon-only button is typically Send
        if (sendButton) {
            try { sendButton.click(); } catch(e){}
        }
        
        waitForAIResponse(text);
    }, 100); // Reduced interval to speed up injection
}

function waitForAIResponse(injectedText) {
    let debounceTimer;
    let aiStartedReplying = false;
    
    const getBubbles = () => document.querySelectorAll('.ds-markdown, .prose, .chat-message');
    const initialBubbles = getBubbles();
    const initialLength = initialBubbles.length;
    const initialLastText = initialLength > 0 ? (initialBubbles[initialLength - 1].innerText || initialBubbles[initialLength - 1].textContent || "").trim() : "";

    const observer = new MutationObserver((mutations) => {
        const bubbles = getBubbles();
        const currentLength = bubbles.length;
        
        if (!aiStartedReplying && currentLength > 0) {
            const lastBubble = bubbles[currentLength - 1];
            const lastText = (lastBubble.innerText || lastBubble.textContent || "").trim();
            
            // Wait until the last bubble is explicitly the AI's new response.
            // It must not equal the previous final answer, nor the exact prompt we just sent.
            if (lastText !== "" && lastText !== initialLastText && lastText !== injectedText.trim()) {
                aiStartedReplying = true;
                console.log("DeepSeek Bridge: AI started responding!");
            }
        }

        // Once the AI has definitely started generating, we reset the timer on every DOM mutation
        if (aiStartedReplying) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                observer.disconnect();
                console.log("DeepSeek Bridge: AI finished responding. Extracting...");
                extractAndReturnAnswer(injectedText);
            }, 1200); // Increased from 700ms to 1200ms to be safe against streaming stutters
        }
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}

function extractAndReturnAnswer(injectedText) {
    const messageBubbles = document.querySelectorAll('.ds-markdown, .prose, .chat-message'); 
    if (messageBubbles.length === 0) return;
    
    // Scan backwards to guarantee we extract the AI answer, skipping the user prompt
    let finalAnswer = "";
    for (let i = messageBubbles.length - 1; i >= 0; i--) {
        let text = messageBubbles[i].innerText || messageBubbles[i].textContent || "";
        text = text.trim();
        if (text.length > 0 && (!injectedText || text !== injectedText.trim())) {
            finalAnswer = text;
            break;
        }
    }

    if (finalAnswer) {
        chrome.runtime.sendMessage({
            action: "deepseek_answer_ready",
            answer: finalAnswer
        });
    }
}

function disableExtraFeatures() {
    // DeepSeek toggles are generally located near the chat input
    const container = document.querySelector('textarea')?.closest('form') || document.body;
    const toggles = container.querySelectorAll('div[role="button"], button, div[role="switch"]');
    
    for (let el of toggles) {
        const text = (el.innerText || "").trim();
        if (text === "DeepThink (R1)" || text === "DeepThink" || text === "Search") {
            // Check if it's actually active by checking standard attributes or if its style has turned blue (DeepSeek's brand active color)
            const html = el.outerHTML.toLowerCase();
            const isActive = el.getAttribute('aria-checked') === 'true' || 
                             el.getAttribute('aria-pressed') === 'true' ||
                             html.includes('active') || 
                             html.includes('checked');
                             
            const rgb = window.getComputedStyle(el).color.match(/\d+/g);
            let isBlue = false;
            if (rgb && rgb.length >= 3) {
                const [r, g, b] = rgb.map(Number);
                if (b > r + 30 && b > g + 30) isBlue = true; // Highly blue = active state in Deepseek UI
            }

            if (isActive || isBlue) {
                console.log("DeepSeek Bridge: Automatically turning off " + text);
                try { el.click(); } catch(e){}
            }
        }
    }
}
