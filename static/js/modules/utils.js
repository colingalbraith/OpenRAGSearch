// Utility functions for the PDF Editor
import { CONFIG } from './config.js';

export class Utils {
    /**
     * Escape HTML to prevent XSS attacks
     */
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Format current time for messages
     */
    static getCurrentTime() {
        return new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    /**
     * Generate unique ID
     */
    static generateId() {
        return Date.now() + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Check if file is valid PDF
     */
    static isValidPDF(file) {
        return file && 
               CONFIG.SUPPORTED_MIME_TYPES.includes(file.type) && 
               file.size <= CONFIG.MAX_FILE_SIZE;
    }

    /**
     * Format file size for display
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Calculate bounding box for a path
     */
    static calculateBoundingBox(path) {
        if (!path || path.length === 0) return null;
        
        let minX = path[0].x, minY = path[0].y;
        let maxX = path[0].x, maxY = path[0].y;
        
        path.forEach(point => {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        });
        
        return { minX, minY, maxX, maxY };
    }

    /**
     * Download file from blob
     */
    static downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Create element with attributes
     */
    static createElement(tag, attributes = {}, content = '') {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else {
                element.setAttribute(key, value);
            }
        });
        
        if (content) {
            element.innerHTML = content;
        }
        
        return element;
    }

    /**
     * Remove all children from element
     */
    static clearElement(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }

    /**
     * Local storage utilities
     */
    static storage = {
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.warn('Failed to save to localStorage:', e);
                return false;
            }
        },

        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.warn('Failed to read from localStorage:', e);
                return defaultValue;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.warn('Failed to remove from localStorage:', e);
                return false;
            }
        }
    };
}
