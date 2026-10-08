import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  MessageSquare,
  Calendar,
  ChevronRight,
  Check,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { ProgressBar } from '../components/common/ProgressBar';
import { Modal } from '../components/common/Modal';
import { Drawer } from '../components/common/Drawer';
import { Tabs } from '../components/common/Tabs';
import { INITIAL_TASKS } from '../data/mockData';
import { useToast } from '../context/ToastContext';
import { TaskItem, TaskPriority, TaskStatus } from '../types';

export const TasksApprovals: React.FC = () => {
  const { addToast } = useToast();
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [activeTab, setActiveTab] = useState<'my' | 'approvals' | 'completed' | 'assigned'>('my');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drawers
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [commentText, setCommentText] = useState('');

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newProject, setNewProject] = useState('Nexus One Core');
  const [newAssignee, setNewAssignee] = useState('Ananya Sharma');
  const [newPriority, setNewPriority] = useState<TaskPriority>('Medium');
  const [newDueDate, setNewDueDate] = useState('2026-10-30');

  // Filter logic
  const filteredTasks = tasks.filter(task => {
    // Search
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase()) && !task.project.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Priority filter
    if (priorityFilter !== 'All' && task.priority !== priorityFilter) {
      return false;
    }
    // Tab filter
    if (activeTab === 'my') {
      return task.assignee === 'Ananya Sharma' && task.status !== 'Completed';
    }
    if (activeTab === 'approvals') {
      return task.isApprovalRequired || task.status === 'Pending' || task.status === 'Under Review';
    }
    if (activeTab === 'completed') {
      return task.status === 'Completed';
    }
    if (activeTab === 'assigned') {
      return task.assignee !== 'Ananya Sharma';
    }
    return true;
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const created: TaskItem = {
      id: `tsk_${Date.now().toString().slice(-4)}`,
      title: newTitle,
      description: newDesc || 'Standard project deliverable tracked in Nexus One.',
      project: newProject,
      assignee: newAssignee,
      priority: newPriority,
      status: 'In Progress',
      dueDate: newDueDate,
      progress: 0,
      commentsCount: 0
    };

    setTasks([created, ...tasks]);
    setNewTitle('');
    setNewDesc('');
    setIsNewTaskModalOpen(false);
    addToast(`Task "${created.title}" successfully created!`, 'success');
  };

  const handleApprove = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'Completed', progress: 100, isApprovalRequired: false } : t));
    addToast(`Task ${id} has been Approved & finalized!`, 'success');
    if (selectedTask?.id === id) setSelectedTask(null);
  };

  const handleReject = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'Pending', isApprovalRequired: false } : t));
    addToast(`Task ${id} has been marked as Rejected.`, 'error');
    if (selectedTask?.id === id) setSelectedTask(null);
  };

  const handleRequestChanges = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'In Progress' } : t));
    addToast(`Changes requested for ${id}. Status returned to In Progress.`, 'info');
    if (selectedTask?.id === id) setSelectedTask(null);
  };

  const handleToggleComplete = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const isDone = t.status === 'Completed';
        const nextStatus: TaskStatus = isDone ? 'In Progress' : 'Completed';
        const nextProgress = isDone ? 50 : 100;
        addToast(`Task marked as ${nextStatus}`, 'info');
        return { ...t, status: nextStatus, progress: nextProgress };
      }
      return t;
    }));
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    addToast(`Task ${id} removed from board.`, 'info');
    if (selectedTask?.id === id) setSelectedTask(null);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedTask) return;

    setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, commentsCount: t.commentsCount + 1 } : t));
    setSelectedTask(prev => prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : null);
    setCommentText('');
    setIsCommentModalOpen(false);
    addToast('Comment attached to task audit trail.', 'success');
  };

  const tabOptions = [
    { id: 'my', label: 'My Tasks', count: tasks.filter(t => t.assignee === 'Ananya Sharma' && t.status !== 'Completed').length },
    { id: 'approvals', label: 'Pending Approvals', count: tasks.filter(t => t.isApprovalRequired || t.status === 'Pending').length },
    { id: 'completed', label: 'Completed', count: tasks.filter(t => t.status === 'Completed').length },
    { id: 'assigned', label: 'Assigned by Me', count: tasks.filter(t => t.assignee !== 'Ananya Sharma').length }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111A2E]/90 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            Tasks & Approvals
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track deliverables, sign off on design deliverables, and manage cross-departmental approval requests.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsNewTaskModalOpen(true)}
          >
            Create Task
          </Button>
        </div>
      </div>

      {/* Controls & Tabs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Tabs
            tabs={tabOptions}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as any)}
          />

          {/* Filter / Search Bar */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3.5 py-1.5 rounded-xl bg-[#111A2E] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#4F7CFF] w-44 sm:w-56"
              />
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#111A2E] border border-slate-800 text-xs text-white focus:outline-none focus:border-[#4F7CFF]"
            >
              <option value="All">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* Task List */}
        <Card>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 text-emerald-400/60 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">No tasks found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No items match your active tab and filter criteria. You are completely caught up!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {filteredTasks.map(task => (
                <div
                  key={task.id}
                  className="py-4 px-2 sm:px-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-900/40 rounded-xl transition-colors group"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <button
                      onClick={() => handleToggleComplete(task.id)}
                      className="mt-1 text-slate-400 hover:text-emerald-400 transition-colors flex-shrink-0"
                    >
                      {task.status === 'Completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <div className="w-5 h-5 rounded-md border-2 border-slate-600 hover:border-[#4F7CFF]" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-slate-500">{task.id}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                          {task.project}
                        </span>
                        <StatusBadge type={task.priority} />
                        <StatusBadge type={task.status} />
                      </div>

                      <h4
                        onClick={() => setSelectedTask(task)}
                        className={`text-sm font-semibold mt-1 cursor-pointer transition-colors ${
                          task.status === 'Completed' ? 'line-through text-slate-400' : 'text-white hover:text-[#27D8E8]'
                        }`}
                      >
                        {task.title}
                      </h4>

                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{task.description}</p>

                      <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 flex-wrap">
                        <span className="flex items-center gap-1.5 text-slate-300">
                          {task.assignee}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" /> Due {task.dueDate}
                        </span>
                        {task.commentsCount > 0 && (
                          <span className="flex items-center gap-1 text-[#4F7CFF]">
                            <MessageSquare className="w-3.5 h-3.5" /> {task.commentsCount} comments
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Action / Approvals / Progress */}
                  <div className="flex items-center gap-3 self-end md:self-center">
                    <div className="w-24 hidden sm:block">
                      <ProgressBar progress={task.progress} color={task.progress === 100 ? 'green' : 'blue'} size="sm" showValue />
                    </div>

                    {task.isApprovalRequired ? (
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/40"
                          icon={<Check className="w-3.5 h-3.5" />}
                          onClick={() => handleApprove(task.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          icon={<XCircle className="w-3.5 h-3.5" />}
                          onClick={() => handleReject(task.id)}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<ChevronRight className="w-4 h-4" />}
                        onClick={() => setSelectedTask(task)}
                      >
                        Details
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Task Details Drawer */}
      <Drawer
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        title={selectedTask?.title || 'Task Details'}
      >
        {selectedTask && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">{selectedTask.id}</span>
              <StatusBadge type={selectedTask.priority} />
              <StatusBadge type={selectedTask.status} />
            </div>

            <div className="p-4 rounded-xl bg-[#0B1020]/60 border border-slate-800 space-y-3">
              <h3 className="text-sm font-semibold text-white">Description</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{selectedTask.description}</p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-xl bg-[#0B1020]/40 border border-slate-800">
                <span className="text-xs text-slate-400">Project</span>
                <span className="text-xs font-semibold text-white">{selectedTask.project}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-[#0B1020]/40 border border-slate-800">
                <span className="text-xs text-slate-400">Assignee</span>
                <span className="text-xs font-semibold text-white">
                  {selectedTask.assignee}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-[#0B1020]/40 border border-slate-800">
                <span className="text-xs text-slate-400">Due Date</span>
                <span className="text-xs font-semibold text-white">{selectedTask.dueDate}</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                <span>Progress</span>
                <span>{selectedTask.progress}%</span>
              </div>
              <ProgressBar progress={selectedTask.progress} color="blue" size="md" />
            </div>

            {/* Actions for Task */}
            <div className="pt-4 border-t border-slate-800 space-y-2.5">
              {selectedTask.isApprovalRequired ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="primary"
                    className="bg-emerald-600 hover:bg-emerald-500"
                    icon={<Check className="w-4 h-4" />}
                    onClick={() => handleApprove(selectedTask.id)}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    icon={<XCircle className="w-4 h-4" />}
                    onClick={() => handleReject(selectedTask.id)}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="outline"
                    className="col-span-2"
                    icon={<RotateCcw className="w-4 h-4" />}
                    onClick={() => handleRequestChanges(selectedTask.id)}
                  >
                    Request Changes
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    icon={<MessageSquare className="w-4 h-4" />}
                    onClick={() => setIsCommentModalOpen(true)}
                  >
                    Add Comment
                  </Button>
                  <Button
                    variant="primary"
                    icon={<CheckCircle2 className="w-4 h-4" />}
                    onClick={() => handleToggleComplete(selectedTask.id)}
                  >
                    {selectedTask.status === 'Completed' ? 'Mark In Progress' : 'Mark Completed'}
                  </Button>
                  <Button
                    variant="ghost"
                    className="col-span-2 text-rose-400 hover:bg-rose-500/10"
                    icon={<Trash2 className="w-4 h-4" />}
                    onClick={() => handleDeleteTask(selectedTask.id)}
                  >
                    Delete Demo Task
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* New Task Modal */}
      <Modal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        title="Create New Task"
        subtitle="Add a tracked deliverable to your workspace"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Task Title
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Conduct usability testing on navigation drawer"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1020] border border-slate-800 text-sm text-white focus:outline-none focus:border-[#4F7CFF]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Deliverable specifications, acceptance criteria..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1020] border border-slate-800 text-sm text-white focus:outline-none focus:border-[#4F7CFF]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Project
              </label>
              <input
                type="text"
                value={newProject}
                onChange={(e) => setNewProject(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1020] border border-slate-800 text-sm text-white focus:outline-none focus:border-[#4F7CFF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Priority
              </label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1020] border border-slate-800 text-sm text-white focus:outline-none focus:border-[#4F7CFF]"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Assignee
              </label>
              <input
                type="text"
                value={newAssignee}
                onChange={(e) => setNewAssignee(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1020] border border-slate-800 text-sm text-white focus:outline-none focus:border-[#4F7CFF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Due Date
              </label>
              <input
                type="date"
                required
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1020] border border-slate-800 text-sm text-white focus:outline-none focus:border-[#4F7CFF]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsNewTaskModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Create Task</Button>
          </div>
        </form>
      </Modal>

      {/* Add Comment Modal */}
      <Modal
        isOpen={isCommentModalOpen}
        onClose={() => setIsCommentModalOpen(false)}
        title="Add Comment to Task"
        subtitle={`Audit feedback for ${selectedTask?.id}`}
      >
        <form onSubmit={handleAddComment} className="space-y-4">
          <div>
            <textarea
              required
              rows={3}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Type your notes, review feedback, or status update here..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1020] border border-slate-800 text-sm text-white focus:outline-none focus:border-[#4F7CFF]"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setIsCommentModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Post Comment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
