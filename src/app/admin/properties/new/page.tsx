"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Building2, ChevronLeft, ChevronRight, Upload, MapPin, Wifi, Wind,
  Utensils, Shirt, ShieldCheck, Users, Check, Loader2, Plus, X,
  ArrowUp, ArrowDown, ImageIcon, Star as StarIcon, LocateFixed,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { GoogleMap } from "@/components/google-map";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SERVICE_TYPES, type ServiceTypeValue } from "@/lib/utils";

const STEPS = [
  { id: 1, title: "Basic Info", desc: "Name, type, and description" },
  { id: 2, title: "Pricing", desc: "Set your rates" },
  { id: 3, title: "Location", desc: "Where is it?" },
  { id: 4, title: "Amenities", desc: "Features and facilities" },
  { id: 5, title: "Rules & Policy", desc: "Rules and cancellation" },
  { id: 6, title: "Photos", desc: "Add property images" },
];

interface ImageEntry { url: string; isWideShot: boolean; previewError: boolean }

export default function NewPropertyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [form, setForm] = useState({
    name: "", serviceType: "HOSTEL" as ServiceTypeValue, description: "",
    price: "", gstRate: "18",
    address: "", city: "", state: "", pincode: "",
    latitude: "", longitude: "", nearbyLandmark: "",
    distanceMarket: "", distanceInstitute: "",
    isAC: false, hasWifi: false, forGender: "",
    occupancy: "", foodIncluded: false, laundryIncluded: false,
    foodRating: "", hasMedical: false,
    nearbyMess: "", nearbyLaundry: "",
    rules: "", cancellationPolicy: "", closingTime: "",
    capacity: "", availableRooms: "",
  });

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const val = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((p) => ({ ...p, [field]: val }));
  };

  /* ─── Image helpers ─── */
  const addImage = () => setImages((prev) => [...prev, { url: "", isWideShot: false, previewError: false }]);
  const removeImage = (idx: number) => setImages((prev) => prev.filter((_, i) => i !== idx));
  const updateImageUrl = (idx: number, url: string) =>
    setImages((prev) => prev.map((img, i) => i === idx ? { ...img, url, previewError: false } : img));
  const toggleWideShot = (idx: number) =>
    setImages((prev) => prev.map((img, i) => i === idx ? { ...img, isWideShot: !img.isWideShot } : img));
  const moveImage = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= images.length) return;
    setImages((prev) => {
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };
  const setPreviewError = (idx: number) =>
    setImages((prev) => prev.map((img, i) => i === idx ? { ...img, previewError: true } : img));

  const handleSubmit = async () => {
    if (!form.name || !form.description || !form.price || !form.address || !form.city || !form.state || !form.pincode) {
      toast.error("Please fill all required fields"); return;
    }
    setSubmitting(true);
    try {
      const body: any = {
        name: form.name, serviceType: form.serviceType, description: form.description,
        price: parseFloat(form.price), gstRate: parseFloat(form.gstRate) || 18,
        address: form.address, city: form.city, state: form.state, pincode: form.pincode,
        isAC: form.isAC, hasWifi: form.hasWifi, foodIncluded: form.foodIncluded,
        laundryIncluded: form.laundryIncluded, hasMedical: form.hasMedical,
        rules: form.rules || null, cancellationPolicy: form.cancellationPolicy || null,
      };
      if (form.latitude) body.latitude = parseFloat(form.latitude);
      if (form.longitude) body.longitude = parseFloat(form.longitude);
      if (form.nearbyLandmark) body.nearbyLandmark = form.nearbyLandmark;
      if (form.distanceMarket) body.distanceMarket = form.distanceMarket;
      if (form.distanceInstitute) body.distanceInstitute = form.distanceInstitute;
      if (form.forGender) body.forGender = form.forGender;
      if (form.occupancy) body.occupancy = parseInt(form.occupancy);
      if (form.foodRating) body.foodRating = parseFloat(form.foodRating);
      if (form.nearbyMess) body.nearbyMess = form.nearbyMess;
      if (form.nearbyLaundry) body.nearbyLaundry = form.nearbyLaundry;
      if (form.capacity) body.capacity = parseInt(form.capacity);
      if (form.availableRooms) body.availableRooms = parseInt(form.availableRooms);
      if (form.closingTime) body.closingTime = form.closingTime;

      const validImages = images.filter((img) => img.url.trim());
      if (validImages.length > 0) body.images = validImages.map((img) => ({ url: img.url.trim(), isWideShot: img.isWideShot }));

      const res = await fetch("/api/properties", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) { toast.success("Property listed successfully!"); router.push("/admin/dashboard"); }
      else toast.error(data.error || "Failed to create property");
    } catch { toast.error("Failed to create property"); }
    finally { setSubmitting(false); }
  };

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const totalSteps = STEPS.length;
  const currentStep = STEPS[step - 1];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar variant="minimal-admin" showNavLinks={false} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/admin/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-4"><ChevronLeft className="h-4 w-4" /> Back to Dashboard</Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">List New Property</h1>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {STEPS.map((s) => (
            <button key={s.id} onClick={() => setStep(s.id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${step === s.id ? "bg-primary text-white" : step > s.id ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {step > s.id ? <Check className="h-4 w-4" /> : <span className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center text-xs">{s.id}</span>}
              {s.title}
            </button>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle>{currentStep.title}</CardTitle><CardDescription>{currentStep.desc}</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {step === 1 && (<>
              <div><Label>Property Name *</Label><Input placeholder="Sunrise Boys Hostel" value={form.name} onChange={update("name")} /></div>
              <div><Label>Service Type *</Label>
                <select value={form.serviceType} onChange={update("serviceType")} className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm">
                  {SERVICE_TYPES.map((st) => <option key={st.value} value={st.value}>{st.label}</option>)}
                </select>
              </div>
              <div><Label>Description *</Label><Textarea placeholder="Describe your property, facilities, and what makes it special..." rows={5} value={form.description} onChange={update("description")} /></div>
            </>)}

            {step === 2 && (<>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Monthly Price (₹) *</Label><Input type="number" placeholder="5000" value={form.price} onChange={update("price")} /></div>
                <div><Label>GST Rate (%)</Label><Input type="number" placeholder="18" value={form.gstRate} onChange={update("gstRate")} /></div>
              </div>
              <div><Label>Gender Preference</Label>
                <select value={form.forGender} onChange={update("forGender")} className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm">
                  <option value="">Any / Co-ed</option><option value="MALE">Boys Only</option><option value="FEMALE">Girls Only</option>
                </select>
              </div>
              <div><Label>Occupancy (sharing)</Label><Input type="number" placeholder="2" value={form.occupancy} onChange={update("occupancy")} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Total Capacity (rooms/seats)</Label><Input type="number" placeholder="50" value={form.capacity} onChange={update("capacity")} /></div>
                <div><Label>Available Rooms/Seats</Label><Input type="number" placeholder="10" value={form.availableRooms} onChange={update("availableRooms")} /></div>
              </div>
            </>)}

            {step === 3 && (<>
              <div><Label>Address *</Label><Input placeholder="123, Main Road" value={form.address} onChange={update("address")} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>City *</Label><Input placeholder="Bhubaneswar" value={form.city} onChange={update("city")} /></div>
                <div><Label>State *</Label><Input placeholder="Odisha" value={form.state} onChange={update("state")} /></div>
                <div><Label>Pincode *</Label><Input placeholder="751024" value={form.pincode} onChange={update("pincode")} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Latitude</Label><Input type="number" step="any" placeholder="20.2961" value={form.latitude} onChange={update("latitude")} /></div>
                <div><Label>Longitude</Label><Input type="number" step="any" placeholder="85.8245" value={form.longitude} onChange={update("longitude")} /></div>
              </div>
              <Button type="button" variant="outline" size="sm" disabled={geocoding || (!form.address && !form.city)} onClick={() => {
                const addr = [form.address, form.city, form.state, form.pincode].filter(Boolean).join(", ");
                if (!addr) { toast.error("Enter an address first"); return; }
                setGeocoding(true);
                const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
                if (!apiKey || !(window as any).google?.maps) {
                  // Fallback: load script then geocode
                  const script = document.createElement("script");
                  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
                  script.onload = () => doGeocode(addr);
                  script.onerror = () => { toast.error("Failed to load Google Maps"); setGeocoding(false); };
                  document.head.appendChild(script);
                } else { doGeocode(addr); }
                function doGeocode(address: string) {
                  const g = (window as any).google;
                  new g.maps.Geocoder().geocode({ address }, (results: any, status: string) => {
                    setGeocoding(false);
                    if (status === "OK" && results?.[0]?.geometry?.location) {
                      const loc = results[0].geometry.location;
                      setForm((p) => ({ ...p, latitude: loc.lat().toFixed(6), longitude: loc.lng().toFixed(6) }));
                      toast.success("Coordinates detected from address!");
                    } else { toast.error("Could not geocode this address. Try pinning on the map instead."); }
                  });
                }
              }}>
                {geocoding ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <LocateFixed className="h-3.5 w-3.5 mr-1" />}
                Auto-detect coordinates from address
              </Button>
              <div>
                <Label className="mb-2 block">Pin Location on Map <span className="text-xs text-gray-400">(click to set coordinates)</span></Label>
                <GoogleMap
                  latitude={form.latitude ? parseFloat(form.latitude) : null}
                  longitude={form.longitude ? parseFloat(form.longitude) : null}
                  address={form.address ? `${form.address}, ${form.city}` : undefined}
                  height="250px"
                  interactive
                  onLocationSelect={(lat, lng) => setForm((p) => ({ ...p, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }))}
                />
              </div>
              <div><Label>Nearby Landmark</Label><Input placeholder="Near KIIT University" value={form.nearbyLandmark} onChange={update("nearbyLandmark")} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Distance to Market</Label><Input placeholder="500m" value={form.distanceMarket} onChange={update("distanceMarket")} /></div>
                <div><Label>Distance to Institutes</Label><Input placeholder="1 km" value={form.distanceInstitute} onChange={update("distanceInstitute")} /></div>
              </div>
            </>)}

            {step === 4 && (<>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { field: "isAC", label: "Air Conditioned", icon: Wind, color: "blue" },
                  { field: "hasWifi", label: "Free WiFi", icon: Wifi, color: "indigo" },
                  { field: "foodIncluded", label: "Food Included", icon: Utensils, color: "orange" },
                  { field: "laundryIncluded", label: "Laundry Included", icon: Shirt, color: "teal" },
                  { field: "hasMedical", label: "Medical Facility", icon: ShieldCheck, color: "red" },
                ].map((amenity) => (
                  <label key={amenity.field} className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${(form as any)[amenity.field] ? `bg-${amenity.color}-50 border-${amenity.color}-200` : "bg-white border-gray-200 hover:border-gray-300"}`}>
                    <input type="checkbox" checked={(form as any)[amenity.field]} onChange={update(amenity.field)} className="rounded border-gray-300" />
                    <amenity.icon className="h-5 w-5 text-gray-600" /><span className="text-sm font-medium">{amenity.label}</span>
                  </label>
                ))}
              </div>
              {form.foodIncluded && <div><Label>Food Rating (1-5)</Label><Input type="number" min="1" max="5" placeholder="4" value={form.foodRating} onChange={update("foodRating")} /></div>}
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Nearby Mess</Label><Input placeholder="Swaad Mess, 200m" value={form.nearbyMess} onChange={update("nearbyMess")} /></div>
                <div><Label>Nearby Laundry</Label><Input placeholder="QuickWash, 100m" value={form.nearbyLaundry} onChange={update("nearbyLaundry")} /></div>
              </div>
            </>)}

            {step === 5 && (<>
              <div><Label>Rules & Regulations</Label><Textarea placeholder="1. No smoking inside premises&#10;2. Gate closes at 10 PM&#10;3. Visitors only in common area" rows={5} value={form.rules} onChange={update("rules")} /></div>
              <div><Label>Cancellation Policy</Label><Textarea placeholder="Full refund if cancelled 7 days before check-in. 50% refund within 3 days." rows={3} value={form.cancellationPolicy} onChange={update("cancellationPolicy")} /></div>
              <div><Label>Closing Time</Label><Input type="time" placeholder="22:00" value={form.closingTime} onChange={update("closingTime")} /><p className="text-xs text-gray-400 mt-1">Gate closing time (e.g. 10:00 PM)</p></div>
            </>)}

            {/* ── Step 6: Photos ── */}
            {step === 6 && (<>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Add image URLs for your property. The first image will be the cover photo.</p>
                  <p className="text-xs text-gray-400 mt-1">Supported: Direct image URLs (jpg, png, webp). Recommended: at least 3 photos.</p>
                </div>
                <Badge variant="secondary" className="shrink-0">{images.filter((i) => i.url.trim()).length} / {images.length}</Badge>
              </div>

              {/* Image list */}
              <div className="space-y-4">
                {images.map((img, idx) => (
                  <div key={idx} className="flex gap-3 p-3 border border-gray-200 rounded-xl bg-white">
                    {/* Preview */}
                    <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 relative">
                      {img.url.trim() && !img.previewError ? (
                        <img
                          src={img.url}
                          alt={`Photo ${idx + 1}`}
                          className="w-full h-full object-cover"
                          onError={() => setPreviewError(idx)}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                          <ImageIcon className="h-8 w-8" />
                          <span className="text-[10px] mt-0.5">{img.previewError ? "Invalid URL" : "Preview"}</span>
                        </div>
                      )}
                      {idx === 0 && img.url.trim() && (
                        <span className="absolute top-1 left-1 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded">COVER</span>
                      )}
                    </div>

                    {/* URL + controls */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <Input
                          placeholder="https://images.unsplash.com/photo-..."
                          value={img.url}
                          onChange={(e) => updateImageUrl(idx, e.target.value)}
                          className="text-sm"
                        />
                        <div className="flex items-center gap-3 mt-2">
                          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                            <input type="checkbox" checked={img.isWideShot} onChange={() => toggleWideShot(idx)} className="rounded border-gray-300 h-3 w-3" />
                            Wide shot
                          </label>
                          <span className="text-xs text-gray-400">Photo {idx + 1}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => moveImage(idx, -1)} disabled={idx === 0}>
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => moveImage(idx, 1)} disabled={idx === images.length - 1}>
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 ml-auto" onClick={() => removeImage(idx)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add button */}
              <Button variant="outline" onClick={addImage} className="w-full border-dashed border-2" disabled={images.length >= 10}>
                <Plus className="h-4 w-4 mr-2" />Add Image {images.length >= 10 && "(Max 10)"}
              </Button>

              {images.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                  <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No images added yet</p>
                  <p className="text-xs text-gray-400 mt-1">Click &quot;Add Image&quot; to add photo URLs</p>
                  <Button variant="outline" size="sm" onClick={addImage} className="mt-4">
                    <Plus className="h-3 w-3 mr-1" />Add First Image
                  </Button>
                </div>
              )}
            </>)}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}><ChevronLeft className="h-4 w-4 mr-1" /> Previous</Button>
              {step < totalSteps
                ? <Button onClick={() => setStep((s) => Math.min(totalSteps, s + 1))}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
                : <Button onClick={handleSubmit} disabled={submitting}>{submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Publishing...</> : <><Check className="h-4 w-4 mr-1" />Publish Property</>}</Button>
              }
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
