// UI Management Module
import { CONFIG, CSS_CLASSES } from './config.js';
import { Utils } from './utils.js';

export class UIManager {
    constructor(editor) {
        this.editor = editor;
        this.isLeftSidebarVisible = true;
        this.rightPanelWidth = CONFIG.RIGHT_PANEL_WIDTH;
        this.isResizing = false;
        this.currentLeftTab = 'thumbnails';
        this.currentAiTab = 'chat';
        this.bookmarks = [];
    }

    /**
     * Initialize UI components
     */
    initialize() {
        this.setupResizablePanels();
        this.updateMainContentWidth();
        this.initializeWelcomeMessage();
    }

    /**
     * Setup drag and drop functionality
     */
    setupDragAndDrop() {
        const dropZone = this.editor.elements.uploadZone;
        if (!dropZone) return;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => 
                dropZone.classList.add(CSS_CLASSES.DRAGOVER), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => 
                dropZone.classList.remove(CSS_CLASSES.DRAGOVER), false);
        });

        dropZone.addEventListener('drop', (e) => this.handleDrop(e), false);
    }

    /**
     * Prevent default drag behavior
     */
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    /**
     * Handle file drop
     */
    handleDrop(e) {
        const files = Array.from(e.dataTransfer.files);
        const pdfFile = files.find(file => file.type === 'application/pdf');
        
        if (pdfFile) {
            this.editor.fileManager.uploadFile(pdfFile);
        } else {
            this.editor.showNotification('Please drop a PDF file', 'error');
        }
    }

    /**
     * Setup resizable panels
     */
    setupResizablePanels() {
        const rightSidebar = this.editor.elements.rightSidebar;
        if (!rightSidebar) return;

        // Create resize handle
        const resizeHandle = this.createResizeHandle();
        rightSidebar.style.position = 'relative';
        rightSidebar.insertBefore(resizeHandle, rightSidebar.firstChild);

        // Set initial width
        rightSidebar.style.width = `${this.rightPanelWidth}px`;

        // Setup resize functionality
        this.setupResizeHandlers(resizeHandle, rightSidebar);
        this.updateMainContentWidth();
    }

    /**
     * Create resize handle element
     */
    createResizeHandle() {
        const resizeHandle = Utils.createElement('div', {
            className: 'resize-handle',
            style: {
                position: 'absolute',
                left: '0',
                top: '0',
                width: '5px',
                height: '100%',
                background: '#cbd5e1',
                cursor: 'col-resize',
                zIndex: '1000',
                transition: 'background-color 0.2s'
            }
        });

        // Add hover effects
        resizeHandle.addEventListener('mouseenter', () => {
            resizeHandle.style.backgroundColor = '#2563eb';
        });

        resizeHandle.addEventListener('mouseleave', () => {
            if (!this.isResizing) {
                resizeHandle.style.backgroundColor = '#cbd5e1';
            }
        });

        return resizeHandle;
    }

    /**
     * Setup resize event handlers
     */
    setupResizeHandlers(resizeHandle, rightSidebar) {
        let startX, startWidth;

        resizeHandle.addEventListener('mousedown', (e) => {
            this.isResizing = true;
            startX = e.clientX;
            startWidth = parseInt(document.defaultView.getComputedStyle(rightSidebar).width, 10);

            resizeHandle.style.backgroundColor = '#2563eb';
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isResizing) return;

            const width = startWidth - (e.clientX - startX);
            const minWidth = 250;
            const maxWidth = window.innerWidth * 0.6;

            if (width >= minWidth && width <= maxWidth) {
                this.rightPanelWidth = width;
                rightSidebar.style.width = `${width}px`;
                this.updateMainContentWidth();
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.isResizing) {
                this.isResizing = false;
                resizeHandle.style.backgroundColor = '#cbd5e1';
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    }

    /**
     * Switch left sidebar tabs
     */
    switchTab(tabName) {
        if (!tabName || tabName === this.currentLeftTab) return;

        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove(CSS_CLASSES.ACTIVE);
            if (btn.dataset.tab === tabName) {
                btn.classList.add(CSS_CLASSES.ACTIVE);
            }
        });

        // Update tab panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove(CSS_CLASSES.ACTIVE);
        });

        const targetPanel = document.getElementById(tabName);
        if (targetPanel) {
            targetPanel.classList.add(CSS_CLASSES.ACTIVE);
        }

        this.currentLeftTab = tabName;
    }

    /**
     * Switch AI assistant tabs
     */
    switchAiTab(tabName) {
        if (!tabName || tabName === this.currentAiTab) return;

        // Update tab buttons
        document.querySelectorAll('.ai-tab-btn').forEach(btn => {
            btn.classList.remove(CSS_CLASSES.ACTIVE);
            if (btn.dataset.aiTab === tabName) {
                btn.classList.add(CSS_CLASSES.ACTIVE);
            }
        });

        // Update tab panels
        document.querySelectorAll('.ai-tab-panel').forEach(panel => {
            panel.classList.remove(CSS_CLASSES.ACTIVE);
        });

        const targetPanel = document.getElementById(`ai-${tabName}`);
        if (targetPanel) {
            targetPanel.classList.add(CSS_CLASSES.ACTIVE);
        }

        this.currentAiTab = tabName;
    }

    /**
     * Toggle left sidebar visibility
     */
    toggleLeftSidebar() {
        const leftSidebar = this.editor.elements.leftSidebar;
        if (!leftSidebar) return;

        this.isLeftSidebarVisible = !this.isLeftSidebarVisible;

        if (this.isLeftSidebarVisible) {
            leftSidebar.style.display = 'flex';
            leftSidebar.style.transform = 'translateX(0)';
        } else {
            leftSidebar.style.transform = 'translateX(-100%)';
            setTimeout(() => {
                if (!this.isLeftSidebarVisible) {
                    leftSidebar.style.display = 'none';
                }
            }, CONFIG.PANEL_ANIMATION_DURATION);
        }

        this.updateToggleButton('toggleLeftPanel', this.isLeftSidebarVisible, 'fas fa-chevron-left', 'fas fa-bars');
        this.updateMainContentWidth();
        
        this.editor.showNotification(
            this.isLeftSidebarVisible ? 'Left panel shown' : 'Left panel hidden',
            'info'
        );
    }

    /**
     * Toggle right sidebar visibility
     */
    toggleRightPanel() {
        const rightSidebar = this.editor.elements.rightSidebar;
        if (!rightSidebar) return;

        const isVisible = rightSidebar.style.display !== 'none';

        if (isVisible) {
            rightSidebar.style.transform = 'translateX(100%)';
            setTimeout(() => {
                rightSidebar.style.display = 'none';
                this.updateMainContentWidth();
            }, CONFIG.PANEL_ANIMATION_DURATION);
        } else {
            rightSidebar.style.display = 'block';
            rightSidebar.style.transform = 'translateX(0)';
            this.updateMainContentWidth();
        }

        this.updateToggleButton('toggleRightPanel', !isVisible, 'fas fa-brain', 'fas fa-chevron-right');
        
        this.editor.showNotification(
            isVisible ? 'AI assistant hidden' : 'AI assistant shown',
            'info'
        );
    }

    /**
     * Update toggle button icon
     */
    updateToggleButton(buttonId, isVisible, visibleIcon, hiddenIcon) {
        const toggleBtn = document.getElementById(buttonId);
        if (!toggleBtn) return;

        const icon = toggleBtn.querySelector('i');
        if (icon) {
            icon.className = isVisible ? visibleIcon : hiddenIcon;
        }
    }

    /**
     * Update main content width based on sidebar visibility
     */
    updateMainContentWidth() {
        const leftSidebar = this.editor.elements.leftSidebar;
        const rightSidebar = this.editor.elements.rightSidebar;
        const pdfPanel = document.querySelector('.pdf-panel');

        if (!pdfPanel) return;

        let leftWidth = 0;
        let rightWidth = 0;

        // Calculate left sidebar width
        if (leftSidebar && this.isLeftSidebarVisible && leftSidebar.style.display !== 'none') {
            leftWidth = leftSidebar.offsetWidth || 300;
        }

        // Calculate right sidebar width
        if (rightSidebar && rightSidebar.style.display !== 'none') {
            rightWidth = this.rightPanelWidth;
        }

        // Update PDF panel width
        const availableWidth = window.innerWidth - leftWidth - rightWidth;
        pdfPanel.style.width = `${availableWidth}px`;
    }

    /**
     * Initialize welcome message
     */
    initializeWelcomeMessage() {
        const welcomeMessage = this.editor.elements.welcomeMessage;
        const pdfViewer = this.editor.elements.pdfViewer;

        if (welcomeMessage) {
            welcomeMessage.style.display = 'flex';
        }
        if (pdfViewer) {
            pdfViewer.style.display = 'none';
        }
    }

    /**
     * Show PDF viewer and hide welcome message
     */
    showPDFViewer() {
        const welcomeMessage = this.editor.elements.welcomeMessage;
        const pdfViewer = this.editor.elements.pdfViewer;

        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
        if (pdfViewer) {
            pdfViewer.style.display = 'block';
        }
    }

    /**
     * Show welcome message and hide PDF viewer
     */
    showWelcomeMessage() {
        const welcomeMessage = this.editor.elements.welcomeMessage;
        const pdfViewer = this.editor.elements.pdfViewer;

        if (welcomeMessage) {
            welcomeMessage.style.display = 'flex';
        }
        if (pdfViewer) {
            pdfViewer.style.display = 'none';
        }
    }

    /**
     * Update file name display
     */
    updateFileName(fileName) {
        const fileNameElement = this.editor.elements.fileName;
        if (fileNameElement) {
            fileNameElement.textContent = fileName;
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info', duration = CONFIG.NOTIFICATION_DURATION) {
        // Remove existing notifications
        document.querySelectorAll('.notification').forEach(notification => {
            notification.remove();
        });

        const notification = Utils.createElement('div', {
            className: `notification ${type}`,
            style: {
                position: 'fixed',
                top: '20px',
                right: '20px',
                padding: '12px 20px',
                borderRadius: '8px',
                color: 'white',
                zIndex: '10000',
                maxWidth: '400px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                background: this.getNotificationColor(type),
                transform: 'translateX(100%)',
                transition: 'transform 0.3s ease'
            }
        }, message);

        document.body.appendChild(notification);

        // Animate in
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
        });

        // Auto remove
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, duration);
    }

    /**
     * Get notification background color
     */
    getNotificationColor(type) {
        const colors = {
            error: '#ef4444',
            success: '#10b981',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        return colors[type] || colors.info;
    }

    /**
     * Bookmark management
     */
    addBookmark(pageNum, title, description = '') {
        const bookmark = {
            id: Utils.generateId(),
            page: pageNum,
            title: title || `Page ${pageNum}`,
            description: description,
            timestamp: new Date().toISOString()
        };

        this.bookmarks.push(bookmark);
        this.updateBookmarksList();
        this.editor.showNotification('Bookmark added', 'success');
    }

    /**
     * Update bookmarks list in sidebar
     */
    updateBookmarksList() {
        const container = document.getElementById('bookmarksContainer');
        if (!container) return;

        // Update bookmark count
        const bookmarkCount = document.getElementById('bookmarkCount');
        if (bookmarkCount) {
            bookmarkCount.textContent = this.bookmarks.length;
        }

        // Clear container
        Utils.clearElement(container);

        if (this.bookmarks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bookmark"></i>
                    <p>No bookmarks yet</p>
                    <small>Right-click on pages to add bookmarks</small>
                </div>
            `;
            return;
        }

        // Sort bookmarks by page number
        const sortedBookmarks = [...this.bookmarks].sort((a, b) => a.page - b.page);

        sortedBookmarks.forEach(bookmark => {
            const bookmarkItem = this.createBookmarkItem(bookmark);
            container.appendChild(bookmarkItem);
        });
    }

    /**
     * Create bookmark list item
     */
    createBookmarkItem(bookmark) {
        const item = Utils.createElement('div', {
            className: 'bookmark-item',
            'data-bookmark-id': bookmark.id
        });

        const time = new Date(bookmark.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        item.innerHTML = `
            <div class="bookmark-icon">
                <i class="fas fa-bookmark"></i>
            </div>
            <div class="bookmark-content">
                <div class="bookmark-title">${Utils.escapeHtml(bookmark.title)}</div>
                <div class="bookmark-page">Page ${bookmark.page}</div>
                ${bookmark.description ? `<div class="bookmark-description">${Utils.escapeHtml(bookmark.description)}</div>` : ''}
                <div class="bookmark-meta">
                    <span class="bookmark-time">${time}</span>
                    <button class="bookmark-delete" data-bookmark-id="${bookmark.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;

        // Add click to go to page
        item.addEventListener('click', () => {
            this.editor.pdfManager.goToPageNumber(bookmark.page);
        });

        // Add delete handler
        const deleteBtn = item.querySelector('.bookmark-delete');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteBookmark(bookmark.id);
        });

        return item;
    }

    /**
     * Delete bookmark
     */
    deleteBookmark(bookmarkId) {
        const index = this.bookmarks.findIndex(b => b.id === bookmarkId);
        if (index !== -1) {
            this.bookmarks.splice(index, 1);
            this.updateBookmarksList();
            this.editor.showNotification('Bookmark deleted', 'success');
        }
    }

    /**
     * Context menu handling
     */
    handleContextMenu(e) {
        const selection = window.getSelection();
        if (selection.toString().length > 0) {
            e.preventDefault();
            const menu = this.editor.elements.textContextMenu;
            if (menu) {
                menu.style.display = 'block';
                menu.style.left = e.pageX + 'px';
                menu.style.top = e.pageY + 'px';
            }
        }
    }

    /**
     * Hide context menu
     */
    hideContextMenu() {
        if (this.editor.elements.textContextMenu) {
            this.editor.elements.textContextMenu.style.display = 'none';
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    async handleKeyboard(e) {
        // Skip if user is typing in input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                this.editor.pdfManager.showPrevPage();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.editor.pdfManager.showNextPage();
                break;
            case 'Home':
                e.preventDefault();
                this.editor.pdfManager.goToPageNumber(1);
                break;
            case 'End':
                e.preventDefault();
                this.editor.pdfManager.goToPageNumber(this.editor.pdfManager.pdfDoc?.numPages || 1);
                break;
            case '+':
            case '=':
                e.preventDefault();
                await this.editor.pdfManager.zoomIn();
                break;
            case '-':
                e.preventDefault();
                await this.editor.pdfManager.zoomOut();
                break;
            case 'Escape':
                this.hideContextMenu();
                break;
        }
    }

    /**
     * Get UI state
     */
    getUIState() {
        return {
            leftSidebarVisible: this.isLeftSidebarVisible,
            rightPanelWidth: this.rightPanelWidth,
            currentLeftTab: this.currentLeftTab,
            currentAiTab: this.currentAiTab,
            bookmarks: this.bookmarks,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight
        };
    }

    /**
     * Restore UI state
     */
    restoreUIState(state) {
        if (!state) return;

        if (state.leftSidebarVisible !== undefined) {
            this.isLeftSidebarVisible = state.leftSidebarVisible;
        }
        
        if (state.rightPanelWidth) {
            this.rightPanelWidth = state.rightPanelWidth;
        }
        
        if (state.currentLeftTab) {
            this.switchTab(state.currentLeftTab);
        }
        
        if (state.currentAiTab) {
            this.switchAiTab(state.currentAiTab);
        }
        
        if (state.bookmarks) {
            this.bookmarks = state.bookmarks;
            this.updateBookmarksList();
        }

        this.updateMainContentWidth();
    }
}
