import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar variant="public" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>
        <div className="prose prose-gray max-w-none space-y-6 text-gray-600">
          <p className="text-lg">Last updated: January 2026</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">1. Acceptance of Terms</h2>
          <p>By accessing or using AasPass, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">2. Description of Service</h2>
          <p>AasPass is an online platform that connects students with accommodation providers (hostels, PGs), coaching centers, mess services, and related services. We act as an intermediary and do not own or operate any listed property.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">3. User Accounts</h2>
          <p>You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your credentials. Users must be at least 16 years of age.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">4. Booking & Payments</h2>
          <p>All prices are listed in INR (Indian Rupees) and include applicable GST. Payments are processed through secure payment gateways. Booking confirmations are subject to availability and owner approval.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">5. Cancellation & Refunds</h2>
          <p>Cancellation policies vary by property and are displayed on each listing page. Refunds are processed within 7-14 business days. Premium members enjoy extended grace periods.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">6. User Conduct</h2>
          <p>Users must not misuse the platform, submit false information, harass other users, or engage in any illegal activity. Violation may result in account suspension.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">7. Intellectual Property</h2>
          <p>All content on AasPass, including logos, text, and design, is the property of AasPass and protected by applicable laws.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">8. Limitation of Liability</h2>
          <p>AasPass is not liable for any disputes between students and property owners. We strive to verify all listings but cannot guarantee accuracy of all information provided by third parties.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">9. Contact</h2>
          <p>For questions about these terms, contact us at <strong>legal@aaspass.com</strong>.</p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
