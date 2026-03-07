"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Percent, Search, Filter, ChevronLeft, ChevronRight, Loader2,
  History, Save, Users, Settings, AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

interface OwnerRow {
  id: string;
  name: string;
  email: string;
  commissionPercentage: number | null;
  _count: { properties: number };
}

interface HistoryEntry {
  id: string;
  previousRate: number;
  newRate: number;
  changedBy: string;
  reason: string | null;
  createdAt: string;
}

export default function SuperAdminCommissionPage() {
  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [defaultRate, setDefaultRate] = useState<number>(10);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState("");
  const [editReason, setEditReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [historyOwnerId, setHistoryOwnerId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [newDefaultRate, setNewDefaultRate] = useState("");
  const [savingDefault, setSavingDefault] = useState(false);

  const fetchOwners = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    try {
      const res = await fetch(`/api/superadmin/commission?${params}`);
      const data = await res.json();
      setOwners(data.owners || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setDefaultRate(data.defaultRate ?? 10);
    } catch {
      toast.error("Failed to load commission data");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchOwners(); }, [fetchOwners]);

  const handleUpdateRate = async (ownerId: string) => {
    const rate = parseFloat(editRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error("Rate must be 0-100"); return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/superadmin/commission", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId, commissionPercentage: rate, reason: editReason || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Commission rate updated");
      setEditingId(null);
      setEditRate("");
      setEditReason("");
      fetchOwners();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async () => {
    const rate = parseFloat(newDefaultRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error("Rate must be 0-100"); return;
    }
    setSavingDefault(true);
    try {
      const res = await fetch("/api/superadmin/commission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setDefault", defaultRate: rate }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Default rate updated");
      setNewDefaultRate("");
      fetchOwners();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSavingDefault(false);
    }
  };

  const fetchHistory = async (ownerId: string) => {
    setHistoryOwnerId(ownerId);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/superadmin/commission/history?ownerId=${ownerId}`);
      const data = await res.json();
      setHistory(data.history || []);
    } catch {
      toast.error("Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Commission Management</h2>
          <p className="text-sm text-muted-foreground">Set per-owner commission rates</p>
        </div>
      </div>

      {/* Default Rate Card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Default Commission Rate</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{defaultRate}%</p>
              <p className="text-xs text-muted-foreground">Applied to owners without a custom rate</p>
            </div>
            <div className="flex items-end gap-2 sm:ml-auto">
              <div>
                <Label className="text-xs">New Default (%)</Label>
                <Input type="number" min="0" max="100" step="0.5" value={newDefaultRate} onChange={(e) => setNewDefaultRate(e.target.value)} placeholder={String(defaultRate)} className="w-28" />
              </div>
              <Button size="sm" onClick={handleSetDefault} disabled={savingDefault || !newDefaultRate}>
                {savingDefault ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                Set
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchOwners(); }} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search owners by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Button type="submit" size="sm" className="h-10"><Filter className="h-3.5 w-3.5 mr-1" />Filter</Button>
          </form>
        </CardContent>
      </Card>

      {/* Owners Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="text-left p-3 font-medium text-gray-600">Owner</th>
                  <th className="text-left p-3 font-medium text-gray-600 hidden md:table-cell">Services</th>
                  <th className="text-left p-3 font-medium text-gray-600">Commission %</th>
                  <th className="text-left p-3 font-medium text-gray-600">Type</th>
                  <th className="text-right p-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="p-3"><Skeleton className="h-5 w-20" /></td>
                      ))}
                    </tr>
                  ))
                ) : owners.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500"><Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />No owners found</td></tr>
                ) : (
                  owners.map((o) => {
                    const isEditing = editingId === o.id;
                    const rate = o.commissionPercentage ?? defaultRate;
                    const isCustom = o.commissionPercentage !== null;
                    return (
                      <tr key={o.id} className="border-b hover:bg-gray-50/50 transition-colors">
                        <td className="p-3">
                          <p className="font-medium text-gray-900">{o.name}</p>
                          <p className="text-xs text-muted-foreground">{o.email}</p>
                        </td>
                        <td className="p-3 hidden md:table-cell text-gray-600">{o._count.properties}</td>
                        <td className="p-3">
                          {isEditing ? (
                            <div className="flex flex-col gap-1.5 max-w-[180px]">
                              <Input type="number" min="0" max="100" step="0.5" value={editRate} onChange={(e) => setEditRate(e.target.value)} placeholder={String(rate)} className="h-8 text-sm" />
                              <Input value={editReason} onChange={(e) => setEditReason(e.target.value)} placeholder="Reason (optional)" className="h-8 text-xs" />
                            </div>
                          ) : (
                            <span className="text-lg font-bold text-gray-900">{rate}%</span>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge variant={isCustom ? "default" : "secondary"} className="text-[10px]">
                            {isCustom ? "Custom" : "Default"}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isEditing ? (
                              <>
                                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                                <Button size="sm" onClick={() => handleUpdateRate(o.id)} disabled={saving}>
                                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit rate" onClick={() => { setEditingId(o.id); setEditRate(String(rate)); setEditReason(""); }}>
                                  <Percent className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="View history" onClick={() => fetchHistory(o.id)}>
                                  <History className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
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

      {/* History Modal */}
      {historyOwnerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setHistoryOwnerId(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-semibold">Commission History</h3>
              <button onClick={() => setHistoryOwnerId(null)} className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                <AlertCircle className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6">
              {historyLoading ? (
                <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : history.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No history found</p>
              ) : (
                <div className="space-y-3">
                  {history.map((h) => (
                    <div key={h.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">{h.previousRate}%</Badge>
                          <span className="text-gray-400">→</span>
                          <Badge className="text-xs">{h.newRate}%</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{formatDate(h.createdAt)}</span>
                      </div>
                      {h.reason && <p className="text-xs text-gray-500 mt-1.5">{h.reason}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">by {h.changedBy}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
