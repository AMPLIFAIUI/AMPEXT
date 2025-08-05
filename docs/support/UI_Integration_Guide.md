# AMP UI Integration Guide
## Unified Popup and Standalone Window System

---

## **🎯 Overview**

The AMP extension features a unified user interface system that provides both a popup interface and a standalone window, both sharing the same modern design and functionality. This dual-interface approach gives users flexibility in how they interact with the AMP memory system.

---

## **🖥️ Interface Components**

### **Popup Interface**
- **Location**: Chrome extension popup (click extension icon)
- **Purpose**: Quick access and monitoring
- **Features**: All core functionality in compact form
- **Limitations**: Chrome popup constraints (size, positioning)

### **Standalone Window**
- **Location**: Independent browser window
- **Purpose**: Persistent monitoring and detailed view
- **Features**: Identical functionality to popup
- **Advantages**: No popup limitations, resizable, persistent

---

## **🔄 Context-Aware Behavior**

The UI system automatically detects whether it's running in popup or standalone window context and adapts behavior accordingly:

### **Popup Context**
```javascript
// Detect popup context
const isStandaloneWindow = window.location.pathname.includes('amp-ui.html');

if (!isStandaloneWindow) {
    // Popup-specific features
    setupPinning();
    setupPopupResize();
    // "Open Window" button opens standalone window
}
```

### **Standalone Window Context**
```javascript
if (isStandaloneWindow) {
    // Standalone-specific behavior
    // Provider status shows "Standalone Mode"
    // "Open Window" button shows "Already in standalone window"
    // No popup-specific features
}
```

---

## **📁 File Structure**

```
ext/
├── popup.html          # Popup interface HTML
├── popup.js           # Shared JavaScript for both interfaces
├── amp-ui.html        # Standalone window HTML (same content as popup.html)
└── styles.css         # Shared CSS styles
```

### **Key Integration Points**

1. **Shared JavaScript**: Both interfaces use `popup.js`
2. **Identical HTML**: `amp-ui.html` contains the same content as `popup.html`
3. **Context Detection**: Script detects popup vs standalone context
4. **Adaptive Features**: Features enabled/disabled based on context

---

## **🎛️ UI Features**

### **Status Indicators**
- **Extension Status**: Shows if extension is active
- **Desktop App Status**: Shows connection to desktop application
- **Provider Detection**: Shows current AI provider (popup) or "Standalone Mode" (window)
- **Processing Status**: Shows current processing state

### **Live Activity Feed**
- **Resizable**: Can be resized by dragging the handle
- **Real-time Updates**: Shows system activity and memory operations
- **Entry Types**: Info, success, warning, error with color coding
- **Auto-scroll**: Automatically scrolls to show latest entries

### **Memory Statistics**
- **Total Memory**: Current memory usage in bytes
- **Messages/sec**: Processing rate
- **Session Time**: How long the session has been active
- **Growth Rate**: Memory growth over time

### **Memory Layers**
- **DOM Layer**: Current page content being monitored
- **Hot Buffer**: Active memory in the hot pool
- **Archive**: Archived memory in cold storage

### **Quick Actions**
- **Open Window**: Opens standalone window (popup only)
- **Send All to GUI**: Sends memory to desktop application
- **Clear**: Clears all memory
- **Stats**: Shows detailed statistics

### **Control Buttons**
- **Refresh**: Updates all data
- **Cascade**: Triggers memory cascade
- **Inject**: Performs reverse injection
- **Export**: Exports memory data

---

## **🔧 Technical Implementation**

### **Context Detection**
```javascript
const isStandaloneWindow = window.location.pathname.includes('amp-ui.html');
```

### **Feature Adaptation**
```javascript
// Setup features based on context
if (!isStandaloneWindow) {
    setupPinning();        // Popup-specific
    setupPopupResize();    // Popup-specific
}
setupResizableActivityFeed(); // Both contexts
```

### **Button Behavior**
```javascript
// "Open Window" button
if (isStandaloneWindow) {
    showNotification('ℹ️ Already in standalone window', 'info');
    return;
}
// Open new window logic...
```

### **Provider Status**
```javascript
if (isStandaloneWindow) {
    document.getElementById('current-provider').textContent = 'Standalone Mode';
    return;
}
// Normal provider detection logic...
```

---

## **🎨 Design System**

### **Color Scheme**
- **Primary**: #3498db (Blue)
- **Success**: #2ecc71 (Green)
- **Warning**: #f39c12 (Orange)
- **Error**: #e74c3c (Red)
- **Background**: Linear gradient (#1a1a2e, #16213e, #0f3460)

### **Typography**
- **Font Family**: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif
- **Base Size**: 13px
- **Headings**: 14px-18px
- **Monospace**: 'Consolas', 'Monaco', monospace (for activity feed)

### **Layout**
- **Grid System**: CSS Grid for responsive layouts
- **Flexbox**: For component alignment
- **Responsive**: Adapts to different window sizes
- **Scrollable**: Main content area scrolls independently

---

## **🚀 Usage Scenarios**

### **Quick Check (Popup)**
1. Click extension icon
2. View current status and activity
3. Perform quick actions
4. Close popup

### **Continuous Monitoring (Standalone Window)**
1. Click "Open Window" in popup
2. Window opens with same interface
3. Keep window open for persistent monitoring
4. Resize and position as needed
5. All functionality available

### **Workflow Integration**
1. Start with popup for quick access
2. Open standalone window for detailed monitoring
3. Use both interfaces as needed
4. Standalone window persists across tab changes

---

## **🔍 Troubleshooting**

### **Common Issues**

**Popup Not Opening**
- Check extension permissions
- Verify manifest.json configuration
- Check browser console for errors

**Standalone Window Not Opening**
- Check if popup blockers are enabled
- Verify `amp-ui.html` exists
- Check browser console for errors

**UI Not Responsive**
- Check if `popup.js` is loading correctly
- Verify CSS styles are applied
- Check for JavaScript errors

### **Debug Information**
```javascript
// Add to popup.js for debugging
console.log('Context:', isStandaloneWindow ? 'Standalone' : 'Popup');
console.log('Features enabled:', {
    pinning: !isStandaloneWindow,
    popupResize: !isStandaloneWindow,
    activityFeed: true
});
```

---

## **📈 Performance Considerations**

### **Memory Usage**
- **Popup**: ~2-3MB memory usage
- **Standalone Window**: ~3-4MB memory usage
- **Shared Resources**: Both interfaces share the same background processes

### **Update Frequency**
- **Status Updates**: Every 2 seconds
- **Activity Feed**: Real-time as events occur
- **Memory Stats**: Every 2 seconds
- **Provider Status**: Every 2 seconds

### **Optimization Features**
- **Debounced Updates**: Prevents excessive DOM updates
- **Lazy Loading**: Components load as needed
- **Efficient Rendering**: Minimal DOM manipulation
- **Memory Management**: Automatic cleanup of old entries

---

## **🔮 Future Enhancements**

### **Planned Features**
- **Custom Themes**: User-selectable color schemes
- **Layout Customization**: Draggable/resizable panels
- **Keyboard Shortcuts**: Quick access to common actions
- **Notifications**: Desktop notifications for important events

### **Advanced UI**
- **Dark/Light Mode**: Automatic theme switching
- **Accessibility**: Enhanced screen reader support
- **Mobile Responsive**: Better mobile device support
- **Touch Support**: Touch-friendly interface elements

---

*The unified UI system provides a seamless experience across both popup and standalone window contexts, ensuring users have access to all AMP functionality regardless of their preferred interface.* 