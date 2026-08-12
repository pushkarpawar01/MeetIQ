import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import MeetingDetails from './pages/MeetingDetails';
import ProfilePage from './pages/ProfilePage';
import History from './pages/History';
import Sidebar from './components/Sidebar';

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  const isAuthenticated = !!token;

  return (
    <Router>
      {isAuthenticated && <Sidebar onLogout={logout} />}
      <div className={isAuthenticated ? "ml-64 min-h-screen bg-[#0B0F19] p-6 text-white" : "min-h-screen bg-[#0B0F19] text-white"}>
        <Routes>
          <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
          <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage setToken={setToken} />} />
          <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage setToken={setToken} />} />
          <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />} />
          <Route path="/history" element={isAuthenticated ? <History /> : <Navigate to="/login" replace />} />
          <Route path="/meeting/:id" element={isAuthenticated ? <MeetingDetails /> : <Navigate to="/login" replace />} />
          <Route path="/profile" element={isAuthenticated ? <ProfilePage /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
