// Annotation Management Module
import { CONFIG, COLORS } from './config.js';
import { Utils } from './utils.js';

export class AnnotationManager {
    constructor(editor) {
        this.editor = editor;
        this.annotations = new Map();
        this.currentNotes = new Map();
        this.currentTool = CONFIG.DEFAULT_TOOL;
        this.currentColor = CONFIG.DEFAULT_COLOR;
        
        // Drawing state
        this.isDrawing = false;
        this.drawPath = [];
        this.currentStroke = null;
    }

    /**
     * Set current annotation tool
     */
    setTool(tool) {
        this.currentTool = tool;
        this.updateToolUI();
        this.updateCursor();
    }

    /**
     * Set current annotation color
     */
    setColor(color) {
        this.currentColor = color;
        this.updateColorUI();
    }

    /**
     * Update tool UI to show active tool
     */
    updateToolUI() {
        document.querySelectorAll('.btn-tool').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tool === this.currentTool) {
                btn.classList.add('active');
            }
        });
    }

    /**
     * Update color UI to show active color
     */
    updateColorUI() {
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.color === this.currentColor) {
                btn.classList.add('active');
            }
        });
    }

    /**
     * Update cursor based on current tool
     */
    updateCursor() {
        const interactionLayers = document.querySelectorAll('.interaction-layer');
        let cursor = 'default';
        
        switch (this.currentTool) {
            case 'select':
                cursor = 'default';
                break;
            case 'eraser':
                cursor = 'crosshair'; // Could also use custom eraser cursor
                break;
            default:
                cursor = 'crosshair';
                break;
        }
        
        interactionLayers.forEach(layer => {
            layer.style.cursor = cursor;
        });
    }

    /**
     * Get accurate canvas coordinates from mouse event
     * This accounts for canvas scaling and positioning within the viewport
     */
    getCanvasCoordinates(event, interactionLayer) {
        const rect = interactionLayer.getBoundingClientRect();
        const canvas = interactionLayer.parentElement.querySelector('.pdf-canvas');
        
        if (!canvas) {
            return {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top
            };
        }
        
        // Get the actual canvas dimensions vs displayed dimensions
        const canvasRect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / canvasRect.width;
        const scaleY = canvas.height / canvasRect.height;
        
        // Calculate coordinates relative to the canvas
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;
        
        return { x, y };
    }

    /**
     * Convert canvas coordinates to normalized PDF coordinates (0-1 range)
     * This ensures annotations stay in the same relative position when zoom changes
     */
    canvasToNormalized(x, y, viewport) {
        return {
            x: x / viewport.width,
            y: y / viewport.height
        };
    }

    /**
     * Convert normalized coordinates back to canvas coordinates
     */
    normalizedToCanvas(normalizedX, normalizedY, viewport) {
        return {
            x: normalizedX * viewport.width,
            y: normalizedY * viewport.height
        };
    }

    /**
     * Check if annotation coordinates are normalized (0-1 range) or pixel coordinates
     * This provides backward compatibility for annotations created before the coordinate fix
     */
    areCoordinatesNormalized(annotation, viewport) {
        if (!viewport) return true; // Assume normalized if no viewport
        
        const { startX, startY, endX, endY } = annotation.coordinates;
        
        // If any coordinate is greater than 2, it's definitely in pixel coordinates
        // We use 2 instead of 1 to account for some edge cases
        const maxCoord = Math.max(Math.abs(startX), Math.abs(startY), Math.abs(endX), Math.abs(endY));
        return maxCoord <= 2.0;
    }

    /**
     * Migrate pixel coordinates to normalized coordinates for backward compatibility
     */
    migratePixelToNormalized(annotation, viewport) {
        if (!viewport || this.areCoordinatesNormalized(annotation, viewport)) {
            return annotation;
        }

        // Convert pixel coordinates to normalized
        const normalizedStart = this.canvasToNormalized(
            annotation.coordinates.startX, 
            annotation.coordinates.startY, 
            viewport
        );
        const normalizedEnd = this.canvasToNormalized(
            annotation.coordinates.endX, 
            annotation.coordinates.endY, 
            viewport
        );

        annotation.coordinates = {
            startX: normalizedStart.x,
            startY: normalizedStart.y,
            endX: normalizedEnd.x,
            endY: normalizedEnd.y
        };

        // Also migrate path coordinates for draw annotations
        if (annotation.type === 'draw' && annotation.path) {
            annotation.path = annotation.path.map(point => 
                this.canvasToNormalized(point.x, point.y, viewport)
            );
        }

        return annotation;
    }

    /**
     * Find annotation at specific canvas coordinates
     */
    getAnnotationAtPoint(pageNum, x, y, viewport) {
        const pageKey = `page_${pageNum}`;
        const pageAnnotations = this.annotations.get(pageKey) || [];
        
        // Check annotations in reverse order (most recent first)
        for (let i = pageAnnotations.length - 1; i >= 0; i--) {
            const annotation = pageAnnotations[i];
            const migratedAnnotation = this.migratePixelToNormalized(annotation, viewport);
            
            // Convert normalized coordinates to current canvas coordinates
            const canvasStart = this.normalizedToCanvas(
                migratedAnnotation.coordinates.startX, 
                migratedAnnotation.coordinates.startY, 
                viewport
            );
            const canvasEnd = this.normalizedToCanvas(
                migratedAnnotation.coordinates.endX, 
                migratedAnnotation.coordinates.endY, 
                viewport
            );
            
            const startX = Math.min(canvasStart.x, canvasEnd.x);
            const startY = Math.min(canvasStart.y, canvasEnd.y);
            const endX = Math.max(canvasStart.x, canvasEnd.x);
            const endY = Math.max(canvasStart.y, canvasEnd.y);
            
            switch (annotation.type) {
                case 'note':
                    // For notes, use a consistent 24px size
                    const noteSize = 24;
                    if (x >= canvasStart.x && x <= canvasStart.x + noteSize && 
                        y >= canvasStart.y && y <= canvasStart.y + noteSize) {
                        return annotation;
                    }
                    break;
                    
                case 'draw':
                    // For draw annotations, check if point is near any part of the path
                    if (migratedAnnotation.path && migratedAnnotation.path.length > 0) {
                        for (let j = 0; j < migratedAnnotation.path.length - 1; j++) {
                            const point1 = this.normalizedToCanvas(migratedAnnotation.path[j].x, migratedAnnotation.path[j].y, viewport);
                            const point2 = this.normalizedToCanvas(migratedAnnotation.path[j + 1].x, migratedAnnotation.path[j + 1].y, viewport);
                            
                            // Check if point is close to line segment (within 10 pixels)
                            const distance = this.distanceToLineSegment(x, y, point1.x, point1.y, point2.x, point2.y);
                            if (distance <= 10) {
                                return annotation;
                            }
                        }
                    }
                    break;
                    
                default:
                    // For other annotations (highlight, underline, strikethrough)
                    if (x >= startX && x <= endX && y >= startY && y <= endY) {
                        return annotation;
                    }
                    break;
            }
        }
        
        return null;
    }

    /**
     * Calculate distance from point to line segment
     */
    distanceToLineSegment(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) {
            // Line segment is actually a point
            return Math.sqrt(A * A + B * B);
        }
        
        let param = dot / lenSq;
        
        let xx, yy;
        
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Setup interaction handlers for a page
     */
    setupPageInteractions(interactionLayer, annotationCanvas, viewport) {
        let isDrawing = false;
        let startX, startY, endX, endY;

        // Store viewport reference for coordinate transformation
        interactionLayer.viewport = viewport;
        
        // Ensure the interaction layer has the correct size
        interactionLayer.style.width = `${viewport.width}px`;
        interactionLayer.style.height = `${viewport.height}px`;

        // Mouse down event
        interactionLayer.addEventListener('mousedown', (e) => {
            if (this.currentTool === 'select') return;

            const coords = this.getCanvasCoordinates(e, interactionLayer);

            // Handle eraser tool
            if (this.currentTool === 'eraser') {
                const annotationToDelete = this.getAnnotationAtPoint(
                    this.editor.pdfManager.currentPage, 
                    coords.x, 
                    coords.y, 
                    viewport
                );
                
                if (annotationToDelete) {
                    const annotationType = annotationToDelete.type;
                    this.deleteAnnotation(annotationToDelete.id);
                    this.renderAnnotations(this.editor.pdfManager.currentPage, annotationCanvas, viewport);
                    this.editor.showNotification(`${annotationType} annotation erased`, 'success');
                } else {
                    // Show feedback that nothing was erased at this location
                    this.editor.showNotification('No annotation found at this location', 'info');
                }
                return;
            }

            isDrawing = true;
            startX = coords.x;
            startY = coords.y;

            if (this.currentTool === 'draw') {
                this.currentStroke = [{ x: startX, y: startY }];
                this.isDrawing = true;
            }
        });

        // Mouse move event
        interactionLayer.addEventListener('mousemove', (e) => {
            // Handle eraser tool hover effects
            if (this.currentTool === 'eraser') {
                const coords = this.getCanvasCoordinates(e, interactionLayer);
                const annotationUnderCursor = this.getAnnotationAtPoint(
                    this.editor.pdfManager.currentPage, 
                    coords.x, 
                    coords.y, 
                    viewport
                );
                
                // Change cursor when hovering over an annotation
                if (annotationUnderCursor) {
                    interactionLayer.style.cursor = 'pointer';
                } else {
                    interactionLayer.style.cursor = 'crosshair';
                }
                
                // Show visual feedback when hovering over an annotation
                this.showEraserHover(annotationCanvas, annotationUnderCursor, viewport);
                return;
            }
            
            if (!isDrawing || this.currentTool === 'select' || this.currentTool === 'eraser') return;

            const coords = this.getCanvasCoordinates(e, interactionLayer);
            endX = coords.x;
            endY = coords.y;

            if (this.currentTool === 'draw') {
                this.currentStroke.push({ x: endX, y: endY });
                this.showDrawingPreview(annotationCanvas);
            } else {
                this.showAnnotationPreview(annotationCanvas, startX, startY, endX, endY);
            }
        });

        // Mouse up event
        interactionLayer.addEventListener('mouseup', (e) => {
            if (!isDrawing || this.currentTool === 'select' || this.currentTool === 'eraser') return;

            const coords = this.getCanvasCoordinates(e, interactionLayer);
            endX = coords.x;
            endY = coords.y;

            isDrawing = false;

            if (this.currentTool === 'draw') {
                this.isDrawing = false;
                if (this.currentStroke && this.currentStroke.length > 1) {
                    // Convert stroke coordinates to normalized coordinates
                    const normalizedStroke = this.currentStroke.map(point => 
                        this.canvasToNormalized(point.x, point.y, viewport)
                    );
                    this.createDrawAnnotation(this.editor.pdfManager.currentPage, normalizedStroke, this.currentColor);
                }
                this.currentStroke = null;
            } else {
                // Convert coordinates to normalized coordinates
                const normalizedCoords = this.canvasToNormalized(startX, startY, viewport);
                const normalizedCoords2 = this.canvasToNormalized(endX, endY, viewport);
                
                this.createAnnotation(
                    this.editor.pdfManager.currentPage, 
                    normalizedCoords.x, normalizedCoords.y, 
                    normalizedCoords2.x, normalizedCoords2.y, 
                    this.currentTool, 
                    this.currentColor
                );
            }

            this.renderAnnotations(this.editor.pdfManager.currentPage, annotationCanvas, viewport);
        });

        // Double click for notes
        interactionLayer.addEventListener('dblclick', (e) => {
            if (this.currentTool === 'note') {
                const coords = this.getCanvasCoordinates(e, interactionLayer);
                const normalizedCoords = this.canvasToNormalized(coords.x, coords.y, viewport);
                this.createNoteAnnotation(this.editor.pdfManager.currentPage, normalizedCoords.x, normalizedCoords.y);
            }
        });
    }

    /**
     * Show annotation preview while drawing
     */
    showAnnotationPreview(canvas, startX, startY, endX, endY) {
        const ctx = canvas.getContext('2d');
        
        // Clear and redraw existing annotations
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Get current viewport from the interaction layer
        const interactionLayer = document.querySelector('.interaction-layer');
        const viewport = interactionLayer ? interactionLayer.viewport : null;
        
        this.renderAnnotations(this.editor.pdfManager.currentPage, canvas, viewport, false);
        
        // Draw preview
        ctx.globalAlpha = 0.5;
        
        switch (this.currentTool) {
            case 'highlight':
                ctx.fillStyle = this.currentColor;
                ctx.fillRect(startX, startY, endX - startX, endY - startY);
                break;
            case 'underline':
                ctx.fillStyle = COLORS.UNDERLINE_RED;
                ctx.fillRect(startX, endY - 2, endX - startX, 4);
                break;
            case 'strikethrough':
                ctx.fillStyle = this.currentColor;
                const centerY = startY + (endY - startY) / 2;
                ctx.fillRect(startX, centerY - 1, endX - startX, 2);
                break;
        }
        
        ctx.globalAlpha = 1.0;
    }

    /**
     * Show drawing preview while drawing
     */
    showDrawingPreview(canvas) {
        const ctx = canvas.getContext('2d');
        
        // Clear and redraw existing annotations
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Get current viewport from the interaction layer
        const interactionLayer = document.querySelector('.interaction-layer');
        const viewport = interactionLayer ? interactionLayer.viewport : null;
        
        this.renderAnnotations(this.editor.pdfManager.currentPage, canvas, viewport, false);
        
        // Draw current stroke
        if (this.currentStroke && this.currentStroke.length > 1) {
            ctx.globalAlpha = 0.8;
            ctx.strokeStyle = this.currentColor;
            // Use consistent line width
            ctx.lineWidth = CONFIG.LINE_WIDTH;
            ctx.lineCap = CONFIG.LINE_CAP;
            ctx.lineJoin = CONFIG.LINE_JOIN;
            
            ctx.beginPath();
            ctx.moveTo(this.currentStroke[0].x, this.currentStroke[0].y);
            for (let i = 1; i < this.currentStroke.length; i++) {
                ctx.lineTo(this.currentStroke[i].x, this.currentStroke[i].y);
            }
            ctx.stroke();
            
            ctx.globalAlpha = 1.0;
        }
    }

    /**
     * Show eraser hover effect
     */
    showEraserHover(canvas, hoveredAnnotation, viewport) {
        const ctx = canvas.getContext('2d');
        
        // Clear and redraw all annotations
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.renderAnnotations(this.editor.pdfManager.currentPage, canvas, viewport, false);
        
        // Highlight the annotation under cursor
        if (hoveredAnnotation) {
            ctx.save();
            ctx.globalAlpha = 0.7;
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            
            const migratedAnnotation = this.migratePixelToNormalized(hoveredAnnotation, viewport);
            
            if (hoveredAnnotation.type === 'note') {
                // For notes, draw a red dashed border around the note
                const canvasCoords = this.normalizedToCanvas(
                    migratedAnnotation.coordinates.startX, 
                    migratedAnnotation.coordinates.startY, 
                    viewport
                );
                const noteSize = 24;
                ctx.strokeRect(canvasCoords.x - 2, canvasCoords.y - 2, noteSize + 4, noteSize + 4);
            } else if (hoveredAnnotation.type === 'draw' && migratedAnnotation.path) {
                // For drawings, draw a dashed line around the path
                ctx.beginPath();
                const firstPoint = this.normalizedToCanvas(migratedAnnotation.path[0].x, migratedAnnotation.path[0].y, viewport);
                ctx.moveTo(firstPoint.x, firstPoint.y);
                for (let i = 1; i < migratedAnnotation.path.length; i++) {
                    const point = this.normalizedToCanvas(migratedAnnotation.path[i].x, migratedAnnotation.path[i].y, viewport);
                    ctx.lineTo(point.x, point.y);
                }
                ctx.stroke();
            } else {
                // For other annotations, draw a dashed rectangle
                const canvasStart = this.normalizedToCanvas(
                    migratedAnnotation.coordinates.startX, 
                    migratedAnnotation.coordinates.startY, 
                    viewport
                );
                const canvasEnd = this.normalizedToCanvas(
                    migratedAnnotation.coordinates.endX, 
                    migratedAnnotation.coordinates.endY, 
                    viewport
                );
                
                const startX = Math.min(canvasStart.x, canvasEnd.x);
                const startY = Math.min(canvasStart.y, canvasEnd.y);
                const width = Math.abs(canvasEnd.x - canvasStart.x);
                const height = Math.abs(canvasEnd.y - canvasStart.y);
                
                ctx.strokeRect(startX - 2, startY - 2, width + 4, height + 4);
            }
            
            ctx.restore();
        }
    }

    /**
     * Create standard annotation
     */
    createAnnotation(pageNum, startX, startY, endX, endY, tool, color) {
        const pageKey = `page_${pageNum}`;
        if (!this.annotations.has(pageKey)) {
            this.annotations.set(pageKey, []);
        }

        // Use appropriate color for each tool type
        let annotationColor = color;
        if (tool === 'underline') {
            annotationColor = COLORS.UNDERLINE_RED;
        }

        const annotation = {
            id: Utils.generateId(),
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
        this.editor.showNotification(`${tool} annotation added`, 'success');
    }

    /**
     * Create drawing annotation
     */
    createDrawAnnotation(pageNum, path, color) {
        const pageKey = `page_${pageNum}`;
        if (!this.annotations.has(pageKey)) {
            this.annotations.set(pageKey, []);
        }

        const boundingBox = Utils.calculateBoundingBox(path);
        if (!boundingBox) return;

        const annotation = {
            id: Utils.generateId(),
            type: 'draw',
            color: color,
            coordinates: {
                startX: boundingBox.minX,
                startY: boundingBox.minY,
                endX: boundingBox.maxX,
                endY: boundingBox.maxY
            },
            path: path,
            page: pageNum,
            timestamp: new Date().toISOString()
        };

        this.annotations.get(pageKey).push(annotation);
        this.updateAnnotationsList();
        this.editor.showNotification('Drawing annotation added', 'success');
    }

    /**
     * Create note annotation
     */
    createNoteAnnotation(pageNum, normalizedX, normalizedY) {
        const pageKey = `page_${pageNum}`;
        if (!this.annotations.has(pageKey)) {
            this.annotations.set(pageKey, []);
        }

        // Get current viewport to calculate note size in normalized coordinates
        const interactionLayer = document.querySelector('.interaction-layer');
        const viewport = interactionLayer ? interactionLayer.viewport : null;
        
        // Calculate note size based on a fixed pixel size (24px) converted to normalized coordinates
        let noteWidth = 0.02;
        let noteHeight = 0.02;
        
        if (viewport) {
            noteWidth = 24 / viewport.width;
            noteHeight = 24 / viewport.height;
        }

        const annotation = {
            id: Utils.generateId(),
            type: 'note',
            color: COLORS.NOTE_BACKGROUND,
            coordinates: { 
                startX: normalizedX, 
                startY: normalizedY, 
                endX: normalizedX + noteWidth, 
                endY: normalizedY + noteHeight 
            },
            page: pageNum,
            content: '',
            timestamp: new Date().toISOString()
        };

        this.annotations.get(pageKey).push(annotation);
        this.updateAnnotationsList();

        // Open note editor
        setTimeout(() => {
            this.openNoteEditor(annotation);
        }, 100);

        this.editor.showNotification('Note created - click to edit', 'success');
    }

    /**
     * Render annotations for a page
     */
    renderAnnotations(pageNum, canvas, viewport, clear = true) {
        const ctx = canvas.getContext('2d');
        
        if (clear) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        const pageKey = `page_${pageNum}`;
        const pageAnnotations = this.annotations.get(pageKey) || [];

        pageAnnotations.forEach(annotation => {
            this.renderSingleAnnotation(ctx, annotation, viewport);
        });

        // Setup click handlers for notes
        this.setupNoteClickHandlers(pageNum);
    }

    /**
     * Render a single annotation
     */
    renderSingleAnnotation(ctx, annotation, viewport) {
        // Migrate old pixel coordinates to normalized coordinates if needed
        const migratedAnnotation = this.migratePixelToNormalized(annotation, viewport);
        
        // Convert normalized coordinates to current canvas coordinates
        const canvasCoords = this.normalizedToCanvas(
            migratedAnnotation.coordinates.startX, 
            migratedAnnotation.coordinates.startY, 
            viewport
        );
        const canvasCoords2 = this.normalizedToCanvas(
            migratedAnnotation.coordinates.endX, 
            migratedAnnotation.coordinates.endY, 
            viewport
        );

        const startX = canvasCoords.x;
        const startY = canvasCoords.y;
        const endX = canvasCoords2.x;
        const endY = canvasCoords2.y;

        switch (annotation.type) {
            case 'highlight':
                ctx.fillStyle = annotation.color;
                ctx.globalAlpha = 0.3;
                ctx.fillRect(startX, startY, endX - startX, endY - startY);
                break;

            case 'underline':
                ctx.fillStyle = annotation.color;
                ctx.globalAlpha = 0.8;
                ctx.fillRect(startX, endY - 2, endX - startX, 4);
                break;

            case 'strikethrough':
                ctx.fillStyle = annotation.color;
                ctx.globalAlpha = 0.8;
                const centerY = startY + (endY - startY) / 2;
                ctx.fillRect(startX, centerY - 1, endX - startX, 2);
                break;

            case 'draw':
                if (migratedAnnotation.path && migratedAnnotation.path.length > 0) {
                    ctx.globalAlpha = 1.0;
                    ctx.strokeStyle = migratedAnnotation.color;
                    // Use consistent line width regardless of zoom
                    ctx.lineWidth = CONFIG.LINE_WIDTH;
                    ctx.lineCap = CONFIG.LINE_CAP;
                    ctx.lineJoin = CONFIG.LINE_JOIN;
                    
                    ctx.beginPath();
                    // Convert each point in the path from normalized to canvas coordinates
                    const firstPoint = this.normalizedToCanvas(migratedAnnotation.path[0].x, migratedAnnotation.path[0].y, viewport);
                    ctx.moveTo(firstPoint.x, firstPoint.y);
                    for (let i = 1; i < migratedAnnotation.path.length; i++) {
                        const point = this.normalizedToCanvas(migratedAnnotation.path[i].x, migratedAnnotation.path[i].y, viewport);
                        ctx.lineTo(point.x, point.y);
                    }
                    ctx.stroke();
                }
                break;

            case 'note':
                ctx.globalAlpha = 1.0;
                
                // Calculate consistent note size (24px regardless of zoom)
                const noteSize = 24;
                const actualStartX = startX;
                const actualStartY = startY;
                
                // Note background
                ctx.fillStyle = COLORS.NOTE_BACKGROUND;
                ctx.fillRect(actualStartX, actualStartY, noteSize, noteSize);
                
                // Note border
                ctx.strokeStyle = COLORS.NOTE_BORDER;
                ctx.lineWidth = 2;
                ctx.strokeRect(actualStartX, actualStartY, noteSize, noteSize);
                
                // Note icon
                ctx.fillStyle = COLORS.NOTE_TEXT;
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('📝', actualStartX + noteSize/2, actualStartY + noteSize*0.67);
                
                // Content indicator
                if (migratedAnnotation.content && migratedAnnotation.content.trim()) {
                    ctx.fillStyle = '#ff4444';
                    ctx.beginPath();
                    ctx.arc(actualStartX + noteSize - 4, actualStartY + 4, 3, 0, 2 * Math.PI);
                    ctx.fill();
                }
                break;
        }

        ctx.globalAlpha = 1.0;
    }

    /**
     * Setup click handlers for note annotations
     */
    setupNoteClickHandlers(pageNum) {
        const pageKey = `page_${pageNum}`;
        const pageAnnotations = this.annotations.get(pageKey) || [];
        const noteAnnotations = pageAnnotations.filter(a => a.type === 'note');

        // Remove existing handlers
        const interactionLayer = document.querySelector('.interaction-layer');
        if (!interactionLayer) return;

        // Add click handler for notes
        const clickHandler = (e) => {
            if (this.currentTool !== 'select') return;
            
            const coords = this.getCanvasCoordinates(e, interactionLayer);
            
            // Check if click is on any note (using actual rendered position and size)
            noteAnnotations.forEach(annotation => {
                const migratedAnnotation = this.migratePixelToNormalized(annotation, interactionLayer.viewport);
                const canvasCoords = this.normalizedToCanvas(
                    migratedAnnotation.coordinates.startX, 
                    migratedAnnotation.coordinates.startY, 
                    interactionLayer.viewport
                );
                
                const noteSize = 24; // Consistent with rendering
                if (coords.x >= canvasCoords.x && coords.x <= canvasCoords.x + noteSize && 
                    coords.y >= canvasCoords.y && coords.y <= canvasCoords.y + noteSize) {
                    this.openNoteEditor(annotation);
                }
            });
        };

        // Remove previous listener if it exists
        if (interactionLayer._noteClickHandler) {
            interactionLayer.removeEventListener('click', interactionLayer._noteClickHandler);
        }
        
        // Add new listener
        interactionLayer._noteClickHandler = clickHandler;
        interactionLayer.addEventListener('click', clickHandler);
    }

    /**
     * Open note editor modal
     */
    openNoteEditor(annotation) {
        // This would open a modal for editing the note
        const content = prompt('Edit note:', annotation.content || '');
        if (content !== null) {
            annotation.content = content;
            this.updateAnnotationsList();
            
            // Re-render the page to show the updated indicator
            const canvas = document.querySelector('.annotation-canvas');
            if (canvas) {
                this.renderAnnotations(annotation.page, canvas, null);
            }
        }
    }

    /**
     * Update annotations list in sidebar
     */
    updateAnnotationsList() {
        const container = document.getElementById('annotationsContainer');
        if (!container) return;

        // Count total annotations
        let totalAnnotations = 0;
        this.annotations.forEach(pageAnnotations => {
            totalAnnotations += pageAnnotations.length;
        });

        // Update annotation count
        const annotationCount = document.getElementById('annotationCount');
        if (annotationCount) {
            annotationCount.textContent = totalAnnotations;
        }

        // Clear container
        Utils.clearElement(container);

        if (totalAnnotations === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-highlighter"></i>
                    <p>No annotations yet</p>
                    <small>Use annotation tools to highlight and add notes</small>
                </div>
            `;
            return;
        }

        // Create annotation list
        this.annotations.forEach((pageAnnotations, pageKey) => {
            if (pageAnnotations.length === 0) return;

            const pageNum = parseInt(pageKey.replace('page_', ''));
            const pageSection = Utils.createElement('div', {
                className: 'annotation-page-section'
            });

            const pageHeader = Utils.createElement('h4', {
                className: 'annotation-page-header'
            }, `Page ${pageNum} (${pageAnnotations.length})`);

            pageSection.appendChild(pageHeader);

            pageAnnotations.forEach(annotation => {
                const annotationItem = this.createAnnotationListItem(annotation);
                pageSection.appendChild(annotationItem);
            });

            container.appendChild(pageSection);
        });
    }

    /**
     * Create annotation list item
     */
    createAnnotationListItem(annotation) {
        const item = Utils.createElement('div', {
            className: 'annotation-item',
            'data-annotation-id': annotation.id
        });

        const icon = this.getAnnotationIcon(annotation.type);
        const time = new Date(annotation.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        let content = annotation.type;
        if (annotation.type === 'note' && annotation.content) {
            content = annotation.content.substring(0, 50) + (annotation.content.length > 50 ? '...' : '');
        }

        item.innerHTML = `
            <div class="annotation-icon" style="color: ${annotation.color}">
                <i class="${icon}"></i>
            </div>
            <div class="annotation-content">
                <div class="annotation-text">${Utils.escapeHtml(content)}</div>
                <div class="annotation-meta">
                    <span class="annotation-time">${time}</span>
                    <button class="annotation-delete" data-annotation-id="${annotation.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;

        // Add click to go to annotation
        item.addEventListener('click', () => {
            this.editor.pdfManager.goToPageNumber(annotation.page);
        });

        // Add delete handler
        const deleteBtn = item.querySelector('.annotation-delete');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteAnnotation(annotation.id);
        });

        return item;
    }

    /**
     * Get icon for annotation type
     */
    getAnnotationIcon(type) {
        const icons = {
            highlight: 'fas fa-highlighter',
            underline: 'fas fa-underline',
            strikethrough: 'fas fa-strikethrough',
            draw: 'fas fa-pen',
            note: 'fas fa-sticky-note',
            eraser: 'fas fa-eraser'
        };
        return icons[type] || 'fas fa-comment';
    }

    /**
     * Delete annotation
     */
    deleteAnnotation(annotationId) {
        this.annotations.forEach((pageAnnotations, pageKey) => {
            const index = pageAnnotations.findIndex(a => a.id === annotationId);
            if (index !== -1) {
                pageAnnotations.splice(index, 1);
                
                // Re-render current page if it's the same page
                const pageNum = parseInt(pageKey.replace('page_', ''));
                if (pageNum === this.editor.pdfManager.currentPage) {
                    const canvas = document.querySelector('.annotation-canvas');
                    if (canvas) {
                        this.renderAnnotations(pageNum, canvas, null);
                    }
                }
            }
        });
        
        this.updateAnnotationsList();
        this.editor.showNotification('Annotation deleted', 'success');
    }

    /**
     * Clear all annotations
     */
    clearAnnotations() {
        if (confirm('Are you sure you want to clear all annotations?')) {
            this.annotations.clear();
            this.updateAnnotationsList();
            
            // Clear current page annotations
            const canvas = document.querySelector('.annotation-canvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            
            this.editor.showNotification('All annotations cleared', 'success');
        }
    }

    /**
     * Export annotations
     */
    exportAnnotations() {
        const exportData = {
            document: this.editor.elements.fileName.textContent || 'document',
            exported: new Date().toISOString(),
            annotations: []
        };

        this.annotations.forEach((pageAnnotations, pageKey) => {
            pageAnnotations.forEach(annotation => {
                exportData.annotations.push({
                    ...annotation,
                    page: parseInt(pageKey.replace('page_', ''))
                });
            });
        });

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        
        Utils.downloadBlob(blob, 'annotations.json');
    }

    /**
     * Get annotation statistics
     */
    getAnnotationStats() {
        let stats = {
            total: 0,
            byType: {},
            byPage: {}
        };

        this.annotations.forEach((pageAnnotations, pageKey) => {
            const pageNum = parseInt(pageKey.replace('page_', ''));
            stats.byPage[pageNum] = pageAnnotations.length;
            stats.total += pageAnnotations.length;

            pageAnnotations.forEach(annotation => {
                stats.byType[annotation.type] = (stats.byType[annotation.type] || 0) + 1;
            });
        });

        return stats;
    }
}
