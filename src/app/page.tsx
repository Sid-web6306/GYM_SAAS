'use client'

import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, 
  TrendingUp, 
  Star, 
  Shield,
  Smartphone,
  Check,
  Globe
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Footer from "@/components/layout/Footer";
import { StaticSubscriptionPlans } from "@/components/subscriptions";
import { AdaptiveNavigation, AdaptiveHeroCTA, AdaptiveFinalCTA } from "@/components/layout/AdaptiveNavigation";

function HomeComponent() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStat, setCurrentStat] = useState(0);
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    
    // Only animate statistics if stats are visible
    let interval: NodeJS.Timeout | null = null;
    if (statsVisible) {
      interval = setInterval(() => {
        setCurrentStat(prev => (prev + 1) % 4);
      }, 3000); // Slower animation for better UX
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [statsVisible]);

  // Intersection Observer for stats section
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => observer.disconnect();
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
      {/* Enhanced animated background - Performance Optimized */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Primary background elements - visible on all devices */}
        <div className="absolute -top-20 sm:-top-40 -right-20 sm:-right-40 w-40 sm:w-80 h-40 sm:h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 motion-safe:animate-pulse"></div>
        <div className="absolute -bottom-20 sm:-bottom-40 -left-20 sm:-left-40 w-40 sm:w-80 h-40 sm:h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 motion-safe:animate-pulse motion-safe:delay-1000"></div>
        
        {/* Secondary background elements - hidden on mobile for performance */}
        <div className="hidden sm:block absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 motion-safe:animate-pulse motion-safe:delay-500"></div>
        <div className="hidden md:block absolute top-20 left-20 w-40 h-40 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 motion-safe:animate-pulse motion-safe:delay-2000"></div>
        <div className="hidden md:block absolute bottom-20 right-20 w-60 h-60 bg-green-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 motion-safe:animate-pulse motion-safe:delay-3000"></div>
      </div>

      {/* Enhanced Navigation - Mobile Optimized */}
      <AdaptiveNavigation />

      {/* Enhanced Hero Section - Mobile Optimized */}
      <div className={`relative z-10 flex flex-col items-center justify-center min-h-[85vh] sm:min-h-[90vh] text-center px-4 sm:px-6 lg:px-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="mb-4 sm:mb-6">
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent text-xs sm:text-sm font-semibold tracking-wider uppercase px-2" role="banner">
            Modern Fitness Management System
          </span>
        </div>
        
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 sm:mb-6 leading-tight">
          The Future of <br className="hidden sm:block" />
          <span className="sm:hidden"> </span>
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent motion-safe:animate-pulse">
            Fitness Management
          </span>
        </h1>
        
        <p className="text-base sm:text-lg lg:text-xl text-slate-300 mb-6 sm:mb-8 max-w-2xl lg:max-w-3xl leading-relaxed px-2">
          Built from the ground up for modern fitness businesses. Our comprehensive management system handles member tracking, analytics, multi-location support, and delivers powerful insights that traditional fitness software simply can&#39;t match.
        </p>

        <AdaptiveHeroCTA className="mb-6 sm:mb-8" />

        <div className="text-xs sm:text-sm text-slate-400 px-4">
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-4">
            <span>✓ No credit card required</span>
            <span className="hidden sm:inline">•</span>
            <span>✓ 14-day free trial</span>
            <span className="hidden sm:inline">•</span>
            <span>✓ Cancel anytime</span>
          </div>
        </div>
      </div>

      {/* Animated Statistics Section - Mobile Optimized */}
      <div ref={statsRef} className="relative z-10 py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
              Trusted by fitness professionals worldwide
            </h2>
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
              Join thousands who are transforming their fitness business operations
            </p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8" role="group" aria-label="Company statistics">
            {stats.map((stat, index) => (
              <div 
                key={index}
                className={`text-center bg-slate-800/30 rounded-lg p-4 sm:p-6 backdrop-blur transition-all duration-500 hover:bg-slate-800/50 focus-within:ring-2 focus-within:ring-purple-400 ${
                  currentStat === index ? 'motion-safe:bg-slate-800/50 motion-safe:scale-105 motion-safe:shadow-lg' : ''
                }`}
                role="article"
                aria-label={`${stat.number} ${stat.label}`}
              >
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1 sm:mb-2" aria-label={`${stat.number}`}>
                  {stat.number}
                </div>
                <div className="text-purple-300 text-xs sm:text-sm md:text-base">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Features Section - Mobile Optimized */}
      <div id="features" className="relative z-10 py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4">
              Complete Fitness Management Features
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-slate-300 max-w-2xl mx-auto px-2">
              Powerful management tools designed for gyms, studios, personal trainers, and fitness centers of all sizes
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-10 sm:mb-12 lg:mb-16" role="group" aria-label="Main features">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur hover:bg-slate-800/70 transition-all duration-200 sm:col-span-2 lg:col-span-1 focus-within:ring-2 focus-within:ring-purple-400">
              <CardContent className="p-6 sm:p-8">
                <div className="p-2.5 sm:p-3 bg-purple-500/20 rounded-lg inline-block mb-3 sm:mb-4" role="presentation">
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400" aria-hidden="true" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3">Member Management & Check-ins</h3>
                <p className="text-slate-300 mb-3 sm:mb-4 text-sm sm:text-base leading-relaxed">
                  Complete member tracking system with digital check-ins, client profiles, and mobile app access. Perfect for fitness businesses managing 50 to unlimited members.
                </p>
                <div className="text-xs sm:text-sm text-purple-300 space-y-1 sm:space-y-0">
                  <div className="sm:hidden flex flex-col space-y-1">
                    <span>✓ Member profiles & tracking</span>
                    <span>✓ Digital check-ins</span>
                    <span>✓ Mobile app access</span>
                  </div>
                  <div className="hidden sm:block">
                    ✓ Member profiles & tracking  •  ✓ Digital check-ins  •  ✓ Mobile app access
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur hover:bg-slate-800/70 transition-all duration-200 focus-within:ring-2 focus-within:ring-pink-400">
              <CardContent className="p-6 sm:p-8">
                <div className="p-2.5 sm:p-3 bg-pink-500/20 rounded-lg inline-block mb-3 sm:mb-4" role="presentation">
                  <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-pink-400" aria-hidden="true" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3">Advanced Analytics & Reporting</h3>
                <p className="text-slate-300 mb-3 sm:mb-4 text-sm sm:text-base leading-relaxed">
                  Comprehensive analytics with member growth charts, revenue tracking, check-in trends, and detailed reports to optimize your fitness business performance.
                </p>
                <div className="text-xs sm:text-sm text-pink-300 space-y-1 sm:space-y-0">
                  <div className="sm:hidden flex flex-col space-y-1">
                    <span>✓ Member growth charts</span>
                    <span>✓ Revenue tracking</span>
                    <span>✓ Check-in analytics</span>
                  </div>
                  <div className="hidden sm:block">
                    ✓ Member growth charts  •  ✓ Revenue tracking  •  ✓ Check-in analytics
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur hover:bg-slate-800/70 transition-all duration-200 sm:col-span-2 lg:col-span-1 focus-within:ring-2 focus-within:ring-blue-400">
              <CardContent className="p-6 sm:p-8">
                <div className="p-2.5 sm:p-3 bg-blue-500/20 rounded-lg inline-block mb-3 sm:mb-4" role="presentation">
                  <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" aria-hidden="true" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3">Multi-Location & Custom Reports</h3>
                <p className="text-slate-300 mb-3 sm:mb-4 text-sm sm:text-base leading-relaxed">
                  Enterprise-level features including multi-location management, custom reporting, priority support, and white-label options for growing fitness businesses.
                </p>
                <div className="text-xs sm:text-sm text-blue-300 space-y-1 sm:space-y-0">
                  <div className="sm:hidden flex flex-col space-y-1">
                    <span>✓ Multi-location management</span>
                    <span>✓ Custom reports</span>
                    <span>✓ Priority support</span>
                  </div>
                  <div className="hidden sm:block">
                    ✓ Multi-location management  •  ✓ Custom reports  •  ✓ Priority support
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Features Grid - Mobile Optimized */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8" role="group" aria-label="Additional features">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur hover:bg-slate-800/70 transition-all duration-200 sm:col-span-2 lg:col-span-1">
              <CardContent className="p-6 sm:p-8 text-center">
                <div className="p-2.5 sm:p-3 bg-purple-500/20 rounded-lg inline-block mb-3 sm:mb-4">
                  <Smartphone className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400" />
                </div>
                <h4 className="text-white font-semibold mb-2 sm:mb-3 text-base sm:text-lg">Mobile-First Experience</h4>
                <p className="text-slate-300 mb-3 sm:mb-4 text-sm sm:text-base leading-relaxed">Progressive web app with native mobile functionality, offline support, and push notifications for seamless member management on the go.</p>
                <div className="text-xs sm:text-sm text-purple-300 space-y-1 sm:space-y-0">
                  <div className="sm:hidden flex flex-col space-y-1">
                    <span>✓ Progressive web app</span>
                    <span>✓ Offline support</span>
                    <span>✓ Push notifications</span>
                  </div>
                  <div className="hidden sm:block">
                    ✓ Progressive web app  •  ✓ Offline support  •  ✓ Push notifications
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur hover:bg-slate-800/70 transition-all duration-200">
              <CardContent className="p-6 sm:p-8 text-center">
                <div className="p-2.5 sm:p-3 bg-green-500/20 rounded-lg inline-block mb-3 sm:mb-4">
                  <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
                </div>
                <h4 className="text-white font-semibold mb-2 sm:mb-3 text-base sm:text-lg">Enterprise Security & Compliance</h4>
                <p className="text-slate-300 mb-3 sm:mb-4 text-sm sm:text-base leading-relaxed">Bank-level security with encrypted data storage, configurable retention policies, and GDPR compliance for complete peace of mind.</p>
                <div className="text-xs sm:text-sm text-green-300 space-y-1 sm:space-y-0">
                  <div className="sm:hidden flex flex-col space-y-1">
                    <span>✓ Bank-level encryption</span>
                    <span>✓ GDPR compliant</span>
                    <span>✓ Data retention policies</span>
                  </div>
                  <div className="hidden sm:block">
                    ✓ Bank-level encryption  •  ✓ GDPR compliant  •  ✓ Data retention policies
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur hover:bg-slate-800/70 transition-all duration-200 sm:col-span-2 lg:col-span-1">
              <CardContent className="p-6 sm:p-8 text-center">
                <div className="p-2.5 sm:p-3 bg-blue-500/20 rounded-lg inline-block mb-3 sm:mb-4">
                  <Globe className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
                </div>
                <h4 className="text-white font-semibold mb-2 sm:mb-3 text-base sm:text-lg">Professional Branding & Automation</h4>
                <p className="text-slate-300 mb-3 sm:mb-4 text-sm sm:text-base leading-relaxed">White-label customization options with automated email notifications, custom domains, and branded member experiences.</p>
                <div className="text-xs sm:text-sm text-blue-300 space-y-1 sm:space-y-0">
                  <div className="sm:hidden flex flex-col space-y-1">
                    <span>✓ White-label branding</span>
                    <span>✓ Custom domains</span>
                    <span>✓ Automated emails</span>
                  </div>
                  <div className="hidden sm:block">
                    ✓ White-label branding  •  ✓ Custom domains  •  ✓ Automated emails
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Benefits Section - Mobile Optimized */}
      <div className="relative z-10 py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-slate-800/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 sm:mb-6">
              Why forward-thinking fitness businesses choose GymSaaS
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-slate-300 max-w-3xl mx-auto px-2">
              Built specifically for the fitness industry with modern technology and proven business growth strategies
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-start">
            <div className="space-y-6 sm:space-y-8">
              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className="p-2 sm:p-3 bg-green-500/20 rounded-lg flex-shrink-0">
                  <Check className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2 text-base sm:text-lg">Modern Management Technology</h4>
                  <p className="text-slate-300 text-sm sm:text-base leading-relaxed">Built with today&apos;s best practices - cloud-native, mobile-first, and designed for the modern fitness landscape.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className="p-2 sm:p-3 bg-green-500/20 rounded-lg flex-shrink-0">
                  <Check className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2 text-base sm:text-lg">Smart Analytics & Insights</h4>
                  <p className="text-slate-300 text-sm sm:text-base leading-relaxed">Advanced analytics that track member growth, revenue trends, and check-in patterns to optimize your business performance.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className="p-2 sm:p-3 bg-green-500/20 rounded-lg flex-shrink-0">
                  <Check className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2 text-base sm:text-lg">Fitness-First Design</h4>
                  <p className="text-slate-300 text-sm sm:text-base leading-relaxed">Every feature designed specifically for fitness businesses - no generic business tools adapted for gyms.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className="p-2 sm:p-3 bg-green-500/20 rounded-lg flex-shrink-0">
                  <Check className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2 text-base sm:text-lg">Scalable Growth Platform</h4>
                  <p className="text-slate-300 text-sm sm:text-base leading-relaxed">From single locations to enterprise chains - our platform grows with your business and supports unlimited expansion.</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 sm:gap-6 mt-6 lg:mt-0">
              <div className="bg-slate-800/50 p-4 sm:p-6 lg:p-8 rounded-lg backdrop-blur text-center hover:bg-slate-800/70 transition-all duration-200">
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">50+</div>
                <div className="text-slate-300 text-xs sm:text-sm lg:text-base">Members (Starter Plan)</div>
              </div>
              <div className="bg-slate-800/50 p-4 sm:p-6 lg:p-8 rounded-lg backdrop-blur text-center hover:bg-slate-800/70 transition-all duration-200">
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">200+</div>
                <div className="text-slate-300 text-xs sm:text-sm lg:text-base">Members (Professional)</div>
              </div>
              <div className="bg-slate-800/50 p-4 sm:p-6 lg:p-8 rounded-lg backdrop-blur text-center hover:bg-slate-800/70 transition-all duration-200">
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">∞</div>
                <div className="text-slate-300 text-xs sm:text-sm lg:text-base">Members (Enterprise)</div>
              </div>
              <div className="bg-slate-800/50 p-4 sm:p-6 lg:p-8 rounded-lg backdrop-blur text-center hover:bg-slate-800/70 transition-all duration-200">
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">2025</div>
                <div className="text-slate-300 text-xs sm:text-sm lg:text-base">Launching Soon</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section - Mobile Optimized */}
      <div id="pricing" className="relative z-10 py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-slate-300 max-w-2xl mx-auto px-2">
              Choose the perfect plan for your gym. Start with our free trial!
            </p>
          </div>

          {/* Static Subscription Plans Component - Fast Loading, SEO Optimized */}
          <div className="bg-white/5 backdrop-blur rounded-2xl p-4 sm:p-6 lg:p-8 border border-white/10">
            <StaticSubscriptionPlans className="[&_.text-muted-foreground]:text-slate-400 [&_.text-slate-600]:text-slate-300 [&_.text-slate-700]:text-slate-300" />
          </div>
        </div>
      </div>

      {/* Testimonials Section - Mobile Optimized */}
      <div id="testimonials" className="relative z-10 py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4">
              Loved by fitness professionals worldwide
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-slate-300 max-w-2xl mx-auto px-2">
              Join thousands of successful gym owners who trust GymSaaS
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8" role="group" aria-label="Customer testimonials">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-slate-800/50 border-slate-700 backdrop-blur hover:bg-slate-800/70 transition-all duration-200 focus-within:ring-2 focus-within:ring-yellow-400">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-center mb-3 sm:mb-4" role="img" aria-label={`${testimonial.rating} out of 5 stars`}>
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 fill-current" aria-hidden="true" />
                    ))}
                  </div>
                  <blockquote className="text-slate-300 mb-4 sm:mb-6 italic text-sm sm:text-base leading-relaxed">
                    &#34;{testimonial.content}&#34;
                  </blockquote>
                  <footer>
                    <div className="text-white font-semibold text-sm sm:text-base">{testimonial.name}</div>
                    <div className="text-slate-400 text-xs sm:text-sm">{testimonial.role}</div>
                  </footer>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Social Proof - Mobile Optimized */}
      <div className="relative z-10 py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-slate-800/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h3 className="text-xl sm:text-2xl font-semibold text-white mb-4">
              Trusted by 2,500+ fitness professionals
            </h3>
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-3 sm:space-y-0 sm:space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <span className="text-white text-sm sm:text-base">4.8/5 from 200+ reviews</span>
              </div>
              <div className="hidden sm:block text-slate-300">•</div>
              <div className="text-white text-sm sm:text-base">Featured in TechCrunch</div>
              <div className="hidden sm:block text-slate-300">•</div>
              <div className="text-white text-sm sm:text-base">Y Combinator S24</div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced CTA Section - Mobile Optimized */}
      <div className="relative z-10 py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
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
