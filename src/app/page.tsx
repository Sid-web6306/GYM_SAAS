'use client'

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, 
  TrendingUp, 
  Dumbbell, 
  Star, 
  Shield,
  Smartphone,
  Check,
  Globe
} from "lucide-react";
import { useState, useEffect } from "react";
import Footer from "@/components/layout/Footer";
import { StaticSubscriptionPlans } from "@/components/subscriptions";
import { AdaptiveNavigation, AdaptiveHeroCTA, AdaptiveFinalCTA } from "@/components/layout/AdaptiveNavigation";

function HomeComponent() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStat, setCurrentStat] = useState(0);

  useEffect(() => {
    setIsVisible(true);
    
    // Animate statistics
    const interval = setInterval(() => {
      setCurrentStat(prev => (prev + 1) % 4);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const stats = [
    { number: "2,500+", label: "Active Users" },
    { number: "150+", label: "Fitness Partners" },
    { number: "99.9%", label: "Uptime" },
    { number: "24/7", label: "Support" }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Gym Owner, FitZone Studio",
      content: "Finally, a management system that actually understands the fitness industry! The member tracking and analytics have been game-changing for our business.",
      rating: 5
    },
    {
      name: "Mike Chen",
      role: "Fitness Chain Manager",
      content: "As an early adopter, I'm impressed by how this modern system has streamlined our operations across all locations with multi-location support.",
      rating: 5
    },
    {
      name: "Lisa Rodriguez",
      role: "Personal Training Studio",
      content: "The member management and reporting features are exactly what we needed. The mobile app access makes everything so convenient!",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Enhanced animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-500"></div>
        <div className="absolute top-20 left-20 w-40 h-40 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-2000"></div>
        <div className="absolute bottom-20 right-20 w-60 h-60 bg-green-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-3000"></div>
      </div>

      {/* Enhanced Navigation */}
      <nav className="relative z-50 flex items-center justify-between p-6 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
            <Dumbbell className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">GymSaaS</span>
        </div>
        <div className="hidden md:flex items-center space-x-8">
          <Link href="#features" className="text-white hover:text-purple-300 transition-colors">Features</Link>
          <Link href="#pricing" className="text-white hover:text-purple-300 transition-colors">Pricing</Link>
          <Link href="#testimonials" className="text-white hover:text-purple-300 transition-colors">Reviews</Link>
        </div>
        <AdaptiveNavigation />
      </nav>

      {/* Enhanced Hero Section */}
      <div className={`relative z-10 flex flex-col items-center justify-center min-h-[90vh] text-center px-4 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="mb-6">
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent text-sm font-semibold tracking-wider uppercase">
            Modern Fitness Management System
          </span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
          The Future of <br />
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse">
            Fitness Management
          </span>
        </h1>
        
        <p className="text-xl text-slate-300 mb-8 max-w-3xl leading-relaxed">
          Built from the ground up for modern fitness businesses. Our comprehensive management system handles member tracking, analytics, multi-location support, and delivers powerful insights that traditional fitness software simply can&#39;t match.
        </p>

        <AdaptiveHeroCTA className="mb-8" />

        <div className="text-sm text-slate-400">
          ✓ No credit card required  •  ✓ 14-day free trial  •  ✓ Cancel anytime
        </div>
      </div>

      {/* Animated Statistics Section */}
      <div className="relative z-10 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Trusted by fitness professionals worldwide
            </h2>
            <p className="text-lg text-slate-300">
              Join thousands who are transforming their fitness business operations
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div 
                key={index}
                className={`text-center bg-slate-800/30 rounded-lg p-6 backdrop-blur transition-all duration-500 ${
                  currentStat === index ? 'bg-slate-800/50 scale-105 shadow-lg' : ''
                }`}
              >
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {stat.number}
                </div>
                <div className="text-purple-300 text-sm md:text-base">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Features Section */}
      <div id="features" className="relative z-10 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Complete Fitness Management Features
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Powerful management tools designed for gyms, studios, personal trainers, and fitness centers of all sizes
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur hover:bg-slate-800/70 transition-all duration-200">
              <CardContent className="p-8">
                <div className="p-3 bg-purple-500/20 rounded-lg inline-block mb-4">
                  <Users className="h-8 w-8 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Member Management & Check-ins</h3>
                <p className="text-slate-300 mb-4">
                  Complete member tracking system with digital check-ins, client profiles, and mobile app access. Perfect for fitness businesses managing 50 to unlimited members.
                </p>
                <div className="text-sm text-purple-300">
                  ✓ Member profiles & tracking  •  ✓ Digital check-ins  •  ✓ Mobile app access
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur hover:bg-slate-800/70 transition-all duration-200">
              <CardContent className="p-8">
                <div className="p-3 bg-pink-500/20 rounded-lg inline-block mb-4">
                  <TrendingUp className="h-8 w-8 text-pink-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Advanced Analytics & Reporting</h3>
                <p className="text-slate-300 mb-4">
                  Comprehensive analytics with member growth charts, revenue tracking, check-in trends, and detailed reports to optimize your fitness business performance.
                </p>
                <div className="text-sm text-pink-300">
                  ✓ Member growth charts  •  ✓ Revenue tracking  •  ✓ Check-in analytics
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur hover:bg-slate-800/70 transition-all duration-200">
              <CardContent className="p-8">
                <div className="p-3 bg-blue-500/20 rounded-lg inline-block mb-4">
                  <Shield className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Multi-Location & Custom Reports</h3>
                <p className="text-slate-300 mb-4">
                  Enterprise-level features including multi-location management, custom reporting, priority support, and white-label options for growing fitness businesses.
                </p>
                <div className="text-sm text-blue-300">
                  ✓ Multi-location management  •  ✓ Custom reports  •  ✓ Priority support
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Features Grid - Reorganized into 3 columns */}
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur hover:bg-slate-800/70 transition-all duration-200">
              <CardContent className="p-8 text-center">
                <div className="p-3 bg-purple-500/20 rounded-lg inline-block mb-4">
                  <Smartphone className="h-8 w-8 text-purple-400" />
                </div>
                <h4 className="text-white font-semibold mb-3 text-lg">Mobile-First Experience</h4>
                <p className="text-slate-300 mb-4">Progressive web app with native mobile functionality, offline support, and push notifications for seamless member management on the go.</p>
                <div className="text-sm text-purple-300">
                  ✓ Progressive web app  •  ✓ Offline support  •  ✓ Push notifications
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur hover:bg-slate-800/70 transition-all duration-200">
              <CardContent className="p-8 text-center">
                <div className="p-3 bg-green-500/20 rounded-lg inline-block mb-4">
                  <Shield className="h-8 w-8 text-green-400" />
                </div>
                <h4 className="text-white font-semibold mb-3 text-lg">Enterprise Security & Compliance</h4>
                <p className="text-slate-300 mb-4">Bank-level security with encrypted data storage, configurable retention policies, and GDPR compliance for complete peace of mind.</p>
                <div className="text-sm text-green-300">
                  ✓ Bank-level encryption  •  ✓ GDPR compliant  •  ✓ Data retention policies
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur hover:bg-slate-800/70 transition-all duration-200">
              <CardContent className="p-8 text-center">
                <div className="p-3 bg-blue-500/20 rounded-lg inline-block mb-4">
                  <Globe className="h-8 w-8 text-blue-400" />
                </div>
                <h4 className="text-white font-semibold mb-3 text-lg">Professional Branding & Automation</h4>
                <p className="text-slate-300 mb-4">White-label customization options with automated email notifications, custom domains, and branded member experiences.</p>
                <div className="text-sm text-blue-300">
                  ✓ White-label branding  •  ✓ Custom domains  •  ✓ Automated emails
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Benefits Section - Rebalanced with 4 benefits to match stats */}
      <div className="relative z-10 py-20 px-4 bg-slate-800/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              Why forward-thinking fitness businesses choose GymSaaS
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Built specifically for the fitness industry with modern technology and proven business growth strategies
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <Check className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2 text-lg">Modern Management Technology</h4>
                  <p className="text-slate-300">Built with today&apos;s best practices - cloud-native, mobile-first, and designed for the modern fitness landscape.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <Check className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2 text-lg">Smart Analytics & Insights</h4>
                  <p className="text-slate-300">Advanced analytics that track member growth, revenue trends, and check-in patterns to optimize your business performance.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <Check className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2 text-lg">Fitness-First Design</h4>
                  <p className="text-slate-300">Every feature designed specifically for fitness businesses - no generic business tools adapted for gyms.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <Check className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2 text-lg">Scalable Growth Platform</h4>
                  <p className="text-slate-300">From single locations to enterprise chains - our platform grows with your business and supports unlimited expansion.</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-800/50 p-8 rounded-lg backdrop-blur text-center">
                <div className="text-3xl font-bold text-white mb-2">50+</div>
                <div className="text-slate-300">Members (Starter Plan)</div>
              </div>
              <div className="bg-slate-800/50 p-8 rounded-lg backdrop-blur text-center">
                <div className="text-3xl font-bold text-white mb-2">200+</div>
                <div className="text-slate-300">Members (Professional)</div>
              </div>
              <div className="bg-slate-800/50 p-8 rounded-lg backdrop-blur text-center">
                <div className="text-3xl font-bold text-white mb-2">∞</div>
                <div className="text-slate-300">Members (Enterprise)</div>
              </div>
              <div className="bg-slate-800/50 p-8 rounded-lg backdrop-blur text-center">
                <div className="text-3xl font-bold text-white mb-2">2025</div>
                <div className="text-slate-300">Launching Soon</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="relative z-10 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-slate-300">
              Choose the perfect plan for your gym. Start with our free trial!
            </p>
          </div>

          {/* Static Subscription Plans Component - Fast Loading, SEO Optimized */}
          <div className="bg-white/5 backdrop-blur rounded-2xl p-8 border border-white/10">
            <StaticSubscriptionPlans className="[&_.text-muted-foreground]:text-slate-400 [&_.text-slate-600]:text-slate-300 [&_.text-slate-700]:text-slate-300" />
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div id="testimonials" className="relative z-10 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Loved by fitness professionals worldwide
            </h2>
            <p className="text-xl text-slate-300">
              Join thousands of successful gym owners who trust GymSaaS
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardContent className="p-8">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-slate-300 mb-6 italic">&#34;{testimonial.content}&#34;</p>
                  <div>
                    <div className="text-white font-semibold">{testimonial.name}</div>
                    <div className="text-slate-400 text-sm">{testimonial.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Social Proof */}
      <div className="relative z-10 py-20 px-4 bg-slate-800/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-semibold text-white mb-4">
              Trusted by 2,500+ fitness professionals
            </h3>
            <div className="flex justify-center items-center space-x-8 flex-wrap">
              <div className="flex items-center space-x-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <span className="text-white">4.8/5 from 200+ reviews</span>
              </div>
              <div className="text-slate-300">•</div>
              <div className="text-white">Featured in TechCrunch</div>
              <div className="text-slate-300">•</div>
              <div className="text-white">Y Combinator S24</div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced CTA Section */}
      <div className="relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <AdaptiveFinalCTA />
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default HomeComponent;
