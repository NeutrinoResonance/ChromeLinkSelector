// Create context menu items when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "selectSimilarLinks",
    title: "Select Similar Links",
    contexts: ["link"]
  });

  chrome.contextMenus.create({
    id: "selectSingleLink",
    title: "Select Only This Link",
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
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "selectSimilarLinks" || info.menuItemId === "selectSingleLink") {
    console.log("Context menu info:", info);
    
    // Inject content script first if needed
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    }).then(() => {
      // Send message to content script
      chrome.tabs.sendMessage(tab.id, {
        action: info.menuItemId === "selectSimilarLinks" ? "highlightLink" : "highlightSingleLink",
        data: { linkUrl: info.linkUrl }
      });
    }).catch(err => {
      console.error("Error injecting content script:", err);
    });
  } else if (info.menuItemId === "openSelectedLinks") {
    chrome.tabs.sendMessage(tab.id, {
      action: "openSelectedLinks"
    });
  } else if (info.menuItemId === "deselectAllLinks") {
    chrome.tabs.sendMessage(tab.id, {
      action: "deselectAllLinks"
    });
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
