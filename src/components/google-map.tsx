"use client";

import { useEffect, useRef, useState } from "react";
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
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey || !mapRef.current) {
      setError(true);
      return;
    }

    // Don't load if already loaded
    if ((window as any).google?.maps) {
      setMapLoaded(true);
      initMap();
      return;
    }

    // Load Google Maps script
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setMapLoaded(true);
      initMap();
    };
    script.onerror = () => setError(true);
    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, [apiKey, latitude, longitude]);

  function initMap() {
    if (!mapRef.current || !(window as any).google?.maps) return;

    const google = (window as any).google;
    const lat = latitude || 20.2961;
    const lng = longitude || 85.8245;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat, lng },
      zoom: latitude ? 15 : 5,
      disableDefaultUI: !interactive,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    if (latitude && longitude) {
      new google.maps.Marker({
        position: { lat, lng },
        map,
        title: address || "Property Location",
        animation: google.maps.Animation.DROP,
      });
    }

    if (interactive && onLocationSelect) {
      map.addListener("click", (e: any) => {
        const clickLat = e.latLng.lat();
        const clickLng = e.latLng.lng();
        onLocationSelect(clickLat, clickLng);

        // Clear previous markers and add new one
        new google.maps.Marker({
          position: { lat: clickLat, lng: clickLng },
          map,
          animation: google.maps.Animation.DROP,
        });
      });
    }
  }

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
