"use client";

import { Suspense, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import {
  Eye, EyeOff, Loader2, ArrowRight, Building2, GraduationCap, Camera, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface FormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  aadharNo: string;
  gender: string;
  role: string;
  image: string;
}

function RegisterFormInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    name: "", email: "", phone: "", password: "", confirmPassword: "",
    aadharNo: "", gender: "MALE", role: searchParams.get("role") || "STUDENT", image: "",
  });

  const handleRoleChange = (newRole: string) => {
    setForm((p) => ({ ...p, role: newRole }));
    router.replace(`/register?role=${newRole}`, { scroll: false });
  };

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please upload a JPEG, PNG or WebP image"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Photo must be under 2 MB"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = e.target?.result as string;
      setPhotoPreview(b64);
      setForm((p) => ({ ...p, image: b64 }));
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    const f = e.dataTransfer.files[0]; if (f) processFile(f);
  }, [processFile]);

  const removePhoto = () => {
    setPhotoPreview(null);
    setForm((p) => ({ ...p, image: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { toast.error("Passwords don't match"); return; }
    if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Registration failed");
      } else {
        toast.success("Account created! Signing you in...");
        const result = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
        if (result?.error) {
          toast.error("Account created but login failed. Please sign in manually.");
          router.push("/login");
        } else {
          router.push(form.role === "OWNER" ? "/admin/dashboard" : "/dashboard");
          router.refresh();
        }
      }
    } catch {
      toast.error("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try { await signIn("google", { callbackUrl: "/auth/redirect" }); }
    catch { toast.error("Google sign-up failed"); setGoogleLoading(false); }
  };

  const isOwner = form.role === "OWNER";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      {/* Single outer rounded card containing both branding + form */}
      <div className="w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row bg-white">

        {/* Left — AasPass branding, perfectly centred */}
        <div className="lg:w-5/12 bg-linear-to-br from-primary/8 to-primary/15 flex items-center justify-center px-10 py-14 lg:py-0">
          <div className="text-center">
            <Link href="/home" className="inline-block group">
              <h1 className="text-6xl font-black tracking-tight text-primary leading-none mb-4 group-hover:opacity-80 transition-opacity">
                Aas<span className="text-premium">Pass</span>
              </h1>
            </Link>
            <p className="text-base text-gray-500 max-w-xs leading-relaxed">
              Get all the services to make it feel like your home
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
              <span className="h-px w-10 bg-gray-300" />
              <span>Trusted by students across India</span>
              <span className="h-px w-10 bg-gray-300" />
            </div>
          </div>
        </div>

        {/* Right — form */}
        <div className="lg:w-7/12 overflow-y-auto px-6 sm:px-10 py-8">
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-3 space-y-1 px-0">
              <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
              <CardDescription>
                Join as a {isOwner ? "Property Owner" : "Student"}
              </CardDescription>
            </CardHeader>

            <CardContent className="px-0 pb-6">
              {/* Role toggle */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <button type="button" onClick={() => handleRoleChange("STUDENT")}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                    !isOwner ? "border-primary bg-primary/5 text-primary" : "border-gray-100 text-gray-500 hover:border-gray-200"
                  }`}>
                  <GraduationCap className="h-4 w-4" />Student
                </button>
                <button type="button" onClick={() => handleRoleChange("OWNER")}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                    isOwner ? "border-primary bg-primary/5 text-primary" : "border-gray-100 text-gray-500 hover:border-gray-200"
                  }`}>
                  <Building2 className="h-4 w-4" />Owner
                </button>
              </div>

              {/* Google sign-up */}
              <Button variant="outline" className="w-full mb-4 h-11 gap-3" onClick={handleGoogle} disabled={googleLoading}>
                {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                Continue with Google
              </Button>

              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or continue with email</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Row 1: Full Name */}
                <div>
                  <Label>Full Name <span className="text-red-500">*</span></Label>
                  <Input placeholder="John Doe" value={form.name} onChange={update("name")} required />
                </div>

                {/* Row 2: Phone + Gender */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Phone <span className="text-red-500">*</span></Label>
                    <Input placeholder="9876543210" value={form.phone} onChange={update("phone")} required />
                  </div>
                  <div>
                    <Label>Gender <span className="text-red-500">*</span></Label>
                    <select value={form.gender} onChange={update("gender")} required
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30">
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                {/* Rows 3-4: Email + Aadhar (left) | Profile Photo spanning both (right) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                  <div className="space-y-4">
                    <div>
                      <Label>Email <span className="text-red-500">*</span></Label>
                      <Input type="email" placeholder="you@example.com" value={form.email} onChange={update("email")} required />
                    </div>
                    <div>
                      <Label>Aadhar No <span className="text-xs text-gray-400">(optional)</span></Label>
                      <Input placeholder="1234-5678-9012" value={form.aadharNo} onChange={update("aadharNo")} />
                    </div>
                  </div>

                  {/* Profile Photo */}
                  <div className="flex flex-col gap-1">
                    <Label>Profile Photo <span className="text-xs text-gray-400">(optional)</span></Label>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
                    {photoPreview ? (
                      <div className="relative rounded-xl overflow-hidden border-2 border-primary/20" style={{ height: "110px" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photoPreview} alt="Profile preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={removePhoto}
                          className="absolute top-1 right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        style={{ height: "110px" }}
                        className={`rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition-all text-center px-2 select-none ${
                          isDragOver ? "border-primary bg-primary/5" : "border-gray-200 hover:border-primary/50 hover:bg-gray-50"
                        }`}
                      >
                        <Camera className="h-5 w-5 text-gray-400" />
                        <span className="text-[11px] text-gray-500 leading-tight">Drag &amp; drop<br />or click</span>
                        <span className="text-[10px] text-gray-400">JPEG · PNG · WebP &lt;2 MB</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 5: Password */}
                <div className="relative">
                  <Label>Password <span className="text-red-500">*</span></Label>
                  <Input type={showPassword ? "text" : "password"} placeholder="Min 6 characters" value={form.password} onChange={update("password")} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-gray-400">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Row 6: Confirm Password */}
                <div className="relative">
                  <Label>Confirm Password <span className="text-red-500">*</span></Label>
                  <Input type={showConfirm ? "text" : "password"} placeholder="Repeat password" value={form.confirmPassword} onChange={update("confirmPassword")} required />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-9 text-gray-400">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <Button type="submit" className="w-full h-10" disabled={loading}>
                  {loading
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
                    : <>Create Account <ArrowRight className="h-4 w-4 ml-1" /></>}
                </Button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-4">
                Already have an account?{" "}
                <Link href="/login" className="text-primary font-medium hover:underline">Sign In</Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <RegisterFormInner />
    </Suspense>
  );
}
