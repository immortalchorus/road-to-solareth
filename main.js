const THREE = window.THREE;

const CONFIG = {
  maxPixelRatio: 1.35,
  enableShadows: false,
  tankMaxForwardSpeed: 42,
  tankMaxReverseSpeed: 18,
  tankAcceleration: 24,
  tankTurnSpeed: 1.55,
  turretTurnSpeed: 2.7,
  turretPitchSpeed: 1.4,
  tankHoverHeight: 4.8,
  verticalThrust: 34,
  hoverGravity: 26,
  landingCushionHeight: 8,
  landingDamping: 0.68,
  landingSpring: 18,
  flightYawSpeed: 1.35,
  flightPitchSpeed: 1.2,
  flightLevelSpeed: 2.4,
  maxFlightPitch: 0.38,
  maxFlightRoll: 0.52,
  tankCollisionRadius: 5.2,
  projectileCooldown: 0.085,
  projectileRadius: 0.34,
  projectileCollisionRadius: 0.52,
  maxProjectiles: 46,
  homingAimDistance: 680,
  homingAimCone: 0.86,
  homingTurnRate: 8.5,
  homingSpeed: 150,
  homingLife: 5.2,
  emergencyClearRadius: 58,
  chunkSize: 220,
  visibleChunkRadius: 2,
  enemySpawnEvery: 7.5,
  enemySpawnChance: 0.42,
  maxEnemies: 5,
  skyDroneCount: 7,
  worldColors: {
    sand: 0x9b3f28,
    darkSand: 0x5f2923,
    road: 0x3a2f34,
    crystal: 0x58f3ff,
    gold: 0xffc45c
  }
};

const canvas = document.querySelector("#game-canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.maxPixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = CONFIG.enableShadows;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.82;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x231027);
scene.fog = new THREE.FogExp2(0x522d35, 0.0048);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 2600);
const clock = new THREE.Clock();

const input = {};
const gameKeyCodes = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Escape", "KeyF", "KeyB", "KeyH", "KeyY", "KeyV", "ShiftLeft", "ShiftRight", "Tab"]);
const cameraProfiles = {
  chase: { height: 16, distance: 28, lookHeight: 5.8, fov: 62, settle: 0.035 },
  worm: { height: 5.2, distance: 42, lookHeight: 8.8, fov: 72, settle: 0.02 }
};
let cameraMode = "chase";
const hud = {
  speed: document.querySelector("#speed"),
  turret: document.querySelector("#turret-angle"),
  distance: document.querySelector("#distance"),
  destroyed: document.querySelector("#destroyed"),
  status: document.querySelector("#status"),
  musicButton: document.querySelector("#music-button")
};

const poeticStatuses = [
  "Low moons over the red waste.",
  "The road remembers an empire.",
  "Solareth glimmers beyond the dust.",
  "Signal ghosts move through the ruins.",
  "The tank hums beneath an alien sky.",
  "Clouds sleep low on the horizon.",
  "Something metallic walks among the stones.",
  "The pyramids are not ancient. They are waiting.",
  "The Glass Road bends through the Broken Empire.",
  "The Dreaming Signal wakes in the rusted cities.",
  "Far cities burn without making a sound."
];

let destroyedEnemies = 0;
let distanceTravelled = 0;
let statusTimer = 0;
let currentStatus = 0;

const materials = {
  tankDark: new THREE.MeshStandardMaterial({ color: 0x181a20, metalness: 0.72, roughness: 0.42 }),
  tankTrim: new THREE.MeshStandardMaterial({ color: 0x263945, metalness: 0.6, roughness: 0.35 }),
  tankLight: new THREE.MeshStandardMaterial({ color: 0x6f828b, metalness: 0.58, roughness: 0.38 }),
  warmMechanics: new THREE.MeshStandardMaterial({ color: 0x5b3f2c, metalness: 0.5, roughness: 0.62 }),
  blueGlow: new THREE.MeshStandardMaterial({ color: 0x58e9ff, emissive: 0x32cfff, emissiveIntensity: 1.6 }),
  orangeGlow: new THREE.MeshStandardMaterial({ color: 0xff9b32, emissive: 0xff5f12, emissiveIntensity: 2.2 }),
  enemy: new THREE.MeshStandardMaterial({ color: 0x3b3d42, metalness: 0.7, roughness: 0.35 }),
  redEye: new THREE.MeshStandardMaterial({ color: 0xff2e2e, emissive: 0xff1010, emissiveIntensity: 2.4 }),
  ruin: new THREE.MeshStandardMaterial({ color: 0x57555f, metalness: 0.32, roughness: 0.76 }),
  darkMetal: new THREE.MeshStandardMaterial({ color: 0x20242b, metalness: 0.78, roughness: 0.36 }),
  plant: new THREE.MeshStandardMaterial({ color: 0x384f39, roughness: 0.76 }),
  plantMouth: new THREE.MeshStandardMaterial({ color: 0x762343, emissive: 0x2b0015, roughness: 0.6 }),
  water: new THREE.MeshStandardMaterial({ color: 0x5ed5ff, emissive: 0x1b7d9a, transparent: true, opacity: 0.52, side: THREE.DoubleSide }),
  road: new THREE.MeshStandardMaterial({ color: CONFIG.worldColors.road, roughness: 0.92 }),
  terrain: new THREE.MeshStandardMaterial({ color: CONFIG.worldColors.sand, roughness: 0.95, vertexColors: true }),
  smoke: new THREE.MeshBasicMaterial({ color: 0x1a1112, transparent: true, opacity: 0.42, depthWrite: false })
};

let terrain;
let tank;
let projectiles;
let enemies;
let skyDrones;
let audio;
const explosionEffects = [];

window.addEventListener("resize", onResize);
window.addEventListener("keydown", event => {
  const gameKey = gameKeyCodes.has(event.code);
  const elevationKey = event.code === "KeyY" || (input.KeyY && ["ArrowUp", "ArrowDown"].includes(event.code));
  if (gameKey || elevationKey) {
    event.preventDefault();
    event.stopPropagation();
  }
  input[event.code] = true;
  if (event.code === "Space") input.fireHeld = true;
  if (event.code === "KeyH") input.heatSeekingHeld = true;
  if (event.code === "KeyV" && !event.repeat && tank) tank.centerTurret();
  if (event.code === "Tab" && !event.repeat) toggleCameraMode();
  if (event.code === "KeyF" && (input.ShiftLeft || input.ShiftRight) && tank) tank.releaseAltitudeHold();
  if (event.code === "Escape") emergencyClearAroundTank();
}, true);
window.addEventListener("keyup", event => {
  if (gameKeyCodes.has(event.code)) {
    event.preventDefault();
    event.stopPropagation();
  }
  input[event.code] = false;
  if (event.code === "Space") input.fireHeld = false;
  if (event.code === "KeyH") input.heatSeekingHeld = false;
}, true);
window.addEventListener("blur", () => {
  for (const key of Object.keys(input)) input[key] = false;
});
hud.musicButton.addEventListener("click", () => audio.start());

function initLights() {
  const hemi = new THREE.HemisphereLight(0xffd1a6, 0x2f2038, 1.8);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffb06b, 2.15);
  sun.position.set(-180, 260, 120);
  sun.castShadow = CONFIG.enableShadows;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -220;
  sun.shadow.camera.right = 220;
  sun.shadow.camera.top = 220;
  sun.shadow.camera.bottom = -220;
  scene.add(sun);
}

function createSky() {
  const skyGeo = new THREE.SphereGeometry(1500, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x160625) },
      bottomColor: { value: new THREE.Color(0xb34b31) }
    },
    vertexShader: "varying vec3 vWorldPosition; void main(){ vec4 worldPosition = modelMatrix * vec4(position, 1.0); vWorldPosition = worldPosition.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform vec3 topColor; uniform vec3 bottomColor; varying vec3 vWorldPosition; void main(){ float h = normalize(vWorldPosition).y * 0.5 + 0.5; gl_FragColor = vec4(mix(bottomColor, topColor, smoothstep(0.08, 0.9, h)), 1.0); }"
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  createMoon(-280, 170, -520, 66, 0xdab7ff, true);
  createMoon(360, 110, -430, 42, 0xf3c184, false);
  createCloudBand(-360, 72, -520, 260);
  createCloudBand(180, 64, -650, 330);
  createMountains();
}

function createMoon(x, y, z, radius, color, ringed) {
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 16),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.18, roughness: 0.9 })
  );
  moon.position.set(x, y, z);
  scene.add(moon);
  if (ringed) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 1.38, 2.4, 8, 96),
      new THREE.MeshBasicMaterial({ color: 0xf9d79a, transparent: true, opacity: 0.38 })
    );
    ring.rotation.x = Math.PI * 0.58;
    ring.rotation.z = Math.PI * 0.12;
    ring.position.copy(moon.position);
    scene.add(ring);
  }
}

function createCloudBand(x, y, z, width) {
  const cloud = new THREE.Mesh(
    new THREE.PlaneGeometry(width, 26),
    new THREE.MeshBasicMaterial({ color: 0xf1a073, transparent: true, opacity: 0.17, depthWrite: false, side: THREE.DoubleSide })
  );
  cloud.position.set(x, y, z);
  cloud.rotation.x = -0.08;
  scene.add(cloud);
}

function createMountains() {
  for (let i = 0; i < 36; i++) {
    const angle = (i / 36) * Math.PI * 2;
    const radius = 1000 + seededRandom(i * 19) * 220;
    const height = 90 + seededRandom(i * 31) * 170;
    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(55 + seededRandom(i * 7) * 70, height, 5),
      new THREE.MeshStandardMaterial({ color: 0x63333d, roughness: 1 })
    );
    mountain.position.set(Math.cos(angle) * radius, height * 0.5 - 28, Math.sin(angle) * radius);
    mountain.rotation.y = seededRandom(i) * Math.PI;
    scene.add(mountain);
  }
}

class Tank {
  constructor(parent) {
    this.group = new THREE.Group();
    this.speed = 0;
    this.maxForwardSpeed = CONFIG.tankMaxForwardSpeed;
    this.maxReverseSpeed = CONFIG.tankMaxReverseSpeed;
    this.acceleration = CONFIG.tankAcceleration;
    this.friction = 13;
    this.turnSpeed = CONFIG.tankTurnSpeed;
    this.turretTurnSpeed = CONFIG.turretTurnSpeed;
    this.turretPitchSpeed = CONFIG.turretPitchSpeed;
    this.turretPitch = 0;
    this.verticalVelocity = 0;
    this.altitudeHoldY = null;
    this.wasAltitudeClimbing = false;
    this.flightPitch = 0;
    this.flightRoll = 0;
    this.bumpTimer = 0;

    const addBox = (size, position, material = materials.tankTrim, rotation = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
      mesh.position.set(position[0], position[1], position[2]);
      mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
      mesh.castShadow = true;
      this.group.add(mesh);
      return mesh;
    };
    const addStalk = (fromX, fromZ, toX, toZ) => {
      const start = new THREE.Vector3(fromX, 1.36, fromZ);
      const end = new THREE.Vector3(toX, 1.36, toZ);
      const mid = start.clone().add(end).multiplyScalar(0.5);
      const direction = end.clone().sub(start);
      const length = direction.length();
      const unitDirection = direction.clone().normalize();
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, length, 10), materials.tankDark);
      stalk.position.copy(mid);
      stalk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), unitDirection);
      stalk.castShadow = true;
      this.group.add(stalk);

      const highlight = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, length * 0.92, 8), materials.blueGlow);
      highlight.position.copy(mid).add(new THREE.Vector3(0, 0.08, 0));
      highlight.quaternion.copy(stalk.quaternion);
      this.group.add(highlight);
    };

    const addFanPod = (x, z) => {
      const pod = new THREE.Group();
      pod.position.set(x, 1.58, z);

      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.72, 2.05, 0.62, 32), materials.tankLight);
      bowl.castShadow = true;
      pod.add(bowl);

      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 1.75, 0.42, 32), materials.darkMetal);
      skirt.position.y = -0.48;
      skirt.castShadow = true;
      pod.add(skirt);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.16, 10, 36), materials.darkMetal);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.38;
      pod.add(ring);

      const hub = new THREE.Mesh(new THREE.SphereGeometry(0.38, 14, 8), materials.tankTrim);
      hub.position.y = 0.42;
      pod.add(hub);

      for (let i = 0; i < 4; i++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 0.26), materials.tankDark);
        blade.position.y = 0.42;
        blade.rotation.y = i * Math.PI / 2 + 0.22;
        blade.castShadow = true;
        pod.add(blade);
      }

      const glow = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.18, 0.04, 28), materials.blueGlow);
      glow.position.y = -0.75;
      pod.add(glow);

      this.group.add(pod);
      return pod;
    };

    addBox([7.8, 1.0, 10.2], [0, 1.18, 0], materials.tankDark);
    addBox([7.0, 0.72, 8.6], [0, 2.0, -0.2], materials.tankLight);
    addBox([6.25, 0.26, 7.1], [0, 2.46, -0.28], materials.tankTrim);
    addBox([6.45, 0.42, 1.9], [0, 1.88, -4.75], materials.tankLight, [-0.3, 0, 0]);
    addBox([6.45, 0.42, 1.45], [0, 1.8, 4.6], materials.tankTrim, [0.24, 0, 0]);
    addBox([2.65, 0.32, 7.65], [-2.2, 2.58, -0.32], materials.tankLight, [0, 0, -0.1]);
    addBox([2.65, 0.32, 7.65], [2.2, 2.58, -0.32], materials.tankLight, [0, 0, 0.1]);
    addBox([2.15, 0.16, 3.0], [0, 2.82, -2.0], materials.tankDark);

    for (const x of [-4.2, 4.2]) {
      addBox([1.55, 1.12, 10.6], [x, 0.96, 0], materials.darkMetal);
      addBox([1.8, 0.36, 8.8], [x, 1.56, -0.25], materials.tankDark, [0, 0, x < 0 ? -0.12 : 0.12]);
      addBox([0.18, 0.72, 1.35], [x, 1.72, -3.9], materials.blueGlow);
      for (let z = -4.2; z <= 4.2; z += 1.68) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.22, 16), materials.darkMetal);
        wheel.position.set(x, 0.38, z);
        wheel.rotation.z = Math.PI / 2;
        wheel.castShadow = true;
        this.group.add(wheel);
      }
      for (let z = -4.6; z <= 4.6; z += 0.92) {
        addBox([1.68, 0.16, 0.36], [x, 0.06, z], materials.tankDark);
      }
    }
    for (const x of [-2.8, -1.65, -0.5, 0.65, 1.8, 2.95]) {
      const underWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 16), materials.warmMechanics);
      underWheel.position.set(x, 0.18, 3.7);
      underWheel.rotation.x = Math.PI / 2;
      underWheel.castShadow = true;
      this.group.add(underWheel);
    }
    addBox([6.2, 0.34, 0.45], [0, 0.22, 4.25], materials.warmMechanics);
    addStalk(-3.25, -2.25, -6.25, -5.25);
    addStalk(3.25, -2.25, 6.25, -5.25);
    addStalk(-3.25, 2.25, -6.25, 5.25);
    addStalk(3.25, 2.25, 6.25, 5.25);
    addFanPod(-6.45, -5.45);
    addFanPod(6.45, -5.45);
    addFanPod(-6.45, 5.45);
    addFanPod(6.45, 5.45);

    for (const x of [-2.1, 0, 2.1]) {
      addBox([1.15, 0.24, 0.24], [x, 2.58, -4.72], materials.blueGlow);
    }
    addBox([1.35, 0.18, 0.18], [-3.3, 2.42, -4.0], materials.orangeGlow);
    addBox([1.35, 0.18, 0.18], [3.3, 2.42, -4.0], materials.orangeGlow);
    addBox([0.72, 0.22, 0.2], [-1.45, 1.72, 4.92], materials.redEye);
    addBox([0.72, 0.22, 0.2], [1.45, 1.72, 4.92], materials.redEye);
    addBox([1.5, 0.26, 0.24], [0, 2.78, 2.55], materials.blueGlow);

    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.66, 1.35), materials.tankLight);
    cockpit.position.set(-1.25, 3.06, 1.85);
    cockpit.rotation.z = -0.08;
    cockpit.castShadow = true;
    this.group.add(cockpit);
    addBox([1.5, 0.18, 0.5], [-1.25, 3.42, 1.48], materials.tankDark);
    addBox([0.18, 2.8, 0.18], [-3.55, 3.75, 3.85], materials.darkMetal, [0.12, 0, 0]);
    addBox([0.1, 1.65, 0.1], [3.65, 3.35, 4.1], materials.darkMetal, [-0.08, 0, 0]);
    addBox([0.1, 2.85, 0.1], [3.25, 4.0, 3.7], materials.darkMetal, [-0.04, 0, 0]);

    this.turret = new THREE.Group();
    this.turret.position.set(0, 3.0, -0.55);
    const addTurretBox = (size, position, material = materials.tankTrim, rotation = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
      mesh.position.set(position[0], position[1], position[2]);
      mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
      mesh.castShadow = true;
      this.turret.add(mesh);
      return mesh;
    };
    const turretRing = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.45, 0.48, 24), materials.darkMetal);
    turretRing.castShadow = true;
    this.turret.add(turretRing);
    addTurretBox([4.35, 0.78, 3.5], [0, 0.48, -0.1], materials.tankLight);
    addTurretBox([3.55, 0.42, 2.65], [0, 1.02, -0.2], materials.tankTrim);
    addTurretBox([3.45, 0.42, 0.9], [0, 0.7, -1.9], materials.tankLight, [-0.08, 0, 0]);
    addTurretBox([2.2, 0.5, 1.05], [-0.1, 1.38, 0.92], materials.tankLight);
    addTurretBox([2.15, 0.2, 0.22], [-0.1, 1.72, 0.24], materials.blueGlow);
    addTurretBox([0.86, 0.86, 0.86], [1.75, 0.45, 0.55], materials.warmMechanics);
    addTurretBox([0.42, 0.18, 0.16], [-1.1, 0.18, 1.72], materials.redEye);
    addTurretBox([0.42, 0.18, 0.16], [1.1, 0.18, 1.72], materials.redEye);

    this.cannon = new THREE.Group();
    this.cannon.position.set(0, 0.66, -1.6);
    const addBarrelSegment = (radiusA, radiusB, length, z, material = materials.darkMetal) => {
      const segment = new THREE.Mesh(new THREE.CylinderGeometry(radiusA, radiusB, length, 16), material);
      segment.rotation.x = Math.PI / 2;
      segment.position.set(0, 0, z);
      segment.castShadow = true;
      this.cannon.add(segment);
      return segment;
    };
    addBarrelSegment(0.58, 0.68, 0.8, -0.38, materials.tankTrim);
    addBarrelSegment(0.38, 0.5, 1.55, -1.35, materials.darkMetal);
    addBarrelSegment(0.45, 0.45, 1.2, -2.85, materials.tankTrim);
    addBarrelSegment(0.25, 0.32, 3.7, -5.3, materials.darkMetal);
    addBarrelSegment(0.28, 0.28, 3.6, -8.85, materials.darkMetal);
    addBarrelSegment(0.34, 0.34, 0.95, -10.95, materials.tankTrim);
    this.barrel = addBarrelSegment(0.19, 0.22, 2.1, -12.45, materials.darkMetal);
    addBarrelSegment(0.42, 0.34, 0.78, -13.85, materials.tankTrim);
    const muzzleGlow = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8), materials.orangeGlow);
    muzzleGlow.position.set(0, 0, -14.35);
    this.cannon.add(muzzleGlow);
    this.turret.add(this.cannon);
    const turretAntenna = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.5, 8), materials.darkMetal);
    turretAntenna.position.set(-1.75, 2.05, 1.2);
    turretAntenna.rotation.x = 0.08;
    this.turret.add(turretAntenna);
    this.group.add(this.turret);

    parent.add(this.group);
  }

  update(delta, keys, terrainManager) {
    const pitchMode = keys.KeyY;
    const targetHoverYBeforeMove = terrainManager.getHeightAt(this.group.position.x, this.group.position.z) + CONFIG.tankHoverHeight;
    const airborne = this.group.position.y > targetHoverYBeforeMove + 0.35 || this.verticalVelocity > 0.1;
    const bankMode = keys.KeyB && airborne;
    const forwardInput = keys.ArrowUp && !pitchMode ? 1 : 0;
    const reverseInput = keys.ArrowDown && !pitchMode ? 1 : 0;
    const turningTurret = keys.ShiftLeft || keys.ShiftRight;

    if (forwardInput) this.speed += this.acceleration * delta;
    if (reverseInput) this.speed -= this.acceleration * delta;
    if (!forwardInput && !reverseInput) this.speed = moveToward(this.speed, 0, this.friction * delta);

    this.speed = THREE.MathUtils.clamp(this.speed, -this.maxReverseSpeed, this.maxForwardSpeed);
    if (this.bumpTimer > 0) {
      this.speed *= 0.985;
      this.bumpTimer -= delta;
    }
    const altitudeRelease = keys.KeyF && (keys.ShiftLeft || keys.ShiftRight);
    const altitudeClimb = keys.KeyF && !altitudeRelease;
    if (altitudeRelease) {
      this.releaseAltitudeHold();
    } else if (altitudeClimb) {
      this.altitudeHoldY = null;
      this.verticalVelocity += CONFIG.verticalThrust * delta;
      hud.status.textContent = "Vertical thrusters flare beneath the hull.";
      statusTimer = 3;
    } else if (this.wasAltitudeClimbing) {
      this.holdCurrentAltitude();
    }
    this.wasAltitudeClimbing = altitudeClimb;

    if (bankMode) {
      if (keys.ArrowLeft) {
        this.group.rotation.y += CONFIG.flightYawSpeed * delta;
        this.flightRoll = moveToward(this.flightRoll, CONFIG.maxFlightRoll, CONFIG.flightLevelSpeed * delta);
      } else if (keys.ArrowRight) {
        this.group.rotation.y -= CONFIG.flightYawSpeed * delta;
        this.flightRoll = moveToward(this.flightRoll, -CONFIG.maxFlightRoll, CONFIG.flightLevelSpeed * delta);
      } else {
        this.flightRoll = moveToward(this.flightRoll, 0, CONFIG.flightLevelSpeed * delta);
      }

      if (keys.ArrowUp) this.flightPitch = moveToward(this.flightPitch, -CONFIG.maxFlightPitch, CONFIG.flightPitchSpeed * delta);
      else if (keys.ArrowDown) this.flightPitch = moveToward(this.flightPitch, CONFIG.maxFlightPitch, CONFIG.flightPitchSpeed * delta);
      else this.flightPitch = moveToward(this.flightPitch, 0, CONFIG.flightLevelSpeed * delta);

      hud.status.textContent = "The hover-tank banks like a heavy aircraft.";
      statusTimer = 3;
    } else if (turningTurret) {
      if (keys.ArrowLeft) this.turret.rotation.y += this.turretTurnSpeed * delta;
      if (keys.ArrowRight) this.turret.rotation.y -= this.turretTurnSpeed * delta;
    } else if (pitchMode) {
      if (keys.ArrowUp) this.turretPitch += this.turretPitchSpeed * delta;
      if (keys.ArrowDown) this.turretPitch -= this.turretPitchSpeed * delta;
    } else {
      const turnScale = THREE.MathUtils.clamp(Math.abs(this.speed) / 18, 0.25, 1);
      if (keys.ArrowLeft) this.group.rotation.y += this.turnSpeed * turnScale * delta;
      if (keys.ArrowRight) this.group.rotation.y -= this.turnSpeed * turnScale * delta;
    }

    if (!bankMode) {
      this.flightPitch = moveToward(this.flightPitch, 0, CONFIG.flightLevelSpeed * delta);
      this.flightRoll = moveToward(this.flightRoll, 0, CONFIG.flightLevelSpeed * delta);
    }
    this.group.rotation.x = this.flightPitch;
    this.group.rotation.z = this.flightRoll;

    this.turretPitch = THREE.MathUtils.clamp(this.turretPitch, -0.3, 0.72);
    this.cannon.rotation.x = this.turretPitch;

    const forward = new THREE.Vector3(-Math.sin(this.group.rotation.y), 0, -Math.cos(this.group.rotation.y));
    const previousPosition = this.group.position.clone();
    this.group.position.addScaledVector(forward, this.speed * delta);
    const targetHoverY = terrainManager.getHeightAt(this.group.position.x, this.group.position.z) + CONFIG.tankHoverHeight;
    if (this.altitudeHoldY !== null) {
      const heldY = Math.max(this.altitudeHoldY, targetHoverY);
      const altitudeError = heldY - this.group.position.y;
      this.verticalVelocity = moveToward(this.verticalVelocity, altitudeError * 4.5, CONFIG.hoverGravity * 1.7 * delta);
    } else {
      this.verticalVelocity -= CONFIG.hoverGravity * delta;
    }
    const hoverClearance = this.group.position.y - targetHoverY;
    if (this.altitudeHoldY === null && hoverClearance < CONFIG.landingCushionHeight && this.verticalVelocity < 0) {
      const cushion = THREE.MathUtils.clamp(1 - hoverClearance / CONFIG.landingCushionHeight, 0, 1);
      this.verticalVelocity += CONFIG.landingSpring * cushion * delta;
      this.verticalVelocity *= 1 - CONFIG.landingDamping * cushion * delta;
    }
    this.group.position.y += this.verticalVelocity * delta;
    if (this.group.position.y <= targetHoverY) {
      this.group.position.y = targetHoverY;
      this.verticalVelocity = Math.max(0, this.verticalVelocity * 0.18);
    }
    if (terrainManager.resolveTankCollision(this, previousPosition)) {
      this.bumpTimer = 0.28;
    }
  }

  getTurretWorldDirection() {
    return new THREE.Vector3(0, 0, -1).applyQuaternion(this.cannon.getWorldQuaternion(new THREE.Quaternion())).normalize();
  }

  centerTurret() {
    this.turret.rotation.y = 0;
    this.turretPitch = 0;
    this.cannon.rotation.x = 0;
    hud.status.textContent = "Turret centered for a straight shot.";
    statusTimer = 2.5;
  }

  holdCurrentAltitude() {
    const terrainHoverY = terrain.getHeightAt(this.group.position.x, this.group.position.z) + CONFIG.tankHoverHeight;
    if (this.group.position.y > terrainHoverY + 0.35) {
      this.altitudeHoldY = this.group.position.y;
      this.verticalVelocity = 0;
      hud.status.textContent = "Altitude hold engaged.";
      statusTimer = 3;
    }
  }

  releaseAltitudeHold() {
    if (this.altitudeHoldY !== null) {
      this.altitudeHoldY = null;
      this.verticalVelocity = Math.min(this.verticalVelocity, 0);
      hud.status.textContent = "Altitude hold released.";
      statusTimer = 3;
    }
  }

  getMuzzleWorldPosition() {
    return this.cannon.localToWorld(new THREE.Vector3(0, 0, -14.35));
  }
}

class TerrainManager {
  constructor(parent) {
    this.parent = parent;
    this.chunks = new Map();
    this.destructibles = [];
    this.size = CONFIG.chunkSize;
    this.radius = CONFIG.visibleChunkRadius;
  }

  update(position) {
    const cx = Math.floor(position.x / this.size);
    const cz = Math.floor(position.z / this.size);
    const wanted = new Set();

    for (let x = cx - this.radius; x <= cx + this.radius; x++) {
      for (let z = cz - this.radius; z <= cz + this.radius; z++) {
        const key = `${x},${z}`;
        wanted.add(key);
        if (!this.chunks.has(key)) this.createChunk(x, z, key);
      }
    }

    for (const [key, chunk] of this.chunks) {
      if (!wanted.has(key)) {
        this.parent.remove(chunk);
        this.destructibles = this.destructibles.filter(item => item.chunk !== chunk);
        disposeObject(chunk);
        this.chunks.delete(key);
      }
    }
  }

  createChunk(cx, cz, key) {
    const group = new THREE.Group();
    group.position.set(cx * this.size, 0, cz * this.size);
    const segments = 28;
    const geo = new THREE.PlaneGeometry(this.size, this.size, segments, segments);
    geo.rotateX(-Math.PI / 2);
    const colors = [];
    const color = new THREE.Color();

    for (const vertex of geo.attributes.position.array.keys()) {
      if (vertex % 3 !== 0) continue;
      const i = vertex;
      const lx = geo.attributes.position.array[i];
      const lz = geo.attributes.position.array[i + 2];
      const wx = lx + group.position.x;
      const wz = lz + group.position.z;
      const h = this.getHeightAt(wx, wz);
      geo.attributes.position.array[i + 1] = h;
      const shade = 0.82 + seededRandom(Math.floor(wx * 0.37) ^ Math.floor(wz * 0.41)) * 0.28;
      color.setHex(CONFIG.worldColors.sand).multiplyScalar(shade);
      colors.push(color.r, color.g, color.b);
    }

    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, materials.terrain);
    mesh.receiveShadow = true;
    group.add(mesh);

    this.addRoads(group, cx, cz);
    this.addScenery(group, cx, cz);
    this.parent.add(group);
    this.chunks.set(key, group);
  }

  addRoads(group, cx, cz) {
    const r = seededRandom(cx * 91 + cz * 177);
    if (Math.abs((cx + cz) % 4) === 0 || r > 0.78) {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(this.size * 1.24, 18 + r * 16), materials.road);
      road.rotation.x = -Math.PI / 2;
      road.rotation.z = (r - 0.5) * 0.55;
      road.position.y = 0.22;
      road.receiveShadow = true;
      group.add(road);
    }
  }

  addScenery(group, cx, cz) {
    const count = 8 + Math.floor(seededRandom(cx * 11 - cz * 29) * 8);
    for (let i = 0; i < count; i++) {
      const seed = cx * 10000 + cz * 101 + i * 37;
      const x = (seededRandom(seed) - 0.5) * this.size * 0.9;
      const z = (seededRandom(seed + 9) - 0.5) * this.size * 0.9;
      const wx = group.position.x + x;
      const wz = group.position.z + z;
      const y = this.getHeightAt(wx, wz);
      let object;
      const pick = seededRandom(seed + 19);

      if (pick < 0.24) object = createRock(seed);
      else if (pick < 0.38) object = createGlowingCrystal(seed);
      else if (pick < 0.5) object = createRuinedTower(seed);
      else if (pick < 0.61) object = createBrokenArch(seed);
      else if (pick < 0.72) object = createHighTechPyramid(seed);
      else if (pick < 0.83) object = createCarnivorousPlant(seed);
      else if (pick < 0.92) object = createMetalWreckage(seed);
      else object = createWaterfallCliff(seed);

      object.position.set(x, y, z);
      object.rotation.y = seededRandom(seed + 5) * Math.PI * 2;
      this.registerDestructible(object, group, 6 + seededRandom(seed + 41) * 12);
      group.add(object);
    }

    if (Math.abs(cx) + Math.abs(cz) > 2 && seededRandom(cx * 7 + cz * 13) > 0.93) {
      const city = createDistantCity(CONFIG.worldColors.gold);
      city.position.set(0, 2, 0);
      city.scale.setScalar(0.65 + seededRandom(cx + cz) * 0.8);
      this.registerDestructible(city, group, 26 * city.scale.x);
      group.add(city);
    }

    if (Math.abs(cx) + Math.abs(cz) > 2 && seededRandom(cx * 53 - cz * 61) > 0.9) {
      const burningCity = createBurningDystopianCity(cx * 41 + cz * 97);
      burningCity.position.set(
        (seededRandom(cx * 23 + cz) - 0.5) * this.size * 0.45,
        2,
        (seededRandom(cx - cz * 17) - 0.5) * this.size * 0.45
      );
      burningCity.scale.setScalar(0.75 + seededRandom(cx * 5 + cz * 3) * 0.8);
      this.registerDestructible(burningCity, group, 30 * burningCity.scale.x);
      group.add(burningCity);
    }
  }

  registerDestructible(object, chunk, radius) {
    object.userData.destructible = true;
    object.userData.collisionRadius = radius;
    const position = new THREE.Vector3(
      chunk.position.x + object.position.x,
      chunk.position.y + object.position.y,
      chunk.position.z + object.position.z
    );
    this.destructibles.push({ object, chunk, radius, position });
  }

  destroyDestructible(item) {
    if (!item || !item.object.parent) return false;
    createExplosion(item.position);
    item.object.parent.remove(item.object);
    disposeObject(item.object);
    this.destructibles = this.destructibles.filter(candidate => candidate !== item);
    return true;
  }

  destroyNear(position, radius) {
    let destroyed = 0;
    for (const item of [...this.destructibles]) {
      if (!item.object.parent) {
        this.destructibles = this.destructibles.filter(candidate => candidate !== item);
        continue;
      }
      const hitRadius = radius + item.radius;
      const dx = item.position.x - position.x;
      const dy = item.position.y - position.y;
      const dz = item.position.z - position.z;
      if (dx * dx + dy * dy + dz * dz <= hitRadius * hitRadius) {
        if (this.destroyDestructible(item)) destroyed++;
      }
    }
    return destroyed;
  }

  hitDestructible(position, radius) {
    let closest = null;
    let closestDistance = Infinity;
    for (const item of this.destructibles) {
      if (!item.object.parent) continue;
      const hitRadius = radius + item.radius;
      const dx = item.position.x - position.x;
      const dy = item.position.y - position.y;
      const dz = item.position.z - position.z;
      const distanceSq = dx * dx + dy * dy + dz * dz;
      if (distanceSq <= hitRadius * hitRadius && distanceSq < closestDistance) {
        closest = item;
        closestDistance = distanceSq;
      }
    }
    return this.destroyDestructible(closest);
  }

  resolveTankCollision(tankRef, previousPosition) {
    const tankPosition = tankRef.group.position;
    const tankHoverY = this.getHeightAt(tankPosition.x, tankPosition.z) + CONFIG.tankHoverHeight;
    for (const item of this.destructibles) {
      if (!item.object.parent) continue;
      const obstacleTop = item.position.y + Math.max(8, item.radius * 0.75);
      if (tankPosition.y > obstacleTop) continue;
      const dx = tankPosition.x - item.position.x;
      const dz = tankPosition.z - item.position.z;
      const distance = Math.hypot(dx, dz);
      const minimumDistance = CONFIG.tankCollisionRadius + item.radius;
      if (distance < minimumDistance) {
        const normal = distance > 0.001
          ? new THREE.Vector3(dx / distance, 0, dz / distance)
          : previousPosition.clone().sub(item.position).setY(0).normalize();
        if (normal.lengthSq() < 0.001) normal.set(0, 0, 1);
        tankPosition.x = item.position.x + normal.x * minimumDistance;
        tankPosition.z = item.position.z + normal.z * minimumDistance;
        tankPosition.y = Math.max(tankPosition.y, tankHoverY);
        tankRef.speed = Math.min(tankRef.speed, 0);
        hud.status.textContent = "The hull meets solid ruin. Back up and steer around.";
        statusTimer = 5;
        return true;
      }
    }
    return false;
  }

  getHeightAt(x, z) {
    const waves = Math.sin(x * 0.018) * 2.8 + Math.cos(z * 0.021) * 2.3 + Math.sin((x + z) * 0.009) * 4.4;
    const rough = (valueNoise(x * 0.035, z * 0.035) - 0.5) * 8.5;
    const crater = Math.sin(Math.hypot(x + 130, z - 90) * 0.021) * 1.3;
    return waves + rough + crater;
  }

  getNormalAt(x, z) {
    const sample = 1.5;
    const left = this.getHeightAt(x - sample, z);
    const right = this.getHeightAt(x + sample, z);
    const back = this.getHeightAt(x, z - sample);
    const front = this.getHeightAt(x, z + sample);
    return new THREE.Vector3(left - right, sample * 2, back - front).normalize();
  }
}

class EnemyManager {
  constructor(parent) {
    this.parent = parent;
    this.enemies = [];
    this.timer = 3;
  }

  update(delta, tankRef) {
    this.timer -= delta;
    if (this.timer <= 0) {
      this.timer = CONFIG.enemySpawnEvery + Math.random() * 5;
      if (this.enemies.length < CONFIG.maxEnemies && Math.random() < CONFIG.enemySpawnChance) this.spawn(tankRef);
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(delta, tankRef);
      if (enemy.group.position.distanceTo(tankRef.group.position) < enemy.collisionRadius + 4.1) {
        tankRef.bumpTimer = 0.65;
        tankRef.speed *= -0.16;
      }
      if (enemy.dead) {
        this.parent.remove(enemy.group);
        disposeObject(enemy.group);
        this.enemies.splice(i, 1);
      }
    }
  }

  spawn(tankRef) {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(tankRef.group.quaternion);
    const side = new THREE.Vector3(1, 0, 0).applyQuaternion(tankRef.group.quaternion);
    const distance = 115 + Math.random() * 95;
    const offset = (Math.random() - 0.5) * 90;
    const pos = tankRef.group.position.clone().addScaledVector(forward, distance).addScaledVector(side, offset);
    pos.y = terrain.getHeightAt(pos.x, pos.z) + 1.5;
    const enemy = new Enemy(["walker", "android", "drone"][Math.floor(Math.random() * 3)]);
    enemy.group.position.copy(pos);
    this.parent.add(enemy.group);
    this.enemies.push(enemy);
  }
}

class Enemy {
  constructor(type) {
    this.type = type;
    this.group = new THREE.Group();
    this.health = 1;
    this.speed = type === "drone" ? 9 : 5;
    this.detectionRange = 170;
    this.collisionRadius = type === "drone" ? 3 : 4;
    this.dead = false;
    this.build();
  }

  build() {
    if (this.type === "drone") {
      const body = new THREE.Mesh(new THREE.OctahedronGeometry(2.3), materials.enemy);
      body.castShadow = true;
      this.group.add(body);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), materials.redEye);
      eye.position.set(0, 0.2, -2.05);
      this.group.add(eye);
      return;
    }

    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 1.3), materials.enemy);
    body.position.y = 2.6;
    body.castShadow = true;
    this.group.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 1.1), this.type === "android" ? materials.darkMetal : materials.enemy);
    head.position.y = 4.8;
    head.castShadow = true;
    this.group.add(head);
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.18, 0.08), materials.redEye);
    eye.position.set(0, 4.9, -0.6);
    this.group.add(eye);
    for (const x of [-0.7, 0.7]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.45, 2.2, 0.55), materials.enemy);
      leg.position.set(x, 1, 0);
      leg.castShadow = true;
      this.group.add(leg);
    }
  }

  update(delta, tankRef) {
    const toTank = tankRef.group.position.clone().sub(this.group.position);
    const distance = toTank.length();
    if (distance < this.detectionRange) {
      toTank.y = 0;
      toTank.normalize();
      this.group.position.addScaledVector(toTank, this.speed * delta);
      this.group.lookAt(tankRef.group.position.x, this.group.position.y, tankRef.group.position.z);
    }
    this.group.position.y = terrain.getHeightAt(this.group.position.x, this.group.position.z) + (this.type === "drone" ? 5 + Math.sin(performance.now() * 0.003) : 0);
  }

  destroy() {
    this.dead = true;
    destroyedEnemies++;
    createExplosion(this.group.position);
    audio.playExplosion();
  }
}

class SkyDroneManager {
  constructor(parent) {
    this.parent = parent;
    this.drones = [];
  }

  update(delta, tankRef) {
    while (this.drones.length < CONFIG.skyDroneCount) this.spawn(tankRef);

    for (let i = this.drones.length - 1; i >= 0; i--) {
      const drone = this.drones[i];
      drone.update(delta, tankRef);
      if (drone.dead || drone.group.position.distanceTo(tankRef.group.position) > 760) {
        this.parent.remove(drone.group);
        disposeObject(drone.group);
        this.drones.splice(i, 1);
      }
    }
  }

  spawn(tankRef) {
    const index = this.drones.length;
    const angle = seededRandom(performance.now() * 0.001 + index * 47) * Math.PI * 2;
    const distance = 180 + seededRandom(index * 97 + Math.floor(tankRef.group.position.x)) * 260;
    const drone = new SkyDrone(index + Math.floor(performance.now() * 0.01));
    drone.group.position.set(
      tankRef.group.position.x + Math.cos(angle) * distance,
      tankRef.group.position.y + 56 + seededRandom(index * 31) * 55,
      tankRef.group.position.z + Math.sin(angle) * distance
    );
    drone.anchor.copy(tankRef.group.position);
    drone.orbitRadius = distance;
    drone.orbitAngle = angle;
    this.parent.add(drone.group);
    this.drones.push(drone);
  }

  hitDrone(position, radius) {
    for (const drone of this.drones) {
      if (!drone.dead && drone.group.position.distanceTo(position) <= drone.collisionRadius + radius) {
        drone.destroy();
        return true;
      }
    }
    return false;
  }

  hitDroneAlongSegment(start, end, radius) {
    const path = end.clone().sub(start);
    const pathLengthSq = path.lengthSq();

    for (const drone of this.drones) {
      if (drone.dead) continue;
      const toDrone = drone.group.position.clone().sub(start);
      const t = pathLengthSq > 0.001 ? THREE.MathUtils.clamp(toDrone.dot(path) / pathLengthSq, 0, 1) : 0;
      const closest = start.clone().addScaledVector(path, t);
      if (closest.distanceTo(drone.group.position) <= drone.collisionRadius + radius) {
        drone.destroy();
        return true;
      }
    }

    return false;
  }

  acquireHomingTarget(origin, direction) {
    let bestTarget = null;
    let bestScore = CONFIG.homingAimCone;
    const aim = direction.clone().normalize();

    for (const drone of this.drones) {
      if (drone.dead) continue;
      const toDrone = drone.group.position.clone().sub(origin);
      const distance = toDrone.length();
      if (distance > CONFIG.homingAimDistance) continue;
      const score = aim.dot(toDrone.normalize());
      if (score > bestScore) {
        bestScore = score;
        bestTarget = drone;
      }
    }

    return bestTarget;
  }
}

class SkyDrone {
  constructor(seed) {
    this.seed = seed;
    this.group = new THREE.Group();
    this.anchor = new THREE.Vector3();
    this.orbitRadius = 240;
    this.orbitAngle = 0;
    this.altitude = 58 + seededRandom(seed * 11) * 48;
    this.speed = 0.18 + seededRandom(seed * 17) * 0.18;
    this.bob = seededRandom(seed * 23) * Math.PI * 2;
    this.collisionRadius = 6.2;
    this.dead = false;
    this.build();
  }

  build() {
    const add = (mesh) => {
      mesh.castShadow = true;
      this.group.add(mesh);
      return mesh;
    };

    const body = add(new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.55, 4.8), materials.tankLight));
    body.position.y = 0.05;

    const wing = add(new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.16, 1.05), materials.tankTrim));
    wing.position.set(0, -0.02, -0.35);

    const nose = add(new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.36, 0.85), materials.darkMetal));
    nose.position.set(0, 0.03, -2.72);

    const antenna = add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.3, 0.08), materials.darkMetal));
    antenna.position.set(0.82, 1.28, 1.45);
    antenna.rotation.z = -0.1;

    const blue = add(new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.08, 0.12), materials.blueGlow));
    blue.position.set(0, 0.36, -1.2);

    const red = add(new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.1, 0.1), materials.redEye));
    red.position.set(0, -0.24, -2.42);
  }

  update(delta, tankRef) {
    this.anchor.lerp(tankRef.group.position, 0.018);
    this.orbitAngle += this.speed * delta;
    const sideDrift = Math.sin(performance.now() * 0.00035 + this.seed) * 22;
    this.group.position.x = this.anchor.x + Math.cos(this.orbitAngle) * this.orbitRadius + sideDrift;
    this.group.position.z = this.anchor.z + Math.sin(this.orbitAngle) * this.orbitRadius;
    this.group.position.y = terrain.getHeightAt(this.group.position.x, this.group.position.z) + this.altitude + Math.sin(performance.now() * 0.0015 + this.bob) * 7;
    this.group.lookAt(tankRef.group.position.x, this.group.position.y - 8, tankRef.group.position.z);
  }

  destroy() {
    this.dead = true;
    destroyedEnemies++;
    createExplosion(this.group.position, {
      color: 0xffd46b,
      opacity: 0.92,
      radius: 2.4,
      growth: 28,
      life: 0.82,
      coreColor: 0xffffff
    });
    audio.playExplosion();
  }
}

class ProjectileManager {
  constructor(parent) {
    this.parent = parent;
    this.projectiles = [];
    this.cooldown = 0;
  }

  update(delta, keys, tankRef, enemyManager, skyDroneManager) {
    this.cooldown -= delta;
    if (keys.fireHeld && this.cooldown <= 0) {
      this.fire(tankRef.getMuzzleWorldPosition(), tankRef.getTurretWorldDirection(), skyDroneManager, keys.heatSeekingHeld);
      this.cooldown = CONFIG.projectileCooldown;
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const shot = this.projectiles[i];
      shot.life -= delta;
      shot.previousPosition.copy(shot.mesh.position);
      if (shot.homingTarget && !shot.homingTarget.dead) {
        const toTarget = shot.homingTarget.group.position.clone().sub(shot.mesh.position);
        if (toTarget.lengthSq() > 0.001) {
          const desiredVelocity = toTarget.normalize().multiplyScalar(CONFIG.homingSpeed);
          shot.velocity.lerp(desiredVelocity, Math.min(1, CONFIG.homingTurnRate * delta));
          shot.direction.copy(shot.velocity).normalize();
          shot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), shot.direction);
        }
      } else {
        shot.homingTarget = null;
      }
      shot.mesh.position.addScaledVector(shot.velocity, delta);
      shot.trail.position.copy(shot.mesh.position).addScaledVector(shot.direction, -1.6);
      shot.trail.quaternion.copy(shot.quaternion);
      shot.trail.scale.multiplyScalar(0.965);

      const groundHeight = terrain.getHeightAt(shot.mesh.position.x, shot.mesh.position.z);
      if (shot.mesh.position.y <= groundHeight + shot.radius * 0.4 && shot.velocity.y < 0) {
        const normal = terrain.getNormalAt(shot.mesh.position.x, shot.mesh.position.z);
        shot.velocity.reflect(normal).multiplyScalar(0.82);
        shot.velocity.y = Math.max(shot.velocity.y, 18);
        shot.direction.copy(shot.velocity).normalize();
        shot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), shot.direction);
        shot.mesh.position.y = groundHeight + shot.radius + 0.25;
        shot.bounces++;
        if (shot.bounces > 4) shot.life = -1;
      }

      for (const enemy of enemyManager.enemies) {
        if (!enemy.dead && shot.mesh.position.distanceTo(enemy.group.position) < enemy.collisionRadius + shot.radius) {
          enemy.destroy();
          shot.life = -1;
          break;
        }
      }

      if (shot.life > 0 && skyDroneManager.hitDroneAlongSegment(shot.previousPosition, shot.mesh.position, shot.radius)) {
        shot.life = -1;
      }

      if (shot.life > 0 && terrain.hitDestructible(shot.mesh.position, shot.radius)) {
        shot.life = -1;
        audio.playExplosion();
      }

      if (shot.life <= 0) {
        this.removeProjectile(i);
      }
    }
  }

  fire(position, direction, skyDroneManager, homingEnabled) {
    if (this.projectiles.length >= CONFIG.maxProjectiles) this.removeProjectile(0);
    const group = new THREE.Group();
    const target = homingEnabled ? skyDroneManager.acquireHomingTarget(position, direction) : null;
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(CONFIG.projectileRadius, 14, 8), materials.orangeGlow);
    mesh.position.copy(position);
    const trail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.34, 2.35, 8),
      new THREE.MeshBasicMaterial({ color: target ? 0xffd46b : 0xff7b32, transparent: true, opacity: target ? 0.42 : 0.3 })
    );
    trail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    trail.position.copy(position).addScaledVector(direction, -1.6);
    group.add(mesh, trail);
    this.parent.add(group);
    this.projectiles.push({
      group,
      mesh,
      trail,
      direction: direction.clone().normalize(),
      quaternion: trail.quaternion.clone(),
      velocity: direction.clone().normalize().multiplyScalar(target ? CONFIG.homingSpeed : 118),
      homingTarget: target,
      bounces: 0,
      life: target ? CONFIG.homingLife : 2.8,
      previousPosition: position.clone(),
      radius: CONFIG.projectileCollisionRadius
    });
    audio.playFire();
  }

  removeProjectile(index) {
    const shot = this.projectiles[index];
    if (!shot) return;
    this.parent.remove(shot.group);
    disposeObject(shot.group);
    this.projectiles.splice(index, 1);
  }
}

class AudioManager {
  constructor() {
    this.started = false;
  }

  async start() {
    if (this.started) return;
    this.started = true;
    hud.musicButton.textContent = "Silent Mode";
  }

  update() {
  }

  playFire() {
  }

  playExplosion() {
  }
}

initLights();
createSky();

terrain = new TerrainManager(scene);
tank = new Tank(scene);
projectiles = new ProjectileManager(scene);
enemies = new EnemyManager(scene);
skyDrones = new SkyDroneManager(scene);
audio = new AudioManager();

terrain.update(tank.group.position);
positionTankOnTerrain();
animate();

function animate() {
  const delta = Math.min(clock.getDelta(), 0.045);
  const previous = tank.group.position.clone();

  tank.update(delta, input, terrain);
  const moved = tank.group.position.distanceTo(previous);
  distanceTravelled += moved;
  terrain.update(tank.group.position);
  enemies.update(delta, tank);
  skyDrones.update(delta, tank);
  projectiles.update(delta, input, tank, enemies, skyDrones);
  updateCamera(delta);
  updateExplosions(delta);
  updateHUD(delta);
  audio.update(tank.speed);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function positionTankOnTerrain() {
  tank.group.position.set(0, terrain.getHeightAt(0, 0) + CONFIG.tankHoverHeight, 0);
}

function toggleCameraMode() {
  cameraMode = cameraMode === "chase" ? "worm" : "chase";
  hud.status.textContent = cameraMode === "worm" ? "Worm's-eye view engaged." : "Chase view restored.";
  statusTimer = 2.2;
}

function updateCamera(delta) {
  const profile = cameraProfiles[cameraMode];
  const behind = new THREE.Vector3(Math.sin(tank.group.rotation.y), 0, Math.cos(tank.group.rotation.y));
  const target = tank.group.position.clone().add(new THREE.Vector3(0, profile.height, 0)).addScaledVector(behind, profile.distance);
  camera.position.lerp(target, 1 - Math.pow(profile.settle, delta));
  camera.fov = THREE.MathUtils.lerp(camera.fov, profile.fov, 1 - Math.pow(0.025, delta));
  camera.updateProjectionMatrix();
  const look = tank.group.position.clone().add(new THREE.Vector3(0, profile.lookHeight, 0));
  camera.lookAt(look);
}

function updateHUD(delta) {
  hud.speed.textContent = `${Math.round(Math.abs(tank.speed) * 2.4)} kph`;
  hud.turret.textContent = `Yaw ${Math.round(THREE.MathUtils.radToDeg(wrapAngle(tank.turret.rotation.y)))} / Pitch ${Math.round(THREE.MathUtils.radToDeg(tank.turretPitch))} deg`;
  hud.distance.textContent = `${(distanceTravelled / 1000).toFixed(1)} km`;
  hud.destroyed.textContent = destroyedEnemies;
  statusTimer -= delta;
  if (statusTimer <= 0) {
    currentStatus = (currentStatus + 1) % poeticStatuses.length;
    hud.status.textContent = poeticStatuses[currentStatus];
    statusTimer = 10 + Math.random() * 8;
  }
}

function emergencyClearAroundTank() {
  if (!tank || !terrain || !enemies) return;
  const center = tank.group.position;
  const removedObjects = terrain.destroyNear(center, CONFIG.emergencyClearRadius);
  let removedEnemies = 0;
  for (const enemy of enemies.enemies) {
    if (!enemy.dead && enemy.group.position.distanceTo(center) <= CONFIG.emergencyClearRadius + enemy.collisionRadius) {
      enemy.destroy();
      removedEnemies++;
    }
  }
  if (removedObjects + removedEnemies > 0) {
    tank.speed = Math.max(tank.speed, 8);
    hud.status.textContent = "The path opens through dust and sparks.";
    statusTimer = 7;
  }
}

function createDistantCity(colorHex) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: colorHex, emissive: colorHex, emissiveIntensity: 0.55, transparent: true, opacity: 0.75 });
  for (let i = 0; i < 11; i++) {
    const h = 10 + seededRandom(i * 15) * 42;
    const w = 5 + seededRandom(i * 17) * 6;
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.3, w, h, 6), mat);
    spire.position.set((i - 5) * 10, h * 0.5, seededRandom(i * 21) * 15);
    group.add(spire);
    if (i % 3 === 0) {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(w * 0.9, 12, 8), mat);
      dome.position.set(spire.position.x, h + w * 0.35, spire.position.z);
      group.add(dome);
    }
  }
  return group;
}

function createBurningDystopianCity(seed) {
  const group = new THREE.Group();
  const towerMat = new THREE.MeshStandardMaterial({ color: 0x171417, metalness: 0.45, roughness: 0.78 });
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xff5a19, transparent: true, opacity: 0.82 });
  const emberMat = new THREE.MeshBasicMaterial({ color: 0xffc35a, transparent: true, opacity: 0.75 });

  for (let i = 0; i < 14; i++) {
    const h = 14 + seededRandom(seed + i * 13) * 52;
    const w = 4 + seededRandom(seed + i * 7) * 7;
    const x = (i - 6.5) * 8 + (seededRandom(seed + i * 3) - 0.5) * 6;
    const z = (seededRandom(seed + i * 11) - 0.5) * 24;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * 0.75), towerMat);
    tower.position.set(x, h * 0.5, z);
    tower.rotation.z = (seededRandom(seed + i * 17) - 0.5) * 0.14;
    tower.castShadow = true;
    group.add(tower);

    if (seededRandom(seed + i * 19) > 0.28) {
      const flame = new THREE.Mesh(new THREE.ConeGeometry(w * 0.45, 5 + seededRandom(seed + i * 23) * 7, 7), flameMat);
      flame.position.set(x, h + flame.geometry.parameters.height * 0.32, z);
      flame.rotation.y = seededRandom(seed + i * 29) * Math.PI;
      group.add(flame);

      const ember = new THREE.Mesh(new THREE.SphereGeometry(w * 0.26, 8, 6), emberMat);
      ember.position.set(x + (seededRandom(seed + i * 31) - 0.5) * 2, h + 1.6, z);
      group.add(ember);
    }

    if (seededRandom(seed + i * 37) > 0.35) {
      const smoke = new THREE.Mesh(
        new THREE.CylinderGeometry(w * 0.7, w * 0.35, 20 + seededRandom(seed + i * 41) * 18, 8, 1, true),
        materials.smoke
      );
      smoke.position.set(x + (seededRandom(seed + i * 43) - 0.5) * 5, h + smoke.geometry.parameters.height * 0.45, z);
      smoke.rotation.z = (seededRandom(seed + i * 47) - 0.5) * 0.35;
      group.add(smoke);
    }
  }

  return group;
}

function createExplosion(position, options = {}) {
  const radius = options.radius ?? 1.2;
  const life = options.life ?? 0.55;
  const growth = options.growth ?? 14;
  const color = options.color ?? 0xffb05c;
  const opacity = options.opacity ?? 0.65;
  while (explosionEffects.length >= 12) {
    const oldest = explosionEffects.shift();
    scene.remove(oldest.group);
    disposeObject(oldest.group);
  }
  const group = new THREE.Group();
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 18, 12),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity })
  );
  group.position.copy(position);
  group.add(sphere);
  if (options.coreColor) {
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.38, 12, 8),
      new THREE.MeshBasicMaterial({ color: options.coreColor, transparent: true, opacity: 0.9 })
    );
    group.add(core);
    explosionEffects.push({ group, sphere, core, life, maxLife: life, growth, opacity });
    scene.add(group);
    return;
  }
  scene.add(group);
  explosionEffects.push({ group, sphere, life, maxLife: life, growth, opacity });
}

function updateExplosions(delta) {
  for (let i = explosionEffects.length - 1; i >= 0; i--) {
    const effect = explosionEffects[i];
    effect.life -= delta;
    effect.sphere.scale.addScalar(delta * effect.growth);
    const fade = Math.max(0, effect.life / effect.maxLife);
    effect.sphere.material.opacity = effect.opacity * fade;
    if (effect.core) {
      effect.core.scale.addScalar(delta * effect.growth * 0.45);
      effect.core.material.opacity = 0.9 * fade;
    }
    if (effect.life <= 0) {
      scene.remove(effect.group);
      disposeObject(effect.group);
      explosionEffects.splice(i, 1);
    }
  }
}

function createRock(seed) {
  const group = new THREE.Group();
  const count = 1 + Math.floor(seededRandom(seed) * 4);
  const mat = new THREE.MeshStandardMaterial({ color: 0x6d3b32, roughness: 1 });
  for (let i = 0; i < count; i++) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(2 + seededRandom(seed + i) * 5, 0), mat);
    rock.position.set((seededRandom(seed + i * 2) - 0.5) * 8, rock.geometry.parameters.radius * 0.5, (seededRandom(seed + i * 3) - 0.5) * 8);
    rock.scale.y = 0.55 + seededRandom(seed + i * 4) * 1.6;
    rock.castShadow = true;
    group.add(rock);
  }
  return group;
}

function createGlowingCrystal(seed) {
  const group = new THREE.Group();
  const count = 2 + Math.floor(seededRandom(seed) * 4);
  for (let i = 0; i < count; i++) {
    const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.8, 5 + seededRandom(seed + i) * 7, 5), materials.blueGlow);
    crystal.position.set((seededRandom(seed + i * 5) - 0.5) * 7, crystal.geometry.parameters.height * 0.5, (seededRandom(seed + i * 6) - 0.5) * 7);
    crystal.rotation.z = (seededRandom(seed + i * 3) - 0.5) * 0.4;
    group.add(crystal);
  }
  return group;
}

function createRuinedTower(seed) {
  const group = new THREE.Group();
  const height = 12 + seededRandom(seed) * 22;
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 4.8, height, 7, 1, true), materials.ruin);
  tower.position.y = height * 0.5;
  tower.castShadow = true;
  group.add(tower);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 9, 6), materials.blueGlow);
  antenna.position.y = height + 4;
  group.add(antenna);
  return group;
}

function createBrokenArch(seed) {
  const group = new THREE.Group();
  for (const x of [-4, 4]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 13 + seededRandom(seed + x) * 5, 2.2), materials.ruin);
    pillar.position.set(x, pillar.geometry.parameters.height * 0.5, 0);
    pillar.castShadow = true;
    group.add(pillar);
  }
  const top = new THREE.Mesh(new THREE.TorusGeometry(4, 0.55, 8, 22, Math.PI), materials.ruin);
  top.position.y = 13.2;
  top.rotation.z = Math.PI;
  group.add(top);
  return group;
}

function createHighTechPyramid(seed) {
  const group = new THREE.Group();
  const pyramid = new THREE.Mesh(new THREE.ConeGeometry(8 + seededRandom(seed) * 8, 12 + seededRandom(seed + 1) * 15, 4), materials.darkMetal);
  pyramid.position.y = pyramid.geometry.parameters.height * 0.5;
  pyramid.rotation.y = Math.PI / 4;
  pyramid.castShadow = true;
  group.add(pyramid);
  const seam = new THREE.Mesh(new THREE.BoxGeometry(0.35, pyramid.geometry.parameters.height * 0.8, 0.35), materials.orangeGlow);
  seam.position.y = pyramid.geometry.parameters.height * 0.55;
  seam.position.z = pyramid.geometry.parameters.radius * 0.5;
  group.add(seam);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 10), materials.blueGlow);
  orb.position.y = pyramid.geometry.parameters.height + 3 + Math.sin(seed) * 0.5;
  group.add(orb);
  return group;
}

function createCarnivorousPlant(seed) {
  const group = new THREE.Group();
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.9, 7, 8), materials.plant);
  stalk.position.y = 3.5;
  stalk.rotation.z = (seededRandom(seed) - 0.5) * 0.35;
  group.add(stalk);
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.68), materials.plantMouth);
  mouth.position.y = 7.6;
  mouth.scale.set(1.1, 0.75, 0.72);
  mouth.rotation.x = -0.9;
  group.add(mouth);
  for (let i = 0; i < 8; i++) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.75, 5), materials.orangeGlow);
    tooth.position.set((i - 3.5) * 0.45, 7.72, -1.05);
    tooth.rotation.x = Math.PI;
    group.add(tooth);
  }
  return group;
}

function createWaterfallCliff(seed) {
  const group = new THREE.Group();
  const cliff = new THREE.Mesh(new THREE.BoxGeometry(18, 22, 5), new THREE.MeshStandardMaterial({ color: 0x4b3030, roughness: 1 }));
  cliff.position.y = 11;
  cliff.castShadow = true;
  group.add(cliff);
  const fall = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 20), materials.water);
  fall.position.set(0, 9.2, -2.62);
  group.add(fall);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(7, 24), materials.water);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, 0.12, -8);
  group.add(pool);
  return group;
}

function createMetalWreckage(seed) {
  const group = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const part = new THREE.Mesh(new THREE.BoxGeometry(6 + seededRandom(seed + i) * 5, 1.2, 2.4), materials.darkMetal);
    part.position.set((seededRandom(seed + i * 4) - 0.5) * 10, 0.8 + i * 0.35, (seededRandom(seed + i * 8) - 0.5) * 8);
    part.rotation.set(seededRandom(seed + i) * 0.5, seededRandom(seed + i * 2) * Math.PI, seededRandom(seed + i * 3) * 0.5);
    part.castShadow = true;
    group.add(part);
  }
  return group;
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function moveToward(value, target, amount) {
  if (value < target) return Math.min(value + amount, target);
  if (value > target) return Math.max(value - amount, target);
  return target;
}

function wrapAngle(radians) {
  return THREE.MathUtils.euclideanModulo(radians + Math.PI, Math.PI * 2) - Math.PI;
}

function seededRandom(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function valueNoise(x, z) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const a = seededRandom(xi * 374761 + zi * 668265);
  const b = seededRandom((xi + 1) * 374761 + zi * 668265);
  const c = seededRandom(xi * 374761 + (zi + 1) * 668265);
  const d = seededRandom((xi + 1) * 374761 + (zi + 1) * 668265);
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, u), THREE.MathUtils.lerp(c, d, u), v);
}

function disposeObject(object) {
  object.traverse(child => {
    if (child.geometry) child.geometry.dispose();
    if (child.material && !Object.values(materials).includes(child.material)) {
      if (Array.isArray(child.material)) child.material.forEach(mat => mat.dispose());
      else child.material.dispose();
    }
  });
}
