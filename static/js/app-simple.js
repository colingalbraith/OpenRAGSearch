// Simple test version
console.log('Simple app.js loading...');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready');
    
    // Test upload button directly
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');
    
    console.log('Upload button:', uploadBtn);
    console.log('File input:', fileInput);
    
    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', () => {
            console.log('Upload button clicked!');
            fileInput.click();
        });
        console.log('Upload button event listener added');
    }
    
    // Test other buttons
    const allButtons = document.querySelectorAll('button');
    console.log('Found buttons:', allButtons.length);
    
    allButtons.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            console.log(`Button ${index} clicked:`, btn.id || btn.className);
        });
    });
});
