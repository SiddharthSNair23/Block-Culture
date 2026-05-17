import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { useAuth, API_URL } from '../context/AuthContext';
import Navigation from './Navigation';

const CustomerMarketplace = ({ account, connectAndLoad, provider, escrow, agriYield, reloadCrops }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [listings, setListings] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState(null);
  const [buying, setBuying] = useState(false);
  const [buyMsg, setBuyMsg] = useState('');
  const [buyErr, setBuyErr] = useState('');

  useEffect(() => { fetchListings(); }, []);

  const fetchListings = async () => {
    const res = await fetch(`${API_URL}/listings`, { credentials: 'include' });
    const data = await res.json();
    if (!data.error) setListings(data.filter(l => l.status === 'available' || l.status === 'in_escrow'));
  };

  const seasons = ['All', ...new Set(listings.map(l => l.season).filter(Boolean))];
  const filtered = listings.filter(l => {
    const matchSearch = l.title?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || l.season === filter;
    return matchSearch && matchFilter;
  });

  // ── BUY FLOW ──────────────────────────────────────────────────────────────
  // The Escrow contract requires:
  // 1. Seller (vendor's wallet) calls list() — puts NFT in escrow for a specific buyer
  // 2. Buyer (customer's wallet) calls depositEarnest() — deposits ETH
  // 3. Both approve, seller calls finalizeSale()
  //
  // Since the vendor isn't online live, we use a simpler flow:
  // Customer mints NFT → customer calls list() as both minter and buyer → deposits earnest
  // This works because the customer IS the one doing the full on-chain purchase

  const handleBuy = async (listing) => {
    if (!account) { connectAndLoad(); return; }
    if (!agriYield || !escrow || !provider) { setBuyErr('Blockchain not loaded. Make sure Hardhat is running.'); return; }

    setBuying(true);
    setBuyMsg('');
    setBuyErr('');

    try {
      const signer = provider.getSigner();
      const signerAddress = await signer.getAddress();
      const metadataURI = `${API_URL}/listings/${listing._id}/metadata`;
      const priceInWei = ethers.utils.parseEther(String(listing.price));
      const earnest = priceInWei.mul(10).div(100);

      // Step 1 — Customer mints the NFT
      setBuyMsg('Step 1/3 — MetaMask: mint this crop as an NFT...');
      const mintTx = await agriYield.connect(signer).mint(metadataURI);
      setBuyMsg('Minting NFT on blockchain...');
      const mintReceipt = await mintTx.wait();
      const transferEvent = mintReceipt.events?.find(e => e.event === 'Transfer');
      const tokenId = transferEvent?.args?.tokenId?.toNumber();
      if (!tokenId) throw new Error('Could not get token ID.');

      // Step 2 — Customer approves the SELLER wallet to transfer the NFT
      // (Backend seller wallet will call list() which does transferFrom)
      setBuyMsg('Step 2/3 — MetaMask: approve seller to list your NFT in escrow...');
      const SELLER_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const approveTx = await agriYield.connect(signer).approve(SELLER_ADDRESS, tokenId);
      await approveTx.wait();

      // Step 3 — Backend calls list() as seller (no MetaMask needed from customer)
      setBuyMsg('Step 3/3 — Listing in escrow via backend...');
      const listRes = await fetch(`${API_URL}/listings/${listing._id}/list-escrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tokenId, buyerAddress: signerAddress, purchasePrice: listing.price }),
      });
      const listData = await listRes.json();
      if (listData.error) throw new Error(listData.error);

      // Step 4 — Customer deposits earnest
      setBuyMsg(`Step 4/4 — MetaMask: deposit earnest (${listData.earnest} ETH) into escrow...`);
      const depositTx = await escrow.connect(signer).depositEarnest(tokenId, { value: earnest });
      await depositTx.wait();

      // Step 5 — Buyer approves the sale (required by finalizeSale)
      setBuyMsg('Almost done — MetaMask: approve the sale completion...');
      const buyerApproveTx = await escrow.connect(signer).approveSale(tokenId);
      await buyerApproveTx.wait();

      // Update MongoDB status
      await fetch(`${API_URL}/listings/${listing._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'in_escrow', blockchainTokenId: tokenId }),
      });

      setBuyMsg(`✓ NFT #${tokenId} is in escrow! Your approval is set. Vendor just needs to approve & finalize to complete the sale.`);
      fetchListings();
      if (reloadCrops) reloadCrops();
    } catch (err) {
      if (err.code === 4001) setBuyErr('Transaction cancelled in MetaMask.');
      else setBuyErr('Error: ' + (err.reason || err.message));
    }
    setBuying(false);
  };

  const closeModal = () => { setSelected(null); setBuyMsg(''); setBuyErr(''); };

  const statusLabel = (s) => ({ available: 'Available', in_escrow: 'In Escrow', sold: 'Sold' }[s] || s);
  const statusColor = (s) => s === 'sold' ? '#3a7d44' : s === 'in_escrow' ? '#2a7ac8' : '#c8952a';

  return (
    <div className="marketplace">
      <Navigation account={account} connectAndLoad={connectAndLoad} user={user} onLogout={logout} />

      <div className="mkt__header">
        <div className="mkt__header-inner">
          <button className="back__btn" onClick={() => navigate('/')}>← Home</button>
          <h1 className="mkt__title">Crop Marketplace</h1>
          <p className="mkt__sub">{listings.filter(l => l.status === 'available').length} crops available from vendors</p>
        </div>
        <div className="mkt__controls">
          <div className="mkt__search-wrap">
            <span className="search__icon">⌕</span>
            <input className="mkt__search" type="text" placeholder="Search crops..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="mkt__filters">
            {seasons.map(s => (
              <button key={s} className={`filter__btn ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>{s}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="mkt__grid-wrap">
        {filtered.length === 0 ? (
          <div className="mkt__empty">No crops found. Vendors need to add listings first.</div>
        ) : (
          <div className="mkt__grid">
            {filtered.map((l, i) => (
              <div className="crop__card" key={l._id} style={{ animationDelay: `${i * 60}ms` }}>
                <div className="crop__img-wrap">
                  {l.image?.url
                    ? <img src={l.image.url} alt={l.title} className="crop__img" />
                    : <div className="crop__img" style={{ background: 'linear-gradient(135deg,#2d1f0a,#3a7d44)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>🌾</div>
                  }
                  <div className="crop__badge">Grade {l.grade}</div>
                </div>
                <div className="crop__body">
                  <div className="crop__top">
                    <h3 className="crop__name">{l.title}</h3>
                    <span className="crop__season">{l.season}</span>
                  </div>
                  <p className="crop__desc">{l.description}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--clr-grey)', marginBottom: 8 }}>
                    📍 {l.location} · {l.quantity} {l.unit} · <strong>{l.owner?.username}</strong>
                  </p>
                  <div className="crop__footer">
                    <span className="crop__price">{l.price} ETH</span>
                    {l.status === 'available'
                      ? <button className="crop__cta" onClick={() => setSelected(l)}>Buy →</button>
                      : <span className="sc__badge" style={{ color: statusColor(l.status), background: statusColor(l.status) + '18', border: `1px solid ${statusColor(l.status)}33`, fontSize: '0.78rem' }}>{statusLabel(l.status)}</span>
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BUY MODAL */}
      {selected && (
        <div className="home" onClick={closeModal}>
          <div className="home__details" onClick={e => e.stopPropagation()}>
            {selected.image?.url && (
              <div className="home__image"><img src={selected.image.url} alt={selected.title} /></div>
            )}
            <div className="home__overview">
              <button className="home__close" onClick={closeModal}>✕</button>
              <h1>{selected.title}</h1>
              <p>{selected.description}</p>
              <hr />
              <p>📍 {selected.location}, {selected.country}</p>
              <p>🌾 Season: {selected.season} · Grade: {selected.grade}</p>
              <p>📦 {selected.quantity} {selected.unit}</p>
              <p>👤 Vendor: <strong>{selected.owner?.username}</strong></p>
              <h2>{selected.price} ETH</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--clr-grey)', marginBottom: 16 }}>
                Requires 2 MetaMask confirmations: mint NFT + approve seller. Backend handles listing. Then earnest deposit.
              </p>

              {buyMsg && (
                <div style={{ background: buyMsg.startsWith('✓') ? '#e8f5e9' : '#e3f2fd', border: `1px solid ${buyMsg.startsWith('✓') ? '#a5d6a7' : '#90caf9'}`, color: buyMsg.startsWith('✓') ? '#2e7d32' : '#1565c0', padding: '10px 14px', borderRadius: 6, fontSize: '0.85rem', marginBottom: 12 }}>
                  {buyMsg}
                </div>
              )}
              {buyErr && (
                <div style={{ background: '#fdf0f0', border: '1px solid #f5c6c6', color: '#c0392b', padding: '10px 14px', borderRadius: 6, fontSize: '0.85rem', marginBottom: 12 }}>
                  {buyErr}
                </div>
              )}

              {!buyMsg.startsWith('✓') && (
                account ? (
                  <button className="home__buy" disabled={buying} onClick={() => handleBuy(selected)}>
                    {buying ? 'Processing...' : 'Buy with MetaMask 🦊'}
                  </button>
                ) : (
                  <button className="home__buy" onClick={connectAndLoad}>
                    Connect MetaMask to Buy
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerMarketplace;
