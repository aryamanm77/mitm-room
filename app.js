/**
 * MITM Navigo — Indoor Campus Navigation | MIT Mysore
 * Official Indoor Wayfinding, Voice Search, WhatsApp Direct Share & Corridor Photo Walkthroughs
 * Maharaja Institute of Technology Mysore (Engineering, MBA, MCA, BCA, Pharmacy)
 */

const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/aryamanm77/mitm-room/main/";

const state = {
  rooms: {},
  roomKeys: [],
  activeFloor: "all",
  activeCollege: null, // null (Portal Screen) | "engineering" | "mba" | "mca" | "bca" | "pharmacy"
  searchQuery: "",
  selectedRoomKey: null,
  activeApIndex: 0,
  activePhotoIndex: 0,
  isPlaying: false,
  playTimer: null,
  recentRooms: ["102", "Belaku", "205", "114", "213 DSP lab"],
};

// ============================================================================
// URL & MEDIA HELPERS
// ============================================================================
function resolveMediaUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return path.split("/").map(seg => encodeURIComponent(seg)).join("/");
}

function resolveFallbackCdnUrl(path) {
  if (!path) return "";
  return GITHUB_RAW_BASE + path.split("/").map(seg => encodeURIComponent(seg)).join("/");
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}


// Fast Preloading of Room Route Media into Browser Cache
function preloadRoomMedia(room) {
  if (!room) return;
  const routes = getRoutesForRoom(room);
  routes.forEach(route => {
    (route.photos || []).forEach(src => {
      const img = new Image();
      img.decoding = "async";
      img.src = resolveMediaUrl(src);
    });
  });
}

function friendlyStairName(rawName) {
  if (!rawName) return "Main Entrance";
  if (rawName.includes("Point A")) return "Point A (Admission Staircase)";
  if (rawName.includes("Point B")) return "Point B (Central Staircase)";
  if (rawName.includes("Point C")) return "Point C (Mech Dept Staircase)";
  return rawName;
}

function getRoutesForRoom(room) {
  if (!room) return [];
  if (room.accessPoints && room.accessPoints.length > 0) {
    return room.accessPoints.map(ap => ({
      name: ap.name,
      label: friendlyStairName(ap.name),
      info: ap.info || room.info || `Follow the walkthrough steps to reach Room ${room.name}.`,
      photos: (ap.photos && ap.photos.length > 0)
        ? ap.photos
        : (room.photos && room.photos.length > 0 ? room.photos : (ap.thumbnail ? [ap.thumbnail] : []))
    }));
  }
  const photos = Array.isArray(room.photos) ? room.photos : (room.photos ? [room.photos] : []);
  return [
    {
      name: "Main Route",
      label: "Main Corridor Route",
      info: room.info || room.landmark || `Follow the corridor photos to reach Room ${room.name}.`,
      photos: photos.length > 0 ? photos : (room.thumbnail ? [room.thumbnail] : [])
    }
  ];
}

// ============================================================================
// COLLEGE & INSTITUTIONAL HELPERS
// ============================================================================
function getCollegeKeysForRoom(r) {
  if (!r) return ["engineering"];
  const college = (r.college || "Engineering").toLowerCase();
  const dept = (r.dept || "").toLowerCase();
  const name = (r.name || "").toLowerCase();

  // 1. Authoritative college / department classification
  if (college.includes("mca") || (dept.includes("mca") && !dept.includes("mba"))) return ["mca"];
  if (college.includes("mba") || (dept.includes("mba") && !dept.includes("mca"))) return ["mba"];
  if (college.includes("bca") || dept.includes("bca")) return ["bca"];
  if (college.includes("pharmacy") || college.includes("pharma") || dept.includes("pharmacy")) return ["pharmacy"];

  // 2. Name-based heuristics fallback
  if (name.includes("mca")) return ["mca"];
  if (name.includes("mba")) return ["mba"];
  if (name.includes("bca")) return ["bca"];
  if (name.includes("pharmacy") || name.includes("pharma")) return ["pharmacy"];

  return ["engineering"];
}

function roomMatchesCollege(r, collegeKey) {
  if (!collegeKey || collegeKey === "all") return true;
  const keys = getCollegeKeysForRoom(r);
  return keys.includes(collegeKey.toLowerCase());
}

function getCollegeMeta(collegeKey) {
  switch (collegeKey) {
    case "mba":
      return {
        name: "Department of MBA",
        badge: "Management Block • Belaku",
        heroQuery: "Search MBA classrooms & labs (e.g. Belaku, 201, Room 2)...",
      };
    case "mca":
      return {
        name: "Department of MCA",
        badge: "Postgraduate IT Block • MCA Classrooms & Labs",
        heroQuery: "Search MCA classrooms & labs (e.g. MCA LH 1, MCA LH 4, MCA Lab 1)...",
      };
    case "bca":
      return {
        name: "Department of BCA",
        badge: "Undergraduate IT Wing",
        heroQuery: "Search BCA classrooms & labs (e.g. Room 201 - 211, Lab 1 & 2)...",
      };
    case "pharmacy":
      return {
        name: "Faculty of Pharmaceutical Sciences",
        badge: "Health Sciences Block",
        heroQuery: "Search Pharmacy & Chemistry laboratories...",
      };
    case "engineering":
    default:
      return {
        name: "Engineering Campus",
        badge: "Main Academic Block • 60+ Classrooms & Labs",
        heroQuery: "Search engineering rooms (e.g. 205, 313, DSP Lab, 114)...",
      };
  }
}

// Build Direct WhatsApp Share URL (wa.me) for an exact room and starting route
function buildWhatsAppShareUrl(roomKey, apIndex = 0) {
  const room = state.rooms[roomKey];
  if (!room) return "https://wa.me/";
  const routes = getRoutesForRoom(room);
  const route = routes[apIndex] || routes[0];
  const titleLabel = room.name.length <= 5 ? `Room ${room.name}` : room.name;

  const deepLinkUrl = new URL(window.location.origin + window.location.pathname);
  if (state.activeCollege) deepLinkUrl.searchParams.set("college", state.activeCollege);
  deepLinkUrl.searchParams.set("room", roomKey);
  if (apIndex > 0) {
    deepLinkUrl.searchParams.set("ap", String(apIndex));
  }

  const directionsSentence = route?.info || room.info || room.landmark || "Follow walkthrough photos.";
  const message = [
    `*MIT Maps — ${titleLabel}*`,
    `College: ${room.college || "Maharaja Institute of Technology Mysore"}`,
    `Floor: ${room.floor}${room.dept ? " · " + room.dept : ""}`,
    `Route (${route ? route.label : "Main Route"}): ${directionsSentence}`,
    `Open exact room walkthrough: ${deepLinkUrl.toString()}`
  ].join("\n");

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

// ============================================================================
// APP INITIALIZATION
// ============================================================================
async function initApp() {
  // Permanent Light Mode
  document.documentElement.setAttribute("data-theme", "light");
  localStorage.setItem("locorom_theme", "light");

  // Register PWA Service Worker for standalone installation & caching
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(() => {});
  }

  try {
    const savedRecents = JSON.parse(localStorage.getItem("locorom_recent_rooms") || "null");
    if (Array.isArray(savedRecents) && savedRecents.length > 0) {
      state.recentRooms = savedRecents;
    }
  } catch (e) {}

  if (window.LOCOROM_DATA && Object.keys(window.LOCOROM_DATA).length > 0) {
    state.rooms = window.LOCOROM_DATA;
  } else {
    try {
      const res = await fetch("rooms_data.json");
      state.rooms = await res.json();
    } catch (e) {
      console.error("Could not load rooms data:", e);
    }
  }

  state.roomKeys = Object.keys(state.rooms).sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
    return a.localeCompare(b);
  });

  bindEvents();

  // URL Deep-Linking & Initial View Routing
  const params = new URLSearchParams(window.location.search);
  const urlRoom = params.get("room");
  const urlCollege = params.get("college");
  const urlAp = parseInt(params.get("ap") || "0", 10);

  if (urlRoom && state.rooms[urlRoom]) {
    const room = state.rooms[urlRoom];
    const collegeKeys = getCollegeKeysForRoom(room);
    state.activeCollege = (urlCollege && collegeKeys.includes(urlCollege.toLowerCase()))
      ? urlCollege.toLowerCase()
      : collegeKeys[0];
    openRoom(urlRoom, false, isNaN(urlAp) ? 0 : urlAp);
  } else if (urlCollege && ["engineering", "mba", "mca", "bca", "pharmacy"].includes(urlCollege.toLowerCase())) {
    enterCollege(urlCollege.toLowerCase(), false);
  } else {
    showPortalView(false);
  }
}

function updateThemeButtonLabel() {
  const theme = document.documentElement.getAttribute("data-theme") || "light";
  const label = document.getElementById("themeToggleLabel");
  if (label) {
    label.textContent = theme === "dark" ? "Light Mode" : "Dark Mode";
  }
}

function showToast(msg) {
  const host = document.getElementById("toastHost");
  if (!host) return;
  const el = document.createElement("div");
  el.className = "toast-msg";
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 180);
  }, 2200);
}

// ============================================================================
// SCREEN 0: COLLEGE SELECTION PORTAL
// ============================================================================
function showPortalView(pushHistory = true) {
  setTimeout(init3DTiltAndSpotlight, 50);
  stopAutoPlay();
  state.selectedRoomKey = null;
  state.activeCollege = null;

  const portalScreen = document.getElementById("collegePortalScreen");
  const homeScreen = document.getElementById("homeScreen");
  const walkthroughScreen = document.getElementById("walkthroughScreen");
  const topFloorNav = document.getElementById("topFloorNav");

  if (portalScreen) portalScreen.style.display = "block";
  if (homeScreen) homeScreen.style.display = "none";
  if (walkthroughScreen) walkthroughScreen.style.display = "none";
  if (topFloorNav) topFloorNav.style.display = "none";

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (pushHistory) {
    const url = new URL(window.location.href);
    url.searchParams.delete("college");
    url.searchParams.delete("room");
    url.searchParams.delete("ap");
    window.history.pushState({}, "", url.pathname);
  }
}

// ============================================================================
// SCREEN 1: DEDICATED COLLEGE ROOM FINDER
// ============================================================================
function enterCollegeWithFloor(collegeKey, floorKey) {
  enterCollege(collegeKey);
  if (floorKey) {
    state.activeFloor = floorKey;
    syncFloorNavButtons();
    renderRoomsGrid();
  }
}

function enterCollege(collegeKey, pushHistory = true) {
  stopAutoPlay();
  state.selectedRoomKey = null;
  state.activeCollege = collegeKey || "engineering";
  preloadCollegeThumbnails(state.activeCollege);
  state.searchQuery = "";
  state.activeFloor = "all";

  const portalScreen = document.getElementById("collegePortalScreen");
  const homeScreen = document.getElementById("homeScreen");
  const walkthroughScreen = document.getElementById("walkthroughScreen");
  const topFloorNav = document.getElementById("topFloorNav");

  if (portalScreen) portalScreen.style.display = "none";
  if (homeScreen) homeScreen.style.display = "block";
  if (walkthroughScreen) walkthroughScreen.style.display = "none";
  if (topFloorNav) topFloorNav.style.display = "flex";

  // Update Active College Banner UI
  const meta = getCollegeMeta(state.activeCollege);
  const collegeNameEl = document.getElementById("activeCollegeName");
  const collegeBadgeEl = document.getElementById("activeCollegeBadge");
  const searchInput = document.getElementById("mainSearchInput");
  const clearSearchBtn = document.getElementById("clearSearchBtn");

  if (collegeNameEl) collegeNameEl.textContent = meta.name;
  if (collegeBadgeEl) collegeBadgeEl.textContent = meta.badge;
  if (searchInput) {
    searchInput.value = "";
    searchInput.placeholder = meta.heroQuery;
  }
  if (clearSearchBtn) clearSearchBtn.style.display = "none";

  // Sync quick switcher chips
  document.querySelectorAll("[data-switch-college]").forEach(chip => {
    chip.classList.toggle("active", chip.getAttribute("data-switch-college") === state.activeCollege);
  });

  syncFloorNavButtons();
  renderQuickRecents();
  renderRoomsGrid();

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (pushHistory) {
    const url = new URL(window.location.href);
    url.searchParams.set("college", state.activeCollege);
    url.searchParams.delete("room");
    url.searchParams.delete("ap");
    window.history.pushState({}, "", url.toString());
  }
}

function showHomeView(pushHistory = true) {
  if (state.activeCollege) {
    enterCollege(state.activeCollege, pushHistory);
  } else {
    showPortalView(pushHistory);
  }
}

function renderQuickRecents() {
  const wrap = document.getElementById("quickChipsRow");
  if (!wrap) return;

  // Filter recents to rooms belonging to current college
  const currentCollege = state.activeCollege || "engineering";
  const valid = state.recentRooms
    .filter(k => state.rooms[k] && roomMatchesCollege(state.rooms[k], currentCollege))
    .slice(0, 6);

  if (valid.length === 0) {
    wrap.style.display = "none";
    return;
  }
  wrap.style.display = "flex";
  wrap.innerHTML = `<span class="quick-label">Quick jump:</span>` +
    valid.map(k => `<button type="button" class="quick-link" data-open-room="${escapeHtml(k)}">${escapeHtml(k)}</button>`).join("<span class='dot-sep'>·</span>");

  wrap.querySelectorAll("[data-open-room]").forEach(btn => {
    btn.addEventListener("click", () => openRoom(btn.getAttribute("data-open-room")));
  });
}


function preloadCollegeThumbnails(collegeKey) {
  if (!state.roomKeys) return;
  const keys = state.roomKeys.filter(k => roomMatchesCollege(state.rooms[k], collegeKey));
  keys.slice(0, 25).forEach(k => {
    const r = state.rooms[k];
    const thumb = r.thumbnail || (r.photos && r.photos[0]);
    if (thumb) {
      const img = new Image();
      img.decoding = "async";
      img.src = resolveMediaUrl(thumb);
    }
  });
}

function renderRoomsGrid() {
  const grid = document.getElementById("roomsGrid");
  const countLabel = document.getElementById("resultsCountLabel");
  if (!grid) return;

  const q = state.searchQuery.trim().toLowerCase();
  const floor = state.activeFloor;
  const currentCollege = state.activeCollege || "engineering";

  const filtered = state.roomKeys.filter(key => {
    const r = state.rooms[key];
    if (!r) return false;

    // Strict College Match: Only show rooms belonging to current college
    if (!roomMatchesCollege(r, currentCollege)) {
      return false;
    }

    let floorMatch = true;
    if (floor === "ground") {
      floorMatch = r.floor.toLowerCase().includes("ground") || r.floor.toLowerCase().includes("lab");
    } else if (floor === "4-5") {
      floorMatch = r.floor.includes("4") || r.floor.includes("5");
    } else if (floor !== "all") {
      floorMatch = r.floor.toLowerCase().includes(floor.toLowerCase());
    }

    if (!q) return floorMatch;
    const textBlob = [
      r.name,
      r.floor,
      r.dept,
      r.category,
      r.landmark,
      r.info,
      ...(r.accessPoints || []).map(a => `${a.name} ${a.info}`)
    ].join(" ").toLowerCase();

    return floorMatch && textBlob.includes(q);
  });

  if (countLabel) {
    countLabel.textContent = `${filtered.length} ${filtered.length === 1 ? "destination" : "destinations"} in ${getCollegeMeta(currentCollege).name}`;
  }

  if (filtered.length === 0) {
    const meta = getCollegeMeta(currentCollege);
    grid.innerHTML = `
      <div class="empty-box">
        <svg viewBox="0 0 24 24" class="icon-svg" style="width: 42px; height: 42px; color: var(--color-primary); margin-bottom: 12px;"><path fill="none" stroke="currentColor" stroke-width="2" d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v4M12 14v4M16 14v4"/></svg>
        <h3>${state.searchQuery ? `No rooms matching "${escapeHtml(state.searchQuery)}"` : `${meta.name} Directory Ready`}</h3>
        <p>${state.searchQuery ? "Try searching by room number (e.g. 205, 114, Belaku) or check your spelling." : `This academic block is active and ready for room coordinates and corridor photo paths. You can explore other college blocks or contribute new rooms anytime.`}</p>
        <div class="empty-actions">
          <button type="button" class="button-primary-filled" id="emptyChangeCollegeBtn">← Switch College</button>
          ${currentCollege !== "engineering" ? '<button type="button" class="button-outlined" id="emptyExploreEngBtn">Explore Engineering (60 Rooms)</button>' : ''}
        </div>
      </div>
    `;
    document.getElementById("emptyChangeCollegeBtn")?.addEventListener("click", () => showPortalView());
    document.getElementById("emptyExploreEngBtn")?.addEventListener("click", () => enterCollege("engineering"));
    return;
  }

  grid.innerHTML = filtered.map(key => {
    const r = state.rooms[key];
    const routes = getRoutesForRoom(r);
    const firstRoute = routes[0];
    const stepCount = firstRoute && firstRoute.photos ? firstRoute.photos.length : 0;
    const thumbPath = r.thumbnail || (firstRoute && firstRoute.photos && firstRoute.photos[0]) || "";
    const thumbUrl = resolveMediaUrl(thumbPath);
    const cdnUrl = resolveFallbackCdnUrl(thumbPath);
    const isVideo = /\.(mp4|webm)$/i.test(thumbPath);
    const hint = (firstRoute && firstRoute.info) ? firstRoute.info : (r.landmark || r.dept || "Tap to view step-by-step photos");
    const waUrl = buildWhatsAppShareUrl(key, 0);

    return `
      <article class="room-card" data-room-key="${escapeHtml(key)}">
        <div class="room-card-thumb">
          ${thumbUrl && !isVideo
            ? `<img src="${thumbUrl}" alt="Room ${escapeHtml(r.name)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="if(!this.dataset.cdn){this.dataset.cdn='1';this.src='${cdnUrl}';}else{this.style.display='none';}" />`
            : `<div class="thumb-placeholder">Room ${escapeHtml(r.name)}</div>`
          }
        </div>
        <div class="room-card-content">
          <div class="room-card-meta">
            <span class="room-college-badge">${escapeHtml(r.college || "Engineering")}</span>
            <span aria-hidden="true">·</span>
            <span>${escapeHtml(r.floor)}</span>
            <span aria-hidden="true">·</span>
            <span class="tabular-nums">${stepCount} ${stepCount === 1 ? "photo" : "photos"}</span>
          </div>
          <div class="room-card-title-row">
            <h3 class="room-card-title">${escapeHtml(r.name.length <= 5 ? "Room " + r.name : r.name)}</h3>
            <a
              href="${waUrl}"
              target="_blank"
              rel="noopener noreferrer"
              class="card-wa-share"
              data-wa-stop-prop="true"
              title="Share Room ${escapeHtml(r.name)} on WhatsApp"
              aria-label="Share Room ${escapeHtml(r.name)} on WhatsApp"
            >
              <svg class="icon-svg" viewBox="0 0 24 24" style="width:15px;height:15px;">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
            </a>
          </div>
          <p class="room-card-hint">${escapeHtml(hint)}</p>
        </div>
      </article>
    `;
  }).join("");

  grid.querySelectorAll("[data-wa-stop-prop]").forEach(link => {
    link.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  });

  grid.querySelectorAll("[data-room-key]").forEach(card => {
    card.addEventListener("click", () => {
      openRoom(card.getAttribute("data-room-key"));
    });
  });
}

// ============================================================================
// SCREEN 2: WALKTHROUGH VIEW
// ============================================================================
function openRoom(roomKey, pushHistory = true, initialApIdx = 0) {
  const room = state.rooms[roomKey];
  if (!room) return;

  // Sync active college with room if not set or incompatible
  const roomColleges = getCollegeKeysForRoom(room);
  if (!state.activeCollege || !roomColleges.includes(state.activeCollege)) {
    state.activeCollege = roomColleges[0];
  }

  stopAutoPlay();
  state.selectedRoomKey = roomKey;
  preloadRoomMedia(room);
  state.activeApIndex = initialApIdx;
  state.activePhotoIndex = 0;

  recordRecentRoom(roomKey);

  const portalScreen = document.getElementById("collegePortalScreen");
  const homeScreen = document.getElementById("homeScreen");
  const walkthroughScreen = document.getElementById("walkthroughScreen");
  const topFloorNav = document.getElementById("topFloorNav");

  if (portalScreen) portalScreen.style.display = "none";
  if (homeScreen) homeScreen.style.display = "none";
  if (walkthroughScreen) walkthroughScreen.style.display = "block";
  if (topFloorNav) topFloorNav.style.display = "none";

  window.scrollTo(0, 0);

  if (pushHistory) {
    const url = new URL(window.location.href);
    if (state.activeCollege) url.searchParams.set("college", state.activeCollege);
    url.searchParams.set("room", roomKey);
    if (initialApIdx > 0) url.searchParams.set("ap", String(initialApIdx));
    else url.searchParams.delete("ap");
    window.history.pushState({ room: roomKey, ap: initialApIdx }, "", url.toString());
  }

  renderWalkthroughView();
}

function recordRecentRoom(roomKey) {
  state.recentRooms = [roomKey, ...state.recentRooms.filter(k => k !== roomKey)].slice(0, 6);
  try {
    localStorage.setItem("locorom_recent_rooms", JSON.stringify(state.recentRooms));
  } catch (e) {}
}

function renderWalkthroughView() {
  const room = state.rooms[state.selectedRoomKey];
  if (!room) return;

  const routes = getRoutesForRoom(room);
  if (state.activeApIndex >= routes.length) state.activeApIndex = 0;
  const currentRoute = routes[state.activeApIndex] || routes[0];
  const photos = currentRoute.photos || [];

  // Title & Unboxed Metadata
  document.getElementById("wtRoomTitle").textContent =
    room.name.length <= 5 ? `Room ${room.name}` : room.name;

  document.getElementById("wtRoomMeta").innerHTML = `
    <span class="room-college-badge">${escapeHtml(room.college || "Engineering Campus")}</span>
    <span aria-hidden="true">·</span>
    <span>${escapeHtml(room.floor)}</span>
    <span aria-hidden="true">·</span>
    <span>${escapeHtml(room.dept || "Campus Destination")}</span>
    <span aria-hidden="true">·</span>
    <span class="tabular-nums">${photos.length} walkthrough steps</span>
  `;

  // Update Direct WhatsApp Share Link for this exact room and selected staircase
  const waLinkEl = document.getElementById("wtWhatsappLink");
  if (waLinkEl) {
    waLinkEl.href = buildWhatsAppShareUrl(state.selectedRoomKey, state.activeApIndex);
  }

  // Starting Point Switcher
  const apWrap = document.getElementById("wtStairSwitcherWrap");
  const apButtons = document.getElementById("wtStairButtons");
  if (routes.length > 1) {
    apWrap.style.display = "flex";
    apButtons.innerHTML = routes.map((rt, idx) => `
      <button type="button" class="stair-tab-btn ${idx === state.activeApIndex ? "active" : ""}" data-ap-idx="${idx}">
        ${escapeHtml(rt.label)}
      </button>
    `).join("");

    apButtons.querySelectorAll("[data-ap-idx]").forEach(btn => {
      btn.addEventListener("click", () => {
        stopAutoPlay();
        state.activeApIndex = parseInt(btn.getAttribute("data-ap-idx"), 10);
        state.activePhotoIndex = 0;
        const url = new URL(window.location.href);
        if (state.activeCollege) url.searchParams.set("college", state.activeCollege);
        url.searchParams.set("room", state.selectedRoomKey);
        if (state.activeApIndex > 0) url.searchParams.set("ap", String(state.activeApIndex));
        else url.searchParams.delete("ap");
        window.history.replaceState({ room: state.selectedRoomKey, ap: state.activeApIndex }, "", url.toString());
        renderWalkthroughView();
      });
    });
  } else {
    apWrap.style.display = "none";
  }

  // Plain-English Directions Callout
  document.getElementById("wtDirectionFrom").textContent = `How to walk from ${currentRoute.label}:`;
  document.getElementById("wtDirectionText").textContent =
    currentRoute.info || room.info || room.landmark || `Follow the photos step-by-step to reach Room ${room.name}.`;

  renderActiveStepPhoto();
}

function renderActiveStepPhoto() {
  const room = state.rooms[state.selectedRoomKey];
  if (!room) return;
  const routes = getRoutesForRoom(room);
  const currentRoute = routes[state.activeApIndex] || routes[0];
  const photos = currentRoute.photos || [];

  const stage = document.getElementById("wtPhotoStage");
  const stepCounter = document.getElementById("wtStepCounter");
  const progressFill = document.getElementById("wtProgressBarFill");
  const thumbsRow = document.getElementById("wtThumbsRow");
  const prevBtn = document.getElementById("wtPrevBtn");
  const nextBtn = document.getElementById("wtNextBtn");

  if (photos.length === 0) {
    stepCounter.textContent = "Directions available";
    progressFill.style.width = "100%";
    stage.innerHTML = `<div class="no-photo-msg">Written directions are shown above. Follow the signs to reach Room ${escapeHtml(room.name)}.</div>`;
    thumbsRow.innerHTML = "";
    return;
  }

  if (state.activePhotoIndex >= photos.length) state.activePhotoIndex = 0;
  if (state.activePhotoIndex < 0) state.activePhotoIndex = photos.length - 1;

  const idx = state.activePhotoIndex;
  const total = photos.length;
  const currentFile = photos[idx];
  const url = resolveMediaUrl(currentFile);
  const cdnUrl = resolveFallbackCdnUrl(currentFile);
  const isVideo = /\.(mp4|webm)$/i.test(currentFile);

  const stepTag = idx === 0 ? "Start" : idx === total - 1 ? "Destination Reached" : `Corridor Step`;
  stepCounter.textContent = `Step ${idx + 1} of ${total} · ${stepTag}`;
  progressFill.style.width = `${((idx + 1) / total) * 100}%`;

  if (prevBtn) prevBtn.disabled = total <= 1;
  if (nextBtn) nextBtn.disabled = total <= 1;

  if (isVideo) {
    stage.innerHTML = `<video src="${url}" controls autoplay muted loop playsinline class="wt-main-media" onerror="if(!this.dataset.cdn){this.dataset.cdn='1';this.src='${cdnUrl}';}"></video>`;
  } else {
    let mainImg = stage.querySelector("img.wt-main-media");
    if (!mainImg) {
      stage.innerHTML = `
        <img
          src="${url}"
          alt="Step ${idx + 1} towards Room ${escapeHtml(room.name)}"
          class="wt-main-media"
          decoding="async"
          referrerpolicy="no-referrer"
          onerror="if(!this.dataset.cdn){this.dataset.cdn='1';this.src='${cdnUrl}';}"
        />
      `;
    } else {
      mainImg.src = url;
      mainImg.alt = `Step ${idx + 1} towards Room ${escapeHtml(room.name)}`;
    }
  }

  // Render or update clickable step thumbnails without destroying DOM
  const currentKeyAp = `${state.selectedRoomKey}-${state.activeApIndex}`;
  if (thumbsRow.dataset.roomAp !== currentKeyAp) {
    thumbsRow.dataset.roomAp = currentKeyAp;
    thumbsRow.innerHTML = photos.map((p, i) => {
      const u = resolveMediaUrl(p);
      const cUrl = resolveFallbackCdnUrl(p);
      const isVid = /\.(mp4|webm)$/i.test(p);
      return `
        <button type="button" class="step-thumb-btn ${i === idx ? "active" : ""}" data-step-idx="${i}">
          ${isVid
            ? `<span class="vid-label">Video</span>`
            : `<img src="${u}" alt="Step ${i + 1}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="if(!this.dataset.cdn){this.dataset.cdn='1';this.src='${cUrl}';}" />`
          }
          <span class="step-thumb-num tabular-nums">${i + 1}</span>
        </button>
      `;
    }).join("");

    thumbsRow.querySelectorAll("[data-step-idx]").forEach(btn => {
      btn.addEventListener("click", () => {
        state.activePhotoIndex = parseInt(btn.getAttribute("data-step-idx"), 10);
        renderActiveStepPhoto();
      });
    });
  } else {
    thumbsRow.querySelectorAll(".step-thumb-btn").forEach((btn, i) => {
      btn.classList.toggle("active", i === idx);
    });
  }

  const activeThumb = thumbsRow.querySelector(".step-thumb-btn.active");
  if (activeThumb) {
    activeThumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }

  // Preload adjacent steps immediately
  if (total > 1) {
    const nextFile = photos[(idx + 1) % total];
    const prevFile = photos[(idx - 1 + total) % total];
    if (nextFile) {
      const p1 = new Image();
      p1.decoding = "async";
      p1.src = resolveMediaUrl(nextFile);
    }
    if (prevFile) {
      const p2 = new Image();
      p2.decoding = "async";
      p2.src = resolveMediaUrl(prevFile);
    }
  }
}

function stepPhoto(delta) {
  const room = state.rooms[state.selectedRoomKey];
  if (!room) return;
  const routes = getRoutesForRoom(room);
  const currentRoute = routes[state.activeApIndex] || routes[0];
  const photos = currentRoute.photos || [];
  if (photos.length <= 1) return;

  state.activePhotoIndex = (state.activePhotoIndex + delta + photos.length) % photos.length;
  renderActiveStepPhoto();
}

function toggleAutoPlay() {
  if (state.isPlaying) {
    stopAutoPlay();
  } else {
    startAutoPlay();
  }
}

function startAutoPlay() {
  const room = state.rooms[state.selectedRoomKey];
  if (!room) return;
  const routes = getRoutesForRoom(room);
  const photos = (routes[state.activeApIndex] || routes[0]).photos || [];
  if (photos.length <= 1) return;

  state.isPlaying = true;
  const playBtn = document.getElementById("wtAutoPlayBtn");
  const playLabel = document.getElementById("wtAutoPlayLabel");
  if (playBtn) playBtn.classList.add("playing");
  if (playLabel) playLabel.textContent = "Pause";

  state.playTimer = setInterval(() => {
    stepPhoto(1);
  }, 1800);
}

function stopAutoPlay() {
  state.isPlaying = false;
  if (state.playTimer) {
    clearInterval(state.playTimer);
    state.playTimer = null;
  }
  const playBtn = document.getElementById("wtAutoPlayBtn");
  const playLabel = document.getElementById("wtAutoPlayLabel");
  if (playBtn) playBtn.classList.remove("playing");
  if (playLabel) playLabel.textContent = "Auto-Walk";
}

function syncFloorNavButtons() {
  document.querySelectorAll("[data-floor-filter]").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-floor-filter") === state.activeFloor);
  });
}

// ============================================================================
// EVENT LISTENERS & USER INTERACTIONS
// ============================================================================

// ============================================================================
// 3D KINETIC TILT & CURSOR SPOTLIGHT ENGINE (MITM NAVIGO)
// ============================================================================
function init3DTiltAndSpotlight() {
  const isPointerFine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!isPointerFine) return;

  const cards = document.querySelectorAll(".wing-card");
  cards.forEach(card => {
    let ticking = false;

    card.addEventListener("pointermove", (e) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const normX = (x / rect.width) - 0.5;
        const normY = (y / rect.height) - 0.5;

        const rotateY = normX * 9;
        const rotateX = -normY * 9;

        card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px) scale3d(1.015, 1.015, 1.015)`;
        card.style.setProperty("--mouse-x", `${x.toFixed(1)}px`);
        card.style.setProperty("--mouse-y", `${y.toFixed(1)}px`);
        ticking = false;
      });
    });

    card.addEventListener("pointerleave", () => {
      card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0) scale3d(1, 1, 1)";
    });
  });
}

function bindEvents() {
  init3DTiltAndSpotlight();

  // Navigation Mode Switcher (Wings / Floors / Hotspots)
  document.querySelectorAll("[data-nav-mode]").forEach(btn => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-nav-mode");
      document.querySelectorAll("[data-nav-mode]").forEach(b => b.classList.toggle("active", b === btn));

      const viewWings = document.getElementById("viewModeWings");
      const viewDepts = document.getElementById("viewModeDepartments");
      const viewHotspots = document.getElementById("viewModeHotspots");

      if (viewWings) viewWings.style.display = mode === "wings" ? "block" : "none";
      if (viewDepts) viewDepts.style.display = mode === "departments" ? "block" : "none";
      if (viewHotspots) viewHotspots.style.display = mode === "hotspots" ? "block" : "none";
    });
  });

  // Direct Room Launchers (Teleports directly to walkthrough from any mode!)
  document.addEventListener("click", (e) => {
    const directRoomBtn = e.target.closest("[data-direct-room]");
    if (directRoomBtn) {
      e.stopPropagation();
      e.preventDefault();
      const rKey = directRoomBtn.getAttribute("data-direct-room");
      if (rKey && state.rooms[rKey]) {
        openRoom(rKey);
      }
      return;
    }

    const directFloorBtn = e.target.closest("[data-direct-floor]");
    if (directFloorBtn) {
      e.stopPropagation();
      e.preventDefault();
      const floor = directFloorBtn.getAttribute("data-direct-floor");
      const col = directFloorBtn.getAttribute("data-for-college") || "engineering";
      enterCollegeWithFloor(col, floor);
      return;
    }

    const directColBtn = e.target.closest("[data-direct-college]");
    if (directColBtn) {
      e.stopPropagation();
      e.preventDefault();
      const col = directColBtn.getAttribute("data-direct-college");
      enterCollege(col);
      return;
    }
  });

  // Universal Instant Teleport Search Bar & Autocomplete Dropdown
  const portalSearch = document.getElementById("portalSearchInput");
  const portalDropdown = document.getElementById("portalSearchDropdown");

  if (portalSearch && portalDropdown) {
    portalSearch.addEventListener("input", () => {
      const q = portalSearch.value.trim().toLowerCase();
      if (!q) {
        portalDropdown.style.display = "none";
        portalDropdown.innerHTML = "";
        // Reset card filter
        document.querySelectorAll(".wing-card").forEach(c => c.style.display = "flex");
        return;
      }

      // Filter wing cards on wings tab
      document.querySelectorAll(".wing-card").forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(q) ? "flex" : "none";
      });

      // Find matching rooms campus-wide
      const matchedKeys = state.roomKeys.filter(k => {
        const r = state.rooms[k];
        if (!r) return false;
        const blob = [r.name, r.floor, r.dept, r.category, r.landmark, r.info].join(" ").toLowerCase();
        return blob.includes(q);
      }).slice(0, 8);

      if (matchedKeys.length === 0) {
        portalDropdown.innerHTML = `<div style="padding: 14px 18px; font-size: 13px; color: #5f6368; text-align: center;">No campus rooms matching "${escapeHtml(q)}"</div>`;
        portalDropdown.style.display = "block";
      } else {
        portalDropdown.innerHTML = matchedKeys.map(k => {
          const r = state.rooms[k];
          const title = r.name.length <= 5 ? `Room ${r.name}` : r.name;
          return `
            <div class="portal-suggest-item" data-direct-room="${escapeHtml(k)}">
              <div class="suggest-left">
                <span class="suggest-badge">${escapeHtml(k.slice(0, 3))}</span>
                <div>
                  <div class="suggest-name">${escapeHtml(title)}</div>
                  <div class="suggest-meta">${escapeHtml(r.dept || r.college || "")} • ${escapeHtml(r.floor || "")}</div>
                </div>
              </div>
              <button type="button" class="suggest-action">
                <span>Navigate &rarr;</span>
              </button>
            </div>
          `;
        }).join("");
        portalDropdown.style.display = "block";
      }
    });

    portalSearch.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const q = portalSearch.value.trim();
        const matched = findExactOrBestMatch(q);
        if (matched) {
          portalDropdown.style.display = "none";
          openRoom(matched);
        } else {
          const firstVisible = document.querySelector('.wing-card[style*="flex"], .wing-card:not([style*="display: none"])');
          if (firstVisible) {
            enterCollege(firstVisible.getAttribute("data-select-college"));
          }
        }
      }
    });

    // Close dropdown on outside click
    document.addEventListener("click", (e) => {
      if (!portalSearch.contains(e.target) && !portalDropdown.contains(e.target)) {
        portalDropdown.style.display = "none";
      }
    });
  }

  // Academic Wing Filter Chips (All Wings, Eng, MBA, MCA, BCA, Pharmacy)
  document.querySelectorAll("[data-portal-filter]").forEach(chip => {
    chip.addEventListener("click", () => {
      const filter = chip.getAttribute("data-portal-filter");
      document.querySelectorAll("[data-portal-filter]").forEach(c => c.classList.toggle("active", c === chip));

      document.querySelectorAll(".wing-card").forEach(card => {
        const cardCol = card.getAttribute("data-select-college");
        const show = (filter === "all" || cardCol === filter);
        card.style.display = show ? "flex" : "none";
      });
    });
  });

  // Wing Primary Enter Buttons
  document.querySelectorAll("[data-btn-college]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const col = btn.getAttribute("data-btn-college");
      enterCollege(col);
    });
  });



  // Wing Card Body Click -> Enter College
  document.querySelectorAll(".wing-card").forEach(card => {
    card.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      const col = card.getAttribute("data-select-college");
      enterCollege(col);
    });
  });

  // 1. College Selection Portal Cards -> Enter College Only
  document.querySelectorAll("[data-select-college]").forEach(card => {
    card.addEventListener("click", () => {
      const college = card.getAttribute("data-select-college");
      enterCollege(college);
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const college = card.getAttribute("data-select-college");
        enterCollege(college);
      }
    });
  });

  // 2. Change College Buttons -> Return to Portal
  document.getElementById("changeCollegeBtn")?.addEventListener("click", () => {
    showPortalView();
  });

  document.getElementById("topPortalBtn")?.addEventListener("click", () => {
    showPortalView();
  });

  document.getElementById("brandHomeLink")?.addEventListener("click", (e) => {
    e.preventDefault();
    showPortalView();
  });

  // 3. Quick Switch College Chips in Active College Bar
  document.querySelectorAll("[data-switch-college]").forEach(chip => {
    chip.addEventListener("click", () => {
      const college = chip.getAttribute("data-switch-college");
      enterCollege(college);
    });
  });

  // 4. Floor Filter Nav Buttons
  document.querySelectorAll("[data-floor-filter]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.activeFloor = btn.getAttribute("data-floor-filter");
      syncFloorNavButtons();
      renderRoomsGrid();
    });
  });

  // 5. Theme Toggle Button
  document.getElementById("themeToggleBtn")?.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("locorom_theme", next);
    updateThemeButtonLabel();
  });

  // 6. Search Input & Clear
  const searchInput = document.getElementById("mainSearchInput");
  const clearSearchBtn = document.getElementById("clearSearchBtn");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      state.searchQuery = searchInput.value;
      if (clearSearchBtn) {
        clearSearchBtn.style.display = searchInput.value ? "inline-flex" : "none";
      }
      renderRoomsGrid();
    });

    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const firstCard = document.querySelector("#roomsGrid [data-room-key]");
        if (firstCard) {
          openRoom(firstCard.getAttribute("data-room-key"));
        }
      }
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", () => {
      state.searchQuery = "";
      if (searchInput) {
        searchInput.value = "";
        searchInput.focus();
      }
      clearSearchBtn.style.display = "none";
      renderRoomsGrid();
    });
  }

  // 8. Walkthrough Screen Controls
  document.getElementById("wtBackBtn")?.addEventListener("click", () => {
    if (state.activeCollege) {
      enterCollege(state.activeCollege);
    } else {
      showPortalView();
    }
  });

  document.getElementById("wtPrevBtn")?.addEventListener("click", () => stepPhoto(-1));
  document.getElementById("wtNextBtn")?.addEventListener("click", () => stepPhoto(1));
  document.getElementById("wtStagePrev")?.addEventListener("click", () => stepPhoto(-1));
  document.getElementById("wtStageNext")?.addEventListener("click", () => stepPhoto(1));
  document.getElementById("wtAutoPlayBtn")?.addEventListener("click", toggleAutoPlay);

  document.getElementById("wtShareBtn")?.addEventListener("click", () => {
    if (!state.selectedRoomKey) return;
    const shareUrl = new URL(window.location.origin + window.location.pathname);
    if (state.activeCollege) shareUrl.searchParams.set("college", state.activeCollege);
    shareUrl.searchParams.set("room", state.selectedRoomKey);
    if (state.activeApIndex > 0) {
      shareUrl.searchParams.set("ap", String(state.activeApIndex));
    }
    navigator.clipboard.writeText(shareUrl.toString()).then(() => showToast("Exact room link copied!"));
  });

  // 9. Mobile Touch Swipe for Walkthrough Stage
  const stage = document.getElementById("wtPhotoStageWrap");
  if (stage) {
    let startX = 0;
    stage.addEventListener("touchstart", (e) => {
      startX = e.touches[0].clientX;
    }, { passive: true });
    stage.addEventListener("touchend", (e) => {
      const diff = e.changedTouches[0].clientX - startX;
      if (Math.abs(diff) > 40) {
        stepPhoto(diff > 0 ? -1 : 1);
      }
    }, { passive: true });
  }

  // 10. Global Keyboard Shortcuts
  window.addEventListener("keydown", (e) => {
    if (document.activeElement && document.activeElement.tagName === "INPUT") {
      if (e.key === "Escape") document.activeElement.blur();
      return;
    }

    if (e.key === "/") {
      e.preventDefault();
      if (state.selectedRoomKey) showHomeView(true);
      searchInput?.focus();
    } else if (state.selectedRoomKey) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        stepPhoto(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        stepPhoto(1);
      } else if (e.key === " ") {
        e.preventDefault();
        toggleAutoPlay();
      } else if (e.key === "Escape") {
        if (state.activeCollege) enterCollege(state.activeCollege);
        else showPortalView();
      }
    }
  });

  // 11. Browser Back / Forward (popstate)
  window.addEventListener("popstate", () => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get("room");
    const col = params.get("college");
    const apIdx = parseInt(params.get("ap") || "0", 10);

    if (r && state.rooms[r]) {
      const room = state.rooms[r];
      const collegeKeys = getCollegeKeysForRoom(room);
      state.activeCollege = (col && collegeKeys.includes(col.toLowerCase()))
        ? col.toLowerCase()
        : collegeKeys[0];
      openRoom(r, false, isNaN(apIdx) ? 0 : apIdx);
    } else if (col && ["engineering", "mba", "mca", "bca", "pharmacy"].includes(col.toLowerCase())) {
      enterCollege(col.toLowerCase(), false);
    } else {
      showPortalView(false);
    }
  });
}



function findExactOrBestMatch(query) {
  if (!query) return null;
  const q = query.trim().toLowerCase();
  const currentCollege = state.activeCollege || "engineering";

  // Check current college first
  const collegeKeys = state.roomKeys.filter(k => roomMatchesCollege(state.rooms[k], currentCollege));

  // 1. Exact key match in current college
  for (const k of collegeKeys) {
    if (k.toLowerCase() === q) return k;
  }
  // 2. Exact name match in current college
  for (const k of collegeKeys) {
    if ((state.rooms[k].name || "").toLowerCase() === q) return k;
  }
  // 3. Name contains query in current college
  for (const k of collegeKeys) {
    if ((state.rooms[k].name || "").toLowerCase().includes(q)) return k;
  }

  // 4. Fallback search across all rooms (e.g. if user is in Engineering and says "Belaku")
  for (const k of state.roomKeys) {
    if (k.toLowerCase() === q || (state.rooms[k].name || "").toLowerCase() === q) {
      // Auto-switch to the target room's college!
      const targetColleges = getCollegeKeysForRoom(state.rooms[k]);
      state.activeCollege = targetColleges[0];
      return k;
    }
  }

  return null;
}

// Start application when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
