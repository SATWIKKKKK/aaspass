"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, Filter, ChevronLeft, ChevronRight, ScrollText, Download,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  SUSPEND: "bg-orange-100 text-orange-700",
  REINSTATE: "bg-teal-100 text-teal-700",
  WARN: "bg-yellow-100 text-yellow-700",
  BAN: "bg-red-200 text-red-800",
  GRANT_PREMIUM: "bg-purple-100 text-purple-700",
  REVOKE_PREMIUM: "bg-purple-100 text-purple-700",
  LOGIN: "bg-gray-100 text-gray-700",
  LOGOUT: "bg-gray-100 text-gray-700",
};

export default function SuperAdminAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionType, setActionType] = useState("");
  const [targetType, setTargetType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "25" });
    if (search) params.set("search", search);
    if (actionType) params.set("actionType", actionType);
    if (targetType) params.set("targetType", targetType);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    try {
      const res = await fetch(`/api/superadmin/audit?${params}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch {
      toast.error("Failed to fetch audit logs");
    } finally {
      setLoading(false);
    }
  }, [page, search, actionType, targetType, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ["Date", "Action", "Target", "Target ID", "Admin", "Details"];
    const rows = logs.map((l: any) => [
      new Date(l.createdAt).toISOString(),
      l.actionType,
      l.targetType || "",
      l.targetId || "",
      l.superadmin?.email || "",
      l.reason || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Audit Logs</h2>
          <p className="text-sm text-muted-foreground">{total.toLocaleString()} log entries — immutable record</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={logs.length === 0}>
          <Download className="h-3.5 w-3.5 mr-1" />Export CSV
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchLogs(); }} className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search by admin, target ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <select value={actionType} onChange={(e) => { setActionType(e.target.value); setPage(1); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="SUSPEND">Suspend</option>
              <option value="REINSTATE">Reinstate</option>
              <option value="WARN">Warn</option>
              <option value="BAN">Ban</option>
              <option value="GRANT_PREMIUM">Grant Premium</option>
              <option value="REVOKE_PREMIUM">Revoke Premium</option>
              <option value="LOGIN">Login</option>
            </select>
            <select value={targetType} onChange={(e) => { setTargetType(e.target.value); setPage(1); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">All Targets</option>
              <option value="USER">User</option>
              <option value="PROPERTY">Property</option>
              <option value="BOOKING">Booking</option>
              <option value="REVIEW">Review</option>
              <option value="OFFER">Offer</option>
              <option value="PREMIUM">Premium</option>
              <option value="SUPERADMIN">SuperAdmin</option>
            </select>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36 h-10" placeholder="From" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36 h-10" placeholder="To" />
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
                  <th className="text-left p-3 font-medium text-gray-600">Timestamp</th>
                  <th className="text-left p-3 font-medium text-gray-600">Action</th>
                  <th className="text-left p-3 font-medium text-gray-600">Target</th>
                  <th className="text-left p-3 font-medium text-gray-600 hidden md:table-cell">Admin</th>
                  <th className="text-left p-3 font-medium text-gray-600">Reason</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 12 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 5 }).map((_, j) => <td key={j} className="p-3"><Skeleton className="h-5 w-24" /></td>)}
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500"><ScrollText className="h-8 w-8 mx-auto mb-2 text-gray-300" />No audit logs found</td></tr>
                ) : (
                  logs.map((l) => (
                    <tr key={l.id} className="border-b hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setExpandedLog(expandedLog === l.id ? null : l.id)}>
                      <td className="p-3 text-xs text-gray-600 whitespace-nowrap">{formatDate(l.createdAt)}</td>
                      <td className="p-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${ACTION_COLORS[l.actionType] || "bg-gray-100 text-gray-700"}`}>
                          {l.actionType}
                        </span>
                      </td>
                      <td className="p-3">
                        {l.targetType && <Badge variant="secondary" className="text-[10px] mr-1">{l.targetType}</Badge>}
                        <span className="text-xs font-mono text-gray-500">{l.targetId?.slice(0, 8)}</span>
                      </td>
                      <td className="p-3 hidden md:table-cell text-xs text-gray-600">{l.superadmin?.email}</td>
                      <td className="p-3 text-xs text-gray-600 max-w-[200px] truncate">{l.reason || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Expanded log detail */}
            {expandedLog && (() => {
              const l = logs.find((x) => x.id === expandedLog);
              if (!l) return null;
              return (
                <div className="border-t bg-gray-50 p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Full Action</p>
                      <p className="font-medium">{l.actionType} on {l.targetType || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Target ID</p>
                      <p className="font-mono text-xs">{l.targetId || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Admin</p>
                      <p>{l.superadmin?.name} ({l.superadmin?.email})</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Target Name</p>
                      <p>{l.targetName || "—"}</p>
                    </div>
                  </div>
                  {l.reason && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Reason</p>
                      <p className="text-sm">{l.reason}</p>
                    </div>
                  )}
                  {(l.beforeValue || l.afterValue) && (
                    <div className="grid grid-cols-2 gap-4">
                      {l.beforeValue && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Before</p>
                          <pre className="text-xs bg-white rounded p-2 border overflow-auto max-h-40">{typeof l.beforeValue === 'string' ? l.beforeValue : JSON.stringify(l.beforeValue, null, 2)}</pre>
                        </div>
                      )}
                      {l.afterValue && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">After</p>
                          <pre className="text-xs bg-white rounded p-2 border overflow-auto max-h-40">{typeof l.afterValue === 'string' ? l.afterValue : JSON.stringify(l.afterValue, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
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
