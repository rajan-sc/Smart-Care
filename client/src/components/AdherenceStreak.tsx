import React, { Suspense } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { patientApi } from '../services/portal.api';

interface AdherenceStreakProps {
  range?: 7 | 30;
  className?: string;
}

const AdherenceStreakContent: React.FC<AdherenceStreakProps> = ({ range = 7, className = '' }) => {
  const { data } = useSuspenseQuery({
    queryKey: ['adherence-streak', range],
    queryFn: () => patientApi.getAdherence(range).then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const { currentStreak = 0, maxStreak = 0, ratio = 0 } = data || {};
  const percentage = Math.round(ratio);

  return (
    <div className={`card bg-[#d6dfd3] border border-hairline-gray p-8 relative overflow-hidden group hover:border-forest-ink transition-colors duration-500 ${className}`}>
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-7 h-7 text-orange-500 drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            <h3 className="text-2xl font-display font-semibold tracking-tight text-true-black">Medication Streak</h3>
          </div>
          <p className="text-charcoal text-base mb-6 max-w-sm leading-relaxed">
            You're doing great! Keep taking your medications on time to maintain your streak.
          </p>
          
          <div className="flex items-end gap-2">
            <div className="text-6xl font-display font-bold tracking-tighter leading-none text-forest-ink">{currentStreak}</div>
            <div className="text-charcoal font-bold pb-1.5 uppercase tracking-widest text-sm">days</div>
          </div>
        </div>
        
        <div className="w-full md:w-auto flex flex-row md:flex-col items-center gap-6 md:gap-4 bg-mist-blue/30 rounded-2xl p-6 border border-hairline-gray animate-fade-in animate-delay-150">
          <div className="text-center w-full">
            <div className="text-xs text-charcoal font-bold uppercase tracking-widest mb-1 opacity-80">Adherence Rate</div>
            <div className="text-3xl font-bold tracking-tight text-forest-ink">{percentage}%</div>
          </div>
          
          <div className="hidden md:block w-full h-px bg-hairline-gray"></div>
          
          <div className="text-center w-full">
            <div className="text-xs text-charcoal font-bold uppercase tracking-widest mb-1 opacity-80">Best Streak</div>
            <div className="text-xl font-semibold text-true-black">{maxStreak} days</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdherenceStreak: React.FC<AdherenceStreakProps> = (props) => {
  return (
    <Suspense fallback={<div className={`skeleton h-48 rounded-2xl w-full ${props.className}`} />}>
      <AdherenceStreakContent {...props} />
    </Suspense>
  );
};
