import { Bot } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="w-full mt-auto border-t border-white/10 bg-black/20 backdrop-blur-sm z-10 relative">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Branding */}
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-500 to-fuchsia-500 p-2 rounded-xl">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-base font-bold tracking-tight text-white">MeetIQ</p>
              <p className="text-xs text-gray-500">AI-powered meeting intelligence</p>
            </div>
          </div>

          {/* Copyright - Socials removed as requested */}
          <div className="flex flex-col items-center md:items-end gap-3">
            <p className="text-xs text-gray-600">© {new Date().getFullYear()} MeetIQ. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
