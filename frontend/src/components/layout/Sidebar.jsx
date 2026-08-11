import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { sidebarSections } from '../../config/sidebarConfig';
import rapidLogo from '../../assets/new-rapid-logo.png';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const location = useLocation();
  const userRole = user?.role?.toLowerCase() || 'sales';

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  const roleClassMap = {
    admin: 'role-badge-admin',
    sales: 'role-badge-sales',
    warehouse: 'role-badge-warehouse',
    accounts: 'role-badge-accounts',
  };

  const badgeClass = roleClassMap[userRole] || 'role-badge-sales';

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        className={`app-sidebar-overlay ${isOpen ? 'mobile-open' : ''}`}
        onClick={onClose}
      />

      {/* Main Sidebar Drawer */}
      <aside className={`app-sidebar ${isOpen ? 'mobile-open' : ''}`}>
        {/* Header / Brand */}
        <div className="app-sidebar-header">
          <NavLink to="/dashboard" className="app-sidebar-brand" onClick={onClose}>
            <img src={rapidLogo} alt="Logo" className="app-sidebar-logo" />
            <span className="app-sidebar-title">Rapid ERP</span>
          </NavLink>

          <button
            type="button"
            className="app-sidebar-mobile-close"
            onClick={onClose}
            aria-label="Close Sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items grouped by section */}
        <nav className="app-sidebar-nav">
          {sidebarSections.map((section) => {
            // Filter items permitted for the user's role
            const visibleItems = section.items.filter((item) =>
              item.roles.includes(userRole)
            );

            // Hide entire section if no items are visible for this role
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.id} className="app-sidebar-group">
                <div className="app-sidebar-group-label">{section.label}</div>
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.path === '/dashboard'
                      ? location.pathname === '/dashboard'
                      : location.pathname.startsWith(item.path);

                  return (
                    <NavLink
                      key={item.id}
                      to={item.path}
                      className={`app-sidebar-item ${isActive ? 'active' : ''}`}
                      onClick={onClose}
                    >
                      <div className="app-sidebar-item-icon">
                        <Icon size={18} />
                      </div>
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User Profile Block at Bottom */}
        <div className="app-sidebar-footer">
          <div className="app-sidebar-user">
            <div className="app-sidebar-avatar">{userInitial}</div>
            <div className="app-sidebar-user-details">
              <div className="app-sidebar-user-name" title={user?.name || 'User'}>
                {user?.name || 'User Name'}
              </div>
              <span className={`app-sidebar-user-role-badge ${badgeClass}`}>
                {userRole}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
