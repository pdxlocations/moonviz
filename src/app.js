import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  equatorialBasisToEcliptic,
  formatDegrees,
  formatSignedDegrees,
  geographicSubpoint,
  horizontalCoordinates,
  lunarPosition,
  moonPhase,
  solarPosition
} from "./astro.js";

const canvas = document.querySelector("#space");
const ui = {
  dateTime: document.querySelector("#dateTime"),
  nowButton: document.querySelector("#nowButton"),
  minusDayButton: document.querySelector("#minusDayButton"),
  plusDayButton: document.querySelector("#plusDayButton"),
  minusHourButton: document.querySelector("#minusHourButton"),
  plusHourButton: document.querySelector("#plusHourButton"),
  speed: document.querySelector("#speed"),
  playButton: document.querySelector("#playButton"),
  resetViewButton: document.querySelector("#resetViewButton"),
  spaceViewButton: document.querySelector("#spaceViewButton"),
  povViewButton: document.querySelector("#povViewButton"),
  earthCenterButton: document.querySelector("#earthCenterButton"),
  sunCenterButton: document.querySelector("#sunCenterButton"),
  moonCenterButton: document.querySelector("#moonCenterButton"),
  povFovControl: document.querySelector("#povFovControl"),
  povFov: document.querySelector("#povFov"),
  povFovValue: document.querySelector("#povFovValue"),
  contrast: document.querySelector("#contrast"),
  showOrbits: document.querySelector("#showOrbits"),
  showLines: document.querySelector("#showLines"),
  showStars: document.querySelector("#showStars"),
  showSun: document.querySelector("#showSun"),
  showMoon: document.querySelector("#showMoon"),
  showObserver: document.querySelector("#showObserver"),
  showSubpoints: document.querySelector("#showSubpoints"),
  latitude: document.querySelector("#latitude"),
  longitude: document.querySelector("#longitude"),
  useLocationButton: document.querySelector("#useLocationButton"),
  locationStatus: document.querySelector("#locationStatus"),
  utcLabel: document.querySelector("#utcLabel"),
  phaseLabel: document.querySelector("#phaseLabel"),
  moonDistance: document.querySelector("#moonDistance"),
  sunDistance: document.querySelector("#sunDistance"),
  moonLongitude: document.querySelector("#moonLongitude"),
  sunLongitude: document.querySelector("#sunLongitude"),
  observerPosition: document.querySelector("#observerPosition"),
  subsolarPoint: document.querySelector("#subsolarPoint"),
  sublunarPoint: document.querySelector("#sublunarPoint"),
  moonVisibility: document.querySelector("#moonVisibility"),
  moonHorizontal: document.querySelector("#moonHorizontal"),
  sunVisibility: document.querySelector("#sunVisibility"),
  sunHorizontal: document.querySelector("#sunHorizontal"),
  compass: document.querySelector("#compass"),
  compassPoints: document.querySelectorAll("#compass [data-bearing]"),
  showDebugOverlay: document.querySelector("#showDebugOverlay"),
  showDebugVectors: document.querySelector("#showDebugVectors"),
  debugTextureSignMode: document.querySelector("#debugTextureSignMode"),
  debugOverlay: document.querySelector("#debugOverlay"),
  debugSummary: document.querySelector("#debugSummary"),
  debugVectors: document.querySelector("#debugVectors")
};

const DEFAULT_OBSERVER = {
  latitude: 45.5152,
  longitude: -122.6784
};

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x061014, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x061014, 12, 34);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(-4.4, 2.6, 5.4);
const SPACE_FOV = 45;
const MAX_POV_FOV = 120;
const EARTH_CENTER_SUN_DISTANCE = 6.8;
const EARTH_CENTER_MOON_DISTANCE = 2.15;
const SUN_CENTER_EARTH_DISTANCE = 3.9;
const SUN_CENTER_MOON_DISTANCE = 1.35;
const MOON_CENTER_EARTH_DISTANCE = 2.15;
const MOON_CENTER_SUN_DISTANCE = 6.8;
const spaceCameraPosition = new THREE.Vector3(-4.4, 2.6, 5.4);
const sunCenterCameraPosition = new THREE.Vector3(-5.6, 3.2, 6.4);
const moonCenterCameraPosition = new THREE.Vector3(-4.2, 2.5, 4.8);
const spaceCameraTarget = new THREE.Vector3(0, 0, 0);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 3.2;
controls.maxDistance = 13;
controls.target.set(0, 0, 0);

const ambient = new THREE.AmbientLight(0x8aa0a4, 0.22);
const sunlight = new THREE.DirectionalLight(0xfff3ce, 2.4);
scene.add(ambient, sunlight, sunlight.target);

const textureLoader = new THREE.TextureLoader();
const earthTexture = textureLoader.load("./assets/earth-blue-marble.jpg");
earthTexture.colorSpace = THREE.SRGBColorSpace;
earthTexture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
const moonTexture = createMoonTexture(512);
const sunTexture = createSunTexture(512);

const earth = new THREE.Mesh(
  new THREE.SphereGeometry(0.62, 64, 32),
  new THREE.ShaderMaterial({
    uniforms: {
      earthMap: { value: earthTexture },
      sunDirection: { value: new THREE.Vector3(1, 0, 0) },
      nightStrength: { value: 0.78 },
      longitudeSign: { value: -1 }
    },
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec3 vLocalDirection;
      varying vec3 vWorldNormal;

      void main() {
        vLocalDirection = normalize(position);
        vWorldNormal = normalize((modelMatrix * vec4(vLocalDirection, 0.0)).xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D earthMap;
      uniform vec3 sunDirection;
      uniform float nightStrength;
      uniform float longitudeSign;
      varying vec3 vLocalDirection;
      varying vec3 vWorldNormal;

      void main() {
        float longitude = atan(longitudeSign * vLocalDirection.z, vLocalDirection.x);
        float latitude = asin(clamp(vLocalDirection.y, -1.0, 1.0));
        vec2 mapUv = vec2((longitude + 3.141592653589793) / 6.283185307179586, 0.5 + latitude / 3.141592653589793);
        vec3 color = texture2D(earthMap, mapUv).rgb;
        float daylight = dot(normalize(vWorldNormal), normalize(sunDirection));
        float terminator = smoothstep(-0.04, 0.08, daylight);
        vec3 nightColor = color * mix(vec3(0.25, 0.32, 0.45), vec3(0.012, 0.02, 0.035), nightStrength);
        vec3 dayColor = color * (0.38 + max(daylight, 0.0) * 0.82);
        gl_FragColor = vec4(mix(nightColor, dayColor, terminator), 1.0);
      }
    `
  })
);
scene.add(earth);

const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.18, 48, 24),
  new THREE.ShaderMaterial({
    uniforms: {
      moonMap: { value: moonTexture },
      sunDirection: { value: new THREE.Vector3(1, 0, 0) }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldNormal;

      void main() {
        vUv = uv;
        vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D moonMap;
      uniform vec3 sunDirection;
      varying vec2 vUv;
      varying vec3 vWorldNormal;

      void main() {
        vec3 base = texture2D(moonMap, vUv).rgb * vec3(1.02, 1.0, 0.94);
        float daylight = dot(normalize(vWorldNormal), normalize(sunDirection));
        float terminator = smoothstep(-0.025, 0.055, daylight);
        vec3 night = base * vec3(0.035, 0.045, 0.065);
        vec3 day = base * (0.28 + max(daylight, 0.0) * 0.9);
        gl_FragColor = vec4(mix(night, day, terminator), 1.0);
      }
    `
  })
);
scene.add(moon);

const sun = new THREE.Mesh(
  new THREE.SphereGeometry(0.16, 48, 24),
  new THREE.MeshBasicMaterial({
    map: sunTexture,
    color: 0xffc86a
  })
);
scene.add(sun);

const moonOrbit = createOrbitRing(2.15, 0xb8c5c9, 0.28);
const eclipticRing = createOrbitRing(3.9, 0xf4bd58, 0.18);
scene.add(moonOrbit, eclipticRing);

const sunLine = createRadialLine(0xf6c563, 0.55);
const moonLine = createRadialLine(0xd7dee2, 0.42);
scene.add(sunLine, moonLine);

const observerMarker = new THREE.Mesh(
  new THREE.SphereGeometry(0.035, 18, 12),
  new THREE.MeshBasicMaterial({ color: 0xfff1a8 })
);
const subsolarMarker = new THREE.Mesh(
  new THREE.SphereGeometry(0.04, 18, 12),
  new THREE.MeshBasicMaterial({ color: 0xffb84d })
);
const sublunarMarker = new THREE.Mesh(
  new THREE.SphereGeometry(0.024, 18, 12),
  new THREE.MeshBasicMaterial({ color: 0xd7dee2 })
);
const zenithLine = createRadialLine(0xfff1a8, 0.72);
scene.add(observerMarker, subsolarMarker, sublunarMarker, zenithLine);

const stars = createStars(720);
scene.add(stars);

const state = {
  date: new Date(),
  observer: loadObserver(),
  playing: false,
  viewMode: "space",
  centerMode: "earth",
  lastFrame: performance.now(),
  debug: null
};

setDateInput(state.date);
setObserverInputs(state.observer);
syncPlayButton();
syncViewControls();
updateGraphicsControls();
updateDebugOverlay();
bindEvents();
requestAnimationFrame(frame);

function bindEvents() {
  ui.dateTime.addEventListener("change", () => {
    const next = new Date(ui.dateTime.value);
    if (!Number.isNaN(next.getTime())) state.date = next;
  });

  ui.nowButton.addEventListener("click", () => {
    state.date = new Date();
    setDateInput(state.date);
  });

  ui.minusDayButton.addEventListener("click", () => shiftDays(-1));
  ui.plusDayButton.addEventListener("click", () => shiftDays(1));
  ui.minusHourButton.addEventListener("click", () => shiftHours(-1));
  ui.plusHourButton.addEventListener("click", () => shiftHours(1));

  ui.playButton.addEventListener("click", () => {
    state.playing = !state.playing;
    syncPlayButton();
  });

  ui.resetViewButton.addEventListener("click", () => {
    setViewMode("space");
    resetSpaceCamera();
  });

  ui.spaceViewButton.addEventListener("click", () => {
    setViewMode("space");
  });

  ui.povViewButton.addEventListener("click", () => {
    setViewMode("pov");
  });

  ui.earthCenterButton.addEventListener("click", () => {
    setCenterMode("earth");
  });

  ui.sunCenterButton.addEventListener("click", () => {
    setCenterMode("sun");
  });

  ui.moonCenterButton.addEventListener("click", () => {
    setCenterMode("moon");
  });

  ui.povFov.addEventListener("input", () => {
    syncPovFovLabel();
    syncCameraFov();
  });

  ui.contrast.addEventListener("input", updateGraphicsControls);

  for (const checkbox of graphicsCheckboxes()) {
    checkbox.addEventListener("change", updateGraphicsControls);
  }

  ui.showDebugOverlay.addEventListener("change", updateDebugOverlay);
  ui.showDebugVectors.addEventListener("change", updateDebugOverlay);
  ui.debugTextureSignMode.addEventListener("change", updateDebugOverlay);

  ui.latitude.addEventListener("change", readObserverInputs);
  ui.longitude.addEventListener("change", readObserverInputs);

  ui.useLocationButton.addEventListener("click", () => {
    if (!navigator.geolocation) {
      ui.locationStatus.textContent = "Geolocation is not available in this browser.";
      return;
    }

    ui.locationStatus.textContent = "Requesting location...";
    navigator.geolocation.getCurrentPosition(
      (position) => {
        state.observer = {
          latitude: roundCoordinate(position.coords.latitude),
          longitude: roundCoordinate(position.coords.longitude)
        };
        setObserverInputs(state.observer);
        saveObserver(state.observer);
        ui.locationStatus.textContent = "Observer position updated.";
      },
      () => {
        ui.locationStatus.textContent = "Location permission was not granted.";
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  });
}

function frame(now) {
  const delta = (now - state.lastFrame) / 1000;
  state.lastFrame = now;

  if (state.playing) {
    const minutesPerSecond = Number(ui.speed.value);
    state.date = new Date(state.date.getTime() + delta * minutesPerSecond * 60000);
    setDateInput(state.date);
  }

  resize();
  syncCameraFov();
  updateBodies();
  updateReadout();
  updateCameraView();
  controls.update();
  updateCompass();
  updateDebugOverlay();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function updateBodies() {
  const sunPosition = solarPosition(state.date);
  const moonPosition = lunarPosition(state.date);
  const subsolarPoint = geographicSubpoint(state.date, sunPosition.vector);
  const sublunarPoint = geographicSubpoint(state.date, moonPosition.vector);

  const sunEarthDirection = geographicToEarthVector(subsolarPoint);
  const moonEarthDirection = geographicToEarthVector(sublunarPoint);
  const sunWorldDirection = sunEarthDirection.clone().normalize();
  const moonWorldDirection = moonEarthDirection.clone().normalize();
  const earthOrientation = earthOrientationQuaternion(state.date);
  const centeredAxisScale = state.centerMode === "earth"
    ? new THREE.Vector3(1, 1, 1)
    : new THREE.Vector3(1, 1, -1);
  const sunCenteredFrameDirection = sunEarthDirection.clone()
    .multiply(centeredAxisScale)
    .applyQuaternion(earthOrientation)
    .normalize();
  const moonCenteredFrameDirection = moonEarthDirection.clone()
    .multiply(centeredAxisScale)
    .applyQuaternion(earthOrientation)
    .normalize();
  const layout = sceneLayout({
    sunEarthDirection: sunWorldDirection,
    moonEarthDirection: moonWorldDirection,
    sunCenteredFrameDirection,
    moonCenteredFrameDirection,
    earthOrientation
  });

  earth.position.copy(layout.earth);
  earth.quaternion.copy(layout.earthOrientation);
  earth.scale.set(1, 1, state.centerMode === "earth" ? 1 : -1);
  const longitudeSign = resolveLongitudeSign();
  earth.material.uniforms.longitudeSign.value = longitudeSign;
  sun.position.copy(layout.sun);
  moon.position.copy(layout.moon);
  moonOrbit.position.copy(layout.earth);
  moonOrbit.scale.setScalar(layout.moonOrbitScale);
  eclipticRing.position.copy(layout.eclipticCenter);
  eclipticRing.scale.setScalar(layout.eclipticScale);
  sunlight.position.copy(layout.sun);
  sunlight.target.position.copy(layout.earth);
  earth.material.uniforms.sunDirection.value.copy(layout.sunDirection);
  moon.material.uniforms.sunDirection.value.copy(layout.sun.clone().sub(layout.moon).normalize());
  sunLine.geometry.setFromPoints([layout.earth, layout.sun]);
  moonLine.geometry.setFromPoints([layout.earth, layout.moon]);

  const observerDirection = geographicToEarthVector(state.observer);
  const subsolarDirection = earthLocalToWorldDirection(sunEarthDirection);
  const sublunarDirection = earthLocalToWorldDirection(moonEarthDirection);
  const observerWorldDirection = earthLocalToWorldDirection(observerDirection);
  const observerPosition = layout.earth.clone().add(observerWorldDirection.clone().multiplyScalar(0.68));
  observerMarker.position.copy(observerPosition);
  subsolarMarker.position.copy(layout.earth.clone().add(subsolarDirection.clone().multiplyScalar(0.69)));
  sublunarMarker.position.copy(layout.earth.clone().add(sublunarDirection.clone().multiplyScalar(0.69)));
  observerMarker.material.color.set(surfaceDot(observerWorldDirection, layout.sunDirection) > 0 ? 0xfff1a8 : 0x79a8ff);
  zenithLine.geometry.setFromPoints([
    observerPosition,
    layout.earth.clone().add(observerWorldDirection.clone().multiplyScalar(1.18))
  ]);

  const observerUv = textureUvForLocalDirection(observerDirection, longitudeSign);
  const portlandUv = textureUvForLocalDirection(geographicToEarthVector(DEFAULT_OBSERVER), longitudeSign);
  const tokyoUv = textureUvForLocalDirection(
    geographicToEarthVector({ latitude: 35.6764, longitude: 139.65 }),
    longitudeSign
  );
  const oppositeSign = longitudeSign > 0 ? -1 : 1;
  const portlandOppositeUv = textureUvForLocalDirection(geographicToEarthVector(DEFAULT_OBSERVER), oppositeSign);
  const tokyoOppositeUv = textureUvForLocalDirection(
    geographicToEarthVector({ latitude: 35.6764, longitude: 139.65 }),
    oppositeSign
  );
  const earthToSunDirection = layout.sun.clone().sub(layout.earth).normalize();
  const earthToMoonDirection = layout.moon.clone().sub(layout.earth).normalize();
  const rawHemisphereOrder = portlandUv.u < tokyoUv.u ? "W<E" : "W>E";
  const visualHemisphereOrder = state.centerMode === "earth"
    ? rawHemisphereOrder
    : rawHemisphereOrder === "W<E"
      ? "W>E"
      : "W<E";
  const oppositeRawOrder = portlandOppositeUv.u < tokyoOppositeUv.u ? "W<E" : "W>E";
  const oppositeVisualOrder = state.centerMode === "earth"
    ? oppositeRawOrder
    : oppositeRawOrder === "W<E"
      ? "W>E"
      : "W<E";

  state.debug = {
    centerMode: state.centerMode,
    viewMode: state.viewMode,
    textureSignMode: ui.debugTextureSignMode.value,
    autoLongitudeSign: state.centerMode === "earth" ? -1 : 1,
    longitudeSign,
    observerUv,
    portlandUv,
    tokyoUv,
    rawHemisphereOrder,
    visualHemisphereOrder,
    oppositeSign,
    oppositeVisualOrder,
    observerSunDot: surfaceDot(observerWorldDirection, layout.sunDirection),
    subsolarErrorDeg: angleDegrees(subsolarDirection, layout.sunDirection),
    sublunarErrorDeg: angleDegrees(sublunarDirection, layout.moonDirection),
    earthToSunErrorDeg: angleDegrees(earthToSunDirection, layout.sunDirection),
    earthToMoonErrorDeg: angleDegrees(earthToMoonDirection, layout.moonDirection)
  };
}

function updateReadout() {
  const sunPosition = solarPosition(state.date);
  const moonPosition = lunarPosition(state.date);
  const phase = moonPhase(state.date);
  const sunHorizontal = horizontalCoordinates(state.date, state.observer, sunPosition.vector);
  const moonHorizontal = horizontalCoordinates(state.date, state.observer, moonPosition.vector);
  const subsolarPoint = geographicSubpoint(state.date, sunPosition.vector);
  const sublunarPoint = geographicSubpoint(state.date, moonPosition.vector);

  ui.utcLabel.textContent = state.date.toUTCString();
  ui.phaseLabel.textContent = `${phase.name} (${Math.round(phase.illumination * 100)}%)`;
  ui.moonDistance.textContent = `${Math.round(moonPosition.distanceKm).toLocaleString()} km`;
  ui.sunDistance.textContent = `${sunPosition.distanceAu.toFixed(6)} AU`;
  ui.moonLongitude.textContent = formatDegrees(moonPosition.longitude);
  ui.sunLongitude.textContent = formatDegrees(sunPosition.longitude);
  ui.observerPosition.textContent = formatObserver(state.observer);
  ui.subsolarPoint.textContent = formatObserver(subsolarPoint);
  ui.sublunarPoint.textContent = formatObserver(sublunarPoint);
  ui.moonVisibility.textContent = moonHorizontal.visible ? "Visible" : "Below horizon";
  ui.moonHorizontal.textContent = formatHorizontal(moonHorizontal);
  ui.sunVisibility.textContent = sunHorizontal.visible ? "Visible" : "Below horizon";
  ui.sunHorizontal.textContent = formatHorizontal(sunHorizontal);
}

function resize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== Math.floor(width * renderer.getPixelRatio()) ||
      canvas.height !== Math.floor(height * renderer.getPixelRatio())) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

function shiftDays(days) {
  state.date = new Date(state.date.getTime() + days * 86400000);
  setDateInput(state.date);
}

function shiftHours(hours) {
  state.date = new Date(state.date.getTime() + hours * 3600000);
  setDateInput(state.date);
}

function setDateInput(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  ui.dateTime.value = local.toISOString().slice(0, 16);
}

function syncPlayButton() {
  ui.playButton.textContent = state.playing ? "Pause" : "Play";
  ui.playButton.setAttribute("aria-pressed", String(state.playing));
}

function syncViewControls() {
  ui.spaceViewButton.setAttribute("aria-pressed", String(state.viewMode === "space"));
  ui.povViewButton.setAttribute("aria-pressed", String(state.viewMode === "pov"));
  ui.earthCenterButton.setAttribute("aria-pressed", String(state.centerMode === "earth"));
  ui.sunCenterButton.setAttribute("aria-pressed", String(state.centerMode === "sun"));
  ui.moonCenterButton.setAttribute("aria-pressed", String(state.centerMode === "moon"));
  ui.povFovControl.hidden = state.viewMode !== "pov";
  ui.compass.hidden = state.viewMode !== "pov" || state.centerMode !== "earth";
  controls.enabled = state.viewMode === "space";
}

function setViewMode(mode) {
  if (state.viewMode === mode) return;

  state.viewMode = mode;
  syncViewControls();
  syncCameraFov();
  updateGraphicsControls();

  if (mode === "space") {
    resetSpaceCamera();
  }
}

function setCenterMode(mode) {
  if (state.centerMode === mode) return;

  state.centerMode = mode;
  syncViewControls();
  updateGraphicsControls();

  if (state.viewMode === "space") {
    resetSpaceCamera();
  }
}

function resetSpaceCamera() {
  const cameraPosition = state.centerMode === "sun"
    ? sunCenterCameraPosition
    : state.centerMode === "moon"
      ? moonCenterCameraPosition
      : spaceCameraPosition;
  camera.position.copy(cameraPosition);
  controls.target.copy(spaceCameraTarget);
  controls.update();
}

function syncPovFovLabel() {
  ui.povFovValue.textContent = `${Number(ui.povFov.value).toFixed(1)}x`;
}

function syncCameraFov() {
  const exaggeration = Number(ui.povFov.value);
  const targetFov = state.viewMode === "pov"
    ? THREE.MathUtils.lerp(SPACE_FOV, MAX_POV_FOV, (exaggeration - 1) / 2)
    : SPACE_FOV;

  if (Math.abs(camera.fov - targetFov) < 0.01) return;

  camera.fov = targetFov;
  camera.updateProjectionMatrix();
}

function sceneLayout(directions) {
  if (state.centerMode === "sun") {
    const earthPosition = directions.sunCenteredFrameDirection.clone().multiplyScalar(-SUN_CENTER_EARTH_DISTANCE);
    return {
      earth: earthPosition,
      earthOrientation: directions.earthOrientation,
      sun: new THREE.Vector3(0, 0, 0),
      moon: earthPosition.clone().add(directions.moonCenteredFrameDirection.clone().multiplyScalar(SUN_CENTER_MOON_DISTANCE)),
      sunDirection: directions.sunCenteredFrameDirection,
      moonDirection: directions.moonCenteredFrameDirection,
      moonOrbitScale: SUN_CENTER_MOON_DISTANCE / EARTH_CENTER_MOON_DISTANCE,
      eclipticCenter: new THREE.Vector3(0, 0, 0),
      eclipticScale: SUN_CENTER_EARTH_DISTANCE / 3.9
    };
  }

  if (state.centerMode === "moon") {
    const earthPosition = directions.moonCenteredFrameDirection.clone().multiplyScalar(-MOON_CENTER_EARTH_DISTANCE);
    return {
      earth: earthPosition,
      earthOrientation: directions.earthOrientation,
      sun: earthPosition.clone().add(directions.sunCenteredFrameDirection.clone().multiplyScalar(MOON_CENTER_SUN_DISTANCE)),
      moon: new THREE.Vector3(0, 0, 0),
      sunDirection: directions.sunCenteredFrameDirection,
      moonDirection: directions.moonCenteredFrameDirection,
      moonOrbitScale: 1,
      eclipticCenter: earthPosition,
      eclipticScale: MOON_CENTER_SUN_DISTANCE / EARTH_CENTER_SUN_DISTANCE
    };
  }

  return {
    earth: new THREE.Vector3(0, 0, 0),
    earthOrientation: new THREE.Quaternion(),
    sun: directions.sunEarthDirection.clone().multiplyScalar(EARTH_CENTER_SUN_DISTANCE),
    moon: directions.moonEarthDirection.clone().multiplyScalar(EARTH_CENTER_MOON_DISTANCE),
    sunDirection: directions.sunEarthDirection,
    moonDirection: directions.moonEarthDirection,
    moonOrbitScale: 1,
    eclipticCenter: new THREE.Vector3(0, 0, 0),
    eclipticScale: 1
  };
}

function earthOrientationQuaternion(date) {
  const basis = equatorialBasisToEcliptic(date);
  const matrix = new THREE.Matrix4().makeBasis(
    vectorToThree(basis.greenwich).normalize(),
    vectorToThree(basis.north).normalize(),
    vectorToThree(basis.west90).multiplyScalar(-1).normalize()
  );

  return new THREE.Quaternion().setFromRotationMatrix(matrix);
}

function earthLocalToWorldDirection(localDirection) {
  const adjusted = localDirection.clone();
  if (state.centerMode !== "earth") {
    adjusted.multiply(new THREE.Vector3(1, 1, -1));
  }

  return adjusted.applyQuaternion(earth.quaternion).normalize();
}

function setObserverInputs(observer) {
  ui.latitude.value = observer.latitude.toFixed(4);
  ui.longitude.value = observer.longitude.toFixed(4);
}

function readObserverInputs() {
  const latitude = Number(ui.latitude.value);
  const longitude = Number(ui.longitude.value);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    ui.locationStatus.textContent = "Enter latitude -90 to 90 and longitude -180 to 180.";
    return;
  }

  state.observer = {
    latitude: roundCoordinate(latitude),
    longitude: roundCoordinate(longitude)
  };
  setObserverInputs(state.observer);
  saveObserver(state.observer);
  ui.locationStatus.textContent = "Observer position updated.";
}

function loadObserver() {
  try {
    const saved = JSON.parse(localStorage.getItem("moonviz-observer"));
    if (saved && Number.isFinite(saved.latitude) && Number.isFinite(saved.longitude) &&
        saved.latitude >= -90 && saved.latitude <= 90 &&
        saved.longitude >= -180 && saved.longitude <= 180) {
      return {
        latitude: saved.latitude,
        longitude: saved.longitude
      };
    }
  } catch {
    return DEFAULT_OBSERVER;
  }
  return DEFAULT_OBSERVER;
}

function saveObserver(observer) {
  localStorage.setItem("moonviz-observer", JSON.stringify(observer));
}

function roundCoordinate(value) {
  return Math.round(value * 10000) / 10000;
}

function formatHorizontal(position) {
  return `${formatSignedDegrees(position.altitude)} / ${formatDegrees(position.azimuth)}`;
}

function formatObserver(observer) {
  const latitudeHemisphere = observer.latitude >= 0 ? "N" : "S";
  const longitudeHemisphere = observer.longitude >= 0 ? "E" : "W";
  return `${Math.abs(observer.latitude).toFixed(4)} ${latitudeHemisphere}, ${Math.abs(observer.longitude).toFixed(4)} ${longitudeHemisphere}`;
}

function updateCameraView() {
  if (state.viewMode !== "pov") return;

  if (state.centerMode === "sun") {
    const toEarth = earth.position.clone().sub(sun.position).normalize();
    camera.position.copy(sun.position).add(toEarth.clone().multiplyScalar(0.32));
    controls.target.copy(earth.position);
    return;
  }

  if (state.centerMode === "moon") {
    const toEarth = earth.position.clone().sub(moon.position).normalize();
    camera.position.copy(moon.position).add(toEarth.clone().multiplyScalar(0.24));
    controls.target.copy(earth.position);
    return;
  }

  const observerDirection = geographicToEarthVector(state.observer);
  const observerWorldDirection = observerDirection.clone().normalize();
  const surface = earth.position.clone().add(observerWorldDirection.clone().multiplyScalar(0.72));
  const north = geographicNorthVector(state.observer).normalize();
  const west = geographicWestVector(state.observer).normalize();

  camera.position.copy(surface)
    .add(observerWorldDirection.clone().multiplyScalar(0.38))
    .add(north.multiplyScalar(0.18))
    .add(west.multiplyScalar(0.12));
  controls.target.copy(surface.clone().add(observerWorldDirection.clone().multiplyScalar(1.3)));
}

function updateCompass() {
  if (state.viewMode !== "pov" || state.centerMode !== "earth") return;

  const north = geographicNorthVector(state.observer).normalize();
  const west = geographicWestVector(state.observer).normalize();
  const bearings = {
    north,
    east: west.clone().multiplyScalar(-1),
    south: north.clone().multiplyScalar(-1),
    west
  };
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
  const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).normalize();
  const radius = 38;

  for (const point of ui.compassPoints) {
    const direction = bearings[point.dataset.bearing];
    const x = direction.dot(right);
    const y = direction.dot(up);
    point.style.transform = `translate(${x * radius}px, ${-y * radius}px) translate(-50%, -50%)`;
  }
}

function updateGraphicsControls() {
  const contrast = Number(ui.contrast.value) / 100;
  earth.material.uniforms.nightStrength.value = contrast;
  const pov = state.viewMode === "pov";
  const earthPov = pov && state.centerMode === "earth";
  const sunPov = pov && state.centerMode === "sun";
  const moonPov = pov && state.centerMode === "moon";

  earth.visible = !pov || sunPov || moonPov;
  moonOrbit.visible = ui.showOrbits.checked;
  eclipticRing.visible = ui.showOrbits.checked;
  sunLine.visible = ui.showLines.checked && !sunPov;
  moonLine.visible = ui.showLines.checked && !moonPov;
  zenithLine.visible = !earthPov && ui.showLines.checked && ui.showObserver.checked;
  stars.visible = ui.showStars.checked;
  sun.visible = ui.showSun.checked && !sunPov;
  moon.visible = ui.showMoon.checked && !moonPov;
  observerMarker.visible = !earthPov && ui.showObserver.checked;
  subsolarMarker.visible = !pov && ui.showSubpoints.checked;
  sublunarMarker.visible = !pov && ui.showSubpoints.checked;
}

function updateDebugOverlay() {
  const enabled = ui.showDebugOverlay.checked;
  ui.debugOverlay.hidden = !enabled;
  if (!enabled) return;

  const debug = state.debug;
  if (!debug) {
    ui.debugSummary.textContent = "Waiting for frame data...";
    ui.debugVectors.hidden = true;
    return;
  }

  ui.debugSummary.textContent = [
    `mode: ${debug.centerMode} | view: ${debug.viewMode}`,
    `texture mode: ${debug.textureSignMode} (auto=${debug.autoLongitudeSign >= 0 ? "+" : ""}${debug.autoLongitudeSign.toFixed(0)})`,
    `active longitudeSign: ${debug.longitudeSign >= 0 ? "+" : ""}${debug.longitudeSign.toFixed(0)}`,
    `observer uv: u=${debug.observerUv.u.toFixed(4)} v=${debug.observerUv.v.toFixed(4)}`,
    `Portland u=${debug.portlandUv.u.toFixed(4)} | Tokyo u=${debug.tokyoUv.u.toFixed(4)}`,
    `raw hemisphere order: ${debug.rawHemisphereOrder}`,
    `visual hemisphere order: ${debug.visualHemisphereOrder} (${debug.visualHemisphereOrder === "W<E" ? "OK" : "REVERSED"})`,
    `opposite sign (${debug.oppositeSign >= 0 ? "+" : ""}${debug.oppositeSign.toFixed(0)}) visual order: ${debug.oppositeVisualOrder}`,
    `observer·sun: ${debug.observerSunDot.toFixed(5)}`
  ].join("\n");

  const showVectors = ui.showDebugVectors.checked;
  ui.debugVectors.hidden = !showVectors;
  if (showVectors) {
    ui.debugVectors.textContent = [
      `subsolar error: ${debug.subsolarErrorDeg.toFixed(5)} deg`,
      `sublunar error: ${debug.sublunarErrorDeg.toFixed(5)} deg`,
      `earth→sun error: ${debug.earthToSunErrorDeg.toFixed(5)} deg`,
      `earth→moon error: ${debug.earthToMoonErrorDeg.toFixed(5)} deg`
    ].join("\n");
  }
}

function graphicsCheckboxes() {
  return [
    ui.showOrbits,
    ui.showLines,
    ui.showStars,
    ui.showSun,
    ui.showMoon,
    ui.showObserver,
    ui.showSubpoints
  ];
}

function geographicToEarthVector(observer) {
  const latitude = THREE.MathUtils.degToRad(Math.min(90, Math.max(-90, observer.latitude)));
  const longitude = THREE.MathUtils.degToRad((((observer.longitude + 180) % 360) + 360) % 360 - 180);
  const cosLatitude = Math.cos(latitude);

  return new THREE.Vector3(
    cosLatitude * Math.cos(longitude),
    Math.sin(latitude),
    -cosLatitude * Math.sin(longitude)
  ).normalize();
}

function geographicNorthVector(observer) {
  const latitude = THREE.MathUtils.degToRad(Math.min(90, Math.max(-90, observer.latitude)));
  const longitude = THREE.MathUtils.degToRad((((observer.longitude + 180) % 360) + 360) % 360 - 180);

  return new THREE.Vector3(
    -Math.sin(latitude) * Math.cos(longitude),
    Math.cos(latitude),
    Math.sin(latitude) * Math.sin(longitude)
  ).normalize();
}

function geographicWestVector(observer) {
  const longitude = THREE.MathUtils.degToRad((((observer.longitude + 180) % 360) + 360) % 360 - 180);

  return new THREE.Vector3(
    Math.sin(longitude),
    0,
    Math.cos(longitude)
  ).normalize();
}

function vectorToThree(vector) {
  return new THREE.Vector3(vector.x, vector.y, vector.z);
}

function surfaceDot(surfaceDirection, bodyDirection) {
  return surfaceDirection.clone().normalize().dot(bodyDirection.clone().normalize());
}

function textureUvForLocalDirection(localDirection, longitudeSign) {
  const normalized = localDirection.clone().normalize();
  const longitude = Math.atan2(longitudeSign * normalized.z, normalized.x);
  const latitude = Math.asin(THREE.MathUtils.clamp(normalized.y, -1, 1));

  return {
    u: (longitude + Math.PI) / (Math.PI * 2),
    v: 0.5 + latitude / Math.PI
  };
}

function resolveLongitudeSign() {
  const mode = ui.debugTextureSignMode.value;
  if (mode === "1" || mode === "-1") {
    return Number(mode);
  }

  return -1;
}

function angleDegrees(a, b) {
  return THREE.MathUtils.radToDeg(a.clone().normalize().angleTo(b.clone().normalize()));
}

function createOrbitRing(radius, color, opacity) {
  const points = [];
  for (let i = 0; i <= 192; i++) {
    const angle = (i / 192) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity
  });
  return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), material);
}

function createRadialLine(color, opacity) {
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity })
  );
}

function createStars(count) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const z = Math.random() * 2 - 1;
    const angle = Math.random() * Math.PI * 2;
    const ring = Math.sqrt(1 - z * z);
    const radius = 28;
    positions[i * 3] = Math.cos(angle) * ring * radius;
    positions[i * 3 + 1] = z * radius;
    positions[i * 3 + 2] = Math.sin(angle) * ring * radius;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xe7f4f6,
      size: 2,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.9,
      fog: false,
      depthTest: true,
      depthWrite: false
    })
  );
}

function createMoonTexture(size) {
  const canvasTexture = createCanvasTexture(size);
  const { canvas, context } = canvasTexture;
  const base = context.createRadialGradient(
    size * 0.34, size * 0.28, size * 0.08,
    size * 0.48, size * 0.5, size * 0.72
  );

  base.addColorStop(0, "#f2f0e8");
  base.addColorStop(0.62, "#aaa99f");
  base.addColorStop(1, "#5c5f5d");
  context.fillStyle = base;
  context.fillRect(0, 0, size, size);

  drawTextureNoise(context, size, 0.18);
  drawMoonCraters(context, size, 130);

  return finishTexture(canvas);
}

function createSunTexture(size) {
  const canvasTexture = createCanvasTexture(size);
  const { canvas, context } = canvasTexture;
  const base = context.createRadialGradient(
    size * 0.38, size * 0.34, size * 0.05,
    size * 0.5, size * 0.5, size * 0.7
  );

  base.addColorStop(0, "#fff4aa");
  base.addColorStop(0.38, "#ffc44d");
  base.addColorStop(0.72, "#ef762f");
  base.addColorStop(1, "#7f230e");
  context.fillStyle = base;
  context.fillRect(0, 0, size, size);

  drawSunBands(context, size);
  drawTextureNoise(context, size, 0.12);

  return finishTexture(canvas);
}

function createCanvasTexture(size) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  return {
    canvas,
    context: canvas.getContext("2d")
  };
}

function finishTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  return texture;
}

function drawTextureNoise(context, size, strength) {
  const image = context.getImageData(0, 0, size, size);
  const data = image.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 255 * strength;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }

  context.putImageData(image, 0, 0);
}

function drawMoonCraters(context, size, count) {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = (0.006 + Math.random() * Math.random() * 0.04) * size;
    const alpha = 0.08 + Math.random() * 0.18;

    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = `rgba(50, 52, 50, ${alpha})`;
    context.fill();
    context.beginPath();
    context.arc(x - radius * 0.16, y - radius * 0.16, radius * 0.7, 0, Math.PI * 2);
    context.strokeStyle = `rgba(255, 255, 240, ${alpha * 0.55})`;
    context.lineWidth = Math.max(1, radius * 0.12);
    context.stroke();
  }
}

function drawSunBands(context, size) {
  context.globalCompositeOperation = "screen";

  for (let y = -size * 0.1; y < size * 1.1; y += size * 0.075) {
    context.beginPath();
    context.moveTo(0, y);
    for (let x = 0; x <= size; x += size * 0.08) {
      const wave = Math.sin((x / size) * Math.PI * 4 + y * 0.02) * size * 0.018;
      context.lineTo(x, y + wave);
    }
    context.strokeStyle = "rgba(255, 232, 120, 0.18)";
    context.lineWidth = size * 0.022;
    context.stroke();
  }

  context.globalCompositeOperation = "source-over";
}
