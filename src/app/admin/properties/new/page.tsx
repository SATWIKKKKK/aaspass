"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Building2, ChevronLeft, ChevronRight, Upload, MapPin, Wifi, Wind,
  Utensils, Shirt, ShieldCheck, Users, Check, Loader2,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { GoogleMap } from "@/components/google-map";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SERVICE_TYPES, type ServiceTypeValue } from "@/lib/utils";

const STEPS = [
  { id: 1, title: "Basic Info", desc: "Name, type, and description" },
  { id: 2, title: "Pricing", desc: "Set your rates" },
  { id: 3, title: "Location", desc: "Where is it?" },
  { id: 4, title: "Amenities", desc: "Features and facilities" },
  { id: 5, title: "Rules & Policy", desc: "Rules and cancellation" },
];

export default function NewPropertyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
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
    rules: "", cancellationPolicy: "",
    imageUrls: "",
  });

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const val = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((p) => ({ ...p, [field]: val }));
  };

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
      if (form.imageUrls.trim()) body.images = form.imageUrls.split("\n").map((u: string) => ({ url: u.trim(), isWideShot: false })).filter((img: any) => img.url);

      const res = await fetch("/api/properties", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) { toast.success("Property listed successfully! 🎉"); router.push("/admin/dashboard"); }
      else toast.error(data.error || "Failed to create property");
    } catch { toast.error("Failed to create property"); }
    finally { setSubmitting(false); }
  };

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar variant="admin" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/admin/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-4"><ChevronLeft className="h-4 w-4" /> Back to Dashboard</Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">List New Property</h1>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {STEPS.map((s) => (
            <button key={s.id} onClick={() => setStep(s.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${step === s.id ? "bg-primary text-white" : step > s.id ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {step > s.id ? <Check className="h-4 w-4" /> : <span className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center text-xs">{s.id}</span>}
              {s.title}
            </button>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle>{STEPS[step - 1].title}</CardTitle><CardDescription>{STEPS[step - 1].desc}</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {step === 1 && (<>
              <div><Label>Property Name *</Label><Input placeholder="Sunrise Boys Hostel" value={form.name} onChange={update("name")} /></div>
              <div><Label>Service Type *</Label>
                <select value={form.serviceType} onChange={update("serviceType")} className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm">
                  {SERVICE_TYPES.map((st) => <option key={st.value} value={st.value}>{st.label}</option>)}
                </select>
              </div>
              <div><Label>Description *</Label><Textarea placeholder="Describe your property, facilities, and what makes it special..." rows={5} value={form.description} onChange={update("description")} /></div>
              <div><Label>Image URLs (one per line)</Label><Textarea placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg" rows={3} value={form.imageUrls} onChange={update("imageUrls")} /></div>
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
              {form.foodIncluded && <div><Label>Food Rating (1-5)</Label><Input type="number" min="1" max="5" placeholder="4" value={form.foodRating} onChange={update("foodRating")} /></div>}
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Nearby Mess</Label><Input placeholder="Swaad Mess, 200m" value={form.nearbyMess} onChange={update("nearbyMess")} /></div>
                <div><Label>Nearby Laundry</Label><Input placeholder="QuickWash, 100m" value={form.nearbyLaundry} onChange={update("nearbyLaundry")} /></div>
              </div>
            </>)}

            {step === 5 && (<>
              <div><Label>Rules & Regulations</Label><Textarea placeholder="1. No smoking inside premises&#10;2. Gate closes at 10 PM&#10;3. Visitors only in common area" rows={5} value={form.rules} onChange={update("rules")} /></div>
              <div><Label>Cancellation Policy</Label><Textarea placeholder="Full refund if cancelled 7 days before check-in. 50% refund within 3 days." rows={3} value={form.cancellationPolicy} onChange={update("cancellationPolicy")} /></div>
            </>)}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}><ChevronLeft className="h-4 w-4 mr-1" /> Previous</Button>
              {step < 5 ? <Button onClick={() => setStep((s) => Math.min(5, s + 1))}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
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
