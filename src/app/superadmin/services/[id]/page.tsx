"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Save, Star, MapPin, Eye, CalendarCheck,
  Heart, ShoppingCart, Users, Loader2, Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatPrice, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

export default function SuperAdminServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [statusChange, setStatusChange] = useState("");
  const [statusReason, setStatusReason] = useState("");

  useEffect(() => {
    fetch(`/api/superadmin/services/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setService(d.service);
        setStatusChange(d.service?.status || "");
      })
      .catch(() => toast.error("Failed to load service"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = { ...editData };
      if (statusChange !== service.status) {
        payload.status = statusChange;
        if (statusChange === "SUSPENDED") payload.reason = statusReason;
      }
      const res = await fetch(`/api/superadmin/services/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Service updated");
      const r = await fetch(`/api/superadmin/services/${id}`);
      const d = await r.json();
      setService(d.service);
      setEditData({});
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("Delete this review?")) return;
    try {
      const res = await fetch(`/api/superadmin/reviews/${reviewId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Review deleted");
      setService((s: any) => ({ ...s, reviews: s.reviews.filter((r: any) => r.id !== reviewId) }));
    } catch {
      toast.error("Failed to delete review");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!service) return <p className="text-red-500">Service not found</p>;

  const updateField = (key: string, value: any) => {
    setEditData((prev: any) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900">{service.name}</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />{service.city}, {service.state}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || Object.keys(editData).length === 0 && statusChange === service.status} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{service._count?.visits || service.totalViews}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Eye className="h-3 w-3" />Views</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{service._count?.bookings || 0}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><CalendarCheck className="h-3 w-3" />Bookings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{service._count?.wishlistItems || 0}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Heart className="h-3 w-3" />Wishlist</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{service._count?.cartItems || 0}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><ShoppingCart className="h-3 w-3" />Cart Adds</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold flex items-center justify-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />{service.avgRating.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">{service.totalReviews} reviews</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Editable Fields */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Service Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input defaultValue={service.name} onChange={(e) => updateField("name", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Price (₹)</Label>
                <Input type="number" defaultValue={service.price} onChange={(e) => updateField("price", parseFloat(e.target.value))} className="mt-1" />
              </div>
              <div>
                <Label>Capacity</Label>
                <Input type="number" defaultValue={service.capacity || ""} onChange={(e) => updateField("capacity", parseInt(e.target.value))} className="mt-1" />
              </div>
              <div>
                <Label>Available Rooms</Label>
                <Input type="number" defaultValue={service.availableRooms || ""} onChange={(e) => updateField("availableRooms", parseInt(e.target.value))} className="mt-1" />
              </div>
              <div>
                <Label>City</Label>
                <Input defaultValue={service.city} onChange={(e) => updateField("city", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Status</Label>
                <select
                  value={statusChange}
                  onChange={(e) => setStatusChange(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm mt-1"
                >
                  <option value="VERIFIED">Verified (Active)</option>
                  <option value="PENDING">Pending</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
            </div>
            {statusChange === "SUSPENDED" && statusChange !== service.status && (
              <div>
                <Label>Suspension Reason</Label>
                <textarea
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full border rounded-lg p-3 mt-1 text-sm min-h-[60px] resize-none"
                  placeholder="Reason for suspension..."
                />
              </div>
            )}
            <div>
              <Label>Description</Label>
              <textarea
                defaultValue={service.description}
                onChange={(e) => updateField("description", e.target.value)}
                className="w-full border rounded-lg p-3 mt-1 text-sm min-h-[100px] resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Owner + Meta */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Owner & Meta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Owner</span>
              <Link href={`/superadmin/users/${service.owner?.id}`} className="font-medium text-primary hover:underline">{service.owner?.name}</Link>
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{service.owner?.email}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Type</span><Badge variant="outline" className="text-[10px]">{service.serviceType}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Address</span><span className="text-right text-xs">{service.address}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Pincode</span><span>{service.pincode}</span></div>
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">AC</span><span>{service.isAC ? "Yes" : "No"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">WiFi</span><span>{service.hasWifi ? "Yes" : "No"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Food</span><span>{service.foodIncluded ? "Included" : "No"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Listed</span><span className="text-xs">{formatDate(service.createdAt)}</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Images */}
      {service.images?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Images ({service.images.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {service.images.map((img: any) => (
                <div key={img.id} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Reviews ({service.reviews?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {service.reviews?.length === 0 ? (
            <p className="text-sm text-gray-400">No reviews yet</p>
          ) : (
            service.reviews.map((r: any) => (
              <div key={r.id} className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{r.user?.name}</p>
                    <div className="flex">
                      {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />)}
                    </div>
                  </div>
                  {r.comment && <p className="text-xs text-gray-600 mt-0.5">{r.comment}</p>}
                  <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(r.createdAt)}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => handleDeleteReview(r.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Students linked */}
      {service.serviceStudents?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" />Linked Students ({service.serviceStudents.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="text-left p-3 font-medium text-gray-600">Name</th>
                  <th className="text-left p-3 font-medium text-gray-600">Email</th>
                  <th className="text-left p-3 font-medium text-gray-600">Phone</th>
                  <th className="text-left p-3 font-medium text-gray-600">Status</th>
                  <th className="text-left p-3 font-medium text-gray-600">Seat</th>
                </tr>
              </thead>
              <tbody>
                {service.serviceStudents.map((s: any) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{s.name}</td>
                    <td className="p-3 text-gray-600">{s.email || "—"}</td>
                    <td className="p-3 text-gray-600">{s.phone || "—"}</td>
                    <td className="p-3"><Badge variant={s.status === "ACTIVE" ? "success" : "secondary"} className="text-[10px]">{s.status}</Badge></td>
                    <td className="p-3 text-gray-600">{s.seatNumber || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
