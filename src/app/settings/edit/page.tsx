"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { User, Mail, Phone, Shield, Key, Save, Loader2, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function EditProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", aadharNo: "", gender: "MALE" });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/profile").then((r) => r.json()).then((data) => {
      setForm({ name: data.name || "", email: data.email || "", phone: data.phone || "", aadharNo: data.aadharNo || "", gender: data.gender || "MALE" });
    }).catch(() => toast.error("Failed to load profile")).finally(() => setLoading(false));
  }, [status]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body: any = { name: form.name, phone: form.phone, aadharNo: form.aadharNo, gender: form.gender };
      if (passwords.newPassword) {
        if (passwords.newPassword !== passwords.confirmPassword) { toast.error("Passwords don't match"); setSaving(false); return; }
        if (passwords.newPassword.length < 6) { toast.error("Password must be 6+ characters"); setSaving(false); return; }
        body.currentPassword = passwords.currentPassword;
        body.newPassword = passwords.newPassword;
      }
      const res = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) { toast.success("Profile updated!"); setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" }); }
      else toast.error(data.error || "Failed to update");
    } catch { toast.error("Failed to update"); }
    finally { setSaving(false); }
  };

  if (status === "loading" || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar variant={(session?.user as any)?.role === "OWNER" ? "admin" : "student"} />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href={(session?.user as any)?.role === "OWNER" ? "/admin/dashboard" : "/dashboard"} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-4"><ChevronLeft className="h-4 w-4" /> Back</Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Profile</h1>

        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Personal Information</CardTitle><CardDescription>Update your account details</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Full Name</Label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} disabled className="bg-gray-50" /><p className="text-xs text-gray-400 mt-1">Email cannot be changed</p></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} /></div>
              <div><Label>Gender</Label><select value={form.gender} onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))} className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm"><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></select></div>
              <div><Label>Aadhar Number</Label><Input value={form.aadharNo} onChange={(e) => setForm((p) => ({ ...p, aadharNo: e.target.value }))} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" />Change Password</CardTitle><CardDescription>Leave blank to keep current password</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Current Password</Label><Input type="password" value={passwords.currentPassword} onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))} placeholder="Enter current password" /></div>
              <div><Label>New Password</Label><Input type="password" value={passwords.newPassword} onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))} placeholder="Min 6 characters" /></div>
              <div><Label>Confirm New Password</Label><Input type="password" value={passwords.confirmPassword} onChange={(e) => setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))} placeholder="Repeat new password" /></div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={saving}>{saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save Changes</>}</Button>
        </form>
      </div>
      <Footer />
    </div>
  );
}
