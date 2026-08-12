import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Mail,
  UserPlus,
  Search,
  Filter,
  Shield,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  X,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { fetchUsers, updateUserStatus } from '../../api/user.api';
import { createInvite, getInvites, revokeInvite, resendInvite } from '../../api/auth.api';
import './users.css';

const UsersPage = () => {
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  // Tabs: 'team' | 'invites'
  const [activeTab, setActiveTab] = useState('team');

  // Team Members State
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');

  // Confirmation Modal State for Disabling User
  const [confirmDisableTarget, setConfirmDisableTarget] = useState(null);

  // Invites State
  const [invites, setInvites] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [invitesError, setInvitesError] = useState('');
  const [inviteSearch, setInviteSearch] = useState('');

  // Invite Modal & Action State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('sales');
  const [modalError, setModalError] = useState('');
  const [submittingInvite, setSubmittingInvite] = useState(false);

  // Success Toast / Copy State
  const [toastMessage, setToastMessage] = useState(null);
  const [latestInviteLink, setLatestInviteLink] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Load Users Data
  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    setUsersError('');
    try {
      const res = await fetchUsers({
        search: userSearch.trim(),
        role: userRoleFilter,
        status: userStatusFilter,
      });
      setUsers(res.users || []);
    } catch (err) {
      console.error('Fetch users error:', err);
      setUsersError(err.message || 'Failed to load team members.');
    } finally {
      setLoadingUsers(false);
    }
  }, [isAdmin, userSearch, userRoleFilter, userStatusFilter]);

  // Load Invites Data
  const loadInvites = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingInvites(true);
    setInvitesError('');
    try {
      const res = await getInvites();
      setInvites(res.invites || []);
    } catch (err) {
      console.error('Fetch invites error:', err);
      setInvitesError(err.message || 'Failed to load invites list.');
    } finally {
      setLoadingInvites(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadInvites();
    }
  }, [isAdmin, loadUsers, loadInvites]);

  // Toast Helper
  const showToast = (msg, link = '') => {
    setToastMessage(msg);
    if (link) setLatestInviteLink(link);
    setTimeout(() => {
      setToastMessage(null);
    }, 6000);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Toggle User Active / Disabled Status
  const handleToggleStatus = async (targetUser) => {
    const nextStatus = targetUser.status === 'disabled' ? 'active' : 'disabled';

    if (nextStatus === 'disabled') {
      setConfirmDisableTarget(targetUser);
      return;
    }

    try {
      const res = await updateUserStatus(targetUser.id, nextStatus);
      showToast(`User ${targetUser.name} (${targetUser.email}) is now Active.`);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, status: 'active' } : u))
      );
    } catch (err) {
      alert(err.message || 'Failed to update user status.');
    }
  };

  const executeDisableUser = async () => {
    if (!confirmDisableTarget) return;
    try {
      await updateUserStatus(confirmDisableTarget.id, 'disabled');
      showToast(`User ${confirmDisableTarget.name} has been Disabled.`);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === confirmDisableTarget.id ? { ...u, status: 'disabled' } : u
        )
      );
      setConfirmDisableTarget(null);
    } catch (err) {
      alert(err.message || 'Failed to disable user account.');
    }
  };

  // Submit New Invite
  const handleSendInviteSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!inviteEmail.trim()) {
      setModalError('Please enter a valid email address.');
      return;
    }

    setSubmittingInvite(true);
    try {
      const res = await createInvite({
        email: inviteEmail.trim(),
        role: inviteRole,
      });

      setIsInviteModalOpen(false);
      setInviteEmail('');
      showToast(`Invite link created for ${res.invite?.email || inviteEmail}!`, res.inviteLink);
      loadInvites();
    } catch (err) {
      // Surface 409 inline error message
      setModalError(err.message || 'Failed to send invite.');
    } finally {
      setSubmittingInvite(false);
    }
  };

  // Revoke Pending Invite
  const handleRevokeInvite = async (inviteId, email) => {
    if (!window.confirm(`Are you sure you want to revoke the invitation for ${email}?`)) return;
    try {
      await revokeInvite(inviteId);
      showToast(`Invitation for ${email} has been revoked.`);
      loadInvites();
    } catch (err) {
      alert(err.message || 'Failed to revoke invite.');
    }
  };

  // Resend Pending / Expired Invite
  const handleResendInvite = async (inviteId, email) => {
    try {
      const res = await resendInvite(inviteId);
      showToast(`Invitation resent to ${email}!`, res.inviteLink);
      loadInvites();
    } catch (err) {
      alert(err.message || 'Failed to resend invite.');
    }
  };

  // Filtered Invites Client-Side Search
  const filteredInvites = invites.filter((inv) => {
    if (!inviteSearch.trim()) return true;
    const q = inviteSearch.toLowerCase();
    return inv.email.toLowerCase().includes(q) || inv.role.toLowerCase().includes(q);
  });

  if (!isAdmin) {
    return (
      <div className="users-container">
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '12px',
            padding: '32px',
            textAlign: 'center',
            color: '#991B1B',
          }}
        >
          <Shield size={48} style={{ marginBottom: '12px', color: '#DC2626' }} />
          <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '700' }}>
            Access Restricted
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#7F1D1D' }}>
            User management & invitation controls are restricted to Administrators only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="users-container">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="toast-success-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={20} color="#059669" />
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#065F46' }}>
                {toastMessage}
              </div>
              {latestInviteLink && (
                <div style={{ fontSize: '12px', color: '#047857', marginTop: '2px' }}>
                  Link: <code style={{ background: '#FFF', padding: '2px 6px', borderRadius: '4px' }}>{latestInviteLink}</code>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {latestInviteLink && (
              <button
                type="button"
                onClick={() => copyToClipboard(latestInviteLink)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  background: '#059669',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                {copiedLink ? 'Copied' : 'Copy Link'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#065F46' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="users-header-card">
        <div>
          <h1 className="users-header-title">Team & Invites</h1>
          <p className="users-header-subtitle">
            Manage system team members, assign access roles, and track invitation links.
          </p>
        </div>

        <button
          type="button"
          className="users-btn-primary"
          onClick={() => {
            setModalError('');
            setInviteEmail('');
            setInviteRole('sales');
            setIsInviteModalOpen(true);
          }}
        >
          <UserPlus size={18} />
          <span>Invite Teammate</span>
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="users-tabs-bar">
        <button
          type="button"
          className={`users-tab-btn ${activeTab === 'team' ? 'active' : ''}`}
          onClick={() => setActiveTab('team')}
        >
          <Users size={18} />
          <span>Team Members</span>
          <span className="users-tab-count">{users.length}</span>
        </button>

        <button
          type="button"
          className={`users-tab-btn ${activeTab === 'invites' ? 'active' : ''}`}
          onClick={() => setActiveTab('invites')}
        >
          <Mail size={18} />
          <span>Invites</span>
          <span className="users-tab-count">{invites.length}</span>
        </button>
      </div>

      {/* TAB 1: TEAM MEMBERS */}
      {activeTab === 'team' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Filters Toolbar */}
          <div className="users-toolbar">
            <div className="users-search-wrapper">
              <Search size={16} className="users-search-icon" />
              <input
                type="text"
                className="users-search-input"
                placeholder="Search team member by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>

            <div className="users-filter-group">
              <Filter size={16} style={{ color: '#64748B' }} />

              <select
                className="users-select-filter"
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="sales">Sales</option>
                <option value="warehouse">Warehouse</option>
                <option value="accounts">Accounts</option>
              </select>

              <select
                className="users-select-filter"
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="users-table-card">
            {usersError ? (
              <div className="toast-error-banner" style={{ margin: '20px' }}>
                <AlertCircle size={18} />
                <span>{usersError}</span>
              </div>
            ) : (
              <div className="users-table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Joined Date</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingUsers ? (
                      Array.from({ length: 4 }).map((_, idx) => (
                        <tr key={idx}>
                          <td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: '#94A3B8' }}>
                            Loading team members...
                          </td>
                        </tr>
                      ))
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '48px 24px', textAlign: 'center' }}>
                          <Users size={36} style={{ color: '#CBD5E1', marginBottom: '8px' }} />
                          <p style={{ fontSize: '15px', fontWeight: 600, color: '#1E293B', margin: '0 0 4px' }}>
                            No team members found
                          </p>
                          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                            {userSearch || userRoleFilter || userStatusFilter
                              ? 'Try adjusting your search criteria or filters.'
                              : 'Send invitations to add your colleagues to the system.'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => {
                        const isSelf = u.id === currentUser?.id;
                        return (
                          <tr key={u.id}>
                            <td style={{ fontWeight: 600, color: '#0F172A' }}>
                              {u.name} {isSelf && <span style={{ color: '#FF540E', fontSize: '11px', marginLeft: '4px' }}>(You)</span>}
                            </td>
                            <td style={{ color: '#475569' }}>{u.email}</td>
                            <td>
                              <span className={`role-badge ${u.role?.toLowerCase()}`}>
                                {u.role}
                              </span>
                            </td>
                            <td>
                              <span className={`user-status-pill ${u.status?.toLowerCase()}`}>
                                {u.status === 'disabled' ? (
                                  <>
                                    <UserX size={12} /> Disabled
                                  </>
                                ) : (
                                  <>
                                    <UserCheck size={12} /> Active
                                  </>
                                )}
                              </span>
                            </td>
                            <td style={{ color: '#64748B' }}>
                              {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {isSelf ? (
                                <span style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic' }}>
                                  Current User
                                </span>
                              ) : u.status === 'disabled' ? (
                                <button
                                  type="button"
                                  className="users-btn-action"
                                  onClick={() => handleToggleStatus(u)}
                                >
                                  <UserCheck size={14} /> Enable
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="users-btn-danger"
                                  onClick={() => handleToggleStatus(u)}
                                >
                                  <UserX size={14} /> Disable
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INVITES */}
      {activeTab === 'invites' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Invites Toolbar */}
          <div className="users-toolbar">
            <div className="users-search-wrapper">
              <Search size={16} className="users-search-icon" />
              <input
                type="text"
                className="users-search-input"
                placeholder="Search invites by email or role..."
                value={inviteSearch}
                onChange={(e) => setInviteSearch(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="users-btn-secondary"
              onClick={loadInvites}
            >
              <RefreshCw size={14} /> Refresh List
            </button>
          </div>

          {/* Invites Table */}
          <div className="users-table-card">
            {invitesError ? (
              <div className="toast-error-banner" style={{ margin: '20px' }}>
                <AlertCircle size={18} />
                <span>{invitesError}</span>
              </div>
            ) : (
              <div className="users-table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Invited By</th>
                      <th>Sent Date</th>
                      <th>Expires Date</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingInvites ? (
                      Array.from({ length: 3 }).map((_, idx) => (
                        <tr key={idx}>
                          <td colSpan={7} style={{ padding: '16px', textAlign: 'center', color: '#94A3B8' }}>
                            Loading invitations...
                          </td>
                        </tr>
                      ))
                    ) : filteredInvites.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center' }}>
                          <Mail size={36} style={{ color: '#CBD5E1', marginBottom: '8px' }} />
                          <p style={{ fontSize: '15px', fontWeight: 600, color: '#1E293B', margin: '0 0 4px' }}>
                            No invitations found
                          </p>
                          <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 16px' }}>
                            {inviteSearch
                              ? 'No invites match your search criteria.'
                              : 'No system invites have been issued yet.'}
                          </p>
                          <button
                            type="button"
                            className="users-btn-primary"
                            onClick={() => setIsInviteModalOpen(true)}
                          >
                            <UserPlus size={16} /> Send First Invite
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredInvites.map((inv) => (
                        <tr key={inv.id}>
                          <td style={{ fontWeight: 600, color: '#0F172A' }}>{inv.email}</td>
                          <td>
                            <span className={`role-badge ${inv.role?.toLowerCase()}`}>
                              {inv.role}
                            </span>
                          </td>
                          <td>
                            <span className={`invite-status-pill ${inv.status?.toLowerCase()}`}>
                              {inv.status}
                            </span>
                          </td>
                          <td style={{ color: '#64748B' }}>{inv.invited_by_name || 'Admin'}</td>
                          <td style={{ color: '#64748B' }}>
                            {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : 'N/A'}
                          </td>
                          <td style={{ color: '#64748B' }}>
                            {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : 'N/A'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                              {inv.status === 'pending' && (
                                <>
                                  <button
                                    type="button"
                                    className="users-btn-danger"
                                    onClick={() => handleRevokeInvite(inv.id, inv.email)}
                                  >
                                    Revoke
                                  </button>
                                  <button
                                    type="button"
                                    className="users-btn-secondary"
                                    onClick={() => handleResendInvite(inv.id, inv.email)}
                                  >
                                    <RefreshCw size={12} /> Resend
                                  </button>
                                </>
                              )}

                              {inv.status === 'expired' && (
                                <button
                                  type="button"
                                  className="users-btn-secondary"
                                  onClick={() => handleResendInvite(inv.id, inv.email)}
                                >
                                  <RefreshCw size={12} /> Resend
                                </button>
                              )}

                              {(inv.status === 'accepted' || inv.status === 'revoked') && (
                                <span style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic' }}>
                                  No action
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: INVITE TEAMMATE FORM */}
      {isInviteModalOpen && (
        <div className="modal-overlay" onClick={() => setIsInviteModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Invite New Teammate</h2>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSendInviteSubmit}>
              <div className="modal-body">
                {modalError && (
                  <div className="toast-error-banner" style={{ marginBottom: '16px' }}>
                    <AlertCircle size={18} />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="e.g. colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Assigned System Role *</label>
                  <select
                    className="form-select"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                  >
                    <option value="sales">Sales Representative</option>
                    <option value="warehouse">Warehouse Manager</option>
                    <option value="accounts">Accounts Officer</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="users-btn-secondary"
                  onClick={() => setIsInviteModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="users-btn-primary"
                  disabled={submittingInvite}
                >
                  {submittingInvite ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRM DISABLE USER DIALOG */}
      {confirmDisableTarget && (
        <div className="modal-overlay" onClick={() => setConfirmDisableTarget(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ background: '#FEF2F2' }}>
              <h2 className="modal-title" style={{ color: '#991B1B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={20} color="#DC2626" /> Confirm User Disabling
              </h2>
              <button
                type="button"
                onClick={() => setConfirmDisableTarget(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#991B1B' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ margin: '0 0 12px', fontSize: '14px', color: '#1E293B' }}>
                Are you sure you want to disable <strong>{confirmDisableTarget.name}</strong> (<code>{confirmDisableTarget.email}</code>)?
              </p>
              <div
                style={{
                  background: '#FFFBEB',
                  border: '1px solid #FCD34D',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '13px',
                  color: '#92400E',
                }}
              >
                ⚠️ Disabling this account will immediately revoke all active login sessions for this user. Historical records (created customers, sales challans, logs) will remain intact.
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="users-btn-secondary"
                onClick={() => setConfirmDisableTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="users-btn-danger"
                style={{ padding: '8px 16px', fontSize: '14px' }}
                onClick={executeDisableUser}
              >
                Disable Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
