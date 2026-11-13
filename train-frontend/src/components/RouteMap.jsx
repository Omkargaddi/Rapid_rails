import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import {
  CircleMarker,
  MapContainer,
  Pane,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  ZoomControl,
} from 'react-leaflet';
import { boundsOf, INDIA_CENTER, journeyPaths, loadCoords } from '../utils/geo';
import { legColor } from '../utils/palette';
import { formatDuration } from '../utils/timeUtils';

const ESRI_BASE = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
const ESRI_REF = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}';
const ATTRIBUTION =
  'Tiles &copy; <a href="https://www.esri.com">Esri</a> &middot; Stations: datameet';

function ViewController({ bounds, topPad = 60 }) {
  const map = useMap();
  const latestBounds = useRef(bounds);
  const padRef = useRef(topPad);

  useEffect(() => {
    latestBounds.current = bounds;
    padRef.current = topPad;
  }, [bounds, topPad]);

  const fit = useCallback((b, animate = true) => {
    if (!b || !map) return;
    try {
      map.fitBounds(b, {
        paddingTopLeft: [40, padRef.current],
        paddingBottomRight: [40, 50],
        maxZoom: 10,
        animate,
      });
    } catch (err) {
      // Map instance may not be fully initialized or rendered yet
      void err;
    }
  }, [map]);

  useEffect(() => {
    if (bounds) fit(bounds, true);
  }, [bounds, fit]);

  useEffect(() => {
    const el = map.getContainer();
    if (!el) return;
    let w = el.clientWidth;
    let h = el.clientHeight;

    const ro = new ResizeObserver(() => {
      if (el.clientWidth === w && el.clientHeight === h) return;
      w = el.clientWidth;
      h = el.clientHeight;
      map.invalidateSize({ pan: false });
      if (latestBounds.current && w > 0 && h > 0) {
        fit(latestBounds.current, false);
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [map, fit]);

  return null;
}

const RouteMap = ({
  journeys = [],
  selectedId = null,
  hoverId = null,
  onSelect,
  endpoints = { from: '', to: '' },
  fitAllSignal = 0,
}) => {
  const [coords, setCoords] = useState(null);
  const [mapHoverId, setMapHoverId] = useState(null);
  const [hoverLeg, setHoverLeg] = useState(null);

  useEffect(() => {
    let live = true;
    loadCoords().then((c) => {
      if (live) setCoords(c);
    });
    return () => {
      live = false;
    };
  }, []);

  const paths = useMemo(() => {
    const m = new Map();
    if (coords && journeys.length > 0) {
      for (const j of journeys) {
        m.set(j.hash, journeyPaths(j, coords));
      }
    }
    return m;
  }, [coords, journeys]);

  const selected = useMemo(() => {
    return journeys.find((j) => j.hash === selectedId) || null;
  }, [journeys, selectedId]);

  const fromCoord = coords && endpoints.from ? coords[endpoints.from] : null;
  const toCoord = coords && endpoints.to ? coords[endpoints.to] : null;

  const bounds = useMemo(() => {
    if (!coords) return null;

    if (fitAllSignal > 0 || !selected) {
      const allLines = [...paths.values()].flat();
      if (allLines.length > 0) return boundsOf(allLines);
    }

    if (selected) {
      const selLines = (paths.get(selected.hash) || []).flat();
      if (selLines.length > 0) return boundsOf(selLines);
    }

    const epPoints = [fromCoord, toCoord].filter(Boolean);
    if (epPoints.length > 0) return boundsOf(epPoints);

    return null;
  }, [coords, selected, fitAllSignal, paths, fromCoord, toCoord]);

  const selectedPaths = useMemo(() => {
    return selected ? paths.get(selected.hash) || [] : [];
  }, [selected, paths]);

  const otherJourneys = useMemo(() => {
    return journeys.filter((j) => j.hash !== selectedId);
  }, [journeys, selectedId]);

  const round = { lineCap: 'round', lineJoin: 'round' };

  return (
    <MapContainer
      center={INDIA_CENTER}
      zoom={5}
      minZoom={4}
      maxZoom={12}
      zoomSnap={0.5}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <ZoomControl position="bottomright" />
      <TileLayer url={ESRI_BASE} attribution={ATTRIBUTION} maxNativeZoom={16} />
      <Pane name="labels" style={{ zIndex: 450, pointerEvents: 'none' }}>
        <TileLayer url={ESRI_REF} maxNativeZoom={16} />
      </Pane>

      <ViewController bounds={bounds} topPad={selected ? 80 : 50} />

      {otherJourneys.map((j) => {
        const isHot = j.hash === hoverId || j.hash === mapHoverId;
        const jLines = paths.get(j.hash) || [];

        return jLines.map((line, idx) => (
          <Fragment key={`${j.hash}-${idx}`}>
            {isHot && (
              <Polyline
                positions={line}
                pathOptions={{ ...round, color: '#ffffff', weight: 8, opacity: 0.85 }}
                interactive={false}
              />
            )}
            <Polyline
              positions={line}
              pathOptions={{
                ...round,
                color: isHot ? '#1a56db' : '#94a3b8',
                weight: isHot ? 4.5 : 2.5,
                opacity: isHot ? 0.95 : 0.35,
                dashArray: isHot ? undefined : '1 7',
              }}
              eventHandlers={{
                click: () => onSelect && onSelect(j.hash),
                mouseover: () => setMapHoverId(j.hash),
                mouseout: () => setMapHoverId((h) => (h === j.hash ? null : h)),
              }}
            />
          </Fragment>
        ));
      })}

      {selected &&
        selectedPaths.map((line, i) => {
          const leg = selected.legs[i];
          const isHot = hoverLeg === i;
          const isDim = hoverLeg !== null && !isHot;
          const color = legColor(i);

          return (
            <Fragment key={`${selected.hash}-${i}`}>

              <Polyline
                positions={line}
                pathOptions={{
                  ...round,
                  color,
                  weight: isHot ? 18 : 13,
                  opacity: isDim ? 0.08 : 0.22,
                }}
                interactive={false}
              />

              <Polyline
                positions={line}
                pathOptions={{
                  ...round,
                  color: '#ffffff',
                  weight: isHot ? 10 : 8,
                  opacity: 0.95,
                }}
                interactive={false}
              />

              <Polyline
                positions={line}
                pathOptions={{
                  ...round,
                  color,
                  weight: isHot ? 6.5 : 4.5,
                  opacity: isDim ? 0.5 : 1,
                }}
                eventHandlers={{
                  mouseover: () => setHoverLeg(i),
                  mouseout: () => setHoverLeg((h) => (h === i ? null : h)),
                }}
              >
                {leg && (
                  <Tooltip sticky className="stop-tip">
                    <div className="stop-tip-title">
                      {leg.train_name} #{leg.train_num}
                    </div>
                    <div className="stop-tip-sub">
                      {leg.from} ({leg.dep_clock || '--:--'}) &rarr; {leg.to} ({leg.arr_clock || '--:--'})
                    </div>
                  </Tooltip>
                )}
              </Polyline>

              <Polyline
                positions={line}
                pathOptions={{
                  ...round,
                  color: '#ffffff',
                  weight: 2,
                  opacity: isDim ? 0.3 : 0.85,
                  dashArray: '1 13',
                  className: 'route-flow',
                }}
                interactive={false}
              />
            </Fragment>
          );
        })}

      {selected &&
        coords &&
        selected.legs.slice(0, -1).map((leg, i) => {
          const transferCode = leg.to;
          const p = coords[transferCode];
          if (!p) return null;

          const nextLeg = selected.legs[i + 1];
          const waitMinutes = nextLeg ? nextLeg.dep_abs - leg.arr_abs : 0;

          return (
            <Fragment key={`transfer-${i}-${transferCode}`}>
              <CircleMarker
                center={p}
                radius={9}
                pathOptions={{
                  color: legColor(i),
                  weight: 3.5,
                  fillColor: '#ffffff',
                  fillOpacity: 1,
                }}
              >
                <Tooltip permanent direction="right" offset={[10, 0]} className="code-tip">
                  {transferCode} {waitMinutes > 0 ? `· ${formatDuration(waitMinutes)} wait` : ''}
                </Tooltip>
              </CircleMarker>
              <CircleMarker
                center={p}
                radius={4}
                pathOptions={{
                  color: legColor(i + 1),
                  weight: 0,
                  fillColor: legColor(i + 1),
                  fillOpacity: 1,
                }}
                interactive={false}
              />
            </Fragment>
          );
        })}

      {fromCoord && (
        <CircleMarker
          center={fromCoord}
          radius={8}
          pathOptions={{
            color: '#ffffff',
            weight: 3,
            fillColor: '#059669',
            fillOpacity: 1,
          }}
        >
          <Tooltip permanent direction="top" offset={[0, -10]} className="code-tip">
            {endpoints.from}
          </Tooltip>
        </CircleMarker>
      )}

      {toCoord && (
        <CircleMarker
          center={toCoord}
          radius={8}
          pathOptions={{
            color: '#ffffff',
            weight: 3,
            fillColor: '#dc2626',
            fillOpacity: 1,
          }}
        >
          <Tooltip permanent direction="top" offset={[0, -10]} className="code-tip">
            {endpoints.to}
          </Tooltip>
        </CircleMarker>
      )}

      {journeys.length === 0 && fromCoord && toCoord && (
        <Polyline
          positions={[fromCoord, toCoord]}
          pathOptions={{
            ...round,
            color: '#94a3b8',
            weight: 1.5,
            dashArray: '4 8',
            opacity: 0.45,
          }}
          interactive={false}
        />
      )}
    </MapContainer>
  );
};

export default RouteMap;
