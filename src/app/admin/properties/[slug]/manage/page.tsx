"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Building2, Users, AlertTriangle, ChevronLeft, ChevronRight,
  Star, Calendar, Megaphone, Loader2, Send, Pencil, BarChart3,
  MapPin, Wifi, Wind, Utensils, Shirt, ShieldCheck, Save,
  X, Plus, ArrowUp, ArrowDown, ImageIcon, TrendingUp,
  DollarSign, CheckCircle, Clock, XCircle,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatPrice, formatDate, SERVICE_TYPES } from "@/lib/utils";

/* ───── Image entry type ───── */
interface ImageEntry { url: string; isWideShot: boolean; previewError: boolean }

export default function ManagePropertyPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const router = useRouter();

  const [property, setProperty] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /* Announcement form */
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

  /* Edit form */
  const [editForm, setEditForm] = useState<any>(null);
  const [editImages, setEditImages] = useState<ImageEntry[]>([]);
  const [saving, setSaving] = useState(false);

  /* Tab from URL */
  const defaultTab = searchParams.get("tab") || "bookings";

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated" || !params.slug) return;
    Promise.all([
      fetch(`/api/properties/${params.slug}`).then((r) => r.json()),
      fetch("/api/bookings").then((r) => r.json()),
      fetch("/api/complaints").then((r) => r.json()),
      fetch("/api/announcements").then((r) => r.json()).catch(() => ({ announcements: [] })),
    ]).then(([propData, bookData, compData, announceData]) => {
      const prop = propData.property; // FIX: API returns { property: {...} }
      setProperty(prop);
      setBookings((bookData.bookings || []).filter((b: any) => b.property?.slug === params.slug));
      setComplaints((compData.complaints || []).filter((c: any) => c.property?.name === prop?.name));
      setAnnouncements(
        (announceData.announcements || []).filter((a: any) => a.propertyId === prop?.id)
      );

      // Initialize edit form from property data
      if (prop) {
        setEditForm({
          name: prop.name || "", serviceType: prop.serviceType || "HOSTEL",
          description: prop.description || "", price: String(prop.price || ""),
          gstRate: String(prop.gstRate || "18"),
          address: prop.address || "", city: prop.city || "", state: prop.state || "", pincode: prop.pincode || "",
          latitude: prop.latitude ? String(prop.latitude) : "",
          longitude: prop.longitude ? String(prop.longitude) : "",
          nearbyLandmark: prop.nearbyLandmark || "",
          distanceMarket: prop.distanceMarket || "", distanceInstitute: prop.distanceInstitute || "",
          isAC: prop.isAC || false, hasWifi: prop.hasWifi || false,
          forGender: prop.forGender || "", occupancy: prop.occupancy ? String(prop.occupancy) : "",
          foodIncluded: prop.foodIncluded || false, laundryIncluded: prop.laundryIncluded || false,
          foodRating: prop.foodRating ? String(prop.foodRating) : "",
          hasMedical: prop.hasMedical || false,
          nearbyMess: prop.nearbyMess || "", nearbyLaundry: prop.nearbyLaundry || "",
          rules: prop.rules || "", cancellationPolicy: prop.cancellationPolicy || "",
        });
        setEditImages(
          (prop.images || []).map((img: any) => ({ url: img.url, isWideShot: img.isWideShot, previewError: false }))
        );
      }
    }).catch(() => toast.error("Failed to load property"))
      .finally(() => setLoading(false));
  }, [status, params.slug]);

  /* ─── Edit form helpers ─── */
  const updateEdit = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const val = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setEditForm((p: any) => ({ ...p, [field]: val }));
  };
  const addEditImage = () => setEditImages((p) => [...p, { url: "", isWideShot: false, previewError: false }]);
  const removeEditImage = (idx: number) => setEditImages((p) => p.filter((_, i) => i !== idx));
  const updateEditImageUrl = (idx: number, url: string) =>
    setEditImages((p) => p.map((img, i) => i === idx ? { ...img, url, previewError: false } : img));
  const moveEditImage = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= editImages.length) return;
    setEditImages((p) => { const a = [...p]; [a[idx], a[newIdx]] = [a[newIdx], a[idx]]; return a; });
  };

  const handleSaveEdit = async () => {
    if (!editForm.name || !editForm.price || !editForm.address || !editForm.city) {
      toast.error("Please fill required fields"); return;
    }
    setSaving(true);
    try {
      const body: any = {
        ...editForm,
        price: parseFloat(editForm.price), gstRate: parseFloat(editForm.gstRate) || 18,
        occupancy: editForm.occupancy ? parseInt(editForm.occupancy) : null,
        latitude: editForm.latitude ? parseFloat(editForm.latitude) : null,
        longitude: editForm.longitude ? parseFloat(editForm.longitude) : null,
        foodRating: editForm.foodRating ? parseFloat(editForm.foodRating) : null,
      };
      const validImages = editImages.filter((img) => img.url.trim());
      body.images = validImages.map((img) => ({ url: img.url.trim(), isWideShot: img.isWideShot }));

      const res = await fetch(`/api/properties/${params.slug}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Property updated!");
        setProperty(data.property);
        // Update slug in URL if changed
        if (data.property.slug !== params.slug) {
          router.replace(`/admin/properties/${data.property.slug}/manage?tab=edit`);
        }
      } else toast.error(data.error || "Failed to update");
    } catch { toast.error("Failed to update"); }
    finally { setSaving(false); }
  };

  /* ─── Announcement ─── */
  const handleSendAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementMessage.trim()) { toast.error("Fill both title and message"); return; }
    setSendingAnnouncement(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: announcementTitle, content: announcementMessage, propertyId: property.id }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Announcement sent! ${data.notifiedCount || 0} student(s) notified`);
        setAnnouncementTitle(""); setAnnouncementMessage("");
        setAnnouncements((prev) => [data.announcement, ...prev].filter(Boolean));
      } else toast.error(data.error || "Failed to send");
    } catch { toast.error("Failed to send"); }
    finally { setSendingAnnouncement(false); }
  };

  /* ─── Analytics computed ─── */
  const analytics = useMemo(() => {
    const revenue = bookings.reduce((s: number, b: any) => s + (b.grandTotal || 0), 0);
    const active = bookings.filter((b: any) => ["ACTIVE", "CONFIRMED"].includes(b.status)).length;
    const completed = bookings.filter((b: any) => b.status === "COMPLETED").length;
    const cancelled = bookings.filter((b: any) => b.status === "CANCELLED").length;
    const pending = bookings.filter((b: any) => b.status === "PENDING").length;

    // Monthly breakdown (last 6 months)
    const now = new Date();
    const monthly = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const mB = bookings.filter((b: any) => { const d = new Date(b.createdAt); return d >= start && d <= end; });
      monthly.push({
        label: start.toLocaleString("en", { month: "short" }),
        bookings: mB.length,
        revenue: mB.reduce((s: number, b: any) => s + (b.grandTotal || 0), 0),
      });
    }
    return { revenue, active, completed, cancelled, pending, monthly };
  }, [bookings]);

  if (status === "loading" || loading)
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!property)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Building2 className="h-16 w-16 text-gray-300" />
        <p className="text-lg font-medium text-gray-500">Property not found</p>
        <Link href="/admin/dashboard"><Button variant="outline"><ChevronLeft className="h-4 w-4 mr-1" />Back to Dashboard</Button></Link>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar variant="admin" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/admin/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-4">
          <ChevronLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
            <p className="text-gray-500 mt-1 flex items-center gap-1"><MapPin className="h-4 w-4" />{property.address}, {property.city}</p>
          </div>
          <Badge
            variant={property.status === "VERIFIED" ? "success" : property.status === "PENDING" ? "secondary" : "destructive"}
            className="text-sm"
          >
            {property.status}
          </Badge>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{bookings.length}</p><p className="text-xs text-gray-500">Total Bookings</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{formatPrice(analytics.revenue)}</p><p className="text-xs text-gray-500">Revenue</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-yellow-600">{property.avgRating?.toFixed(1) || "0.0"}</p><p className="text-xs text-gray-500">Rating ({property.totalReviews || 0} reviews)</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-600">{complaints.filter((c: any) => c.status === "OPEN").length}</p><p className="text-xs text-gray-500">Open Complaints</p></CardContent></Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="edit">Edit Property</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="complaints">Complaints</TabsTrigger>
            <TabsTrigger value="announce">Announcements</TabsTrigger>
          </TabsList>

          {/* ══════ BOOKINGS TAB ══════ */}
          <TabsContent value="bookings" className="space-y-3">
            {bookings.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-gray-500"><Calendar className="h-10 w-10 mx-auto mb-3 text-gray-300" />No bookings yet.</CardContent></Card>
            ) : bookings.map((booking: any) => (
              <Card key={booking.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{booking.student?.name || "Student"}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">#{booking.bookingNo}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatPrice(booking.grandTotal || 0)}</p>
                    <Badge variant={["ACTIVE", "CONFIRMED"].includes(booking.status) ? "success" : booking.status === "CANCELLED" ? "destructive" : "secondary"}>
                      {booking.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ══════ EDIT TAB ══════ */}
          <TabsContent value="edit" className="space-y-6">
            {editForm && (
              <>
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Pencil className="h-5 w-5" />Edit Property Details</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><Label>Property Name *</Label><Input value={editForm.name} onChange={updateEdit("name")} /></div>
                      <div><Label>Service Type</Label>
                        <select value={editForm.serviceType} onChange={updateEdit("serviceType")} className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm">
                          {SERVICE_TYPES.map((st) => <option key={st.value} value={st.value}>{st.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div><Label>Description</Label><Textarea value={editForm.description} onChange={updateEdit("description")} rows={4} /></div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div><Label>Monthly Price (₹) *</Label><Input type="number" value={editForm.price} onChange={updateEdit("price")} /></div>
                      <div><Label>GST Rate (%)</Label><Input type="number" value={editForm.gstRate} onChange={updateEdit("gstRate")} /></div>
                      <div><Label>Gender</Label>
                        <select value={editForm.forGender} onChange={updateEdit("forGender")} className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm">
                          <option value="">Any</option><option value="MALE">Boys</option><option value="FEMALE">Girls</option>
                        </select>
                      </div>
                    </div>
                    <div><Label>Occupancy</Label><Input type="number" value={editForm.occupancy} onChange={updateEdit("occupancy")} /></div>

                    <div className="border-t pt-4">
                      <Label className="text-base font-semibold mb-3 block">Location</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><Label>Address *</Label><Input value={editForm.address} onChange={updateEdit("address")} /></div>
                        <div><Label>City *</Label><Input value={editForm.city} onChange={updateEdit("city")} /></div>
                        <div><Label>State</Label><Input value={editForm.state} onChange={updateEdit("state")} /></div>
                        <div><Label>Pincode</Label><Input value={editForm.pincode} onChange={updateEdit("pincode")} /></div>
                      </div>
                      <div><Label className="mt-3 block">Nearby Landmark</Label><Input value={editForm.nearbyLandmark} onChange={updateEdit("nearbyLandmark")} /></div>
                    </div>

                    <div className="border-t pt-4">
                      <Label className="text-base font-semibold mb-3 block">Amenities</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                          { field: "isAC", label: "Air Conditioned", icon: Wind },
                          { field: "hasWifi", label: "Free WiFi", icon: Wifi },
                          { field: "foodIncluded", label: "Food Included", icon: Utensils },
                          { field: "laundryIncluded", label: "Laundry", icon: Shirt },
                          { field: "hasMedical", label: "Medical", icon: ShieldCheck },
                        ].map((a) => (
                          <label key={a.field} className={cn("flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all text-sm",
                            editForm[a.field] ? "bg-primary/5 border-primary/30" : "bg-white border-gray-200"
                          )}>
                            <input type="checkbox" checked={editForm[a.field]} onChange={updateEdit(a.field)} className="rounded border-gray-300" />
                            <a.icon className="h-4 w-4 text-gray-600" />{a.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <Label className="text-base font-semibold mb-3 block">Rules & Policy</Label>
                      <div><Label>Rules</Label><Textarea value={editForm.rules} onChange={updateEdit("rules")} rows={3} /></div>
                      <div className="mt-3"><Label>Cancellation Policy</Label><Textarea value={editForm.cancellationPolicy} onChange={updateEdit("cancellationPolicy")} rows={2} /></div>
                    </div>
                  </CardContent>
                </Card>

                {/* Edit Images */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5" />Property Photos</CardTitle>
                    <CardDescription>Update your property images. First image is the cover photo.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {editImages.map((img, idx) => (
                      <div key={idx} className="flex gap-3 p-3 border border-gray-200 rounded-xl bg-white">
                        <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 relative">
                          {img.url.trim() && !img.previewError ? (
                            <img src={img.url} alt="" className="w-full h-full object-cover" onError={() => setEditImages((p) => p.map((im, i) => i === idx ? { ...im, previewError: true } : im))} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon className="h-6 w-6" /></div>
                          )}
                          {idx === 0 && <span className="absolute top-0.5 left-0.5 bg-primary text-white text-[8px] font-bold px-1 py-0.5 rounded">COVER</span>}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <Input value={img.url} onChange={(e) => updateEditImageUrl(idx, e.target.value)} placeholder="Image URL" className="text-sm" />
                          <div className="flex items-center gap-1 mt-1">
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => moveEditImage(idx, -1)} disabled={idx === 0}><ArrowUp className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => moveEditImage(idx, 1)} disabled={idx === editImages.length - 1}><ArrowDown className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500 hover:bg-red-50 ml-auto" onClick={() => removeEditImage(idx)}><X className="h-3 w-3" /></Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" onClick={addEditImage} className="w-full border-dashed" disabled={editImages.length >= 10}>
                      <Plus className="h-4 w-4 mr-2" />Add Image
                    </Button>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button onClick={handleSaveEdit} disabled={saving} size="lg">
                    {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save Changes</>}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* ══════ ANALYTICS TAB ══════ */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="bg-linear-to-br from-green-50 to-emerald-50 border-green-100">
                <CardContent className="p-4 text-center">
                  <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-green-700">{formatPrice(analytics.revenue)}</p>
                  <p className="text-xs text-gray-500">Total Revenue</p>
                </CardContent>
              </Card>
              <Card className="bg-linear-to-br from-blue-50 to-indigo-50 border-blue-100">
                <CardContent className="p-4 text-center">
                  <CheckCircle className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-blue-700">{analytics.active}</p>
                  <p className="text-xs text-gray-500">Active Bookings</p>
                </CardContent>
              </Card>
              <Card className="bg-linear-to-br from-yellow-50 to-amber-50 border-yellow-100">
                <CardContent className="p-4 text-center">
                  <Clock className="h-6 w-6 text-yellow-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-yellow-700">{analytics.pending}</p>
                  <p className="text-xs text-gray-500">Pending</p>
                </CardContent>
              </Card>
              <Card className="bg-linear-to-br from-red-50 to-rose-50 border-red-100">
                <CardContent className="p-4 text-center">
                  <XCircle className="h-6 w-6 text-red-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-red-700">{analytics.cancelled}</p>
                  <p className="text-xs text-gray-500">Cancelled</p>
                </CardContent>
              </Card>
            </div>

            {/* Monthly breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Monthly Performance</CardTitle>
                <CardDescription>Bookings and revenue over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.monthly.map((m, idx) => {
                    const maxRev = Math.max(...analytics.monthly.map((x) => x.revenue), 1);
                    const pct = (m.revenue / maxRev) * 100;
                    return (
                      <div key={idx} className="flex items-center gap-4">
                        <span className="text-sm font-medium text-gray-600 w-10">{m.label}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden relative">
                          <div
                            className="h-full bg-linear-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700">
                            {formatPrice(m.revenue)} &middot; {m.bookings} bookings
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {analytics.monthly.every((m) => m.bookings === 0) && (
                  <div className="text-center py-8 text-gray-400">
                    <TrendingUp className="h-10 w-10 mx-auto mb-3" />
                    <p className="text-sm">No booking data yet. Analytics will appear here once you get bookings.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick stats */}
            <Card>
              <CardHeader><CardTitle>Property Overview</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Service Type</span><span className="font-medium capitalize">{property.serviceType?.toLowerCase()}</span></div>
                  <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Monthly Price</span><span className="font-medium">{formatPrice(property.price)}</span></div>
                  <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Avg Rating</span><span className="font-medium flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />{property.avgRating?.toFixed(1) || "0.0"}</span></div>
                  <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Total Reviews</span><span className="font-medium">{property.totalReviews || 0}</span></div>
                  <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Total Bookings</span><span className="font-medium">{bookings.length}</span></div>
                  <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Completed</span><span className="font-medium">{analytics.completed}</span></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════ COMPLAINTS TAB ══════ */}
          <TabsContent value="complaints" className="space-y-3">
            {complaints.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-gray-500"><AlertTriangle className="h-10 w-10 mx-auto mb-3 text-gray-300" />No complaints. Great job!</CardContent></Card>
            ) : complaints.map((complaint: any) => (
              <Card key={complaint.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{complaint.subject}</h3>
                      <p className="text-sm text-gray-600 mt-1">{complaint.description}</p>
                      <p className="text-xs text-gray-400 mt-2">By {complaint.student?.name || "Student"} &bull; {formatDate(complaint.createdAt)}</p>
                    </div>
                    <Badge variant={complaint.status === "OPEN" ? "destructive" : complaint.status === "RESOLVED" ? "success" : "secondary"}>
                      {complaint.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ══════ ANNOUNCEMENTS TAB ══════ */}
          <TabsContent value="announce" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5" />Send Announcement</CardTitle>
                <CardDescription>Notify all students booked at this property</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div><Label>Title</Label><Input placeholder="Water Supply Update" value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} /></div>
                <div><Label>Message</Label><Textarea placeholder="Write your announcement..." rows={4} value={announcementMessage} onChange={(e) => setAnnouncementMessage(e.target.value)} /></div>
                <Button onClick={handleSendAnnouncement} disabled={sendingAnnouncement}>
                  {sendingAnnouncement ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> :
                    <><Send className="h-4 w-4 mr-2" />Send Announcement</>}
                </Button>
              </CardContent>
            </Card>

            {/* Past announcements */}
            {announcements.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Past Announcements</h3>
                <div className="space-y-3">
                  {announcements.map((a: any) => (
                    <Card key={a.id}>
                      <CardContent className="p-4">
                        <h4 className="font-medium text-gray-900">{a.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{a.content}</p>
                        <p className="text-xs text-gray-400 mt-2">{formatDate(a.createdAt)}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
