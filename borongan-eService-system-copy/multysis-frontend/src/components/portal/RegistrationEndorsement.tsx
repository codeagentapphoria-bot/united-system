import React from 'react';
import { Link } from 'react-router-dom';
import { FiUser, FiCheckCircle, FiArrowRight, FiShield } from 'react-icons/fi';
import { Button } from '@/components/ui/button';

const benefits = [
  "Official City ID Card - Your key to government services",
  "Access to Government Services - Use your ID to avail services at City Hall",
  "Faster Transactions - Skip the queue with verified digital records",
  "Track Applications Online - Monitor your requests from submission to completion",
];

export const RegistrationEndorsement: React.FC = () => {
  return (
    <div className="bg-blue-50 rounded-lg border-l-4 border-l-primary-500 border-r border-b border-gray-200 shadow-sm p-6 md:p-8 mb-10 lg:mb-16">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        {/* Icon Section */}
        <div className="flex-shrink-0">
          <div className="w-16 h-16 rounded-lg bg-primary-100 flex items-center justify-center">
            <FiUser size={32} className="text-primary-700" />
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1">
          <h2 className="text-xl md:text-2xl font-bold text-heading-700 mb-1">
            Get Your City ID Today
          </h2>
          <p className="text-sm text-primary-600 font-medium mb-3">
            Official Municipal Resident Registry • City of Borongan
          </p>
          <p className="text-heading-600 mb-4">
            Your registration is the first step to becoming a verified citizen of Borongan
          </p>
          
          {/* Benefits List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-2">
                <FiCheckCircle className="flex-shrink-0 w-5 h-5 text-green-600 mt-0.5" />
                <span className="text-sm text-heading-600">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Button & Trust Badges */}
        <div className="flex-shrink-0 mt-4 md:mt-0 flex flex-col items-start md:items-end gap-3">
          <Button
            asChild
            size="lg"
            className="bg-primary-600 hover:bg-primary-700 text-white"
          >
            <Link to="/portal/register">
              Register Now
              <FiArrowRight className="ml-2" size={18} />
            </Link>
          </Button>
          <div className="flex items-center gap-2 text-xs text-heading-500">
            <span className="flex items-center gap-1">
              <FiShield className="w-3 h-3" />
              Free
            </span>
            <span>•</span>
            <span>City Hall Verified</span>
            <span>•</span>
            <span>Secured</span>
          </div>
        </div>
      </div>
    </div>
  );
};