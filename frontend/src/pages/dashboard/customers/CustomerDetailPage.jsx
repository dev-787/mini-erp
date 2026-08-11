import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit3, Phone, Mail, MapPin, Calendar, FileText, Send, Loader2, Building, AlertCircle } from 'lucide-react';
import { fetchCustomerById, updateCustomer, fetchCustomerNotes, addCustomerNote } from '../../../api/customer.api';
import { useAuthStore } from '../../../store/authStore';
import CustomerFormModal from './CustomerFormModal';
import './customers.css';

const CustomerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const userRole = user?.role?.toLowerCase() || '';

  const canWrite = userRole === 'admin' || userRole === 'sales';

  const [customer, setCustomer] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  const [statusUpdating, setStatusUpdating] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // New Note Form State
  const [newNoteText, setNewNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [noteError, setNoteError] = useState('');

  const loadCustomerDetails = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    setError('');

    try {
      const [custData, notesData] = await Promise.all([
        fetchCustomerById(id),
        fetchCustomerNotes(id),
      ]);
      setCustomer(custData);
      setNotes(notesData.data || []);
    } catch (err) {
      console.error('Customer details error:', err);
      if (err.status === 404) {
        setNotFound(true);
      } else if (err.status === 403) {
        setError('You do not have permission to view this customer details.');
      } else {
        setError(err.message || 'Failed to load customer profile.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCustomerDetails();
  }, [loadCustomerDetails]);

  // Handle inline status change
  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    if (!newStatus || newStatus === customer?.status) return;

    setStatusUpdating(true);
    try {
      const updated = await updateCustomer(id, { status: newStatus });
      setCustomer(updated.customer || updated);
    } catch (err) {
      alert(err.message || 'Failed to update customer status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  // Handle adding follow-up note
  const handleAddNote = async (e) => {
    e.preventDefault();
    setNoteError('');

    if (!newNoteText || newNoteText.trim().length === 0) {
      setNoteError('Note text cannot be empty.');
      return;
    }

    setAddingNote(true);
    try {
      const res = await addCustomerNote(id, newNoteText.trim());
      const addedNote = res.note || res;
      setNotes((prev) => [addedNote, ...prev]);
      setNewNoteText('');
    } catch (err) {
      setNoteError(err.message || 'Failed to add follow-up note.');
    } finally {
      setAddingNote(false);
    }
  };

  const formatRelativeTime = (isoDate) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="crm-container">
        <div className="crm-header-card" style={{ gap: '16px' }}>
          <div className="skeleton-box" style={{ height: '32px', width: '200px' }} />
          <div className="skeleton-box" style={{ height: '40px', width: '100px' }} />
        </div>
        <div className="crm-detail-grid">
          <div className="crm-detail-card">
            <div className="skeleton-box" style={{ height: '24px', width: '100%' }} />
            <div className="skeleton-box" style={{ height: '24px', width: '100%' }} />
            <div className="skeleton-box" style={{ height: '24px', width: '100%' }} />
          </div>
          <div className="timeline-card">
            <div className="skeleton-box" style={{ height: '100px', width: '100%' }} />
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="crm-container">
        <div className="crm-header-card" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px' }}>
          <AlertCircle size={48} style={{ color: '#DC2626', marginBottom: '12px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>Customer Not Found</h2>
          <p style={{ color: '#64748B', margin: '0 0 20px' }}>
            The customer account you are looking for does not exist or has been removed.
          </p>
          <button type="button" className="crm-btn-primary" onClick={() => navigate('/dashboard/customers')}>
            <ArrowLeft size={16} /> Return to Customer List
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="crm-container">
        <div className="crm-header-card" style={{ padding: '32px', color: '#DC2626' }}>
          <p style={{ fontWeight: 600, fontSize: '15px', margin: 0 }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="crm-container">
      {/* Top Navigation & Profile Header */}
      <div className="crm-header-card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            className="crm-btn-secondary"
            style={{ width: 'fit-content', padding: '4px 10px', fontSize: '12px' }}
            onClick={() => navigate('/dashboard/customers')}
          >
            <ArrowLeft size={14} /> Back to Customers
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 className="crm-header-title">{customer.name}</h1>
            <span className={`status-badge ${customer.status.toLowerCase()}`}>
              {customer.status}
            </span>
            <span className="type-pill">{customer.customer_type}</span>
          </div>

          {customer.business_name && (
            <div style={{ fontSize: '14px', color: '#64748B', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building size={16} /> {customer.business_name}
            </div>
          )}
        </div>

        {canWrite && (
          <button
            type="button"
            className="crm-btn-primary"
            onClick={() => setIsEditModalOpen(true)}
          >
            <Edit3 size={16} /> Edit Profile
          </button>
        )}
      </div>

      {/* Main Details & Timeline Layout */}
      <div className="crm-detail-grid">
        {/* Left Column: Customer Profile Details & Status Control */}
        <div className="crm-detail-card">
          {/* Status Control Dropdown */}
          <div className="crm-detail-field">
            <label className="crm-detail-label">Status Control</label>
            {canWrite ? (
              <select
                className="crm-select"
                style={{ fontWeight: 600 }}
                value={customer.status}
                onChange={handleStatusChange}
                disabled={statusUpdating}
              >
                <option value="Lead">Lead</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            ) : (
              <span className={`status-badge ${customer.status.toLowerCase()}`} style={{ width: 'fit-content' }}>
                {customer.status}
              </span>
            )}
          </div>

          {/* Contact Details */}
          <div className="crm-detail-field">
            <label className="crm-detail-label">Mobile Number</label>
            <div className="crm-detail-value" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'monospace' }}>
              <Phone size={15} style={{ color: '#FF540E' }} /> {customer.mobile}
            </div>
          </div>

          <div className="crm-detail-field">
            <label className="crm-detail-label">Email Address</label>
            <div className="crm-detail-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={15} style={{ color: '#FF540E' }} /> {customer.email || 'Not provided'}
            </div>
          </div>

          <div className="crm-detail-field">
            <label className="crm-detail-label">GSTIN / Tax ID</label>
            <div className="crm-detail-value" style={{ fontFamily: 'monospace', fontWeight: 600 }}>
              {customer.gst_number || 'Not registered'}
            </div>
          </div>

          <div className="crm-detail-field">
            <label className="crm-detail-label">Next Follow-up Date</label>
            <div className="crm-detail-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={15} style={{ color: '#FF540E' }} />
              {customer.follow_up_date
                ? new Date(customer.follow_up_date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'No follow-up scheduled'}
            </div>
          </div>

          <div className="crm-detail-field">
            <label className="crm-detail-label">Address</label>
            <div className="crm-detail-value" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <MapPin size={16} style={{ color: '#FF540E', flexShrink: 0, marginTop: '2px' }} />
              {customer.address || 'No address specified'}
            </div>
          </div>
        </div>

        {/* Right Column: Running Follow-Up Timeline Notes */}
        <div className="timeline-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} style={{ color: '#FF540E' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
              Follow-Up Activity Timeline
            </h2>
          </div>

          {/* Add Follow-Up Note Form (Write permitted roles only) */}
          {canWrite && (
            <form onSubmit={handleAddNote} className="timeline-input-box">
              <textarea
                rows={3}
                className="crm-textarea"
                placeholder="Log a new follow-up call, meeting notes, or commitment..."
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
              />
              {noteError && <span className="crm-field-error">{noteError}</span>}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="crm-btn-primary"
                  disabled={addingNote || !newNoteText.trim()}
                >
                  {addingNote ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  <span>Add Note</span>
                </button>
              </div>
            </form>
          )}

          {/* Timestamped Timeline History List */}
          <div className="timeline-list">
            {notes.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748B' }}>
                <p style={{ fontSize: '14px', fontWeight: 500, margin: 0 }}>
                  No follow-up notes logged yet.
                </p>
              </div>
            ) : (
              notes.map((note) => (
                <div key={note.id} className="timeline-item">
                  <div className="timeline-marker" />
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className="timeline-author">
                        {note.created_by_name || 'System User'}
                      </span>
                      <span className="timeline-time">
                        {formatRelativeTime(note.created_at)}
                      </span>
                    </div>
                    <div className="timeline-body">{note.note}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Edit Customer Modal */}
      <CustomerFormModal
        isOpen={isEditModalOpen}
        customerToEdit={customer}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={(updated) => {
          setIsEditModalOpen(false);
          setCustomer(updated);
        }}
      />
    </div>
  );
};

export default CustomerDetailPage;
