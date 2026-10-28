# RadialCatchment Map - User Guide

## 🚀 Quick Start

The dev server is running at: **http://localhost:5174**

Navigate to the RadialCatchment section to see the new geographic map features.

## 🎮 How to Use

### 1. **Switch Between Views**
Look for the two toggle buttons at the top:
- **CADASTRAL** (Grid icon) - Original SVG cadastral map view
- **GEOGRAPHIC** (Map icon) - New interactive MapLibre GL map view

Click either button to switch between visualization modes.

---

### 2. **Navigate to Different Locations**

#### Using the Preset Dropdown:
1. Click the dropdown that shows the current location (e.g., "Bondi 2026 (Active)")
2. Select from:
   - **Bondi 2026** (Sydney East, Australia)
   - **Richmond 3121** (Melbourne Inner, Australia)
   - **Burleigh Heads 4220** (Gold Coast, Australia)
   - **Ponsonby 1011** (Auckland Central, New Zealand)
3. Watch the map smoothly fly to the new location!

#### Using Search:
1. Click the "SEARCH POSTCODE" input field
2. Type a suburb name, postcode, or region (e.g., "Richmond", "3121", "Melbourne")
3. Select a matching result from the dropdown
4. The map will navigate to that location automatically

---

### 3. **Adjust Catchment Radius**

Toggle between three scale modes:
- **5KM LOCAL TITLE** - Hyperlocal footprint
- **15KM DISTRICT CLUSTER** - District-wide coverage  
- **50KM REGIONAL SYNDICATE** - Regional territory

**In Geographic Mode:**
- The acid-lime circle on the map will dynamically resize
- Only contenders within the selected radius are shown
- The circle maintains accurate geographic scale as you zoom

---

### 4. **Interact with Contender Markers**

**Markers appear as:**
- Black dots with glowing acid-lime (#CCFF00) borders
- Pulsing halo animation for visibility
- Positioned at exact geographic coordinates

**Interactions:**
- **Hover**: Marker scales up + popup shows contender name and label
- **Click**: Selects the contender and updates the detail panel below
- **Pan/Zoom**: Markers stay anchored to their geographic positions

---

### 5. **Monitor Live Coordinates**

**Four corner telemetry readouts:**
- **NW** (top-left) - Northwest corner latitude/longitude
- **NE** (top-right) - Northeast corner
- **SW** (bottom-left) - Southwest corner
- **SE** (bottom-right) - Southeast corner

**Updates in real-time as you:**
- Pan the map (click and drag)
- Zoom in/out (scroll wheel or +/- buttons)
- Navigate to new locations

---

### 6. **Map Controls**

MapLibre GL provides standard controls:
- **Pan**: Click and drag anywhere on the map
- **Zoom**: Scroll wheel, pinch gesture, or +/- buttons
- **Rotate**: Ctrl/Cmd + drag (not enabled by default)
- **Pitch**: Right-click + drag (3D tilt, not enabled)

---

## 🎨 Visual Features

### Catchment Zone Overlay
- **Color**: Acid-lime (#CCFF00) at 12% opacity
- **Border**: 2px solid lime with 80% opacity
- **Label**: Center overlay showing active scale and contender count

### Marker Style
- **Size**: 16px circular markers
- **Color**: Dark core (#0F0F11) with lime border
- **Animation**: 2-second pulsing halo effect
- **Shadow**: Glowing box-shadow for high visibility

### Map Theme
- **Base**: CartoDB Dark All (dark mode basemap)
- **Style**: High-contrast streets and geography
- **Attribution**: OpenStreetMap + CARTO (bottom-right)

---

## 📍 Location Coordinates

### Bondi 2026 (Sydney East)
- **Lat/Lng**: -33.8915, 151.2743
- **Region**: Sydney Eastern Suburbs
- **Contenders**: 6 verified athletes

### Richmond 3121 (Melbourne Inner)
- **Lat/Lng**: -37.8182, 144.998  
- **Region**: Inner Melbourne
- **Contenders**: 6 verified athletes

### Burleigh Heads 4220 (Gold Coast)
- **Lat/Lng**: -28.0985, 153.455
- **Region**: Gold Coast beachside
- **Contenders**: 6 verified athletes

### Ponsonby 1011 (Auckland Central)
- **Lat/Lng**: -36.8515, 174.7445
- **Region**: Auckland inner city
- **Contenders**: 6 verified athletes

---

## 🔧 Technical Notes

### Performance
- Map only loads when Geographic mode is active
- Markers are recreated when location/scale changes
- Smooth 1.5-second flyTo animations
- Cleanup prevents memory leaks on mode switch

### Accessibility
- All buttons have aria-labels and aria-pressed states
- Keyboard navigation supported
- Screen reader compatible
- Reduced motion respected (animations disabled)

### Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Safari/Chrome (responsive)

---

## 🐛 Troubleshooting

**Map not loading?**
- Check browser console for errors
- Verify network connection (tiles load from CARTO CDN)
- Try refreshing the page

**Markers in wrong position?**
- This shouldn't happen - they use precise lat/lng calculation
- Report any offset issues with specific location details

**Search not working?**
- Only cadastral register locations are searchable (4 presets)
- Arbitrary address geocoding not yet implemented

**Catchment circle appears elliptical?**
- This is expected at extreme latitudes due to Mercator projection
- The circle is geographically accurate (not visually circular)

---

## 🎯 Key Accomplishments

✅ **Preset Navigation**: All 4 locations fly smoothly on selection  
✅ **Custom Markers**: 6 contenders per location with acid-lime glow  
✅ **Dynamic Radius**: Circle scales accurately with 5/15/50KM toggles  
✅ **Live Telemetry**: Corner coordinates update on every map movement  
✅ **Search Integration**: Filter and navigate via postcode/suburb search  
✅ **Dual Mode**: Seamless switching between cadastral and geographic views

---

## 📚 Next Steps

Try these workflows:

1. **Location Tour**: Switch to Geographic mode → use preset dropdown → visit all 4 cities → watch smooth flyTo animations

2. **Scale Exploration**: Stay in one city → toggle between 5KM/15KM/50KM → observe circle resize and marker filtering

3. **Marker Interaction**: Hover over each marker → read contender info → click to select → see detail panel update

4. **Search Navigation**: Type "richmond" in search → select result → watch map navigate → zoom in/out to see coordinates update

5. **Comparison**: Switch between Cadastral and Geographic modes → compare SVG precision vs interactive map utility

---

**Enjoy exploring the territorial title system with both cadastral precision and geographic context!** 🗺️
