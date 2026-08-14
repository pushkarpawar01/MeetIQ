import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle2, Circle, AlertTriangle, HelpCircle, FileText, LayoutDashboard, Trash2, MessageSquare, Send } from 'lucide-react';
import { fetchWithAuth } from '../utils/api';

const MeetingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [actionItems, setActionItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isChatting, setIsChatting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this meeting?')) return;
    try {
      const res = await fetchWithAuth(`/api/meetings/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Error deleting meeting:', err);
    }
  };

  useEffect(() => {
    fetchMeetingData();
  }, [id]);

  const fetchMeetingData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return navigate('/login');

      // Fetch meeting
      const meetRes = await fetchWithAuth(`/api/meetings/${id}`);
      
      if (!meetRes.ok) throw new Error('Failed to fetch meeting');
      const meetData = await meetRes.json();
      setMeeting(meetData);

      // Fetch action items
      const actionRes = await fetchWithAuth(`/api/action-items/meeting/${id}`);
      
      if (actionRes.ok) {
        const actionData = await actionRes.json();
        setActionItems(actionData);
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleActionStatus = async (item) => {
    try {
      const newStatus = item.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
      
      const res = await fetchWithAuth(`/api/action-items/${item._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        setActionItems(items => items.map(i => i._id === item._id ? { ...i, status: newStatus } : i));
      }
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const handleChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatting(true);

    try {
      const res = await fetchWithAuth(`/api/meetings/${id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMsg })
      });
      
      const data = await res.json();
      if (res.ok) {
        setChatHistory(prev => [...prev, { role: 'ai', content: data.answer }]);
      } else {
        setChatHistory(prev => [...prev, { role: 'ai', content: `Error: ${data.message}` }]);
      }
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'ai', content: 'Failed to connect to chat service.' }]);
    } finally {
      setIsChatting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center text-white"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  }

  if (error || !meeting) {
    return <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center text-white text-rose-400">Error: {error || 'Meeting not found'}</div>;
  }

  const isProcessing = ['UPLOADING', 'PROCESSING', 'TRANSCRIBING', 'SUMMARIZING'].includes(meeting.status);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white selection:bg-indigo-500 selection:text-white pb-20">
      <nav className="border-b border-white/10 bg-white/5 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center gap-4">
            <Link to="/dashboard" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-10 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold mb-3">{meeting.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>{new Date(meeting.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-white text-xs font-medium border border-white/10">
                <div className={`w-2 h-2 rounded-full ${
                  meeting.status === 'COMPLETED' ? 'bg-emerald-400' :
                  meeting.status === 'FAILED' ? 'bg-rose-400' : 'bg-fuchsia-400 animate-pulse'
                }`}></div>
                {meeting.status}
              </span>
            </div>
          </div>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-sm font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>

        {isProcessing ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center backdrop-blur-sm">
            <Loader2 className="w-12 h-12 animate-spin text-fuchsia-500 mx-auto mb-6" />
            <h3 className="text-xl font-semibold mb-3">AI is analyzing your meeting</h3>
            <p className="text-gray-400 max-w-sm mx-auto leading-relaxed">
              We are transcribing the audio and using AI to extract summaries, decisions, and action items. This usually takes a few minutes.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Summary Section */}
            {meeting.summary && (
              <section className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="w-6 h-6 text-indigo-400" />
                  <h2 className="text-xl font-bold">Executive Summary</h2>
                </div>
                <p className="text-gray-300 leading-relaxed text-lg">
                  {meeting.summary}
                </p>
              </section>
            )}

            <div className="grid md:grid-cols-2 gap-8">
              {/* Key Points */}
              {meeting.keyPoints?.length > 0 && (
                <section className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Decisions & Key Points
                  </h2>
                  <ul className="space-y-3">
                    {meeting.keyPoints.map((kp, i) => (
                      <li key={i} className="flex gap-3 text-gray-300 text-sm">
                        <span className="text-indigo-400 mt-0.5">•</span>
                        <span>{kp}</span>
                      </li>
                    ))}
                    {meeting.decisions?.map((dec, i) => (
                      <li key={`dec-${i}`} className="flex gap-3 text-gray-300 text-sm font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{dec}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Risks & Questions */}
              {(meeting.risks?.length > 0 || meeting.unresolvedQuestions?.length > 0) && (
                <section className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400" /> Risks & Questions
                  </h2>
                  <ul className="space-y-3">
                    {meeting.risks?.map((risk, i) => (
                      <li key={`risk-${i}`} className="flex gap-3 text-gray-300 text-sm">
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <span>{risk}</span>
                      </li>
                    ))}
                    {meeting.unresolvedQuestions?.map((q, i) => (
                      <li key={`q-${i}`} className="flex gap-3 text-gray-300 text-sm">
                        <HelpCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            {/* Action Items */}
            {actionItems.length > 0 && (
              <section className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Action Items</h2>
                  <span className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-medium">
                    {actionItems.filter(i => i.status === 'COMPLETED').length} / {actionItems.length} Completed
                  </span>
                </div>
                <div className="space-y-3">
                  {actionItems.map((item) => (
                    <div 
                      key={item._id} 
                      className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                        item.status === 'COMPLETED' 
                          ? 'bg-emerald-500/10 border-emerald-500/20' 
                          : 'bg-white/5 border-white/10 hover:border-indigo-500/50'
                      }`}
                      onClick={() => toggleActionStatus(item)}
                    >
                      <button className="mt-1 flex-shrink-0">
                        {item.status === 'COMPLETED' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      <div className="flex-1">
                        <p className={`font-medium ${item.status === 'COMPLETED' ? 'text-gray-400 line-through' : 'text-white'}`}>
                          {item.task}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          {item.assignedTo && (
                            <span className="text-gray-400">Assigned: <strong className="text-gray-300">{item.assignedTo}</strong></span>
                          )}
                          {item.deadline && (
                            <span className="text-gray-400">Due: <strong className="text-gray-300">{item.deadline}</strong></span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.priority === 'High' ? 'bg-rose-500/20 text-rose-400' :
                            item.priority === 'Medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {item.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Feature 1: Chat with Meeting */}
            {meeting.transcriptText && (
              <section className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-6">
                  <MessageSquare className="w-6 h-6 text-fuchsia-400" />
                  <h2 className="text-xl font-bold">Chat with this Meeting</h2>
                </div>
                
                <div className="bg-[#0B0F19] rounded-xl border border-white/10 p-4 mb-4 h-64 overflow-y-auto space-y-4">
                  {chatHistory.length === 0 ? (
                    <div className="text-center text-gray-500 mt-10">
                      Ask a question about this meeting (e.g., "What was the budget decision?")
                    </div>
                  ) : (
                    chatHistory.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-xl text-sm ${
                          msg.role === 'user' 
                            ? 'bg-indigo-500/20 text-indigo-100 border border-indigo-500/30' 
                            : 'bg-white/10 text-gray-200 border border-white/10'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))
                  )}
                  {isChatting && (
                    <div className="flex justify-start">
                      <div className="bg-white/10 border border-white/10 text-gray-400 p-3 rounded-xl text-sm flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> AI is thinking...
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={handleChat} className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask anything about the transcript..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    disabled={isChatting}
                  />
                  <button 
                    type="submit" 
                    disabled={isChatting || !chatInput.trim()}
                    className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white p-3 rounded-xl transition-colors flex items-center justify-center"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </section>
            )}

          </div>
        )}
      </main>
    </div>
  );
};

export default MeetingDetails;
