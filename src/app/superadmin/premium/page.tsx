"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search, Filter, ChevronLeft, ChevronRight, Crown, Plus, Loader2, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

export default function SuperAdminPremiumPage() {
  const [grants, setGrants] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showGrant, setShowGrant] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Grant form
  const [grantForm, setGrantForm] = useState({ userId: "", days: "30", reason: "", lifetime: false });
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<any[]>([]);

  const fetchGrants = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    if (filter) params.set("filter", filter);
    try {
      const res = await fetch(`/api/superadmin/premium?${params}`);
      const data = await res.json();
      setGrants(data.grants || []);
      setStats(data.stats || null);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch {
      toast.error("Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [page, search, filter]);

  useEffect(() => { fetchGrants(); }, [fetchGrants]);

  const searchUsers = async (q: string) => {
    setUserSearch(q);
    if (q.length < 2) { setUserResults([]); return; }
    try {
      const res = await fetch(`/api/superadmin/users?search=${encodeURIComponent(q)}&limit=5`);
      const data = await res.json();
      setUserResults(data.users || []);
    } catch { /* ignore */ }
  };

  const handleGrant = async () => {
    if (!grantForm.userId) { toast.error("Select a user"); return; }
    setActionLoading(true);
    try {
      let expiryDate: string | null = null;
      if (!grantForm.lifetime) {
        const d = new Date();
        d.setDate(d.getDate() + Number(grantForm.days || 30));
        expiryDate = d.toISOString();
      }
      const res = await fetch("/api/superadmin/premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: grantForm.userId, expiryDate, reason: grantForm.reason }),
      });
      if (!res.ok) throw new Error();
      toast.success("Premium granted");
      setShowGrant(false);
      setGrantForm({ userId: "", days: "30", reason: "", lifetime: false });
      setUserSearch("");
      fetchGrants();
    } catch {
      toast.error("Failed to grant premium");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAction = async (grantId: string, action: string, userId: string) => {
    const reason = action === "revoke" ? prompt("Reason for revocation:") : undefined;
    let expiryDate: string | undefined;
    if (action === "extend") {
      const days = prompt("Days to extend:", "30");
      if (!days) return;
      const d = new Date();
      d.setDate(d.getDate() + Number(days));
      expiryDate = d.toISOString();
    }
    setActionLoading(true);
    try {
      const res = await fetch("/api/superadmin/premium", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, reason, expiryDate }),
      });
      if (!res.ok) throw new Error();
      toast.success("Updated");
      fetchGrants();
    } catch {
      toast.error("Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Premium Management</h2>
          <p className="text-sm text-muted-foreground">{total} premium grants</p>
        </div>
        <Button size="sm" onClick={() => setShowGrant(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />Grant Premium
        </Button>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: "Total Active Premium", value: stats.totalActivePremium, color: "text-green-600", href: "/superadmin/premium/active" },
            { label: "Manual Grants", value: stats.manualGrants, color: "text-blue-600", href: "/superadmin/premium/manual-grants" },
            { label: "Expiring in 7d", value: stats.expiringIn7Days, color: "text-orange-600", href: "/superadmin/premium/expiring" },
          ].map((s, i) => (
            <Link key={i} href={s.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-blue-200">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-primary mt-1">View Details →</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchGrants(); }} className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
              <option value="expiring-soon">Expiring Soon</option>
              <option value="manual">Manual Grants</option>
              <option value="paid">Paid</option>
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
                  <th className="text-left p-3 font-medium text-gray-600 hidden md:table-cell">Type</th>
                  <th className="text-left p-3 font-medium text-gray-600">Granted</th>
                  <th className="text-left p-3 font-medium text-gray-600">Expires</th>
                  <th className="text-left p-3 font-medium text-gray-600">Status</th>
                  <th className="text-left p-3 font-medium text-gray-600 hidden lg:table-cell">Reason</th>
                  <th className="text-right p-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 7 }).map((_, j) => <td key={j} className="p-3"><Skeleton className="h-5 w-20" /></td>)}
                    </tr>
                  ))
                ) : grants.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-gray-500"><Crown className="h-8 w-8 mx-auto mb-2 text-gray-300" />No premium grants found</td></tr>
                ) : (
                  grants.map((g) => {
                    const isActive = g.isActive && !g.revokedAt && (!g.expiryDate || new Date(g.expiryDate) > new Date());
                    const isRevoked = !!g.revokedAt;
                    const isExpired = !isRevoked && g.expiryDate && new Date(g.expiryDate) < new Date();
                    const statusLabel = isRevoked ? "revoked" : isExpired ? "expired" : isActive ? "active" : "inactive";
                    return (
                      <tr key={g.id} className="border-b hover:bg-gray-50/50 transition-colors">
                        <td className="p-3">
                          <div className="font-medium text-gray-900">{g.user?.name}</div>
                          <div className="text-xs text-muted-foreground">{g.user?.email}</div>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <Badge variant="secondary" className="text-[10px]">{g.grantType}</Badge>
                        </td>
                        <td className="p-3 text-xs text-gray-600">{formatDate(g.createdAt)}</td>
                        <td className="p-3 text-xs text-gray-600">{g.expiryDate ? formatDate(g.expiryDate) : "Lifetime"}</td>
                        <td className="p-3">
                          <Badge variant={statusLabel === "active" ? "success" : statusLabel === "revoked" ? "destructive" : "secondary"} className="text-[10px]">
                            {statusLabel}
                          </Badge>
                        </td>
                        <td className="p-3 hidden lg:table-cell text-xs text-gray-600 max-w-[200px] truncate">{g.reason || "—"}</td>
                        <td className="p-3 text-right space-x-1">
                          {statusLabel === "active" && (
                            <>
                              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => handleAction(g.id, "extend", g.userId)}>Extend</Button>
                              <Button size="sm" variant="ghost" className="text-xs h-7 text-red-600" onClick={() => handleAction(g.id, "revoke", g.userId)}>Revoke</Button>
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

      {/* Grant Modal */}
      {showGrant && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center" onClick={() => setShowGrant(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Grant Premium</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowGrant(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Target User *</Label>
                <Input placeholder="Search users..." value={userSearch} onChange={(e) => searchUsers(e.target.value)} />
                {userResults.length > 0 && (
                  <div className="border rounded-md mt-1 max-h-32 overflow-y-auto">
                    {userResults.map((u) => (
                      <button key={u.id} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={() => { setGrantForm({ ...grantForm, userId: u.id }); setUserSearch(u.name + " (" + u.email + ")"); setUserResults([]); }}>
                        {u.name} — {u.email}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Label>Duration (days)</Label>
                  <Input type="number" min={1} value={grantForm.days} onChange={(e) => setGrantForm({ ...grantForm, days: e.target.value })} disabled={grantForm.lifetime} />
                </div>
                <label className="flex items-center gap-2 pt-5 text-sm cursor-pointer">
                  <input type="checkbox" checked={grantForm.lifetime} onChange={(e) => setGrantForm({ ...grantForm, lifetime: e.target.checked })} className="rounded" />
                  Lifetime
                </label>
              </div>
              <div>
                <Label>Reason</Label>
                <Input value={grantForm.reason} onChange={(e) => setGrantForm({ ...grantForm, reason: e.target.value })} placeholder="Why are you granting premium?" />
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowGrant(false)}>Cancel</Button>
              <Button size="sm" onClick={handleGrant} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Grant
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
