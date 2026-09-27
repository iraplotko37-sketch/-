import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { network, stopById } from "@/lib/network";
import { activeVehicles } from "@/lib/vehicles";
import { appClock } from "@/lib/schedule";
import { VehicleLayer } from "@/lib/vehicle-layer";
import { useTransit } from "@/store";

const STYLE = "https://tiles.openfreemap.org/styles/positron";

export function MapView() {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const layerRef = useRef<VehicleLayer | null>(null);
  const selectedStopId = useTransit((s) => s.selectedStopId);
  const selectedRouteId = useTransit((s) => s.selectedRouteId);
  const selectedDirectionId = useTransit((s) => s.selectedDirectionId);
  const kind = useTransit((s) => s.kind);
  const pitch3d = useTransit((s) => s.pitch3d);
  const selectStop = useTransit((s) => s.selectStop);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cancelled = false;
    let map: import("maplibre-gl").Map | undefined;
    let timer: number | undefined;

    void (async () => {
      const maplibregl = await import("maplibre-gl");
      if (cancelled || !host.current) return;

      map = new maplibregl.Map({
        container: host.current,
        style: STYLE,
        center: network.center,
        zoom: 12.7,
        pitch: 52,
        bearing: -18,
        minZoom: 11,
        maxZoom: 18,
        attributionControl: { compact: true },
      });
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
      mapRef.current = map;

      map.on("load", () => {
        if (!map) return;
        const style = map.getStyle();
        const building2d = style.layers?.find((l) => l.id === "building" || l.id.includes("building"));
        try {
          map.addLayer(
            {
              id: "building-3d",
              source: "openmaptiles",
              "source-layer": "building",
              type: "fill-extrusion",
              minzoom: 13.5,
              paint: {
                "fill-extrusion-color": "#ddd6cc",
                "fill-extrusion-height": ["coalesce", ["get", "render_height"], ["get", "height"], 8],
                "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
                "fill-extrusion-opacity": 0.72,
              },
            },
            building2d?.id,
          );
        } catch {
          /* style without buildings */
        }

        const routeFc = {
          type: "FeatureCollection" as const,
          features: network.routes.flatMap((route) =>
            route.directions.map((d) => ({
              type: "Feature" as const,
              properties: {
                routeId: route.id,
                directionId: d.id,
                kind: route.kind,
                number: route.number,
              },
              geometry: { type: "LineString" as const, coordinates: d.shape },
            })),
          ),
        };
        map.addSource("routes", { type: "geojson", data: routeFc });
        map.addLayer({
          id: "routes-line",
          type: "line",
          source: "routes",
          paint: {
            "line-color": [
              "case",
              ["==", ["get", "kind"], "trolley"],
              "#2c4a6e",
              "#1f4d46",
            ],
            "line-width": 2.2,
            "line-opacity": 0.38,
          },
        });
        map.addLayer({
          id: "routes-active",
          type: "line",
          source: "routes",
          filter: ["==", ["get", "routeId"], -1],
          paint: {
            "line-color": [
              "case",
              ["==", ["get", "kind"], "trolley"],
              "#2c4a6e",
              "#1f4d46",
            ],
            "line-width": 5,
            "line-opacity": 0.95,
          },
        });

        map.addSource("stops", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: network.stops.map((s) => ({
              type: "Feature" as const,
              properties: { id: s.id, name: s.name },
              geometry: { type: "Point" as const, coordinates: [s.lng, s.lat] },
            })),
          },
        });
        map.addLayer({
          id: "stops-circle",
          type: "circle",
          source: "stops",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 2.2, 15, 5.5],
            "circle-color": "#fffcf7",
            "circle-stroke-color": "#1a1916",
            "circle-stroke-width": 1.15,
            "circle-opacity": 0.92,
          },
        });
        map.addLayer({
          id: "stop-active",
          type: "circle",
          source: "stops",
          filter: ["==", ["get", "id"], -1],
          paint: {
            "circle-radius": 9,
            "circle-color": "#1f4d46",
            "circle-stroke-color": "#fffcf7",
            "circle-stroke-width": 2,
          },
        });
        map.addLayer({
          id: "stop-labels",
          type: "symbol",
          source: "stops",
          minzoom: 14.2,
          layout: {
            "text-field": ["get", "name"],
            "text-size": 11,
            "text-font": ["Noto Sans Regular"],
            "text-offset": [0, 1.15],
            "text-anchor": "top",
            "text-max-width": 8,
          },
          paint: {
            "text-color": "#1a1916",
            "text-halo-color": "#f4f2ee",
            "text-halo-width": 1.2,
          },
        });

        const layer = new VehicleLayer();
        map.addLayer(layer);
        layerRef.current = layer;

        const tick = () => {
          const st = useTransit.getState();
          layer.setVehicles(activeVehicles(appClock(st.simMinutes), st.kind));
        };
        tick();
        timer = window.setInterval(tick, 400);

        map.on("click", "stops-circle", (e) => {
          const id = e.features?.[0]?.properties?.id;
          if (typeof id === "number") selectStop(id);
          else if (typeof id === "string") selectStop(Number(id));
        });
        map.on("mouseenter", "stops-circle", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "stops-circle", () => {
          map.getCanvas().style.cursor = "";
        });
      });
    })();

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      map?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, [selectStop]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    if (map.getLayer("routes-line")) {
      const filter = kind === "all" ? ["has", "kind"] : ["==", ["get", "kind"], kind];
      map.setFilter("routes-line", filter as never);
      map.setPaintProperty("routes-line", "line-opacity", selectedRouteId ? 0.14 : 0.38);
    }
    if (map.getLayer("routes-active")) {
      if (selectedRouteId && selectedDirectionId) {
        map.setFilter("routes-active", [
          "all",
          ["==", ["get", "routeId"], selectedRouteId],
          ["==", ["get", "directionId"], selectedDirectionId],
        ]);
      } else if (selectedRouteId) {
        map.setFilter("routes-active", ["==", ["get", "routeId"], selectedRouteId]);
      } else {
        map.setFilter("routes-active", ["==", ["get", "routeId"], -1]);
      }
    }
    if (map.getSource("stops")) {
      const vis = kind;
      void vis;
    }
    if (map.getLayer("stop-active")) {
      map.setFilter("stop-active", ["==", ["get", "id"], selectedStopId ?? -1]);
    }
    const k = useTransit.getState().kind;
    layerRef.current?.setVehicles(activeVehicles(appClock(useTransit.getState().simMinutes), k));
  }, [kind, selectedRouteId, selectedDirectionId, selectedStopId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({ pitch: pitch3d ? 52 : 0, duration: 450 });
  }, [pitch3d]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || selectedStopId == null) return;
    const stop = stopById.get(selectedStopId);
    if (!stop) return;
    map.easeTo({
      center: [stop.lng, stop.lat],
      zoom: Math.max(map.getZoom(), 14.6),
      duration: 500,
    });
  }, [selectedStopId]);

  return <div ref={host} className="absolute inset-0" />;
}
