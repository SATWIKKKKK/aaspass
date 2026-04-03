"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Mail, Phone, MapPin } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  const { data: session } = useSession();
  const currentYear = new Date().getFullYear();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const dashboardHref = role === "OWNER" ? "/admin/dashboard" : "/dashboard";

  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center"><span className="text-white font-bold text-sm">A</span></div>
              <span className="text-xl font-bold text-white">AasPass</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">Your one-stop platform for student services — accommodation, mess/tiffin, libraries, laundry, gyms & more.</p>
            <div className="flex items-center gap-2 mt-4 text-sm"><MapPin className="h-4 w-4 text-primary" /> Hostel 4, IIT Bombay</div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link href="/services" className="hover:text-white transition-colors">Browse Services</Link></li>
              <li><Link href={dashboardHref} className="hover:text-white transition-colors">Dashboard</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">About Us</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/support#help-center" className="hover:text-white transition-colors">Help Center</Link></li>
              <li><Link href="/support#contact-support" className="hover:text-white transition-colors">Contact Support</Link></li>
              <li><Link href="/support#report-issue" className="hover:text-white transition-colors">Report an Issue</Link></li>
              <li><Link href="/support#faq" className="hover:text-white transition-colors">FAQs</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/terms#terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/terms#privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms#cancellation-policy" className="hover:text-white transition-colors">Cancellation Policy</Link></li>
              <li><Link href="/license" className="hover:text-white transition-colors">License</Link></li>
            </ul>
          </div>
        </div>

        <Separator className="my-8 bg-gray-800" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">&copy; {currentYear} AasPass. All rights reserved.</p>
          <div className="flex items-center gap-4 text-sm">
            <a href="https://mail.google.com/mail/?view=cm&fs=1&to=aaspass001@gmail.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-white"><Mail className="h-4 w-4" /> aaspass001@gmail.com</a>
            <a href="tel:+918690861854" className="flex items-center gap-1 hover:text-white"><Phone className="h-4 w-4" /> +91 8690861854</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
