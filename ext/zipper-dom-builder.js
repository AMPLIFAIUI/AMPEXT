// Zipper DOM Builder - Secure DOM construction for zipper viewer
// Replaces innerHTML with createElement

function createZipperStructure(viewer) {
    const scene = document.createElement('div');
    scene.className = 'zipper-scene';
    
    // Create zipper track
    const track = document.createElement('div');
    track.className = 'zipper-track';
    
    // Fat side
    const fatSide = createZipperSide('fat', viewer);
    track.appendChild(fatSide);
    
    // Center spine
    const spine = document.createElement('div');
    spine.className = 'zipper-spine';
    const spineGlow = document.createElement('div');
    spineGlow.className = 'spine-glow';
    spine.appendChild(spineGlow);
    track.appendChild(spine);
    
    // Thin side
    const thinSide = createZipperSide('thin', viewer);
    track.appendChild(thinSide);
    
    scene.appendChild(track);
    
    // Data flow container
    const dataFlow = createDataFlowContainer();
    scene.appendChild(dataFlow);
    
    // Content panel
    const contentPanel = createContentPanel();
    scene.appendChild(contentPanel);
    
    // Instructions
    const instructions = createInstructions();
    scene.appendChild(instructions);
    
    return scene;
}

function createZipperSide(side, viewer) {
    const sideDiv = document.createElement('div');
    sideDiv.className = `zipper-side ${side}-side`;
    sideDiv.dataset.side = side;
    
    // Teeth container
    const teeth = document.createElement('div');
    teeth.className = 'zipper-teeth';
    
    // Generate teeth
    for (let i = 0; i < 12; i++) {
        const tooth = document.createElement('div');
        tooth.className = 'tooth';
        tooth.style.animationDelay = `${i * 0.05}s`;
        tooth.dataset.index = i;
        teeth.appendChild(tooth);
    }
    
    sideDiv.appendChild(teeth);
    
    // Label
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
    
    // Pull handle
    const pull = document.createElement('div');
    pull.className = `zipper-pull ${side}-pull`;
    const handle = document.createElement('div');
    handle.className = 'pull-handle';
    pull.appendChild(handle);
    sideDiv.appendChild(pull);
    
    return sideDiv;
}

function createDataFlowContainer() {
    const container = document.createElement('div');
    container.className = 'data-flow-container';
    container.id = 'data-flow';
    
    // Fat stream
    const fatStream = document.createElement('div');
    fatStream.className = 'data-stream fat-stream';
    const fatParticles = document.createElement('div');
    fatParticles.className = 'stream-particles';
    fatStream.appendChild(fatParticles);
    container.appendChild(fatStream);
    
    // Thin stream
    const thinStream = document.createElement('div');
    thinStream.className = 'data-stream thin-stream';
    const thinParticles = document.createElement('div');
    thinParticles.className = 'stream-particles';
    thinStream.appendChild(thinParticles);
    container.appendChild(thinStream);
    
    // Storage indicator
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

function createContentPanel() {
    const panel = document.createElement('div');
    panel.className = 'content-panel';
    panel.id = 'content-panel';
    
    // Header
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
    
    // Content
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

function createInstructions() {
    const instructions = document.createElement('div');
    instructions.className = 'zipper-instructions';
    instructions.id = 'zipper-instructions';
    
    const instruction = document.createElement('div');
    instruction.className = 'instruction';
    instruction.textContent = '👆 Click the zipper to open';
    
    instructions.appendChild(instruction);
    
    return instructions;
}

function createMemoryItemElement(item, index) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'memory-item';
    itemDiv.dataset.index = index;
    
    const header = document.createElement('div');
    header.className = 'item-header';
    
    const indexSpan = document.createElement('span');
    indexSpan.className = 'item-index';
    indexSpan.textContent = `#${index + 1}`;
    
    const timestamp = document.createElement('span');
    timestamp.className = 'item-timestamp';
    timestamp.textContent = new Date(item.timestamp || Date.now()).toLocaleString();
    
    header.appendChild(indexSpan);
    header.appendChild(timestamp);
    itemDiv.appendChild(header);
    
    const content = document.createElement('div');
    content.className = 'item-content';
    content.textContent = item.content || item.text || JSON.stringify(item);
    itemDiv.appendChild(content);
    
    if (item.metadata) {
        const meta = document.createElement('div');
        meta.className = 'item-metadata';
        meta.textContent = `Provider: ${item.metadata.provider || 'Unknown'}`;
        itemDiv.appendChild(meta);
    }
    
    return itemDiv;
}

function populatePanelContent(content, data) {
    while (content.firstChild) {
        content.removeChild(content.firstChild);
    }
    
    if (!data || data.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'panel-empty';
        empty.textContent = 'No data in this zipper';
        content.appendChild(empty);
        return;
    }
    
    data.forEach((item, index) => {
        const itemElement = createMemoryItemElement(item, index);
        content.appendChild(itemElement);
    });
}
