import LegalLayout from '@/components/legal/LegalLayout'
import PolicySection from '@/components/legal/PolicySection'
import { Card, CardContent } from '@/components/ui/card'
import { Mail, Phone, MapPin, Clock, MessageCircle } from 'lucide-react'

export default function ContactPage() {
  return (
    <LegalLayout title="Contact Us" lastUpdated="January 15, 2024">
      <div className="mb-8">
        <p className="text-lg text-gray-600">
          We&rsquo;re here to help! Get in touch with our team for support, questions, or feedback. 
          We typically respond within a few hours during business hours.
        </p>
      </div>

      {/* Single Contact Card */}
      <Card className="border-2 border-purple-100 hover:border-purple-200 transition-colors mb-12">
        <CardContent className="p-8">
          <div className="flex items-center mb-6">
            <div className="p-3 bg-purple-100 rounded-lg mr-4">
              <MessageCircle className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900">Get Support</h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-gray-500 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Email Support</p>
                  <a href="mailto:siddhant.jain15298@gmail.com" className="text-purple-600 hover:text-purple-800">
                    siddhant.jain15298@gmail.com
                  </a>
                </div>
              </div>
              
              <div className="flex items-center">
                <Phone className="h-5 w-5 text-gray-500 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Phone Support</p>
                  <span className="text-gray-700">+91-6306730833</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-gray-500 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Business Hours</p>
                  <span className="text-gray-700">9 AM - 6 PM IST, Mon-Fri</span>
                </div>
              </div>
              
              <div className="flex items-center">
                <MapPin className="h-5 w-5 text-gray-500 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Location</p>
                  <span className="text-gray-700">Dhampur, Uttar Pradesh, India</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-purple-800 text-sm">
              <strong>We help with:</strong> General support, technical issues, billing questions, 
              refunds, feature requests, and any other questions about GymSaaS.
            </p>
          </div>
        </CardContent>
      </Card>

      <PolicySection title="Business Information">
        <div className="bg-gray-50 p-6 rounded-lg">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Business Details</h4>
              <p className="text-gray-700">GymSaaS</p>
              <p className="text-gray-700">Gym Management Software</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Location</h4>
              <div className="flex items-start">
                <MapPin className="h-4 w-4 text-gray-500 mr-2 mt-1 flex-shrink-0" />
                <div className="text-gray-700">
                  <p>Dhampur, Uttar Pradesh</p>
                  <p>India</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PolicySection>

      <PolicySection title="Response Times">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Email Support</h4>
            <ul className="text-blue-800 space-y-1 text-sm">
              <li><strong>General Questions:</strong> Within 6 hours</li>
              <li><strong>Technical Issues:</strong> Within 4 hours</li>
              <li><strong>Billing Issues:</strong> Within 2 hours</li>
              <li><strong>Critical Problems:</strong> Within 1 hour</li>
            </ul>
          </div>
          
          <div className="bg-green-50 border-l-4 border-green-400 p-4">
            <h4 className="font-semibold text-green-900 mb-2">Getting Faster Help</h4>
            <ul className="text-green-800 space-y-1 text-sm">
              <li>• Include your account email</li>
              <li>• Describe the issue clearly</li>
              <li>• Add screenshots if relevant</li>
              <li>• Mention error messages</li>
            </ul>
          </div>
        </div>
      </PolicySection>
    </LegalLayout>
  )
}