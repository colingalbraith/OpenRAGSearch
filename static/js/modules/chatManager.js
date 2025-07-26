// Chat Management Module
import { CONFIG } from './config.js';
import { Utils } from './utils.js';

export class ChatManager {
    constructor(editor) {
        this.editor = editor;
        this.chatHistory = [];
        this.isProcessing = false;
    }

    /**
     * Send message to AI assistant
     */
    async sendMessage() {
        const chatInput = this.editor.elements.chatInput;
        const sendBtn = this.editor.elements.sendBtn;
        
        if (!chatInput || !sendBtn) return;
        
        const message = chatInput.value.trim();
        if (!message || this.isProcessing) return;

        // Prevent multiple simultaneous requests
        this.isProcessing = true;
        sendBtn.disabled = true;

        try {
            // Add user message to chat
            this.addMessageToChat(message, 'user');
            chatInput.value = '';

            // Show typing indicator
            this.showTypingIndicator();

            // Send request to backend
            const response = await this.sendChatRequest(message);
            
            // Hide typing indicator
            this.hideTypingIndicator();

            // Add assistant response
            this.addMessageToChat(response.answer, 'assistant', response.page_references);

        } catch (error) {
            console.error('Chat error:', error);
            this.hideTypingIndicator();
            this.addMessageToChat('Sorry, I encountered an error. Please try again.', 'assistant');
        } finally {
            this.isProcessing = false;
            this.updateSendButton();
        }
    }

    /**
     * Send chat request to backend
     */
    async sendChatRequest(message) {
        const response = await fetch(CONFIG.ENDPOINTS.QA, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ question: message })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Add message to chat interface
     */
    addMessageToChat(message, sender, sources = null) {
        const messagesContainer = this.editor.elements.chatMessages;
        if (!messagesContainer) {
            console.error('Chat messages container not found');
            return;
        }

        const messageDiv = this.createMessageElement(message, sender, sources);
        messagesContainer.appendChild(messageDiv);

        // Scroll to bottom
        requestAnimationFrame(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });

        // Store in chat history
        this.chatHistory.push({
            message: message,
            sender: sender,
            timestamp: new Date(),
            sources: sources || []
        });

        // Update activity
        this.updateRecentActivity(sender === 'user' ? 'Question asked' : 'Answer received');
    }

    /**
     * Create message element
     */
    createMessageElement(message, sender, sources = null) {
        const messageDiv = Utils.createElement('div', {
            className: `message message-${sender}`
        });

        const currentTime = Utils.getCurrentTime();

        if (sender === 'user') {
            messageDiv.innerHTML = `
                <div class="message-bubble">
                    <div class="message-text">${Utils.escapeHtml(message)}</div>
                    <div class="message-time">${currentTime}</div>
                </div>
                <div class="message-avatar">
                    <i class="fas fa-user"></i>
                </div>
            `;
        } else {
            let sourcesHtml = '';
            if (sources && sources.length > 0) {
                sourcesHtml = `
                    <div class="message-sources">
                        ${sources.map(source => 
                            `<a href="#" class="source-link" onclick="window.pdfEditor.pdfManager.goToPageNumber(${source.page})" title="${Utils.escapeHtml(source.preview || '')}">
                                p.${source.page}
                            </a>`
                        ).join('')}
                    </div>
                `;
            }

            messageDiv.innerHTML = `
                <div class="message-avatar">
                    <i class="fas fa-brain"></i>
                </div>
                <div class="message-bubble">
                    <div class="message-text">${Utils.escapeHtml(message)}</div>
                    ${sourcesHtml}
                    <div class="message-time">${currentTime}</div>
                </div>
            `;
        }

        return messageDiv;
    }

    /**
     * Show typing indicator
     */
    showTypingIndicator() {
        const messagesContainer = this.editor.elements.chatMessages;
        if (!messagesContainer) return;

        // Remove existing indicator
        this.hideTypingIndicator();

        const typingDiv = Utils.createElement('div', {
            className: 'typing-indicator',
            id: 'typing-indicator'
        });

        typingDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-brain"></i>
            </div>
            <div class="typing-bubble">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;

        messagesContainer.appendChild(typingDiv);

        // Scroll to show typing indicator
        requestAnimationFrame(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
    }

    /**
     * Hide typing indicator
     */
    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    /**
     * Update send button state
     */
    updateSendButton() {
        const chatInput = this.editor.elements.chatInput;
        const sendBtn = this.editor.elements.sendBtn;
        
        if (!chatInput || !sendBtn) return;

        const hasText = chatInput.value.trim().length > 0;
        sendBtn.disabled = !hasText || this.isProcessing;
    }

    /**
     * Clear chat history
     */
    clearChat() {
        if (confirm('Are you sure you want to clear the chat history?')) {
            const messagesContainer = this.editor.elements.chatMessages;
            if (messagesContainer) {
                // Keep welcome message, remove others
                const welcomeChat = messagesContainer.querySelector('.welcome-chat');
                Utils.clearElement(messagesContainer);
                
                if (welcomeChat) {
                    messagesContainer.appendChild(welcomeChat);
                }
            }

            this.chatHistory = [];
            this.editor.showNotification('Chat cleared', 'success');
            this.updateRecentActivity('Chat cleared');
        }
    }

    /**
     * Handle quick actions from tools tab
     */
    async handleQuickAction(action) {
        if (!this.editor.pdfManager.pdfDoc) {
            this.editor.showNotification('Please load a PDF first', 'warning');
            return;
        }

        const questions = {
            summarize: 'Please provide a comprehensive summary of this document.',
            'key-points': 'What are the key points and main findings in this document?',
            methodology: 'What methodology was used in this research?',
            critique: 'What are the strengths and weaknesses of this work?',
            questions: 'Generate discussion questions about this document.',
            citations: 'What are the key references and citations in this document?'
        };

        const question = questions[action];
        if (!question) return;

        // Simulate typing the question
        this.editor.elements.chatInput.value = question;
        this.updateSendButton();
        
        // Send the message
        await this.sendMessage();

        // Switch to chat tab
        this.editor.uiManager.switchAiTab('chat');
    }

    /**
     * Export chat history
     */
    exportChat() {
        if (this.chatHistory.length === 0) {
            this.editor.showNotification('No chat history to export', 'warning');
            return;
        }

        const exportData = {
            document: this.editor.elements.fileName.textContent || 'document',
            exported: new Date().toISOString(),
            chat_history: this.chatHistory.map(entry => ({
                timestamp: entry.timestamp.toISOString(),
                sender: entry.sender,
                message: entry.message,
                sources: entry.sources
            }))
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        
        Utils.downloadBlob(blob, 'chat-history.json');
        this.editor.showNotification('Chat history exported', 'success');
    }

    /**
     * Update recent activity in analysis tab
     */
    updateRecentActivity(activity) {
        const activityList = document.getElementById('recentActivity');
        if (!activityList) return;

        // Remove existing activities except the first (placeholder)
        const activities = activityList.querySelectorAll('.activity-item:not(:first-child)');
        if (activities.length >= 5) {
            activities[activities.length - 1].remove();
        }

        // Create new activity item
        const activityItem = Utils.createElement('div', {
            className: 'activity-item'
        });

        const time = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        activityItem.innerHTML = `
            <i class="fas fa-circle"></i>
            <span>${activity}</span>
            <small>${time}</small>
        `;

        // Insert after the first item (or at the beginning if no placeholder)
        const firstItem = activityList.querySelector('.activity-item');
        if (firstItem && firstItem.textContent.includes('No document loaded')) {
            activityList.replaceChild(activityItem, firstItem);
        } else {
            activityList.insertBefore(activityItem, firstItem?.nextSibling || null);
        }
    }

    /**
     * Get chat statistics
     */
    getChatStats() {
        const userMessages = this.chatHistory.filter(m => m.sender === 'user').length;
        const assistantMessages = this.chatHistory.filter(m => m.sender === 'assistant').length;
        const totalSources = this.chatHistory.reduce((total, m) => total + (m.sources?.length || 0), 0);

        return {
            totalMessages: this.chatHistory.length,
            userMessages,
            assistantMessages,
            totalSources,
            firstMessage: this.chatHistory[0]?.timestamp,
            lastMessage: this.chatHistory[this.chatHistory.length - 1]?.timestamp
        };
    }
}
