import { extension_settings } from "../../../extensions.js";
import { eventSource, event_types } from "../../../script.js";

// Default extension settings
const defaultSettings = {
    enabled: true,
    triggerKeywords: ["messy bedroom", "skirt", "seductive", "tshirt"],
    defaultTags: "masterpiece, best quality, highres, photorealistic",
    negativePrompt: "lowres, bad anatomy, bad hands, text, error, missing fingers"
};

// Track the last generated prompt to prevent consecutive duplicates
let lastGeneratedPrompt = "";

async function loadSettings() {
    if (!extension_settings.auto_sd_trigger) {
        extension_settings.auto_sd_trigger = defaultSettings;
    }
}

// Function to execute the slash command in SillyTavern
async function triggerSDCommand(sdPrompt) {
    const fullCommand = `/sd ${sdPrompt}`;
    console.log(`[Auto SD Trigger] Executing: ${fullCommand}`);
    
    // Check if SillyTavern's slash command parser is available
    if (typeof window.executeSlashCommands === "function") {
        await window.executeSlashCommands(fullCommand);
    } else {
        // Fallback: Dispatch into chat input if global function isn't exposed directly in your version
        const chatInput = document.querySelector("#send_textarea");
        if (chatInput) {
            chatInput.value = fullCommand;
            document.querySelector("#send_but")?.click();
        }
    }
}

// Listen for incoming messages
eventSource.on(event_types.MESSAGE_RECEIVED, async (messageId) => {
    const settings = extension_settings.auto_sd_trigger;
    if (!settings || !settings.enabled) return;

    // Get the context to fetch the latest message
    const context = SillyTavern.getContext();
    const message = context.chat[messageId];

    if (!message || message.is_user) return;

    const messageText = message.mes.toLowerCase();

    // Check if the message contains visual descriptions matching your criteria
    const matchesKeyword = settings.triggerKeywords.some(keyword => messageText.includes(keyword));

    if (matchesKeyword) {
        // Construct the Stable Diffusion prompt
        let generatedPrompt = "1girl, solo, standing in a messy bedroom, wearing a black t-shirt and black pleated skirt, pulling up skirt to reveal thighs, seductive expression, detailed background, dramatic lighting";
        
        if (settings.defaultTags) {
            generatedPrompt += `, ${settings.defaultTags}`;
        }
        
        // **Duplicate Prevention Check**
        if (generatedPrompt === lastGeneratedPrompt) {
            console.log("[Auto SD Trigger] Duplicate prompt detected consecutively. Skipping image generation.");
            return;
        }

        // Update the tracker with the current prompt and trigger the command
        lastGeneratedPrompt = generatedPrompt;
        await triggerSDCommand(generatedPrompt);
    }
});

// Initialization
jQuery(async () => {
    await loadSettings();
    console.log("[Auto SD Trigger] Extension loaded successfully with duplicate protection.");
});
