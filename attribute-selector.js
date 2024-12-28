let selectedAttributes = new Set();
let currentElement = null;
let currentExpression = '';

// Function to escape special characters in attribute values
function escapeValue(value) {
    return value.replace(/'/g, "\\'");
}

// Function to generate XPath from selected attributes
function generateXPath() {
    if (!currentElement || selectedAttributes.size === 0) return '//a';
    
    const conditions = [];
    selectedAttributes.forEach(attr => {
        const value = currentElement.getAttribute(attr);
        if (value) {
            // Handle class attribute specially
            if (attr === 'class') {
                const classes = value.split(' ');
                classes.forEach(cls => {
                    if (cls.trim()) {
                        conditions.push(`contains(@class, '${escapeValue(cls.trim())}')`)
                    }
                });
            } else {
                conditions.push(`@${attr}='${escapeValue(value)}'`);
            }
        }
    });
    
    return conditions.length > 0 
        ? `//a[${conditions.join(' and ')}]`
        : '//a';
}

// Function to update preview
function updatePreview() {
    currentExpression = generateXPath();
    document.querySelector('.expression').textContent = currentExpression;
    
    // Send message to content script to update preview
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: "previewXPathSelection",
            xpath: currentExpression
        }, (response) => {
            if (response && response.matchCount !== undefined) {
                document.querySelector('.match-count').textContent = 
                    `${response.matchCount} matching elements`;
            }
        });
    });
}

// Function to create collapsible DOM viewer
function createDOMViewer(element) {
    const container = document.querySelector('.dom-viewer');
    container.innerHTML = '';
    
    function createElementView(el, depth = 0) {
        const wrapper = document.createElement('div');
        wrapper.style.marginLeft = `${depth * 20}px`;
        
        const content = document.createElement('div');
        content.innerHTML = `<span class="tag">${el.tagName.toLowerCase()}</span>`;
        
        // Add attributes
        const attributes = Array.from(el.attributes);
        if (attributes.length > 0) {
            attributes.forEach(attr => {
                const attrSpan = document.createElement('span');
                attrSpan.className = `attribute${selectedAttributes.has(attr.name) ? ' selected' : ''}`;
                attrSpan.setAttribute('data-attr', attr.name);
                attrSpan.innerHTML = ` ${attr.name}="<span class="value">${attr.value}</span>"`;
                
                attrSpan.addEventListener('click', () => {
                    if (selectedAttributes.has(attr.name)) {
                        selectedAttributes.delete(attr.name);
                        attrSpan.classList.remove('selected');
                    } else {
                        selectedAttributes.add(attr.name);
                        attrSpan.classList.add('selected');
                    }
                    updatePreview();
                });
                
                content.appendChild(attrSpan);
            });
        }
        
        wrapper.appendChild(content);
        
        // Add children if any
        if (el.children.length > 0) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'children';
            Array.from(el.children).forEach(child => {
                childrenContainer.appendChild(createElementView(child, depth + 1));
            });
            wrapper.appendChild(childrenContainer);
        }
        
        return wrapper;
    }
    
    // Get parent elements up to 2 levels
    let parent = element;
    const parents = [element];
    for (let i = 0; i < 2; i++) {
        if (parent.parentElement) {
            parent = parent.parentElement;
            parents.unshift(parent);
        }
    }
    
    // Create view for each parent
    parents.forEach((el, index) => {
        container.appendChild(createElementView(el, index));
    });
}

// Initialize the popup
document.addEventListener('DOMContentLoaded', () => {
    // Get the target element from the background script
    chrome.runtime.sendMessage({ action: "getTargetElement" }, (response) => {
        if (response && response.element) {
            currentElement = response.element;
            createDOMViewer(currentElement);
        }
    });
    
    // Handle preview button
    document.querySelector('.preview-btn').addEventListener('click', updatePreview);
    
    // Handle finalize button
    document.querySelector('.finalize-btn').addEventListener('click', () => {
        if (currentExpression) {
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "finalizeXPathSelection",
                    xpath: currentExpression
                }, () => {
                    window.close();
                });
            });
        }
    });
    
    // Handle cancel button
    document.querySelector('.cancel-btn').addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "cancelXPathSelection"
            }, () => {
                window.close();
            });
        });
    });
});
