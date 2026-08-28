import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  ShieldCheck, 
  UserPlus, 
  Search, 
  Edit3, 
  Trash2, 
  Power, 
  User as UserIcon, 
  AlertCircle,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export default function UserAccess() {
  const { user: currentUser, authenticatedFetch } = useAuth();
  const { showToast, confirmModal } = useNotification();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showPassword, setShowPassword] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null = Add mode, object = Edit mode
  const [formValues, setFormValues] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'user',
    status: 'active'
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch Users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch('/api/users');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch users.');
      }
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      showToast(err.message || 'Failed to fetch users.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = 
        (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.full_name && u.full_name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchStatus = statusFilter === 'all' || (u.status || 'active') === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Quick stats
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => (u.status || 'active') === 'active').length;
    const inactive = users.filter(u => u.status === 'inactive').length;
    const admins = users.filter(u => u.role === 'admin').length;
    return { total, active, inactive, admins };
  }, [users]);

  // Open Modal (Add Mode)
  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormValues({
      username: '',
      password: '',
      full_name: '',
      role: 'user',
      status: 'active'
    });
    setFormError('');
    setShowPassword(false);
    setIsModalOpen(true);
  };

  // Open Modal (Edit Mode)
  const handleOpenEditModal = (userToEdit) => {
    setEditingUser(userToEdit);
    setFormValues({
      username: userToEdit.username || '',
      password: '', // Leave blank to keep existing password
      full_name: userToEdit.full_name || '',
      role: userToEdit.role || 'user',
      status: userToEdit.status || 'active'
    });
    setFormError('');
    setShowPassword(false);
    setIsModalOpen(true);
  };

  // Submit Add / Edit Form
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formValues.username.trim()) {
      setFormError('Username is required.');
      return;
    }

    if (!editingUser && !formValues.password) {
      setFormError('Password is required for new users.');
      return;
    }

    setSubmitting(true);
    try {
      let response, data;
      if (editingUser) {
        // Edit User
        response = await authenticatedFetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify(formValues)
        });
        data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Error updating user');
        showToast(`User "@${data.username}" updated successfully!`, 'success');
      } else {
        // Add User
        response = await authenticatedFetch('/api/users', {
          method: 'POST',
          body: JSON.stringify(formValues)
        });
        data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Error creating user');
        showToast(`User "@${data.username}" created successfully!`, 'success');
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      console.error('Submit user error:', err);
      setFormError(err.message || 'Operation failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Status Toggle
  const handleToggleStatus = (userItem) => {
    const currentStatus = userItem.status || 'active';
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    if (currentUser?.id === userItem.id && newStatus === 'inactive') {
      showToast('You cannot deactivate your own active admin account.', 'error');
      return;
    }

    confirmModal({
      title: `${newStatus === 'active' ? 'Activate' : 'Deactivate'} Account`,
      message: `Are you sure you want to change @${userItem.username}'s status to ${newStatus.toUpperCase()}?`,
      confirmText: newStatus === 'active' ? 'Activate User' : 'Deactivate User',
      isDestructive: newStatus === 'inactive',
      onConfirm: async () => {
        try {
          const response = await authenticatedFetch(`/api/users/${userItem.id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus })
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || 'Failed to update status.');
          showToast(`Status updated to ${newStatus} for @${userItem.username}.`, 'success');
          fetchUsers();
        } catch (err) {
          showToast(err.message || 'Failed to update status.', 'error');
        }
      }
    });
  };

  // Delete User
  const handleDeleteUser = (userItem) => {
    if (currentUser?.id === userItem.id) {
      showToast('You cannot delete your own active admin account.', 'error');
      return;
    }

    confirmModal({
      title: 'Delete User Account & All Associated Data',
      message: `Are you sure you want to permanently delete user "@${userItem.username}"? This will also delete all files, calculations, quotations, and profiles associated with this user login. This action cannot be undone.`,
      confirmText: 'Delete User & All Files',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const response = await authenticatedFetch(`/api/users/${userItem.id}`, {
            method: 'DELETE'
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || 'Failed to delete user.');
          showToast(`User @${userItem.username} and all associated files/calculations were deleted successfully.`, 'success');
          fetchUsers();
        } catch (err) {
          showToast(err.message || 'Failed to delete user.', 'error');
        }
      }
    });
  };

  return (
    <div className="container animate-fade-in" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--gradient-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <ShieldCheck size={22} />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-heading)', margin: 0 }}>
              User Access Management
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0 }}>
            Manage user accounts, admin privileges, security credentials, and access statuses.
          </p>
        </div>

        <button 
          onClick={handleOpenAddModal}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', fontSize: '0.95rem', fontWeight: 700, borderRadius: 'var(--radius-md)' }}
        >
          <UserPlus size={18} />
          <span>Add New User</span>
        </button>
      </div>

      {/* Stats Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-accent)' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Total Users</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>{stats.total}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <UserCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Active Users</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#10b981' }}>{stats.active}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
            <UserX size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Inactive Users</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: stats.inactive > 0 ? '#ef4444' : 'var(--text-primary)' }}>{stats.inactive}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Administrators</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#a855f7' }}>{stats.admins}</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: 'var(--radius-md)', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text"
            placeholder="Search by username or full name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-control"
            style={{ paddingLeft: '42px', width: '100%' }}
          />
        </div>

        {/* Dropdown Filters */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="form-control"
            style={{ width: '140px' }}
          >
            <option value="all">All Roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>

          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-control"
            style={{ width: '150px' }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* User Table Card */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Loading User Records...</div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Users size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <h3 style={{ margin: '0 0 4px 0' }}>No users found</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Try adjusting your search criteria or add a new user.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '16px 20px' }}>User Details</th>
                  <th style={{ padding: '16px 20px' }}>Role</th>
                  <th style={{ padding: '16px 20px' }}>Status</th>
                  <th style={{ padding: '16px 20px' }}>Created Date</th>
                  <th style={{ padding: '16px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((item, index) => {
                  const isActive = (item.status || 'active') === 'active';
                  const isAdmin = item.role === 'admin';
                  const isCurrentAccount = currentUser?.id === item.id;

                  return (
                    <tr 
                      key={item.id || index}
                      style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s ease' }}
                      className="table-row-hover"
                    >
                      {/* User Details */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ 
                            width: '42px', 
                            height: '42px', 
                            borderRadius: '50%', 
                            backgroundColor: isAdmin ? 'rgba(168, 85, 247, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                            color: isAdmin ? '#a855f7' : 'var(--color-accent)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '1.1rem'
                          }}>
                            {(item.username?.[0] || 'U').toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{item.full_name || item.username}</span>
                              {isCurrentAccount && (
                                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--color-accent)' }}>
                                  You
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                              @{item.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td style={{ padding: '16px 20px' }}>
                        {isAdmin ? (
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            padding: '6px 12px', 
                            borderRadius: '20px', 
                            fontSize: '0.78rem', 
                            fontWeight: 700, 
                            backgroundColor: 'rgba(168, 85, 247, 0.15)', 
                            color: '#a855f7',
                            border: '1px solid rgba(168, 85, 247, 0.3)'
                          }}>
                            <ShieldCheck size={14} />
                            <span>Admin</span>
                          </span>
                        ) : (
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            padding: '6px 12px', 
                            borderRadius: '20px', 
                            fontSize: '0.78rem', 
                            fontWeight: 700, 
                            backgroundColor: 'rgba(99, 102, 241, 0.15)', 
                            color: 'var(--color-accent)',
                            border: '1px solid rgba(99, 102, 241, 0.3)'
                          }}>
                            <UserIcon size={14} />
                            <span>User</span>
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '16px 20px' }}>
                        {isActive ? (
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            padding: '4px 10px', 
                            borderRadius: '20px', 
                            fontSize: '0.75rem', 
                            fontWeight: 700, 
                            backgroundColor: 'rgba(16, 185, 129, 0.15)', 
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.3)'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            padding: '4px 10px', 
                            borderRadius: '20px', 
                            fontSize: '0.75rem', 
                            fontWeight: 700, 
                            backgroundColor: 'rgba(239, 68, 68, 0.15)', 
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                            <span>Inactive</span>
                          </span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td style={{ padding: '16px 20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                      </td>

                      {/* Action Buttons */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          {/* Toggle Status Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item)}
                            title={isActive ? 'Deactivate Account' : 'Activate Account'}
                            style={{ 
                              padding: '8px', 
                              borderRadius: 'var(--radius-md)', 
                              border: '1px solid var(--border-color)', 
                              background: 'var(--bg-secondary)', 
                              color: isActive ? '#10b981' : '#ef4444',
                              cursor: isCurrentAccount && isActive ? 'not-allowed' : 'pointer',
                              opacity: isCurrentAccount && isActive ? 0.5 : 1
                            }}
                            disabled={isCurrentAccount && isActive}
                          >
                            <Power size={16} />
                          </button>

                          {/* Edit User Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            title="Edit User Details / Password"
                            style={{ 
                              padding: '8px', 
                              borderRadius: 'var(--radius-md)', 
                              border: '1px solid var(--border-color)', 
                              background: 'var(--bg-secondary)', 
                              color: 'var(--text-primary)',
                              cursor: 'pointer' 
                            }}
                          >
                            <Edit3 size={16} />
                          </button>

                          {/* Delete User Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(item)}
                            title="Delete User"
                            style={{ 
                              padding: '8px', 
                              borderRadius: 'var(--radius-md)', 
                              border: '1px solid var(--border-color)', 
                              background: 'var(--bg-secondary)', 
                              color: '#ef4444',
                              cursor: isCurrentAccount ? 'not-allowed' : 'pointer',
                              opacity: isCurrentAccount ? 0.5 : 1
                            }}
                            disabled={isCurrentAccount}
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
        )}
      </div>

      {/* ===================================================================== */}
      {/* ADD / EDIT USER MODAL                                                */}
      {/* ===================================================================== */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(6px)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '24px'
        }} className="animate-fade-in">
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '520px',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-secondary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-accent)' }}>
                  {editingUser ? <Edit3 size={18} /> : <UserPlus size={18} />}
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'var(--font-heading)' }}>
                  {editingUser ? `Edit User (@${editingUser.username})` : 'Add New User'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} style={{ padding: '24px' }}>
              {formError && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  borderLeft: '4px solid #ef4444',
                  color: '#ef4444',
                  fontSize: '0.88rem',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <AlertCircle size={18} />
                  <span>{formError}</span>
                </div>
              )}

              {(() => {
                const isEditingAdmin = editingUser && editingUser.role === 'admin';

                return (
                  <>
                    {/* Username Field */}
                    <div style={{ marginBottom: '18px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Username <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input 
                        type="text"
                        placeholder="e.g. srivari_user"
                        value={formValues.username}
                        onChange={(e) => setFormValues({ ...formValues, username: e.target.value })}
                        className="form-control"
                        style={{ width: '100%' }}
                        required
                      />
                    </div>

                    {/* Password Field */}
                    <div style={{ marginBottom: '18px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Password {editingUser ? '(Leave blank to keep existing password)' : <span style={{ color: '#ef4444' }}>*</span>}
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type={showPassword ? 'text' : 'password'}
                          placeholder={editingUser ? 'Enter new password to reset...' : 'Enter account password...'}
                          value={formValues.password}
                          onChange={(e) => setFormValues({ ...formValues, password: e.target.value })}
                          className="form-control"
                          style={{ width: '100%', paddingRight: '42px' }}
                          required={!editingUser}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4px'
                          }}
                          title={showPassword ? 'Hide Password' : 'Show Password'}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Full Name Field (Non-editable for Admin) */}
                    <div style={{ marginBottom: '18px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Full Name / Display Name {isEditingAdmin && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(Non-editable for Admin)</span>}
                      </label>
                      <input 
                        type="text"
                        placeholder="e.g. SRI VARI PACKS Operator"
                        value={formValues.full_name}
                        onChange={(e) => setFormValues({ ...formValues, full_name: e.target.value })}
                        className="form-control"
                        style={{ 
                          width: '100%', 
                          opacity: isEditingAdmin ? 0.6 : 1, 
                          cursor: isEditingAdmin ? 'not-allowed' : 'text' 
                        }}
                        disabled={isEditingAdmin}
                      />
                    </div>

                    {/* Role & Status Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                      {/* Role (Non-editable for Admin; Only User option when adding new user) */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Access Role
                        </label>
                        <select 
                          value={formValues.role}
                          onChange={(e) => setFormValues({ ...formValues, role: e.target.value })}
                          className="form-control"
                          style={{ 
                            width: '100%', 
                            opacity: isEditingAdmin ? 0.6 : 1, 
                            cursor: isEditingAdmin ? 'not-allowed' : 'pointer' 
                          }}
                          disabled={isEditingAdmin}
                        >
                          <option value="user">User (Standard Access)</option>
                          {editingUser && editingUser.role === 'admin' && (
                            <option value="admin">Admin (Full Access)</option>
                          )}
                        </select>
                      </div>

                      {/* Status (Non-editable for Admin) */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Account Status
                        </label>
                        <select 
                          value={formValues.status}
                          onChange={(e) => setFormValues({ ...formValues, status: e.target.value })}
                          className="form-control"
                          style={{ 
                            width: '100%', 
                            opacity: isEditingAdmin ? 0.6 : 1, 
                            cursor: isEditingAdmin ? 'not-allowed' : 'pointer' 
                          }}
                          disabled={isEditingAdmin}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ 
                    padding: '10px 18px', 
                    borderRadius: 'var(--radius-md)', 
                    background: 'var(--bg-secondary)', 
                    border: '1px solid var(--border-color)', 
                    color: 'var(--text-primary)', 
                    cursor: 'pointer',
                    fontWeight: 600 
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                  style={{ 
                    padding: '10px 24px', 
                    fontSize: '0.95rem', 
                    fontWeight: 700 
                  }}
                >
                  {submitting ? (editingUser ? 'Updating...' : 'Creating...') : (editingUser ? 'Save Changes' : 'Create User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
