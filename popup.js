document.addEventListener('DOMContentLoaded', () => {
    const urlList = document.getElementById('urlList');
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

    // Function to update the URL list
    function updateUrlList() {
        // Get the current active tab
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                // Ask content script for selected URLs
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "getSelectedUrls"
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error(chrome.runtime.lastError);
                        return;
                    }

                    const urls = response?.urls || [];
                    
                    // Clear the list
                    urlList.innerHTML = '';

                    if (urls.length === 0) {
                        urlList.innerHTML = '<div class="no-urls">No links selected</div>';
                        return;
                    }

                    // Add each URL to the list
                    urls.forEach(url => {
                        const urlItem = document.createElement('div');
                        urlItem.className = 'url-item';

                        const urlText = document.createElement('div');
                        urlText.className = 'url-text';
                        urlText.title = url; // Show full URL on hover
                        urlText.textContent = url;

                        const removeButton = document.createElement('button');
                        removeButton.className = 'remove-url';
                        removeButton.textContent = 'Remove';
                        removeButton.addEventListener('click', () => {
                            chrome.tabs.sendMessage(tabs[0].id, {
                                action: "removeUrl",
                                url: url
                            }, () => {
                                updateUrlList(); // Refresh the list
                                updateSelectedCount(); // Update selected count
                            });
                        });

                        urlItem.appendChild(urlText);
                        urlItem.appendChild(removeButton);
                        urlList.appendChild(urlItem);
                    });
                });
            }
        });
    }

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

    // Update list when popup opens
    updateUrlList();

    // Initial count update
    updateSelectedCount();

    // Handle Open All button
    openAllBtn.addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "openSelectedLinks"
                });
                window.close();
            }
        });
    });

    // Handle Deselect All button
    deselectAllBtn.addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "deselectAllLinks"
                }, () => {
                    updateUrlList(); // Refresh the list
                    updateSelectedCount(); // Update selected count
                });
            }
        });
    });
});
