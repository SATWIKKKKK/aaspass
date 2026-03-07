"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Megaphone, Plus, Search, Filter, Eye, Edit, Power, Loader2,
  Send, X, ChevronLeft, ChevronRight, Users, Mail, Bell, Monitor,
  Gift, AlertTriangle, TrendingUp, Percent, Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

const TYPE_OPTIONS = [
  { value: "OFFER", label: "Offer", icon: Gift, color: "bg-green-100 text-green-700" },
  { value: "UPDATE", label: "Update", icon: Info, color: "bg-blue-100 text-blue-700" },
  { value: "WARNING", label: "Warning", icon: AlertTriangle, color: "bg-orange-100 text-orange-700" },
  { value: "PROMOTION", label: "Promotion", icon: TrendingUp, color: "bg-purple-100 text-purple-700" },
  { value: "COMMISSION", label: "Commission Update", icon: Percent, color: "bg-cyan-100 text-cyan-700" },
];

const TARGET_OPTIONS = [
  { value: "ALL_USERS", label: "All Students" },
  { value: "ALL_OWNERS", label: "All Owners" },
  { value: "SELECTED_USERS", label: "Selected Students" },
  { value: "SELECTED_OWNERS", label: "Selected Owners" },
  { value: "ALL", label: "Everyone" },
];

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  targetType: string;
  reachCount: number;
  isActive: boolean;
  expiresAt: string | null;
  deliveryChannels: string[];
  createdAt: string;
  commissionValue: number | null;
}

export default function SuperAdminAnnouncementsPage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "UPDATE",
    targetType: "ALL",
    targetIds: [] as string[],
    deliveryChannels: ["notification"] as string[],
    expiresAt: "",
    commissionValue: "",
  });

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/superadmin/announcements?page=${page}&limit=15`);
      const data = await res.json();
      setAnnouncements(data.announcements || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch {
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const searchUsers = async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const roleFilter = form.targetType === "SELECTED_OWNERS" ? "OWNER" : "STUDENT";
      const res = await fetch(`/api/superadmin/users?search=${encodeURIComponent(q)}&role=${roleFilter}&limit=10`);
      const data = await res.json();
      setSearchResults(data.users || []);
    } catch {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const toggleChannel = (channel: string) => {
    setForm((f) => ({
      ...f,
      deliveryChannels: f.deliveryChannels.includes(channel)
        ? f.deliveryChannels.filter((c) => c !== channel)
        : [...f.deliveryChannels, channel],
    }));
  };

  const toggleTarget = (id: string) => {
    setForm((f) => ({
      ...f,
      targetIds: f.targetIds.includes(id) ? f.targetIds.filter((t) => t !== id) : [...f.targetIds, id],
    }));
  };

  const handleSend = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error("Title and message are required");
      return;
    }
    if ((form.targetType === "SELECTED_USERS" || form.targetType === "SELECTED_OWNERS") && form.targetIds.length === 0) {
      toast.error("Select at least one user");
      return;
    }
    if (form.type === "COMMISSION" && !form.commissionValue) {
      toast.error("Commission value required for commission updates");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/superadmin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          commissionValue: form.commissionValue ? parseFloat(form.commissionValue) : null,
          expiresAt: form.expiresAt || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Announcement sent to ${data.reachCount} users!`);
      setShowCreate(false);
      setForm({ title: "", message: "", type: "UPDATE", targetType: "ALL", targetIds: [], deliveryChannels: ["notification"], expiresAt: "", commissionValue: "" });
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await fetch("/api/superadmin/announcements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !isActive }),
      });
      toast.success(isActive ? "Deactivated" : "Activated");
      fetchAnnouncements();
    } catch {
      toast.error("Failed to update");
    }
  };

  const typeInfo = TYPE_OPTIONS.find((t) => t.value === form.type);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Announcements</h2>
          <p className="text-sm text-muted-foreground">Send platform-wide announcements</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />New Announcement
        </Button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-semibold">Create Announcement</h3>
              <button onClick={() => setShowCreate(false)} className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Title */}
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Announcement title..." />
              </div>

              {/* Message */}
              <div>
                <Label>Message</Label>
                <Textarea value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} placeholder="Write your announcement..." rows={4} />
              </div>

              {/* Type */}
              <div>
                <Label>Type</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {TYPE_OPTIONS.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setForm((f) => ({ ...f, type: t.value }))}
                      className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all", form.type === t.value ? t.color + " border-current" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100")}
                    >
                      <t.icon className="h-3 w-3 inline mr-1" />{t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Commission Value */}
              {form.type === "COMMISSION" && (
                <div>
                  <Label>New Commission Rate (%)</Label>
                  <Input type="number" min="0" max="100" step="0.5" value={form.commissionValue} onChange={(e) => setForm((f) => ({ ...f, commissionValue: e.target.value }))} placeholder="e.g. 12" />
                </div>
              )}

              {/* Target */}
              <div>
                <Label>Target Audience</Label>
                <select
                  value={form.targetType}
                  onChange={(e) => setForm((f) => ({ ...f, targetType: e.target.value, targetIds: [] }))}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm mt-1"
                >
                  {TARGET_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Selected Users Search */}
              {(form.targetType === "SELECTED_USERS" || form.targetType === "SELECTED_OWNERS") && (
                <div>
                  <Label>Search & Select {form.targetType === "SELECTED_OWNERS" ? "Owners" : "Students"}</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); searchUsers(e.target.value); }}
                      placeholder="Search by name or email..."
                      className="pl-9"
                    />
                  </div>
                  {searching && <p className="text-xs text-muted-foreground mt-1">Searching...</p>}
                  {searchResults.length > 0 && (
                    <div className="mt-2 border rounded-lg max-h-40 overflow-y-auto">
                      {searchResults.map((u: any) => (
                        <button
                          key={u.id}
                          onClick={() => toggleTarget(u.id)}
                          className={cn("w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 border-b last:border-0", form.targetIds.includes(u.id) && "bg-blue-50")}
                        >
                          <Checkbox checked={form.targetIds.includes(u.id)} />
                          <span className="font-medium">{u.name}</span>
                          <span className="text-xs text-muted-foreground">{u.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {form.targetIds.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">{form.targetIds.length} selected</p>
                  )}
                </div>
              )}

              {/* Delivery Channels */}
              <div>
                <Label>Delivery Channels</Label>
                <div className="flex flex-wrap gap-3 mt-2">
                  {[
                    { id: "notification", label: "In-App Notification", icon: Bell },
                    { id: "email", label: "Email", icon: Mail },
                    { id: "banner", label: "Dashboard Banner", icon: Monitor },
                  ].map((ch) => (
                    <label key={ch.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={form.deliveryChannels.includes(ch.id)}
                        onCheckedChange={() => toggleChannel(ch.id)}
                      />
                      <ch.icon className="h-3.5 w-3.5 text-gray-500" />
                      <span className="text-sm">{ch.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Expiry */}
              <div>
                <Label>Expiry Date (optional)</Label>
                <Input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} className="mt-1" />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-3">
              <Button variant="outline" onClick={() => setShowPreview(true)} className="gap-2">
                <Eye className="h-4 w-4" />Preview
              </Button>
              <Button onClick={handleSend} disabled={sending} className="flex-1 gap-2">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? "Sending..." : "Send Now"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowPreview(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h4 className="font-semibold text-gray-900 mb-1">Preview</h4>
            <div className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium mb-3", typeInfo?.color)}>
              {typeInfo && <typeInfo.icon className="h-3 w-3" />}{typeInfo?.label}
            </div>
            <div className="border rounded-lg p-4 bg-blue-50/50 border-blue-200">
              <p className="text-sm font-semibold text-gray-900">{form.title || "Announcement Title"}</p>
              <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{form.message || "Your message here..."}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Target: {TARGET_OPTIONS.find((t) => t.value === form.targetType)?.label}</p>
            <Button className="w-full mt-4" onClick={() => setShowPreview(false)}>Close Preview</Button>
          </div>
        </div>
      )}

      {/* Announcements List */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="text-left p-3 font-medium text-gray-600">Title</th>
                  <th className="text-left p-3 font-medium text-gray-600">Type</th>
                  <th className="text-left p-3 font-medium text-gray-600 hidden md:table-cell">Target</th>
                  <th className="text-left p-3 font-medium text-gray-600 hidden md:table-cell">Reach</th>
                  <th className="text-left p-3 font-medium text-gray-600 hidden lg:table-cell">Channels</th>
                  <th className="text-left p-3 font-medium text-gray-600">Status</th>
                  <th className="text-left p-3 font-medium text-gray-600 hidden lg:table-cell">Date</th>
                  <th className="text-right p-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="p-3"><Skeleton className="h-5 w-20" /></td>
                      ))}
                    </tr>
                  ))
                ) : announcements.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-gray-500"><Megaphone className="h-8 w-8 mx-auto mb-2 text-gray-300" />No announcements yet</td></tr>
                ) : (
                  announcements.map((a) => {
                    const tInfo = TYPE_OPTIONS.find((t) => t.value === a.type);
                    const isExpired = a.expiresAt && new Date(a.expiresAt) < new Date();
                    return (
                      <tr key={a.id} className="border-b hover:bg-gray-50/50 transition-colors">
                        <td className="p-3">
                          <p className="font-medium text-gray-900 truncate max-w-[200px]">{a.title}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{a.message.substring(0, 60)}...</p>
                        </td>
                        <td className="p-3">
                          <Badge className={cn("text-[10px]", tInfo?.color)}>{tInfo?.label || a.type}</Badge>
                        </td>
                        <td className="p-3 hidden md:table-cell text-gray-600 text-xs">
                          {TARGET_OPTIONS.find((t) => t.value === a.targetType)?.label || a.targetType}
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <Badge variant="secondary" className="text-[10px]">
                            <Users className="h-2.5 w-2.5 mr-0.5" />{a.reachCount}
                          </Badge>
                        </td>
                        <td className="p-3 hidden lg:table-cell">
                          <div className="flex gap-1">
                            {a.deliveryChannels.includes("notification") && <Bell className="h-3.5 w-3.5 text-blue-500" />}
                            {a.deliveryChannels.includes("email") && <Mail className="h-3.5 w-3.5 text-green-500" />}
                            {a.deliveryChannels.includes("banner") && <Monitor className="h-3.5 w-3.5 text-purple-500" />}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant={!a.isActive || isExpired ? "secondary" : "success"} className="text-[10px]">
                            {!a.isActive ? "Inactive" : isExpired ? "Expired" : "Active"}
                          </Badge>
                        </td>
                        <td className="p-3 hidden lg:table-cell text-gray-600 text-xs">{formatDate(a.createdAt)}</td>
                        <td className="p-3 text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(a.id, a.isActive)} title={a.isActive ? "Deactivate" : "Activate"}>
                            <Power className={cn("h-3.5 w-3.5", a.isActive ? "text-green-500" : "text-gray-400")} />
                          </Button>
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
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
