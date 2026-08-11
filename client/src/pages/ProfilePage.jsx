import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, User, Mail, Save, Loader2 } from 'lucide-react';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [profileForm, setProfileForm] = useState({ name: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccess('');
    setError('');
    try {
      // TODO: Connect to API endpoint
      await new Promise(r => setTimeout(r, 800));
      setSuccess('Profile updated successfully!');
    } catch {
      setError('Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return setError('New passwords do not match.');
    }
    setIsLoading(true);
    setSuccess('');
    setError('');
    try {
      await new Promise(r => setTimeout(r, 800));
      setSuccess('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch {
      setError('Failed to change password.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm placeholder-gray-500";

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white selection:bg-indigo-500 selection:text-white">
      <nav className="border-b border-white/10 bg-white/5 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center gap-4">
          <Link to="/dashboard" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-extrabold mb-2">Account Settings</h1>
        <p className="text-gray-400 mb-8">Manage your profile and security preferences.</p>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-8 border border-white/10">
          {[
            { id: 'profile', label: 'Profile', Icon: User },
            { id: 'password', label: 'Security', Icon: Lock },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setSuccess(''); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === id
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          {success && (
            <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl text-sm text-center">{success}</div>
          )}
          {error && (
            <div className="mb-6 bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl text-sm text-center">{error}</div>
          )}

          {activeTab === 'profile' && (
            <form onSubmit={handleProfileUpdate} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ name: e.target.value })}
                    className={`${inputClass} pl-10`}
                    placeholder="Your full name"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="email" disabled className={`${inputClass} pl-10 opacity-50 cursor-not-allowed`} placeholder="Cannot change email" />
                </div>
              </div>
              <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handlePasswordChange} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Current Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                  className={inputClass}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                  className={inputClass}
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                  className={inputClass}
                  placeholder="••••••••"
                  required
                />
              </div>
              <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Update Password
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
