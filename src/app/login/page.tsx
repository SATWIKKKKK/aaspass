"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Welcome back!");
        try {
          const profileRes = await fetch("/api/profile");
          const profileData = await profileRes.json();
          const role = profileData?.user?.role;
          if (role === "OWNER" || role === "ADMIN") {
            router.push("/admin/dashboard");
          } else {
            router.push("/dashboard");
          }
        } catch {
          router.push("/dashboard");
        }
        router.refresh();
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try { await signIn("google", { callbackUrl: "/auth/redirect" }); }
    catch { toast.error("Google sign-in failed"); setGoogleLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row bg-white">

        {/* Left — AasPass branding */}
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
        <div className="lg:w-7/12 px-6 sm:px-10 py-10">
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-4 space-y-1 px-0">
              <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
              <CardDescription>Enter your credentials to access your account</CardDescription>
            </CardHeader>

            <CardContent className="px-0 pb-0">
              {/* Google */}
              <Button variant="outline" className="w-full h-11 gap-3 mb-4" onClick={handleGoogle} disabled={googleLoading}>
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

              <div className="relative mb-5">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or continue with email</span>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                  <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
                  {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" {...register("password")} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
                </div>

                <Button type="submit" className="w-full h-10" disabled={isLoading}>
                  {isLoading
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing in...</>
                    : <>Sign In <ArrowRight className="h-4 w-4 ml-1" /></>}
                </Button>
              </form>

              <div className="text-sm text-center text-gray-500 mt-5 space-y-1.5">
                <p>
                  New to AasPass?{" "}
                  <Link href="/register?role=STUDENT" className="text-primary font-medium hover:underline">Register as Student</Link>
                </p>
                <p>
                  <Link href="/register?role=OWNER" className="text-primary font-medium hover:underline">Register as Service Provider</Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
