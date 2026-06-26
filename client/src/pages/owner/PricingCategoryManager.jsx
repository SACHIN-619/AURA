import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { COLOR, FONT } from '../../utils/tokens';
import { API } from '../../context/AuraContext';

export default function PricingCategoryManager() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form states
  const [form, setForm] = useState({ name: '', category: '', price: '' });
  const [editId, setEditId] = useState(null);
  const [busy, setBusy] = useState(false);

  const token = localStorage.getItem('aura_token');

  const fetchServices = () => {
    if (!token) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }
    fetch(`${API}/api/owner/services`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setServices(data.services || []);
        } else {
          setError(data.error || 'Failed to load services.');
        }
      })
      .catch(err => {
        console.error(err);
        setError('Network error loading services.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.category || !form.price) return;
    setBusy(true);

    try {
      const url = editId 
        ? `${API}/api/owner/services/${editId}` 
        : `${API}/api/owner/services`;
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          price: Number(form.price)
        })
      });
      const data = await res.json();
      if (data.success) {
        setServices(data.services);
        setForm({ name: '', category: '', price: '' });
        setEditId(null);
      } else {
        alert(data.error || 'Operation failed');
      }
    } catch (err) {
      console.error(err);
      alert('Network error submitting service.');
    } finally {
      setBusy(false);
    }
  };

  const handleEdit = (srv) => {
    setEditId(srv._id);
    setForm({ name: srv.name, category: srv.category, price: srv.price });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      const res = await fetch(`${API}/api/owner/services/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setServices(data.services);
      } else {
        alert(data.error || 'Delete failed');
      }
    } catch (err) {
      console.error(err);
      alert('Network error deleting service.');
    }
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm({ name: '', category: '', price: '' });
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: FONT.mono, fontSize: '0.8rem', color: COLOR.textMuted }}>
        Loading service catalog...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontFamily: FONT.mono, fontSize: '0.8rem', color: '#EF5350' }}>
        {error}
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
      style={S.container}
    >
      <div style={S.headerGrid}>
        <h2 style={S.heading}>Pricing & Service Manager</h2>
        <p style={S.subheading}>CATALOG PROFILE CONFIGURATIONS</p>
      </div>

      {/* Form Section */}
      <div style={S.formCard}>
        <h3 style={S.formTitle}>{editId ? 'Edit Service' : 'Add New Service'}</h3>
        <form onSubmit={handleSubmit} style={S.form}>
          <div style={S.inputGroup}>
            <label style={S.inputLabel}>SERVICE NAME</label>
            <input
              style={S.input}
              placeholder="e.g. Signature Textured Crop Fade"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div style={S.inputGroup}>
            <label style={S.inputLabel}>CATEGORY LAYER</label>
            <input
              style={S.input}
              placeholder="e.g. Grooming, Hair Therapy, Skincare"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              required
            />
          </div>
          <div style={S.inputGroup}>
            <label style={S.inputLabel}>PRICE (INR)</label>
            <input
              type="number"
              style={S.input}
              placeholder="e.g. 1200"
              value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              required
            />
          </div>
          <div style={S.actionsRow}>
            {editId && (
              <button type="button" onClick={cancelEdit} style={S.cancelBtn}>
                Cancel
              </button>
            )}
            <button type="submit" disabled={busy} style={S.submitBtn}>
              {busy ? 'Processing...' : editId ? 'Update Service' : 'Add Service'}
            </button>
          </div>
        </form>
      </div>

      {/* Table Section */}
      <div style={S.tableContainer}>
        {services.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', fontFamily: FONT.mono, fontSize: '0.75rem', color: COLOR.textGhost }}>
            No services listed in catalog. Add one above.
          </div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr style={S.thRow}>
                <th style={S.th}>SERVICE NAME</th>
                <th style={S.th}>CATEGORY LAYER</th>
                <th style={S.th}>PRICE (INR)</th>
                <th style={{ ...S.th, textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {services.map(srv => (
                <tr key={srv._id} style={S.tr}>
                  <td style={S.tdName}>{srv.name}</td>
                  <td style={S.tdCat}><span style={S.tag}>{srv.category.toUpperCase()}</span></td>
                  <td style={S.tdPrice}>₹{srv.price}</td>
                  <td style={{ ...S.td, textAlign: 'right' }}>
                    <button onClick={() => handleEdit(srv)} style={S.editBtn}>Edit</button>
                    <button onClick={() => handleDelete(srv._id)} style={S.deleteBtn}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  );
}

const S = {
  container: { padding: '1rem' },
  headerGrid: { marginBottom: '2rem' },
  heading: { fontFamily: FONT.display, fontSize: '1.6rem', color: COLOR.textPrimary, margin: 0, fontWeight: 300 },
  subheading: { fontFamily: FONT.mono, fontSize: '0.55rem', color: COLOR.textMuted, letterSpacing: '0.15em', marginTop: '0.2rem' },
  formCard: { background: 'rgba(18,14,24,0.65)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 6, padding: '1.5rem', marginBottom: '2rem' },
  formTitle: { fontFamily: FONT.display, fontSize: '1.1rem', color: COLOR.textPrimary, marginBottom: '1.2rem', fontWeight: 300 },
  form: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  inputLabel: { fontFamily: FONT.mono, fontSize: '0.5rem', color: COLOR.goldDim, letterSpacing: '0.1em' },
  input: { background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,175,55,0.15)', padding: '0.6rem 0.8rem', borderRadius: 4, color: COLOR.textPrimary, fontFamily: FONT.body, fontSize: '0.8rem', outline: 'none' },
  actionsRow: { display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', height: '100%', alignItems: 'end' },
  submitBtn: { background: 'linear-gradient(135deg,#FFF2A8,#D4AF37)', color: '#1a1410', padding: '0.6rem 1.2rem', borderRadius: 4, fontWeight: 700, cursor: 'pointer', fontFamily: FONT.body, fontSize: '0.75rem', transition: 'all 0.2s' },
  cancelBtn: { background: 'rgba(255,255,255,0.05)', color: COLOR.textMuted, border: '1px solid rgba(255,255,255,0.1)', padding: '0.6rem 1.2rem', borderRadius: 4, cursor: 'pointer', fontFamily: FONT.body, fontSize: '0.75rem', transition: 'all 0.2s' },
  tableContainer: { background: 'rgba(18,14,24,0.45)', border: '1px solid rgba(212,175,55,0.1)', borderRadius: 6, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  thRow: { background: 'rgba(212,175,55,0.04)', borderBottom: '1px solid rgba(212,175,55,0.1)' },
  th: { padding: '1rem', fontFamily: FONT.mono, fontSize: '0.55rem', color: COLOR.gold, letterSpacing: '0.1em', fontWeight: 400 },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background-color 0.2s' },
  td: { padding: '1rem' },
  tdName: { padding: '1rem', fontFamily: FONT.body, fontSize: '0.85rem', color: COLOR.textPrimary },
  tdCat: { padding: '1rem' },
  tag: { fontFamily: FONT.mono, fontSize: '0.5rem', background: 'rgba(255,255,255,0.05)', color: COLOR.textMuted, padding: '0.2rem 0.4rem', borderRadius: 3, letterSpacing: '0.05em' },
  tdPrice: { padding: '1rem', fontFamily: FONT.mono, fontSize: '0.85rem', color: COLOR.textPrimary },
  editBtn: { background: 'none', border: 'none', color: COLOR.gold, fontFamily: FONT.mono, fontSize: '0.65rem', cursor: 'pointer', marginRight: '1rem', fontWeight: 600 },
  deleteBtn: { background: 'none', border: 'none', color: '#EF5350', fontFamily: FONT.mono, fontSize: '0.65rem', cursor: 'pointer', fontWeight: 600 }
};