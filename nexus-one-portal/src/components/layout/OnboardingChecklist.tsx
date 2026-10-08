import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Circle, Sparkles } from 'lucide-react';
import { Card } from '../common/Card';

const items = [
  { id: 'profile', title: 'Complete your profile', detail: 'Add a bio and skills so teammates can find you.', route: 'profile' },
  { id: 'directory', title: 'Meet your colleagues', detail: 'Explore the company directory and your team.', route: 'directory' },
  { id: 'preferences', title: 'Set up your workspace', detail: 'Choose your theme and notification preferences.', route: 'settings' },
  { id: 'support', title: 'Find help when you need it', detail: 'See support contacts and common answers.', route: 'support' },
];

const readCompleted = (userId: string): string[] => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(`nexus_one_onboarding_v1:${userId}`) || '[]');
    return Array.isArray(value) && value.every(id => typeof id === 'string') ? value : [];
  } catch {
    return [];
  }
};

export const OnboardingChecklist: React.FC<{ userId: string; onNavigate: (route: string) => void }> = ({ userId, onNavigate }) => {
  const [completed, setCompleted] = useState(() => readCompleted(userId));
  const progress = completed.filter(id => items.some(item => item.id === id)).length;

  const toggle = (id: string) => {
    const next = completed.includes(id) ? completed.filter(item => item !== id) : [...completed, id];
    setCompleted(next);
    try { localStorage.setItem(`nexus_one_onboarding_v1:${userId}`, JSON.stringify(next)); } catch { /* Keep checklist usable for this session. */ }
  };

  return (
    <Card variant="blue" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#4F7CFF]/15 text-[#8EB0FF]"><Sparkles size={19} /></span>
          <div>
            <h3 className="text-base font-bold text-white">Your first-week checklist</h3>
            <p className="mt-1 text-sm text-slate-400">A few useful places to start in your company workspace.</p>
          </div>
        </div>
        <span className="rounded-full border border-[#4F7CFF]/30 bg-[#4F7CFF]/10 px-3 py-1 text-xs font-semibold text-blue-200" aria-live="polite">{progress} of {items.length} complete</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map(item => {
          const isDone = completed.includes(item.id);
          return (
            <div key={item.id} className="flex min-w-0 items-start gap-3 rounded-xl border border-[#22375F]/80 bg-[#0B1020]/50 p-3">
              <button type="button" className="mt-0.5 shrink-0 rounded-full text-[#8EB0FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F7CFF]" aria-label={`${isDone ? 'Mark incomplete' : 'Mark complete'}: ${item.title}`} aria-pressed={isDone} onClick={() => toggle(item.id)}>
                {isDone ? <CheckCircle2 size={19} /> : <Circle size={19} />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${isDone ? 'text-slate-400 line-through' : 'text-white'}`}>{item.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{item.detail}</p>
              </div>
              <button type="button" className="shrink-0 rounded-md p-1 text-slate-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F7CFF]" aria-label={`Open ${item.title}`} onClick={() => onNavigate(item.route)}><ArrowRight size={16} /></button>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
