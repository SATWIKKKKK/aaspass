"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowLeft, Armchair, Loader2, Building2,
  Minus, Plus, CheckCircle, MapPin, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RouteGuard } from "@/components/route-guard";
import { cn, formatPrice } from "@/lib/utils";

interface PropertySeat {
  id: string;
  name: string;
  slug: string;
  serviceType: string;
  city: string;
  capacity: number | null;
  availableRooms: number | null;
  avgRating: number;
  price: number;
  status: string;
}

function SeatsAnalyticsInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [properties, setProperties] = useState<PropertySeat[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editValue, setEditValue] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/properties?owner=me")
      .then(r => r.json())
      .then(data => setProperties((data.properties || []).map((p: any) => ({
        id: p.id, name: p.name, slug: p.slug, serviceType: p.serviceType,
        city: p.city, capacity: p.capacity, availableRooms: p.availableRooms,
        avgRating: p.avgRating, price: p.price, status: p.status,
      }))))
      .finally(() => setLoading(false));
  }, [status]);

  const handleSave = async (slug: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/properties/${slug}/seats`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availableRooms: editValue }),
      });
      const d = await res.json();
      if (res.ok) {
        setProperties(prev => prev.map(p => p.slug === slug ? { ...p, availableRooms: d.availableRooms ?? editValue } : p));
        toast.success("Seats updated!");
        setEditingSlug(null);
      } else {
        toast.error(d.error || "Failed to update");
      }
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading)
    return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const totalCapacity = properties.reduce((s, p) => s + (p.capacity ?? 0), 0);
  const totalAvailable = properties.reduce((s, p) => s + (p.availableRooms ?? 0), 0);
  const totalOccupied = totalCapacity - totalAvailable;
  const occupancyPct = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <button onClick={() => router.push("/admin/dashboard")} className="h-9 w-9 rounded-full border border-gray-200 hover:bg-gray-50 flex items-center justify-center transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Seats & Capacity</h1>
              <p className="text-xs text-gray-500">Available seats by service with inline editing</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200">
            <CardContent className="p-5">
              <p className="text-3xl font-black text-indigo-700">{totalCapacity}</p>
              <p className="text-xs text-indigo-600">Total Capacity</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
            <CardContent className="p-5">
              <p className="text-3xl font-black text-green-700">{totalAvailable}</p>
              <p className="text-xs text-green-600">Available</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
            <CardContent className="p-5">
              <p className="text-3xl font-black text-amber-700">{totalOccupied}</p>
              <p className="text-xs text-amber-600">Occupied</p>
            </CardContent>
          </Card>
          <Card className={cn("bg-gradient-to-br border", occupancyPct >= 90 ? "from-red-50 to-red-100/50 border-red-200" : occupancyPct >= 70 ? "from-yellow-50 to-yellow-100/50 border-yellow-200" : "from-green-50 to-green-100/50 border-green-200")}>
            <CardContent className="p-5">
              <p className={cn("text-3xl font-black", occupancyPct >= 90 ? "text-red-700" : occupancyPct >= 70 ? "text-yellow-700" : "text-green-700")}>{occupancyPct}%</p>
              <p className="text-xs text-gray-600">Occupancy Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Service-wise seats */}
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" /> Seats by Service
        </h3>

        {properties.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-200">
            <CardContent className="p-8 text-center">
              <Armchair className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No services found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {properties.map(p => {
              const cap = p.capacity ?? 0;
              const avail = p.availableRooms ?? 0;
              const occ = cap - avail;
              const pct = cap > 0 ? Math.round((occ / cap) * 100) : 0;
              const color = pct >= 90 ? "red" : pct >= 70 ? "yellow" : "green";
              const isEditing = editingSlug === p.slug;
              const barColor = { red: "bg-red-500", yellow: "bg-yellow-500", green: "bg-green-500" }[color];
              const textColor = { red: "text-red-700", yellow: "text-yellow-700", green: "text-green-700" }[color];

              return (
                <Card key={p.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 truncate">{p.name}</h4>
                          <Badge className="bg-primary/10 text-primary text-[10px] shrink-0">{p.serviceType}</Badge>
                          <Badge variant={p.status === "VERIFIED" ? "success" : "secondary"} className="text-[10px] shrink-0">{p.status}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{p.city}</span>
                          <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />{p.avgRating.toFixed(1)}</span>
                          <span>{formatPrice(p.price)}/mo</span>
                        </div>

                        {/* Progress bar */}
                        {cap > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className={cn("text-xs font-semibold", textColor)}>{occ} of {cap} occupied</span>
                              <span className={cn("text-xs font-bold", textColor)}>{pct}%</span>
                            </div>
                            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all duration-500", barColor)} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Seat editor */}
                      <div className="shrink-0">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <button onClick={() => setEditValue(Math.max(0, editValue - 1))}
                              className="h-8 w-8 rounded-full border border-gray-200 hover:border-primary flex items-center justify-center transition-all">
                              <Minus className="h-4 w-4" />
                            </button>
                            <input type="number" value={editValue} min={0} max={cap || 9999}
                              onChange={e => setEditValue(Math.max(0, Math.min(cap || 9999, parseInt(e.target.value) || 0)))}
                              className="w-16 text-center text-lg font-bold border rounded-lg py-1" />
                            <button onClick={() => setEditValue(Math.min(cap || 9999, editValue + 1))}
                              className="h-8 w-8 rounded-full border border-gray-200 hover:border-primary flex items-center justify-center transition-all">
                              <Plus className="h-4 w-4" />
                            </button>
                            <Button size="sm" onClick={() => handleSave(p.slug)} disabled={saving} className="h-8 text-xs">
                              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-1" />}Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingSlug(null)} className="h-8 text-xs">Cancel</Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="text-center">
                              <p className={cn("text-2xl font-black", textColor)}>{avail}</p>
                              <p className="text-[10px] text-gray-400">available</p>
                            </div>
                            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setEditingSlug(p.slug); setEditValue(avail); }}>
                              <Armchair className="h-3 w-3 mr-1" />Update
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SeatsAnalyticsPage() {
  return <RouteGuard allowedRole="OWNER"><SeatsAnalyticsInner /></RouteGuard>;
}
