/**
 * LOCOROM — Campus Room Finder, Voice Search, WhatsApp Direct Share & Three.js 3D Spatial Twin
 */

import { CampusSpatial3DEngine } from "./spatial3d.js";

const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/aryamanm77/mitm-room/main/";

const state = {
  rooms: {},
  roomKeys: [],
  activeFloor: "all",
  activeCollege: "all", // "all" | "engineering" | "mba" | "bca" | "mca" | "pharmacy"
  searchQuery: "",
  homeDisplayMode: "grid", // 'grid' | '3d'
  wtDisplayMode: "photos", // 'photos' | '3d'
  selectedRoomKey: null,
  activeApIndex: 0,
  activePhotoIndex: 0,
  isPlaying: false,
  playTimer: null,
  recentRooms: ["114", "205", "213 DSP lab", "305"],
  spatialEngine: null,
  dockCollapsed: false
};

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

// Build Direct WhatsApp Share URL (wa.me) for an exact room and starting route
function buildWhatsAppShareUrl(roomKey, apIndex = 0) {
  const room = state.rooms[roomKey];
  if (!room) return "https://wa.me/";
  const routes = getRoutesForRoom(room);
  const route = routes[apIndex] || routes[0];
  const titleLabel = room.name.length <= 5 ? `Room ${room.name}` : room.name;

  const deepLinkUrl = new URL(window.location.origin + window.location.pathname);
  deepLinkUrl.searchParams.set("room", roomKey);
  if (apIndex > 0) {
    deepLinkUrl.searchParams.set("ap", String(apIndex));
  }

  const directionsSentence = route?.info || room.info || room.landmark || "Follow walkthrough photos.";
  const message = [
    `*Locorom Campus Navigation — ${titleLabel}*`,
    `Floor: ${room.floor}${room.dept ? " · " + room.dept : ""}`,
    `Route (${route ? route.label : "Main Route"}): ${directionsSentence}`,
    `Open exact room walkthrough: ${deepLinkUrl.toString()}`
  ].join("\n");

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

// Ensure Three.js 3D Engine is initialized and attached to the requested host container
function attachSpatial3DToHost(hostEl, isInsideWalkthrough = false) {
  const stageWrapper = document.getElementById("sharedSpatial3DStage");
  const mountEl = document.getElementById("threeCanvasMount");
  const specLabel = document.getElementById("threeTopSpecLabel");
  if (!stageWrapper || !mountEl || !hostEl) return;

  stageWrapper.style.display = "block";
  stageWrapper.classList.toggle("in-viewer", isInsideWalkthrough);
  if (stageWrapper.parentElement !== hostEl) {
    hostEl.appendChild(stageWrapper);
  }

  if (!state.spatialEngine) {
    state.spatialEngine = new CampusSpatial3DEngine(mountEl, {
      onRoomSelect: (clickedRoomKey) => {
        if (state.rooms[clickedRoomKey]) {
          showToast(`Selected Room ${clickedRoomKey} in 3D Twin`);
          openRoom(clickedRoomKey, true);
        }
      }
    });
    state.spatialEngine.init(state.rooms);
  } else {
    state.spatialEngine.handleResize();
  }

  const targetRoom = state.selectedRoomKey || state.recentRooms[0] || "205";
  const room = state.rooms[targetRoom];
  const routes = getRoutesForRoom(room);
  const currentRoute = routes[state.activeApIndex] || routes[0];
  const photos = currentRoute?.photos || [];
  const ratio = photos.length > 1 ? state.activePhotoIndex / (photos.length - 1) : 0;

  state.spatialEngine.selectRoomAndRoute(targetRoom, currentRoute?.name || "Point A", ratio);

  if (specLabel && room) {
    specLabel.textContent = isInsideWalkthrough
      ? `3D Route · Room ${room.name} (${room.floor}) via ${currentRoute?.label || "Main Route"}`
      : `MITM 3D Campus Digital Twin · Click any 3D room block to open walkthrough`;
  }
}

// Initialize App
async function initApp() {
  const savedTheme = localStorage.getItem("locorom_theme") || "dark";
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

  const params = new URLSearchParams(window.location.search);
  const urlRoom = params.get("room");
  const urlAp = parseInt(params.get("ap") || "0", 10);
  if (urlRoom && state.rooms[urlRoom]) {
    openRoom(urlRoom, false, isNaN(urlAp) ? 0 : urlAp);
  } else {
    showHomeView(false);
  }
}

function updateThemeButtonLabel() {
  const theme = document.documentElement.getAttribute("data-theme") || "dark";
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
// HOME VIEW (Simple Search + Room Grid / 3D Campus Twin)
// ============================================================================
function showHomeView(pushHistory = true) {
  stopAutoPlay();
  state.selectedRoomKey = null;

  document.getElementById("homeScreen").style.display = "block";
  document.getElementById("walkthroughScreen").style.display = "none";

  if (pushHistory) {
    const url = new URL(window.location.href);
    url.searchParams.delete("room");
    url.searchParams.delete("ap");
    window.history.pushState({}, "", url.pathname);
  }

  renderQuickRecents();
  renderHomeContent();
}

function renderHomeContent() {
  const gridEl = document.getElementById("roomsGrid");
  const home3DHost = document.getElementById("home3DHost");
  const gridBtn = document.getElementById("homeModeGridBtn");
  const threeBtn = document.getElementById("homeMode3DBtn");

  gridBtn?.classList.toggle("active", state.homeDisplayMode === "grid");
  threeBtn?.classList.toggle("active", state.homeDisplayMode === "3d");

  if (state.homeDisplayMode === "3d") {
    if (gridEl) gridEl.style.display = "none";
    if (home3DHost) {
      home3DHost.style.display = "block";
      attachSpatial3DToHost(home3DHost, false);
    }
  } else {
    if (home3DHost) home3DHost.style.display = "none";
    if (gridEl) gridEl.style.display = "grid";
    renderRoomsGrid();
  }
}

function renderQuickRecents() {
  const wrap = document.getElementById("quickChipsRow");
  if (!wrap) return;
  const valid = state.recentRooms.filter(k => state.rooms[k]).slice(0, 6);
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

  const filtered = state.roomKeys.filter(key => {
    const r = state.rooms[key];

    let floorMatch = true;
    if (state.activeFloor !== "all") {
      if (state.activeFloor === "ground") {
        floorMatch = r.floor === "Basement & Ground" || r.floor === "Mechanical Block" || r.floor === "Campus Amenities";
      } else if (state.activeFloor === "4-5") {
        floorMatch = r.floor === "4th Floor" || r.floor === "5th Floor";
      } else {
        floorMatch = r.floor === state.activeFloor;
      }
    }

    // College / Department Filtering (Engineering, MBA, BCA, MCA, Pharmacy)
    let collegeMatch = true;
    if (state.activeCollege !== "all") {
      const roomCollege = (r.college || "Engineering").toLowerCase();
      const roomDept = (r.dept || "").toLowerCase();
      const roomCategory = (r.category || "").toLowerCase();
      const roomName = (r.name || "").toLowerCase();
      const combined = `${roomCollege} ${roomDept} ${roomCategory} ${roomName}`;

      if (state.activeCollege === "engineering") {
        collegeMatch = roomCollege.includes("engineering") || 
          (!roomCollege.includes("mba") && !roomCollege.includes("mca") && !roomCollege.includes("bca") && !roomCollege.includes("pharmacy"));
      } else if (state.activeCollege === "mba") {
        collegeMatch = combined.includes("mba");
      } else if (state.activeCollege === "bca") {
        collegeMatch = combined.includes("bca");
      } else if (state.activeCollege === "mca") {
        collegeMatch = combined.includes("mca");
      } else if (state.activeCollege === "pharmacy") {
        collegeMatch = combined.includes("pharmacy") || combined.includes("pharma");
      }
    }

    if (!q) return floorMatch && collegeMatch;
    const textBlob = [
      r.name,
      r.floor,
      r.dept,
      r.category,
      r.landmark,
      r.info,
      ...(r.accessPoints || []).map(a => `${a.name} ${a.info}`)
    ].join(" ").toLowerCase();

    return floorMatch && collegeMatch && textBlob.includes(q);
  });

  if (countLabel) {
    countLabel.textContent = `${filtered.length} ${filtered.length === 1 ? "room" : "rooms"} available`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-box">
        <h3>${state.searchQuery ? `No rooms found for "${escapeHtml(state.searchQuery)}"` : `No rooms listed yet for ${state.activeCollege.toUpperCase()}`}</h3>
        <p>${state.searchQuery ? "Try searching by room number (like 205, Belaku, 114) or lab name (like DSP, PE, Machine Shop)." : `Ready to receive ${state.activeCollege.toUpperCase()} rooms! Provide room names, photos, or floors to populate this section.`}</p>
        <button type="button" class="btn-secondary" id="clearSearchResetBtn">Show All Campuses</button>
      </div>
    `;
    document.getElementById("clearSearchResetBtn")?.addEventListener("click", () => {
      state.searchQuery = "";
      state.activeFloor = "all";
      state.activeCollege = "all";
      syncCollegeNavButtons();
      const inp = document.getElementById("mainSearchInput");
      if (inp) inp.value = "";
      syncFloorNavButtons();
      renderRoomsGrid();
    });
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
// WALKTHROUGH VIEW (Simple Directions + Corridor Photos / 3D Spatial Route + WhatsApp)
// ============================================================================
function openRoom(roomKey, pushHistory = true, initialApIdx = 0) {
  const room = state.rooms[roomKey];
  if (!room) return;

  stopAutoPlay();
  state.selectedRoomKey = roomKey;
  state.activeApIndex = initialApIdx;
  state.activePhotoIndex = 0;

  state.recentRooms = [roomKey, ...state.recentRooms.filter(k => k !== roomKey)].slice(0, 6);
  try {
    localStorage.setItem("locorom_recent_rooms", JSON.stringify(state.recentRooms));
  } catch (e) {}

  document.getElementById("homeScreen").style.display = "none";
  document.getElementById("walkthroughScreen").style.display = "block";
  window.scrollTo(0, 0);

  if (pushHistory) {
    const url = new URL(window.location.href);
    url.searchParams.set("room", roomKey);
    if (initialApIdx > 0) url.searchParams.set("ap", String(initialApIdx));
    else url.searchParams.delete("ap");
    window.history.pushState({ room: roomKey, ap: initialApIdx }, "", url.toString());
  }

  renderWalkthroughView();
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
    <span>${escapeHtml(room.floor)}</span>
    <span aria-hidden="true">·</span>
    <span>${escapeHtml(room.dept || "Campus Space")}</span>
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

  // Sync Viewer Mode Toggle (Corridor Photos vs 3D Spatial Route)
  const photoWrap = document.getElementById("wtPhotoStageWrap");
  const wt3DHost = document.getElementById("wt3DHost");
  const modePhotosBtn = document.getElementById("wtModePhotosBtn");
  const mode3DBtn = document.getElementById("wtMode3DBtn");

  modePhotosBtn?.classList.toggle("active", state.wtDisplayMode === "photos");
  mode3DBtn?.classList.toggle("active", state.wtDisplayMode === "3d");

  if (state.wtDisplayMode === "3d") {
    if (photoWrap) photoWrap.style.display = "none";
    if (wt3DHost) {
      wt3DHost.style.display = "block";
      attachSpatial3DToHost(wt3DHost, true);
    }
  } else {
    if (wt3DHost) wt3DHost.style.display = "none";
    if (photoWrap) photoWrap.style.display = "flex";
  }

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
    stepCounter.textContent = "Spatial node indexed";
    progressFill.style.width = "100%";
    stage.innerHTML = `<div class="no-photo-msg">Written directions are shown above. Switch to "3D Spatial Route" to inspect the 3D building path.</div>`;
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

  // Sync 3D Guide Beacon position with active photo step
  if (state.spatialEngine && state.spatialEngine.isInitialized) {
    const ratio = total > 1 ? idx / (total - 1) : 1;
    state.spatialEngine.setStepProgress(ratio);
  }

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


function syncCollegeNavButtons() {
  document.querySelectorAll("[data-college-filter]").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-college-filter") === state.activeCollege);
  });
}

function syncFloorNavButtons() {
  
  document.querySelectorAll("[data-college-filter]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.activeCollege = btn.getAttribute("data-college-filter");
      syncCollegeNavButtons();
      showHomeView(true);
    });
  });

  document.querySelectorAll("[data-floor-filter]").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-floor-filter") === state.activeFloor);
  });
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================
function bindEvents() {
  document.getElementById("brandHomeLink")?.addEventListener("click", (e) => {
    e.preventDefault();
    showHomeView(true);
  });

  document.querySelectorAll("[data-floor-filter]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.activeFloor = btn.getAttribute("data-floor-filter");
      syncFloorNavButtons();
      showHomeView(true);
    });
  });

  document.getElementById("themeToggleBtn")?.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") || "dark";
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("locorom_theme", next);
    updateThemeButtonLabel();
  });

  // Home Mode Switcher (Room Grid vs 3D Campus Twin)
  document.getElementById("homeModeGridBtn")?.addEventListener("click", () => {
    state.homeDisplayMode = "grid";
    renderHomeContent();
  });

  document.getElementById("homeMode3DBtn")?.addEventListener("click", () => {
    state.homeDisplayMode = "3d";
    renderHomeContent();
  });

  // Walkthrough Mode Switcher (Corridor Photos vs 3D Spatial Route)
  document.getElementById("wtModePhotosBtn")?.addEventListener("click", () => {
    state.wtDisplayMode = "photos";
    renderWalkthroughView();
  });

  document.getElementById("wtMode3DBtn")?.addEventListener("click", () => {
    state.wtDisplayMode = "3d";
    renderWalkthroughView();
  });

  // 3D Bottom Dock Controls (Explode Slider, Camera Presets, Collapsible Toggle)
  const explodeSlider = document.getElementById("threeExplodeSlider");
  if (explodeSlider) {
    explodeSlider.addEventListener("input", () => {
      const val = parseInt(explodeSlider.value, 10) / 100;
      state.spatialEngine?.setExplodeFactor(val);
    });
  }

  document.querySelectorAll("[data-cam-preset]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.spatialEngine?.setCameraPreset(btn.getAttribute("data-cam-preset"));
    });
  });

  const dockToggleBtn = document.getElementById("threeDockToggleBtn");
  const dockWrap = document.getElementById("threeBottomDockWrap");
  if (dockToggleBtn && dockWrap) {
    dockToggleBtn.addEventListener("click", () => {
      state.dockCollapsed = !state.dockCollapsed;
      dockWrap.classList.toggle("collapsed", state.dockCollapsed);
      dockToggleBtn.textContent = state.dockCollapsed ? "▴ Show 3D Controls" : "▾ Hide 3D Controls";
    });
  }

  // Search Input
  const searchInput = document.getElementById("mainSearchInput");
  const clearSearchBtn = document.getElementById("clearSearchBtn");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      state.searchQuery = searchInput.value;
      if (clearSearchBtn) {
        clearSearchBtn.style.display = searchInput.value ? "inline-flex" : "none";
      }
      if (state.homeDisplayMode !== "grid") {
        state.homeDisplayMode = "grid";
      }
      renderHomeContent();
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

  // Voice-to-Text Search (Device Microphone via Web Speech API)
  setupVoiceSearch(searchInput, clearSearchBtn);

  // Walkthrough Controls
  document.getElementById("wtBackBtn")?.addEventListener("click", () => showHomeView(true));
  document.getElementById("wtPrevBtn")?.addEventListener("click", () => stepPhoto(-1));
  document.getElementById("wtNextBtn")?.addEventListener("click", () => stepPhoto(1));
  document.getElementById("wtStagePrev")?.addEventListener("click", () => stepPhoto(-1));
  document.getElementById("wtStageNext")?.addEventListener("click", () => stepPhoto(1));
  document.getElementById("wtAutoPlayBtn")?.addEventListener("click", toggleAutoPlay);

  document.getElementById("wtShareBtn")?.addEventListener("click", () => {
    if (!state.selectedRoomKey) return;
    const shareUrl = new URL(window.location.origin + window.location.pathname);
    shareUrl.searchParams.set("room", state.selectedRoomKey);
    if (state.activeApIndex > 0) {
      shareUrl.searchParams.set("ap", String(state.activeApIndex));
    }
    navigator.clipboard.writeText(shareUrl.toString()).then(() => showToast("Exact room link copied!"));
  });

  // Swipe support on photo stage
  const stage = document.getElementById("wtPhotoStage");
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

  // Keyboard support
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
        showHomeView(true);
      }
    }
  });

  window.addEventListener("popstate", () => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get("room");
    const apIdx = parseInt(params.get("ap") || "0", 10);
    if (r && state.rooms[r]) {
      openRoom(r, false, isNaN(apIdx) ? 0 : apIdx);
    } else {
      showHomeView(false);
    }
  });
}

// ============================================================================
// VOICE-TO-TEXT INPUT MODE (Web Speech API)
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

function setupVoiceSearch(searchInput, clearSearchBtn) {
  const voiceBtn = document.getElementById("voiceSearchBtn");
  const voiceBtnLabel = document.getElementById("voiceBtnLabel");
  const searchBarBox = document.getElementById("searchBarBox");
  const statusBanner = document.getElementById("voiceStatusBanner");
  const statusText = document.getElementById("voiceStatusText");
  const stopBannerBtn = document.getElementById("voiceStopBannerBtn");

  if (!voiceBtn) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    voiceBtn.addEventListener("click", () => {
      showToast("Voice input is not supported in this browser. Try Chrome or Edge.");
    });
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  let isListening = false;

  function setListeningUI(active, messageHtml) {
    isListening = active;
    voiceBtn.classList.toggle("listening", active);
    voiceBtn.setAttribute("aria-label", active ? "Stop voice search" : "Start voice search");
    voiceBtn.setAttribute("title", active ? "Listening… Click to stop" : "Hands-free voice search");
    searchBarBox?.classList.toggle("listening", active);
    statusBanner?.classList.toggle("active", active);
    if (voiceBtnLabel) {
      voiceBtnLabel.textContent = active ? "Listening…" : "Voice";
    }
    if (messageHtml && statusText) {
      statusText.innerHTML = messageHtml;
    }
  }

  function startListening() {
    if (state.selectedRoomKey) {
      showHomeView(true);
    }
    try {
      recognition.start();
    } catch (e) {}
  }

  function stopListening() {
    try {
      recognition.stop();
    } catch (e) {}
    setListeningUI(false);
  }

  recognition.onstart = () => {
    setListeningUI(
      true,
      `<strong>Listening…</strong> Speak a room number or lab name (e.g. "205", "313", "DSP Lab")`
    );
  };

  recognition.onresult = (event) => {
    let transcript = "";
    let isFinal = false;

    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        isFinal = true;
      }
    }

    const normalized = normalizeSpokenQuery(transcript);
    if (searchInput) {
      searchInput.value = normalized;
    }
    if (clearSearchBtn) {
      clearSearchBtn.style.display = normalized ? "inline-flex" : "none";
    }

    state.searchQuery = normalized;
    state.activeFloor = "all";
    state.homeDisplayMode = "grid";
    syncFloorNavButtons();
    renderHomeContent();

    if (statusText) {
      statusText.innerHTML = `Heard: <strong>"${escapeHtml(normalized)}"</strong>`;
    }

    if (isFinal && normalized) {
      const exactKey = state.roomKeys.find(k => k.toLowerCase() === normalized.toLowerCase());
      const visibleCards = document.querySelectorAll("#roomsGrid [data-room-key]");
      if (exactKey) {
        showToast(`Voice matched Room ${exactKey}`);
        setTimeout(() => openRoom(exactKey), 350);
      } else if (visibleCards.length === 1) {
        const matchedKey = visibleCards[0].getAttribute("data-room-key");
        if (matchedKey) {
          showToast(`Voice matched ${matchedKey}`);
          setTimeout(() => openRoom(matchedKey), 350);
        }
      } else {
        showToast(`Showing rooms matching "${normalized}"`);
      }
    }
  };

  recognition.onerror = (event) => {
    setListeningUI(false);
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      showToast("Microphone access denied. Please allow microphone permission.");
    } else if (event.error === "no-speech") {
      showToast("No speech detected. Tap Voice to try again.");
    } else if (event.error !== "aborted") {
      showToast("Could not capture voice input. Try again.");
    }
  };

  recognition.onend = () => {
    setListeningUI(false);
  };

  voiceBtn.addEventListener("click", () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  });

  stopBannerBtn?.addEventListener("click", stopListening);
}

document.addEventListener("DOMContentLoaded", initApp);
