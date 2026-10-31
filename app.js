/**
 * MIT Mysore Campus Navigator
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
  recentRooms: ["114", "205", "213 DSP lab", "305", "Belaku"],
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
  const combined = `${college} ${dept}`;

  if (combined.includes("mba") && combined.includes("mca")) return ["mba", "mca"];
  if (combined.includes("mba")) return ["mba"];
  if (combined.includes("mca")) return ["mca"];
  if (combined.includes("bca")) return ["bca"];
  if (combined.includes("pharmacy") || combined.includes("pharma")) return ["pharmacy"];
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
        heroQuery: "Search MBA classrooms & seminar halls (e.g. Belaku)...",
        icon: "💼"
      };
    case "mca":
      return {
        name: "Department of MCA",
        badge: "Postgraduate IT Block • Belaku",
        heroQuery: "Search MCA labs & halls (e.g. Belaku, PG Labs)...",
        icon: "🖥️"
      };
    case "bca":
      return {
        name: "Department of BCA",
        badge: "Undergraduate IT Wing",
        heroQuery: "Search BCA programming rooms & classrooms...",
        icon: "💻"
      };
    case "pharmacy":
      return {
        name: "Faculty of Pharmaceutical Sciences",
        badge: "Health Sciences Block",
        heroQuery: "Search Pharmacy & Chemistry laboratories...",
        icon: "💊"
      };
    case "engineering":
    default:
      return {
        name: "Engineering Campus",
        badge: "Main Academic Block • 60+ Classrooms & Labs",
        heroQuery: "Search engineering rooms (e.g. 205, 313, DSP Lab, 114)...",
        icon: "🏛️"
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
    `*MIT Mysore Campus Navigator — ${titleLabel}*`,
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
  const savedTheme = localStorage.getItem("locorom_theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeButtonLabel();

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
function enterCollege(collegeKey, pushHistory = true) {
  stopAutoPlay();
  state.selectedRoomKey = null;
  state.activeCollege = collegeKey || "engineering";
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
        <div style="font-size: 38px; margin-bottom: 12px;">${meta.icon}</div>
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
            ? `<img src="${thumbUrl}" alt="Room ${escapeHtml(r.name)}" loading="lazy" referrerpolicy="no-referrer" onerror="if(!this.dataset.cdn){this.dataset.cdn='1';this.src='${cdnUrl}';}else{this.style.display='none';}" />`
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
    stage.innerHTML = `
      <img
        src="${url}"
        alt="Step ${idx + 1} towards Room ${escapeHtml(room.name)}"
        class="wt-main-media"
        referrerpolicy="no-referrer"
        onerror="if(!this.dataset.cdn){this.dataset.cdn='1';this.src='${cdnUrl}';}"
      />
    `;
  }

  // Render clickable step thumbnails
  thumbsRow.innerHTML = photos.map((p, i) => {
    const u = resolveMediaUrl(p);
    const cUrl = resolveFallbackCdnUrl(p);
    const isVid = /\.(mp4|webm)$/i.test(p);
    return `
      <button type="button" class="step-thumb-btn ${i === idx ? "active" : ""}" data-step-idx="${i}">
        ${isVid
          ? `<span class="vid-label">Video</span>`
          : `<img src="${u}" alt="Step ${i + 1}" loading="lazy" referrerpolicy="no-referrer" onerror="if(!this.dataset.cdn){this.dataset.cdn='1';this.src='${cUrl}';}" />`
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

  const activeThumb = thumbsRow.querySelector(".step-thumb-btn.active");
  if (activeThumb) {
    activeThumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }

  if (total > 1) {
    const nextFile = photos[(idx + 1) % total];
    if (nextFile && !/\.(mp4|webm)$/i.test(nextFile)) {
      const preloadImg = new Image();
      preloadImg.src = resolveMediaUrl(nextFile);
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
function bindEvents() {
  // 1. College Selection Portal Cards -> Enter College Only
  document.querySelectorAll("[data-select-college]").forEach(card => {
    card.addEventListener("click", () => {
      const college = card.getAttribute("data-select-college");
      enterCollege(college);
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

  // 7. Voice Search (Microphone Speech Recognition)
  setupVoiceSearch(searchInput, clearSearchBtn);

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

// ============================================================================
// VOICE-TO-TEXT SEARCH (Web Speech API)
// ============================================================================
function normalizeSpokenQuery(rawTranscript) {
  if (!rawTranscript) return "";
  let cleaned = rawTranscript
    .trim()
    .replace(/[.?!,;]+$/g, "")
    .replace(/^(take me to|where is|how to reach|how do i get to|navigate to|go to|find|search for|search|show me|open)\s+/i, "")
    .replace(/^room\s+(number\s+)?/i, "")
    .trim();

  const wordDigits = {
    zero: "0", oh: "0", one: "1", two: "2", three: "3",
    four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9"
  };
  const tokens = cleaned.toLowerCase().split(/\s+/);
  if (tokens.length >= 2 && tokens.length <= 4 && tokens.every(t => wordDigits[t] !== undefined)) {
    cleaned = tokens.map(t => wordDigits[t]).join("");
  }

  return cleaned;
}

function setupVoiceSearch(searchInput, clearBtn) {
  const micBtn = document.getElementById("voiceSearchBtn");
  const banner = document.getElementById("voiceStatusBanner");
  const bannerText = document.getElementById("voiceStatusText");
  const bannerCancel = document.getElementById("voiceStopBannerBtn");
  const searchBox = document.getElementById("searchBarBox");

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    if (micBtn) {
      micBtn.title = "Voice search not supported on this browser";
      micBtn.style.opacity = "0.45";
      micBtn.style.cursor = "not-allowed";
    }
    return;
  }

  let recognition = null;
  let isListening = false;

  function stopListening() {
    if (recognition && isListening) {
      try { recognition.stop(); } catch (e) {}
    }
    isListening = false;
    micBtn?.classList.remove("active");
    searchBox?.classList.remove("listening");
    if (banner) banner.style.display = "none";
  }

  function startListening() {
    if (isListening) {
      stopListening();
      return;
    }

    try {
      recognition = new SpeechRecognition();
      recognition.lang = "en-IN";
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isListening = true;
        micBtn?.classList.add("active");
        searchBox?.classList.add("listening");
        if (banner) banner.style.display = "flex";
        if (bannerText) bannerText.innerHTML = "<strong>Listening…</strong> Say a room number or lab name (e.g. \"Room 205\" or \"Belaku\")";
      };

      recognition.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        const cleaned = normalizeSpokenQuery(transcript);
        if (searchInput) searchInput.value = cleaned;
        state.searchQuery = cleaned;
        if (clearBtn) clearBtn.style.display = cleaned ? "inline-flex" : "none";

        if (bannerText) bannerText.innerHTML = `Heard: "<strong>${escapeHtml(transcript)}</strong>"`;
        renderRoomsGrid();

        if (event.results[0].isFinal) {
          const exactKey = findExactOrBestMatch(cleaned);
          if (exactKey) {
            showToast(`Found ${state.rooms[exactKey].name}! Opening walkthrough…`);
            setTimeout(() => {
              stopListening();
              openRoom(exactKey);
            }, 600);
          } else {
            stopListening();
          }
        }
      };

      recognition.onerror = (e) => {
        console.warn("Speech recognition error:", e.error);
        if (bannerText) {
          bannerText.innerHTML = e.error === "not-allowed"
            ? "Microphone access blocked. Enable permissions in browser."
            : `Voice search error (${e.error}). Try again.`;
        }
        setTimeout(stopListening, 2400);
      };

      recognition.onend = () => {
        isListening = false;
        micBtn?.classList.remove("active");
        searchBox?.classList.remove("listening");
        if (banner) banner.style.display = "none";
      };

      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      stopListening();
    }
  }

  micBtn?.addEventListener("click", startListening);
  bannerCancel?.addEventListener("click", stopListening);
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
