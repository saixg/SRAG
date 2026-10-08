import React, { useState } from 'react';
import { Video } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useToast } from '../../context/ToastContext';
import { DIRECTORY_EMPLOYEES } from '../../data/mockData';
import { downloadFile } from '../../utils/downloadFile';

export interface QuickScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultColleagueId?: string;
}

export const QuickScheduleModal: React.FC<QuickScheduleModalProps> = ({
  isOpen,
  onClose,
  defaultColleagueId
}) => {
  const { showSuccess } = useToast();
  const [selectedColleague, setSelectedColleague] = useState(defaultColleagueId || 'emp_02');
  const [title, setTitle] = useState('Design Review & Multi-Brand Tokens Sync');
  const [date, setDate] = useState('2026-10-14');
  const [time, setTime] = useState('14:00');
  const [duration, setDuration] = useState('30');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const date = new FormData(form).get('meetingDate')?.toString() || '';
    const time = new FormData(form).get('meetingTime')?.toString() || '';
    const colleague = DIRECTORY_EMPLOYEES.find(person => person.id === selectedColleague);
    if (!date || !time || !colleague) return;
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    if (![year, month, day, hour, minute].every(Number.isFinite)) return;
    const start = new Date(Date.UTC(year, month - 1, day, hour, minute));
    const end = new Date(start.getTime() + Number(duration) * 60_000);
    const compact = (value: Date) => `${value.getUTCFullYear()}${String(value.getUTCMonth()+1).padStart(2,'0')}${String(value.getUTCDate()).padStart(2,'0')}T${String(value.getUTCHours()).padStart(2,'0')}${String(value.getUTCMinutes()).padStart(2,'0')}00`;
    const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
    const calendar = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Nexus One//Employee Workspace//EN','BEGIN:VEVENT',`UID:meeting-${Date.now()}@nexus-one.local`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,`DTSTART;TZID=Asia/Kolkata:${compact(start)}`,`DTEND;TZID=Asia/Kolkata:${compact(end)}`,`SUMMARY:${escape(title)}`,`DESCRIPTION:${escape(`Meeting with ${colleague.name}. Import this file to create the event; no invite was sent.`)}`,`LOCATION:${escape(colleague.location)}`,'END:VEVENT','END:VCALENDAR'].join('\r\n');
    downloadFile('nexus-one-meeting.ics', calendar, 'text/calendar;charset=utf-8');
    showSuccess('Calendar event downloaded', 'Import the .ics file into your calendar app. No invitation was sent.');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create a calendar event"
      subtitle="Download an event file you can import into your calendar. No invite is sent."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Meeting Topic
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-[#0B1020] border border-[#22375F] text-xs text-white focus:outline-none focus:border-[#4F7CFF]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Select Colleague
          </label>
          <select
            value={selectedColleague}
            onChange={e => setSelectedColleague(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-[#0B1020] border border-[#22375F] text-xs text-white focus:outline-none focus:border-[#4F7CFF]"
          >
            {DIRECTORY_EMPLOYEES.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.name} — {emp.roleTitle} ({emp.department})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#0B1020] border border-[#22375F] text-xs text-white focus:outline-none focus:border-[#4F7CFF]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Time
            </label>
            <input
              type="time"
              required
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#0B1020] border border-[#22375F] text-xs text-white focus:outline-none focus:border-[#4F7CFF]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Duration
          </label>
          <div className="grid grid-cols-3 gap-2">
            {['15', '30', '45'].map(d => (
              <button
                type="button"
                key={d}
                onClick={() => setDuration(d)}
                className={`py-2 text-xs rounded-xl border font-medium transition-colors ${
                  duration === d
                    ? 'bg-[#4F7CFF]/20 border-[#4F7CFF] text-[#4F7CFF]'
                    : 'bg-[#0B1020] border-[#22375F] text-slate-400 hover:text-white'
                }`}
              >
                {d} minutes
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#15223D] border border-[#22375F] text-xs text-slate-300 flex items-center gap-2">
          <Video className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>A calendar file will be downloaded for you to import. No email or meeting link is sent from this preview.</span>
        </div>

        <div className="pt-3 border-t border-[#22375F] flex justify-end gap-2">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit">
            Download .ics file
          </Button>
        </div>
      </form>
    </Modal>
  );
};
