import React, { useState } from 'react';
import {
  Target,
  Sparkles,
  Plus,
  CheckCircle2,
  Flame,
  TrendingUp,
  MessageSquare,
  Award,
  Filter
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { ProgressBar } from '../components/common/ProgressBar';
import { Modal } from '../components/common/Modal';
import { Drawer } from '../components/common/Drawer';
import { DIRECTORY_EMPLOYEES, INITIAL_TASKS, INITIAL_TEAM_OBJECTIVES } from '../data/mockData';
import { useToast } from '../context/ToastContext';
import { DirectoryEmployee, TaskItem, TeamObjective } from '../types';

export const TeamWorkspace: React.FC = () => {
  const { addToast } = useToast();
  const [teamMembers] = useState<DirectoryEmployee[]>(
    DIRECTORY_EMPLOYEES.filter(e => e.department === 'Product Experience' || e.name === 'Daniel Morgan' || e.name === 'Ananya Sharma')
  );

  const [objectives, setObjectives] = useState<TeamObjective[]>(INITIAL_TEAM_OBJECTIVES);

  const [sprintTasks, setSprintTasks] = useState<TaskItem[]>(
    INITIAL_TASKS.filter(t => t.project.includes('Design') || t.project.includes('Nexus'))
  );

  const [updates, setUpdates] = useState([
    { id: '1', author: 'Daniel Morgan', role: 'VP, Product Experience', text: 'All design reviews for Q4 release have been rescheduled to Wednesday 2 PM. Great work on the milestone deliverables!', time: '2 hours ago', likes: 6 },
    { id: '2', author: 'Ananya Sharma', role: 'Product Designer', text: 'Uploaded the updated token variables in Figma workspace. Component library sync is now active.', time: 'Yesterday', likes: 9 },
    { id: '3', author: 'Meera Kapoor', role: 'Senior UX Researcher', text: 'Synthesized 18 user feedback interviews on mobile responsiveness. Insights report is published.', time: '2 days ago', likes: 11 }
  ]);

  const [selectedMember, setSelectedMember] = useState<DirectoryEmployee | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // New update form
  const [newUpdateText, setNewUpdateText] = useState('');

  // New task form
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('Ananya Sharma');
  const [newTaskPriority, setNewTaskPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('2026-10-24');

  const handleAddUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpdateText.trim()) return;

    const update = {
      id: String(Date.now()),
      author: 'Ananya Sharma',
      role: 'Product Designer',
      text: newUpdateText,
      time: 'Just now',
      likes: 0
    };

    setUpdates([update, ...updates]);
    setNewUpdateText('');
    setIsUpdateModalOpen(false);
    addToast('Team update added to this preview feed.', 'success');
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: TaskItem = {
      id: `tsk_${Date.now().toString().slice(-3)}`,
      title: newTaskTitle,
      description: 'Created during sprint planning in Team Workspace.',
      project: 'Product Design Sprint',
      assignee: newTaskAssignee,
      priority: newTaskPriority,
      status: 'In Progress',
      dueDate: newTaskDueDate,
      progress: 0,
      commentsCount: 0
    };

    setSprintTasks([newTask, ...sprintTasks]);
    setNewTaskTitle('');
    setIsTaskModalOpen(false);
    addToast(`Task "${newTask.title}" added to the preview sprint board.`, 'success');
  };

  const handleToggleObjective = (id: string) => {
    setObjectives(current => current.map(objective => objective.id === id ? { ...objective, status: objective.status === 'Completed' ? 'On Track' : 'Completed', progress: objective.status === 'Completed' ? Math.min(objective.progress, 75) : 100 } : objective));
    addToast('Objective status updated in this workspace preview.', 'success');
  };

  const handleToggleTaskStatus = (id: string) => {
    setSprintTasks(prev => prev.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === 'Completed' ? 'In Progress' : 'Completed';
        const nextProgress = nextStatus === 'Completed' ? 100 : 50;
        addToast(`Task ${t.id} marked as ${nextStatus}`, 'info');
        return { ...t, status: nextStatus, progress: nextProgress };
      }
      return t;
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111A2E]/90 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#8B6CFF]/10 via-[#4F7CFF]/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#8B6CFF]/20 text-[#8B6CFF] border border-[#8B6CFF]/30">
              Department Workspace
            </span>
            <span className="text-xs text-slate-400">• {teamMembers.length} Members Active</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            Product Experience Team
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Centralized hub for UX/UI design sprints, user research roadmaps, design system tokens, and team velocity metrics.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            icon={<MessageSquare className="w-4 h-4" />}
            onClick={() => setIsUpdateModalOpen(true)}
          >
            Post Update
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsTaskModalOpen(true)}
          >
            New Sprint Task
          </Button>
        </div>
      </div>

      {/* Team Availability Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {teamMembers.map(m => (
          <button
            key={m.id}
            onClick={() => setSelectedMember(m)}
            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#111A2E]/60 border border-slate-800/60 hover:border-slate-700 hover:bg-[#111A2E] transition-all text-left group"
          >
            <div className="relative flex-shrink-0">
              <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${m.avatarColor} flex items-center justify-center text-xs font-bold text-white border border-slate-700`}>
                {m.avatarInitials}
              </div>
              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[#0B1020] ${
                m.status === 'ONLINE' ? 'bg-emerald-400' :
                m.status === 'BUSY' ? 'bg-rose-400' :
                m.status === 'AWAY' ? 'bg-amber-400' : 'bg-slate-500'
              }`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-[#27D8E8] transition-colors">{m.name.split(' ')[0]}</p>
              <p className="text-[10px] text-slate-400 truncate">{m.status}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Grid: Objectives + Sprint Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Objectives (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card
            title="Q4 Team Objectives (OKRs)"
            subtitle="Key results and roadmap milestones"
            action={<span className="text-xs text-[#27D8E8] font-medium flex items-center gap-1"><Target className="w-3.5 h-3.5" /> {objectives.length} Active</span>}
          >
            <div className="space-y-4">
              {objectives.map(obj => (
                <div key={obj.id} className="p-4 rounded-xl bg-[#0B1020]/60 border border-slate-800/70 hover:border-slate-700 transition-all">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h4 className="text-sm font-semibold text-white">{obj.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Lead: {obj.owner} • Target: {obj.targetDate}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2"><StatusBadge type={obj.status} /><button type="button" onClick={() => handleToggleObjective(obj.id)} className="text-[11px] font-semibold text-[#4F7CFF] hover:underline" aria-label={`${obj.status === 'Completed' ? 'Reopen' : 'Mark complete'} objective ${obj.title}`}>{obj.status === 'Completed' ? 'Reopen' : 'Mark complete'}</button></div>
                  </div>
                  <ProgressBar
                    progress={obj.progress}
                    color={obj.progress > 80 ? 'green' : 'blue'}
                    size="sm"
                    showValue
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* Sprint Tasks */}
          <Card
            title="Sprint Work Items"
            subtitle="Current sprint execution board"
            action={<span className="text-xs text-slate-400">{sprintTasks.filter(t => t.status === 'Completed').length}/{sprintTasks.length} Completed</span>}
          >
            <div className="space-y-3">
              {sprintTasks.map(t => (
                <div
                  key={t.id}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                    t.status === 'Completed'
                      ? 'bg-[#0B1020]/40 border-slate-800/40 opacity-70'
                      : 'bg-[#0B1020]/80 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => handleToggleTaskStatus(t.id)}
                      className="text-slate-400 hover:text-emerald-400 transition-colors"
                    >
                      {t.status === 'Completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <div className="w-5 h-5 rounded-md border-2 border-slate-600 hover:border-[#4F7CFF]" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${t.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                        {t.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="text-[11px] font-mono text-slate-500">{t.id}</span>
                        <span>•</span>
                        <span>{t.assignee}</span>
                        <span>•</span>
                        <span>Due {t.dueDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge type={t.priority} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right column: Updates Feed & Highlights (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Velocity & Metrics */}
          <Card title="Sprint Health" subtitle="Cycle metrics & delivery rate">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-[#0B1020]/70 border border-slate-800">
                <span className="text-xs text-slate-400">Sprint Velocity</span>
                <p className="text-xl font-bold text-white mt-1">42 pts</p>
                <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 mt-0.5">
                  <TrendingUp className="w-3 h-3" /> +14% vs avg
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#0B1020]/70 border border-slate-800">
                <span className="text-xs text-slate-400">Review Turnaround</span>
                <p className="text-xl font-bold text-white mt-1">4.2 hrs</p>
                <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 mt-0.5">
                  <Sparkles className="w-3 h-3" /> Top 5% enterprise
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#4F7CFF]/10 to-[#8B6CFF]/10 border border-[#4F7CFF]/20 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#4F7CFF]/20 text-[#4F7CFF]">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Recent Team Win</p>
                <p className="text-xs text-slate-300">Figma to React design token pipeline automated with 0 regressions.</p>
              </div>
            </div>
          </Card>

          {/* Activity / Team Updates Feed */}
          <Card title="Team Feed" subtitle="Async daily check-ins and announcements">
            <div className="space-y-4">
              {updates.map(u => (
                <div key={u.id} className="p-3.5 rounded-xl bg-[#0B1020]/60 border border-slate-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-white">{u.author}</p>
                      <p className="text-[10px] text-slate-400">{u.role}</p>
                    </div>
                    <span className="text-[10px] text-slate-500">{u.time}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{u.text}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        setUpdates(prev => prev.map(item => item.id === u.id ? { ...item, likes: item.likes + 1 } : item));
                        addToast('Liked status update!', 'info');
                      }}
                      className="text-[11px] text-slate-400 hover:text-[#27D8E8] flex items-center gap-1 transition-colors"
                    >
                      <Flame className="w-3.5 h-3.5 text-amber-400" /> {u.likes} Kudos
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Post Update Modal */}
      <Modal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        title="Share Status Update"
        subtitle="Post a quick sync or announcement to the Product Experience feed"
      >
        <form onSubmit={handleAddUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Your Update
            </label>
            <textarea
              required
              rows={4}
              value={newUpdateText}
              onChange={(e) => setNewUpdateText(e.target.value)}
              placeholder="What are you working on today? Any blockers or release milestones?"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1020] border border-slate-800 text-sm text-white focus:outline-none focus:border-[#4F7CFF]"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsUpdateModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Publish Update</Button>
          </div>
        </form>
      </Modal>

      {/* New Sprint Task Modal */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title="Add Sprint Task"
        subtitle="Create a tracked work item for the team backlog"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Task Title
            </label>
            <input
              type="text"
              required
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="e.g. Design token documentation for Dark Mode"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1020] border border-slate-800 text-sm text-white focus:outline-none focus:border-[#4F7CFF]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Assignee
              </label>
              <select
                value={newTaskAssignee}
                onChange={(e) => setNewTaskAssignee(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1020] border border-slate-800 text-sm text-white focus:outline-none focus:border-[#4F7CFF]"
              >
                {teamMembers.map(m => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Priority
              </label>
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1020] border border-slate-800 text-sm text-white focus:outline-none focus:border-[#4F7CFF]"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Due Date
            </label>
            <input
              type="date"
              required
              value={newTaskDueDate}
              onChange={(e) => setNewTaskDueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1020] border border-slate-800 text-sm text-white focus:outline-none focus:border-[#4F7CFF]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsTaskModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Create Task</Button>
          </div>
        </form>
      </Modal>

      {/* Member Details Drawer */}
      <Drawer
        isOpen={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        title={selectedMember?.name || 'Team Member'}
      >
        {selectedMember && (
          <div className="space-y-6">
            <div className="text-center p-6 bg-[#0B1020]/60 rounded-2xl border border-slate-800">
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${selectedMember.avatarColor} flex items-center justify-center text-xl font-bold text-white mx-auto mb-3 border-2 border-[#4F7CFF]`}>
                {selectedMember.avatarInitials}
              </div>
              <h3 className="text-lg font-bold text-white">{selectedMember.name}</h3>
              <p className="text-xs text-slate-400">{selectedMember.roleTitle}</p>
              <p className="text-xs text-[#27D8E8] mt-1">{selectedMember.department}</p>
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800/80 text-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                {selectedMember.status}
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-[#0B1020]/50 border border-slate-800">
                <span className="text-xs text-slate-400">Email</span>
                <p className="text-sm font-medium text-white">{selectedMember.email}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0B1020]/50 border border-slate-800">
                <span className="text-xs text-slate-400">Location</span>
                <p className="text-sm font-medium text-white">{selectedMember.location}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0B1020]/50 border border-slate-800">
                <span className="text-xs text-slate-400">Manager</span>
                <p className="text-sm font-medium text-white">{selectedMember.manager}</p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Skills & Focus</h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedMember.skills.map((s, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg text-xs bg-[#4F7CFF]/10 text-[#4F7CFF] border border-[#4F7CFF]/20">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => {
                  addToast(`Opening message draft with ${selectedMember.name}`, 'info');
                  setSelectedMember(null);
                }}
              >
                Send Direct Message
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
