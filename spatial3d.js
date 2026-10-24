/**
 * LOCOROM 3D Spatial Campus Digital Twin & Wayfinding Engine
 * Built with Three.js r165 ES Modules, RoomEnvironment PBR, Custom GLSL onBeforeCompile,
 * InstancedMesh Structural Columns, Composite 3-12 Part Procedural Architecture, and Raycasting.
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

// Pre-allocated math helpers to ensure zero GC inside the animation/render loop
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _vec3C = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _color = new THREE.Color();

const FLOOR_ORDER = [
  "Basement & Ground",
  "1st Floor",
  "2nd Floor",
  "3rd Floor",
  "4th Floor",
  "5th Floor"
];

export class CampusSpatial3DEngine {
  constructor(mountEl, options = {}) {
    this.mountEl = mountEl;
    this.onRoomSelect = options.onRoomSelect || (() => {});
    this.roomsData = {};
    this.isInitialized = false;
    this.isDisposed = false;

    // State
    this.selectedRoomKey = "205";
    this.selectedApName = "Point A";
    this.stepProgress = 0; // 0.0 to 1.0 synced with photo step
    this.targetStepProgress = 0;
    this.explodeTarget = 0.25; // 0 = compact building, 1 = vertically exploded floors
    this.explodeCurrent = 0.25;
    this.isolateActiveFloor = false;

    // Camera transition state
    this.cameraTransitionActive = false;
    this.camTargetPos = new THREE.Vector3(44, 34, 52);
    this.camTargetLook = new THREE.Vector3(0, 8, 0);

    // Collections
    this.floorGroups = [];
    this.roomMeshes = []; // Layer 1 clickable room hitboxes
    this.roomVisualMap = new Map(); // roomKey -> { group, mesh, capMat, floorIndex, worldPos }
    this.stairCorePositions = {
      "Point A": new THREE.Vector3(-22, 0, 0),
      "Point B": new THREE.Vector3(0, 0, 0),
      "Point C": new THREE.Vector3(22, 0, 0)
    };

    this.activeCurve = null;
    this.routeTubeMesh = null;
    this.routeShaderUniforms = { uTime: { value: 0 } };
    this.guideBeaconGroup = null;
    this.frameId = 0;
    this.clock = new THREE.Clock();
  }

  init(roomsCatalog) {
    if (this.isInitialized || !this.mountEl) return;
    this.roomsData = roomsCatalog || {};
    this.isInitialized = true;

    // 1. Detect Software WebGL from GPU Renderer String (never user-agent)
    this.isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement("canvas");
        const gl = probeCanvas.getContext("webgl2") || probeCanvas.getContext("webgl");
        if (!gl) return true;
        const ext = gl.getExtension("WEBGL_debug_renderer_info");
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension("WEBGL_lose_context")?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch (e) {
        return true;
      }
    })();

    const width = Math.max(this.mountEl.clientWidth, 320);
    const height = Math.max(this.mountEl.clientHeight, 320);

    // 2. Modern PBR WebGLRenderer Setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: "high-performance"
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.mountEl.innerHTML = "";
    this.mountEl.appendChild(this.renderer.domElement);

    // WebGL Context Loss Safety
    this.renderer.domElement.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      if (this.frameId) {
        cancelAnimationFrame(this.frameId);
        clearTimeout(this.frameId);
      }
    });

    // 3. Scene, Horizon Fog & Studio Environment Map (RoomEnvironment)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070a10);
    this.scene.fog = new THREE.FogExp2(0x070a10, 0.0065);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 4. Camera & OrbitControls
    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 300);
    this.camera.position.set(44, 34, 52);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 8, 0);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.07;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.minDistance = 14;
    this.controls.maxDistance = 120;

    this.controls.addEventListener("start", () => {
      this.cameraTransitionActive = false;
    });

    // 5. Balanced 3-Point Studio Lighting Rig (Warm Key, Cool Hemisphere Fill, Rim Backlight)
    this.setupLighting();

    // 6. Ground Campus Plinth & Contact Shadow
    this.buildCampusGroundPlinth();

    // 7. Build Composite Multi-Floor MITM Building & Rooms
    this.buildCompositeCampusArchitecture();

    // 8. Build 3D Autonomous Guide Beacon (6-Part Composite Group)
    this.buildGuideBeacon();

    // 9. Setup High-Performance Raycasting on Layer 1
    this.setupRaycasting();

    // 10. Pre-warm shaders on GPU
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Resize Observer
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.mountEl);

    // Highlight initial room
    this.selectRoomAndRoute(this.selectedRoomKey, this.selectedApName, 0);

    // Start Paced Loop
    this.startLoop();
  }

  setupLighting() {
    // Cool sky / slate ground hemisphere fill
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.65);
    hemiLight.position.set(0, 50, 0);
    this.scene.add(hemiLight);

    // Warm directional Key Light with tight shadow frustum
    const keyLight = new THREE.DirectionalLight(0xfff5e6, 1.85);
    keyLight.position.set(38, 56, 36);
    keyLight.castShadow = !this.isSoftwareGl;
    if (!this.isSoftwareGl) {
      keyLight.shadow.mapSize.width = 2048;
      keyLight.shadow.mapSize.height = 2048;
      keyLight.shadow.camera.near = 10;
      keyLight.shadow.camera.far = 140;
      const d = 42;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(keyLight);

    // Crisp Rim / Backlight to separate glass & brushed metal edges
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
    rimLight.position.set(-40, 32, -38);
    this.scene.add(rimLight);
  }

  buildCampusGroundPlinth() {
    // Procedural radial contact shadow texture
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    const grad = ctx.createRadialGradient(128, 128, 18, 128, 128, 124);
    grad.addColorStop(0, "rgba(0, 0, 0, 0.72)");
    grad.addColorStop(0.65, "rgba(0, 0, 0, 0.28)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const shadowTex = new THREE.CanvasTexture(canvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.65
    });
    const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(88, 52), shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.58;
    this.scene.add(shadowPlane);

    // Subtle architectural terrain grid base (offset on Y to prevent coplanar Z-fighting)
    const gridHelper = new THREE.GridHelper(130, 26, 0x1e293b, 0x111827);
    gridHelper.position.y = -0.62;
    this.scene.add(gridHelper);
  }

  createTextLabelTexture(text, subText, isHighlighted = false) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = isHighlighted ? "#1d4ed8" : "#0f172a";
    ctx.fillRect(0, 0, 256, 128);

    ctx.strokeStyle = isHighlighted ? "#93c5fd" : "#334155";
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 250, 122);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 44px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const mainLabel = String(text).length > 8 ? String(text).slice(0, 7) + "…" : String(text);
    ctx.fillText(mainLabel, 128, subText ? 50 : 64);

    if (subText) {
      ctx.fillStyle = isHighlighted ? "#dbeafe" : "#94a3b8";
      ctx.font = "600 22px sans-serif";
      ctx.fillText(String(subText).slice(0, 16), 128, 94);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    return tex;
  }

  buildCompositeCampusArchitecture() {
    this.buildingRoot = new THREE.Group();
    this.scene.add(this.buildingRoot);

    // Shared PBR Materials with varied roughness & metalness (>= 0.25 delta)
    const slabMaterial = new THREE.MeshStandardMaterial({
      color: 0x161d2a,
      roughness: 0.72,
      metalness: 0.12
    });

    const trimRailMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x334155,
      roughness: 0.22,
      metalness: 0.88,
      anisotropy: 0.75
    });

    const corridorRunwayMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f141e,
      roughness: 0.45,
      metalness: 0.25,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });

    const glassCurtainMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x93c5fd,
      transmission: this.isSoftwareGl ? 0 : 0.82,
      transparent: true,
      opacity: this.isSoftwareGl ? 0.22 : 1.0,
      roughness: 0.1,
      metalness: 0.05,
      ior: 1.52,
      thickness: 0.8,
      clearcoat: 1.0,
      depthWrite: false
    });

    // Extruded Bevel Slab Geometry for each Floor Wing
    const slabShape = new THREE.Shape();
    const w = 31;
    const d = 10.5;
    slabShape.moveTo(-w, -d);
    slabShape.lineTo(w, -d);
    slabShape.lineTo(w, d);
    slabShape.lineTo(-w, d);
    slabShape.closePath();

    const slabGeo = new THREE.ExtrudeGeometry(slabShape, {
      depth: 0.45,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.12,
      bevelThickness: 0.12
    });
    slabGeo.rotateX(Math.PI / 2);
    slabGeo.computeVertexNormals();

    const trimGeo = new THREE.BoxGeometry(62.6, 0.18, 21.6);
    trimGeo.computeTangents();
    const corridorGeo = new THREE.PlaneGeometry(58, 4.2);
    corridorGeo.rotateX(-Math.PI / 2);

    const glassWallGeo = new THREE.BoxGeometry(62.2, 2.2, 0.12);

    // Group rooms by floor index (0..5)
    const roomsByFloorIdx = [[], [], [], [], [], []];
    Object.keys(this.roomsData).forEach(key => {
      const r = this.roomsData[key];
      let fIdx = FLOOR_ORDER.indexOf(r.floor);
      if (fIdx === -1) fIdx = 0; // Mechanical Block / Campus Amenities -> Ground level
      roomsByFloorIdx[fIdx].push(r);
    });

    // Build 6 Floor Assemblies
    FLOOR_ORDER.forEach((floorName, fIdx) => {
      const floorGroup = new THREE.Group();
      floorGroup.userData = { floorName, floorIndex: fIdx };

      // Part 1: Primary Structural Slab
      const slabMesh = new THREE.Mesh(slabGeo, slabMaterial);
      slabMesh.receiveShadow = !this.isSoftwareGl;
      slabMesh.castShadow = !this.isSoftwareGl;
      floorGroup.add(slabMesh);

      // Part 2: Brushed Metallic Perimeter Rim
      const trimMesh = new THREE.Mesh(trimGeo, trimRailMaterial);
      trimMesh.position.y = 0.05;
      floorGroup.add(trimMesh);

      // Part 3: Central Corridor Spine Runway
      const corridorMesh = new THREE.Mesh(corridorGeo, corridorRunwayMaterial);
      corridorMesh.position.y = 0.08;
      floorGroup.add(corridorMesh);

      // Part 4 & 5: Front & Back Optical Glass Curtain Walls
      const frontGlass = new THREE.Mesh(glassWallGeo, glassCurtainMaterial);
      frontGlass.position.set(0, 1.15, 10.55);
      frontGlass.renderOrder = 2;
      floorGroup.add(frontGlass);

      const backGlass = new THREE.Mesh(glassWallGeo, glassCurtainMaterial);
      backGlass.position.set(0, 1.15, -10.55);
      backGlass.renderOrder = 2;
      floorGroup.add(backGlass);

      // Part 6: Structural Columns via InstancedMesh (12 columns per floor)
      const colGeo = new THREE.CylinderGeometry(0.24, 0.24, 3.1, 12);
      colGeo.computeTangents();
      const colInstanced = new THREE.InstancedMesh(colGeo, trimRailMaterial, 12);
      let cIdx = 0;
      for (let x = -25; x <= 25; x += 10) {
        [-9.8, 9.8].forEach(z => {
          _vec3A.set(x, 1.55, z);
          _quat.identity();
          _mat4.compose(_vec3A, _quat, _scale);
          colInstanced.setMatrixAt(cIdx++, _mat4);
        });
      }
      colInstanced.instanceMatrix.needsUpdate = true;
      colInstanced.computeBoundingSphere();
      floorGroup.add(colInstanced);

      const stepGeo = new THREE.BoxGeometry(2.2, 0.15, 0.45);
      stepGeo.computeTangents();

      // Part 7: Staircase Access Nodes on this Floor (Point A, Point B, Point C)
      Object.entries(this.stairCorePositions).forEach(([apKey, pos]) => {
        const stairNodeGroup = new THREE.Group();
        stairNodeGroup.position.set(pos.x, 0.1, pos.z);

        const padMesh = new THREE.Mesh(
          new THREE.BoxGeometry(3.2, 0.22, 3.2),
          new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.35, metalness: 0.6 })
        );
        padMesh.position.y = 0.11;
        stairNodeGroup.add(padMesh);

        // Stepped flights inside the core
        for (let s = 0; s < 4; s++) {
          const stepBar = new THREE.Mesh(stepGeo, trimRailMaterial);
          stepBar.position.set(0, 0.45 + s * 0.55, -0.8 + s * 0.5);
          stairNodeGroup.add(stepBar);
        }

        floorGroup.add(stairNodeGroup);
      });

      const doorFrameGeo = new THREE.BoxGeometry(1.1, 1.25, 0.22);
      doorFrameGeo.computeTangents();

      // Part 8: Populate Rooms on this Floor
      const floorRooms = roomsByFloorIdx[fIdx];
      const totalOnFloor = floorRooms.length;

      floorRooms.forEach((room, rIdx) => {
        const isNorthRow = rIdx % 2 === 0;
        const colIdx = Math.floor(rIdx / 2);
        const totalCols = Math.max(1, Math.ceil(totalOnFloor / 2));
        const xSpan = 52;
        const xPos = totalCols === 1 ? 6 : -26 + (colIdx / (totalCols - 1)) * xSpan;
        const zPos = isNorthRow ? -6.2 : 6.2;

        // Multi-part Room Chamber Group (Base Volume + Roof Label Plate + Doorway Arch)
        const roomGroup = new THREE.Group();
        roomGroup.position.set(xPos, 0.08, zPos);

        const isTheater = room.category && room.category.toLowerCase().includes("theater");
        const isLab = room.category && room.category.toLowerCase().includes("lab");
        const baseColor = isTheater ? 0x1e293b : isLab ? 0x172554 : 0x1e2433;

        const bodyMat = new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: 0.55,
          metalness: 0.25
        });

        const boxW = Math.min(4.8, Math.max(3.2, 48 / (totalCols + 1)));
        const bodyGeo = new THREE.BoxGeometry(boxW, 1.55, 4.6);
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.position.y = 0.78;
        bodyMesh.castShadow = !this.isSoftwareGl;
        bodyMesh.receiveShadow = !this.isSoftwareGl;

        // Enable Layer 1 for Raycasting
        bodyMesh.layers.enable(1);
        bodyMesh.userData = { roomKey: room.name, floorIndex: fIdx };
        this.roomMeshes.push(bodyMesh);
        roomGroup.add(bodyMesh);

        // Doorway Frame Facing Central Corridor
        const doorFrame = new THREE.Mesh(doorFrameGeo, trimRailMaterial);
        doorFrame.position.set(0, 0.63, isNorthRow ? 2.32 : -2.32);
        roomGroup.add(doorFrame);

        // High-DPI Rooftop Room Number Signplate
        const labelTex = this.createTextLabelTexture(room.name, room.floor.replace(" Floor", "F"), false);
        const capMat = new THREE.MeshBasicMaterial({
          map: labelTex,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1
        });
        const capPlane = new THREE.Mesh(new THREE.PlaneGeometry(boxW * 0.88, 2.2), capMat);
        capPlane.rotation.x = -Math.PI / 2;
        capPlane.position.y = 1.57;
        roomGroup.add(capPlane);

        floorGroup.add(roomGroup);

        this.roomVisualMap.set(room.name, {
          room,
          group: roomGroup,
          bodyMesh,
          bodyMat,
          capMat,
          baseColor,
          floorIndex: fIdx,
          localX: xPos,
          localZ: zPos,
          doorZ: isNorthRow ? zPos + 2.4 : zPos - 2.4
        });
      });

      this.floorGroups.push(floorGroup);
      this.buildingRoot.add(floorGroup);
    });

    // Add Top Staircase Tower Beacons for Point A, Point B, Point C
    Object.entries(this.stairCorePositions).forEach(([apKey, pos]) => {
      const badgeTex = this.createTextLabelTexture(apKey, "Staircase Core", true);
      const spriteMat = new THREE.SpriteMaterial({ map: badgeTex });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(5.5, 2.75, 1);
      sprite.position.set(pos.x, 30, pos.z);
      sprite.userData = { apKey };
      this.buildingRoot.add(sprite);
      pos.badgeSprite = sprite;
    });

    this.applyFloorPositions();
  }

  getFloorY(floorIndex) {
    const spacing = 3.6 + this.explodeCurrent * 4.8;
    return floorIndex * spacing;
  }

  applyFloorPositions() {
    this.floorGroups.forEach((fg, idx) => {
      fg.position.y = this.getFloorY(idx);
    });
    const topY = this.getFloorY(FLOOR_ORDER.length - 1) + 4.8;
    Object.values(this.stairCorePositions).forEach(pos => {
      if (pos.badgeSprite) {
        pos.badgeSprite.position.y = topY;
      }
    });
  }

  buildGuideBeacon() {
    // 6-Part Composite Autonomous Wayfinder Beacon (Chassis + Glowing Ring + Nose Cone + Stabilizer Fins + Ground Halo)
    this.guideBeaconGroup = new THREE.Group();

    const chassisMat = new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      metalness: 0.85,
      roughness: 0.18,
      clearcoat: 1.0
    });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x2563eb,
      emissiveIntensity: 1.8,
      roughness: 0.2
    });

    // 1. Central Capsule Core
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.32, 20), chassisMat);
    core.position.y = 0.55;
    this.guideBeaconGroup.add(core);

    // 2. Glowing Equatorial Torus Ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.09, 12, 28), glowMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.55;
    this.guideBeaconGroup.add(ring);

    // 3. Directional Forward Cone
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.55, 16), glowMat);
    cone.rotation.x = Math.PI / 2;
    cone.position.set(0, 0.55, 0.55);
    this.guideBeaconGroup.add(cone);

    // 4 & 5. Left and Right Stabilizer Fins
    const finGeo = new THREE.BoxGeometry(0.35, 0.08, 0.35);
    const leftFin = new THREE.Mesh(finGeo, chassisMat);
    leftFin.position.set(-0.55, 0.55, -0.1);
    this.guideBeaconGroup.add(leftFin);

    const rightFin = new THREE.Mesh(finGeo, chassisMat);
    rightFin.position.set(0.55, 0.55, -0.1);
    this.guideBeaconGroup.add(rightFin);

    // 6. Ground Projection Halo Ring
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.72, 24),
      new THREE.MeshBasicMaterial({ color: 0x60a5fa, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.12;
    this.guideBeaconGroup.add(halo);

    this.scene.add(this.guideBeaconGroup);
  }

  selectRoomAndRoute(roomKey, rawApName = "Point A", stepRatio = 0) {
    if (!this.isInitialized) return;
    if (this.roomsData[roomKey]) {
      this.selectedRoomKey = roomKey;
    }

    let stairKey = "Point A";
    if (rawApName && rawApName.includes("Point B")) stairKey = "Point B";
    else if (rawApName && rawApName.includes("Point C")) stairKey = "Point C";
    else if (rawApName && rawApName.includes("Point A")) stairKey = "Point A";
    else {
      const entry = this.roomVisualMap.get(this.selectedRoomKey);
      if (entry) {
        if (entry.localX > 9) stairKey = "Point C";
        else if (entry.localX > -9) stairKey = "Point B";
      }
    }
    this.selectedApName = stairKey;
    this.targetStepProgress = Math.max(0, Math.min(1, stepRatio));

    // Highlight active room & update floor opacity if isolated
    const activeEntry = this.roomVisualMap.get(this.selectedRoomKey);
    const activeFloorIdx = activeEntry ? activeEntry.floorIndex : 2;

    this.roomVisualMap.forEach((info, key) => {
      const isSelected = key === this.selectedRoomKey;
      info.bodyMat.color.setHex(isSelected ? 0x2563eb : info.baseColor);
      info.bodyMat.emissive.setHex(isSelected ? 0x1d4ed8 : 0x000000);
      info.bodyMat.emissiveIntensity = isSelected ? 0.65 : 0;
      info.group.scale.setScalar(isSelected ? 1.08 : 1.0);
    });

    this.floorGroups.forEach((fg, idx) => {
      fg.visible = !this.isolateActiveFloor || idx === activeFloorIdx || idx === 0;
    });

    this.rebuild3DRouteTube();

    // Smoothly glide camera to frame the active floor and room
    if (activeEntry) {
      const floorY = this.getFloorY(activeEntry.floorIndex);
      this.camTargetLook.set(activeEntry.localX * 0.45, floorY + 1.2, 0);
      this.camTargetPos.set(activeEntry.localX * 0.55 + 24, floorY + 18, 34);
      this.cameraTransitionActive = true;
    }
  }

  setStepProgress(ratio) {
    this.targetStepProgress = Math.max(0, Math.min(1, ratio));
  }

  setExplodeFactor(val) {
    this.explodeTarget = Math.max(0, Math.min(1, val));
  }

  setCameraPreset(presetName) {
    const activeEntry = this.roomVisualMap.get(this.selectedRoomKey);
    const floorY = activeEntry ? this.getFloorY(activeEntry.floorIndex) : 8;
    const roomX = activeEntry ? activeEntry.localX : 0;

    if (presetName === "isometric") {
      this.camTargetLook.set(0, floorY, 0);
      this.camTargetPos.set(44, floorY + 26, 48);
    } else if (presetName === "top") {
      this.camTargetLook.set(0, floorY, 0);
      this.camTargetPos.set(0, floorY + 52, 4);
    } else if (presetName === "focus") {
      this.camTargetLook.set(roomX, floorY + 1.2, activeEntry ? activeEntry.localZ : 0);
      this.camTargetPos.set(roomX + 10, floorY + 8, 18);
    }
    this.cameraTransitionActive = true;
  }

  rebuild3DRouteTube() {
    if (this.routeTubeMesh) {
      this.routeTubeMesh.geometry.dispose();
      this.routeTubeMesh.material.dispose();
      this.scene.remove(this.routeTubeMesh);
      this.routeTubeMesh = null;
    }

    const dest = this.roomVisualMap.get(this.selectedRoomKey);
    if (!dest) return;

    const stairPos = this.stairCorePositions[this.selectedApName] || this.stairCorePositions["Point A"];
    const groundY = this.getFloorY(0) + 0.35;
    const targetFloorY = this.getFloorY(dest.floorIndex) + 0.38;

    const waypoints = [
      new THREE.Vector3(stairPos.x, groundY, 13.5), // Campus Entry outside staircase
      new THREE.Vector3(stairPos.x, groundY, 0),    // Base of Staircase Core
    ];

    if (dest.floorIndex > 0) {
      waypoints.push(new THREE.Vector3(stairPos.x, targetFloorY, 0)); // Ascend Staircase Core to Floor Landing
    }

    // Move along central corridor spine to room's X coordinate
    waypoints.push(new THREE.Vector3(dest.localX, targetFloorY, 0));
    // Turn into room doorway
    waypoints.push(new THREE.Vector3(dest.localX, targetFloorY, dest.doorZ));
    // Inside room center
    waypoints.push(new THREE.Vector3(dest.localX, targetFloorY + 0.5, dest.localZ));

    this.activeCurve = new THREE.CatmullRomCurve3(waypoints, false, "catmullrom", 0.12);
    const tubeGeo = new THREE.TubeGeometry(this.activeCurve, 72, 0.22, 12, false);

    // Extend MeshStandardMaterial via onBeforeCompile for animated GLSL directional energy pulse
    const routeMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x1d4ed8,
      emissiveIntensity: 1.1,
      roughness: 0.25,
      metalness: 0.4
    });

    routeMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.routeShaderUniforms.uTime;
      shader.vertexShader = `varying vec2 vTubeUv;\n` + shader.vertexShader.replace(
        `#include <uv_vertex>`,
        `#include <uv_vertex>\nvTubeUv = uv;`
      );
      shader.fragmentShader = `uniform float uTime;\nvarying vec2 vTubeUv;\n` + shader.fragmentShader.replace(
        `#include <emissivemap_fragment>`,
        `#include <emissivemap_fragment>
         float wave = 0.5 + 0.5 * sin((vTubeUv.x * 24.0) - (uTime * 5.0));
         totalEmissiveRadiance += vec3(0.25, 0.65, 1.0) * pow(wave, 3.0) * 1.4;`
      );
    };

    this.routeTubeMesh = new THREE.Mesh(tubeGeo, routeMat);
    this.scene.add(this.routeTubeMesh);
  }

  setupRaycasting() {
    this.raycaster = new THREE.Raycaster();
    this.raycaster.layers.set(1);
    this.pointer = new THREE.Vector2();

    let downX = 0;
    let downY = 0;

    this.renderer.domElement.addEventListener("pointerdown", (e) => {
      downX = e.clientX;
      downY = e.clientY;
    });

    this.renderer.domElement.addEventListener("pointerup", (e) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hits = this.raycaster.intersectObjects(this.roomMeshes, false);
      if (hits.length > 0) {
        const hitRoomKey = hits[0].object.userData?.roomKey;
        if (hitRoomKey) {
          this.onRoomSelect(hitRoomKey);
        }
      }
    });
  }

  handleResize() {
    if (!this.mountEl || !this.renderer || !this.camera) return;
    const w = Math.max(this.mountEl.clientWidth, 280);
    const h = Math.max(this.mountEl.clientHeight, 260);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  afterDraw(cb) {
    const gl = this.renderer.getContext();
    if (gl && typeof gl.fenceSync === "function") {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.isDisposed) return;
        const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (status === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } else {
      this.frameId = window.setTimeout(cb, 80);
    }
  }

  startLoop() {
    const tick = () => {
      if (this.isDisposed) return;
      const dt = Math.min(this.clock.getDelta(), 0.1);
      this.routeShaderUniforms.uTime.value += dt;

      // Smooth exponential damping for floor explosion
      const prevExplode = this.explodeCurrent;
      this.explodeCurrent = THREE.MathUtils.damp(this.explodeCurrent, this.explodeTarget, 6, dt);
      if (Math.abs(this.explodeCurrent - prevExplode) > 0.001) {
        this.applyFloorPositions();
        this.rebuild3DRouteTube();
      }

      // Smooth exponential damping for guide beacon along the 3D route spline
      this.stepProgress = THREE.MathUtils.damp(this.stepProgress, this.targetStepProgress, 7, dt);
      if (this.activeCurve && this.guideBeaconGroup) {
        const t = Math.max(0.01, Math.min(0.99, this.stepProgress));
        this.activeCurve.getPointAt(t, _vec3A);
        this.activeCurve.getPointAt(Math.min(1.0, t + 0.02), _vec3B);
        this.guideBeaconGroup.position.copy(_vec3A);
        this.guideBeaconGroup.lookAt(_vec3B);
      }

      // Smooth camera transition damping
      if (this.cameraTransitionActive) {
        this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.camTargetPos.x, 5, dt);
        this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, this.camTargetPos.y, 5, dt);
        this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, this.camTargetPos.z, 5, dt);

        this.controls.target.x = THREE.MathUtils.damp(this.controls.target.x, this.camTargetLook.x, 6, dt);
        this.controls.target.y = THREE.MathUtils.damp(this.controls.target.y, this.camTargetLook.y, 6, dt);
        this.controls.target.z = THREE.MathUtils.damp(this.controls.target.z, this.camTargetLook.z, 6, dt);

        if (this.camera.position.distanceToSquared(this.camTargetPos) < 0.15) {
          this.cameraTransitionActive = false;
        }
      }

      this.controls.update();
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    tick();
  }

  dispose() {
    this.isDisposed = true;
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      clearTimeout(this.frameId);
    }
    this.resizeObserver?.disconnect();
    this.renderer?.dispose();
  }
}
