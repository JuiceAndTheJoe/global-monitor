import { memo, useMemo } from 'react';
import { LayerGroup, CircleMarker, Popup } from 'react-leaflet';
import InfoPopup from '../components/InfoPopup';

// Event type to icon mapping
const EVENT_ICONS = {
  conflict: '💥',
  protest: '📢',
  disaster: '🔥',
  political: '🏛️',
  other: '📰'
};

// Get color based on tone (negative=red, neutral=yellow, positive=green)
function getColorByTone(tone) {
  if (tone < -3) return '#dc2626'; // Red - very negative
  if (tone < -1) return '#f97316'; // Orange - negative
  if (tone < 1) return '#eab308';  // Yellow - neutral
  if (tone < 3) return '#84cc16';  // Light green - positive
  return '#22c55e';                // Green - very positive
}

// Get radius based on significance score
function getRadius(significance) {
  // Significance is 0-100, scale to 6-20 pixels
  return Math.max(6, Math.min(20, significance / 5));
}

// Format date from GDELT format (YYYYMMDDHHmmss) or ISO
function formatDate(dateStr) {
  if (!dateStr) return 'Unknown';

  // GDELT format: 20240315120000
  if (/^\d{14}$/.test(dateStr)) {
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);
    const hour = dateStr.slice(8, 10);
    const minute = dateStr.slice(10, 12);
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }

  // Try to parse as regular date
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

// Memoized individual news event marker
const NewsMarker = memo(function NewsMarker({ event }) {
  const color = useMemo(() => getColorByTone(event.properties.tone), [event.properties.tone]);
  const radius = useMemo(() => getRadius(event.properties.significance), [event.properties.significance]);
  const icon = EVENT_ICONS[event.properties.type] || EVENT_ICONS.other;

  // Determine if this is a high-priority event
  const isHighPriority = event.properties.significance > 70 || Math.abs(event.properties.tone) > 5;

  return (
    <CircleMarker
      center={[event.coordinates[1], event.coordinates[0]]}
      radius={radius}
      pathOptions={{
        fillColor: color,
        fillOpacity: isHighPriority ? 0.8 : 0.6,
        color: isHighPriority ? '#fff' : color,
        weight: isHighPriority ? 2 : 1
      }}
    >
      <Popup>
        <InfoPopup
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>{icon}</span>
              <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
                {event.properties.type.toUpperCase()}
              </span>
            </div>
          }
          rows={[
            {
              label: 'Title',
              value: (
                <div style={{ maxWidth: '250px', wordWrap: 'break-word', fontSize: '11px' }}>
                  {event.properties.title}
                </div>
              )
            },
            { label: 'Location', value: event.properties.location },
            { label: 'Source', value: event.properties.source },
            { label: 'Date', value: formatDate(event.properties.date) },
            {
              label: 'Tone',
              value: (
                <span style={{ color: getColorByTone(event.properties.tone) }}>
                  {event.properties.tone.toFixed(1)}
                </span>
              )
            },
            {
              label: 'Link',
              value: (
                <a
                  href={event.properties.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#3498db', textDecoration: 'underline', fontSize: '11px' }}
                >
                  Read Article
                </a>
              )
            }
          ]}
        />
      </Popup>
    </CircleMarker>
  );
});

const NewsLayer = memo(function NewsLayer({ data, visible }) {
  if (!visible || !data.length) return null;

  return (
    <LayerGroup>
      {data.map((event) => (
        <NewsMarker key={event.id} event={event} />
      ))}
    </LayerGroup>
  );
}, (prevProps, nextProps) => {
  return prevProps.visible === nextProps.visible &&
         prevProps.data === nextProps.data;
});

export default NewsLayer;
