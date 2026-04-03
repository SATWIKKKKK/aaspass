"use client";

import { useState, useEffect } from "react";
import { gsap } from "@/lib/gsap";
import { ChevronDown } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { cn } from "@/lib/utils";

const faqs = [
  { q: "What is AasPass?", a: "AasPass is India&apos;s leading platform for students to discover, compare, and book accommodation, mess/tiffin, libraries, laundry, gyms & more — all in one place." },
  { q: "How do I book a service?", a: "Browse services, select a service, choose your dates, and click 'Book Now'. You&apos;ll be guided through a secure payment process. Once confirmed, you&apos;ll receive a booking confirmation via email." },
  { q: "Is my payment secure?", a: "Yes. All payments are processed through secure, PCI-compliant payment gateways. Your card details are never stored on our servers." },
  { q: "What is AasPass Premium?", a: "Premium is our subscription plan that offers AI chatbot access, pre-booking priority, 13-day late fee waiver, exclusive coupons, and 2x-4x SuperCoins on bookings." },
  { q: "What are SuperCoins?", a: "SuperCoins are loyalty rewards earned on every booking. You can redeem them for discounts on future bookings. Premium members earn 2x-4x more coins." },
  { q: "How do I cancel a booking?", a: "Go to your Dashboard, find the booking, and click 'Cancel'. Refund amount depends on the service&apos;s cancellation policy and how far in advance you cancel." },
  { q: "Can I list my service on AasPass?", a: "Yes! Register as a Service Provider, fill in your service details, upload at least 6 images, and submit for review. Our team will verify and list your service." },
  { q: "How do I contact support?", a: "Email us at aaspass001@gmail.com, call +91 8690861854, or use the chat feature in your dashboard." },
  { q: "Are all services verified?", a: "Yes. Our team verifies every service before listing. We check photos, amenities, and conduct physical inspections for quality assurance." },
  { q: "What if I have a complaint about a service?", a: "You can file a complaint from your booking details page. The service owner will be notified and our support team will mediate if needed." },
];

export default function FAQPage() {
  const [open, setOpen] = useState<number | null>(0);

  // GSAP entrance
  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.fromTo("[data-gsap='faq-title']", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5 })
      .fromTo("[data-gsap='faq-item']", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.05 }, "-=0.2");
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar variant="public" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 data-gsap="faq-title" className="text-4xl font-bold text-gray-900 mb-4 text-center" style={{ opacity: 0 }}>Frequently Asked Questions</h1>
        <p data-gsap="faq-title" className="text-gray-500 text-center mb-12" style={{ opacity: 0 }}>Everything you need to know about AasPass</p>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} data-gsap="faq-item" className="border rounded-lg overflow-hidden" style={{ opacity: 0 }}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
              >
                <span className="font-medium text-gray-900">{faq.q}</span>
                <ChevronDown className={cn("h-5 w-5 text-gray-400 transition-transform", open === i && "rotate-180")} />
              </button>
              {open === i && (
                <div className="px-4 pb-4 text-sm text-gray-600">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
