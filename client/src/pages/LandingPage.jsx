import { Link } from 'react-router-dom';
import { Bot, Mic, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-white overflow-hidden selection:bg-indigo-500 selection:text-white flex flex-col">
      {/* Background gradients */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px]"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-fuchsia-600/20 rounded-full blur-[128px]"></div>
      </div>

      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-indigo-500 to-fuchsia-500 p-2 rounded-xl">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">MeetIQ</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
            Log In
          </Link>
          <Link to="/register" className="text-sm font-medium bg-white text-black px-5 py-2 rounded-full hover:bg-gray-100 transition-colors shadow-lg shadow-white/10">
            Get Started
          </Link>
        </div>
      </nav>

      <main className="relative z-10 flex-1 max-w-7xl mx-auto px-6 pt-24 pb-32 w-full">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-fuchsia-400" />
            <span className="text-sm font-medium text-gray-300">Powered by Amazon Bedrock</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
            Meetings that <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-rose-400">
              actually matter.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Upload your meeting recordings. We'll transcribe, analyze, and extract decisions, action items, and summaries instantly using advanced AI.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white px-8 py-4 rounded-full font-semibold hover:shadow-lg hover:shadow-indigo-500/25 transition-all transform hover:-translate-y-0.5">
              Start for free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="mt-32 grid md:grid-cols-3 gap-8">
          {[
            {
              icon: <Mic className="w-6 h-6 text-indigo-400" />,
              title: "Smart Transcription",
              desc: "Accurate speech-to-text with automatic language detection using AssemblyAI."
            },
            {
              icon: <Bot className="w-6 h-6 text-fuchsia-400" />,
              title: "AI Analysis",
              desc: "Get intelligent summaries, key decisions, and identified risks powered by Amazon Bedrock."
            },
            {
              icon: <CheckCircle2 className="w-6 h-6 text-rose-400" />,
              title: "Action Item Tracking",
              desc: "Never miss a task. Automatically extract action items and track their progress."
            }
          ].map((feature, i) => (
            <div key={i} className="bg-white/5 border border-white/10 p-8 rounded-2xl backdrop-blur-sm hover:bg-white/[0.07] transition-colors">
              <div className="bg-white/10 w-12 h-12 flex items-center justify-center rounded-xl mb-6">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>


    </div>
  );
};

export default LandingPage;

