"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Crown, ShieldAlert, Ban, Undo2, Trash2, Star,
  CalendarCheck, Gift, Edit, Loader2, User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import toast from "react-hot-toast";

export default function SuperAdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");

  // Modal states
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendDays, setSuspendDays] = useState("");
  const [premiumExpiry, setPremiumExpiry] = useState("");
  const [premiumLifetime, setPremiumLifetime] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");

  useEffect(() => {
    fetch(`/api/superadmin/users/${id}`)
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => toast.error("Failed to load user"))
      .finally(() => setLoading(false));
  }, [id]);

  const performAction = async (action: string, body: any = {}) => {
    setActionLoading(action);
    try {
      const res = await fetch(`/api/superadmin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message || "Action completed");
      // Refresh user data
      const r = await fetch(`/api/superadmin/users/${id}`);
      const d = await r.json();
      setUser(d.user);
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    } finally {
      setActionLoading("");
      setShowWarningModal(false);
      setShowSuspendModal(false);
      setShowPremiumModal(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <p className="text-red-500">User not found</p>;
  }

  return (
    <div className="space-y-4">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowPremiumModal(true)}>
            <Crown className="h-3.5 w-3.5" />{user.isPremium ? "Revoke Premium" : "Grant Premium"}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowWarningModal(true)}>
            <ShieldAlert className="h-3.5 w-3.5" />Warn
          </Button>
          {user.isBlocked ? (
            <Button size="sm" variant="outline" className="gap-1.5 text-green-600" onClick={() => performAction("reinstate")}>
              <Undo2 className="h-3.5 w-3.5" />Reinstate
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="gap-1.5 text-red-600" onClick={() => setShowSuspendModal(true)}>
              <Ban className="h-3.5 w-3.5" />Suspend
            </Button>
          )}
          <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => setShowDeleteModal(true)}>
            <Trash2 className="h-3.5 w-3.5" />Delete
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profile Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{user.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{user.email}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="font-medium">{user.phone || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Gender</span><span className="font-medium">{user.gender || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Aadhar</span><span className="font-medium">{user.aadharNo || "—"}</span></div>
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">Role</span><Badge variant="outline" className="text-[10px]">{user.role}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span>
              <Badge variant={user.isBlocked ? "destructive" : "success"} className="text-[10px]">
                {user.isBlocked ? "Suspended" : "Active"}
              </Badge>
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">Plan</span>
              {user.isPremium ? (
                <Badge className="bg-yellow-100 text-yellow-700 text-[10px]"><Crown className="h-2.5 w-2.5 mr-0.5" />Premium</Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px]">Free</Badge>
              )}
            </div>
            {user.premiumExpiry && (
              <div className="flex justify-between"><span className="text-muted-foreground">Premium Expires</span><span className="text-xs">{formatDate(user.premiumExpiry)}</span></div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">Super Coins</span><span className="font-medium">{user.superCoins}</span></div>
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">Joined</span><span className="text-xs">{formatDate(user.createdAt)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Last Active</span><span className="text-xs">{formatDate(user.updatedAt)}</span></div>
          </CardContent>
        </Card>

        {/* Activity Summary + Bookings */}
        <div className="lg:col-span-2 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{user._count.bookings}</p>
                <p className="text-xs text-muted-foreground">Bookings</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{user._count.reviews}</p>
                <p className="text-xs text-muted-foreground">Reviews</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{user._count.wishlist}</p>
                <p className="text-xs text-muted-foreground">Wishlist</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{user._count.cart}</p>
                <p className="text-xs text-muted-foreground">Cart</p>
              </CardContent>
            </Card>
          </div>

          {/* Bookings Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Booking History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50/50">
                      <th className="text-left p-3 font-medium text-gray-600">Service</th>
                      <th className="text-left p-3 font-medium text-gray-600">Date</th>
                      <th className="text-left p-3 font-medium text-gray-600">Amount</th>
                      <th className="text-left p-3 font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.bookings.length === 0 ? (
                      <tr><td colSpan={4} className="p-4 text-center text-gray-400">No bookings</td></tr>
                    ) : (
                      user.bookings.slice(0, 20).map((b: any) => (
                        <tr key={b.id} className="border-b last:border-0">
                          <td className="p-3 font-medium text-gray-900">{b.property?.name || "—"}</td>
                          <td className="p-3 text-gray-600 text-xs">{formatDate(b.createdAt)}</td>
                          <td className="p-3 text-gray-900">{formatPrice(b.grandTotal)}</td>
                          <td className="p-3">
                            <Badge variant={["ACTIVE", "CONFIRMED"].includes(b.status) ? "success" : b.status === "CANCELLED" ? "destructive" : "secondary"} className="text-[10px]">
                              {b.status}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Reviews */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Reviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {user.reviews.length === 0 ? (
                <p className="text-sm text-gray-400">No reviews</p>
              ) : (
                user.reviews.map((r: any) => (
                  <div key={r.id} className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{r.property?.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />)}
                      </div>
                      {r.comment && <p className="text-xs text-gray-600 mt-1">{r.comment}</p>}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{formatDate(r.createdAt)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Warnings */}
          {user.warnings.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-red-600">Warnings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {user.warnings.map((w: any) => (
                  <div key={w.id} className="bg-red-50 rounded-lg p-3">
                    <p className="text-sm text-red-800">{w.warningMessage}</p>
                    <p className="text-[10px] text-red-600 mt-1">Issued by {w.issuedBy.name} · {formatDate(w.issuedAt)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Offers */}
          {user.personalizedOffers.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Personalized Offers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {user.personalizedOffers.map((o: any) => (
                  <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{o.title}</p>
                      <p className="text-xs text-muted-foreground">{o.discountType === "percentage" ? `${o.discountValue}% off` : `₹${o.discountValue} off`} · Expires {formatDate(o.expiryDate)}</p>
                    </div>
                    <Badge variant={o.isActive && new Date(o.expiryDate) > new Date() ? "success" : "secondary"} className="text-[10px]">
                      {o.isUsed ? "Used" : o.revokedAt ? "Revoked" : new Date(o.expiryDate) < new Date() ? "Expired" : "Active"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ─── MODALS ─── */}

      {/* Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold mb-4">Issue Warning</h3>
            <Label>Warning Message</Label>
            <textarea
              value={warningMessage}
              onChange={(e) => setWarningMessage(e.target.value)}
              className="w-full border rounded-lg p-3 mt-1 text-sm min-h-[100px] resize-none"
              placeholder="Describe the warning..."
            />
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowWarningModal(false)} className="flex-1">Cancel</Button>
              <Button
                onClick={() => performAction("warn", { warningMessage })}
                disabled={!warningMessage || actionLoading === "warn"}
                className="flex-1"
              >
                {actionLoading === "warn" && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Issue Warning
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Suspend Account</h3>
            <div className="space-y-3">
              <div>
                <Label>Reason</Label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  className="w-full border rounded-lg p-3 mt-1 text-sm min-h-[80px] resize-none"
                  placeholder="Reason for suspension..."
                />
              </div>
              <div>
                <Label>Duration (days, leave empty for permanent)</Label>
                <Input
                  type="number"
                  value={suspendDays}
                  onChange={(e) => setSuspendDays(e.target.value)}
                  placeholder="e.g. 7"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowSuspendModal(false)} className="flex-1">Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => {
                  const expiresAt = suspendDays
                    ? new Date(Date.now() + parseInt(suspendDays) * 24 * 60 * 60 * 1000).toISOString()
                    : null;
                  performAction("suspend", { reason: suspendReason, expiresAt });
                }}
                disabled={!suspendReason || actionLoading === "suspend"}
                className="flex-1"
              >
                {actionLoading === "suspend" && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Suspend
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Modal */}
      {showPremiumModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold mb-4">
              {user.isPremium ? "Revoke Premium" : "Grant Premium"}
            </h3>
            {user.isPremium ? (
              <p className="text-sm text-gray-600 mb-4">
                This will immediately remove premium status from this user.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={premiumLifetime}
                    onChange={(e) => setPremiumLifetime(e.target.checked)}
                    id="lifetime"
                    className="rounded"
                  />
                  <Label htmlFor="lifetime">Lifetime Premium</Label>
                </div>
                {!premiumLifetime && (
                  <div>
                    <Label>Expiry Date</Label>
                    <Input
                      type="date"
                      value={premiumExpiry}
                      onChange={(e) => setPremiumExpiry(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowPremiumModal(false)} className="flex-1">Cancel</Button>
              <Button
                onClick={() => {
                  if (user.isPremium) {
                    performAction("revoke-premium");
                  } else {
                    const expiryDate = premiumLifetime ? null : premiumExpiry || null;
                    performAction("grant-premium", { expiryDate });
                  }
                }}
                disabled={actionLoading === "grant-premium" || actionLoading === "revoke-premium"}
                className="flex-1"
              >
                {(actionLoading === "grant-premium" || actionLoading === "revoke-premium") && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {user.isPremium ? "Revoke" : "Grant"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold mb-2 text-red-600">Permanently Delete Account</h3>
            <p className="text-sm text-gray-600 mb-4">
              This action will soft-delete the user account. Type <strong>DELETE</strong> to confirm.
            </p>
            <div className="space-y-3">
              <div>
                <Label>Reason</Label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full border rounded-lg p-3 mt-1 text-sm min-h-[60px] resize-none"
                  placeholder="Reason for deletion..."
                />
              </div>
              <div>
                <Label>Confirmation</Label>
                <Input
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder='Type "DELETE"'
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)} className="flex-1">Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => performAction("delete", { reason: deleteReason })}
                disabled={deleteConfirm !== "DELETE" || !deleteReason || actionLoading === "delete"}
                className="flex-1"
              >
                {actionLoading === "delete" && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
