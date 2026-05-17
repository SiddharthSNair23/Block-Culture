import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useNavigate } from 'react-router-dom';
import { useAuth, API_URL } from '../context/AuthContext';
import Navigation from './Navigation';

const STATUS = {
  available: { label: 'Available',        color: '#c8952a', bg: 'rgba(200,149,42,0.12)' },
  in_escrow: { label: 'Deposit Received', color: '#2a7ac8', bg: 'rgba(42,122,200,0.12)' },
  sold:      { label: 'Sold',             color: '#3a7d44', bg: 'rgba(58,125,68,0.12)'  },
};

const SupplyChain = ({ account, connectAndLoad, escrow, provider }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchStatuses = async () => {
    setLoading(true);
    try {
      // 1. Always start from MongoDB — it has ALL listings
      const res = await fetch(`${API_URL}/listings`, { credentials: 'include' });
      const dbListings = await res.json();
      if (dbListings.error) { setLoading(false); return; }

      // 2. For each listing, try to enrich with live blockchain data
      const enriched = await Promise.all(dbListings.map(async (l) => {
        const base = {
          id: l._id,
          name: l.title,
          image: l.image?.url || '',
          grade: l.grade,
          season: l.season,
          price: `${l.price} ETH`,
          tokenId: l.blockchainTokenId || null,
          status: l.status || 'available',  // MongoDB is source of truth
          seller: null,
          buyer: null,
          vendor: l.owner?.username,
        };

        // If no blockchain token or no escrow connection, just use MongoDB status
        if (!l.blockchainTokenId || !escrow || !provider) return base;

        try {
          const tokenId = l.blockchainTokenId;
          const isListed = await escrow.isListed(tokenId);
          const buyerAddr = await escrow.buyer(tokenId);
          const seller = await escrow.seller();
          const purchasePrice = await escrow.purchasePrice(tokenId);

          // Derive status from blockchain but cross-check with MongoDB
          let blockchainStatus = l.status; // default to MongoDB

          if (l.status === 'sold') {
            blockchainStatus = 'sold'; // trust MongoDB for sold — blockchain clears state after finalize
          } else if (isListed) {
            const escrowBalance = await provider.getBalance(escrow.address);
            blockchainStatus = escrowBalance.gt(0) ? 'in_escrow' : 'available';
          }

          return {
            ...base,
            status: blockchainStatus,
            seller: seller,
            buyer: buyerAddr !== ethers.constants.AddressZero ? buyerAddr : null,
            price: purchasePrice && purchasePrice.gt(0)
              ? ethers.utils.formatEther(purchasePrice) + ' ETH'
              : base.price,
          };
        } catch {
          return base; // blockchain call failed, use MongoDB data
        }
      }));

      setRows(enriched);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Supply chain error:', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchStatuses(); }, [escrow]);

  const shortAddr = (addr) => addr ? addr.slice(0, 6) + '...' + addr.slice(38, 42) : '—';

  const summary = {
    total:    rows.length,
    available: rows.filter(r => r.status === 'available').length,
    inEscrow: rows.filter(r => r.status === 'in_escrow').length,
    sold:     rows.filter(r => r.status === 'sold').length,
  };

  return (
    <div className="supplychain">
      <Navigation account={account} connectAndLoad={connectAndLoad} user={user} onLogout={logout} />

      <div className="sc__header">
        <div className="sc__header-inner">
          <button className="back__btn" onClick={() => navigate('/')}>← Home</button>
          <h1 className="mkt__title">Supply Chain</h1>
          <p className="mkt__sub">Live status of all crop listings</p>
        </div>

        <div className="sc__summary">
          {[
            { label: 'Total Crops', value: summary.total,    color: '#c8952a' },
            { label: 'Available',   value: summary.available, color: '#c8952a' },
            { label: 'In Escrow',   value: summary.inEscrow,  color: '#2a7ac8' },
            { label: 'Sold',        value: summary.sold,      color: '#3a7d44' },
          ].map((s, i) => (
            <div className="sc__stat" key={i}>
              <span className="sc__stat-value" style={{ color: s.color }}>{s.value}</span>
              <span className="sc__stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="sc__body">
        <div className="sc__toolbar">
          <span className="sc__count">{rows.length} crops tracked</span>
          <button className="sc__refresh" onClick={fetchStatuses}>
            ↻ Refresh {lastUpdated && <span className="sc__updated">· {lastUpdated}</span>}
          </button>
        </div>

        {loading ? (
          <div className="sc__empty">
            <div className="sc__spinner" />
            <p>Loading supply chain data...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="sc__empty">
            <p>No crops found. Vendors need to add listings first.</p>
          </div>
        ) : (
          <div className="sc__table-wrap">
            <table className="sc__table">
              <thead>
                <tr>
                  <th>Crop</th>
                  <th>Grade</th>
                  <th>Season</th>
                  <th>Price</th>
                  <th>Vendor</th>
                  <th>Token ID</th>
                  <th>Seller</th>
                  <th>Buyer</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const s = STATUS[r.status] || STATUS['available'];
                  return (
                    <tr key={i} className="sc__row">
                      <td>
                        <div className="sc__crop-cell">
                          {r.image
                            ? <img src={r.image} alt={r.name} className="sc__thumb" />
                            : <div className="sc__thumb" style={{ background: '#2d1f0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🌾</div>
                          }
                          <span className="sc__crop-name">{r.name}</span>
                        </div>
                      </td>
                      <td>{r.grade || '—'}</td>
                      <td>{r.season || '—'}</td>
                      <td><strong>{r.price}</strong></td>
                      <td style={{ fontSize: '0.85rem' }}>{r.vendor || '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--clr-grey)' }}>
                        {r.tokenId ? `#${r.tokenId}` : '—'}
                      </td>
                      <td className="sc__addr">{shortAddr(r.seller)}</td>
                      <td className="sc__addr">{shortAddr(r.buyer)}</td>
                      <td>
                        <span className="sc__badge" style={{ color: s.color, background: s.bg, border: `1px solid ${s.color}33` }}>
                          {s.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplyChain;
