import React, { useState } from 'react';
import {
  Sparkles,
  CalendarDays,
  Clock,
  GraduationCap,
  CheckSquare,
  Megaphone,
  Calendar,
  Users,
  ArrowRight,
  Plus,
  Check,
  Heart,
  Smile,
  Activity,
  Send,
  HeartHandshake,
  Receipt,
  LifeBuoy,
  Users2,
  BookOpenCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { MetricCard } from '../components/common/MetricCard';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { ProgressBar } from '../components/common/ProgressBar';
import { Modal } from '../components/common/Modal';
import {
  INITIAL_ANNOUNCEMENTS,
  INITIAL_TASKS,
  INITIAL_EVENTS,
  DIRECTORY_EMPLOYEES
} from '../data/mockData';
import { getRegisteredEventIds, saveRegisteredEventIds } from '../utils/eventRsvp';
import { OnboardingChecklist } from '../components/layout/OnboardingChecklist';

export interface DashboardProps {
  onNavigate: (route: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { showSuccess, showInfo } = useToast();

  const [focusItems, setFocusItems] = useState([
    { id: 1, title: 'Multi-Brand Token Spec Review with Engineering', time: '10:30 AM', completed: true },
    { id: 2, title: 'Weekly Product Experience Critique & Design Jam', time: '2:00 PM', completed: false },
    { id: 3, title: 'Submit Sprint 24 Velocity Update to Team Board', time: '5:00 PM', completed: false },
  ]);

  const [addFocusOpen, setAddFocusOpen] = useState(false);
  const [newFocusTitle, setNewFocusTitle] = useState('');
  const [newFocusTime, setNewFocusTime] = useState('16:00');
  const [registeredEvents, setRegisteredEvents] = useState<string[]>(() => getRegisteredEventIds(user?.id || 'preview', ['evt_01', 'evt_02']));
  const [pulseAnswered, setPulseAnswered] = useState(false);

  const toggleFocus = (id: number) => {
    setFocusItems(prev => prev.map(item => {
      if (item.id === id) {
        const next = !item.completed;
        if (next) showSuccess('Focus Item Completed', item.title);
        return { ...item, completed: next };
      }
      return item;
    }));
  };

  const handleAddFocus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFocusTitle.trim()) return;
    setFocusItems(prev => [
      ...prev,
      { id: Date.now(), title: newFocusTitle.trim(), time: newFocusTime, completed: false }
    ]);
    showSuccess('Focus Item Added', newFocusTitle);
    setNewFocusTitle('');
    setAddFocusOpen(false);
  };

  const handleToggleEventReg = (eventId: string) => {
    if (registeredEvents.includes(eventId)) {
      const next = registeredEvents.filter(id => id !== eventId);
      setRegisteredEvents(next);
      saveRegisteredEventIds(user?.id || 'preview', next);
      showInfo('RSVP cancelled', 'Your event registration was removed from this browser preview.');
    } else {
      const next = [...registeredEvents, eventId];
      setRegisteredEvents(next);
      saveRegisteredEventIds(user?.id || 'preview', next);
      showSuccess('RSVP saved', 'Your event registration was saved in this browser preview. No email was sent.');
    }
  };

  const featuredAnn = INITIAL_ANNOUNCEMENTS[0];
  const upcomingEvent = INITIAL_EVENTS[0];
  const pendingTasks = INITIAL_TASKS.filter(t => t.status !== 'Completed').slice(0, 3);
  const teammates = DIRECTORY_EMPLOYEES.slice(0, 6);

  const currentDateStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date());
  const isNewJoiner = user?.department?.toLowerCase() === 'new starter' || user?.roleTitle?.toLowerCase() === 'new starter';

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#22375F]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              Good morning, {user?.name.split(' ')[0]} 👋
            </h2>
            <StatusBadge type={user?.role || 'EMPLOYEE'} />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {currentDateStr} • {user?.department} • {user?.location}
          </p>
        </div>

        {/* Quick actions row */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('attendance')}
            leftIcon={<CalendarDays className="w-3.5 h-3.5" />}
          >
            Apply Leave
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate('payroll')}
            leftIcon={<Receipt className="w-3.5 h-3.5" />}
          >
            View Payslip
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('tasks')}
            leftIcon={<CheckSquare className="w-3.5 h-3.5" />}
          >
            My Tasks ({pendingTasks.length})
          </Button>
        </div>
      </div>

      {/* Summary Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Leave Balance"
          value={18}
          subtext="Annual leave days remaining"
          icon={<CalendarDays className="w-5 h-5" />}
          accentColor="blue"
          actionLabel="View Leave Details"
          onAction={() => onNavigate('attendance')}
        />
        <MetricCard
          label="Attendance Rate"
          value="92%"
          delta="+2.4%"
          deltaType="positive"
          subtext="Current month logged"
          icon={<Clock className="w-5 h-5" />}
          accentColor="teal"
          actionLabel="Monthly Timesheet"
          onAction={() => onNavigate('attendance')}
        />
        <MetricCard
          label="Learning Progress"
          value="68%"
          subtext="Multi-Brand Tokens Course"
          icon={<GraduationCap className="w-5 h-5" />}
          accentColor="violet"
          actionLabel="Continue Learning"
          onAction={() => onNavigate('learning')}
        />
        <MetricCard
          label="Pending Tasks"
          value={pendingTasks.length}
          subtext="2 due before Friday"
          icon={<CheckSquare className="w-5 h-5" />}
          accentColor="amber"
          actionLabel="Open Tasks Board"
          onAction={() => onNavigate('tasks')}
        />
      </div>

      <Card title="Quick actions" subtitle="Jump straight to common employee tasks">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[{label:'Request time off',route:'attendance',icon:CalendarDays},{label:'Get help',route:'support',icon:LifeBuoy},{label:'Find a colleague',route:'directory',icon:Users2},{label:'Continue learning',route:'learning',icon:BookOpenCheck}].map(action => {
            const Icon = action.icon;
            return <button key={action.route} type="button" onClick={() => onNavigate(action.route)} className="flex items-center gap-3 rounded-xl border border-[#22375F] bg-[#111A2E] px-3 py-3 text-left hover:border-[#4F7CFF] hover:bg-[#15223D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F7CFF]"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#4F7CFF]/10 text-[#4F7CFF]"><Icon size={18} aria-hidden="true" /></span><span className="text-xs font-semibold text-white">{action.label}</span></button>;
          })}
        </div>
      </Card>

      {isNewJoiner && user && <OnboardingChecklist userId={user.id} onNavigate={onNavigate} />}

      {/* Main Grid: Focus Area + Announcements + Events + Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column (7 cols): Today's Focus & Featured Announcement */}
        <div className="lg:col-span-7 space-y-6">

          {/* Today's Focus Card */}
          <Card variant="blue" isGlow className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#4F7CFF]/20 text-[#4F7CFF] border border-[#4F7CFF]/40">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Today's Focus & Priorities</h3>
                  <p className="text-xs text-slate-300">Curated key milestones for your day</p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddFocusOpen(true)}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Focus
              </Button>
            </div>

            <div className="space-y-2.5 pt-2">
              {focusItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => toggleFocus(item.id)}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    item.completed
                      ? 'bg-[#0B1020]/50 border-[#22375F] text-slate-400'
                      : 'bg-[#15223D] border-[#22375F] text-slate-200 hover:border-[#4F7CFF]/60 hover:bg-[#1C2D4F]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                      item.completed
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-400'
                        : 'border-[#22375F] bg-[#0B1020]'
                    }`}>
                      {item.completed && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <span className={`text-xs font-medium truncate ${item.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                      {item.title}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-cyan-300 px-2 py-0.5 rounded bg-[#0B1020] border border-[#22375F] shrink-0">
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Featured Announcement Panel */}
          <Card variant="surface" className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Company Announcement
                </h3>
              </div>
              <button
                onClick={() => onNavigate('announcements')}
                className="text-xs text-[#4F7CFF] hover:underline flex items-center gap-1 font-medium"
              >
                View all announcements →
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-cyan-950/20 to-transparent border border-[#22375F] space-y-2.5">
              <div className="flex items-center justify-between">
                <StatusBadge type={featuredAnn.category} size="sm" />
                <span className="text-[11px] text-slate-400 font-mono">{featuredAnn.publishedAt}</span>
              </div>

              <h4 className="text-base font-bold text-white leading-snug">
                {featuredAnn.title}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {featuredAnn.summary}
              </p>

              <div className="pt-2 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>By {featuredAnn.author} ({featuredAnn.authorRole})</span>
                <button
                  onClick={() => onNavigate('announcements')}
                  className="text-cyan-300 hover:text-white font-sans font-medium flex items-center gap-1"
                >
                  Read full story <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </Card>

          {/* Daily Pulse Feedback Survey */}
          <Card variant="subtle" className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-2">
                <Smile className="w-4 h-4 text-amber-400" />
                Daily Workplace Pulse: How is your work velocity feeling today?
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Anonymous 1-click sentiment shared with People Operations
              </p>
            </div>

            {pulseAnswered ? (
              <span className="text-xs font-mono text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/40">
                ✓ Pulse recorded!
              </span>
            ) : (
              <div className="flex items-center gap-1.5">
                {['⚡ Energized', '👍 Balanced', '🔥 Stretched'].map(option => (
                  <button
                    key={option}
                    onClick={() => {
                      setPulseAnswered(true);
                      showSuccess('Workplace Pulse Submitted', 'Thank you for your daily sentiment!');
                    }}
                    className="px-2.5 py-1 rounded-xl bg-[#15223D] hover:bg-[#1C2D4F] border border-[#22375F] text-xs text-slate-200 transition-colors"
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column (5 cols): Events, Tasks & Team Availability */}
        <div className="lg:col-span-5 space-y-6">

          {/* Upcoming Event Card */}
          <Card variant="surface" className="p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                Next Upcoming Event
              </h3>
              <button
                onClick={() => onNavigate('events')}
                className="text-xs text-[#8B6CFF] hover:underline"
              >
                Calendar →
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0B1020] border border-[#22375F] space-y-2">
              <div className="flex items-center justify-between">
                <StatusBadge type={upcomingEvent.category} size="sm" />
                <span className="text-[11px] font-mono text-purple-300">{upcomingEvent.date}</span>
              </div>
              <h4 className="text-xs font-bold text-white">{upcomingEvent.title}</h4>
              <p className="text-[11px] text-slate-400">{upcomingEvent.time} • {upcomingEvent.location}</p>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono">
                  {upcomingEvent.registeredCount} colleagues attending
                </span>
                <Button
                  variant={registeredEvents.includes(upcomingEvent.id) ? 'danger' : 'primary'}
                  size="sm"
                  onClick={() => handleToggleEventReg(upcomingEvent.id)}
                  aria-pressed={registeredEvents.includes(upcomingEvent.id)}
                  aria-label={registeredEvents.includes(upcomingEvent.id) ? `Cancel RSVP for ${upcomingEvent.title}` : `Register for ${upcomingEvent.title}`}
                >
                  {registeredEvents.includes(upcomingEvent.id) ? 'Cancel RSVP' : 'Register'}
                </Button>
              </div>
            </div>
          </Card>

          {/* Action Items Panel */}
          <Card variant="surface" className="p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                Active Action Items
              </h3>
              <button
                onClick={() => onNavigate('tasks')}
                className="text-xs text-[#4F7CFF] hover:underline"
              >
                All tasks →
              </button>
            </div>

            <div className="space-y-2">
              {pendingTasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => onNavigate('tasks')}
                  className="p-3 rounded-xl bg-[#0B1020] hover:bg-[#15223D] border border-[#22375F] cursor-pointer transition-colors space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h5 className="text-xs font-bold text-white truncate">{task.title}</h5>
                    <StatusBadge type={task.priority} size="sm" />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{task.project}</span>
                    <span className="text-amber-300">Due: {task.dueDate}</span>
                  </div>
                  <ProgressBar progress={task.progress} size="sm" color="blue" />
                </div>
              ))}
            </div>
          </Card>

          {/* Team Availability Summary */}
          <Card variant="surface" className="p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                Product Experience Team
              </h3>
              <button
                onClick={() => onNavigate('team')}
                className="text-xs text-[#4F7CFF] hover:underline"
              >
                Team Hub →
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {teammates.map(member => (
                <div
                  key={member.id}
                  onClick={() => onNavigate('directory')}
                  className="p-2.5 rounded-xl bg-[#0B1020] hover:bg-[#15223D] border border-[#22375F] text-center cursor-pointer transition-all group"
                >
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${member.avatarColor} mx-auto flex items-center justify-center text-white text-xs font-bold shadow mb-1.5 relative`}>
                    {member.avatarInitials}
                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[#0B1020] ${
                      member.status === 'ONLINE' ? 'bg-emerald-400' : member.status === 'BUSY' ? 'bg-rose-400' : 'bg-amber-400'
                    }`} />
                  </div>
                  <p className="text-xs font-semibold text-white truncate group-hover:text-[#4F7CFF]">{member.name.split(' ')[0]}</p>
                  <p className="text-[10px] text-slate-400 truncate">{member.roleTitle.split(' ')[0]}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Add Focus Modal */}
      <Modal
        isOpen={addFocusOpen}
        onClose={() => setAddFocusOpen(false)}
        title="Add Daily Focus Item"
        subtitle="Set a high-priority deliverable for your schedule"
        maxWidth="sm"
      >
        <form onSubmit={handleAddFocus} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Focus Goal Title
            </label>
            <input
              type="text"
              required
              value={newFocusTitle}
              onChange={e => setNewFocusTitle(e.target.value)}
              placeholder="e.g. Prototype tokens validation"
              className="w-full px-3 py-2 rounded-xl bg-[#0B1020] border border-[#22375F] text-xs text-white focus:outline-none focus:border-[#4F7CFF]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Target Completion Time
            </label>
            <input
              type="time"
              value={newFocusTime}
              onChange={e => setNewFocusTime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#0B1020] border border-[#22375F] text-xs text-white focus:outline-none focus:border-[#4F7CFF]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setAddFocusOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Add to Focus List
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
