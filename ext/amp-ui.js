// © 2025 AMPIQ All rights reserved.
// AMP UI Viewer - 3D Zipper Interface Implementation
// Version: 2.0.0 - 3D Zipper Interface

class AMPZipperViewer {
    constructor() {
        this.currentMode = 'conveyor'; // 'conveyor' or 'fullview'
        this.selectedZipper = null;
        this.zoomLevel = 1;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.memoryData = [];
        this.conveyorBelts = [];
        this.animationFrame = null;
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.loadMemoryData();
        this.startConveyorAnimation();
        this.setupZipperViewer();
    }

    setupCanvas() {
        // Create 3D canvas for zipper viewer
        const viewerContainer = document.getElementById('zipper-viewer-container');
        if (!viewerContainer) {
            console.error('Zipper viewer container not found');
            return;
        }

        // Remove loading spinner
        const loadingElement = viewerContainer.querySelector('.zipper-loading');
        if (loadingElement) {
            loadingElement.remove();
        }

        // Create canvas element
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'zipper-canvas';
        this.canvas.width = viewerContainer.clientWidth;
        this.canvas.height = viewerContainer.clientHeight;
        this.canvas.style.cursor = 'grab';
        
        this.ctx = this.canvas.getContext('2d');
        viewerContainer.appendChild(this.canvas);

        // Handle canvas resize
        window.addEventListener('resize', () => {
            this.canvas.width = viewerContainer.clientWidth;
            this.canvas.height = viewerContainer.clientHeight;
        });
    }

    setupEventListeners() {
        // Mouse wheel for zoom
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoomLevel = Math.max(0.5, Math.min(3, this.zoomLevel * zoomFactor));
        });

        // Mouse drag for panning
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.canvas.style.cursor = 'grabbing';
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const deltaX = e.clientX - this.lastMouseX;
                const deltaY = e.clientY - this.lastMouseY;
                this.panX += deltaX;
                this.panY += deltaY;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.canvas.style.cursor = 'grab';
        });

        // Click detection for zipper interaction
        this.canvas.addEventListener('click', (e) => {
            if (this.currentMode === 'conveyor') {
                this.handleZipperClick(e);
            }
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardInput(e);
        });
    }

    async loadMemoryData() {
        try {
            // Get memory data from background script
            const response = await chrome.runtime.sendMessage({
                action: 'getMemoryData'
            });
            
            if (response && response.data) {
                this.memoryData = response.data;
            } else {
                // Use sample data for testing if no real data available
                this.memoryData = this.getSampleData();
            }
            
            this.createConveyorBelts();
        } catch (error) {
            console.error('Failed to load memory data:', error);
            // Use sample data for testing
            this.memoryData = this.getSampleData();
            this.createConveyorBelts();
        }
    }
    
    getSampleData() {
        return [
            {
                id: 'sample-1',
                content: 'This is a sample conversation about artificial intelligence and machine learning concepts.',
                provider: 'ChatGPT',
                timestamp: Date.now() - 3600000,
                index: 0,
                type: 'conversation'
            },
            {
                id: 'sample-2',
                content: 'Another conversation discussing the future of technology and its impact on society.',
                provider: 'Claude',
                timestamp: Date.now() - 1800000,
                index: 1,
                type: 'conversation'
            },
            {
                id: 'sample-3',
                content: 'A detailed discussion about programming best practices and software architecture.',
                provider: 'Gemini',
                timestamp: Date.now() - 900000,
                index: 2,
                type: 'conversation'
            }
        ];
    }

    createConveyorBelts() {
        this.conveyorBelts = [];
        
        // Create multiple conveyor belts with zippers
        for (let i = 0; i < 3; i++) {
            const belt = {
                id: i,
                y: 200 + i * 150,
                speed: 1 + i * 0.5,
                zippers: [],
                offset: 0
            };

            // Create zippers for this belt
            const zippersPerBelt = 5;
            for (let j = 0; j < zippersPerBelt; j++) {
                const zipper = {
                    id: `${i}-${j}`,
                    x: j * 300 + Math.random() * 100,
                    y: belt.y,
                    width: 200,
                    height: 60,
                    type: j % 2 === 0 ? 'fat' : 'thin',
                    content: this.memoryData[j] || null,
                    isZipped: true,
                    animation: 0
                };
                belt.zippers.push(zipper);
            }

            this.conveyorBelts.push(belt);
        }
    }

    startConveyorAnimation() {
        const animate = () => {
            this.updateConveyorBelts();
            this.render();
            this.animationFrame = requestAnimationFrame(animate);
        };
        animate();
    }

    updateConveyorBelts() {
        this.conveyorBelts.forEach(belt => {
            belt.offset += belt.speed;
            
            belt.zippers.forEach(zipper => {
                zipper.x -= belt.speed;
                
                // Reset zipper position when it goes off screen
                if (zipper.x < -300) {
                    zipper.x = this.canvas.width + 300;
                    zipper.isZipped = true;
                    zipper.animation = 0;
                }
            });
        });
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply transformations
        this.ctx.save();
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.zoomLevel, this.zoomLevel);

        if (this.currentMode === 'conveyor') {
            this.renderConveyorView();
        } else if (this.currentMode === 'fullview') {
            this.renderFullView();
        }

        this.ctx.restore();
    }

    renderConveyorView() {
        // Render background gradient for 3D effect
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.5, '#16213e');
        gradient.addColorStop(1, '#0f3460');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render conveyor belts
        this.conveyorBelts.forEach(belt => {
            this.renderConveyorBelt(belt);
        });

        // Render zippers
        this.conveyorBelts.forEach(belt => {
            belt.zippers.forEach(zipper => {
                this.renderZipper(zipper);
            });
        });
        
        // Render perspective grid lines
        this.renderPerspectiveGrid();
    }
    
    renderPerspectiveGrid() {
        // Draw perspective grid lines for 3D effect
        this.ctx.strokeStyle = 'rgba(52, 152, 219, 0.1)';
        this.ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = 0; x < this.canvas.width; x += 100) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Horizontal lines with perspective
        for (let y = 0; y < this.canvas.height; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    renderConveyorBelt(belt) {
        // Draw conveyor belt with 3D perspective
        const beltHeight = 20;
        const beltDepth = 8;
        
        // Main belt surface
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(0, belt.y - beltHeight/2, this.canvas.width, beltHeight);
        
        // Belt edge (3D effect)
        this.ctx.fillStyle = '#1a252f';
        this.ctx.fillRect(0, belt.y + beltHeight/2, this.canvas.width, beltDepth);
        
        // Belt texture with perspective
        this.ctx.strokeStyle = '#34495e';
        this.ctx.lineWidth = 2;
        for (let x = 0; x < this.canvas.width; x += 30) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, belt.y - beltHeight/2);
            this.ctx.lineTo(x, belt.y + beltHeight/2);
            this.ctx.stroke();
        }
        
        // Belt rollers (3D effect)
        this.ctx.fillStyle = '#34495e';
        for (let x = 0; x < this.canvas.width; x += 60) {
            this.ctx.beginPath();
            this.ctx.arc(x, belt.y + beltHeight/2 + beltDepth/2, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    renderZipper(zipper) {
        const x = zipper.x;
        const y = zipper.y;
        const width = zipper.width;
        const height = zipper.height;

        // 3D zipper body with depth
        const depth = 6;
        
        // Zipper shadow (3D effect)
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(x + depth, y + depth, width, height);
        
        // Zipper main body
        this.ctx.fillStyle = zipper.type === 'fat' ? '#e74c3c' : '#3498db';
        this.ctx.fillRect(x, y, width, height);
        
        // Zipper top edge (3D effect)
        this.ctx.fillStyle = zipper.type === 'fat' ? '#c0392b' : '#2980b9';
        this.ctx.fillRect(x, y, width, 3);
        
        // Zipper teeth with 3D effect
        const teethCount = 20;
        const toothWidth = width / teethCount;
        
        for (let i = 0; i < teethCount; i++) {
            const toothX = x + i * toothWidth;
            
            // Tooth shadow
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            this.ctx.beginPath();
            this.ctx.moveTo(toothX + 1, y + 1);
            this.ctx.lineTo(toothX + toothWidth/2 + 1, y + height/2 + 1);
            this.ctx.lineTo(toothX + toothWidth + 1, y + 1);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Tooth highlight
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.moveTo(toothX, y);
            this.ctx.lineTo(toothX + toothWidth/2, y + height/2);
            this.ctx.lineTo(toothX + toothWidth, y);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Tooth outline
            this.ctx.strokeStyle = '#2c3e50';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(toothX, y);
            this.ctx.lineTo(toothX + toothWidth/2, y + height/2);
            this.ctx.lineTo(toothX + toothWidth, y);
            this.ctx.stroke();
        }

        // Zipper pull tab
        this.ctx.fillStyle = '#f39c12';
        this.ctx.fillRect(x + width/2 - 8, y - 15, 16, 15);
        this.ctx.fillStyle = '#e67e22';
        this.ctx.fillRect(x + width/2 - 6, y - 13, 12, 11);

        // Zipper label with shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.font = 'bold 10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            zipper.type === 'fat' ? 'FAT' : 'THIN',
            x + width / 2 + 1,
            y + height / 2 + 5
        );
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(
            zipper.type === 'fat' ? 'FAT' : 'THIN',
            x + width / 2,
            y + height / 2 + 4
        );

        // Hover effect with glow
        if (this.isMouseOverZipper(zipper)) {
            this.ctx.shadowColor = '#f39c12';
            this.ctx.shadowBlur = 10;
            this.ctx.strokeStyle = '#f39c12';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(x - 3, y - 3, width + 6, height + 6);
            this.ctx.shadowBlur = 0;
        }
    }

    isMouseOverZipper(zipper) {
        const mouseX = (this.lastMouseX - this.panX) / this.zoomLevel;
        const mouseY = (this.lastMouseY - this.panY) / this.zoomLevel;
        
        return mouseX >= zipper.x && mouseX <= zipper.x + zipper.width &&
               mouseY >= zipper.y && mouseY <= zipper.y + zipper.height;
    }

    handleZipperClick(e) {
        const mouseX = (e.clientX - this.panX) / this.zoomLevel;
        const mouseY = (e.clientY - this.panY) / this.zoomLevel;

        // Check if clicked on a zipper
        for (const belt of this.conveyorBelts) {
            for (const zipper of belt.zippers) {
                if (mouseX >= zipper.x && mouseX <= zipper.x + zipper.width &&
                    mouseY >= zipper.y && mouseY <= zipper.y + zipper.height) {
                    this.unzipZipper(zipper);
                    return;
                }
            }
        }
    }

    unzipZipper(zipper) {
        this.selectedZipper = zipper;
        this.currentMode = 'fullview';
        this.showFullViewControls();
        
        // Animate unzipping
        this.animateUnzipping(zipper);
    }

    animateUnzipping(zipper) {
        const duration = 1000; // 1 second
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            zipper.animation = easeOut;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.renderFullView();
            }
        };
        
        animate();
    }

    renderFullView() {
        if (!this.selectedZipper) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render full zipper view
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render zipper content
        this.renderZipperContent(this.selectedZipper);
    }

    renderZipperContent(zipper) {
        const padding = 40;
        const contentWidth = this.canvas.width - padding * 2;
        const contentHeight = this.canvas.height - padding * 2;
        
        // Content background
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(padding, padding, contentWidth, contentHeight);
        
        // Title
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            `${zipper.type.toUpperCase()} ZIPPER CONTENT`,
            this.canvas.width / 2,
            padding + 30
        );
        
        // Content
        if (zipper.content) {
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillStyle = '#ecf0f1';
            
            const lines = this.wrapText(zipper.content.content || 'No content available', contentWidth - 40);
            let y = padding + 80;
            
            lines.forEach(line => {
                if (y < contentHeight - padding) {
                    this.ctx.fillText(line, padding + 20, y);
                    y += 20;
                }
            });
        } else {
            this.ctx.fillStyle = '#bdc3c7';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                'No content available for this zipper',
                this.canvas.width / 2,
                this.canvas.height / 2
            );
        }
    }

    wrapText(text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        words.forEach(word => {
            const testLine = currentLine + word + ' ';
            const metrics = this.ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && currentLine !== '') {
                lines.push(currentLine);
                currentLine = word + ' ';
            } else {
                currentLine = testLine;
            }
        });
        
        lines.push(currentLine);
        return lines;
    }

    showFullViewControls() {
        // Create control buttons for full view mode
        const controlsContainer = document.getElementById('zipper-controls');
        if (!controlsContainer) return;
        
        controlsContainer.innerHTML = `
            <button class="btn btn-primary" id="back-to-conveyor">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"/>
                </svg>
                Back to Conveyor
            </button>
            <button class="btn btn-secondary" id="s1-button">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8Z"/>
                </svg>
                S1: Original
            </button>
            <button class="btn btn-secondary" id="s9-button">
                <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8Z"/>
                </svg>
                S9: State
            </button>
        `;
        
        // Add event listeners
        document.getElementById('back-to-conveyor').addEventListener('click', () => {
            this.returnToConveyor();
        });
        
        document.getElementById('s1-button').addEventListener('click', () => {
            this.showOriginalContent();
        });
        
        document.getElementById('s9-button').addEventListener('click', () => {
            this.showStateInfo();
        });
    }

    returnToConveyor() {
        this.currentMode = 'conveyor';
        this.selectedZipper = null;
        this.hideFullViewControls();
    }

    hideFullViewControls() {
        const controlsContainer = document.getElementById('zipper-controls');
        if (controlsContainer) {
            controlsContainer.innerHTML = '';
        }
    }

    showOriginalContent() {
        if (!this.selectedZipper || !this.selectedZipper.content) {
            this.showNotification('No original content available', 'warning');
            return;
        }
        
        // Show original conversation content
        this.showNotification('Showing original conversation content', 'success');
        // Implementation for showing original content
    }

    showStateInfo() {
        if (!this.selectedZipper) {
            this.showNotification('No zipper selected', 'warning');
            return;
        }
        
        // Show state/index information
        const stateInfo = {
            id: this.selectedZipper.id,
            type: this.selectedZipper.type,
            timestamp: new Date().toISOString(),
            index: this.selectedZipper.content?.index || 'N/A'
        };
        
        this.showNotification(`State: ${JSON.stringify(stateInfo)}`, 'info');
    }

    handleKeyboardInput(e) {
        switch (e.key) {
            case 'Escape':
                if (this.currentMode === 'fullview') {
                    this.returnToConveyor();
                }
                break;
            case '1':
                if (this.currentMode === 'fullview') {
                    this.showOriginalContent();
                }
                break;
            case '9':
                if (this.currentMode === 'fullview') {
                    this.showStateInfo();
                }
                break;
        }
    }

    setupZipperViewer() {
        // Initialize the zipper viewer interface
        console.log('🔧 Initializing 3D Zipper Interface...');
        
        // Set up periodic data refresh
        setInterval(() => {
            this.loadMemoryData();
        }, 5000); // Refresh every 5 seconds
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        const container = document.getElementById('notificationContainer');
        if (container) {
            container.appendChild(notification);
            
            // Show notification
            setTimeout(() => {
                notification.classList.add('show');
            }, 100);
            
            // Remove notification after 3 seconds
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, 3000);
        }
    }

    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }
}

// Initialize the zipper viewer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.zipperViewer = new AMPZipperViewer();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AMPZipperViewer;
} 