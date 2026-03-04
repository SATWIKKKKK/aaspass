"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search, Filter, ChevronLeft, ChevronRight, Eye, Building2,
  Star, MapPin, Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

export default function SuperAdminServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20", sortBy });
    if (search) params.set("search", search);
    if (serviceType) params.set("serviceType", serviceType);
    if (status) params.set("status", status);

    try {
      const res = await fetch(`/api/superadmin/services?${params}`);
      const data = await res.json();
      setServices(data.services || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch {
      toast.error("Failed to fetch services");
    } finally {
      setLoading(false);
    }
  }, [page, search, serviceType, status, sortBy]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const statusColor = (s: string) => {
    switch (s) {
      case "VERIFIED": return "success";
      case "PENDING": return "secondary";
      case "REJECTED": return "destructive";
      case "SUSPENDED": return "destructive";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Service Management</h2>
        <p className="text-sm text-muted-foreground">{total.toLocaleString()} total services</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchServices(); }} className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search by name, owner, city..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <select value={serviceType} onChange={(e) => { setServiceType(e.target.value); setPage(1); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">All Types</option>
              {["HOSTEL", "PG", "LIBRARY", "COACHING", "MESS", "LAUNDRY", "GYM", "COWORKING"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">All Status</option>
              <option value="VERIFIED">Verified</option>
              <option value="PENDING">Pending</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="createdAt">Newest</option>
              <option value="totalViews">Most Viewed</option>
              <option value="totalReviews">Most Reviewed</option>
              <option value="price">Price</option>
            </select>
            <Button type="submit" size="sm" className="h-10"><Filter className="h-3.5 w-3.5 mr-1" />Filter</Button>
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="text-left p-3 font-medium text-gray-600">Service</th>
                  <th className="text-left p-3 font-medium text-gray-600 hidden md:table-cell">Owner</th>
                  <th className="text-left p-3 font-medium text-gray-600">Type</th>
                  <th className="text-left p-3 font-medium text-gray-600 hidden lg:table-cell">City</th>
                  <th className="text-left p-3 font-medium text-gray-600">Status</th>
                  <th className="text-left p-3 font-medium text-gray-600 hidden lg:table-cell">Views</th>
                  <th className="text-left p-3 font-medium text-gray-600 hidden lg:table-cell">Bookings</th>
                  <th className="text-left p-3 font-medium text-gray-600">Price</th>
                  <th className="text-right p-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="p-3"><Skeleton className="h-5 w-20" /></td>
                      ))}
                    </tr>
                  ))
                ) : services.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-gray-500">
                      <Building2 className="h-8 w-8 mx-auto mb-2 text-gray-300" />No services found
                    </td>
                  </tr>
                ) : (
                  services.map((s) => (
                    <tr key={s.id} className="border-b hover:bg-gray-50/50 transition-colors">
                      <td className="p-3">
                        <p className="font-medium text-gray-900">{s.name}</p>
                      </td>
                      <td className="p-3 hidden md:table-cell text-gray-600">{s.owner?.name || "—"}</td>
                      <td className="p-3"><Badge variant="outline" className="text-[10px]">{s.serviceType}</Badge></td>
                      <td className="p-3 hidden lg:table-cell text-gray-600">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.city}</span>
                      </td>
                      <td className="p-3"><Badge variant={statusColor(s.status) as any} className="text-[10px]">{s.status}</Badge></td>
                      <td className="p-3 hidden lg:table-cell text-gray-600">{s.totalViews}</td>
                      <td className="p-3 hidden lg:table-cell text-gray-600">{s._count?.bookings || 0}</td>
                      <td className="p-3 text-gray-900">{formatPrice(s.price)}</td>
                      <td className="p-3 text-right">
                        <Link href={`/superadmin/services/${s.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="View"><Eye className="h-3.5 w-3.5" /></Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
