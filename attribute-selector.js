let selectedAttributes = new Set();
let currentElementInfo = null;
let currentExpression = '';
let selectedElement = null; // Track which element in the path is selected

// Function to escape special characters in attribute values
function escapeValue(value) {
    return value.replace(/'/g, "\\'");
}

// Function to escape HTML
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Function to generate XPath from selected attributes
function generateXPath() {
    if (!currentElementInfo || !selectedElement || selectedAttributes.size === 0) {
        return '//a';
    }
    
    const conditions = [];
    
    selectedAttributes.forEach(attr => {
        const value = selectedElement.attributes[attr];
        if (value) {
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
    
    const tagName = selectedElement.tagName.toLowerCase();
    return conditions.length > 0 
        ? `//${tagName}[${conditions.join(' and ')}]`
        : `//${tagName}`;
}

// Function to create collapsible DOM viewer
function createDOMViewer(elementInfo) {
    const container = document.querySelector('.dom-viewer');
    container.innerHTML = '';
    
    function createElementView(elementData, depth = 0) {
        const wrapper = document.createElement('div');
        wrapper.style.marginLeft = `${depth * 20}px`;
        wrapper.className = 'element-wrapper';
        
        const content = document.createElement('div');
        content.className = 'element-content';
        
        // Make the tag name clickable
        const tagSpan = document.createElement('span');
        tagSpan.className = 'tag clickable';
        tagSpan.innerHTML = `&lt;${elementData.tagName}`;
        tagSpan.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Update selected element
            selectedElement = elementData;
            
            // Clear previous element selections
            document.querySelectorAll('.element-content').forEach(el => {
                el.classList.remove('selected-element');
            });
            content.classList.add('selected-element');
            
            updatePreview();
        });
        content.appendChild(tagSpan);
        
        // Add attributes
        Object.entries(elementData.attributes).forEach(([name, value]) => {
            const attrSpan = document.createElement('span');
            attrSpan.className = `attribute${selectedAttributes.has(name) && selectedElement === elementData ? ' selected' : ''}`;
            attrSpan.setAttribute('data-attr', name);
            
            // Create separate spans for attribute name and value
            const nameSpan = document.createElement('span');
            nameSpan.className = 'attr-name clickable';
            nameSpan.textContent = ` ${name}`;
            
            const valueSpan = document.createElement('span');
            valueSpan.className = 'value';
            valueSpan.textContent = `="${escapeHtml(value)}"`;
            
            attrSpan.appendChild(nameSpan);
            attrSpan.appendChild(valueSpan);
            
            // Add click handler to the attribute name
            nameSpan.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Update selected element
                selectedElement = elementData;
                
                // Clear previous element selections
                document.querySelectorAll('.element-content').forEach(el => {
                    el.classList.remove('selected-element');
                });
                content.classList.add('selected-element');
                
                // Toggle attribute selection
                if (selectedAttributes.has(name)) {
                    selectedAttributes.delete(name);
                    attrSpan.classList.remove('selected');
                } else {
                    selectedAttributes.add(name);
                    attrSpan.classList.add('selected');
                }
                
                updatePreview();
            });
            
            content.appendChild(attrSpan);
        });
        
        content.appendChild(document.createTextNode('>'));
        wrapper.appendChild(content);
        
        return wrapper;
    }
    
    // Create view for each element in the path
    elementInfo.elementPath.forEach((el, index) => {
        container.appendChild(createElementView(el, index));
    });
}

// Function to update preview
function updatePreview() {
    currentExpression = generateXPath();
    console.log('Generated XPath:', currentExpression);
    
    const expressionElement = document.querySelector('.expression');
    expressionElement.textContent = currentExpression;
    
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

// Initialize the popup
document.addEventListener('DOMContentLoaded', () => {
    chrome.runtime.sendMessage({ action: "getTargetElement" }, async (response) => {
        if (response && response.elementInfo) {
            currentElementInfo = response.elementInfo;
            
            // Create the DOM viewer
            const domViewer = createDOMViewer(currentElementInfo);
            document.getElementById('dom-structure').appendChild(domViewer);
            
            // Add click handlers for attribute selection
            document.querySelectorAll('.attribute').forEach(attr => {
                attr.addEventListener('click', (e) => {
                    const attrName = e.target.dataset.name;
                    const attrValue = e.target.dataset.value;
                    
                    if (selectedAttributes.has(`${attrName}=${attrValue}`)) {
                        selectedAttributes.delete(`${attrName}=${attrValue}`);
                        e.target.classList.remove('selected');
                    } else {
                        selectedAttributes.add(`${attrName}=${attrValue}`);
                        e.target.classList.add('selected');
                    }
                    
                    // Update XPath expression and preview
                    currentExpression = generateXPath();
                    document.getElementById('xpath-expression').value = currentExpression;
                    updatePreview();
                });
            });
            
            // Select the element in the path when clicked
            document.querySelectorAll('.element').forEach((el, index) => {
                el.addEventListener('click', () => {
                    document.querySelectorAll('.element').forEach(e => e.classList.remove('selected'));
                    el.classList.add('selected');
                    selectedElement = index;
                    
                    // Update XPath expression and preview
                    currentExpression = generateXPath();
                    document.getElementById('xpath-expression').value = currentExpression;
                    updatePreview();
                });
            });
        } else {
            console.error('No element info received');
            document.getElementById('error-message').textContent = 'Failed to get element information. Please try again.';
        }
    });
    
    document.querySelector('.preview-btn').addEventListener('click', updatePreview);
    
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
