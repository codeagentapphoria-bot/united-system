// React imports
import React, { useEffect, useState } from 'react';

// Third-party libraries
import { Link } from 'react-router-dom';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Custom Components
import { PortalLayout } from '@/components/layout/PortalLayout';
import { HomepageFAQs } from '@/components/portal/faqs/HomepageFAQs';

// Hooks
import { useAuth } from '@/context/AuthContext';
import { useLoginSheet } from '@/context/LoginSheetContext';
import { useToast } from '@/hooks/use-toast';

// Utils
import { cn } from '@/lib/utils';
import { FiArrowRight, FiCreditCard, FiFileText, FiMessageSquare, FiShield, FiZap, FiBarChart, FiCheck } from 'react-icons/fi';

// Supabase
import { supabase } from '@/lib/supabase';

export const PortalHome: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { openLoginSheet } = useLoginSheet();
  const { toast } = useToast();
  const [_isGoogleAuthLoading, setIsGoogleAuthLoading] = useState(false);

  // Handle Supabase Auth state changes (Google OAuth callback)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // User signed in via Supabase Auth (Google OAuth)
        const googleEmail = session.user.email;
        const googleId = session.user.id;

        setIsGoogleAuthLoading(true);

        try {
          // Call backend to verify and login with Supabase Google account
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/portal/google/supabase`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              googleId,
              googleEmail,
            }),
            credentials: 'include',
          });

          const data = await response.json();

          if (!response.ok) {
            if (data.error === 'not_registered') {
              toast({
                variant: 'destructive',
                title: 'Account Not Found',
                description: 'This Google account is not registered. Please sign up first.',
              });
              // Sign out from Supabase since user doesn't exist in our system
              await supabase.auth.signOut();
            } else {
              toast({
                variant: 'destructive',
                title: 'Login Failed',
                description: data.message || 'Failed to login with Google. Please try again.',
              });
              await supabase.auth.signOut();
            }
            return;
          }

          // Success - user is now linked and logged in
          toast({
            title: 'Welcome!',
            description: 'You have successfully logged in with Google.',
          });

          // Force reload to refresh auth state
          window.location.reload();
        } catch (err) {
          console.error('Error linking Google account:', err);
          toast({
            variant: 'destructive',
            title: 'Login Failed',
            description: 'Failed to complete Google login. Please try again.',
          });
          await supabase.auth.signOut();
        } finally {
          setIsGoogleAuthLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        // Session cleared
      }
    });

    // Check URL for error parameters (from old custom OAuth flow - backwards compatibility)
    const urlParams = new URLSearchParams(window.location.search);
    const googleError = urlParams.get('google_error');
    if (googleError) {
      let errorMessage = 'Google login failed. Please try again.';

      if (googleError === 'not_registered') {
        errorMessage = 'This Google account is not registered. Please sign up first.';
      }

      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: errorMessage,
      });
      // Clean up URL
      window.history.replaceState({}, '', '/portal');
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  const services = [
    {
      icon: <FiFileText size={32} />,
      title: 'E-Government',
      description: 'Access government services and submit requests online',
      path: '/portal/e-government',
      color: 'bg-primary-100 text-primary-700',
    },
    {
      icon: <FiCreditCard size={32} />,
      title: 'E-Bills',
      description: 'View and pay your bills conveniently online',
      path: '/portal/e-bills',
      color: 'bg-green-100 text-green-700',
    },
    {
      icon: <FiMessageSquare size={32} />,
      title: 'E-News',
      description: 'Stay updated with latest government news and announcements',
      path: '/portal/e-news',
      color: 'bg-orange-100 text-orange-700',
    },
  ];

  return (
    <PortalLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-12">
        {/* Hero Section - Registration Focus */}
        {!isLoading && !user ? (
          <div className="bg-primary-700 rounded-2xl p-8 md:p-12 mb-10 lg:mb-16 text-white relative overflow-hidden">
            {/* Subtle geometric pattern */}
            <div className="absolute inset-0 opacity-5">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#grid)" />
              </svg>
            </div>
            <div className="relative max-w-3xl mx-auto text-center">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 lg:mb-6 leading-tight">
                Register as a Resident of Borongan
              </h1>
              <p className="text-lg md:text-xl lg:text-2xl mb-8 opacity-90">
                Official Municipal Resident Registry
              </p>

              {/* Benefits - Clean structured cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                {[
                  { icon: FiFileText, label: "Official Record", sub: "Verified citizen database" },
                  { icon: FiShield, label: "Verified Records", sub: "City Hall authenticated" },
                  { icon: FiZap, label: "Faster Service", sub: "Skip the queue" },
                  { icon: FiBarChart, label: "Track Online", sub: "Monitor applications" },
                ].map((item, idx) => (
                  <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10 hover:bg-white/15 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center mx-auto mb-3">
                      <item.icon size={20} className="text-white" />
                    </div>
                    <div className="text-sm font-semibold mb-1">{item.label}</div>
                    <div className="text-xs text-white/70">{item.sub}</div>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  asChild
                  size="lg"
                  className="bg-white text-primary-700 hover:bg-gray-100 font-semibold px-8"
                >
                  <Link to="/portal/register">
                    Register Now
                    <FiArrowRight className="ml-2" size={20} />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-2 border-white text-white bg-primary-700 hover:bg-primary-500/10 font-semibold px-8"
                >
                  <Link to="/portal/e-government">
                    Explore Services
                  </Link>
                </Button>
              </div>

              {/* Trust line */}
              <div className="flex items-center justify-center gap-2 mt-8 text-sm text-white/70">
                <FiCheck className="w-4 h-4" />
                <span>Free registration</span>
                <span className="mx-2">•</span>
                <span>City Hall verified</span>
                <span className="mx-2">•</span>
                <span>Your data is secured</span>
              </div>
            </div>
          </div>
        ) : (
          /* Default Hero for logged-in users */
          <div className="text-center mb-10 lg:mb-16">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-heading-700 mb-4 lg:mb-6 leading-tight">
              Welcome to City of Borongan
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-heading-600 mb-6 lg:mb-8 max-w-3xl mx-auto px-2">
              Your gateway to government services. Access services, pay bills, and stay informed all in one place.
            </p>
          </div>
        )}

        {/* Services Grid */}
        <div className="mb-10 lg:mb-16">
          <h2 className="text-2xl lg:text-3xl font-bold text-heading-700 mb-6 lg:mb-8 text-center">
            Available Services
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className={cn('w-16 h-16 rounded-lg flex items-center justify-center mb-4', service.color)}>
                    {service.icon}
                  </div>
                  <CardTitle className="text-xl text-heading-700">{service.title}</CardTitle>
                  <CardDescription className="text-base mt-2">
                    {service.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full border-primary-600 text-primary-600 hover:bg-primary-50"
                  >
                    <Link to={service.path}>
                      Learn More
                      <FiArrowRight className="ml-2" size={16} />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:p-8 mb-10 lg:mb-16">
          <h2 className="text-2xl lg:text-3xl font-bold text-heading-700 mb-6 lg:mb-8 text-center">
            Why Choose City of Borongan Local Government System?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
                <FiFileText size={32} className="text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-heading-700 mb-2">Easy Access</h3>
              <p className="text-heading-600">
                Access all government services from the comfort of your home
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
                <FiCreditCard size={32} className="text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-heading-700 mb-2">Secure Payments</h3>
              <p className="text-heading-600">
                Pay your bills securely with multiple payment options
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
                <FiMessageSquare size={32} className="text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-heading-700 mb-2">Stay Informed</h3>
              <p className="text-heading-600">
                Get the latest news and announcements from the government
              </p>
            </div>
          </div>
        </div>

        {/* FAQs Section */}
        <div className="mb-10 lg:mb-16">
          <HomepageFAQs />
        </div>

        {/* Call to Action */}
        {!isLoading && !user && (
          <div className="bg-primary-600 rounded-lg p-6 lg:p-8 text-center text-white">
            <h2 className="text-2xl lg:text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-base lg:text-lg mb-6 opacity-90">
              Create an account to access all services and manage your transactions
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-white text-primary-600 hover:bg-gray-100"
              >
                <Link to="/portal/register">
                  Register
                  <FiArrowRight className="ml-2" size={20} />
                </Link>
              </Button>
              <Button
                onClick={openLoginSheet}
                variant="outline"
                size="lg"
                className="border-primary-900 text-white hover:text-primary-900 hover:bg-white bg-primary-900"
              >
                Already have an account? Login
              </Button>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
};

