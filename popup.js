document.addEventListener('DOMContentLoaded', () => {
    const openAllBtn = document.getElementById('openAllBtn');
    const deselectAllBtn = document.getElementById('deselectAllBtn');
    const affiliateCheckbox = document.getElementById('affiliateEnabled');
    const selectedCountDiv = document.getElementById('selectedCount');

    // Load affiliate setting
    chrome.storage.sync.get(['affiliateEnabled'], (result) => {
        affiliateCheckbox.checked = result.affiliateEnabled !== false;
    });

    // Save affiliate setting when changed
    affiliateCheckbox.addEventListener('change', () => {
        chrome.storage.sync.set({
            affiliateEnabled: affiliateCheckbox.checked
        });
    });

    // Update selected count
    function updateSelectedCount() {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {action: "getSelectedUrls"}, (response) => {
                    if (response && response.urls) {
                        const count = response.urls.length;
                        selectedCountDiv.textContent = count === 1 
                            ? "1 link selected"
                            : `${count} links selected`;
                    }
                });
            }
        });
    }

    // Initial count update
    updateSelectedCount();

    // Handle opening all selected links
    openAllBtn.addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {action: "openSelectedLinks"});
                window.close();
            }
        });
    });

    // Handle deselecting all links
    deselectAllBtn.addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {action: "deselectAllLinks"});
                window.close();
            }
        });
    });
});
