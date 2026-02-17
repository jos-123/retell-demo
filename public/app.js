import { RetellWebClient } from "https://cdn.jsdelivr.net/npm/retell-client-js-sdk@latest/+esm";

// Retell AI Implementation & Widget Logic

const chatWidget = document.getElementById('chat-widget');
const voiceOverlay = document.getElementById('voice-overlay');
const chatTrigger = document.getElementById('chat-trigger');
const voiceTrigger = document.getElementById('voice-trigger');
const closeChatBtn = document.getElementById('close-chat');
const endChatBtn = document.getElementById('end-chat-btn');
const closeVoiceBtn = document.getElementById('close-voice');

const toggleCallBtn = document.getElementById('toggle-call-btn');
const callStatus = document.getElementById('call-status');

// --- UI Logic ---

// Toggle Chat Widget
chatTrigger.addEventListener('click', () => {
    chatWidget.classList.toggle('open');
});

closeChatBtn.addEventListener('click', () => {
    chatWidget.classList.remove('open');
});

// End Chat Session
endChatBtn.addEventListener('click', () => {
    if (confirm("End current chat session?")) {
        chatId = null; // Reset session ID
        const chatLogs = document.getElementById('chat-logs');
        chatLogs.innerHTML = `
            <div class="message bot">
                Hello! I'm Scira, your HR assistant. How can I help you?
            </div>
        `;
    }
});

// Toggle Voice Overlay
const openVoiceOverlay = () => {
    voiceOverlay.classList.remove('hidden'); // Ensure it's not display:none if used
    // Force reflow
    void voiceOverlay.offsetWidth;
    voiceOverlay.classList.add('active');
};

const closeVoiceOverlay = () => {
    voiceOverlay.classList.remove('active');
    // Optional: wait for transition then hide?
    // For now just removing active handles opacity/pointer-events
};

voiceTrigger.addEventListener('click', openVoiceOverlay);
closeVoiceBtn.addEventListener('click', closeVoiceOverlay);

// External Triggers (Hero & Contact)
const heroAgentBtn = document.getElementById('hero-agent-btn');
const contactSectionBtn = document.getElementById('contact-section-btn');

if (heroAgentBtn) heroAgentBtn.addEventListener('click', openVoiceOverlay);
if (contactSectionBtn) contactSectionBtn.addEventListener('click', openVoiceOverlay);

// --- Chat Functionality ---
const chatInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const chatLogs = document.getElementById('chat-logs');
let chatId = null;

const addMessage = (text, sender) => {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender);
    msgDiv.textContent = text;
    chatLogs.appendChild(msgDiv);
    chatLogs.scrollTop = chatLogs.scrollHeight;
};

const handleChatSend = async () => {
    const text = chatInput.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    chatInput.value = '';

    // Show typing indicator (optional update) or just wait
    // simple wait for now

    try {
        // Ensure we have a chat session
        if (!chatId) {
            const initRes = await fetch('/api/create-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // Optional: agent_id can be passed if dynamic, else server uses default
                })
            });

            if (!initRes.ok) throw new Error("Failed to start chat session");
            const initData = await initRes.json();
            chatId = initData.chat_id;
        }

        // Send message
        const res = await fetch('/api/chat-completion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                message: text
            })
        });

        if (!res.ok) throw new Error("Failed to get response");

        const data = await res.json();

        // Handle Retell API response format (messages array)
        let botReply;
        if (data.messages && Array.isArray(data.messages)) {
            const lastMsg = data.messages[data.messages.length - 1];
            botReply = lastMsg.content;
        } else {
            // Fallback for local simulation or different format
            botReply = data.message || data.content || "I didn't get a clear response.";
        }

        addMessage(botReply, 'bot');

    } catch (err) {
        console.error(err);
        addMessage("Sorry, I'm having trouble connecting to my brain right now.", 'bot');
    }
};

sendBtn.addEventListener('click', handleChatSend);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleChatSend();
});

// --- Retell AI Voice Functionality ---
let retellClient = null;
let isCalling = false;

// Initialize Retell Client
// Note: retell-client-js-sdk is loaded via CDN in index.html, exposing `retell` global or similar
// Inspecting how CDN exposes it. Usually it's `RetellWebClient` or similar.
// If not available globally immediately, we might need to wait or check documentation.
// Assuming `RetellWebClient` class is available.

const initRetell = () => {
    try {
        retellClient = new RetellWebClient();

        // Setup Event Listeners
        retellClient.on('call_started', () => {
            console.log('Call started');
            callStatus.textContent = "Connected";
            toggleCallBtn.textContent = "End Call";
            toggleCallBtn.classList.add('active');
            isCalling = true;
        });

        retellClient.on('call_ended', () => {
            console.log('Call ended');
            resetCallUI();
        });

        retellClient.on('error', (error) => {
            console.error('Retell Error:', error);
            callStatus.textContent = "Error occurred";
            alert(`Retell Error: ${error.message || error}`);
            resetCallUI();
        });

        // Agent update handling (optional)
        retellClient.on('agent_start_talking', () => {
            document.querySelector('.visualizer').style.transform = "scale(1.1)";
        });

        retellClient.on('agent_stop_talking', () => {
            document.querySelector('.visualizer').style.transform = "scale(1)";
        });

    } catch (err) {
        console.error("Error initializing Retell SDK:", err);
        callStatus.textContent = "SDK Init Error";
        alert(`Failed to initialize SDK: ${err.message}`);
    }
};

const resetCallUI = () => {
    callStatus.textContent = "Ready to connect";
    toggleCallBtn.textContent = "Start Call";
    toggleCallBtn.classList.remove('active');
    isCalling = false;
};

const toggleCall = async () => {
    if (!retellClient) initRetell();

    if (isCalling) {
        retellClient.stopCall();
    } else {
        callStatus.textContent = "Connecting...";
        try {
            // Get Token from Backend
            const response = await fetch('/api/create-web-call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // Optional: could pass dynamic agent ID here
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || `Failed to get token: ${response.statusText}`);
            }

            const data = await response.json();

            // Start Call
            await retellClient.startCall({
                accessToken: data.access_token
            });

        } catch (error) {
            console.error(error);
            callStatus.textContent = "Connection Failed";
            alert(`Connection Failed: ${error.message}`);
        }
    }
};

toggleCallBtn.addEventListener('click', toggleCall);

// Initialize SDK logic on load
window.addEventListener('load', () => {
    // Check if SDK loaded
    if (typeof RetellWebClient !== 'undefined') {
        console.log("Retell SDK loaded");
    }
});
