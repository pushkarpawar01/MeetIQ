import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, Plus, FileAudio, UploadCloud, X, Loader2, CheckCircle, Clock } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, done, error
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/login');

      const res = await fetch('http://localhost:5000/api/meetings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMeetings(data);
      }
    } catch (err) {
      console.error('Error fetching meetings:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!title || !file) return;

    setUploadStatus('uploading');
    setUploadProgress(10);
    const token = localStorage.getItem('token');

    try {
      // 1. Get presigned URL
      const urlRes = await fetch('http://localhost:5000/api/meetings/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          filename: file.name,
          contentType: file.type
        })
      });

      if (!urlRes.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, meetingId } = await urlRes.json();

      setUploadProgress(30);

      // 2. Upload file to S3
      const s3Res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!s3Res.ok) throw new Error('Failed to upload to S3');

      setUploadProgress(90);

      // 3. Update meeting status to PROCESSING
      await fetch(`http://localhost:5000/api/meetings/${meetingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'PROCESSING' })
      });

      setUploadProgress(100);
      setUploadStatus('done');
      
      // Refresh list after 1 second
      setTimeout(() => {
        fetchMeetings();
        closeModal();
      }, 1000);

    } catch (err) {
      console.error(err);
      setUploadStatus('error');
    }
  };

  const closeModal = () => {
    setIsUploadOpen(false);
    setTitle('');
    setFile(null);
    setUploadStatus('idle');
    setUploadProgress(0);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white selection:bg-indigo-500 selection:text-white relative">
      <nav className="border-b border-white/10 bg-white/5 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-indigo-500 to-fuchsia-500 p-1.5 rounded-lg">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">MeetIQ Dashboard</span>
            </div>
            <div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">My Meetings</h1>
          <button 
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:shadow-lg hover:shadow-indigo-500/25 text-white px-5 py-2.5 rounded-xl transition-all font-medium"
          >
            <Plus className="w-5 h-5" />
            Upload Meeting
          </button>
        </div>

        {meetings.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center backdrop-blur-sm">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-500/10 mb-6">
              <FileAudio className="w-10 h-10 text-indigo-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3">No meetings yet</h3>
            <p className="text-gray-400 mb-8 max-w-sm mx-auto leading-relaxed">
              Upload your first meeting recording to start extracting intelligence, summaries, and action items.
            </p>
            <button 
              onClick={() => setIsUploadOpen(true)}
              className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl transition-colors font-medium border border-white/5"
            >
              Upload your first meeting
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {meetings.map((meeting) => (
              <div key={meeting._id} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] transition-all flex items-center justify-between group backdrop-blur-sm">
                <div className="flex items-center gap-5">
                  <div className="bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20">
                    <FileAudio className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1 group-hover:text-indigo-300 transition-colors">{meeting.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1.5"><Clock className="w-4 h-4"/> {new Date(meeting.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      <span className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${
                          meeting.status === 'COMPLETED' ? 'bg-emerald-400' :
                          meeting.status === 'FAILED' ? 'bg-rose-400' : 'bg-fuchsia-400 animate-pulse'
                        }`}></div>
                        Status: {meeting.status}
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => navigate(`/meeting/${meeting._id}`)}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  View Meeting
                </button>
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
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
                    placeholder="Project Discussion"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Audio/Video Recording</label>
                  <div 
                    onClick={() => uploadStatus === 'idle' || uploadStatus === 'error' ? fileInputRef.current?.click() : null}
                    className={`border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500/50 hover:bg-white/5 transition-all ${
                      (uploadStatus !== 'idle' && uploadStatus !== 'error') ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept="audio/*,video/*"
                    />
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
                  An error occurred during upload. Please try again.
                </div>
              )}

              {uploadStatus === 'uploading' && (
                <div className="mt-6">
                  <div className="flex justify-between text-xs text-indigo-300 mb-2">
                    <span>Uploading to secure vault...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {uploadStatus === 'done' && (
                <div className="mt-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm font-medium">Upload successful! Processing started.</p>
                </div>
              )}

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={uploadStatus === 'uploading'}
                  className="flex-1 py-3 px-4 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title || !file || uploadStatus === 'uploading' || uploadStatus === 'done'}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:shadow-lg hover:shadow-indigo-500/25 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {uploadStatus === 'uploading' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Uploading</>
                  ) : 'Upload'}
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
