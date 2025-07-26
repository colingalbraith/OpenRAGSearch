// Event Management System
export class EventManager {
    constructor() {
        this.listeners = new Map();
    }

    /**
     * Add event listener with automatic cleanup tracking
     */
    addEventListener(element, event, handler, options = {}) {
        if (!element) return;

        element.addEventListener(event, handler, options);
        
        // Track for cleanup
        const elementKey = this.getElementKey(element);
        if (!this.listeners.has(elementKey)) {
            this.listeners.set(elementKey, []);
        }
        
        this.listeners.get(elementKey).push({
            event,
            handler,
            options
        });
    }

    /**
     * Remove all event listeners for an element
     */
    removeEventListeners(element) {
        if (!element) return;

        const elementKey = this.getElementKey(element);
        const elementListeners = this.listeners.get(elementKey);
        
        if (elementListeners) {
            elementListeners.forEach(({ event, handler, options }) => {
                element.removeEventListener(event, handler, options);
            });
            this.listeners.delete(elementKey);
        }
    }

    /**
     * Clean up all event listeners
     */
    cleanup() {
        this.listeners.clear();
    }

    /**
     * Generate unique key for element
     */
    getElementKey(element) {
        if (!element._eventKey) {
            element._eventKey = 'element_' + Math.random().toString(36).substr(2, 9);
        }
        return element._eventKey;
    }

    /**
     * Delegate event handling
     */
    delegate(container, selector, event, handler) {
        this.addEventListener(container, event, (e) => {
            const target = e.target.closest(selector);
            if (target && container.contains(target)) {
                handler.call(target, e);
            }
        });
    }

    /**
     * Add one-time event listener
     */
    once(element, event, handler) {
        const onceHandler = (e) => {
            handler(e);
            this.removeEventListener(element, event, onceHandler);
        };
        this.addEventListener(element, event, onceHandler);
    }

    /**
     * Custom event dispatcher
     */
    dispatch(element, eventName, detail = {}) {
        const event = new CustomEvent(eventName, {
            detail,
            bubbles: true,
            cancelable: true
        });
        element.dispatchEvent(event);
    }
}

// Specific event handlers for the PDF Editor
export class PDFEventHandlers {
    constructor(editor) {
        this.editor = editor;
        this.eventManager = new EventManager();
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        this.setupFileHandling();
        this.setupNavigation();
        this.setupZoomControls();
        this.setupViewControls();
        this.setupAnnotationTools();
        this.setupChat();
        this.setupTabs();
        this.setupKeyboardShortcuts();
        this.setupContextMenu();
        this.setupWindowEvents();
        this.setupQuickActions();
    }

    /**
     * File handling events
     */
    setupFileHandling() {
        const { uploadBtn, fileInput, uploadZone } = this.editor.elements;

        this.eventManager.addEventListener(uploadBtn, 'click', () => fileInput?.click());
        this.eventManager.addEventListener(fileInput, 'change', (e) => this.editor.handleFileSelect(e));
        this.eventManager.addEventListener(uploadZone, 'click', () => fileInput?.click());
    }

    /**
     * Navigation events
     */
    setupNavigation() {
        const { prevPage, nextPage, firstPage, lastPage, pageInput } = this.editor.elements;

        this.eventManager.addEventListener(prevPage, 'click', () => this.editor.showPrevPage());
        this.eventManager.addEventListener(nextPage, 'click', () => this.editor.showNextPage());
        this.eventManager.addEventListener(firstPage, 'click', () => this.editor.goToPageNumber(1));
        this.eventManager.addEventListener(lastPage, 'click', () => 
            this.editor.goToPageNumber(this.editor.pdfDoc?.numPages || 1)
        );
        this.eventManager.addEventListener(pageInput, 'change', () => this.editor.goToPage());
        this.eventManager.addEventListener(pageInput, 'keypress', (e) => {
            if (e.key === 'Enter') this.editor.goToPage();
        });
    }

    /**
     * Zoom control events
     */
    setupZoomControls() {
        const { zoomIn, zoomOut, zoomSelect } = this.editor.elements;

        this.eventManager.addEventListener(zoomIn, 'click', async () => await this.editor.zoomIn());
        this.eventManager.addEventListener(zoomOut, 'click', async () => await this.editor.zoomOut());
        this.eventManager.addEventListener(zoomSelect, 'change', (e) => this.editor.handleZoomChange(e));
    }

    /**
     * View control events
     */
    setupViewControls() {
        const { rotateLeft, rotateRight } = this.editor.elements;

        this.eventManager.addEventListener(rotateLeft, 'click', () => this.editor.rotateLeft());
        this.eventManager.addEventListener(rotateRight, 'click', () => this.editor.rotateRight());

        // Panel toggles
        const { toggleLeftPanel, toggleRightPanel } = this.editor.elements;

        this.eventManager.addEventListener(toggleLeftPanel, 'click', () => this.editor.toggleLeftSidebar());
        this.eventManager.addEventListener(toggleRightPanel, 'click', () => this.editor.toggleRightPanel());
    }

    /**
     * Annotation tool events
     */
    setupAnnotationTools() {
        const tools = [
            { btn: this.editor.elements.selectTool, tool: 'select' },
            { btn: this.editor.elements.highlightTool, tool: 'highlight' },
            { btn: this.editor.elements.underlineTool, tool: 'underline' },
            { btn: this.editor.elements.strikethroughTool, tool: 'strikethrough' },
            { btn: this.editor.elements.noteTool, tool: 'note' },
            { btn: this.editor.elements.drawTool, tool: 'draw' },
            { btn: this.editor.elements.eraserTool, tool: 'eraser' }
        ];

        tools.forEach(({ btn, tool }) => {
            if (btn) {
                this.eventManager.addEventListener(btn, 'click', () => this.editor.setTool(tool));
            }
        });

        // Event delegation for all tool buttons (fallback and primary approach)
        this.eventManager.delegate(document, '.btn-tool', 'click', (e) => {
            const tool = e.target.closest('.btn-tool').dataset.tool;
            if (tool) {
                this.editor.setTool(tool);
            }
        });

        // Color palette
        this.editor.elements.colorPalette?.forEach(btn => {
            this.eventManager.addEventListener(btn, 'click', (e) => 
                this.editor.setColor(e.target.dataset.color)
            );
        });

        // Clear annotations
        this.eventManager.addEventListener(this.editor.elements.clearAnnotations, 'click', () => 
            this.editor.clearAnnotations()
        );
    }

    /**
     * Chat events
     */
    setupChat() {
        const { sendBtn, chatInput, clearChatBtn } = this.editor.elements;

        this.eventManager.addEventListener(sendBtn, 'click', () => this.editor.sendMessage());
        this.eventManager.addEventListener(chatInput, 'keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.editor.sendMessage();
            }
        });
        this.eventManager.addEventListener(chatInput, 'input', () => this.editor.updateSendButton());
        this.eventManager.addEventListener(clearChatBtn, 'click', () => this.editor.clearChat());
    }

    /**
     * Tab switching events
     */
    setupTabs() {
        // Left sidebar tabs
        this.editor.elements.tabButtons?.forEach(btn => {
            this.eventManager.addEventListener(btn, 'click', (e) => {
                // Use currentTarget to ensure we get the button element, not a child element
                const tabName = e.currentTarget.dataset.tab;
                this.editor.switchTab(tabName);
            });
        });

        // AI tabs
        document.querySelectorAll('.ai-tab-btn').forEach(btn => {
            this.eventManager.addEventListener(btn, 'click', (e) => {
                // Use currentTarget to ensure we get the button element, not a child element
                const tabName = e.currentTarget.dataset.aiTab;
                this.editor.switchAiTab(tabName);
            });
        });
    }

    /**
     * Quick action events
     */
    setupQuickActions() {
        document.querySelectorAll('.action-btn, .tool-card').forEach(btn => {
            this.eventManager.addEventListener(btn, 'click', (e) => {
                // Use currentTarget to ensure we get the button element consistently
                const action = e.currentTarget.dataset.action;
                if (action) this.editor.handleQuickAction(action);
            });
        });
    }

    /**
     * Keyboard shortcut events
     */
    setupKeyboardShortcuts() {
        this.eventManager.addEventListener(document, 'keydown', (e) => this.editor.handleKeyboard(e));
    }

    /**
     * Context menu events
     */
    setupContextMenu() {
        this.eventManager.addEventListener(document, 'contextmenu', (e) => this.editor.handleContextMenu(e));
        this.eventManager.addEventListener(document, 'click', () => this.editor.hideContextMenu());
    }

    /**
     * Window events
     */
    setupWindowEvents() {
        this.eventManager.addEventListener(window, 'resize', () => this.editor.updateMainContentWidth());
    }

    /**
     * Cleanup all event listeners
     */
    cleanup() {
        this.eventManager.cleanup();
    }
}
