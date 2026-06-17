import assert from "node:assert/strict";
import * as THREE from "three";
import {
  equatorialBasisToEcliptic,
  geographicSubpoint,
  greenwichSiderealTime,
  horizontalCoordinates,
  julianDate,
  lunarPosition,
  moonPhase,
  observerZenithVector,
  solarPosition
} from "../src/astro.js";

const j2000 = new Date("2000-01-01T12:00:00.000Z");
assert.equal(julianDate(j2000), 2451545);

const eclipse = new Date("2024-04-08T18:18:00.000Z");
const phase = moonPhase(eclipse);
assert.ok(phase.illumination < 0.08, `expected near-new moon, got ${phase.illumination}`);

const full = new Date("2024-04-23T23:49:00.000Z");
const fullPhase = moonPhase(full);
assert.ok(fullPhase.illumination > 0.92, `expected near-full moon, got ${fullPhase.illumination}`);

const sun = solarPosition(new Date("2026-06-21T00:00:00.000Z"));
assert.ok(sun.distanceAu > 0.98 && sun.distanceAu < 1.02);
assert.ok(sun.longitude > 88 && sun.longitude < 91, `expected near June solstice longitude, got ${sun.longitude}`);

const sunToday = solarPosition(new Date("2026-06-17T00:00:00.000Z"));
const sunTomorrow = solarPosition(new Date("2026-06-18T00:00:00.000Z"));
const dailySolarMotion = angleBetween(sunToday.vector, sunTomorrow.vector) * 180 / Math.PI;
assert.ok(
  dailySolarMotion > 0.9 && dailySolarMotion < 1.1,
  `expected inertial solar direction to move about 1 deg/day, got ${dailySolarMotion}`
);
const sunSixHoursLater = solarPosition(new Date("2026-06-17T06:00:00.000Z"));
const sixHourSolarMotion = angleBetween(sunToday.vector, sunSixHoursLater.vector) * 180 / Math.PI;
assert.ok(
  sixHourSolarMotion > 0.2 && sixHourSolarMotion < 0.3,
  `expected inertial solar direction to move about 0.25 deg/6h, got ${sixHourSolarMotion}`
);

const siderealStart = new Date("2026-06-17T00:00:00.000Z");
const siderealEnd = new Date(siderealStart.getTime() + 86164090.5);
const siderealDelta = angularDifferenceDegrees(
  greenwichSiderealTime(siderealStart) * 180 / Math.PI,
  greenwichSiderealTime(siderealEnd) * 180 / Math.PI
);
assert.ok(
  siderealDelta < 0.01,
  `expected Greenwich meridian to return after one sidereal day, got ${siderealDelta} deg`
);

const juneSolsticeGreenwichNoon = horizontalCoordinates(
  new Date("2026-06-21T12:00:00.000Z"),
  { latitude: 0, longitude: 0 },
  solarPosition(new Date("2026-06-21T12:00:00.000Z")).vector
);
assert.ok(
  juneSolsticeGreenwichNoon.altitude > 60 && juneSolsticeGreenwichNoon.altitude < 70,
  `expected equator noon solstice sun near 66 deg, got ${juneSolsticeGreenwichNoon.altitude}`
);

const juneSolsticeSubsolar = geographicSubpoint(
  new Date("2026-06-21T12:00:00.000Z"),
  solarPosition(new Date("2026-06-21T12:00:00.000Z")).vector
);
assert.ok(
  juneSolsticeSubsolar.latitude > 23 && juneSolsticeSubsolar.latitude < 24,
  `expected June solstice subsolar latitude near tropic, got ${juneSolsticeSubsolar.latitude}`
);
assert.ok(
  juneSolsticeSubsolar.longitude > -5 && juneSolsticeSubsolar.longitude < 5,
  `expected June solstice 12:00 UTC subsolar longitude near Greenwich, got ${juneSolsticeSubsolar.longitude}`
);

const portlandNightSun = horizontalCoordinates(
  new Date("2026-06-17T04:55:55.948Z"),
  { latitude: 45.5152, longitude: -122.6784 },
  solarPosition(new Date("2026-06-17T04:55:55.948Z")).vector
);
assert.ok(portlandNightSun.altitude < 0, `expected Portland night sun below horizon, got ${portlandNightSun.altitude}`);
assert.equal(portlandNightSun.visible, false);

const portlandNightDate = new Date("2026-06-17T04:55:55.948Z");
const portlandSurface = surfaceVector(
  portlandNightDate,
  { latitude: 45.5152, longitude: -122.6784 }
);
const portlandSun = solarPosition(portlandNightDate).vector;
const portlandSunLength = length(portlandSun);
const portlandSunDirection = {
  x: portlandSun.x / portlandSunLength,
  y: portlandSun.y / portlandSunLength,
  z: portlandSun.z / portlandSunLength
};
const litSideDot = dot(portlandSurface, portlandSunDirection);
assert.ok(litSideDot < 0, `expected Portland to be on the night side, got dot ${litSideDot}`);
assert.ok(Math.abs(Math.asin(litSideDot) * 180 / Math.PI - portlandNightSun.altitude) < 1e-9);

const moon = lunarPosition(new Date("2026-06-21T00:00:00.000Z"));
assert.ok(moon.distanceKm > 350000 && moon.distanceKm < 410000);

const greenwichEquinoxNoon = new Date("2024-03-20T12:00:00.000Z");
const noonSun = horizontalCoordinates(
  greenwichEquinoxNoon,
  { latitude: 0, longitude: 0 },
  solarPosition(greenwichEquinoxNoon).vector
);
assert.ok(noonSun.altitude > 80, `expected high noon sun, got ${noonSun.altitude}`);
assert.equal(noonSun.visible, true);

const greenwichEquinoxMidnight = new Date("2024-03-20T00:00:00.000Z");
const midnightSun = horizontalCoordinates(
  greenwichEquinoxMidnight,
  { latitude: 0, longitude: 0 },
  solarPosition(greenwichEquinoxMidnight).vector
);
assert.ok(midnightSun.altitude < -80, `expected midnight sun below horizon, got ${midnightSun.altitude}`);
assert.equal(midnightSun.visible, false);

const zenith = observerZenithVector(greenwichEquinoxNoon, { latitude: 45, longitude: -122 });
const zenithLength = Math.hypot(zenith.x, zenith.y, zenith.z);
assert.ok(Math.abs(zenithLength - 1) < 1e-12);

const basis = equatorialBasisToEcliptic(greenwichEquinoxNoon);
assert.ok(Math.abs(length(basis.greenwich) - 1) < 1e-12);
assert.ok(Math.abs(length(basis.north) - 1) < 1e-12);
assert.ok(Math.abs(length(basis.west90) - 1) < 1e-12);
assert.ok(Math.abs(dot(basis.greenwich, basis.north)) < 1e-12);
assert.ok(Math.abs(dot(basis.greenwich, basis.west90)) < 1e-12);
assert.ok(Math.abs(dot(basis.north, basis.west90)) < 1e-12);

const greenwichZenith = observerZenithVector(greenwichEquinoxNoon, { latitude: 0, longitude: 0 });
assert.ok(angleBetween(greenwichZenith, basis.greenwich) < 1e-7);

const west90Zenith = observerZenithVector(greenwichEquinoxNoon, { latitude: 0, longitude: -90 });
assert.ok(angleBetween(west90Zenith, basis.west90) < 1e-7);

const orientationStart = earthOrientationBasis(new Date("2026-06-17T00:00:00.000Z"));
const orientationEnd = earthOrientationBasis(new Date("2026-06-17T06:00:00.000Z"));
assert.ok(
  angleBetween(orientationStart.north, orientationEnd.north) < 1e-12,
  "expected Earth axis to stay fixed during sidereal spin"
);
assert.ok(
  angleBetween(orientationStart.greenwich, orientationEnd.greenwich) > Math.PI / 2 - 0.02 &&
    angleBetween(orientationStart.greenwich, orientationEnd.greenwich) < Math.PI / 2 + 0.02,
  "expected Greenwich meridian to rotate around the fixed Earth axis over six hours"
);

const renderSurface = renderSurfaceVector(portlandNightDate, { latitude: 45.5152, longitude: -122.6784 });
assert.ok(
  Math.abs(dot(renderSurface, portlandSunDirection) - litSideDot) < 1e-12,
  "expected rendered Sun-centered Earth orientation to preserve daylight/night side"
);

const greenwichUv = earthTextureUv({ latitude: 0, longitude: 0 });
assert.ok(Math.abs(greenwichUv.u - 0.5) < 1e-12, `expected Greenwich at texture center, got u ${greenwichUv.u}`);
const portlandUv = earthTextureUv({ latitude: 45.5152, longitude: -122.6784 });
assert.ok(Math.abs(portlandUv.u - 0.15922666666666666) < 1e-12, `expected Portland in western North America texture U, got u ${portlandUv.u}`);
const tokyoUv = earthTextureUv({ latitude: 35.6764, longitude: 139.65 });
assert.ok(Math.abs(tokyoUv.u - 0.8879166666666667) < 1e-12, `expected Tokyo in eastern Asia texture U, got u ${tokyoUv.u}`);
assert.ok(portlandUv.v > 0.5, `expected northern latitudes above texture equator, got v ${portlandUv.v}`);
const renderedPortlandUv = renderedEarthTextureUv(portlandNightDate, { latitude: 45.5152, longitude: -122.6784 });
assert.ok(
  Math.abs(renderedPortlandUv.u - portlandUv.u) < 1e-12,
  `expected rendered texture sampling to preserve Portland longitude, got u ${renderedPortlandUv.u}`
);

const frameRegressionDate = new Date("2026-06-17T05:30:00.000Z");
for (const body of [solarPosition(frameRegressionDate), lunarPosition(frameRegressionDate)]) {
  const subpoint = geographicSubpoint(frameRegressionDate, body.vector);
  const reconstructedDirection = surfaceVector(frameRegressionDate, subpoint);
  const renderedDirection = renderSurfaceVector(frameRegressionDate, subpoint);
  assert.ok(
    angleBetween(reconstructedDirection, body.vector) < 1e-7,
    "expected subpoint renderer direction to match inertial body direction"
  );
  assert.ok(
    angleBetween(renderedDirection, body.vector) < 1e-7,
    "expected rendered subpoint marker direction to match inertial body direction"
  );
}

for (const mode of ["earth", "sun", "moon"]) {
  const layout = centeredLayout(frameRegressionDate, mode);
  const sunSubpoint = geographicSubpoint(frameRegressionDate, solarPosition(frameRegressionDate).vector);
  const moonSubpoint = geographicSubpoint(frameRegressionDate, lunarPosition(frameRegressionDate).vector);
  const observerLocal = earthLocalVector({ latitude: 45.5152, longitude: -122.6784 });
  const subsolarLocal = earthLocalVector(sunSubpoint);
  const sublunarLocal = earthLocalVector(moonSubpoint);
  const observerWorld = earthLocalToWorldDirectionForMode(observerLocal, layout.earthOrientation, mode);
  const subsolarWorld = mode === "earth"
    ? earthLocalToWorldDirectionForMode(subsolarLocal, layout.earthOrientation, mode)
    : layout.sunDirection.clone();
  const sublunarWorld = mode === "earth"
    ? earthLocalToWorldDirectionForMode(sublunarLocal, layout.earthOrientation, mode)
    : layout.moonDirection.clone();
  const textureFrameObserver = textureFrameLocalDirectionForMode(observerLocal, mode);
  const textureUv = textureUvForMode(observerLocal, mode);
  const markerUv = textureUvFromFrameDirection(textureFrameObserver);
  const markerTextureLocal = renderedWorldToTextureLocal(observerWorld, layout.earthOrientation, mode);

  assert.ok(
    angleBetween(subsolarWorld, layout.sunDirection) < 1e-7,
    `expected ${mode} mode subsolar marker direction to align with Sun direction`
  );
  assert.ok(
    angleBetween(sublunarWorld, layout.moonDirection) < 1e-7,
    `expected ${mode} mode sublunar marker direction to align with Moon direction`
  );

  const localLitDot = mode === "earth"
    ? observerLocal.dot(subsolarLocal)
    : observerWorld.dot(layout.sunDirection);
  const worldLitDot = observerWorld.dot(layout.sunDirection);
  assert.ok(
    Math.abs(localLitDot - worldLitDot) < 1e-12,
    `expected ${mode} mode observer day/night side to match Earth-local reference`
  );
  assert.ok(
    Math.abs(textureUv.u - markerUv.u) < 1e-12 && Math.abs(textureUv.v - markerUv.v) < 1e-12,
    `expected ${mode} mode observer texture UV to match marker frame`
  );
  assert.ok(
    angleBetween(markerTextureLocal, observerLocal) < 1e-12,
    `expected ${mode} mode observer marker to invert to its original texture coordinate`
  );

  const earthToSun = layout.sun.clone().sub(layout.earth).normalize();
  const earthToMoon = layout.moon.clone().sub(layout.earth).normalize();
  assert.ok(
    angleBetween(earthToSun, layout.sunDirection) < 1e-7,
    `expected ${mode} mode Earth-to-Sun vector to match layout Sun direction`
  );
  assert.ok(
    angleBetween(earthToMoon, layout.moonDirection) < 1e-7,
    `expected ${mode} mode Earth-to-Moon vector to match layout Moon direction`
  );
}

const sunCenteredStart = centeredLayout(new Date("2026-06-17T00:00:00.000Z"), "sun");
const sunCenteredSixHours = centeredLayout(new Date("2026-06-17T06:00:00.000Z"), "sun");
const sunCenteredDaily = centeredLayout(new Date("2026-06-18T00:00:00.000Z"), "sun");
const sunCenteredSixHourMotion = sunCenteredStart.earth.angleTo(sunCenteredSixHours.earth) * 180 / Math.PI;
const sunCenteredDailyMotion = sunCenteredStart.earth.angleTo(sunCenteredDaily.earth) * 180 / Math.PI;
assert.ok(
  sunCenteredSixHourMotion > 0.2 && sunCenteredSixHourMotion < 0.3,
  `expected Sun-centered Earth orbit to advance about 0.25 deg/6h, got ${sunCenteredSixHourMotion}`
);
assert.ok(
  sunCenteredDailyMotion > 0.9 && sunCenteredDailyMotion < 1.1,
  `expected Sun-centered Earth orbit to advance about 1 deg/day, got ${sunCenteredDailyMotion}`
);

const sunCenteredGreenwichStart = earthLocalToWorldDirectionForMode(
  earthLocalVector({ latitude: 0, longitude: 0 }),
  sunCenteredStart.earthOrientation,
  "sun"
);
const sunCenteredGreenwichSixHours = earthLocalToWorldDirectionForMode(
  earthLocalVector({ latitude: 0, longitude: 0 }),
  sunCenteredSixHours.earthOrientation,
  "sun"
);
const sunCenteredGreenwichSpin = sunCenteredGreenwichStart.angleTo(sunCenteredGreenwichSixHours) * 180 / Math.PI;
assert.ok(
  sunCenteredGreenwichSpin > 89 && sunCenteredGreenwichSpin < 91,
  `expected Earth surface to keep rotating in Sun center view, got ${sunCenteredGreenwichSpin} deg in 6h`
);

console.log("astro tests passed");

function centeredLayout(date, mode) {
  const EARTH_CENTER_SUN_DISTANCE = 6.8;
  const EARTH_CENTER_MOON_DISTANCE = 2.15;
  const SUN_CENTER_EARTH_DISTANCE = 3.9;
  const SUN_CENTER_MOON_DISTANCE = 1.35;
  const MOON_CENTER_EARTH_DISTANCE = 2.15;
  const MOON_CENTER_SUN_DISTANCE = 6.8;

  const sunSubpoint = geographicSubpoint(date, solarPosition(date).vector);
  const moonSubpoint = geographicSubpoint(date, lunarPosition(date).vector);
  const sunEarthDirection = earthLocalVector(sunSubpoint).normalize();
  const moonEarthDirection = earthLocalVector(moonSubpoint).normalize();
  const sunWorldDirection = threeVector(solarPosition(date).vector).normalize();
  const moonWorldDirection = threeVector(lunarPosition(date).vector).normalize();
  const earthOrientation = earthOrientationQuaternion(date);
  const sunCenteredFrameDirection = sunWorldDirection.clone();
  const moonCenteredFrameDirection = moonWorldDirection.clone();

  if (mode === "sun") {
    const earth = sunCenteredFrameDirection.clone().multiplyScalar(-SUN_CENTER_EARTH_DISTANCE);
    return {
      earth,
      sun: new THREE.Vector3(0, 0, 0),
      moon: earth.clone().add(moonCenteredFrameDirection.clone().multiplyScalar(SUN_CENTER_MOON_DISTANCE)),
      sunDirection: sunCenteredFrameDirection,
      moonDirection: moonCenteredFrameDirection,
      earthOrientation
    };
  }

  if (mode === "moon") {
    const earth = moonCenteredFrameDirection.clone().multiplyScalar(-MOON_CENTER_EARTH_DISTANCE);
    return {
      earth,
      sun: earth.clone().add(sunCenteredFrameDirection.clone().multiplyScalar(MOON_CENTER_SUN_DISTANCE)),
      moon: new THREE.Vector3(0, 0, 0),
      sunDirection: sunCenteredFrameDirection,
      moonDirection: moonCenteredFrameDirection,
      earthOrientation
    };
  }

  return {
    earth: new THREE.Vector3(0, 0, 0),
    sun: sunEarthDirection.clone().multiplyScalar(EARTH_CENTER_SUN_DISTANCE),
    moon: moonEarthDirection.clone().multiplyScalar(EARTH_CENTER_MOON_DISTANCE),
    sunDirection: sunEarthDirection,
    moonDirection: moonEarthDirection,
    earthOrientation: new THREE.Quaternion()
  };
}

function earthOrientationQuaternion(date) {
  const basis = equatorialBasisToEcliptic(date);
  const matrix = new THREE.Matrix4().makeBasis(
    threeVector(basis.greenwich).normalize(),
    threeVector(basis.north).normalize(),
    threeVector(basis.west90).multiplyScalar(-1).normalize()
  );

  return new THREE.Quaternion().setFromRotationMatrix(matrix);
}

function earthLocalToWorldDirectionForMode(localDirection, orientation, mode) {
  return markerFrameLocalDirectionForMode(localDirection, mode)
    .applyQuaternion(orientation)
    .normalize();
}

function markerFrameLocalDirectionForMode(localDirection, mode) {
  return localDirection.clone().normalize();
}

function textureFrameLocalDirectionForMode(localDirection, mode) {
  return localDirection.clone().normalize();
}

function textureUvForMode(localDirection, mode) {
  return textureUvFromFrameDirection(textureFrameLocalDirectionForMode(localDirection, mode));
}

function textureUvFromFrameDirection(direction) {
  const normalized = direction.clone().normalize();
  const longitude = Math.atan2(-normalized.z, normalized.x);
  const latitude = Math.asin(Math.max(-1, Math.min(1, normalized.y)));

  return {
    u: (longitude + Math.PI) / (Math.PI * 2),
    v: 0.5 + latitude / Math.PI
  };
}

function renderedWorldToTextureLocal(worldDirection, orientation, mode) {
  return worldDirection.clone()
    .applyQuaternion(orientation.clone().invert())
    .normalize();
}

function length(vector) {
  return Math.hypot(vector.x, vector.y, vector.z);
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function angleBetween(a, b) {
  return Math.acos(Math.min(1, Math.max(-1, dot(a, b) / (length(a) * length(b)))));
}

function angularDifferenceDegrees(a, b) {
  const difference = Math.abs(((b - a + 180) % 360 + 360) % 360 - 180);
  return difference;
}

function surfaceVector(date, observer) {
  const basis = equatorialBasisToEcliptic(date);
  const latitude = observer.latitude * Math.PI / 180;
  const longitude = observer.longitude * Math.PI / 180;
  const local = {
    x: Math.cos(latitude) * Math.cos(longitude),
    y: Math.sin(latitude),
    z: -Math.cos(latitude) * Math.sin(longitude)
  };

  return {
    x: basis.greenwich.x * local.x + basis.north.x * local.y + basis.west90.x * local.z,
    y: basis.greenwich.y * local.x + basis.north.y * local.y + basis.west90.y * local.z,
    z: basis.greenwich.z * local.x + basis.north.z * local.y + basis.west90.z * local.z
  };
}

function earthOrientationBasis(date) {
  const basis = equatorialBasisToEcliptic(date);
  return {
    greenwich: basis.greenwich,
    north: basis.north
  };
}

function renderSurfaceVector(date, observer) {
  const basis = equatorialBasisToEcliptic(date);
  const matrix = new THREE.Matrix4().makeBasis(
    threeVector(basis.greenwich).normalize(),
    threeVector(basis.north).normalize(),
    threeVector(basis.west90).multiplyScalar(-1).normalize()
  );
  const orientation = new THREE.Quaternion().setFromRotationMatrix(matrix);
  const latitude = observer.latitude * Math.PI / 180;
  const longitude = observer.longitude * Math.PI / 180;
  const cosLatitude = Math.cos(latitude);
  const local = new THREE.Vector3(
    cosLatitude * Math.cos(longitude),
    Math.sin(latitude),
    -cosLatitude * Math.sin(longitude)
  );

  const rendered = local.multiply(new THREE.Vector3(1, 1, -1)).applyQuaternion(orientation);
  return {
    x: rendered.x,
    y: rendered.y,
    z: rendered.z
  };
}

function earthTextureUv(observer) {
  const latitude = observer.latitude * Math.PI / 180;
  const longitude = observer.longitude * Math.PI / 180;
  const cosLatitude = Math.cos(latitude);
  const local = new THREE.Vector3(
    cosLatitude * Math.cos(longitude),
    Math.sin(latitude),
    -cosLatitude * Math.sin(longitude)
  ).normalize();
  const textureLongitude = Math.atan2(-local.z, local.x);
  const textureLatitude = Math.asin(Math.max(-1, Math.min(1, local.y)));

  return {
    u: (textureLongitude + Math.PI) / (Math.PI * 2),
    v: 0.5 + textureLatitude / Math.PI
  };
}

function renderedEarthTextureUv(date, observer) {
  const local = earthLocalVector(observer);
  const longitude = Math.atan2(-local.z, local.x);
  const latitude = Math.asin(Math.max(-1, Math.min(1, local.y)));

  return {
    u: (longitude + Math.PI) / (Math.PI * 2),
    v: 0.5 + latitude / Math.PI
  };
}

function earthLocalVector(observer) {
  const latitude = observer.latitude * Math.PI / 180;
  const longitude = observer.longitude * Math.PI / 180;
  const cosLatitude = Math.cos(latitude);

  return new THREE.Vector3(
    cosLatitude * Math.cos(longitude),
    Math.sin(latitude),
    -cosLatitude * Math.sin(longitude)
  ).normalize();
}

function threeVector(vector) {
  return new THREE.Vector3(vector.x, vector.y, vector.z);
}
