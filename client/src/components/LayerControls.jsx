import { memo } from 'react';

const LayerControls = memo(function LayerControls({ layers, onToggle }) {
  return (
    <div className="layer-controls">
      <h3>Layers</h3>

      <div className="layer-toggle">
        <input
          type="checkbox"
          id="flights-toggle"
          checked={layers.flights}
          onChange={() => onToggle('flights')}
        />
        <label htmlFor="flights-toggle">
          <span className="layer-dot flights"></span>
          Flights
        </label>
      </div>

      <div className="layer-toggle">
        <input
          type="checkbox"
          id="earthquakes-toggle"
          checked={layers.earthquakes}
          onChange={() => onToggle('earthquakes')}
        />
        <label htmlFor="earthquakes-toggle">
          <span className="layer-dot earthquakes"></span>
          Earthquakes
        </label>
      </div>

      <div className="layer-toggle">
        <input
          type="checkbox"
          id="satellites-toggle"
          checked={layers.satellites}
          onChange={() => onToggle('satellites')}
        />
        <label htmlFor="satellites-toggle">
          <span className="layer-dot satellites"></span>
          Satellites
        </label>
      </div>

      <div className="layer-toggle">
        <input
          type="checkbox"
          id="ships-toggle"
          checked={layers.ships}
          onChange={() => onToggle('ships')}
        />
        <label htmlFor="ships-toggle">
          <span className="layer-dot ships"></span>
          Ships
        </label>
      </div>

      <div className="layer-toggle">
        <input
          type="checkbox"
          id="weather-toggle"
          checked={layers.weather}
          onChange={() => onToggle('weather')}
        />
        <label htmlFor="weather-toggle">
          <span className="layer-dot weather"></span>
          Weather
        </label>
      </div>

      <div className="layer-toggle">
        <input
          type="checkbox"
          id="news-toggle"
          checked={layers.news}
          onChange={() => onToggle('news')}
        />
        <label htmlFor="news-toggle">
          <span className="layer-dot news"></span>
          News
        </label>
      </div>
    </div>
  );
});

export default LayerControls;
