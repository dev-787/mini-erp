import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getBreadcrumbForPath } from '../../config/sidebarConfig';
import './DashboardNavbar.css';

const DashboardNavbar = ({ onMobileToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const companyName = user?.company_name || user?.company || 'Rapid Enterprise';
  const currentSection = getBreadcrumbForPath(location.pathname);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="app-navbar">
      <div className="app-navbar-left">
        <button
          type="button"
          className="app-navbar-mobile-toggle"
          onClick={onMobileToggle}
          aria-label="Toggle Mobile Menu"
        >
          <Menu size={20} />
        </button>

        <div className="app-navbar-breadcrumb">
          <span className="app-navbar-company">{companyName}</span>
          <span className="app-navbar-breadcrumb-divider">/</span>
          <span className="app-navbar-section">{currentSection}</span>
        </div>
      </div>

      <div className="app-navbar-right">
        {/* Placeholder Search Input */}
        <div className="app-navbar-search-wrapper">
          <Search size={16} className="app-navbar-search-icon" />
          <input
            type="text"
            className="app-navbar-search-input"
            placeholder="Search views or features..."
            disabled
          />
        </div>

        {/* Logout Button */}
        <button
          type="button"
          className="app-navbar-logout-btn"
          onClick={handleLogout}
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

export default DashboardNavbar;
