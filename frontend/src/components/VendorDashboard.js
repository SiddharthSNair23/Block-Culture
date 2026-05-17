import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import Navigation from './Navigation';

const SEASONS = ['Kharif', 'Rabi', 'Zaid'];
const GRADES = ['A', 'B', 'C'];
const UNITS = ['kg', 'quintal', 'tonne'];
const emptyForm = { title: '', description: '', price: '', location: '', country: '', season: 'Rabi', grade: 'A', quantity: '', unit: 'kg' };

const VendorDashboard = ({ account, connectAndLoad, provider, escrow }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [listings, setListings] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: 'success' });
  const [activeTab, setActiveTab] = useState('listings');

  useEffect(() => {
    if (!user || user.role !== 'vendor') { navigate('/login'); return; }
    fetchMyListings();
  }, [user]);

  const fetchMyListings = async () => {
    const res = await fetch(`${API_URL}/listings`, { credentials: 'include' });
    const all = await res.json();
    if (!all.error) setListings(all.filter(l => l.owner?._id === user.id || l.owner?.username === user.username));
  };

  const flash = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: 'success' }), 4000);
  };

  // ── CREATE / EDIT — just save to MongoDB, no MetaMask needed
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (imageFile) fd.append('image', imageFile);

      const url = editId ? `${API_URL}/listings/${editId}` : `${API_URL}/listings`;
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, credentials: 'include', body: fd });
      const data = await res.json();

      if (data.error) { flash('Error: ' + data.error, 'error'); setLoading(false); return; }

      flash(editId ? 'Listing updated!' : '✓ Listing created! Customers can now see it in the marketplace.');
      setForm(emptyForm); setImageFile(null); setEditId(null); setShowForm(false);
      fetchMyListings();
    } catch (err) {
      flash('Error: ' + err.message, 'error');
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this listing?')) return;
    await fetch(`${API_URL}/listings/${id}`, { method: 'DELETE', credentials: 'include' });
    flash('Listing deleted');
    fetchMyListings();
  };

  const handleEdit = (listing) => {
    setForm({
      title: listing.title || '', description: listing.description || '',
      price: listing.price || '', location: listing.location || '',
      country: listing.country || '', season: listing.season || 'Rabi',
      grade: listing.grade || 'A', quantity: listing.quantity || '',
      unit: listing.unit || 'kg',
    });
    setEditId(listing._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [finalizing, setFinalizing] = useState(null); // holds listing._id while processing

  const handleFinalize = async (listing) => {
    if (!listing.blockchainTokenId) {
      flash('No blockchain token linked to this listing', 'error');
      return;
    }
    setFinalizing(listing._id);
    flash('Finalizing sale — transferring ETH to seller wallet and NFT to buyer...', 'info');
    try {
      // Backend handles approveSale + finalizeSale using the seller wallet (Hardhat deployer)
      // No MetaMask needed from vendor — seller key is on the backend
      const res = await fetch(`${API_URL}/listings/${listing._id}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      flash(`✓ Sale finalized! ETH transferred to seller wallet. NFT sent to buyer.`);
      fetchMyListings();
    } catch (err) {
      flash('Error: ' + (err.reason || err.message), 'error');
    }
    setFinalizing(null);
  };

  const statusColor = (s) => s === 'sold' ? '#3a7d44' : s === 'in_escrow' ? '#2a7ac8' : '#c8952a';
  const msgBg = { success: '#e8f5e9', error: '#fdf0f0', info: '#e3f2fd' };
  const msgClr = { success: '#2e7d32', error: '#c0392b', info: '#1565c0' };

  return (
    <div className="vendor">
      <Navigation account={account} connectAndLoad={connectAndLoad} user={user} onLogout={logout} />

      <div className="vendor__header">
        <div className="vendor__header-inner">
          <div>
            <h1 className="mkt__title">Vendor Dashboard</h1>
            <p className="mkt__sub">Welcome back, <strong>{user?.username}</strong></p>
          </div>
          <div className="vendor__tabs">
            <button className={`vtab ${activeTab === 'listings' ? 'active' : ''}`} onClick={() => setActiveTab('listings')}>My Listings</button>
            <button className={`vtab ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}>Sales Status</button>
          </div>
        </div>
      </div>

      <div className="vendor__body">
        {msg.text && (
          <div className="vendor__flash" style={{ background: msgBg[msg.type], color: msgClr[msg.type], borderColor: msgClr[msg.type] + '44' }}>
            {msg.text}
          </div>
        )}

        {/* ── MY LISTINGS TAB ── */}
        {activeTab === 'listings' && (
          <>
            <div className="vendor__toolbar">
              <span>{listings.length} listings · {listings.filter(l => l.status === 'sold').length} sold</span>
              <button className="btn btn--primary" onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm); }}>
                {showForm ? '✕ Cancel' : '+ Add Listing'}
              </button>
            </div>

            {showForm && (
              <form className="vendor__form" onSubmit={handleSubmit}>
                <h3 className="vendor__form-title">{editId ? 'Edit Listing' : 'New Crop Listing'}</h3>
                <div className="vform__grid">
                  <div className="field">
                    <label>Crop Name *</label>
                    <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Wheat Crop" required />
                  </div>
                  <div className="field">
                    <label>Price (ETH) *</label>
                    <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="e.g. 2" required />
                  </div>
                  <div className="field">
                    <label>Season</label>
                    <select value={form.season} onChange={e => setForm({ ...form, season: e.target.value })}>
                      {SEASONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Grade</label>
                    <select value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })}>
                      {GRADES.map(g => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Quantity</label>
                    <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="0" />
                  </div>
                  <div className="field">
                    <label>Unit</label>
                    <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                      {UNITS.map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="field field--full">
                    <label>Description *</label>
                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the crop quality, harvest details..." required />
                  </div>
                  <div className="field">
                    <label>Location</label>
                    <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. Pune, Maharashtra" />
                  </div>
                  <div className="field">
                    <label>Country</label>
                    <input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="e.g. India" />
                  </div>
                  <div className="field field--full">
                    <label>Crop Image</label>
                    <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} />
                  </div>
                </div>
                <button className="btn btn--primary" type="submit" disabled={loading}>
                  {loading ? 'Saving...' : editId ? 'Update Listing' : 'Create Listing'}
                </button>
              </form>
            )}

            <div className="vendor__table-wrap">
              {listings.length === 0 ? (
                <div className="sc__empty"><p>No listings yet. Add your first crop!</p></div>
              ) : (
                <table className="sc__table">
                  <thead>
                    <tr>
                      <th>Crop</th>
                      <th>Price</th>
                      <th>Season</th>
                      <th>Grade</th>
                      <th>Qty</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listings.map((l) => (
                      <tr className="sc__row" key={l._id}>
                        <td>
                          <div className="sc__crop-cell">
                            {l.image?.url && <img src={l.image.url} alt={l.title} className="sc__thumb" />}
                            <span className="sc__crop-name">{l.title}</span>
                          </div>
                        </td>
                        <td><strong>{l.price} ETH</strong></td>
                        <td>{l.season}</td>
                        <td>{l.grade}</td>
                        <td>{l.quantity} {l.unit}</td>
                        <td>
                          <span className="sc__badge" style={{ color: statusColor(l.status), background: statusColor(l.status) + '18', border: `1px solid ${statusColor(l.status)}33` }}>
                            {l.status || 'available'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="vaction vaction--edit" onClick={() => handleEdit(l)}>Edit</button>
                            <button className="vaction vaction--delete" onClick={() => handleDelete(l._id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ── SALES STATUS TAB ── */}
        {activeTab === 'sales' && (
          <div>
            {!account && (
              <div className="vendor__notice" style={{ marginBottom: 16 }}>
                ⚠️ <strong>Connect MetaMask</strong> to approve and finalize sales.{' '}
                <span onClick={connectAndLoad} style={{ color: 'var(--clr-gold)', cursor: 'pointer' }}>Connect now</span>
              </div>
            )}
            <div className="vendor__table-wrap">
              <p style={{ color: 'var(--clr-grey)', padding: '20px 24px 8px', fontSize: '0.88rem' }}>
                When a customer buys a crop, it goes <strong>In Escrow</strong>. Click <strong>Approve &amp; Finalize</strong> to release ETH to your wallet and complete the sale.
              </p>
              <table className="sc__table">
                <thead>
                  <tr>
                    <th>Crop</th>
                    <th>Price</th>
                    <th>Token ID</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.filter(l => l.status !== 'available').length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: 40, color: 'var(--clr-grey)' }}>No sales yet — waiting for customers to buy</td></tr>
                  ) : (
                    listings.filter(l => l.status !== 'available').map(l => (
                      <tr className="sc__row" key={l._id}>
                        <td>
                          <div className="sc__crop-cell">
                            {l.image?.url && <img src={l.image.url} alt={l.title} className="sc__thumb" />}
                            <span className="sc__crop-name">{l.title}</span>
                          </div>
                        </td>
                        <td><strong>{l.price} ETH</strong></td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--clr-grey)' }}>
                          {l.blockchainTokenId ? `#${l.blockchainTokenId}` : '—'}
                        </td>
                        <td>
                          <span className="sc__badge" style={{ color: statusColor(l.status), background: statusColor(l.status) + '18', border: `1px solid ${statusColor(l.status)}33` }}>
                            {l.status === 'in_escrow' ? 'In Escrow' : l.status === 'sold' ? 'Sold' : l.status}
                          </span>
                        </td>
                        <td>
                          {l.status === 'in_escrow' && (
                            <button
                              className="btn btn--primary"
                              style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                              onClick={() => handleFinalize(l)}
                            >
                              Approve &amp; Finalize 🦊
                            </button>
                          )}
                          {l.status === 'sold' && (
                            <span style={{ color: '#3a7d44', fontSize: '0.85rem', fontWeight: 600 }}>✓ ETH received</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorDashboard;
