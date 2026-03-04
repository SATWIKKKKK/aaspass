"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, Filter, ChevronLeft, ChevronRight, Gift, Plus, Loader2, X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

export default function SuperAdminOffersPage() {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Create form fields
  const [form, setForm] = useState({
    assignedToUserId: "",
    title: "",
    description: "",
    discountType: "percentage" as string,
    discountValue: "",
    expiryDate: "",
  });

  // User search for create
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<any[]>([]);
  const [userSearching, setUserSearching] = useState(false);

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    try {
      const res = await fetch(`/api/superadmin/offers?${params}`);
      const data = await res.json();
      setOffers(data.offers || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch {
      toast.error("Failed to fetch offers");
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  const searchUsers = async (q: string) => {
    setUserSearch(q);
    if (q.length < 2) { setUserResults([]); return; }
    setUserSearching(true);
    try {
      const res = await fetch(`/api/superadmin/users?search=${encodeURIComponent(q)}&limit=5`);
      const data = await res.json();
      setUserResults(data.users || []);
    } catch { /* ignore */ } finally {
      setUserSearching(false);
    }
  };

  const handleCreate = async () => {
    if (!form.assignedToUserId || !form.title || !form.discountValue || !form.expiryDate) { toast.error("User, title, discount, and expiry required"); return; }
    setActionLoading(true);
    try {
      const res = await fetch("/api/superadmin/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          discountValue: Number(form.discountValue),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Offer created");
      setShowCreate(false);
      setForm({ assignedToUserId: "", title: "", description: "", discountType: "percentage", discountValue: "", expiryDate: "" });
      setUserSearch("");
      fetchOffers();
    } catch {
      toast.error("Failed to create offer");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = async (offerId: string) => {
    if (!confirm("Revoke this offer?")) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/superadmin/offers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId, action: "revoke" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Offer revoked");
      fetchOffers();
    } catch {
      toast.error("Failed to revoke");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!showEdit) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/superadmin/offers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: showEdit.id,
          action: "edit",
          title: showEdit.title,
          description: showEdit.description,
          discountType: showEdit.discountType,
          discountValue: showEdit.discountValue ? Number(showEdit.discountValue) : undefined,
          expiryDate: showEdit.expiryDate,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Offer updated");
      setShowEdit(null);
      fetchOffers();
    } catch {
      toast.error("Failed to update");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Personalized Offers</h2>
          <p className="text-sm text-muted-foreground">{total} total offers</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />New Offer
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchOffers(); }} className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search by user, title, or code..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="used">Used</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
            </select>
            <Button type="submit" size="sm" className="h-10"><Filter className="h-3.5 w-3.5 mr-1" />Filter</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="text-left p-3 font-medium text-gray-600">User</th>
                  <th className="text-left p-3 font-medium text-gray-600">Offer</th>
                  <th className="text-left p-3 font-medium text-gray-600 hidden md:table-cell">Type</th>
                  <th className="text-left p-3 font-medium text-gray-600 hidden md:table-cell">Discount</th>
                  <th className="text-left p-3 font-medium text-gray-600">Status</th>
                  <th className="text-left p-3 font-medium text-gray-600 hidden lg:table-cell">Expires</th>
                  <th className="text-left p-3 font-medium text-gray-600 hidden lg:table-cell">Created</th>
                  <th className="text-right p-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 8 }).map((_, j) => <td key={j} className="p-3"><Skeleton className="h-5 w-20" /></td>)}
                    </tr>
                  ))
                ) : offers.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-gray-500"><Gift className="h-8 w-8 mx-auto mb-2 text-gray-300" />No offers found</td></tr>
                ) : (
                  offers.map((o) => {
                    const now = new Date();
                    const effectiveStatus = o.revokedAt ? "revoked" : o.isUsed ? "used" : o.expiryDate && new Date(o.expiryDate) < now ? "expired" : "active";
                    return (
                      <tr key={o.id} className="border-b hover:bg-gray-50/50 transition-colors">
                        <td className="p-3">
                          <div className="font-medium text-gray-900">{o.assignedTo?.name}</div>
                          <div className="text-xs text-muted-foreground">{o.assignedTo?.email}</div>
                        </td>
                        <td className="p-3 font-medium">{o.title}</td>
                        <td className="p-3 font-mono text-xs hidden md:table-cell">{o.discountType || "—"}</td>
                        <td className="p-3 hidden md:table-cell">{o.discountValue ? `${o.discountValue}${o.discountType === 'percentage' ? '%' : '₹'}` : "—"}</td>
                        <td className="p-3">
                          <Badge
                            variant={effectiveStatus === "active" ? "success" : effectiveStatus === "revoked" ? "destructive" : "secondary"}
                            className="text-[10px]"
                          >{effectiveStatus}</Badge>
                        </td>
                        <td className="p-3 hidden lg:table-cell text-xs text-gray-600">{o.expiryDate ? formatDate(o.expiryDate) : "Never"}</td>
                        <td className="p-3 hidden lg:table-cell text-xs text-gray-600">{formatDate(o.createdAt)}</td>
                        <td className="p-3 text-right space-x-1">
                          {effectiveStatus === "active" && (
                            <>
                              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setShowEdit({ ...o })}>Edit</Button>
                              <Button size="sm" variant="ghost" className="text-xs h-7 text-red-600" onClick={() => handleRevoke(o.id)}>Revoke</Button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
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

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create Offer</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Target User *</Label>
                <Input placeholder="Search users..." value={userSearch} onChange={(e) => searchUsers(e.target.value)} />
                {userSearching && <p className="text-xs text-muted-foreground mt-1">Searching...</p>}
                {userResults.length > 0 && (
                  <div className="border rounded-md mt-1 max-h-32 overflow-y-auto">
                    {userResults.map((u) => (
                      <button key={u.id} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={() => { setForm({ ...form, assignedToUserId: u.id }); setUserSearch(u.name + " (" + u.email + ")"); setUserResults([]); }}>
                        {u.name} — {u.email}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Special 20% discount" />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional details..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Discount Type</Label>
                  <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="percentage">Percentage</option>
                    <option value="flat">Flat Amount</option>
                  </select>
                </div>
                <div>
                  <Label>Discount Value *</Label>
                  <Input type="number" min={0} value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} placeholder={form.discountType === "percentage" ? "e.g. 20" : "e.g. 500"} />
                </div>
              </div>
              <div>
                <Label>Expires At *</Label>
                <Input type="datetime-local" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Create
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center" onClick={() => setShowEdit(null)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Edit Offer</h3>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={showEdit.title} onChange={(e) => setShowEdit({ ...showEdit, title: e.target.value })} /></div>
              <div><Label>Description</Label><Input value={showEdit.description || ""} onChange={(e) => setShowEdit({ ...showEdit, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Discount Type</Label>
                  <select value={showEdit.discountType || "percentage"} onChange={(e) => setShowEdit({ ...showEdit, discountType: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="percentage">Percentage</option>
                    <option value="flat">Flat Amount</option>
                  </select>
                </div>
                <div><Label>Discount Value</Label><Input type="number" value={showEdit.discountValue || ""} onChange={(e) => setShowEdit({ ...showEdit, discountValue: e.target.value })} /></div>
              </div>
              <div><Label>Expires At</Label><Input type="datetime-local" value={showEdit.expiryDate ? new Date(showEdit.expiryDate).toISOString().slice(0,16) : ""} onChange={(e) => setShowEdit({ ...showEdit, expiryDate: e.target.value })} /></div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowEdit(null)}>Cancel</Button>
              <Button size="sm" onClick={handleEdit} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
