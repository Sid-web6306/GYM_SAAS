import LegalLayout from '@/components/legal/LegalLayout'
import PolicySection from '@/components/legal/PolicySection'

export default function TermsOfServicePage() {
  return (
    <LegalLayout title="Terms of Service">
      <PolicySection title="Agreement to Terms">
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your use of the GymSaaS platform (&ldquo;Service&rdquo;) 
          operated by GymSaaS (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). By accessing or using our 
          Service, you agree to be bound by these Terms.
        </p>
        <p>
          If you do not agree to these Terms, you may not access or use our Service. These Terms 
          apply to all visitors, users, and others who access or use the Service.
        </p>
      </PolicySection>

      <PolicySection title="Description of Service">
        <p>
          GymSaaS is a cloud-based gym management software that provides tools for:
        </p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>Member management and customer relationship management (CRM)</li>
          <li>Subscription and billing management</li>
          <li>Analytics and reporting tools</li>
          <li>Multi-tenant gym operations support</li>
          <li>Integration with payment processors</li>
        </ul>
      </PolicySection>

      <PolicySection title="User Accounts and Registration">
        <p><strong>Account Creation:</strong></p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>You must provide accurate and complete information when creating an account</li>
          <li>You are responsible for maintaining the confidentiality of your account credentials</li>
          <li>You must be at least 18 years old to create an account</li>
          <li>One person or entity may maintain only one free account</li>
        </ul>

        <p><strong>Account Responsibilities:</strong></p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>You are responsible for all activities that occur under your account</li>
          <li>Notify us immediately of any unauthorized use of your account</li>
          <li>Keep your contact information current and accurate</li>
        </ul>
      </PolicySection>

      <PolicySection title="Acceptable Use Policy">
        <p>You agree not to use the Service to:</p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>Violate any applicable laws or regulations</li>
          <li>Infringe upon the rights of others</li>
          <li>Upload or transmit malicious code or harmful content</li>
          <li>Attempt to gain unauthorized access to our systems</li>
          <li>Use the Service for any illegal or unauthorized purpose</li>
          <li>Interfere with or disrupt the Service or servers</li>
          <li>Create derivative works or reverse engineer the Service</li>
          <li>Use the Service to compete with us or create a similar service</li>
        </ul>
      </PolicySection>

      <PolicySection title="Subscription Plans and Billing">
        <p><strong>Free Trial:</strong></p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>We offer a 14-day free trial for new users</li>
          <li>No credit card required for the trial period</li>
          <li>Trial limitations may apply to certain features</li>
        </ul>

        <p><strong>Paid Subscriptions:</strong></p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>Subscriptions are billed monthly or annually in advance</li>
          <li>Prices are subject to change with 30 days&rsquo; notice</li>
          <li>All fees are non-refundable except as specified in our Refund Policy</li>
          <li>Automatic renewal unless cancelled before the renewal date</li>
        </ul>

        <p><strong>Payment Processing:</strong></p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>Payments processed through Razorpay</li>
          <li>You authorize us to charge your payment method for all fees</li>
          <li>Failed payments may result in service suspension</li>
        </ul>
      </PolicySection>

      <PolicySection title="Cancellation and Termination">
        <p><strong>Cancellation by You:</strong></p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>You may cancel your subscription at any time from your account settings</li>
          <li>Cancellation takes effect at the end of your current billing period</li>
          <li>You will retain access to paid features until the end of the billing period</li>
          <li>No refunds for partial months or unused time</li>
        </ul>

        <p><strong>Termination by Us:</strong></p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>We may terminate accounts that violate these Terms</li>
          <li>We may suspend service for non-payment after reasonable notice</li>
          <li>We reserve the right to terminate service at our discretion</li>
        </ul>

        <p><strong>Effect of Termination:</strong></p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>Your data will be deleted within 90 days of termination</li>
          <li>You may export your data before termination</li>
          <li>Certain provisions of these Terms survive termination</li>
        </ul>
      </PolicySection>

      <PolicySection title="Data Ownership and Privacy">
        <p><strong>Your Data:</strong></p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>You retain ownership of all data you input into the Service</li>
          <li>You grant us license to use your dPata solely to provide the Service</li>
          <li>You are responsible for the accuracy and legality of your data</li>
          <li>You must comply with applicable privacy laws regarding member data</li>
        </ul>

        <p><strong>Data Security:</strong></p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>We implement industry-standard security measures</li>
          <li>Regular backups and disaster recovery procedures</li>
          <li>Encryption of data in transit and at rest</li>
        </ul>
      </PolicySection>

      <PolicySection title="Intellectual Property Rights">
        <p><strong>Our Rights:</strong></p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>GymSaaS and all related marks are our trademarks</li>
          <li>The Service and underlying technology are our proprietary property</li>
          <li>All rights not expressly granted to you are reserved by us</li>
        </ul>

        <p><strong>Your Rights:</strong></p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>Subject to these Terms, you have a limited right to use the Service</li>
          <li>You may not copy, modify, or distribute our intellectual property</li>
          <li>You retain rights to your own content and data</li>
        </ul>
      </PolicySection>

      <PolicySection title="Disclaimers and Limitations of Liability">
        <p><strong>Service Availability:</strong></p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>We strive for 99.9% uptime but do not guarantee uninterrupted service</li>
          <li>Scheduled maintenance may temporarily interrupt service</li>
          <li>We are not liable for service interruptions beyond our control</li>
        </ul>

        <p><strong>Disclaimer of Warranties:</strong></p>
        <p className="font-semibold">
          THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. 
          WE DISCLAIM ALL WARRANTIES INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, 
          AND NON-INFRINGEMENT.
        </p>

        <p><strong>Limitation of Liability:</strong></p>
        <p className="font-semibold">
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR LIABILITY IS LIMITED TO THE AMOUNT YOU 
          PAID FOR THE SERVICE IN THE 12 MONTHS PRECEDING THE CLAIM. WE ARE NOT LIABLE FOR 
          INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES.
        </p>
      </PolicySection>

      <PolicySection title="Indemnification">
        <p>
          You agree to defend, indemnify, and hold us harmless from any claims, damages, costs, 
          and expenses (including attorney fees) arising from your use of the Service, violation 
          of these Terms, or infringement of any rights of another party.
        </p>
      </PolicySection>

      <PolicySection title="Governing Law and Dispute Resolution">
        <p><strong>Governing Law:</strong></p>
        <p>These Terms are governed by the laws of India, without regard to conflict of law principles.</p>

        <p><strong>Dispute Resolution:</strong></p>
        <ul className="list-disc list-inside ml-4 space-y-2">
          <li>First, contact us to resolve disputes informally</li>
          <li>Unresolved disputes will be subject to binding arbitration</li>
          <li>Arbitration will be conducted in Bangalore, India</li>
          <li>Class action lawsuits are not permitted</li>
        </ul>
      </PolicySection>

      <PolicySection title="Changes to Terms">
        <p>
          We may modify these Terms at any time. Material changes will be notified via email 
          or through the Service. Your continued use of the Service after changes constitutes 
          acceptance of the new Terms.
        </p>
      </PolicySection>

      <PolicySection title="General Provisions">
        <p><strong>Entire Agreement:</strong> These Terms constitute the entire agreement between you and us.</p>
        <p><strong>Severability:</strong> If any provision is invalid, the remaining provisions remain in effect.</p>
        <p><strong>Waiver:</strong> Failure to enforce any provision does not waive our right to do so later.</p>
        <p><strong>Assignment:</strong> You may not assign these Terms; we may assign them without restriction.</p>
      </PolicySection>

      <PolicySection title="Contact Information">
        <p>If you have questions about these Terms, please contact us:</p>
        <div className="bg-gray-50 p-4 rounded-lg mt-4">
          <p><strong>Email:</strong> <a href="mailto:siddhant.jain15298@gmail.com" className="text-purple-600 hover:text-purple-800">siddhant.jain15298@gmail.com</a></p>
          <p><strong>Address:</strong> GymSaaS, Dhampur, Uttar Pradesh, India</p>
        </div>
      </PolicySection>
    </LegalLayout>
  )
}