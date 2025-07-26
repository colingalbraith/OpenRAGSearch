// File Management Module
import { CONFIG } from './config.js';
import { Utils } from './utils.js';
import { InteractiveLoadingManager } from './interactiveLoading.js';

export class FileManager {
    constructor(editor) {
        this.editor = editor;
        this.currentFile = null;
        this.uploadProgress = 0;
        this.loadingManager = new InteractiveLoadingManager();
    }

    /**
     * Handle file selection from input
     */
    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file && this.validateFile(file)) {
            this.uploadFile(file);
        }
    }

    /**
     * Validate file before upload
     */
    validateFile(file) {
        if (!Utils.isValidPDF(file)) {
            if (!CONFIG.SUPPORTED_MIME_TYPES.includes(file.type)) {
                this.editor.showNotification('Please select a PDF file', 'error');
            } else if (file.size > CONFIG.MAX_FILE_SIZE) {
                this.editor.showNotification(
                    `File too large. Maximum size is ${Utils.formatFileSize(CONFIG.MAX_FILE_SIZE)}`,
                    'error'
                );
            }
            return false;
        }
        return true;
    }

    /**
     * Upload file to server
     */
    async uploadFile(file) {
        if (!this.validateFile(file)) return;

        try {
            // Show interactive loading
            this.loadingManager.show();
            this.loadingManager.updateProgress(0);
            
            this.editor.showNotification('Processing document...', 'info');

            const formData = new FormData();
            formData.append('file', file);

            // Start with initial processing simulation
            await this.smoothProgress(0, 20, 800, 'Preparing document...');

            // Use XMLHttpRequest for actual upload
            const result = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();

                // Handle completion first, then track progress
                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            resolve(response);
                        } catch (error) {
                            reject(new Error('Invalid response format'));
                        }
                    } else {
                        reject(new Error(`Upload failed: ${xhr.statusText}`));
                    }
                });

                // Handle errors
                xhr.addEventListener('error', () => {
                    reject(new Error('Network error during upload'));
                });

                xhr.addEventListener('abort', () => {
                    reject(new Error('Upload was aborted'));
                });

                // Start the upload (this happens quickly in background)
                xhr.open('POST', CONFIG.ENDPOINTS.UPLOAD);
                xhr.send(formData);
            });
            
            // File uploaded, now simulate realistic processing steps
            this.currentFile = {
                name: result.filename || file.name,
                originalName: file.name,
                size: file.size,
                uploadTime: new Date(),
                path: result.path || `/pdf/${result.filename}`
            };

            // Update UI with file info
            this.editor.uiManager.updateFileName(this.currentFile.originalName);
            
            // Realistic processing simulation
            await this.smoothProgress(20, 45, 1200, 'Creating text chunks...');
            await this.smoothProgress(45, 85, 2500, 'Generating AI embeddings...');
            
            // Load the PDF (this is real work)
            await this.editor.pdfManager.loadPDF(this.currentFile.path);
            
            await this.smoothProgress(85, 100, 800, 'Finalizing search index...');
            
            // Brief pause before hiding
            await new Promise(resolve => setTimeout(resolve, 600));
            
            // Hide loading with success
            this.loadingManager.hide();
            
            // Update recent activity
            this.editor.chatManager.updateRecentActivity(`Document uploaded: ${this.currentFile.originalName}`);
            
            // Success notification
            this.editor.showNotification('🎉 Document ready for analysis!', 'success');

        } catch (error) {
            console.error('Upload error:', error);
            this.loadingManager.hide();
            this.editor.showNotification(
                error.message || 'Upload failed. Please try again.',
                'error'
            );
        }
    }

    /**
     * Smooth progress animation
     */
    async smoothProgress(startPercent, endPercent, duration, message) {
        const startTime = Date.now();
        const range = endPercent - startPercent;
        
        return new Promise(resolve => {
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Use easing for more natural animation
                const easedProgress = this.easeInOutCubic(progress);
                const currentPercent = startPercent + (range * easedProgress);
                
                this.loadingManager.updateProgress(currentPercent);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            animate();
        });
    }

    /**
     * Easing function for smooth animations
     */
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }

    /**
     * Hide upload progress (legacy method - now uses InteractiveLoadingManager)
     */
    hideUploadProgress() {
        this.loadingManager.hide();
        this.uploadProgress = 0;
    }

    /**
     * Clear current file
     */
    clearFile() {
        this.currentFile = null;
        this.editor.uiManager.updateFileName('');
        this.editor.uiManager.showWelcomeMessage();
        
        // Clear PDF manager state
        this.editor.pdfManager.pdfDoc = null;
        this.editor.pdfManager.currentPage = 1;
        
        // Clear annotations
        this.editor.annotationManager.annotations.clear();
        this.editor.annotationManager.updateAnnotationsList();
        
        // Clear chat
        this.editor.chatManager.chatHistory = [];
        
        // Update UI
        this.resetDocumentInfo();
    }

    /**
     * Reset document information displays
     */
    resetDocumentInfo() {
        const elements = [
            { id: 'totalPagesInfo', value: '-' },
            { id: 'currentPageInfo', value: '-' },
            { id: 'annotationCount', value: '0' },
            { id: 'bookmarkCount', value: '0' },
            { id: 'chunkSizeInfo', value: '-' },
            { id: 'totalChunksInfo', value: '-' },
            { id: 'embeddingModelInfo', value: '-' },
            { id: 'llmModelInfo', value: '-' }
        ];

        elements.forEach(({ id, value }) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });

        // Reset activity
        const activityList = document.getElementById('recentActivity');
        if (activityList) {
            Utils.clearElement(activityList);
            activityList.innerHTML = `
                <div class="activity-item">
                    <i class="fas fa-upload"></i>
                    <span>No document loaded</span>
                </div>
            `;
        }
    }

    /**
     * Download current file
     */
    async downloadFile() {
        if (!this.currentFile) {
            this.editor.showNotification('No file loaded', 'warning');
            return;
        }

        try {
            const response = await fetch(this.currentFile.path);
            if (!response.ok) {
                throw new Error('Failed to download file');
            }

            const blob = await response.blob();
            Utils.downloadBlob(blob, this.currentFile.originalName);
            
            this.editor.showNotification('File download started', 'success');
        } catch (error) {
            console.error('Download error:', error);
            this.editor.showNotification('Download failed', 'error');
        }
    }

    /**
     * Export document summary
     */
    async exportSummary() {
        if (!this.currentFile) {
            this.editor.showNotification('No document loaded', 'warning');
            return;
        }

        try {
            const documentInfo = this.editor.pdfManager.getDocumentInfo();
            const annotationStats = this.editor.annotationManager.getAnnotationStats();
            const chatStats = this.editor.chatManager.getChatStats();
            const uiState = this.editor.uiManager.getUIState();

            const summary = {
                document: {
                    name: this.currentFile.originalName,
                    uploadTime: this.currentFile.uploadTime.toISOString(),
                    size: Utils.formatFileSize(this.currentFile.size),
                    pages: documentInfo.totalPages
                },
                annotations: {
                    total: annotationStats.total,
                    byType: annotationStats.byType,
                    byPage: annotationStats.byPage
                },
                chat: {
                    totalMessages: chatStats.totalMessages,
                    userMessages: chatStats.userMessages,
                    assistantMessages: chatStats.assistantMessages,
                    totalSources: chatStats.totalSources
                },
                bookmarks: uiState.bookmarks.length,
                exportTime: new Date().toISOString(),
                version: '1.0'
            };

            const blob = new Blob([JSON.stringify(summary, null, 2)], {
                type: 'application/json'
            });

            Utils.downloadBlob(blob, `${this.currentFile.originalName}-summary.json`);
            this.editor.showNotification('Summary exported', 'success');

        } catch (error) {
            console.error('Export error:', error);
            this.editor.showNotification('Export failed', 'error');
        }
    }

    /**
     * Get file information
     */
    getFileInfo() {
        if (!this.currentFile) return null;

        return {
            name: this.currentFile.originalName,
            size: this.currentFile.size,
            sizeFormatted: Utils.formatFileSize(this.currentFile.size),
            uploadTime: this.currentFile.uploadTime,
            path: this.currentFile.path,
            isLoaded: !!this.editor.pdfManager.pdfDoc
        };
    }

    /**
     * Check if file is currently loaded
     */
    hasFile() {
        return !!this.currentFile;
    }

    /**
     * Get supported file types for display
     */
    getSupportedTypes() {
        return CONFIG.SUPPORTED_MIME_TYPES.join(', ');
    }

    /**
     * Get maximum file size for display
     */
    getMaxFileSize() {
        return Utils.formatFileSize(CONFIG.MAX_FILE_SIZE);
    }

    /**
     * Handle file operations from export buttons
     */
    setupExportHandlers() {
        // Export annotations
        const exportAnnotationsBtn = document.getElementById('exportAnnotations');
        if (exportAnnotationsBtn) {
            exportAnnotationsBtn.addEventListener('click', () => {
                this.editor.annotationManager.exportAnnotations();
            });
        }

        // Export chat
        const exportChatBtn = document.getElementById('exportChat');
        if (exportChatBtn) {
            exportChatBtn.addEventListener('click', () => {
                this.editor.chatManager.exportChat();
            });
        }

        // Export summary
        const exportSummaryBtn = document.getElementById('exportSummary');
        if (exportSummaryBtn) {
            exportSummaryBtn.addEventListener('click', () => {
                this.exportSummary();
            });
        }
    }

    /**
     * Save current session to localStorage
     */
    saveSession() {
        if (!this.currentFile) return;

        const sessionData = {
            file: this.currentFile,
            documentInfo: this.editor.pdfManager.getDocumentInfo(),
            annotations: Array.from(this.editor.annotationManager.annotations.entries()),
            chatHistory: this.editor.chatManager.chatHistory,
            bookmarks: this.editor.uiManager.bookmarks,
            uiState: this.editor.uiManager.getUIState(),
            timestamp: new Date().toISOString()
        };

        Utils.storage.set('pdfEditor_session', sessionData);
    }

    /**
     * Load session from localStorage
     */
    async loadSession() {
        const sessionData = Utils.storage.get('pdfEditor_session');
        if (!sessionData || !sessionData.file) return false;

        try {
            // Check if file still exists on server
            const response = await fetch(sessionData.file.path, { method: 'HEAD' });
            if (!response.ok) {
                Utils.storage.remove('pdfEditor_session');
                return false;
            }

            // Restore file info
            this.currentFile = sessionData.file;
            this.editor.uiManager.updateFileName(this.currentFile.originalName);

            // Load PDF
            await this.editor.pdfManager.loadPDF(this.currentFile.path);

            // Restore annotations
            if (sessionData.annotations) {
                this.editor.annotationManager.annotations = new Map(sessionData.annotations);
                this.editor.annotationManager.updateAnnotationsList();
            }

            // Restore chat history
            if (sessionData.chatHistory) {
                sessionData.chatHistory.forEach(entry => {
                    this.editor.chatManager.addMessageToChat(
                        entry.message,
                        entry.sender,
                        entry.sources
                    );
                });
            }

            // Restore UI state
            if (sessionData.uiState) {
                this.editor.uiManager.restoreUIState(sessionData.uiState);
            }

            this.editor.showNotification('Session restored', 'success');
            return true;

        } catch (error) {
            console.error('Session load error:', error);
            Utils.storage.remove('pdfEditor_session');
            return false;
        }
    }

    /**
     * Clear saved session
     */
    clearSession() {
        Utils.storage.remove('pdfEditor_session');
    }
}
