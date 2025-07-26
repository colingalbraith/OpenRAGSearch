// Enhanced Interactive Loading Manager
export class InteractiveLoadingManager {
    constructor() {
        this.currentStep = 0;
        this.steps = [
            {
                id: 'chunk',
                title: 'Smart Chunking',
                description: 'Breaking text into meaningful sections',
                icon: 'fas fa-cut',
                progressRange: [0, 35],
                infoCard: 'info-chunk'
            },
            {
                id: 'embed',
                title: 'AI Vectorization',
                description: 'Creating semantic embeddings with AI',
                icon: 'fas fa-brain',
                progressRange: [35, 80],
                infoCard: 'info-embed'
            },
            {
                id: 'index',
                title: 'Building Index',
                description: 'Creating searchable knowledge base',
                icon: 'fas fa-search',
                progressRange: [80, 100],
                infoCard: 'info-index'
            }
        ];
        
        this.funFacts = [
            "💡 Did you know? AI embeddings can capture the meaning of words in 1,536 dimensions!",
            "🧠 Each chunk is converted into a vector that represents its semantic meaning.",
            "🔍 Vector search can find relevant content even if you don't use exact keywords.",
            "⚡ Modern embeddings can understand context, synonyms, and relationships.",
            "📚 Your document becomes part of a powerful AI knowledge base.",
            "🎯 Semantic search is 10x more accurate than traditional keyword search.",
            "🌐 The same AI technology powers ChatGPT and modern search engines."
        ];
        
        this.factIndex = 0;
        this.factInterval = null;
    }

    show() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
            
            // Reset to first step
            this.currentStep = 0;
            this.updateCurrentStep();
            this.resetSteps();
            this.startFactRotation();
            
            // Add blur to main content
            this.blurMainContent(true);
        }
    }

    hide() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            // Fade out animation
            overlay.style.animation = 'fadeOut 0.3s ease-out forwards';
            
            setTimeout(() => {
                overlay.style.display = 'none';
                overlay.style.animation = '';
                this.blurMainContent(false);
                this.stopFactRotation();
            }, 300);
        }
    }

    updateProgress(percent) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill) {
            progressFill.style.width = `${percent}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${Math.round(percent)}%`;
        }

        // Update step based on progress
        this.updateStepByProgress(percent);
    }

    updateStepByProgress(percent) {
        const step = this.steps.find(s => 
            percent >= s.progressRange[0] && percent <= s.progressRange[1]
        );
        
        if (step && this.steps.indexOf(step) !== this.currentStep) {
            this.currentStep = this.steps.indexOf(step);
            this.updateCurrentStep();
        }
    }

    updateCurrentStep() {
        const step = this.steps[this.currentStep];
        if (!step) return;

        // Update current step display
        const stepIcon = document.querySelector('.current-step .step-icon i');
        const stepTitle = document.getElementById('stepTitle');
        const stepDescription = document.getElementById('stepDescription');

        if (stepIcon) stepIcon.className = step.icon;
        if (stepTitle) stepTitle.textContent = step.title;
        if (stepDescription) stepDescription.textContent = step.description;

        // Update step items
        this.steps.forEach((s, index) => {
            const stepItem = document.getElementById(`step-${s.id}`);
            if (stepItem) {
                stepItem.classList.remove('active', 'completed');
                
                if (index < this.currentStep) {
                    stepItem.classList.add('completed');
                } else if (index === this.currentStep) {
                    stepItem.classList.add('active');
                }
            }
        });

        // Show relevant info card
        this.showInfoCard(step.infoCard);
    }

    showInfoCard(cardId) {
        // Hide all info cards
        document.querySelectorAll('.info-card').forEach(card => {
            card.classList.remove('show');
        });

        // Show the current one
        setTimeout(() => {
            const targetCard = document.getElementById(cardId);
            if (targetCard) {
                targetCard.classList.add('show');
            }
        }, 150);
    }

    resetSteps() {
        document.querySelectorAll('.step-item').forEach(item => {
            item.classList.remove('active', 'completed');
        });
        
        document.querySelectorAll('.info-card').forEach(card => {
            card.classList.remove('show');
        });
    }

    startFactRotation() {
        this.updateFunFact();
        this.factInterval = setInterval(() => {
            this.updateFunFact();
        }, 4000);
    }

    stopFactRotation() {
        if (this.factInterval) {
            clearInterval(this.factInterval);
            this.factInterval = null;
        }
    }

    updateFunFact() {
        const factText = document.getElementById('factText');
        if (factText) {
            factText.style.opacity = '0';
            
            setTimeout(() => {
                factText.textContent = this.funFacts[this.factIndex];
                factText.style.opacity = '1';
                this.factIndex = (this.factIndex + 1) % this.funFacts.length;
            }, 300);
        }
    }

    blurMainContent(blur) {
        const mainContent = document.querySelector('.main-content');
        const header = document.querySelector('.header');
        const leftSidebar = document.querySelector('.left-sidebar');
        const rightSidebar = document.querySelector('.right-sidebar');

        const elements = [mainContent, header, leftSidebar, rightSidebar].filter(Boolean);
        
        elements.forEach(element => {
            if (blur) {
                element.style.filter = 'blur(4px)';
                element.style.pointerEvents = 'none';
                element.style.transition = 'filter 0.3s ease';
            } else {
                element.style.filter = '';
                element.style.pointerEvents = '';
            }
        });
    }

    // Simulate processing steps for demo
    async simulateProcessing() {
        // Step 1: Upload (0-50%)
        await this.animateProgress(0, 50, 2000);
        
        // Step 2: Extract (50-65%)
        await this.animateProgress(50, 65, 1500);
        
        // Step 3: Chunk (65-75%)
        await this.animateProgress(65, 75, 1000);
        
        // Step 4: Embed (75-90%)
        await this.animateProgress(75, 90, 3000);
        
        // Step 5: Index (90-100%)
        await this.animateProgress(90, 100, 1000);
        
        // Brief pause before hiding
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    async animateProgress(start, end, duration) {
        const startTime = Date.now();
        const range = end - start;
        
        return new Promise(resolve => {
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const currentProgress = start + (range * progress);
                
                this.updateProgress(currentProgress);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            animate();
        });
    }
}

// Add fadeOut animation to CSS if not exists
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    
    .info-card {
        transition: opacity 0.3s ease, transform 0.3s ease;
    }
    
    #factText {
        transition: opacity 0.3s ease;
    }
`;
document.head.appendChild(style);
