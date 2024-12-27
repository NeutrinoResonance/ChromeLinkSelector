// Ensure script only runs once
if (!window.multiLinkExtensionLoaded) {
    window.multiLinkExtensionLoaded = true;

    // Ensure we only inject styles once
    if (!window.multiLinkStylesInjected) {
        window.multiLinkStylesInjected = true;

        // Wait for DOM to be ready
        function injectStyles() {
            const styleElement = document.createElement('style');
            styleElement.textContent = `
                .multi-link-highlight {
                    background-color: rgba(255, 235, 59, 0.5) !important;
                    outline: 3px solid #ffc107 !important;
                    outline-offset: 2px !important;
                    box-shadow: 0 0 8px rgba(255, 193, 7, 0.6) !important;
                    position: relative !important;
                    z-index: 2147483640 !important;
                }
                .multi-link-similar {
                    background-color: rgba(255, 138, 128, 0.5) !important;
                    outline: 3px solid #ff5252 !important;
                    outline-offset: 2px !important;
                    box-shadow: 0 0 8px rgba(255, 82, 82, 0.6) !important;
                    position: relative !important;
                    z-index: 2147483640 !important;
                }
                .multi-link-close {
                    position: absolute !important;
                    top: -10px !important;
                    right: -10px !important;
                    width: 20px !important;
                    height: 20px !important;
                    background-color: #ff5252 !important;
                    color: white !important;
                    border-radius: 50% !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    font-size: 14px !important;
                    cursor: pointer !important;
                    z-index: 2147483647 !important;
                    font-family: Arial, sans-serif !important;
                    line-height: 1 !important;
                    border: 2px solid white !important;
                    box-shadow: 0 0 4px rgba(0, 0, 0, 0.3) !important;
                }
                .multi-link-close:hover {
                    background-color: #ff1744 !important;
                    transform: scale(1.1) !important;
                }
            `;
            
            if (document.head) {
                document.head.appendChild(styleElement);
            } else if (document.documentElement) {
                document.documentElement.appendChild(styleElement);
            }
        }

        // Try to inject styles immediately if document is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', injectStyles);
        } else {
            injectStyles();
        }
    }

    // Keep track of highlighted elements and selected URLs
    let highlightedElements = new Set();
    let selectedUrls = new Set();

    // Function to add close button to a link
    function addCloseButton(link) {
        const closeBtn = document.createElement('div');
        closeBtn.className = 'multi-link-close';
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            link.classList.remove('multi-link-highlight', 'multi-link-similar');
            highlightedElements.delete(link);
            selectedUrls.delete(getElementUrl(link));
            closeBtn.remove();
        });
        link.appendChild(closeBtn);
    }

    // Function to check if an element is truly hidden
    function isElementTrulyHidden(element) {
        const style = window.getComputedStyle(element);
        
        // Check basic visibility
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return true;
        }

        // Check if element has size
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            return true;
        }

        // Check if any parent element hides this element
        let parent = element.parentElement;
        while (parent) {
            const parentStyle = window.getComputedStyle(parent);
            if (parentStyle.display === 'none' || 
                parentStyle.visibility === 'hidden' || 
                parentStyle.opacity === '0') {
                return true;
            }
            parent = parent.parentElement;
        }

        return false;
    }

    // Function to find all clickable elements
    function findClickableElements() {
        // Get all links that aren't truly hidden
        return Array.from(document.getElementsByTagName('a'))
            .filter(link => !isElementTrulyHidden(link));
    }

    // Function to get element's target URL
    function getElementUrl(element) {
        return element.href || null;
    }

    // Function to get relevant styles for comparison
    function getRelevantStyles(element) {
        const computed = window.getComputedStyle(element);
        
        // For Google Shopping cards, include specific styles
        const isShoppingCard = element.hasAttribute('jsaction') && 
                              element.getAttribute('jsaction').includes('click:trigger.oLMRYb');
        
        const styles = {
            color: computed.color,
            fontSize: computed.fontSize,
            fontFamily: computed.fontFamily,
            textDecoration: computed.textDecoration,
            fontWeight: computed.fontWeight
        };
        
        if (isShoppingCard) {
            // Add shopping-specific styles
            styles.backgroundColor = computed.backgroundColor;
            styles.padding = computed.padding;
            styles.borderRadius = computed.borderRadius;
        }
        
        return styles;
    }

    // Function to compare styles
    function haveSimilarStyles(style1, style2) {
        const relevantProperties = Object.keys(style1);
        
        return relevantProperties.every(prop => style1[prop] === style2[prop]);
    }

    // Function to remove all highlights and close buttons
    function removeAllHighlights() {
        highlightedElements.forEach(element => {
            element.classList.remove('multi-link-highlight', 'multi-link-similar');
            const closeBtn = element.querySelector('.multi-link-close');
            if (closeBtn) {
                closeBtn.remove();
            }
        });
        highlightedElements.clear();
        selectedUrls.clear();
    }

    // Function to get all selected URLs
    function getSelectedUrls() {
        const urls = [];
        highlightedElements.forEach(element => {
            const url = getElementUrl(element);
            if (url) {
                urls.push(url);
            }
        });
        return urls;
    }

    // Listen for messages from the background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "highlightLink") {
            console.log("Link clicked:", request.data.linkUrl);
            
            // Remove previous highlights
            removeAllHighlights();
            
            const allElements = findClickableElements();
            const clickedElement = Array.from(allElements).find(el => 
                getElementUrl(el) === request.data.linkUrl
            );
            
            if (clickedElement) {
                const clickedStyles = getRelevantStyles(clickedElement);
                
                allElements.forEach(element => {
                    const elementUrl = getElementUrl(element);
                    if (elementUrl && !selectedUrls.has(elementUrl)) {
                        const elementStyles = getRelevantStyles(element);
                        if (haveSimilarStyles(clickedStyles, elementStyles)) {
                            element.classList.add(element === clickedElement ? 'multi-link-highlight' : 'multi-link-similar');
                            highlightedElements.add(element);
                            selectedUrls.add(elementUrl);
                            addCloseButton(element);
                        }
                    }
                });
                
                // Scroll the clicked link into view
                clickedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Log the results
                console.log('Found similar links:', highlightedElements.size - 1);
            }
        } else if (request.action === "openSelectedLinks") {
            const urls = getSelectedUrls();
            if (urls.length > 0) {
                chrome.runtime.sendMessage({
                    action: "openUrls",
                    urls: urls
                });
            }
        }
    });
}
