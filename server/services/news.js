// GDELT GEO 2.0 API service for geopolitical news/events
import * as cache from './cache.js';

const GDELT_API_URL = 'https://api.gdeltproject.org/api/v2/geo/geo';
const CACHE_KEY = 'gdelt_news';
const CACHE_TTL = 300; // 5 minutes (GDELT updates every 15 minutes)

/**
 * Fetch geolocated events from GDELT GEO 2.0 API
 * @returns {Promise<Array>} Array of standardized news event objects
 */
export async function getNews() {
  // Check cache first
  const cached = cache.get(CACHE_KEY);
  if (cached) {
    return cached;
  }

  try {
    // GDELT GEO 2.0 query parameters:
    // - query: search terms
    // - mode: artgeo (article geolocations)
    // - format: json
    // - maxrecords: limit results
    const params = new URLSearchParams({
      query: 'conflict OR protest OR disaster OR political OR crisis OR attack OR election',
      mode: 'artgeo',
      format: 'json',
      maxrecords: '200'
    });

    const response = await fetch(`${GDELT_API_URL}?${params}`);

    if (!response.ok) {
      throw new Error(`GDELT API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // GDELT returns null if no results
    if (!data || !data.articles) {
      console.log('No GDELT news events found');
      const emptyResult = [];
      cache.set(CACHE_KEY, emptyResult, CACHE_TTL);
      return emptyResult;
    }

    // Transform GDELT response to standardized format
    const events = data.articles
      .filter(article => {
        // Filter for articles with valid coordinates and significant events
        return article.location &&
               article.location.lat &&
               article.location.lon &&
               article.tone !== undefined &&
               article.title;
      })
      .map(article => {
        // Determine event type based on title/content
        const type = categorizeEvent(article.title);

        // Calculate significance score (0-100)
        const significance = calculateSignificance(article);

        return {
          id: article.url || `${article.location.lat}_${article.location.lon}_${article.seendate}`,
          coordinates: [
            parseFloat(article.location.lon),
            parseFloat(article.location.lat)
          ],
          properties: {
            title: article.title,
            source: article.domain || 'Unknown',
            date: article.seendate,
            location: article.location.name || 'Unknown',
            url: article.url,
            tone: parseFloat(article.tone) || 0,
            type: type,
            significance: significance,
            goldstein: article.goldstein || 0
          }
        };
      })
      // Filter for significant events (tone < -2 or > 2, or goldstein scale)
      .filter(event => {
        const tone = Math.abs(event.properties.tone);
        const goldstein = Math.abs(event.properties.goldstein);
        return tone > 2 || goldstein > 3 || event.properties.significance > 40;
      })
      // Sort by significance and limit to top 100
      .sort((a, b) => b.properties.significance - a.properties.significance)
      .slice(0, 100);

    // Cache the result
    cache.set(CACHE_KEY, events, CACHE_TTL);
    console.log(`Fetched ${events.length} news events from GDELT`);

    return events;
  } catch (error) {
    console.error('Error fetching GDELT news data:', error.message);
    // Return stale cache if available
    const stale = cache.get(CACHE_KEY);
    if (stale) return stale;

    // Return empty array on error to prevent crashes
    return [];
  }
}

/**
 * Categorize event type based on title keywords
 */
function categorizeEvent(title) {
  const lowerTitle = title.toLowerCase();

  if (lowerTitle.match(/conflict|attack|war|military|strike|bomb|shooting|kill/)) {
    return 'conflict';
  }
  if (lowerTitle.match(/protest|rally|demonstration|riot|unrest/)) {
    return 'protest';
  }
  if (lowerTitle.match(/disaster|earthquake|flood|fire|storm|hurricane|tornado|tsunami/)) {
    return 'disaster';
  }
  if (lowerTitle.match(/election|vote|parliament|congress|government|president|minister|diplomatic/)) {
    return 'political';
  }

  return 'other';
}

/**
 * Calculate event significance score (0-100)
 * Based on tone, goldstein scale, and keywords
 */
function calculateSignificance(article) {
  let score = 50; // Base score

  // Tone contribution (more extreme = more significant)
  const tone = Math.abs(parseFloat(article.tone) || 0);
  score += Math.min(tone * 3, 30);

  // Goldstein scale contribution (conflict cooperation scale)
  const goldstein = Math.abs(parseFloat(article.goldstein) || 0);
  score += Math.min(goldstein * 2, 20);

  // Keyword boosting
  const title = article.title.toLowerCase();
  if (title.match(/breaking|urgent|alert/)) score += 10;
  if (title.match(/crisis|emergency|disaster/)) score += 8;
  if (title.match(/war|attack|bomb/)) score += 6;

  return Math.min(score, 100);
}

/**
 * Filter events by type
 */
export function filterByType(events, type) {
  if (!type) return events;
  return events.filter(event => event.properties.type === type);
}

/**
 * Filter events by tone range
 */
export function filterByTone(events, minTone, maxTone) {
  return events.filter(event => {
    const tone = event.properties.tone;
    if (tone === null || tone === undefined) return false;

    const meetsMin = minTone === undefined || tone >= minTone;
    const meetsMax = maxTone === undefined || tone <= maxTone;

    return meetsMin && meetsMax;
  });
}
