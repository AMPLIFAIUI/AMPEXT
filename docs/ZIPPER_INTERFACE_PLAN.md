# 3D Zipper Interface Plan

## Overview
Memory Browser as a 3D interactive zipper system with conveyor belt flow and unzipping animations.

## Idle State - 3D Conveyor Belt View
- **Perspective**: Top-down view looking down at flowing zippers
- **Layout**: Viewer window at top, zippers flowing below on conveyor belts
- **Zippers**: Fat Zipper and Thin Zipper zipped together
- **Movement**: Flowing on conveyor belts toward storage
- **Visibility**: Actual zipper teeth/links visible on moving belts
- **Controls**: Mouse wheel to zoom in/out and scroll around

## Interactive Click System
- **Click on zipper side** (Fat or Thin)
- **Unzipping animation**: Selected zipper unzips from the other
- **3D movement**: Zipper snakes up toward viewer window
- **Visual effect**: Zipper teeth separate as it breaks away from main flow
- **Result**: Full-screen zipper viewer for detailed browsing

## Full View Mode
- **Manual scrolling** through unzipped zipper content
- **S1 button**: View original conversation in full
- **S9 button**: View current state/index number/tag
- **Scroll controls**: Up/down buttons for normal scrolling
- **Fast scroll**: Skip buttons to jump through index quickly
- **Entry interaction**: Click individual entries to see summarized content
- **Back button**: Return to conveyor belt view

## Additional Features
- **Live Feed toggle**: Switch between index mode and real-time updates
- **Send All Visible button**: Inject selected entries
- **Mode switching**: Between Rolodex index and live feed modes

## Technical Implementation
- 3D rendering for conveyor belt and zipper flow
- Animation system for unzipping and snaking up
- Mouse wheel zoom/pan controls
- Click detection for zipper interaction
- Full-screen viewer with manual scrolling
- S1/S9 button functionality
- Scroll controls and fast scroll

## User Experience Flow
1. **Idle**: See zippers flowing together on conveyor belts
2. **Zoom/Pan**: Mouse wheel to explore the 3D space
3. **Click**: Select zipper to unzip and bring to full view
4. **Browse**: Scroll through unzipped content with S1/S9 buttons
5. **Interact**: Click entries to see details, use scroll controls
6. **Return**: Back button to conveyor belt view

## Success Criteria
- Smooth 3D conveyor belt animation
- Realistic zipper unzipping effect
- Responsive mouse wheel controls
- Intuitive click-to-unzip interaction
- Full-featured browsing in expanded view
- Seamless transitions between modes 