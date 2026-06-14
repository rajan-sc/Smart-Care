import React from 'react';
import { useNavigate, Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FDFDFC] flex flex-col items-center justify-center p-4 selection:bg-[#CFE7D3] selection:text-[#0F3E17]">
      <div className="w-full max-w-5xl animate-fade-in text-center flex flex-col items-center">
        
        <h1 className="text-[60px] sm:text-[90px] md:text-[120px] leading-[0.95] tracking-tight font-display mb-ease-28">
          <span className="text-[#0F3E17]">404 </span>
          <span className="text-[#6F8A74]">Not Found.</span>
        </h1>
        
        <p className="text-[18px] sm:text-[24px] text-[#222222] max-w-4xl mx-auto mb-ease-42 leading-[1.4] font-normal">
          The page you are looking for doesn't exist, has been moved, or is temporarily unavailable. Let's get you back to safety.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-ease-14 w-full sm:w-auto">
          <button 
            onClick={() => navigate(-1)}
            className="px-8 py-3.5 rounded-full bg-[#0F3E17] text-white font-medium hover:bg-[#0F3E17]/90 transition-colors w-full sm:w-auto text-[17px]"
          >
            Go back
          </button>
          <Link 
            to="/"
            className="px-8 py-3.5 rounded-full border border-[#E5E7EB] hover:border-[#0F3E17]/30 bg-transparent text-[#0F3E17] font-bold uppercase tracking-[0.1em] text-[13px] transition-colors w-full sm:w-auto flex items-center justify-center"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
};
