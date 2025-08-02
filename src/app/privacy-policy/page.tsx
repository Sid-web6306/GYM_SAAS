import LegalLayout from '@/components/legal/LegalLayout'
import PolicySection from '@/components/legal/PolicySection'

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <PolicySection title="Introduction">
        <p>
          At GymSaaS (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;), we are committed to protecting your privacy and personal information. 
          This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use 
          our gym management software service.
        </p>
        <p>
          By using our service, you agree to the collection and use of information in accordance with this policy. 
          We will not use or share your information with anyone except as described in this Privacy Policy.
        </p>
      </PolicySection>

      <PolicySection title="Information We Collect">
        <p><strong>Personal Information:</strong></p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>Name, email address, phone number</li>
          <li>Gym/business information and address</li>
          <li>Payment and billing information</li>
          <li>Profile information and preferences</li>
        </ul>
        
        <p><strong>Member Data:</strong></p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>Member contact information and profiles</li>
          <li>Membership details and payment history</li>
          <li>Check-in/check-out records</li>
          <li>Communication preferences</li>
        </ul>

        <p><strong>Technical Information:</strong></p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>IP address, browser type, and device information</li>
          <li>Usage patterns and analytics data</li>
          <li>Cookies and similar tracking technologies</li>
          <li>Log files and error reports</li>
        </ul>
      </PolicySection>

      <PolicySection title="How We Use Your Information">
        <p>We use the collected information for the following purposes:</p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>Provide and maintain our gym management service</li>
          <li>Process payments and manage subscriptions</li>
          <li>Send important service updates and notifications</li>
          <li>Improve our software and develop new features</li>
          <li>Provide customer support and technical assistance</li>
          <li>Analyze usage patterns to enhance user experience</li>
          <li>Comply with legal obligations and prevent fraud</li>
        </ul>
      </PolicySection>

      <PolicySection title="Information Sharing and Disclosure">
        <p>We do not sell, trade, or otherwise transfer your personal information to third parties except in the following circumstances:</p>
        
        <p><strong>Service Providers:</strong></p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li><strong>Supabase:</strong> Database and authentication services</li>
          <li><strong>Razorpay:</strong> Payment processing for Indian customers</li>
          <li><strong>Vercel:</strong> Hosting and deployment services</li>
        </ul>

        <p><strong>Legal Requirements:</strong></p>
        <p>We may disclose your information when required by law, court order, or government request, or to protect our rights and safety.</p>

        <p><strong>Business Transfers:</strong></p>
        <p>In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</p>
      </PolicySection>

      <PolicySection title="Data Security">
        <p>We implement appropriate security measures to protect your personal information:</p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>Encrypted data transmission using SSL/TLS</li>
          <li>Secure cloud infrastructure with regular backups</li>
          <li>Access controls and authentication requirements</li>
          <li>Regular security audits and vulnerability assessments</li>
          <li>Employee training on data protection practices</li>
        </ul>
      </PolicySection>

      <PolicySection title="Cookies and Tracking Technologies">
        <p>We use cookies and similar technologies to:</p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>Remember your login status and preferences</li>
          <li>Analyze website traffic and usage patterns</li>
          <li>Improve our service performance and functionality</li>
          <li>Provide personalized user experience</li>
        </ul>
        <p>You can control cookie settings through your browser preferences.</p>
      </PolicySection>

      <PolicySection title="Your Rights and Choices">
        <p>You have the following rights regarding your personal information:</p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li><strong>Access:</strong> Request a copy of your personal data</li>
          <li><strong>Correction:</strong> Update inaccurate or incomplete information</li>
          <li><strong>Deletion:</strong> Request deletion of your personal data</li>
          <li><strong>Portability:</strong> Export your data in a portable format</li>
          <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
        </ul>
        <p>To exercise these rights, contact us at <a href="mailto:siddhant.jain15298@gmail.com" className="text-purple-600 hover:text-purple-800">siddhant.jain15298@gmail.com</a></p>
      </PolicySection>

      <PolicySection title="Data Retention">
        <p>We retain your information for as long as necessary to:</p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>Provide our services to you</li>
          <li>Comply with legal obligations</li>
          <li>Resolve disputes and enforce agreements</li>
          <li>Maintain business records as required by law</li>
        </ul>
        <p>Upon account termination, we will delete or anonymize your data within 90 days, except as required by law.</p>
      </PolicySection>

      <PolicySection title="International Data Transfers">
        <p>
          Your information may be processed and stored in countries other than your own. We ensure appropriate 
          safeguards are in place to protect your data during international transfers, including contractual 
          protections and compliance with applicable data protection laws.
        </p>
      </PolicySection>

      <PolicySection title="Children's Privacy">
        <p>
          Our service is not intended for individuals under the age of 18. We do not knowingly collect 
          personal information from children under 18. If we become aware that a child under 18 has provided 
          us with personal information, we will delete such information immediately.
        </p>
      </PolicySection>

      <PolicySection title="Changes to This Privacy Policy">
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any material changes 
          by posting the new Privacy Policy on this page and updating the &ldquo;Last updated&rdquo; date. You are 
          advised to review this Privacy Policy periodically for any changes.
        </p>
      </PolicySection>

      <PolicySection title="Contact Information">
        <p>If you have any questions about this Privacy Policy, please contact us:</p>
        <div className="bg-gray-50 p-4 rounded-lg mt-4">
          <p><strong>Email:</strong> <a href="mailto:siddhant.jain15298@gmail.com" className="text-purple-600 hover:text-purple-800">siddhant.jain15298@gmail.com</a></p>
          <p><strong>Address:</strong> GymSaaS, Dhampur, Uttar Pradesh, India</p>
        </div>
      </PolicySection>
    </LegalLayout>
  )
}