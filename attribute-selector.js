let selectedAttributes = new Set();
let currentElementInfo = null;
let currentExpression = '';

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
    if (!currentElementInfo || selectedAttributes.size === 0) return '//a';
    
    const conditions = [];
    const targetElement = currentElementInfo.elementPath[currentElementInfo.elementPath.length - 1];
    
    selectedAttributes.forEach(attr => {
        const value = targetElement.attributes[attr];
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
    
    return conditions.length > 0 
        ? `//a[${conditions.join(' and ')}]`
        : '//a';
}

// Function to create collapsible DOM viewer
function createDOMViewer(elementInfo) {
    const container = document.querySelector('.dom-viewer');
    container.innerHTML = '';
    
    function createElementView(elementData, depth = 0) {
        const wrapper = document.createElement('div');
        wrapper.style.marginLeft = `${depth * 20}px`;
        
        const content = document.createElement('div');
        content.innerHTML = `<span class="tag">&lt;${elementData.tagName}</span>`;
        
        // Add attributes
        Object.entries(elementData.attributes).forEach(([name, value]) => {
            const attrSpan = document.createElement('span');
            attrSpan.className = `attribute${selectedAttributes.has(name) ? ' selected' : ''}`;
            attrSpan.setAttribute('data-attr', name);
            
            // Create separate spans for attribute name and value
            const nameSpan = document.createElement('span');
            nameSpan.className = 'attr-name';
            nameSpan.textContent = ` ${name}`;
            
            const valueSpan = document.createElement('span');
            valueSpan.className = 'value';
            valueSpan.textContent = `="${escapeHtml(value)}"`;
            
            attrSpan.appendChild(nameSpan);
            attrSpan.appendChild(valueSpan);
            
            // Add click handler to the entire attribute span
            attrSpan.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('Attribute clicked:', name); // Debug log
                
                if (selectedAttributes.has(name)) {
                    selectedAttributes.delete(name);
                    attrSpan.classList.remove('selected');
                } else {
                    selectedAttributes.add(name);
                    attrSpan.classList.add('selected');
                }
                
                // Debug logs
                console.log('Selected attributes:', Array.from(selectedAttributes));
                console.log('Current element info:', currentElementInfo);
                
                updatePreview();
            });
            
            content.appendChild(attrSpan);
        });
        
        content.innerHTML += '<span class="tag">&gt;</span>';
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
    console.log('Generated XPath:', currentExpression); // Debug log
    
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
    // Get the target element from the background script
    chrome.runtime.sendMessage({ action: "getTargetElement" }, (response) => {
        if (response && response.elementInfo) {
            currentElementInfo = response.elementInfo;
            createDOMViewer(currentElementInfo);
            
            // Debug log
            console.log('Received element info:', currentElementInfo);
        }
    });
    
    // Handle preview button
    document.querySelector('.preview-btn').addEventListener('click', () => {
        console.log('Preview button clicked'); // Debug log
        updatePreview();
    });
    
    // Handle finalize button
    document.querySelector('.finalize-btn').addEventListener('click', () => {
        console.log('Finalize button clicked'); // Debug log
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
