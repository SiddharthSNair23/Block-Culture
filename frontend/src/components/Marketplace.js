import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from './Navigation';
import Home from './Home';

const Marketplace = ({ account, connectAndLoad, crops, provider, escrow }) => {
  const [crop, setCrop] = useState({});
  const [toggle, setToggle] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const navigate = useNavigate();

  const seasons = ['All', ...new Set(crops.map(c => c.attributes?.[1]?.value).filter(Boolean))];

  const filtered = crops.filter(c => {
    const matchSearch = c.name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || c.attributes?.[1]?.value === filter;
    return matchSearch && matchFilter;
  });

  const togglePop = (c) => {
    setCrop(c);
    setToggle(t => !t);
  };

  return (
    <div className="marketplace">
      <Navigation account={account} connectAndLoad={connectAndLoad} />

      {/* PAGE HEADER */}
      <div className="mkt__header">
        <div className="mkt__header-inner">
          <button className="back__btn" onClick={() => navigate('/')}>← Home</button>
          <h1 className="mkt__title">Crop Marketplace</h1>
          <p className="mkt__sub">{crops.length} yields available on-chain</p>
        </div>

        {/* SEARCH + FILTER */}
        <div className="mkt__controls">
          <div className="mkt__search-wrap">
            <span className="search__icon">⌕</span>
            <input
              className="mkt__search"
              type="text"
              placeholder="Search crops..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="mkt__filters">
            {seasons.map(s => (
              <button
                key={s}
                className={`filter__btn ${filter === s ? 'active' : ''}`}
                onClick={() => setFilter(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CROP GRID */}
      <div className="mkt__grid-wrap">
        {filtered.length === 0 ? (
          <div className="mkt__empty">No crops found</div>
        ) : (
          <div className="mkt__grid">
            {filtered.map((c, i) => (
              <div
                className="crop__card"
                key={i}
                onClick={() => togglePop(c)}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="crop__img-wrap">
                  <img src={c.image} alt={c.name} className="crop__img" />
                  <div className="crop__badge">{c.attributes?.[2]?.value} Grade</div>
                </div>
                <div className="crop__body">
                  <div className="crop__top">
                    <h3 className="crop__name">{c.name}</h3>
                    <span className="crop__season">{c.attributes?.[1]?.value}</span>
                  </div>
                  <p className="crop__desc">{c.description}</p>
                  <div className="crop__footer">
                    <span className="crop__price">{c.attributes?.[0]?.value}</span>
                    <button className="crop__cta">View →</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toggle && (
        <Home
          crop={crop}
          provider={provider}
          account={account}
          escrow={escrow}
          togglePop={togglePop}
        />
      )}
    </div>
  );
};

export default Marketplace;
