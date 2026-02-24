"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Plus, ChevronLeft, ChevronRight, Loader2,
  Building2, Pencil, BarChart3,
  MapPin, Star, Eye, Trash2, ArrowLeft,
} from "lucide-react";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatPrice } from "@/lib/utils";

interface PropertyImage { id: string; url: string; isWideShot: boolean; order: number }
interface PropertyData {
  id: string; name: string; slug: string; serviceType: string; status: string;
  price: number; avgRating: number; totalReviews: number;
  city: string; address: string; images: PropertyImage[];
  _count?: { bookings: number };
  createdAt: string;
}

/* ───── Image Carousel ───── */
function ImageCarousel({ images, className }: { images: PropertyImage[]; className?: string }) {
  const [idx, setIdx] = useState(0);
  const imgs = images.length > 0 ? images : [{ id: "ph", url: "", isWideShot: false, order: 0 }];
  return (
    <div className={cn("relative group overflow-hidden bg-gray-100", className)}>
      {imgs[idx]?.url ? (
        <img src={imgs[idx].url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-primary/10 to-primary/5">
          <Building2 className="h-10 w-10 text-primary/30" />
        </div>
      )}
      {imgs.length > 1 && (
        <>
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIdx((i) => (i - 1 + imgs.length) % imgs.length); }}
            className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/80 flex items-center justify-center opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow">
            <ChevronLeft className="h-4 w-4 text-gray-700" />
          </button>
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIdx((i) => (i + 1) % imgs.length); }}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/80 flex items-center justify-center opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow">
            <ChevronRight className="h-4 w-4 text-gray-700" />
          </button>
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
            {imgs.map((_, i) => (
              <button key={i} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIdx(i); }}
                className={cn("h-1.5 w-1.5 rounded-full transition-all cursor-pointer", i === idx ? "bg-white w-3" : "bg-white/60")} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function AllPropertiesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/properties?owner=me&limit=100")
      .then((r) => r.json())
      .then((data) => setProperties(data.properties || []))
      .catch(() => toast.error("Failed to load properties"))
      .finally(() => setLoading(false));
  }, [status]);

  const handleDelete = async (slug: string) => {
    if (!confirm("Are you sure you want to delete this property? This action cannot be undone.")) return;
    setDeleting(slug);
    try {
      const res = await fetch(`/api/properties/${slug}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Property deleted");
        setProperties((prev) => prev.filter((p) => p.slug !== slug));
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete");
      }
    } catch { toast.error("Failed to delete"); }
    finally { setDeleting(null); }
  };

  if (status === "loading" || loading)
    return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/admin/dashboard" className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary">
                <ArrowLeft className="h-4 w-4" /> Dashboard
              </Link>
              <span className="text-gray-300">|</span>
              <h1 className="text-lg font-bold text-gray-900">My Properties</h1>
            </div>
            <Link href="/admin/properties/new">
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Property</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <Badge variant="secondary" className="text-sm px-3 py-1">Total: {properties.length}</Badge>
          <Badge className="bg-green-100 text-green-700 text-sm px-3 py-1">
            Verified: {properties.filter((p) => p.status === "VERIFIED").length}
          </Badge>
          <Badge className="bg-yellow-100 text-yellow-700 text-sm px-3 py-1">
            Pending: {properties.filter((p) => p.status === "PENDING").length}
          </Badge>
        </div>

        {properties.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-200">
            <CardContent className="p-16 text-center">
              <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900">No properties yet</h2>
              <p className="text-gray-500 mt-2 mb-6">Start by listing your first property</p>
              <Link href="/admin/properties/new"><Button><Plus className="h-4 w-4 mr-2" />Add Property</Button></Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Add Property card */}
            <Link href="/admin/properties/new">
              <Card className="border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all cursor-pointer h-full min-h-70">
                <CardContent className="p-8 flex flex-col items-center justify-center text-center h-full">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Plus className="h-8 w-8 text-primary" />
                  </div>
                  <p className="font-semibold text-gray-900 text-lg">Add New Property</p>
                  <p className="text-sm text-gray-500 mt-1">List another hostel, PG, gym...</p>
                </CardContent>
              </Card>
            </Link>

            {/* Property cards */}
            {properties.map((property) => (
              <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* Image */}
                <ImageCarousel images={property.images} className="w-full h-48" />

                {/* Content */}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 truncate">{property.name}</h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="h-3 w-3 shrink-0" />{property.address}, {property.city}
                      </p>
                    </div>
                    <Badge
                      variant={property.status === "VERIFIED" ? "success" : property.status === "PENDING" ? "secondary" : "destructive"}
                      className="text-[10px] shrink-0"
                    >
                      {property.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                    <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />{property.avgRating.toFixed(1)}</span>
                    <span>{formatPrice(property.price)}/mo</span>
                    <span className="capitalize">{property.serviceType.toLowerCase()}</span>
                    {property._count?.bookings !== undefined && (
                      <span>{property._count.bookings} bookings</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <Link href={`/admin/properties/${property.slug}/manage?tab=edit`}>
                      <Button size="sm" variant="outline" className="w-full text-xs h-8"><Pencil className="h-3 w-3 mr-1" />Edit</Button>
                    </Link>
                    <Link href={`/admin/properties/${property.slug}/manage`}>
                      <Button size="sm" variant="outline" className="w-full text-xs h-8"><Eye className="h-3 w-3 mr-1" />Manage</Button>
                    </Link>
                    <Link href={`/admin/properties/${property.slug}/manage?tab=analytics`}>
                      <Button size="sm" variant="outline" className="w-full text-xs h-8"><BarChart3 className="h-3 w-3 mr-1" />Analysis</Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs h-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(property.slug)}
                      disabled={deleting === property.slug}
                    >
                      {deleting === property.slug ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Trash2 className="h-3 w-3 mr-1" />Delete</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
