import React, { useState, useEffect } from 'react';
import {
  Search,
  Megaphone,
  Users,
  CheckSquare,
  Calendar,
  GraduationCap,
  HelpCircle,
  ArrowRight,
  X,
  Sparkles
} from 'lucide-react';
import {
  INITIAL_ANNOUNCEMENTS,
  DIRECTORY_EMPLOYEES,
  INITIAL_TASKS,
  INITIAL_EVENTS,
  INITIAL_COURSES,
  INITIAL_FAQS
} from '../../data/mockData';

export interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  // Search Results
  const announcements = INITIAL_ANNOUNCEMENTS.filter(a => a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q)).slice(0, 3);
  const employees = DIRECTORY_EMPLOYEES.filter(e => e.name.toLowerCase().includes(q) || e.roleTitle.toLowerCase().includes(q) || e.department.toLowerCase().includes(q)).slice(0, 3);
  const tasks = INITIAL_TASKS.filter(t => t.title.toLowerCase().includes(q) || t.project.toLowerCase().includes(q)).slice(0, 3);
  const events = INITIAL_EVENTS.filter(e => e.title.toLowerCase().includes(q) || e.speaker.toLowerCase().includes(q)).slice(0, 3);
  const courses = INITIAL_COURSES.filter(c => c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)).slice(0, 3);
  const faqs = INITIAL_FAQS.filter(f => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)).slice(0, 2);

  const totalResults = announcements.length + employees.length + tasks.length + events.length + courses.length + faqs.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-[#111A2E] border border-[#22375F] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#22375F] bg-[#15223D]">
          <Search className="w-5 h-5 text-[#4F7CFF] mr-3 shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search announcements, employees, tasks, events, courses, FAQs..."
            className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
          />
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {totalResults === 0 && q ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No results found for "{query}". Try searching for design, tokens, leave, or a colleague's name.
            </div>
          ) : (
            <>
              {/* Quick Navigation suggestions if query is empty */}
              {!q && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    Quick Navigation Shortcuts
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { label: 'Leave & Attendance', route: 'attendance', icon: <Calendar className="w-3.5 h-3.5 text-blue-400" /> },
                      { label: 'Company Announcements', route: 'announcements', icon: <Megaphone className="w-3.5 h-3.5 text-cyan-400" /> },
                      { label: 'Payroll & Payslips', route: 'payroll', icon: <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> },
                      { label: 'Employee Directory', route: 'directory', icon: <Users className="w-3.5 h-3.5 text-purple-400" /> },
                      { label: 'Tasks & Approvals', route: 'tasks', icon: <CheckSquare className="w-3.5 h-3.5 text-amber-400" /> },
                      { label: 'Learning & Dev', route: 'learning', icon: <GraduationCap className="w-3.5 h-3.5 text-teal-400" /> },
                    ].map(item => (
                      <button
                        key={item.route}
                        onClick={() => {
                          onNavigate(item.route);
                          onClose();
                        }}
                        className="p-2.5 rounded-xl bg-[#15223D] hover:bg-[#1C2D4F] border border-[#22375F] text-left text-xs text-slate-200 flex items-center gap-2 transition-colors"
                      >
                        {item.icon}
                        <span className="truncate">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Employees */}
              {employees.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#4F7CFF] font-mono flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Colleagues & Directory
                  </p>
                  {employees.map(emp => (
                    <button
                      key={emp.id}
                      onClick={() => {
                        onNavigate('directory');
                        onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#15223D]/60 hover:bg-[#15223D] border border-[#22375F] text-left text-xs transition-colors group"
                    >
                      <div>
                        <p className="font-semibold text-white group-hover:text-[#4F7CFF]">{emp.name}</p>
                        <p className="text-[11px] text-slate-400">{emp.roleTitle} • {emp.department}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white" />
                    </button>
                  ))}
                </div>
              )}

              {/* Announcements */}
              {announcements.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 font-mono flex items-center gap-1.5">
                    <Megaphone className="w-3.5 h-3.5" /> Company Announcements
                  </p>
                  {announcements.map(ann => (
                    <button
                      key={ann.id}
                      onClick={() => {
                        onNavigate('announcements');
                        onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#15223D]/60 hover:bg-[#15223D] border border-[#22375F] text-left text-xs transition-colors group"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-white truncate group-hover:text-cyan-300">{ann.title}</p>
                        <p className="text-[11px] text-slate-400 truncate">{ann.summary}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* Tasks */}
              {tasks.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 font-mono flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5" /> Action Items & Tasks
                  </p>
                  {tasks.map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        onNavigate('tasks');
                        onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#15223D]/60 hover:bg-[#15223D] border border-[#22375F] text-left text-xs transition-colors group"
                    >
                      <div>
                        <p className="font-semibold text-white group-hover:text-amber-300">{t.title}</p>
                        <p className="text-[11px] text-slate-400">Project: {t.project} • Due: {t.dueDate}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#22375F] bg-[#0B1020] flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>Search with real local index</span>
          <span>ESC to exit</span>
        </div>
      </div>
    </div>
  );
};
