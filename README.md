# LOCOROM • Smart Campus Indoor Navigation

[![Streamlit App](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://locorom.streamlit.app/)

**Locorom** is an indoor visual wayfinding and destination locator built for the Maharaja Institute of Technology Mysore (MITM) campus. It provides step-by-step corridor walkthroughs and photos guiding students, staff, and visitors from major campus access points directly to classrooms, laboratories, seminar halls, and departments.

---

## ✨ Features & Redesign Highlights

- **Visual Step-by-Step Walkthroughs**: Sequential photo paths showing each corridor turn, landmark, and doorway leading to the target room.
- **Multi-Access Point Routing**: Switch between starting points (e.g. *Point A*, *Point B*, *Point C [staircase near Mech Dept]*).
- **Fast Instant Search**: Real-time live search with fuzzy matching across room numbers, lab names, and department keywords.
- **Floor & Block Filters**: Rapidly filter destinations by floor (Basement & Ground, Floors 1–5, Mechanical Block, Specialized Labs).
- **Tour Mode**: Auto-play button that animates through the corridor photo path like a personal navigator.
- **Interactive Thumbnail Dock**: Quick-jump dock showing all steps along the route at a glance.
- **Dark & Light Mode**: Theme toggle with glassmorphism UI, modern typography (*Plus Jakarta Sans* & *Outfit*), and ambient gradients.
- **Zero-Latency Offline / Online Architecture**: Pre-indexed catalog (`rooms_data.js` / `rooms_data.json`) with fallback to GitHub CDN.
- **Direct Link Sharing & Route Copy**: One-click sharing with deep link URLs (`?room=205`) and formatted direction copy.

---

## 🚀 Getting Started

### 1. Web Application (Zero Dependencies)
Simply open [`index.html`](index.html) in any modern web browser, or serve it using any static server:
```bash
# Using Node / npx
npx serve .

# Or open directly in your browser:
# double-click index.html
```

### 2. Streamlit Application
```bash
pip install -r requirements.txt
streamlit run check_no_api.py
```

---

## 📂 Repository Structure

- [`index.html`](index.html): Modern web application with responsive Swiper 11 carousel, live search, floor filters, and dark/light mode.
- [`rooms_data.js`](rooms_data.js): Pre-indexed room directory and photo manifest for instant loading.
- [`rooms_data.json`](rooms_data.json): Machine-readable catalog of all 62 campus rooms, floors, access points, and route notes.
- [`check_no_api.py`](check_no_api.py): Redesigned Streamlit application with custom styling and floor navigation.
- [`Rooms/`](Rooms/): Campus photo directories organized by room number and starting access point.
- [`logo_locorom.png`](logo_locorom.png): Official Locorom MITM branding asset.
