import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import MeetingDetails from './pages/MeetingDetails';
import ProfilePage from './pages/ProfilePage';
import History from './pages/History';
import LandingPage from './pages/LandingPage';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  const isAuthenticated = !!token;

  return (
    <Router>
      {isAuthenticated && (
        <Sidebar
          onLogout={logout}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}
      <div className={isAuthenticated ? "md:ml-64 min-h-screen flex flex-col bg-[#0B0F19] text-white" : "min-h-screen flex flex-col bg-[#0B0F19] text-white"}>
        {/* Mobile top bar — only shown when authenticated */}
        {isAuthenticated && (
          <div className="md:hidden flex items-center gap-3 p-4 mb-2">
            <button
              id="sidebar-toggle"
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-lg font-bold tracking-tight text-white">MeetIQ</span>
          </div>
        )}
        
        {/* Main Content Area */}
        <div className={`flex-1 ${isAuthenticated ? 'p-4 md:p-6' : ''}`}>
          <Routes>
            <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
            <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage setToken={setToken} />} />
            <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage setToken={setToken} />} />
            <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />} />
            <Route path="/history" element={isAuthenticated ? <History /> : <Navigate to="/login" replace />} />
            <Route path="/meeting/:id" element={isAuthenticated ? <MeetingDetails /> : <Navigate to="/login" replace />} />
            <Route path="/profile" element={isAuthenticated ? <ProfilePage /> : <Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />} />
          </Routes>
        </div>
        
        {/* Global Footer */}
        <Footer />
      </div>
    </Router>
  );
}

export default App;

