// React imports
import React from 'react';

// Third-party libraries
import { Link } from 'react-router-dom';

// Utils
import { FiMail, FiMapPin, FiPhone } from 'react-icons/fi';

interface PortalFooterProps {}

export const PortalFooter: React.FC<PortalFooterProps> = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    services: [
      { label: 'E-Government', path: '/portal/e-government' },
      { label: 'E-Bills', path: '/portal/e-bills' },
      { label: 'E-Services', path: '/portal/e-services' },
    ],
    information: [
      { label: 'E-News', path: '/portal/e-news' },
      { label: 'About Us', path: '/portal/about' },
      { label: 'Contact', path: '/portal/contact' },
      { label: 'Privacy Policy', path: '/portal/privacy' },
    ],
  };

  return (
    <footer className="bg-heading-900 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <img 
                src="/logo-white.svg" 
                alt="City of Borongan Logo" 
                className="h-8 w-auto"
              />
              <h3 className="text-lg font-semibold">City of Borongan</h3>
            </div>
            <p className="text-sm text-gray-300">
              Local Government System. Your gateway to government services. Access services, pay bills, and stay informed.
            </p>
          </div>

          {/* Services Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">Services</h4>
            <ul className="space-y-2">
              {footerLinks.services.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Information Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">Information</h4>
            <ul className="space-y-2">
              {footerLinks.information.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Information */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3">
                <FiMapPin size={18} className="mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-300">
                  City Hall, Borongan City, Eastern Samar
                </span>
              </li>
              <li className="flex items-center space-x-3">
                <FiPhone size={18} className="flex-shrink-0" />
                <span className="text-sm text-gray-300">(055) 261-2000</span>
              </li>
              <li className="flex items-center space-x-3">
                <FiMail size={18} className="flex-shrink-0" />
                <span className="text-sm text-gray-300">info@borongan.gov.ph</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-gray-400">
              © {currentYear} City of Borongan Local Government System. All rights reserved.
            </p>
            <p className="text-sm text-gray-400">
              A service of the Local Government Unit
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

