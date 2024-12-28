// Create context menu items when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "selectSimilarLinks",
    title: "Select Similar Links",
    contexts: ["link"]
  });

  chrome.contextMenus.create({
    id: "selectSingleLink",
    title: "Select Individual Link",
    contexts: ["link"]
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

// Listen for connection errors
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background script received message:", message);
  
  // Handle opening multiple URLs
  if (message.action === "openUrls") {
    message.urls.forEach(url => {
      chrome.tabs.create({ url: url });
    });
  }
});
