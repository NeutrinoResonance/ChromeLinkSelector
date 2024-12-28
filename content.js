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
                    background-color: rgba(255, 235, 59, 0.7) !important;
                    outline: 3px solid #ffc107 !important;
                    outline-offset: 2px !important;
                    box-shadow: 0 0 12px rgba(255, 193, 7, 0.8) !important;
                    position: relative !important;
                    z-index: 2147483640 !important;
                }
                .multi-link-highlight::before {
                    content: '' !important;
                    position: absolute !important;
                    top: -5px !important;
                    left: -5px !important;
                    right: -5px !important;
                    bottom: -5px !important;
                    background: rgba(255, 235, 59, 0.2) !important;
                    border-radius: 4px !important;
                    z-index: -1 !important;
                    pointer-events: none !important;
                }
                .multi-link-similar {
                    background-color: rgba(255, 138, 128, 0.7) !important;
                    outline: 3px solid #ff5252 !important;
                    outline-offset: 2px !important;
                    box-shadow: 0 0 12px rgba(255, 82, 82, 0.8) !important;
                    position: relative !important;
                    z-index: 2147483640 !important;
                }
                .multi-link-similar::before {
                    content: '' !important;
                    position: absolute !important;
                    top: -5px !important;
                    left: -5px !important;
                    right: -5px !important;
                    bottom: -5px !important;
                    background: rgba(255, 82, 82, 0.2) !important;
                    border-radius: 4px !important;
                    z-index: -1 !important;
                    pointer-events: none !important;
                }
                .multi-link-close {
                    position: absolute !important;
                    top: -12px !important;
                    right: -12px !important;
                    width: 24px !important;
                    height: 24px !important;
                    background-color: #ff5252 !important;
                    color: white !important;
                    border-radius: 50% !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    font-size: 16px !important;
                    cursor: pointer !important;
                    z-index: 2147483647 !important;
                    font-family: Arial, sans-serif !important;
                    line-height: 1 !important;
                    border: 2px solid white !important;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4) !important;
                }
                .multi-link-close:hover {
                    background-color: #ff1744 !important;
                    transform: scale(1.1) !important;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5) !important;
                }

                /* Force parent elements to show highlighted items */
                .multi-link-highlight, 
                .multi-link-similar,
                *:has(> .multi-link-highlight),
                *:has(> .multi-link-similar) {
                    opacity: 1 !important;
                    visibility: visible !important;
                    display: block !important;
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

    // State history for undo/redo
    let stateHistory = [];
    let currentStateIndex = -1;
    const MAX_HISTORY = 50; // Maximum number of states to keep

    function saveState() {
        // Create a new state snapshot
        const state = {
            selectedUrls: new Set([...selectedUrls]),
            highlightedElements: new Set([...highlightedElements]),
            timestamp: Date.now()
        };

        // If we're not at the end of the history, remove future states
        if (currentStateIndex < stateHistory.length - 1) {
            stateHistory = stateHistory.slice(0, currentStateIndex + 1);
        }

        // Add new state
        stateHistory.push(state);
        currentStateIndex++;

        // Limit history size
        if (stateHistory.length > MAX_HISTORY) {
            stateHistory.shift();
            currentStateIndex--;
        }
    }

    function restoreState(state) {
        // Clear current highlights
        removeAllHighlights(false); // Don't save state when clearing

        // Restore highlights from state
        state.selectedUrls.forEach(url => {
            const elements = findClickableElements();
            const element = elements.find(el => getElementUrl(el) === url);
            if (element) {
                element.classList.add('multi-link-highlight');
                highlightedElements.add(element);
                selectedUrls.add(url);
                addCloseButton(element);
            }
        });
    }

    function undo() {
        if (currentStateIndex > 0) {
            currentStateIndex--;
            restoreState(stateHistory[currentStateIndex]);
            return true;
        }
        return false;
    }

    function redo() {
        if (currentStateIndex < stateHistory.length - 1) {
            currentStateIndex++;
            restoreState(stateHistory[currentStateIndex]);
            return true;
        }
        return false;
    }

    // Function to add close button to a link
    function addCloseButton(element) {
        const existingBtn = element.querySelector('.multi-link-close');
        if (existingBtn) return;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'multi-link-close';
        closeBtn.innerHTML = '×';
        closeBtn.style.position = 'absolute';
        closeBtn.style.right = '-10px';
        closeBtn.style.top = '-10px';
        closeBtn.style.width = '20px';
        closeBtn.style.height = '20px';
        closeBtn.style.borderRadius = '50%';
        closeBtn.style.border = 'none';
        closeBtn.style.backgroundColor = '#ff5252';
        closeBtn.style.color = 'white';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.zIndex = '10000';
        closeBtn.style.display = 'flex';
        closeBtn.style.alignItems = 'center';
        closeBtn.style.justifyContent = 'center';
        closeBtn.style.fontSize = '16px';
        closeBtn.style.fontWeight = 'bold';
        closeBtn.style.padding = '0';
        closeBtn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';

        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            element.classList.remove('multi-link-highlight', 'multi-link-similar');
            closeBtn.remove();
            highlightedElements.delete(element);
            selectedUrls.delete(getElementUrl(element));
            saveState();
        });

        element.style.position = 'relative';
        element.appendChild(closeBtn);
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
    function removeAllHighlights(saveStateAfter = true) {
        highlightedElements.forEach(element => {
            element.classList.remove('multi-link-highlight', 'multi-link-similar');
            const closeBtn = element.querySelector('.multi-link-close');
            if (closeBtn) closeBtn.remove();
        });
        highlightedElements.clear();
        selectedUrls.clear();
        
        if (saveStateAfter) {
            saveState();
        }
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

    // Rectangle selection variables
    let isDrawingRectangle = false;
    let startX = 0;
    let startY = 0;
    let selectionDiv = null;

    function createSelectionDiv() {
        selectionDiv = document.createElement('div');
        selectionDiv.style.position = 'fixed';
        selectionDiv.style.border = '2px solid #4CAF50';
        selectionDiv.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
        selectionDiv.style.pointerEvents = 'none';
        selectionDiv.style.zIndex = '10000';
        document.body.appendChild(selectionDiv);
    }

    function updateSelectionDiv(currentX, currentY) {
        const left = Math.min(startX, currentX);
        const top = Math.min(startY, currentY);
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);
        
        selectionDiv.style.left = left + 'px';
        selectionDiv.style.top = top + 'px';
        selectionDiv.style.width = width + 'px';
        selectionDiv.style.height = height + 'px';
    }

    function getElementsInRectangle(rect) {
        const elements = findClickableElements();
        return elements.filter(element => {
            const elementRect = element.getBoundingClientRect();
            return !(elementRect.right < rect.left || 
                    elementRect.left > rect.right || 
                    elementRect.bottom < rect.top || 
                    elementRect.top > rect.bottom);
        });
    }

    function handleRectangleSelection(event) {
        if (!isDrawingRectangle) return;
        
        event.preventDefault();
        updateSelectionDiv(event.clientX, event.clientY);
    }

    function startRectangleSelection() {
        document.body.style.cursor = 'crosshair';
        
        function handleMouseDown(e) {
            isDrawingRectangle = true;
            startX = e.clientX;
            startY = e.clientY;
            createSelectionDiv();
            
            document.addEventListener('mousemove', handleRectangleSelection);
            
            function handleMouseUp(e) {
                if (!isDrawingRectangle) return;
                
                isDrawingRectangle = false;
                document.body.style.cursor = 'default';
                
                // Get the final rectangle
                const rect = {
                    left: Math.min(startX, e.clientX),
                    right: Math.max(startX, e.clientX),
                    top: Math.min(startY, e.clientY),
                    bottom: Math.max(startY, e.clientY)
                };
                
                // Find and highlight elements in the rectangle
                const elementsInRect = getElementsInRectangle(rect);
                elementsInRect.forEach(element => {
                    const elementUrl = getElementUrl(element);
                    if (elementUrl && !selectedUrls.has(elementUrl)) {
                        element.classList.add('multi-link-highlight');
                        highlightedElements.add(element);
                        selectedUrls.add(elementUrl);
                        addCloseButton(element);
                    }
                });
                
                // Clean up
                document.removeEventListener('mousemove', handleRectangleSelection);
                document.removeEventListener('mouseup', handleMouseUp);
                document.removeEventListener('mousedown', handleMouseDown);
                if (selectionDiv) {
                    selectionDiv.remove();
                    selectionDiv = null;
                }
                saveState();
            }
            
            document.addEventListener('mouseup', handleMouseUp, { once: true });
        }
        
        document.addEventListener('mousedown', handleMouseDown, { once: true });
    }

    // Add keyboard shortcut listener
    document.addEventListener('keydown', (e) => {
        // Check if the target is an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        // Undo: Cmd+Z (Mac) or Ctrl+Z (Windows)
        if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undo();
        }
        // Redo: Cmd+Shift+Z (Mac) or Ctrl+Y (Windows)
        else if (((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') || 
                 ((e.ctrlKey) && e.key === 'y')) {
            e.preventDefault();
            redo();
        }
    });

    // Listen for messages from the background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "startRectangleSelect") {
            startRectangleSelection();
            sendResponse({ success: true });
        } else if (request.action === "highlightLink") {
            console.log("Link clicked:", request.data.linkUrl);
            
            removeAllHighlights(false);
            
            const allElements = findClickableElements();
            const clickedElement = allElements.find(el => 
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
                
                clickedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                console.log('Found similar links:', highlightedElements.size - 1);
                saveState();
            }
            sendResponse({ success: true });
        } else if (request.action === "highlightSingleLink") {
            console.log("Single link selected:", request.data.linkUrl);
            
            const allElements = findClickableElements();
            const clickedElement = allElements.find(el => 
                getElementUrl(el) === request.data.linkUrl
            );
            
            if (clickedElement && !selectedUrls.has(request.data.linkUrl)) {
                clickedElement.classList.add('multi-link-highlight');
                highlightedElements.add(clickedElement);
                selectedUrls.add(request.data.linkUrl);
                addCloseButton(clickedElement);
                clickedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                saveState();
            }
            sendResponse({ success: true });
        } else if (request.action === "undo") {
            const success = undo();
            sendResponse({ success });
        } else if (request.action === "redo") {
            const success = redo();
            sendResponse({ success });
        } else if (request.action === "openSelectedLinks") {
            const urls = getSelectedUrls();
            if (urls.length > 0) {
                chrome.runtime.sendMessage({
                    action: "openUrls",
                    urls: urls
                });
            }
            sendResponse({ success: true });
        } else if (request.action === "deselectAllLinks") {
            removeAllHighlights(true);
            sendResponse({ success: true });
        } else if (request.action === "getSelectedUrls") {
            sendResponse({ urls: getSelectedUrls() });
        } else if (request.action === "removeUrl") {
            highlightedElements.forEach(element => {
                if (getElementUrl(element) === request.url) {
                    element.classList.remove('multi-link-highlight', 'multi-link-similar');
                    const closeBtn = element.querySelector('.multi-link-close');
                    if (closeBtn) closeBtn.remove();
                    highlightedElements.delete(element);
                    selectedUrls.delete(request.url);
                }
            });
            saveState();
            sendResponse({ success: true });
        }
        
        return true;
    });
}
