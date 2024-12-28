// Initialize extension and show onboarding if needed
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.sync.set({
      affiliateEnabled: true,
      onboardingComplete: false
    }, () => {
      // Open onboarding page
      chrome.tabs.create({
        url: 'onboarding.html'
      });
    });
  }

  // Create context menu items when extension is installed
  chrome.contextMenus.create({
    id: "selectSimilarLinks",
    title: "Select Similar Links",
    contexts: ["link"]
  });

  chrome.contextMenus.create({
    id: "selectByAttributes",
    title: "Select by Attributes",
    contexts: ["link"]
  });

  chrome.contextMenus.create({
    id: "selectSingleLink",
    title: "Select Individual Link",
    contexts: ["link"]
  });

  chrome.contextMenus.create({
    id: "selectByRectangle",
    title: "Select Links by Rectangle",
    contexts: ["all"]  // Available everywhere since we might want to start drawing anywhere
  });

  chrome.contextMenus.create({
    id: "openSelectedLinks",
    title: "Open All Selected Links",
    contexts: ["all"]  // Available everywhere since we might have links selected
  });

  chrome.contextMenus.create({
    id: "deselectAllLinks",
    title: "Deselect All Links",
    contexts: ["all"]
  });
});

// Store the target element temporarily
let targetElementInfo = null;

// Handle keyboard commands
chrome.commands.onCommand.addListener(async (command) => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      await chrome.tabs.sendMessage(tab.id, { action: command });
    }
  } catch (err) {
    console.error("Error handling keyboard command:", err);
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    if (info.menuItemId === "selectSimilarLinks" || info.menuItemId === "selectSingleLink") {
      console.log("Context menu info:", info);
      
      // Inject content script first if needed
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      // Send message to content script and wait for response
      await chrome.tabs.sendMessage(tab.id, {
        action: info.menuItemId === "selectSimilarLinks" ? "highlightLink" : "highlightSingleLink",
        data: { linkUrl: info.linkUrl }
      });
    } else if (info.menuItemId === "selectByAttributes") {
      // Get element info from content script
      chrome.tabs.sendMessage(tab.id, {
        action: "getElementInfo",
        data: {
          linkUrl: info.linkUrl
        }
      }, (response) => {
        if (response && response.elementInfo) {
          targetElementInfo = response.elementInfo;
          // Open the attribute selector popup
          chrome.windows.create({
            url: 'attribute-selector.html',
            type: 'popup',
            width: 800,
            height: 600
          });
        }
      });
    } else if (info.menuItemId === "selectByRectangle") {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      await chrome.tabs.sendMessage(tab.id, {
        action: "startRectangleSelect"
      });
    } else if (info.menuItemId === "openSelectedLinks") {
      await chrome.tabs.sendMessage(tab.id, {
        action: "openSelectedLinks"
      });
    } else if (info.menuItemId === "deselectAllLinks") {
      await chrome.tabs.sendMessage(tab.id, {
        action: "deselectAllLinks"
      });
    }
  } catch (err) {
    console.error("Error in context menu handler:", err);
    // If the error is about the content script not being ready, try to inject it
    if (err.message.includes("Could not establish connection")) {
      console.log("Attempting to reinject content script...");
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
      } catch (injectErr) {
        console.error("Failed to inject content script:", injectErr);
      }
    }
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background script received message:", request);
  
  if (request.action === "getTargetElement") {
    sendResponse({ elementInfo: targetElementInfo });
    targetElementInfo = null; // Clear after use
  }

  // Handle opening multiple URLs
  if (request.action === "openUrls") {
    request.urls.forEach(url => {
      chrome.tabs.create({ url: url });
    });
  }
});
