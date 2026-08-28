import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PlusCircle, Users, ArrowUpRight, TrendingUp, DollarSign, Archive, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { authenticatedFetch, user } = useAuth();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalBoxes: 0,
    totalSales: 0,
    recentCalculations: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const response = await authenticatedFetch('/api/customers');
        if (response.ok) {
          const data = await response.json();

          // Calculate stats from the customer list
          const totalCustomers = data.length;
          const totalBoxes = data.reduce((acc, curr) => acc + Number(curr.quantity_of_boxes || 0), 0);
          const totalSales = data.reduce((acc, curr) => acc + Number(curr.grand_total || 0), 0);

          setStats({
            totalCustomers,
            totalBoxes,
            totalSales,
            recentCalculations: data.slice(0, 5), // Get top 5 recent
          });
        }
      } catch (err) {
        console.error('Error fetching dashboard statistics:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  return (
    <div style={{ padding: '24px 32px', maxWidth: '100%', width: '100%' }} className="animate-fade">

      {/* Welcome banner */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.4rem', fontFamily: 'var(--font-heading)', marginBottom: '8px' }}>
          Welcome back, <span className="gradient-text">{user?.full_name || 'User'}</span>!
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Here is a summary of your box packaging inventory and order calculations.
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '40px' }}>

        {/* Total Calculations */}
        <div className="glass-panel" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600' }}>Calculations Saved</div>
          <div style={{ fontSize: '2.2rem', fontWeight: '800', margin: '12px 0 6px', fontFamily: 'var(--font-heading)' }}>
            {loading ? '...' : stats.totalCustomers}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--color-success)' }}>
            <TrendingUp size={16} />
            <span>Active database entries</span>
          </div>
          <div style={{ position: 'absolute', right: '20px', bottom: '20px', color: 'var(--color-glow)' }}>
            <Users size={48} style={{ opacity: 0.15 }} />
          </div>
        </div>

        {/* Total Boxes Ordered */}
        <div className="glass-panel" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600' }}>Total Boxes Managed</div>
          <div style={{ fontSize: '2.2rem', fontWeight: '800', margin: '12px 0 6px', fontFamily: 'var(--font-heading)' }}>
            {loading ? '...' : stats.totalBoxes.toLocaleString()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--color-success)' }}>
            <Archive size={16} fill="none" />
            <span>Fabricated boxes total</span>
          </div>
          <div style={{ position: 'absolute', right: '20px', bottom: '20px', color: 'var(--color-glow)' }}>
            <Archive size={48} style={{ opacity: 0.15 }} />
          </div>
        </div>

        {/* Total Revenue */}
        <div className="glass-panel" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600' }}>Calculated Total Valuation</div>
          <div style={{ fontSize: '2.2rem', fontWeight: '800', margin: '12px 0 6px', fontFamily: 'var(--font-heading)', color: 'var(--color-accent)' }}>
            {loading ? '...' : `₹${stats.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--color-success)' }}>
            <DollarSign size={16} />
            <span>Inclusive of GST</span>
          </div>
          <div style={{ position: 'absolute', right: '20px', bottom: '20px', color: 'var(--color-glow)' }}>
            <DollarSign size={48} style={{ opacity: 0.15 }} />
          </div>
        </div>

      </div>

      {/* Two Column Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '32px' }} className="dashboard-grid">

        {/* Quick Actions Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-heading)' }}>Quick Operations</h2>

          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Perform live structural pricing calculations or view your full logs.
            </p>

            <Link to="/add-customer" className="btn-primary" style={{ justifyContent: 'center' }}>
              <PlusCircle size={18} />
              <span>Create Calculation</span>
            </Link>

            <Link to="/customers" className="btn-secondary" style={{ justifyContent: 'center' }}>
              <Users size={18} />
              <span>View Calculations List</span>
            </Link>
          </div>
        </div>

        {/* Recent Calculations List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-heading)' }}>Recent Entries</h2>
            <Link to="/customers" style={{ fontSize: '0.875rem', color: 'var(--color-accent)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>View All</span>
              <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="glass-panel" style={{ padding: '24px', minHeight: '260px' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Loading entries...</span>
              </div>
            ) : stats.recentCalculations.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '200px', gap: '12px' }}>
                <Clock size={40} style={{ color: 'var(--text-muted)' }} />
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>No recent calculation runs.</span>
                <Link to="/add-customer" style={{ fontSize: '0.875rem', color: 'var(--color-accent)', fontWeight: '600' }}>
                  Run your first calculation
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {stats.recentCalculations.map((calc) => (
                  <div
                    key={calc.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                        {calc.company_name || 'SRI VARI PACKS'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Qty: {calc.quantity_of_boxes} • {calc.ply_type} Ply • Size: {calc.size_label || '12 × 12 × 23¾'}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '700', color: 'var(--color-accent)' }}>
                        ₹{Number(calc.grand_total).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {new Date(calc.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
