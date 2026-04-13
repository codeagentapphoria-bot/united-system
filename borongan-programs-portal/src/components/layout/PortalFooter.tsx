import React from 'react';
import { FiMail, FiMapPin, FiPhone } from 'react-icons/fi';

const ESERVICES_URL = import.meta.env.VITE_ESERVICES_PORTAL_URL || 'http://localhost:5174';

const footerLinks = {
  services: [
    { label: 'E-Government', href: `${ESERVICES_URL}/portal/e-government` },
    { label: 'E-Bills', href: `${ESERVICES_URL}/portal/e-bills` },
    { label: 'E-Services', href: `${ESERVICES_URL}/portal/e-services` },
    { label: 'External Websites', href: `${ESERVICES_URL}/portal/external-websites` },
  ],
  information: [
    { label: 'E-News', href: `${ESERVICES_URL}/portal/e-news` },
    { label: 'FAQs', href: `${ESERVICES_URL}/portal/faqs` },
    { label: 'E-Services Portal', href: ESERVICES_URL },
  ],
};

export const PortalFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-heading-900 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <img src="/logo-white.svg" alt="City of Borongan Logo" className="h-8 w-auto" onError={(e) => (e.currentTarget.style.display = 'none')} />
              <h3 className="text-lg font-semibold">City of Borongan</h3>
            </div>
            <p className="text-sm text-gray-300">
              Local Government System. Your gateway to government services and programs.
            </p>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">Services</h4>
            <ul className="space-y-2">
              {footerLinks.services.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Information */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">Information</h4>
            <ul className="space-y-2">
              {footerLinks.information.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3">
                <FiMapPin size={18} className="mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-300">City Hall, Borongan City, Eastern Samar</span>
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

        <div className="mt-8 pt-8 border-t border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-gray-400">
              © {currentYear} City of Borongan Local Government System. All rights reserved.
            </p>
            <p className="text-sm text-gray-400">A service of the Local Government Unit</p>
          </div>
        </div>
      </div>
    </footer>
  );
};
