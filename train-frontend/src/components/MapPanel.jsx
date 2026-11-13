import React, { lazy, Suspense, useState } from 'react';
import { formatDuration } from '../utils/timeUtils';
import { legColor } from '../utils/palette';
import './MapPanel.css';

const RouteMap = lazy(() => import('./RouteMap'));

const MapPanel = ({
  journeys = [],
  selectedId = null,
  hoverId = null,
  onSelect,
  endpoints = { from: '', to: '' },
  className = '',
}) => {
  const [fitAllSignal, setFitAllSignal] = useState(0);

  const selectedIndex = journeys.findIndex((j) => j.hash === selectedId);
  const selected = selectedIndex >= 0 ? journeys[selectedIndex] : null;

  return (
    <div className={`rr-map-container ${className}`}>
      <Suspense
        fallback={
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f1f5f9',
              color: '#64748b',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            Loading Rail Map...
          </div>
        }
      >
        <RouteMap
          journeys={journeys}
          selectedId={selectedId}
          hoverId={hoverId}
          onSelect={onSelect}
          endpoints={endpoints}
          fitAllSignal={fitAllSignal}
        />
      </Suspense>

      {journeys.length > 1 && (
        <button
          type="button"
          onClick={() => setFitAllSignal((n) => n + 1)}
          className="rr-map-btn-fit"
          title="Zoom out to show all available routes"
        >
          Show all ({journeys.length})
        </button>
      )}

      {selected && (
        <div className="rr-map-overlay-top-left">
          <div className="rr-map-journey-badge">
            <div className="rr-map-badge-header">
              <span className="rr-map-badge-title">
                Route #{selectedIndex + 1}
              </span>
              <span className="rr-map-badge-duration">
                {formatDuration(selected.total_duration)}
              </span>
            </div>
            <ul className="rr-map-legs-list">
              {selected.legs.map((leg, i) => (
                <li key={i} className="rr-map-leg-item">
                  <span
                    className="rr-map-leg-pill"
                    style={{ background: legColor(i) }}
                  />
                  <span className="rr-map-leg-train">#{leg.train_num}</span>
                  <span>
                    {leg.from} &rarr; {leg.to}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {!selected && journeys.length === 0 && !endpoints.from && !endpoints.to && (
        <div className="rr-map-prompt">
          Select departure and arrival stations to view them on the map
        </div>
      )}

      {!selected && journeys.length === 0 && (endpoints.from || endpoints.to) && (
        <div className="rr-map-prompt">
          {endpoints.from && endpoints.to
            ? `${endpoints.from} → ${endpoints.to} (No routes available)`
            : `Station: ${endpoints.from || endpoints.to}`}
        </div>
      )}
    </div>
  );
};

export default MapPanel;
