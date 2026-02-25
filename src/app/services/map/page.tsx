"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { MapPin, Search, Navigation, Loader2, Building2, Star, ChevronLeft, X, SlidersHorizontal } from "lucide-react";
import { RouteGuard } from "@/components/route-guard";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, getDailyRate } from "@/lib/utils";

interface NearbyProperty {
  id: string; name: string; slug: string; serviceType: string; price: number;
  city: string; address: string; avgRating: number; totalReviews: number;
  latitude: number; longitude: number; distance: number;
  images: { url: string }[];
}

const RADIUS_OPTIONS = [
  { label: "500 m", value: "500" },
  { label: "1 km", value: "1000" },
  { label: "2 km", value: "2000" },
  { label: "5 km", value: "5000" },
  { label: "10 km", value: "10000" },
];

const SERVICE_FILTERS = [
  { label: "All", value: "" },
  { label: "Hostel / PG", value: "HOSTEL,PG" },
  { label: "Mess", value: "MESS" },
  { label: "Library", value: "LIBRARY" },
  { label: "Gym", value: "GYM" },
  { label: "Laundry", value: "LAUNDRY" },
];

function MapSearchInner() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const searchCircleRef = useRef<any>(null);
  const autocompleteInputRef = useRef<HTMLInputElement>(null);

  const [location, setLocation] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [radius, setRadius] = useState("2000");
  const [serviceFilter, setServiceFilter] = useState("");
  const [properties, setProperties] = useState<NearbyProperty[]>([]);
  const [loading, setLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Load Google Maps
  useEffect(() => {
    if (!apiKey) return;
    if ((window as any).google?.maps) { setMapLoaded(true); return; }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);
  }, [apiKey]);

  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstanceRef.current) return;
    const google = (window as any).google;

    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: { lat: 20.2961, lng: 85.8245 }, // Default: Bhubaneswar
      zoom: 12,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
      ],
    });

    // Click on map to set location
    mapInstanceRef.current.addListener("click", (e: any) => {
      const clickLat = e.latLng.lat();
      const clickLng = e.latLng.lng();
      setLat(clickLat);
      setLng(clickLng);
      // Reverse geocode for display
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat: clickLat, lng: clickLng } }, (results: any, status: string) => {
        if (status === "OK" && results?.[0]) {
          setLocation(results[0].formatted_address);
        }
      });
    });
  }, [mapLoaded]);

  // Setup autocomplete
  useEffect(() => {
    if (!mapLoaded || !autocompleteInputRef.current) return;
    const google = (window as any).google;

    const autocomplete = new google.maps.places.Autocomplete(autocompleteInputRef.current, {
      componentRestrictions: { country: "in" },
      fields: ["formatted_address", "geometry"],
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        const plat = place.geometry.location.lat();
        const plng = place.geometry.location.lng();
        setLat(plat);
        setLng(plng);
        setLocation(place.formatted_address || "");
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo({ lat: plat, lng: plng });
          mapInstanceRef.current.setZoom(14);
        }
      }
    });
  }, [mapLoaded]);

  // Search nearby properties
  const searchNearby = useCallback(async () => {
    if (lat === null || lng === null) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ lat: String(lat), lng: String(lng), radius });
      if (serviceFilter) params.set("serviceType", serviceFilter);
      const res = await fetch(`/api/properties/nearby?${params}`);
      const data = await res.json();
      setProperties(data.properties || []);
      setSidebarOpen(true);
    } catch {
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [lat, lng, radius, serviceFilter]);

  // Update map markers when properties change
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;
    const google = (window as any).google;

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // Clear old circle
    if (searchCircleRef.current) searchCircleRef.current.setMap(null);

    if (lat !== null && lng !== null) {
      // Draw search radius circle
      searchCircleRef.current = new google.maps.Circle({
        strokeColor: "#6366f1",
        strokeOpacity: 0.3,
        strokeWeight: 2,
        fillColor: "#6366f1",
        fillOpacity: 0.08,
        map: mapInstanceRef.current,
        center: { lat, lng },
        radius: parseInt(radius),
      });

      // Center pin
      const centerMarker = new google.maps.Marker({
        position: { lat, lng },
        map: mapInstanceRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#6366f1",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
        title: "Search center",
        zIndex: 1000,
      });
      markersRef.current.push(centerMarker);

      // Fit bounds to circle
      mapInstanceRef.current.fitBounds(searchCircleRef.current.getBounds());
    }

    // Property markers
    properties.forEach((p) => {
      const marker = new google.maps.Marker({
        position: { lat: p.latitude, lng: p.longitude },
        map: mapInstanceRef.current,
        title: p.name,
        animation: google.maps.Animation.DROP,
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="min-width: 200px; font-family: sans-serif;">
            <h3 style="margin: 0 0 4px; font-size: 14px; font-weight: 600;">${p.name}</h3>
            <p style="margin: 0 0 4px; font-size: 12px; color: #666;">${p.address}</p>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 12px;">
              <span style="font-weight: 600; color: #6366f1;">₹${getDailyRate(p.price)}/day</span>
              <span style="color: #999;">•</span>
              <span>${p.avgRating.toFixed(1)} ⭐ (${p.totalReviews})</span>
              <span style="color: #999;">•</span>
              <span>${p.distance}m away</span>
            </div>
            <a href="/services/${p.slug}" style="display: inline-block; margin-top: 8px; font-size: 12px; color: #6366f1; text-decoration: none;">View Details →</a>
          </div>
        `,
      });

      marker.addListener("click", () => {
        infoWindow.open(mapInstanceRef.current, marker);
        setSelectedProperty(p.id);
      });

      markersRef.current.push(marker);
    });
  }, [properties, lat, lng, radius, mapLoaded]);

  // Use current location
  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const plat = pos.coords.latitude;
        const plng = pos.coords.longitude;
        setLat(plat);
        setLng(plng);
        setLocation("My Location");
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo({ lat: plat, lng: plng });
          mapInstanceRef.current.setZoom(14);
        }
      },
      () => { /* permission denied – silently ignore */ }
    );
  };

  const formatDistance = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar variant="student" />

      {/* Top controls bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 z-30">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Link href="/services" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary shrink-0">
            <ChevronLeft className="h-4 w-4" /> Back to Services
          </Link>

          <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={autocompleteInputRef}
                type="text"
                placeholder="Search location..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-9 pr-10 h-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {location && (
                <button onClick={() => { setLocation(""); setLat(null); setLng(null); setProperties([]); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            <button onClick={useMyLocation} className="h-10 px-3 border border-gray-200 rounded-lg flex items-center gap-2 text-sm text-gray-600 hover:bg-gray-50 shrink-0" title="Use my location">
              <Navigation className="h-4 w-4" /> <span className="hidden sm:inline">My Location</span>
            </button>

            <Select value={radius} onValueChange={setRadius}>
              <SelectTrigger className="h-10 w-28 text-sm shrink-0"><SelectValue /></SelectTrigger>
              <SelectContent>{RADIUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>

            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger className="h-10 w-36 text-sm shrink-0"><SelectValue placeholder="All Services" /></SelectTrigger>
              <SelectContent>{SERVICE_FILTERS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
            </Select>

            <Button onClick={searchNearby} disabled={lat === null || loading} className="h-10 px-5 shrink-0">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
              Search
            </Button>
          </div>
        </div>
      </div>

      {/* Map + results */}
      <div className="flex-1 flex relative">
        {/* Sidebar results */}
        <div className={cn(
          "absolute sm:relative z-20 bg-white border-r border-gray-200 transition-all duration-300 h-full overflow-y-auto",
          sidebarOpen ? "w-full sm:w-[360px]" : "w-0 overflow-hidden"
        )}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">
                {properties.length > 0 ? `${properties.length} found nearby` : "Search for services"}
              </h2>
              <button onClick={() => setSidebarOpen(false)} className="sm:hidden h-8 w-8 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>

            {properties.length === 0 && !loading && (
              <div className="text-center py-12">
                <MapPin className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  {lat !== null ? "No services found in this area. Try a larger radius." : "Enter a location or click on the map to search nearby services."}
                </p>
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}

            <div className="space-y-3">
              {properties.map((p) => (
                <Link key={p.id} href={`/services/${p.slug}`}>
                  <Card className={cn(
                    "hover:shadow-md transition-all cursor-pointer",
                    selectedProperty === p.id && "ring-2 ring-primary"
                  )}>
                    <CardContent className="p-3">
                      <div className="flex gap-3">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                          {p.images?.[0]?.url ? (
                            <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Building2 className="h-6 w-6 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-gray-900 truncate">{p.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{p.serviceType}</Badge>
                            <span className="text-[10px] text-gray-400">{formatDistance(p.distance)}</span>
                          </div>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-sm font-bold text-primary">₹{getDailyRate(p.price)}<span className="text-xs font-normal text-gray-400">/day</span></span>
                            <span className="flex items-center gap-0.5 text-xs text-gray-500">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              {p.avgRating.toFixed(1)} ({p.totalReviews})
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          {!sidebarOpen && properties.length > 0 && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 text-sm font-medium border border-gray-200 hover:bg-gray-50"
            >
              <SlidersHorizontal className="h-4 w-4" /> {properties.length} results
            </button>
          )}

          {!apiKey ? (
            <div className="h-full flex flex-col items-center justify-center bg-gray-100">
              <MapPin className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500">Google Maps API key not configured</p>
            </div>
          ) : (
            <div ref={mapRef} className="w-full h-full min-h-[60vh]" />
          )}
        </div>
      </div>
    </div>
  );
}

export default function MapSearchPage() {
  return (
    <RouteGuard allowedRole="STUDENT">
      <MapSearchInner />
    </RouteGuard>
  );
}
