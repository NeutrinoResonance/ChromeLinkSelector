// Create context menu items when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "openSimilarLinks",
    title: "Select Similar Links",
    contexts: ["link"]
  });

  chrome.contextMenus.create({
    id: "openAllSelected",
    title: "Open All Selected Links",
    contexts: ["all"]  // Available everywhere since we might have links selected
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "openSimilarLinks") {
    console.log("Context menu info:", info);
    
    // Inject content script first if needed
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    }).then(() => {
      // Then send the message
      chrome.tabs.sendMessage(tab.id, {
        action: "highlightLink",
        data: { 
          linkUrl: info.linkUrl,
          targetElementId: info.targetElementId
        }
      }).catch(err => {
        console.error("Error sending message:", err);
      });
    }).catch(err => {
      console.error("Error injecting content script:", err);
    });
  } else if (info.menuItemId === "openAllSelected") {
    chrome.tabs.sendMessage(tab.id, {
      action: "openSelectedLinks"
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
