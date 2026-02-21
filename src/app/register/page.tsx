"use client";

import { Suspense } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import { Eye, EyeOff, Loader2, ArrowRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface RegisterFormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  aadharNo: string;
  gender: string;
  role: string;
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get("role") || "STUDENT";
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [form, setForm] = useState<RegisterFormData>({
    name: "", email: "", phone: "", password: "", confirmPassword: "",
    aadharNo: "", gender: "MALE", role,
  });

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
        const signInResult = await signIn("credentials", {
          email: form.email,
          password: form.password,
          redirect: false,
        });
        if (signInResult?.error) {
          toast.error("Account created but login failed. Please sign in manually.");
          router.push("/login");
        } else {
          router.push("/");
          router.refresh();
        }
      }
    } catch {
      toast.error("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch {
      toast.error("Google sign-up failed");
      setGoogleLoading(false);
    }
  };

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Side - Brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/5 to-primary/10 items-center justify-center p-12">
        <div className="text-center">
          <h1 className="text-7xl font-black tracking-tight text-primary mb-4">
            Aas<span className="text-premium">Pass</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-md">
            Get all the services to make it feel like your home
          </p>
          <div className="mt-12 grid grid-cols-2 gap-4 max-w-sm mx-auto">
            {["Hostels", "PG", "Libraries", "Coaching", "Mess", "Laundry"].map((service) => (
              <div key={service} className="bg-white/80 rounded-lg p-3 text-sm font-medium text-gray-700 shadow-sm">
                {service}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Register Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-4xl font-black tracking-tight text-primary">
              Aas<span className="text-premium">Pass</span>
            </h1>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
              <CardDescription>
                Join as a {role === "OWNER" ? "Property Owner" : "Student"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Google Sign Up */}
              <Button
                variant="outline"
                className="w-full mb-4 h-11 gap-3"
                onClick={handleGoogleSignUp}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
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
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-500">Or continue with email</span></div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button type="button" onClick={() => setForm((p) => ({ ...p, role: "STUDENT" }))}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${form.role === "STUDENT" ? "border-primary bg-primary/5 text-primary" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                    Student
                  </button>
                  <button type="button" onClick={() => setForm((p) => ({ ...p, role: "OWNER" }))}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${form.role === "OWNER" ? "border-primary bg-primary/5 text-primary" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                    <Building2 className="h-4 w-4 inline mr-1" />Owner
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Full Name</Label><Input placeholder="John Doe" value={form.name} onChange={update("name")} required /></div>
                  <div><Label>Phone</Label><Input placeholder="9876543210" value={form.phone} onChange={update("phone")} required /></div>
                </div>
                <div><Label>Email</Label><Input type="email" placeholder="you@example.com" value={form.email} onChange={update("email")} required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Gender</Label>
                    <select value={form.gender} onChange={update("gender")} className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm">
                      <option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div><Label>Aadhar No.</Label><Input placeholder="1234-5678-9012" value={form.aadharNo} onChange={update("aadharNo")} /></div>
                </div>
                <div className="relative">
                  <Label>Password</Label>
                  <Input type={showPassword ? "text" : "password"} placeholder="Min 6 characters" value={form.password} onChange={update("password")} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-gray-400">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div><Label>Confirm Password</Label><Input type="password" placeholder="Repeat password" value={form.confirmPassword} onChange={update("confirmPassword")} required /></div>
                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : <>Create Account <ArrowRight className="h-4 w-4 ml-1" /></>}
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
      <RegisterForm />
    </Suspense>
  );
}
