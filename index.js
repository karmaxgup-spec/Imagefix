import { extension_settings } from "../../../extensions.js";
import { eventSource, event_types } from "../../../script.js";
import { SlashCommandParser } from "../../../slash-commands/SlashCommandParser.js";

const defaultSettings = {
    enabled: true,
    defaultTags: "masterpiece, best quality, highres, photorealistic"
};

let lastGeneratedPrompt = "";

async function loadSettings() {
    if (!extension_settings.auto_sd_trigger) {
        extension_settings.auto_sd_trigger = defaultSettings;
    }
}

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

eventSource.on(event_types.MESSAGE_RECEIVED, async (messageId) => {
    const settings = extension_settings.auto_sd_trigger;
    if (!settings || !settings.enabled) return;

    const context = SillyTavern.getContext();
    const message = context.chat[messageId];

    if (!message || message.is_user) return;

    const messageText = message.mes;
    console.log("[Auto SD Trigger] Scanning incoming message:", messageText);

    // Pure Regex to match brackets containing "contains:" and capture everything after it
    const regex = /\[[^\]]*?contains:\s*([^\]]+)\]/i;
    const match = messageText.match(regex);

    if (match && match[1]) {
        let generatedPrompt = match[1].trim();
        console.log("[Auto SD Trigger] Successfully extracted prompt:", generatedPrompt);
        
        if (settings.defaultTags) {
            generatedPrompt += `, ${settings.defaultTags}`;
        }
        
        // Duplicate Prevention Check (won't trigger twice in a row)
        if (generatedPrompt === lastGeneratedPrompt) {
            console.log("[Auto SD Trigger] Duplicate prompt detected consecutively. Skipping image generation.");
            return;
        }

        lastGeneratedPrompt = generatedPrompt;
        await triggerSDCommand(generatedPrompt);
    } else {
        console.log("[Auto SD Trigger] No matching bracket pattern found.");
    }
});

jQuery(async () => {
    await loadSettings();
    console.log("[Auto SD Trigger] Extension loaded successfully with pure regex.");
});
