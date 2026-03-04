"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, Filter, ChevronLeft, ChevronRight, ShieldAlert, Loader2, X, AlertTriangle, Ban,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

export default function SuperAdminViolationsPage() {
  const [tab, setTab] = useState<"warnings" | "suspensions">("warnings");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  // Action modal
  const [showAction, setShowAction] = useState<{ type: string; userId?: string; userName?: string } | null>(null);
  const [actionForm, setActionForm] = useState({ reason: "", duration: "7" });

  // User search for new action
  const [showNewAction, setShowNewAction] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newActionType, setNewActionType] = useState<"warn" | "suspend" | "ban">("warn");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20", tab });
    if (search) params.set("search", search);
    try {
      const res = await fetch(`/api/superadmin/violations?${params}`);
      const d = await res.json();
      setData(tab === "warnings" ? (d.warnings || []) : (d.suspensions || []));
      setTotalPages(d.pagination?.totalPages || 1);
      setTotal(d.pagination?.total || 0);
    } catch {
      toast.error("Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [page, search, tab]);

  useEffect(() => { setPage(1); }, [tab]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const searchUsers = async (q: string) => {
    setUserSearch(q);
    if (q.length < 2) { setUserResults([]); return; }
    try {
      const res = await fetch(`/api/superadmin/users?search=${encodeURIComponent(q)}&limit=5`);
      const d = await res.json();
      setUserResults(d.users || []);
    } catch { /* ignore */ }
  };

  const handleNewAction = async () => {
    if (!selectedUser) { toast.error("Select a user"); return; }
    if (!actionForm.reason) { toast.error("Reason required"); return; }
    setActionLoading(true);
    try {
      const body: any = { userId: selectedUser.id, action: newActionType };
      if (newActionType === "warn") {
        body.warningMessage = actionForm.reason;
      } else {
        body.reason = actionForm.reason;
      }
      if (newActionType === "suspend") {
        const d = new Date();
        d.setDate(d.getDate() + Number(actionForm.duration));
        body.expiresAt = d.toISOString();
      }
      const res = await fetch("/api/superadmin/violations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success(`User ${newActionType === "warn" ? "warned" : newActionType === "suspend" ? "suspended" : "banned"}`);
      setShowNewAction(false);
      setSelectedUser(null);
      setUserSearch("");
      setActionForm({ reason: "", duration: "7" });
      fetchData();
    } catch {
      toast.error("Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReinstate = async (userId: string) => {
    if (!confirm("Reinstate this user?")) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/superadmin/violations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "reinstate", reason: "Reinstated by admin" }),
      });
      if (!res.ok) throw new Error();
      toast.success("User reinstated");
      fetchData();
    } catch {
      toast.error("Failed to reinstate");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Violations & Enforcement</h2>
          <p className="text-sm text-muted-foreground">{total} records</p>
        </div>
        <Button size="sm" variant="destructive" onClick={() => setShowNewAction(true)}>
          <ShieldAlert className="h-3.5 w-3.5 mr-1" />Take Action
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("warnings")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === "warnings" ? "bg-white shadow text-gray-900" : "text-gray-600 hover:text-gray-900"}`}
        >
          <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />Warnings
        </button>
        <button
          onClick={() => setTab("suspensions")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === "suspensions" ? "bg-white shadow text-gray-900" : "text-gray-600 hover:text-gray-900"}`}
        >
          <Ban className="inline h-3.5 w-3.5 mr-1" />Suspensions & Bans
        </button>
      </div>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchData(); }} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Button type="submit" size="sm" className="h-10"><Filter className="h-3.5 w-3.5 mr-1" />Search</Button>
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
                  <th className="text-left p-3 font-medium text-gray-600">Reason</th>
                  {tab === "suspensions" && <th className="text-left p-3 font-medium text-gray-600 hidden md:table-cell">Type</th>}
                  <th className="text-left p-3 font-medium text-gray-600 hidden md:table-cell">Issued By</th>
                  <th className="text-left p-3 font-medium text-gray-600">Date</th>
                  {tab === "suspensions" && <th className="text-left p-3 font-medium text-gray-600">Status</th>}
                  <th className="text-right p-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: tab === "suspensions" ? 7 : 5 }).map((_, j) => <td key={j} className="p-3"><Skeleton className="h-5 w-20" /></td>)}
                    </tr>
                  ))
                ) : data.length === 0 ? (
                  <tr><td colSpan={tab === "suspensions" ? 7 : 5} className="p-8 text-center text-gray-500">
                    <ShieldAlert className="h-8 w-8 mx-auto mb-2 text-gray-300" />No {tab} found
                  </td></tr>
                ) : (
                  data.map((r) => {
                    const isActive = tab === "suspensions" && r.isActive && (!r.expiresAt || new Date(r.expiresAt) > new Date());
                    return (
                      <tr key={r.id} className="border-b hover:bg-gray-50/50 transition-colors">
                        <td className="p-3">
                          <div className="font-medium text-gray-900">{r.user?.name}</div>
                          <div className="text-xs text-muted-foreground">{r.user?.email}</div>
                        </td>
                        <td className="p-3 max-w-[240px] truncate text-gray-700">{r.warningMessage || r.reason}</td>
                        {tab === "suspensions" && (
                          <td className="p-3 hidden md:table-cell">
                            <Badge variant={!r.expiresAt ? "destructive" : "secondary"} className="text-[10px]">
                              {!r.expiresAt ? "BAN" : "TEMP"}
                            </Badge>
                          </td>
                        )}
                        <td className="p-3 hidden md:table-cell text-xs text-gray-600">{r.issuedBy?.name || r.suspendedBy?.name || "System"}</td>
                        <td className="p-3 text-xs text-gray-600">
                          {formatDate(r.issuedAt || r.suspendedAt || r.createdAt)}
                          {tab === "suspensions" && r.expiresAt && (
                            <div className="text-[10px] text-muted-foreground">Expires: {formatDate(r.expiresAt)}</div>
                          )}
                        </td>
                        {tab === "suspensions" && (
                          <td className="p-3">
                            <Badge variant={isActive ? "destructive" : "success"} className="text-[10px]">
                              {isActive ? "Active" : "Lifted"}
                            </Badge>
                          </td>
                        )}
                        <td className="p-3 text-right">
                          {tab === "suspensions" && isActive && (
                            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleReinstate(r.userId)} disabled={actionLoading}>
                              Reinstate
                            </Button>
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

      {/* New Action Modal */}
      {showNewAction && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center" onClick={() => setShowNewAction(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Take Enforcement Action</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowNewAction(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Target User *</Label>
                <Input placeholder="Search users..." value={userSearch} onChange={(e) => searchUsers(e.target.value)} />
                {userResults.length > 0 && (
                  <div className="border rounded-md mt-1 max-h-32 overflow-y-auto">
                    {userResults.map((u) => (
                      <button key={u.id} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={() => { setSelectedUser(u); setUserSearch(u.name + " (" + u.email + ")"); setUserResults([]); }}>
                        {u.name} — {u.email}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label>Action Type</Label>
                <div className="flex gap-2 mt-1">
                  {(["warn", "suspend", "ban"] as const).map((a) => (
                    <button
                      key={a}
                      onClick={() => setNewActionType(a)}
                      className={`flex-1 py-2 text-sm font-medium rounded-md border transition-colors ${newActionType === a
                        ? a === "ban" ? "bg-red-600 text-white border-red-600" : a === "suspend" ? "bg-orange-500 text-white border-orange-500" : "bg-yellow-500 text-white border-yellow-500"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                    >{a.charAt(0).toUpperCase() + a.slice(1)}</button>
                  ))}
                </div>
              </div>
              {newActionType === "suspend" && (
                <div>
                  <Label>Duration (days)</Label>
                  <Input type="number" min={1} value={actionForm.duration} onChange={(e) => setActionForm({ ...actionForm, duration: e.target.value })} />
                </div>
              )}
              <div>
                <Label>Reason *</Label>
                <textarea
                  className="w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                  value={actionForm.reason}
                  onChange={(e) => setActionForm({ ...actionForm, reason: e.target.value })}
                  placeholder="Describe the violation..."
                />
              </div>
              {newActionType === "ban" && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
                  <strong>Warning:</strong> Banning is permanent. The user will be permanently suspended and cannot access the platform.
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowNewAction(false)}>Cancel</Button>
              <Button size="sm" variant={newActionType === "ban" ? "destructive" : "default"} onClick={handleNewAction} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                {newActionType === "warn" ? "Issue Warning" : newActionType === "suspend" ? "Suspend User" : "Ban User"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
