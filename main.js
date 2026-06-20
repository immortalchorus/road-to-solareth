const THREE = window.THREE;

const CONFIG = {
  tankMaxForwardSpeed: 42,
  tankMaxReverseSpeed: 18,
  tankAcceleration: 24,
  tankTurnSpeed: 1.55,
  turretTurnSpeed: 2.7,
  chunkSize: 220,
  visibleChunkRadius: 2,
  enemySpawnEvery: 7.5,
  enemySpawnChance: 0.42,
  maxEnemies: 5,
  worldColors: {
    sand: 0x9b3f28,
    darkSand: 0x5f2923,
    road: 0x3a2f34,
    crystal: 0x58f3ff,
    gold: 0xffc45c
  },
  musicPath: "music/ambient.mp3",
  solarethVisibility: 0.6
};

const canvas = document.querySelector("#game-canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
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
  "The Dreaming Signal wakes in the rusted cities."
];

let destroyedEnemies = 0;
let distanceTravelled = 0;
let statusTimer = 0;
let currentStatus = 0;

const materials = {
  tankDark: new THREE.MeshStandardMaterial({ color: 0x181a20, metalness: 0.72, roughness: 0.42 }),
  tankTrim: new THREE.MeshStandardMaterial({ color: 0x263945, metalness: 0.6, roughness: 0.35 }),
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
  terrain: new THREE.MeshStandardMaterial({ color: CONFIG.worldColors.sand, roughness: 0.95, vertexColors: true })
};

let terrain;
let tank;
let projectiles;
let enemies;
let audio;
let solareth;
const explosionEffects = [];

window.addEventListener("resize", onResize);
window.addEventListener("keydown", event => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
  input[event.code] = true;
});
window.addEventListener("keyup", event => {
  input[event.code] = false;
});
hud.musicButton.addEventListener("click", () => audio.start());

function initLights() {
  const hemi = new THREE.HemisphereLight(0xffd1a6, 0x2f2038, 1.8);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffb06b, 2.15);
  sun.position.set(-180, 260, 120);
  sun.castShadow = true;
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
    this.bumpTimer = 0;

    const body = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.3, 8.2), materials.tankDark);
    body.position.y = 1.25;
    body.castShadow = true;
    this.group.add(body);

    for (const x of [-3.55, 3.55]) {
      const track = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.95, 8.9), materials.darkMetal);
      track.position.set(x, 0.8, 0);
      track.castShadow = true;
      this.group.add(track);
      const glow = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 6.7), materials.blueGlow);
      glow.position.set(x * 1.01, 1.22, 0);
      this.group.add(glow);
    }

    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(1.12, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), materials.tankTrim);
    cockpit.position.set(0, 2.14, 1.1);
    cockpit.castShadow = true;
    this.group.add(cockpit);

    this.turret = new THREE.Group();
    this.turret.position.set(0, 2.1, -0.7);
    const turretBase = new THREE.Mesh(new THREE.CylinderGeometry(1.72, 1.95, 0.78, 20), materials.tankTrim);
    turretBase.castShadow = true;
    this.turret.add(turretBase);
    this.barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 5.8, 14), materials.darkMetal);
    this.barrel.rotation.x = Math.PI / 2;
    this.barrel.position.set(0, 0.08, -3.55);
    this.barrel.castShadow = true;
    this.turret.add(this.barrel);
    const muzzleGlow = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8), materials.orangeGlow);
    muzzleGlow.position.set(0, 0.08, -6.55);
    this.turret.add(muzzleGlow);
    this.group.add(this.turret);

    parent.add(this.group);
  }

  update(delta, keys, terrainManager) {
    const forwardInput = keys.ArrowUp ? 1 : 0;
    const reverseInput = keys.ArrowDown ? 1 : 0;
    const turningTurret = keys.ShiftLeft || keys.ShiftRight;

    if (forwardInput) this.speed += this.acceleration * delta;
    if (reverseInput) this.speed -= this.acceleration * delta;
    if (!forwardInput && !reverseInput) this.speed = moveToward(this.speed, 0, this.friction * delta);

    this.speed = THREE.MathUtils.clamp(this.speed, -this.maxReverseSpeed, this.maxForwardSpeed);
    if (this.bumpTimer > 0) {
      this.speed *= 0.985;
      this.bumpTimer -= delta;
    }

    if (turningTurret) {
      if (keys.ArrowLeft) this.turret.rotation.y += this.turretTurnSpeed * delta;
      if (keys.ArrowRight) this.turret.rotation.y -= this.turretTurnSpeed * delta;
    } else {
      const turnScale = THREE.MathUtils.clamp(Math.abs(this.speed) / 18, 0.25, 1);
      if (keys.ArrowLeft) this.group.rotation.y += this.turnSpeed * turnScale * delta;
      if (keys.ArrowRight) this.group.rotation.y -= this.turnSpeed * turnScale * delta;
    }

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.group.quaternion);
    this.group.position.addScaledVector(forward, this.speed * delta);
    this.group.position.y = terrainManager.getHeightAt(this.group.position.x, this.group.position.z) + 0.72;
  }

  getTurretWorldDirection() {
    return new THREE.Vector3(0, 0, -1).applyQuaternion(this.turret.getWorldQuaternion(new THREE.Quaternion())).normalize();
  }

  getMuzzleWorldPosition() {
    return this.turret.localToWorld(new THREE.Vector3(0, 0.08, -6.55));
  }
}

class TerrainManager {
  constructor(parent) {
    this.parent = parent;
    this.chunks = new Map();
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
      group.add(object);
    }

    if (Math.abs(cx) + Math.abs(cz) > 2 && seededRandom(cx * 7 + cz * 13) > 0.93) {
      const city = createDistantCity(CONFIG.worldColors.gold);
      city.position.set(0, 2, 0);
      city.scale.setScalar(0.65 + seededRandom(cx + cz) * 0.8);
      group.add(city);
    }
  }

  getHeightAt(x, z) {
    const waves = Math.sin(x * 0.018) * 2.8 + Math.cos(z * 0.021) * 2.3 + Math.sin((x + z) * 0.009) * 4.4;
    const rough = (valueNoise(x * 0.035, z * 0.035) - 0.5) * 8.5;
    const crater = Math.sin(Math.hypot(x + 130, z - 90) * 0.021) * 1.3;
    return waves + rough + crater;
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

class ProjectileManager {
  constructor(parent) {
    this.parent = parent;
    this.projectiles = [];
    this.cooldown = 0;
  }

  update(delta, keys, tankRef, enemyManager) {
    this.cooldown -= delta;
    if (keys.Space && this.cooldown <= 0) {
      this.fire(tankRef.getMuzzleWorldPosition(), tankRef.getTurretWorldDirection());
      this.cooldown = 0.34;
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const shot = this.projectiles[i];
      shot.life -= delta;
      shot.mesh.position.addScaledVector(shot.velocity, delta);
      shot.trail.position.copy(shot.mesh.position).addScaledVector(shot.direction, -1.6);
      shot.trail.quaternion.copy(shot.quaternion);
      shot.light.position.copy(shot.mesh.position);
      shot.trail.scale.multiplyScalar(0.965);

      for (const enemy of enemyManager.enemies) {
        if (!enemy.dead && shot.mesh.position.distanceTo(enemy.group.position) < enemy.collisionRadius + shot.radius) {
          enemy.destroy();
          shot.life = -1;
          break;
        }
      }

      if (shot.life <= 0) {
        this.parent.remove(shot.group);
        disposeObject(shot.group);
        this.projectiles.splice(i, 1);
      }
    }
  }

  fire(position, direction) {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 10), materials.orangeGlow);
    mesh.position.copy(position);
    const trail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.52, 3.4, 10),
      new THREE.MeshBasicMaterial({ color: 0xff7b32, transparent: true, opacity: 0.35 })
    );
    trail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    trail.position.copy(position).addScaledVector(direction, -1.6);
    const light = new THREE.PointLight(0xff8a30, 4, 34);
    light.position.copy(position);
    group.add(mesh, trail, light);
    this.parent.add(group);
    this.projectiles.push({
      group,
      mesh,
      trail,
      light,
      direction: direction.clone().normalize(),
      quaternion: trail.quaternion.clone(),
      velocity: direction.multiplyScalar(118),
      life: 2.8,
      radius: 1.1
    });
    audio.playFire();
  }
}

class AudioManager {
  constructor() {
    this.started = false;
    this.context = null;
    this.master = null;
    this.engine = null;
    this.wind = null;
    this.music = new Audio(CONFIG.musicPath);
    this.music.preload = "none";
    this.music.loop = true;
    this.music.volume = 0.38;
  }

  async start() {
    if (this.started) return;
    this.started = true;
    hud.musicButton.textContent = "Journey Begun";
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.context = new AudioContextClass();
    this.master = this.context.createGain();
    this.master.gain.value = 0.18;
    this.master.connect(this.context.destination);

    try {
      await this.music.play();
    } catch {
      this.createAmbientFallback();
    }
    this.createEngineHum();
  }

  createAmbientFallback() {
    const drone = this.context.createOscillator();
    const harmonic = this.context.createOscillator();
    const gain = this.context.createGain();
    drone.type = "sine";
    harmonic.type = "triangle";
    drone.frequency.value = 54;
    harmonic.frequency.value = 81;
    gain.gain.value = 0.42;
    drone.connect(gain);
    harmonic.connect(gain);
    gain.connect(this.master);
    drone.start();
    harmonic.start();
    this.wind = gain;
  }

  createEngineHum() {
    this.engine = this.context.createOscillator();
    const gain = this.context.createGain();
    this.engine.type = "sawtooth";
    this.engine.frequency.value = 42;
    gain.gain.value = 0.12;
    this.engine.connect(gain);
    gain.connect(this.master);
    this.engine.start();
  }

  update(speed) {
    if (this.engine) this.engine.frequency.setTargetAtTime(38 + Math.abs(speed) * 1.3, this.context.currentTime, 0.08);
  }

  playFire() {
    this.blip(164, 0.06, 0.09, "square");
  }

  playExplosion() {
    this.blip(72, 0.14, 0.18, "sawtooth");
  }

  blip(freq, volume, length, type) {
    if (!this.context || !this.master) return;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + length);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    osc.stop(this.context.currentTime + length);
  }
}

initLights();
createSky();

terrain = new TerrainManager(scene);
tank = new Tank(scene);
projectiles = new ProjectileManager(scene);
enemies = new EnemyManager(scene);
audio = new AudioManager();
solareth = createSolareth();

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
  projectiles.update(delta, input, tank, enemies);
  updateCamera(delta);
  updateSolareth(delta);
  updateExplosions(delta);
  updateHUD(delta);
  audio.update(tank.speed);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function positionTankOnTerrain() {
  tank.group.position.set(0, terrain.getHeightAt(0, 0) + 0.72, 0);
}

function updateCamera(delta) {
  const behind = new THREE.Vector3(0, 0, 1).applyQuaternion(tank.group.quaternion);
  const target = tank.group.position.clone().add(new THREE.Vector3(0, 16, 0)).addScaledVector(behind, 28);
  camera.position.lerp(target, 1 - Math.pow(0.035, delta));
  const look = tank.group.position.clone().add(new THREE.Vector3(0, 5.8, 0));
  camera.lookAt(look);
}

function updateSolareth() {
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(tank.group.quaternion);
  solareth.position.copy(tank.group.position).addScaledVector(forward, 640);
  solareth.position.y = terrain.getHeightAt(solareth.position.x, solareth.position.z) + 48 + Math.sin(performance.now() * 0.00022) * 8;
  solareth.rotation.y = tank.group.rotation.y;
  const fade = CONFIG.solarethVisibility * (0.55 + Math.sin(performance.now() * 0.00012 + distanceTravelled * 0.002) * 0.45);
  solareth.traverse(child => {
    if (child.material && child.material.transparent) child.material.opacity = 0.12 + fade * 0.72;
  });
}

function updateHUD(delta) {
  hud.speed.textContent = `${Math.round(Math.abs(tank.speed) * 2.4)} kph`;
  hud.turret.textContent = `${Math.round(THREE.MathUtils.radToDeg(wrapAngle(tank.turret.rotation.y)))} deg`;
  hud.distance.textContent = `${(distanceTravelled / 1000).toFixed(1)} km`;
  hud.destroyed.textContent = destroyedEnemies;
  statusTimer -= delta;
  if (statusTimer <= 0) {
    currentStatus = (currentStatus + 1) % poeticStatuses.length;
    hud.status.textContent = poeticStatuses[currentStatus];
    statusTimer = 10 + Math.random() * 8;
  }
}

function createSolareth() {
  const group = createDistantCity(CONFIG.worldColors.gold);
  group.name = "Solareth";
  group.scale.setScalar(2.8);
  group.traverse(child => {
    if (child.isMesh) {
      child.material = new THREE.MeshBasicMaterial({ color: CONFIG.worldColors.gold, transparent: true, opacity: 0.65, depthWrite: false });
    }
  });
  scene.add(group);
  return group;
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

function createExplosion(position) {
  const group = new THREE.Group();
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 16, 10),
    new THREE.MeshBasicMaterial({ color: 0xffb05c, transparent: true, opacity: 0.65 })
  );
  const light = new THREE.PointLight(0xff7b3b, 5, 45);
  group.position.copy(position);
  group.add(sphere, light);
  scene.add(group);
  explosionEffects.push({ group, sphere, light, life: 0.55 });
}

function updateExplosions(delta) {
  for (let i = explosionEffects.length - 1; i >= 0; i--) {
    const effect = explosionEffects[i];
    effect.life -= delta;
    effect.sphere.scale.addScalar(delta * 14);
    effect.sphere.material.opacity = Math.max(0, effect.life);
    effect.light.intensity = effect.life * 8;
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
