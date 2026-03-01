import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar variant="public" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        <div className="prose prose-gray max-w-none space-y-6 text-gray-600">
          <p className="text-lg">Last updated: January 2026</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">1. Information We Collect</h2>
          <p>We collect information you provide during registration (name, email, phone, gender, Aadhar number), booking details, payment information, and usage data through cookies and analytics.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">2. How We Use Your Information</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>To provide and improve our services</li>
            <li>To process bookings and payments</li>
            <li>To send notifications about bookings and announcements</li>
            <li>To provide customer support</li>
            <li>To personalize your experience</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">3. Data Sharing</h2>
          <p>We share relevant information with service owners to facilitate bookings. We do not sell personal data to third parties. We may share data with payment processors and cloud service providers as needed.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">4. Data Security</h2>
          <p>We use industry-standard encryption (SSL/TLS) and security measures to protect your data. Passwords are hashed and never stored in plain text.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">5. Your Rights</h2>
          <p>You can access, update, or delete your personal data at any time through your profile settings. You can opt out of marketing communications.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">6. Cookies</h2>
          <p>We use essential cookies for authentication and optional analytics cookies. You can manage cookie preferences in your browser settings.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">7. Contact</h2>
          <p>For privacy-related inquiries, email us at <strong>privacy@aaspass.com</strong>.</p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
