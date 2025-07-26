// Application Configuration and Constants
export const CONFIG = {
    // PDF.js Configuration
    PDFJS_WORKER_URL: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    
    // Default Settings
    DEFAULT_SCALE: 1.2,
    DEFAULT_COLOR: '#ffff00',
    DEFAULT_TOOL: 'select',
    
    // UI Constants
    RIGHT_PANEL_WIDTH: 350,
    THUMBNAIL_MAX_WIDTH: 200,
    
    // API Endpoints
    ENDPOINTS: {
        UPLOAD: '/upload',
        QA: '/qa',
        PDF_BASE: '/pdf/'
    },
    
    // Notification Settings
    NOTIFICATION_DURATION: 3000,
    
    // Drawing Settings
    LINE_WIDTH: 2,
    LINE_CAP: 'round',
    LINE_JOIN: 'round',
    
    // Animation Durations
    PANEL_ANIMATION_DURATION: 300,
    
    // File Constraints
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    SUPPORTED_MIME_TYPES: ['application/pdf']
};

export const COLORS = {
    YELLOW: '#FFFF00',
    GREEN: '#00FF00',
    RED: '#FF0000',
    BLUE: '#0080FF',
    ORANGE: '#FF8000',
    PINK: '#FF00FF',
    BLACK: '#000000',
    UNDERLINE_RED: '#ff0000',
    NOTE_BACKGROUND: '#ffd700',
    NOTE_BORDER: '#ffa500',
    NOTE_TEXT: '#8b4513'
};

export const ELEMENT_IDS = {
    // File handling
    FILE_INPUT: 'fileInput',
    UPLOAD_BTN: 'uploadBtn',
    FILE_NAME: 'fileName',
    UPLOAD_ZONE: 'uploadZone',
    
    // Navigation
    PREV_PAGE: 'prevPage',
    NEXT_PAGE: 'nextPage',
    FIRST_PAGE: 'firstPage',
    LAST_PAGE: 'lastPage',
    PAGE_INPUT: 'pageInput',
    TOTAL_PAGES: 'totalPages',
    
    // Zoom controls
    ZOOM_IN: 'zoomIn',
    ZOOM_OUT: 'zoomOut',
    ZOOM_SELECT: 'zoomSelect',
    
    // View controls
    ROTATE_LEFT: 'rotateLeft',
    ROTATE_RIGHT: 'rotateRight',
    TOGGLE_LEFT_PANEL: 'toggleLeftPanel',
    TOGGLE_RIGHT_PANEL: 'toggleRightPanel',
    
    // Annotation tools
    SELECT_TOOL: 'selectTool',
    HIGHLIGHT_TOOL: 'highlightTool',
    UNDERLINE_TOOL: 'underlineTool',
    STRIKETHROUGH_TOOL: 'strikethroughTool',
    NOTE_TOOL: 'noteTool',
    DRAW_TOOL: 'drawTool',
    ERASER_TOOL: 'eraserTool',
    CLEAR_ANNOTATIONS: 'clearAnnotations',
    
    // Chat elements
    CHAT_MESSAGES: 'chatMessages',
    CHAT_INPUT: 'chatInput',
    SEND_BTN: 'sendBtn',
    CLEAR_CHAT: 'clearChat',
    
    // Containers
    PDF_CONTAINER: 'pdfContainer',
    PDF_VIEWER: 'pdfViewer',
    PDF_PAGES: 'pdfPages',
    WELCOME_MESSAGE: 'welcomeMessage',
    
    // Sidebars
    LEFT_SIDEBAR: 'leftSidebar',
    RIGHT_SIDEBAR: 'rightSidebar',
    
    // Context menu
    TEXT_CONTEXT_MENU: 'textContextMenu',
    
    // Processing info
    CHUNK_SIZE_INFO: 'chunkSizeInfo',
    TOTAL_CHUNKS_INFO: 'totalChunksInfo',
    EMBEDDING_MODEL_INFO: 'embeddingModelInfo',
    LLM_MODEL_INFO: 'llmModelInfo',
    
    // Document stats
    TOTAL_PAGES_INFO: 'totalPagesInfo',
    CURRENT_PAGE_INFO: 'currentPageInfo',
    ANNOTATION_COUNT: 'annotationCount',
    BOOKMARK_COUNT: 'bookmarkCount'
};

export const CSS_CLASSES = {
    ACTIVE: 'active',
    BTN: 'btn',
    BTN_TOOL: 'btn-tool',
    COLOR_BTN: 'color-btn',
    TAB_BTN: 'tab-btn',
    AI_TAB_BTN: 'ai-tab-btn',
    TAB_PANEL: 'tab-panel',
    AI_TAB_PANEL: 'ai-tab-panel',
    TOOL_CARD: 'tool-card',
    ACTION_BTN: 'action-btn',
    MESSAGE: 'message',
    MESSAGE_USER: 'message-user',
    MESSAGE_ASSISTANT: 'message-assistant',
    TYPING_INDICATOR: 'typing-indicator',
    THUMBNAIL_ITEM: 'thumbnail-item',
    PDF_CANVAS: 'pdf-canvas',
    ANNOTATION_CANVAS: 'annotation-canvas',
    INTERACTION_LAYER: 'interaction-layer',
    PAGE_CONTAINER: 'page-container',
    NOTIFICATION: 'notification',
    DRAGOVER: 'dragover'
};
