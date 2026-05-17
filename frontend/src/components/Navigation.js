import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.svg';

const Navigation = ({ account, connectAndLoad, transparent, user, onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (onLogout) await onLogout();
    navigate('/login');
  };

  return (
    <nav className={transparent ? 'nav--transparent' : ''}>
      <ul className="nav__links">
        <li><span className="nav__link" onClick={() => navigate('/')}>Home</span></li>
        {user?.role === 'vendor'
          ? <li><span className="nav__link" onClick={() => navigate('/vendor')}>Dashboard</span></li>
          : <li><span className="nav__link" onClick={() => navigate('/marketplace')}>Marketplace</span></li>
        }
        <li><span className="nav__link" onClick={() => navigate('/supply-chain')}>Supply Chain</span></li>
      </ul>

      <div className="nav__brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        <img src={logo} alt="logo" />
        <h1>AgriYield</h1>
      </div>

      <div className="nav__right">
        {user ? (
          <div className="nav__user">
            <span className="nav__role-badge">{user.role === 'vendor' ? '🌾' : '🛒'} {user.username}</span>
            <button className="nav__connect nav__logout" onClick={handleLogout}>Logout</button>
          </div>
        ) : (
          <button className="nav__connect" onClick={() => navigate('/login')}>Login</button>
        )}
        {account && (
          <span className="nav__wallet">{account.slice(0, 6)}...{account.slice(38, 42)}</span>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
