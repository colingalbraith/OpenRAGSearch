// Main PDF Editor Application
import { CONFIG, ELEMENT_IDS } from './modules/config.js';
import { Utils } from './modules/utils.js';
import { EventManager, PDFEventHandlers } from './modules/eventManager.js';
import { PDFManager } from './modules/pdfManager.js';
import { AnnotationManager } from './modules/annotationManager.js';
import { ChatManager } from './modules/chatManager.js';
import { UIManager } from './modules/uiManager.js';
import { FileManager } from './modules/fileManager.js';

/**
 * Main PDF Editor Class - Refactored and Modular
 */
class PDFEditor {
    constructor() {
        this.isInitialized = false;
        this.elements = {};
        
        // Initialize modules
        this.eventManager = new EventManager();
        this.pdfManager = new PDFManager(this);
        this.annotationManager = new AnnotationManager(this);
        this.chatManager = new ChatManager(this);
        this.uiManager = new UIManager(this);
        this.fileManager = new FileManager(this);
        this.eventHandlers = new PDFEventHandlers(this);
        
        this.initialize();
    }

    /**
     * Initialize the application
     */
    async initialize() {
        try {
            this.cacheElements();
            this.setupEventListeners();
            // Temporarily disable drag and drop
            // this.uiManager.setupDragAndDrop();
            this.uiManager.initialize();
            this.fileManager.setupExportHandlers();
            
            // Try to restore previous session
            await this.attemptSessionRestore();
            
            this.isInitialized = true;
            this.showNotification('PDF Editor initialized successfully', 'success');
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.showNotification('Failed to initialize PDF Editor', 'error');
        }
    }

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        this.elements = {};
        
        // Cache all elements defined in ELEMENT_IDS
        Object.entries(ELEMENT_IDS).forEach(([key, id]) => {
            const element = document.getElementById(id);
            if (element) {
                this.elements[this.toCamelCase(key)] = element;
            }
        });

        // Cache color palette elements
        this.elements.colorPalette = document.querySelectorAll('.color-btn');
        this.elements.tabButtons = document.querySelectorAll('.tab-btn');
        
        // Log missing critical elements
        const criticalElements = ['uploadBtn', 'fileInput', 'pdfContainer', 'chatMessages'];
        criticalElements.forEach(key => {
            if (!this.elements[key]) {
                console.warn(`Critical element missing: ${key}`);
            }
        });
    }

    /**
     * Convert snake_case or SNAKE_CASE to camelCase
     */
    toCamelCase(str) {
        return str.toLowerCase().replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        this.eventHandlers.setupEventListeners();
        
        // Setup window events that need direct access
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        // Auto-save session periodically
        setInterval(() => {
            if (this.fileManager.hasFile()) {
                this.fileManager.saveSession();
            }
        }, 30000); // Save every 30 seconds
    }

    /**
     * Attempt to restore previous session
     */
    async attemptSessionRestore() {
        try {
            await this.fileManager.loadSession();
        } catch (error) {
            // Session restore failed - this is expected on first load
        }
    }

    /**
     * Handle file selection
     */
    handleFileSelect(e) {
        this.fileManager.handleFileSelect(e);
    }

    /**
     * Navigation methods - delegate to PDFManager
     */
    async showPrevPage() {
        await this.pdfManager.showPrevPage();
    }

    async showNextPage() {
        await this.pdfManager.showNextPage();
    }

    async goToPageNumber(pageNum) {
        await this.pdfManager.goToPageNumber(pageNum);
    }

    async goToPage() {
        await this.pdfManager.goToPage();
    }

    /**
     * Zoom methods - delegate to PDFManager
     */
    async zoomIn() {
        await this.pdfManager.zoomIn();
    }

    async zoomOut() {
        await this.pdfManager.zoomOut();
    }

    async handleZoomChange(e) {
        await this.pdfManager.handleZoomChange(e);
    }

    /**
     * Rotation methods - delegate to PDFManager
     */
    async rotateLeft() {
        await this.pdfManager.rotateLeft();
    }

    async rotateRight() {
        await this.pdfManager.rotateRight();
    }

    /**
     * Annotation methods - delegate to AnnotationManager
     */
    setTool(tool) {
        this.annotationManager.setTool(tool);
    }

    setColor(color) {
        this.annotationManager.setColor(color);
    }

    clearAnnotations() {
        this.annotationManager.clearAnnotations();
    }

    /**
     * Chat methods - delegate to ChatManager
     */
    async sendMessage() {
        await this.chatManager.sendMessage();
    }

    updateSendButton() {
        this.chatManager.updateSendButton();
    }

    clearChat() {
        this.chatManager.clearChat();
    }

    async handleQuickAction(action) {
        await this.chatManager.handleQuickAction(action);
    }

    /**
     * UI methods - delegate to UIManager
     */
    switchTab(tabName) {
        this.uiManager.switchTab(tabName);
    }

    switchAiTab(tabName) {
        this.uiManager.switchAiTab(tabName);
    }

    toggleLeftSidebar() {
        this.uiManager.toggleLeftSidebar();
    }

    toggleRightPanel() {
        this.uiManager.toggleRightPanel();
    }

    updateMainContentWidth() {
        this.uiManager.updateMainContentWidth();
    }

    handleContextMenu(e) {
        this.uiManager.handleContextMenu(e);
    }

    hideContextMenu() {
        this.uiManager.hideContextMenu();
    }

    handleKeyboard(e) {
        this.uiManager.handleKeyboard(e);
    }

    /**
     * Notification system
     */
    showNotification(message, type = 'info', duration) {
        this.uiManager.showNotification(message, type, duration);
    }

    /**
     * Update navigation button states
     */
    updateNavigationButtons() {
        this.pdfManager.updateNavigationButtons();
    }

    /**
     * Generate thumbnails
     */
    async generateThumbnails() {
        await this.pdfManager.generateThumbnails();
    }

    /**
     * Update bookmarks list
     */
    updateBookmarksList() {
        this.uiManager.updateBookmarksList();
    }

    /**
     * Get application state for debugging
     */
    getState() {
        return {
            isInitialized: this.isInitialized,
            hasFile: this.fileManager.hasFile(),
            fileInfo: this.fileManager.getFileInfo(),
            documentInfo: this.pdfManager.getDocumentInfo(),
            annotationStats: this.annotationManager.getAnnotationStats(),
            chatStats: this.chatManager.getChatStats(),
            uiState: this.uiManager.getUIState(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Reset application to initial state
     */
    reset() {
        // Clear file and related data
        this.fileManager.clearFile();
        
        // Reset all managers
        this.annotationManager.annotations.clear();
        this.chatManager.chatHistory = [];
        this.uiManager.bookmarks = [];
        
        // Reset UI
        this.uiManager.showWelcomeMessage();
        this.uiManager.switchTab('thumbnails');
        this.uiManager.switchAiTab('chat');
        
        // Clear session
        this.fileManager.clearSession();
        
        this.showNotification('Application reset', 'info');
    }

    /**
     * Export all data
     */
    async exportAll() {
        if (!this.fileManager.hasFile()) {
            this.showNotification('No document loaded', 'warning');
            return;
        }

        try {
            const state = this.getState();
            const exportData = {
                ...state,
                annotations: Array.from(this.annotationManager.annotations.entries()),
                chatHistory: this.chatManager.chatHistory,
                bookmarks: this.uiManager.bookmarks,
                exportType: 'complete',
                version: '1.0'
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });

            const filename = `${state.fileInfo.name}-complete-export.json`;
            Utils.downloadBlob(blob, filename);
            
            this.showNotification('Complete export downloaded', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('Export failed', 'error');
        }
    }

    /**
     * Import data
     */
    async importData(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (data.exportType === 'complete' && data.annotations) {
                // Import annotations
                this.annotationManager.annotations = new Map(data.annotations);
                this.annotationManager.updateAnnotationsList();
                
                // Import chat history
                if (data.chatHistory) {
                    this.chatManager.chatHistory = data.chatHistory;
                    // Rebuild chat UI
                    const messagesContainer = this.elements.chatMessages;
                    if (messagesContainer) {
                        Utils.clearElement(messagesContainer);
                        data.chatHistory.forEach(entry => {
                            this.chatManager.addMessageToChat(
                                entry.message,
                                entry.sender,
                                entry.sources
                            );
                        });
                    }
                }
                
                // Import bookmarks
                if (data.bookmarks) {
                    this.uiManager.bookmarks = data.bookmarks;
                    this.uiManager.updateBookmarksList();
                }
                
                this.showNotification('Data imported successfully', 'success');
            } else {
                throw new Error('Invalid import file format');
            }
        } catch (error) {
            console.error('Import error:', error);
            this.showNotification('Import failed: ' + error.message, 'error');
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        // Save current session
        if (this.fileManager.hasFile()) {
            this.fileManager.saveSession();
        }
        
        // Cleanup event listeners
        this.eventHandlers.cleanup();
        this.eventManager.cleanup();
    }

    /**
     * Get help information
     */
    getHelp() {
        return {
            version: '2.0.0',
            shortcuts: {
                'Arrow Left/Right': 'Navigate pages',
                'Home/End': 'First/Last page',
                '+/-': 'Zoom in/out',
                'Escape': 'Close dialogs'
            },
            supportedFormats: this.fileManager.getSupportedTypes(),
            maxFileSize: this.fileManager.getMaxFileSize(),
            features: [
                'PDF viewing and navigation',
                'Annotation tools (highlight, underline, draw, notes)',
                'AI-powered chat assistant',
                'Bookmarking system',
                'Export capabilities',
                'Session persistence'
            ]
        };
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Make PDF Editor globally accessible
    window.pdfEditor = new PDFEditor();
    
    // Add some useful global debugging functions
    window.getPDFEditorState = () => window.pdfEditor.getState();
    window.resetPDFEditor = () => window.pdfEditor.reset();
    window.getPDFEditorHelp = () => window.pdfEditor.getHelp();
    
    console.log('PDF Editor loaded. Access via window.pdfEditor');
    console.log('Debug functions: getPDFEditorState(), resetPDFEditor(), getPDFEditorHelp()');
});

export default PDFEditor;
