const API_BASE = '/api';

async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const json = await response.json();
  return json.data || [];
}

export async function fetchFlights(bbox) {
  let url = `${API_BASE}/flights`;
  if (bbox) {
    const { lamin, lomin, lamax, lomax } = bbox;
    url += `?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
  }
  return fetchJSON(url);
}

export async function fetchEarthquakes(options = {}) {
  let url = `${API_BASE}/earthquakes`;
  const params = new URLSearchParams();
  if (options.minMagnitude) params.set('minmag', options.minMagnitude);
  if (options.maxMagnitude) params.set('maxmag', options.maxMagnitude);
  if (params.toString()) url += `?${params}`;
  return fetchJSON(url);
}

export async function fetchSatellites(category) {
  let url = `${API_BASE}/satellites`;
  if (category) {
    url += `?category=${category}`;
  }
  return fetchJSON(url);
}

export default { fetchFlights, fetchEarthquakes, fetchSatellites };
