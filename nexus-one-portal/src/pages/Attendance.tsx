import React, { useState } from 'react';
import {
  CalendarDays,
  Clock,
  Plus,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Heart,
  Palmtree,
  Home,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { LeaveRequest, AttendanceDay, LeaveType } from '../types';
import { INITIAL_LEAVE_REQUESTS, ATTENDANCE_CALENDAR_DAYS } from '../data/mockData';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { MetricCard } from '../components/common/MetricCard';
import { DataTable, Column } from '../components/common/DataTable';
import { Modal } from '../components/common/Modal';

export const Attendance: React.FC = () => {
  const { showSuccess, showError } = useToast();

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(INITIAL_LEAVE_REQUESTS);
  const [selectedDay, setSelectedDay] = useState<AttendanceDay | null>(ATTENDANCE_CALENDAR_DAYS[13]); // Oct 14

  // Modal states
  const [applyLeaveOpen, setApplyLeaveOpen] = useState(false);
  const [wfhModalOpen, setWfhModalOpen] = useState(false);

  // Apply Leave Form state
  const [leaveType, setLeaveType] = useState<LeaveType>('Annual Leave');
  const [startDate, setStartDate] = useState('2026-11-20');
  const [endDate, setEndDate] = useState('2026-11-24');
  const [reason, setReason] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // WFH Form state
  const [wfhDate, setWfhDate] = useState('2026-10-19');
  const [wfhReason, setWfhReason] = useState('');

  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(endDate) < new Date(startDate)) {
      showError('Invalid Date Range', 'End date cannot be before start date.');
      return;
    }
    if (!reason.trim()) {
      showError('Missing Reason', 'Please provide a brief reason for your leave request.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      const days = isHalfDay ? 0.5 : Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);

      const newReq: LeaveRequest = {
        id: `lreq_${Date.now()}`,
        type: leaveType,
        startDate,
        endDate,
        days,
        reason,
        status: 'Pending',
        appliedOn: new Date().toISOString().split('T')[0],
        isHalfDay,
        approver: 'Manager review'
      };

      setLeaveRequests([newReq, ...leaveRequests]);
      showSuccess('Leave request saved', `${days} day(s) ${leaveType} marked pending in this local preview. No manager notification was sent.`);
      setReason('');
      setApplyLeaveOpen(false);
    }, 500);
  };

  const handleApplyWfh = (e: React.FormEvent) => {
    e.preventDefault();
    showSuccess('Work-from-home request saved', `${wfhDate} is recorded in this local preview. It was not synced to a team calendar.`);
    setWfhReason('');
    setWfhModalOpen(false);
  };

  const columns: Column<LeaveRequest>[] = [
    {
      key: 'type',
      header: 'Leave Type',
      render: (req) => (
        <span className="font-semibold text-white text-xs">{req.type}</span>
      )
    },
    {
      key: 'dates',
      header: 'Duration & Dates',
      render: (req) => (
        <div className="text-xs font-mono">
          <span className="text-cyan-300 font-bold">{req.days} day(s)</span>
          <span className="text-slate-400 block text-[11px]">{req.startDate} to {req.endDate}</span>
        </div>
      )
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (req) => (
        <span className="text-xs text-slate-300 truncate max-w-xs block">{req.reason}</span>
      )
    },
    {
      key: 'status',
      header: 'Approval Status',
      render: (req) => <StatusBadge type={req.status} size="sm" />
    },
    {
      key: 'appliedOn',
      header: 'Applied On',
      render: (req) => (
        <span className="text-[11px] font-mono text-slate-400">{req.appliedOn}</span>
      )
    }
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#22375F]">
        <div>
          <h2 className="text-xl lg:text-2xl font-extrabold text-white tracking-tight">
            Leave & Attendance Management
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track daily work check-ins, apply for planned time off, and manage hybrid work requests
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWfhModalOpen(true)}
            leftIcon={<Laptop className="w-3.5 h-3.5 text-cyan-400" />}
          >
            Request WFH
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setApplyLeaveOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Apply for Leave
          </Button>
        </div>
      </div>

      {/* Leave Balances Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Annual Leave"
          value={18}
          subtext="Total accrued: 25 days / year"
          icon={<Palmtree className="w-5 h-5" />}
          accentColor="blue"
        />
        <MetricCard
          label="Sick Leave"
          value={7}
          subtext="100% employer protected"
          icon={<Heart className="w-5 h-5" />}
          accentColor="teal"
        />
        <MetricCard
          label="Casual / Personal"
          value={4}
          subtext="Available for quick breaks"
          icon={<CalendarDays className="w-5 h-5" />}
          accentColor="violet"
        />
        <MetricCard
          label="Attendance Rate"
          value="92%"
          delta="+1.8%"
          deltaType="positive"
          subtext="18 present, 4 WFH this month"
          icon={<Clock className="w-5 h-5" />}
          accentColor="green"
        />
      </div>

      {/* Attendance Calendar & Day Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Monthly Attendance Calendar (8 cols) */}
        <div className="lg:col-span-8">
          <Card variant="surface" className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  October 2026 Attendance
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Click any date to view logged check-in details</p>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                <span className="flex items-center gap-1 text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Present
                </span>
                <span className="flex items-center gap-1 text-cyan-300">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" /> WFH
                </span>
                <span className="flex items-center gap-1 text-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> Holiday
                </span>
                <span className="flex items-center gap-1 text-purple-300">
                  <span className="w-2 h-2 rounded-full bg-purple-400" /> Leave
                </span>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2 pt-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-[10px] font-mono font-semibold text-slate-500 py-1">
                  {d}
                </div>
              ))}

              {ATTENDANCE_CALENDAR_DAYS.map(day => {
                const isSelected = selectedDay?.date === day.date;
                let bgStyle = 'bg-[#0B1020] border-[#22375F] text-slate-300';
                let dot = null;

                if (day.status === 'PRESENT') {
                  dot = <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1" />;
                } else if (day.status === 'WFH') {
                  dot = <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1" />;
                } else if (day.status === 'HOLIDAY') {
                  bgStyle = 'bg-amber-950/30 border-amber-500/40 text-amber-200';
                  dot = <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1" />;
                } else if (day.status === 'LEAVE') {
                  bgStyle = 'bg-purple-950/30 border-purple-500/40 text-purple-200';
                  dot = <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1" />;
                } else if (day.status === 'WEEKEND') {
                  bgStyle = 'bg-[#0B1020]/40 border-transparent text-slate-600';
                }

                return (
                  <button
                    key={day.date}
                    onClick={() => setSelectedDay(day)}
                    className={`h-14 p-1.5 rounded-xl border flex flex-col items-center justify-between text-xs transition-all ${bgStyle} ${
                      isSelected ? 'ring-2 ring-[#4F7CFF] border-[#4F7CFF] shadow-lg' : 'hover:border-slate-500'
                    }`}
                  >
                    <span className="font-mono text-[11px] font-semibold">{day.dayNumber}</span>
                    {dot}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Selected Day Inspector Panel (4 cols) */}
        <div className="lg:col-span-4">
          <Card variant="surface" className="p-6 space-y-4 h-full flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-3 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-400" /> Day Inspector
              </h3>

              {selectedDay ? (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-[#0B1020] border border-[#22375F] space-y-1">
                    <p className="text-[10px] text-slate-400 font-mono uppercase">Selected Date</p>
                    <p className="text-sm font-bold text-white">{selectedDay.date} ({selectedDay.dayName})</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0B1020] border border-[#22375F] space-y-1">
                    <p className="text-[10px] text-slate-400 font-mono uppercase">Status</p>
                    <StatusBadge type={selectedDay.status} size="sm" />
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0B1020] border border-[#22375F] space-y-1">
                    <p className="text-[10px] text-slate-400 font-mono uppercase">Hours Logged</p>
                    <p className="text-sm font-bold font-mono text-cyan-300">{selectedDay.hoursLogged || 0} Hours</p>
                  </div>

                  {selectedDay.notes && (
                    <div className="p-3 rounded-xl bg-[#15223D] border border-[#22375F] text-xs text-slate-300">
                      📝 {selectedDay.notes}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Select a day on the calendar to view full breakdown.</p>
              )}
            </div>

            <div className="pt-4 border-t border-[#22375F] text-[11px] text-slate-400 font-mono">
              Attendance uses fictional sample data in this portal preview.
            </div>
          </Card>
        </div>
      </div>

      {/* Leave Application History Table */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
          Recent Leave Application History
        </h3>
        <DataTable
          columns={columns}
          data={leaveRequests}
          emptyMessage="No leave applications on record."
        />
      </div>

      {/* Apply for Leave Modal */}
      <Modal
        isOpen={applyLeaveOpen}
        onClose={() => setApplyLeaveOpen(false)}
        title="Apply for Planned Leave"
        subtitle="Submit a time off request to your manager"
        maxWidth="md"
      >
        <form onSubmit={handleApplyLeave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Leave Category
            </label>
            <select
              value={leaveType}
              onChange={e => setLeaveType(e.target.value as LeaveType)}
              className="w-full px-3 py-2 rounded-xl bg-[#0B1020] border border-[#22375F] text-xs text-white focus:outline-none focus:border-[#4F7CFF]"
            >
              <option value="Annual Leave">Annual Leave (18 days remaining)</option>
              <option value="Sick Leave">Sick Leave (7 days remaining)</option>
              <option value="Casual / Personal">Casual / Personal (4 days remaining)</option>
              <option value="Wellness Day">Quarterly Wellness Day</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0B1020] border border-[#22375F] text-xs text-white focus:outline-none focus:border-[#4F7CFF]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                End Date
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0B1020] border border-[#22375F] text-xs text-white focus:outline-none focus:border-[#4F7CFF]"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="halfday"
              type="checkbox"
              checked={isHalfDay}
              onChange={e => setIsHalfDay(e.target.checked)}
              className="rounded bg-[#0B1020] border-[#22375F] text-[#4F7CFF] focus:ring-[#4F7CFF]"
            />
            <label htmlFor="halfday" className="ml-2 text-xs text-slate-300 cursor-pointer">
              Half-day request only (0.5 day deduction)
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Reason / Coverage Note
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Taking family holiday; Arjun Mehta will be primary oncall."
              className="w-full p-3 rounded-xl bg-[#0B1020] border border-[#22375F] text-xs text-white focus:outline-none focus:border-[#4F7CFF]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setApplyLeaveOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
              Submit for Manager Approval
            </Button>
          </div>
        </form>
      </Modal>

      {/* Request WFH Modal */}
      <Modal
        isOpen={wfhModalOpen}
        onClose={() => setWfhModalOpen(false)}
        title="Schedule Work From Home"
        subtitle="Log an approved remote work session"
        maxWidth="sm"
      >
        <form onSubmit={handleApplyWfh} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Date
            </label>
            <input
              type="date"
              required
              value={wfhDate}
              onChange={e => setWfhDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#0B1020] border border-[#22375F] text-xs text-white focus:outline-none focus:border-[#4F7CFF]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Work Location & Focus
            </label>
            <input
              type="text"
              value={wfhReason}
              onChange={e => setWfhReason(e.target.value)}
              placeholder="e.g. Home office (Focused design tokens sprint)"
              className="w-full px-3 py-2 rounded-xl bg-[#0B1020] border border-[#22375F] text-xs text-white focus:outline-none focus:border-[#4F7CFF]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setWfhModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Confirm WFH Day
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
