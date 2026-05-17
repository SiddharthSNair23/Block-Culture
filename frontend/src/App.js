import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import VendorDashboard from './components/VendorDashboard';
import CustomerMarketplace from './components/CustomerMarketplace';
import SupplyChain from './components/SupplyChain';

import AgriYield from './abis/AgriYield.json';
import Escrow from './abis/Escrow.json';
import config from './config.json';

function AppRoutes() {
  const { user, loading } = useAuth();
  const [provider, setProvider] = useState(null);
  const [escrow, setEscrow] = useState(null);
  const [agriYield, setAgriYield] = useState(null);
  const [account, setAccount] = useState(null);
  const [crops, setCrops] = useState([]);

  const loadBlockchainData = async () => {
    if (!window.ethereum) return;
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(provider);
      const network = await provider.getNetwork();
      const chainConfig = config[network.chainId];
      if (!chainConfig) return;

      const ay = new ethers.Contract(chainConfig.agriYield.address, AgriYield, provider);
      setAgriYield(ay);

      const totalSupply = await ay.totalSupply();
      const crops = [];
      for (let i = 1; i <= totalSupply; i++) {
        try {
          const uri = await ay.tokenURI(i);
          const res = await fetch(uri);
          const meta = await res.json();
          // Ensure the crop has its token id
          crops.push({ ...meta, tokenId: i });
        } catch (e) { /* skip broken tokens */ }
      }
      setCrops(crops);

      const esc = new ethers.Contract(chainConfig.escrow.address, Escrow, provider);
      setEscrow(esc);
    } catch (e) {
      console.error('Blockchain load error:', e);
    }
  };

  const connectAndLoad = async () => {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    setAccount(ethers.utils.getAddress(accounts[0]));
    await loadBlockchainData();
  };

  useEffect(() => {
    if (!window.ethereum) return;
    // Auto-connect if already connected
    window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
      if (accounts.length > 0) {
        setAccount(ethers.utils.getAddress(accounts[0]));
        loadBlockchainData();
      }
    });
    window.ethereum.on('accountsChanged', accounts => {
      if (accounts.length > 0) {
        setAccount(ethers.utils.getAddress(accounts[0]));
        loadBlockchainData();
      } else {
        setAccount(null);
        setCrops([]);
      }
    });
    window.ethereum.on('chainChanged', loadBlockchainData);
  }, []);

  // Show spinner only while checking session — don't block navigation
  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="sc__spinner" />
    </div>
  );

  const blockchainProps = { provider, escrow, agriYield, crops, account, connectAndLoad, reloadCrops: loadBlockchainData };

  return (
    <Routes>
      {/* Public routes — always accessible */}
      <Route path="/" element={<LandingPage account={account} connectAndLoad={connectAndLoad} />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/marketplace" element={<CustomerMarketplace {...blockchainProps} />} />
      <Route path="/supply-chain" element={<SupplyChain {...blockchainProps} />} />

      {/* Protected vendor route */}
      <Route
        path="/vendor"
        element={
          !user
            ? <Navigate to="/login" replace />
            : user.role !== 'vendor'
            ? <Navigate to="/marketplace" replace />
            : <VendorDashboard {...blockchainProps} />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
