"use client";

import { useEffect } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { Building2, Users, Target, Heart, MapPin, Phone, Mail, Globe } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";

const stats = [
  { label: "Cities", value: "50+" },
  { label: "Services", value: "10,000+" },
  { label: "Students Served", value: "1,00,000+" },
  { label: "Happy Reviews", value: "50,000+" },
];

const team = [
  { name: "AasPass Team", role: "Founders & Engineering", desc: "Building the future of student accommodation in India." },
];

export default function AboutPage() {
  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.fromTo("[data-gsap='about-title']", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5 })
      .fromTo("[data-gsap='about-stat']", { opacity: 0, y: 20, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.08 }, "-=0.2")
      .fromTo("[data-gsap='about-block']", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.15 }, "-=0.1");
    return () => { tl.kill(); ScrollTrigger.getAll().forEach(st => st.kill()); };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar variant="public" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div data-gsap="about-title" className="text-center max-w-3xl mx-auto mb-16" style={{ opacity: 0 }}>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">About AasPass</h1>
          <p className="text-lg text-gray-600">
            AasPass is India&apos;s leading platform for students to discover, compare, and book hostels, PGs, coaching centers, mess services, and more — all in one place.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((s) => (
            <Card key={s.label} data-gsap="about-stat" style={{ opacity: 0 }}>
              <CardContent className="p-6 text-center">
                <p className="text-3xl font-bold text-primary">{s.value}</p>
                <p className="text-sm text-gray-500 mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-12 mb-16">
          <div data-gsap="about-block" style={{ opacity: 0 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Our Mission</h2>
            </div>
            <p className="text-gray-600 leading-relaxed">
              To simplify the process of finding and booking student accommodation and coaching services across India. We believe every student deserves access to quality, affordable, and verified living spaces near their place of study.
            </p>
          </div>
          <div data-gsap="about-block" style={{ opacity: 0 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Heart className="h-5 w-5 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Our Values</h2>
            </div>
            <ul className="space-y-2 text-gray-600">
              <li>• <strong>Trust:</strong> Every service is verified before listing</li>
              <li>• <strong>Transparency:</strong> No hidden charges, clear pricing with GST</li>
              <li>• <strong>Quality:</strong> Rated and reviewed by real students</li>
              <li>• <strong>Support:</strong> 24/7 customer support for all users</li>
            </ul>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
