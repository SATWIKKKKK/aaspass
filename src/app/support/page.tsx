"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LifeBuoy,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  MessageSquareWarning,
  CircleHelp,
  ChevronDown,
  Sparkles,
  Clock3,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { cn } from "@/lib/utils";

const faqItems = [
  {
    q: "What is AasPass?",
    a: "AasPass is a platform for students to discover, compare, and book accommodation and daily services.",
  },
  {
    q: "How do I book a service?",
    a: "Open a listing, choose your dates, and complete payment. You will receive booking confirmation after success.",
  },
  {
    q: "How do I cancel a booking?",
    a: "Go to your dashboard bookings section and cancel according to the listing policy.",
  },
  {
    q: "How do I contact support?",
    a: "Email support@aaspass.com or call +91 98765 43210.",
  },
];

const supportCards = [
  {
    id: "help-center",
    title: "Help Center",
    subtitle: "Guides and onboarding help",
    icon: LifeBuoy,
    points: [
      "Browse services by city, budget, amenities, and ratings.",
      "Check listing details, photos, policies, and reviews before booking.",
      "Manage bookings, cancellations, and notifications from your dashboard.",
      "Use AI Chat (Premium) for faster discovery and recommendations.",
    ],
  },
  {
    id: "contact-support",
    title: "Contact Support",
    subtitle: "Reach us directly",
    icon: ShieldCheck,
    points: [
      "Email: support@aaspass.com",
      "Phone: +91 98765 43210",
      "Office: Hostel 4, IIT Bombay",
      "Typical response time: within 24 hours on business days.",
    ],
  },
  {
    id: "report-issue",
    title: "Report an Issue",
    subtitle: "Fast debugging from our team",
    icon: MessageSquareWarning,
    points: [
      "Include booking ID or listing name whenever possible.",
      "Add screenshots and timestamps for faster diagnosis.",
      "Share device/browser details if the issue is technical.",
      "Use subject: \"Issue Report - AasPass\" when emailing support.",
    ],
  },
];

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<Set<number>>(
    new Set(faqItems.map((_, idx) => idx))
  );

  const toggleFaq = (idx: number) => {
    setOpenFaq((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-sky-50 via-white to-white">
      <Navbar variant="public" />

      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-12 h-72 w-72 rounded-full bg-sky-200/45 blur-3xl" />
          <div className="absolute top-32 -left-16 h-64 w-64 rounded-full bg-blue-200/35 blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10 relative">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sky-700 bg-sky-100 border border-sky-200 rounded-full px-3 py-1">
            <Sparkles className="h-3.5 w-3.5" />
            Support Hub
          </div>
          <h1 className="mt-4 text-4xl md:text-5xl font-black text-gray-900 leading-tight">
            Support That Feels
            <span className="text-sky-700"> Immediate</span>
          </h1>
          <p className="mt-4 text-gray-600 max-w-2xl">
            One page for all support actions. Jump to Help Center, Contact Support, Report an Issue,
            or FAQ in one click.
          </p>

          <div className="mt-7 flex flex-wrap gap-2">
            <Link href="#help-center" className="px-4 py-2 rounded-full border border-sky-300 bg-white text-sky-700 text-sm font-semibold hover:bg-sky-50 transition-colors">Help Center</Link>
            <Link href="#contact-support" className="px-4 py-2 rounded-full border border-sky-300 bg-white text-sky-700 text-sm font-semibold hover:bg-sky-50 transition-colors">Contact Support</Link>
            <Link href="#report-issue" className="px-4 py-2 rounded-full border border-sky-300 bg-white text-sky-700 text-sm font-semibold hover:bg-sky-50 transition-colors">Report an Issue</Link>
            <Link href="#faq" className="px-4 py-2 rounded-full border border-sky-300 bg-white text-sky-700 text-sm font-semibold hover:bg-sky-50 transition-colors">FAQ</Link>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-sky-200 bg-white p-4 flex items-center gap-3">
              <Clock3 className="h-5 w-5 text-sky-600" />
              <div>
                <p className="text-xs text-gray-500">Average Response</p>
                <p className="text-sm font-bold text-gray-900">Under 24 hrs</p>
              </div>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-white p-4 flex items-center gap-3">
              <Mail className="h-5 w-5 text-sky-600" />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-bold text-gray-900">support@aaspass.com</p>
              </div>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-white p-4 flex items-center gap-3">
              <Phone className="h-5 w-5 text-sky-600" />
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="text-sm font-bold text-gray-900">+91 98765 43210</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {supportCards.map((item) => (
            <section key={item.id} id={item.id} className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-sky-100 flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-sky-700" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{item.title}</h2>
                  <p className="text-xs text-gray-500">{item.subtitle}</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                {item.points.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section id="faq" className="scroll-mt-24 mt-10 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-sky-100 flex items-center justify-center">
              <CircleHelp className="h-5 w-5 text-sky-700" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900">Frequently Asked Questions</h2>
              <p className="text-sm text-gray-500">Tap a question to expand</p>
            </div>
          </div>

          <div className="space-y-2">
            {faqItems.map((item, idx) => (
              <div key={item.q} className="rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-sky-50 transition-colors"
                >
                  <span className="text-sm font-semibold text-gray-900">{item.q}</span>
                  <ChevronDown className={cn("h-4 w-4 text-gray-500 transition-transform", openFaq.has(idx) && "rotate-180")} />
                </button>
                {openFaq.has(idx) && (
                  <div className="px-4 pb-4 text-sm text-gray-600">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-sky-200 bg-sky-50 p-4 flex flex-wrap items-center gap-3">
            <MapPin className="h-4 w-4 text-sky-700" />
            <p className="text-sm text-sky-900 font-medium">Office location: Hostel 4, IIT Bombay</p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
