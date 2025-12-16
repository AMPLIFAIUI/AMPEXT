// DOM Builder - Secure DOM manipulation utilities
// Replaces innerHTML with safe createElement patterns

function createElementWithStyle(tag, styles, textContent = '') {
  const el = document.createElement(tag);
  if (styles) el.style.cssText = styles;
  if (textContent) el.textContent = textContent;
  return el;
}

function clearElement(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function buildActivationPrompt() {
  const container = createElementWithStyle('div', `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 30px;
    text-align: center;
    background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460);
    color: #fff;
  `);
  
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '80');
  svg.setAttribute('height', '80');
  svg.setAttribute('viewBox', '0 0 32 32');
  svg.style.marginBottom = '20px';
  
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', '7.31');
  rect.setAttribute('y', '-15.13');
  rect.setAttribute('width', '30.63');
  rect.setAttribute('height', '30.63');
  rect.setAttribute('rx', '15.32');
  rect.setAttribute('fill', '#030303');
  rect.setAttribute('transform', 'rotate(44.53)');
  
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('fill-rule', 'evenodd');
  path.setAttribute('clip-rule', 'evenodd');
  path.setAttribute('d', 'm 14.617,17.437 c 0.431,0.017 0.869,0.037 1.314,0.057 l 0.481,0.022 c 0.341,0.016 0.686,0.032 1.033,0.046 l 0.142,0.006 c 4.484,0.173 9.453,0.025 13.206,-3.775 l -2.128,-2.102 c -0.757,0.766 -1.58,1.34 -2.468,1.767 L 18.415,5.771 C 18.831,4.879 19.395,4.048 20.151,3.282 L 18.023,1.18 C 14.27,4.98 14.184,9.951 14.413,14.432 9.929,14.259 4.96,14.407 1.206,18.208 l 2.129,2.102 c 0.756,-0.766 1.58,-1.34 2.467,-1.767 l 7.783,7.686 c -0.416,0.893 -0.98,1.723 -1.737,2.49 l 2.129,2.102 c 2.93,-2.968 3.625,-6.649 3.68,-10.253 -0.438,-0.017 -0.861,-0.037 -1.266,-0.056 l -0.599,-0.028 c -0.39,-0.018 -0.768,-0.034 -1.132,-0.048 -0.01,0.864 -0.056,1.695 -0.161,2.492 L 9.093,17.588 C 10.771,17.345 12.606,17.359 14.582,17.436 Z m 2.884,-8.363 5.406,5.339 c -1.678,0.242 -3.513,0.228 -5.489,0.152 -0.101,-1.975 -0.138,-3.81 0.083,-5.491 z');
  path.setAttribute('fill', '#3498db');
  
  svg.appendChild(rect);
  svg.appendChild(path);
  
  const h2 = createElementWithStyle('h2', 'margin-bottom: 10px; color: #3498db;', 'AMP - Auto Memory Persistence');
  
  const p = createElementWithStyle('p', 'margin-bottom: 25px; color: #bdc3c7; line-height: 1.5;', 'Please activate your license to use AMP.');
  
  const input = document.createElement('input');
  input.type = 'text';
  input.id = 'licenseKeyInput';
  input.placeholder = 'Enter your license key';
  input.style.cssText = `
    width: 100%;
    max-width: 300px;
    padding: 12px 15px;
    border: 2px solid #3498db;
    border-radius: 8px;
    background: rgba(255,255,255,0.1);
    color: #fff;
    font-size: 14px;
    text-align: center;
    margin-bottom: 15px;
  `;
  
  const button = createElementWithStyle('button', `
    background: linear-gradient(135deg, #3498db, #2980b9);
    color: white;
    border: none;
    padding: 12px 30px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    margin-bottom: 20px;
    transition: transform 0.2s, box-shadow 0.2s;
  `, 'Activate License');
  button.id = 'activateBtn';
  
  const errorP = createElementWithStyle('p', 'color: #e74c3c; display: none; margin-bottom: 15px;');
  errorP.id = 'activationError';
  
  const link = document.createElement('a');
  link.href = 'https://amp.infinityfreeapp.com/#pricing';
  link.target = '_blank';
  link.style.cssText = 'color: #3498db; text-decoration: none; font-size: 13px;';
  link.textContent = "Don't have a license? Get one here →";
  
  container.appendChild(svg);
  container.appendChild(h2);
  container.appendChild(p);
  container.appendChild(input);
  container.appendChild(button);
  container.appendChild(errorP);
  container.appendChild(link);
  
  return container;
}

function buildSlotDisplay(slot, index) {
  const slotDiv = createElementWithStyle('div', `
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    padding: 12px;
    cursor: pointer;
    transition: all 0.2s;
  `);
  slotDiv.dataset.slotIndex = index;
  
  const header = createElementWithStyle('div', 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;');
  
  const slotLabel = createElementWithStyle('div', 'font-weight: 600; color: #3498db;', `Slot ${index + 1}`);
  
  const chunkCount = createElementWithStyle('div', 'font-size: 11px; color: #7f8c8d;', `${slot.chunks?.length || 0} chunks`);
  
  header.appendChild(slotLabel);
  header.appendChild(chunkCount);
  
  const preview = createElementWithStyle('div', 'font-size: 12px; color: #bdc3c7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;');
  
  if (slot.chunks && slot.chunks.length > 0) {
    const firstChunk = slot.chunks[0];
    preview.textContent = firstChunk.content?.substring(0, 50) || 'No content';
  } else {
    preview.textContent = 'Empty slot';
  }
  
  slotDiv.appendChild(header);
  slotDiv.appendChild(preview);
  
  return slotDiv;
}
