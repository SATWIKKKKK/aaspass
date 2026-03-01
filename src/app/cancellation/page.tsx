import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function CancellationPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar variant="public" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Cancellation & Refund Policy</h1>
        <div className="prose prose-gray max-w-none space-y-6 text-gray-600">
          <p className="text-lg">Last updated: January 2026</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">General Policy</h2>
          <p>All bookings on AasPass are subject to the individual service&apos;s cancellation policy, which is displayed clearly on each listing page before you book.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">Standard Cancellation</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Within 24 hours of booking:</strong> Full refund, no questions asked</li>
            <li><strong>7+ days before check-in:</strong> 75% refund</li>
            <li><strong>3-7 days before check-in:</strong> 50% refund</li>
            <li><strong>Less than 3 days:</strong> No refund</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">Premium Member Benefits</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Free cancellation within 48 hours of booking</li>
            <li>13-day late fee waiver grace period</li>
            <li>Priority refund processing (3-5 business days)</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">Refund Processing</h2>
          <p>Refunds are processed to the original payment method within 7-14 business days for standard users. Premium members receive refunds within 3-5 days.</p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8">Disputes</h2>
          <p>If you believe a cancellation was handled unfairly, contact our support team at <strong>support@aaspass.com</strong> within 7 days of cancellation. We will review and resolve disputes within 48 hours.</p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
