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
                .multi-link-preview {
                    outline: 2px solid #4CAF50 !important;
                    background-color: rgba(76, 175, 80, 0.1) !important;
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
        if (!element) return true;
        
        const style = window.getComputedStyle(element);
        
        // Check if the element or any parent is hidden
        let current = element;
        while (current && current !== document) {
            const currentStyle = window.getComputedStyle(current);
            if (currentStyle.display === 'none' || 
                currentStyle.visibility === 'hidden' || 
                currentStyle.opacity === '0' ||
                (currentStyle.height === '0px' && currentStyle.overflow === 'hidden')) {
                return true;
            }
            current = current.parentElement;
        }
        
        // Check if element is outside viewport
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            return true;
        }
        
        return false;
    }

    // Function to normalize URLs for comparison
    function normalizeUrl(url) {
        try {
            if (!url) return null;
            
            // Handle relative URLs
            if (!url.startsWith('http')) {
                const a = document.createElement('a');
                a.href = url;
                url = a.href;
            }

            // Create URL object to parse components
            const urlObj = new URL(url);
            
            // For Amazon URLs, only keep the main path and search params
            if (urlObj.hostname.includes('amazon.com')) {
                // Extract product ID or search query
                const pathParts = urlObj.pathname.split('/').filter(p => p);
                if (pathParts.includes('dp')) {
                    const productIndex = pathParts.indexOf('dp');
                    return `https://www.amazon.com/dp/${pathParts[productIndex + 1]}`;
                } else if (pathParts.includes('s')) {
                    // For search URLs, keep the search query
                    return `https://www.amazon.com/${pathParts.join('/')}${urlObj.search}`;
                }
            }
            
            // For other URLs, normalize by removing tracking parameters
            const cleanUrl = new URL(url);
            ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'gclid'].forEach(param => {
                cleanUrl.searchParams.delete(param);
            });
            return decodeURIComponent(cleanUrl.toString()).replace(/\/$/, '');
        } catch (e) {
            console.error('Error normalizing URL:', e, url);
            return url;
        }
    }

    // Function to get element's target URL
    function getElementUrl(element) {
        if (!element) return null;
        
        // Get all possible URL sources
        const sources = [
            element.href,
            element.getAttribute('href'),
            element.getAttribute('data-url'),
            element.getAttribute('data-href'),
            element.formAction
        ];
        
        // Check onclick attribute for URLs
        const onclick = element.getAttribute('onclick');
        if (onclick) {
            const urlMatch = onclick.match(/(?:window\.location\.href|window\.location|location\.href)\s*=\s*['"]([^'"]+)['"]/);
            if (urlMatch) {
                sources.push(urlMatch[1]);
            }
        }
        
        // Check nested elements recursively
        const nestedElements = element.querySelectorAll('a[href], [data-url]');
        nestedElements.forEach(nested => {
            sources.push(nested.href, nested.getAttribute('href'), nested.getAttribute('data-url'));
        });
        
        // Find first valid URL
        const url = sources.find(s => s && typeof s === 'string' && s.includes('://'));
        if (url) {
            const normalized = normalizeUrl(url);
            console.log(`Found URL for element ${element.tagName}:`, {
                original: url,
                normalized
            });
            return normalized;
        }
        return null;
    }

    // Function to find clickable elements
    function findClickableElements() {
        console.log("Finding clickable elements...");
        
        // Get all potentially clickable elements with broader selectors
        const selectors = [
            'a[href]',
            '[role="link"]',
            '[onclick]',
            '[data-url]',
            '[href]',
            'button',
            'input[type="button"]',
            'input[type="submit"]',
            '.clickable',
            '[class*="link"]',
            '[class*="btn"]',
            '[tabindex="0"]',
            // Add common link-like class patterns
            '[class*="card"]',
            '[class*="product"]',
            'div[jscontroller]' // For Google-specific elements
        ];
        
        const elements = document.querySelectorAll(selectors.join(','));
        console.log(`Found ${elements.length} potential elements`);
        
        // Filter for visible elements with URLs
        const visibleElements = Array.from(elements).filter(element => {
            if (isElementTrulyHidden(element)) {
                console.log(`Skipping hidden element: ${element.tagName}`);
                return false;
            }
            
            const url = getElementUrl(element);
            if (!url) {
                console.log(`No URL found for element: ${element.tagName}`);
                return false;
            }
            
            console.log(`Found visible element: ${element.tagName}, URL: ${url}`);
            return true;
        });
        
        console.log(`Found ${visibleElements.length} visible elements with URLs`);
        return visibleElements;
    }

    // Function to get element information including HTML structure
    function getElementInfo(element) {
        console.log("Getting element info for:", element);
        if (!element) {
            console.error("getElementInfo: element is null");
            return null;
        }

        // Get the path from root to the element
        let elementPath = [];
        let current = element;
        
        while (current) {
            const elementInfo = {
                tagName: current.tagName.toLowerCase(),
                attributes: {}
            };
            
            // Get all attributes
            for (const attr of current.attributes) {
                elementInfo.attributes[attr.name] = attr.value;
            }
            
            elementPath.unshift(elementInfo);
            current = current.parentElement;
            
            // Stop at body to prevent too long paths
            if (current && current.tagName === 'BODY') break;
        }
        
        console.log("Element path:", elementPath);
        return {
            elementPath: elementPath
        };
    }

    // Function to compare styles with dimension tolerance
    function haveSimilarStyles(style1, style2) {
        // First check if both are images or both are not images
        if (style1.hasImage !== style2.hasImage) {
            return false;
        }

        // Size comparison tolerance (20%)
        const DIMENSION_TOLERANCE = 0.2;
        
        // Compare dimensions with tolerance
        const dim1 = style1.dimensions;
        const dim2 = style2.dimensions;
        
        const widthDiff = Math.abs(dim1.width - dim2.width) / Math.max(dim1.width, dim2.width);
        const heightDiff = Math.abs(dim1.height - dim2.height) / Math.max(dim1.height, dim2.height);
        const aspectRatioDiff = Math.abs(dim1.aspectRatio - dim2.aspectRatio) / Math.max(dim1.aspectRatio, dim2.aspectRatio);
        
        // If dimensions are too different, return false
        if (widthDiff > DIMENSION_TOLERANCE || 
            heightDiff > DIMENSION_TOLERANCE || 
            aspectRatioDiff > DIMENSION_TOLERANCE) {
            return false;
        }
        
        // Compare other style properties
        const styleProps = [
            'color',
            'fontSize',
            'fontFamily',
            'textDecoration',
            'fontWeight',
            'display',
            'position'
        ];
        
        // If it's a shopping card, add those properties
        if (style1.backgroundColor) {
            styleProps.push('backgroundColor', 'padding', 'borderRadius');
        }
        
        return styleProps.every(prop => 
            style1[prop] === style2[prop] || 
            // Skip comparison if property doesn't exist in either style
            (!style1[prop] && !style2[prop])
        );
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

    // Function to process URLs before opening
    function processUrl(url) {
        try {
            const urlObj = new URL(url);
            
            // Check if it's an Amazon domain
            if (urlObj.hostname.includes('amazon.')) {
                // Check if affiliate processing is enabled
                return new Promise((resolve) => {
                    chrome.storage.sync.get(['affiliateEnabled'], (result) => {
                        // If affiliate processing is disabled or there's already a tag, return original URL
                        if (!result.affiliateEnabled || urlObj.searchParams.has('tag')) {
                            resolve(url);
                            return;
                        }

                        // Add our affiliate tag
                        const searchParams = new URLSearchParams(urlObj.search);
                        searchParams.append('tag', 'multilink-20');
                        
                        // Clean up the URL path
                        let path = urlObj.pathname;
                        
                        // Handle product pages
                        if (path.includes('/dp/') || path.includes('/gp/product/')) {
                            // Extract the ASIN (Amazon Standard Identification Number)
                            const asinMatch = path.match(/(?:\/dp\/|\/gp\/product\/)([A-Z0-9]{10})/);
                            if (asinMatch) {
                                const asin = asinMatch[1];
                                // Simplify to the canonical product URL format
                                path = `/dp/${asin}`;
                            }
                        }
                        
                        // Reconstruct the URL
                        resolve(`${urlObj.protocol}//${urlObj.hostname}${path}?${searchParams.toString()}`);
                    });
                });
            }
            
            return Promise.resolve(url);
        } catch (e) {
            console.error('Error processing URL:', e);
            return Promise.resolve(url);
        }
    }

    // Function to get all selected URLs
    async function getSelectedUrls() {
        const urls = [];
        for (const element of highlightedElements) {
            const url = getElementUrl(element);
            if (url) {
                // Process URL before adding to the list
                const processedUrl = await processUrl(url);
                urls.push(processedUrl);
            }
        }
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

    // Function to evaluate XPath
    function evaluateXPath(xpath) {
        try {
            const result = document.evaluate(
                xpath,
                document,
                null,
                XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                null
            );
            
            const elements = [];
            for (let i = 0; i < result.snapshotLength; i++) {
                elements.push(result.snapshotItem(i));
            }
            
            console.log(`XPath '${xpath}' matched ${elements.length} elements`);
            return elements;
        } catch (error) {
            console.error('Error evaluating XPath:', error);
            return [];
        }
    }

    // Function to clear preview highlights
    function clearPreviews() {
        document.querySelectorAll('.multi-link-preview').forEach(el => {
            el.classList.remove('multi-link-preview');
        });
    }

    // Listen for messages from the background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log("Content script received message:", request);
        
        if (request.action === "startRectangleSelect") {
            startRectangleSelection();
            sendResponse({ success: true });
        } else if (request.action === "highlightLink") {
            const elements = findClickableElements();
            console.log("Looking for element with URL:", request.url);
            const targetElement = elements.find(el => getElementUrl(el) === request.url);
            
            if (targetElement) {
                console.log("Found target element:", targetElement);
                targetElement.classList.add('multi-link-highlight');
                highlightedElements.add(targetElement);
                selectedUrls.add(request.url);
                addCloseButton(targetElement);
                saveState();
                sendResponse({ success: true });
            } else {
                console.error("Target element not found for URL:", request.url);
                sendResponse({ error: "Element not found" });
            }
        } else if (request.action === "getElementInfo") {
            const elements = findClickableElements();
            const targetUrl = normalizeUrl(request.url);
            console.log("Looking for element with normalized URL:", targetUrl);
            
            // More detailed logging of potential matches
            const potentialElements = elements.filter(el => {
                const elUrl = getElementUrl(el);
                console.log(`Comparing URLs:\n  Target: ${targetUrl}\n  Element: ${elUrl}\n  Match: ${elUrl === targetUrl}`);
                return elUrl === targetUrl;
            });
            
            console.log(`Found ${potentialElements.length} potential matching elements`);
            
            if (potentialElements.length === 0) {
                // Try a more lenient match if no exact matches found
                console.log("Trying fuzzy URL matching...");
                const fuzzyMatches = elements.filter(el => {
                    const elUrl = getElementUrl(el);
                    if (!elUrl || !targetUrl) return false;
                    
                    // Check if URLs share significant parts
                    const targetParts = targetUrl.split(/[/?#]/);
                    const elParts = elUrl.split(/[/?#]/);
                    const commonParts = targetParts.filter(part => elParts.includes(part));
                    
                    const match = commonParts.length > 2;
                    console.log(`Fuzzy comparing:\n  Target: ${targetUrl}\n  Element: ${elUrl}\n  Common parts: ${commonParts.length}\n  Match: ${match}`);
                    return match;
                });
                
                if (fuzzyMatches.length > 0) {
                    console.log(`Found ${fuzzyMatches.length} fuzzy matches`);
                    const elementInfo = getElementInfo(fuzzyMatches[0]);
                    sendResponse({ elementInfo });
                    return true;
                }
            }
            
            const targetElement = potentialElements[0];
            if (targetElement) {
                console.log("Found target element:", targetElement);
                const elementInfo = getElementInfo(targetElement);
                sendResponse({ elementInfo });
            } else {
                console.error("Target element not found for URL:", targetUrl);
                sendResponse({ error: "Element not found" });
            }
            return true;
        } else if (request.action === "previewXPathSelection") {
            // Clear any existing previews
            clearPreviews();
            
            // Evaluate XPath and highlight matching elements
            const elements = evaluateXPath(request.xpath);
            elements.forEach(element => {
                element.classList.add('multi-link-preview');
            });
            
            // Send back the number of matching elements
            sendResponse({ matchCount: elements.length });
            return true; // Keep the message channel open for the async response
        } else if (request.action === "finalizeXPathSelection") {
            const elements = evaluateXPath(request.xpath);
            clearPreviews();
            
            elements.forEach(element => {
                const url = getElementUrl(element);
                if (url && !selectedUrls.has(url)) {
                    element.classList.add('multi-link-highlight');
                    highlightedElements.add(element);
                    selectedUrls.add(url);
                    addCloseButton(element);
                }
            });
            
            saveState();
            sendResponse({ success: true });
        } else if (request.action === "cancelXPathSelection") {
            clearPreviews();
            sendResponse({ success: true });
        }
    });
}
