import React from 'react';
import { ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="fixed bottom-0 right-0 left-0 lg:left-64 bg-slate-800 text-white py-3 px-4 md:px-6 z-30">
      <div className="flex items-center justify-center">
        <span className="text-xs md:text-sm">Powered by</span>
        <a
          href="https://www.botivate.in"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2 flex items-center space-x-1 text-blue-400 hover:text-blue-300 transition-colors duration-200"
        >
          <span className="font-medium text-xs md:text-sm">Botivate</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </footer>
  );
};