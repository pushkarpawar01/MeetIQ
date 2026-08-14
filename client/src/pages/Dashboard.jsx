import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, Plus, FileAudio, UploadCloud, X, Loader2, CheckCircle, Clock, Search, Trash2 } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const fileInputRef = useRef(null);
  const searchTimeout = useRef(null);
  const pollInterval = useRef(null);

  useEffect(() => {
    fetchMeetings();
    return () => clearInterval(pollInterval.current); // cleanup on unmount
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchQuery === '') return;
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch(searchQuery);
      } else {
        fetchMeetings();
      }
    }, 400);
    return () => clearTimeout(searchTimeout.current);
  }, [searchQuery]);

  const fetchMeetings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/login');
      const res = await fetch('/api/meetings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMeetings(data);

        // Auto-poll while any meeting is still processing
        const hasProcessing = data.some(
          m => m.status !== 'COMPLETED' && m.status !== 'FAILED'
        );

        if (hasProcessing) {
          // Start polling every 5 seconds if not already polling
          if (!pollInterval.current) {
            pollInterval.current = setInterval(() => fetchMeetings(), 5000);
          }
        } else {
          // All done — stop polling
          clearInterval(pollInterval.current);
          pollInterval.current = null;
        }
      }
    } catch (err) {
      console.error('Error fetching meetings:', err);
    }
  };

  const handleSearch = async (q) => {
    setIsSearching(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/meetings/search?query=${encodeURIComponent(q)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setMeetings(await res.json());
    } catch (err) {
      console.error('Error searching:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!title || !file) return;
    setUploadStatus('uploading');
    setUploadProgress(10);
    const token = localStorage.getItem('token');
    try {
      const urlRes = await fetch('/api/meetings/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title, filename: file.name, contentType: file.type })
      });
      if (!urlRes.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, meetingId } = await urlRes.json();
      setUploadProgress(30);

      const s3Res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!s3Res.ok) throw new Error('Failed to upload to S3');
      setUploadProgress(90);

      await fetch(`/api/meetings/${meetingId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: 'PROCESSING' })
      });
      setUploadProgress(100);
      setUploadStatus('done');
      setTimeout(() => { fetchMeetings(); closeModal(); }, 1200);
    } catch (err) {
      console.error(err);
      setUploadStatus('error');
    }
  };

  const handleDeleteMeeting = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this meeting?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/meetings/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setMeetings(prev => prev.filter(m => m._id !== id));
      }
    } catch (err) {
      console.error('Error deleting meeting:', err);
    }
  };

  const closeModal = () => {
    setIsUploadOpen(false);
    setTitle('');
    setFile(null);
    setUploadStatus('idle');
    setUploadProgress(0);
  };

  const statusColors = {
    COMPLETED: 'bg-emerald-400',
    FAILED: 'bg-rose-400',
    default: 'bg-fuchsia-400 animate-pulse'
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white selection:bg-indigo-500 selection:text-white relative">
      <main className="max-w-7xl mx-auto py-2">
        {/* Header + Search + Upload */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">My Meetings</h1>
            <p className="text-sm text-gray-400 mt-1">{meetings.length} meeting{meetings.length !== 1 ? 's' : ''} {searchQuery ? 'found' : 'total'}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 animate-spin" />}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search meetings, summaries..."
                className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder-gray-500"
              />
            </div>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:shadow-lg hover:shadow-indigo-500/25 text-white px-4 py-2.5 rounded-xl transition-all font-medium text-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Upload Meeting
            </button>
          </div>
        </div>

        {/* Meetings List */}
        {meetings.length === 0 ? (
          <div className="bg-white/5 rounded-2xl p-16 text-center backdrop-blur-sm">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-500/10 mb-6">
              <FileAudio className="w-10 h-10 text-indigo-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3">
              {searchQuery ? `No results for "${searchQuery}"` : 'No meetings yet'}
            </h3>
            <p className="text-gray-400 mb-8 max-w-sm mx-auto leading-relaxed">
              {searchQuery
                ? 'Try a different search term or clear the search.'
                : 'Upload your first meeting recording to start extracting intelligence, summaries, and action items.'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsUploadOpen(true)}
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl transition-colors font-medium border border-white/5"
              >
                Upload your first meeting
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {meetings.map((meeting) => (
              <div key={meeting._id} className="bg-white/5 rounded-2xl p-6 hover:bg-white/[0.07] transition-all flex items-center justify-between group backdrop-blur-sm">
                <div className="flex items-center gap-5">
                  <div className="bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20 flex-shrink-0">
                    <FileAudio className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1 group-hover:text-indigo-300 transition-colors">{meeting.title}</h3>
                    {meeting.summary && (
                      <p className="text-sm text-gray-500 mb-1.5 line-clamp-1 max-w-xl">{meeting.summary}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(meeting.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${statusColors[meeting.status] || statusColors.default}`}></div>
                        {meeting.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => navigate(`/meeting/${meeting._id}`)}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  >
                    View
                  </button>
                  <button
                    onClick={(e) => handleDeleteMeeting(meeting._id, e)}
                    className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-colors border border-rose-500/20"
                    title="Delete meeting"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={uploadStatus === 'uploading' ? null : closeModal}></div>
          <div className="relative bg-[#111827] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <h2 className="text-xl font-bold">Upload New Meeting</h2>
              <button onClick={closeModal} disabled={uploadStatus === 'uploading'} className="text-gray-400 hover:text-white transition-colors disabled:opacity-50">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleUpload} className="p-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Meeting Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={uploadStatus !== 'idle' && uploadStatus !== 'error'}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
                    placeholder="e.g. Project Kickoff Meeting"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Audio/Video Recording</label>
                  <div
                    onClick={() => (uploadStatus === 'idle' || uploadStatus === 'error') ? fileInputRef.current?.click() : null}
                    className={`border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500/50 hover:bg-white/5 transition-all ${(uploadStatus !== 'idle' && uploadStatus !== 'error') ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="audio/*,video/*" />
                    <UploadCloud className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    {file ? (
                      <div>
                        <p className="text-sm font-medium text-indigo-400">{file.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium text-gray-300">Click to choose a file</p>
                        <p className="text-xs text-gray-500 mt-1">MP3, MP4, WAV supported</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {uploadStatus === 'error' && (
                <div className="mt-4 text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-center">
                  Upload failed. Please try again.
                </div>
              )}

              {uploadStatus === 'uploading' && (
                <div className="mt-6">
                  <div className="flex justify-between text-xs text-indigo-300 mb-2">
                    <span>Uploading to secure vault...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2">
                    <div className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 h-2 rounded-full transition-all duration-500" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              )}

              {uploadStatus === 'done' && (
                <div className="mt-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm font-medium">Upload successful! AI processing started.</p>
                </div>
              )}

              <div className="mt-8 flex gap-3">
                <button type="button" onClick={closeModal} disabled={uploadStatus === 'uploading'} className="flex-1 py-3 px-4 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/5 transition-colors disabled:opacity-50">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title || !file || uploadStatus === 'uploading' || uploadStatus === 'done'}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 hover:shadow-lg hover:shadow-indigo-500/25"
                >
                  {uploadStatus === 'uploading' ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading</> : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
