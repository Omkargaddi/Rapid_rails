
import "leaflet/dist/leaflet.css";
import { Fragment, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CircleMarker, MapContainer, Pane, Polyline, TileLayer, Tooltip, useMap, ZoomControl } from "react-leaflet";
import { boundsOf, INDIA_CENTER, journeyPaths, loadCoords, smoothPath, type Coords, type LatLon } from "@/lib/geo";
import { hhmm, stationLabel } from "@/lib/format";
import { legColor } from "@/lib/palette";
import type { Journey, StationHit } from "@/lib/types";

export interface RouteMapProps {
  journeys: Journey[];
  selectedId: string | null;
  hoverId: string | null;
  onSelect: (id: string) => void;
  endpoints: { from: StationHit | null; to: StationHit | null };
  fitAllSignal: number;
}

const darkQuery = "(prefers-color-scheme: dark)";
function useDark(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(darkQuery);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(darkQuery).matches,
    () => false,
  );
}

// Esri's grey canvas: keyless raster tiles with a light and a dark variant, plus a separate label layer
// drawn above the routes' casing. (CARTO basemaps now require an API key.)
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas";
const TILE = (dark: boolean, layer: "Base" | "Reference") => `${ESRI}/World_${dark ? "Dark" : "Light"}_Gray_${layer}/MapServer/tile/{z}/{y}/{x}`;
const ATTRIBUTION =
  'Tiles &copy; <a href="https://www.esri.com">Esri</a>, HERE, Garmin, &copy; OpenStreetMap contributors · stations: <a href="https://github.com/datameet/railways">datameet</a>';

/**
 * Fits the view whenever `bounds` changes identity. Leaflet cannot see its box resize (the layout
 * changes once results arrive, and the map is hidden on small screens), so it re-measures and
 * re-fits on every resize too.
 */
function ViewController({ bounds, topPad }: { bounds: [LatLon, LatLon] | null; topPad: number }) {
  const map = useMap();
  const latest = useRef(bounds);
  latest.current = bounds;
  const pad = useRef(topPad);
  pad.current = topPad;
  const fit = (b: [LatLon, LatLon], animate: boolean) =>
    map.fitBounds(b, { paddingTopLeft: [40, pad.current], paddingBottomRight: [40, 56], maxZoom: 10, animate });
  useEffect(() => {
    if (bounds) fit(bounds, true);
  }, [map, bounds]);
  useEffect(() => {
    const el = map.getContainer();
    let w = el.clientWidth;
    let h = el.clientHeight;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === w && el.clientHeight === h) return;
      w = el.clientWidth;
      h = el.clientHeight;
      map.invalidateSize({ pan: false });
      if (latest.current && w > 0 && h > 0) fit(latest.current, false);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

export default function RouteMap({ journeys, selectedId, hoverId, onSelect, endpoints, fitAllSignal }: RouteMapProps) {
  const dark = useDark();
  const [coords, setCoords] = useState<Coords | null>(null);
  useEffect(() => {
    let live = true;
    loadCoords().then((c) => live && setCoords(c));
    return () => {
      live = false;
    };
  }, []);

  const paths = useMemo(() => {
    const m = new Map<string, LatLon[][]>();
    if (coords) for (const j of journeys) m.set(j.id, journeyPaths(j, coords));
    return m;
  }, [journeys, coords]);

  const selected = journeys.find((j) => j.id === selectedId) ?? null;
  const pin = (s: StationHit | null) => (s && coords?.[s.code] ? { s, p: coords[s.code] } : null);
  const from = pin(endpoints.from);
  const to = pin(endpoints.to);

  // What to frame: the selected journey, else all journeys (after "fit all"), else the chosen endpoints.
  const [fitAll, setFitAll] = useState(false);
  useEffect(() => setFitAll(fitAllSignal > 0), [fitAllSignal]);
  useEffect(() => setFitAll(false), [selectedId]);
  const bounds = useMemo(() => {
    if (!coords) return null;
    if (selected && !fitAll) return boundsOf((paths.get(selected.id) ?? []).flat());
    if (journeys.length) return boundsOf([...paths.values()].flat(2));
    return boundsOf([from?.p, to?.p].filter((p): p is LatLon => !!p));
  }, [coords, selected, fitAll, journeys, paths, from?.p, to?.p]);

  // The selected journey is drawn as smooth curves through its stops (the others stay plain: 50
  // journeys × every stop would be a lot of points for faint background lines).
  const selectedPaths = useMemo(() => (selected ? (paths.get(selected.id) ?? []).map((l) => smoothPath(l)) : []), [selected, paths]);
  const [mapHoverId, setMapHoverId] = useState<string | null>(null);
  const [hoverLeg, setHoverLeg] = useState<number | null>(null);
  useEffect(() => setHoverLeg(null), [selectedId]);

  const others = journeys.filter((j) => j.id !== selectedId);
  const muted = dark ? "#64748b" : "#94a3b8";
  const casing = dark ? "#0f172a" : "#ffffff";
  const round = { lineCap: "round", lineJoin: "round" } as const;

  return (
    <MapContainer center={INDIA_CENTER} zoom={5} minZoom={4} maxZoom={13} zoomSnap={0.25} className="h-full w-full" zoomControl={false}>
      <ZoomControl position="bottomright" />
      <TileLayer key={dark ? "d" : "l"} url={TILE(dark, "Base")} attribution={ATTRIBUTION} maxNativeZoom={16} />
      <Pane name="labels" style={{ zIndex: 450, pointerEvents: "none" }}>
        <TileLayer key={dark ? "dr" : "lr"} url={TILE(dark, "Reference")} maxNativeZoom={16} />
      </Pane>
      <ViewController bounds={bounds} topPad={selected && !fitAll ? 56 + 20 * selected.segments.length : 56} />

      {/* the other journeys, faint; hovering one here or in the list lifts it */}
      {others.map((j) => {
        const hot = j.id === hoverId || j.id === mapHoverId;
        return (paths.get(j.id) ?? []).map((line, i) => (
          <Fragment key={`${j.id}-${i}-${hot}`}>
            {hot && <Polyline positions={line} pathOptions={{ ...round, color: casing, weight: 8, opacity: 0.85 }} interactive={false} />}
            <Polyline
              positions={line}
              pathOptions={{ ...round, color: hot ? "#6366f1" : muted, weight: hot ? 4 : 2.5, opacity: hot ? 0.95 : 0.35, dashArray: hot ? undefined : "1 7" }}
              eventHandlers={{
                click: () => onSelect(j.id),
                mouseover: () => setMapHoverId(j.id),
                mouseout: () => setMapHoverId((h) => (h === j.id ? null : h)),
              }}
            />
          </Fragment>
        ));
      })}

      {/* the selected journey, per leg: a soft glow, a casing, the leg colour, and a moving dash that
          shows the direction of travel; hovering a leg widens it */}
      {selected &&
        selectedPaths.map((line, i) => {
          const hot = hoverLeg === i;
          const dim = hoverLeg !== null && !hot;
          return (
            <Fragment key={`${selected.id}-${i}-${hot}-${dim}`}>
              <Polyline positions={line} pathOptions={{ ...round, color: legColor(i), weight: hot ? 20 : 14, opacity: dim ? 0.06 : 0.16 }} interactive={false} />
              <Polyline positions={line} pathOptions={{ ...round, color: casing, weight: hot ? 11 : 9, opacity: 0.95 }} interactive={false} />
              <Polyline
                positions={line}
                pathOptions={{ ...round, color: legColor(i), weight: hot ? 7 : 5, opacity: dim ? 0.55 : 1 }}
                eventHandlers={{ mouseover: () => setHoverLeg(i), mouseout: () => setHoverLeg((h) => (h === i ? null : h)) }}
              >
                <Tooltip sticky className="stop-tip">
                  <div className="font-semibold">
                    {selected.segments[i].train_number} {selected.segments[i].train_name}
                  </div>
                  <div className="tabular opacity-80">
                    {selected.segments[i].from_station.code} {hhmm(selected.segments[i].departure_datetime)} → {selected.segments[i].to_station.code}{" "}
                    {hhmm(selected.segments[i].arrival_datetime)}
                  </div>
                </Tooltip>
              </Polyline>
              <Polyline
                positions={line}
                pathOptions={{ ...round, color: "#ffffff", weight: hot ? 2.5 : 2, opacity: dim ? 0.3 : 0.85, dashArray: "1 13", className: "route-flow" }}
                interactive={false}
              />
            </Fragment>
          );
        })}

      {/* intermediate stops of the selected journey */}
      {selected &&
        coords &&
        selected.segments.flatMap((seg, i) =>
          seg.stops.slice(1, -1).map((s, k) => {
            const p = s.code ? coords[s.code] : undefined;
            if (!p) return null;
            // stops where the train halts get a ring; pass-through points only a small dot
            return (
              <CircleMarker
                key={`${i}-${k}`}
                center={p}
                radius={s.boardable ? 3.5 : 2}
                pathOptions={
                  s.boardable
                    ? { color: legColor(i), weight: 2, fillColor: casing, fillOpacity: 1 }
                    : { color: legColor(i), weight: 0, fillColor: legColor(i), fillOpacity: 0.7 }
                }
              >
                <Tooltip className="stop-tip" direction="top" offset={[0, -4]}>
                  <div className="font-semibold">{stationLabel(s)}</div>
                  <div className="tabular opacity-80">
                    {s.arrival_datetime ? hhmm(s.arrival_datetime) : "--:--"} – {s.departure_datetime ? hhmm(s.departure_datetime) : "--:--"}
                    {!s.boardable && " · pass-through"}
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          }),
        )}

      {/* transfer stations */}
      {selected &&
        coords &&
        selected.transfers.map((t, i) => {
          const p = t.station.code ? coords[t.station.code] : undefined;
          if (!p) return null;
          // a change of train: ring in the arriving leg's colour, core in the departing leg's
          return (
            <Fragment key={`t${i}`}>
              <CircleMarker center={p} radius={9} pathOptions={{ color: legColor(i), weight: 3.5, fillColor: casing, fillOpacity: 1 }}>
                {/* Leaflet binds one tooltip per layer, so the label carries the wait too */}
                <Tooltip permanent direction="right" offset={[10, 0]} className="code-tip">
                  {t.station.code} <span className="font-sans font-medium opacity-70">{t.wait_minutes}m</span>
                </Tooltip>
              </CircleMarker>
              <CircleMarker center={p} radius={4} pathOptions={{ color: legColor(i + 1), weight: 0, fillColor: legColor(i + 1), fillOpacity: 1 }} interactive={false} />
            </Fragment>
          );
        })}

      {/* endpoints: from the selected journey, or the stations picked in the form before a search */}
      {[
        { key: "src", p: selected ? coords?.[selected.source.code ?? ""] : from?.p, code: selected ? selected.source.code : from?.s.code, fill: "#059669" },
        { key: "dst", p: selected ? coords?.[selected.destination.code ?? ""] : to?.p, code: selected ? selected.destination.code : to?.s.code, fill: "#e11d48" },
      ].map((e) =>
        e.p ? (
          <CircleMarker key={`${e.key}-${e.code}`} center={e.p} radius={9} pathOptions={{ color: "#ffffff", weight: 3, fillColor: e.fill, fillOpacity: 1 }}>
            <Tooltip permanent direction="top" offset={[0, -10]} className="code-tip">
              {e.code}
            </Tooltip>
          </CircleMarker>
        ) : null,
      )}
      {!selected && from && to && journeys.length === 0 && (
        <Polyline positions={[from.p, to.p]} pathOptions={{ ...round, color: "#6366f1", weight: 2, dashArray: "6 8", opacity: 0.7 }} interactive={false} />
      )}
    </MapContainer>
  );
}
