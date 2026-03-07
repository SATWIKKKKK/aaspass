"use client";

import { useState, useRef, useCallback, useEffect, DragEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Building2, ChevronLeft, ChevronRight, Upload, MapPin, Wifi, Wind,
  Utensils, Shirt, ShieldCheck, Users, Check, Loader2, Plus, X,
  ArrowUp, ArrowDown, ImageIcon, Star as StarIcon, LocateFixed,
  DollarSign, Film, Save, Gift,
} from "lucide-react";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
const GoogleMap = dynamic(
  () => import("@/components/google-map").then((m) => ({ default: m.GoogleMap })),
  { ssr: false, loading: () => <div className="h-48 bg-gray-100 rounded-xl animate-pulse" /> }
);
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SERVICE_TYPES, type ServiceTypeValue } from "@/lib/utils";
import { uploadFile } from "@/lib/upload";

const STEPS = [
  { id: 1, title: "Basic Info", desc: "Name, type, and description" },
  { id: 2, title: "Pricing", desc: "Set your rates and plans" },
  { id: 3, title: "Location", desc: "Where is it?" },
  { id: 4, title: "Amenities", desc: "Features and facilities" },
  { id: 5, title: "Rules & Policy", desc: "Rules and cancellation" },
  { id: 6, title: "Photos & Videos", desc: "Add service media" },
];

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 15;

const PUBLISHING_CHARGES: Record<string, { label: string; price: number }> = {
  HOSTEL:    { label: "Hostel / PG / Accommodation", price: 399 },
  PG:        { label: "Hostel / PG / Accommodation", price: 399 },
  LIBRARY:   { label: "Library", price: 199 },
  COACHING:  { label: "Coaching", price: 199 },
  GYM:       { label: "Gym", price: 99 },
  MESS:      { label: "Mess / Tiffin", price: 199 },
  LAUNDRY:   { label: "Laundry", price: 99 },
  COWORKING: { label: "Coworking", price: 199 },
};

interface MediaEntry {
  id: string; url: string; file?: File; type: "image" | "video";
  isWideShot: boolean; previewUrl: string; error: string | null;
  uploading?: boolean;
}

interface PlanEntry { label: string; durationDays: string; price: string; isActive: boolean; }

export default function NewPropertyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [media, setMedia] = useState<MediaEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Publishing flow state
  const [showPublishPopup, setShowPublishPopup] = useState(false);
  const [isFreePublish, setIsFreePublish] = useState(false);
  const [freeDaysLeft, setFreeDaysLeft] = useState(0);
  const [freeExpiryDate, setFreeExpiryDate] = useState("");

  // Check free publishing eligibility on mount
  useEffect(() => {
    fetch("/api/payment/free-premium")
      .then((r) => r.json())
      .then((d) => {
        if (d.isWithinFreeQuota) {
          setIsFreePublish(true);
          setFreeDaysLeft(d.daysRemaining);
          setFreeExpiryDate(d.freeQuotaExpiryDate || "");
        }
      })
      .catch(() => {});
  }, []);
  const dragCounter = useRef(0);
  const [pricingPlans, setPricingPlans] = useState<PlanEntry[]>([]);
  const [customAmenities, setCustomAmenities] = useState<string[]>([]);
  const [newAmenity, setNewAmenity] = useState("");
  const [form, setForm] = useState({
    name: "", serviceType: "HOSTEL" as ServiceTypeValue, description: "",
    price: "", gstRate: "18",
    address: "", city: "", state: "", pincode: "",
    latitude: "", longitude: "", nearbyLandmark: "",
    distanceMarket: "", distanceInstitute: "",
    isAC: false, hasWifi: false, forGender: "",
    occupancy: "", foodIncluded: false, laundryIncluded: false,
    hasMedical: false,
    nearbyMess: "", nearbyLaundry: "",
    rules: "", cancellationPolicy: "", closingTime: "",
    capacity: "", availableRooms: "",
  });

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const val = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((p) => ({ ...p, [field]: val }));
  };

  /* ─── Pricing Plans ─── */
  const addPlan = () => setPricingPlans((p) => [...p, { label: "", durationDays: "30", price: "", isActive: true }]);
  const removePlan = (idx: number) => setPricingPlans((p) => p.filter((_, i) => i !== idx));
  const updatePlan = (idx: number, field: keyof PlanEntry, value: string | boolean) =>
    setPricingPlans((p) => p.map((plan, i) => i === idx ? { ...plan, [field]: value } : plan));

  /* ─── Media / Drag-Drop ─── */
  const genId = () => Math.random().toString(36).substring(2, 9);

  const processFiles = useCallback((files: FileList | File[]) => {
    const fileArr = Array.from(files);
    const room = MAX_FILES - media.length;
    if (room <= 0) { toast.error(`Maximum ${MAX_FILES} files allowed`); return; }
    if (fileArr.length > room) toast.error(`Only adding first ${room} files (limit ${MAX_FILES})`);

    const newMedia: MediaEntry[] = [];
    for (const file of fileArr.slice(0, room)) {
      const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);
      const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type);
      if (!isImage && !isVideo) { toast.error(`"${file.name}" — unsupported format`); continue; }
      if (file.size > MAX_FILE_SIZE) { toast.error(`"${file.name}" exceeds 10 MB`); continue; }
      newMedia.push({
        id: genId(), url: "", file, type: isImage ? "image" : "video",
        isWideShot: newMedia.length === 0 && media.length === 0,
        previewUrl: URL.createObjectURL(file), error: null, uploading: true,
      });
    }
    if (!newMedia.length) return;
    setMedia((prev) => [...prev, ...newMedia]);
    // Upload each file to Cloudinary immediately
    for (const entry of newMedia) {
      if (!entry.file) continue;
      uploadFile(entry.file)
        .then((url) => {
          setMedia((prev) => prev.map((m) => m.id === entry.id ? { ...m, url, previewUrl: url, uploading: false } : m));
        })
        .catch((err: Error) => {
          setMedia((prev) => prev.map((m) => m.id === entry.id ? { ...m, uploading: false, error: err.message } : m));
          toast.error(`Upload failed for "${entry.file!.name}": ${err.message}`);
        });
    }
  }, [media.length]);

  const handleDragEnter = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounter.current++; setIsDragging(true); };
  const handleDragLeave = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); dragCounter.current--; if (dragCounter.current === 0) setIsDragging(false); };
  const handleDragOver = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); dragCounter.current = 0; if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files); };

  const removeMedia = (id: string) => setMedia((prev) => { const item = prev.find((m) => m.id === id); if (item?.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl); return prev.filter((m) => m.id !== id); });
  const moveMedia = (idx: number, dir: -1 | 1) => { const n = idx + dir; if (n < 0 || n >= media.length) return; setMedia((prev) => { const a = [...prev]; [a[idx], a[n]] = [a[n], a[idx]]; return a; }); };
  const toggleWideShot = (id: string) => setMedia((prev) => prev.map((m) => m.id === id ? { ...m, isWideShot: !m.isWideShot } : m));
  const addUrlImage = () => { if (media.length >= MAX_FILES) { toast.error(`Maximum ${MAX_FILES} files`); return; } setMedia((prev) => [...prev, { id: genId(), url: "", type: "image", isWideShot: prev.length === 0, previewUrl: "", error: null }]); };
  const updateMediaUrl = (id: string, url: string) => setMedia((prev) => prev.map((m) => m.id === id ? { ...m, url, previewUrl: url, error: null } : m));

  /* ─── Geocoding (REST API — no JS SDK race condition) ─── */
  const doGeocode = () => {
    const addr = [form.address, form.city, form.state, form.pincode].filter(Boolean).join(", ");
    if (!addr) { toast.error("Enter an address first"); return; }
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) { toast.error("Google Maps API key not configured"); return; }
    setGeocoding(true);
    fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addr)}&key=${apiKey}`)
      .then((r) => r.json())
      .then((data) => {
        setGeocoding(false);
        if (data.status === "OK" && data.results?.[0]?.geometry?.location) {
          const loc = data.results[0].geometry.location;
          setForm((p) => ({ ...p, latitude: loc.lat.toFixed(6), longitude: loc.lng.toFixed(6) }));
          toast.success("Coordinates detected from address!");
        } else { toast.error(data.status === "REQUEST_DENIED"
          ? "Geocoding API denied — check API key billing"
          : "Could not geocode. Try pinning on map."); }
      })
      .catch(() => { setGeocoding(false); toast.error("Network error during geocoding"); });
  };

  const handleSubmit = async (asDraft = false) => {
    if (!form.name || !form.description || !form.price || !form.address || !form.city || !form.state || !form.pincode) {
      toast.error("Please fill all required fields"); return;
    }
    if (media.some((m) => m.uploading)) {
      toast.error("Please wait — photos are still uploading"); return;
    }
    if (media.some((m) => m.error && !m.url)) {
      toast.error("Some photos failed to upload. Remove them or retry."); return;
    }
    const validPlans = pricingPlans.filter((p) => p.label && p.durationDays && p.price);
    if (pricingPlans.length > 0 && validPlans.length === 0) {
      toast.error("Fill all pricing plan fields or remove empty plans"); return;
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
        saveAsDraft: asDraft,
      };
      if (form.latitude) body.latitude = parseFloat(form.latitude);
      if (form.longitude) body.longitude = parseFloat(form.longitude);
      if (form.nearbyLandmark) body.nearbyLandmark = form.nearbyLandmark;
      if (form.distanceMarket) body.distanceMarket = form.distanceMarket;
      if (form.distanceInstitute) body.distanceInstitute = form.distanceInstitute;
      if (form.forGender) body.forGender = form.forGender;
      if (form.occupancy) body.occupancy = parseInt(form.occupancy);

      if (form.nearbyMess) body.nearbyMess = form.nearbyMess;
      if (form.nearbyLaundry) body.nearbyLaundry = form.nearbyLaundry;
      if (form.capacity) body.capacity = parseInt(form.capacity);
      if (form.availableRooms) body.availableRooms = parseInt(form.availableRooms);
      if (form.closingTime) body.closingTime = form.closingTime;
      if (customAmenities.length > 0) body.customAmenities = customAmenities;

      const validMedia = media.filter((m) => m.url?.trim() && !m.url.startsWith("blob:"));
      if (validMedia.length > 0) body.images = validMedia.filter((m) => m.type === "image").map((m) => ({ url: m.url!.trim(), isWideShot: m.isWideShot }));
      if (validPlans.length > 0) body.pricingPlans = validPlans.map((p) => ({ label: p.label, durationDays: p.durationDays, price: p.price, isActive: p.isActive }));

      const res = await fetch("/api/properties", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) {
        if (asDraft) {
          toast.success("Service saved as draft!");
        } else {
          toast.success("Service published successfully!");
        }
        router.push("/admin/dashboard");
      }
      else toast.error(data.error || "Failed to create service");
    } catch { toast.error("Failed to create service"); }
    finally { setSubmitting(false); setShowPublishPopup(false); }
  };

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const totalSteps = STEPS.length;
  const currentStep = STEPS[step - 1];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar variant="minimal-admin" showNavLinks={false} showSearch={false} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/admin/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-4"><ChevronLeft className="h-4 w-4" /> Back to Dashboard</Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">List New Service</h1>

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
              <div><Label>Service Name *</Label><Input placeholder="Sunrise Boys Hostel" value={form.name} onChange={update("name")} /></div>
              <div><Label>Service Type *</Label>
                <select value={form.serviceType} onChange={update("serviceType")} className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm">
                  {SERVICE_TYPES.map((st) => <option key={st.value} value={st.value}>{st.label}</option>)}
                </select>
              </div>
              <div><Label>Description *</Label><Textarea placeholder="Describe your service, facilities, and what makes it special..." rows={5} value={form.description} onChange={update("description")} /></div>
            </>)}

            {step === 2 && (<>
              <div className="grid grid-cols-2 gap-4">
                <div><Label> Price (₹) *</Label><Input type="number" placeholder="5000" value={form.price} onChange={update("price")} /></div>
                <div><Label>GST Rate (%)</Label><Input type="number" placeholder="18" value={form.gstRate} onChange={update("gstRate")} /></div>
              </div>
              <div><Label>Gender Preference</Label>
                <select value={form.forGender} onChange={update("forGender")} className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm">
                  <option value="">Any / Co-ed</option><option value="MALE">Boys Only</option><option value="FEMALE">Girls Only</option>
                </select>
              </div>
              <div><Label>Occupancy (sharing)</Label><Input type="number" placeholder="2" value={form.occupancy} onChange={update("occupancy")} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Total Capacity</Label><Input type="number" placeholder="50" value={form.capacity} onChange={update("capacity")} /></div>
                <div><Label>Available Seats</Label><Input type="number" placeholder="10" value={form.availableRooms} onChange={update("availableRooms")} /></div>
              </div>

              {/* ── Duration-Based Pricing Plans ── */}
              <div className="border-t border-gray-200 pt-6 mt-6">
                <div className="flex items-center gap-2 mb-1"><DollarSign className="h-5 w-5 text-primary" /><h3 className="text-lg font-semibold text-gray-900">Duration-Based Pricing Plans</h3></div>
                <p className="text-sm text-gray-500 mb-4">Define strict booking plans. Students will only be able to book for these exact durations.</p>
                {pricingPlans.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
                    <DollarSign className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No pricing plans yet.</p>
                    <p className="text-xs text-gray-400 mt-1">Add plans like Monthly, Quarterly, or Yearly.</p>
                    <Button variant="outline" size="sm" onClick={addPlan} className="mt-3"><Plus className="h-3 w-3 mr-1" />Add First Plan</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pricingPlans.map((plan, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row gap-3 p-4 border border-gray-200 rounded-xl bg-white">
                        <div className="flex-1"><Label className="text-xs">Plan Name *</Label><Input placeholder="e.g. Monthly" value={plan.label} onChange={(e) => updatePlan(idx, "label", e.target.value)} /></div>
                        <div className="w-full sm:w-32"><Label className="text-xs">Duration (days) *</Label><Input type="number" placeholder="30" value={plan.durationDays} onChange={(e) => updatePlan(idx, "durationDays", e.target.value)} /></div>
                        <div className="w-full sm:w-36"><Label className="text-xs">Price (₹) *</Label><Input type="number" placeholder="3000" value={plan.price} onChange={(e) => updatePlan(idx, "price", e.target.value)} /></div>
                        <div className="flex items-end"><Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => removePlan(idx)}><X className="h-4 w-4" /></Button></div>
                      </div>
                    ))}
                    <Button variant="outline" onClick={addPlan} className="w-full border-dashed"><Plus className="h-4 w-4 mr-2" />Add Another Plan</Button>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800"><strong>Important:</strong> Students can ONLY book for these exact durations.</div>
                  </div>
                )}
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

              {/* Custom Amenities */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <Label className="mb-2 block text-sm font-semibold">Custom Amenities</Label>
                <p className="text-xs text-gray-400 mb-3">Add any additional amenities not listed above.</p>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="e.g. Swimming Pool, Parking, CCTV..."
                    value={newAmenity}
                    onChange={(e) => setNewAmenity(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = newAmenity.trim();
                        if (val && !customAmenities.includes(val)) {
                          setCustomAmenities((prev) => [...prev, val]);
                          setNewAmenity("");
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const val = newAmenity.trim();
                      if (val && !customAmenities.includes(val)) {
                        setCustomAmenities((prev) => [...prev, val]);
                        setNewAmenity("");
                      }
                    }}
                    disabled={!newAmenity.trim()}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                {customAmenities.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {customAmenities.map((amenity, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium">
                        <Check className="h-3.5 w-3.5" />
                        {amenity}
                        <button
                          type="button"
                          onClick={() => setCustomAmenities((prev) => prev.filter((_, i) => i !== idx))}
                          className="ml-0.5 hover:text-red-500 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>


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

            {/* ── Step 6: Photos & Videos with Drag-Drop ── */}
            {step === 6 && (<>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Add photos and videos for your service. First image = cover photo.</p>
                  <p className="text-xs text-gray-400 mt-1">Supported: JPG, PNG, WEBP, MP4, MOV. Max 10 MB per file, up to {MAX_FILES} files.</p>
                </div>
                <Badge variant="secondary" className="shrink-0">{media.filter((m) => m.previewUrl || m.url?.trim()).length} / {MAX_FILES}</Badge>
              </div>

              {/* Drag-Drop Zone */}
              <div
                onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-gray-300 hover:border-primary/50 hover:bg-gray-50"}`}
              >
                <input ref={fileInputRef} type="file" multiple accept={[...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES].join(",")} className="hidden" onChange={(e) => { if (e.target.files) processFiles(e.target.files); e.target.value = ""; }} />
                <div className="flex flex-col items-center gap-2">
                  <div className={`h-14 w-14 rounded-full flex items-center justify-center transition-colors ${isDragging ? "bg-primary/10" : "bg-gray-100"}`}>
                    <Upload className={`h-7 w-7 ${isDragging ? "text-primary" : "text-gray-400"}`} />
                  </div>
                  <p className="font-medium text-gray-700">{isDragging ? "Drop files here!" : "Drag & drop photos/videos here"}</p>
                  <p className="text-xs text-gray-400">or click to browse files</p>
                </div>
              </div>

              <div className="flex items-center gap-2"><div className="flex-1 h-px bg-gray-200" /><span className="text-xs text-gray-400">or</span><div className="flex-1 h-px bg-gray-200" /></div>
              <Button variant="outline" onClick={addUrlImage} className="w-full" disabled={media.length >= MAX_FILES}><Plus className="h-4 w-4 mr-2" />Add Image by URL</Button>

              {/* Media List */}
              {media.length > 0 && (
                <div className="space-y-3">
                  {media.map((item, idx) => (
                    <div key={item.id} className="flex gap-3 p-3 border border-gray-200 rounded-xl bg-white">
                      <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 relative">
                        {item.type === "video" ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900/80"><Film className="h-8 w-8 text-white/70" /><span className="text-[9px] text-white/50 mt-0.5">Video</span></div>
                        ) : item.previewUrl ? (
                          <img src={item.previewUrl} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" onError={() => setMedia((prev) => prev.map((m) => m.id === item.id ? { ...m, error: "Invalid URL" } : m))} />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300"><ImageIcon className="h-8 w-8" /><span className="text-[10px] mt-0.5">{item.error || "Preview"}</span></div>
                        )}
                        {item.uploading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                            <Loader2 className="h-6 w-6 text-white animate-spin" />
                          </div>
                        )}
                        {item.error && !item.uploading && !item.url && (
                          <div className="absolute inset-0 bg-red-900/70 flex items-center justify-center rounded-lg">
                            <span className="text-[9px] text-white font-bold text-center px-1">Upload failed</span>
                          </div>
                        )}
                        {!item.uploading && item.url && idx === 0 && <span className="absolute top-1 left-1 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded">COVER</span>}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          {item.file ? (
                            <div>
                              <p className="text-sm font-medium text-gray-900 truncate">{item.file.name}</p>
                              <p className="text-xs mt-0.5">
                                {item.uploading ? (
                                  <span className="text-blue-500 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Uploading…</span>
                                ) : item.error && !item.url ? (
                                  <span className="text-red-500">Upload failed — remove and retry</span>
                                ) : item.url ? (
                                  <span className="text-green-600">✓ Uploaded</span>
                                ) : (
                                  <span className="text-gray-400">{(item.file.size / 1024 / 1024).toFixed(1)} MB &bull; {item.type}</span>
                                )}
                              </p>
                            </div>
                          ) : (
                            <Input placeholder="https://images.unsplash.com/photo-..." value={item.url} onChange={(e) => updateMediaUrl(item.id, e.target.value)} className="text-sm" />
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            {item.type === "image" && <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer"><input type="checkbox" checked={item.isWideShot} onChange={() => toggleWideShot(item.id)} className="rounded border-gray-300 h-3 w-3" />Wide shot</label>}
                            <span className="text-xs text-gray-400">#{idx + 1}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 mt-2">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => moveMedia(idx, -1)} disabled={idx === 0}><ArrowUp className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => moveMedia(idx, 1)} disabled={idx === media.length - 1}><ArrowDown className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 ml-auto" onClick={() => removeMedia(item.id)}><X className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {media.length === 0 && (
                <div className="text-center py-4"><p className="text-xs text-gray-400">No media added yet. Drag files above or add image URLs.</p></div>
              )}
            </>)}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}><ChevronLeft className="h-4 w-4 mr-1" /> Previous</Button>
              {step < totalSteps
                ? <Button onClick={() => setStep((s) => Math.min(totalSteps, s + 1))}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
                : (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleSubmit(true)} disabled={submitting}>
                      {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                      Save as Draft
                    </Button>
                    <Button onClick={() => setShowPublishPopup(true)} disabled={submitting}>
                      <Check className="h-4 w-4 mr-1" /> Publish Service
                    </Button>
                  </div>
                )
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Publishing Charges Popup */}
      {showPublishPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPublishPopup(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <button onClick={() => setShowPublishPopup(false)} className="absolute top-3 right-3 h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
              <X className="h-4 w-4 text-gray-500" />
            </button>

            <div className="text-center mb-5">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-3">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Publish Your Service</h3>
              <p className="text-sm text-gray-500 mt-1">
                {PUBLISHING_CHARGES[form.serviceType]?.label || form.serviceType} — Publishing Fee
              </p>
            </div>

            {/* Price Display */}
            <div className="bg-gray-50 rounded-xl p-4 text-center mb-4">
              {isFreePublish ? (
                <>
                  <p className="text-sm text-gray-400 line-through">
                    ₹{PUBLISHING_CHARGES[form.serviceType]?.price || 199} / 3 months
                  </p>
                  <p className="text-3xl font-bold text-green-600 mt-1">₹0</p>
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <Gift className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-semibold text-green-700">
                      FREE during your launch period — {freeDaysLeft} day{freeDaysLeft !== 1 ? "s" : ""} remaining
                    </span>
                  </div>
                  {freeExpiryDate && (
                    <p className="text-[10px] text-gray-400 mt-1">
                      Free publishing until {new Date(freeExpiryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-gray-900">
                    ₹{PUBLISHING_CHARGES[form.serviceType]?.price || 199}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">per 3 months</p>
                </>
              )}
            </div>

            {/* Info */}
            <div className="space-y-2 mb-5 text-xs text-gray-600">
              <div className="flex items-start gap-2">
                <Check className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                <span>Your service will be visible to all students immediately</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                <span>Students can search, view, and book your service</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                <span>{isFreePublish ? "No payment required during free period" : "Secure payment via Razorpay"}</span>
              </div>
            </div>

            {/* CTA */}
            <Button
              className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              onClick={() => handleSubmit(false)}
              disabled={submitting}
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Publishing...</>
              ) : isFreePublish ? (
                <><Gift className="h-4 w-4 mr-2" /> Publish Free</>
              ) : (
                <><Check className="h-4 w-4 mr-2" /> Pay & Publish — ₹{PUBLISHING_CHARGES[form.serviceType]?.price || 199}</>
              )}
            </Button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
