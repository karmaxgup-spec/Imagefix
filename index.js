import { extension_settings } from "../../../extensions.js";
import { eventSource, event_types } from "../../../script.js";
import { SlashCommandParser } from "../../../slash-commands/SlashCommandParser.js";

// Default extension settings
const defaultSettings = {
    enabled: true,
    // Regex to match format like: [Priya sent a picture that contains: RANDOM PROMPT]
    triggerRegex: "\\[.*?(?:sent a picture that contains\vert{}picture contains):\\s*([^\\]]+)\\]",
    defaultTags: "masterpiece, best quality, highres, photorealistic"
};

// Track the last generated prompt to prevent consecutive duplicates
let lastGeneratedPrompt = "";

async function loadSettings() {
    if (!extension_settings.auto_sd_trigger) {
        extension_settings.auto_sd_trigger = defaultSettings;
    }
}

// Function to execute the slash command using SillyTavern's official parser
async function triggerSDCommand(sdPrompt) {
    const fullCommand = `/sd ${sdPrompt}`;
    console.log(`[Auto SD Trigger] Executing: ${fullCommand}`);
    
    try {
        if (typeof SlashCommandParser.parse === "function") {
            await SlashCommandParser.parse(fullCommand);
        } else {
            const chatInput = document.querySelector("#send_textarea");
            if (chatInput) {
                chatInput.value = fullCommand;
                document.querySelector("#send_but")?.click();
            }
        }
    } catch (error) {
        console.error("[Auto SD Trigger] Failed to execute /sd command:", error);
    }
}

// Listen for incoming messages
eventSource.on(event_types.MESSAGE_RECEIVED, async (messageId) => {
    const settings = extension_settings.auto_sd_trigger;
    if (!settings || !settings.enabled) return;

    const context = SillyTavern.getContext();
    const message = context.chat[messageId];

    if (!message || message.is_user) return;

    const messageText = message.mes;

    try {
        // Compile the regex to find the bracketed picture prompt
        const regex = new RegExp(settings.triggerRegex, "i");
        const match = messageText.match(regex);

        if (match && match[1]) {
            // Extract the "RANDOM PROMPT" portion
            let generatedPrompt = match[1].trim();
            
            if (settings.defaultTags) {
                generatedPrompt += `, ${settings.defaultTags}`;
            }
            
            // **Duplicate Prevention Check**
            if (generatedPrompt === lastGeneratedPrompt) {
                console.log("[Auto SD Trigger] Duplicate prompt detected consecutively. Skipping image generation.");
                return;
            }

            // Update tracker and trigger command
            lastGeneratedPrompt = generatedPrompt;
            await triggerSDCommand(generatedPrompt);
        }
    } catch (e) {
        console.error("[Auto SD Trigger] Invalid Regex pattern:", e);
    }
});

// Initialization
jQuery(async () => {
    await loadSettings();
    console.log("[Auto SD Trigger] Extension loaded successfully with bracketed prompt matching.");
});
