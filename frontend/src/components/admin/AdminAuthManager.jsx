import React, { useState, useEffect } from 'react';
import { Shield, Mail, Laptop, X, Copy, Check, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createInvite, getInvites, revokeInvite, getSessions, revokeSession } from '../../api/auth.api';

const AdminAuthManager = ({ user, onClose }) => {
  const [activeTab, setActiveTab] = useState('invites');

  // Invite state
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('sales');
  const [invites, setInvites] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState(null);
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    fetchInvitesList();
    fetchSessionsList();
  }, []);

  const fetchInvitesList = async () => {
    if (user?.role?.toLowerCase() !== 'admin') return;
    setLoadingInvites(true);
    try {
      const data = await getInvites();
      setInvites(data.invites || []);
    } catch (err) {
      setInviteError(err.message || 'Failed to load invites.');
    } finally {
      setLoadingInvites(false);
    }
  };

  const fetchSessionsList = async () => {
    setLoadingSessions(true);
    try {
      const data = await getSessions();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error('Failed to load sessions:', err.message);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleCreateInvite = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess(null);
    setCopied(false);

    if (!email.trim()) {
      setInviteError('Please enter a valid email address.');
      return;
    }

    setSubmittingInvite(true);
    try {
      const data = await createInvite({ email: email.trim(), role });
      setInviteSuccess(data);
      setEmail('');
      fetchInvitesList();
    } catch (err) {
      setInviteError(err.message || 'Failed to create invite.');
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleRevokeInvite = async (inviteId) => {
    if (!window.confirm('Are you sure you want to revoke this pending invitation?')) return;
    try {
      await revokeInvite(inviteId);
      fetchInvitesList();
    } catch (err) {
      alert(err.message || 'Failed to revoke invite.');
    }
  };

  const handleRevokeSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to terminate this session?')) return;
    try {
      await revokeSession(sessionId);
      fetchSessionsList();
    } catch (err) {
      alert(err.message || 'Failed to revoke session.');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
      accepted: { bg: '#D1FAE5', color: '#065F46', label: 'Accepted' },
      revoked: { bg: '#FEE2E2', color: '#991B1B', label: 'Revoked' },
      expired: { bg: '#F3F4F6', color: '#374151', label: 'Expired' },
    };
    const s = styles[status?.toLowerCase()] || styles.pending;
    return (
      <span style={{
        background: s.bg,
        color: s.color,
        padding: '3px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        textTransform: 'uppercase',
      }}>
        {s.label}
      </span>
    );
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '850px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#F8FAFC',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={20} color="#FF540E" /> Auth & Security Control Panel
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
              Manage user invitations, role assignments, and active sessions
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#64748B',
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #E2E8F0',
          background: '#F1F5F9',
          padding: '0 24px',
        }}>
          {user?.role?.toLowerCase() === 'admin' && (
            <button
              onClick={() => setActiveTab('invites')}
              style={{
                padding: '12px 20px',
                border: 'none',
                background: 'transparent',
                fontSize: '14px',
                fontWeight: '600',
                color: activeTab === 'invites' ? '#FF540E' : '#64748B',
                borderBottom: activeTab === 'invites' ? '2px solid #FF540E' : '2px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Mail size={16} /> User Invites
            </button>
          )}

          <button
            onClick={() => setActiveTab('sessions')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'transparent',
              fontSize: '14px',
              fontWeight: '600',
              color: activeTab === 'sessions' ? '#FF540E' : '#64748B',
              borderBottom: activeTab === 'sessions' ? '2px solid #FF540E' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Laptop size={16} /> Active Sessions ({sessions.length})
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* TAB 1: INVITES */}
          {activeTab === 'invites' && user?.role?.toLowerCase() === 'admin' && (
            <div>
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px',
              }}>
                <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: '600', color: '#1E293B' }}>
                  Create New User Invitation
                </h3>

                {inviteError && (
                  <div style={{ color: '#EF4444', fontSize: '13px', marginBottom: '12px' }}>
                    ⚠️ {inviteError}
                  </div>
                )}

                {inviteSuccess && (
                  <div style={{
                    background: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    borderRadius: '8px',
                    padding: '14px',
                    marginBottom: '14px',
                  }}>
                    <div style={{ color: '#065F46', fontWeight: '600', fontSize: '13px', marginBottom: '6px' }}>
                      🎉 Invitation Link Generated Successfully!
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        readOnly
                        value={inviteSuccess.inviteLink}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          border: '1px solid #6EE7B7',
                          borderRadius: '6px',
                          fontSize: '12px',
                          background: '#FFF',
                        }}
                      />
                      <button
                        onClick={() => copyToClipboard(inviteSuccess.inviteLink)}
                        style={{
                          padding: '8px 14px',
                          background: '#059669',
                          color: '#FFF',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        {copied ? 'Copied!' : 'Copy Link'}
                      </button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleCreateInvite} style={{ display: 'grid', gridTemplateColumns: '1fr 180px 140px', gap: '12px', alignItems: 'center' }}>
                  <div>
                    <input
                      type="email"
                      placeholder="User Email (e.g. employee@company.com)"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '14px',
                        background: '#FFF',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="sales">Sales</option>
                      <option value="warehouse">Warehouse</option>
                      <option value="accounts">Accounts</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingInvite}
                    style={{
                      padding: '10px',
                      background: '#FF540E',
                      color: '#FFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '14px',
                      cursor: submittingInvite ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {submittingInvite ? 'Generating...' : 'Send Invite'}
                  </button>
                </form>
              </div>

              <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: '600', color: '#1E293B' }}>
                System Invitation History
              </h3>

              {loadingInvites ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748B' }}>Loading invites...</div>
              ) : invites.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', border: '1px dashed #CBD5E1', borderRadius: '8px' }}>
                  No invitations created yet.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569' }}>
                      <th style={{ padding: '10px 12px' }}>Email</th>
                      <th style={{ padding: '10px 12px' }}>Role</th>
                      <th style={{ padding: '10px 12px' }}>Status</th>
                      <th style={{ padding: '10px 12px' }}>Invited By</th>
                      <th style={{ padding: '10px 12px' }}>Sent Date</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invites.map((inv) => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px', fontWeight: '600', color: '#0F172A' }}>{inv.email}</td>
                        <td style={{ padding: '12px', textTransform: 'capitalize' }}>{inv.role}</td>
                        <td style={{ padding: '12px' }}>{getStatusBadge(inv.status)}</td>
                        <td style={{ padding: '12px', color: '#64748B' }}>{inv.invited_by_name || 'Admin'}</td>
                        <td style={{ padding: '12px', color: '#64748B' }}>
                          {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          {inv.status === 'pending' && (
                            <button
                              onClick={() => handleRevokeInvite(inv.id)}
                              style={{
                                padding: '4px 10px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#EF4444',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: 'pointer',
                              }}
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 2: SESSIONS */}
          {activeTab === 'sessions' && (
            <div>
              <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: '600', color: '#1E293B' }}>
                Your Logged-In Devices & Sessions
              </h3>

              {loadingSessions ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748B' }}>Loading active sessions...</div>
              ) : sessions.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8' }}>No active sessions found.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {sessions.map((sess) => (
                    <div
                      key={sess.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '14px 16px',
                        border: '1px solid #E2E8F0',
                        borderRadius: '10px',
                        background: sess.revoked ? '#F8FAFC' : '#FFF',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#0F172A', marginBottom: '4px' }}>
                          💻 {sess.user_agent || 'Web Browser'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>
                          IP: {sess.ip_address || '127.0.0.1'} • Created: {new Date(sess.created_at).toLocaleString()}
                        </div>
                      </div>

                      <div>
                        {sess.revoked ? (
                          <span style={{ color: '#EF4444', fontSize: '12px', fontWeight: '600' }}>REVOKED</span>
                        ) : (
                          <button
                            onClick={() => handleRevokeSession(sess.id)}
                            style={{
                              padding: '6px 12px',
                              background: '#FEE2E2',
                              color: '#991B1B',
                              border: '1px solid #FCA5A5',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                            }}
                          >
                            Revoke Device
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAuthManager;
