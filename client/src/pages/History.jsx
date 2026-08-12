import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileAudio, Loader2, Clock, Trash2 } from 'lucide-react';

const History = () => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMeetings = async () => {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/login');
      try {
        const res = await fetch('/api/meetings', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) setMeetings(await res.json());
      } catch (e) {
        console.error('Error loading history', e);
      } finally {
        setLoading(false);
      }
    };
    fetchMeetings();
  }, []);

  const handleDeleteMeeting = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this meeting?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/meetings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMeetings(prev => prev.filter(m => m._id !== id));
      }
    } catch (err) {
      console.error('Error deleting meeting:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0B0F19] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white p-2">
      <h1 className="text-3xl font-bold mb-6">Meeting History</h1>
      {meetings.length === 0 ? (
        <p className="text-gray-400">No meetings recorded yet.</p>
      ) : (
        <div className="grid gap-4">
          {meetings.map((meeting) => (
            <div
              key={meeting._id}
              className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <FileAudio className="w-6 h-6 text-indigo-400" />
                <div>
                  <h2 className="text-lg font-medium text-white">{meeting.title}</h2>
                  <p className="text-sm text-gray-400">
                    {new Date(meeting.date).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/meeting/${meeting._id}`)}
                  className="bg-indigo-500/20 text-indigo-300 px-4 py-2 rounded-lg hover:bg-indigo-500/30 transition-colors"
                >
                  View
                </button>
                <button
                  onClick={(e) => handleDeleteMeeting(meeting._id, e)}
                  className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors border border-rose-500/20"
                  title="Delete meeting"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
