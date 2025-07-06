'use client'

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Calendar, TrendingUp, Dumbbell, Star, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";

function HomeComponent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-500"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-6">
        <div className="flex items-center space-x-2">
          <Dumbbell className="h-8 w-8 text-white" />
          <span className="text-2xl font-bold text-white">GymSaaS</span>
        </div>
        <div className="space-x-4">
          <Link href="/login">
            <Button variant="outline" className="text-white border-white hover:bg-white hover:text-slate-900">
              Log In
            </Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-white text-slate-900 hover:bg-slate-100">
              Sign Up
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className={`relative z-10 flex flex-col items-center justify-center min-h-[80vh] text-center px-4 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
          Transform Your <br />
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Gym Management
          </span>
        </h1>
        <p className="text-xl text-slate-300 mb-8 max-w-2xl">
          The all-in-one platform to manage members, track workouts, and grow your fitness business with powerful analytics and seamless automation.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/signup">
            <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-4 text-lg">
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-slate-900 px-8 py-4 text-lg">
            Watch Demo
          </Button>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-16">
            Everything you need to run your gym
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardContent className="p-8">
                <Users className="h-12 w-12 text-purple-400 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">Member Management</h3>
                <p className="text-slate-300">
                  Effortlessly manage member profiles, track memberships, and handle billing with our intuitive dashboard.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardContent className="p-8">
                <Calendar className="h-12 w-12 text-pink-400 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">Class Scheduling</h3>
                <p className="text-slate-300">
                  Schedule classes, manage trainers, and let members book sessions through an easy-to-use interface.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardContent className="p-8">
                <TrendingUp className="h-12 w-12 text-blue-400 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">Analytics & Reports</h3>
                <p className="text-slate-300">
                  Get insights into your business with detailed analytics, revenue tracking, and performance metrics.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Social Proof Section */}
      <div className="relative z-10 py-16 px-4 bg-slate-800/30">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-2xl font-semibold text-white mb-8">
            Trusted by fitness professionals worldwide
          </h3>
          <div className="flex justify-center items-center space-x-8 opacity-60">
            <div className="flex items-center space-x-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
              ))}
              <span className="text-white ml-2">4.9/5 from 500+ reviews</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to revolutionize your gym?
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Join thousands of gym owners who have transformed their business with GymSaaS.
          </p>
          <Link href="/signup">
            <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-12 py-6 text-xl">
              Get Started Today
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// Remove Suspense wrapper since we no longer use useSearchParams
export default HomeComponent;
