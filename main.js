const THREE = window.THREE;

const CONFIG = {
  maxPixelRatio: 1.35,
  enableShadows: false,
  gameAudioGain: 1.35,
  tankMaxForwardSpeed: 108.3375,
  tankMaxReverseSpeed: 46.224,
  tankAcceleration: 92.448,
  tankTurnSpeed: 2.889,
  turretTurnSpeed: 3.645,
  turretPitchSpeed: 0.7425,
  tankHoverHeight: 4.8,
  verticalThrust: 57.375,
  hoverGravity: 43.875,
  landingCushionHeight: 8,
  landingDamping: 0.68,
  landingSpring: 24.3,
  flightLevelSpeed: 3.4668,
  maxFlightRoll: 0.52,
  maxFuel: 1000,
  fuelDrainPerMinute: 50,
  refuelTowerCount: 54,
  refuelTowerRadius: 8.5,
  missileTowerCount: 18,
  missileTowerRadius: 8.5,
  maxAmmo: 1000,
  radioChatterEvery: 30,
  tankCollisionRadius: 5.2,
  projectileCooldown: 0.085,
  projectileRadius: 0.34,
  projectileCollisionRadius: 0.52,
  cannonGravity: 5.5,
  bombRadius: 0.82,
  bombDropCount: 8,
  bombGravity: 38,
  bombPayloadSpread: 2.8,
  maxProjectiles: 46,
  homingAimDistance: 680,
  homingAimCone: 0.86,
  homingTurnRate: 8.5,
  homingSpeed: 150,
  homingLife: 5.2,
  emergencyClearRadius: 58,
  chunkSize: 220,
  visibleChunkRadius: 2,
  compoundSize: Math.sqrt(200000),
  enemySpawnEvery: 7.5,
  enemySpawnChance: 0.42,
  maxEnemies: 5,
  skyDroneCount: 7,
  maxHitPoints: 300,
  enemyTankHealth: 5,
  enemyTankDamage: 10,
  enemyTankFireInterval: 2.1,
  enemyTankProjectileSpeed: 58,
  prisonPatrolTankCount: 16,
  prisonEscapeeCount: 48,
  giantTarantulaHealth: 12,
  giantTarantulaDamage: 5,
  wingmanMaxHitPoints: 150,
  escortDroneCount: 4,
  escortDroneAmmo: 10,
  escortDroneDamage: 2,
  escortDroneProjectileSpeed: 68,
  escortDroneFireInterval: 10,
  sessionDuration: 180,
  worldColors: {
    sand: 0x503522,
    darkSand: 0x32231c,
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
renderer.toneMappingExposure = 0.66;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030504);
scene.fog = new THREE.FogExp2(0x17110d, 0.0049);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 2600);
scene.add(camera);

const cockpitWeaponRig = new THREE.Group();
cockpitWeaponRig.visible = false;
const cockpitGunMaterial = new THREE.MeshStandardMaterial({
  color: 0x8f989d,
  metalness: 0.92,
  roughness: 0.2
});
const cockpitGunDarkMaterial = new THREE.MeshStandardMaterial({
  color: 0x20272b,
  metalness: 0.86,
  roughness: 0.3
});
function createCockpitCannon(x, y, z, radius, length) {
  const cannon = new THREE.Group();
  cannon.position.set(x, y, z);
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.82, radius, length, 16),
    cockpitGunMaterial
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = -length * 0.5;
  cannon.add(barrel);
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.18, radius * 1.18, radius * 1.15, 16),
    cockpitGunDarkMaterial
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.z = -0.18;
  cannon.add(collar);
  return cannon;
}
cockpitWeaponRig.add(createCockpitCannon(-0.72, -0.82, -0.7, 0.13, 2.6));
cockpitWeaponRig.add(createCockpitCannon(0.72, -0.82, -0.7, 0.13, 2.6));
const cockpitCenterCannon = createCockpitCannon(0, -0.57, -0.85, 0.15, 3.15);
cockpitWeaponRig.add(cockpitCenterCannon);
camera.add(cockpitWeaponRig);
const clock = new THREE.Clock();

const input = {};
const gameKeyCodes = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Escape", "Digit1", "Numpad1", "Digit2", "Numpad2", "Digit5", "Digit7", "KeyF", "KeyG", "KeyM", "KeyP", "KeyZ", "KeyY", "KeyV", "F1", "F2", "F3", "F5", "F6", "ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "Tab"]);
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
  missilesFired: document.querySelector("#missiles-fired"),
  fuel: document.querySelector("#fuel"),
  ammo: document.querySelector("#ammo"),
  missiles: document.querySelector("#missiles"),
  hitPoints: document.querySelector("#hit-points"),
  missionCountdown: document.querySelector("#mission-countdown"),
  coordinates: document.querySelector("#coordinates"),
  baseRange: document.querySelector("#base-range"),
  wingman1: document.querySelector("#wingman-1-status"),
  wingman2: document.querySelector("#wingman-2-status"),
  sessionTime: document.querySelector("#session-time"),
  autopilotStatus: document.querySelector("#autopilot-status"),
  status: document.querySelector("#status"),
  musicButton: document.querySelector("#music-button"),
  pauseButton: document.querySelector("#pause-button"),
  instructionsButton: document.querySelector("#instructions-button"),
  instructions: document.querySelector("#instructions"),
  crosshair: document.querySelector("#crosshair"),
  hitMarker: document.querySelector("#hit-marker"),
  damageNumbers: document.querySelector("#damage-numbers"),
  damageFlash: document.querySelector("#damage-flash"),
  runSummary: document.querySelector("#run-summary")
};
const bombingScopePanel = document.querySelector("#bombing-scope");
const bombingScopeCanvas = document.querySelector("#bombing-scope-canvas");
const cockpitOverlay = document.querySelector("#cockpit-overlay");
const cockpitSonarCanvas = document.querySelector("#cockpit-sonar-canvas");
const sonarActivation = document.querySelector("#sonar-activation");
const cockpitReadouts = {
  armor: document.querySelector("#cockpit-armor"),
  speed: document.querySelector("#cockpit-speed"),
  altitude: document.querySelector("#cockpit-altitude"),
  ammo: document.querySelector("#cockpit-ammo"),
  missiles: document.querySelector("#cockpit-missiles"),
  rival: document.querySelector("#cockpit-rival"),
  warning: document.querySelector("#cockpit-warning")
};
const splashScreen = document.querySelector("#splash-screen");
const playButton = document.querySelector("#play-button");
const playLaunch = document.querySelector("#play-launch");
const playCoin = document.querySelector("#play-coin");
const musicAmmoBalanceControl = document.querySelector("#music-ammo-balance");
const musicAmmoBalanceValue = document.querySelector("#music-ammo-balance-value");
const rotorVolumeControl = document.querySelector("#rotor-volume");
const rotorVolumeValue = document.querySelector("#rotor-volume-value");
const splashRotorVolumeControl = document.querySelector("#splash-rotor-volume");
const splashRotorVolumeValue = document.querySelector("#splash-rotor-volume-value");
const gameModeSelect = document.querySelector("#game-mode");
const missileRangeControl = document.querySelector("#missile-range");
const missileRangeValue = document.querySelector("#missile-range-value");
const commsVolumeControl = document.querySelector("#comms-volume");
const commsVolumeValue = document.querySelector("#comms-volume-value");
const playerCallSign = document.querySelector("#player-call-sign");
const recordScoreButton = document.querySelector("#record-score-button");
const highScoreList = document.querySelector("#high-score-list");
const HIGH_SCORE_STORAGE_KEY = "hovertank-high-scores-v2";
let finalScoreForLeaderboard = null;
let audio = null;
let missileRange = 55;
let commsVolume = 0.7;
let bombingScope = null;
let cockpitBombingScope = null;
let cockpitAlertTimer = 0;
let sonarActivationTimer = 0;

function playSonarActivation() {
  window.clearTimeout(sonarActivationTimer);
  sonarActivation.classList.remove("active");
  void sonarActivation.offsetWidth;
  sonarActivation.classList.add("active");
  sonarActivationTimer = window.setTimeout(() => sonarActivation.classList.remove("active"), 1350);
}

try {
  musicAmmoBalanceControl.value = window.localStorage.getItem("hovertank-music-ammo-balance") || "50";
} catch (_) {
  musicAmmoBalanceControl.value = "50";
}

function updateMusicAmmoBalance() {
  const ammoPercent = Number(musicAmmoBalanceControl.value);
  musicAmmoBalanceValue.textContent = `${100 - ammoPercent}% / ${ammoPercent}%`;
  if (audio) audio.setMusicAmmoBalance(ammoPercent / 100);
  try {
    window.localStorage.setItem("hovertank-music-ammo-balance", String(ammoPercent));
  } catch (_) {
    // The selected balance still applies for this session when storage is unavailable.
  }
}

updateMusicAmmoBalance();

let savedRotorVolume = "80";
try {
  savedRotorVolume = window.localStorage.getItem("hovertank-rotor-volume") || "80";
} catch (_) {
  savedRotorVolume = "80";
}
rotorVolumeControl.value = savedRotorVolume;
splashRotorVolumeControl.value = savedRotorVolume;

function updateRotorVolume(sourceControl) {
  const value = sourceControl.value;
  rotorVolumeControl.value = value;
  splashRotorVolumeControl.value = value;
  rotorVolumeValue.textContent = `${value}%`;
  splashRotorVolumeValue.textContent = `${value}%`;
  if (audio) audio.setRotorVolume(Number(value) / 100);
  try {
    window.localStorage.setItem("hovertank-rotor-volume", value);
  } catch (_) {
    // The selected rotor volume still applies for this session.
  }
}

updateRotorVolume(rotorVolumeControl);

try {
  missileRange = THREE.MathUtils.clamp(Number(window.localStorage.getItem("hovertank-missile-range")) || 55, 1, 100);
} catch (_) {
  missileRange = 55;
}
missileRangeControl.value = String(missileRange);
missileRangeValue.textContent = String(missileRange);

function setMissileRange(value, announce = false) {
  missileRange = THREE.MathUtils.clamp(Math.round(value), 1, 100);
  missileRangeControl.value = String(missileRange);
  missileRangeValue.textContent = String(missileRange);
  try {
    window.localStorage.setItem("hovertank-missile-range", String(missileRange));
  } catch (_) {
    // The selected range still applies for this session.
  }
  if (announce && hud.status) {
    const label = missileRange <= 30 ? "short" : missileRange >= 75 ? "long" : "medium";
    hud.status.textContent = `Missile range: ${label} (${missileRange}).`;
    statusTimer = 2.8;
  }
}

try {
  const savedCommsVolume = window.localStorage.getItem("hovertank-comms-volume");
  commsVolume = savedCommsVolume === null ? 0.7 : THREE.MathUtils.clamp(Number(savedCommsVolume) / 100, 0, 1);
  if (!Number.isFinite(commsVolume)) commsVolume = 0.7;
} catch (_) {
  commsVolume = 0.7;
}
commsVolumeControl.value = String(Math.round(commsVolume * 100));
commsVolumeValue.textContent = `${Math.round(commsVolume * 100)}%`;

function setCommsVolume(value) {
  commsVolume = THREE.MathUtils.clamp(Number(value) / 100, 0, 1);
  commsVolumeValue.textContent = `${Math.round(commsVolume * 100)}%`;
  try {
    window.localStorage.setItem("hovertank-comms-volume", String(Math.round(commsVolume * 100)));
  } catch (_) {
    // The selected comms volume still applies for this session.
  }
  if (audio) audio.setCommsVolume(commsVolume);
}

const poeticStatuses = [
  "Metallic orbs watch the red waste.",
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
let fuel = CONFIG.maxFuel;
let ammo = CONFIG.maxAmmo;
let hitPoints = CONFIG.maxHitPoints;
let criticalDamageWarningArmed = true;
let returnToBaseWarningArmed = true;
let gameEnded = false;
let gameStarted = false;
let gamePaused = false;
let sessionTimeRemaining = CONFIG.sessionDuration;
let missionEndsAt = 0;
let gameMode = "standard";
let mazeCockpitActive = false;
let bootcampManager = null;
const runStats = {
  dronesDestroyed: 0,
  enemyVehiclesDestroyed: 0,
  prisonersStopped: 0,
  bootcampTunnels: 0,
  bootcampOpponentsDefeated: 0,
  shotsFired: 0,
  missilesFired: 0,
  missileHits: 0,
  shotsHit: 0,
  damageDealt: 0,
  longestShot: 0,
  ricochetKills: 0,
  objectsDestroyed: 0,
  resupplies: 0,
  collisions: 0,
  flightTime: 0,
  spidersDestroyed: 0
};

const textureLoader = new THREE.TextureLoader();
const loadSurfaceTexture = (path, repeatX = 1, repeatY = 1, colorTexture = true) => {
  const texture = textureLoader.load(path);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  if (colorTexture) texture.encoding = THREE.sRGBEncoding;
  return texture;
};

const tankSurfaceTexture = loadSurfaceTexture("assets/textures/tank-surface.jpg?v=embedded-assets-1", 3.1, 3.1, false);
const architectureArmorTexture = loadSurfaceTexture("assets/textures/architecture-armor.jpg?v=embedded-assets-1", 1.6, 2.4);
const architectureVentTexture = loadSurfaceTexture("assets/textures/architecture-vents.jpg?v=embedded-assets-1", 1.2, 2.2);
const mechanicalRibTexture = loadSurfaceTexture("assets/textures/mechanical-ribs.jpg?v=embedded-assets-1", 1.4, 3.2);
const pyramidPanelTexture = loadSurfaceTexture("assets/textures/pyramid-panel-0056.jpg?v=imported-pyramid-1");

const pyramidPanelMaterial = new THREE.MeshStandardMaterial({
  color: 0xb8bdc0,
  map: pyramidPanelTexture,
  bumpMap: pyramidPanelTexture,
  bumpScale: 0.035,
  roughnessMap: pyramidPanelTexture,
  metalness: 0.62,
  roughness: 0.48
});

const tankMaterial = (color, metalness, roughness, bumpScale) => new THREE.MeshStandardMaterial({
  color,
  metalness,
  roughness,
  bumpMap: tankSurfaceTexture,
  bumpScale,
  roughnessMap: tankSurfaceTexture
});

const materials = {
  tankDark: tankMaterial(0x17212a, 0.84, 0.42, 0.055),
  tankTrim: tankMaterial(0x2a3541, 0.78, 0.46, 0.045),
  tankLight: tankMaterial(0x43515e, 0.74, 0.5, 0.04),
  tankMechanics: new THREE.MeshStandardMaterial({ color: 0x151b21, metalness: 0.82, roughness: 0.48, map: mechanicalRibTexture, bumpMap: tankSurfaceTexture, bumpScale: 0.035 }),
  warmMechanics: new THREE.MeshStandardMaterial({ color: 0x5b3f2c, metalness: 0.5, roughness: 0.62 }),
  blueGlow: new THREE.MeshStandardMaterial({ color: 0x58e9ff, emissive: 0x32cfff, emissiveIntensity: 1.6 }),
  orangeGlow: new THREE.MeshStandardMaterial({ color: 0xff9b32, emissive: 0xff5f12, emissiveIntensity: 2.2 }),
  enemy: new THREE.MeshStandardMaterial({ color: 0x3b3d42, metalness: 0.7, roughness: 0.35 }),
  redEye: new THREE.MeshStandardMaterial({ color: 0xff2e2e, emissive: 0xff1010, emissiveIntensity: 2.4 }),
  ruin: new THREE.MeshStandardMaterial({ color: 0x57555f, metalness: 0.45, roughness: 0.72, map: architectureArmorTexture, bumpMap: tankSurfaceTexture, bumpScale: 0.09 }),
  detentionConcrete: new THREE.MeshStandardMaterial({ color: 0x8a7568, metalness: 0.22, roughness: 0.82, map: architectureArmorTexture, bumpMap: architectureArmorTexture, bumpScale: 0.055 }),
  prisonConcrete: new THREE.MeshStandardMaterial({ color: 0x4a5057, metalness: 0.55, roughness: 0.58, map: architectureArmorTexture, bumpMap: architectureArmorTexture, bumpScale: 0.045 }),
  prisonPanel: new THREE.MeshStandardMaterial({ color: 0x2c343c, metalness: 0.84, roughness: 0.34, map: architectureVentTexture, bumpMap: architectureVentTexture, bumpScale: 0.035 }),
  guardTowerShell: new THREE.MeshStandardMaterial({ color: 0x76838c, metalness: 0.78, roughness: 0.3, map: architectureVentTexture, bumpMap: architectureVentTexture, bumpScale: 0.025 }),
  mazeShell: new THREE.MeshStandardMaterial({ color: 0x343d46, metalness: 0.88, roughness: 0.3, map: architectureVentTexture, bumpMap: mechanicalRibTexture, bumpScale: 0.035 }),
  mazeFloor: new THREE.MeshStandardMaterial({ color: 0x171d23, metalness: 0.92, roughness: 0.24, map: mechanicalRibTexture, bumpMap: mechanicalRibTexture, bumpScale: 0.028 }),
  prisonPipe: new THREE.MeshStandardMaterial({ color: 0x667075, metalness: 0.92, roughness: 0.23, map: mechanicalRibTexture, bumpMap: mechanicalRibTexture, bumpScale: 0.025 }),
  prisonPipeDirty: new THREE.MeshStandardMaterial({ color: 0x3e4140, metalness: 0.78, roughness: 0.48, map: mechanicalRibTexture, bumpMap: mechanicalRibTexture, bumpScale: 0.035 }),
  toxicSmoke: new THREE.MeshBasicMaterial({ color: 0x60745d, transparent: true, opacity: 0.2, depthWrite: false }),
  radioTower: new THREE.MeshStandardMaterial({ color: 0x3f484d, metalness: 0.9, roughness: 0.25 }),
  radioSphere: new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 1, depthWrite: false }),
  surveillanceChrome: new THREE.MeshStandardMaterial({ color: 0xbac7cd, metalness: 1, roughness: 0.14, envMapIntensity: 1.8 }),
  playerChrome: new THREE.MeshStandardMaterial({ color: 0xe7f1f5, metalness: 1, roughness: 0.055, envMapIntensity: 2.8 }),
  wingmanChrome: new THREE.MeshStandardMaterial({ color: 0xdee8ed, metalness: 1, roughness: 0.1, envMapIntensity: 2.6 }),
  wingmanTrim: new THREE.MeshStandardMaterial({ color: 0xa6b0be, metalness: 0.96, roughness: 0.38, envMapIntensity: 1.9 }),
  playerTurbine: new THREE.MeshStandardMaterial({ color: 0x3b4244, metalness: 0.76, roughness: 0.52, map: mechanicalRibTexture, bumpMap: mechanicalRibTexture, bumpScale: 0.04 }),
  facilityLightWarm: new THREE.MeshStandardMaterial({ color: 0xffbd72, emissive: 0xff7428, emissiveIntensity: 3.15, metalness: 0.55, roughness: 0.3 }),
  facilityLightCool: new THREE.MeshStandardMaterial({ color: 0x8ee8ff, emissive: 0x2aa8ff, emissiveIntensity: 3.35, metalness: 0.62, roughness: 0.24 }),
  collisionInvisible: new THREE.MeshBasicMaterial({ visible: false }),
  architectureVent: new THREE.MeshStandardMaterial({ color: 0x353a40, metalness: 0.62, roughness: 0.58, map: architectureVentTexture, bumpMap: tankSurfaceTexture, bumpScale: 0.06 }),
  darkMetal: new THREE.MeshStandardMaterial({ color: 0x20242b, metalness: 0.78, roughness: 0.36 }),
  pyramidGlass: new THREE.MeshStandardMaterial({ color: 0x071018, metalness: 0.86, roughness: 0.18 }),
  pyramidBronze: new THREE.MeshStandardMaterial({ color: 0x2d2117, metalness: 0.72, roughness: 0.24 }),
  pyramidTrim: new THREE.MeshStandardMaterial({ color: 0xb68a48, metalness: 0.8, roughness: 0.28 }),
  hotelCyan: new THREE.MeshStandardMaterial({ color: 0x54f5ff, emissive: 0x21d9ff, emissiveIntensity: 1.9 }),
  hotelMagenta: new THREE.MeshStandardMaterial({ color: 0xff4fd8, emissive: 0xff20b7, emissiveIntensity: 1.45 }),
  hotelAmber: new THREE.MeshStandardMaterial({ color: 0xffb34f, emissive: 0xff7c20, emissiveIntensity: 1.55 }),
  plant: new THREE.MeshStandardMaterial({ color: 0x384f39, roughness: 0.76 }),
  plantMouth: new THREE.MeshStandardMaterial({ color: 0x762343, emissive: 0x2b0015, roughness: 0.6 }),
  water: new THREE.MeshStandardMaterial({ color: 0x5ed5ff, emissive: 0x1b7d9a, transparent: true, opacity: 0.52, side: THREE.DoubleSide }),
  road: new THREE.MeshStandardMaterial({ color: CONFIG.worldColors.road, roughness: 0.92 }),
  terrain: new THREE.MeshStandardMaterial({ color: CONFIG.worldColors.sand, roughness: 0.95, vertexColors: true }),
  smoke: new THREE.MeshBasicMaterial({ color: 0x1a1112, transparent: true, opacity: 0.42, depthWrite: false }),
  prisonerUniform: new THREE.MeshStandardMaterial({ color: 0xb85d24, roughness: 0.78 }),
  prisonerSkin: new THREE.MeshStandardMaterial({ color: 0x9a715c, roughness: 0.86 })
};

let terrain;
let tank;
let projectiles;
let enemies;
let skyDrones;
let refuelTowers;
let missileTowers;
let tacticalGrid;
let autopilot;
let prisonEscapees;
let surveillanceFleet;
let giantTarantulas;
let worldPortal;
let skyEnvironment;
let wingmen;
const explosionEffects = [];
const shockwaveEffects = [];
const impactEffects = [];
const universeTargets = [];
const pyramidBeacons = [];
const droneOrbs = [];
const prisonBreachEffects = [];
const toxicSmokeEffects = [];
const radioTowerEffects = [];
let homeBaseBeacon = null;
let beaconTime = 0;
let toxicSmokeTime = 0;

window.addEventListener("resize", onResize);
window.addEventListener("keydown", event => {
  const gameKey = gameKeyCodes.has(event.code);
  const elevationKey = event.code === "KeyY" || (input.KeyY && ["ArrowUp", "ArrowDown"].includes(event.code));
  if (gameKey || elevationKey) {
    event.preventDefault();
    event.stopPropagation();
  }
  if (!gameStarted || gamePaused) return;
  const shiftHeld = Boolean(input.ShiftLeft || input.ShiftRight || event.shiftKey);
  const manualFlightInput = event.code === "KeyF" || (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code) && !shiftHeld && !input.KeyY);
  if (manualFlightInput && autopilot && autopilot.enabled) autopilot.disengage(true);
  input[event.code] = true;
  if (audio && !audio.started) audio.start();
  if (event.code === "ControlLeft" || event.code === "ControlRight") input.fireHeld = true;
  if (event.code === "KeyZ") input.heatSeekingHeld = true;
  if (event.code === "Space" && !event.repeat && projectiles && tank) projectiles.dropBombPayload(tank);
  if ((event.code === "Digit1" || event.code === "Numpad1") && !event.repeat && bombingScope) bombingScope.toggle();
  if ((event.code === "Digit2" || event.code === "Numpad2") && !event.repeat && tank) tank.toggleCombatDive();
  if (event.code === "KeyM" && !event.repeat && projectiles && tank) projectiles.launchMissile(tank);
  if (event.code === "F1" && !event.repeat) setMissileRange(20, true);
  if (event.code === "F2" && !event.repeat) setMissileRange(55, true);
  if (event.code === "F3" && !event.repeat) setMissileRange(90, true);
  if (event.code === "F5" && !event.repeat && tank) tank.togglePrecisionSteering();
  if (event.code === "F6" && !event.repeat && tank) tank.toggleDoubleSpeed();
  if (event.code === "KeyG" && !event.repeat && tacticalGrid) tacticalGrid.toggle();
  if (event.code === "KeyP" && !event.repeat && autopilot) {
    if (shiftHeld && autopilot.enabled) autopilot.switchPhase();
    else autopilot.toggle();
  }
  if (event.code === "KeyV" && !event.repeat && tank) tank.centerTurret(Boolean(input.ShiftLeft || input.ShiftRight));
  if (event.code === "Digit5" && !event.repeat && wingmen) wingmen.orderReturnToBase();
  if (event.code === "Digit7" && !event.repeat && wingmen) wingmen.orderResupply();
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
  if (event.code === "ControlLeft" || event.code === "ControlRight") {
    input.fireHeld = Boolean(input.ControlLeft || input.ControlRight);
  }
  if (event.code === "KeyZ") input.heatSeekingHeld = false;
}, true);
window.addEventListener("blur", () => {
  for (const key of Object.keys(input)) input[key] = false;
});
hud.musicButton.addEventListener("click", () => audio.toggleMute());
hud.instructionsButton.addEventListener("click", () => {
  const willShow = hud.instructions.hidden;
  hud.instructions.hidden = !willShow;
  hud.instructionsButton.setAttribute("aria-expanded", String(willShow));
});
hud.pauseButton.addEventListener("click", () => toggleGamePause());
musicAmmoBalanceControl.addEventListener("input", updateMusicAmmoBalance);
rotorVolumeControl.addEventListener("input", () => updateRotorVolume(rotorVolumeControl));
splashRotorVolumeControl.addEventListener("input", () => updateRotorVolume(splashRotorVolumeControl));
missileRangeControl.addEventListener("input", () => setMissileRange(Number(missileRangeControl.value)));
commsVolumeControl.addEventListener("input", () => setCommsVolume(commsVolumeControl.value));
document.querySelector("#restart-button").addEventListener("click", () => window.location.reload());
recordScoreButton.addEventListener("click", recordHighScore);

try {
  playerCallSign.value = window.localStorage.getItem("hovertank-call-sign") || "";
} catch (_) {
  playerCallSign.value = "";
}
renderHighScores();

function isDogfightMode() {
  return gameMode === "bootcamp" || gameMode === "cockpit";
}

function getGameModeLabel(mode = gameMode) {
  if (mode === "cockpit") return "Cockpit Dogfight";
  if (mode === "bootcamp") return "Dogfight";
  return "Standard";
}

function configureSessionMode(selectedMode) {
  gameMode = selectedMode === "cockpit" ? "cockpit" : selectedMode === "bootcamp" ? "bootcamp" : "standard";
  const dogfightMode = isDogfightMode();
  const cockpitMode = gameMode === "cockpit";
  document.body.classList.toggle("cockpit-mode", cockpitMode);
  cockpitOverlay.hidden = !cockpitMode;
  if (cockpitBombingScope) cockpitBombingScope.visible = cockpitMode;
  cockpitWeaponRig.visible = cockpitMode;
  tank.setCockpitVisibility(cockpitMode);
  if (wingmen) {
    for (const wingman of wingmen.units) wingman.group.visible = !dogfightMode;
  }
  if (!bootcampManager) return;
  if (dogfightMode) {
    bootcampManager.activate();
    bootcampManager.tunnelRadius = 14;
    if (!bootcampManager.opponent || !bootcampManager.opponent.group.visible) bootcampManager.respawnOpponent();
  } else {
    bootcampManager.deactivate();
  }
}

playButton.addEventListener("click", async () => {
  playButton.disabled = true;
  playLaunch.classList.add("depositing");
  await new Promise(resolve => window.setTimeout(resolve, 680));
  configureSessionMode(gameModeSelect ? gameModeSelect.value : "standard");
  const sessionDuration = CONFIG.sessionDuration;
  const sessionStartedAt = performance.now();
  gameStarted = true;
  sessionTimeRemaining = sessionDuration;
  missionEndsAt = performance.now() + sessionDuration * 1000;
  const missionSeconds = Math.ceil(sessionDuration);
  hud.sessionTime.textContent = `${Math.floor(missionSeconds / 60)}:${String(missionSeconds % 60).padStart(2, "0")}`;
  splashScreen.hidden = true;
  splashScreen.remove();
  clock.getDelta();
  hud.status.textContent = isDogfightMode()
    ? `${audio.currentTrack.title} signal acquired. ${gameMode === "cockpit" ? "Cockpit Dogfight" : "Dogfight Bootcamp"} active.`
    : `${audio.currentTrack.title} signal acquired. Reach Solareth.`;
  statusTimer = 4;
  try {
    audio.armAudio();
    audio.playCoinRing();
    void audio.start().catch(error => console.warn("Soundtrack startup deferred", error));
  } catch (error) {
    console.warn("Audio unavailable; gameplay remains active", error);
  }
  audio.prepareSessionDuration().then(trackDuration => {
    if (!gameStarted || gameEnded) return;
    missionEndsAt = sessionStartedAt + trackDuration * 1000;
    sessionTimeRemaining = Math.max(0, (missionEndsAt - performance.now()) / 1000);
  });
});

function drawPlayCoin() {
  const context = playCoin.getContext("2d");
  if (!context) return;
  const center = playCoin.width / 2;
  const gradient = context.createRadialGradient(55, 42, 8, center, center, 76);
  gradient.addColorStop(0, "#fff0a0");
  gradient.addColorStop(0.35, "#d9a93e");
  gradient.addColorStop(0.72, "#8a5417");
  gradient.addColorStop(1, "#3d2109");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(center, center, 74, 0, Math.PI * 2);
  context.fill();
  context.lineWidth = 5;
  context.strokeStyle = "#ffdc72";
  context.stroke();
  context.beginPath();
  context.arc(center, center, 62, 0, Math.PI * 2);
  context.lineWidth = 3;
  context.strokeStyle = "rgba(66, 30, 5, 0.72)";
  context.stroke();

  context.save();
  context.translate(center, center + 2);
  context.scale(43, 43);
  context.strokeStyle = "#291507";
  context.lineWidth = 0.095;
  context.lineCap = "round";
  const line = points => {
    context.beginPath();
    context.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) context.lineTo(points[i][0], points[i][1]);
    context.stroke();
  };
  line([[-0.92, 0.58], [-0.44, 0.27]]);
  line([[0.44, -0.27], [0.92, -0.58]]);
  line([[-0.92, -0.58], [-0.44, -0.27]]);
  line([[0.44, 0.27], [0.92, 0.58]]);
  for (const [x, y, dx, dy] of [[-0.98, 0.62, -0.05, 0.08], [0.98, -0.62, 0.05, -0.08], [-0.98, -0.62, -0.05, -0.08], [0.98, 0.62, 0.05, 0.08]]) {
    for (const direction of [-1, 1]) {
      context.beginPath();
      context.arc(x + dx * direction, y + dy * direction, 0.085, 0, Math.PI * 2);
      context.stroke();
    }
  }
  context.fillStyle = "#291507";
  context.beginPath();
  context.moveTo(-0.54, -0.08);
  context.arc(0, -0.08, 0.54, Math.PI, 0);
  context.lineTo(0.49, 0.25);
  context.lineTo(0.29, 0.34);
  context.lineTo(0.25, 0.7);
  context.lineTo(0.12, 0.55);
  context.lineTo(0, 0.76);
  context.lineTo(-0.12, 0.55);
  context.lineTo(-0.25, 0.7);
  context.lineTo(-0.29, 0.34);
  context.lineTo(-0.49, 0.25);
  context.closePath();
  context.fill();
  context.fillStyle = "#d7a63a";
  context.beginPath();
  context.arc(-0.21, 0.06, 0.12, 0, Math.PI * 2);
  context.arc(0.21, 0.06, 0.12, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

drawPlayCoin();

function initLights() {
  const hemi = new THREE.HemisphereLight(0x837669, 0x050504, 0.6);
  scene.add(hemi);

  const twilightKey = new THREE.DirectionalLight(0xffc387, 1.48);
  twilightKey.position.set(70, 285, -420);
  twilightKey.castShadow = CONFIG.enableShadows;
  twilightKey.shadow.mapSize.set(1024, 1024);
  twilightKey.shadow.camera.left = -220;
  twilightKey.shadow.camera.right = 220;
  twilightKey.shadow.camera.top = 220;
  twilightKey.shadow.camera.bottom = -220;
  scene.add(twilightKey);

  const horizonFill = new THREE.DirectionalLight(0xa55232, 0.34);
  horizonFill.position.set(-280, 65, 260);
  scene.add(horizonFill);
}

function createSky() {
  const vault = new THREE.Mesh(
    new THREE.SphereGeometry(1490, 24, 12),
    new THREE.MeshBasicMaterial({ color: 0x020302, side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false })
  );
  scene.add(vault);

  let activeMode = "compound";
  const environmentMaps = {};
  const loader = new THREE.TextureLoader();
  const configurePanorama = texture => {
    texture.encoding = THREE.sRGBEncoding;
    texture.wrapS = THREE.RepeatWrapping;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return texture;
  };
  const loadPanorama = (path, mode) => configurePanorama(loader.load(path, loaded => {
    const pmrem = new THREE.PMREMGenerator(renderer);
    environmentMaps[mode] = pmrem.fromEquirectangular(loaded).texture;
    if (activeMode === mode) scene.environment = environmentMaps[mode];
    pmrem.dispose();
  }));
  const panoramas = {
    compound: loadPanorama("assets/twilight-environment-2048.jpg?v=twilight-environment-3", "compound"),
    prison: loadPanorama("assets/mountain-panorama.png?v=original-prison-panorama-1", "prison")
  };
  const skyMat = new THREE.MeshBasicMaterial({
    map: panoramas.compound,
    color: 0xc9b59e,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    toneMapped: false
  });
  const horizon = new THREE.Mesh(new THREE.CylinderGeometry(1280, 1280, 960, 72, 1, true), skyMat);
  horizon.position.y = 300;
  scene.add(horizon);

  createCloudBand(-360, 72, -520, 260);
  createCloudBand(180, 64, -650, 330);

  return {
    setWorldMode(mode) {
      activeMode = mode === "prison" ? "prison" : "compound";
      skyMat.map = panoramas[activeMode];
      skyMat.color.setHex(activeMode === "prison" ? 0xffffff : 0xc9b59e);
      skyMat.needsUpdate = true;
      if (environmentMaps[activeMode]) scene.environment = environmentMaps[activeMode];
    }
  };
}

function createDroneOrb(x, y, z, radius, ringed) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  const shellMaterial = new THREE.MeshStandardMaterial({
    color: 0x25262a,
    metalness: 0.96,
    roughness: 0.28,
    flatShading: true
  });
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 24, 14),
    shellMaterial
  );
  group.add(shell);

  const armorMaterial = new THREE.MeshStandardMaterial({ color: 0x4b4a49, metalness: 0.92, roughness: 0.34 });
  const seamMaterial = new THREE.MeshBasicMaterial({ color: 0x8d2117, transparent: true, opacity: 0.72 });
  for (const [scale, tube, rx, rz] of [
    [1.015, 1.5, Math.PI * 0.5, 0],
    [1.01, 1.15, 0, Math.PI * 0.5],
    [1.008, 0.85, Math.PI * 0.24, Math.PI * 0.16]
  ]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(radius * scale, tube, 7, 72), armorMaterial);
    band.rotation.x = rx;
    band.rotation.z = rz;
    group.add(band);
  }
  for (const latitude of [-0.48, -0.2, 0.2, 0.48]) {
    const bandRadius = radius * Math.sqrt(1 - latitude * latitude);
    const seam = new THREE.Mesh(new THREE.TorusGeometry(bandRadius, radius * 0.009, 5, 64), seamMaterial);
    seam.position.y = radius * latitude;
    seam.rotation.x = Math.PI * 0.5;
    group.add(seam);
  }

  const eye = new THREE.Group();
  eye.position.z = radius * 0.88;
  const eyeBack = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.34, radius * 0.4, radius * 0.16, 24),
    new THREE.MeshStandardMaterial({ color: 0x111215, metalness: 1, roughness: 0.2 })
  );
  eyeBack.rotation.x = Math.PI * 0.5;
  eye.add(eyeBack);
  const eyeRing = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.27, radius * 0.055, 8, 40),
    new THREE.MeshStandardMaterial({ color: 0x6e2118, emissive: 0xff2b12, emissiveIntensity: 2.5, metalness: 0.8, roughness: 0.22 })
  );
  eye.add(eyeRing);
  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.15, radius * 0.025, 7, 32),
    new THREE.MeshBasicMaterial({ color: 0xff3b1f })
  );
  innerRing.position.z = radius * 0.015;
  eye.add(innerRing);
  const frontCore = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.095, 24),
    new THREE.MeshBasicMaterial({ color: 0xff3218, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
  );
  frontCore.position.z = radius * 0.035;
  eye.add(frontCore);
  group.add(eye);

  const topPortal = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.22, 2.6, 10, 64),
    new THREE.MeshBasicMaterial({ color: 0xff3a1c, transparent: true, opacity: 0.72, depthWrite: false })
  );
  topPortal.position.y = radius * 0.96;
  topPortal.rotation.x = Math.PI * 0.5;
  group.add(topPortal);

  const bottomPortal = topPortal.clone();
  bottomPortal.position.y = -radius * 0.96;
  group.add(bottomPortal);

  scene.add(group);
  droneOrbs.push({ group, shell, topPortal, bottomPortal, frontCore, eyeRing, phase: seededRandom(radius) * Math.PI * 2 });
  registerUniverseTarget(group, radius * 1.2);
}

function updateDroneOrbs(delta) {
  for (const orb of droneOrbs) {
    if (!orb.group.parent) continue;
    orb.group.rotation.y += delta * 0.035;
    const pulse = 0.58 + Math.sin(performance.now() * 0.003 + orb.phase) * 0.24;
    orb.topPortal.material.opacity = 0.45 + pulse * 0.35;
    orb.bottomPortal.material.opacity = 0.45 + pulse * 0.35;
    orb.frontCore.material.opacity = 0.55 + pulse * 0.4;
    orb.frontCore.scale.setScalar(0.88 + pulse * 0.2);
    orb.eyeRing.material.emissiveIntensity = 1.8 + pulse * 1.8;
    orb.topPortal.scale.setScalar(0.92 + pulse * 0.12);
    orb.bottomPortal.scale.setScalar(0.92 + pulse * 0.12);
  }
}

function createCloudBand(x, y, z, width) {
  const cloud = new THREE.Mesh(
    new THREE.PlaneGeometry(width, 26),
    new THREE.MeshBasicMaterial({ color: 0x38445e, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide })
  );
  cloud.position.set(x, y, z);
  cloud.rotation.x = -0.08;
  scene.add(cloud);
  registerUniverseTarget(cloud, width * 0.52);
}

function createMountains() {
  for (let i = 0; i < 36; i++) {
    const angle = (i / 36) * Math.PI * 2;
    const radius = 1000 + seededRandom(i * 19) * 220;
    const height = 90 + seededRandom(i * 31) * 170;
    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(55 + seededRandom(i * 7) * 70, height, 5),
      new THREE.MeshStandardMaterial({ color: 0x1b2230, metalness: 0.12, roughness: 0.88 })
    );
    mountain.position.set(Math.cos(angle) * radius, height * 0.5 - 28, Math.sin(angle) * radius);
    mountain.rotation.y = seededRandom(i) * Math.PI;
    scene.add(mountain);
    registerUniverseTarget(mountain, height * 0.42);
  }
}

function createMissileModel() {
  const missile = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.31, 2.5, 12), materials.tankTrim);
  body.rotation.x = Math.PI / 2;
  body.position.z = -0.15;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.31, 0.82, 12), materials.redEye);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -1.8;
  const exhaustRing = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.07, 6, 12), materials.warmMechanics);
  exhaustRing.position.z = 1.13;
  const fins = [];
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.58, 0.68), materials.darkMetal);
    fin.position.z = 0.82;
    fin.rotation.z = i * Math.PI / 2;
    fins.push(fin);
  }
  missile.add(body, nose, exhaustRing, ...fins);
  return missile;
}

let playerHoverTankModelPromise = null;
function loadPlayerHoverTankModel() {
  if (playerHoverTankModelPromise) return playerHoverTankModelPromise;
  playerHoverTankModelPromise = new Promise((resolve, reject) => {
    const loader = new THREE.OBJLoader();
    loader.load("assets/models/HoverTank_001.obj?v=player-hovertank-1", resolve, undefined, reject);
  });
  return playerHoverTankModelPromise;
}

let guardTowerModelPromise = null;
function loadGuardTowerModel() {
  if (guardTowerModelPromise) return guardTowerModelPromise;
  guardTowerModelPromise = new Promise((resolve, reject) => {
    const loader = new THREE.OBJLoader();
    loader.load("assets/models/Guard-Tower_002.obj?v=guard-tower-2", source => {
      const sourceMesh = source.children.find(child => child.isMesh);
      if (!sourceMesh) {
        reject(new Error("Guard-Tower_002.obj contains no mesh"));
        return;
      }
      const geometry = sourceMesh.geometry.index
        ? sourceMesh.geometry.toNonIndexed()
        : sourceMesh.geometry.clone();
      geometry.computeBoundingBox();
      const bounds = geometry.boundingBox;
      const center = bounds.getCenter(new THREE.Vector3());
      const height = Math.max(1, bounds.max.y - bounds.min.y);
      const scale = 50 / height;
      const sourcePosition = geometry.getAttribute("position");
      const sourceNormal = geometry.getAttribute("normal");
      const positionBuckets = [[], [], []];
      const normalBuckets = [[], [], []];
      for (let vertex = 0; vertex < sourcePosition.count; vertex += 3) {
        const min = [Infinity, Infinity, Infinity];
        const max = [-Infinity, -Infinity, -Infinity];
        for (let corner = 0; corner < 3; corner++) {
          min[0] = Math.min(min[0], sourcePosition.getX(vertex + corner));
          min[1] = Math.min(min[1], sourcePosition.getY(vertex + corner));
          min[2] = Math.min(min[2], sourcePosition.getZ(vertex + corner));
          max[0] = Math.max(max[0], sourcePosition.getX(vertex + corner));
          max[1] = Math.max(max[1], sourcePosition.getY(vertex + corner));
          max[2] = Math.max(max[2], sourcePosition.getZ(vertex + corner));
        }
        const spans = max.map((value, axis) => value - min[axis]).sort((a, b) => a - b);
        const paneFace = spans[0] < 0.02 && spans[1] > 15 && spans[1] < 19 && spans[2] > 33 && spans[2] < 39;
        let bucket = 0;
        if (paneFace) {
          const paneX = Math.round((min[0] + max[0]) * 0.5);
          const paneY = Math.round((min[1] + max[1]) * 0.5);
          const paneZ = Math.round((min[2] + max[2]) * 0.5);
          const lightSeed = Math.abs((paneX * 73856093) ^ (paneY * 19349663) ^ (paneZ * 83492791));
          if ((lightSeed % 100) < 74) bucket = (lightSeed % 5) === 0 ? 2 : 1;
        }
        for (let corner = 0; corner < 3; corner++) {
          positionBuckets[bucket].push(
            (sourcePosition.getX(vertex + corner) - center.x) * scale,
            (sourcePosition.getY(vertex + corner) - bounds.min.y) * scale,
            (sourcePosition.getZ(vertex + corner) - center.z) * scale
          );
          if (sourceNormal) {
            normalBuckets[bucket].push(
              sourceNormal.getX(vertex + corner),
              sourceNormal.getY(vertex + corner),
              sourceNormal.getZ(vertex + corner)
            );
          }
        }
      }
      const geometries = positionBuckets.map((positions, index) => {
        const part = new THREE.BufferGeometry();
        part.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        if (normalBuckets[index].length) {
          part.setAttribute("normal", new THREE.Float32BufferAttribute(normalBuckets[index], 3));
        } else {
          part.computeVertexNormals();
        }
        part.computeBoundingSphere();
        return part;
      });
      resolve({ shell: geometries[0], warmWindows: geometries[1], coolWindows: geometries[2] });
    }, undefined, reject);
  });
  return guardTowerModelPromise;
}

class Tank {
  constructor(parent) {
    this.group = new THREE.Group();
    this.group.rotation.order = "YXZ";
    this.speed = 0;
    this.maxForwardSpeed = CONFIG.tankMaxForwardSpeed;
    this.maxReverseSpeed = CONFIG.tankMaxReverseSpeed;
    this.acceleration = CONFIG.tankAcceleration;
    this.friction = 18.7785;
    this.turnSpeed = CONFIG.tankTurnSpeed;
    this.manualTurnMultiplier = 1;
    this.turretTurnSpeed = CONFIG.turretTurnSpeed;
    this.turretPitchSpeed = CONFIG.turretPitchSpeed;
    this.turretPitch = 0;
    this.verticalVelocity = 0;
    this.altitudeHoldY = null;
    this.altitudeSettleTimer = 0;
    this.wasAltitudeClimbing = false;
    this.flightPitch = 0;
    this.flightRoll = 0;
    this.combatDiveEnabled = false;
    this.bumpTimer = 0;
    this.beaconTime = 0;
    this.beacons = [];
    this.missileLaunchIndex = 0;
    this.missileSlots = [];
    this.cockpitViewEnabled = false;

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
      const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.42, length), materials.tankDark);
      stalk.position.copy(mid);
      stalk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), unitDirection);
      stalk.castShadow = true;
      this.group.add(stalk);

      const highlight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, length * 0.88), materials.blueGlow);
      highlight.position.copy(mid).add(new THREE.Vector3(0, 0.24, 0));
      highlight.quaternion.copy(stalk.quaternion);
      this.group.add(highlight);

      for (const point of [start, end]) {
        const knuckle = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.52, 12), materials.darkMetal);
        knuckle.position.copy(point);
        knuckle.rotation.x = Math.PI / 2;
        knuckle.castShadow = true;
        this.group.add(knuckle);
      }
    };

    const addFanPod = (x, z) => {
      const pod = new THREE.Group();
      pod.position.set(x, 1.58, z);

      const turbineRingMaterial = materials.tankMechanics.clone();
      turbineRingMaterial.color.setHex(0x718795);
      turbineRingMaterial.metalness = 0.84;
      turbineRingMaterial.roughness = 0.3;
      turbineRingMaterial.emissive.setHex(0x173a48);
      turbineRingMaterial.emissiveIntensity = 0.58;
      const outerRing = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.48, 10, 28), turbineRingMaterial);
      outerRing.rotation.x = Math.PI / 2;
      outerRing.castShadow = true;
      pod.add(outerRing);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.58, 0.13, 8, 28), materials.blueGlow);
      ring.rotation.x = Math.PI / 2;
      pod.add(ring);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.34, 12), materials.darkMetal);
      pod.add(hub);

      const beaconBase = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.22, 12), materials.darkMetal);
      beaconBase.position.y = 0.28;
      pod.add(beaconBase);
      this.addBeacon(pod, new THREE.Vector3(0, 0.52, 0));

      for (let i = 0; i < 4; i++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 0.26), materials.tankMechanics);
        blade.rotation.y = i * Math.PI / 2 + 0.22;
        blade.castShadow = true;
        pod.add(blade);
      }

      const glow = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.18, 0.04, 28), materials.blueGlow);
      glow.position.y = -0.5;
      pod.add(glow);

      this.group.add(pod);
      return pod;
    };

    addBox([7.8, 1.0, 10.2], [0, 1.18, 0], materials.tankDark);
    addBox([7.0, 0.72, 8.6], [0, 2.0, -0.2], materials.tankLight);
    addBox([6.25, 0.26, 7.1], [0, 2.46, -0.28], materials.tankTrim);
    addBox([5.5, 0.52, 4.3], [0, 2.72, -2.65], materials.tankLight, [-0.16, 0, 0]);
    addBox([3.15, 0.72, 4.9], [-2.55, 2.34, -2.28], materials.tankTrim, [-0.08, 0, -0.14]);
    addBox([3.15, 0.72, 4.9], [2.55, 2.34, -2.28], materials.tankTrim, [-0.08, 0, 0.14]);
    addBox([1.1, 0.5, 3.8], [-3.65, 2.13, -2.72], materials.tankLight, [-0.04, 0, -0.2]);
    addBox([1.1, 0.5, 3.8], [3.65, 2.13, -2.72], materials.tankLight, [-0.04, 0, 0.2]);
    addBox([6.45, 0.42, 1.9], [0, 1.88, -4.75], materials.tankLight, [-0.3, 0, 0]);
    addBox([6.45, 0.42, 1.45], [0, 1.8, 4.6], materials.tankTrim, [0.24, 0, 0]);
    addBox([2.65, 0.32, 7.65], [-2.2, 2.58, -0.32], materials.tankLight, [0, 0, -0.1]);
    addBox([2.65, 0.32, 7.65], [2.2, 2.58, -0.32], materials.tankLight, [0, 0, 0.1]);
    addBox([2.15, 0.16, 3.0], [0, 2.82, -2.0], materials.tankDark);

    for (const x of [-4.2, 4.2]) {
      addBox([1.55, 1.12, 10.6], [x, 0.96, 0], materials.tankMechanics);
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
    addStalk(-3.25, -2.25, -8.65, -6.25);
    addStalk(3.25, -2.25, 8.65, -6.25);
    addStalk(-3.25, 2.25, -8.65, 6.25);
    addStalk(3.25, 2.25, 8.65, 6.25);
    addFanPod(-9.0, -6.55);
    addFanPod(9.0, -6.55);
    addFanPod(-9.0, 6.55);
    addFanPod(9.0, 6.55);

    for (const x of [-2.1, 0, 2.1]) {
      addBox([1.15, 0.24, 0.24], [x, 2.58, -4.72], materials.blueGlow);
    }
    addBox([2.1, 0.32, 0.18], [-2.55, 2.86, -4.52], materials.blueGlow, [-0.1, 0, -0.08]);
    addBox([2.1, 0.32, 0.18], [2.55, 2.86, -4.52], materials.blueGlow, [-0.1, 0, 0.08]);
    addBox([1.35, 0.18, 0.18], [-3.3, 2.42, -4.0], materials.orangeGlow);
    addBox([1.35, 0.18, 0.18], [3.3, 2.42, -4.0], materials.orangeGlow);
    addBox([0.72, 0.22, 0.2], [-1.45, 1.72, 4.92], materials.redEye);
    addBox([0.72, 0.22, 0.2], [1.45, 1.72, 4.92], materials.redEye);
    addBox([1.5, 0.26, 0.24], [0, 2.78, 2.55], materials.blueGlow);

    // Layered wedge armor gives the hull the broad, low silhouette of the splash vehicle.
    addBox([3.45, 0.78, 5.9], [-2.35, 2.72, -1.45], materials.tankLight, [-0.08, 0, -0.13]);
    addBox([3.45, 0.78, 5.9], [2.35, 2.72, -1.45], materials.tankLight, [-0.08, 0, 0.13]);
    addBox([2.5, 0.62, 4.7], [-3.65, 2.38, -2.25], materials.tankTrim, [-0.14, 0, -0.2]);
    addBox([2.5, 0.62, 4.7], [3.65, 2.38, -2.25], materials.tankTrim, [-0.14, 0, 0.2]);
    addBox([2.35, 0.52, 5.6], [0, 3.0, -0.8], materials.tankTrim, [-0.04, 0, 0]);
    addBox([1.85, 0.48, 3.2], [-3.7, 1.92, -3.75], materials.tankDark, [-0.18, 0, -0.18]);
    addBox([1.85, 0.48, 3.2], [3.7, 1.92, -3.75], materials.tankDark, [-0.18, 0, 0.18]);
    addBox([1.38, 0.18, 0.22], [-3.72, 2.15, -5.05], materials.blueGlow, [-0.14, 0, -0.15]);
    addBox([1.38, 0.18, 0.22], [3.72, 2.15, -5.05], materials.blueGlow, [-0.14, 0, 0.15]);
    for (const side of [-1, 1]) {
      for (let z = -2.8; z <= 2.8; z += 1.4) {
        addBox([0.12, 0.16, 0.72], [side * 4.55, 1.72, z], materials.warmMechanics);
      }
    }

    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.66, 1.35), materials.tankLight);
    cockpit.position.set(-1.25, 3.06, 1.85);
    cockpit.rotation.z = -0.08;
    cockpit.castShadow = true;
    this.group.add(cockpit);
    addBox([1.5, 0.18, 0.5], [-1.25, 3.42, 1.48], materials.tankDark);
    const turretPedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.52, 1.72, 1.82, 28),
      materials.tankMechanics
    );
    turretPedestal.position.set(0, 4.28, -0.55);
    turretPedestal.castShadow = true;
    turretPedestal.receiveShadow = true;
    this.group.add(turretPedestal);
    this.turret = new THREE.Group();
    this.turret.position.set(0, 5.4, -0.55);
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
    addTurretBox([5.35, 0.72, 4.25], [0, 0.42, -0.1], materials.tankLight);
    addTurretBox([4.45, 0.38, 3.15], [0, 0.94, -0.2], materials.tankTrim);
    addTurretBox([2.1, 0.42, 3.15], [-1.45, 0.88, 0], materials.tankLight, [0, 0, -0.12]);
    addTurretBox([2.1, 0.42, 3.15], [1.45, 0.88, 0], materials.tankLight, [0, 0, 0.12]);
    addTurretBox([3.45, 0.42, 0.9], [0, 0.7, -1.9], materials.tankLight, [-0.08, 0, 0]);
    addTurretBox([2.2, 0.5, 1.05], [-0.1, 1.38, 0.92], materials.tankLight);
    addTurretBox([2.15, 0.2, 0.22], [-0.1, 1.72, 0.24], materials.blueGlow);
    addTurretBox([0.86, 0.86, 0.86], [1.75, 0.45, 0.55], materials.warmMechanics);
    addTurretBox([0.42, 0.18, 0.16], [-1.1, 0.18, 1.72], materials.redEye);
    addTurretBox([0.42, 0.18, 0.16], [1.1, 0.18, 1.72], materials.redEye);
    addTurretBox([1.8, 0.28, 2.7], [-2.15, 1.16, -0.05], materials.tankTrim, [0, 0, -0.16]);
    addTurretBox([1.8, 0.28, 2.7], [2.15, 1.16, -0.05], materials.tankTrim, [0, 0, 0.16]);
    addTurretBox([1.55, 0.18, 0.18], [-1.58, 0.88, -2.02], materials.blueGlow);
    addTurretBox([1.55, 0.18, 0.18], [1.58, 0.88, -2.02], materials.blueGlow);

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
    this.barrel = addBarrelSegment(0.2, 0.24, 3.6, -13.2, materials.darkMetal);
    addBarrelSegment(0.44, 0.34, 1.05, -15.45, materials.tankTrim);
    addBarrelSegment(0.26, 0.34, 0.72, -16.3, materials.darkMetal);
    const muzzleGlow = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8), materials.blueGlow);
    muzzleGlow.position.set(0, 0, -16.72);
    this.cannon.add(muzzleGlow);
    this.turret.add(this.cannon);

    this.missileRack = new THREE.Group();
    this.missileRack.position.set(0, 0.72, -0.35);
    const slotPositions = [
      new THREE.Vector3(-3.75, 0, -0.15),
      new THREE.Vector3(3.75, 0, -0.15),
      new THREE.Vector3(-2.95, 0, 0.2),
      new THREE.Vector3(2.95, 0, 0.2)
    ];
    for (const position of slotPositions) {
      const missile = createMissileModel();
      missile.position.copy(position);
      missile.scale.setScalar(1.08);
      this.missileRack.add(missile);
      this.missileSlots.push(missile);
    }
    this.turret.add(this.missileRack);
    this.group.add(this.turret);

    this.paintMaterials = [];
    this.group.traverse(child => {
      if (!child.material) return;
      if ([materials.tankDark, materials.tankTrim, materials.tankLight].includes(child.material)) {
        child.material = child.material.clone();
        child.material.userData.baseColor = child.material.color.clone();
        this.paintMaterials.push(child.material);
      }
    });
    this.legacyVisuals = [...this.group.children];
    parent.add(this.group);
    loadPlayerHoverTankModel()
      .then(source => this.installImportedModel(source))
      .catch(error => console.error("Imported player hovertank failed to load", error));
  }

  installImportedModel(source) {
    const model = source.clone(true);
    const turbineNames = new Set(["NoName8", "NoName9", "NoName2", "NoName4"]);
    model.traverse(child => {
      if (!child.isMesh) return;
      child.geometry.computeVertexNormals();
      child.material = turbineNames.has(child.name) ? materials.playerTurbine : materials.playerChrome;
      child.castShadow = true;
      child.receiveShadow = true;
    });

    const modelScale = 2.15;
    const sourceBounds = new THREE.Box3().setFromObject(model);
    model.scale.setScalar(modelScale);
    model.position.y = -sourceBounds.min.y * modelScale + 0.08;
    model.name = "ImportedHoverTank001";

    const turretOrigin = new THREE.Vector3(0, 0.59, 0);
    const cannonOrigin = new THREE.Vector3(0, 1.26, 0);
    const turret = new THREE.Group();
    turret.name = "PlayerTurretYaw";
    turret.position.copy(turretOrigin);
    const cannon = new THREE.Group();
    cannon.name = "PlayerTurretPitch";
    cannon.position.copy(cannonOrigin).sub(turretOrigin);

    const movePart = (name, parent, globalOrigin) => {
      const part = model.getObjectByName(name);
      if (!part) return;
      if (part.parent) part.parent.remove(part);
      part.position.sub(globalOrigin);
      parent.add(part);
    };
    for (const name of ["NoName3", "Cylinder2"]) movePart(name, turret, turretOrigin);
    for (const name of ["Cylinder8", "Cylinder7", "Cylinder3002", "Cylinder4002", "Cylinder5002", "Cylinder6"]) {
      movePart(name, cannon, cannonOrigin);
    }
    turret.add(cannon);
    model.add(turret);

    const addMarker = (parent, position) => {
      const marker = new THREE.Object3D();
      marker.position.copy(position);
      parent.add(marker);
      return marker;
    };
    this.turretMuzzle = addMarker(cannon, new THREE.Vector3(0, 0, -5.42));
    this.turretCollisionStart = addMarker(cannon, new THREE.Vector3(0, 0, -0.35));
    this.fixedCannonMuzzles = [
      addMarker(model, new THREE.Vector3(-0.43, -0.07, -5.42)),
      addMarker(model, new THREE.Vector3(0.42, -0.07, -5.42))
    ];
    this.fixedCannonStarts = [
      addMarker(model, new THREE.Vector3(-0.43, -0.07, -2.85)),
      addMarker(model, new THREE.Vector3(0.42, -0.07, -2.85))
    ];

    const missileRack = new THREE.Group();
    missileRack.position.set(0, 0.72, 0.38);
    for (const position of [
      new THREE.Vector3(-2.05, 0, 0),
      new THREE.Vector3(2.05, 0, 0),
      new THREE.Vector3(-1.55, 0.16, 0.35),
      new THREE.Vector3(1.55, 0.16, 0.35)
    ]) {
      const missile = createMissileModel();
      missile.position.copy(position);
      missile.scale.setScalar(0.52);
      missileRack.add(missile);
      this.missileSlots.push(missile);
    }
    turret.add(missileRack);

    const turbineCenters = [
      new THREE.Vector3(-2.54, 0.14, 1.99),
      new THREE.Vector3(-2.54, 0.14, -1.4),
      new THREE.Vector3(2.54, 0.14, -1.4),
      new THREE.Vector3(2.54, 0.14, 1.99)
    ];
    for (const center of turbineCenters) this.addBeacon(model, center, 1 / modelScale);
    this.installPropulsionEnergy(turbineCenters, modelScale, model.position.y);

    const spotlightOrigin = new THREE.Vector3(0, 0.72, -6.35);
    const spotlightDirection = new THREE.Vector3(0, -0.5, -Math.sqrt(3) * 0.5).normalize();
    const spotlightTarget = new THREE.Object3D();
    spotlightTarget.position.copy(spotlightOrigin).addScaledVector(spotlightDirection, 42);
    const spotlight = new THREE.SpotLight(
      0xd8f5ff,
      24,
      125,
      THREE.MathUtils.degToRad(18),
      0.58,
      2
    );
    spotlight.position.copy(spotlightOrigin);
    spotlight.target = spotlightTarget;
    this.group.add(spotlight, spotlightTarget);

    const beamLength = 42;
    const beamRadius = Math.tan(THREE.MathUtils.degToRad(18)) * beamLength;
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, beamRadius, beamLength, 20, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xbceeff,
        transparent: true,
        opacity: 0.032,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      })
    );
    beam.position.copy(spotlightOrigin).addScaledVector(spotlightDirection, beamLength * 0.5);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), spotlightDirection.clone().negate());
    this.group.add(beam);
    this.playerSpotlight = spotlight;

    this.legacyVisuals.forEach(child => { child.visible = false; });
    this.missileSlots = this.missileSlots.filter(missile => missile.parent === missileRack);
    this.group.add(model);
    this.importedModel = model;
    this.turret = turret;
    this.cannon = cannon;
    this.missileRack = missileRack;

    const chrome = materials.playerChrome.clone();
    chrome.userData.baseColor = chrome.color.clone();
    model.traverse(child => {
      if (child.isMesh && child.material === materials.playerChrome) child.material = chrome;
    });
    this.paintMaterials = [chrome];
    this.applyCockpitVisibility();
  }

  setCockpitVisibility(enabled) {
    this.cockpitViewEnabled = enabled;
    this.applyCockpitVisibility();
  }

  applyCockpitVisibility() {
    if (!this.importedModel) return;
    this.importedModel.visible = !this.cockpitViewEnabled;
  }

  installPropulsionEnergy(turbineCenters, modelScale, modelOffsetY) {
    this.energyTime = 0;
    this.turbineEnergy = [];
    const jetStartY = -1.44 * modelScale + modelOffsetY + 0.06;
    for (let jetIndex = 0; jetIndex < turbineCenters.length; jetIndex++) {
      const center = turbineCenters[jetIndex];
      const group = new THREE.Group();
      group.position.set(center.x * modelScale, jetStartY, center.z * modelScale);

      const outerMaterial = new THREE.MeshBasicMaterial({
        color: 0x168dff,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      });
      const innerMaterial = new THREE.MeshBasicMaterial({
        color: 0xa8f7ff,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      });
      const outer = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.1, 5.8, 16, 1, true), outerMaterial);
      outer.position.y = -2.9;
      const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.045, 4.15, 12, 1, true), innerMaterial);
      inner.position.y = -2.075;
      group.add(outer, inner);

      const particles = [];
      for (let i = 0; i < 7; i++) {
        const particle = new THREE.Mesh(
          new THREE.SphereGeometry(0.09 + (i % 3) * 0.035, 6, 4),
          new THREE.MeshBasicMaterial({
            color: i % 2 ? 0x4ddcff : 0xb8fbff,
            transparent: true,
            opacity: 0.34,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false
          })
        );
        particle.userData.phase = (i / 7 + jetIndex * 0.13) % 1;
        group.add(particle);
        particles.push(particle);
      }
      this.group.add(group);
      this.turbineEnergy.push({ group, outer, inner, particles, phase: jetIndex * 1.7 });
    }

    this.rearThrusters = [];
    for (const x of [-1.35, 1.35]) {
      const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0x33bfff,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      });
      const haloMaterial = new THREE.MeshBasicMaterial({
        color: 0x168dff,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      });
      const core = new THREE.Mesh(new THREE.CircleGeometry(0.48, 20), coreMaterial);
      const halo = new THREE.Mesh(new THREE.CircleGeometry(0.78, 20), haloMaterial);
      core.position.set(x, 2.72, 7.08);
      halo.position.set(x, 2.72, 7.055);
      this.group.add(halo, core);
      this.rearThrusters.push({ core, halo });
    }
    this.rearThrusterLight = new THREE.PointLight(0x35cfff, 0.7, 19, 2);
    this.rearThrusterLight.position.set(0, 2.72, 7.55);
    this.group.add(this.rearThrusterLight);
    this.propulsionEnergyLevel = 0.24;
    this.rearEnergyLevel = 0.18;
  }

  updatePropulsionEnergy(delta, keys, hasFuel) {
    if (!this.turbineEnergy) return;
    this.energyTime += delta;
    const speedRatio = THREE.MathUtils.clamp(Math.abs(this.speed) / this.maxForwardSpeed, 0, 1);
    const liftRatio = THREE.MathUtils.clamp(Math.abs(this.verticalVelocity) / CONFIG.verticalThrust, 0, 1);
    const hoverTarget = hasFuel ? 0.28 + speedRatio * 0.26 + liftRatio * 0.46 : 0.05;
    this.propulsionEnergyLevel = THREE.MathUtils.lerp(this.propulsionEnergyLevel, hoverTarget, 1 - Math.exp(-delta * 5.2));

    for (const jet of this.turbineEnergy) {
      const flutter = 0.93 + Math.sin(this.energyTime * 17 + jet.phase) * 0.07;
      const intensity = this.propulsionEnergyLevel * flutter;
      jet.group.scale.y = 0.62 + intensity * 0.9;
      jet.outer.material.opacity = 0.08 + intensity * 0.2;
      jet.inner.material.opacity = 0.16 + intensity * 0.36;
      for (let i = 0; i < jet.particles.length; i++) {
        const particle = jet.particles[i];
        const travel = (particle.userData.phase + this.energyTime * (0.58 + intensity * 0.75)) % 1;
        const spread = 0.08 + travel * 0.38;
        particle.position.set(
          Math.sin(this.energyTime * 9 + i * 2.3 + jet.phase) * spread,
          -0.35 - travel * 5.1,
          Math.cos(this.energyTime * 7 + i * 1.9 + jet.phase) * spread
        );
        particle.material.opacity = (0.12 + intensity * 0.34) * (1 - travel * 0.68);
      }
    }

    const forwardThrust = keys.ArrowUp ? 1 : 0;
    const rearTarget = hasFuel ? 0.16 + speedRatio * 0.56 + forwardThrust * 0.28 : 0.03;
    this.rearEnergyLevel = THREE.MathUtils.lerp(this.rearEnergyLevel, rearTarget, 1 - Math.exp(-delta * (rearTarget > this.rearEnergyLevel ? 9 : 3.2)));
    const heat = THREE.MathUtils.clamp(this.rearEnergyLevel, 0, 1);
    for (const { core, halo } of this.rearThrusters) {
      core.material.opacity = 0.22 + heat * 0.55;
      core.material.color.setRGB(0.12 + heat * 0.75, 0.58 + heat * 0.42, 1);
      core.scale.setScalar(0.88 + heat * 0.28);
      halo.material.opacity = 0.06 + heat * 0.28;
      halo.scale.setScalar(0.9 + heat * 0.58);
    }
    this.rearThrusterLight.intensity = 0.45 + heat * 5.8;
  }

  update(delta, keys, terrainManager, hasFuel = true, skipWorldCollision = false) {
    const autopilotMode = Boolean(keys.Autopilot);
    const pitchMode = keys.KeyY;
    const forwardInput = hasFuel && keys.ArrowUp && !pitchMode ? 1 : 0;
    const reverseInput = hasFuel && keys.ArrowDown && !pitchMode ? 1 : 0;
    const turningTurret = keys.ShiftLeft || keys.ShiftRight;
    const horizontalInput = Number(Boolean(keys.ArrowLeft)) - Number(Boolean(keys.ArrowRight));
    const automaticBank = !turningTurret && !pitchMode &&
      Boolean(forwardInput || reverseInput) && horizontalInput !== 0;

    if (forwardInput) this.speed += this.acceleration * (autopilotMode ? 0.38 : 1) * delta;
    if (reverseInput) this.speed -= this.acceleration * delta;
    if (!forwardInput && !reverseInput) this.speed = moveToward(this.speed, 0, this.friction * delta);

    this.speed = THREE.MathUtils.clamp(this.speed, -this.maxReverseSpeed, this.maxForwardSpeed);
    if (autopilotMode && this.speed > 28.89) {
      this.speed = moveToward(this.speed, 28.89, this.friction * 1.35 * delta);
    }
    if (this.bumpTimer > 0) {
      this.speed *= 0.985;
      this.bumpTimer -= delta;
    }
    const altitudeLower = hasFuel && keys.KeyF && (keys.ShiftLeft || keys.ShiftRight);
    const altitudeClimb = hasFuel && keys.KeyF && !altitudeLower;
    if (!hasFuel) this.altitudeHoldY = null;
    if (altitudeLower) {
      this.altitudeHoldY = null;
      this.altitudeSettleTimer = 0;
      hud.status.textContent = "Lift released. Freefall engaged.";
      statusTimer = 1.2;
    } else if (altitudeClimb) {
      this.altitudeHoldY = null;
      this.altitudeSettleTimer = 0;
      this.verticalVelocity += CONFIG.verticalThrust * delta;
      hud.status.textContent = "Vertical thrusters flare beneath the hull.";
      statusTimer = 3;
    } else if (this.wasAltitudeClimbing || this.wasAltitudeLowering) {
      this.holdCurrentAltitude();
    }
    this.wasAltitudeClimbing = altitudeClimb;
    this.wasAltitudeLowering = altitudeLower;

    if (turningTurret) {
      if (keys.ArrowLeft) this.turret.rotation.y += this.turretTurnSpeed * delta;
      if (keys.ArrowRight) this.turret.rotation.y -= this.turretTurnSpeed * delta;
      this.turret.rotation.y = THREE.MathUtils.clamp(this.turret.rotation.y, -Math.PI, Math.PI);
    } else if (pitchMode) {
      if (keys.ArrowUp) this.turretPitch += this.turretPitchSpeed * delta;
      if (keys.ArrowDown) this.turretPitch -= this.turretPitchSpeed * delta;
    } else {
      const turnScale = THREE.MathUtils.clamp(Math.abs(this.speed) / 18, 0.25, 1);
      const steeringScale = autopilotMode ? 0.48 : this.manualTurnMultiplier;
      if (hasFuel && keys.ArrowLeft) this.group.rotation.y += this.turnSpeed * turnScale * steeringScale * delta;
      if (hasFuel && keys.ArrowRight) this.group.rotation.y -= this.turnSpeed * turnScale * steeringScale * delta;
    }

    const targetFlightPitch = this.combatDiveEnabled ? -THREE.MathUtils.degToRad(12) : 0;
    this.flightPitch = moveToward(this.flightPitch, targetFlightPitch, CONFIG.flightLevelSpeed * 0.72 * delta);
    const targetRoll = automaticBank ? horizontalInput * CONFIG.maxFlightRoll : 0;
    this.flightRoll = moveToward(this.flightRoll, targetRoll, CONFIG.flightLevelSpeed * delta);
    this.group.rotation.x = this.flightPitch;
    this.group.rotation.z = this.flightRoll;

    const frontAlignment = 1 - THREE.MathUtils.clamp(Math.abs(this.turret.rotation.y) / THREE.MathUtils.degToRad(24), 0, 1);
    const minimumPitch = THREE.MathUtils.lerp(-0.3, -THREE.MathUtils.degToRad(12), frontAlignment);
    this.turretPitch = THREE.MathUtils.clamp(this.turretPitch, minimumPitch, 0.72);
    this.cannon.rotation.x = this.turretPitch;
    this.missileRack.rotation.x = this.turretPitch;
    this.updateFuelTint(fuel / CONFIG.maxFuel);
    this.updatePropulsionEnergy(delta, keys, hasFuel);

    const forward = new THREE.Vector3(-Math.sin(this.group.rotation.y), 0, -Math.cos(this.group.rotation.y));
    const previousPosition = this.group.position.clone();
    this.group.position.addScaledVector(forward, this.speed * delta);
    const targetHoverY = terrainManager.getHeightAt(this.group.position.x, this.group.position.z) + CONFIG.tankHoverHeight;
    if (this.altitudeHoldY !== null) {
      const heldY = Math.max(this.altitudeHoldY, targetHoverY);
      const altitudeError = heldY - this.group.position.y;
      if (this.altitudeSettleTimer > 0) {
        const settleAcceleration = altitudeError * 18 - this.verticalVelocity * 7;
        this.verticalVelocity += settleAcceleration * delta;
        this.altitudeSettleTimer = Math.max(0, this.altitudeSettleTimer - delta);
      } else {
        this.verticalVelocity = moveToward(this.verticalVelocity, altitudeError * 4.5, CONFIG.hoverGravity * 1.7 * delta);
      }
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
    if (!skipWorldCollision && terrainManager.resolveTankCollision(this, previousPosition)) {
      this.bumpTimer = 0.28;
    }
  }

  togglePrecisionSteering() {
    this.manualTurnMultiplier = this.manualTurnMultiplier === 1 ? 0.5 : 1;
    hud.status.textContent = this.manualTurnMultiplier < 1
      ? "Precision steering: turn speed 50%."
      : "Standard steering restored.";
    statusTimer = 2.5;
  }

  toggleDoubleSpeed() {
    const doubleSpeedEnabled = this.maxForwardSpeed === CONFIG.tankMaxForwardSpeed;
    this.maxForwardSpeed = CONFIG.tankMaxForwardSpeed * (doubleSpeedEnabled ? 2 : 1);
    this.maxReverseSpeed = CONFIG.tankMaxReverseSpeed * (doubleSpeedEnabled ? 2 : 1);
    hud.status.textContent = doubleSpeedEnabled
      ? "High-speed drive: forward and reverse limits doubled."
      : "Standard drive speed restored.";
    statusTimer = 2.5;
  }

  toggleCombatDive() {
    this.combatDiveEnabled = !this.combatDiveEnabled;
    hud.status.textContent = this.combatDiveEnabled
      ? "Close-range attack attitude engaged. Nose down twelve degrees."
      : "Close-range attack attitude released. Returning to level.";
    statusTimer = 3;
  }

  getTurretWorldDirection() {
    return new THREE.Vector3(0, 0, -1).applyQuaternion(this.cannon.getWorldQuaternion(new THREE.Quaternion())).normalize();
  }

  addBeacon(parent, position, visualScale = 1) {
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xff1d1d, transparent: true, opacity: 0.64, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending })
    );
    light.position.copy(position);
    light.scale.setScalar(visualScale);
    parent.add(light);
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.72, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xff3824, transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending })
    );
    halo.position.copy(position);
    halo.scale.setScalar(visualScale);
    parent.add(halo);
    const cast = new THREE.PointLight(0xff321c, 0, 18, 2);
    cast.position.copy(position);
    parent.add(cast);
    this.beacons.push({ light, halo, cast, visualScale });
  }

  updateBeacons(musicPulse) {
    const beat = THREE.MathUtils.clamp(Math.pow(THREE.MathUtils.clamp(musicPulse, 0, 1), 0.58) * 1.35, 0, 1);
    for (const { light, halo, cast, visualScale = 1 } of this.beacons) {
      light.material.opacity = 0.34 + beat * 0.32;
      light.material.color.setRGB(1, 0.08 + beat * 0.92, 0.03 + beat * 0.68);
      light.scale.setScalar((1.18 + beat * 0.625) * visualScale);
      halo.material.opacity = 0.24 + beat * 0.76;
      halo.material.color.setRGB(1, 0.05 + beat * 0.55, 0.02 + beat * 0.18);
      halo.scale.setScalar((1.08 + beat * 1.275) * visualScale);
      cast.intensity = 1.25 + beat * 11.5;
    }
  }

  updateFuelTint(fuelRatio) {
    const heat = THREE.MathUtils.clamp(1 - fuelRatio, 0, 1);
    for (const material of this.paintMaterials) {
      material.color.copy(material.userData.baseColor).lerp(new THREE.Color(0xff1e18), heat * 0.82);
      material.emissive = material.emissive || new THREE.Color(0x000000);
      material.emissive.set(0x000000).lerp(new THREE.Color(0x7a0503), heat * 0.42);
    }
  }

  centerTurret(preservePitch = false) {
    this.turret.rotation.y = 0;
    if (!preservePitch) {
      this.turretPitch = 0;
      this.cannon.rotation.x = 0;
      this.missileRack.rotation.x = 0;
    }
    hud.status.textContent = preservePitch ? "Turret yaw centered; cannon pitch held." : "Turret centered for a straight shot.";
    statusTimer = 2.5;
  }

  takeNextMissile() {
    if (this.missileLaunchIndex >= this.missileSlots.length) return null;
    this.group.updateMatrixWorld(true);
    const missile = this.missileSlots[this.missileLaunchIndex++];
    const position = missile.getWorldPosition(new THREE.Vector3());
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(missile.getWorldQuaternion(new THREE.Quaternion())).normalize();
    missile.visible = false;
    return { position, direction };
  }

  reloadMissiles() {
    this.missileLaunchIndex = 0;
    for (const missile of this.missileSlots) missile.visible = true;
  }

  getMissileCount() {
    return this.missileSlots.length - this.missileLaunchIndex;
  }

  holdCurrentAltitude() {
    const terrainHoverY = terrain.getHeightAt(this.group.position.x, this.group.position.z) + CONFIG.tankHoverHeight;
    if (this.group.position.y > terrainHoverY + 0.35) {
      this.altitudeHoldY = this.group.position.y;
      this.verticalVelocity = THREE.MathUtils.clamp(this.verticalVelocity, -0.72, 0.72);
      this.altitudeSettleTimer = 0.9;
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
    return this.turretMuzzle
      ? this.turretMuzzle.getWorldPosition(new THREE.Vector3())
      : this.cannon.localToWorld(new THREE.Vector3(0, 0, -16.72));
  }

  getCannonCollisionStart() {
    return this.turretCollisionStart
      ? this.turretCollisionStart.getWorldPosition(new THREE.Vector3())
      : this.cannon.localToWorld(new THREE.Vector3(0, 0, -1.1));
  }

  getCannonShots() {
    const shots = [{
      position: this.getMuzzleWorldPosition(),
      direction: this.getTurretWorldDirection(),
      collisionStart: this.getCannonCollisionStart()
    }];
    if (!this.fixedCannonMuzzles || Math.abs(this.turret.rotation.y) > THREE.MathUtils.degToRad(1.25)) return shots;
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.group.getWorldQuaternion(new THREE.Quaternion())).normalize();
    for (let i = 0; i < this.fixedCannonMuzzles.length; i++) {
      shots.push({
        position: this.fixedCannonMuzzles[i].getWorldPosition(new THREE.Vector3()),
        direction: direction.clone(),
        collisionStart: this.fixedCannonStarts[i].getWorldPosition(new THREE.Vector3())
      });
    }
    return shots;
  }
}

class BootcampDuelManager {
  constructor(scene, terrainManager, playerTank, enemyManager) {
    this.scene = scene;
    this.terrain = terrainManager;
    this.player = playerTank;
    this.enemyManager = enemyManager;
    this.opponent = new Tank(scene);
    this.opponent.group.visible = false;
    this.opponentColorized = false;
    this.skinnedImportedModel = null;
    this.baseSkinApplied = false;
    this.collisionRadius = CONFIG.tankCollisionRadius;
    this.baseHealth = CONFIG.maxHitPoints;
    this.health = this.baseHealth;
    this.active = false;
    this.state = "ready";
    this.fireTimer = 1.9 + Math.random() * 1.2;
    this.maxRange = 320;
    this.preferredRange = 130;
    this.attackArc = THREE.MathUtils.degToRad(12);
    this.respawnTimer = 0;
    this.nextTunnelReset = 60;
    this.tunnelLife = 0;
    this.tunnelActive = false;
    this.tunnelRadius = 14;
    this.playerInTunnel = false;
    this.tunnelMarker = null;
    this.tunnelCenter = new THREE.Vector3();
    this.tunnelNormal = new THREE.Vector3(0, 1, 0);
    this.flightClock = Math.random() * Math.PI * 2;
    this.createTunnelMarker();
  }

  activate() {
    this.active = true;
    this.respawnTimer = 0;
    this.nextTunnelReset = 60;
    this.tunnelLife = 0;
    this.tunnelActive = false;
    this.playerInTunnel = false;
    this.state = "fighting";
    this.respawnOpponent();
  }

  deactivate() {
    this.active = false;
    this.hideTunnel();
    if (this.opponent && this.opponent.group) this.opponent.group.visible = false;
  }

  update(delta) {
    if (!this.active) return;
    this.ensureBootcampSkin();
    if (this.respawnTimer > 0) {
      this.respawnTimer -= delta;
      if (this.respawnTimer <= 0) this.respawnOpponent();
      return;
    }

    this.applyOpponentAI(delta);
    if (this.health <= 0) {
      this.health = 0;
      this.handleDefeat();
      return;
    }

    if (this.tunnelActive) {
      this.tunnelLife -= delta;
      this.updateTunnelVisual(delta);
      this.checkTunnelPass();
      if (this.tunnelLife <= 0) {
        this.hideTunnel();
      }
    } else if (this.nextTunnelReset > 0) {
      this.nextTunnelReset -= delta;
      if (this.nextTunnelReset <= 0) this.spawnTunnel();
    }
  }

  ensureBootcampSkin() {
    if (!this.opponent) return;
    const importedModel = this.opponent.importedModel || null;
    if (this.baseSkinApplied && importedModel === this.skinnedImportedModel) return;
    const accent = new THREE.Color(0xf000ff);
    const glow = new THREE.Color(0x9d00ff);
    this.opponent.group.traverse(child => {
      if (!child.isMesh || !child.material || !child.material.color || child.userData.bootcampTinted) return;
      child.material = child.material.clone();
      child.material.color.lerp(accent, 0.88);
      if (child.material.emissive) {
        child.material.emissive.copy(glow);
        child.material.emissiveIntensity = Math.max(2.2, child.material.emissiveIntensity || 0);
      }
      child.material.roughness = Math.max(0.06, child.material.roughness - 0.18);
      child.material.metalness = Math.min(1, child.material.metalness + 0.12);
      child.userData.bootcampTinted = true;
    });
    this.baseSkinApplied = true;
    this.skinnedImportedModel = importedModel;
    this.opponentColorized = true;
  }

  spawnOpponent() {
    const forward = new THREE.Vector3(-Math.sin(this.player.group.rotation.y), 0, -Math.cos(this.player.group.rotation.y));
    const distance = 170 + Math.random() * 45;
    const lateral = (Math.random() - 0.5) * 30;
    const spawn = this.player.group.position.clone().addScaledVector(forward, -distance);
    spawn.x += forward.z * lateral;
    spawn.z -= forward.x * lateral;
    const ground = this.terrain.getHeightAt(spawn.x, spawn.z);
    this.opponent.group.position.set(spawn.x, ground + CONFIG.tankHoverHeight + 18, spawn.z);
    this.opponent.group.rotation.y = Math.atan2(-forward.x, -forward.z) + (Math.random() - 0.5) * 0.3;
    this.opponent.group.rotation.x = 0;
    this.opponent.group.rotation.z = 0;
    this.opponent.speed = 0;
    this.opponent.verticalVelocity = 0;
    this.opponent.combatDiveEnabled = false;
    this.opponent.altitudeHoldY = null;
    this.opponent.verticalVelocity = 0;
    this.opponent.turret.rotation.set(0, 0, 0);
    this.opponent.cannon.rotation.set(0, 0, 0);
    this.opponent.missileRack.rotation.set(0, 0, 0);
    this.opponent.turretPitch = 0;
    this.opponent.missileLaunchIndex = 0;
    this.opponent.reloadMissiles();
    this.health = this.baseHealth;
    this.opponent.group.visible = true;
  }

  respawnOpponent() {
    this.state = "fighting";
    this.fireTimer = 1.8 + Math.random() * 0.9;
    this.spawnOpponent();
  }

  handleDefeat() {
    if (this.state === "destroyed") return;
    this.state = "destroyed";
    runStats.bootcampOpponentsDefeated++;
    const center = this.opponent.group.position.clone();
    createExplosion(center, { radius: 4, growth: 35, life: 0.95, color: 0xff3f2a, opacity: 0.75 });
    this.opponent.group.visible = false;
    hud.status.textContent = "Enemy hovertank destroyed. Continue toward the next bootcamp cycle.";
    statusTimer = 3.6;
    this.respawnTimer = 3.8;
    if (!this.tunnelActive) this.nextTunnelReset = Math.max(this.nextTunnelReset, 20);
  }

  applyOpponentAI(delta) {
    if (!this.opponent || !this.player) return;
    const toPlayer = this.player.group.position.clone().sub(this.opponent.group.position);
    const flat = new THREE.Vector3(toPlayer.x, 0, toPlayer.z);
    const distance = flat.length();
    if (distance > 0.001) flat.normalize();
    const targetYaw = Math.atan2(-toPlayer.x, -toPlayer.z);
    const yawDelta = wrapAngle(targetYaw - this.opponent.group.rotation.y);
    const turnLeft = yawDelta > 0.03;
    const turnRight = yawDelta < -0.03;
    const forward = distance > this.preferredRange + 20;
    const reverse = distance < this.preferredRange - 16 || distance < 55;
    this.flightClock += delta;
    const opponentGround = this.terrain.getHeightAt(this.opponent.group.position.x, this.opponent.group.position.z);
    const playerGround = this.terrain.getHeightAt(this.player.group.position.x, this.player.group.position.z);
    const playerClearance = Math.max(0, this.player.group.position.y - playerGround - CONFIG.tankHoverHeight);
    const targetClearance = THREE.MathUtils.clamp(
      playerClearance + 12 + Math.sin(this.flightClock * 0.62) * 14,
      10,
      58
    );
    const altitudeError = opponentGround + CONFIG.tankHoverHeight + targetClearance - this.opponent.group.position.y;
    const adjustAltitude = Math.abs(altitudeError) > 2.5;
    const controls = {
      Autopilot: false,
      ArrowUp: forward,
      ArrowDown: reverse,
      ArrowLeft: turnLeft,
      ArrowRight: turnRight,
      ShiftLeft: adjustAltitude && altitudeError < 0,
      ShiftRight: false,
      KeyF: adjustAltitude,
      KeyY: false,
      KeyV: false,
      ControlLeft: false,
      ControlRight: false,
      KeyZ: false
    };
    this.opponent.update(delta, controls, this.terrain, true, true);

    const localTarget = toPlayer.clone().applyQuaternion(this.opponent.group.quaternion.clone().invert());
    const targetYawLocal = Math.atan2(localTarget.x, -localTarget.z);
    const targetPitch = THREE.MathUtils.clamp(
      Math.atan2(localTarget.y + 0.9, Math.max(0.2, -localTarget.z)),
      -THREE.MathUtils.degToRad(10),
      THREE.MathUtils.degToRad(24)
    );
    const turretYaw = wrapAngle(targetYawLocal);
    const yawError = wrapAngle(turretYaw - this.opponent.turret.rotation.y);
    this.opponent.turret.rotation.y += yawError * Math.min(1, delta * 3.8);
    const pitchError = targetPitch - this.opponent.cannon.rotation.x;
    this.opponent.cannon.rotation.x = moveToward(this.opponent.cannon.rotation.x, targetPitch, delta * 1.6);
    this.opponent.turretPitch = this.opponent.cannon.rotation.x;
    this.opponent.missileRack.rotation.x = this.opponent.cannon.rotation.x;

    this.fireTimer -= delta;
    if (this.fireTimer <= 0 && Math.abs(yawError) < this.attackArc && distance < this.maxRange) {
      const muzzle = this.opponent.getMuzzleWorldPosition();
      const direction = this.opponent.getTurretWorldDirection();
      this.enemyManager.fireEnemyShell(muzzle, direction);
      this.fireTimer = 1.9 + Math.random() * 0.95;
    }
  }

  checkPlayerHit(start, end, radius, shot) {
    if (!this.opponent || !this.opponent.group.visible || this.state !== "fighting") return false;
    const impactRadius = this.collisionRadius + radius;
    if (distanceToSegmentSquared(this.opponent.group.position, start, end) > impactRadius * impactRadius) return false;
    const damage = shot.kind === "missile" ? 90 : shot.kind === "bomb" ? 130 : 10;
    this.takeDamage(damage, shot);
    return true;
  }

  takeDamage(amount, shot) {
    this.health = Math.max(0, this.health - amount);
    const position = this.opponent.group.position.clone();
    registerPlayerHit(shot, position, amount, "object");
    createImpactSparks(position, shot.direction || new THREE.Vector3(0, 1, 0));
    if (this.health <= 0) {
      this.handleDefeat();
    }
  }

  createTunnelMarker() {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(this.tunnelRadius, 0.45, 12, 56),
      new THREE.MeshStandardMaterial({ color: 0x8ff4ff, emissive: 0x2ce7ff, emissiveIntensity: 1.9 })
    );
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(this.tunnelRadius * 0.84, 0.09, 8, 34),
      new THREE.MeshBasicMaterial({ color: 0xfff7df, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending })
    );
    this.tunnelPortal = new THREE.Group();
    this.tunnelPortal.add(ring, rim);
    this.tunnelPortal.visible = false;
    this.scene.add(this.tunnelPortal);
  }

  spawnTunnel() {
    const forward = new THREE.Vector3(-Math.sin(this.player.group.rotation.y), 0, -Math.cos(this.player.group.rotation.y));
    const left = new THREE.Vector3(forward.z, 0, -forward.x);
    const playerPos = this.player.group.position;
    const playerAhead = playerPos.clone().addScaledVector(forward, 95 + Math.random() * 55);
    playerAhead.addScaledVector(left, (Math.random() - 0.5) * 55);
    playerAhead.y = this.terrain.getHeightAt(playerAhead.x, playerAhead.z) + CONFIG.tankHoverHeight + 1 + Math.random() * 2.8;
    this.tunnelCenter.copy(playerAhead);
    this.tunnelNormal.set(0, 1, 0);
    this.tunnelPortal.position.copy(this.tunnelCenter);
    this.tunnelPortal.rotation.y = this.player.group.rotation.y + (Math.random() - 0.5) * 0.8;
    this.tunnelPortal.visible = true;
    this.tunnelLife = 22;
    this.tunnelActive = true;
    this.playerInTunnel = false;
  }

  hideTunnel() {
    this.tunnelLife = 0;
    this.tunnelActive = false;
    this.playerInTunnel = false;
    this.nextTunnelReset = Math.max(18, this.nextTunnelReset);
    if (this.tunnelPortal) this.tunnelPortal.visible = false;
  }

  updateTunnelVisual(delta) {
    if (!this.tunnelPortal || !this.tunnelPortal.visible) return;
    const ring = this.tunnelPortal.children[0];
    const rim = this.tunnelPortal.children[1];
    const pulse = 0.12 + Math.sin(performance.now() * 0.0012) * 0.06;
    ring.scale.setScalar(1 + pulse * 0.08);
    rim.scale.setScalar(1 + (1 - pulse) * 0.05);
  }

  checkTunnelPass() {
    if (!this.tunnelPortal || !this.tunnelPortal.visible) return;
    const playerY = this.player.group.position.y;
    const distance = this.player.group.position.distanceTo(this.tunnelCenter);
    const inside = distance <= this.tunnelRadius && Math.abs(playerY - this.tunnelCenter.y) <= 8;
    if (!this.playerInTunnel && inside) {
      this.handleTunnelPass();
      return;
    }
    this.playerInTunnel = inside;
  }

  handleTunnelPass() {
    this.playerInTunnel = true;
    this.nextTunnelReset = 60;
    this.hideTunnel();
    runStats.bootcampTunnels++;
    if (typeof resupplyTank === "function") resupplyTank();
    this.opponent.reloadMissiles();
    if (this.state !== "destroyed" && this.health > 0) this.opponent.reloadMissiles();
    const currentHealth = this.health;
    this.health = this.baseHealth;
    if (this.opponent) this.respawnOpponent();
    this.health = this.baseHealth;
    hud.status.textContent = `Tunnel complete. Bootcamp systems reset (${Math.round(currentHealth)}) and resupply locked in.`;
    statusTimer = 3.2;
  }
}

const detentionBuildingSites = new Set([
  "2,2", "2,-2", "-2,2", "-2,-2",
  "3,0", "-3,0", "0,3", "0,-3",
  "3,2", "3,-2", "-3,2", "-3,-2"
]);
const prisonCitySite = { chunkX: 0, chunkZ: -1, localX: 0, localZ: 40, worldX: 0, worldZ: -180 };
const prisonSprawlRadiusChunks = 14;
const sharedGeometries = new Set();
const prisonGeometry = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 10),
  smoke: new THREE.SphereGeometry(1, 8, 6)
};
Object.values(prisonGeometry).forEach(geometry => sharedGeometries.add(geometry));

function isPrisonSprawlChunk(cx, cz) {
  return Math.abs(cx) <= prisonSprawlRadiusChunks && Math.abs(cz) <= prisonSprawlRadiusChunks;
}

let radioTowerModelPromise = null;
function loadRadioTowerModel() {
  if (radioTowerModelPromise) return radioTowerModelPromise;
  radioTowerModelPromise = new Promise((resolve, reject) => {
    const loader = new THREE.OBJLoader();
    loader.load("assets/models/Radio-Tower.obj?v=radio-tower-1", source => {
      source.traverse(child => {
        if (!child.isMesh) return;
        sharedGeometries.add(child.geometry);
        child.material = child.name.toLowerCase().includes("sphere") ? materials.radioSphere : materials.radioTower;
        child.castShadow = true;
        child.receiveShadow = true;
      });
      resolve(source);
    }, undefined, reject);
  });
  return radioTowerModelPromise;
}

let surveillanceModelPromise = null;
function loadSurveillanceModel() {
  if (surveillanceModelPromise) return surveillanceModelPromise;
  surveillanceModelPromise = new Promise((resolve, reject) => {
    const loader = new THREE.OBJLoader();
    loader.load("assets/models/Sky-Surveillance.obj?v=guarded-surveillance-1", source => {
      source.traverse(child => {
        if (!child.isMesh) return;
        sharedGeometries.add(child.geometry);
        child.material = materials.surveillanceChrome;
        child.castShadow = false;
        child.receiveShadow = true;
      });
      resolve(source);
    }, undefined, reject);
  });
  return surveillanceModelPromise;
}

class SurveillanceFleet {
  constructor(parent, terrainManager) {
    this.parent = parent;
    this.terrain = terrainManager;
    this.droids = [];
    this.elapsed = 0;
    this.spawnTimer = 1.2;
    this.source = null;
    this.sourceCenter = new THREE.Vector3();
    this.sourceSize = new THREE.Vector3();
    this.targetCount = 24;
    loadSurveillanceModel().then(source => {
      this.source = source;
      new THREE.Box3().setFromObject(source).getSize(this.sourceSize);
      new THREE.Box3().setFromObject(source).getCenter(this.sourceCenter);
    }).catch(error => console.error("Surveillance droid model failed to load", error));
  }

  spawn() {
    if (!this.source || this.droids.length >= this.targetCount) return false;
    const i = this.droids.length;
    const root = new THREE.Group();
    const model = this.source.clone(true);
    const modelScale = 13 / Math.max(this.sourceSize.y, 0.001);
    model.scale.setScalar(modelScale);
    model.position.set(-this.sourceCenter.x * modelScale, -this.sourceCenter.y * modelScale, -this.sourceCenter.z * modelScale);
    root.add(model);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xb8fbff, transparent: true, opacity: 1, depthWrite: false })
    );
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(2.25, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0x39dfff, transparent: true, opacity: 0.5, depthWrite: false })
    );
    const bulbY = -this.sourceSize.y * modelScale * 0.42;
    core.position.y = bulbY;
    halo.position.y = bulbY;
    root.add(core, halo);

    const panel = model.getObjectByName("Cube2");
    if (panel) {
      const rotationMark = new THREE.Mesh(
        new THREE.BoxGeometry(1.65, 0.16, 0.1),
        new THREE.MeshBasicMaterial({ color: 0x68efff, toneMapped: false })
      );
      rotationMark.position.set(1.65, 0.46, 0.09);
      panel.add(rotationMark);
    }

    const horizontal = i % 2 === 0;
    const routeLines = [-200, -150, -100, -50, 0, 50, 100, 150, 200];
    const lane = routeLines[Math.floor(i / 2) % routeLines.length];
    const progress = -210 + seededRandom(i * 97 + 11) * 420;
    root.position.set(horizontal ? progress : lane, 70, horizontal ? lane : progress);
    root.rotation.y = horizontal ? Math.PI * 0.5 : 0;
    this.parent.add(root);
    this.droids.push({
      root,
      panel,
      core,
      halo,
      horizontal,
      direction: i % 4 < 2 ? 1 : -1,
      speed: 10 + seededRandom(i * 53 + 5) * 7,
      phase: seededRandom(i * 71 + 13) * Math.PI * 2,
      altitudePhase: seededRandom(i * 83 + 17) * Math.PI * 2
    });
    return true;
  }

  update(delta, tankRef) {
    this.elapsed += delta;
    if (this.source && this.droids.length < this.targetCount) {
      this.spawnTimer -= delta;
      if (this.spawnTimer <= 0) {
        this.spawn();
        this.spawnTimer = 0.65;
      }
    }
    for (const droid of this.droids) {
      const travel = droid.speed * droid.direction * delta;
      const candidate = droid.root.position.clone();
      if (droid.horizontal) candidate.x += travel;
      else candidate.z += travel;
      let obstacleTop = -Infinity;
      for (const item of this.terrain.destructibles) {
        if (!item.solid || !item.object.parent || item.collisionBox.isEmpty()) continue;
        const box = item.collisionBox;
        if (candidate.x > box.min.x - 7 && candidate.x < box.max.x + 7 &&
            candidate.z > box.min.z - 7 && candidate.z < box.max.z + 7) {
          obstacleTop = Math.max(obstacleTop, box.max.y);
        }
      }
      if (obstacleTop > droid.root.position.y - 8) {
        droid.direction *= -1;
        droid.root.rotation.y += Math.PI;
        droid.evadeAltitude = Math.max(droid.evadeAltitude || 0, obstacleTop + 18);
      } else {
        droid.root.position.x = candidate.x;
        droid.root.position.z = candidate.z;
      }
      const toDroid = droid.root.position.clone().sub(tankRef.group.position).setY(0);
      if (toDroid.lengthSq() < 48 * 48) {
        if (toDroid.lengthSq() < 0.01) toDroid.set(1, 0, 0);
        toDroid.normalize();
        droid.root.position.addScaledVector(toDroid, delta * 42);
        droid.evadeAltitude = Math.max(droid.evadeAltitude || 0, tankRef.group.position.y + 28);
      }
      const routePosition = droid.horizontal ? droid.root.position.x : droid.root.position.z;
      if (Math.abs(routePosition) > 215) {
        droid.direction *= -1;
        droid.root.rotation.y += Math.PI;
      }
      const clearance = 32 + (0.5 + Math.sin(this.elapsed * 0.16 + droid.altitudePhase) * 0.5) * 58;
      const ground = this.terrain.getHeightAt(droid.root.position.x, droid.root.position.z);
      const cruiseY = ground + clearance + Math.sin(this.elapsed * 1.15 + droid.phase) * 1.4;
      droid.root.position.y = THREE.MathUtils.lerp(droid.root.position.y, Math.max(cruiseY, droid.evadeAltitude || 0), Math.min(1, delta * 4));
      droid.evadeAltitude = Math.max(0, (droid.evadeAltitude || 0) - delta * 8);
      if (droid.panel) droid.panel.rotation.y = this.elapsed * 1.44 + droid.phase;
      const pulse = 0.5 + Math.sin(this.elapsed * 4.6 + droid.phase) * 0.5;
      const flash = Math.sin(this.elapsed * 1.35 + droid.phase) > 0.82 ? 1 : 0.42;
      droid.core.scale.setScalar(0.85 + pulse * 0.5);
      droid.halo.scale.setScalar(0.8 + pulse * 0.95);
      droid.core.material.opacity = 0.66 + pulse * 0.34;
      droid.halo.material.opacity = (0.2 + pulse * 0.52) * flash;
    }
  }
}

function addRadioTowerToRoof(parent, x, roofY, z, seed) {
  loadRadioTowerModel().then(source => {
    if (!parent.parent) return;
    const tower = source.clone(true);
    const bounds = new THREE.Box3().setFromObject(tower);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = (15 + seededRandom(seed) * 7) / Math.max(size.y, 0.001);
    tower.scale.setScalar(scale);
    tower.position.set(x - center.x * scale, roofY - bounds.min.y * scale, z - center.z * scale);
    tower.rotation.y = seededRandom(seed + 1) * Math.PI * 2;
    parent.add(tower);
    parent.updateMatrixWorld(true);
    tower.updateMatrixWorld(true);
    const sphereMesh = tower.getObjectByName("sphere2");
    if (!sphereMesh) return;
    const spherePosition = sphereMesh.getWorldPosition(new THREE.Vector3());
    parent.worldToLocal(spherePosition);
    const coreMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, depthWrite: false });
    const core = new THREE.Mesh(new THREE.SphereGeometry(1.35, 12, 8), coreMaterial);
    core.position.copy(spherePosition);
    parent.add(core);
    const haloMaterial = new THREE.MeshBasicMaterial({ color: 0xffe861, transparent: true, opacity: 0.5, depthWrite: false });
    const halo = new THREE.Mesh(new THREE.SphereGeometry(3.8, 12, 8), haloMaterial);
    halo.position.copy(spherePosition);
    parent.add(halo);
    radioTowerEffects.push({ root: parent, sphere: sphereMesh, core, halo, phase: seededRandom(seed + 2) * Math.PI * 2 });
  }).catch(error => console.error("Radio tower model failed to load", error));
}

function createPrisonDistrict(cx, cz, terrainManager, reserveCenter = false) {
  const group = new THREE.Group();
  const colliders = [];
  const seedBase = cx * 92821 + cz * 68917;
  const worldOriginX = cx * CONFIG.chunkSize;
  const worldOriginZ = cz * CONFIG.chunkSize;
  const isReserved = (x, z, radius) => terrainManager.overlapsClearZone(worldOriginX + x, worldOriginZ + z, radius);
  const matrices = {
    concrete: [], panel: [], pipe: [], dirtyPipe: [], lightWarm: [], lightCool: []
  };
  const dummy = new THREE.Object3D();
  const addInstance = (list, x, y, z, sx, sy, sz, rotationY = 0) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, rotationY, 0);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    list.push(dummy.matrix.clone());
  };
  const addCylinder = (list, x, y, z, radius, length, axis = "y") => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(axis === "x" ? 0 : axis === "z" ? Math.PI / 2 : 0, 0, axis === "x" ? Math.PI / 2 : 0);
    dummy.scale.set(radius, length, radius);
    dummy.updateMatrix();
    list.push(dummy.matrix.clone());
  };
  const addCollider = (x, y, z, width, height, depth) => {
    const collider = new THREE.Mesh(prisonGeometry.box, materials.collisionInvisible);
    collider.position.set(x, y, z);
    collider.scale.set(width, height, depth);
    collider.userData.radius = Math.hypot(width, depth) * 0.5;
    colliders.push(collider);
  };

  // One broad, shadowless pool per alternating district keeps streets readable
  // without multiplying expensive real-time lights across every visible chunk.
  if (Math.abs(cx + cz) % 2 === 0) {
    const warmDistrict = Math.abs(cx * 3 + cz) % 3 !== 0;
    const streetFill = new THREE.PointLight(warmDistrict ? 0xff9a55 : 0x55c8ff, warmDistrict ? 0.72 : 0.58, 145, 2);
    streetFill.position.set(0, 16, 0);
    group.add(streetFill);
  }

  const buildingCount = 4 + Math.floor(seededRandom(seedBase + 3) * 3);
  const buildingSites = [[-66, -62], [66, -62], [-66, 62], [66, 62], [-68, 0], [68, 0]];
  for (let i = 0; i < buildingCount; i++) {
    const jitterX = (seededRandom(seedBase + i * 17) - 0.5) * 13;
    const jitterZ = (seededRandom(seedBase + i * 29) - 0.5) * 13;
    const x = buildingSites[i][0] + jitterX;
    const z = buildingSites[i][1] + jitterZ;
    if (cx === 0 && cz === 0) continue;
    if (reserveCenter && Math.hypot(x, z) < 92) continue;
    const width = 30 + seededRandom(seedBase + i * 43) * 16;
    const depth = 28 + seededRandom(seedBase + i * 53) * 16;
    const height = 25 + seededRandom(seedBase + i * 61) * 48;
    if (isReserved(x, z, Math.hypot(width, depth) * 0.55)) continue;
    addInstance(matrices.concrete, x, height * 0.5, z, width, height, depth);
    addInstance(matrices.panel, x, height + 1.4, z, width + 2.2, 2.8, depth + 2.2);
    for (const side of [-1, 1]) {
      addInstance(matrices.panel, x + side * (width * 0.5 + 0.35), height * 0.54, z, 0.7, height * 0.76, depth * 0.76);
    }
    const ribCount = 3 + Math.floor(width / 16);
    for (let rib = 0; rib < ribCount; rib++) {
      const rx = x + THREE.MathUtils.lerp(-width * 0.38, width * 0.38, rib / Math.max(1, ribCount - 1));
      addInstance(matrices.panel, rx, height * 0.54, z - depth * 0.5 - 0.32, 1.1, height * 0.72, 0.65);
    }
    const lightRows = Math.max(2, Math.floor((height - 8) / 12));
    for (let row = 0; row < lightRows; row++) {
      const lightY = 8 + row * 11;
      for (const offsetX of [-width * 0.28, 0, width * 0.28]) {
        const lightList = (row + i + Math.abs(cx + cz)) % 4 === 0 ? matrices.lightCool : matrices.lightWarm;
        addInstance(lightList, x + offsetX, lightY, z - depth * 0.5 - 0.68, 4.5, 0.42, 0.28);
        addInstance(lightList, x + offsetX, lightY, z + depth * 0.5 + 0.68, 4.5, 0.42, 0.28);
      }
      for (const offsetZ of [-depth * 0.25, depth * 0.25]) {
        const lightList = (row + i + Math.abs(cx - cz)) % 5 === 0 ? matrices.lightCool : matrices.lightWarm;
        addInstance(lightList, x - width * 0.5 - 0.68, lightY, z + offsetZ, 0.28, 0.42, 4.5);
        addInstance(lightList, x + width * 0.5 + 0.68, lightY, z + offsetZ, 0.28, 0.42, 4.5);
      }
    }
    addCollider(x, height * 0.5, z, width, height, depth);
    if ((i + Math.abs(cx * 3 + cz)) % 3 === 0) addRadioTowerToRoof(group, x, height + 2.8, z, seedBase + i * 101);

    const pipeY = height * 0.72;
    for (let pipe = 0; pipe < 3; pipe++) {
      addCylinder(pipe % 2 ? matrices.pipe : matrices.dirtyPipe, x - width * 0.5 - 1.1 - pipe * 1.25, pipeY + pipe * 1.15, z, 0.48, depth * 0.92, "z");
    }
  }

  const hasXBridge = !reserveCenter && Math.abs(cz) % 2 === 0;
  const hasZBridge = !reserveCenter && Math.abs(cx) % 3 === 0;
  const bridgeY = 31 + ((Math.abs(cx * 3 + cz * 5)) % 3) * 4;
  const addBridge = axis => {
    const alongX = axis === "x";
    addInstance(matrices.concrete, 0, bridgeY, 0, alongX ? 224 : 15, 4, alongX ? 15 : 224);
    addInstance(matrices.panel, 0, bridgeY + 3.25, alongX ? -7.25 : 0, alongX ? 224 : 0.7, 2.5, alongX ? 0.7 : 224);
    addInstance(matrices.panel, 0, bridgeY + 3.25, alongX ? 7.25 : 0, alongX ? 224 : 0.7, 2.5, alongX ? 0.7 : 224);
    for (const offset of [-82, -41, 0, 41, 82]) {
      const lightList = Math.abs(offset / 41 + cx - cz) % 3 === 0 ? matrices.lightWarm : matrices.lightCool;
      addInstance(lightList, alongX ? offset : -6.35, bridgeY - 2.25, alongX ? -6.35 : offset, 3.4, 0.24, 0.42);
      addInstance(lightList, alongX ? offset : 6.35, bridgeY - 2.25, alongX ? 6.35 : offset, 3.4, 0.24, 0.42);
    }
    for (const offset of [-82, -41, 0, 41, 82]) {
      if (offset === 0 || (reserveCenter && Math.abs(offset) < 58)) continue;
      const pierX = alongX ? offset : 0;
      const pierZ = alongX ? 0 : offset;
      if (isReserved(pierX, pierZ, 9)) continue;
      addCylinder(matrices.concrete, alongX ? offset : -5.2, bridgeY * 0.5, alongX ? -5.2 : offset, 3.1, bridgeY, "y");
      addCylinder(matrices.concrete, alongX ? offset : 5.2, bridgeY * 0.5, alongX ? 5.2 : offset, 3.1, bridgeY, "y");
    }
    addCollider(0, bridgeY, 0, alongX ? 224 : 15, 4, alongX ? 15 : 224);
  };
  if (hasXBridge) addBridge("x");
  if (hasZBridge) addBridge("z");

  const towerCount = reserveCenter ? 0 : 1 + (Math.abs(cx + cz) % 2);
  for (let i = 0; i < towerCount; i++) {
    const x = (i ? 1 : -1) * (76 - seededRandom(seedBase + 211 + i) * 16);
    const z = (seededRandom(seedBase + 227 + i) - 0.5) * 92;
    const height = 68 + seededRandom(seedBase + 239 + i) * 52;
    if (isReserved(x, z, 18)) continue;
    addInstance(matrices.concrete, x, height * 0.5, z, 13, height, 13);
    addInstance(matrices.panel, x, height - 5, z, 25, 12, 25);
    addInstance(matrices.concrete, x, height + 2, z, 29, 2.2, 29);
    addCollider(x, height * 0.5, z, 13, height, 13);
  }

  if (!reserveCenter && seededRandom(seedBase + 307) > 0.56) {
    let stackX = 48 + (seededRandom(seedBase + 311) - 0.5) * 70;
    let stackZ = -52 + (seededRandom(seedBase + 313) - 0.5) * 65;
    const stackHeight = 76 + seededRandom(seedBase + 317) * 45;
    if (isReserved(stackX, stackZ, 17)) {
      stackX *= -1;
      stackZ *= -1;
    }
    addCylinder(matrices.dirtyPipe, stackX, stackHeight * 0.5, stackZ, 7.5, stackHeight, "y");
    addCylinder(matrices.pipe, stackX, stackHeight + 1.5, stackZ, 9.2, 3, "y");
    addCollider(stackX, stackHeight * 0.5, stackZ, 15, stackHeight, 15);
    const plume = new THREE.Group();
    plume.position.set(stackX, stackHeight + 4, stackZ);
    group.add(plume);
    const puffs = [];
    for (let i = 0; i < 5; i++) {
      const puff = new THREE.Mesh(prisonGeometry.smoke, materials.toxicSmoke);
      puff.position.set((i % 2 ? 1 : -1) * i * 0.65, i * 5.5, (i - 2) * 0.45);
      puff.scale.setScalar(4.5 + i * 1.5);
      plume.add(puff);
      puffs.push(puff);
    }
    toxicSmokeEffects.push({ root: plume, puffs, phase: seededRandom(seedBase + 331) * Math.PI * 2 });
  }

  const buildInstances = (geometry, material, transforms, castShadow) => {
    if (!transforms.length) return;
    const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
    transforms.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  buildInstances(prisonGeometry.box, materials.prisonConcrete, matrices.concrete, true);
  buildInstances(prisonGeometry.box, materials.prisonPanel, matrices.panel, false);
  buildInstances(prisonGeometry.cylinder, materials.prisonPipe, matrices.pipe, true);
  buildInstances(prisonGeometry.cylinder, materials.prisonPipeDirty, matrices.dirtyPipe, false);
  buildInstances(prisonGeometry.box, materials.facilityLightWarm, matrices.lightWarm, false);
  buildInstances(prisonGeometry.box, materials.facilityLightCool, matrices.lightCool, false);
  group.userData.landmark = "prison-sprawl-district";
  return { group, colliders };
}

function createSupplyArena() {
  const group = new THREE.Group();
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(88, 88, 0.7, 48), materials.prisonPanel);
  pad.position.y = 0.2;
  pad.receiveShadow = true;
  group.add(pad);
  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(48, 0.32, 8, 64), materials.blueGlow);
  innerRing.rotation.x = Math.PI * 0.5;
  innerRing.position.y = 0.68;
  group.add(innerRing);

  const logoCanvas = document.createElement("canvas");
  logoCanvas.width = 512;
  logoCanvas.height = 512;
  const logoContext = logoCanvas.getContext("2d");
  logoContext.translate(256, 256);
  logoContext.strokeStyle = "rgba(205, 218, 205, 0.5)";
  logoContext.fillStyle = "rgba(205, 218, 205, 0.32)";
  logoContext.lineWidth = 22;
  logoContext.lineCap = "round";
  for (const rotation of [-0.7, 0.7]) {
    logoContext.save();
    logoContext.rotate(rotation);
    logoContext.beginPath();
    logoContext.moveTo(-150, 0);
    logoContext.lineTo(150, 0);
    logoContext.stroke();
    for (const x of [-165, 165]) {
      logoContext.beginPath();
      logoContext.arc(x, -13, 20, 0, Math.PI * 2);
      logoContext.arc(x, 13, 20, 0, Math.PI * 2);
      logoContext.fill();
    }
    logoContext.restore();
  }
  logoContext.beginPath();
  logoContext.arc(0, -38, 128, Math.PI, Math.PI * 2);
  logoContext.lineTo(116, 50);
  logoContext.lineTo(62, 132);
  logoContext.lineTo(30, 100);
  logoContext.lineTo(0, 145);
  logoContext.lineTo(-30, 100);
  logoContext.lineTo(-62, 132);
  logoContext.lineTo(-116, 50);
  logoContext.closePath();
  logoContext.fill();
  logoContext.globalCompositeOperation = "destination-out";
  for (const x of [-45, 45]) {
    logoContext.beginPath();
    logoContext.arc(x, -17, 27, 0, Math.PI * 2);
    logoContext.fill();
  }
  for (let i = 0; i < 110; i++) {
    const x = (seededRandom(i * 17 + 3) - 0.5) * 380;
    const y = (seededRandom(i * 29 + 7) - 0.5) * 340;
    logoContext.fillRect(x, y, 6 + seededRandom(i * 31) * 32, 3 + seededRandom(i * 43) * 8);
  }
  const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 46),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(logoCanvas), transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide })
  );
  logo.rotation.x = -Math.PI * 0.5;
  logo.position.y = 0.75;
  group.add(logo);
  for (let i = 0; i < 16; i++) {
    const angle = i / 16 * Math.PI * 2;
    const marker = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.28, 8), i % 2 ? materials.prisonPipe : materials.pyramidTrim);
    marker.position.set(Math.cos(angle) * 79, 0.7, Math.sin(angle) * 79);
    marker.rotation.y = -angle;
    group.add(marker);
  }
  for (let i = 0; i < 6; i++) {
    const pipe = new THREE.Mesh(prisonGeometry.cylinder, i % 2 ? materials.prisonPipe : materials.prisonPipeDirty);
    pipe.position.set(-14 + i * 5.5, 3.3 + (i % 2) * 1.8, 218);
    pipe.rotation.x = Math.PI * 0.5;
    pipe.scale.set(1.15, 128, 1.15);
    group.add(pipe);
  }
  for (let z = 98; z <= 338; z += 40) {
    const cradle = new THREE.Mesh(new THREE.BoxGeometry(38, 1.4, 4), materials.prisonConcrete);
    cradle.position.set(0, 1.1, z);
    group.add(cradle);
  }
  group.userData.landmark = "central-supply-arena";
  return group;
}

function createPerimeterSmokeStack(seed) {
  const group = new THREE.Group();
  const height = 58 + seededRandom(seed) * 28;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(12, 16, 12, 16), materials.prisonConcrete);
  base.position.y = 6;
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 9, height, 18), materials.prisonPipeDirty);
  stack.position.y = 12 + height * 0.5;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(7.2, 1.1, 8, 24), materials.prisonPipe);
  rim.rotation.x = Math.PI * 0.5;
  rim.position.y = 12 + height;
  group.add(base, stack, rim);
  const plume = new THREE.Group();
  plume.position.y = 17 + height;
  group.add(plume);
  const puffs = [];
  for (let i = 0; i < 7; i++) {
    const puff = new THREE.Mesh(prisonGeometry.smoke, materials.toxicSmoke);
    puff.position.set((seededRandom(seed + i * 13) - 0.5) * 5, i * 7, (seededRandom(seed + i * 19) - 0.5) * 5);
    puff.scale.setScalar(6 + i * 1.7);
    plume.add(puff);
    puffs.push(puff);
  }
  toxicSmokeEffects.push({ root: plume, puffs, phase: seededRandom(seed + 77) * Math.PI * 2 });
  return group;
}

function createFlatPrisonCompound(terrainManager) {
  const group = new THREE.Group();
  const size = CONFIG.compoundSize;
  const half = size * 0.5;
  const concrete = new THREE.MeshStandardMaterial({
    color: 0x4b4d4c,
    metalness: 0.18,
    roughness: 0.9,
    map: architectureArmorTexture,
    bumpMap: architectureArmorTexture,
    bumpScale: 0.025
  });
  const wornSteel = new THREE.MeshStandardMaterial({
    color: 0x171c20,
    metalness: 0.86,
    roughness: 0.5,
    map: mechanicalRibTexture,
    bumpMap: tankSurfaceTexture,
    bumpScale: 0.035
  });

  const slab = new THREE.Mesh(new THREE.BoxGeometry(size, 1, size), concrete);
  slab.position.y = -0.5;
  slab.receiveShadow = true;
  group.add(slab);

  const pad = new THREE.Mesh(new THREE.CylinderGeometry(50, 50, 1, 128), wornSteel);
  pad.position.y = 0.5;
  pad.receiveShadow = true;
  group.add(pad);

  const padLightCount = Math.floor(Math.PI * 2 * 49.5);
  const padLights = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.12, 8),
    materials.facilityLightCool,
    padLightCount
  );
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < padLightCount; i++) {
    const angle = i / padLightCount * Math.PI * 2;
    matrix.makeTranslation(Math.cos(angle) * 49.5, 1.08, Math.sin(angle) * 49.5);
    padLights.setMatrixAt(i, matrix);
  }
  padLights.instanceMatrix.needsUpdate = true;
  group.add(padLights);

  const beaconGroup = new THREE.Group();
  const orbMaterial = new THREE.MeshBasicMaterial({ color: 0xff1838, transparent: true, opacity: 0.96, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const haloMaterial = new THREE.MeshBasicMaterial({ color: 0xff0828, transparent: true, opacity: 0.24, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const orb = new THREE.Mesh(new THREE.SphereGeometry(4.2, 24, 16), orbMaterial);
  orb.position.y = 145;
  const halo = new THREE.Mesh(new THREE.SphereGeometry(7.8, 18, 12), haloMaterial);
  halo.position.copy(orb.position);
  const beamMaterial = new THREE.MeshBasicMaterial({
    color: 0xff1735,
    transparent: true,
    opacity: 0.075,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 43, 140, 40, 1, true), beamMaterial);
  beam.position.y = 72;
  const spotlightTarget = new THREE.Object3D();
  spotlightTarget.position.set(0, 0, 0);
  const spotlight = new THREE.SpotLight(0xff1635, 46, 220, THREE.MathUtils.degToRad(19), 0.72, 1.45);
  spotlight.position.copy(orb.position);
  spotlight.target = spotlightTarget;
  const haze = [];
  for (let i = 0; i < 18; i++) {
    const puffMaterial = new THREE.MeshBasicMaterial({ color: i % 3 ? 0xff2342 : 0xff8797, transparent: true, opacity: 0.022 + (i % 4) * 0.007, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 7), puffMaterial);
    const phase = seededRandom(18000 + i * 37);
    const radius = 5 + phase * 29;
    const angle = seededRandom(18100 + i * 41) * Math.PI * 2;
    puff.position.set(Math.cos(angle) * radius, 8 + phase * 128, Math.sin(angle) * radius);
    puff.scale.set(5 + phase * 8, 10 + phase * 18, 5 + phase * 8);
    beaconGroup.add(puff);
    haze.push({ puff, phase, angle, radius });
  }
  beaconGroup.add(beam, orb, halo, spotlight, spotlightTarget);
  scene.add(beaconGroup);
  homeBaseBeacon = { group: beaconGroup, orb, halo, beam, spotlight, haze, time: 0 };

  const roadLines = [-150, -50, 50, 150];
  for (const line of roadLines) {
    const roadX = new THREE.Mesh(new THREE.BoxGeometry(size, 0.14, 15), materials.road);
    roadX.position.set(0, 0.08, line);
    group.add(roadX);
    const roadZ = new THREE.Mesh(new THREE.BoxGeometry(15, 0.14, size), materials.road);
    roadZ.position.set(line, 0.08, 0);
    group.add(roadZ);
  }

  const lampStemGeo = new THREE.CylinderGeometry(0.2, 0.28, 7, 8);
  const lampOrbGeo = new THREE.SphereGeometry(0.48, 10, 7);
  const lampCount = roadLines.length * roadLines.length * 4;
  const stems = new THREE.InstancedMesh(lampStemGeo, materials.darkMetal, lampCount);
  const orbs = new THREE.InstancedMesh(lampOrbGeo, materials.facilityLightWarm, lampCount);
  let lampIndex = 0;
  for (const x of roadLines) {
    for (const z of roadLines) {
      for (const [dx, dz] of [[-9, -9], [9, -9], [-9, 9], [9, 9]]) {
        matrix.makeTranslation(x + dx, 3.5, z + dz);
        stems.setMatrixAt(lampIndex, matrix);
        matrix.makeTranslation(x + dx, 7.2, z + dz);
        orbs.setMatrixAt(lampIndex, matrix);
        lampIndex++;
      }
    }
  }
  stems.instanceMatrix.needsUpdate = true;
  orbs.instanceMatrix.needsUpdate = true;
  group.add(stems, orbs);

  const supplyPerimeterOffset = half + 20;
  const bridgePerimeterOffset = supplyPerimeterOffset + 50;
  const bridgeSpan = bridgePerimeterOffset * 2;
  const addBridge = (line, alongX) => {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(alongX ? bridgeSpan : 17, 2.2, alongX ? 17 : bridgeSpan), materials.prisonConcrete);
    deck.position.set(alongX ? 0 : line, 22, alongX ? line : 0);
    deck.castShadow = true;
    deck.receiveShadow = true;
    group.add(deck);
    for (let along = -250; along <= 250; along += 50) {
      const support = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 3.3, 21, 12), materials.prisonConcrete);
      support.position.set(alongX ? along : line, 10.5, alongX ? line : along);
      group.add(support);
      terrainManager.registerDestructible(support, group, 3.5, {
        indestructible: true,
        ignoreClearZone: true,
        preciseHit: true
      });
    }
  };
  for (const side of [-1, 1]) {
    const line = bridgePerimeterOffset * side;
    addBridge(line, true);
    addBridge(line, false);
  }

  const towerPositions = [];
  const towerLines = [-200, -100, 0, 100, 200];
  const pyramidPositions = [[-100, -100], [100, -100], [-100, 100], [100, 100]];
  for (const x of towerLines) {
    for (const z of towerLines) {
      if (x === 0 && z === 0) continue;
      if (pyramidPositions.some(([px, pz]) => x === px && z === pz)) continue;
      towerPositions.push({ x, z });
    }
  }
  towerPositions.forEach(({ x, z }, index) => {
    const collider = new THREE.Mesh(new THREE.BoxGeometry(20, 50, 20), materials.collisionInvisible);
    collider.position.set(x, 25, z);
    terrainManager.registerDestructible(collider, group, 15, { indestructible: true, ignoreClearZone: true, preciseHit: true });
    group.add(collider);
  });
  loadGuardTowerModel().then(geometryParts => {
    const towerBatches = [
      [geometryParts.shell, materials.guardTowerShell, "GuardTower002Shells"],
      [geometryParts.warmWindows, materials.facilityLightWarm, "GuardTower002WarmWindows"],
      [geometryParts.coolWindows, materials.facilityLightCool, "GuardTower002CoolWindows"]
    ];
    for (const [geometry, material, name] of towerBatches) {
      const towers = new THREE.InstancedMesh(geometry, material, towerPositions.length);
      towers.name = name;
      towerPositions.forEach(({ x, z }, index) => {
        matrix.makeTranslation(x, 0, z);
        towers.setMatrixAt(index, matrix);
      });
      towers.instanceMatrix.needsUpdate = true;
      towers.castShadow = material === materials.guardTowerShell;
      towers.receiveShadow = material === materials.guardTowerShell;
      group.add(towers);
    }
  }).catch(error => console.error("Guard tower model failed to load", error));

  for (const [index, position] of pyramidPositions.entries()) {
    const pyramid = createHighTechPyramid(9100 + index);
    pyramid.userData.useChrome = true;
    pyramid.position.set(position[0], 0, position[1]);
    group.add(pyramid);
    const collider = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 38, 8), materials.collisionInvisible);
    collider.position.set(position[0], 19, position[1]);
    terrainManager.registerDestructible(collider, group, 19, { indestructible: true, ignoreClearZone: true, preciseHit: true });
    group.add(collider);
  }

  const wastelandStackOffset = bridgePerimeterOffset + 125;
  const stackPositions = [
    [-wastelandStackOffset, -210],
    [-wastelandStackOffset, 120],
    [wastelandStackOffset, -150],
    [wastelandStackOffset, 230],
    [-180, -wastelandStackOffset],
    [210, wastelandStackOffset]
  ];
  stackPositions.forEach(([x, z], index) => {
    const stack = createPerimeterSmokeStack(12000 + index);
    stack.position.set(x, 0, z);
    group.add(stack);
  });

  group.userData.landmark = "flat-prison-compound";
  return group;
}

const MAZE_WORLD_CENTER = new THREE.Vector3(5000, 0, 5000);

function createHexMazeWorld(terrainManager) {
  const world = new THREE.Group();
  world.name = "HexagonalMazeWorld";
  world.visible = false;
  const center = MAZE_WORLD_CENTER;
  const addBox = (parent, size, position, material, rotationY = 0, solid = false) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    mesh.rotation.y = rotationY;
    mesh.castShadow = material === materials.mazeShell;
    mesh.receiveShadow = true;
    parent.add(mesh);
    if (solid) terrainManager.registerDestructible(mesh, world, Math.hypot(size[0], size[2]) * 0.5, {
      indestructible: true,
      ignoreClearZone: true,
      preciseHit: true
    });
    return mesh;
  };

  const chamberFloor = new THREE.Mesh(new THREE.CylinderGeometry(94, 94, 1.2, 6), materials.mazeFloor);
  chamberFloor.position.set(center.x, -0.55, center.z);
  chamberFloor.rotation.y = Math.PI / 6;
  chamberFloor.receiveShadow = true;
  world.add(chamberFloor);
  const chamberCeiling = new THREE.Mesh(new THREE.CylinderGeometry(94, 94, 1, 6), materials.mazeShell);
  chamberCeiling.position.set(center.x, 28, center.z);
  chamberCeiling.rotation.y = Math.PI / 6;
  world.add(chamberCeiling);

  for (let side = 0; side < 6; side++) {
    const angle = side * Math.PI / 3;
    const outward = new THREE.Vector3(Math.sin(angle), 0, -Math.cos(angle));
    const tangent = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const wallCenter = center.clone().addScaledVector(outward, 82);
    for (const sign of [-1, 1]) {
      const position = wallCenter.clone().addScaledVector(tangent, sign * 42);
      addBox(world, [32, 28, 4], [position.x, 14, position.z], materials.mazeShell, angle, true);
      for (let tier = 0; tier < 3; tier++) {
        const trimPosition = position.clone().addScaledVector(outward, -2.3);
        trimPosition.y = 5 + tier * 8;
        addBox(world, [24, 0.5, 0.45], [trimPosition.x, trimPosition.y, trimPosition.z], tier === 1 ? materials.facilityLightWarm : materials.prisonPipe, angle);
      }
    }
    addBox(world, [52, 5, 5], [wallCenter.x, 25.5, wallCenter.z], materials.mazeShell, angle, true);
    const archLight = wallCenter.clone().addScaledVector(outward, -2.8);
    addBox(world, [36, 0.6, 0.5], [archLight.x, 22.2, archLight.z], side % 2 ? materials.facilityLightWarm : materials.facilityLightCool, angle);
    const arch = new THREE.Group();
    arch.position.copy(wallCenter).addScaledVector(outward, -3.1);
    arch.rotation.y = angle;
    world.add(arch);
    for (const sign of [-1, 1]) {
      addBox(arch, [2.6, 14, 2.2], [sign * 25, 8, 0], materials.prisonPipe);
      const shoulder = addBox(arch, [2.6, 10, 2.2], [sign * 21.5, 18, 0], materials.prisonPipe);
      shoulder.rotation.z = sign * -0.58;
      addBox(arch, [0.38, 12, 0.4], [sign * 23, 8, -1.25], side % 2 ? materials.facilityLightWarm : materials.facilityLightCool);
    }
    addBox(arch, [35, 2.4, 2.2], [0, 22.2, 0], materials.prisonPipe);
  }

  const routes = [
    [[0, 82], [0, 145], [42, 145], [42, 215], [-12, 215], [-12, 285]],
    [[0, 82], [0, 155], [-44, 155], [-44, 220], [18, 220], [18, 292]],
    [[0, 82], [0, 138], [48, 138], [48, 200], [8, 200], [8, 276]],
    [[0, 82], [0, 150], [-38, 150], [-38, 210], [-2, 210], [-2, 284]],
    [[0, 82], [0, 142], [40, 142], [40, 205], [-18, 205], [-18, 278]],
    [[0, 82], [0, 158], [-46, 158], [-46, 226], [10, 226], [10, 296]]
  ];
  world.userData.exitPositions = [];
  for (let routeIndex = 0; routeIndex < routes.length; routeIndex++) {
    const angle = routeIndex * Math.PI / 3;
    const routeRoot = new THREE.Group();
    routeRoot.position.copy(center);
    routeRoot.rotation.y = angle;
    world.add(routeRoot);
    const route = routes[routeIndex];
    for (let segmentIndex = 0; segmentIndex < route.length - 1; segmentIndex++) {
      const [ax, az] = route[segmentIndex];
      const [bx, bz] = route[segmentIndex + 1];
      const dx = bx - ax;
      const dz = bz - az;
      const length = Math.hypot(dx, dz);
      const segmentAngle = Math.atan2(dx, dz);
      const midX = (ax + bx) * 0.5;
      const midZ = (az + bz) * 0.5;
      addBox(routeRoot, [45, 0.8, length + 5], [midX, 0, midZ], materials.mazeFloor, segmentAngle);
      const sideX = Math.cos(segmentAngle) * 23.5;
      const sideZ = -Math.sin(segmentAngle) * 23.5;
      for (const sign of [-1, 1]) {
        addBox(routeRoot, [2.4, 25, length + 6], [midX + sideX * sign, 12.5, midZ + sideZ * sign], materials.mazeShell, segmentAngle, true);
        const lightMaterial = (routeIndex + segmentIndex + (sign > 0 ? 1 : 0)) % 3 === 0
          ? materials.facilityLightWarm
          : materials.facilityLightCool;
        addBox(routeRoot, [0.35, 0.55, Math.max(8, length - 10)], [midX + sideX * sign * 0.91, 4.2, midZ + sideZ * sign * 0.91], lightMaterial, segmentAngle);
      }
      for (let rib = 10; rib < length; rib += 16) {
        const t = rib / length - 0.5;
        addBox(routeRoot, [49, 1.3, 1.5], [midX + dx * t, 23, midZ + dz * t], routeIndex % 2 ? materials.prisonPipe : materials.prisonPipeDirty, segmentAngle);
      }
    }
    const [exitX, exitZ] = route[route.length - 1];
    const exitLocal = new THREE.Vector3(exitX, 13, exitZ).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    world.userData.exitPositions.push(center.clone().add(exitLocal));
  }

  const ambient = new THREE.HemisphereLight(0x8aa6bb, 0x09080d, 0.58);
  world.add(ambient);
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3;
    const light = new THREE.PointLight(i % 2 ? 0xff7b3b : 0x63d9ff, 5.5, 95, 2);
    light.position.set(center.x + Math.sin(angle) * 58, 16, center.z - Math.cos(angle) * 58);
    world.add(light);
  }
  world.updateMatrixWorld(true);
  for (const item of terrainManager.destructibles) {
    if (item.chunk === world) item.object.userData.refreshCollisionBounds?.();
  }
  return world;
}

class TerrainManager {
  constructor(parent) {
    this.parent = parent;
    this.chunks = new Map();
    this.destructibles = [];
    this.clearZones = [];
    this.size = CONFIG.chunkSize;
    this.radius = CONFIG.visibleChunkRadius;
    this.worldMode = "compound";
    this.compound = createFlatPrisonCompound(this);
    this.parent.add(this.compound);
    this.compoundDestructibles = [...this.destructibles];
    this.destructibles = [];
    this.mazeWorld = createHexMazeWorld(this);
    this.parent.add(this.mazeWorld);
    this.mazeDestructibles = [...this.destructibles];
    this.destructibles = [...this.compoundDestructibles];
    this.legacyWorld = new THREE.Group();
    this.legacyWorld.visible = false;
    this.legacyWorldBuilt = false;
    this.parent.add(this.legacyWorld);
  }

  reserveClearZone(x, z, radius) {
    this.clearZones.push({ x, z, radius });
  }

  overlapsClearZone(x, z, radius) {
    return this.clearZones.some(zone => Math.hypot(x - zone.x, z - zone.z) < radius + zone.radius);
  }

  update(position) {
    if (this.worldMode !== "prison") return;
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

  setWorldMode(mode) {
    if (mode === this.worldMode) return;
    this.worldMode = mode;
    skyEnvironment?.setWorldMode(mode);
    setHomeBaseBeaconWorld(mode);
    this.compound.visible = mode === "compound";
    this.legacyWorld.visible = mode === "prison";
    this.mazeWorld.visible = mode === "maze";
    if (mode === "maze") {
      for (const chunk of this.chunks.values()) {
        this.parent.remove(chunk);
        disposeObject(chunk);
      }
      this.chunks.clear();
      this.destructibles = [...this.mazeDestructibles];
      return;
    }
    if (mode === "prison") {
      this.radius = 1;
      this.destructibles = [];
      this.ensureLegacyWorld();
      return;
    }
    for (const chunk of this.chunks.values()) {
      this.parent.remove(chunk);
      disposeObject(chunk);
    }
    this.chunks.clear();
    this.radius = CONFIG.visibleChunkRadius;
    this.destructibles = [...this.compoundDestructibles];
  }

  ensureLegacyWorld() {
    if (this.legacyWorldBuilt) {
      for (const collider of this.legacyWorld.userData.colliders || []) this.registerDestructible(collider, this.legacyWorld, collider.userData.radius, { indestructible: true, ignoreClearZone: true, preciseHit: true });
      return;
    }
    this.legacyWorldBuilt = true;
    const city = createPrisonCity();
    const cityZ = -300;
    city.group.position.set(0, this.getHeightAt(0, cityZ), cityZ);
    this.legacyWorld.add(city.group);
    this.legacyWorld.userData.colliders = [];
    for (const collider of city.colliders) {
      collider.position.z += cityZ;
      this.registerDestructible(collider, this.legacyWorld, collider.userData.radius, { indestructible: true, ignoreClearZone: true, preciseHit: true });
      this.legacyWorld.add(collider);
      this.legacyWorld.userData.colliders.push(collider);
    }
    if (giantTarantulas) giantTarantulas.spawnPrisonPopulation(this.legacyWorld);
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

    this.addScenery(group, cx, cz);
    this.parent.add(group);
    this.chunks.set(key, group);
  }

  addScenery(group, cx, cz) {
    const hasDetentionBuilding = detentionBuildingSites.has(`${cx},${cz}`);
    const hasPrisonCity = !this.legacyWorldBuilt && cx === prisonCitySite.chunkX && cz === prisonCitySite.chunkZ;
    const hasPrisonSprawl = isPrisonSprawlChunk(cx, cz);
    const count = 8 + Math.floor(seededRandom(cx * 11 - cz * 29) * 8);
    for (let i = 0; i < (hasPrisonSprawl ? 0 : count); i++) {
      const seed = cx * 10000 + cz * 101 + i * 37;
      const x = (seededRandom(seed) - 0.5) * this.size * 0.9;
      const z = (seededRandom(seed + 9) - 0.5) * this.size * 0.9;
      if (hasDetentionBuilding && Math.hypot(x, z) < 42) continue;
      if (hasPrisonCity && Math.hypot(x - prisonCitySite.localX, z - prisonCitySite.localZ) < 108) continue;
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
      else if (pick < 0.83) object = seededRandom(seed + 73) < 0.5 ? createRock(seed) : createMetalWreckage(seed);
      else if (pick < 0.92) object = createMetalWreckage(seed);
      else object = createWaterfallCliff(seed);

      object.position.set(x, y, z);
      object.rotation.y = seededRandom(seed + 5) * Math.PI * 2;
      const objectRadius = 6 + seededRandom(seed + 41) * 12;
      if (this.registerDestructible(object, group, objectRadius)) group.add(object);
    }

    if (hasDetentionBuilding) {
      const building = createDetentionBlock();
      const localX = 0;
      const localZ = 0;
      const worldX = group.position.x + localX;
      const worldZ = group.position.z + localZ;
      building.position.set(localX, this.getHeightAt(worldX, worldZ), localZ);
      building.rotation.y = Math.atan2(worldX, worldZ);
      if (this.registerDestructible(building, group, 22, { indestructible: true, preciseHit: true })) group.add(building);
    }

    if (hasPrisonSprawl && !hasPrisonCity) {
      const district = createPrisonDistrict(cx, cz, this, hasDetentionBuilding || (cx === 0 && cz === 0));
      const districtGroundY = this.getHeightAt(group.position.x, group.position.z);
      district.group.position.y = districtGroundY;
      group.add(district.group);
      for (const collider of district.colliders) {
        collider.position.y += districtGroundY;
        if (this.registerDestructible(collider, group, collider.userData.radius, { indestructible: true, ignoreClearZone: true, preciseHit: true })) {
          group.add(collider);
        }
      }
    }

    if (cx === 0 && cz === 0) {
      const arena = createSupplyArena();
      arena.position.y = this.getHeightAt(0, 0) + 0.1;
      group.add(arena);
    }

    if (hasPrisonCity) {
      const city = createPrisonCity();
      const groundY = this.getHeightAt(prisonCitySite.worldX, prisonCitySite.worldZ);
      city.group.position.set(prisonCitySite.localX, groundY, prisonCitySite.localZ);
      group.add(city.group);
      for (const collider of city.colliders) {
        collider.position.x += prisonCitySite.localX;
        collider.position.y += groundY;
        collider.position.z += prisonCitySite.localZ;
        if (this.registerDestructible(collider, group, collider.userData.radius, { indestructible: true, ignoreClearZone: true, preciseHit: true })) {
          group.add(collider);
        }
      }
    }

    if (!hasPrisonSprawl && !hasDetentionBuilding && Math.abs(cx) + Math.abs(cz) > 2 && seededRandom(cx * 7 + cz * 13) > 0.93) {
      const city = createDistantCity(CONFIG.worldColors.gold);
      city.position.set(0, 2, 0);
      city.scale.setScalar(0.65 + seededRandom(cx + cz) * 0.8);
      if (this.registerDestructible(city, group, 26 * city.scale.x)) group.add(city);
    }

    if (!hasPrisonSprawl && !hasDetentionBuilding && Math.abs(cx) + Math.abs(cz) > 2 && seededRandom(cx * 53 - cz * 61) > 0.9) {
      const burningCity = createBurningDystopianCity(cx * 41 + cz * 97);
      burningCity.position.set(
        (seededRandom(cx * 23 + cz) - 0.5) * this.size * 0.45,
        2,
        (seededRandom(cx - cz * 17) - 0.5) * this.size * 0.45
      );
      burningCity.scale.setScalar(0.75 + seededRandom(cx * 5 + cz * 3) * 0.8);
      if (this.registerDestructible(burningCity, group, 30 * burningCity.scale.x)) group.add(burningCity);
    }
  }

  registerDestructible(object, chunk, radius, options = {}) {
    const position = new THREE.Vector3(
      chunk.position.x + object.position.x,
      chunk.position.y + object.position.y,
      chunk.position.z + object.position.z
    );
    if (!options.ignoreClearZone && options.solid !== false && this.overlapsClearZone(position.x, position.z, radius)) {
      disposeObject(object);
      return false;
    }
    object.userData.destructible = options.indestructible !== true;
    object.userData.collisionRadius = radius;
    const item = {
      object,
      chunk,
      radius,
      position,
      collisionBox: new THREE.Box3(),
      solid: options.solid !== false,
      indestructible: options.indestructible === true,
      preciseHit: options.preciseHit === true
    };
    object.userData.refreshCollisionBounds = () => {
      object.updateMatrixWorld(true);
      item.collisionBox.setFromObject(object);
      if (object.parent !== chunk) {
        item.collisionBox.min.add(chunk.position);
        item.collisionBox.max.add(chunk.position);
      }
      item.collisionBox.getCenter(item.position);
    };
    object.userData.refreshCollisionBounds();
    this.destructibles.push(item);
    return true;
  }

  destroyDestructible(item) {
    if (!item || item.indestructible || !item.object.parent) return false;
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
      if (item.indestructible) continue;
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

  hitDestructibleAlongSegment(start, end, radius) {
    let closest = null;
    let closestDistance = Infinity;
    for (const item of this.destructibles) {
      if (!item.object.parent) continue;
      if ((item.indestructible || item.preciseHit) && item.collisionBox) {
        const expandedBox = item.collisionBox.clone().expandByScalar(radius);
        const direction = new THREE.Vector3().subVectors(end, start);
        const segmentLength = direction.length();
        if (segmentLength > 0.0001) {
          direction.multiplyScalar(1 / segmentLength);
          const impact = new THREE.Ray(start, direction).intersectBox(expandedBox, new THREE.Vector3());
          if (impact) {
            const impactDistance = impact.distanceToSquared(start);
            if (impactDistance <= segmentLength * segmentLength && impactDistance < closestDistance) {
              closest = item;
              closestDistance = impactDistance;
            }
          }
        }
        continue;
      }
      const hitRadius = radius + item.radius;
      const distanceSq = distanceToSegmentSquared(item.position, start, end);
      if (distanceSq <= hitRadius * hitRadius && distanceSq < closestDistance) {
        closest = item;
        closestDistance = distanceSq;
      }
    }
    if (!closest) return false;
    if (closest.indestructible) {
      this.lastHitDestroyed = false;
      return true;
    }
    this.lastHitDestroyed = this.destroyDestructible(closest);
    return this.lastHitDestroyed;
  }

  resolveTankCollision(tankRef, previousPosition) {
    const tankPosition = tankRef.group.position;
    const tankHoverY = this.getHeightAt(tankPosition.x, tankPosition.z) + CONFIG.tankHoverHeight;
    const tankBottom = tankPosition.y - 0.8;
    const tankTop = tankPosition.y + 8.2;
    const segmentHitsExpandedBox = box => {
      const minX = box.min.x - CONFIG.tankCollisionRadius;
      const maxX = box.max.x + CONFIG.tankCollisionRadius;
      const minZ = box.min.z - CONFIG.tankCollisionRadius;
      const maxZ = box.max.z + CONFIG.tankCollisionRadius;
      const dx = tankPosition.x - previousPosition.x;
      const dz = tankPosition.z - previousPosition.z;
      let near = 0;
      let far = 1;
      for (const [start, delta, min, max] of [
        [previousPosition.x, dx, minX, maxX],
        [previousPosition.z, dz, minZ, maxZ]
      ]) {
        if (Math.abs(delta) < 0.0001) {
          if (start < min || start > max) return false;
          continue;
        }
        const first = (min - start) / delta;
        const second = (max - start) / delta;
        near = Math.max(near, Math.min(first, second));
        far = Math.min(far, Math.max(first, second));
        if (near > far) return false;
      }
      return far >= 0 && near <= 1;
    };
    for (const item of this.destructibles) {
      if (!item.object.parent) continue;
      if (!item.solid) continue;
      const broadphaseRadius = item.radius + CONFIG.tankCollisionRadius + 4;
      const broadphaseX = item.position.x - tankPosition.x;
      const broadphaseZ = item.position.z - tankPosition.z;
      if (broadphaseX * broadphaseX + broadphaseZ * broadphaseZ > broadphaseRadius * broadphaseRadius) continue;
      const box = item.collisionBox;
      if (!box || tankBottom > box.max.y + 0.5 || tankTop < box.min.y - 0.5) continue;
      if (segmentHitsExpandedBox(box)) {
        if (tankRef.bumpTimer <= 0) runStats.collisions++;
        tankRef.bumpTimer = Math.max(tankRef.bumpTimer, 0.28);
        const previousBottom = previousPosition.y - 0.8;
        const landingFromAbove = previousBottom >= box.max.y - 0.25 && tankBottom < box.max.y + 0.5;
        if (landingFromAbove) {
          tankPosition.y = box.max.y + 0.8;
          tankRef.verticalVelocity = Math.max(0, tankRef.verticalVelocity * -0.12);
        } else {
          const minX = box.min.x - CONFIG.tankCollisionRadius - 0.12;
          const maxX = box.max.x + CONFIG.tankCollisionRadius + 0.12;
          const minZ = box.min.z - CONFIG.tankCollisionRadius - 0.12;
          const maxZ = box.max.z + CONFIG.tankCollisionRadius + 0.12;
          const inside = (x, z) => x > minX && x < maxX && z > minZ && z < maxZ;
          const canSlideX = !inside(tankPosition.x, previousPosition.z);
          const canSlideZ = !inside(previousPosition.x, tankPosition.z);
          const moveX = Math.abs(tankPosition.x - previousPosition.x);
          const moveZ = Math.abs(tankPosition.z - previousPosition.z);
          if (canSlideX && (!canSlideZ || moveX >= moveZ)) {
            tankPosition.z = previousPosition.z;
          } else if (canSlideZ) {
            tankPosition.x = previousPosition.x;
          } else {
            const exits = [
              { distance: Math.abs(tankPosition.x - minX), axis: "x", value: minX },
              { distance: Math.abs(maxX - tankPosition.x), axis: "x", value: maxX },
              { distance: Math.abs(tankPosition.z - minZ), axis: "z", value: minZ },
              { distance: Math.abs(maxZ - tankPosition.z), axis: "z", value: maxZ }
            ].sort((a, b) => a.distance - b.distance);
            tankPosition[exits[0].axis] = exits[0].value;
          }
          tankPosition.y = Math.max(previousPosition.y, tankHoverY);
        }
        tankRef.speed *= 0.62;
        hud.status.textContent = "Hull proximity assist: sliding clear.";
        statusTimer = 2;
        return true;
      }
    }
    return false;
  }

  getHeightAt(x, z) {
    if (this.worldMode === "maze") return 0;
    if (this.worldMode === "compound") return Math.hypot(x, z) <= 50 ? 1 : 0;
    const waves = Math.sin(x * 0.018) * 2.8 + Math.cos(z * 0.021) * 2.3 + Math.sin((x + z) * 0.009) * 4.4;
    const rough = (valueNoise(x * 0.035, z * 0.035) - 0.5) * 8.5;
    const crater = Math.sin(Math.hypot(x + 130, z - 90) * 0.021) * 1.3;
    const naturalHeight = waves + rough + crater;
    const arenaBlend = THREE.MathUtils.smoothstep(Math.hypot(x, z), 82, 108);
    return THREE.MathUtils.lerp(0, naturalHeight, arenaBlend);
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

class WorldPortalManager {
  constructor(parent, terrainManager) {
    this.parent = parent;
    this.terrain = terrainManager;
    this.group = new THREE.Group();
    this.homePosition = new THREE.Vector3(-50, 15, -170);
    this.prisonPosition = new THREE.Vector3(0, 15, -560);
    this.group.position.copy(this.homePosition);
    this.terrain.reserveClearZone(this.homePosition.x, this.homePosition.z, 30);
    this.terrain.reserveClearZone(this.prisonPosition.x, this.prisonPosition.z, 36);
    this.cooldown = 0;
    this.elapsed = 0;
    const ringMaterial = new THREE.MeshStandardMaterial({ color: 0x87949b, metalness: 0.96, roughness: 0.2, emissive: 0x102b35, emissiveIntensity: 0.8 });
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(13, 2.1, 18, 72), ringMaterial);
    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(10.8, 0.45, 10, 64), materials.facilityLightCool);
    this.energyMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: { time: { value: 0 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
      fragmentShader: "varying vec2 vUv; uniform float time; void main(){ vec2 p=vUv-0.5; float r=length(p); float a=atan(p.y,p.x); float flow=sin(a*7.0-r*42.0+time*4.4)+sin(a*3.0+r*28.0-time*2.7); float edge=smoothstep(0.5,0.39,r); float core=0.48+0.25*flow; vec3 color=mix(vec3(0.03,0.35,0.62),vec3(0.55,0.95,1.0),core); gl_FragColor=vec4(color,edge*(0.72+core*0.24)); }"
    });
    this.energy = new THREE.Mesh(new THREE.CircleGeometry(10.65, 72), this.energyMaterial);
    const directionRing = new THREE.Mesh(
      new THREE.TorusGeometry(11.55, 0.24, 10, 72),
      new THREE.MeshBasicMaterial({ color: 0xff1738, transparent: true, opacity: 0.96, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
    );
    directionRing.position.z = 2.55;
    this.directionRing = directionRing;
    this.group.add(this.ring, innerRing, this.energy, directionRing);
    for (let i = 0; i < 24; i++) {
      const angle = i / 24 * Math.PI * 2;
      const node = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), materials.facilityLightCool);
      node.position.set(Math.cos(angle) * 13, Math.sin(angle) * 13, 0.35);
      this.group.add(node);
    }
    this.parent.add(this.group);
  }

  update(delta, tankRef) {
    this.elapsed += delta;
    this.cooldown = Math.max(0, this.cooldown - delta);
    this.energyMaterial.uniforms.time.value = this.elapsed;
    this.ring.rotation.z = Math.sin(this.elapsed * 0.35) * 0.025;
    const directionPulse = 0.5 + Math.sin(this.elapsed * 3.4) * 0.5;
    this.directionRing.material.opacity = 0.68 + directionPulse * 0.32;
    this.directionRing.scale.setScalar(1 + directionPulse * 0.025);
    const local = tankRef.group.position.clone().sub(this.group.position);
    const insideAperture = Math.hypot(local.x, local.y) < 9.8 && Math.abs(local.z) < 4.5;
    if (!insideAperture || this.cooldown > 0) return;
    const enteringPrison = this.terrain.worldMode === "compound";
    this.terrain.setWorldMode(enteringPrison ? "prison" : "compound");
    const portalPosition = enteringPrison ? this.prisonPosition : this.homePosition;
    this.group.position.copy(portalPosition);
    this.group.position.y = this.terrain.getHeightAt(portalPosition.x, portalPosition.z) + 15;
    tankRef.group.position.set(this.group.position.x, tankRef.group.position.y, this.group.position.z + 24);
    tankRef.group.rotation.y = 0;
    tankRef.group.position.y = this.terrain.getHeightAt(tankRef.group.position.x, tankRef.group.position.z) + CONFIG.tankHoverHeight;
    tankRef.altitudeHoldY = tankRef.group.position.y;
    tacticalGrid.cellX = Infinity;
    tacticalGrid.cellZ = Infinity;
    this.cooldown = 3;
    terrain.update(tankRef.group.position);
    const compoundVisible = !enteringPrison;
    for (const tower of [...refuelTowers.towers, ...missileTowers.towers]) tower.group.visible = compoundVisible;
    hud.status.textContent = enteringPrison ? "Dimensional transit complete. Archived prison city acquired." : "Home compound restored. Helipad approach authorized.";
    statusTimer = 5;
  }
}

class PurpleMazePortalManager {
  constructor(parent, terrainManager) {
    this.parent = parent;
    this.terrain = terrainManager;
    this.elapsed = 0;
    this.cooldown = 0;
    this.returnWorld = "compound";
    this.previousTankPosition = null;
    this.energyMaterials = [];
    this.entryPosition = new THREE.Vector3(170, 13, -170);
    this.terrain.reserveClearZone(this.entryPosition.x, this.entryPosition.z, 30);
    this.entryPortal = this.createPortal();
    this.entryPortal.position.copy(this.entryPosition);
    this.parent.add(this.entryPortal);
    this.mazePortals = [];
    const arrival = this.createPortal();
    arrival.position.set(MAZE_WORLD_CENTER.x, 13, MAZE_WORLD_CENTER.z + 48);
    arrival.rotation.y = Math.PI;
    this.parent.add(arrival);
    this.mazePortals.push(arrival);
    for (const position of this.terrain.mazeWorld.userData.exitPositions) {
      const portal = this.createPortal();
      portal.position.copy(position);
      portal.position.y = 13;
      portal.lookAt(MAZE_WORLD_CENTER.x, position.y, MAZE_WORLD_CENTER.z);
      this.parent.add(portal);
      this.mazePortals.push(portal);
    }
    this.updateVisibility();
  }

  createPortal() {
    const group = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(11.5, 1.8, 16, 64),
      new THREE.MeshStandardMaterial({ color: 0x706b78, metalness: 0.96, roughness: 0.18, emissive: 0x44155b, emissiveIntensity: 1.15 })
    );
    const energyMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: { time: { value: 0 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
      fragmentShader: "varying vec2 vUv; uniform float time; void main(){ vec2 p=vUv-0.5; float r=length(p); float a=atan(p.y,p.x); float flow=sin(a*8.0-r*48.0+time*5.0)+sin(a*3.0+r*31.0-time*3.2); float edge=smoothstep(0.5,0.38,r); float pulse=0.58+0.22*sin(time*2.3+r*35.0); vec3 c=mix(vec3(0.24,0.01,0.42),vec3(0.92,0.28,1.0),0.52+flow*0.18); gl_FragColor=vec4(c,edge*(pulse+0.22)); }"
    });
    const energy = new THREE.Mesh(new THREE.CircleGeometry(9.8, 64), energyMaterial);
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(10.1, 0.32, 10, 64),
      new THREE.MeshBasicMaterial({ color: 0xd33cff, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false })
    );
    const light = new THREE.PointLight(0xc52cff, 8, 70, 2);
    light.position.z = 3;
    group.add(ring, energy, halo, light);
    this.energyMaterials.push(energyMaterial);
    return group;
  }

  setCockpitOverride(enabled) {
    mazeCockpitActive = enabled;
    const cockpitVisible = enabled || gameMode === "cockpit";
    document.body.classList.toggle("cockpit-mode", cockpitVisible);
    cockpitOverlay.hidden = !cockpitVisible;
    cockpitWeaponRig.visible = cockpitVisible;
    tank.setCockpitVisibility(cockpitVisible);
  }

  updateVisibility() {
    const inMaze = this.terrain.worldMode === "maze";
    this.entryPortal.visible = !inMaze && this.terrain.worldMode === "compound";
    for (const portal of this.mazePortals) portal.visible = inMaze;
  }

  crossesPortal(portal, previousPosition, currentPosition) {
    portal.updateMatrixWorld(true);
    const previous = portal.worldToLocal(previousPosition.clone());
    const current = portal.worldToLocal(currentPosition.clone());
    if (Math.hypot(current.x, current.y) < 10.2 && Math.abs(current.z) < 7.5) return true;
    const denominator = previous.z - current.z;
    if (Math.abs(denominator) < 0.0001 || previous.z * current.z > 0) return false;
    const along = THREE.MathUtils.clamp(previous.z / denominator, 0, 1);
    const crossingX = THREE.MathUtils.lerp(previous.x, current.x, along);
    const crossingY = THREE.MathUtils.lerp(previous.y, current.y, along);
    return Math.hypot(crossingX, crossingY) < 10.2;
  }

  update(delta, tankRef) {
    this.elapsed += delta;
    this.cooldown = Math.max(0, this.cooldown - delta);
    for (const material of this.energyMaterials) material.uniforms.time.value = this.elapsed;
    this.updateVisibility();
    const currentPosition = tankRef.group.position.clone();
    const previousPosition = this.previousTankPosition || currentPosition;
    this.previousTankPosition = currentPosition;
    if (this.cooldown > 0) return;
    if (this.terrain.worldMode !== "maze" && this.entryPortal.visible && this.crossesPortal(this.entryPortal, previousPosition, currentPosition)) {
      this.returnWorld = this.terrain.worldMode;
      this.terrain.setWorldMode("maze");
      this.setCockpitOverride(true);
      tankRef.group.position.set(MAZE_WORLD_CENTER.x, CONFIG.tankHoverHeight, MAZE_WORLD_CENTER.z + 18);
      tankRef.group.rotation.y = 0;
      tankRef.speed = 0;
      tankRef.altitudeHoldY = tankRef.group.position.y;
      this.previousTankPosition = tankRef.group.position.clone();
      this.cooldown = 3;
      tacticalGrid.cellX = Infinity;
      tacticalGrid.cellZ = Infinity;
      hud.status.textContent = "Purple transit complete. Six maze routes acquired.";
      statusTimer = 5;
      return;
    }
    if (this.terrain.worldMode === "maze") {
      const exit = this.mazePortals.find(portal => this.crossesPortal(portal, previousPosition, currentPosition));
      if (!exit) return;
      this.terrain.setWorldMode(this.returnWorld);
      this.setCockpitOverride(false);
      tankRef.group.position.set(this.entryPosition.x, CONFIG.tankHoverHeight, this.entryPosition.z + 25);
      tankRef.group.rotation.y = 0;
      tankRef.speed = 0;
      tankRef.altitudeHoldY = tankRef.group.position.y;
      this.previousTankPosition = tankRef.group.position.clone();
      this.cooldown = 3;
      hud.status.textContent = "Maze transit complete. Outdoor mission restored.";
      statusTimer = 5;
    }
  }
}

class TacticalGrid {
  constructor(parent, terrainManager) {
    this.parent = parent;
    this.terrain = terrainManager;
    this.spacing = 25;
    this.radius = 350;
    this.enabled = true;
    this.cellX = Infinity;
    this.cellZ = Infinity;
    this.sweepRadius = 0;
    this.predictionTimer = 0;
    this.material = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.34, depthWrite: false, blending: THREE.AdditiveBlending });
    this.lines = new THREE.LineSegments(new THREE.BufferGeometry(), this.material);
    this.lines.renderOrder = 2;
    this.parent.add(this.lines);
    this.sweep = new THREE.LineLoop(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0x72ff9d, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    this.sweep.renderOrder = 3;
    this.parent.add(this.sweep);
    this.impactMarker = new THREE.LineLoop(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0xb5ff4b, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    this.impactMarker.renderOrder = 4;
    this.parent.add(this.impactMarker);
    this.cannonImpactMarker = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0xff3535, transparent: true, opacity: 1, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending })
    );
    this.cannonImpactMarker.renderOrder = 5;
    this.parent.add(this.cannonImpactMarker);
  }

  toggle() {
    this.enabled = !this.enabled;
    this.lines.visible = this.enabled;
    this.sweep.visible = this.enabled;
    this.impactMarker.visible = this.enabled;
    this.cannonImpactMarker.visible = this.enabled;
    hud.status.textContent = this.enabled ? "Tactical terrain grid online." : "Tactical terrain grid hidden.";
    statusTimer = 2.8;
  }

  update(delta, tankRef) {
    if (!this.enabled) return;
    const cellX = Math.round(tankRef.group.position.x / this.spacing);
    const cellZ = Math.round(tankRef.group.position.z / this.spacing);
    if (cellX !== this.cellX || cellZ !== this.cellZ) {
      this.cellX = cellX;
      this.cellZ = cellZ;
      this.rebuildGrid(cellX * this.spacing, cellZ * this.spacing);
    }
    this.sweepRadius = (this.sweepRadius + delta * 95) % this.radius;
    this.updateRing(this.sweep, tankRef.group.position.x, tankRef.group.position.z, this.sweepRadius, 0.68);
    this.sweep.material.opacity = 0.3 + 0.4 * (1 - this.sweepRadius / this.radius);
    this.predictionTimer -= delta;
    if (this.predictionTimer <= 0) {
      this.predictionTimer = 0.12;
      const impact = this.predictMissileImpact(tankRef);
      this.impactMarker.visible = Boolean(impact && tankRef.getMissileCount() > 0);
      if (impact) this.updateRing(this.impactMarker, impact.x, impact.z, 6.5, 0.82);
      const cannonImpact = this.predictCannonImpact(tankRef);
      this.cannonImpactMarker.visible = Boolean(cannonImpact);
      if (cannonImpact) this.updateCannonMarker(cannonImpact);
    }
  }

  rebuildGrid(centerX, centerZ) {
    const positions = [];
    const colors = [];
    const green = new THREE.Color(0x42ff83);
    const steps = Math.floor(this.radius / this.spacing);
    const addSegment = (x1, z1, x2, z2) => {
      const distance = Math.max(Math.hypot(x1 - centerX, z1 - centerZ), Math.hypot(x2 - centerX, z2 - centerZ));
      const fade = Math.max(0.06, 1 - distance / (this.radius * 1.08));
      positions.push(x1, this.terrain.getHeightAt(x1, z1) + 0.48, z1, x2, this.terrain.getHeightAt(x2, z2) + 0.48, z2);
      colors.push(green.r * fade, green.g * fade, green.b * fade, green.r * fade, green.g * fade, green.b * fade);
    };
    for (let line = -steps; line <= steps; line++) {
      const fixed = line * this.spacing;
      for (let segment = -steps; segment < steps; segment++) {
        const start = segment * this.spacing;
        const end = start + this.spacing;
        addSegment(centerX + fixed, centerZ + start, centerX + fixed, centerZ + end);
        addSegment(centerX + start, centerZ + fixed, centerX + end, centerZ + fixed);
      }
    }
    this.lines.geometry.dispose();
    this.lines.geometry = new THREE.BufferGeometry();
    this.lines.geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    this.lines.geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  }

  updateRing(line, centerX, centerZ, radius, lift) {
    const points = [];
    for (let i = 0; i < 72; i++) {
      const angle = i / 72 * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const z = centerZ + Math.sin(angle) * radius;
      points.push(new THREE.Vector3(x, this.terrain.getHeightAt(x, z) + lift, z));
    }
    line.geometry.dispose();
    line.geometry = new THREE.BufferGeometry().setFromPoints(points);
  }

  updateCannonMarker(impact) {
    const points = [];
    const towardCamera = new THREE.Vector2(impact.x - camera.position.x, impact.z - camera.position.z);
    if (towardCamera.lengthSq() < 0.001) towardCamera.set(0, 1);
    towardCamera.normalize();
    const right = new THREE.Vector2(towardCamera.y, -towardCamera.x);
    const scale = 7.2;
    const worldPoint = ([x, y]) => {
      const worldX = impact.x + (right.x * x + towardCamera.x * y) * scale;
      const worldZ = impact.z + (right.y * x + towardCamera.y * y) * scale;
      return new THREE.Vector3(worldX, this.terrain.getHeightAt(worldX, worldZ) + 1.35, worldZ);
    };
    const addPath = (path, closed = false) => {
      const end = closed ? path.length : path.length - 1;
      for (let i = 0; i < end; i++) {
        points.push(worldPoint(path[i]), worldPoint(path[(i + 1) % path.length]));
      }
    };
    const addCircle = (x, y, radius, segments = 14) => {
      const path = [];
      for (let i = 0; i < segments; i++) {
        const angle = i / segments * Math.PI * 2;
        path.push([x + Math.cos(angle) * radius, y + Math.sin(angle) * radius]);
      }
      addPath(path, true);
    };

    const skull = [];
    for (let i = 0; i <= 18; i++) {
      const angle = Math.PI - i / 18 * Math.PI;
      skull.push([Math.cos(angle) * 0.55, 0.14 + Math.sin(angle) * 0.55]);
    }
    skull.push([0.5, -0.2], [0.32, -0.32], [0.28, -0.72], [0.14, -0.56], [0, -0.82], [-0.14, -0.56], [-0.28, -0.72], [-0.32, -0.32], [-0.5, -0.2]);
    addPath(skull, true);
    addCircle(-0.22, 0.02, 0.12);
    addCircle(0.22, 0.02, 0.12);
    addPath([[-0.09, -0.2], [0, -0.38], [0.09, -0.2]], true);

    const boneStubs = [
      [[-1.02, 0.62], [-0.48, 0.28]], [[0.48, -0.28], [1.02, -0.62]],
      [[-1.02, -0.62], [-0.48, -0.28]], [[0.48, 0.28], [1.02, 0.62]]
    ];
    for (const stub of boneStubs) addPath(stub);
    const boneEnds = [[-1.02, 0.62, -0.05, 0.09], [1.02, -0.62, 0.05, -0.09], [-1.02, -0.62, -0.05, -0.09], [1.02, 0.62, 0.05, 0.09]];
    for (const [x, y, dx, dy] of boneEnds) {
      addCircle(x + dx, y + dy, 0.09, 10);
      addCircle(x - dx, y - dy, 0.09, 10);
    }

    this.cannonImpactMarker.geometry.dispose();
    this.cannonImpactMarker.geometry = new THREE.BufferGeometry().setFromPoints(points);
  }

  predictMissileImpact(tankRef) {
    tankRef.group.updateMatrixWorld(true);
    const position = tankRef.missileRack.localToWorld(new THREE.Vector3(0, 0, -1.4));
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(tankRef.missileRack.getWorldQuaternion(new THREE.Quaternion())).normalize();
    const ratio = (missileRange - 1) / 99;
    let burn = THREE.MathUtils.lerp(0.28, 2.7, ratio);
    const thrust = THREE.MathUtils.lerp(28, 44, ratio);
    const velocity = direction.clone().multiplyScalar(THREE.MathUtils.lerp(46, 64, ratio));
    const point = position.clone();
    const dt = 0.06;
    for (let elapsed = 0; elapsed < 9; elapsed += dt) {
      const powered = burn > 0;
      if (powered) {
        velocity.addScaledVector(direction, thrust * dt);
        burn = Math.max(0, burn - dt);
      }
      velocity.y -= (powered ? 6.5 : 23) * dt;
      velocity.multiplyScalar(Math.exp(-(powered ? 0.025 : 0.13) * dt));
      direction.copy(velocity).normalize();
      point.addScaledVector(velocity, dt);
      if (point.y <= this.terrain.getHeightAt(point.x, point.z) + 0.7) return point;
    }
    return point;
  }

  predictCannonImpact(tankRef) {
    tankRef.group.updateMatrixWorld(true);
    const point = tankRef.getMuzzleWorldPosition();
    const velocity = tankRef.getTurretWorldDirection().multiplyScalar(118);
    const dt = 0.04;
    const maxSightTime = 180 / 118;
    for (let elapsed = 0; elapsed < maxSightTime; elapsed += dt) {
      velocity.y -= CONFIG.cannonGravity * dt;
      point.addScaledVector(velocity, dt);
      if (point.y <= this.terrain.getHeightAt(point.x, point.z) + CONFIG.projectileRadius * 0.4) return point;
    }
    point.y = this.terrain.getHeightAt(point.x, point.z) + CONFIG.projectileRadius * 0.4;
    return point;
  }
}

class AutopilotManager {
  constructor() {
    this.enabled = false;
    this.phase = "low";
    this.phaseTimer = 0;
    this.headingTimer = 0;
    this.desiredHeading = 0;
    this.cruiseAltitude = null;
    this.updateHUD();
  }

  toggle() {
    if (this.enabled) this.disengage(false);
    else this.engage();
  }

  engage() {
    this.enabled = true;
    this.phase = "low";
    this.phaseTimer = 18;
    this.headingTimer = 0;
    this.desiredHeading = tank.group.rotation.y;
    this.cruiseAltitude = tank.group.position.y;
    this.updateHUD();
    hud.status.textContent = "Autopilot engaged. You have the guns.";
    statusTimer = 4;
    audio.speakComms("Autopilot engaged. You have the guns.", true);
  }

  disengage(manualOverride) {
    if (!this.enabled) return;
    this.enabled = false;
    tank.altitudeHoldY = null;
    this.cruiseAltitude = null;
    this.updateHUD();
    const message = manualOverride ? "Returning flight control to you." : "Autopilot disengaged.";
    hud.status.textContent = message;
    statusTimer = 3;
    audio.speakComms(message, true);
  }

  switchPhase() {
    if (!this.enabled) return;
    this.phase = this.phase === "low" ? "high" : "low";
    this.phaseTimer = this.phase === "low" ? 18 : 22;
    this.announcePhase();
  }

  announcePhase() {
    this.updateHUD();
    const message = this.phase === "low" ? "Preparing to go low, Captain." : "Taking us higher for a better view.";
    hud.status.textContent = message;
    statusTimer = 3.5;
    audio.speakComms(message, true);
  }

  updateHUD() {
    hud.autopilotStatus.textContent = this.enabled ? this.phase.toUpperCase() : "OFF";
    hud.autopilotStatus.style.color = this.enabled ? "#73ffad" : "#f5e9d1";
  }

  update(delta, tankRef, terrainManager, playerInput) {
    const controls = { ...playerInput };
    if (!this.enabled) return controls;

    this.phaseTimer -= delta;
    this.headingTimer -= delta;
    if (this.phaseTimer <= 0) this.switchPhase();
    if (this.headingTimer <= 0) {
      this.headingTimer = 7 + Math.random() * 5;
      this.desiredHeading = wrapAngle(this.desiredHeading + (Math.random() - 0.5) * 1.15);
    }

    const forward = new THREE.Vector3(-Math.sin(this.desiredHeading), 0, -Math.cos(this.desiredHeading));
    const aheadX = tankRef.group.position.x + forward.x * 52;
    const aheadZ = tankRef.group.position.z + forward.z * 52;
    const currentGround = terrainManager.getHeightAt(tankRef.group.position.x, tankRef.group.position.z);
    if (terrainManager.getHeightAt(aheadX, aheadZ) > currentGround + 8) {
      const leftHeading = this.desiredHeading + 0.62;
      const rightHeading = this.desiredHeading - 0.62;
      const leftHeight = terrainManager.getHeightAt(tankRef.group.position.x - Math.sin(leftHeading) * 55, tankRef.group.position.z - Math.cos(leftHeading) * 55);
      const rightHeight = terrainManager.getHeightAt(tankRef.group.position.x - Math.sin(rightHeading) * 55, tankRef.group.position.z - Math.cos(rightHeading) * 55);
      this.desiredHeading = wrapAngle(leftHeight <= rightHeight ? leftHeading : rightHeading);
      audio.speakComms("Terrain rising. Adjusting course.");
    }

    for (const item of terrainManager.destructibles) {
      if (!item.object.parent || !item.solid) continue;
      const dx = item.position.x - tankRef.group.position.x;
      const dz = item.position.z - tankRef.group.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance > item.radius + 48 || distance < 0.001) continue;
      const alignment = (dx * forward.x + dz * forward.z) / distance;
      if (alignment > 0.6) {
        const side = forward.x * dz - forward.z * dx;
        this.desiredHeading = wrapAngle(this.desiredHeading + (side > 0 ? -0.82 : 0.82));
        this.headingTimer = 4;
        break;
      }
    }

    const yawError = wrapAngle(this.desiredHeading - tankRef.group.rotation.y);
    controls.Autopilot = true;
    controls.ArrowUp = true;
    controls.ArrowDown = false;
    if (!controls.KeyY && !(controls.ShiftLeft || controls.ShiftRight)) {
      controls.ArrowLeft = yawError > 0.12;
      controls.ArrowRight = yawError < -0.12;
    }
    const clearance = this.phase === "low" ? 8 : 34;
    const targetAltitude = terrainManager.getHeightAt(tankRef.group.position.x, tankRef.group.position.z) + clearance;
    const altitudeBlend = 1 - Math.exp(-delta * 0.7);
    this.cruiseAltitude = THREE.MathUtils.lerp(this.cruiseAltitude ?? tankRef.group.position.y, targetAltitude, altitudeBlend);
    tankRef.altitudeHoldY = this.cruiseAltitude;
    return controls;
  }
}

class EnemyManager {
  constructor(parent) {
    this.parent = parent;
    this.enemies = [];
    this.timer = 3;
    this.enemyTank = null;
    this.enemyTankRespawn = 2.5;
    this.patrolTanks = [];
    this.patrolsSpawned = false;
    this.patrolSpawnIndex = 0;
    this.patrolSpawnTimer = 0.75;
    this.hostileShots = [];
    this.escortDrones = [];
    this.rearAlertCooldown = 0;
  }

  update(delta, tankRef) {
    if (gameEnded) return;
    if (!this.patrolsSpawned) {
      this.patrolSpawnTimer -= delta;
      if (this.patrolSpawnTimer <= 0) {
        this.spawnNextPatrolTank();
        this.patrolSpawnTimer = 0.75;
      }
    }
    if (!this.enemyTank) {
      this.enemyTankRespawn -= delta;
      if (this.enemyTankRespawn <= 0) this.spawnEnemyTank(tankRef);
    } else {
      this.enemyTank.update(delta, tankRef, this);
      if (this.enemyTank.dead) {
        for (const escort of this.escortDrones) {
          this.parent.remove(escort.group);
          disposeObject(escort.group);
        }
        this.escortDrones.length = 0;
        this.parent.remove(this.enemyTank.group);
        disposeObject(this.enemyTank.group);
        this.enemyTank = null;
        this.enemyTankRespawn = 7;
      }
    }
    for (let i = this.patrolTanks.length - 1; i >= 0; i--) {
      const patrol = this.patrolTanks[i];
      patrol.update(delta, tankRef, this);
      if (patrol.dead) {
        this.parent.remove(patrol.group);
        disposeObject(patrol.group);
        this.patrolTanks.splice(i, 1);
      }
    }
    for (let i = this.escortDrones.length - 1; i >= 0; i--) {
      const escort = this.escortDrones[i];
      escort.update(delta, tankRef, this.enemyTank, this);
      if (escort.dead) {
        this.parent.remove(escort.group);
        disposeObject(escort.group);
        this.escortDrones.splice(i, 1);
      }
    }
    this.updateHostileShots(delta, tankRef);
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

  spawnEnemyTank(tankRef) {
    const angle = tankRef.group.rotation.y + Math.PI + (Math.random() - 0.5) * 1.4;
    const distance = 120 + Math.random() * 55;
    this.enemyTank = new GroundEnemyTank(null, 0, Math.random() < 0.28);
    this.enemyTank.group.position.set(
      tankRef.group.position.x + Math.sin(angle) * distance,
      0,
      tankRef.group.position.z + Math.cos(angle) * distance
    );
    this.enemyTank.group.position.y = terrain.getHeightAt(this.enemyTank.group.position.x, this.enemyTank.group.position.z) + 1.2;
    this.parent.add(this.enemyTank.group);
    const escortCorners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    for (let i = 0; i < CONFIG.escortDroneCount; i++) {
      const escort = new EscortDrone(i, escortCorners[i]);
      escort.group.position.copy(this.enemyTank.group.position).add(new THREE.Vector3(escortCorners[i][0] * 10, 8, escortCorners[i][1] * 11));
      this.parent.add(escort.group);
      this.escortDrones.push(escort);
    }
    hud.status.textContent = "Enemy armor detected on the ground.";
    statusTimer = 4;
  }

  spawnNextPatrolTank() {
    const i = this.patrolSpawnIndex++;
    const vertical = i % 2 === 0;
    const roadLines = [-150, -50, 50, 150];
    const lane = roadLines[Math.floor(i * 0.5) % roadLines.length];
    const path = vertical
      ? [new THREE.Vector3(lane, 0, -210), new THREE.Vector3(lane, 0, 210)]
      : [new THREE.Vector3(-210, 0, lane), new THREE.Vector3(210, 0, lane)];
    const patrol = new GroundEnemyTank(path, i, i % 5 === 3);
    patrol.group.position.copy(path[i % 2]);
    patrol.group.position.y = terrain.getHeightAt(patrol.group.position.x, patrol.group.position.z) + 1.2;
    this.parent.add(patrol.group);
    this.patrolTanks.push(patrol);
    this.patrolsSpawned = this.patrolSpawnIndex >= CONFIG.prisonPatrolTankCount;
  }

  getGroundTanks() {
    return [this.enemyTank, ...this.patrolTanks].filter(enemyTank => enemyTank && !enemyTank.dead);
  }

  fireEnemyShell(position, direction) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.46, 10, 7),
      new THREE.MeshBasicMaterial({ color: 0xff2738 })
    );
    mesh.position.copy(position);
    this.parent.add(mesh);
    this.hostileShots.push({ mesh, velocity: direction.multiplyScalar(CONFIG.enemyTankProjectileSpeed), life: 5, damage: CONFIG.enemyTankDamage, radius: 0.8 });
    audio.playEnemyFire();
  }

  fireEscortShot(position, direction) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0x85f6ff })
    );
    mesh.position.copy(position);
    this.parent.add(mesh);
    this.hostileShots.push({ mesh, velocity: direction.multiplyScalar(CONFIG.escortDroneProjectileSpeed), life: 4, damage: CONFIG.escortDroneDamage, radius: 0.35 });
    audio.playDroneFire();
  }

  firePrisonerShot(position, direction) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 7, 5),
      new THREE.MeshBasicMaterial({ color: 0xffb13b })
    );
    mesh.position.copy(position);
    this.parent.add(mesh);
    this.hostileShots.push({ mesh, velocity: direction.multiplyScalar(48), life: 6, damage: 2, radius: 0.3 });
    audio.playEnemyFire();
  }

  fireSpiderShot(position, direction) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 10, 7),
      new THREE.MeshBasicMaterial({ color: 0xff234f })
    );
    mesh.position.copy(position);
    this.parent.add(mesh);
    this.hostileShots.push({ mesh, velocity: direction.multiplyScalar(72), life: 5, damage: CONFIG.giantTarantulaDamage, radius: 0.65 });
    audio.playEnemyFire();
  }

  updateHostileShots(delta, tankRef) {
    this.rearAlertCooldown = Math.max(0, this.rearAlertCooldown - delta);
    for (let i = this.hostileShots.length - 1; i >= 0; i--) {
      const shell = this.hostileShots[i];
      shell.life -= delta;
      shell.mesh.position.addScaledVector(shell.velocity, delta);
      if (gameMode === "cockpit" && shell.life > 0 && this.rearAlertCooldown <= 0) {
        const toShell = shell.mesh.position.clone().sub(tankRef.group.position);
        const distance = toShell.length();
        if (distance > 8 && distance < 135) {
          const forward = new THREE.Vector3(-Math.sin(tankRef.group.rotation.y), 0, -Math.cos(tankRef.group.rotation.y));
          const behind = toShell.dot(forward) < -distance * 0.28;
          const approaching = shell.velocity.dot(toShell.clone().negate().normalize()) > 12;
          if (behind && approaching) {
            this.rearAlertCooldown = 7;
            triggerCockpitRedAlert();
          }
        }
      }
      const ground = terrain.getHeightAt(shell.mesh.position.x, shell.mesh.position.z);
      if (shell.mesh.position.y <= ground + 0.35) shell.life = -1;
      if (shell.life > 0 && shell.mesh.position.distanceTo(tankRef.group.position) <= CONFIG.tankCollisionRadius + shell.radius) {
        damagePlayer(shell.damage);
        createExplosion(shell.mesh.position, { radius: shell.damage > 2 ? 0.7 : 0.35, growth: 11, life: 0.32, color: shell.damage > 2 ? 0xff2418 : 0x63efff, coreColor: 0xfff1d0 });
        shell.life = -1;
      }
      if (shell.life > 0 && wingmen) {
        for (const wingman of wingmen.units) {
          if (!wingman.dead && shell.mesh.position.distanceTo(wingman.group.position) <= wingman.collisionRadius + shell.radius) {
            wingman.receiveDamage(shell.damage);
            createExplosion(shell.mesh.position, { radius: 0.45, growth: 10, life: 0.3, color: 0xff4428, coreColor: 0xfff1d0 });
            shell.life = -1;
            break;
          }
        }
      }
      if (shell.life <= 0) {
        this.parent.remove(shell.mesh);
        disposeObject(shell.mesh);
        this.hostileShots.splice(i, 1);
      }
    }
  }
}

class PrisonEscapeManager {
  constructor(parent, enemyManager) {
    this.parent = parent;
    this.enemyManager = enemyManager;
    this.prisoners = [];
    this.breachPosition = new THREE.Vector3(-200, 0, -200);
    for (let i = 0; i < CONFIG.prisonEscapeeCount; i++) this.spawn(i);
  }

  getEscapeRoute(index) {
    if (index < 10) {
      return {
        origin: new THREE.Vector3(this.breachPosition.x + (index % 3 - 1) * 3.2, 0, this.breachPosition.z - Math.floor(index / 3) * 6),
        direction: new THREE.Vector3(0, 0, 1)
      };
    }
    const vertical = index % 2 === 0;
    const roadLines = [-150, -50, 50, 150];
    const lane = roadLines[index % roadLines.length];
    const along = -205 + (Math.floor(index / roadLines.length) % 5) * 95;
    const directionSign = index % 4 < 2 ? 1 : -1;
    return {
      origin: vertical ? new THREE.Vector3(lane, 0, along) : new THREE.Vector3(along, 0, lane),
      direction: vertical ? new THREE.Vector3(0, 0, directionSign) : new THREE.Vector3(directionSign, 0, 0)
    };
  }

  spawn(index) {
    const group = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.9, 0.7), materials.prisonerUniform);
    torso.position.y = 2.65;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.46, 10, 7), materials.prisonerSkin);
    head.position.y = 4.05;
    group.add(torso, head);
    for (const x of [-0.34, 0.34]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.8, 0.38), materials.prisonerUniform);
      leg.position.set(x, 0.9, 0);
      group.add(leg);
    }
    const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 2.25), materials.darkMetal);
    rifle.position.set(0.62, 2.75, -0.75);
    rifle.rotation.x = -0.08;
    group.add(rifle);
    const route = this.getEscapeRoute(index);
    group.position.copy(route.origin);
    group.position.y = terrain.getHeightAt(group.position.x, group.position.z);
    this.parent.add(group);
    this.prisoners.push({ group, rifle, index, origin: route.origin, direction: route.direction, speed: 1.8 + (index % 4) * 0.28, fireTimer: 3 + index * 0.63, stride: index * 0.8, dead: false, respawnTimer: 0 });
  }

  update(delta, tankRef) {
    for (const prisoner of this.prisoners) {
      if (prisoner.dead) {
        prisoner.respawnTimer -= delta;
        if (prisoner.respawnTimer <= 0) this.resetPrisoner(prisoner);
        continue;
      }
      const { group } = prisoner;
      group.position.addScaledVector(prisoner.direction, prisoner.speed * delta);
      const side = new THREE.Vector3(-prisoner.direction.z, 0, prisoner.direction.x);
      group.position.addScaledVector(side, Math.sin(performance.now() * 0.0016 + prisoner.stride) * delta * 0.45);
      if (group.position.distanceToSquared(prisoner.origin) > 420 * 420) group.position.copy(prisoner.origin);
      group.position.y = terrain.getHeightAt(group.position.x, group.position.z);
      const toTank = tankRef.group.position.clone().add(new THREE.Vector3(0, 1.5, 0)).sub(group.position);
      const distance = toTank.length();
      group.rotation.y = Math.atan2(-toTank.x, -toTank.z);
      prisoner.fireTimer -= delta;
      if (distance < 250 && prisoner.fireTimer <= 0) {
        prisoner.fireTimer = 30;
        const muzzle = prisoner.rifle.localToWorld(new THREE.Vector3(0, 0, -1.25));
        const direction = tankRef.group.position.clone().add(new THREE.Vector3(0, 1.2, 0)).sub(muzzle).normalize();
        this.enemyManager.firePrisonerShot(muzzle, direction);
      }
    }
  }

  resetPrisoner(prisoner) {
    prisoner.dead = false;
    prisoner.fireTimer = 5 + prisoner.index * 2.5;
    prisoner.group.position.copy(prisoner.origin);
    prisoner.group.position.y = terrain.getHeightAt(prisoner.origin.x, prisoner.origin.z);
    this.parent.add(prisoner.group);
  }

  destroyPrisoner(prisoner, shot, position = prisoner.group.position) {
    if (!prisoner || prisoner.dead) return false;
    prisoner.dead = true;
    prisoner.respawnTimer = 8;
    this.parent.remove(prisoner.group);
    destroyedEnemies++;
    runStats.prisonersStopped++;
    registerPlayerHit(shot, position, 100, "prisoner");
    createExplosion(position, { radius: 0.9, growth: 14, life: 0.45, color: 0xff5525, coreColor: 0xffd69a });
    audio.playExplosion();
    return true;
  }

  hitAlongSegment(start, end, radius, shot) {
    let closest = null;
    let closestDistance = Infinity;
    for (const prisoner of this.prisoners) {
      if (prisoner.dead) continue;
      const distance = distanceToSegmentSquared(prisoner.group.position.clone().add(new THREE.Vector3(0, 2.2, 0)), start, end);
      const hitRadius = radius + 1.25;
      if (distance <= hitRadius * hitRadius && distance < closestDistance) {
        closest = prisoner;
        closestDistance = distance;
      }
    }
    return closest ? this.destroyPrisoner(closest, shot, closest.group.position.clone().add(new THREE.Vector3(0, 2, 0))) : false;
  }

  destroyNear(position, radius, shot) {
    let destroyed = 0;
    for (const prisoner of this.prisoners) {
      if (!prisoner.dead && prisoner.group.position.distanceTo(position) <= radius + 1.25) {
        if (this.destroyPrisoner(prisoner, shot)) destroyed++;
      }
    }
    return destroyed;
  }
}

class GiantTarantulaManager {
  constructor(parent, terrainManager) {
    this.parent = parent;
    this.terrain = terrainManager;
    this.spiders = [];
    this.prisonSpawned = false;
    const positions = [[-175, 35], [175, -35], [-35, -175], [35, 175]];
    positions.forEach((position, index) => this.spawn(position[0], position[1], index, parent, "compound", new THREE.Vector3(0, 0, 0), 205));
  }

  spawn(x, z, index, spawnParent = this.parent, worldMode = "compound", roamCenter = new THREE.Vector3(), roamRadius = 205) {
    const root = new THREE.Group();
    const chrome = new THREE.MeshStandardMaterial({ color: 0xd8e0e3, metalness: 1, roughness: 0.08, envMapIntensity: 2.8 });
    const darkChrome = new THREE.MeshStandardMaterial({ color: 0x4c555a, metalness: 0.96, roughness: 0.2, envMapIntensity: 2.1 });
    const mechanism = new THREE.MeshStandardMaterial({ color: 0x080b0d, metalness: 0.88, roughness: 0.3 });
    const sensorMaterial = new THREE.MeshStandardMaterial({ color: 0x4b0000, emissive: 0xff1c0a, emissiveIntensity: 3.5, metalness: 0.5, roughness: 0.16 });
    const abdomen = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), chrome);
    abdomen.scale.set(4.5, 3.35, 5.1);
    abdomen.position.set(0, 7.8, 2.8);
    const thorax = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 14), darkChrome);
    thorax.scale.set(3.7, 2.35, 3.8);
    thorax.position.set(0, 7.45, -2.4);
    root.add(abdomen, thorax);

    const dorsalSeam = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 8.2), mechanism);
    dorsalSeam.position.set(0, 11.12, 2.75);
    root.add(dorsalSeam);
    for (const zBand of [-0.1, 2.2, 4.5, 6.65]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(3.25, 0.13, 7, 22, Math.PI), darkChrome);
      band.scale.set(1.23, 1, 1);
      band.rotation.x = Math.PI * 0.5;
      band.rotation.z = Math.PI * 0.5;
      band.position.set(0, 8.05, zBand);
      root.add(band);
    }
    for (const side of [-1, 1]) {
      for (let cableIndex = 0; cableIndex < 3; cableIndex++) {
        const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.2, 7), mechanism);
        cable.position.set(side * (0.65 + cableIndex * 0.3), 7.1 + cableIndex * 0.14, 0.05);
        cable.rotation.x = Math.PI * 0.46;
        root.add(cable);
      }
    }
    const eyeMaterial = sensorMaterial;
    const eyeLayout = [[-0.72, 0.5], [-0.24, 0.68], [0.24, 0.68], [0.72, 0.5], [-0.52, 0.05], [-0.17, 0.18], [0.17, 0.18], [0.52, 0.05]];
    for (const [eyeX, eyeY] of eyeLayout) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), eyeMaterial);
      eye.position.set(eyeX, 8.15 + eyeY, -5.98);
      root.add(eye);
    }
    for (const side of [-1, 1]) {
      const fang = new THREE.Mesh(new THREE.ConeGeometry(0.38, 2.35, 12), chrome);
      fang.position.set(side * 1.05, 5.95, -5.9);
      fang.rotation.x = Math.PI * 0.18;
      root.add(fang);
      const palp = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.52, 3.8, 10), darkChrome);
      palp.position.set(side * 2.15, 6.25, -5.2);
      palp.rotation.z = side * 0.45;
      palp.rotation.x = -0.45;
      root.add(palp);
    }
    for (const side of [-1, 1]) {
      const spinneret = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.4, 10), darkChrome);
      spinneret.position.set(side * 0.65, 6.95, 7.9);
      spinneret.rotation.x = Math.PI * 0.5;
      root.add(spinneret);
    }
    const turret = new THREE.Group();
    turret.position.set(0, 11.15, -1.25);
    const turretBase = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.5, 0.7, 14), mechanism);
    const turretShell = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 9), darkChrome);
    turretShell.scale.set(1.35, 0.7, 1.7);
    turretShell.position.y = 0.55;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 4.2, 10), chrome);
    barrel.rotation.x = Math.PI * 0.5;
    barrel.position.set(0, 0.55, -2.5);
    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0.55, -4.65);
    turret.add(turretBase, turretShell, barrel, muzzle);
    root.add(turret);
    const legs = [];
    for (const side of [-1, 1]) {
      for (let legIndex = 0; legIndex < 4; legIndex++) {
        const hip = new THREE.Group();
        hip.position.set(side * 2.6, 7.45, -4.5 + legIndex * 2.85);
        hip.rotation.y = side * (0.16 + Math.abs(legIndex - 1.5) * 0.2);
        const coxa = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.72, 5.2, 12), darkChrome);
        coxa.rotation.z = Math.PI * 0.5;
        coxa.position.x = side * 2.6;
        hip.add(coxa);
        const knee = new THREE.Group();
        knee.position.x = side * 5.15;
        knee.rotation.z = side * 0.48;
        const kneeJoint = new THREE.Mesh(new THREE.SphereGeometry(0.78, 14, 9), mechanism);
        const kneeCollar = new THREE.Mesh(new THREE.TorusGeometry(0.79, 0.16, 7, 14), chrome);
        kneeCollar.rotation.x = Math.PI * 0.5;
        knee.add(kneeJoint, kneeCollar);
        const femur = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.62, 4.8, 12), chrome);
        femur.position.y = -2.4;
        knee.add(femur);
        for (const offset of [-0.42, 0.42]) {
          const actuator = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 3.7, 7), mechanism);
          actuator.position.set(offset, -2.35, 0.25);
          knee.add(actuator);
        }
        const ankle = new THREE.Group();
        ankle.position.y = -4.7;
        ankle.rotation.z = side * -0.28;
        const ankleJoint = new THREE.Mesh(new THREE.SphereGeometry(0.52, 12, 8), mechanism);
        const ankleCollar = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.11, 6, 12), chrome);
        ankleCollar.rotation.x = Math.PI * 0.5;
        const tibia = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.38, 4.15, 10), darkChrome);
        tibia.position.y = -2.2;
        const shinPlate = new THREE.Mesh(new THREE.BoxGeometry(0.58, 3.05, 0.36), chrome);
        shinPlate.position.set(0, -2.05, -0.2);
        const foot = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.8, 9), chrome);
        foot.position.set(0, -4.55, -0.42);
        foot.rotation.x = -0.28;
        ankle.add(ankleJoint, ankleCollar, tibia, shinPlate, foot);
        knee.add(ankle);
        hip.add(knee);
        root.add(hip);
        legs.push({
          hip,
          knee,
          ankle,
          side,
          legIndex,
          baseYaw: side * (0.16 + Math.abs(legIndex - 1.5) * 0.2),
          phase: (legIndex % 2) * Math.PI + (side > 0 ? Math.PI : 0)
        });
      }
    }
    root.position.set(x, this.terrain.getHeightAt(x, z), z);
    root.rotation.y = index * Math.PI * 0.5;
    spawnParent.add(root);
    this.spiders.push({
      root,
      turret,
      muzzle,
      legs,
      health: CONFIG.giantTarantulaHealth,
      dead: false,
      fireTimer: 2.5 + index * 0.8,
      phase: index * 1.7,
      heading: root.rotation.y,
      turnTimer: 5 + index,
      worldMode,
      roamCenter: roamCenter.clone(),
      roamRadius
    });
  }

  spawnPrisonPopulation(prisonParent) {
    if (this.prisonSpawned) return;
    this.prisonSpawned = true;
    const center = new THREE.Vector3(0, 0, -300);
    const count = 22;
    for (let index = 0; index < count; index++) {
      const side = index % 4;
      const along = -205 + Math.floor(index / 4) * 82;
      const x = side === 0 ? -245 : side === 1 ? 245 : along;
      const z = side === 2 ? -545 : side === 3 ? -55 : -300 + along * 0.72;
      this.spawn(x, z, 100 + index, prisonParent, "prison", center, 285);
    }
  }

  update(delta, tankRef, enemyManager) {
    const time = performance.now() * 0.001;
    for (const spider of this.spiders) {
      if (spider.dead || spider.worldMode !== this.terrain.worldMode) continue;
      spider.turnTimer -= delta;
      if (spider.turnTimer <= 0) {
        spider.turnTimer = 5 + seededRandom(time + spider.phase) * 7;
        spider.heading += (seededRandom(time * 3 + spider.phase) - 0.5) * 1.3;
      }
      const next = spider.root.position.clone().add(new THREE.Vector3(-Math.sin(spider.heading), 0, -Math.cos(spider.heading)).multiplyScalar(delta * 2.2));
      if (Math.hypot(next.x - spider.roamCenter.x, next.z - spider.roamCenter.z) < spider.roamRadius) spider.root.position.copy(next);
      else spider.heading += Math.PI * 0.7;
      spider.root.rotation.y += wrapAngle(spider.heading - spider.root.rotation.y) * Math.min(1, delta * 1.2);
      const bodyCycle = time * 2.55 + spider.phase;
      spider.root.position.y = this.terrain.getHeightAt(spider.root.position.x, spider.root.position.z) + Math.sin(bodyCycle * 2) * 0.055;
      spider.root.rotation.x = Math.cos(bodyCycle * 2) * 0.006;
      spider.root.rotation.z = Math.sin(bodyCycle) * 0.012;
      const turretPosition = spider.turret.getWorldPosition(new THREE.Vector3());
      const possibleTargets = [{ group: tankRef.group, offsetY: 1.5 }];
      if (wingmen) {
        for (const unit of wingmen.units) if (!unit.dead) possibleTargets.push({ group: unit.group, offsetY: 1.8 });
      }
      const selectedTarget = possibleTargets.sort((a, b) => a.group.position.distanceToSquared(turretPosition) - b.group.position.distanceToSquared(turretPosition))[0];
      const target = selectedTarget.group.position.clone().add(new THREE.Vector3(0, selectedTarget.offsetY, 0));
      const toTank = target.sub(turretPosition);
      const distanceToTank = toTank.length();
      const localAim = toTank.clone().applyQuaternion(spider.root.getWorldQuaternion(new THREE.Quaternion()).invert());
      spider.turret.rotation.y = Math.atan2(-localAim.x, -localAim.z);
      spider.turret.rotation.x = THREE.MathUtils.clamp(Math.atan2(localAim.y, Math.hypot(localAim.x, localAim.z)), -0.28, 0.48);
      spider.fireTimer -= delta;
      if (distanceToTank < 280 && spider.fireTimer <= 0) {
        spider.fireTimer = 4.5 + Math.random() * 1.8;
        const muzzle = spider.muzzle.getWorldPosition(new THREE.Vector3());
        enemyManager.fireSpiderShot(muzzle, selectedTarget.group.position.clone().add(new THREE.Vector3(0, selectedTarget.offsetY, 0)).sub(muzzle).normalize());
      }
      for (const leg of spider.legs) {
        const cycle = bodyCycle + leg.phase;
        const stride = Math.sin(cycle);
        const recovery = Math.pow(Math.max(0, Math.cos(cycle)), 1.65);
        leg.hip.rotation.y = leg.baseYaw + stride * 0.2;
        leg.hip.rotation.x = (leg.legIndex - 1.5) * 0.012 + recovery * 0.055;
        leg.knee.position.y = recovery * 0.52;
        leg.knee.rotation.z = leg.side * (0.48 - recovery * 0.14 + Math.max(0, -stride) * 0.025);
        leg.ankle.rotation.z = leg.side * (-0.28 + recovery * 0.22);
      }
    }
  }

  hitAlongSegment(start, end, radius, shot) {
    for (const spider of this.spiders) {
      if (spider.dead || spider.worldMode !== this.terrain.worldMode) continue;
      const center = spider.root.position.clone().add(new THREE.Vector3(0, 7.5, 0));
      if (distanceToSegmentSquared(center, start, end) <= Math.pow(radius + 5.5, 2)) {
        this.receiveHit(spider, shot, center);
        return true;
      }
    }
    return false;
  }

  receiveHit(spider, shot, position) {
    if (!spider || spider.dead) return false;
    spider.health -= shot.kind === "missile" || shot.kind === "bomb" ? CONFIG.giantTarantulaHealth : 1;
    if (!shot.noPlayerStats) registerPlayerHit(shot, position, 100, "spider");
    if (spider.health > 0) return true;
    spider.dead = true;
    spider.root.visible = false;
    destroyedEnemies++;
    runStats.spidersDestroyed++;
    createExplosion(position, { radius: 3.8, growth: 34, life: 1, color: 0xff361b, coreColor: 0xeaffff });
    createBombShockwaves(spider.root.position.clone());
    audio.playExplosion();
    return true;
  }

  destroyNear(position, radius, shot) {
    for (const spider of this.spiders) {
      if (!spider.dead && spider.worldMode === this.terrain.worldMode && spider.root.position.distanceTo(position) <= radius + 6) {
        this.receiveHit(spider, { ...shot, kind: "bomb" }, spider.root.position.clone().add(new THREE.Vector3(0, 7.5, 0)));
      }
    }
  }
}

class WingmanUnit {
  constructor(parent, terrainManager, playerTank, index) {
    this.parent = parent;
    this.terrain = terrainManager;
    this.playerTank = playerTank;
    this.index = index;
    this.name = `Wingman ${index + 1}`;
    this.group = new THREE.Group();
    this.health = CONFIG.wingmanMaxHitPoints;
    this.fuel = CONFIG.maxFuel;
    this.missiles = 4;
    this.dead = false;
    this.state = "patrol";
    this.velocity = new THREE.Vector3();
    this.fireTimer = 0.5 + index * 0.2;
    this.collisionRadius = 2.25;
    this.rearEnergyLevel = 0.18;
    this.supplyQueue = [];
    this.patrolPhase = index * Math.PI;
    this.build();
    this.group.scale.setScalar(0.46);
    const startAngle = index ? -0.72 : 0.72;
    this.group.position.set(Math.sin(startAngle) * 38, 5.5, Math.cos(startAngle) * 38);
    parent.add(this.group);
  }

  build() {
    for (const original of this.playerTank.legacyVisuals) {
      const clone = original.clone(true);
      clone.traverse(child => {
        child.visible = true;
        if (!child.isMesh) return;
        child.material = child.material.clone();
        child.castShadow = false;
        child.receiveShadow = false;
        if ("metalness" in child.material) child.material.metalness = Math.max(0.82, child.material.metalness || 0);
        if ("roughness" in child.material) child.material.roughness = Math.min(0.3, child.material.roughness ?? 0.3);
        if (child.material.color) child.material.color.lerp(new THREE.Color(0xdde8ed), 0.42);
      });
      this.group.add(clone);
    }

    this.rearThrusters = [];
    for (const x of [-1.35, 1.35]) {
      const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0x33bfff,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      });
      const haloMaterial = new THREE.MeshBasicMaterial({
        color: 0x168dff,
        transparent: true,
        opacity: 0.11,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      });
      const core = new THREE.Mesh(new THREE.CircleGeometry(0.31, 12), coreMaterial);
      const halo = new THREE.Mesh(new THREE.CircleGeometry(0.57, 12), haloMaterial);
      core.position.set(x, 2.72, 7.1);
      halo.position.set(x, 2.72, 7.08);
      const engineLight = new THREE.PointLight(0x35cfff, 0.45, 14, 2);
      engineLight.position.set(x, 2.72, 7.45);
      engineLight.castShadow = false;
      this.group.add(halo, core, engineLight);
      this.rearThrusters.push({ core, halo, engineLight });
    }

    const beaconMaterial = new THREE.MeshBasicMaterial({ color: this.index ? 0x6effa8 : 0x65dfff, transparent: true, opacity: 0.95 });
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 7), beaconMaterial);
    beacon.position.set(0, 4.5, 0.4);
    this.group.add(beacon);
    this.muzzle = new THREE.Object3D();
    this.muzzle.position.set(0, 2.25, -11.5);
    this.group.add(this.muzzle);
  }

  buildOptimizedWingman() {
    if (!this.constructor.sharedWingmanAssets) {
      this.constructor.sharedWingmanAssets = {
        body: new THREE.BoxGeometry(6.0, 1.0, 8.8),
        belly: new THREE.BoxGeometry(6.0, 0.36, 8.85),
        pod: new THREE.BoxGeometry(1.55, 1.0, 2.95),
        prow: new THREE.BoxGeometry(2.35, 0.4, 1.4),
        tail: new THREE.CylinderGeometry(0.62, 0.8, 1.2, 8),
        wing: new THREE.BoxGeometry(2.05, 0.22, 1.4),
        turret: new THREE.BoxGeometry(1.55, 0.7, 1.55),
        barrel: new THREE.CylinderGeometry(0.16, 0.18, 4.35, 8),
        wheel: new THREE.CylinderGeometry(0.36, 0.36, 0.28, 8),
        rearCoreMaterial: new THREE.MeshBasicMaterial({
          color: 0x33bfff,
          transparent: true,
          opacity: 0.22,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false
        }),
        rearHaloMaterial: new THREE.MeshBasicMaterial({
          color: 0x168dff,
          transparent: true,
          opacity: 0.11,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false
        })
      };
    }

    const assets = this.constructor.sharedWingmanAssets;
    const chrome = materials.wingmanChrome;
    const trim = materials.wingmanTrim;
    const addPart = (geometry, material, position, scale = 1, rotation = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);
      mesh.rotation.set(...rotation);
      if (typeof scale === "number") {
        mesh.scale.setScalar(scale);
      } else {
        mesh.scale.set(...scale);
      }
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      this.group.add(mesh);
      return mesh;
    };

    addPart(assets.body, chrome, [0, 2.4, 0.45]);
    addPart(assets.belly, trim, [0, 1.75, -0.15]);
    for (const x of [-3.15, 3.15]) {
      addPart(assets.pod, trim, [x, 2.95, -1.2]);
      addPart(assets.wing, chrome, [x, 2.58, 1.35]);
    }
    addPart(assets.pod, chrome, [0, 2.9, -4.3]);
    addPart(assets.wing, chrome, [-2.58, 2.58, -3.3]);
    addPart(assets.wing, chrome, [2.58, 2.58, -3.3]);
    addPart(assets.wing, chrome, [0, 2.58, 0.35], 1.42);
    addPart(assets.prow, trim, [0, 3.05, -4.55]);
    addPart(assets.tail, trim, [0, 3.0, 4.8], [1, 1, 1.18]);
    addPart(assets.wing, trim, [0, 3.05, 3.9], [1.1, 0, 0]);

    const cannonBase = addPart(assets.turret, chrome, [0, 2.95, -0.4]);
    const cannon = new THREE.Mesh(assets.barrel, trim);
    cannon.position.set(0, 0.38, -2.35);
    cannon.rotation.x = Math.PI / 2;
    cannon.castShadow = false;
    cannon.receiveShadow = false;
    cannonBase.add(cannon);
    this.group.add(cannonBase);

    for (const x of [-3.15, 3.15]) {
      addPart(assets.wheel, trim, [x, 1.36, 1.92]);
      addPart(assets.wheel, trim, [x, 1.36, -3.42]);
    }

    this.rearThrusters = [];
    for (const x of [-1.05, 1.05]) {
      const core = new THREE.Mesh(new THREE.CircleGeometry(0.31, 12), assets.rearCoreMaterial);
      const halo = new THREE.Mesh(new THREE.CircleGeometry(0.57, 12), assets.rearHaloMaterial);
      core.position.set(x, 2.7, 4.85);
      halo.position.set(x, 2.7, 4.84);
      core.rotation.x = Math.PI * 0.5;
      halo.rotation.x = Math.PI * 0.5;
      const engineLight = new THREE.PointLight(0x35cfff, 0.45, 14, 2);
      engineLight.position.set(x, 2.7, 5.2);
      engineLight.castShadow = false;
      this.group.add(core, halo, engineLight);
      this.rearThrusters.push({ core, halo, engineLight });
    }

    const beaconMaterial = new THREE.MeshBasicMaterial({ color: this.index ? 0x6effa8 : 0x65dfff, transparent: true, opacity: 0.95 });
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 7), beaconMaterial);
    beacon.position.set(0, 4.5, 0.4);
    this.group.add(beacon);
    this.muzzle = new THREE.Object3D();
    this.muzzle.position.set(0, 3.52, -5.55);
    this.group.add(this.muzzle);
  }

  receiveDamage(amount) {
    if (this.dead) return;
    this.health = Math.max(0, this.health - amount);
    if (this.health > 0) return;
    this.dead = true;
    this.group.visible = false;
    createExplosion(this.group.position.clone().add(new THREE.Vector3(0, 2.5, 0)), { radius: 3.5, growth: 34, life: 1.1, color: 0xff2812, coreColor: 0xeaffff });
    createBombShockwaves(this.group.position.clone());
    audio.playExplosion();
    hud.status.textContent = `${this.name} has been destroyed.`;
    statusTimer = 4;
  }

  setSupplyQueue(queue) {
    if (this.dead || queue.length === 0) return;
    this.supplyQueue = queue;
    this.state = "resupply";
  }

  update(delta, manager) {
    if (this.dead) return;
    this.fuel = Math.max(0, this.fuel - delta * 0.6);
    this.fireTimer -= delta;
    const player = this.playerTank;
    const thrustPulse = manager.assistTimer > 0 ? 1 : 0;
    const thrustRatio = Math.min(1, this.velocity.length() / 48);
    const thrustTarget = Math.min(1, 0.16 + thrustRatio * 0.74 + thrustPulse * 0.06);
    this.rearEnergyLevel = THREE.MathUtils.lerp(this.rearEnergyLevel, thrustTarget, 1 - Math.exp(-delta * 6.5));
    const glow = 0.9 + Math.sin(performance.now() * 0.002 + this.patrolPhase) * 0.1;
    const heat = THREE.MathUtils.clamp(this.rearEnergyLevel * glow, 0, 1);
    for (const thruster of this.rearThrusters) {
      thruster.core.material.opacity = 0.22 + heat * 0.55;
      thruster.core.scale.setScalar(0.86 + heat * 0.34);
      thruster.halo.material.opacity = 0.06 + heat * 0.3;
      thruster.halo.scale.setScalar(0.92 + heat * 0.52);
      thruster.engineLight.intensity = 0.32 + heat * 2.4;
    }
    let destination;
    let targetPrisoner = null;

    if (this.state === "return") {
      const angle = this.index ? -0.78 : 0.78;
      destination = new THREE.Vector3(Math.sin(angle) * 45, this.terrain.getHeightAt(Math.sin(angle) * 45, Math.cos(angle) * 45) + 3.2, Math.cos(angle) * 45);
    } else if (this.state === "resupply" && this.supplyQueue.length) {
      destination = this.supplyQueue[0].position.clone().add(new THREE.Vector3(0, 8, 0));
      if (this.group.position.distanceTo(destination) < 7) {
        const stop = this.supplyQueue.shift();
        if (stop.type === "fuel") this.fuel = CONFIG.maxFuel;
        if (stop.type === "missile") this.missiles = 4;
        audio.playResupplyClick();
        if (!this.supplyQueue.length) this.state = "patrol";
      }
    } else if (manager.assistTimer > 0) {
      this.state = "assist";
      const side = this.index ? 1 : -1;
      const formationOffset = new THREE.Vector3(side * 23, 5, 13).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.group.rotation.y);
      destination = player.group.position.clone().add(formationOffset);
    } else {
      this.state = "patrol";
      targetPrisoner = manager.getNearestPrisoner(this.group.position, 260);
      if (targetPrisoner) {
        destination = targetPrisoner.group.position.clone().add(new THREE.Vector3(this.index ? 18 : -18, 18, 24));
      } else {
        const angle = performance.now() * 0.00018 + this.patrolPhase;
        destination = new THREE.Vector3(Math.cos(angle) * 155, 24, Math.sin(angle) * 155);
      }
    }

    const toDestination = destination.clone().sub(this.group.position);
    const distance = toDestination.length();
    const desiredSpeed = this.state === "return" && distance < 12 ? 10 : 48;
    const desiredVelocity = distance > 0.1 ? toDestination.normalize().multiplyScalar(Math.min(desiredSpeed, distance * 2.1)) : new THREE.Vector3();
    this.velocity.lerp(desiredVelocity, 1 - Math.exp(-delta * 2.5));
    if (this.fuel <= 0) this.velocity.multiplyScalar(0.97);
    this.group.position.addScaledVector(this.velocity, delta);
    if (this.velocity.lengthSq() > 1) {
      const desiredHeading = Math.atan2(-this.velocity.x, -this.velocity.z);
      this.group.rotation.y += wrapAngle(desiredHeading - this.group.rotation.y) * Math.min(1, delta * 3.2);
    }

    if (this.fireTimer <= 0 && this.state === "assist" && manager.playerFireTimer > 0) {
      const playerShot = player.getCannonShots()[0];
      if (playerShot) this.fire(playerShot.direction);
    } else if (this.fireTimer <= 0 && targetPrisoner && this.group.position.distanceTo(targetPrisoner.group.position) < 220) {
      const muzzle = this.muzzle.getWorldPosition(new THREE.Vector3());
      this.fire(targetPrisoner.group.position.clone().add(new THREE.Vector3(0, 2, 0)).sub(muzzle).normalize());
    }
  }

  fire(direction) {
    const muzzle = this.muzzle.getWorldPosition(new THREE.Vector3());
    projectiles.fireAuxiliary(muzzle, direction, this.name);
    this.fireTimer = 0.38 + this.index * 0.06;
  }
}

class WingmanManager {
  constructor(parent, terrainManager, playerTank) {
    this.parent = parent;
    this.terrain = terrainManager;
    this.playerTank = playerTank;
    this.assistTimer = 0;
    this.playerFireTimer = 0;
    this.firePressure = 0;
    this.units = [new WingmanUnit(parent, terrainManager, playerTank, 0), new WingmanUnit(parent, terrainManager, playerTank, 1)];
  }

  notePlayerFire() {
    this.playerFireTimer = 0.32;
    this.firePressure = Math.min(8, this.firePressure + 0.32);
    if (this.firePressure >= 2.2) this.assistTimer = 10;
  }

  getNearestPrisoner(position, range) {
    let closest = null;
    let best = range * range;
    for (const prisoner of prisonEscapees.prisoners) {
      if (prisoner.dead) continue;
      const distance = prisoner.group.position.distanceToSquared(position);
      if (distance < best) {
        best = distance;
        closest = prisoner;
      }
    }
    return closest;
  }

  orderReturnToBase() {
    for (const unit of this.units) if (!unit.dead) {
      unit.state = "return";
      unit.supplyQueue.length = 0;
    }
    this.assistTimer = 0;
    hud.status.textContent = "Wingmen ordered home. Landing at the helipad perimeter.";
    statusTimer = 4;
  }

  orderResupply() {
    let dispatched = 0;
    for (const unit of this.units) {
      if (unit.dead) continue;
      const queue = [];
      if (unit.fuel < CONFIG.maxFuel - 1) {
        const tower = this.findNearestTower(unit.group.position, refuelTowers.towers);
        if (tower) queue.push({ type: "fuel", position: tower.group.position.clone() });
      }
      if (unit.missiles < 4) {
        const tower = this.findNearestTower(queue.length ? queue[0].position : unit.group.position, missileTowers.towers);
        if (tower) queue.push({ type: "missile", position: tower.group.position.clone() });
      }
      if (queue.length) {
        unit.setSupplyQueue(queue);
        dispatched++;
      }
    }
    hud.status.textContent = dispatched ? "Wingmen cleared for fuel and missile resupply." : "Wingmen report fuel and missile batteries sufficient.";
    statusTimer = 4;
  }

  findNearestTower(position, towers) {
    return towers.filter(tower => tower.group.parent && !tower.consumed).sort((a, b) => a.group.position.distanceToSquared(position) - b.group.position.distanceToSquared(position))[0] || null;
  }

  update(delta) {
    this.playerFireTimer = Math.max(0, this.playerFireTimer - delta);
    this.assistTimer = Math.max(0, this.assistTimer - delta);
    this.firePressure = Math.max(0, this.firePressure - delta * 0.72);
    for (const unit of this.units) unit.update(delta, this);
  }
}

class GroundEnemyTank {
  constructor(patrolPath = null, patrolIndex = 0, missileArmor = false) {
    this.group = new THREE.Group();
    this.turret = new THREE.Group();
    this.cannonPivot = new THREE.Group();
    this.health = CONFIG.enemyTankHealth;
    this.dead = false;
    this.collisionRadius = 6.5;
    this.speed = 7;
    this.fireTimer = 1.2;
    this.patrolPath = patrolPath;
    this.patrolIndex = patrolIndex;
    this.pathIndex = patrolIndex % 2;
    this.missileArmor = missileArmor;
    this.stuckTimer = 0;
    this.recoveryTimer = 0;
    this.recoveryTurn = patrolIndex % 2 ? 1 : -1;
    this.recoveryAttempts = 0;
    this.build();
  }

  build() {
    const armor = new THREE.MeshStandardMaterial({ color: this.missileArmor ? 0x8fdfff : 0xaeb4b8, emissive: this.missileArmor ? 0x123d55 : 0x000000, emissiveIntensity: this.missileArmor ? 0.55 : 0, metalness: 0.72, roughness: 0.4 });
    const turretArmor = new THREE.MeshStandardMaterial({ color: this.missileArmor ? 0xc3f1ff : 0xd6dadd, emissive: this.missileArmor ? 0x174c64 : 0x000000, emissiveIntensity: this.missileArmor ? 0.62 : 0, metalness: 0.7, roughness: 0.36 });
    const addBox = (size, position, material = armor, parent = this.group) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.position.set(...position);
      parent.add(mesh);
      return mesh;
    };
    addBox([7.6, 1.25, 10.2], [0, 1.15, 0]);
    addBox([8.8, 0.75, 2.0], [0, 0.45, -3.8], materials.darkMetal);
    addBox([8.8, 0.75, 2.0], [0, 0.45, 3.8], materials.darkMetal);
    this.turret.position.set(0, 2.1, -0.4);
    addBox([4.2, 1.25, 4.2], [0, 0.55, 0], turretArmor, this.turret);
    this.cannonPivot.position.set(0, 0.55, -1.45);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 8.5, 12), turretArmor);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0, -4.25);
    this.cannonPivot.add(barrel);
    this.turret.add(this.cannonPivot);
    const eye = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.24, 0.18), materials.redEye);
    eye.position.set(0, 1.3, -2.15);
    this.turret.add(eye);
    this.group.add(this.turret);
  }

  canOccupy(position) {
    const padding = this.collisionRadius * 0.72;
    for (const item of terrain.destructibles) {
      if (!item.solid || !item.object.parent || item.collisionBox.isEmpty()) continue;
      const box = item.collisionBox;
      if (position.x >= box.min.x - padding && position.x <= box.max.x + padding &&
          position.z >= box.min.z - padding && position.z <= box.max.z + padding) return false;
    }
    return true;
  }

  resolveArchitectureOverlap() {
    const padding = this.collisionRadius * 0.72;
    for (const item of terrain.destructibles) {
      if (!item.solid || !item.object.parent || item.collisionBox.isEmpty()) continue;
      const box = item.collisionBox;
      const minX = box.min.x - padding;
      const maxX = box.max.x + padding;
      const minZ = box.min.z - padding;
      const maxZ = box.max.z + padding;
      const position = this.group.position;
      if (position.x <= minX || position.x >= maxX || position.z <= minZ || position.z >= maxZ) continue;
      const exits = [
        { distance: position.x - minX, axis: "x", value: minX - 0.25 },
        { distance: maxX - position.x, axis: "x", value: maxX + 0.25 },
        { distance: position.z - minZ, axis: "z", value: minZ - 0.25 },
        { distance: maxZ - position.z, axis: "z", value: maxZ + 0.25 }
      ].sort((a, b) => a.distance - b.distance);
      position[exits[0].axis] = exits[0].value;
    }
  }

  moveAroundArchitecture(direction, distance) {
    const candidate = this.group.position.clone().addScaledVector(direction, distance);
    if (this.canOccupy(candidate)) {
      this.group.position.copy(candidate);
      return direction;
    }
    const left = new THREE.Vector3(-direction.z, 0, direction.x);
    const right = left.clone().negate();
    const alternatives = this.patrolIndex % 2 ? [right, left] : [left, right];
    for (const alternative of alternatives) {
      candidate.copy(this.group.position).addScaledVector(alternative, distance);
      if (this.canOccupy(candidate)) {
        this.group.position.copy(candidate);
        return alternative;
      }
    }
    const reverse = direction.clone().negate();
    candidate.copy(this.group.position).addScaledVector(reverse, distance * 0.85);
    if (this.canOccupy(candidate)) this.group.position.copy(candidate);
    return reverse;
  }

  update(delta, tankRef, manager) {
    this.resolveArchitectureOverlap();
    const movementStart = this.group.position.clone();
    const toPlayer = tankRef.group.position.clone().sub(this.group.position);
    const distance = toPlayer.length();
    const flatDirection = toPlayer.clone().setY(0).normalize();
    let hullDirection = flatDirection;
    let movementRequested = false;
    if (this.recoveryTimer > 0) {
      this.recoveryTimer = Math.max(0, this.recoveryTimer - delta);
      const forward = new THREE.Vector3(-Math.sin(this.group.rotation.y), 0, -Math.cos(this.group.rotation.y));
      const right = new THREE.Vector3(-forward.z, 0, forward.x);
      const reverseEscape = forward.clone().negate().addScaledVector(right, this.recoveryTurn * 0.62).normalize();
      const steeringHeading = forward.clone().addScaledVector(right, this.recoveryTurn * 0.34).normalize();
      this.moveAroundArchitecture(reverseEscape, this.speed * 1.18 * delta);
      hullDirection = steeringHeading;
      movementRequested = true;
    } else if (this.patrolPath) {
      const waypoint = this.patrolPath[this.pathIndex];
      const toWaypoint = waypoint.clone().sub(this.group.position).setY(0);
      if (toWaypoint.length() < 16) {
        this.pathIndex = (this.pathIndex + 1) % this.patrolPath.length;
        toWaypoint.copy(this.patrolPath[this.pathIndex]).sub(this.group.position).setY(0);
      }
      hullDirection = toWaypoint.normalize();
      hullDirection = this.moveAroundArchitecture(hullDirection, this.speed * 0.72 * delta);
      movementRequested = true;
    } else if (distance > 78 && distance < 260) {
      hullDirection = this.moveAroundArchitecture(flatDirection, this.speed * delta);
      movementRequested = true;
    }
    const movement = this.group.position.distanceTo(movementStart);
    if (movementRequested && movement < this.speed * delta * 0.12) {
      this.stuckTimer += delta;
      if (this.stuckTimer >= 0.62) {
        this.recoveryAttempts++;
        this.recoveryTurn = this.recoveryAttempts % 2
          ? (Math.random() < 0.5 ? -1 : 1)
          : -this.recoveryTurn;
        this.recoveryTimer = 1.25 + Math.random() * 0.75;
        this.stuckTimer = 0;
      }
    } else if (movement > this.speed * delta * 0.3) {
      this.stuckTimer = Math.max(0, this.stuckTimer - delta * 3);
      if (this.recoveryTimer <= 0) this.recoveryAttempts = 0;
    }
    this.group.position.y = terrain.getHeightAt(this.group.position.x, this.group.position.z) + 1.2;
    const hullTargetYaw = Math.atan2(-hullDirection.x, -hullDirection.z);
    this.group.rotation.y += wrapAngle(hullTargetYaw - this.group.rotation.y) * Math.min(1, delta * 1.7);
    const turretTargetYaw = wrapAngle(hullTargetYaw - this.group.rotation.y);
    this.turret.rotation.y += wrapAngle(turretTargetYaw - this.turret.rotation.y) * Math.min(1, delta * 3.4);
    const pivotPosition = this.cannonPivot.getWorldPosition(new THREE.Vector3());
    const aimPoint = tankRef.group.position.clone().add(new THREE.Vector3(0, 1.1, 0));
    const toAimPoint = aimPoint.clone().sub(pivotPosition);
    const pitchTarget = THREE.MathUtils.clamp(Math.atan2(toAimPoint.y, Math.hypot(toAimPoint.x, toAimPoint.z)), -0.12, 0.48);
    this.cannonPivot.rotation.x = THREE.MathUtils.lerp(this.cannonPivot.rotation.x, pitchTarget, Math.min(1, delta * 3.2));
    this.fireTimer -= delta;
    if (distance < 245 && this.fireTimer <= 0) {
      const muzzle = this.cannonPivot.localToWorld(new THREE.Vector3(0, 0, -8.5));
      const barrelDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this.cannonPivot.getWorldQuaternion(new THREE.Quaternion())).normalize();
      const directAim = aimPoint.clone().sub(muzzle).normalize();
      if (barrelDirection.dot(directAim) > 0.995) {
        this.fireTimer = CONFIG.enemyTankFireInterval + Math.random() * 0.7;
        manager.fireEnemyShell(muzzle, barrelDirection);
      }
    }
  }

  receiveHit(shot) {
    if (this.dead) return;
    if (this.missileArmor && shot.kind !== "missile" && shot.kind !== "bomb") {
      registerPlayerHit(shot, this.group.position, 0, "hit");
      hud.status.textContent = "Light-blue reactive armor requires a bomb or missile.";
      statusTimer = 2.5;
      return;
    }
    this.health -= shot.kind === "missile" ? CONFIG.enemyTankHealth : 1;
    registerPlayerHit(shot, this.group.position, 20, this.health <= 0 ? "object" : "hit");
    if (this.health <= 0) {
      this.dead = true;
      destroyedEnemies++;
      runStats.enemyVehiclesDestroyed++;
      createExplosion(this.group.position, { radius: 2.8, growth: 30, life: 0.9, color: 0xff281b, coreColor: 0xffd7aa });
      audio.playExplosion();
    }
  }
}

class EscortDrone {
  constructor(index, corner) {
    this.index = index;
    this.corner = corner;
    this.group = new THREE.Group();
    this.gunPivot = new THREE.Group();
    this.ammo = CONFIG.escortDroneAmmo;
    this.fireTimer = CONFIG.escortDroneFireInterval + index * 0.65;
    this.collisionRadius = 2.6;
    this.dead = false;
    this.phase = index * Math.PI * 0.5;
    this.build();
  }

  build() {
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.65, 4.1), materials.enemy);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.18, 1.15), materials.darkMetal);
    const antenna = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.8, 0.1), materials.darkMetal);
    const eye = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.12), materials.redEye);
    wing.position.z = 0.3;
    antenna.position.set(this.corner[0] * 0.8, 1.05, 0.8);
    eye.position.set(0, 0.05, -2.1);
    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 2.4, 8), materials.darkMetal);
    gun.rotation.x = Math.PI / 2;
    gun.position.z = -1.2;
    this.gunPivot.position.set(0, -0.25, -1.8);
    this.gunPivot.add(gun);
    this.group.add(body, wing, antenna, eye, this.gunPivot);
  }

  update(delta, playerTank, enemyTank, manager) {
    if (!enemyTank || enemyTank.dead) return;
    const offset = new THREE.Vector3(this.corner[0] * 11, 0, this.corner[1] * 12).applyAxisAngle(new THREE.Vector3(0, 1, 0), enemyTank.group.rotation.y);
    const target = enemyTank.group.position.clone().add(offset);
    target.y = terrain.getHeightAt(target.x, target.z) + 8.5 + Math.sin(performance.now() * 0.003 + this.phase) * 1.2;
    this.group.position.lerp(target, 1 - Math.pow(0.025, delta));

    const aimPoint = playerTank.group.position.clone().add(new THREE.Vector3(0, 1, 0));
    const flatAim = aimPoint.clone().sub(this.group.position).setY(0).normalize();
    this.group.rotation.y = Math.atan2(-flatAim.x, -flatAim.z);
    const pivotPosition = this.gunPivot.getWorldPosition(new THREE.Vector3());
    const toAim = aimPoint.clone().sub(pivotPosition);
    const pitchTarget = THREE.MathUtils.clamp(Math.atan2(toAim.y, Math.hypot(toAim.x, toAim.z)), -0.2, 0.62);
    this.gunPivot.rotation.x = THREE.MathUtils.lerp(this.gunPivot.rotation.x, pitchTarget, Math.min(1, delta * 4.2));

    this.fireTimer -= delta;
    const distance = toAim.length();
    if (this.ammo > 0 && distance < 205 && this.fireTimer <= 0) {
      const muzzle = this.gunPivot.localToWorld(new THREE.Vector3(0, 0, -2.4));
      const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.gunPivot.getWorldQuaternion(new THREE.Quaternion())).normalize();
      const directAim = aimPoint.clone().sub(muzzle).normalize();
      if (direction.dot(directAim) > 0.992) {
        this.ammo--;
        this.fireTimer = CONFIG.escortDroneFireInterval;
        manager.fireEscortShot(muzzle, direction);
      }
    }
  }

  destroy() {
    if (this.dead) return;
    this.dead = true;
    destroyedEnemies++;
    runStats.dronesDestroyed++;
    createExplosion(this.group.position, { radius: 1.4, growth: 18, life: 0.55, color: 0xff3328, coreColor: 0xffdfbb });
    audio.playExplosion();
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
    if (this.dead) return;
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
    this.spawnTimer = 0.6;
  }

  update(delta, tankRef) {
    if (this.drones.length < CONFIG.skyDroneCount) {
      this.spawnTimer -= delta;
      if (this.spawnTimer <= 0) {
        this.spawn(tankRef);
        this.spawnTimer = 0.6;
      }
    }

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
    const activeOrbs = droneOrbs.filter(orb => orb.group.parent);
    if (!activeOrbs.length) return false;
    const index = this.drones.length;
    const angle = seededRandom(performance.now() * 0.001 + index * 47) * Math.PI * 2;
    const distance = 180 + seededRandom(index * 97 + Math.floor(tankRef.group.position.x)) * 260;
    const drone = new SkyDrone(index + Math.floor(performance.now() * 0.01));
    const patrolPosition = new THREE.Vector3(
      tankRef.group.position.x + Math.cos(angle) * distance,
      tankRef.group.position.y + 56 + seededRandom(index * 31) * 55,
      tankRef.group.position.z + Math.sin(angle) * distance
    );
    const orb = activeOrbs[index % activeOrbs.length];
    {
      const portalSign = index % 2 === 0 ? -1 : 1;
      const portalY = orb.shell.geometry.parameters.radius * 0.96 * portalSign;
      const exitY = orb.shell.geometry.parameters.radius * 1.62 * portalSign;
      drone.launchFrom = orb.group.position.clone().add(new THREE.Vector3(0, portalY, 0));
      drone.launchExit = orb.group.position.clone().add(new THREE.Vector3(0, exitY, 0));
      drone.launchTarget = patrolPosition.clone();
      drone.launchTime = 2.45;
      drone.launchDuration = 2.45;
      drone.group.position.copy(drone.launchFrom);
    }
    drone.anchor.copy(tankRef.group.position);
    drone.orbitRadius = distance;
    drone.orbitAngle = angle;
    this.parent.add(drone.group);
    this.drones.push(drone);
    return true;
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
        return drone;
      }
    }

    return null;
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
    if (this.launchTime > 0 && this.launchFrom && this.launchExit && this.launchTarget) {
      this.launchTime = Math.max(0, this.launchTime - delta);
      const progress = 1 - this.launchTime / this.launchDuration;
      if (progress < 0.38) {
        const ejectProgress = THREE.MathUtils.smoothstep(progress / 0.38, 0, 1);
        this.group.position.lerpVectors(this.launchFrom, this.launchExit, ejectProgress);
      } else {
        const patrolProgress = THREE.MathUtils.smoothstep((progress - 0.38) / 0.62, 0, 1);
        this.group.position.lerpVectors(this.launchExit, this.launchTarget, patrolProgress);
      }
      this.group.lookAt(tankRef.group.position.x, this.group.position.y - 8, tankRef.group.position.z);
      return;
    }
    this.anchor.lerp(tankRef.group.position, 0.018);
    this.orbitAngle += this.speed * delta;
    const sideDrift = Math.sin(performance.now() * 0.00035 + this.seed) * 22;
    this.group.position.x = this.anchor.x + Math.cos(this.orbitAngle) * this.orbitRadius + sideDrift;
    this.group.position.z = this.anchor.z + Math.sin(this.orbitAngle) * this.orbitRadius;
    this.group.position.y = terrain.getHeightAt(this.group.position.x, this.group.position.z) + this.altitude + Math.sin(performance.now() * 0.0015 + this.bob) * 7;
    this.group.lookAt(tankRef.group.position.x, this.group.position.y - 8, tankRef.group.position.z);
  }

  destroy() {
    if (this.dead) return;
    this.dead = true;
    destroyedEnemies++;
    runStats.dronesDestroyed++;
    createExplosion(this.group.position, {
      color: 0xff2a1f,
      opacity: 0.92,
      radius: 2.4,
      growth: 28,
      life: 0.82,
      coreColor: 0xffd0c0
    });
    audio.playExplosion();
  }
}

let refuelTowerModelPromise = null;

function getCompoundSupplyPositions(type) {
  const half = CONFIG.compoundSize * 0.5 + 20;
  const perimeter = half * 8;
  const slotCount = Math.floor(perimeter / 25);
  const positions = [];
  for (let slot = 0; slot < slotCount; slot++) {
    const isMissile = slot % 4 === 3;
    if ((type === "missile") !== isMissile) continue;
    let distance = slot / slotCount * perimeter;
    let x;
    let z;
    if (distance < half * 2) {
      x = -half + distance;
      z = -half;
    } else if ((distance -= half * 2) < half * 2) {
      x = half;
      z = -half + distance;
    } else if ((distance -= half * 2) < half * 2) {
      x = half - distance;
      z = half;
    } else {
      distance -= half * 2;
      x = -half;
      z = half - distance;
    }
    positions.push({ x, z });
  }
  return positions;
}

function loadRefuelTowerModel() {
  if (refuelTowerModelPromise) return refuelTowerModelPromise;

  refuelTowerModelPromise = new Promise((resolve, reject) => {
    const path = "assets/models/";
    const materialLoader = new THREE.MTLLoader();
    materialLoader.setPath(path);
    materialLoader.load("Fuel-Tower_001.mtl?v=embedded-assets-1", materials => {
      materials.preload();
      const objectLoader = new THREE.OBJLoader();
      objectLoader.setMaterials(materials);
      objectLoader.setPath(path);
      objectLoader.load("Fuel-Tower_001.obj?v=embedded-assets-1", resolve, undefined, reject);
    }, undefined, reject);
  });

  return refuelTowerModelPromise;
}

class RefuelTowerManager {
  constructor(parent, terrainManager) {
    this.parent = parent;
    this.terrain = terrainManager;
    this.towers = [];
    this.spawnTowers();
  }

  spawnTowers() {
    const positions = getCompoundSupplyPositions("fuel");
    for (let i = 0; i < positions.length; i++) {
      const { x, z } = positions[i];
      this.terrain.reserveClearZone(x, z, CONFIG.refuelTowerRadius + CONFIG.tankCollisionRadius + 11);
      const tower = new RefuelTower(i, this.terrain, x, z);
      this.parent.add(tower.group);
      registerUniverseTarget(tower.group, CONFIG.refuelTowerRadius + 2.5, { playerDestructible: false });
      this.towers.push(tower);
    }
  }

  update(delta, tankRef) {
    for (const tower of this.towers) {
      if (!tower.group.parent) continue;
      tower.update(delta);
      const dx = tankRef.group.position.x - tower.group.position.x;
      const dz = tankRef.group.position.z - tower.group.position.z;
      const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
      const aboveBase = tankRef.group.position.y >= tower.group.position.y - 2;
      const belowTop = tankRef.group.position.y <= tower.group.position.y + tower.height + 6;
      const insideStation = horizontalDistance <= CONFIG.refuelTowerRadius && aboveBase && belowTop;
      if (insideStation) {
        resupplyTank();
        audio.playResupplyClick();
        this.consumeTower(tower);
      }
    }
  }

  consumeTower(tower) {
    const targetIndex = universeTargets.findIndex(target => target.object === tower.group);
    if (targetIndex >= 0) universeTargets.splice(targetIndex, 1);
    if (tower.group.parent) tower.group.parent.remove(tower.group);
    disposeObject(tower.group);
    tower.consumed = true;
  }
}

class RefuelTower {
  constructor(index, terrainManager, x, z) {
    this.index = index;
    this.group = new THREE.Group();
    this.height = 22 + (index % 4) * 3;
    this.pulse = 0;
    this.consumed = false;
    const y = terrainManager.getHeightAt(x, z);
    this.group.position.set(x, y, z);
    this.build();
  }

  build() {
    this.glowMat = new THREE.MeshBasicMaterial({ color: 0x009dff, transparent: true, opacity: 0.9, depthWrite: false });
    this.coreMat = new THREE.MeshBasicMaterial({ color: 0x2ed7ff, transparent: true, opacity: 1, depthWrite: false });

    loadRefuelTowerModel().then(source => {
      if (this.consumed || !this.group.parent) return;
      const model = source.clone(true);
      model.traverse(child => {
        if (!child.isMesh) return;
        child.geometry = child.geometry.clone();
        child.material = child.material.clone();
        child.material.color.setHex(0x008be8);
        if (child.material.emissive) child.material.emissive.setHex(0x003b80);
        child.material.metalness = 0.68;
        child.material.roughness = 0.3;
        child.castShadow = true;
        child.receiveShadow = true;
      });

      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const scale = this.height / Math.max(size.y, 0.001);
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
      this.group.add(model);
      this.model = model;
    }).catch(error => {
      console.error("Fuel tower model failed to load", error);
    });

    const gate = new THREE.Mesh(new THREE.TorusGeometry(CONFIG.refuelTowerRadius, 0.16, 8, 48), this.glowMat);
    gate.position.y = 6.2;
    gate.rotation.x = Math.PI * 0.5;
    this.group.add(gate);
    this.gate = gate;

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.82, 12, 8), this.coreMat);
    beacon.position.y = this.height + 1.55;
    this.group.add(beacon);
    this.beacon = beacon;
  }

  update(delta) {
    this.pulse = Math.max(0, this.pulse - delta * 1.8);
    const blink = 0.45 + Math.sin(performance.now() * 0.004 + this.index) * 0.22;
    const refillFlash = this.pulse * 0.55;
    this.glowMat.opacity = 0.42 + blink * 0.2 + refillFlash;
    this.coreMat.opacity = 0.55 + blink * 0.26 + refillFlash;
    const scale = 1 + this.pulse * 0.16;
    this.gate.scale.set(scale, scale, scale);
    this.beacon.scale.setScalar(1 + this.pulse * 0.55);
  }
}

class MissileTowerManager {
  constructor(parent, terrainManager) {
    this.parent = parent;
    this.terrain = terrainManager;
    this.towers = [];
    const positions = getCompoundSupplyPositions("missile");
    for (let i = 0; i < positions.length; i++) {
      const { x, z } = positions[i];
      this.terrain.reserveClearZone(x, z, CONFIG.missileTowerRadius + CONFIG.tankCollisionRadius + 8);
      const tower = new MissileTower(i, this.terrain, x, z);
      this.parent.add(tower.group);
      registerUniverseTarget(tower.group, CONFIG.missileTowerRadius + 2.5, { playerDestructible: false });
      this.towers.push(tower);
    }
  }

  update(delta, tankRef) {
    for (const tower of this.towers) {
      if (!tower.group.parent) continue;
      tower.update(delta);
      if (tankRef.getMissileCount() >= 4) continue;
      const dx = tankRef.group.position.x - tower.group.position.x;
      const dz = tankRef.group.position.z - tower.group.position.z;
      const horizontalDistance = Math.hypot(dx, dz);
      const insideHeight = tankRef.group.position.y >= tower.group.position.y - 2 &&
        tankRef.group.position.y <= tower.group.position.y + tower.height + 6;
      if (horizontalDistance <= CONFIG.missileTowerRadius && insideHeight) {
        tankRef.reloadMissiles();
        hud.status.textContent = "Missile battery reloaded: four rockets armed.";
        statusTimer = 4;
        audio.playResupplyClick();
        this.consumeTower(tower);
      }
    }
  }

  consumeTower(tower) {
    const targetIndex = universeTargets.findIndex(target => target.object === tower.group);
    if (targetIndex >= 0) universeTargets.splice(targetIndex, 1);
    if (tower.group.parent) tower.group.parent.remove(tower.group);
    disposeObject(tower.group);
    tower.consumed = true;
  }
}

class MissileTower {
  constructor(index, terrainManager, x, z) {
    this.index = index;
    this.group = new THREE.Group();
    this.height = 25 + (index % 2) * 4;
    this.pulse = 0;
    this.consumed = false;
    this.group.position.set(x, terrainManager.getHeightAt(x, z), z);
    this.build();
  }

  build() {
    this.glowMat = new THREE.MeshBasicMaterial({ color: 0xff142f, transparent: true, opacity: 0.92, depthWrite: false });
    this.coreMat = new THREE.MeshBasicMaterial({ color: 0xff5668, transparent: true, opacity: 1, depthWrite: false });
    loadRefuelTowerModel().then(source => {
      if (this.consumed || !this.group.parent) return;
      const model = source.clone(true);
      model.traverse(child => {
        if (!child.isMesh) return;
        child.geometry = child.geometry.clone();
        child.material = child.material.clone();
        child.material.color.setHex(0xf01832);
        if (child.material.emissive) {
          child.material.emissive.setHex(0x8f0018);
          child.material.emissiveIntensity = 1.8;
        }
        child.material.metalness = 0.62;
        child.material.roughness = 0.28;
      });
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const scale = this.height / Math.max(size.y, 0.001);
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
      this.group.add(model);
    }).catch(error => console.error("Missile tower model failed to load", error));

    this.gate = new THREE.Mesh(new THREE.TorusGeometry(CONFIG.missileTowerRadius, 0.22, 8, 48), this.glowMat);
    this.gate.position.y = 6.2;
    this.gate.rotation.x = Math.PI * 0.5;
    this.group.add(this.gate);
    this.beacon = new THREE.Mesh(new THREE.OctahedronGeometry(1.05, 0), this.coreMat);
    this.beacon.position.y = this.height + 1.7;
    this.group.add(this.beacon);
  }

  update(delta) {
    this.pulse += delta;
    const wave = 0.5 + Math.sin(this.pulse * 5.5 + this.index) * 0.5;
    this.glowMat.opacity = 0.5 + wave * 0.35;
    this.coreMat.opacity = 0.65 + wave * 0.35;
    this.gate.scale.setScalar(1 + wave * 0.045);
    this.beacon.rotation.y += delta * 1.8;
    this.beacon.scale.setScalar(0.9 + wave * 0.32);
  }
}

class BombingScope {
  constructor(panel, canvasElement, terrainManager, playerTank) {
    this.panel = panel;
    this.canvas = canvasElement;
    this.context = canvasElement.getContext("2d");
    this.terrain = terrainManager;
    this.player = playerTank;
    this.range = 80;
    this.visible = false;
    this.sweepAngle = 0;
    this.impactPoint = new THREE.Vector3();
  }

  toggle() {
    this.visible = !this.visible;
    this.panel.hidden = !this.visible;
    hud.status.textContent = this.visible ? "Bombing sonar online." : "Bombing sonar dismissed.";
    statusTimer = 2.2;
    if (this.visible) {
      this.render(0);
      playSonarActivation();
      if (audio) audio.speakComms("Sone Are Mode.", true);
    }
  }

  predictImpact() {
    const origin = this.player.group.position.clone().add(new THREE.Vector3(0, -1.2, 0));
    const forward = new THREE.Vector3(-Math.sin(this.player.group.rotation.y), 0, -Math.cos(this.player.group.rotation.y));
    const horizontalVelocity = forward.multiplyScalar(this.player.speed);
    let time = 0;
    let ground = this.terrain.getHeightAt(origin.x, origin.z);
    for (let iteration = 0; iteration < 4; iteration++) {
      const height = Math.max(0, origin.y - ground);
      time = (-3 + Math.sqrt(9 + 2 * CONFIG.bombGravity * height)) / CONFIG.bombGravity;
      const x = origin.x + horizontalVelocity.x * time;
      const z = origin.z + horizontalVelocity.z * time;
      ground = this.terrain.getHeightAt(x, z);
    }
    this.impactPoint.set(origin.x + horizontalVelocity.x * time, ground, origin.z + horizontalVelocity.z * time);
    return this.impactPoint;
  }

  collectTargets() {
    const targets = [];
    const add = (position, type, heading = 0) => {
      if (position) targets.push({ position, type, heading });
    };
    if (enemies) {
      for (const enemy of enemies.enemies) if (!enemy.dead) add(enemy.group.position, enemy.kind || "hostile", enemy.group.rotation.y);
      for (const enemyTank of enemies.getGroundTanks()) add(enemyTank.group.position, "tank", enemyTank.group.rotation.y);
      for (const escort of enemies.escortDrones) if (!escort.dead) add(escort.group.position, "escort", escort.group.rotation.y);
    }
    if (prisonEscapees) {
      for (const prisoner of prisonEscapees.prisoners) if (!prisoner.dead) add(prisoner.group.position, "prisoner", prisoner.group.rotation.y);
    }
    if (giantTarantulas) {
      for (const spider of giantTarantulas.spiders) {
        if (!spider.dead && spider.worldMode === this.terrain.worldMode) add(spider.root.position, "spider", spider.root.rotation.y);
      }
    }
    if (bootcampManager?.active && bootcampManager.opponent?.group.visible) {
      add(bootcampManager.opponent.group.position, "rival", bootcampManager.opponent.group.rotation.y);
    }
    return targets;
  }

  worldToScope(position, center, scale, width, height) {
    const dx = position.x - center.x;
    const dz = position.z - center.z;
    const yaw = this.player.group.rotation.y;
    const localRight = dx * Math.cos(yaw) - dz * Math.sin(yaw);
    const localForward = -dx * Math.sin(yaw) - dz * Math.cos(yaw);
    return { x: width * 0.5 + localRight * scale, y: height * 0.5 - localForward * scale };
  }

  drawTarget(ctx, target, point, scale) {
    const relativeHeading = target.heading - this.player.group.rotation.y;
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(-relativeHeading);
    ctx.strokeStyle = target.type === "rival" ? "#fff083" : "#76ffb4";
    ctx.lineWidth = 2.2;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 7;
    if (target.type === "tank" || target.type === "rival") {
      ctx.strokeRect(-7, -10, 14, 20);
      ctx.beginPath();
      ctx.arc(0, -1, 4.2, 0, Math.PI * 2);
      ctx.moveTo(0, -4);
      ctx.lineTo(0, -14);
      ctx.stroke();
    } else if (target.type === "spider") {
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 11, 0, 0, Math.PI * 2);
      for (const side of [-1, 1]) {
        for (let leg = -1.5; leg <= 1.5; leg++) {
          ctx.moveTo(side * 5, leg * 4);
          ctx.lineTo(side * 13, leg * 7);
        }
      }
      ctx.stroke();
    } else if (target.type === "prisoner") {
      ctx.beginPath();
      ctx.arc(0, -4, 2.4, 0, Math.PI * 2);
      ctx.moveTo(0, -1.5);
      ctx.lineTo(0, 7);
      ctx.moveTo(-4, 2);
      ctx.lineTo(5, 2);
      ctx.stroke();
    } else if (target.type === "escort" || target.type === "drone") {
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(8, 7);
      ctx.lineTo(-8, 7);
      ctx.closePath();
      ctx.stroke();
    } else {
      ctx.strokeRect(-4, -6, 8, 12);
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.lineTo(7, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  render(delta) {
    if (!this.visible || !this.context) return;
    const ctx = this.context;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const scale = Math.min(width, height) / (this.range * 2);
    const center = this.predictImpact();
    this.sweepAngle = (this.sweepAngle + delta * 1.25) % (Math.PI * 2);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "rgba(0, 18, 13, 0.96)";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(77, 255, 166, 0.18)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += width / 10) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y <= height; y += height / 8) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
    ctx.save();
    ctx.translate(width * 0.5, height * 0.5);
    for (const radius of [0.25, 0.5, 0.75, 1]) {
      ctx.beginPath();
      ctx.arc(0, 0, Math.min(width, height) * 0.5 * radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    const sweepRadius = Math.min(width, height) * 0.5;
    const gradient = ctx.createLinearGradient(0, 0, Math.sin(this.sweepAngle) * sweepRadius, -Math.cos(this.sweepAngle) * sweepRadius);
    gradient.addColorStop(0, "rgba(101,255,181,0.03)");
    gradient.addColorStop(1, "rgba(101,255,181,0.48)");
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.sin(this.sweepAngle) * sweepRadius, -Math.cos(this.sweepAngle) * sweepRadius);
    ctx.stroke();
    ctx.restore();

    for (const target of this.collectTargets()) {
      const point = this.worldToScope(target.position, center, scale, width, height);
      if (point.x < -18 || point.x > width + 18 || point.y < -18 || point.y > height + 18) continue;
      this.drawTarget(ctx, target, point, scale);
    }

    const playerPoint = this.worldToScope(this.player.group.position, center, scale, width, height);
    ctx.strokeStyle = "rgba(111, 214, 255, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playerPoint.x, playerPoint.y - 8);
    ctx.lineTo(playerPoint.x + 6, playerPoint.y + 7);
    ctx.lineTo(playerPoint.x, playerPoint.y + 4);
    ctx.lineTo(playerPoint.x - 6, playerPoint.y + 7);
    ctx.closePath();
    ctx.stroke();

    const cx = width * 0.5;
    const cy = height * 0.5;
    ctx.strokeStyle = "#ff5a4f";
    ctx.shadowColor = "#ff3028";
    ctx.shadowBlur = 10;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 15, 0, Math.PI * 2);
    ctx.moveTo(cx - 25, cy); ctx.lineTo(cx - 8, cy);
    ctx.moveTo(cx + 8, cy); ctx.lineTo(cx + 25, cy);
    ctx.moveTo(cx, cy - 25); ctx.lineTo(cx, cy - 8);
    ctx.moveTo(cx, cy + 8); ctx.lineTo(cx, cy + 25);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "rgba(117,255,181,0.045)";
    for (let y = 0; y < height; y += 5) ctx.fillRect(0, y, width, 1);
  }
}

class ProjectileManager {
  constructor(parent) {
    this.parent = parent;
    this.projectiles = [];
    this.cooldown = 0;
    this.bombCooldown = 0;
  }

  update(delta, keys, tankRef, enemyManager, skyDroneManager, bootcampManager = null) {
    this.cooldown -= delta;
    this.bombCooldown -= delta;
    if (keys.fireHeld && this.cooldown <= 0) {
      if (ammo > 0) {
        const shots = tankRef.getCannonShots();
        for (let i = 0; i < shots.length && ammo > 0; i++) {
          const shot = shots[i];
          this.fire(shot.position, shot.direction, skyDroneManager, keys.heatSeekingHeld, shot.collisionStart, i === 0);
        }
      } else {
        hud.status.textContent = "Ammo depleted. Find a resupply tower.";
        statusTimer = 2.2;
      }
      this.cooldown = CONFIG.projectileCooldown;
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const shot = this.projectiles[i];
      const collisionRadius = shot.kind === "missile" ? 10 : shot.radius;
      shot.life -= delta;
      if (shot.collisionStartPending) shot.collisionStartPending = false;
      else shot.previousPosition.copy(shot.mesh.position);
      if (shot.kind === "bomb") {
        shot.velocity.y -= CONFIG.bombGravity * delta;
      } else if (shot.kind === "missile") {
        const powered = shot.burnRemaining > 0;
        if (powered) {
          shot.velocity.addScaledVector(shot.direction, shot.thrust * delta);
          shot.burnRemaining = Math.max(0, shot.burnRemaining - delta);
        }
        shot.velocity.y -= (powered ? shot.poweredGravity : shot.ballisticGravity) * delta;
        shot.velocity.multiplyScalar(Math.exp(-(powered ? shot.poweredDrag : shot.ballisticDrag) * delta));
        shot.direction.copy(shot.velocity).normalize();
        shot.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), shot.direction);
        shot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), shot.direction);
        shot.trail.visible = powered;
      } else if (shot.homingTarget && !shot.homingTarget.dead) {
        const toTarget = shot.homingTarget.group.position.clone().sub(shot.mesh.position);
        if (toTarget.lengthSq() > 0.001) {
          const desiredVelocity = toTarget.normalize().multiplyScalar(CONFIG.homingSpeed);
          shot.velocity.lerp(desiredVelocity, Math.min(1, CONFIG.homingTurnRate * delta));
          shot.direction.copy(shot.velocity).normalize();
          shot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), shot.direction);
        }
      } else {
        shot.homingTarget = null;
        shot.velocity.y -= CONFIG.cannonGravity * delta;
        shot.direction.copy(shot.velocity).normalize();
        shot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), shot.direction);
        shot.trail.quaternion.copy(shot.quaternion);
      }
      shot.mesh.position.addScaledVector(shot.velocity, delta);
      if (shot.trail) {
        shot.trail.position.copy(shot.mesh.position).addScaledVector(shot.direction, -1.6);
        shot.trail.quaternion.copy(shot.quaternion);
        if (shot.kind === "missile") {
          const flicker = 0.82 + Math.random() * 0.34;
          shot.trail.scale.set(flicker, 0.9 + Math.random() * 0.42, flicker);
        } else {
          shot.trail.scale.multiplyScalar(0.965);
        }
      }

      const groundHeight = terrain.getHeightAt(shot.mesh.position.x, shot.mesh.position.z);
      if (shot.kind === "bomb" && shot.mesh.position.y <= groundHeight + shot.radius && shot.velocity.y < 0) {
        this.detonateBomb(shot.mesh.position, enemyManager, skyDroneManager);
        shot.life = -1;
      } else if (shot.kind === "missile" && shot.mesh.position.y <= groundHeight + shot.radius) {
        this.detonateMissile(shot.mesh.position, enemyManager, skyDroneManager, shot);
        shot.life = -1;
      } else if (shot.mesh.position.y <= groundHeight + shot.radius * 0.4 && shot.velocity.y < 0) {
        const normal = terrain.getNormalAt(shot.mesh.position.x, shot.mesh.position.z);
        shot.velocity.reflect(normal).multiplyScalar(0.82);
        shot.velocity.y = Math.max(shot.velocity.y, 18);
        shot.direction.copy(shot.velocity).normalize();
        shot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), shot.direction);
        shot.mesh.position.y = groundHeight + shot.radius + 0.25;
        shot.bounces++;
        if (shot.bounces > 4) shot.life = -1;
      }

      if (shot.life > 0 && prisonEscapees.hitAlongSegment(shot.previousPosition, shot.mesh.position, collisionRadius, shot)) {
        if (shot.kind === "missile") this.detonateMissile(shot.mesh.position, enemyManager, skyDroneManager, shot);
        shot.life = -1;
      }

      if (shot.life > 0 && giantTarantulas.hitAlongSegment(shot.previousPosition, shot.mesh.position, collisionRadius, shot)) {
        if (shot.kind === "missile") this.detonateMissile(shot.mesh.position, enemyManager, skyDroneManager, shot);
        shot.life = -1;
      }

      if (shot.life > 0) {
        for (const enemy of enemyManager.enemies) {
          const hitRadius = enemy.collisionRadius + collisionRadius;
          if (!enemy.dead && distanceToSegmentSquared(enemy.group.position, shot.previousPosition, shot.mesh.position) < hitRadius * hitRadius) {
            if (shot.kind === "missile") this.detonateMissile(shot.mesh.position, enemyManager, skyDroneManager, shot);
            else {
              registerPlayerHit(shot, enemy.group.position, 100, "object");
              enemy.destroy();
            }
            shot.life = -1;
            break;
          }
        }
      }

      if (shot.life > 0) {
        for (const enemyTank of enemyManager.getGroundTanks()) {
          const hitRadius = enemyTank.collisionRadius + collisionRadius;
          if (distanceToSegmentSquared(enemyTank.group.position, shot.previousPosition, shot.mesh.position) < hitRadius * hitRadius) {
            if (shot.kind === "missile") this.detonateMissile(shot.mesh.position, enemyManager, skyDroneManager, shot);
            else enemyTank.receiveHit(shot);
            shot.life = -1;
            break;
          }
        }
      }

      if (shot.life > 0) {
        for (const escort of enemyManager.escortDrones) {
          const shotPath = shot.mesh.position.clone().sub(shot.previousPosition);
          const pathLengthSq = shotPath.lengthSq();
          const toEscort = escort.group.position.clone().sub(shot.previousPosition);
          const alongPath = pathLengthSq > 0.001 ? THREE.MathUtils.clamp(toEscort.dot(shotPath) / pathLengthSq, 0, 1) : 0;
          const closestPoint = shot.previousPosition.clone().addScaledVector(shotPath, alongPath);
          if (!escort.dead && closestPoint.distanceTo(escort.group.position) < escort.collisionRadius + collisionRadius) {
            if (shot.kind === "missile") this.detonateMissile(shot.mesh.position, enemyManager, skyDroneManager, shot);
            else {
              registerPlayerHit(shot, escort.group.position, 100, "drone");
              escort.destroy();
            }
            shot.life = -1;
            break;
          }
        }
      }

      if (shot.life > 0) {
        const droneHit = skyDroneManager.hitDroneAlongSegment(shot.previousPosition, shot.mesh.position, collisionRadius);
        if (droneHit) {
          if (shot.kind === "missile") this.detonateMissile(shot.mesh.position, enemyManager, skyDroneManager, shot);
          else {
            registerPlayerHit(shot, droneHit.group.position, 100, "drone");
            droneHit.destroy();
          }
          shot.life = -1;
        }
      }

      if (shot.life > 0) {
        const terrainHit = terrain.hitDestructibleAlongSegment(shot.previousPosition, shot.mesh.position, collisionRadius);
        if (terrainHit) {
          registerPlayerHit(shot, shot.mesh.position, 100, terrain.lastHitDestroyed ? "object" : "hit");
          shot.life = -1;
          if (shot.kind === "missile") this.detonateMissile(shot.mesh.position, enemyManager, skyDroneManager, shot);
          else audio.playExplosion();
        }
      }

      if (shot.life > 0 && hitUniverseTargetAlongSegment(shot.previousPosition, shot.mesh.position, collisionRadius)) {
        registerPlayerHit(shot, shot.mesh.position, 100, "object");
        shot.life = -1;
        if (shot.kind === "missile") this.detonateMissile(shot.mesh.position, enemyManager, skyDroneManager, shot);
        else audio.playExplosion();
      }

      if (shot.life > 0 && bootcampManager && bootcampManager.active) {
        if (bootcampManager.checkPlayerHit(shot.previousPosition, shot.mesh.position, collisionRadius, shot)) {
          if (shot.kind === "missile") {
            this.detonateMissile(shot.mesh.position, enemyManager, skyDroneManager, shot);
          }
          shot.life = -1;
        }
      }

      if (shot.life <= 0) {
        this.removeProjectile(i);
      }
    }
  }

  fire(position, direction, skyDroneManager, homingEnabled, collisionStart = position, playSound = true) {
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
      previousPosition: collisionStart.clone(),
      collisionStartPending: true,
      origin: position.clone(),
      radius: CONFIG.projectileCollisionRadius
    });
    runStats.shotsFired++;
    ammo = Math.max(0, ammo - 1);
    if (wingmen) wingmen.notePlayerFire();
    if (playSound) audio.playFire();
  }

  fireAuxiliary(position, direction, owner) {
    if (this.projectiles.length >= CONFIG.maxProjectiles) this.removeProjectile(0);
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 7), new THREE.MeshBasicMaterial({ color: 0x65e8ff }));
    mesh.position.copy(position);
    const trail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.22, 1.8, 7),
      new THREE.MeshBasicMaterial({ color: 0x83f4ff, transparent: true, opacity: 0.34 })
    );
    const normalized = direction.clone().normalize();
    trail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normalized);
    trail.position.copy(position).addScaledVector(normalized, -1.1);
    group.add(mesh, trail);
    this.parent.add(group);
    this.projectiles.push({
      group,
      mesh,
      trail,
      direction: normalized,
      quaternion: trail.quaternion.clone(),
      velocity: normalized.clone().multiplyScalar(112),
      homingTarget: null,
      bounces: 0,
      life: 2.4,
      previousPosition: position.clone(),
      collisionStartPending: true,
      origin: position.clone(),
      radius: 0.38,
      noPlayerStats: true,
      owner
    });
    audio.playDroneFire();
  }

  launchMissile(tankRef) {
    const launch = tankRef.takeNextMissile();
    if (!launch) {
      hud.status.textContent = "Missile rack empty. Find a red reload tower.";
      statusTimer = 3;
      return;
    }
    if (this.projectiles.length >= CONFIG.maxProjectiles) this.removeProjectile(0);
    const group = new THREE.Group();
    const rangeRatio = (missileRange - 1) / 99;
    const burnTime = THREE.MathUtils.lerp(0.28, 2.7, rangeRatio);
    const initialSpeed = THREE.MathUtils.lerp(46, 64, rangeRatio);
    const thrust = THREE.MathUtils.lerp(28, 44, rangeRatio);
    const mesh = createMissileModel();
    mesh.scale.setScalar(1.18);
    mesh.position.copy(launch.position);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), launch.direction);
    const trail = new THREE.Group();
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 3.3, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xff5a16, transparent: true, opacity: 0.72, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    const core = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 2.1, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffef9b, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    flame.position.y = -0.5;
    core.position.y = -0.2;
    trail.add(flame, core);
    trail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), launch.direction);
    trail.position.copy(launch.position).addScaledVector(launch.direction, -1.75);
    group.add(mesh, trail);
    this.parent.add(group);
    this.projectiles.push({
      kind: "missile",
      group,
      mesh,
      trail,
      direction: launch.direction.clone(),
      quaternion: trail.quaternion.clone(),
      velocity: launch.direction.clone().multiplyScalar(initialSpeed),
      burnRemaining: burnTime,
      thrust,
      poweredGravity: 6.5,
      ballisticGravity: 23,
      poweredDrag: 0.025,
      ballisticDrag: 0.13,
      homingTarget: null,
      bounces: 0,
      life: 9,
      previousPosition: launch.position.clone(),
      origin: launch.position.clone(),
      radius: 0.68
    });
    runStats.shotsFired++;
    runStats.missilesFired++;
    hud.status.textContent = `Missile launched. ${tankRef.getMissileCount()} remaining.`;
    statusTimer = 2.5;
    audio.playFire();
  }

  dropBombPayload(tankRef) {
    if (this.bombCooldown > 0) return;
    this.bombCooldown = 0.75;
    const forward = new THREE.Vector3(-Math.sin(tankRef.group.rotation.y), 0, -Math.cos(tankRef.group.rotation.y));
    const right = new THREE.Vector3(Math.cos(tankRef.group.rotation.y), 0, -Math.sin(tankRef.group.rotation.y));
    const baseVelocity = forward.clone().multiplyScalar(tankRef.speed);
    const origin = tankRef.group.position.clone().add(new THREE.Vector3(0, -1.2, 0));

    for (let i = 0; i < CONFIG.bombDropCount; i++) {
      const row = i < 4 ? -0.9 : 0.9;
      const col = (i % 4 - 1.5) * CONFIG.bombPayloadSpread;
      const position = origin.clone().addScaledVector(right, col).addScaledVector(forward, row);
      this.dropBomb(position, baseVelocity);
    }
    hud.status.textContent = "Bomb payload released.";
    statusTimer = 2.5;
  }

  dropBomb(position, baseVelocity) {
    if (this.projectiles.length >= CONFIG.maxProjectiles) this.removeProjectile(0);
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(CONFIG.bombRadius, 10, 8), materials.darkMetal);
    const marker = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 1.2), materials.redEye);
    marker.position.y = 0.18;
    mesh.add(marker);
    mesh.position.copy(position);
    group.add(mesh);
    this.parent.add(group);
    this.projectiles.push({
      kind: "bomb",
      group,
      mesh,
      direction: new THREE.Vector3(0, -1, 0),
      quaternion: new THREE.Quaternion(),
      velocity: baseVelocity.clone().add(new THREE.Vector3(0, -3, 0)),
      homingTarget: null,
      bounces: 0,
      life: 7,
      previousPosition: position.clone(),
      origin: position.clone(),
      radius: CONFIG.bombRadius
    });
  }

  detonateBomb(position, enemyManager, skyDroneManager) {
    createExplosion(position, { radius: 2.8, growth: 34, life: 0.85, color: 0xff2318, opacity: 0.72, coreColor: 0xfff1c6, coreOpacity: 0.72 });
    createBombShockwaves(position);
    let destroyedByBlast = terrain.destroyNear(position, 24);
    destroyedByBlast += destroyUniverseNear(position, 42);
    const blastShot = { kind: "bomb", origin: position.clone(), direction: new THREE.Vector3(0, 1, 0), bounces: 0 };
    prisonEscapees.destroyNear(position, 24, blastShot);
    giantTarantulas.destroyNear(position, 24, blastShot);
    for (const enemy of enemyManager.enemies) {
      if (!enemy.dead && enemy.group.position.distanceTo(position) <= enemy.collisionRadius + 24) {
        enemy.destroy();
        destroyedByBlast++;
      }
    }
    for (const enemyTank of enemyManager.getGroundTanks()) {
      if (enemyTank.group.position.distanceTo(position) <= enemyTank.collisionRadius + 24) {
        enemyTank.health = 1;
        enemyTank.receiveHit({ kind: "bomb", origin: position, direction: new THREE.Vector3(0, -1, 0), bounces: 0 });
      }
    }
    for (const escort of enemyManager.escortDrones) {
      if (!escort.dead && escort.group.position.distanceTo(position) <= escort.collisionRadius + 24) escort.destroy();
    }
    for (const drone of skyDroneManager.drones) {
      if (!drone.dead && drone.group.position.distanceTo(position) <= drone.collisionRadius + 28) drone.destroy();
    }
    runStats.objectsDestroyed += destroyedByBlast;
    audio.playExplosion();
  }

  detonateMissile(position, enemyManager, skyDroneManager, sourceShot = null) {
    createExplosion(position, { radius: 2.1, growth: 24, life: 0.72, color: 0xff3a14, opacity: 0.82, coreColor: 0xffe7a0, coreOpacity: 0.88 });
    const blastRadius = 16;
    let destroyedByBlast = terrain.destroyNear(position, 13);
    destroyedByBlast += destroyUniverseNear(position, 18);
    const blastShot = sourceShot || { kind: "missile", origin: position.clone(), direction: new THREE.Vector3(0, 0, -1), bounces: 0 };
    prisonEscapees.destroyNear(position, blastRadius, blastShot);
    giantTarantulas.destroyNear(position, blastRadius, blastShot);
    for (const enemy of enemyManager.enemies) {
      if (!enemy.dead && enemy.group.position.distanceTo(position) <= enemy.collisionRadius + blastRadius) {
        registerPlayerHit(blastShot, enemy.group.position, 100, "object");
        enemy.destroy();
        destroyedByBlast++;
      }
    }
    for (const enemyTank of enemyManager.getGroundTanks()) {
      if (enemyTank.group.position.distanceTo(position) <= enemyTank.collisionRadius + blastRadius) enemyTank.receiveHit(blastShot);
    }
    for (const escort of enemyManager.escortDrones) {
      if (!escort.dead && escort.group.position.distanceTo(position) <= escort.collisionRadius + blastRadius) {
        registerPlayerHit(blastShot, escort.group.position, 100, "drone");
        escort.destroy();
      }
    }
    for (const drone of skyDroneManager.drones) {
      if (!drone.dead && drone.group.position.distanceTo(position) <= drone.collisionRadius + blastRadius) {
        registerPlayerHit(blastShot, drone.group.position, 100, "drone");
        drone.destroy();
      }
    }
    runStats.objectsDestroyed += destroyedByBlast;
    audio.playExplosion();
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
    this.context = null;
    this.master = null;
    this.ammoOutput = null;
    this.radioTimer = CONFIG.radioChatterEvery;
    this.rotorOutput = null;
    this.rotorPulse = null;
    this.rotorVolume = Number(rotorVolumeControl.value) / 100;
    this.commsVolume = commsVolume;
    this.lastCommsAt = -Infinity;
    this.muted = false;
    this.beatEnvelope = null;
    this.beatEnvelopeStep = 0.04;
    this.beatEnvelopePromise = null;
    this.musicPulse = 0;
    this.playlist = [
      { title: "Iron Circuit", src: "assets/iron-circuit.mp3" },
      { title: "NeuroDark Guitar Solos", src: "assets/neurodark-guitar-solos-16.mp3" },
      { title: "NeuroDark Guitar Solos (7)", src: "assets/neurodark-guitar-solos-7.mp3" },
      { title: "NeuroDark Guitar Solos (28)", src: "assets/neurodark-guitar-solos-28.mp3" },
      { title: "NeuroDark Guitar Solos (29)", src: "assets/neurodark-guitar-solos-29.mp3" },
      { title: "Prison Escape", src: "assets/prison-escape.mp3" },
      { title: "Prison Escape (1)", src: "assets/prison-escape-1.mp3" },
      { title: "Prison Escape (2)", src: "assets/prison-escape-2.mp3" },
      { title: "Prison Escape (3)", src: "assets/prison-escape-3.mp3" }
    ];
    this.currentTrack = this.selectTrack();
    this.music = new Audio(this.currentTrack.src);
    this.music.id = "soundtrack";
    this.music.setAttribute("aria-hidden", "true");
    this.music.preload = "auto";
    this.musicAmmoBalance = Number(musicAmmoBalanceControl.value) / 100;
    this.music.volume = 0.58;
    this.setMusicAmmoBalance(this.musicAmmoBalance);
    document.body.appendChild(this.music);
  }

  selectTrack() {
    let lastTrack = "";
    try {
      lastTrack = window.localStorage.getItem("hovertank-last-track") || "";
    } catch (_) {
      lastTrack = "";
    }
    const choices = this.playlist.filter(track => track.src !== lastTrack);
    const selected = choices[Math.floor(Math.random() * choices.length)] || this.playlist[0];
    try {
      window.localStorage.setItem("hovertank-last-track", selected.src);
    } catch (_) {
      // Playback still works when storage is unavailable.
    }
    return selected;
  }

  prepareSessionDuration() {
    if (Number.isFinite(this.music.duration) && this.music.duration > 0) {
      return Promise.resolve(this.music.duration + 2);
    }
    return new Promise(resolve => {
      let settled = false;
      const finish = duration => {
        if (settled) return;
        settled = true;
        resolve(duration);
      };
      this.music.addEventListener("loadedmetadata", () => {
        const duration = Number.isFinite(this.music.duration) && this.music.duration > 0
          ? this.music.duration + 2
          : CONFIG.sessionDuration;
        finish(duration);
      }, { once: true });
      this.music.addEventListener("error", () => finish(CONFIG.sessionDuration), { once: true });
      this.music.load();
      window.setTimeout(() => finish(CONFIG.sessionDuration), 12000);
    });
  }

  async start() {
    if (this.started) return;
    this.started = true;
    const ctx = this.ensureContext();
    if (ctx && ctx.state === "suspended") await ctx.resume();
    this.prepareBeatEnvelope();
    this.music.currentTime = 0;
    this.setMusicAmmoBalance(this.musicAmmoBalance);
    await this.music.play().catch(() => {
      hud.status.textContent = "Soundtrack playback is waiting for browser audio permission.";
      statusTimer = 3;
    });
    hud.musicButton.textContent = "Sound Off";
  }

  armAudio() {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === "suspended") ctx.resume();
    this.music.volume = 0;
    this.music.play().catch(() => {
      // start() makes the normal audible playback attempt after the coin sequence.
    });
  }

  playCoinRing() {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    const output = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1850;
    filter.Q.value = 1.4;
    output.gain.setValueAtTime(0.0001, now);
    output.gain.exponentialRampToValueAtTime(0.32, now + 0.006);
    output.gain.exponentialRampToValueAtTime(0.11, now + 0.12);
    output.gain.exponentialRampToValueAtTime(0.0001, now + 0.82);
    output.connect(filter).connect(this.master);
    for (const [frequency, level] of [[1180, 0.52], [1770, 0.28], [2460, 0.16]]) {
      const tone = ctx.createOscillator();
      const gain = ctx.createGain();
      tone.type = "sine";
      tone.frequency.setValueAtTime(frequency, now);
      tone.frequency.exponentialRampToValueAtTime(frequency * 0.93, now + 0.75);
      gain.gain.setValueAtTime(level, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.78);
      tone.connect(gain).connect(output);
      tone.start(now);
      tone.stop(now + 0.82);
    }
  }

  toggleMute() {
    if (!this.started) {
      this.start();
      return;
    }
    this.muted = !this.muted;
    this.music.muted = this.muted;
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : CONFIG.gameAudioGain, this.context.currentTime, 0.04);
    }
    if (this.muted && "speechSynthesis" in window) window.speechSynthesis.cancel();
    hud.musicButton.textContent = this.muted ? "Sound On" : "Sound Off";
  }

  pause() {
    if (!this.started) return;
    this.music.pause();
    if (this.context && this.context.state === "running") this.context.suspend();
    if ("speechSynthesis" in window) window.speechSynthesis.pause();
  }

  resume() {
    if (!this.started) return;
    if (this.context && this.context.state === "suspended") this.context.resume();
    if ("speechSynthesis" in window) window.speechSynthesis.resume();
    this.music.play().catch(() => {
      hud.status.textContent = "Soundtrack playback is waiting for browser audio permission.";
      statusTimer = 3;
    });
  }

  stopMusic() {
    this.music.pause();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  setCommsVolume(volume) {
    this.commsVolume = THREE.MathUtils.clamp(volume, 0, 1);
  }

  speakComms(message, force = false) {
    if (this.muted || this.commsVolume <= 0 || !("speechSynthesis" in window)) return;
    const now = performance.now();
    if (!force && now - this.lastCommsAt < 8000) return;
    this.lastCommsAt = now;
    const voices = window.speechSynthesis.getVoices();
    const americanVoices = voices.filter(voice => /^en-US/i.test(voice.lang));
    const maleNames = /david|guy|mark|alex|christopher|eric|roger|davis|matthew/i;
    const voice = americanVoices.find(candidate => maleNames.test(candidate.name)) || americanVoices[0] || voices.find(candidate => /^en/i.test(candidate.lang));
    const utterance = new SpeechSynthesisUtterance(message);
    if (voice) utterance.voice = voice;
    utterance.lang = "en-US";
    utterance.volume = this.commsVolume;
    utterance.rate = 0.96;
    utterance.pitch = 0.82;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  speakDamageWarning() {
    if (this.muted || this.commsVolume <= 0 || !("speechSynthesis" in window)) return;
    const ctx = this.ensureContext();
    if (ctx) {
      const now = ctx.currentTime;
      for (const [delay, frequency] of [[0, 760], [0.13, 540]]) {
        const tone = ctx.createOscillator();
        const gain = ctx.createGain();
        tone.type = "square";
        tone.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.11 * this.commsVolume, now + delay + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.1);
        tone.connect(gain).connect(this.master);
        tone.start(now + delay);
        tone.stop(now + delay + 0.11);
      }
    }
    const voices = window.speechSynthesis.getVoices();
    const englishVoices = voices.filter(voice => /^en/i.test(voice.lang));
    const systemNames = /mark|david|guy|george|daniel|microsoft|google uk english male/i;
    const voice = englishVoices.find(candidate => systemNames.test(candidate.name)) || englishVoices[0];
    const utterance = new SpeechSynthesisUtterance("Damage is high. Refuel hovertank.");
    if (voice) utterance.voice = voice;
    utterance.lang = "en-US";
    utterance.volume = this.commsVolume;
    utterance.rate = 0.78;
    utterance.pitch = 0.52;
    window.speechSynthesis.cancel();
    window.setTimeout(() => window.speechSynthesis.speak(utterance), 260);
  }

  speakReturnToBase() {
    if (this.muted || this.commsVolume <= 0 || !("speechSynthesis" in window)) return;
    const ctx = this.ensureContext();
    if (ctx) {
      const now = ctx.currentTime;
      for (const [delay, frequency] of [[0, 620], [0.16, 620], [0.32, 430]]) {
        const tone = ctx.createOscillator();
        const gain = ctx.createGain();
        tone.type = "square";
        tone.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.1 * this.commsVolume, now + delay + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.11);
        tone.connect(gain).connect(this.master);
        tone.start(now + delay);
        tone.stop(now + delay + 0.12);
      }
    }
    const utterance = new SpeechSynthesisUtterance("Return to base.");
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find(voice => /^en/i.test(voice.lang) && /mark|david|guy|microsoft|google/i.test(voice.name)) || voices.find(voice => /^en/i.test(voice.lang));
    utterance.lang = "en-US";
    utterance.volume = this.commsVolume;
    utterance.rate = 0.74;
    utterance.pitch = 0.48;
    window.speechSynthesis.cancel();
    window.setTimeout(() => window.speechSynthesis.speak(utterance), 500);
  }

  speakRedAlert() {
    if (this.muted || this.commsVolume <= 0 || !("speechSynthesis" in window)) return;
    const ctx = this.ensureContext();
    if (ctx && this.master) {
      const now = ctx.currentTime;
      for (const delay of [0, 0.11, 0.22]) {
        const tone = ctx.createOscillator();
        const gain = ctx.createGain();
        tone.type = "sawtooth";
        tone.frequency.value = 690;
        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.085 * this.commsVolume, now + delay + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.08);
        tone.connect(gain).connect(this.master);
        tone.start(now + delay);
        tone.stop(now + delay + 0.09);
      }
    }
    const utterance = new SpeechSynthesisUtterance("Red Alert. Attack from the rear.");
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find(voice => /^en/i.test(voice.lang) && /mark|david|guy|microsoft|google/i.test(voice.name)) || voices.find(voice => /^en/i.test(voice.lang));
    utterance.lang = "en-US";
    utterance.volume = this.commsVolume;
    utterance.rate = 0.82;
    utterance.pitch = 0.5;
    window.speechSynthesis.cancel();
    window.setTimeout(() => window.speechSynthesis.speak(utterance), 280);
  }

  update(delta, tankRef) {
    if (!this.started) return;
    this.updateMusicPulse(delta);
    this.updateRotor(tankRef);
    this.radioTimer -= delta;
    if (this.radioTimer <= 0) {
      this.radioTimer = CONFIG.radioChatterEvery;
      this.playRadioChatter();
    }
  }

  updateMusicPulse(delta) {
    if (!this.beatEnvelope || this.music.paused) {
      this.musicPulse = moveToward(this.musicPulse, 0, delta * 3.5);
      return;
    }
    const position = this.music.currentTime / this.beatEnvelopeStep;
    const index = Math.min(this.beatEnvelope.length - 1, Math.max(0, Math.floor(position)));
    const nextIndex = Math.min(this.beatEnvelope.length - 1, index + 1);
    const detectedPulse = THREE.MathUtils.lerp(this.beatEnvelope[index], this.beatEnvelope[nextIndex], position - index);
    const response = detectedPulse > this.musicPulse ? 16 : 5.2;
    this.musicPulse += (detectedPulse - this.musicPulse) * Math.min(1, delta * response);
  }

  prepareBeatEnvelope() {
    if (this.beatEnvelopePromise || !this.context) return this.beatEnvelopePromise;
    this.beatEnvelopePromise = fetch(this.currentTrack.src)
      .then(response => {
        if (!response.ok) throw new Error("Unable to load soundtrack analysis data");
        return response.arrayBuffer();
      })
      .then(data => this.context.decodeAudioData(data))
      .then(buffer => {
        const samples = buffer.getChannelData(0);
        const windowSize = Math.max(512, Math.floor(buffer.sampleRate * 0.04));
        const energies = [];
        const lowPassMix = 1 - Math.exp(-2 * Math.PI * 190 / buffer.sampleRate);
        let lowPass = 0;
        for (let start = 0; start < samples.length; start += windowSize) {
          let sum = 0;
          const end = Math.min(samples.length, start + windowSize);
          for (let i = start; i < end; i += 2) {
            lowPass += (samples[i] - lowPass) * lowPassMix;
            sum += lowPass * lowPass;
          }
          energies.push(Math.sqrt(sum / Math.max(1, Math.ceil((end - start) / 2))));
        }
        const sorted = energies.slice().sort((a, b) => a - b);
        const floor = sorted[Math.floor(sorted.length * 0.18)] || 0;
        const ceiling = sorted[Math.floor(sorted.length * 0.92)] || floor + 0.001;
        const range = Math.max(0.0001, ceiling - floor);
        const envelope = new Float32Array(energies.length);
        let previous = 0;
        for (let i = 0; i < energies.length; i++) {
          const level = THREE.MathUtils.clamp((energies[i] - floor) / range, 0, 1);
          const onset = Math.max(0, level - previous);
          envelope[i] = THREE.MathUtils.clamp(Math.pow(level, 1.8) * 0.38 + onset * 4.6, 0, 1);
          previous += (level - previous) * 0.42;
        }
        this.beatEnvelopeStep = windowSize / buffer.sampleRate;
        this.beatEnvelope = envelope;
      })
      .catch(() => {
        this.beatEnvelope = null;
      });
    return this.beatEnvelopePromise;
  }

  updateRotor(tankRef) {
    const ctx = this.ensureContext();
    if (!ctx || !tankRef) return;
    this.ensureRotorLoop();
    const driveLevel = THREE.MathUtils.clamp(Math.abs(tankRef.speed) / tankRef.maxForwardSpeed, 0, 1);
    const verticalLevel = THREE.MathUtils.clamp(Math.abs(tankRef.verticalVelocity) / CONFIG.verticalThrust, 0, 1);
    const thrustLevel = input.KeyF && !(input.ShiftLeft || input.ShiftRight) ? 0.72 : 0;
    const motionLevel = Math.max(driveLevel, verticalLevel, thrustLevel);
    const targetGain = motionLevel > 0.025 ? (0.03 + motionLevel * 0.075) * this.rotorVolume : 0;
    const targetPulse = 14 + motionLevel * 11;
    this.rotorOutput.gain.setTargetAtTime(targetGain, ctx.currentTime, targetGain > 0 ? 0.12 : 0.28);
    this.rotorPulse.frequency.setTargetAtTime(targetPulse, ctx.currentTime, 0.18);
  }

  ensureRotorLoop() {
    if (this.rotorOutput || !this.context) return;
    const ctx = this.context;
    const mix = ctx.createGain();
    const pulseGain = ctx.createGain();
    const pulse = ctx.createOscillator();
    const pulseDepth = ctx.createGain();
    const lowRotor = ctx.createOscillator();
    const lowRotorGain = ctx.createGain();
    const rotorFilter = ctx.createBiquadFilter();
    const air = ctx.createBufferSource();
    const airFilter = ctx.createBiquadFilter();
    const airCeiling = ctx.createBiquadFilter();
    const airGain = ctx.createGain();

    mix.gain.value = 0;
    pulseGain.gain.value = 0.52;
    pulse.type = "square";
    pulse.frequency.value = 14;
    pulseDepth.gain.value = 0.48;
    lowRotor.type = "triangle";
    lowRotor.frequency.value = 54;
    lowRotorGain.gain.value = 0.12;
    rotorFilter.type = "lowpass";
    rotorFilter.frequency.value = 190;
    rotorFilter.Q.value = 1.1;

    air.buffer = this.createLoopNoiseBuffer(1.4);
    air.loop = true;
    airFilter.type = "highpass";
    airFilter.frequency.value = 360;
    airFilter.Q.value = 0.4;
    airCeiling.type = "lowpass";
    airCeiling.frequency.value = 3600;
    airCeiling.Q.value = 0.35;
    airGain.gain.value = 0.86;

    pulse.connect(pulseDepth).connect(pulseGain.gain);
    lowRotor.connect(lowRotorGain).connect(rotorFilter).connect(pulseGain);
    air.connect(airFilter).connect(airCeiling).connect(airGain).connect(pulseGain);
    pulseGain.connect(mix).connect(this.master);
    pulse.start();
    lowRotor.start();
    air.start();
    this.rotorOutput = mix;
    this.rotorPulse = pulse;
  }

  silenceRotor() {
    if (!this.rotorOutput || !this.context) return;
    this.rotorOutput.gain.setTargetAtTime(0, this.context.currentTime, 0.12);
  }

  setRotorVolume(volume) {
    this.rotorVolume = THREE.MathUtils.clamp(volume, 0, 1);
    if (this.rotorVolume === 0) this.silenceRotor();
  }

  setMusicAmmoBalance(balance) {
    this.musicAmmoBalance = THREE.MathUtils.clamp(balance, 0, 1);
    const angle = this.musicAmmoBalance * Math.PI * 0.5;
    this.music.volume = 0.82 * Math.cos(angle);
    if (this.ammoOutput && this.context) {
      const ammoGain = Math.SQRT2 * Math.sin(angle);
      this.ammoOutput.gain.setTargetAtTime(ammoGain, this.context.currentTime, 0.035);
    }
  }

  playEnemyFire() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;
    const blast = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    blast.type = "sawtooth";
    blast.frequency.setValueAtTime(260, now);
    blast.frequency.exponentialRampToValueAtTime(82, now + 0.18);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(240, now + 0.18);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.24, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    blast.connect(filter).connect(gain).connect(this.ammoOutput);
    blast.start(now);
    blast.stop(now + 0.23);
  }

  playDroneFire() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const chirp = ctx.createOscillator();
    const gain = ctx.createGain();
    chirp.type = "square";
    chirp.frequency.setValueAtTime(980, now);
    chirp.frequency.exponentialRampToValueAtTime(420, now + 0.07);
    gain.gain.setValueAtTime(0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    chirp.connect(gain).connect(this.ammoOutput);
    chirp.start(now);
    chirp.stop(now + 0.085);
  }

  playFire() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;

    const boom = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boom.type = "sine";
    boom.frequency.setValueAtTime(78, now);
    boom.frequency.exponentialRampToValueAtTime(38, now + 0.13);
    boomGain.gain.setValueAtTime(0.0001, now);
    boomGain.gain.exponentialRampToValueAtTime(0.55, now + 0.006);
    boomGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    boom.connect(boomGain).connect(this.ammoOutput);
    boom.start(now);
    boom.stop(now + 0.24);

    const crack = ctx.createBufferSource();
    crack.buffer = this.createNoiseBuffer(0.08);
    const crackFilter = ctx.createBiquadFilter();
    const crackGain = ctx.createGain();
    crackFilter.type = "bandpass";
    crackFilter.frequency.setValueAtTime(850, now);
    crackFilter.Q.setValueAtTime(0.85, now);
    crackGain.gain.setValueAtTime(0.0001, now);
    crackGain.gain.exponentialRampToValueAtTime(0.34, now + 0.004);
    crackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);
    crack.connect(crackFilter).connect(crackGain).connect(this.ammoOutput);
    crack.start(now);
  }

  playExplosion() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;

    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thump.type = "triangle";
    thump.frequency.setValueAtTime(95, now);
    thump.frequency.exponentialRampToValueAtTime(42, now + 0.16);
    thumpGain.gain.setValueAtTime(0.0001, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.46, now + 0.01);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    thump.connect(thumpGain).connect(this.ammoOutput);
    thump.start(now);
    thump.stop(now + 0.26);

    const snap = ctx.createBufferSource();
    snap.buffer = this.createNoiseBuffer(0.16);
    const snapFilter = ctx.createBiquadFilter();
    const snapGain = ctx.createGain();
    snapFilter.type = "highpass";
    snapFilter.frequency.setValueAtTime(720, now);
    snapGain.gain.setValueAtTime(0.0001, now);
    snapGain.gain.exponentialRampToValueAtTime(0.28, now + 0.006);
    snapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    snap.connect(snapFilter).connect(snapGain).connect(this.ammoOutput);
    snap.start(now);
    snap.stop(now + 0.17);
  }

  playHitMarker() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const ping = ctx.createOscillator();
    const gain = ctx.createGain();
    ping.type = "square";
    ping.frequency.setValueAtTime(1180, now);
    ping.frequency.exponentialRampToValueAtTime(720, now + 0.055);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    ping.connect(gain).connect(this.ammoOutput);
    ping.start(now);
    ping.stop(now + 0.075);
  }

  playResupplyClick() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const click = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    click.buffer = this.createNoiseBuffer(0.055);
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2600, now);
    filter.Q.value = 2.8;
    gain.gain.setValueAtTime(0.34, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.052);
    click.connect(filter).connect(gain).connect(this.master);
    click.start(now);
  }

  playRadioChatter() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;
    const syllables = [310, 375, 455, 520, 610, 690, 780, 860];
    const phraseLength = 1.9 + Math.random() * 0.9;
    const carrier = ctx.createOscillator();
    const formant = ctx.createBiquadFilter();
    const staticSource = ctx.createBufferSource();
    const staticFilter = ctx.createBiquadFilter();
    const gate = ctx.createGain();
    const staticGain = ctx.createGain();
    carrier.type = "sawtooth";
    formant.type = "bandpass";
    formant.Q.value = 5.5;
    staticSource.buffer = this.createNoiseBuffer(phraseLength);
    staticFilter.type = "bandpass";
    staticFilter.frequency.value = 1800;
    staticFilter.Q.value = 0.7;
    gate.gain.setValueAtTime(0.0001, now);
    staticGain.gain.setValueAtTime(0.0001, now);
    for (let t = 0; t < phraseLength; t += 0.13 + Math.random() * 0.08) {
      const f = syllables[Math.floor(Math.random() * syllables.length)] * (0.92 + Math.random() * 0.16);
      carrier.frequency.setValueAtTime(f, now + t);
      formant.frequency.setValueAtTime(f * (1.8 + Math.random() * 1.3), now + t);
      gate.gain.setValueAtTime(0.0001, now + t);
      gate.gain.linearRampToValueAtTime(0.12 + Math.random() * 0.08, now + t + 0.025);
      gate.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.11 + Math.random() * 0.09);
    }
    staticGain.gain.setValueAtTime(0.045, now);
    staticGain.gain.exponentialRampToValueAtTime(0.0001, now + phraseLength);
    carrier.connect(formant).connect(gate).connect(this.master);
    staticSource.connect(staticFilter).connect(staticGain).connect(this.master);
    carrier.start(now);
    carrier.stop(now + phraseLength);
    staticSource.start(now);
    staticSource.stop(now + phraseLength);
  }

  ensureContext() {
    if (this.context) return this.context;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    this.context = new AudioContextClass();
    this.master = this.context.createGain();
    this.ammoOutput = this.context.createGain();
    const limiter = this.context.createDynamicsCompressor();
    limiter.threshold.value = -4;
    limiter.knee.value = 2;
    limiter.ratio.value = 14;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.16;
    this.master.gain.value = CONFIG.gameAudioGain;
    this.ammoOutput.gain.value = Math.SQRT2 * Math.sin(this.musicAmmoBalance * Math.PI * 0.5);
    this.ammoOutput.connect(this.master);
    this.master.connect(limiter).connect(this.context.destination);
    return this.context;
  }

  createNoiseBuffer(duration) {
    const sampleRate = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, Math.max(1, Math.floor(sampleRate * duration)), sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const fade = 1 - i / data.length;
      data[i] = (Math.random() * 2 - 1) * fade;
    }
    return buffer;
  }

  createLoopNoiseBuffer(duration) {
    const sampleRate = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, Math.max(1, Math.floor(sampleRate * duration)), sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.78;
    }
    return buffer;
  }
}

initLights();
skyEnvironment = createSky();

terrain = new TerrainManager(scene);
tank = new Tank(scene);
tacticalGrid = new TacticalGrid(scene, terrain);
worldPortal = new WorldPortalManager(scene, terrain);
purpleMazePortal = new PurpleMazePortalManager(scene, terrain);
projectiles = new ProjectileManager(scene);
enemies = new EnemyManager(scene);
bootcampManager = new BootcampDuelManager(scene, terrain, tank, enemies);
prisonEscapees = new PrisonEscapeManager(scene, enemies);
wingmen = new WingmanManager(scene, terrain, tank);
skyDrones = new SkyDroneManager(scene);
surveillanceFleet = new SurveillanceFleet(scene, terrain);
giantTarantulas = new GiantTarantulaManager(terrain.compound, terrain);
refuelTowers = new RefuelTowerManager(scene, terrain);
missileTowers = new MissileTowerManager(scene, terrain);
audio = new AudioManager();
autopilot = new AutopilotManager();
bombingScope = new BombingScope(bombingScopePanel, bombingScopeCanvas, terrain, tank);
cockpitBombingScope = new BombingScope(cockpitOverlay, cockpitSonarCanvas, terrain, tank);

terrain.update(tank.group.position);
positionTankOnTerrain();
animate();

function animate() {
  const delta = Math.min(clock.getDelta(), 0.045);
  const previous = tank.group.position.clone();

  if (gameStarted && !gameEnded && !gamePaused) {
    updateFuel(delta);
    const controls = autopilot.update(delta, tank, terrain, input);
    tank.update(delta, controls, terrain, fuel > 0);
    if (terrain.worldMode === "maze" && tank.group.position.y > 17) {
      tank.group.position.y = 17;
      tank.verticalVelocity = Math.min(0, tank.verticalVelocity);
      tank.altitudeHoldY = Math.min(17, tank.altitudeHoldY ?? 17);
    }
    const moved = tank.group.position.distanceTo(previous);
    distanceTravelled += moved;
    const normalHoverY = terrain.getHeightAt(tank.group.position.x, tank.group.position.z) + CONFIG.tankHoverHeight;
    if (tank.group.position.y > normalHoverY + 1) runStats.flightTime += delta;
    worldPortal.update(delta, tank);
    purpleMazePortal.update(delta, tank);
    terrain.update(tank.group.position);
    tacticalGrid.update(delta, tank);
    if (isDogfightMode() && bootcampManager) {
      bootcampManager.update(delta);
      enemies.updateHostileShots(delta, tank);
      refuelTowers.update(delta, tank);
      missileTowers.update(delta, tank);
      projectiles.update(delta, input, tank, enemies, skyDrones, bootcampManager);
    } else {
      enemies.update(delta, tank);
      prisonEscapees.update(delta, tank);
      skyDrones.update(delta, tank);
      surveillanceFleet.update(delta, tank);
      giantTarantulas.update(delta, tank, enemies);
      wingmen.update(delta);
      refuelTowers.update(delta, tank);
      missileTowers.update(delta, tank);
      projectiles.update(delta, input, tank, enemies, skyDrones);
    }
    updateCamera(delta);
    updateHUD(delta);
    bombingScope.render(delta);
    cockpitBombingScope.render(delta);
    audio.update(delta, tank);
    tank.updateBeacons(audio.musicPulse);
  }

  if (!gamePaused) {
    updateExplosions(delta);
    updateShockwaves(delta);
    updateImpactEffects(delta);
    updatePyramidBeacons(delta);
    updateDroneOrbs(delta);
    updatePrisonBreachEffects(delta);
    updateToxicSmoke(delta);
    updateRadioTowers(delta);
    updateHomeBaseBeacon(delta);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function toggleGamePause() {
  if (!gameStarted || gameEnded) return;
  gamePaused = !gamePaused;
  for (const key of Object.keys(input)) input[key] = false;
  if (gamePaused) {
    sessionTimeRemaining = Math.max(0, (missionEndsAt - performance.now()) / 1000);
    audio.pause();
  } else {
    missionEndsAt = performance.now() + sessionTimeRemaining * 1000;
    audio.resume();
    clock.getDelta();
  }
  hud.pauseButton.textContent = gamePaused ? "Resume Game" : "Pause Game";
  hud.pauseButton.setAttribute("aria-pressed", String(gamePaused));
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
  if (gameMode === "cockpit" || mazeCockpitActive) {
    tank.group.updateMatrixWorld(true);
    const cockpitPosition = tank.group.localToWorld(new THREE.Vector3(0, 5.62, -5.15));
    const cockpitLook = tank.group.localToWorld(new THREE.Vector3(0, 4.92, -120));
    camera.position.copy(cockpitPosition);
    camera.fov = THREE.MathUtils.lerp(camera.fov, 74, 1 - Math.pow(0.01, delta));
    camera.updateProjectionMatrix();
    camera.lookAt(cockpitLook);
    cockpitCenterCannon.rotation.set(tank.turretPitch, tank.turret.rotation.y, 0, "YXZ");
    return;
  }
  const profile = cameraProfiles[cameraMode];
  const narrowViewport = window.innerWidth <= 620;
  const cameraDistance = profile.distance * (narrowViewport ? 1.35 : 1);
  const cameraHeight = profile.height + (narrowViewport ? 2.5 : 0);
  const behind = new THREE.Vector3(Math.sin(tank.group.rotation.y), 0, Math.cos(tank.group.rotation.y));
  const cameraTankPosition = tank.group.position.clone();
  if (tank.altitudeSettleTimer > 0 && tank.altitudeHoldY !== null) {
    cameraTankPosition.y = tank.altitudeHoldY;
  }
  const target = cameraTankPosition.clone().add(new THREE.Vector3(0, cameraHeight, 0)).addScaledVector(behind, cameraDistance);
  const chaseBlend = 1 - Math.pow(profile.settle, delta);
  camera.position.x = THREE.MathUtils.lerp(camera.position.x, target.x, chaseBlend);
  camera.position.y = target.y;
  camera.position.z = THREE.MathUtils.lerp(camera.position.z, target.z, chaseBlend);
  camera.fov = THREE.MathUtils.lerp(camera.fov, profile.fov, 1 - Math.pow(0.025, delta));
  camera.updateProjectionMatrix();
  const look = cameraTankPosition.clone().add(new THREE.Vector3(0, profile.lookHeight, 0));
  camera.lookAt(look);
}

function updateHUD(delta) {
  sessionTimeRemaining = Math.max(0, (missionEndsAt - performance.now()) / 1000);
  const missionSeconds = Math.ceil(sessionTimeRemaining);
  hud.sessionTime.textContent = `${Math.floor(missionSeconds / 60)}:${String(missionSeconds % 60).padStart(2, "0")}`;
  hud.missionCountdown.textContent = `${Math.floor(missionSeconds / 60)}:${String(missionSeconds % 60).padStart(2, "0")}`;
  const northSouth = tank.group.position.z <= 0 ? "N" : "S";
  const eastWest = tank.group.position.x >= 0 ? "E" : "W";
  hud.coordinates.textContent = `${northSouth} ${String(Math.round(Math.abs(tank.group.position.z))).padStart(4, "0")} | ${eastWest} ${String(Math.round(Math.abs(tank.group.position.x))).padStart(4, "0")}`;
  const baseDistance = Math.hypot(tank.group.position.x, tank.group.position.z);
  const baseBearingX = -tank.group.position.x;
  const baseBearingZ = -tank.group.position.z;
  const baseDirection = Math.abs(baseBearingZ) >= Math.abs(baseBearingX)
    ? (baseBearingZ <= 0 ? "N" : "S")
    : (baseBearingX >= 0 ? "E" : "W");
  hud.baseRange.textContent = `BASE ${baseDirection} ${Math.round(baseDistance)} m`;
  if (sessionTimeRemaining <= 30 && returnToBaseWarningArmed) {
    returnToBaseWarningArmed = false;
    audio.speakReturnToBase();
    hud.status.textContent = "RETURN TO BASE. Black-circle recovery bonus available.";
    statusTimer = 5;
  }
  hud.speed.textContent = `${Math.round(Math.abs(tank.speed) * 2.4)} kph`;
  hud.turret.textContent = `Yaw ${Math.round(THREE.MathUtils.radToDeg(wrapAngle(tank.turret.rotation.y)))} / Pitch ${THREE.MathUtils.radToDeg(tank.turretPitch).toFixed(1)} deg`;
  hud.distance.textContent = `${(distanceTravelled / 1000).toFixed(1)} km`;
  hud.destroyed.textContent = destroyedEnemies;
  hud.missilesFired.textContent = runStats.missilesFired;
  hud.fuel.textContent = Math.max(0, Math.ceil(fuel));
  hud.ammo.textContent = ammo;
  hud.missiles.textContent = tank.getMissileCount();
  hud.hitPoints.textContent = `${hitPoints} / ${CONFIG.maxHitPoints}`;
  hud.hitPoints.style.color = hitPoints <= 30 ? "#ff6658" : "#d8f8ff";
  if (gameMode === "cockpit" || mazeCockpitActive) {
    const groundAltitude = terrain.getHeightAt(tank.group.position.x, tank.group.position.z);
    cockpitReadouts.armor.textContent = String(Math.max(0, Math.ceil(hitPoints))).padStart(3, "0");
    cockpitReadouts.speed.textContent = String(Math.round(Math.abs(tank.speed) * 2.4)).padStart(3, "0");
    cockpitReadouts.altitude.textContent = String(Math.max(0, Math.round(tank.group.position.y - groundAltitude))).padStart(3, "0");
    cockpitReadouts.ammo.textContent = String(ammo).padStart(4, "0");
    cockpitReadouts.missiles.textContent = String(tank.getMissileCount());
    cockpitReadouts.rival.textContent = String(Math.max(0, Math.ceil(bootcampManager?.health || 0))).padStart(3, "0");
    cockpitAlertTimer = Math.max(0, cockpitAlertTimer - delta);
    if (cockpitAlertTimer <= 0) {
      cockpitOverlay.classList.remove("red-alert");
      cockpitReadouts.warning.textContent = hitPoints < 50 ? "DAMAGE CRITICAL" : "SYSTEM NOMINAL";
    }
  }
  if (hud.wingman1 && wingmen) {
    const formatWingman = unit => unit.dead ? "DESTROYED" : `${Math.ceil(unit.health)} HP | ${unit.state.toUpperCase()}`;
    hud.wingman1.textContent = `WINGMAN 1  ${formatWingman(wingmen.units[0])}`;
    hud.wingman2.textContent = `WINGMAN 2  ${formatWingman(wingmen.units[1])}`;
  }
  statusTimer -= delta;
  if (statusTimer <= 0) {
    currentStatus = (currentStatus + 1) % poeticStatuses.length;
    hud.status.textContent = poeticStatuses[currentStatus];
    statusTimer = 10 + Math.random() * 8;
  }
  if (sessionTimeRemaining <= 0) {
    hud.status.textContent = "Soundtrack mission complete.";
    endRun();
  }
}

function updateFuel(delta) {
  if (fuel <= 0) {
    fuel = 0;
    tank.speed = moveToward(tank.speed, 0, tank.friction * delta * 2.6);
    if (statusTimer <= 0.2) {
      hud.status.textContent = "Fuel exhausted. Find a resupply tower.";
      statusTimer = 2.2;
    }
    return;
  }
  fuel = Math.max(0, fuel - (CONFIG.fuelDrainPerMinute / 60) * delta);
  if (fuel === 0) {
    hud.status.textContent = "Fuel exhausted. Movement systems offline.";
    statusTimer = 4;
  }
}

function triggerCockpitRedAlert() {
  if (gameMode !== "cockpit") return;
  cockpitAlertTimer = 2.4;
  cockpitOverlay.classList.add("red-alert");
  cockpitReadouts.warning.textContent = "REAR THREAT";
  hud.status.textContent = "RED ALERT: hostile fire approaching from the rear.";
  statusTimer = 3;
  audio.speakRedAlert();
}

function resupplyTank() {
  runStats.resupplies++;
  fuel = CONFIG.maxFuel;
  ammo = CONFIG.maxAmmo;
  const previousHitPoints = hitPoints;
  hitPoints = Math.min(CONFIG.maxHitPoints, hitPoints + 25);
  if (hitPoints >= 50) criticalDamageWarningArmed = true;
  const repairedHitPoints = hitPoints - previousHitPoints;
  hud.status.textContent = `Resupply complete. Fuel and ammo restored; armor repaired +${repairedHitPoints}.`;
  statusTimer = 4;
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
  const mat = new THREE.MeshStandardMaterial({ color: 0x101820, metalness: 0.82, roughness: 0.3 });
  const accent = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.82 });
  const warning = new THREE.MeshBasicMaterial({ color: 0xff2b20, transparent: true, opacity: 0.9 });
  for (let i = 0; i < 11; i++) {
    const h = 10 + seededRandom(i * 15) * 42;
    const w = 5 + seededRandom(i * 17) * 6;
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.2, w, h, 4), mat);
    spire.position.set((i - 5) * 10, h * 0.5, seededRandom(i * 21) * 15);
    spire.rotation.y = Math.PI * 0.25;
    group.add(spire);
    const band = new THREE.Mesh(new THREE.BoxGeometry(w * 1.05, 0.28, 0.16), i % 3 === 0 ? warning : accent);
    band.position.set(spire.position.x, h * 0.62, spire.position.z - w * 0.58);
    group.add(band);
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
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.32, w, h, 4), towerMat);
    tower.position.set(x, h * 0.5, z);
    tower.rotation.y = Math.PI * 0.25;
    tower.rotation.z = (seededRandom(seed + i * 17) - 0.5) * 0.14;
    tower.castShadow = true;
    group.add(tower);

    const warningBand = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.22, 0.14), materials.redEye);
    warningBand.position.set(x, h * 0.68, z - w * 0.55);
    group.add(warningBand);

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
  const color = options.color ?? 0xff3424;
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
    const coreOpacity = options.coreOpacity ?? 0.9;
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.38, 12, 8),
      new THREE.MeshBasicMaterial({ color: options.coreColor, transparent: true, opacity: coreOpacity })
    );
    group.add(core);
    explosionEffects.push({ group, sphere, core, life, maxLife: life, growth, opacity, coreOpacity });
    scene.add(group);
    return;
  }
  scene.add(group);
  explosionEffects.push({ group, sphere, life, maxLife: life, growth, opacity });
}

function createBombShockwaves(position) {
  while (shockwaveEffects.length > 15) {
    const oldest = shockwaveEffects.shift();
    scene.remove(oldest.ring);
    disposeObject(oldest.ring);
  }
  for (let i = 0; i < 3; i++) {
    const opacity = 0.2 - i * 0.035;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.8 + i * 1.15, 0.28 - i * 0.045, 8, 64),
      new THREE.MeshBasicMaterial({
        color: i === 2 ? 0xffb36b : 0xff5a2a,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    ring.position.copy(position);
    ring.position.y += 0.35 + i * 0.04;
    ring.rotation.x = Math.PI * 0.5;
    ring.visible = i === 0;
    scene.add(ring);
    shockwaveEffects.push({ ring, delay: i * 0.09, life: 0.72, maxLife: 0.72, growth: 8.5 + i * 1.2, opacity });
  }
}

function registerPlayerHit(shot, position, damage, targetType) {
  if (shot.noPlayerStats) return;
  runStats.damageDealt += Math.max(0, damage);
  const isBullet = shot.kind !== "bomb";
  if (isBullet && !shot.statsHitRegistered) {
    shot.statsHitRegistered = true;
    runStats.shotsHit++;
    if (shot.kind === "missile") runStats.missileHits++;
    const shotDistance = shot.origin ? shot.origin.distanceTo(position) : 0;
    runStats.longestShot = Math.max(runStats.longestShot, shotDistance);
    if (shot.bounces > 0 && (targetType === "drone" || targetType === "object" || targetType === "prisoner")) runStats.ricochetKills++;
  }
  if (targetType === "object") runStats.objectsDestroyed++;
  flashHitFeedback();
  showDamageNumber(position, damage);
  createImpactSparks(position, shot.direction || new THREE.Vector3(0, 1, 0));
  audio.playHitMarker();
}

function flashHitFeedback() {
  hud.crosshair.classList.remove("flash");
  hud.hitMarker.classList.remove("active");
  void hud.hitMarker.offsetWidth;
  hud.crosshair.classList.add("flash");
  hud.hitMarker.classList.add("active");
  window.setTimeout(() => {
    hud.crosshair.classList.remove("flash");
    hud.hitMarker.classList.remove("active");
  }, 130);
}

function showDamageNumber(position, damage) {
  const projected = position.clone().project(camera);
  if (projected.z < -1 || projected.z > 1) return;
  const number = document.createElement("span");
  number.className = "damage-number";
  number.textContent = `-${damage}`;
  number.style.left = `${(projected.x * 0.5 + 0.5) * window.innerWidth}px`;
  number.style.top = `${(-projected.y * 0.5 + 0.5) * window.innerHeight}px`;
  hud.damageNumbers.appendChild(number);
  window.setTimeout(() => number.remove(), 800);
}

function createImpactSparks(position, direction) {
  while (impactEffects.length >= 10) {
    const oldest = impactEffects.shift();
    scene.remove(oldest.group);
    disposeObject(oldest.group);
  }
  const group = new THREE.Group();
  group.position.copy(position);
  const sparks = [];
  for (let i = 0; i < 7; i++) {
    const spark = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 5, 4),
      new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffe49a : 0xff5a24, transparent: true, opacity: 1 })
    );
    const velocity = direction.clone().multiplyScalar(-5 - Math.random() * 5);
    velocity.x += (Math.random() - 0.5) * 14;
    velocity.y += 4 + Math.random() * 10;
    velocity.z += (Math.random() - 0.5) * 14;
    group.add(spark);
    sparks.push({ mesh: spark, velocity });
  }
  scene.add(group);
  impactEffects.push({ group, sparks, life: 0.34, maxLife: 0.34 });
}

function updateImpactEffects(delta) {
  for (let i = impactEffects.length - 1; i >= 0; i--) {
    const effect = impactEffects[i];
    effect.life -= delta;
    for (const spark of effect.sparks) {
      spark.velocity.y -= 24 * delta;
      spark.mesh.position.addScaledVector(spark.velocity, delta);
      spark.mesh.material.opacity = Math.max(0, effect.life / effect.maxLife);
    }
    if (effect.life <= 0) {
      scene.remove(effect.group);
      disposeObject(effect.group);
      impactEffects.splice(i, 1);
    }
  }
}

function damagePlayer(amount) {
  if (sessionTimeRemaining > CONFIG.sessionDuration - 8) return;
  if (gameEnded) return;
  hitPoints = Math.max(0, hitPoints - amount);
  if (hitPoints < 50 && criticalDamageWarningArmed) {
    criticalDamageWarningArmed = false;
    audio.speakDamageWarning();
  }
  hud.hitPoints.textContent = `${hitPoints} / ${CONFIG.maxHitPoints}`;
  hud.hitPoints.style.color = hitPoints <= 30 ? "#ff6658" : "#d8f8ff";
  hud.damageFlash.classList.remove("active");
  void hud.damageFlash.offsetWidth;
  hud.damageFlash.classList.add("active");
  window.setTimeout(() => hud.damageFlash.classList.remove("active"), 90);
  hud.status.textContent = `Enemy shell hit. ${hitPoints} hit points remain.`;
  statusTimer = 3;
  tank.bumpTimer = 0.5;
  if (hitPoints <= 0) {
    hud.status.textContent = "HULL FAILURE. HOVERTANK destruction imminent.";
    createHovertankDestruction();
    endRun(2600);
  }
}

function createHovertankDestruction() {
  const center = tank.group.position.clone().add(new THREE.Vector3(0, 3.2, 0));
  const bursts = [
    { delay: 0, offset: [0, 0, 0], radius: 3.8, growth: 38, life: 1.05 },
    { delay: 150, offset: [-4.5, 0.4, -3], radius: 2.4, growth: 31, life: 0.8 },
    { delay: 260, offset: [4.8, 0.2, 2.8], radius: 2.7, growth: 34, life: 0.86 },
    { delay: 390, offset: [-5, -0.8, 4], radius: 2.2, growth: 29, life: 0.76 },
    { delay: 520, offset: [3.8, 1.2, -4.6], radius: 2.8, growth: 36, life: 0.9 },
    { delay: 700, offset: [0, 1.8, 0], radius: 5.2, growth: 46, life: 1.25 }
  ];
  for (const burst of bursts) {
    window.setTimeout(() => {
      const position = center.clone().add(new THREE.Vector3(...burst.offset));
      createExplosion(position, {
        radius: burst.radius,
        growth: burst.growth,
        life: burst.life,
        color: 0xff2812,
        opacity: 0.88,
        coreColor: 0xfff3bd,
        coreOpacity: 1
      });
      audio.playExplosion();
    }, burst.delay);
  }
  createBombShockwaves(tank.group.position.clone());
  window.setTimeout(() => createBombShockwaves(tank.group.position.clone()), 620);
  window.setTimeout(() => {
    tank.group.visible = false;
    document.querySelector("#hit-points-panel").hidden = true;
  }, 1050);
}

function endRun(summaryDelay = 0) {
  if (gameEnded) return;
  gameEnded = true;
  input.fireHeld = false;
  tank.speed = 0;
  if (bootcampManager) bootcampManager.deactivate();
  audio.silenceRotor();
  audio.stopMusic();
  if (summaryDelay > 0) {
    window.setTimeout(showRunSummary, summaryDelay);
  } else {
    showRunSummary();
  }
}

function calculateCompositeScore() {
  const isBootcamp = isDogfightMode();
  const accuracyRatio = runStats.shotsFired > 0
    ? Math.min(1, runStats.shotsHit / runStats.shotsFired)
    : 0;
  const confirmedEliminations =
    runStats.dronesDestroyed +
    runStats.enemyVehiclesDestroyed +
    runStats.prisonersStopped +
    runStats.spidersDestroyed +
    runStats.bootcampOpponentsDefeated;
  const accuracyQualified = runStats.shotsFired >= 10 || confirmedEliminations >= 5;
  const accuracyMultiplier = accuracyQualified ? 0.85 + accuracyRatio * 0.65 : 1;
  const combatBase =
    runStats.damageDealt * 8 +
    runStats.dronesDestroyed * 100 +
    runStats.enemyVehiclesDestroyed * 300 +
    runStats.objectsDestroyed * 75 +
    runStats.missileHits * 125 +
    runStats.ricochetKills * 250 +
    runStats.prisonersStopped * 150 +
    runStats.spidersDestroyed * 750 +
    (isBootcamp ? runStats.bootcampOpponentsDefeated * 2500 + runStats.bootcampTunnels * 900 : 0);
  const adjustedCombat = Math.round(combatBase * accuracyMultiplier);
  const parkedInArena = !isBootcamp && terrain.worldMode === "compound" && hitPoints > 0 && Math.hypot(tank.group.position.x, tank.group.position.z) <= 48 && Math.abs(tank.speed) < 2.5;
  const returnMultiplier = parkedInArena ? 1.25 : 1;
  const wingmanSurvivors = !isBootcamp && wingmen ? wingmen.units.filter(unit => !unit.dead).length : 0;
  const wingmanMultiplier = isBootcamp ? 1 : 1 + wingmanSurvivors * 0.1;
  const survivalMultiplier = 0.75 + THREE.MathUtils.clamp(hitPoints / CONFIG.maxHitPoints, 0, 1) * 0.25;
  const total = runStats.damageDealt > 0
    ? Math.max(0, Math.round(adjustedCombat * survivalMultiplier * wingmanMultiplier * returnMultiplier))
    : 0;
  const fieldScore = Math.max(0, total - adjustedCombat);
  const arenaBonus = parkedInArena && adjustedCombat > 0
    ? Math.round(adjustedCombat * survivalMultiplier * wingmanMultiplier * 0.25)
    : 0;
  const wingmanBonus = adjustedCombat > 0
    ? Math.round(adjustedCombat * survivalMultiplier * (wingmanMultiplier - 1))
    : 0;
  const penalties = 0;
  const rank = total >= 100000 ? "Protocol Legend"
    : total >= 50000 ? "Planetary Ace"
      : total >= 25000 ? "Warden"
        : total >= 10000 ? "Enforcer"
          : "Recruit";
  return { accuracyRatio, accuracyMultiplier, accuracyQualified, adjustedCombat, fieldScore, arenaBonus, wingmanBonus, survivalMultiplier, wingmanMultiplier, returnMultiplier, penalties, total, rank };
}

function showRunSummary() {
  const score = calculateCompositeScore();
  finalScoreForLeaderboard = score;
  recordScoreButton.disabled = false;
  const accuracy = Math.round(score.accuracyRatio * 100);
  const minutes = Math.floor(runStats.flightTime / 60);
  const seconds = Math.floor(runStats.flightTime % 60).toString().padStart(2, "0");
  document.querySelector("#stat-drones").textContent = runStats.dronesDestroyed;
  document.querySelector("#stat-vehicles").textContent = runStats.enemyVehiclesDestroyed;
  document.querySelector("#stat-prisoners").textContent = runStats.prisonersStopped;
  document.querySelector("#stat-spiders").textContent = runStats.spidersDestroyed;
  const bootcampOpponentStat = document.querySelector("#stat-bootcamp-opponents");
  const bootcampTunnelStat = document.querySelector("#stat-bootcamp-tunnels");
  if (bootcampOpponentStat) bootcampOpponentStat.textContent = runStats.bootcampOpponentsDefeated.toString();
  if (bootcampTunnelStat) bootcampTunnelStat.textContent = runStats.bootcampTunnels.toString();
  const wingman1 = wingmen.units[0];
  const wingman2 = wingmen.units[1];
  document.querySelector("#stat-wingman-1").textContent = wingman1.dead ? "DESTROYED" : `${Math.ceil(wingman1.health)} / ${CONFIG.wingmanMaxHitPoints}`;
  document.querySelector("#stat-wingman-2").textContent = wingman2.dead ? "DESTROYED" : `${Math.ceil(wingman2.health)} / ${CONFIG.wingmanMaxHitPoints}`;
  document.querySelector("#stat-wingman-bonus").textContent = score.wingmanBonus > 0 ? `+${score.wingmanBonus.toLocaleString()}` : "0";
  document.querySelector("#stat-missiles-fired").textContent = runStats.missilesFired;
  document.querySelector("#stat-missile-hits").textContent = runStats.missileHits;
  document.querySelector("#stat-accuracy").textContent = `${accuracy}%`;
  document.querySelector("#stat-multiplier").textContent = `x${score.accuracyMultiplier.toFixed(2)}`;
  document.querySelector("#stat-longest").textContent = `${Math.round(runStats.longestShot)} m`;
  document.querySelector("#stat-ricochets").textContent = runStats.ricochetKills;
  document.querySelector("#stat-objects").textContent = runStats.objectsDestroyed;
  document.querySelector("#stat-flight").textContent = `${minutes}:${seconds}`;
  document.querySelector("#stat-shots-fired").textContent = runStats.shotsFired;
  document.querySelector("#stat-shots-hit").textContent = runStats.shotsHit;
  document.querySelector("#stat-damage-dealt").textContent = Math.round(runStats.damageDealt).toLocaleString();
  document.querySelector("#stat-distance").textContent = `${(distanceTravelled / 1000).toFixed(2)} km`;
  document.querySelector("#stat-armor").textContent = `${hitPoints} / ${CONFIG.maxHitPoints}`;
  document.querySelector("#stat-resupplies").textContent = runStats.resupplies;
  document.querySelector("#stat-collisions").textContent = runStats.collisions;
  document.querySelector("#stat-combat-score").textContent = score.adjustedCombat.toLocaleString();
  document.querySelector("#stat-field-score").textContent = score.fieldScore.toLocaleString();
  document.querySelector("#stat-arena-bonus").textContent = score.arenaBonus > 0 ? `+${score.arenaBonus.toLocaleString()}` : "0";
  document.querySelector("#stat-penalties").textContent = `-${score.penalties.toLocaleString()}`;
  document.querySelector("#stat-score").textContent = score.total.toLocaleString();
  document.querySelector("#stat-rank").textContent = score.rank;
  hud.runSummary.hidden = false;
}

function loadHighScores() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(HIGH_SCORE_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(entry => entry && typeof entry.score === "number").slice(0, 10) : [];
  } catch (_) {
    return [];
  }
}

function renderHighScores() {
  const scores = loadHighScores();
  highScoreList.replaceChildren();
  if (!scores.length) {
    const empty = document.createElement("li");
    empty.textContent = "No recorded missions yet.";
    highScoreList.appendChild(empty);
    return;
  }
  for (const entry of scores) {
    const item = document.createElement("li");
    const row = document.createElement("span");
    const name = document.createElement("strong");
    const rank = document.createElement("em");
    const score = document.createElement("b");
    name.textContent = entry.callSign;
    rank.textContent = `${entry.mode || "Standard"} | ${entry.rank}`;
    score.textContent = entry.score.toLocaleString();
    row.append(name, rank, score);
    item.appendChild(row);
    highScoreList.appendChild(item);
  }
}

function recordHighScore() {
  if (!finalScoreForLeaderboard || recordScoreButton.disabled) return;
  const callSign = playerCallSign.value.trim().replace(/[^a-z0-9 _-]/gi, "").slice(0, 16).toUpperCase() || "UNKNOWN";
  const scores = loadHighScores();
  scores.push({
    callSign,
    score: finalScoreForLeaderboard.total,
    rank: finalScoreForLeaderboard.rank,
    mode: getGameModeLabel(),
    recordedAt: Date.now()
  });
  scores.sort((a, b) => b.score - a.score || a.recordedAt - b.recordedAt);
  try {
    window.localStorage.setItem(HIGH_SCORE_STORAGE_KEY, JSON.stringify(scores.slice(0, 10)));
    window.localStorage.setItem("hovertank-call-sign", callSign);
  } catch (_) {
    hud.status.textContent = "High-score storage is unavailable in this browser.";
    return;
  }
  playerCallSign.value = callSign;
  recordScoreButton.disabled = true;
  renderHighScores();
}

function registerUniverseTarget(object, radius, options = {}) {
  const playerDestructible = options.playerDestructible !== false;
  object.userData.destructible = playerDestructible;
  universeTargets.push({ object, radius, position: object.position.clone(), playerDestructible });
}

function destroyUniverseTarget(target) {
  if (!target || !target.object.parent) return false;
  createExplosion(target.position);
  target.object.parent.remove(target.object);
  disposeObject(target.object);
  const index = universeTargets.indexOf(target);
  if (index >= 0) universeTargets.splice(index, 1);
  return true;
}

function hitUniverseTargetAlongSegment(start, end, radius) {
  let closest = null;
  let closestDistance = Infinity;
  for (const target of universeTargets) {
    if (!target.object.parent || !target.playerDestructible) continue;
    const hitRadius = radius + target.radius;
    const distanceSq = distanceToSegmentSquared(target.position, start, end);
    if (distanceSq <= hitRadius * hitRadius && distanceSq < closestDistance) {
      closest = target;
      closestDistance = distanceSq;
    }
  }
  return destroyUniverseTarget(closest);
}

function destroyUniverseNear(position, radius) {
  let destroyed = 0;
  for (const target of [...universeTargets]) {
    if (!target.object.parent || !target.playerDestructible) continue;
    const hitRadius = radius + target.radius;
    const dx = target.position.x - position.x;
    const dy = target.position.y - position.y;
    const dz = target.position.z - position.z;
    if (dx * dx + dy * dy + dz * dz <= hitRadius * hitRadius && destroyUniverseTarget(target)) destroyed++;
  }
  return destroyed;
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
      effect.core.material.opacity = effect.coreOpacity * fade;
    }
    if (effect.life <= 0) {
      scene.remove(effect.group);
      disposeObject(effect.group);
      explosionEffects.splice(i, 1);
    }
  }
}

function updateShockwaves(delta) {
  for (let i = shockwaveEffects.length - 1; i >= 0; i--) {
    const effect = shockwaveEffects[i];
    if (effect.delay > 0) {
      effect.delay -= delta;
      continue;
    }
    effect.ring.visible = true;
    effect.life -= delta;
    effect.ring.scale.addScalar(delta * effect.growth);
    const fade = Math.max(0, effect.life / effect.maxLife);
    effect.ring.material.opacity = effect.opacity * fade * fade;
    if (effect.life <= 0) {
      scene.remove(effect.ring);
      disposeObject(effect.ring);
      shockwaveEffects.splice(i, 1);
    }
  }
}

function updatePyramidBeacons(delta) {
  beaconTime += delta;
  for (let i = pyramidBeacons.length - 1; i >= 0; i--) {
    const beacon = pyramidBeacons[i];
    if (!beacon.root.parent || !beacon.root.parent.parent) {
      pyramidBeacons.splice(i, 1);
      continue;
    }
    const pulse = 0.5 + 0.5 * Math.sin(beaconTime * 5.2 + beacon.phase);
    const blink = pulse > 0.58 ? 1 : 0.16;
    beacon.beacon.material.opacity = 0.42 + blink * 0.58;
    beacon.halo.material.opacity = 0.06 + blink * 0.34;
    beacon.halo.scale.setScalar(0.85 + blink * 0.45);
  }
}

function updatePrisonBreachEffects(delta) {
  for (let i = prisonBreachEffects.length - 1; i >= 0; i--) {
    const effect = prisonBreachEffects[i];
    if (!effect.root.parent || !effect.root.parent.parent) {
      prisonBreachEffects.splice(i, 1);
      continue;
    }
    effect.time += delta;
    for (const flame of effect.flames) {
      const flicker = 0.78 + Math.sin(effect.time * 11 + flame.phase) * 0.18 + Math.sin(effect.time * 17 + flame.phase) * 0.08;
      flame.mesh.scale.set(0.9 + flicker * 0.18, flicker, 0.9 + flicker * 0.12);
      flame.mesh.position.y = flame.baseY + Math.sin(effect.time * 8 + flame.phase) * 0.35;
    }
    for (const plume of effect.smoke) {
      const cycle = (effect.time * 0.065 + plume.phase) % 1;
      plume.mesh.position.y = plume.baseY + cycle * 13;
      plume.mesh.position.x += Math.sin(effect.time * 0.7 + plume.phase * 8) * delta * 0.42;
      plume.mesh.material.opacity = Math.sin(cycle * Math.PI) * 0.3;
      const scale = 0.72 + cycle * 0.75;
      plume.mesh.scale.set(scale, scale * 1.35, scale);
    }
  }
}

function updateToxicSmoke(delta) {
  toxicSmokeTime += delta;
  for (let i = toxicSmokeEffects.length - 1; i >= 0; i--) {
    const effect = toxicSmokeEffects[i];
    if (!effect.root.parent || !effect.root.parent.parent) {
      toxicSmokeEffects.splice(i, 1);
      continue;
    }
    effect.puffs.forEach((puff, index) => {
      const cycle = THREE.MathUtils.euclideanModulo(toxicSmokeTime * 0.34 + effect.phase + index * 0.19, 1);
      puff.position.y = cycle * 32;
      puff.position.x = Math.sin(toxicSmokeTime * 1.1 + effect.phase + index) * (2 + cycle * 7);
      puff.position.z = Math.cos(toxicSmokeTime * 0.83 + effect.phase * 0.7 + index) * (1.5 + cycle * 5);
      const scale = 4.2 + cycle * 10;
      puff.scale.set(scale, scale * 0.82, scale);
    });
  }
}

function updateRadioTowers(delta) {
  for (let i = radioTowerEffects.length - 1; i >= 0; i--) {
    const effect = radioTowerEffects[i];
    if (!effect.root.parent || !effect.halo.parent) {
      radioTowerEffects.splice(i, 1);
      continue;
    }
    const pulse = 0.5 + Math.sin(toxicSmokeTime * 4.8 + effect.phase) * 0.5;
    effect.sphere.scale.setScalar(1.05 + pulse * 0.42);
    effect.core.scale.setScalar(0.82 + pulse * 0.72);
    effect.halo.scale.setScalar(0.8 + pulse * 1.15);
    effect.halo.material.opacity = 0.24 + pulse * 0.66;
  }
}

function updateHomeBaseBeacon(delta) {
  if (!homeBaseBeacon || !homeBaseBeacon.group.visible) return;
  homeBaseBeacon.time += delta;
  const pulse = 0.5 + Math.sin(homeBaseBeacon.time * 2.2) * 0.5;
  homeBaseBeacon.orb.scale.setScalar(0.94 + pulse * 0.16);
  homeBaseBeacon.halo.scale.setScalar(0.9 + pulse * 0.34);
  homeBaseBeacon.halo.material.opacity = 0.19 + pulse * 0.21;
  homeBaseBeacon.beam.material.opacity = 0.067 + pulse * 0.034;
  homeBaseBeacon.spotlight.intensity = 42 + pulse * 18;
  for (let i = 0; i < homeBaseBeacon.haze.length; i++) {
    const particle = homeBaseBeacon.haze[i];
    const drift = homeBaseBeacon.time * (0.06 + particle.phase * 0.035);
    particle.puff.position.x = Math.cos(particle.angle + drift) * particle.radius + Math.sin(homeBaseBeacon.time * 0.25 + i) * 2.5;
    particle.puff.position.z = Math.sin(particle.angle + drift) * particle.radius + Math.cos(homeBaseBeacon.time * 0.21 + i) * 2.5;
    particle.puff.material.opacity = (0.018 + (i % 4) * 0.006) * (0.72 + pulse * 0.4);
  }
}

function setHomeBaseBeaconWorld(mode) {
  if (!homeBaseBeacon) return;
  homeBaseBeacon.group.position.set(0, 0, mode === "prison" ? -300 : 0);
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

var pyramidModelPromise;

function loadPyramidModel() {
  if (!pyramidModelPromise) {
    pyramidModelPromise = new Promise((resolve, reject) => {
      const loader = new THREE.OBJLoader();
      loader.load("assets/models/Pyramid_Four-Sides_001.obj?v=imported-pyramid-1", resolve, undefined, reject);
    });
  }
  return pyramidModelPromise;
}

function projectPyramidFaceUvs(sourceGeometry, modelBounds) {
  const geometry = sourceGeometry.index ? sourceGeometry.toNonIndexed() : sourceGeometry.clone();
  const positions = geometry.getAttribute("position");
  const uvs = new Float32Array(positions.count * 2);
  const size = modelBounds.getSize(new THREE.Vector3());
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const edge = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (let i = 0; i < positions.count; i += 3) {
    a.fromBufferAttribute(positions, i);
    b.fromBufferAttribute(positions, i + 1);
    c.fromBufferAttribute(positions, i + 2);
    normal.subVectors(b, a).cross(edge.subVectors(c, a)).normalize();
    const useDepth = Math.abs(normal.x) >= Math.abs(normal.z);

    for (let vertex = 0; vertex < 3; vertex++) {
      const index = i + vertex;
      const x = positions.getX(index);
      const y = positions.getY(index);
      const z = positions.getZ(index);
      let u = useDepth
        ? (z - modelBounds.min.z) / Math.max(size.z, 0.001)
        : (x - modelBounds.min.x) / Math.max(size.x, 0.001);
      if ((useDepth && normal.x < 0) || (!useDepth && normal.z > 0)) u = 1 - u;
      uvs[index * 2] = u;
      uvs[index * 2 + 1] = (y - modelBounds.min.y) / Math.max(size.y, 0.001);
    }
  }

  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

function addImportedPyramid(group, radius, height) {
  loadPyramidModel().then(source => {
    if (!group.parent) return;
    const model = source.clone(true);
    const sourceBounds = new THREE.Box3().setFromObject(model);
    const sourceSize = sourceBounds.getSize(new THREE.Vector3());
    const sourceCenter = sourceBounds.getCenter(new THREE.Vector3());

    model.traverse(child => {
      if (!child.isMesh) return;
      child.geometry = projectPyramidFaceUvs(child.geometry, sourceBounds);
      child.material = group.userData.useChrome ? materials.playerChrome : pyramidPanelMaterial;
      child.castShadow = true;
      child.receiveShadow = true;
    });

    const scale = Math.min(height / Math.max(sourceSize.y, 0.001), radius * 2 / Math.max(sourceSize.x, sourceSize.z, 0.001));
    const modelTop = sourceSize.y * scale;
    model.scale.setScalar(scale);
    model.position.set(-sourceCenter.x * scale, -sourceBounds.min.y * scale, -sourceCenter.z * scale);
    model.rotation.y = Math.PI / 4;
    group.add(model);

    const apexNeedle = group.getObjectByName("pyramid-apex-needle");
    const beacon = group.getObjectByName("pyramid-beacon");
    const halo = group.getObjectByName("pyramid-beacon-halo");
    if (apexNeedle) apexNeedle.position.y = modelTop + 1.25;
    if (beacon) beacon.position.y = modelTop + 2.65;
    if (halo && beacon) halo.position.copy(beacon.position);
    group.userData.refreshCollisionBounds?.();
  }).catch(error => console.error("Unable to load pyramid model", error));
}

function createHighTechPyramid(seed) {
  const group = new THREE.Group();
  const radius = 10 + seededRandom(seed) * 9;
  const height = 19 + seededRandom(seed + 1) * 21;
  addImportedPyramid(group, radius, height);

  const podium = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.84, radius * 1.08, 1.15, 4), materials.architectureVent);
  podium.position.y = 0.58;
  podium.rotation.y = Math.PI / 4;
  group.add(podium);

  const apexNeedle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 2.5, 6), materials.pyramidTrim);
  apexNeedle.name = "pyramid-apex-needle";
  apexNeedle.position.y = height + 1.25;
  group.add(apexNeedle);

  const beaconMaterial = new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.95 });
  const beaconGlowMaterial = new THREE.MeshBasicMaterial({ color: 0xff2b17, transparent: true, opacity: 0.28, depthWrite: false });
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 8), beaconMaterial);
  beacon.name = "pyramid-beacon";
  beacon.position.y = height + 2.65;
  group.add(beacon);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1.45, 14, 8), beaconGlowMaterial);
  halo.name = "pyramid-beacon-halo";
  halo.position.copy(beacon.position);
  group.add(halo);
  pyramidBeacons.push({ root: group, beacon, halo, phase: seededRandom(seed + 97) * Math.PI * 2 });

  return group;
}

function createDetentionBlock() {
  const group = new THREE.Group();
  const concrete = materials.detentionConcrete;

  const addBlock = (width, height, depth, x, y, z, material = concrete) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  addBlock(38, 29, 22, 0, 14.5, 0);
  addBlock(42, 2.2, 24, 0, 1.1, 0, materials.architectureVent);
  addBlock(42, 2.4, 24, 0, 28.5, 0, materials.architectureVent);
  for (const x of [-18.5, -6.5, 6.5, 18.5]) {
    const height = Math.abs(x) < 10 ? 34 : 31;
    addBlock(4.2, height, 24.5, x, height * 0.5, -0.6);
    addBlock(5.2, 2.2, 25.2, x, height - 1.1, -0.6, materials.architectureVent);
  }

  const createBarredWindow = (width = 4.4, height = 6.8) => {
    const window = new THREE.Group();
    window.add(new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.45), materials.darkMetal));
    const verticalCount = Math.max(4, Math.round(width / 0.72));
    for (let index = 0; index < verticalCount; index++) {
      const x = THREE.MathUtils.lerp(-width * 0.42, width * 0.42, index / Math.max(1, verticalCount - 1));
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.11, height * 0.9, 0.16), materials.pyramidTrim);
      bar.position.set(x, 0, -0.3);
      window.add(bar);
    }
    for (const y of [-height * 0.28, 0, height * 0.28]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, 0.1, 0.16), materials.pyramidTrim);
      bar.position.set(0, y, -0.3);
      window.add(bar);
    }
    return window;
  };

  for (const x of [-13, -9, 9, 13]) {
    for (const y of [6.5, 15.5, 24]) {
      const window = createBarredWindow(3.25, 6.2);
      window.position.set(x, y, -11.25);
      group.add(window);
    }
  }
  for (const y of [17.5, 25.5]) {
    const window = createBarredWindow(7.2, 6.1);
    window.position.set(0, y, -11.3);
    group.add(window);
  }
  for (const side of [-1, 1]) {
    for (const z of [-6, 3, 8]) {
      const window = createBarredWindow(3.3, 6.2);
      window.position.set(side * 19.15, 16.5, z);
      window.rotation.y = side * Math.PI / 2;
      group.add(window);
    }
  }

  addBlock(12, 11, 2.2, 0, 5.5, -11.45, materials.architectureVent);
  addBlock(8.2, 8.3, 0.7, 0, 4.15, -12.9, materials.darkMetal);
  for (const x of [-2.05, 2.05]) addBlock(0.18, 7.2, 0.18, x, 4.3, -13.35, materials.pyramidTrim);
  for (let step = 0; step < 3; step++) {
    addBlock(11 + step * 1.8, 0.55, 1.5, 0, 0.28 + step * 0.5, -15.3 + step * 1.15, materials.architectureVent);
  }

  const signCanvas = document.createElement("canvas");
  signCanvas.width = 512;
  signCanvas.height = 96;
  const context = signCanvas.getContext("2d");
  context.fillStyle = "#312a27";
  context.fillRect(0, 0, signCanvas.width, signCanvas.height);
  context.strokeStyle = "#a68b74";
  context.lineWidth = 8;
  context.strokeRect(5, 5, signCanvas.width - 10, signCanvas.height - 10);
  context.fillStyle = "#c2a28a";
  context.font = "700 54px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("DETENTION", 256, 52);
  const signTexture = new THREE.CanvasTexture(signCanvas);
  signTexture.encoding = THREE.sRGBEncoding;
  const signMaterial = new THREE.MeshBasicMaterial({ map: signTexture });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(11.5, 2.15), signMaterial);
  sign.position.set(0, 29.2, -12.3);
  sign.rotation.y = Math.PI;
  group.add(sign);

  group.userData.landmark = "detention-block";
  return group;
}

function createPrisonCity() {
  const group = new THREE.Group();
  const colliders = [];
  const stone = materials.detentionConcrete;
  const wallDepth = 5;
  const wallHeight = 17;

  const addBlock = (width, height, depth, x, y, z, material = stone, parent = group) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const addCollider = (width, height, depth, x, y, z) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    mesh.position.set(x, y, z);
    mesh.userData.radius = Math.hypot(width, depth) * 0.5;
    colliders.push(mesh);
  };
  const addWallRun = (width, x, z, rotate = false) => {
    addBlock(rotate ? wallDepth : width, wallHeight, rotate ? width : wallDepth, x, wallHeight * 0.5, z);
    addBlock(rotate ? wallDepth + 1.2 : width + 1.2, 1.1, rotate ? width + 1.2 : wallDepth + 1.2, x, wallHeight + 0.55, z, materials.architectureVent);
    addCollider(rotate ? wallDepth : width, wallHeight, rotate ? width : wallDepth, x, wallHeight * 0.5, z);
  };

  addWallRun(176, 0, -88);
  addWallRun(176, -88, 0, true);
  addWallRun(176, 88, 0, true);
  addWallRun(66, -55, 88);
  addWallRun(18, 31, 88);
  addWallRun(24, 76, 88);

  for (const x of [-88, 88]) {
    for (const z of [-88, 88]) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(9, 11, 27, 8), stone);
      tower.position.set(x, 13.5, z);
      tower.castShadow = true;
      group.add(tower);
      addBlock(20, 2, 20, x, 27, z, materials.architectureVent);
      addCollider(19, 27, 19, x, 13.5, z);
    }
  }

  for (const x of [-13, 13]) {
    addBlock(9, 30, 11, x, 15, 89, stone);
    addBlock(11, 2.2, 13, x, 29.4, 89, materials.architectureVent);
    addCollider(9, 30, 11, x, 15, 89);
  }
  addBlock(17, 7, 7, 0, 25.5, 89, stone);
  addBlock(19, 1.4, 8, 0, 29.3, 89, materials.architectureVent);
  addCollider(17, 7, 7, 0, 25.5, 89);
  const gateDoor = addBlock(16, 17, 1.3, 0, 8.5, 91.7, materials.darkMetal);
  for (const x of [-5.6, -2.8, 0, 2.8, 5.6]) addBlock(0.3, 15, 0.35, x, 8.5, 92.5, materials.pyramidTrim);
  gateDoor.castShadow = true;

  const keep = createPrisonBuilding();
  keep.scale.setScalar(1.35);
  keep.position.set(0, 0, 25);
  keep.rotation.y = Math.PI;
  group.add(keep);
  addCollider(76, 58, 46, 0, 29, 25);

  const cellBlockSites = [
    [-52, -35, Math.PI / 2], [52, -35, -Math.PI / 2],
    [-52, 35, Math.PI / 2], [52, 35, -Math.PI / 2]
  ];
  for (const [x, z, rotation] of cellBlockSites) {
    const block = createDetentionBlock();
    block.scale.setScalar(0.72);
    block.position.set(x, 0, z);
    block.rotation.y = rotation;
    group.add(block);
    addCollider(28, 25, 18, x, 12.5, z);
  }

  for (const x of [-68, -34, 34, 68]) {
    addBlock(18, 1.1, 36, x, 0.55, 1, materials.architectureVent);
    for (const z of [-14, 14]) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 7), materials.redEye);
      lamp.position.set(x, 5.5, z);
      group.add(lamp);
      addBlock(0.22, 5, 0.22, x, 2.5, z, materials.darkMetal);
    }
  }

  const breachX = 52;
  const breachZ = 88;
  for (let i = 0; i < 18; i++) {
    const size = 1.2 + seededRandom(8100 + i) * 3.1;
    const rubble = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), stone);
    rubble.position.set(breachX + (seededRandom(8200 + i) - 0.5) * 24, size * 0.35, breachZ + (seededRandom(8300 + i) - 0.5) * 15);
    rubble.rotation.set(seededRandom(8400 + i) * Math.PI, seededRandom(8500 + i) * Math.PI, seededRandom(8600 + i) * Math.PI);
    group.add(rubble);
  }

  const flames = [];
  for (let i = 0; i < 5; i++) {
    const flameMaterial = new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffb52e : 0xff4818, transparent: true, opacity: 0.82 });
    const flame = new THREE.Mesh(new THREE.ConeGeometry(1.5 + i * 0.22, 6 + i * 0.8, 8), flameMaterial);
    flame.position.set(breachX - 5 + i * 2.4, 2.8 + i * 0.25, breachZ + 1.5);
    group.add(flame);
    flames.push({ mesh: flame, baseY: flame.position.y, phase: i * 1.17 });
  }
  const smoke = [];
  for (let i = 0; i < 8; i++) {
    const smokeMaterial = new THREE.MeshBasicMaterial({ color: 0x171214, transparent: true, opacity: 0.3, depthWrite: false });
    const plume = new THREE.Mesh(new THREE.SphereGeometry(3.8 + i * 0.42, 9, 7), smokeMaterial);
    plume.position.set(breachX + (i % 2 ? 2.2 : -2.2), 6 + i * 4.2, breachZ + 1.2);
    plume.scale.set(1, 1.35, 1);
    group.add(plume);
    smoke.push({ mesh: plume, baseY: plume.position.y, phase: i / 8 });
  }
  prisonBreachEffects.push({ root: group, flames, smoke, time: 0 });

  group.userData.landmark = "prison-city";
  return { group, colliders };
}

function createPrisonBuilding() {
  const group = new THREE.Group();
  const concrete = materials.ruin;
  const inset = materials.architectureVent;
  const windowMaterial = new THREE.MeshStandardMaterial({ color: 0x090c0f, metalness: 0.7, roughness: 0.28 });

  const addBlock = (width, height, depth, x, y, z, material = concrete) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  addBlock(50, 31, 28, 0, 15.5, 0);
  addBlock(14, 38, 32, -20, 19, 0);
  addBlock(14, 38, 32, 20, 19, 0);
  addBlock(18, 6, 34, -20, 37, 0);
  addBlock(18, 6, 34, 20, 37, 0);
  addBlock(8, 36, 31, -6, 18, -0.5, inset);
  addBlock(8, 36, 31, 6, 18, -0.5, inset);
  addBlock(20, 5, 31, 0, 32.5, -0.5, inset);

  for (const x of [-27, -13, 13, 27]) {
    const buttress = addBlock(3.4, 18, 5, x, 9, -16.2, inset);
    buttress.rotation.x = -0.07;
  }

  const addRoundWindow = (x, y, z = -14.18, rotationY = 0) => {
    const assembly = new THREE.Group();
    assembly.position.set(x, y, z);
    assembly.rotation.y = rotationY;
    const dark = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.45, 0.32, 28), windowMaterial);
    dark.rotation.x = Math.PI / 2;
    assembly.add(dark);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.62, 0.34, 10, 28), materials.pyramidTrim);
    assembly.add(rim);
    for (const offset of [-0.82, 0, 0.82]) {
      const vertical = new THREE.Mesh(new THREE.BoxGeometry(0.16, 4.15, 0.22), materials.darkMetal);
      vertical.position.set(offset, 0, -0.28);
      assembly.add(vertical);
    }
    const horizontal = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.18, 0.22), materials.darkMetal);
    horizontal.position.z = -0.28;
    assembly.add(horizontal);
    group.add(assembly);
  };

  for (const x of [-20, 20]) {
    for (const y of [7, 15, 23, 31]) addRoundWindow(x, y);
  }
  for (const x of [-11, 11]) {
    for (const y of [9, 18, 27]) addRoundWindow(x, y);
  }

  const entranceFrame = addBlock(14, 12, 2.2, 0, 6, -15.1, inset);
  entranceFrame.castShadow = true;
  const door = addBlock(9.6, 9, 0.7, 0, 4.5, -16.55, materials.darkMetal);
  for (const x of [-2.45, 2.45]) {
    const slash = new THREE.Mesh(new THREE.BoxGeometry(0.65, 4.5, 0.24), materials.redEye);
    slash.position.set(x, 5.1, -17);
    slash.rotation.z = x < 0 ? -0.55 : 0.55;
    group.add(slash);
  }
  for (let step = 0; step < 4; step++) {
    addBlock(15 + step * 2.2, 0.65, 2.1, 0, 0.33 + step * 0.62, -21 + step * 1.65, inset);
  }

  for (const x of [-24, -8, 8, 24]) {
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 4.5, 6), materials.darkMetal);
    antenna.position.set(x, 42.25 - Math.abs(x) * 0.08, 0);
    group.add(antenna);
  }

  group.userData.landmark = "prison";
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

function distanceToSegmentSquared(point, start, end) {
  const sx = end.x - start.x;
  const sy = end.y - start.y;
  const sz = end.z - start.z;
  const px = point.x - start.x;
  const py = point.y - start.y;
  const pz = point.z - start.z;
  const lengthSquared = sx * sx + sy * sy + sz * sz;
  const along = lengthSquared > 0.000001
    ? THREE.MathUtils.clamp((px * sx + py * sy + pz * sz) / lengthSquared, 0, 1)
    : 0;
  const dx = px - sx * along;
  const dy = py - sy * along;
  const dz = pz - sz * along;
  return dx * dx + dy * dy + dz * dz;
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
    if (child.geometry && !sharedGeometries.has(child.geometry)) child.geometry.dispose();
    if (child.material && !Object.values(materials).includes(child.material)) {
      if (Array.isArray(child.material)) child.material.forEach(mat => mat.dispose());
      else child.material.dispose();
    }
  });
}



