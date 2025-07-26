// PDF Management Module
import { CONFIG } from './config.js';
import { Utils } from './utils.js';

export class PDFManager {
    constructor(editor) {
        this.editor = editor;
        this.pdfDoc = null;
        this.currentPage = 1;
        this.scale = CONFIG.DEFAULT_SCALE;
        this.rotation = 0;
        this.isRendering = false;
        this.renderQueue = [];
        
        this.initializePDFJS();
    }

    /**
     * Initialize PDF.js library
     */
    initializePDFJS() {
        pdfjsLib.GlobalWorkerOptions.workerSrc = CONFIG.PDFJS_WORKER_URL;
    }

    /**
     * Load PDF from URL
     */
    async loadPDF(url) {
        try {
            this.editor.showNotification('Loading PDF...', 'info');
            
            const loadingTask = pdfjsLib.getDocument(url);
            this.pdfDoc = await loadingTask.promise;
            
            // Reset rotation when loading new PDF
            this.rotation = 0;
            
            this.updateDocumentInfo();
            await this.renderFirstPage();
            this.generateThumbnails();
            this.updateProcessingInfo();
            
            this.editor.showNotification('PDF loaded successfully!', 'success');
            
        } catch (error) {
            console.error('PDF loading error:', error);
            this.editor.showNotification('Failed to load PDF', 'error');
            throw error;
        }
    }

    /**
     * Update document information in UI
     */
    updateDocumentInfo() {
        if (!this.pdfDoc) return;

        const totalPagesElement = this.editor.elements.totalPages;
        const pageInputElement = this.editor.elements.pageInput;

        if (totalPagesElement) {
            totalPagesElement.textContent = this.pdfDoc.numPages;
        }
        
        if (pageInputElement) {
            pageInputElement.max = this.pdfDoc.numPages;
        }

        // Update analysis tab info
        const totalPagesInfo = document.getElementById('totalPagesInfo');
        const currentPageInfo = document.getElementById('currentPageInfo');
        
        if (totalPagesInfo) totalPagesInfo.textContent = this.pdfDoc.numPages;
        if (currentPageInfo) currentPageInfo.textContent = this.currentPage;

        // Hide welcome message and show PDF viewer
        this.editor.elements.welcomeMessage.style.display = 'none';
        this.editor.elements.pdfViewer.style.display = 'block';
    }

    /**
     * Render first page
     */
    async renderFirstPage() {
        await this.renderPage(1);
    }

    /**
     * Render specific page
     */
    async renderPage(pageNum) {
        if (this.isRendering || !this.pdfDoc || pageNum < 1 || pageNum > this.pdfDoc.numPages) {
            return;
        }

        try {
            this.isRendering = true;
            this.currentPage = pageNum;

            const page = await this.pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ 
                scale: this.scale,
                rotation: this.rotation 
            });

            this.clearPDFContainer();
            const { canvas, annotationCanvas, interactionLayer } = this.createPageElements(viewport);
            
            // Render PDF page
            const renderContext = {
                canvasContext: canvas.getContext('2d'),
                viewport: viewport
            };

            await page.render(renderContext).promise;

            // Setup interactions and render annotations
            this.editor.annotationManager.setupPageInteractions(interactionLayer, annotationCanvas, viewport);
            this.editor.annotationManager.renderAnnotations(pageNum, annotationCanvas, viewport);

            this.updateNavigationUI();

        } catch (error) {
            console.error('Page rendering error:', error);
            this.editor.showNotification('Failed to render page', 'error');
        } finally {
            this.isRendering = false;
            this.processRenderQueue();
        }
    }

    /**
     * Clear PDF container
     */
    clearPDFContainer() {
        Utils.clearElement(this.editor.elements.pdfPages);
    }

    /**
     * Create page elements (canvas, annotation overlay, interaction layer)
     */
    createPageElements(viewport) {
        const pageContainer = Utils.createElement('div', {
            className: 'page-container',
            style: {
                position: 'relative',
                display: 'inline-block',
                margin: '20px auto',
                background: 'white',
                boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
            }
        });

        // PDF canvas
        const canvas = Utils.createElement('canvas', {
            className: 'pdf-canvas'
        });
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Annotation canvas
        const annotationCanvas = Utils.createElement('canvas', {
            className: 'annotation-canvas',
            style: {
                position: 'absolute',
                top: '0',
                left: '0',
                pointerEvents: 'none',
                zIndex: '2'
            }
        });
        annotationCanvas.height = viewport.height;
        annotationCanvas.width = viewport.width;

        // Interaction layer
        const interactionLayer = Utils.createElement('div', {
            className: 'interaction-layer',
            style: {
                position: 'absolute',
                top: '0',
                left: '0',
                width: `${viewport.width}px`,
                height: `${viewport.height}px`,
                zIndex: '3',
                cursor: this.editor.currentTool === 'select' ? 'default' : 'crosshair'
            }
        });

        pageContainer.appendChild(canvas);
        pageContainer.appendChild(annotationCanvas);
        pageContainer.appendChild(interactionLayer);
        this.editor.elements.pdfPages.appendChild(pageContainer);

        return { canvas, annotationCanvas, interactionLayer };
    }

    /**
     * Update navigation UI elements
     */
    updateNavigationUI() {
        if (this.editor.elements.pageInput) {
            this.editor.elements.pageInput.value = this.currentPage;
        }
        
        // Update current page info
        const currentPageInfo = document.getElementById('currentPageInfo');
        if (currentPageInfo) {
            currentPageInfo.textContent = this.currentPage;
        }

        this.updateNavigationButtons();
    }

    /**
     * Update navigation button states
     */
    updateNavigationButtons() {
        const { prevBtn, nextBtn, firstBtn, lastBtn } = this.editor.elements;
        
        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (firstBtn) firstBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= (this.pdfDoc?.numPages || 1);
        if (lastBtn) lastBtn.disabled = this.currentPage >= (this.pdfDoc?.numPages || 1);
    }

    /**
     * Navigation methods
     */
    async showPrevPage() {
        if (this.currentPage > 1) {
            await this.renderPage(this.currentPage - 1);
        }
    }

    async showNextPage() {
        if (this.currentPage < (this.pdfDoc?.numPages || 1)) {
            await this.renderPage(this.currentPage + 1);
        }
    }

    async goToPageNumber(pageNum) {
        const targetPage = Math.max(1, Math.min(pageNum, this.pdfDoc?.numPages || 1));
        if (targetPage !== this.currentPage) {
            await this.renderPage(targetPage);
        }
    }

    async goToPage() {
        const pageInput = this.editor.elements.pageInput;
        if (!pageInput) return;

        const pageNum = parseInt(pageInput.value);
        if (!isNaN(pageNum)) {
            await this.goToPageNumber(pageNum);
        }
    }

    /**
     * Zoom methods - now container-aware for consistent coordinate handling
     */
    async zoomIn() {
        // Calculate current effective zoom relative to fit-width
        const baseScale = await this.getBaseScale();
        const currentZoomFactor = this.scale / baseScale;
        const newZoomFactor = currentZoomFactor * 1.25;
        
        await this.setZoomFactor(newZoomFactor);
    }

    async zoomOut() {
        // Calculate current effective zoom relative to fit-width
        const baseScale = await this.getBaseScale();
        const currentZoomFactor = this.scale / baseScale;
        const newZoomFactor = currentZoomFactor * 0.8;
        
        await this.setZoomFactor(newZoomFactor);
    }

    /**
     * Get the base scale (fit-width scale) for consistent zoom calculations
     */
    async getBaseScale() {
        if (!this.pdfDoc) return 1.0;
        
        const containerWidth = this.editor.elements.pdfContainer.clientWidth - 40;
        const page = await this.pdfDoc.getPage(this.currentPage);
        const viewport = page.getViewport({ scale: 1.0 });
        return containerWidth / viewport.width;
    }

    /**
     * Set zoom as a factor of the base fit-width scale
     */
    async setZoomFactor(factor) {
        if (factor < 0.1 || factor > 5.0) return;
        
        const baseScale = await this.getBaseScale();
        const newScale = baseScale * factor;
        
        this.scale = newScale;
        await this.updateZoomUI();
        
        if (this.pdfDoc && this.currentPage) {
            await this.renderPage(this.currentPage);
        }
    }

    async setZoom(newScale) {
        if (newScale < 0.1 || newScale > 5.0) return;
        
        this.scale = newScale;
        await this.updateZoomUI();
        
        if (this.pdfDoc && this.currentPage) {
            await this.renderPage(this.currentPage);
        }
    }

    async handleZoomChange(e) {
        const value = e.target.value;
        
        if (value === 'fit-width') {
            await this.fitToWidth();
        } else if (value === 'fit-page') {
            await this.fitToPage();
        } else {
            const percentage = parseFloat(value);
            if (!isNaN(percentage)) {
                // Convert percentage to zoom factor relative to fit-width
                await this.setZoomFactor(percentage);
            }
        }
    }

    async fitToWidth() {
        if (!this.pdfDoc) return;
        
        // Fit-width is now the base scale (zoom factor = 1.0)
        await this.setZoomFactor(1.0);
    }

    async fitToPage() {
        if (!this.pdfDoc) return;
        
        const container = this.editor.elements.pdfContainer;
        const containerWidth = container.clientWidth - 40;
        const containerHeight = container.clientHeight - 40;
        
        const page = await this.pdfDoc.getPage(this.currentPage);
        const viewport = page.getViewport({ scale: 1.0 });
        
        const scaleX = containerWidth / viewport.width;
        const scaleY = containerHeight / viewport.height;
        const pageScale = Math.min(scaleX, scaleY);
        
        // Calculate fit-page as a factor of fit-width
        const baseScale = await this.getBaseScale();
        const pageFactor = pageScale / baseScale;
        
        await this.setZoomFactor(pageFactor);
    }

    async updateZoomUI() {
        const zoomSelect = this.editor.elements.zoomSelect;
        const zoomInfo = document.getElementById('zoomInfo');
        
        // Calculate current zoom factor relative to fit-width
        const baseScale = await this.getBaseScale();
        const zoomFactor = this.scale / baseScale;
        
        if (zoomSelect) {
            // Try to match predefined options first
            const percentage = zoomFactor;
            const option = Array.from(zoomSelect.options).find(opt => 
                parseFloat(opt.value) === percentage
            );
            
            if (option) {
                zoomSelect.value = option.value;
            } else {
                // Create custom option for current zoom
                zoomSelect.value = percentage.toString();
            }
        }
        
        if (zoomInfo) {
            zoomInfo.textContent = `${Math.round(zoomFactor * 100)}%`;
        }
    }

    /**
     * Rotation methods
     */
    async rotateLeft() {
        this.rotation = (this.rotation - 90) % 360;
        if (this.rotation < 0) this.rotation += 360;
        await this.renderPage(this.currentPage);
    }

    async rotateRight() {
        this.rotation = (this.rotation + 90) % 360;
        await this.renderPage(this.currentPage);
    }

    /**
     * Generate thumbnails for left sidebar
     */
    async generateThumbnails() {
        if (!this.pdfDoc) return;

        const container = document.getElementById('thumbnailsContainer');
        if (!container) return;

        Utils.clearElement(container);

        for (let i = 1; i <= this.pdfDoc.numPages; i++) {
            const thumbnailItem = await this.createThumbnail(i);
            container.appendChild(thumbnailItem);
        }
    }

    /**
     * Create thumbnail for specific page
     */
    async createThumbnail(pageNum) {
        try {
            const page = await this.pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 0.3 });

            const canvas = Utils.createElement('canvas', {
                className: 'thumbnail-canvas'
            });
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            const thumbnailItem = Utils.createElement('div', {
                className: 'thumbnail-item',
                'data-page': pageNum
            });

            if (pageNum === this.currentPage) {
                thumbnailItem.classList.add('active');
            }

            const label = Utils.createElement('div', {
                className: 'thumbnail-label'
            }, `Page ${pageNum}`);

            thumbnailItem.appendChild(canvas);
            thumbnailItem.appendChild(label);

            // Add click handler
            thumbnailItem.addEventListener('click', () => {
                this.goToPageNumber(pageNum);
                this.updateThumbnailSelection(pageNum);
            });

            return thumbnailItem;

        } catch (error) {
            console.error(`Error creating thumbnail for page ${pageNum}:`, error);
            return Utils.createElement('div', {
                className: 'thumbnail-item error'
            }, `Page ${pageNum}<br><small>Error loading</small>`);
        }
    }

    /**
     * Update thumbnail selection
     */
    updateThumbnailSelection(pageNum) {
        document.querySelectorAll('.thumbnail-item').forEach(item => {
            item.classList.remove('active');
            if (parseInt(item.dataset.page) === pageNum) {
                item.classList.add('active');
            }
        });
    }

    /**
     * Update processing information
     */
    updateProcessingInfo() {
        document.getElementById('chunkSizeInfo').textContent = '400 chars';
        document.getElementById('embeddingModelInfo').textContent = 'nomic-embed-text (Ollama)';
        document.getElementById('llmModelInfo').textContent = 'Gemma2:2b (Ollama)';
        
        // Calculate estimated chunks
        setTimeout(() => {
            try {
                const estimatedChunks = Math.ceil((this.pdfDoc.numPages * 2000) / 400);
                document.getElementById('totalChunksInfo').textContent = `~${estimatedChunks}`;
            } catch (error) {
                document.getElementById('totalChunksInfo').textContent = 'Unknown';
            }
        }, 1500);
    }

    /**
     * Add page to render queue
     */
    queuePageRender(pageNum) {
        if (!this.renderQueue.includes(pageNum)) {
            this.renderQueue.push(pageNum);
        }
        this.processRenderQueue();
    }

    /**
     * Process render queue
     */
    async processRenderQueue() {
        if (this.isRendering || this.renderQueue.length === 0) return;

        const pageNum = this.renderQueue.shift();
        await this.renderPage(pageNum);
    }

    /**
     * Get current document info
     */
    getDocumentInfo() {
        return {
            totalPages: this.pdfDoc?.numPages || 0,
            currentPage: this.currentPage,
            scale: this.scale,
            rotation: this.rotation,
            isLoaded: !!this.pdfDoc
        };
    }
}
