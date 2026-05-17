import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthPage = () => {
  const { user, login, signup } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('customer');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, show option to go to their dashboard instead of forcing redirect
  if (user) {
    return (
      <div className="auth__page">
        <div className="auth__card">
          <div className="auth__brand">
            <h1>AgriYield</h1>
            <p>You are already logged in as <strong>{user.username}</strong></p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
            <button className="btn btn--primary" style={{ width: '100%' }}
              onClick={() => navigate(user.role === 'vendor' ? '/vendor' : '/marketplace')}>
              Go to {user.role === 'vendor' ? 'Dashboard' : 'Marketplace'}
            </button>
            <button className="btn btn--ghost" style={{ width: '100%', color: 'var(--clr-soil)', border: '1.5px solid rgba(0,0,0,0.15)' }}
              onClick={() => navigate('/')}>
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let u;
      if (mode === 'login') {
        u = await login(form.username, form.password);
      } else {
        u = await signup(form.username, form.email, form.password, role);
      }
      navigate(u.role === 'vendor' ? '/vendor' : '/marketplace');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="auth__page">
      <div className="auth__card">
        {/* Back to home */}
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', color: 'var(--clr-grey)', fontSize: '0.85rem', cursor: 'pointer', padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          ← Back to home
        </button>

        <div className="auth__brand">
          <h1>AgriYield</h1>
          <p>Blockchain Agricultural Marketplace</p>
        </div>

        {mode === 'signup' && (
          <div className="auth__roles">
            <button className={`role__btn ${role === 'customer' ? 'active' : ''}`} onClick={() => setRole('customer')} type="button">
              🛒 Customer
              <span>Browse &amp; buy crops</span>
            </button>
            <button className={`role__btn ${role === 'vendor' ? 'active' : ''}`} onClick={() => setRole('vendor')} type="button">
              🌾 Vendor
              <span>List &amp; sell crops</span>
            </button>
          </div>
        )}

        <form className="auth__form" onSubmit={handleSubmit}>
          <div className="field">
            <label>Username</label>
            <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="Enter username" required />
          </div>
          {mode === 'signup' && (
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Enter email" required />
            </div>
          )}
          <div className="field">
            <label>Password</label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Enter password" required />
          </div>
          {error && <div className="auth__error">{error}</div>}
          <button className="btn btn--primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>

        <p className="auth__switch">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <span onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>
            {mode === 'login' ? 'Sign up' : 'Login'}
          </span>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
