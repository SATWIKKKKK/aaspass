"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin } from "lucide-react";

interface GoogleMapProps {
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  className?: string;
  height?: string;
  interactive?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
}

// Global script loading state to prevent duplicate script tags
let _gmapsScriptPromise: Promise<void> | null = null;
function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if ((window as any).google?.maps) return Promise.resolve();
  if (_gmapsScriptPromise) return _gmapsScriptPromise;

  _gmapsScriptPromise = new Promise<void>((resolve, reject) => {
    // Check if script tag already exists
    if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
      // Wait for it to load
      const check = setInterval(() => {
        if ((window as any).google?.maps) { clearInterval(check); resolve(); }
      }, 100);
      setTimeout(() => { clearInterval(check); reject(new Error("Google Maps script timeout")); }, 15000);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => { _gmapsScriptPromise = null; reject(new Error("Failed to load Google Maps")); };
    document.head.appendChild(script);
  });

  return _gmapsScriptPromise;
}

export function GoogleMap({
  latitude,
  longitude,
  address,
  className = "",
  height = "300px",
  interactive = false,
  onLocationSelect,
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const initMap = useCallback(() => {
    if (!mapRef.current || !(window as any).google?.maps) return;

    const google = (window as any).google;
    const lat = latitude || 20.2961;
    const lng = longitude || 85.8245;

    // Reuse existing map instance if possible
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center: { lat, lng },
        zoom: latitude ? 15 : 5,
        disableDefaultUI: !interactive,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });
    } else {
      mapInstanceRef.current.setCenter({ lat, lng });
      mapInstanceRef.current.setZoom(latitude ? 15 : 5);
    }

    const map = mapInstanceRef.current;

    // Clear old marker
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }

    if (latitude && longitude) {
      markerRef.current = new google.maps.Marker({
        position: { lat, lng },
        map,
        title: address || "Property Location",
        animation: google.maps.Animation.DROP,
      });
    }

    if (interactive && onLocationSelect) {
      // Remove previous click listeners by recreating
      google.maps.event.clearListeners(map, "click");
      map.addListener("click", (e: any) => {
        const clickLat = e.latLng.lat();
        const clickLng = e.latLng.lng();
        onLocationSelect(clickLat, clickLng);

        // Clear previous marker and add new one
        if (markerRef.current) markerRef.current.setMap(null);
        markerRef.current = new google.maps.Marker({
          position: { lat: clickLat, lng: clickLng },
          map,
          animation: google.maps.Animation.DROP,
        });
      });
    }
  }, [latitude, longitude, address, interactive, onLocationSelect]);

  useEffect(() => {
    if (!apiKey || !mapRef.current) {
      if (!apiKey) setError(true);
      return;
    }

    loadGoogleMapsScript(apiKey)
      .then(() => {
        setMapLoaded(true);
        initMap();
      })
      .catch(() => setError(true));
  }, [apiKey, initMap]);

  // Re-init map when coords change and map is already loaded
  useEffect(() => {
    if (mapLoaded) initMap();
  }, [mapLoaded, initMap]);

  // If no API key, show a fallback with address and a link to Google Maps
  if (error || !apiKey) {
    const mapsUrl = latitude && longitude
      ? `https://www.google.com/maps?q=${latitude},${longitude}`
      : address
      ? `https://www.google.com/maps/search/${encodeURIComponent(address)}`
      : null;

    return (
      <div
        className={`bg-gray-100 rounded-lg flex flex-col items-center justify-center ${className}`}
        style={{ height }}
      >
        <MapPin className="h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm text-gray-500 font-medium mb-1">
          {!apiKey ? "Google Maps API key not configured" : "Map failed to load"}
        </p>
        {address && <p className="text-sm text-gray-600 text-center px-4">{address}</p>}
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 text-sm text-primary hover:underline font-medium"
          >
            View on Google Maps →
          </a>
        )}
        {!mapsUrl && <p className="text-xs text-gray-400 mt-1">Location not available</p>}
      </div>
    );
  }

  return (
    <div className={className}>
      <div ref={mapRef} style={{ height, width: "100%" }} className="rounded-lg" />
    </div>
  );
}
