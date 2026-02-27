"use client";

/// <reference types="@types/google.maps" />

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  MapPin, Search, Navigation, Loader2, Building2, Star, ChevronLeft,
  X, List, MapIcon, Crosshair, CheckCircle2,
} from "lucide-react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, getDailyRate } from "@/lib/utils";
import toast from "react-hot-toast";
import { useSearch } from "@/context/search-context";

/* ── Types ──────────────────────────────────────────────────────────────── */
interface NearbyProperty {
  id: string; name: string; slug: string; serviceType: string; price: number;
  city: string; address: string; avgRating: number; totalReviews: number;
  latitude: number; longitude: number; distance: number;
  images: { url: string }[];
}
interface GooglePlace {
  placeId: string; name: string; address: string;
  lat: number; lng: number; rating: number; totalRatings: number;
  photoUrl: string | null; distance: number;
}

/* ── Constants ──────────────────────────────────────────────────────────── */
const RADIUS_OPTIONS = [
  { label: "500 m", meters: 500 },
  { label: "1 km", meters: 1000 },
  { label: "2 km", meters: 2000 },
  { label: "5 km", meters: 5000 },
];
const SERVICE_CHIPS = [
  { label: "All", types: "" },
  { label: "Hostel / PG", types: "HOSTEL,PG" },
  { label: "Mess", types: "MESS" },
  { label: "Library", types: "LIBRARY" },
  { label: "Gym", types: "GYM" },
  { label: "Laundry", types: "LAUNDRY" },
];

/* ── Haversine (client-side distance for Google Places results) ─────── */
function haversineM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/* ── Popular Indian Cities (fallback when Places API is unavailable) ── */
const INDIAN_CITIES = [
  { name: "Bhubaneswar, Odisha", lat: 20.2961, lng: 85.8245 },
  { name: "Delhi, NCR", lat: 28.6139, lng: 77.2090 },
  { name: "Mumbai, Maharashtra", lat: 19.0760, lng: 72.8777 },
  { name: "Bangalore, Karnataka", lat: 12.9716, lng: 77.5946 },
  { name: "Hyderabad, Telangana", lat: 17.3850, lng: 78.4867 },
  { name: "Chennai, Tamil Nadu", lat: 13.0827, lng: 80.2707 },
  { name: "Kolkata, West Bengal", lat: 22.5726, lng: 88.3639 },
  { name: "Pune, Maharashtra", lat: 18.5204, lng: 73.8567 },
  { name: "Ahmedabad, Gujarat", lat: 23.0225, lng: 72.5714 },
  { name: "Jaipur, Rajasthan", lat: 26.9124, lng: 75.7873 },
  { name: "Lucknow, Uttar Pradesh", lat: 26.8467, lng: 80.9462 },
  { name: "Chandigarh", lat: 30.7333, lng: 76.7794 },
  { name: "Indore, Madhya Pradesh", lat: 22.7196, lng: 75.8577 },
  { name: "Nagpur, Maharashtra", lat: 21.1458, lng: 79.0882 },
  { name: "Kota, Rajasthan", lat: 25.2138, lng: 75.8648 },
  { name: "Varanasi, Uttar Pradesh", lat: 25.3176, lng: 82.9739 },
  { name: "Patna, Bihar", lat: 25.6093, lng: 85.1376 },
  { name: "Cuttack, Odisha", lat: 20.4625, lng: 85.8830 },
  { name: "Rourkela, Odisha", lat: 22.2604, lng: 84.8536 },
  { name: "Noida, Uttar Pradesh", lat: 28.5355, lng: 77.3910 },
  { name: "Gurgaon, Haryana", lat: 28.4595, lng: 77.0266 },
  { name: "Kanpur, Uttar Pradesh", lat: 26.4499, lng: 80.3319 },
  { name: "Dehradun, Uttarakhand", lat: 30.3165, lng: 78.0322 },
  { name: "Ranchi, Jharkhand", lat: 23.3441, lng: 85.3096 },
  { name: "Guwahati, Assam", lat: 26.1445, lng: 91.7362 },
  { name: "Bhopal, Madhya Pradesh", lat: 23.2599, lng: 77.4126 },
  { name: "Coimbatore, Tamil Nadu", lat: 11.0168, lng: 76.9558 },
  { name: "Thiruvananthapuram, Kerala", lat: 8.5241, lng: 76.9366 },
  { name: "Kochi, Kerala", lat: 9.9312, lng: 76.2673 },
  { name: "Visakhapatnam, Andhra Pradesh", lat: 17.6868, lng: 83.2185 },
  { name: "Mangalore, Karnataka", lat: 12.9141, lng: 74.8560 },
  { name: "Mysore, Karnataka", lat: 12.2958, lng: 76.6394 },
  { name: "Surat, Gujarat", lat: 21.1702, lng: 72.8311 },
  { name: "Vadodara, Gujarat", lat: 22.3072, lng: 73.1812 },
  { name: "Amritsar, Punjab", lat: 31.6340, lng: 74.8723 },
  { name: "Raipur, Chhattisgarh", lat: 21.2514, lng: 81.6296 },
];

/* ════════════════════════════════════════════════════════════════════════ */
function MapSearchInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { updateSearch } = useSearch();

  /* refs */
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObjRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<(google.maps.Marker & { _propId?: string })[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const centerMarkerRef = useRef<google.maps.Marker | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const searchPendingRef = useRef(false);

  /* state */
  const [locationName, setLocationName] = useState(searchParams.get("location") || "");
  const [lat, setLat] = useState<number | null>(() => {
    const v = parseFloat(searchParams.get("lat") || "");
    return isNaN(v) ? null : v;
  });
  const [lng, setLng] = useState<number | null>(() => {
    const v = parseFloat(searchParams.get("lng") || "");
    return isNaN(v) ? null : v;
  });
  const [radius, setRadius] = useState(2000);
  const [serviceFilter, setServiceFilter] = useState("");
  const [dbResults, setDbResults] = useState<NearbyProperty[]>([]);
  const [googleResults, setGoogleResults] = useState<GooglePlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("map");
  const [searched, setSearched] = useState(false);
  const [citySuggestions, setCitySuggestions] = useState<typeof INDIAN_CITIES>([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [googleAutocompleteActive, setGoogleAutocompleteActive] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  /* ── Sync input field value with locationName state ──────────────── */
  useEffect(() => {
    if (inputRef.current && locationName) {
      inputRef.current.value = locationName;
    }
  }, [locationName]);

  /* ── Load Google Maps via @googlemaps/js-api-loader ─────────────── */
  useEffect(() => {
    if (!apiKey) return;
    setOptions({ key: apiKey, v: "weekly", libraries: ["places"] });
    importLibrary("maps")
      .then(() => setMapReady(true))
      .catch((err) => {
        console.error("Failed to load Google Maps:", err);
        toast.error("Failed to load Google Maps. Check API key and billing.");
      });
  }, [apiKey]);

  /* ── Initialize Map ────────────────────────────────────────────── */
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapObjRef.current) return;

    const initLat = lat ?? 20.2961;
    const initLng = lng ?? 85.8245;

    mapObjRef.current = new google.maps.Map(mapRef.current, {
      center: { lat: initLat, lng: initLng },
      zoom: lat !== null ? 13 : 5,
      gestureHandling: "greedy",
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
      fullscreenControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
      draggableCursor: "crosshair",
      styles: [
        { featureType: "poi.business", stylers: [{ visibility: "off" }] },
        { featureType: "poi.government", stylers: [{ visibility: "off" }] },
      ],
    });

    infoWindowRef.current = new google.maps.InfoWindow();

    /* click on map → set center, validate India, reverse geocode, auto-search */
    mapObjRef.current.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const cLat = e.latLng.lat();
      const cLng = e.latLng.lng();

      new google.maps.Geocoder().geocode(
        { location: { lat: cLat, lng: cLng } },
        (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
          if (status === "OK" && results?.[0]) {
            // Check if location is within India
            const isInIndia = results[0].address_components?.some(
              (component: google.maps.GeocoderAddressComponent) =>
                component.types.includes("country") && component.short_name === "IN"
            );
            if (!isInIndia) {
              toast.error("Please select a location within India");
              return;
            }

            const areaName = results[0].formatted_address;
            setLocationName(areaName);
            if (inputRef.current) inputRef.current.value = areaName;

            toast(`Searching near ${areaName.split(",")[0]}...`, {
              icon: "📍",
              duration: 2000,
              style: { fontSize: "13px" },
            });
          }

          // Update coordinates and trigger auto-search
          setLat(cLat);
          setLng(cLng);
          placeCenterMarker(cLat, cLng);
          searchPendingRef.current = true;
        }
      );
    });

    /* If we have lat/lng from query params, place the center marker */
    if (lat !== null && lng !== null) {
      placeCenterMarker(initLat, initLng);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady]); // map init depends on mapReady

  /* ── Setup autocomplete on the location input ──────────────────── */
  useEffect(() => {
    if (!mapReady || !inputRef.current || autocompleteRef.current) return;

    try {
      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "in" },
        types: ["geocode", "establishment"],
        fields: ["formatted_address", "geometry", "name", "place_id"],
      });

      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current!.getPlace();
        if (place.geometry?.location) {
          const pLat = place.geometry.location.lat();
          const pLng = place.geometry.location.lng();
          setLat(pLat);
          setLng(pLng);
          setLocationName(place.formatted_address || place.name || "");
          setShowCityDropdown(false);
          if (mapObjRef.current) {
            mapObjRef.current.panTo({ lat: pLat, lng: pLng });
            mapObjRef.current.setZoom(14);
          }
          placeCenterMarker(pLat, pLng);
          searchPendingRef.current = true;
        }
      });
      setGoogleAutocompleteActive(true);
    } catch (err) {
      console.warn("Google Places autocomplete not available, using city fallback:", err);
      setGoogleAutocompleteActive(false);
    }
  }, [mapReady]); // autocomplete init depends on mapReady

  /* ── Fallback city filter (when Google Places API is unavailable) ─ */
  const handleCityInput = useCallback((value: string) => {
    setLocationName(value);
    if (!value.trim() || googleAutocompleteActive) {
      setCitySuggestions([]);
      setShowCityDropdown(false);
      return;
    }
    const q = value.toLowerCase();
    const matches = INDIAN_CITIES.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
    setCitySuggestions(matches);
    setShowCityDropdown(matches.length > 0);
  }, [googleAutocompleteActive]);

  const selectCity = useCallback((city: typeof INDIAN_CITIES[0]) => {
    setLocationName(city.name);
    setLat(city.lat);
    setLng(city.lng);
    setShowCityDropdown(false);
    if (inputRef.current) inputRef.current.value = city.name;
    if (mapObjRef.current) {
      mapObjRef.current.panTo({ lat: city.lat, lng: city.lng });
      mapObjRef.current.setZoom(14);
    }
    placeCenterMarker(city.lat, city.lng);
    searchPendingRef.current = true;
  }, []);

  /* ── Auto-search when lat/lng change (from click or autocomplete) ─ */
  useEffect(() => {
    if (mapReady && lat !== null && lng !== null && searchPendingRef.current) {
      searchPendingRef.current = false;
      doSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, mapReady]);

  /* ── Auto-search once map is ready if lat/lng from query params ── */
  useEffect(() => {
    if (mapReady && lat !== null && lng !== null && !searched) {
      doSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady]);

  /* ── Helper: place / update center marker ──────────────────────── */
  function placeCenterMarker(cLat: number, cLng: number) {
    if (centerMarkerRef.current) centerMarkerRef.current.setMap(null);
    if (!mapObjRef.current) return;
    centerMarkerRef.current = new google.maps.Marker({
      position: { lat: cLat, lng: cLng },
      map: mapObjRef.current,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 14,
        fillColor: "#4F46E5",
        fillOpacity: 0.9,
        strokeColor: "#ffffff",
        strokeWeight: 3,
      },
      title: "Searching here",
      zIndex: 2000,
      animation: google.maps.Animation.DROP,
    });
  }

  /* ── Clear all markers from the map ────────────────────────────── */
  function clearMarkers() {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (circleRef.current) { circleRef.current.setMap(null); circleRef.current = null; }
    infoWindowRef.current?.close();
  }

  /* ── SEARCH ────────────────────────────────────────────────────── */
  const doSearch = useCallback(async () => {
    if (lat === null || lng === null || !mapObjRef.current) return;
    setLoading(true);
    setSearched(true);
    clearMarkers();
    placeCenterMarker(lat, lng);

    /* draw radius circle */
    circleRef.current = new google.maps.Circle({
      map: mapObjRef.current,
      center: { lat, lng },
      radius,
      fillColor: "#4F46E5",
      fillOpacity: 0.06,
      strokeColor: "#4F46E5",
      strokeOpacity: 0.35,
      strokeWeight: 2,
      clickable: false,
    });
    mapObjRef.current.fitBounds(circleRef.current.getBounds()!);

    /* 1) Search OUR database */
    const dbPromise = (async () => {
      try {
        const params = new URLSearchParams({ lat: String(lat), lng: String(lng), radius: String(radius) });
        if (serviceFilter) params.set("serviceType", serviceFilter);
        const res = await fetch(`/api/properties/nearby?${params}`);
        const data = await res.json();
        return (data.properties || []) as NearbyProperty[];
      } catch { return [] as NearbyProperty[]; }
    })();

    /* 2) Google Places Nearby Search (may fail if Places API not enabled) */
    const googlePromise = new Promise<GooglePlace[]>((resolve) => {
      if (!serviceFilter || serviceFilter.includes("HOSTEL") || serviceFilter.includes("PG") || serviceFilter === "") {
        try {
          const svc = new google.maps.places.PlacesService(mapObjRef.current!);
          svc.nearbySearch(
            { location: { lat, lng }, radius, keyword: "hostel PG paying guest accommodation", type: "lodging" },
            (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus) => {
              if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                const places: GooglePlace[] = results.slice(0, 20).map((r: google.maps.places.PlaceResult) => ({
                  placeId: r.place_id || "",
                  name: r.name || "Unknown",
                  address: r.vicinity || "",
                  lat: r.geometry?.location?.lat() || 0,
                  lng: r.geometry?.location?.lng() || 0,
                  rating: r.rating || 0,
                  totalRatings: r.user_ratings_total || 0,
                  photoUrl: r.photos?.[0]?.getUrl({ maxWidth: 200, maxHeight: 150 }) || null,
                  distance: haversineM(lat!, lng!, r.geometry?.location?.lat() || 0, r.geometry?.location?.lng() || 0),
                }));
                resolve(places);
              } else { resolve([]); }
            },
          );
        } catch {
          console.warn("Google Places nearbySearch not available");
          resolve([]);
        }
      } else { resolve([]); }
    });

    const [dbRes, googleRes] = await Promise.all([dbPromise, googlePromise]);
    setDbResults(dbRes);
    setGoogleResults(googleRes);

    /* Place markers — DB results get branded purple pins, Google results get red */
    const map = mapObjRef.current!;

    dbRes.forEach((p) => {
      const marker = new google.maps.Marker({
        position: { lat: p.latitude, lng: p.longitude },
        map,
        title: p.name,
        icon: {
          path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
          fillColor: "#6366f1",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
          scale: 1.8,
          anchor: new google.maps.Point(12, 22),
        },
        animation: google.maps.Animation.DROP,
        zIndex: 1000,
      });

      const imgHtml = p.images?.[0]?.url
        ? `<img src="${p.images[0].url}" style="width:100%;height:100px;object-fit:cover;border-radius:8px 8px 0 0;"/>`
        : `<div style="width:100%;height:60px;background:#f3f4f6;border-radius:8px 8px 0 0;display:flex;align-items:center;justify-content:center;color:#d1d5db;font-size:24px;">🏠</div>`;

      marker.addListener("click", () => {
        infoWindowRef.current?.setContent(`
          <div style="max-width:240px;font-family:system-ui,sans-serif;margin:-8px -8px 0;">
            ${imgHtml}
            <div style="padding:10px 12px 12px;">
              <div style="display:flex;align-items:center;gap:4px;margin-bottom:2px;">
                <span style="background:#6366f1;color:white;font-size:9px;padding:1px 6px;border-radius:4px;font-weight:600;">AasPass</span>
                <span style="font-size:10px;color:#999;margin-left:auto;">${p.serviceType}</span>
              </div>
              <h3 style="margin:4px 0;font-size:14px;font-weight:700;">${p.name}</h3>
              <p style="margin:0 0 6px;font-size:11px;color:#666;">${p.address}, ${p.city}</p>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <span style="font-weight:700;color:#6366f1;font-size:15px;">₹${getDailyRate(p.price)}<span style="font-weight:400;font-size:11px;color:#999;">/day</span></span>
                <span style="font-size:11px;color:#666;">${p.avgRating.toFixed(1)} ⭐ (${p.totalReviews})</span>
              </div>
              <div style="display:flex;gap:6px;">
                <span style="font-size:10px;color:#888;">📍 ${formatDist(p.distance)} away</span>
              </div>
              <a href="/services/${p.slug}" style="display:block;margin-top:10px;padding:8px 0;background:#6366f1;color:white;border-radius:8px;text-align:center;text-decoration:none;font-size:13px;font-weight:600;">View Details & Book</a>
            </div>
          </div>
        `);
        infoWindowRef.current?.open(map, marker);
        setSelectedId(p.id);
      });

      const extMarker = marker as google.maps.Marker & { _propId?: string };
      extMarker._propId = p.id;
      markersRef.current.push(extMarker);
    });

    googleRes.forEach((p) => {
      const marker = new google.maps.Marker({
        position: { lat: p.lat, lng: p.lng },
        map,
        title: p.name,
        animation: google.maps.Animation.DROP,
        zIndex: 500,
      });

      const photoHtml = p.photoUrl
        ? `<img src="${p.photoUrl}" style="width:100%;height:90px;object-fit:cover;border-radius:8px 8px 0 0;"/>`
        : "";

      marker.addListener("click", () => {
        infoWindowRef.current?.setContent(`
          <div style="max-width:220px;font-family:system-ui,sans-serif;margin:-8px -8px 0;">
            ${photoHtml}
            <div style="padding:10px 12px 12px;">
              <div style="display:flex;align-items:center;gap:4px;margin-bottom:2px;">
                <span style="background:#ef4444;color:white;font-size:9px;padding:1px 6px;border-radius:4px;font-weight:600;">Google</span>
              </div>
              <h3 style="margin:4px 0;font-size:14px;font-weight:700;">${p.name}</h3>
              <p style="margin:0 0 6px;font-size:11px;color:#666;">${p.address}</p>
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <span style="font-size:11px;color:#666;">${p.rating.toFixed(1)} ⭐ (${p.totalRatings})</span>
                <span style="font-size:10px;color:#888;">📍 ${formatDist(p.distance)}</span>
              </div>
            </div>
          </div>
        `);
        infoWindowRef.current?.open(map, marker);
        setSelectedId(`g_${p.placeId}`);
      });

      const extGMarker = marker as google.maps.Marker & { _propId?: string };
      extGMarker._propId = `g_${p.placeId}`;
      markersRef.current.push(extGMarker);
    });

    setLoading(false);
    setMobileView("map");
  }, [lat, lng, radius, serviceFilter]); // search deps

  /* ── Hover highlight: bounce the marker ────────────────────────── */
  useEffect(() => {
    markersRef.current.forEach((m) => {
      if (m._propId === hoveredId) m.setAnimation(google.maps.Animation.BOUNCE);
      else m.setAnimation(null);
    });
  }, [hoveredId, mapReady]);

  /* ── Click on sidebar card → pan map to marker ─────────────────── */
  function focusMarker(id: string) {
    setSelectedId(id);
    const marker = markersRef.current.find((m) => m._propId === id);
    if (marker && mapObjRef.current) {
      mapObjRef.current.panTo(marker.getPosition()!);
      mapObjRef.current.setZoom(16);
      google.maps.event.trigger(marker, "click");
    }
    setMobileView("map");
  }

  /* ── Current Location ──────────────────────────────────────────── */
  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    toast.loading("Getting your location...", { id: "geo" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const pLat = pos.coords.latitude;
        const pLng = pos.coords.longitude;
        setLat(pLat);
        setLng(pLng);
        setLocationName("My Current Location");
        if (inputRef.current) inputRef.current.value = "My Current Location";
        if (mapObjRef.current) {
          mapObjRef.current.panTo({ lat: pLat, lng: pLng });
          mapObjRef.current.setZoom(14);
        }
        placeCenterMarker(pLat, pLng);
        searchPendingRef.current = true;
        toast.success("Location found!", { id: "geo" });
      },
      () => {
        toast.error("Location access denied", { id: "geo" });
      },
    );
  }

  /* ── Helpers ───────────────────────────────────────────────────── */
  const allResults = [
    ...dbResults.map((p) => ({ type: "db" as const, id: p.id, name: p.name, slug: p.slug, serviceType: p.serviceType, price: p.price, address: `${p.address}, ${p.city}`, rating: p.avgRating, totalRatings: p.totalReviews, distance: p.distance, imageUrl: p.images?.[0]?.url || null })),
    ...googleResults.map((p) => ({ type: "google" as const, id: `g_${p.placeId}`, name: p.name, slug: null, serviceType: "Lodging", price: null, address: p.address, rating: p.rating, totalRatings: p.totalRatings, distance: p.distance, imageUrl: p.photoUrl })),
  ].sort((a, b) => a.distance - b.distance);

  /* ════════════════════════════════════════════════════════════════ */
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar variant="student" />

      {/* ═══ TOP CONTROLS ═══ */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 z-30 relative shrink-0">
        <div className="max-w-7xl mx-auto">
          {/* Row 1: Back link + Location input */}
          <div className="flex items-center gap-3 mb-3">
            <Link href="/services" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary shrink-0">
              <ChevronLeft className="h-4 w-4" /> Back
            </Link>
            <div className="relative flex-1 max-w-lg">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search a city, area, or landmark in India..."
                defaultValue={locationName}
                onInput={(e) => handleCityInput((e.target as HTMLInputElement).value)}
                onFocus={() => { if (!googleAutocompleteActive && citySuggestions.length > 0) setShowCityDropdown(true); }}
                onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                className="w-full pl-9 pr-10 h-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
              />
              {locationName && (
                <button onClick={() => { setLocationName(""); setLat(null); setLng(null); setDbResults([]); setGoogleResults([]); setSearched(false); setCitySuggestions([]); setShowCityDropdown(false); if (inputRef.current) inputRef.current.value = ""; }} className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
              {/* Fallback city suggestions dropdown */}
              {showCityDropdown && citySuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                  {citySuggestions.map((city) => (
                    <button
                      key={city.name}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectCity(city)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-primary/5 hover:text-primary transition-colors text-left"
                    >
                      <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      {city.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={useMyLocation} className="h-10 w-10 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 shrink-0" title="Use current location">
              <Crosshair className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          {/* Row 2: Radius pills + Service chips + Search button */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-500 mr-1">Radius:</span>
            {RADIUS_OPTIONS.map((o) => (
              <button key={o.meters} onClick={() => setRadius(o.meters)} className={cn("h-8 px-3 rounded-full text-xs font-medium border transition-all", radius === o.meters ? "bg-primary text-white border-primary" : "bg-white text-gray-600 border-gray-200 hover:border-primary/40")}>
                {o.label}
              </button>
            ))}
            <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block" />
            <span className="text-xs font-medium text-gray-500 mr-1 hidden sm:inline">Type:</span>
            {SERVICE_CHIPS.map((c) => (
              <button key={c.types} onClick={() => setServiceFilter(c.types)} className={cn("h-8 px-3 rounded-full text-xs font-medium border transition-all", serviceFilter === c.types ? "bg-indigo-50 text-primary border-primary/40" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300")}>
                {c.label}
              </button>
            ))}
            <Button onClick={doSearch} disabled={lat === null || loading} size="sm" className="h-8 px-4 rounded-full ml-auto">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Search className="h-3.5 w-3.5 mr-1" />}
              Search on Map
            </Button>
          </div>
        </div>
      </div>

      {/* ═══ Mobile toggle ═══ */}
      <div className="sm:hidden bg-white border-b border-gray-200 flex shrink-0">
        <button onClick={() => setMobileView("list")} className={cn("flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors", mobileView === "list" ? "text-primary border-b-2 border-primary" : "text-gray-500")}>
          <List className="h-4 w-4" /> List ({allResults.length})
        </button>
        <button onClick={() => setMobileView("map")} className={cn("flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors", mobileView === "map" ? "text-primary border-b-2 border-primary" : "text-gray-500")}>
          <MapIcon className="h-4 w-4" /> Map
        </button>
      </div>

      {/* ═══ SPLIT LAYOUT ═══ */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* ── LEFT PANEL: results ── */}
        <div className={cn(
          "bg-white border-r border-gray-200 overflow-y-auto w-full sm:w-[24rem] shrink-0 transition-all",
          mobileView === "map" && "hidden sm:block"
        )}>
          <div className="p-4" ref={sidebarRef}>
            {/* heading */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-900 text-sm">
                  {loading ? "Searching..." : searched ? `${allResults.length} results` : "Nearby Services"}
                </h2>
                {searched && !loading && (
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {dbResults.length} on AasPass • {googleResults.length} from Google
                  </p>
                )}
              </div>
            </div>

            {/* loading skeleton */}
            {loading && (
              <div className="space-y-3">
                {[1,2,3].map((i) => (
                  <div key={i} className="animate-pulse flex gap-3 p-3 rounded-xl border border-gray-100">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                      <div className="h-3 bg-gray-100 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* empty */}
            {!loading && searched && allResults.length === 0 && (
              <div className="text-center py-16">
                <MapPin className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-900 mb-1">No hostels found in this area</p>
                <p className="text-xs text-gray-400">Try increasing the radius or searching a different location.</p>
              </div>
            )}

            {/* initial state */}
            {!loading && !searched && (
              <div className="text-center py-16">
                <Search className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Enter a location and click <strong>Search on Map</strong></p>
                <p className="text-xs text-gray-400 mt-1">or click anywhere on the map to set a center point.</p>
              </div>
            )}

            {/* results list */}
            {!loading && (
              <div className="space-y-2">
                {allResults.map((r) => (
                  <div
                    key={r.id}
                    onMouseEnter={() => setHoveredId(r.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => focusMarker(r.id)}
                    className={cn(
                      "flex gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                      selectedId === r.id ? "border-primary/40 bg-primary/5 shadow-sm" : "border-gray-100 hover:border-gray-200 hover:shadow-sm"
                    )}
                  >
                    {/* thumbnail */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                      {r.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-gray-300" />
                        </div>
                      )}
                    </div>
                    {/* details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-1.5">
                        <h3 className="font-semibold text-sm text-gray-900 truncate flex-1">{r.name}</h3>
                        <Badge variant={r.type === "db" ? "default" : "secondary"} className={cn("text-[9px] px-1.5 py-0 shrink-0", r.type === "db" ? "bg-primary/90" : "bg-gray-200 text-gray-600")}>
                          {r.type === "db" ? "AasPass" : "Google"}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">{r.address}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <div className="flex items-center gap-2">
                          {r.price !== null && (
                            <span className="text-sm font-bold text-primary">₹{getDailyRate(r.price)}<span className="text-[10px] font-normal text-gray-400">/day</span></span>
                          )}
                          <span className="text-[10px] text-gray-400">📍 {formatDist(r.distance)}</span>
                        </div>
                        <span className="flex items-center gap-0.5 text-[11px] text-gray-500">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {r.rating.toFixed(1)}
                          <span className="text-gray-300">({r.totalRatings})</span>
                        </span>
                      </div>
                      {r.slug && (
                        <Link href={`/services/${r.slug}`} onClick={(e) => e.stopPropagation()} className="text-[11px] text-primary font-medium hover:underline mt-1 inline-block">
                          View Details →
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: Map ── */}
        <div className={cn("flex-1 relative", mobileView === "list" && "hidden sm:block")}>
          {!apiKey ? (
            <div className="h-full flex flex-col items-center justify-center bg-gray-100">
              <MapPin className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500 font-medium">Google Maps API key not configured</p>
              <p className="text-xs text-gray-400 mt-1">Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to environment variables</p>
              <p className="text-xs text-gray-400 mt-0.5">For production: add it in your hosting platform (Vercel/Railway/Render)</p>
            </div>
          ) : !mapReady ? (
            <div className="h-full flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                <p className="text-sm text-gray-500">Loading map...</p>
              </div>
            </div>
          ) : (
            <div ref={mapRef} className="w-full h-full" style={{ minHeight: "400px" }} />
          )}

          {/* Current location FAB on map */}
          {mapReady && (
            <button
              onClick={useMyLocation}
              className="absolute bottom-24 right-3 z-10 h-10 w-10 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
              title="Use my current location"
            >
              <Navigation className="h-4 w-4 text-gray-600" />
            </button>
          )}

          {/* Confirm Location button — save to search context and go back to home */}
          {mapReady && lat !== null && lng !== null && locationName && (
            <button
              onClick={() => {
                updateSearch({
                  location: locationName.split(",")[0],
                  locationLat: lat,
                  locationLng: lng,
                });
                router.push("/home");
              }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-full shadow-xl hover:bg-primary/90 transition-all font-medium text-sm"
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirm Location
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}

export default function MapSearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <MapSearchInner />
    </Suspense>
  );
}
