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
    </div>
  );
});

export default LayerControls;
