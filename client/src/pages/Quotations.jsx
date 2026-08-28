import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Search, Download, Trash2, Eye, RefreshCw, FileText, Calendar, Building, FolderOpen, ShieldCheck } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function Quotations() {
  const { authenticatedFetch, user } = useAuth();
  const { showToast, confirmModal } = useNotification();

  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  // PDF Preview Modal State
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  useEffect(() => {
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authenticatedFetch('/api/quotations');
      const data = await res.json();

      if (res.ok && data.success) {
        setQuotations(data.quotations || []);
      } else {
        setError(data.message || 'Failed to load quotations.');
      }
    } catch (err) {
      console.error('Fetch quotations error:', err);
      setError('Connection error while fetching quotations.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (quotation) => {
    try {
      showToast(`Downloading ${quotation.pdf_file_name}...`, 'info');
      const res = await authenticatedFetch(`/api/quotations/download/${quotation.id}`);
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.message || 'Failed to download PDF.', 'error');
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = quotation.pdf_file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast(`Downloaded ${quotation.pdf_file_name}`, 'success');
    } catch (err) {
      console.error('Download quotation error:', err);
      showToast('Error downloading quotation PDF.', 'error');
    }
  };

  const handleView = async (quotation) => {
    try {
      showToast('Opening PDF preview...', 'info');
      const res = await authenticatedFetch(`/api/quotations/download/${quotation.id}`);
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.message || 'Failed to load PDF preview.', 'error');
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      setPreviewPdfUrl(url);
      setPreviewTitle(quotation.pdf_file_name);
      setIsPreviewModalOpen(true);
    } catch (err) {
      console.error('View quotation error:', err);
      showToast('Error viewing quotation PDF.', 'error');
    }
  };

  const handleDelete = (quotation) => {
    confirmModal({
      title: 'Delete Stored Quotation',
      message: `Are you sure you want to delete "${quotation.pdf_file_name}"? This action cannot be undone.`,
      confirmText: 'Delete Quotation',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const res = await authenticatedFetch(`/api/quotations/${quotation.id}`, {
            method: 'DELETE'
          });
          const data = await res.json();

          if (res.ok) {
            setQuotations(prev => prev.filter(q => q.id !== quotation.id));
            showToast('Quotation deleted successfully.', 'success');
          } else {
            showToast(data.message || 'Failed to delete quotation.', 'error');
          }
        } catch (err) {
          console.error('Delete quotation error:', err);
          showToast('Server error while deleting quotation.', 'error');
        }
      }
    });
  };

  const filteredQuotations = quotations.filter(q => {
    const term = search.toLowerCase();
    return (
      (q.company_name && q.company_name.toLowerCase().includes(term)) ||
      (q.pdf_file_name && q.pdf_file_name.toLowerCase().includes(term)) ||
      (q.file_id && q.file_id.toLowerCase().includes(term)) ||
      (q.quotation_number && q.quotation_number.toLowerCase().includes(term))
    );
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={28} style={{ color: 'var(--color-accent)' }} />
            Quotations
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Stored quotation PDFs generated by <strong style={{ color: 'var(--text-primary)' }}>{user?.full_name || user?.username}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={fetchQuotations}
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
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by company or filename..."
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
          Showing <strong style={{ color: 'var(--color-accent)' }}>{filteredQuotations.length}</strong> stored quotation{filteredQuotations.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div style={{ padding: '14px 18px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-error)', borderRadius: 'var(--radius-md)', color: 'var(--color-error)', marginBottom: '20px', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* Main Quotations Table / Empty State */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={32} className="spin" style={{ marginBottom: '12px', color: 'var(--color-accent)' }} />
          <p style={{ margin: 0, fontWeight: '500' }}>Loading your stored quotations...</p>
        </div>
      ) : filteredQuotations.length === 0 ? (
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
            <FileText size={32} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
            {search ? 'No matching quotations found' : 'No quotations generated yet'}
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto' }}>
            {search
              ? 'Try adjusting your search criteria.'
              : 'Quotations generated in the Customers module will automatically appear here.'}
          </p>
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
                  <th style={{ padding: '14px 18px', fontWeight: '700', color: 'var(--text-secondary)' }}>Quotation No.</th>
                  <th style={{ padding: '14px 18px', fontWeight: '700', color: 'var(--text-secondary)' }}>Quotation PDF</th>
                  <th style={{ padding: '14px 18px', fontWeight: '700', color: 'var(--text-secondary)' }}>Customer Company</th>
                  <th style={{ padding: '14px 18px', fontWeight: '700', color: 'var(--text-secondary)' }}>File Folder</th>
                  <th style={{ padding: '14px 18px', fontWeight: '700', color: 'var(--text-secondary)' }}>Date Generated</th>
                  <th style={{ padding: '14px 18px', fontWeight: '700', color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotations.map((q) => {
                  const formattedDate = q.created_at
                    ? new Date(q.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'N/A';

                  return (
                    <tr key={q.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s ease' }} className="table-row-hover">
                      <td style={{ padding: '14px 18px', fontWeight: '700', color: 'var(--color-accent)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 10px', borderRadius: '4px', fontSize: '0.82rem' }}>
                          <ShieldCheck size={14} />
                          {q.quotation_number || 'N/A'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <FileText size={18} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                          <span>{q.pdf_file_name}</span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px', color: 'var(--text-primary)', fontWeight: '600' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Building size={16} style={{ color: 'var(--text-muted)' }} />
                          <span>{q.company_name}</span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px', color: 'var(--text-muted)' }}>
                        {q.file_id ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--bg-tertiary)', padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-accent)' }}>
                            <FolderOpen size={14} />
                            {q.file_id}
                          </span>
                        ) : '—'}
                      </td>

                      <td style={{ padding: '14px 18px', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                          <Calendar size={14} />
                          <span>{formattedDate}</span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => handleView(q)}
                            title="View PDF Preview"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              padding: '6px 12px', borderRadius: '6px',
                              background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                              color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem'
                            }}
                          >
                            <Eye size={15} />
                            <span>View</span>
                          </button>

                          <button
                            onClick={() => handleDownload(q)}
                            title="Download PDF File"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              padding: '6px 12px', borderRadius: '6px',
                              background: 'var(--bg-tertiary)', border: '1px solid var(--color-accent)',
                              color: 'var(--color-accent)', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem'
                            }}
                          >
                            <Download size={15} />
                            <span>Download</span>
                          </button>

                          <button
                            onClick={() => handleDelete(q)}
                            title="Delete Quotation"
                            style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              padding: '6px', borderRadius: '6px',
                              background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                              color: 'var(--color-error)', cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PDF View Modal via React Portal */}
      {isPreviewModalOpen && createPortal(
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
            width: '94vw',
            maxWidth: '1200px',
            height: '88vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 24px', borderBottom: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)', flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={20} style={{ color: 'var(--color-accent)' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                  {previewTitle}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsPreviewModalOpen(false);
                  if (previewPdfUrl) window.URL.revokeObjectURL(previewPdfUrl);
                  setPreviewPdfUrl(null);
                }}
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

            {/* Modal Viewer Body */}
            <div style={{ flex: 1, minHeight: 0, background: '#525659' }}>
              {previewPdfUrl && (
                <iframe
                  src={previewPdfUrl}
                  title="PDF Preview"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
