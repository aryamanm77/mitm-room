# MIT Maps • Indoor Campus Navigation
**Maharaja Institute of Technology Mysore**

[![Streamlit App](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://locorom.streamlit.app/)

**MIT Maps** is the official indoor visual wayfinding and destination locator built for **Maharaja Institute of Technology Mysore (MIT Mysore)**. It provides step-by-step corridor walkthroughs and photos guiding students, staff, and visitors from campus access points directly to classrooms, laboratories, seminar halls, and departments.

---

## ✨ Features & Architecture

- **Institutional College Portal**: Initial selection screen allowing visitors to choose between **Engineering (BE/B.Tech)**, **MBA**, **MCA**, **BCA**, and **Pharmacy**, entering that specific college block directly.
- **Dedicated College Directories**:
  - **Engineering**: 60 classrooms & research labs (CSE, ISE, ECE, Mechanical, Civil, AI/ML) across 5 floors.
  - **MBA & MCA**: Department of MBA & MCA block featuring **Belaku (ಬೆಳಕು)**, seminar halls, and faculty suites.
  - **BCA & Pharmacy**: Mapped blocks ready for classroom additions.
- **Visual Turn-by-Turn Walkthroughs**: Sequential corridor photos showing every turn, staircase, and doorway leading to the room.
- **Google Maps Design System**: Clean aesthetic featuring `#0b57d0` primary styling, rounded pill controls (`border-radius: 20px`), subtle elevation shadows, and Google Sans typography.
- **Multi-Access Point Routing**: Switch between starting staircases (e.g. *Point A*, *Point B*, *Point C [Mech Dept]*).
- **Hands-Free Voice Search**: Speak room numbers or lab names naturally (e.g. "Room 205", "Belaku", "DSP Lab").
- **Direct WhatsApp Sharing**: Send exact room routes directly to WhatsApp (`wa.me`) with a single click.
- **Light & Dark Theme**: Google Maps inspired theme toggle with smooth transitions.

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
- [`app.js`](app.js): Core application logic, routing, voice search, college filtering, and photo navigation.
- [`rooms_data.js`](rooms_data.js): Pre-indexed room catalog and photo manifest for instant loading.
- [`rooms_data.json`](rooms_data.json): Machine-readable directory of campus rooms, colleges, and access points.
- [`logo.png`](logo.png) / [`mitm_logo.jpg`](mitm_logo.jpg): Official Maharaja Institute of Technology Mysore round seal emblem.
- [`Rooms/`](Rooms/): Campus photo directories organized by room number and starting access point (including `Rooms/Belaku/`).
