import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Search, Plus, Edit3, Trash2, RefreshCw, FileText, AlertCircle, Bookmark } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function ToAddressManagement() {
  const { authenticatedFetch } = useAuth();
  const { showToast, confirmModal } = useNotification();

  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Form Fields
  const [keyword, setKeyword] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [dearSir, setDearSir] = useState('Dear Sir,');
  const [kindAttn, setKindAttn] = useState('');
  const [subject, setSubject] = useState('Quotation for Corrugated boxes – Reg.');

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authenticatedFetch('/api/to-address-profiles');
      const data = await res.json();

      if (res.ok) {
        setProfiles(data || []);
      } else {
        setError(data.message || 'Failed to load To Address profiles.');
      }
    } catch (err) {
      console.error('Fetch to-address profiles error:', err);
      setError('Connection error loading address profiles.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingProfile(null);
    setKeyword('');
    setToAddress('');
    setDearSir('Dear Sir,');
    setKindAttn('');
    setSubject('Quotation for Corrugated boxes – Reg.');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (profile, e) => {
    e.stopPropagation();
    setEditingProfile(profile);
    setKeyword(profile.keyword || '');
    setToAddress(profile.to_address || '');
    setDearSir(profile.dear_sir || 'Dear Sir,');
    setKindAttn(profile.kind_attn || '');
    setSubject(profile.subject || 'Quotation for Corrugated boxes – Reg.');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!keyword.trim()) {
      setFormError('Keyword is required.');
      return;
    }
    if (!toAddress.trim()) {
      setFormError('To Address is required.');
      return;
    }

    setFormSaving(true);
    setFormError('');

    const payload = {
      keyword: keyword.trim(),
      to_address: toAddress.trim(),
      dear_sir: dearSir.trim() || 'Dear Sir,',
      kind_attn: kindAttn.trim(),
      subject: subject.trim() || 'Quotation for Corrugated boxes – Reg.'
    };

    try {
      const isEdit = !!editingProfile;
      const endpoint = isEdit ? `/api/to-address-profiles/${editingProfile.id}` : '/api/to-address-profiles';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await authenticatedFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message || (isEdit ? 'Profile updated successfully.' : 'Profile created successfully.'), 'success');
        setIsModalOpen(false);
        fetchProfiles();
      } else {
        setFormError(data.message || 'Error saving address profile.');
      }
    } catch (err) {
      console.error('Save address profile error:', err);
      setFormError('Network error saving profile. Please try again.');
    } finally {
      setFormSaving(false);
    }
  };

  const handleDeleteProfile = (profile, e) => {
    e.stopPropagation();
    confirmModal({
      title: 'Delete To Address Profile',
      message: `Are you sure you want to delete profile "${profile.keyword}"?`,
      confirmText: 'Delete Profile',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const res = await authenticatedFetch(`/api/to-address-profiles/${profile.id}`, {
            method: 'DELETE'
          });
          const data = await res.json();

          if (res.ok) {
            showToast('To Address profile deleted successfully.', 'success');
            fetchProfiles();
          } else {
            showToast(data.message || 'Failed to delete profile.', 'error');
          }
        } catch (err) {
          console.error('Delete profile error:', err);
          showToast('Server connection error deleting profile.', 'error');
        }
      }
    });
  };

  const filteredProfiles = profiles.filter(p => {
    const term = search.toLowerCase();
    return (
      (p.keyword && p.keyword.toLowerCase().includes(term)) ||
      (p.to_address && p.to_address.toLowerCase().includes(term)) ||
      (p.kind_attn && p.kind_attn.toLowerCase().includes(term)) ||
      (p.subject && p.subject.toLowerCase().includes(term))
    );
  });

  return (
    <div className="page-container animate-fade">
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bookmark size={28} style={{ color: 'var(--color-accent)' }} />
            To Address Management
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Create and manage reusable quotation address profiles for Generate Quotation.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={fetchProfiles}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.88rem',
              transition: 'all 0.2s ease'
            }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--gradient-accent)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.88rem',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            <Plus size={18} />
            <span>+ Add To Address</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search profiles by keyword, address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 38px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '0.88rem'
            }}
          />
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Showing <strong style={{ color: 'var(--color-accent)' }}>{filteredProfiles.length}</strong> profile{filteredProfiles.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div style={{ padding: '14px 18px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-error)', borderRadius: 'var(--radius-md)', color: 'var(--color-error)', marginBottom: '20px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Table / Empty View */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={32} className="spin" style={{ marginBottom: '12px', color: 'var(--color-accent)' }} />
          <p style={{ margin: 0, fontWeight: '500' }}>Loading address profiles...</p>
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg, 12px)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'var(--bg-tertiary)', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center', marginBottom: '16px',
            color: 'var(--text-muted)'
          }}>
            <Bookmark size={32} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
            {search ? 'No matching profiles found' : 'No address profiles created yet'}
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 20px auto' }}>
            {search
              ? 'Try adjusting your search query.'
              : 'Click "+ Add To Address" above to create reusable quotation recipient profiles.'}
          </p>
          {!search && (
            <button
              onClick={handleOpenAddModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--gradient-accent)',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.88rem'
              }}
            >
              <Plus size={18} />
              <span>+ Add To Address</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg, 12px)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '14px 18px', fontWeight: '700', color: 'var(--text-secondary)', width: '160px' }}>Keyword</th>
                  <th style={{ padding: '14px 18px', fontWeight: '700', color: 'var(--text-secondary)' }}>To Address</th>
                  <th style={{ padding: '14px 18px', fontWeight: '700', color: 'var(--text-secondary)', width: '120px' }}>Dear Sir</th>
                  <th style={{ padding: '14px 18px', fontWeight: '700', color: 'var(--text-secondary)', width: '220px' }}>Kind Attn</th>
                  <th style={{ padding: '14px 18px', fontWeight: '700', color: 'var(--text-secondary)', width: '240px' }}>Subject</th>
                  <th style={{ padding: '14px 18px', fontWeight: '700', color: 'var(--text-secondary)', textAlign: 'right', width: '140px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfiles.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s ease' }} className="table-row-hover">
                    <td style={{ padding: '14px 18px', fontWeight: '700', color: 'var(--color-accent)' }}>
                      <span style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '4px 10px', borderRadius: '4px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                        {p.keyword}
                      </span>
                    </td>

                    <td style={{ padding: '14px 18px', color: 'var(--text-primary)', whiteSpace: 'pre-line', fontSize: '0.84rem', lineHeight: '1.4' }}>
                      {p.to_address}
                    </td>

                    <td style={{ padding: '14px 18px', color: 'var(--text-primary)' }}>
                      {p.dear_sir || 'Dear Sir,'}
                    </td>

                    <td style={{ padding: '14px 18px', color: 'var(--text-primary)', fontWeight: p.kind_attn ? '600' : '400' }}>
                      {p.kind_attn || '—'}
                    </td>

                    <td style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                      {p.subject || '—'}
                    </td>

                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={(e) => handleOpenEditModal(p, e)}
                          title="Edit Profile"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '6px 12px', borderRadius: '6px',
                            background: 'var(--bg-tertiary)', border: '1px solid var(--color-accent)',
                            color: 'var(--color-accent)', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem'
                          }}
                        >
                          <Edit3 size={14} />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={(e) => handleDeleteProfile(p, e)}
                          title="Delete Profile"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '6px 12px', borderRadius: '6px',
                            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: 'var(--color-error)', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem'
                          }}
                        >
                          <Trash2 size={14} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Profile Modal */}
      {isModalOpen && createPortal(
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999999,
          padding: '24px 16px',
          overflow: 'hidden'
        }}>
          <div style={{
            background: 'var(--bg-tertiary, #1e293b)',
            border: '1px solid var(--border-color, #334155)',
            borderRadius: 'var(--radius-md, 12px)',
            width: '100%',
            maxWidth: '620px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            color: 'var(--text-primary, #f8fafc)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 24px', borderBottom: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)', flexShrink: 0
            }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                {editingProfile ? 'Edit To Address Profile' : 'Add To Address Profile'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={formSaving}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  width: '32px', height: '32px',
                  borderRadius: '50%',
                  fontWeight: 'bold'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveProfile} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
              {formError && (
                <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--color-error)', borderRadius: '6px', color: 'var(--color-error)', fontSize: '0.85rem', fontWeight: '600' }}>
                  {formError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: 'var(--color-accent)' }}>
                  Keyword (Unique Identifier) *
                </label>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="e.g. Santhosh"
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '600' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Keyword is used in the dropdown menu when generating quotations.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  To Address *
                </label>
                <textarea
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value)}
                  placeholder={'M/s. MYCO INDUSTRY,\n472-C, Kamarajar Road,\nPeelamedu,\nCoimbatore - 641004'}
                  rows={4}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.88rem', fontFamily: 'inherit', lineHeight: '1.4' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Dear Sir
                  </label>
                  <input
                    type="text"
                    value={dearSir}
                    onChange={(e) => setDearSir(e.target.value)}
                    placeholder="Dear Sir,"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Kind Attn
                  </label>
                  <input
                    type="text"
                    value={kindAttn}
                    onChange={(e) => setKindAttn(e.target.value)}
                    placeholder="e.g. Kind Attn – Mr. Vairamuthu - reg"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Quotation for Corrugated boxes – Reg."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={formSaving}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={formSaving}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 24px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--gradient-accent)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {formSaving ? <RefreshCw size={16} className="spin" /> : null}
                  <span>{editingProfile ? 'Update Profile' : 'Save Profile'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
