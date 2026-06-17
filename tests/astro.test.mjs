import assert from "node:assert/strict";
import {
  equatorialBasisToEcliptic,
  geographicSubpoint,
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

const frameRegressionDate = new Date("2026-06-17T05:30:00.000Z");
for (const body of [solarPosition(frameRegressionDate), lunarPosition(frameRegressionDate)]) {
  const subpoint = geographicSubpoint(frameRegressionDate, body.vector);
  const reconstructedDirection = surfaceVector(frameRegressionDate, subpoint);
  assert.ok(
    angleBetween(reconstructedDirection, body.vector) < 1e-7,
    "expected subpoint renderer direction to match inertial body direction"
  );
}

console.log("astro tests passed");

function length(vector) {
  return Math.hypot(vector.x, vector.y, vector.z);
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function angleBetween(a, b) {
  return Math.acos(Math.min(1, Math.max(-1, dot(a, b) / (length(a) * length(b)))));
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
