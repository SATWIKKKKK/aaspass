"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Shield,
  RefreshCcw,
  BadgeCheck,
  ChevronDown,
  Gavel,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { cn } from "@/lib/utils";

type SectionKey = "terms" | "privacy" | "cancellation" | "license";

const legalSections: Array<{
  id: string;
  key: SectionKey;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  content: Array<{ heading?: string; body?: string; list?: string[] }>;
}> = [
  {
    id: "terms-of-service",
    key: "terms",
    title: "Terms of Service",
    subtitle: "How the platform is used",
    icon: FileText,
    content: [
      { heading: "Acceptance of Terms", body: "By accessing or using AasPass, you agree to these Terms of Service. If you do not agree, please do not use our services." },
      { heading: "Description of Service", body: "AasPass connects students with accommodation providers (hostels, PGs), coaching centers, mess services, and related services. We act as an intermediary and do not own or operate listed services." },
      { heading: "User Accounts", body: "Users must provide accurate information, protect their credentials, and be at least 16 years old." },
      { heading: "Booking & Payments", body: "Prices are in INR and include applicable GST. Payments are handled via secure gateways. Confirmation depends on availability and owner approval." },
      { heading: "Cancellation & Refunds", body: "Cancellation terms vary by listing. Refunds are processed within 7-14 business days; Premium users may receive extended benefits." },
      { heading: "User Conduct", body: "Users must not misuse the platform, submit false information, harass others, or perform illegal activity." },
      { heading: "Intellectual Property", body: "All AasPass content including logos, text, and design is protected by applicable laws." },
      { heading: "Limitation of Liability", body: "AasPass is not liable for disputes between students and service owners. We verify listings but cannot guarantee all third-party information." },
    ],
  },
  {
    id: "privacy-policy",
    key: "privacy",
    title: "Privacy Policy",
    subtitle: "How your data is handled",
    icon: Shield,
    content: [
      { heading: "Information We Collect", body: "We collect registration details, booking details, payment information, and usage data via cookies/analytics." },
      {
        heading: "How We Use Your Information",
        list: [
          "Provide and improve services",
          "Process bookings and payments",
          "Send booking and announcement notifications",
          "Provide customer support",
          "Personalize user experience",
        ],
      },
      { heading: "Data Sharing", body: "Relevant details are shared with service owners for bookings. We do not sell personal data." },
      { heading: "Data Security", body: "We use SSL/TLS and standard safeguards. Passwords are hashed and not stored in plain text." },
      { heading: "Your Rights", body: "Users can update or delete profile data and opt out of marketing communications." },
      { heading: "Cookies", body: "Essential cookies support authentication; optional analytics cookies can be controlled in browser settings." },
    ],
  },
  {
    id: "cancellation-policy",
    key: "cancellation",
    title: "Cancellation Policy",
    subtitle: "Refund rules and dispute handling",
    icon: RefreshCcw,
    content: [
      { heading: "General Policy", body: "Each listing displays its own cancellation policy before booking." },
      {
        heading: "Standard Cancellation",
        list: [
          "Within 24 hours of booking: full refund",
          "7+ days before check-in: 75% refund",
          "3-7 days before check-in: 50% refund",
          "Less than 3 days before check-in: no refund",
        ],
      },
      {
        heading: "Premium Member Benefits",
        list: [
          "Free cancellation within 48 hours",
          "13-day late fee waiver grace period",
          "Priority refunds in 3-5 business days",
        ],
      },
      { heading: "Refund Processing", body: "Standard refunds are processed in 7-14 business days to original payment method." },
      { heading: "Disputes", body: "Report disputes to support@aaspass.com within 7 days. Review target is within 48 hours." },
    ],
  },
  {
    id: "license",
    key: "license",
    title: "License",
    subtitle: "Rights granted and restrictions",
    icon: BadgeCheck,
    content: [
      { body: "AasPass grants users a limited, non-exclusive, non-transferable, revocable license to use the platform for personal, non-commercial purposes." },
      { body: "This license does not permit copying, redistribution, reverse-engineering, or derivative works of the platform." },
      { body: "All trademarks, logos, UI elements, source code, and content remain the property of AasPass or its licensors and are protected by law." },
    ],
  },
];

export default function TermsPage() {
  const [open, setOpen] = useState<Set<SectionKey>>(
    new Set(["terms", "privacy", "cancellation", "license"])
  );

  useEffect(() => {
    const setFromHash = () => {
      if (typeof window === "undefined") return;
      const hash = window.location.hash.replace("#", "");
      const map: Record<string, SectionKey> = {
        "terms-of-service": "terms",
        "privacy-policy": "privacy",
        "cancellation-policy": "cancellation",
        license: "license",
      };
      const key = map[hash];
      if (key) {
        setOpen((prev) => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
      }
    };

    setFromHash();
    window.addEventListener("hashchange", setFromHash);
    return () => window.removeEventListener("hashchange", setFromHash);
  }, []);

  const toggleSection = (key: SectionKey) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50 via-white to-white">
      <Navbar variant="public" />

      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl" />
          <div className="absolute top-40 -left-20 h-72 w-72 rounded-full bg-cyan-200/30 blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10 relative">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-700 bg-blue-100 border border-blue-200 rounded-full px-3 py-1">
            <Gavel className="h-3.5 w-3.5" />
            Legal Center
          </div>

          <h1 className="mt-4 text-4xl md:text-5xl font-black text-gray-900 leading-tight">
            Legal & License
            <span className="text-blue-700"> Made Readable</span>
          </h1>
          <p className="mt-4 text-gray-600 max-w-2xl">
            Everything is in one place, with section-level quick jumps and interactive expansion.
          </p>

          <div className="mt-7 flex flex-wrap gap-2">
            <Link href="#terms-of-service" className="px-4 py-2 rounded-full border border-blue-300 bg-white text-blue-700 text-sm font-semibold hover:bg-blue-50 transition-colors">Terms of Service</Link>
            <Link href="#privacy-policy" className="px-4 py-2 rounded-full border border-blue-300 bg-white text-blue-700 text-sm font-semibold hover:bg-blue-50 transition-colors">Privacy Policy</Link>
            <Link href="#cancellation-policy" className="px-4 py-2 rounded-full border border-blue-300 bg-white text-blue-700 text-sm font-semibold hover:bg-blue-50 transition-colors">Cancellation Policy</Link>
            <Link href="#license" className="px-4 py-2 rounded-full border border-blue-300 bg-white text-blue-700 text-sm font-semibold hover:bg-blue-50 transition-colors">License</Link>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="space-y-3">
          {legalSections.map((section) => {
            const isOpen = open.has(section.key);
            return (
              <section key={section.id} id={section.id} className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleSection(section.key)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-blue-50/70 transition-colors"
                >
                  <span className="flex items-center gap-3 text-left">
                    <span className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <section.icon className="h-5 w-5 text-blue-700" />
                    </span>
                    <span>
                      <span className="block text-lg font-bold text-gray-900">{section.title}</span>
                      <span className="block text-xs text-gray-500">{section.subtitle}</span>
                    </span>
                  </span>
                  <ChevronDown className={cn("h-5 w-5 text-gray-500 transition-transform", isOpen && "rotate-180")} />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 space-y-4 border-t border-gray-100">
                    {section.content.map((item, idx) => (
                      <div key={`${section.id}-${idx}`}>
                        {item.heading && <h3 className="text-sm font-bold text-gray-900 mb-1">{item.heading}</h3>}
                        {item.body && <p className="text-sm text-gray-600">{item.body}</p>}
                        {item.list && (
                          <ul className="space-y-1.5 text-sm text-gray-600">
                            {item.list.map((li) => (
                              <li key={li} className="flex gap-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                                <span>{li}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}
