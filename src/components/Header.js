import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/images/logo.png';
import logo2 from '../assets/images/lasaco.jpg';

const Header = () => {

  return (
    <header className="bg-gray-100 text-gray-900 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <img
              src={logo}
              alt="APEL CAPITAL REGISTRARS"
              className="h-20 sm:h-20 md:h-22 w-auto object-contain"
            />
          </Link>

          {/* Second Logo */}
          <div className="ml-6">
            <img
              src={logo2}
              alt="TIP"
              className="h-16 w-auto object-contain"
            />
          </div>
        </div>
      </div>

    </header>
  );
};

export default Header;