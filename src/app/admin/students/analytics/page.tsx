"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Users, Loader2, Building2, Search,
  UserCheck, UserX, UserMinus, MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RouteGuard } from "@/components/route-guard";
import { cn } from "@/lib/utils";

interface StudentItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  seatNumber: string | null;
  isVerified: boolean;
  createdAt: string;
  propertyName: string;
  propertySlug: string;
  serviceType: string;
}

interface PropertyInfo {
  name: string;
  slug: string;
  serviceType: string;
  city: string;
}

function StudentsAnalyticsInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [properties, setProperties] = useState<PropertyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/properties?owner=me")
      .then(r => r.json())
      .then(async (data) => {
        const props: PropertyInfo[] = (data.properties || []).map((p: any) => ({
          name: p.name, slug: p.slug, serviceType: p.serviceType, city: p.city,
        }));
        setProperties(props);

        // Fetch students for each property
        const allStudents: StudentItem[] = [];
        await Promise.all(props.map(async (p) => {
          try {
            const res = await fetch(`/api/properties/${p.slug}/students`);
            const d = await res.json();
            const studs = d.students || d || [];
            if (Array.isArray(studs)) {
              for (const s of studs) {
                allStudents.push({
                  id: s.id, name: s.name, email: s.email, phone: s.phone,
                  status: s.status || "ACTIVE", seatNumber: s.seatNumber,
                  isVerified: s.isVerified || false, createdAt: s.createdAt,
                  propertyName: p.name, propertySlug: p.slug, serviceType: p.serviceType,
                });
              }
            }
          } catch { /* skip */ }
        }));
        setStudents(allStudents);
      })
      .finally(() => setLoading(false));
  }, [status]);

  if (status === "loading" || loading)
    return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const filtered = students.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.email && s.email.toLowerCase().includes(search.toLowerCase())) ||
      (s.phone && s.phone.includes(search));
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    const matchService = serviceFilter === "all" || s.serviceType === serviceFilter;
    return matchSearch && matchStatus && matchService;
  });

  const active = students.filter(s => s.status === "ACTIVE").length;
  const inactive = students.filter(s => s.status === "INACTIVE").length;
  const left = students.filter(s => s.status === "LEFT").length;
  const serviceTypes = [...new Set(properties.map(p => p.serviceType))];

  // Group by service
  const byService: Record<string, StudentItem[]> = {};
  for (const s of filtered) {
    if (!byService[s.propertyName]) byService[s.propertyName] = [];
    byService[s.propertyName].push(s);
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <button onClick={() => router.push("/admin/dashboard")} className="h-9 w-9 rounded-full border border-gray-200 hover:bg-gray-50 flex items-center justify-center transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Registered Students</h1>
              <p className="text-xs text-gray-500">Students across all your services with filters</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-200 flex items-center justify-center"><Users className="h-5 w-5 text-amber-700" /></div>
                <div><p className="text-2xl font-black text-amber-700">{students.length}</p><p className="text-xs text-amber-600">Total</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-green-200 flex items-center justify-center"><UserCheck className="h-5 w-5 text-green-700" /></div>
                <div><p className="text-2xl font-black text-green-700">{active}</p><p className="text-xs text-green-600">Active</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-gray-50 to-gray-100/50 border-gray-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gray-200 flex items-center justify-center"><UserMinus className="h-5 w-5 text-gray-700" /></div>
                <div><p className="text-2xl font-black text-gray-700">{inactive}</p><p className="text-xs text-gray-600">Inactive</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-red-200 flex items-center justify-center"><UserX className="h-5 w-5 text-red-700" /></div>
                <div><p className="text-2xl font-black text-red-700">{left}</p><p className="text-xs text-red-600">Left</p></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search by name, email, or phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="LEFT">Left</SelectItem>
            </SelectContent>
          </Select>
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Service Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {serviceTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Students by Service */}
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" /> Students by Service
        </h3>

        {Object.keys(byService).length === 0 ? (
          <Card className="border-2 border-dashed border-gray-200">
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No students found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(byService).map(([serviceName, studs]) => {
              const activeCount = studs.filter(s => s.status === "ACTIVE").length;
              return (
                <Card key={serviceName} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        {serviceName}
                        <Badge className="bg-primary/10 text-primary text-[10px]">{studs[0]?.serviceType}</Badge>
                      </span>
                      <span className="text-sm text-gray-500">{activeCount} active / {studs.length} total</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1.5">
                      {studs.map(s => (
                        <div key={s.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 truncate">{s.name}</p>
                              {s.isVerified && <Badge className="bg-blue-100 text-blue-700 text-[9px]">Verified</Badge>}
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-0.5">
                              {s.email && <span>{s.email}</span>}
                              {s.phone && <span>{s.phone}</span>}
                              {s.seatNumber && <span>Seat: {s.seatNumber}</span>}
                            </div>
                          </div>
                          <Badge variant={s.status === "ACTIVE" ? "success" : s.status === "LEFT" ? "destructive" : "secondary"} className="text-[10px] shrink-0 ml-2">
                            {s.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => router.push(`/admin/properties/${studs[0]?.propertySlug}/manage?tab=students`)}>
                        Manage Students
                      </Button>
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

export default function StudentsAnalyticsPage() {
  return <RouteGuard allowedRole="OWNER"><StudentsAnalyticsInner /></RouteGuard>;
}
