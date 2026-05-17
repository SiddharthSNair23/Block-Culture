import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from './Navigation';
import { useAuth } from '../context/AuthContext';

const LandingPage = ({ account, connectAndLoad }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const heroRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing">
      <Navigation account={account} connectAndLoad={connectAndLoad} user={user} onLogout={logout} transparent />

      {/* HERO */}
      <section className="hero" ref={heroRef}>
        <div className="hero__bg">
          <div className="hero__grain" />
          <div className="hero__orb hero__orb--1" />
          <div className="hero__orb hero__orb--2" />
        </div>
        <div className="hero__content">
          <span className="hero__eyebrow">Blockchain-Powered Agriculture</span>
          <h1 className="hero__title">
            Farm to Chain.<br />
            <em>Trusted.</em>
          </h1>
          <p className="hero__sub">
            Buy and sell agricultural yield as NFTs — transparent pricing,
            verified quality, instant escrow settlement on-chain.
          </p>
          <div className="hero__actions">
            <button className="btn btn--primary" onClick={() => navigate('/marketplace')}>
              Browse Marketplace
            </button>
            <button className="btn btn--ghost" onClick={() => navigate('/marketplace')}>
              How it works ↓
            </button>
          </div>
        </div>
        <div className="hero__scroll">scroll</div>
      </section>

      {/* STATS */}
      <section className="stats reveal">
        <div className="stats__grid">
          {[
            { number: '6', label: 'Crops Listed' },
            { number: '100%', label: 'On-Chain Verified' },
            { number: '0%', label: 'Middlemen' },
            { number: '∞', label: 'Transparency' },
          ].map((s, i) => (
            <div className="stat" key={i}>
              <span className="stat__number">{s.number}</span>
              <span className="stat__label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how reveal">
        <div className="how__container">
          <span className="section__eyebrow">Process</span>
          <h2 className="section__title">How AgriYield Works</h2>
          <div className="how__steps">
            {[
              { num: '01', title: 'Farmer Mints NFT', desc: 'A crop yield is tokenized as an ERC-721 NFT with verified metadata — grade, season, price.' },
              { num: '02', title: 'Buyer Deposits Earnest', desc: 'Buyer locks funds in our escrow smart contract. No third-party bank needed.' },
              { num: '03', title: 'Sale Finalizes On-Chain', desc: 'Both parties approve. Contract releases funds to farmer, NFT transfers to buyer instantly.' },
            ].map((step, i) => (
              <div className="step" key={i}>
                <span className="step__num">{step.num}</span>
                <h3 className="step__title">{step.title}</h3>
                <p className="step__desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta reveal">
        <div className="cta__inner">
          <h2 className="cta__title">Ready to trade crops on-chain?</h2>
          <p className="cta__sub">Connect your wallet and browse available yield.</p>
          <button className="btn btn--primary btn--large" onClick={() => navigate('/marketplace')}>
            Go to Marketplace →
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <span>© 2025 AgriYield — Blockchain Agricultural Marketplace</span>
      </footer>
    </div>
  );
};

export default LandingPage;
