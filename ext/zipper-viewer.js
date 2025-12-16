// © 2025 AMPIQ All rights reserved.
// 3D Zipper Memory Viewer - Visualizes Fat/Thin Zipper data flow
// Version: 4.0.0

class ZipperViewer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Zipper container not found:', containerId);
            return;
        }
        
        this.state = 'closed'; // closed, opening, open, viewing-fat, viewing-thin
        this.selectedSide = null;
        this.memoryData = { fat: [], thin: [] };
        this.animationSpeed = 400;
        
        this.init();
    }
    
    init() {
        this.createZipperStructure();
        this.setupEventListeners();
        this.loadMemoryData();
    }
    
    createZipperStructure() {
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
        
        const structure = this.buildZipperDOM();
        this.container.appendChild(structure);
        
        this.addStyles();
    }
    
    buildZipperDOM() {
        const scene = document.createElement('div');
        scene.className = 'zipper-scene';
        
        const track = document.createElement('div');
        track.className = 'zipper-track';
        
        track.appendChild(this.createZipperSide('fat'));
        
        const spine = document.createElement('div');
        spine.className = 'zipper-spine';
        const spineGlow = document.createElement('div');
        spineGlow.className = 'spine-glow';
        spine.appendChild(spineGlow);
        track.appendChild(spine);
        
        track.appendChild(this.createZipperSide('thin'));
        scene.appendChild(track);
        
        scene.appendChild(this.createDataFlow());
        scene.appendChild(this.createContentPanel());
        scene.appendChild(this.createInstructions());
        
        return scene;
    }
    
    createZipperSide(side) {
        const sideDiv = document.createElement('div');
        sideDiv.className = `zipper-side ${side}-side`;
        sideDiv.dataset.side = side;
        
        const teeth = document.createElement('div');
        teeth.className = 'zipper-teeth';
        for (let i = 0; i < 12; i++) {
            const tooth = document.createElement('div');
            tooth.className = 'tooth';
            tooth.style.animationDelay = `${i * 0.05}s`;
            tooth.dataset.index = i;
            teeth.appendChild(tooth);
        }
        sideDiv.appendChild(teeth);
        
        const label = document.createElement('div');
        label.className = 'zipper-label';
        
        const icon = document.createElement('span');
        icon.className = 'label-icon';
        icon.textContent = side === 'fat' ? '📦' : '📄';
        
        const text = document.createElement('span');
        text.className = 'label-text';
        text.textContent = side === 'fat' ? 'FAT ZIPPER' : 'THIN ZIPPER';
        
        const count = document.createElement('span');
        count.className = 'label-count';
        count.id = `${side}-count`;
        count.textContent = '0 items';
        
        label.appendChild(icon);
        label.appendChild(text);
        label.appendChild(count);
        sideDiv.appendChild(label);
        
        const pull = document.createElement('div');
        pull.className = `zipper-pull ${side}-pull`;
        const handle = document.createElement('div');
        handle.className = 'pull-handle';
        pull.appendChild(handle);
        sideDiv.appendChild(pull);
        
        return sideDiv;
    }
    
    createDataFlow() {
        const container = document.createElement('div');
        container.className = 'data-flow-container';
        container.id = 'data-flow';
        
        const fatStream = document.createElement('div');
        fatStream.className = 'data-stream fat-stream';
        const fatParticles = document.createElement('div');
        fatParticles.className = 'stream-particles';
        fatStream.appendChild(fatParticles);
        container.appendChild(fatStream);
        
        const thinStream = document.createElement('div');
        thinStream.className = 'data-stream thin-stream';
        const thinParticles = document.createElement('div');
        thinParticles.className = 'stream-particles';
        thinStream.appendChild(thinParticles);
        container.appendChild(thinStream);
        
        const storage = document.createElement('div');
        storage.className = 'storage-indicator';
        const storageIcon = document.createElement('div');
        storageIcon.className = 'storage-icon';
        storageIcon.textContent = '💾';
        const storageLabel = document.createElement('div');
        storageLabel.className = 'storage-label';
        storageLabel.textContent = 'COLD STORAGE';
        storage.appendChild(storageIcon);
        storage.appendChild(storageLabel);
        container.appendChild(storage);
        
        return container;
    }
    
    createContentPanel() {
        const panel = document.createElement('div');
        panel.className = 'content-panel';
        panel.id = 'content-panel';
        
        const header = document.createElement('div');
        header.className = 'panel-header';
        const title = document.createElement('span');
        title.className = 'panel-title';
        title.id = 'panel-title';
        title.textContent = 'Select a Zipper';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'panel-close';
        closeBtn.id = 'panel-close';
        closeBtn.textContent = '✕';
        header.appendChild(title);
        header.appendChild(closeBtn);
        panel.appendChild(header);
        
        const content = document.createElement('div');
        content.className = 'panel-content';
        content.id = 'panel-content';
        const empty = document.createElement('div');
        empty.className = 'panel-empty';
        empty.textContent = 'Click a zipper side to view contents';
        content.appendChild(empty);
        panel.appendChild(content);
        
        return panel;
    }
    
    createInstructions() {
        const instructions = document.createElement('div');
        instructions.className = 'zipper-instructions';
        instructions.id = 'zipper-instructions';
        const instruction = document.createElement('div');
        instruction.className = 'instruction';
        instruction.textContent = '👆 Click the zipper to open';
        instructions.appendChild(instruction);
        return instructions;
    }
    
    addStyles() {
        if (document.getElementById('zipper-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'zipper-styles';
        style.textContent = `
            .zipper-scene {
                width: 100%;
                height: 100%;
                min-height: 300px;
                perspective: 1000px;
                position: relative;
                overflow: hidden;
                background: linear-gradient(180deg, 
                    rgba(0,0,0,0.3) 0%, 
                    rgba(0,0,0,0.5) 100%);
                border-radius: 12px;
            }
            
            .zipper-track {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotateX(0deg);
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                transform-style: preserve-3d;
            }
            
            .zipper-scene.curved .zipper-track {
                transform: translate(-50%, -30%) rotateX(-30deg);
            }
            
            .zipper-scene.open .zipper-track {
                transform: translate(-50%, -20%) rotateX(-45deg);
            }
            
            /* Zipper sides */
            .zipper-side {
                width: 140px;
                height: 280px;
                background: linear-gradient(135deg, #2c3e50, #1a252f);
                border-radius: 8px;
                position: relative;
                cursor: pointer;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                transform-style: preserve-3d;
                box-shadow: 0 4px 20px rgba(0,0,0,0.4);
                border: 2px solid rgba(255,255,255,0.1);
            }
            
            .zipper-side:hover {
                transform: translateY(-5px) scale(1.02);
                box-shadow: 0 8px 30px rgba(0,0,0,0.5);
            }
            
            .fat-side {
                border-color: rgba(52, 152, 219, 0.5);
                transform-origin: right center;
            }
            
            .thin-side {
                border-color: rgba(46, 204, 113, 0.5);
                transform-origin: left center;
            }
            
            .zipper-scene.open .fat-side {
                transform: rotateY(-35deg) translateX(-30px);
            }
            
            .zipper-scene.open .thin-side {
                transform: rotateY(35deg) translateX(30px);
            }
            
            .fat-side:hover {
                border-color: #3498db;
                box-shadow: 0 0 30px rgba(52, 152, 219, 0.4);
            }
            
            .thin-side:hover {
                border-color: #2ecc71;
                box-shadow: 0 0 30px rgba(46, 204, 113, 0.4);
            }
            
            /* Zipper teeth */
            .zipper-teeth {
                position: absolute;
                display: flex;
                flex-direction: column;
                gap: 4px;
                padding: 20px 0;
            }
            
            .fat-side .zipper-teeth {
                right: -6px;
                align-items: flex-end;
            }
            
            .thin-side .zipper-teeth {
                left: -6px;
                align-items: flex-start;
            }
            
            .tooth {
                width: 12px;
                height: 16px;
                background: linear-gradient(90deg, #c0c0c0, #e0e0e0, #c0c0c0);
                border-radius: 2px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                transition: transform 0.3s ease;
            }
            
            .zipper-scene.open .fat-side .tooth {
                transform: translateX(-8px) rotate(-10deg);
            }
            
            .zipper-scene.open .thin-side .tooth {
                transform: translateX(8px) rotate(10deg);
            }
            
            /* Center spine */
            .zipper-spine {
                width: 8px;
                height: 280px;
                background: linear-gradient(180deg, #3498db, #9b59b6, #2ecc71);
                border-radius: 4px;
                position: relative;
                z-index: 10;
                transition: all 0.4s ease;
            }
            
            .zipper-scene.open .zipper-spine {
                opacity: 0;
                transform: scaleX(0);
            }
            
            .spine-glow {
                position: absolute;
                inset: -4px;
                background: inherit;
                filter: blur(8px);
                opacity: 0.5;
                border-radius: 8px;
                animation: spine-pulse 2s ease-in-out infinite;
            }
            
            @keyframes spine-pulse {
                0%, 100% { opacity: 0.3; transform: scale(1); }
                50% { opacity: 0.6; transform: scale(1.1); }
            }
            
            /* Labels */
            .zipper-label {
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                text-align: center;
                color: white;
            }
            
            .label-icon {
                font-size: 24px;
                display: block;
                margin-bottom: 8px;
            }
            
            .label-text {
                font-size: 11px;
                font-weight: 600;
                letter-spacing: 1px;
                opacity: 0.9;
            }
            
            .fat-side .label-text { color: #3498db; }
            .thin-side .label-text { color: #2ecc71; }
            
            .label-count {
                display: block;
                font-size: 10px;
                opacity: 0.6;
                margin-top: 4px;
            }
            
            /* Zipper pulls */
            .zipper-pull {
                position: absolute;
                top: 10px;
                width: 20px;
                height: 30px;
                cursor: grab;
            }
            
            .fat-pull { right: -10px; }
            .thin-pull { left: -10px; }
            
            .pull-handle {
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #f1c40f, #e67e22);
                border-radius: 4px 4px 8px 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                transition: transform 0.2s ease;
            }
            
            .pull-handle:hover {
                transform: scale(1.1);
            }
            
            /* Data flow */
            .data-flow-container {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 80px;
                opacity: 0;
                transition: opacity 0.4s ease;
                pointer-events: none;
            }
            
            .zipper-scene.open .data-flow-container {
                opacity: 1;
            }
            
            .data-stream {
                position: absolute;
                height: 4px;
                top: 30px;
                border-radius: 2px;
            }
            
            .fat-stream {
                left: 20%;
                right: 55%;
                background: linear-gradient(90deg, #3498db, transparent);
            }
            
            .thin-stream {
                left: 55%;
                right: 20%;
                background: linear-gradient(90deg, transparent, #2ecc71);
            }
            
            .stream-particles {
                position: absolute;
                inset: -3px;
                overflow: hidden;
            }
            
            .stream-particles::before {
                content: '';
                position: absolute;
                width: 10px;
                height: 10px;
                background: currentColor;
                border-radius: 50%;
                animation: particle-flow 2s linear infinite;
            }
            
            .fat-stream .stream-particles::before {
                background: #3498db;
                left: 0;
            }
            
            .thin-stream .stream-particles::before {
                background: #2ecc71;
                right: 0;
                animation-direction: reverse;
            }
            
            @keyframes particle-flow {
                0% { transform: translateX(0); opacity: 1; }
                100% { transform: translateX(100px); opacity: 0; }
            }
            
            .storage-indicator {
                position: absolute;
                bottom: 10px;
                left: 50%;
                transform: translateX(-50%);
                text-align: center;
            }
            
            .storage-icon {
                font-size: 28px;
                animation: storage-pulse 1.5s ease-in-out infinite;
            }
            
            @keyframes storage-pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
            
            .storage-label {
                font-size: 10px;
                color: #bdc3c7;
                letter-spacing: 1px;
                margin-top: 4px;
            }
            
            /* Content panel */
            .content-panel {
                position: absolute;
                top: 10px;
                right: 10px;
                width: 280px;
                max-height: calc(100% - 20px);
                background: rgba(0, 0, 0, 0.85);
                border-radius: 12px;
                border: 1px solid rgba(255,255,255,0.1);
                transform: translateX(300px);
                transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                overflow: hidden;
                z-index: 100;
            }
            
            .content-panel.visible {
                transform: translateX(0);
            }
            
            .panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: rgba(255,255,255,0.05);
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }
            
            .panel-title {
                font-size: 13px;
                font-weight: 600;
                color: white;
            }
            
            .panel-title.fat { color: #3498db; }
            .panel-title.thin { color: #2ecc71; }
            
            .panel-close {
                background: none;
                border: none;
                color: rgba(255,255,255,0.5);
                font-size: 16px;
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 4px;
                transition: all 0.2s ease;
            }
            
            .panel-close:hover {
                background: rgba(255,255,255,0.1);
                color: white;
            }
            
            .panel-content {
                padding: 12px;
                max-height: 300px;
                overflow-y: auto;
            }
            
            .panel-empty {
                text-align: center;
                color: rgba(255,255,255,0.5);
                padding: 30px;
                font-size: 12px;
            }
            
            .memory-item {
                background: rgba(255,255,255,0.05);
                border-radius: 8px;
                padding: 10px 12px;
                margin-bottom: 8px;
                border-left: 3px solid;
                transition: all 0.2s ease;
            }
            
            .memory-item:hover {
                background: rgba(255,255,255,0.08);
                transform: translateX(4px);
            }
            
            .memory-item.fat { border-left-color: #3498db; }
            .memory-item.thin { border-left-color: #2ecc71; }
            
            .memory-item-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 6px;
            }
            
            .memory-item-provider {
                font-size: 11px;
                font-weight: 600;
                color: #bdc3c7;
            }
            
            .memory-item-time {
                font-size: 10px;
                color: rgba(255,255,255,0.4);
            }
            
            .memory-item-content {
                font-size: 11px;
                color: rgba(255,255,255,0.8);
                line-height: 1.4;
                overflow: hidden;
                text-overflow: ellipsis;
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
            }
            
            /* Instructions */
            .zipper-instructions {
                position: absolute;
                bottom: 15px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0,0,0,0.7);
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 11px;
                color: rgba(255,255,255,0.7);
                transition: opacity 0.3s ease;
            }
            
            .zipper-scene.open .zipper-instructions {
                opacity: 0;
                pointer-events: none;
            }
            
            .instruction {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            /* Selected state */
            .zipper-side.selected {
                transform: scale(1.05);
                z-index: 20;
            }
            
            .fat-side.selected {
                box-shadow: 0 0 40px rgba(52, 152, 219, 0.6);
            }
            
            .thin-side.selected {
                box-shadow: 0 0 40px rgba(46, 204, 113, 0.6);
            }
            
            /* Loading skeleton */
            .skeleton-item {
                background: linear-gradient(90deg,
                    rgba(255,255,255,0.05) 0%,
                    rgba(255,255,255,0.1) 50%,
                    rgba(255,255,255,0.05) 100%);
                background-size: 200% 100%;
                animation: shimmer 1.5s ease-in-out infinite;
                height: 60px;
                border-radius: 8px;
                margin-bottom: 8px;
            }
            
            @keyframes shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    setupEventListeners() {
        // Click on zipper track to open
        const track = this.container.querySelector('.zipper-track');
        track.addEventListener('click', (e) => {
            if (this.state === 'closed') {
                this.openZipper();
            }
        });
        
        // Click on sides to view content
        const fatSide = this.container.querySelector('.fat-side');
        const thinSide = this.container.querySelector('.thin-side');
        
        fatSide.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.state === 'open' || this.state === 'closed') {
                this.selectSide('fat');
            }
        });
        
        thinSide.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.state === 'open' || this.state === 'closed') {
                this.selectSide('thin');
            }
        });
        
        // Close panel
        const closeBtn = this.container.querySelector('#panel-close');
        closeBtn.addEventListener('click', () => {
            this.closePanel();
        });
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeZipper();
            }
        });
    }
    
    openZipper() {
        const scene = this.container.querySelector('.zipper-scene');
        scene.classList.add('curved');
        
        setTimeout(() => {
            scene.classList.add('open');
            this.state = 'open';
            this.updateInstructions('👈 Fat Zipper | Thin Zipper 👉');
        }, 300);
    }
    
    closeZipper() {
        const scene = this.container.querySelector('.zipper-scene');
        scene.classList.remove('open');
        
        setTimeout(() => {
            scene.classList.remove('curved');
            this.state = 'closed';
            this.closePanel();
            this.deselectAll();
            this.updateInstructions('👆 Click the zipper to open');
        }, 300);
    }
    
    selectSide(side) {
        // First open if closed
        if (this.state === 'closed') {
            this.openZipper();
            setTimeout(() => this.selectSide(side), 700);
            return;
        }
        
        this.deselectAll();
        
        const sideElement = this.container.querySelector(`.${side}-side`);
        sideElement.classList.add('selected');
        this.selectedSide = side;
        
        this.showPanel(side);
        this.startDataFlow(side);
    }
    
    deselectAll() {
        this.container.querySelectorAll('.zipper-side').forEach(el => {
            el.classList.remove('selected');
        });
        this.selectedSide = null;
    }
    
    showPanel(side) {
        const panel = this.container.querySelector('#content-panel');
        const title = this.container.querySelector('#panel-title');
        const content = this.container.querySelector('#panel-content');
        
        title.textContent = side === 'fat' ? '📦 Fat Zipper Contents' : '📄 Thin Zipper Contents';
        title.className = `panel-title ${side}`;
        
        // Show loading
        while (content.firstChild) content.removeChild(content.firstChild);
        for (let i = 0; i < 3; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'skeleton-item';
            content.appendChild(skeleton);
        }
        
        panel.classList.add('visible');
        
        // Load actual content
        setTimeout(() => {
            this.displayContent(side);
        }, 500);
    }
    
    closePanel() {
        const panel = this.container.querySelector('#content-panel');
        panel.classList.remove('visible');
        this.deselectAll();
        this.stopDataFlow();
    }
    
    displayContent(side) {
        const content = this.container.querySelector('#panel-content');
        const data = this.memoryData[side];
        
        while (content.firstChild) content.removeChild(content.firstChild);
        
        if (!data || data.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'panel-empty';
            empty.textContent = `No ${side === 'fat' ? 'full conversation' : 'summary'} data yet.`;
            const br = document.createElement('br');
            const small = document.createElement('small');
            small.textContent = 'Chat with AI providers to capture memories';
            empty.appendChild(br);
            empty.appendChild(small);
            content.appendChild(empty);
            return;
        }
        
        data.forEach(item => {
            const memItem = document.createElement('div');
            memItem.className = `memory-item ${side}`;
            
            const header = document.createElement('div');
            header.className = 'memory-item-header';
            
            const provider = document.createElement('span');
            provider.className = 'memory-item-provider';
            provider.textContent = item.provider || 'Unknown';
            
            const time = document.createElement('span');
            time.className = 'memory-item-time';
            time.textContent = this.formatTime(item.timestamp);
            
            header.appendChild(provider);
            header.appendChild(time);
            memItem.appendChild(header);
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'memory-item-content';
            contentDiv.textContent = this.truncate(item.content, 150);
            memItem.appendChild(contentDiv);
            
            content.appendChild(memItem);
        });
    }
    
    startDataFlow(side) {
        const stream = this.container.querySelector(`.${side}-stream`);
        if (stream) {
            stream.style.opacity = '1';
        }
    }
    
    stopDataFlow() {
        this.container.querySelectorAll('.data-stream').forEach(stream => {
            stream.style.opacity = '0.3';
        });
    }
    
    updateInstructions(text) {
        const instructions = this.container.querySelector('.zipper-instructions');
        if (instructions) {
            instructions.querySelector('.instruction').textContent = text;
        }
    }
    
    updateCounts() {
        const fatCount = this.container.querySelector('#fat-count');
        const thinCount = this.container.querySelector('#thin-count');
        
        if (fatCount) fatCount.textContent = `${this.memoryData.fat.length} items`;
        if (thinCount) thinCount.textContent = `${this.memoryData.thin.length} items`;
    }
    
    async loadMemoryData() {
        try {
            // Try to get data from background script
            const response = await chrome.runtime.sendMessage({ action: 'getMemoryData' });
            
            if (response && response.data) {
                // Separate into fat (full) and thin (summaries)
                this.memoryData.fat = response.data.filter(item => 
                    item.content && item.content.length > 500
                ).slice(0, 20);
                
                this.memoryData.thin = response.data.filter(item => 
                    item.content && item.content.length <= 500
                ).slice(0, 20);
            }
        } catch (error) {
            console.log('Loading sample data for zipper viewer');
            // Use sample data for demo
            this.memoryData = {
                fat: [
                    { provider: 'ChatGPT', content: 'This is a full conversation about machine learning and neural networks...', timestamp: Date.now() - 3600000 },
                    { provider: 'Claude', content: 'Detailed discussion about software architecture patterns and best practices...', timestamp: Date.now() - 7200000 },
                ],
                thin: [
                    { provider: 'ChatGPT', content: 'Quick summary of ML concepts', timestamp: Date.now() - 1800000 },
                    { provider: 'Gemini', content: 'Code snippet for API call', timestamp: Date.now() - 5400000 },
                ]
            };
        }
        
        this.updateCounts();
    }
    
    formatTime(timestamp) {
        if (!timestamp) return 'Unknown';
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    }
    
    truncate(text, length) {
        if (!text) return '';
        return text.length > length ? text.substring(0, length) + '...' : text;
    }
    
    // Public method to refresh data
    refresh() {
        this.loadMemoryData();
    }
}

// Auto-initialize if container exists
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('zipper-viewer');
    if (container) {
        window.zipperViewer = new ZipperViewer('zipper-viewer');
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ZipperViewer;
}

