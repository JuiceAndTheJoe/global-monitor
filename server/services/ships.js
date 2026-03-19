import * as cache from './cache.js';
import { recordSuccess } from '../utils/metrics.js';

const CACHE_KEY = 'ships_data';
const CACHE_TTL = 60; // 60 seconds

// Major shipping routes and lanes
const SHIPPING_LANES = [
  // Suez Canal
  { start: [32.3, 29.9], end: [32.35, 31.25], name: 'Suez Canal' },
  // Panama Canal
  { start: [-79.92, 8.97], end: [-79.52, 9.37], name: 'Panama Canal' },
  // Strait of Malacca
  { start: [100.3, 1.4], end: [104.3, 5.5], name: 'Strait of Malacca' },
  // English Channel
  { start: [-1.5, 49.0], end: [2.5, 51.5], name: 'English Channel' },
  // Gibraltar Strait
  { start: [-5.8, 35.9], end: [-5.3, 36.2], name: 'Strait of Gibraltar' },
  // Singapore Strait
  { start: [103.6, 1.2], end: [104.2, 1.4], name: 'Singapore Strait' },
  // Dover Strait
  { start: [1.0, 50.8], end: [2.0, 51.2], name: 'Dover Strait' },
  // Bosphorus
  { start: [29.0, 41.0], end: [29.1, 41.2], name: 'Bosphorus' },
  // Hormuz Strait
  { start: [56.0, 26.5], end: [57.0, 27.0], name: 'Strait of Hormuz' },
  // Trans-Pacific (LA to Shanghai)
  { start: [-118.2, 33.7], end: [121.5, 31.2], name: 'Trans-Pacific Route' },
  // Trans-Atlantic (NY to Liverpool)
  { start: [-74.0, 40.7], end: [-3.0, 53.4], name: 'Trans-Atlantic Route' },
  // Mediterranean (Barcelona to Alexandria)
  { start: [2.2, 41.4], end: [29.9, 31.2], name: 'Mediterranean Route' },
  // Indian Ocean (Mumbai to Singapore)
  { start: [72.8, 18.9], end: [103.8, 1.3], name: 'Indian Ocean Route' },
  // North Sea (Rotterdam to Oslo)
  { start: [4.5, 51.9], end: [10.7, 59.9], name: 'North Sea Route' },
  // South China Sea
  { start: [114.1, 22.3], end: [120.9, 14.6], name: 'South China Sea Route' },
  // Red Sea
  { start: [32.9, 22.0], end: [36.5, 27.9], name: 'Red Sea Route' },
];

const SHIP_TYPES = [
  { type: 'cargo', name: 'Cargo Ship', probability: 0.45 },
  { type: 'tanker', name: 'Oil Tanker', probability: 0.25 },
  { type: 'passenger', name: 'Passenger Ship', probability: 0.15 },
  { type: 'container', name: 'Container Ship', probability: 0.10 },
  { type: 'military', name: 'Naval Vessel', probability: 0.05 },
];

const DESTINATIONS = [
  'Shanghai', 'Singapore', 'Rotterdam', 'Ningbo', 'Busan', 'Guangzhou',
  'Hong Kong', 'Los Angeles', 'Hamburg', 'Antwerp', 'Port Klang',
  'Dubai', 'New York', 'Tanjung Pelepas', 'Kaohsiung', 'Dalian',
  'Xiamen', 'Qingdao', 'Tianjin', 'Long Beach', 'Southampton',
  'Alexandria', 'Mumbai', 'Sydney', 'Tokyo', 'Marseille',
  'Barcelona', 'Genoa', 'Valencia', 'Piraeus', 'Jeddah'
];

const FLAGS = [
  'Panama', 'Liberia', 'Marshall Islands', 'Hong Kong', 'Singapore',
  'Malta', 'Bahamas', 'China', 'Greece', 'Japan', 'Norway',
  'Cyprus', 'Italy', 'UK', 'USA', 'Germany', 'Denmark', 'Netherlands',
  'South Korea', 'India', 'Turkey', 'Indonesia', 'Malaysia'
];

// Generate consistent ships based on shipping lanes
let generatedShips = null;
let lastGenerationTime = 0;
const GENERATION_INTERVAL = 60000; // Regenerate every 60 seconds

/**
 * Get ships data (mock/realistic simulation)
 * @returns {Promise<Array>} Array of ship objects
 */
export async function getShips() {
  // Check cache first
  const cached = cache.get(CACHE_KEY);
  if (cached) {
    return cached;
  }

  // Generate or update ships
  const ships = generateShips();

  // Cache the result
  cache.set(CACHE_KEY, ships, CACHE_TTL);

  // Record success metric (ships are always successfully generated)
  recordSuccess('ships');

  return ships;
}

function generateShips() {
  const now = Date.now();

  // Generate new ships periodically or on first call
  if (!generatedShips || (now - lastGenerationTime) > GENERATION_INTERVAL) {
    generatedShips = createShips();
    lastGenerationTime = now;
  } else {
    // Update positions of existing ships
    updateShipPositions(generatedShips);
  }

  return generatedShips;
}

function createShips() {
  const ships = [];
  let shipId = 1000;

  // Generate ships along each shipping lane
  SHIPPING_LANES.forEach(lane => {
    const shipsPerLane = Math.floor(Math.random() * 5) + 3; // 3-7 ships per lane

    for (let i = 0; i < shipsPerLane; i++) {
      const shipType = selectShipType();
      const position = interpolatePosition(lane.start, lane.end, Math.random());
      const heading = calculateHeading(lane.start, lane.end);
      const speed = generateSpeed(shipType);

      ships.push({
        id: `SHIP-${shipId++}`,
        coordinates: position,
        properties: {
          name: generateShipName(shipType),
          type: shipType.type,
          typeName: shipType.name,
          speed: speed, // knots
          heading: heading + (Math.random() - 0.5) * 20, // Add some variation
          destination: DESTINATIONS[Math.floor(Math.random() * DESTINATIONS.length)],
          flag: FLAGS[Math.floor(Math.random() * FLAGS.length)],
          length: generateLength(shipType),
          route: lane.name
        },
        movement: {
          startLat: lane.start[1],
          startLon: lane.start[0],
          endLat: lane.end[1],
          endLon: lane.end[0],
          progress: Math.random(),
          speed: speed
        }
      });
    }
  });

  // Add some ships in ports (stationary)
  const ports = [
    [121.5, 31.2], // Shanghai
    [103.8, 1.3],  // Singapore
    [4.5, 51.9],   // Rotterdam
    [-118.2, 33.7], // Los Angeles
    [139.7, 35.7],  // Tokyo
    [-74.0, 40.7],  // New York
    [114.1, 22.3],  // Hong Kong
    [55.3, 25.3],   // Dubai
  ];

  ports.forEach(port => {
    const shipsInPort = Math.floor(Math.random() * 3) + 1; // 1-3 ships per port
    for (let i = 0; i < shipsInPort; i++) {
      const shipType = selectShipType();
      ships.push({
        id: `SHIP-${shipId++}`,
        coordinates: [port[0] + (Math.random() - 0.5) * 0.1, port[1] + (Math.random() - 0.5) * 0.1],
        properties: {
          name: generateShipName(shipType),
          type: shipType.type,
          typeName: shipType.name,
          speed: 0,
          heading: Math.random() * 360,
          destination: 'In Port',
          flag: FLAGS[Math.floor(Math.random() * FLAGS.length)],
          length: generateLength(shipType),
          route: 'Docked'
        },
        movement: null // Stationary
      });
    }
  });

  return ships;
}

function updateShipPositions(ships) {
  const deltaTime = 60; // 60 seconds between updates

  ships.forEach(ship => {
    if (ship.movement && ship.movement.speed > 0) {
      // Update progress along route
      // Speed is in knots, convert to degrees per second (very rough approximation)
      const speedDegPerSec = (ship.movement.speed * 0.000514444) / 60; // knots to deg/sec
      const progressDelta = speedDegPerSec * deltaTime / calculateDistance(
        ship.movement.startLat,
        ship.movement.startLon,
        ship.movement.endLat,
        ship.movement.endLon
      );

      ship.movement.progress += progressDelta;

      // Loop back if reached destination
      if (ship.movement.progress >= 1) {
        ship.movement.progress = 0;
      }

      // Update coordinates
      ship.coordinates = interpolatePosition(
        [ship.movement.startLon, ship.movement.startLat],
        [ship.movement.endLon, ship.movement.endLat],
        ship.movement.progress
      );
    }
  });
}

function selectShipType() {
  const rand = Math.random();
  let cumulative = 0;

  for (const type of SHIP_TYPES) {
    cumulative += type.probability;
    if (rand <= cumulative) {
      return type;
    }
  }

  return SHIP_TYPES[0];
}

function generateShipName(shipType) {
  const prefixes = ['MSC', 'MAERSK', 'COSCO', 'EVER', 'CMA CGM', 'HAPAG', 'ONE', 'YANG MING', 'PIL', 'OOCL'];
  const names = [
    'FORTUNE', 'PROSPERITY', 'NAVIGATOR', 'VOYAGER', 'PIONEER', 'EXPLORER',
    'ENDEAVOUR', 'DISCOVERY', 'TRIUMPH', 'VICTORY', 'HARMONY', 'SERENITY',
    'OCEAN', 'PEARL', 'DIAMOND', 'EMERALD', 'SAPPHIRE', 'AURORA', 'HORIZON'
  ];

  if (shipType.type === 'military') {
    return `HMS ${names[Math.floor(Math.random() * names.length)]}`;
  }

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const name = names[Math.floor(Math.random() * names.length)];
  return `${prefix} ${name}`;
}

function generateSpeed(shipType) {
  // Speed in knots
  const speedRanges = {
    cargo: [12, 18],
    tanker: [10, 16],
    container: [18, 25],
    passenger: [20, 30],
    military: [15, 35]
  };

  const range = speedRanges[shipType.type] || [10, 20];
  return Math.random() * (range[1] - range[0]) + range[0];
}

function generateLength(shipType) {
  // Length in meters
  const lengthRanges = {
    cargo: [150, 250],
    tanker: [200, 330],
    container: [250, 400],
    passenger: [200, 360],
    military: [100, 250]
  };

  const range = lengthRanges[shipType.type] || [100, 300];
  return Math.floor(Math.random() * (range[1] - range[0]) + range[0]);
}

function interpolatePosition(start, end, progress) {
  const lon = start[0] + (end[0] - start[0]) * progress;
  const lat = start[1] + (end[1] - start[1]) * progress;
  return [lon, lat];
}

function calculateHeading(start, end) {
  const deltaLon = end[0] - start[0];
  const deltaLat = end[1] - start[1];
  const heading = Math.atan2(deltaLon, deltaLat) * (180 / Math.PI);
  return (heading + 360) % 360; // Normalize to 0-360
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const deltaLat = lat2 - lat1;
  const deltaLon = lon2 - lon1;
  return Math.sqrt(deltaLat * deltaLat + deltaLon * deltaLon);
}

export default { getShips };
