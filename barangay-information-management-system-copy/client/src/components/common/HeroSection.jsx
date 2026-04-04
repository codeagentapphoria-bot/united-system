import {
  ArrowRight,
  CheckCircle,
  Star,
  Users,
  Shield,
  Clock,
  Award,
  FileText,
  Calendar,
  Code,
  Mail,
  Home,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useBarangay } from "@/contexts/BarangayContext";
import { PUBLIC_ROUTES } from "@/constants/routes";
import heroBg2Image from "@/assets/hero-bg-2.jpg";

export function HeroSection() {
  const { selectedBarangay } = useBarangay();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Enhanced Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroBg2Image}
          alt="Municipality"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800/80 via-blue-700/60 to-sky-500/40"></div>
        {/* Additional overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20"></div>
      </div>

      {/* Modern Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-40 h-40 bg-sky-300/12 rounded-full animate-pulse blur-xl"></div>
        <div
          className="absolute bottom-32 right-16 w-32 h-32 bg-blue-300/12 rounded-full animate-pulse blur-xl"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute top-1/3 right-20 w-24 h-24 bg-slate-300/10 rounded-full animate-pulse blur-xl"
          style={{ animationDelay: "4s" }}
        ></div>
        <div
          className="absolute top-1/2 left-20 w-28 h-28 bg-sky-200/10 rounded-full animate-pulse blur-xl"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute bottom-1/3 left-1/4 w-20 h-20 bg-blue-200/10 rounded-full animate-pulse blur-xl"
          style={{ animationDelay: "3s" }}
        ></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 text-center">
        <div className="animate-fade-in">
          {/* Modern Badge */}
          <div className="inline-flex items-center px-4 sm:px-6 lg:px-8 py-3 sm:py-4 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white mb-8 sm:mb-12 animate-slide-down shadow-lg">
            <Star className="w-4 h-4 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-sky-400" />
            <span className="text-xs sm:text-sm lg:text-base font-semibold tracking-wide">
              Barangay Information Management System
            </span>
          </div>

          {/* Improved Main Heading with Better Typography */}
          <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-6 sm:mb-8 leading-tight sm:leading-loose animate-slide-up">
            <span className="block mb-2 sm:mb-3">Welcome to Your</span>
            <span className="block text-gradient pb-2 sm:pb-4">
              Digital Barangay
            </span>
          </h1>

          {/* Enhanced Subtitle with Better Readability */}
          <p
            className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-white mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed animate-slide-up font-medium"
            style={{ animationDelay: "0.2s" }}
          >
            Experience the future of barangay services with BIMS - where modern
            technology meets exceptional community service. Secure, efficient,
            and designed for you.
          </p>

          {/* Redesigned Feature Highlights */}
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-12 sm:mb-16 animate-slide-up max-w-4xl mx-auto"
            style={{ animationDelay: "0.4s" }}
          >
            {[
              {
                name: "Digital Certificates",
                icon: FileText,
                color: "text-sky-400",
                bgColor: "bg-sky-400/10",
              },
              {
                name: "Appointments",
                icon: Calendar,
                color: "text-blue-300",
                bgColor: "bg-blue-300/10",
              },
              {
                name: "Fast Service",
                icon: Clock,
                color: "text-slate-300",
                bgColor: "bg-slate-300/10",
              },
              {
                name: "Secure Processing",
                icon: Shield,
                color: "text-sky-300",
                bgColor: "bg-sky-300/10",
              },
            ].map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.name}
                  className={`flex flex-col items-center p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl ${feature.bgColor} backdrop-blur-sm border border-white/20 text-white animate-slide-up hover:scale-105 transition-transform duration-300`}
                  style={{ animationDelay: `${0.6 + index * 0.1}s` }}
                >
                  <div className={`p-2 sm:p-3 rounded-full bg-white/10 mb-2 sm:mb-3`}>
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 ${feature.color}`} />
                  </div>
                  <span className="font-semibold text-xs sm:text-sm md:text-base text-center">{feature.name}</span>
                </div>
              );
            })}
          </div>

          {/* Enhanced CTA Buttons */}
          <div
            className="flex flex-row sm:flex-row gap-4 sm:gap-6 justify-center items-center mb-12 sm:mb-16 animate-slide-up"
            style={{ animationDelay: "0.8s" }}
          >
            <Button
              size="lg"
              variant="hero"
              asChild
              className="group text-sm sm:text-base lg:text-lg px-6 sm:px-8 lg:px-10 py-4 sm:py-5 lg:py-6 bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600 text-white font-bold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              <Link to={PUBLIC_ROUTES.REQUEST}>
                Get Certificates
                <ArrowRight className="ml-2 sm:ml-3 w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 transition-transform group-hover:translate-x-2" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="group text-sm sm:text-base lg:text-lg px-6 sm:px-8 lg:px-10 py-4 sm:py-5 lg:py-6 bg-white/15 backdrop-blur-md border-white/30 text-white hover:bg-white/25 font-bold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              <Link to={PUBLIC_ROUTES.TRACK}>Track Requests</Link>
            </Button>
          </div>

          {/* Enhanced Barangay Selection Prompt */}
          {!selectedBarangay && (
            <div
              className="mt-12 sm:mt-16 animate-slide-up"
              style={{ animationDelay: "1.4s" }}
            >
              <div className="bg-white/10 backdrop-blur-md rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto border border-white/20 shadow-2xl">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-3 sm:mb-4">
                  Select Your Barangay
                </h3>
                <p className="text-white/90 mb-4 sm:mb-6 text-sm sm:text-base lg:text-lg">
                  Choose your barangay to access personalized services and local
                  information
                </p>
                <div className="flex justify-center">
                  <div className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-white/20 rounded-lg sm:rounded-xl text-white backdrop-blur-sm border border-white/30">
                    <Star className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 text-sky-400" />
                    <span className="font-medium text-sm sm:text-base">
                      Use the selector in the header
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Scroll Indicator */}
      <div className="absolute bottom-4 sm:bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 sm:w-8 sm:h-12 border-2 border-white/40 rounded-full flex justify-center backdrop-blur-sm">
          <div className="w-0.5 sm:w-1 h-3 sm:h-4 bg-white/80 rounded-full mt-1.5 sm:mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>
  );
}
