import LegalLayout from '@/components/legal/LegalLayout'
import PolicySection from '@/components/legal/PolicySection'

export default function RefundPolicyPage() {
  return (
    <LegalLayout title="Refund and Cancellation Policy">
      <PolicySection title="Overview">
        <p>
          At Centric Fit, we offer a <strong>14-day free trial</strong> so you can fully evaluate our service 
          before making any payment. This policy outlines our refund and cancellation terms.
        </p>
        <p>
          <strong>Important:</strong> All subscriptions are final after the free trial period. 
          No refunds will be provided once you begin paying for our service.
        </p>
      </PolicySection>

      <PolicySection title="Free Trial Period">
        <p><strong>14-Day Free Trial - Your Opportunity to Evaluate</strong></p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>All new accounts include a 14-day free trial</li>
          <li>No credit card required to start your trial</li>
          <li>Full access to all features during the trial period</li>
          <li>Cancel anytime during the trial with no charges whatsoever</li>
          <li>Only after trial ends will billing begin (if payment method provided)</li>
        </ul>

        <div className="bg-green-50 border-l-4 border-green-400 p-4 mt-4">
          <p className="text-green-800">
            <strong>Use Your Trial Wisely:</strong> The 14-day trial period is specifically designed 
            for you to test all features, import your data, and ensure Centric Fit meets your needs. 
            Take full advantage of this evaluation period.
          </p>
        </div>
      </PolicySection>

      <PolicySection title="No Refunds After Trial">
        <p>
          Once your free trial ends and you begin paying for Centric Fit, <strong>all subscriptions are final 
          and non-refundable</strong>:
        </p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>No refunds for monthly subscription plans</li>
          <li>No refunds for annual subscription plans</li>
          <li>No partial refunds or prorated amounts</li>
          <li>No refunds for unused portions of your subscription</li>
          <li>All payments are final once processed</li>
        </ul>

        <div className="bg-red-50 border-l-4 border-red-400 p-4 mt-4">
          <p className="text-red-800">
            <strong>Please Note:</strong> Since we provide a generous 14-day free trial with full 
            feature access, we do not offer refunds after the trial period ends. Make sure to 
            thoroughly evaluate the service during your trial.
          </p>
        </div>
      </PolicySection>

      <PolicySection title="Subscription Cancellation">
        <p>
          While we don&rsquo;t provide refunds, you can cancel your subscription at any time to avoid future charges:
        </p>

        <p><strong>How to Cancel:</strong></p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>Log into your account</li>
          <li>Navigate to Settings → Subscription</li>
          <li>Click &ldquo;Cancel Subscription&rdquo;</li>
          <li>Confirm cancellation in the popup dialog</li>
          <li>You&rsquo;ll receive email confirmation of cancellation</li>
        </ul>

        <p><strong>What Happens After Cancellation:</strong></p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>You continue to have full access until your current billing period ends</li>
          <li>No additional charges will be made after the current period</li>
          <li>Your account automatically downgrades to the free tier</li>
          <li>Your data is retained for 90 days in case you want to resubscribe</li>
          <li>You can reactivate your subscription at any time</li>
        </ul>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
          <p className="text-blue-800">
            <strong>Tip:</strong> Cancel before your renewal date to avoid being charged for the next period. 
            You&rsquo;ll continue to have access until your current subscription expires.
          </p>
        </div>
      </PolicySection>

      <PolicySection title="Payment Processing & Disputes">
        <p><strong>Payment Processor:</strong></p>
        <p>
          We use Razorpay to process payments securely. All transactions are subject to 
          their terms and conditions.
        </p>

        <p><strong>Billing Disputes:</strong></p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>Contact us immediately if you notice any billing errors</li>
          <li>We&rsquo;ll investigate legitimate billing errors within 5 business days</li>
          <li>Confirmed billing errors will be corrected promptly</li>
          <li>Contact us before initiating chargebacks - most issues can be resolved directly</li>
        </ul>

        <p><strong>Service Issues:</strong></p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>For extended service outages (&gt;24 hours), we may provide service credits</li>
          <li>Credits are applied to your next billing cycle, not as cash refunds</li>
          <li>Service credits are provided at our discretion based on the nature of the outage</li>
        </ul>

        <p className="mt-4">
          View Razorpay&rsquo;s terms: 
          <a href="https://razorpay.com/terms/" target="_blank" rel="noopener noreferrer" 
             className="text-purple-600 hover:text-purple-800 ml-1">
            https://razorpay.com/terms/
          </a>
        </p>
      </PolicySection>

      <PolicySection title="Policy Updates">
        <p>
          This refund policy may be updated from time to time. Any changes will be posted on this page 
          and communicated via email to active subscribers. The updated policy applies to all new 
          subscriptions after the effective date.
        </p>
        <p>
          Existing subscriptions remain subject to the refund policy that was in effect when they signed up, 
          unless you explicitly agree to new terms.
        </p>
      </PolicySection>

      <PolicySection title="Contact Information">
        <p>If you have questions about this refund policy or need assistance with cancellation:</p>
        <div className="bg-gray-50 p-4 rounded-lg mt-4">
          <p><strong>Email Support:</strong> <a href="mailto:siddhant.jain15298@gmail.com" className="text-purple-600 hover:text-purple-800">siddhant.jain15298@gmail.com</a></p>
          <p><strong>Phone Support:</strong> +91-6306730833</p>
          <p><strong>Business Hours:</strong> 9:00 AM - 6:00 PM IST, Monday - Friday</p>
          <p><strong>Address:</strong> Centric Fit, Dhampur, Uttar Pradesh, India</p>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
          <p className="text-yellow-800">
            <strong>Before You Subscribe:</strong> Remember that you have 14 full days to try Centric Fit 
            completely free. Use this time to ensure it&rsquo;s the right fit for your fitness club before your 
            subscription begins.
          </p>
        </div>
      </PolicySection>
    </LegalLayout>
  )
}