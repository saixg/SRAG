import React, { useEffect, useState } from 'react';
import { Bot, X, Send, ArrowRight, LifeBuoy } from 'lucide-react';

const helpItems = [
  { words: ['leave', 'attendance', 'holiday'], label: 'Leave & attendance', route: 'attendance', detail: 'Apply for leave or check your attendance calendar.' },
  { words: ['pay', 'salary', 'payslip'], label: 'Payroll', route: 'payroll', detail: 'Open your payroll overview and fictional sample payslips.' },
  { words: ['learn', 'course', 'training'], label: 'Learning', route: 'learning', detail: 'Continue a course or browse learning paths.' },
  { words: ['people', 'colleague', 'directory', 'team'], label: 'Company directory', route: 'directory', detail: 'Find colleagues by name, role, or department.' },
  { words: ['task', 'approval'], label: 'Tasks & approvals', route: 'tasks', detail: 'Review your assigned tasks and approvals.' },
  { words: ['event', 'calendar', 'town hall'], label: 'Events', route: 'events', detail: 'Browse upcoming company events.' },
  { words: ['profile', 'contact', 'account'], label: 'My profile', route: 'profile', detail: 'View or update your employee profile.' },
  { words: ['help', 'support', 'ticket'], label: 'Help & support', route: 'support', detail: 'Find help articles or submit a support request.' },
];

export const AssistantWidget: React.FC<{ onNavigate: (route: string) => void }> = ({ onNavigate }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [lastAnswer, setLastAnswer] = useState('I can help you find a portal page or explain where to do a common task.');
  const matches = helpItems.filter(item => item.words.some(word => query.toLowerCase().includes(word)));
  useEffect(() => { if (!open) return; const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); }; window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown); }, [open]);
  const ask = (event: React.FormEvent) => {
    event.preventDefault();
    const match = matches[0];
    setLastAnswer(match ? match.detail : 'Try asking about leave, payroll, learning, people, tasks, events, profile, or support.');
  };

  return <>
    {open && <section className="assistant-panel" role="dialog" aria-modal="false" aria-labelledby="assistant-title">
      <header className="assistant-header"><span className="assistant-icon"><Bot size={18} /></span><div><h2 id="assistant-title">Nexus guide</h2><p>Portal help · answers from workspace navigation</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Close Nexus guide"><X size={18} /></button></header>
      <div className="assistant-messages" aria-live="polite"><p className="assistant-message">{lastAnswer}</p>
        {(query ? matches : helpItems.slice(0, 4)).map(item => <button className="assistant-link" key={item.route} type="button" onClick={() => { onNavigate(item.route); setOpen(false); }}><span><strong>{item.label}</strong><small>{item.detail}</small></span><ArrowRight size={16} /></button>)}
        {query && matches.length === 0 && <p className="assistant-hint">No matching shortcut. Try “leave” or “payroll”.</p>}
      </div>
      <form className="assistant-input" onSubmit={ask}><label className="sr-only" htmlFor="assistant-question">Ask about the portal</label><input id="assistant-question" value={query} onChange={event => setQuery(event.target.value)} placeholder="Ask where to find something…" /><button aria-label="Send question" type="submit"><Send size={16} /></button></form>
    </section>}
    <button className="assistant-launcher" type="button" onClick={() => setOpen(value => !value)} aria-label={open ? 'Close Nexus guide' : 'Open Nexus guide'} aria-expanded={open}><LifeBuoy size={19} /><span>Help</span></button>
  </>;
};
