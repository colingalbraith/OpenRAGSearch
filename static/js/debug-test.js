// Simple debug test for upload functionality
document.addEventListener('DOMContentLoaded', () => {
    // Create debug status div
    const debugStatus = document.createElement('div');
    debugStatus.id = 'debugStatus';
    debugStatus.style.cssText = `
        position: fixed; 
        bottom: 150px; 
        left: 10px; 
        background: #333; 
        color: white; 
        padding: 10px; 
        font-family: monospace; 
        font-size: 12px; 
        z-index: 10000;
        max-width: 400px;
        border-radius: 5px;
    `;
    document.body.appendChild(debugStatus);
    
    let status = ['Debug Test Loaded'];
    
    function updateStatus(message) {
        status.push(message);
        debugStatus.innerHTML = status.join('<br>');
        console.log(message);
    }
    
    // Check if main app loaded
    setTimeout(() => {
        updateStatus(`Main app: ${window.pdfEditor ? 'LOADED' : 'NOT LOADED'}`);
        if (window.pdfEditor) {
            updateStatus(`Elements cached: ${Object.keys(window.pdfEditor.elements).length}`);
            updateStatus(`Upload btn in cache: ${window.pdfEditor.elements.uploadBtn ? 'YES' : 'NO'}`);
        }
    }, 1000);
    
    // Test upload button
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');
    
    updateStatus(`Upload button: ${uploadBtn ? 'FOUND' : 'NOT FOUND'}`);
    updateStatus(`File input: ${fileInput ? 'FOUND' : 'NOT FOUND'}`);
    
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            updateStatus('Upload button CLICKED!');
            if (fileInput) {
                updateStatus('Triggering file input');
                fileInput.click();
            }
        });
        updateStatus('Upload listener added');
    }
    
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            updateStatus(`File selected: ${e.target.files[0]?.name || 'none'}`);
        });
    }
    
    // Test AI tab buttons
    const aiTabButtons = document.querySelectorAll('.ai-tab-btn');
    updateStatus(`AI tabs found: ${aiTabButtons.length}`);
    
    // Test AI tab buttons - use event delegation to avoid conflicts
    document.addEventListener('click', (e) => {
        if (e.target.closest('.ai-tab-btn')) {
            const btn = e.target.closest('.ai-tab-btn');
            const tabName = btn.dataset.aiTab;
            updateStatus(`[DEBUG] AI tab clicked: "${tabName}" - Element: ${e.target.tagName}`);
            
            // Check panel visibility after a short delay
            setTimeout(() => {
                const panels = document.querySelectorAll('.ai-tab-panel');
                const activePanel = document.querySelector('.ai-tab-panel.active');
                updateStatus(`[DEBUG] Active panel: ${activePanel ? activePanel.id : 'none'}`);
                
                // Check computed styles
                panels.forEach(panel => {
                    const computedStyle = window.getComputedStyle(panel);
                    updateStatus(`[DEBUG] Panel ${panel.id}: display=${computedStyle.display}, classes="${panel.className}"`);
                });
            }, 100);
        }
    });
    
    updateStatus('All listeners added');
    
    // Check AI tab panels
    setTimeout(() => {
        const aiChatPanel = document.getElementById('ai-chat');
        const aiToolsPanel = document.getElementById('ai-tools');
        const aiAnalysisPanel = document.getElementById('ai-analysis');
        
        updateStatus(`AI Panels - Chat: ${aiChatPanel ? 'found' : 'missing'}, Tools: ${aiToolsPanel ? 'found' : 'missing'}, Analysis: ${aiAnalysisPanel ? 'found' : 'missing'}`);
        
        if (aiChatPanel) updateStatus(`Chat panel classes: ${aiChatPanel.className}`);
        if (aiToolsPanel) updateStatus(`Tools panel classes: ${aiToolsPanel.className}`);
        if (aiAnalysisPanel) updateStatus(`Analysis panel classes: ${aiAnalysisPanel.className}`);
    }, 2000);
});
