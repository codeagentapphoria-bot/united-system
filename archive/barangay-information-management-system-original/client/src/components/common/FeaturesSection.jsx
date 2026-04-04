import {
  FileText,
  MapPin,
  Calendar,
  Shield,
  Users,
  Clock,
  Smartphone,
  Globe,
  CheckCircle,
  ArrowRight,
  Phone,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { PUBLIC_ROUTES } from "@/constants/routes";

const features = [
  {
    icon: FileText,
    title: "Digital Certificates",
    description:
      "Request and receive official barangay certificates digitally with secure processing and fast delivery.",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    link: PUBLIC_ROUTES.REQUEST,
  },
  {
    icon: Calendar,
    title: "Online Appointments",
    description:
      "Schedule appointments with barangay officials for consultations, meetings, and official transactions.",
    color: "text-green-600",
    bgColor: "bg-green-50",
    link: PUBLIC_ROUTES.TRACK,
  },
  {
    icon: MapPin,
    title: "Request Tracking",
    description:
      "Track the status of your requests in real-time with transparent processing updates.",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    link: PUBLIC_ROUTES.TRACK,
  },
  {
    icon: Shield,
    title: "Secure Processing",
    description:
      "Your data is protected with enterprise-grade security and privacy measures.",
    color: "text-red-600",
    bgColor: "bg-red-50",
    link: PUBLIC_ROUTES.CONTACT,
  },
  {
    icon: Phone,
    title: "24/7 Support",
    description:
      "Get assistance anytime with our responsive support system and contact channels.",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    link: PUBLIC_ROUTES.CONTACT,
  },
  {
    icon: Clock,
    title: "Fast Service",
    description:
      "Access barangay services anytime, anywhere with our responsive web platform.",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    link: PUBLIC_ROUTES.REQUEST,
  },
];

const benefits = [
  "No more long queues at the barangay hall",
  "Secure digital document processing",
  "Real-time request status updates",
  "Mobile-friendly interface",
  "24/7 service availability",
  "Reduced processing time",
];

export function FeaturesSection() {
  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-background to-muted/30">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6">
            Resident Services
          </h2>
          <p className="text-sm sm:text-base lg:text-xl text-muted-foreground max-w-3xl mx-auto">
            Access essential barangay services from the comfort of your home.
            Get certificates, schedule appointments, and track your requests
            with ease.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-16 sm:mb-20">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group bg-background rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-soft hover-lift border border-border/50 transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div
                  className={`w-12 h-12 sm:w-16 sm:h-16 ${feature.bgColor} rounded-lg sm:rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className={`w-6 h-6 sm:w-8 sm:h-8 ${feature.color}`} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 leading-relaxed">
                  {feature.description}
                </p>
                <Link
                  to={feature.link}
                  className="inline-flex items-center text-primary hover:text-primary/80 font-medium group/link text-sm sm:text-base"
                >
                  Learn more
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2 transition-transform group-hover/link:translate-x-1" />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Benefits Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
          <div>
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 sm:mb-6">
              Why Choose Digital Services?
            </h3>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mb-6 sm:mb-8 leading-relaxed">
              Say goodbye to traditional paper-based processes and embrace the
              digital revolution. BIMS streamlines all barangay services for a
              more efficient and accessible experience.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {benefits.map((benefit, index) => (
                <div key={benefit} className="flex items-center space-x-2 sm:space-x-3">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                  <span className="text-foreground text-sm sm:text-base">{benefit}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 sm:mt-8">
              <Button size="lg" asChild className="text-sm sm:text-base">
                <Link to={PUBLIC_ROUTES.REQUEST}>
                  Get Started Now
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-border/50">
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                    <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground text-sm sm:text-base">
                      Mobile First
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Access from any device
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground text-sm sm:text-base">
                      Always Online
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      24/7 service availability
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground text-sm sm:text-base">
                      Secure & Private
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Your data is protected
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground text-sm sm:text-base">
                      Instant Notifications
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Stay updated on your requests
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating elements */}
            <div className="absolute -top-2 sm:-top-4 -right-2 sm:-right-4 w-6 h-6 sm:w-8 sm:h-8 bg-accent/20 rounded-full animate-pulse"></div>
            <div
              className="absolute -bottom-2 sm:-bottom-4 -left-2 sm:-left-4 w-4 h-4 sm:w-6 sm:h-6 bg-primary/20 rounded-full animate-pulse"
              style={{ animationDelay: "2s" }}
            ></div>
          </div>
        </div>
      </div>
    </section>
  );
}
