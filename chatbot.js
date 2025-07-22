class Chatbot {
    constructor() {
        this.isOpen = false;
        this.isTyping = false;
        this.isDragging = false;
        this.isResizing = false;
        this.dragOffset = { x: 0, y: 0 };
        this.resizeStart = { x: 0, y: 0, width: 0, height: 0, windowX: 0, windowY: 0 };
        this.scrollPosition = 0; // For mobile scroll handling
        this.apiUrl = 'https://cicrchatbot.onrender.com/chat'; // Replace with your FastAPI backend URL
        
        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.toggleButton = document.getElementById('chatbot-toggle');
        this.chatWindow = document.getElementById('chatbot-window');
        this.messagesContainer = document.getElementById('chatbot-messages');
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-button');
        this.chatHeader = this.chatWindow.querySelector('.chatbot-header');
        this.resizeHandle = document.getElementById('resize-handle');
        this.typingIndicator = null; // Will be created dynamically
    }

    bindEvents() {
        this.toggleButton.addEventListener('click', () => this.toggleChat());
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        this.messageInput.addEventListener('input', () => this.handleInputChange());
        
        // Dragging functionality
        this.chatHeader.addEventListener('mousedown', (e) => this.startDragging(e));
        
        // Resizing functionality
        this.resizeHandle.addEventListener('mousedown', (e) => this.startResizing(e));
        
        // Global mouse events
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', () => this.handleMouseUp());
        
        // Handle window resize for mobile/desktop transitions
        window.addEventListener('resize', () => this.handleWindowResize());
    }

    toggleChat() {
        this.isOpen = !this.isOpen;
        this.toggleButton.classList.toggle('active', this.isOpen);
        this.chatWindow.classList.toggle('active', this.isOpen);
        
        if (this.isOpen) {
            this.messageInput.focus();
        }
    }

    startDragging(e) {
        e.preventDefault();
        this.isDragging = true;
        this.chatWindow.classList.add('dragging');
        
        const rect = this.chatWindow.getBoundingClientRect();
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    startResizing(e) {
        e.preventDefault();
        e.stopPropagation(); // Prevent dragging when resizing
        this.isResizing = true;
        this.chatWindow.classList.add('resizing');
        
        const rect = this.chatWindow.getBoundingClientRect();
        this.resizeStart = {
            x: e.clientX,
            y: e.clientY,
            width: rect.width,
            height: rect.height,
            windowX: rect.left,
            windowY: rect.top
        };
    }

    handleMouseMove(e) {
        if (this.isDragging) {
            const container = this.chatWindow.parentElement;
            const containerRect = container.getBoundingClientRect();
            
            // Calculate new position relative to the container
            let newRight = containerRect.right - e.clientX - this.dragOffset.x + this.chatWindow.offsetWidth;
            let newBottom = containerRect.bottom - e.clientY - this.dragOffset.y + this.chatWindow.offsetHeight;
            
            // Keep window within viewport bounds
            const minDistance = 20;
            const maxRight = containerRect.width - minDistance;
            const maxBottom = containerRect.height - minDistance;
            
            newRight = Math.max(minDistance, Math.min(newRight, maxRight));
            newBottom = Math.max(minDistance, Math.min(newBottom, maxBottom));
            
            this.chatWindow.style.right = newRight + 'px';
            this.chatWindow.style.bottom = newBottom + 'px';
        }
        
        if (this.isResizing) {
            // Calculate resize deltas (negative because we're resizing from top-left)
            const deltaX = this.resizeStart.x - e.clientX;
            const deltaY = this.resizeStart.y - e.clientY;
            
            // Calculate new dimensions and position
            const newWidth = Math.max(300, this.resizeStart.width + deltaX);
            const newHeight = Math.max(400, this.resizeStart.height + deltaY);
            
            // Apply new dimensions
            this.chatWindow.style.width = newWidth + 'px';
            this.chatWindow.style.height = newHeight + 'px';
            
            // Adjust position to keep bottom-right anchor point fixed
            const container = this.chatWindow.parentElement;
            const containerRect = container.getBoundingClientRect();
            
            const currentRight = parseFloat(this.chatWindow.style.right) || 0;
            const currentBottom = parseFloat(this.chatWindow.style.bottom) || 70;
            
            // Keep the bottom-right position stable while resizing
            this.chatWindow.style.right = currentRight + 'px';
            this.chatWindow.style.bottom = currentBottom + 'px';
        }
    }

    handleMouseUp() {
        if (this.isDragging) {
            this.isDragging = false;
            this.chatWindow.classList.remove('dragging');
        }
        
        if (this.isResizing) {
            this.isResizing = false;
            this.chatWindow.classList.remove('resizing');
        }
    }

    handleWindowResize() {
        // Handle window resize events
    }

    handleInputChange() {
        const hasText = this.messageInput.value.trim().length > 0;
        this.sendButton.disabled = !hasText || this.isTyping;
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || this.isTyping) return;

        // Add user message to chat
        this.addMessage(message, 'user');
        this.messageInput.value = '';
        this.handleInputChange();

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Make API call to FastAPI backend
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Ensure typing indicator shows for at least 2 seconds
            const typingStartTime = Date.now();
            const minTypingDuration = 2000; // 2 seconds
            
            const elapsedTime = Date.now() - typingStartTime;
            const remainingTime = Math.max(0, minTypingDuration - elapsedTime);
            
            setTimeout(() => {
                // Hide typing indicator
                this.hideTypingIndicator();
                
                // Add bot response with typewriter effect
                const botMessage = data.response || data.message || 'Sorry, I didn\'t understand that.';
                this.addMessageWithTypewriter(botMessage, 'bot');
            }, remainingTime);
            
        } catch (error) {
            console.error('Error sending message:', error);
            
            // Ensure typing indicator shows for at least 2 seconds even on error
            setTimeout(() => {
                this.hideTypingIndicator();
                this.addMessageWithTypewriter('Sorry, I\'m having trouble connecting right now. Please try again later.', 'bot');
            }, 2000);
        }
    }

    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        // Parse markdown for bot messages, escape HTML for user messages
        if (sender === 'bot') {
            messageContent.innerHTML = this.parseMarkdown(text);
        } else {
            messageContent.innerHTML = `<p>${this.escapeHtml(text)}</p>`;
        }
        
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = this.formatTime(new Date());
        
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(messageTime);
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addMessageWithTypewriter(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = this.formatTime(new Date());
        
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(messageTime);
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
        
        // For bot messages, use markdown typewriter effect
        if (sender === 'bot') {
            this.markdownTypewriterEffect(messageContent, text);
        } else {
            const messageText = document.createElement('p');
            messageContent.appendChild(messageText);
            this.typewriterEffect(messageText, text);
        }
    }

    typewriterEffect(element, text, speed = 50) {
        let index = 0;
        element.textContent = '';
        
        const typeInterval = setInterval(() => {
            if (index < text.length) {
                element.textContent += text.charAt(index);
                index++;
                this.scrollToBottom(); // Keep scrolling as text appears
            } else {
                clearInterval(typeInterval);
                // Allow user to send new messages after typewriter finishes
                this.isTyping = false;
                this.handleInputChange();
            }
        }, speed);
    }

    showTypingIndicator() {
        this.isTyping = true;
        
        // Create typing indicator if it doesn't exist
        if (!this.typingIndicator) {
            this.typingIndicator = document.createElement('div');
            this.typingIndicator.className = 'typing-indicator';
            this.typingIndicator.innerHTML = `
                <span></span>
                <span></span>
                <span></span>
            `;
        }
        
        // Add to the end of messages container
        this.messagesContainer.appendChild(this.typingIndicator);
        this.typingIndicator.style.display = 'flex';
        this.sendButton.disabled = true;
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        if (this.typingIndicator && this.typingIndicator.parentNode) {
            this.typingIndicator.parentNode.removeChild(this.typingIndicator);
        }
        // Don't set isTyping to false here as typewriter effect will handle it
    }

    scrollToBottom() {
        setTimeout(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }, 100);
    }

    formatTime(date) {
        return date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    parseMarkdown(text) {
        // Comprehensive markdown parser for all common formatting
        let html = text
            // Escape existing HTML tags first
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            
            // Code blocks first (to avoid conflicts with other patterns)
            .replace(/```(\w+)?\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
            
            // Headers (must be at start of line)
            .replace(/^#{6}\s+(.*$)/gim, '<h6>$1</h6>')
            .replace(/^#{5}\s+(.*$)/gim, '<h5>$1</h5>')
            .replace(/^#{4}\s+(.*$)/gim, '<h4>$1</h4>')
            .replace(/^#{3}\s+(.*$)/gim, '<h3>$1</h3>')
            .replace(/^#{2}\s+(.*$)/gim, '<h2>$1</h2>')
            .replace(/^#{1}\s+(.*$)/gim, '<h1>$1</h1>')
            
            // Horizontal rules
            .replace(/^---+$/gm, '<hr>')
            .replace(/^\*\*\*+$/gm, '<hr>')
            
            // Blockquotes
            .replace(/^&gt;\s*(.+)$/gm, '<blockquote>$1</blockquote>')
            
            // Bold and italic (order matters)
            .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/(?<!\*)\*(?!\*)([^\*\n]+?)\*(?!\*)/g, '<em>$1</em>')
            
            // Underline and strikethrough
            .replace(/__(.*?)__/g, '<u>$1</u>')
            .replace(/~~(.*?)~~/g, '<s>$1</s>')
            
            // Highlight
            .replace(/==(.*?)==/g, '<mark>$1</mark>')
            
            // Inline code (after code blocks to avoid conflicts)
            .replace(/`([^`\n]+)`/g, '<code>$1</code>')
            
            // Keyboard keys
            .replace(/\[\[([^\]]+)\]\]/g, '<kbd>$1</kbd>')
            
            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
            
            // Auto-links
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
            
            // Task lists (checkbox lists)
            .replace(/^[\s]*-\s*\[[ x]\]\s*(.+)$/gm, function(match, p1) {
                const checked = match.includes('[x]') ? 'checked' : '';
                return `<li><input type="checkbox" ${checked} disabled> ${p1}</li>`;
            })
            
            // Regular unordered lists
            .replace(/^[\s]*[-*+]\s+(.+)$/gm, '<li>$1</li>')
            
            // Ordered lists
            .replace(/^[\s]*(\d+)\.\s+(.+)$/gm, '<li>$2</li>')
            
            // Wrap consecutive list items
            .replace(/(<li>.*<\/li>)/s, function(match) {
                // Check if it contains checkboxes (task list)
                if (match.includes('input type="checkbox"')) {
                    return '<ul class="task-list">' + match + '</ul>';
                }
                return '<ul>' + match + '</ul>';
            })
            
            // Tables (simple implementation)
            .replace(/^\|(.+)\|$/gm, function(match, content) {
                const cells = content.split('|').map(cell => cell.trim());
                return '<tr>' + cells.map(cell => {
                    // Check if it's a header row (contains --- separators)
                    if (cell.match(/^-+$/)) return '';
                    return cell.includes('---') ? '' : `<td>${cell}</td>`;
                }).filter(cell => cell !== '').join('') + '</tr>';
            })
            
            // Wrap table rows
            .replace(/(<tr>.*<\/tr>)/s, '<table>$1</table>')
            
            // Line breaks (double newlines become paragraphs)
            .replace(/\n\n/g, '</p><p>')
            
            // Single line breaks become <br>
            .replace(/\n/g, '<br>');
        
        // Clean up empty elements and fix nesting
        html = html
            .replace(/<p><\/p>/g, '')
            .replace(/<br><\/p>/g, '</p>')
            .replace(/<p><br>/g, '<p>')
            .replace(/<br><ul>/g, '<ul>')
            .replace(/<\/ul><br>/g, '</ul>')
            .replace(/<br><table>/g, '<table>')
            .replace(/<\/table><br>/g, '</table>')
            .replace(/<br><h([1-6])>/g, '<h$1>')
            .replace(/<\/h([1-6])><br>/g, '</h$1>')
            .replace(/<br><hr>/g, '<hr>')
            .replace(/<hr><br>/g, '<hr>')
            .replace(/<br><blockquote>/g, '<blockquote>')
            .replace(/<\/blockquote><br>/g, '</blockquote>');
        
        // Wrap in paragraph tags if not already wrapped in block elements
        if (!html.includes('<h1>') && !html.includes('<h2>') && !html.includes('<h3>') && 
            !html.includes('<h4>') && !html.includes('<h5>') && !html.includes('<h6>') && 
            !html.includes('<ul>') && !html.includes('<ol>') && !html.includes('<pre>') && 
            !html.includes('<table>') && !html.includes('<blockquote>') && !html.includes('<hr>')) {
            html = `<p>${html}</p>`;
        }
        
        return html;
    }

    markdownTypewriterEffect(element, text, speed = 30) {
        let index = 0;
        let currentText = '';
        
        const typeInterval = setInterval(() => {
            if (index < text.length) {
                currentText += text.charAt(index);
                // Update the element with parsed markdown
                element.innerHTML = this.parseMarkdown(currentText);
                index++;
                this.scrollToBottom(); // Keep scrolling as text appears
            } else {
                clearInterval(typeInterval);
                // Allow user to send new messages after typewriter finishes
                this.isTyping = false;
                this.handleInputChange();
            }
        }, speed);
    }

    // Method to programmatically add messages (useful for system messages)
    addSystemMessage(text) {
        this.addMessage(text, 'bot');
    }

    // Method to clear chat history
    clearChat() {
        this.messagesContainer.innerHTML = '';
        this.addMessageWithTypewriter('Hello! I\'m CICR AI Powered Assistant. How can I help you today?', 'bot');
    }

    // Method to set API URL (useful for different environments)
    setApiUrl(url) {
        this.apiUrl = url;
    }
}

// Initialize chatbot when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const chatbot = new Chatbot();
    
    // Optional: Expose chatbot instance globally for debugging
    window.chatbot = chatbot;
});