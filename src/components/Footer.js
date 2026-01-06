import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Links */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 mb-4 md:mb-0">
            <Link to="/faq" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
              FAQ
            </Link>
            <Link to="mailto:registrars@apel.ng" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
              Contact Us
            </Link>
          </div>
          <div className="text-sm text-gray-300">
            <span className="font-semibold">LASACO ASSURANCE PLC</span>
          </div>
        </div>
        
        {/* Copyright */}
        <div className="border-t border-gray-700 pt-4">
          <p className="text-center text-smC text-gray-400">
            2025 All Rights Reserved. APEL CAPITAL REGISTRARS
            <br />
            APEL is registered and regulated by the Securities and Exchange Commission, Nigeria.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;