const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const J2000 = 2451545.0;
const OBLIQUITY = 23.439291 * DEG;

export function julianDate(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

function normalizeDegrees(value) {
  return ((value % 360) + 360) % 360;
}

function normalizeRadians(value) {
  return normalizeDegrees(value * RAD) * DEG;
}

export function solarPosition(date) {
  const d = julianDate(date) - J2000;
  const meanLongitude = normalizeDegrees(280.46646 + 0.98564736 * d);
  const meanAnomaly = normalizeDegrees(357.52911 + 0.98560028 * d);
  const anomaly = meanAnomaly * DEG;
  const equation =
    (1.914602 - 0.000014 * d / 36525) * Math.sin(anomaly) +
    0.019993 * Math.sin(2 * anomaly) +
    0.000289 * Math.sin(3 * anomaly);
  const longitude = normalizeDegrees(meanLongitude + equation);
  const distanceAu = 1.00014 - 0.01671 * Math.cos(anomaly) - 0.00014 * Math.cos(2 * anomaly);

  return {
    longitude,
    latitude: 0,
    distanceAu,
    vector: eclipticToVector(longitude, 0, distanceAu)
  };
}

export function lunarPosition(date) {
  const d = julianDate(date) - J2000;
  const l = normalizeRadians((218.316 + 13.176396 * d) * DEG);
  const m = normalizeRadians((134.963 + 13.064993 * d) * DEG);
  const f = normalizeRadians((93.272 + 13.229350 * d) * DEG);

  const longitude = normalizeDegrees((l + 6.289 * DEG * Math.sin(m)) * RAD);
  const latitude = 5.128 * Math.sin(f);
  const distanceKm = 385001 - 20905 * Math.cos(m);

  return {
    longitude,
    latitude,
    distanceKm,
    vector: eclipticToVector(longitude, latitude, distanceKm / 384400)
  };
}

export function horizontalCoordinates(date, observer, eclipticVector) {
  const equatorial = eclipticVectorToEquatorial(eclipticVector);
  const latitude = clamp(observer.latitude, -90, 90) * DEG;
  const longitude = normalizeLongitude(observer.longitude) * DEG;
  const siderealTime = greenwichSiderealTime(date) + longitude;
  const hourAngle = normalizeRadians(siderealTime - equatorial.rightAscension);

  const sinAltitude =
    Math.sin(latitude) * Math.sin(equatorial.declination) +
    Math.cos(latitude) * Math.cos(equatorial.declination) * Math.cos(hourAngle);
  const altitude = Math.asin(clamp(sinAltitude, -1, 1));
  const azimuth = Math.atan2(
    -Math.sin(hourAngle),
    Math.tan(equatorial.declination) * Math.cos(latitude) -
      Math.sin(latitude) * Math.cos(hourAngle)
  );

  return {
    altitude: altitude * RAD,
    azimuth: normalizeDegrees(azimuth * RAD),
    visible: altitude > 0
  };
}

export function geographicSubpoint(date, eclipticVector) {
  const basis = equatorialBasisToEcliptic(date);
  const vector = normalizeVector(eclipticVector);
  const local = {
    x: dot(vector, basis.greenwich),
    y: dot(vector, basis.north),
    z: dot(vector, basis.west90)
  };

  return {
    latitude: Math.asin(clamp(local.y, -1, 1)) * RAD,
    longitude: normalizeLongitude(Math.atan2(-local.z, local.x) * RAD)
  };
}

export function observerZenithVector(date, observer) {
  const latitude = clamp(observer.latitude, -90, 90) * DEG;
  const longitude = normalizeLongitude(observer.longitude) * DEG;
  const siderealTime = greenwichSiderealTime(date) + longitude;
  const equatorial = {
    x: Math.cos(latitude) * Math.cos(siderealTime),
    y: Math.cos(latitude) * Math.sin(siderealTime),
    z: Math.sin(latitude)
  };

  return equatorialToEclipticVector(equatorial);
}

export function greenwichSiderealTime(date) {
  const d = julianDate(date) - J2000;
  return normalizeRadians((280.46061837 + 360.98564736629 * d) * DEG);
}

export function earthAxisVector() {
  return equatorialToEclipticVector({ x: 0, y: 0, z: 1 });
}

export function equatorialBasisToEcliptic(date) {
  const siderealTime = greenwichSiderealTime(date);
  return {
    greenwich: equatorialToEclipticVector({
      x: Math.cos(siderealTime),
      y: Math.sin(siderealTime),
      z: 0
    }),
    west90: equatorialToEclipticVector({
      x: Math.sin(siderealTime),
      y: -Math.cos(siderealTime),
      z: 0
    }),
    north: earthAxisVector()
  };
}

export function moonPhase(date) {
  const sun = solarPosition(date);
  const moon = lunarPosition(date);
  const angle = normalizeDegrees(moon.longitude - sun.longitude);
  const illumination = (1 - Math.cos(angle * DEG)) / 2;
  const names = [
    "New moon",
    "Waxing crescent",
    "First quarter",
    "Waxing gibbous",
    "Full moon",
    "Waning gibbous",
    "Last quarter",
    "Waning crescent"
  ];
  const index = Math.round(angle / 45) % 8;

  return {
    angle,
    illumination,
    name: names[index]
  };
}

export function eclipticToVector(longitudeDeg, latitudeDeg, radius) {
  const lon = longitudeDeg * DEG;
  const lat = latitudeDeg * DEG;
  const cosLat = Math.cos(lat);

  return {
    x: radius * cosLat * Math.cos(lon),
    y: radius * Math.sin(lat),
    z: radius * cosLat * Math.sin(lon)
  };
}

export function formatDegrees(value) {
  return `${normalizeDegrees(value).toFixed(2)} deg`;
}

export function formatSignedDegrees(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} deg`;
}

function eclipticVectorToEquatorial(vector) {
  const radius = Math.hypot(vector.x, vector.y, vector.z) || 1;
  const x = vector.x / radius;
  const y = vector.y / radius;
  const z = vector.z / radius;
  const equatorial = {
    x,
    y: z * Math.cos(OBLIQUITY) - y * Math.sin(OBLIQUITY),
    z: z * Math.sin(OBLIQUITY) + y * Math.cos(OBLIQUITY)
  };

  return {
    rightAscension: normalizeRadians(Math.atan2(equatorial.y, equatorial.x)),
    declination: Math.asin(clamp(equatorial.z, -1, 1))
  };
}

function equatorialToEclipticVector(vector) {
  return {
    x: vector.x,
    y: -vector.y * Math.sin(OBLIQUITY) + vector.z * Math.cos(OBLIQUITY),
    z: vector.y * Math.cos(OBLIQUITY) + vector.z * Math.sin(OBLIQUITY)
  };
}

function normalizeLongitude(value) {
  return ((value + 180) % 360 + 360) % 360 - 180;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeVector(vector) {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length
  };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
