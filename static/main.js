// Research Assistant - Main JavaScript (Fixed Version)

class PDFEditor {
    constructor() {
        // Core properties
        this.pdfDoc = null;
        this.currentPage = 1;
        this.scale = 1.2;
        this.rotation = 0; // Track page rotation (0, 90, 180, 270 degrees)
        this.isRendering = false;
        this.currentTool = 'select';
        this.currentColor = '#ffff00';
        this.annotations = new Map();
        this.currentNotes = new Map();
        this.chatHistory = [];
        this.bookmarks = [];
        
        // Drawing state for draw tool
        this.isDrawing = false;
        this.drawPath = [];
        this.currentStroke = null;
        
        // Panel sizing properties
        this.rightPanelWidth = 350; // Default width in pixels
        this.isLeftSidebarVisible = true;
        this.isResizing = false;
        
        this.initialize();
    }
    
    initialize() {
        this.initializePDFJS();
        this.cacheElements();
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.setupResizablePanels();
        this.updateUI();
    }
    
    initializePDFJS() {
        // Configure PDF.js worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    
    cacheElements() {
        this.elements = {
            // File handling
            fileInput: document.getElementById('fileInput'),
            uploadBtn: document.getElementById('uploadBtn'),
            fileName: document.getElementById('fileName'),
            uploadZone: document.getElementById('uploadZone'),
            
            // Navigation
            prevBtn: document.getElementById('prevPage'),
            nextBtn: document.getElementById('nextPage'),
            firstBtn: document.getElementById('firstPage'),
            lastBtn: document.getElementById('lastPage'),
            pageInput: document.getElementById('pageInput'),
            totalPages: document.getElementById('totalPages'),
            
            // Zoom controls
            zoomInBtn: document.getElementById('zoomIn'),
            zoomOutBtn: document.getElementById('zoomOut'),
            zoomSelect: document.getElementById('zoomSelect'),
            
            // View controls
            rotateLeftBtn: document.getElementById('rotateLeft'),
            rotateRightBtn: document.getElementById('rotateRight'),
            
            // Annotation tools
            selectBtn: document.getElementById('selectTool'),
            highlightBtn: document.getElementById('highlightTool'),
            underlineBtn: document.getElementById('underlineTool'),
            strikethroughBtn: document.getElementById('strikethroughTool'),
            noteBtn: document.getElementById('noteTool'),
            drawBtn: document.getElementById('drawTool'),
            colorPalette: document.querySelectorAll('.color-btn'),
            clearAnnotationsBtn: document.getElementById('clearAnnotations'),
            
            // Tab buttons
            tabButtons: document.querySelectorAll('.tab-btn'),
            
            // Tab panels
            thumbnailsPanel: document.getElementById('thumbnails'),
            bookmarksPanel: document.getElementById('bookmarks'),
            annotationsPanel: document.getElementById('annotations'),
            
            // Chat elements
            chatMessages: document.getElementById('chatMessages'),
            chatInput: document.getElementById('chatInput'),
            sendBtn: document.getElementById('sendBtn'),
            clearChatBtn: document.getElementById('clearChat'),
            
            // Containers
            pdfContainer: document.getElementById('pdfContainer'),
            pdfViewer: document.getElementById('pdfViewer'),
            pdfPages: document.getElementById('pdfPages'),
            welcomeMessage: document.getElementById('welcomeMessage'),
            
            // Sidebars
            leftSidebar: document.getElementById('leftSidebar'),
            rightSidebar: document.getElementById('rightSidebar'),
            
            // Context menu
            textContextMenu: document.getElementById('textContextMenu')
        };
    }
    
    setupEventListeners() {
        // File upload
        this.elements.uploadBtn?.addEventListener('click', () => this.elements.fileInput?.click());
        this.elements.fileInput?.addEventListener('change', (e) => this.handleFileSelect(e));
        this.elements.uploadZone?.addEventListener('click', () => this.elements.fileInput?.click());
        
        // Navigation
        this.elements.prevBtn?.addEventListener('click', () => this.showPrevPage());
        this.elements.nextBtn?.addEventListener('click', () => this.showNextPage());
        this.elements.firstBtn?.addEventListener('click', () => this.goToPageNumber(1));
        this.elements.lastBtn?.addEventListener('click', () => this.goToPageNumber(this.pdfDoc?.numPages || 1));
        this.elements.pageInput?.addEventListener('change', () => this.goToPage());
        this.elements.pageInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.goToPage();
        });
        
        // Zoom controls
        this.elements.zoomInBtn?.addEventListener('click', () => this.zoomIn());
        this.elements.zoomOutBtn?.addEventListener('click', () => this.zoomOut());
        this.elements.zoomSelect?.addEventListener('change', (e) => this.handleZoomChange(e));
        
        // View controls
        this.elements.rotateLeftBtn?.addEventListener('click', () => this.rotateLeft());
        this.elements.rotateRightBtn?.addEventListener('click', () => this.rotateRight());
        
        // Panel toggles
        document.getElementById('toggleLeftPanel')?.addEventListener('click', () => this.toggleLeftSidebar());
        document.getElementById('toggleRightPanel')?.addEventListener('click', () => this.toggleRightPanel());
        
        // Annotation tools
        this.elements.selectBtn?.addEventListener('click', () => this.setTool('select'));
        this.elements.highlightBtn?.addEventListener('click', () => this.setTool('highlight'));
        this.elements.underlineBtn?.addEventListener('click', () => this.setTool('underline'));
        this.elements.strikethroughBtn?.addEventListener('click', () => this.setTool('strikethrough'));
        this.elements.noteBtn?.addEventListener('click', () => this.setTool('note'));
        this.elements.drawBtn?.addEventListener('click', () => this.setTool('draw'));
        this.elements.clearAnnotationsBtn?.addEventListener('click', () => this.clearAnnotations());
        
        // Color palette
        this.elements.colorPalette?.forEach(btn => {
            btn.addEventListener('click', (e) => this.setColor(e.target.dataset.color));
        });
        
        // Tab switching
        this.elements.tabButtons?.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });
        
        // Chat
        this.elements.sendBtn?.addEventListener('click', () => this.sendMessage());
        this.elements.chatInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        this.elements.chatInput?.addEventListener('input', () => this.updateSendButton());
        this.elements.clearChatBtn?.addEventListener('click', () => this.clearChat());
        
        // Quick actions - Update selectors for new structure
        document.querySelectorAll('.action-btn, .tool-card').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action || e.currentTarget.dataset.action;
                if (action) this.handleQuickAction(action);
            });
        });
        
        // AI Tab switching
        document.querySelectorAll('.ai-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchAiTab(e.target.dataset.aiTab));
        });
        
        // Context menu for text selection
        document.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
        document.addEventListener('click', () => this.hideContextMenu());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Window resize handler
        window.addEventListener('resize', () => {
            this.updateMainContentWidth();
        });
    }
    
    setupDragAndDrop() {
        const dropZone = this.elements.uploadZone;
        if (!dropZone) return;
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, this.preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
        });
        
        dropZone.addEventListener('drop', (e) => this.handleDrop(e), false);
    }
    
    setupResizablePanels() {
        // Create resize handle for right panel
        const rightSidebar = this.elements.rightSidebar;
        if (!rightSidebar) return;
        
        // Create resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        resizeHandle.style.cssText = `
            position: absolute;
            left: 0;
            top: 0;
            width: 5px;
            height: 100%;
            background: #cbd5e1;
            cursor: col-resize;
            z-index: 1000;
            transition: background-color 0.2s;
        `;
        
        // Add hover effect
        resizeHandle.addEventListener('mouseenter', () => {
            resizeHandle.style.backgroundColor = '#2563eb';
        });
        
        resizeHandle.addEventListener('mouseleave', () => {
            if (!this.isResizing) {
                resizeHandle.style.backgroundColor = '#cbd5e1';
            }
        });
        
        rightSidebar.style.position = 'relative';
        rightSidebar.insertBefore(resizeHandle, rightSidebar.firstChild);
        
        // Set initial width
        rightSidebar.style.width = `${this.rightPanelWidth}px`;
        
        // Resize functionality
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
        
        // Initial layout update
        this.updateMainContentWidth();
    }
    
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    handleDrop(e) {
        const files = Array.from(e.dataTransfer.files);
        const pdfFile = files.find(file => file.type === 'application/pdf');
        if (pdfFile) {
            this.uploadFile(pdfFile);
        } else {
            this.showNotification('Please drop a PDF file', 'error');
        }
    }
    
    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            this.uploadFile(file);
        }
    }
    
    async uploadFile(file) {
        try {
            this.showNotification('Uploading PDF...', 'info');
            
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Upload failed');
            }
            
            const result = await response.json();
            this.showNotification('PDF uploaded successfully!', 'success');
            
            // Load the PDF
            await this.loadPDF(`/pdf/${result.filename}`);
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showNotification('Upload failed. Please try again.', 'error');
        }
    }
    
    async sendMessage() {
        const message = this.elements.chatInput.value.trim();
        if (!message) return;
        
        // Add user message to chat
        this.addMessageToChat(message, 'user');
        this.elements.chatInput.value = '';
        this.updateSendButton();
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            const response = await fetch('/qa', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ question: message })
            });
            
            if (!response.ok) {
                throw new Error('Failed to get response');
            }
            
            const result = await response.json();
            
            // Hide typing indicator
            this.hideTypingIndicator();
            
            // Add assistant response with sources
            this.addMessageToChat(result.answer, 'assistant', result.page_references);
            
        } catch (error) {
            console.error('Chat error:', error);
            this.hideTypingIndicator();
            this.addMessageToChat('Sorry, I encountered an error. Please try again.', 'assistant');
        }
    }
    
    addMessageToChat(message, sender, sources = null) {
        const messagesContainer = this.elements.chatMessages;
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${sender}`;
        
        const currentTime = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        if (sender === 'user') {
            messageDiv.innerHTML = `
                <div class="message-bubble">
                    <div class="message-text">${this.escapeHtml(message)}</div>
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
                            `<a href="#" class="source-link" onclick="window.pdfEditor.goToPageNumber(${source.page})" title="${this.escapeHtml(source.preview || '')}">
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
                    <div class="message-text">${this.escapeHtml(message)}</div>
                    ${sourcesHtml}
                    <div class="message-time">${currentTime}</div>
                </div>
            `;
        }
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Store in chat history
        this.chatHistory.push({
            message: message,
            sender: sender,
            timestamp: new Date(),
            sources: sources || []
        });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showTypingIndicator() {
        const messagesContainer = this.elements.chatMessages;
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typing-indicator';
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
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    showNotification(message, type = 'info') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            color: white;
            z-index: 10000;
            background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : '#2196f3'};
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    async loadPDF(url) {
        try {
            this.showNotification('Loading PDF...', 'info');
            
            const loadingTask = pdfjsLib.getDocument(url);
            this.pdfDoc = await loadingTask.promise;
            
            // Reset rotation when loading new PDF
            this.rotation = 0;
            
            this.elements.totalPages.textContent = this.pdfDoc.numPages;
            this.elements.pageInput.max = this.pdfDoc.numPages;
            
            // Hide welcome message and show PDF viewer
            this.elements.welcomeMessage.style.display = 'none';
            this.elements.pdfViewer.style.display = 'block';
            
            // Render first page
            await this.renderPage(1);
            this.generateThumbnails();
            this.updateBookmarksList();
            this.updateProcessingInfo();
            
            this.showNotification('PDF loaded successfully!', 'success');
            
        } catch (error) {
            console.error('PDF loading error:', error);
            this.showNotification('Failed to load PDF', 'error');
        }
    }
    
    updateProcessingInfo() {
        // Update processing information with actual model details from your backend
        document.getElementById('chunkSizeInfo').textContent = '400 chars';
        document.getElementById('totalChunksInfo').textContent = 'Processing...';
        document.getElementById('embeddingModelInfo').textContent = 'nomic-embed-text (Ollama)';
        document.getElementById('llmModelInfo').textContent = 'Gemma2:2b (Ollama)';
        
        // Calculate chunk info after a delay
        setTimeout(async () => {
            try {
                // Estimate based on actual chunk size (400 chars) and avg chars per page (~2000)
                const estimatedChunks = Math.ceil((this.pdfDoc.numPages * 2000) / 400);
                document.getElementById('totalChunksInfo').textContent = `~${estimatedChunks}`;
            } catch (error) {
                document.getElementById('totalChunksInfo').textContent = 'Unknown';
            }
        }, 1500);
    }
    
    async renderPage(pageNum) {
        if (this.isRendering) return;
        
        try {
            this.isRendering = true;
            this.currentPage = pageNum;
            
            const page = await this.pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ 
                scale: this.scale,
                rotation: this.rotation 
            });
            
            // Clear existing content
            this.elements.pdfPages.innerHTML = '';
            
            // Create page container
            const pageContainer = document.createElement('div');
            pageContainer.className = 'page-container';
            pageContainer.style.cssText = `
                position: relative;
                display: inline-block;
                margin: 20px auto;
                background: white;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            `;
            
            // Create PDF canvas
            const canvas = document.createElement('canvas');
            canvas.className = 'pdf-canvas';
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            // Create annotation overlay canvas
            const annotationCanvas = document.createElement('canvas');
            annotationCanvas.className = 'annotation-canvas';
            annotationCanvas.height = viewport.height;
            annotationCanvas.width = viewport.width;
            annotationCanvas.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                pointer-events: none;
                z-index: 2;
            `;
            
            // Create interaction layer
            const interactionLayer = document.createElement('div');
            interactionLayer.className = 'interaction-layer';
            interactionLayer.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: ${viewport.width}px;
                height: ${viewport.height}px;
                z-index: 3;
                cursor: ${this.currentTool === 'select' ? 'default' : 'crosshair'};
            `;
            
            // Add all layers to container
            pageContainer.appendChild(canvas);
            pageContainer.appendChild(annotationCanvas);
            pageContainer.appendChild(interactionLayer);
            this.elements.pdfPages.appendChild(pageContainer);
            
            // Render PDF page
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            
            await page.render(renderContext).promise;
            
            // Setup interaction handlers
            this.setupPageInteractions(interactionLayer, annotationCanvas, viewport);
            
            // Render existing annotations for this page
            this.renderAnnotations(pageNum, annotationCanvas, viewport);
            
            // Update UI
            this.elements.pageInput.value = pageNum;
            this.updateNavigationButtons();
            
        } catch (error) {
            console.error('Page rendering error:', error);
        } finally {
            this.isRendering = false;
        }
    }
    
    async previewPage(pageNum) {
        if (this.isRendering) return;
        
        try {
            const page = await this.pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ 
                scale: this.scale,
                rotation: this.rotation 
            });
            
            // Find existing canvas
            const canvas = document.querySelector('.pdf-canvas');
            if (!canvas) return;
            
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            // Render preview page
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            
            await page.render(renderContext).promise;
            
            // Clear annotations during preview
            const annotationCanvas = document.querySelector('.annotation-canvas');
            if (annotationCanvas) {
                const ctx = annotationCanvas.getContext('2d');
                ctx.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height);
            }
            
        } catch (error) {
            console.error('Page preview error:', error);
        }
    }

    setupPageInteractions(interactionLayer, annotationCanvas, viewport) {
        let isDrawing = false;
        let startX, startY, endX, endY;
        
        interactionLayer.addEventListener('mousedown', (e) => {
            if (this.currentTool === 'select') return;
            
            isDrawing = true;
            const rect = interactionLayer.getBoundingClientRect();
            startX = e.clientX - rect.left;
            startY = e.clientY - rect.top;
            
            // For draw tool, initialize the path
            if (this.currentTool === 'draw') {
                this.currentStroke = [{x: startX, y: startY}];
                this.isDrawing = true;
            }
        });
        
        interactionLayer.addEventListener('mousemove', (e) => {
            if (!isDrawing || this.currentTool === 'select') return;
            
            const rect = interactionLayer.getBoundingClientRect();
            endX = e.clientX - rect.left;
            endY = e.clientY - rect.top;
            
            if (this.currentTool === 'draw') {
                // Add point to current stroke
                this.currentStroke.push({x: endX, y: endY});
                // Show live drawing preview
                this.showDrawingPreview(annotationCanvas);
            } else {
                // Show preview of annotation for other tools
                this.showAnnotationPreview(annotationCanvas, startX, startY, endX, endY);
            }
        });
        
        interactionLayer.addEventListener('mouseup', (e) => {
            if (!isDrawing || this.currentTool === 'select') return;
            
            const rect = interactionLayer.getBoundingClientRect();
            endX = e.clientX - rect.left;
            endY = e.clientY - rect.top;
            
            isDrawing = false;
            
            if (this.currentTool === 'draw') {
                // Finish the drawing stroke
                this.isDrawing = false;
                if (this.currentStroke && this.currentStroke.length > 1) {
                    this.createDrawAnnotation(this.currentPage, this.currentStroke, this.currentColor);
                }
                this.currentStroke = null;
            } else {
                // Create annotation for other tools
                this.createAnnotation(this.currentPage, startX, startY, endX, endY, this.currentTool, this.currentColor);
            }
            
            this.renderAnnotations(this.currentPage, annotationCanvas, viewport);
        });
        
        // Handle text selection for notes
        interactionLayer.addEventListener('dblclick', (e) => {
            if (this.currentTool === 'note') {
                const rect = interactionLayer.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                this.createNoteAnnotation(this.currentPage, x, y);
            }
        });
    }
    
    showAnnotationPreview(canvas, startX, startY, endX, endY) {
        const ctx = canvas.getContext('2d');
        
        // Clear previous preview
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Redraw existing annotations
        this.renderAnnotations(this.currentPage, canvas, null, false);
        
        // Draw preview with appropriate color for each tool
        ctx.globalAlpha = 0.5;
        
        if (this.currentTool === 'highlight') {
            ctx.fillStyle = this.currentColor;
            ctx.fillRect(startX, startY, endX - startX, endY - startY);
        } else if (this.currentTool === 'underline') {
            ctx.fillStyle = '#ff0000'; // Red for underlines
            ctx.fillRect(startX, endY - 2, endX - startX, 4);
        } else if (this.currentTool === 'strikethrough') {
            ctx.fillStyle = this.currentColor;
            const centerY = startY + (endY - startY) / 2;
            ctx.fillRect(startX, centerY - 1, endX - startX, 2);
        }
        
        ctx.globalAlpha = 1.0;
    }
    
    showDrawingPreview(canvas) {
        const ctx = canvas.getContext('2d');
        
        // Clear previous preview
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Redraw existing annotations
        this.renderAnnotations(this.currentPage, canvas, null, false);
        
        // Draw current stroke
        if (this.currentStroke && this.currentStroke.length > 1) {
            ctx.globalAlpha = 0.8;
            ctx.strokeStyle = this.currentColor;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            ctx.beginPath();
            ctx.moveTo(this.currentStroke[0].x, this.currentStroke[0].y);
            for (let i = 1; i < this.currentStroke.length; i++) {
                ctx.lineTo(this.currentStroke[i].x, this.currentStroke[i].y);
            }
            ctx.stroke();
            
            ctx.globalAlpha = 1.0;
        }
    }
    
    createDrawAnnotation(pageNum, path, color) {
        const pageKey = `page_${pageNum}`;
        if (!this.annotations.has(pageKey)) {
            this.annotations.set(pageKey, []);
        }
        
        // Calculate bounding box for the path
        let minX = path[0].x, minY = path[0].y;
        let maxX = path[0].x, maxY = path[0].y;
        
        path.forEach(point => {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        });
        
        const annotation = {
            id: Date.now(),
            type: 'draw',
            color: color,
            coordinates: {
                startX: minX,
                startY: minY,
                endX: maxX,
                endY: maxY
            },
            path: path, // Store the full drawing path
            page: pageNum,
            timestamp: new Date().toISOString()
        };
        
        this.annotations.get(pageKey).push(annotation);
        this.updateAnnotationsList();
        this.showNotification('Drawing annotation added', 'success');
    }
    
    createAnnotation(pageNum, startX, startY, endX, endY, tool, color) {
        const pageKey = `page_${pageNum}`;
        if (!this.annotations.has(pageKey)) {
            this.annotations.set(pageKey, []);
        }
        
        // Use appropriate color for each tool type
        let annotationColor = color;
        if (tool === 'underline') {
            annotationColor = '#ff0000'; // Red for underlines
        }
        
        const annotation = {
            id: Date.now(),
            type: tool,
            color: annotationColor,
            coordinates: {
                startX: Math.min(startX, endX),
                startY: Math.min(startY, endY),
                endX: Math.max(startX, endX),
                endY: Math.max(startY, endY)
            },
            page: pageNum,
            timestamp: new Date().toISOString()
        };
        
        this.annotations.get(pageKey).push(annotation);
        this.updateAnnotationsList();
        this.showNotification(`${tool} annotation added`, 'success');
    }
    
    createNoteAnnotation(pageNum, x, y) {
        const pageKey = `page_${pageNum}`;
        if (!this.annotations.has(pageKey)) {
            this.annotations.set(pageKey, []);
        }
        
        const annotation = {
            id: Date.now(),
            type: 'note',
            color: '#ffd700',
            coordinates: { startX: x, startY: y, endX: x + 24, endY: y + 24 },
            page: pageNum,
            content: '', // Start with empty content
            timestamp: new Date().toISOString()
        };
        
        this.annotations.get(pageKey).push(annotation);
        this.updateAnnotationsList();
        
        // Immediately open the note for editing
        setTimeout(() => {
            this.openNoteEditor(annotation);
        }, 100);
        
        this.showNotification('Note created - click to edit', 'success');
    }
    
    renderAnnotations(pageNum, canvas, viewport, clear = true) {
        const ctx = canvas.getContext('2d');
        
        if (clear) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        const pageKey = `page_${pageNum}`;
        const pageAnnotations = this.annotations.get(pageKey) || [];
        
        pageAnnotations.forEach(annotation => {
            const { startX, startY, endX, endY } = annotation.coordinates;
            
            if (annotation.type === 'highlight') {
                ctx.fillStyle = annotation.color;
                ctx.globalAlpha = 0.3;
                ctx.fillRect(startX, startY, endX - startX, endY - startY);
            } else if (annotation.type === 'underline') {
                ctx.fillStyle = annotation.color;
                ctx.globalAlpha = 0.8;
                ctx.fillRect(startX, endY - 2, endX - startX, 4);
            } else if (annotation.type === 'strikethrough') {
                ctx.fillStyle = annotation.color;
                ctx.globalAlpha = 0.8;
                const centerY = startY + (endY - startY) / 2;
                ctx.fillRect(startX, centerY - 1, endX - startX, 2);
            } else if (annotation.type === 'draw') {
                ctx.globalAlpha = 1.0;
                ctx.strokeStyle = annotation.color;
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                
                if (annotation.path && annotation.path.length > 0) {
                    ctx.beginPath();
                    ctx.moveTo(annotation.path[0].x, annotation.path[0].y);
                    for (let i = 1; i < annotation.path.length; i++) {
                        ctx.lineTo(annotation.path[i].x, annotation.path[i].y);
                    }
                    ctx.stroke();
                }
            } else if (annotation.type === 'note') {
                ctx.globalAlpha = 1.0;
                
                // Draw note background
                ctx.fillStyle = '#ffd700';
                ctx.fillRect(startX, startY, 24, 24);
                
                // Draw note border
                ctx.strokeStyle = '#ffa500';
                ctx.lineWidth = 2;
                ctx.strokeRect(startX, startY, 24, 24);
                
                // Draw note icon
                ctx.fillStyle = '#8b4513';
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('📝', startX + 12, startY + 16);
                
                // Add a small indicator if note has content
                if (annotation.content && annotation.content.trim()) {
                    ctx.fillStyle = '#ff4444';
                    ctx.beginPath();
                    ctx.arc(startX + 20, startY + 4, 3, 0, 2 * Math.PI);
                    ctx.fill();
                }
            }
            
            ctx.globalAlpha = 1.0;
        });
        
        // Make notes clickable by adding click handlers to the interaction layer
        this.setupNoteClickHandlers(pageNum);
    }
    
    updateAnnotationsList() {
        const container = document.getElementById('annotationsContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        let hasAnnotations = false;
        for (const [pageKey, annotations] of this.annotations) {
            if (annotations.length > 0) {
                hasAnnotations = true;
                annotations.forEach(annotation => {
                    const item = document.createElement('div');
                    item.className = 'annotation-item';
                    
                    let contentPreview = '';
                    if (annotation.type === 'note' && annotation.content) {
                        // Show first 50 characters of note content
                        contentPreview = annotation.content.substring(0, 50);
                        if (annotation.content.length > 50) contentPreview += '...';
                    } else if (annotation.type === 'note') {
                        contentPreview = '<em>Empty note - click to edit</em>';
                    } else {
                        contentPreview = `${annotation.type} annotation`;
                    }
                    
                    item.innerHTML = `
                        <div class="annotation-header">
                            <span class="annotation-type">${annotation.type}</span>
                            <span class="annotation-page">Page ${annotation.page}</span>
                        </div>
                        <div class="annotation-content">
                            ${contentPreview}
                        </div>
                        <div class="annotation-actions">
                            <button onclick="window.pdfEditor.goToPageNumber(${annotation.page})" class="btn btn-sm">Go to Page</button>
                            ${annotation.type === 'note' ? 
                                `<button onclick="window.pdfEditor.openNoteFromList('${pageKey}', ${annotation.id})" class="btn btn-sm" style="background: #2563eb; color: white;">Edit Note</button>` : 
                                ''
                            }
                            <button onclick="window.pdfEditor.deleteAnnotation('${pageKey}', ${annotation.id})" class="btn btn-sm btn-danger">Delete</button>
                        </div>
                    `;
                    container.appendChild(item);
                });
            }
        }
        
        if (!hasAnnotations) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-highlighter"></i>
                    <p>No annotations yet</p>
                    <small>Use annotation tools to highlight and add notes</small>
                </div>
            `;
        }
        
        // Update document stats if analysis tab is active
        this.updateDocumentStats();
    }
    
    deleteAnnotation(pageKey, annotationId) {
        const pageAnnotations = this.annotations.get(pageKey) || [];
        const filtered = pageAnnotations.filter(ann => ann.id !== annotationId);
        this.annotations.set(pageKey, filtered);
        
        this.updateAnnotationsList();
        
        // Re-render current page if it's the affected page
        const pageNum = parseInt(pageKey.replace('page_', ''));
        if (pageNum === this.currentPage) {
            const canvas = document.querySelector('.annotation-canvas');
            if (canvas) {
                this.renderAnnotations(pageNum, canvas, null);
            }
        }
        
        this.showNotification('Annotation deleted', 'info');
    }
    
    setupNoteClickHandlers(pageNum) {
        const interactionLayer = document.querySelector('.interaction-layer');
        if (!interactionLayer) return;
        
        // Remove existing click handlers for notes
        interactionLayer.removeEventListener('click', this.noteClickHandler);
        
        // Create new click handler
        this.noteClickHandler = (e) => {
            if (this.currentTool !== 'select') return;
            
            const rect = interactionLayer.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            
            const pageKey = `page_${pageNum}`;
            const pageAnnotations = this.annotations.get(pageKey) || [];
            
            // Check if click is on a note
            const clickedNote = pageAnnotations.find(annotation => {
                if (annotation.type !== 'note') return false;
                const { startX, startY } = annotation.coordinates;
                return clickX >= startX && clickX <= startX + 24 && 
                       clickY >= startY && clickY <= startY + 24;
            });
            
            if (clickedNote) {
                this.openNoteEditor(clickedNote);
            }
        };
        
        interactionLayer.addEventListener('click', this.noteClickHandler);
    }
    
    openNoteEditor(annotation) {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'note-modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'note-modal-content';
        modalContent.style.cssText = `
            background: white;
            border-radius: 8px;
            padding: 20px;
            width: 90%;
            max-width: 600px;
            max-height: 70vh;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        `;
        
        modalContent.innerHTML = `
            <div class="note-modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                <h3 style="margin: 0; color: #333;">Edit Note (Page ${annotation.page})</h3>
                <button class="close-note-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
            </div>
            <div class="note-modal-body">
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold; color: #555;">Note Content (Markdown supported):</label>
                    <textarea class="note-textarea" placeholder="Enter your note here... You can use markdown formatting:
# Heading
**bold text**
*italic text*
- bullet points
[link](url)" style="
                        width: 100%;
                        height: 200px;
                        border: 2px solid #ddd;
                        border-radius: 4px;
                        padding: 10px;
                        font-family: 'Monaco', 'Menlo', monospace;
                        font-size: 14px;
                        resize: vertical;
                        box-sizing: border-box;
                    ">${annotation.content || ''}</textarea>
                </div>
                <div class="note-preview" style="
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    padding: 10px;
                    background: #f9f9f9;
                    max-height: 150px;
                    overflow-y: auto;
                    margin-bottom: 15px;
                ">
                    <strong>Preview:</strong>
                    <div class="preview-content"></div>
                </div>
                <div class="note-modal-footer" style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="cancel-note-btn" style="
                        padding: 8px 16px;
                        border: 1px solid #ddd;
                        background: white;
                        border-radius: 4px;
                        cursor: pointer;
                    ">Cancel</button>
                    <button class="save-note-btn" style="
                        padding: 8px 16px;
                        border: none;
                        background: #2563eb;
                        color: white;
                        border-radius: 4px;
                        cursor: pointer;
                    ">Save Note</button>
                    <button class="delete-note-btn" style="
                        padding: 8px 16px;
                        border: none;
                        background: #ef4444;
                        color: white;
                        border-radius: 4px;
                        cursor: pointer;
                    ">Delete Note</button>
                </div>
            </div>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Get elements
        const textarea = modalContent.querySelector('.note-textarea');
        const previewContent = modalContent.querySelector('.preview-content');
        const saveBtn = modalContent.querySelector('.save-note-btn');
        const cancelBtn = modalContent.querySelector('.cancel-note-btn');
        const deleteBtn = modalContent.querySelector('.delete-note-btn');
        const closeBtn = modalContent.querySelector('.close-note-btn');
        
        // Focus textarea
        textarea.focus();
        
        // Live preview update
        const updatePreview = () => {
            const markdownText = textarea.value;
            const htmlContent = this.markdownToHtml(markdownText);
            previewContent.innerHTML = htmlContent || '<em>Preview will appear here...</em>';
        };
        
        textarea.addEventListener('input', updatePreview);
        updatePreview(); // Initial preview
        
        // Close modal function
        const closeModal = () => {
            document.body.removeChild(modal);
        };
        
        // Event listeners
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        saveBtn.addEventListener('click', () => {
            annotation.content = textarea.value;
            annotation.timestamp = new Date().toISOString();
            this.updateAnnotationsList();
            this.showNotification('Note saved', 'success');
            
            // Re-render to show content indicator
            const canvas = document.querySelector('.annotation-canvas');
            if (canvas) {
                this.renderAnnotations(annotation.page, canvas, null);
            }
            
            closeModal();
        });
        
        deleteBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete this note?')) {
                const pageKey = `page_${annotation.page}`;
                this.deleteAnnotation(pageKey, annotation.id);
                closeModal();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        });
    }
    
    markdownToHtml(markdown) {
        if (!markdown) return '';
        
        let html = markdown;
        
        // Headers
        html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
        html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        
        // Bold and italic
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        // Lists
        html = html.replace(/^- (.*$)/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        
        // Code blocks
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Line breaks
        html = html.replace(/\n/g, '<br>');
        
        return html;
    }
    
    openNoteFromList(pageKey, annotationId) {
        const pageAnnotations = this.annotations.get(pageKey) || [];
        const annotation = pageAnnotations.find(ann => ann.id === annotationId);
        if (annotation) {
            this.openNoteEditor(annotation);
        }
    }
    
    async generateThumbnails() {
        const container = document.getElementById('thumbnailsContainer');
        if (!container || !this.pdfDoc) return;
        
        container.innerHTML = '<div class="loading-thumbnails">Generating thumbnails...</div>';
        
        try {
            const thumbnailsHTML = [];
            
            for (let i = 1; i <= this.pdfDoc.numPages; i++) {
                const page = await this.pdfDoc.getPage(i);
                const viewport = page.getViewport({ 
                    scale: 0.2,
                    rotation: this.rotation 
                }); // Small scale for thumbnails
                
                // Create thumbnail canvas
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                // Render page to canvas
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;
                
                // Convert to data URL
                const dataURL = canvas.toDataURL();
                
                thumbnailsHTML.push(`
                    <div class="thumbnail ${i === this.currentPage ? 'active' : ''}" data-page="${i}">
                        <img src="${dataURL}" alt="Page ${i}" class="thumbnail-image">
                        <div class="thumbnail-label">Page ${i}</div>
                    </div>
                `);
            }
            
            container.innerHTML = thumbnailsHTML.join('');
            
            // Add click handlers
            container.querySelectorAll('.thumbnail').forEach(thumb => {
                thumb.addEventListener('click', () => {
                    const pageNum = parseInt(thumb.dataset.page);
                    this.goToPageNumber(pageNum);
                });
                
                // Add double-click handler for faster navigation
                thumb.addEventListener('dblclick', (e) => {
                    e.preventDefault();
                    const pageNum = parseInt(thumb.dataset.page);
                    this.goToPageNumber(pageNum);
                    this.showNotification(`Jumped to page ${pageNum}`, 'success');
                });
                
                // Add hover functionality to preview the page
                thumb.addEventListener('mouseenter', () => {
                    const pageNum = parseInt(thumb.dataset.page);
                    if (pageNum !== this.currentPage) {
                        this.previewPage(pageNum);
                    }
                });
                
                thumb.addEventListener('mouseleave', () => {
                    // Return to current page after a short delay
                    setTimeout(() => {
                        if (this.currentPage !== parseInt(thumb.dataset.page)) {
                            this.renderPage(this.currentPage);
                        }
                    }, 200);
                });
            });
            
        } catch (error) {
            console.error('Thumbnail generation error:', error);
            container.innerHTML = '<div class="error">Failed to generate thumbnails</div>';
        }
    }
    
    // Navigation methods
    showPrevPage() {
        if (this.currentPage > 1) {
            this.renderPage(this.currentPage - 1);
        }
    }
    
    showNextPage() {
        if (this.currentPage < this.pdfDoc?.numPages) {
            this.renderPage(this.currentPage + 1);
        }
    }
    
    goToPage() {
        const pageNum = parseInt(this.elements.pageInput.value);
        this.goToPageNumber(pageNum);
    }
    
    goToPageNumber(pageNum) {
        if (pageNum >= 1 && pageNum <= (this.pdfDoc?.numPages || 1)) {
            this.renderPage(pageNum);
            this.updateThumbnailSelection(pageNum);
        }
    }
    
    updateThumbnailSelection(pageNum) {
        // Update thumbnail selection
        document.querySelectorAll('.thumbnail').forEach(thumb => {
            thumb.classList.remove('active');
        });
        document.querySelector(`[data-page="${pageNum}"]`)?.classList.add('active');
    }
    
    // Zoom methods
    zoomIn() {
        const zoomLevels = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0];
        const currentIndex = zoomLevels.findIndex(level => Math.abs(level - this.scale) < 0.01);
        const nextIndex = currentIndex < zoomLevels.length - 1 ? currentIndex + 1 : zoomLevels.length - 1;
        
        this.scale = zoomLevels[nextIndex];
        this.updateZoomLevel();
        if (this.pdfDoc) this.renderPage(this.currentPage);
    }
    
    zoomOut() {
        const zoomLevels = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0];
        const currentIndex = zoomLevels.findIndex(level => Math.abs(level - this.scale) < 0.01);
        const nextIndex = currentIndex > 0 ? currentIndex - 1 : 0;
        
        this.scale = zoomLevels[nextIndex];
        this.updateZoomLevel();
        if (this.pdfDoc) this.renderPage(this.currentPage);
    }
    
    updateZoomLevel() {
        const percentage = Math.round(this.scale * 100);
        
        // Update the select dropdown to match current scale
        this.elements.zoomSelect.value = this.scale.toString();
        
        // Update zoom display if it exists
        const zoomInfo = document.getElementById('zoomInfo');
        if (zoomInfo) {
            zoomInfo.textContent = `${percentage}%`;
        }
    }
    
    handleZoomChange(e) {
        const value = e.target.value;
        
        if (value === 'fit-width') {
            this.fitToWidth();
            return;
        }
        
        if (value === 'fit-page') {
            this.fitToPage();
            return;
        }
        
        // For specific zoom levels
        this.scale = parseFloat(value);
        this.updateZoomLevel();
        if (this.pdfDoc) this.renderPage(this.currentPage);
    }
    
    fitToWidth() {
        if (!this.pdfDoc) return;
        
        const container = this.elements.pdfViewer;
        const containerWidth = container.clientWidth - 40; // Account for padding
        
        this.pdfDoc.getPage(this.currentPage).then(page => {
            const viewport = page.getViewport({ 
                scale: 1.0,
                rotation: this.rotation 
            });
            this.scale = containerWidth / viewport.width;
            this.updateZoomLevel();
            this.renderPage(this.currentPage);
        });
    }
    
    fitToPage() {
        if (!this.pdfDoc) return;
        
        const container = this.elements.pdfViewer;
        const containerWidth = container.clientWidth - 40;
        const containerHeight = container.clientHeight - 40;
        
        this.pdfDoc.getPage(this.currentPage).then(page => {
            const viewport = page.getViewport({ 
                scale: 1.0,
                rotation: this.rotation 
            });
            const scaleX = containerWidth / viewport.width;
            const scaleY = containerHeight / viewport.height;
            this.scale = Math.min(scaleX, scaleY);
            this.updateZoomLevel();
            this.renderPage(this.currentPage);
        });
    }
    
    // Tool methods
    setTool(tool) {
        this.currentTool = tool;
        
        // Set default color for strikethrough
        if (tool === 'strikethrough') {
            this.setColor('#000000');
        }
        
        // Update button states
        document.querySelectorAll('.btn-tool').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${tool}Tool`)?.classList.add('active');
        
        // Update cursor for interaction layer
        const interactionLayer = document.querySelector('.interaction-layer');
        if (interactionLayer) {
            interactionLayer.style.cursor = tool === 'select' ? 'default' : 'crosshair';
        }
        
        // Show tool notification
        const toolNames = {
            'select': 'Select Tool',
            'highlight': 'Highlighter',
            'underline': 'Underline',
            'strikethrough': 'Strikethrough',
            'note': 'Note Tool (Double-click to add note)',
            'draw': 'Draw Tool (Click and drag to draw)'
        };
        
        this.showNotification(`${toolNames[tool]} selected`, 'info');
    }
    
    setColor(color) {
        this.currentColor = color;
        document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-color="${color}"]`)?.classList.add('active');
    }
    
    clearAnnotations() {
        if (confirm('Clear all annotations from this document?')) {
            this.annotations.clear();
            this.updateAnnotationsList();
            
            // Re-render current page to remove visual annotations
            const canvas = document.querySelector('.annotation-canvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            
            this.showNotification('All annotations cleared', 'info');
        }
    }
    
    // Tab switching
    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
        document.getElementById(tabName)?.classList.add('active');
    }

    // AI Tab switching for right sidebar
    switchAiTab(tabName) {
        document.querySelectorAll('.ai-tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.ai-tab-panel').forEach(panel => panel.classList.remove('active'));
        
        document.querySelector(`[data-ai-tab="${tabName}"]`)?.classList.add('active');
        document.getElementById(`ai-${tabName}`)?.classList.add('active');
        
        // Update document stats when switching to analysis tab
        if (tabName === 'analysis') {
            this.updateDocumentStats();
        }
    }

    // Update document statistics in analysis tab
    updateDocumentStats() {
        const totalPagesInfo = document.getElementById('totalPagesInfo');
        const currentPageInfo = document.getElementById('currentPageInfo');
        const annotationCount = document.getElementById('annotationCount');
        const bookmarkCount = document.getElementById('bookmarkCount');

        if (totalPagesInfo) totalPagesInfo.textContent = this.pdfDoc?.numPages || 0;
        if (currentPageInfo) currentPageInfo.textContent = this.currentPage || 0;
        if (annotationCount) {
            let totalAnnotations = 0;
            for (const annotations of this.annotations.values()) {
                totalAnnotations += annotations.length;
            }
            annotationCount.textContent = totalAnnotations;
        }
        if (bookmarkCount) bookmarkCount.textContent = this.bookmarks.length;
    }
    
    // Chat methods
    updateSendButton() {
        const hasText = this.elements.chatInput.value.trim().length > 0;
        this.elements.sendBtn.disabled = !hasText;
    }
    
    clearChat() {
        this.elements.chatMessages.innerHTML = `
            <div class="welcome-chat">
                <div class="assistant-avatar">
                    <i class="fas fa-brain"></i>
                </div>
                <div class="message-content">
                    <p>Chat cleared. How can I help you with the PDF?</p>
                </div>
            </div>
        `;
        this.chatHistory = [];
    }
    
    handleQuickAction(action) {
        const actionMessages = {
            'summarize': 'Please provide a comprehensive summary of this document, highlighting the main thesis, key arguments, and important conclusions. Include any significant findings or recommendations.',
            'key-points': 'Extract and list the most important key points, insights, and takeaways from this document. Organize them by relevance and impact, and explain why each point is significant.',
            'questions': 'Generate thoughtful discussion questions based on this document that would help deepen understanding. Include questions about methodology, implications, and potential applications.',
            'methodology': 'Analyze and explain the research methodology, approach, or framework used in this document. What methods were employed and how reliable are they?',
            'citations': 'Identify and summarize the key references, sources, and citations in this document. What foundational works or studies does this build upon?',
            'critique': 'Provide a balanced critical analysis of this document. What are its strengths and weaknesses? Are there any gaps or limitations in the arguments presented?'
        };
        
        const message = actionMessages[action];
        if (message) {
            this.elements.chatInput.value = message;
            this.sendMessage();
        }
    }
    
    // Bookmark methods
    addBookmark(pageNum, title = null) {
        const bookmarkTitle = title || prompt(`Enter bookmark title for page ${pageNum}:`);
        if (!bookmarkTitle) return;
        
        const bookmark = {
            id: Date.now(),
            page: pageNum,
            title: bookmarkTitle,
            timestamp: new Date().toISOString()
        };
        
        this.bookmarks.push(bookmark);
        this.updateBookmarksList();
        this.showNotification('Bookmark added', 'success');
    }
    
    updateBookmarksList() {
        const container = document.getElementById('bookmarksContainer');
        if (!container) return;
        
        if (this.bookmarks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bookmark"></i>
                    <p>No bookmarks yet</p>
                    <small>Right-click on pages to add bookmarks</small>
                    <button onclick="window.pdfEditor.addBookmark(window.pdfEditor.currentPage)" class="btn btn-sm" style="margin-top: 10px;">
                        Add Bookmark for Current Page
                    </button>
                </div>
            `;
            return;
        }
        
        const bookmarksHTML = this.bookmarks.map(bookmark => `
            <div class="bookmark-item">
                <div class="bookmark-header">
                    <span class="bookmark-title">${bookmark.title}</span>
                    <span class="bookmark-page">Page ${bookmark.page}</span>
                </div>
                <div class="bookmark-actions">
                    <button onclick="window.pdfEditor.goToPageNumber(${bookmark.page})" class="btn btn-sm">Go to Page</button>
                    <button onclick="window.pdfEditor.deleteBookmark(${bookmark.id})" class="btn btn-sm btn-danger">Delete</button>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = bookmarksHTML + `
            <button onclick="window.pdfEditor.addBookmark(window.pdfEditor.currentPage)" class="btn btn-primary" style="width: 100%; margin-top: 10px;">
                Add Bookmark for Current Page
            </button>
        `;
        
        // Update document stats if analysis tab is active
        this.updateDocumentStats();
    }
    
    deleteBookmark(bookmarkId) {
        this.bookmarks = this.bookmarks.filter(b => b.id !== bookmarkId);
        this.updateBookmarksList();
        this.showNotification('Bookmark deleted', 'info');
    }
    
    // UI methods
    updateNavigationButtons() {
        if (this.elements.prevBtn) {
            this.elements.prevBtn.disabled = this.currentPage <= 1;
        }
        if (this.elements.nextBtn) {
            this.elements.nextBtn.disabled = this.currentPage >= (this.pdfDoc?.numPages || 1);
        }
        if (this.elements.firstBtn) {
            this.elements.firstBtn.disabled = this.currentPage <= 1;
        }
        if (this.elements.lastBtn) {
            this.elements.lastBtn.disabled = this.currentPage >= (this.pdfDoc?.numPages || 1);
        }
    }
    
    updateUI() {
        this.updateNavigationButtons();
        this.updateSendButton();
        this.updateDocumentStats();
    }
    
    updateDocumentStats() {
        // Update document statistics in the analysis tab
        if (this.pdfDoc) {
            document.getElementById('totalPagesInfo').textContent = this.pdfDoc.numPages;
            document.getElementById('currentPageInfo').textContent = this.currentPage;
        }
        
        // Update counts
        document.getElementById('annotationCount').textContent = this.annotations.size;
        document.getElementById('bookmarkCount').textContent = this.bookmarks.length;
    }
    
    // Rotation methods
    rotateLeft() {
        if (!this.pdfDoc) {
            this.showNotification('No PDF loaded', 'warning');
            return;
        }
        
        // Rotate counterclockwise by 90 degrees
        this.rotation = (this.rotation - 90) % 360;
        if (this.rotation < 0) {
            this.rotation += 360;
        }
        
        // Re-render current page with new rotation
        this.renderPage(this.currentPage);
        
        // Update thumbnails to reflect rotation
        this.generateThumbnails();
        
        this.showNotification(`Page rotated left (${this.rotation}°)`, 'success');
    }
    
    rotateRight() {
        if (!this.pdfDoc) {
            this.showNotification('No PDF loaded', 'warning');
            return;
        }
        
        // Rotate clockwise by 90 degrees
        this.rotation = (this.rotation + 90) % 360;
        
        // Re-render current page with new rotation
        this.renderPage(this.currentPage);
        
        // Update thumbnails to reflect rotation
        this.generateThumbnails();
        
        this.showNotification(`Page rotated right (${this.rotation}°)`, 'success');
    }
    
    toggleLeftSidebar() {
        this.isLeftSidebarVisible = !this.isLeftSidebarVisible;
        const leftSidebar = this.elements.leftSidebar;
        
        if (leftSidebar) {
            if (this.isLeftSidebarVisible) {
                leftSidebar.style.display = 'block';
                leftSidebar.style.transform = 'translateX(0)';
            } else {
                leftSidebar.style.transform = 'translateX(-100%)';
                setTimeout(() => {
                    if (!this.isLeftSidebarVisible) {
                        leftSidebar.style.display = 'none';
                    }
                }, 300);
            }
        }
        
        // Update toggle button icon
        const toggleBtn = document.getElementById('toggleLeftPanel');
        if (toggleBtn) {
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.className = this.isLeftSidebarVisible ? 'fas fa-chevron-left' : 'fas fa-bars';
            }
        }
        
        this.updateMainContentWidth();
        this.showNotification(
            this.isLeftSidebarVisible ? 'Left panel shown' : 'Left panel hidden', 
            'info'
        );
    }
    
    toggleRightPanel() {
        const rightSidebar = this.elements.rightSidebar;
        const isVisible = rightSidebar && rightSidebar.style.display !== 'none';
        
        if (rightSidebar) {
            if (isVisible) {
                rightSidebar.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    rightSidebar.style.display = 'none';
                    this.updateMainContentWidth();
                }, 300);
            } else {
                rightSidebar.style.display = 'block';
                rightSidebar.style.transform = 'translateX(0)';
                this.updateMainContentWidth();
            }
        }
        
        // Update toggle button icon
        const toggleBtn = document.getElementById('toggleRightPanel');
        if (toggleBtn) {
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.className = isVisible ? 'fas fa-chevron-right' : 'fas fa-brain';
            }
        }
        
        this.showNotification(
            isVisible ? 'AI assistant hidden' : 'AI assistant shown', 
            'info'
        );
    }
    
    updateMainContentWidth() {
        const leftSidebar = this.elements.leftSidebar;
        const rightSidebar = this.elements.rightSidebar;
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
    
    // Context menu methods
    handleContextMenu(e) {
        const selection = window.getSelection();
        if (selection.toString().length > 0) {
            e.preventDefault();
            const menu = this.elements.textContextMenu;
            if (menu) {
                menu.style.display = 'block';
                menu.style.left = e.pageX + 'px';
                menu.style.top = e.pageY + 'px';
            }
        }
    }
    
    hideContextMenu() {
        if (this.elements.textContextMenu) {
            this.elements.textContextMenu.style.display = 'none';
        }
    }
    
    // Keyboard shortcuts
    handleKeyboard(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                this.showPrevPage();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.showNextPage();
                break;
            case 'Home':
                e.preventDefault();
                this.goToPageNumber(1);
                break;
            case 'End':
                e.preventDefault();
                this.goToPageNumber(this.pdfDoc?.numPages || 1);
                break;
            case '+':
            case '=':
                e.preventDefault();
                this.zoomIn();
                break;
            case '-':
                e.preventDefault();
                this.zoomOut();
                break;
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.pdfEditor = new PDFEditor();
});
