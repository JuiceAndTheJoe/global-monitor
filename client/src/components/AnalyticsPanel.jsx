import { useState, useMemo } from 'react';

function AnalyticsPanel({ flights, earthquakes, satellites, ships, weather }) {
  const [isOpen, setIsOpen] = useState(true);

  // Calculate flight statistics
  const flightStats = useMemo(() => {
    if (!flights.length) return { total: 0, byCountry: [] };

    const countryCount = {};
    flights.forEach(flight => {
      const country = flight.properties.origin_country || 'Unknown';
      countryCount[country] = (countryCount[country] || 0) + 1;
    });

    const byCountry = Object.entries(countryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([country, count]) => ({ country, count }));

    return { total: flights.length, byCountry };
  }, [flights]);

  // Calculate earthquake statistics
  const earthquakeStats = useMemo(() => {
    if (!earthquakes.length) return { total: 0, byMagnitude: [], last24h: 0 };

    const ranges = { '0-2': 0, '2-4': 0, '4-6': 0, '6+': 0 };
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    let last24h = 0;

    earthquakes.forEach(quake => {
      const mag = quake.properties.magnitude;
      if (mag < 2) ranges['0-2']++;
      else if (mag < 4) ranges['2-4']++;
      else if (mag < 6) ranges['4-6']++;
      else ranges['6+']++;

      if (quake.properties.time > dayAgo) last24h++;
    });

    const byMagnitude = Object.entries(ranges).map(([range, count]) => ({ range, count }));

    return { total: earthquakes.length, byMagnitude, last24h };
  }, [earthquakes]);

  // Calculate satellite statistics
  const satelliteStats = useMemo(() => {
    if (!satellites.length) return { total: 0, byCategory: [] };

    const categoryCount = {};
    satellites.forEach(sat => {
      const isISS = sat.properties.category === 'iss' ||
                    sat.properties.name?.toLowerCase().includes('iss');
      const category = isISS ? 'ISS' : (sat.properties.category || 'other');
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    const byCategory = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        count
      }));

    return { total: satellites.length, byCategory };
  }, [satellites]);

  // Calculate ship statistics
  const shipStats = useMemo(() => {
    if (!ships || !ships.length) return null;

    const typeCount = {};
    ships.forEach(ship => {
      const type = ship.properties.type || 'Unknown';
      typeCount[type] = (typeCount[type] || 0) + 1;
    });

    const byType = Object.entries(typeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    return { total: ships.length, byType };
  }, [ships]);

  // Calculate weather statistics
  const weatherStats = useMemo(() => {
    if (!weather || !weather.length) return null;

    const severityCount = { emergency: 0, warning: 0, watch: 0, advisory: 0 };
    weather.forEach(alert => {
      const severity = (alert.severity || 'unknown').toLowerCase();
      if (severityCount[severity] !== undefined) {
        severityCount[severity]++;
      }
    });

    const bySeverity = Object.entries(severityCount)
      .filter(([, count]) => count > 0)
      .map(([severity, count]) => ({
        severity: severity.charAt(0).toUpperCase() + severity.slice(1),
        count
      }));

    return { total: weather.length, bySeverity };
  }, [weather]);

  // Calculate max value for scaling bars
  const getMaxValue = (data) => {
    if (!data || !data.length) return 1;
    return Math.max(...data.map(item => item.count));
  };

  return (
    <>
      {/* Toggle button when collapsed */}
      {!isOpen && (
        <button
          className="analytics-toggle-btn"
          onClick={() => setIsOpen(true)}
          title="Open Analytics Panel"
        >
          <span>📊</span>
        </button>
      )}

      {/* Analytics panel */}
      <div className={`analytics-panel ${isOpen ? 'open' : 'closed'}`}>
        <div className="analytics-header">
          <h2>Analytics Dashboard</h2>
          <button
            className="analytics-close-btn"
            onClick={() => setIsOpen(false)}
            title="Close Panel"
          >
            ✕
          </button>
        </div>

        <div className="analytics-content">
          {/* Flights Section */}
          <div className="analytics-section">
            <h3>✈ Flights</h3>
            <div className="stat-total">
              <span className="stat-label">Active Flights:</span>
              <span className="stat-value">{flightStats.total}</span>
            </div>
            {flightStats.byCountry.length > 0 && (
              <div className="stat-breakdown">
                <h4>Top Countries</h4>
                {flightStats.byCountry.map(({ country, count }) => (
                  <div key={country} className="stat-item">
                    <span className="stat-item-label">{country}</span>
                    <div className="stat-bar-container">
                      <div
                        className="stat-bar flights"
                        style={{
                          width: `${(count / getMaxValue(flightStats.byCountry)) * 100}%`
                        }}
                      ></div>
                      <span className="stat-item-value">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Earthquakes Section */}
          <div className="analytics-section">
            <h3>🌍 Earthquakes</h3>
            <div className="stat-total">
              <span className="stat-label">Total Events:</span>
              <span className="stat-value">{earthquakeStats.total}</span>
            </div>
            <div className="stat-total">
              <span className="stat-label">Last 24h:</span>
              <span className="stat-value highlight">{earthquakeStats.last24h}</span>
            </div>
            {earthquakeStats.byMagnitude.length > 0 && (
              <div className="stat-breakdown">
                <h4>By Magnitude</h4>
                {earthquakeStats.byMagnitude.map(({ range, count }) => (
                  <div key={range} className="stat-item">
                    <span className="stat-item-label">{range}</span>
                    <div className="stat-bar-container">
                      <div
                        className="stat-bar earthquakes"
                        style={{
                          width: `${(count / getMaxValue(earthquakeStats.byMagnitude)) * 100}%`
                        }}
                      ></div>
                      <span className="stat-item-value">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Satellites Section */}
          <div className="analytics-section">
            <h3>🛰 Satellites</h3>
            <div className="stat-total">
              <span className="stat-label">Active Satellites:</span>
              <span className="stat-value">{satelliteStats.total}</span>
            </div>
            {satelliteStats.byCategory.length > 0 && (
              <div className="stat-breakdown">
                <h4>By Category</h4>
                {satelliteStats.byCategory.map(({ category, count }) => (
                  <div key={category} className="stat-item">
                    <span className="stat-item-label">{category}</span>
                    <div className="stat-bar-container">
                      <div
                        className="stat-bar satellites"
                        style={{
                          width: `${(count / getMaxValue(satelliteStats.byCategory)) * 100}%`
                        }}
                      ></div>
                      <span className="stat-item-value">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ships Section (if data exists) */}
          {shipStats && (
            <div className="analytics-section">
              <h3>🚢 Ships</h3>
              <div className="stat-total">
                <span className="stat-label">Active Ships:</span>
                <span className="stat-value">{shipStats.total}</span>
              </div>
              {shipStats.byType.length > 0 && (
                <div className="stat-breakdown">
                  <h4>By Type</h4>
                  {shipStats.byType.map(({ type, count }) => (
                    <div key={type} className="stat-item">
                      <span className="stat-item-label">{type}</span>
                      <div className="stat-bar-container">
                        <div
                          className="stat-bar ships"
                          style={{
                            width: `${(count / getMaxValue(shipStats.byType)) * 100}%`
                          }}
                        ></div>
                        <span className="stat-item-value">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Weather Section (if data exists) */}
          {weatherStats && (
            <div className="analytics-section">
              <h3>🌪 Weather Alerts</h3>
              <div className="stat-total">
                <span className="stat-label">Active Alerts:</span>
                <span className="stat-value">{weatherStats.total}</span>
              </div>
              {weatherStats.bySeverity.length > 0 && (
                <div className="stat-breakdown">
                  <h4>By Severity</h4>
                  {weatherStats.bySeverity.map(({ severity, count }) => (
                    <div key={severity} className="stat-item">
                      <span className="stat-item-label">{severity}</span>
                      <div className="stat-bar-container">
                        <div
                          className="stat-bar weather"
                          style={{
                            width: `${(count / getMaxValue(weatherStats.bySeverity)) * 100}%`
                          }}
                        ></div>
                        <span className="stat-item-value">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default AnalyticsPanel;
