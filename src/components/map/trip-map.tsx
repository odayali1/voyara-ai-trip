"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export type MapStop = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  dayNumber?: number;
};

export function TripMap({
  stops,
  className,
  visible = true,
}: {
  stops: MapStop[];
  className?: string;
  visible?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          carto: {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
              "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
              "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution: "© OpenStreetMap © CARTO",
          },
        },
        layers: [{ id: "carto", type: "raster", source: "carto" }],
      },
      center: [55.2708, 25.2048],
      zoom: 2,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    const onLoad = () => {
      map.resize();
    };
    map.on("load", onLoad);

    return () => {
      map.off("load", onLoad);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const map = mapRef.current;
    if (!map) return;
    // MapLibre needs resize after display:none → visible
    requestAnimationFrame(() => {
      map.resize();
    });
  }, [visible]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const valid = stops.filter(
      (s) => Number.isFinite(s.lat) && Number.isFinite(s.lng)
    );

    valid.forEach((stop, index) => {
      const el = document.createElement("div");
      el.className = "voyara-marker";
      el.innerHTML = `<span>${stop.dayNumber ?? index + 1}</span>`;
      el.title = stop.title;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([stop.lng, stop.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 18 }).setHTML(
            `<strong>${stop.title}</strong>${
              stop.dayNumber ? `<div>Day ${stop.dayNumber}</div>` : ""
            }`
          )
        )
        .addTo(map);
      markersRef.current.push(marker);
    });

    const applyRoute = () => {
      if (valid.length < 2) return;
      const coords = valid.map((s) => [s.lng, s.lat] as [number, number]);
      if (map.getSource("route")) {
        (map.getSource("route") as maplibregl.GeoJSONSource).setData({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: coords },
        });
      } else {
        map.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: coords },
          },
        });
        if (!map.getLayer("route-line")) {
          map.addLayer({
            id: "route-line",
            type: "line",
            source: "route",
            paint: {
              "line-color": "#d4a574",
              "line-width": 3,
              "line-opacity": 0.85,
            },
          });
        }
      }
    };

    if (valid.length === 1) {
      map.flyTo({ center: [valid[0].lng, valid[0].lat], zoom: 12, essential: true });
    } else if (valid.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      valid.forEach((s) => bounds.extend([s.lng, s.lat]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 1200 });
      if (map.isStyleLoaded()) applyRoute();
      else map.once("load", applyRoute);
    }

    map.resize();
  }, [stops]);

  return <div ref={containerRef} className={className} />;
}
