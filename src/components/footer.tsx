import Link from "next/link";
import { Building2, Mail, Phone, MapPin } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center"><span className="text-white font-bold text-sm">A</span></div>
              <span className="text-xl font-bold text-white">AasPass</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">Your one-stop platform for student accommodation — hostels, PGs, libraries, coaching, and more.</p>
            <div className="flex items-center gap-2 mt-4 text-sm"><MapPin className="h-4 w-4 text-primary" /> Bhubaneswar, Odisha, India</div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link href="/services" className="hover:text-white transition-colors">Browse Services</Link></li>
              <li><Link href="/premium" className="hover:text-white transition-colors">Premium</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">About Us</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/contact" className="hover:text-white transition-colors">Help Center</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact Support</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Report an Issue</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">FAQs</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Cancellation Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">License</Link></li>
            </ul>
          </div>
        </div>

        <Separator className="my-8 bg-gray-800" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">&copy; {currentYear} AasPass. All rights reserved.</p>
          <div className="flex items-center gap-4 text-sm">
            <a href="mailto:support@aaspass.com" className="flex items-center gap-1 hover:text-white"><Mail className="h-4 w-4" /> support@aaspass.com</a>
            <a href="tel:+919876543210" className="flex items-center gap-1 hover:text-white"><Phone className="h-4 w-4" /> +91 98765 43210</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
