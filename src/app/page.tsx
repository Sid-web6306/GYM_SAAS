'use client'

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, 
  TrendingUp, 
  Dumbbell, 
  Star, 
  ArrowRight,
  Shield,
  Smartphone,
  Check,
  Play,
  Zap,
  Globe
} from "lucide-react";
import { useState, useEffect } from "react";
import Footer from "@/components/layout/Footer";

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
      <nav className="relative z-10 flex items-center justify-between p-6 backdrop-blur-sm">
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
        <div className="space-x-4">
          <Link href="/login">
            <Button variant="outline" className="text-white border-white border-2 bg-white/10 hover:bg-white hover:text-slate-900 backdrop-blur transition-all duration-200">
              Log In
            </Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transition-all duration-200">
              Sign Up
            </Button>
          </Link>
        </div>
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

        {/* Animated Statistics */}
        <div className="mb-8">
          <div className="text-4xl font-bold text-white mb-2">
            {stats[currentStat].number}
          </div>
          <div className="text-purple-300">
            {stats[currentStat].label}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Link href="/signup">
            <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-12 py-6 text-lg transition-all duration-200">
              Try Free for 14 Days
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="text-white border-white border-2 bg-white/10 hover:bg-white hover:text-slate-900 px-12 py-6 text-lg backdrop-blur transition-all duration-200">
            <Play className="mr-2 h-5 w-5" />
            Book a Demo
          </Button>
        </div>

        <div className="text-sm text-slate-400">
          ✓ No credit card required  •  ✓ 14-day free trial  •  ✓ Cancel anytime
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

          {/* Additional Features Grid */}
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center p-6 bg-slate-800/30 rounded-lg backdrop-blur">
              <Smartphone className="h-10 w-10 text-purple-400 mx-auto mb-3" />
              <h4 className="text-white font-semibold mb-2">Mobile App Access</h4>
              <p className="text-slate-400 text-sm">Progressive web app that works like a native mobile app</p>
            </div>
            <div className="text-center p-6 bg-slate-800/30 rounded-lg backdrop-blur">
              <Shield className="h-10 w-10 text-pink-400 mx-auto mb-3" />
              <h4 className="text-white font-semibold mb-2">Data Security & Retention</h4>
              <p className="text-slate-400 text-sm">Secure data storage with configurable retention policies</p>
            </div>
            <div className="text-center p-6 bg-slate-800/30 rounded-lg backdrop-blur">
              <Zap className="h-10 w-10 text-blue-400 mx-auto mb-3" />
              <h4 className="text-white font-semibold mb-2">Email Notifications</h4>
              <p className="text-slate-400 text-sm">Automated email notifications for important events</p>
            </div>
            <div className="text-center p-6 bg-slate-800/30 rounded-lg backdrop-blur">
              <Globe className="h-10 w-10 text-green-400 mx-auto mb-3" />
              <h4 className="text-white font-semibold mb-2">White-label Options</h4>
              <p className="text-slate-400 text-sm">Customize the platform with your own branding</p>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="relative z-10 py-20 px-4 bg-slate-800/20">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-white mb-6">
                Why forward-thinking fitness businesses choose GymSaaS
              </h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Check className="h-6 w-6 text-green-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-2">Modern Management Technology</h4>
                    <p className="text-slate-300">Built with today&#39;s best practices - cloud-native, mobile-first, and designed for the modern fitness landscape.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Check className="h-6 w-6 text-green-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-2">Smart Analytics</h4>
                    <p className="text-slate-300">Advanced analytics that track member growth, revenue trends, and check-in patterns to optimize your business performance.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Check className="h-6 w-6 text-green-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-2">Fitness-First Design</h4>
                    <p className="text-slate-300">Every feature designed specifically for fitness businesses - no generic business tools adapted for gyms.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-800/50 p-6 rounded-lg backdrop-blur">
                <div className="text-3xl font-bold text-white mb-2">50+</div>
                <div className="text-slate-300">Members (Starter Plan)</div>
              </div>
              <div className="bg-slate-800/50 p-6 rounded-lg backdrop-blur">
                <div className="text-3xl font-bold text-white mb-2">200+</div>
                <div className="text-slate-300">Members (Professional)</div>
              </div>
              <div className="bg-slate-800/50 p-6 rounded-lg backdrop-blur">
                <div className="text-3xl font-bold text-white mb-2">∞</div>
                <div className="text-slate-300">Members (Enterprise)</div>
              </div>
              <div className="bg-slate-800/50 p-6 rounded-lg backdrop-blur">
                <div className="text-3xl font-bold text-white mb-2">2025</div>
                <div className="text-slate-300">Launched</div>
              </div>
            </div>
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
      <div className="relative z-10 py-16 px-4 bg-slate-800/30">
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
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to modernize your fitness business management?
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Join forward-thinking fitness business owners who are transforming their operations. Experience the future of fitness management with our 14-day free trial.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href="/signup">
              <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-12 py-6 text-xl transition-all duration-200">
                Try Free for 14 Days
                <ArrowRight className="ml-2 h-6 w-6" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-white border-white border-2 bg-white/10 hover:bg-white hover:text-slate-900 px-12 py-6 text-xl backdrop-blur transition-all duration-200">
              Book a Demo
            </Button>
          </div>
          <div className="text-slate-400">
            <p className="mb-2">✓ No credit card required  •  ✓ 14-day free trial  •  ✓ Cancel anytime</p>
            <p className="text-sm">Join the 2,500+ fitness professionals already transforming their business operations</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default HomeComponent;
