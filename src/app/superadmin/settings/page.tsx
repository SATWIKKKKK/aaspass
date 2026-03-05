"use client";

import { useState, useEffect } from "react";
import {
  Shield, Plus, Loader2, X, Eye, EyeOff, UserCog, KeyRound,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

export default function SuperAdminSettingsPage() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [showPwCurrent, setShowPwCurrent] = useState(false);
  const [showPwNew, setShowPwNew] = useState(false);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/settings");
      const data = await res.json();
      setAdmins(data.admins || []);
    } catch {
      toast.error("Failed to fetch admins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) {
      toast.error("All fields are required");
      return;
    }
    if (form.password.length < 12) {
      toast.error("Password must be at least 12 characters");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setCreateLoading(true);
    try {
      const res = await fetch("/api/superadmin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Admin account created");
      setShowCreate(false);
      setForm({ name: "", email: "", password: "", confirmPassword: "" });
      fetchAdmins();
    } catch (err: any) {
      toast.error(err.message || "Failed to create admin");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) {
      toast.error("All password fields are required");
      return;
    }
    if (pwForm.newPassword.length < 12) {
      toast.error("New password must be at least 12 characters");
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmNewPassword) {
      toast.error("New passwords don't match");
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch("/api/superadmin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Password changed successfully");
      setPwForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-muted-foreground">Manage super admin accounts</p>
      </div>

      {/* Admins List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <UserCog className="h-4 w-4" />Super Admin Accounts
          </CardTitle>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />Add Admin
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : admins.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No admin accounts found</p>
          ) : (
            <div className="space-y-3">
              {admins.map((admin) => (
                <div key={admin.id} className="flex items-center justify-between p-4 rounded-lg border bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{admin.name}</p>
                      <p className="text-xs text-muted-foreground">{admin.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={admin.isActive ? "success" : "secondary"} className="text-[10px]">
                      {admin.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Last login: {admin.lastLogin ? formatDate(admin.lastLogin) : "Never"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <KeyRound className="h-4 w-4" />Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Current Password *</Label>
            <div className="relative">
              <Input
                type={showPwCurrent ? "text" : "password"}
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                placeholder="Enter current password"
                className="pr-10"
              />
              <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPwCurrent(!showPwCurrent)}>
                {showPwCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div>
            <Label>New Password * (min 12 characters)</Label>
            <div className="relative">
              <Input
                type={showPwNew ? "text" : "password"}
                value={pwForm.newPassword}
                onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                placeholder="Enter new password"
                className="pr-10"
              />
              <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPwNew(!showPwNew)}>
                {showPwNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {pwForm.newPassword && pwForm.newPassword.length < 12 && (
              <p className="text-[10px] text-red-500 mt-1">Must be at least 12 characters</p>
            )}
          </div>
          <div>
            <Label>Confirm New Password *</Label>
            <Input
              type="password"
              value={pwForm.confirmNewPassword}
              onChange={(e) => setPwForm({ ...pwForm, confirmNewPassword: e.target.value })}
              placeholder="Confirm new password"
            />
            {pwForm.confirmNewPassword && pwForm.newPassword !== pwForm.confirmNewPassword && (
              <p className="text-[10px] text-red-500 mt-1">Passwords don&apos;t match</p>
            )}
          </div>
          <div className="flex justify-end pt-1">
            <Button size="sm" onClick={handleChangePassword} disabled={pwLoading}>
              {pwLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <KeyRound className="h-3.5 w-3.5 mr-1" />}
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Security Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
            <span>Session Duration</span>
            <span className="font-medium text-gray-900">2 hours</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
            <span>Rate Limit</span>
            <span className="font-medium text-gray-900">5 failed attempts → 15min lockout</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
            <span>Password Hashing</span>
            <span className="font-medium text-gray-900">bcrypt (12 rounds)</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
            <span>JWT Token</span>
            <span className="font-medium text-gray-900">httpOnly cookie, secure, sameSite strict</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
            <span>All Actions</span>
            <span className="font-medium text-gray-900">Immutably audit-logged</span>
          </div>
        </CardContent>
      </Card>

      {/* Create Admin Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Super Admin</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Admin Name" />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="admin@aaspass.com" />
              </div>
              <div>
                <Label>Password * (min 12 chars)</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Strong password..."
                    className="pr-10"
                  />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {form.password && form.password.length < 12 && (
                  <p className="text-[10px] text-red-500 mt-1">Must be at least 12 characters</p>
                )}
              </div>
              <div>
                <Label>Confirm Password *</Label>
                <Input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  placeholder="Confirm password..."
                />
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-[10px] text-red-500 mt-1">Passwords don&apos;t match</p>
                )}
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-700 mt-4">
              <strong>Important:</strong> Super admin accounts have full platform control. Only create accounts for verified administrators.
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate} disabled={createLoading}>
                {createLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Create Admin
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
