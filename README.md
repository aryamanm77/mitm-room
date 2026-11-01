# MITM Navigo • Indoor Campus Navigation
**Maharaja Institute of Technology Mysore**

[![Streamlit App](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://locorom.streamlit.app/)

**MITM Navigo** is the official indoor visual wayfinding and destination locator built for **Maharaja Institute of Technology Mysore (MIT Mysore)**. It provides step-by-step corridor walkthroughs and photos guiding students, staff, and visitors from campus access points directly to classrooms, laboratories, seminar halls, and departments.

---

## ✨ Features & Architecture

- **Multi-Mode Campus Wayfinding Hub**: Choose between **Academic Wings**, **Floor-by-Floor Matrix**, and **Popular Hotspots** with instant 1-tap navigation.
- **Universal Instant Teleport Search**: Real-time autocomplete suggestions across all 68 rooms campus-wide with direct corridor launch.
- **Dedicated College Directories**:
  - **Engineering**: 60 classrooms & research labs (CSE, ISE, ECE, Mechanical, Civil, AI/ML) across 6 floors.
  - **MBA & MCA**: Standalone block featuring **Belaku (ಬೆಳಕು)** auditorium, Board Room 2, and Staff Room 1.
  - **BCA & Pharmacy**: Mapped computing suites and pharmaceutical sciences blocks.
- **Visual Turn-by-Turn Walkthroughs**: Sequential corridor photos showing every turn, staircase, and doorway leading to the room.
- **High-Performance Image Preloader**: Adjacent photo background caching and non-destructive DOM media swapping for zero-latency walkthrough transitions.
- **Multi-Access Point Routing**: Switch between starting staircases (e.g. *Point A*, *Point B*, *Point C [Mech Dept]*).
- **Instant Teleport Search**: Real-time autocomplete suggestions across all 68 rooms campus-wide with direct corridor launch.
- **Direct WhatsApp Sharing**: Send exact room routes directly to WhatsApp (`wa.me`) with a single click.
- **Clean Light Mode**: Crisp, high-contrast light theme locked against horizontal wobble and screen drift across mobile and desktop.

---

## 🚀 Getting Started

### Web Application (Zero Dependencies)
Simply open [`index.html`](index.html) in any modern browser, or run a local server:
```bash
# Using Node / npx
npx serve .

# Or Python
python -m http.server 8000
```

---

## 📂 Repository Structure

- [`index.html`](index.html): Modern web application with College Selection Portal, room finder, and photo walkthrough viewer.
- [`app.js`](app.js): Core application logic, routing, college filtering, and photo navigation.
- [`rooms_data.js`](rooms_data.js): Pre-indexed room catalog and photo manifest for instant loading.
- [`rooms_data.json`](rooms_data.json): Machine-readable directory of campus rooms, colleges, and access points.
- [`logo.png`](logo.png) / [`mitm_logo.jpg`](mitm_logo.jpg): Official Maharaja Institute of Technology Mysore round seal emblem.
- [`Rooms/`](Rooms/): Campus photo directories organized by room number and starting access point (including `Rooms/Belaku/`).
