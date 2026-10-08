import React, { useState } from 'react';
import {
  Search,
  Mail,
  Calendar,
  MapPin,
  Phone,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { DirectoryEmployee } from '../types';
import { DIRECTORY_EMPLOYEES } from '../data/mockData';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { Drawer } from '../components/common/Drawer';
import { Modal } from '../components/common/Modal';
import { downloadFile } from '../utils/downloadFile';

export const Directory: React.FC = () => {
  const { showInfo } = useToast();
  const [employees] = useState<DirectoryEmployee[]>(DIRECTORY_EMPLOYEES);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');

  // Drawer and modals
  const [selectedEmp, setSelectedEmp] = useState<DirectoryEmployee | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  // Email form state
  const [emailSubject, setEmailSubject] = useState('Quick Collaboration Question');
  const [emailBody, setEmailBody] = useState('');

  const departments = ['ALL', 'Product Experience', 'Engineering', 'People Operations'];
  const locations = ['ALL', 'Bengaluru, India', 'San Francisco, CA', 'London, UK', 'Austin, TX', 'Toronto, Canada'];

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          emp.roleTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          emp.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDept = deptFilter === 'ALL' || emp.department === deptFilter;
    const matchesLoc = locationFilter === 'ALL' || emp.location === locationFilter;
    return matchesSearch && matchesDept && matchesLoc;
  });

  const handleOpenProfile = (emp: DirectoryEmployee) => {
    setSelectedEmp(emp);
    setIsDrawerOpen(true);
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    showInfo('Message draft saved', `No email was sent to ${selectedEmp?.name}. Connect a company mail service to deliver it.`);
    setEmailBody('');
    setEmailModalOpen(false);
  };

  const handleScheduleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const date = String(data.get('meetingDate') || '');
    const time = String(data.get('meetingTime') || '');
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    if (!selectedEmp || ![year, month, day, hour, minute].every(Number.isFinite)) return;
    const stamp = (h: number, m: number) => `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}T${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00`;
    const startMinutes = hour * 60 + minute;
    const endMinutes = startMinutes + 30;
    const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    const calendar = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nexus One//Employee Workspace//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:meeting-${Date.now()}@nexus-one.local`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`, `DTSTART;TZID=Asia/Kolkata:${stamp(hour, minute)}`, `DTEND;TZID=Asia/Kolkata:${stamp(Math.floor(endMinutes / 60) % 24, endMinutes % 60)}`, `SUMMARY:${escape(`Meeting with ${selectedEmp.name}`)}`, `DESCRIPTION:${escape('Import this calendar file to add the meeting. No invitation email was sent.')}`, `LOCATION:${escape(selectedEmp.location)}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    downloadFile('nexus-one-meeting.ics', calendar, 'text/calendar;charset=utf-8');
    showInfo('Calendar file downloaded', `Import the .ics file to add your meeting with ${selectedEmp.name}. No invitation email was sent.`);
    setScheduleModalOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#22375F]">
        <div>
          <h2 className="text-xl lg:text-2xl font-extrabold text-white tracking-tight">
            Company Directory
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Connect and collaborate with colleagues across global Nexus teams and cross-functional pods
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-[#15223D] border border-[#22375F] text-slate-300">
            {filteredEmployees.length} Colleagues Listed
          </span>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <Card variant="surface" className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by colleague name, job title, or skill..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0B1020] border border-[#22375F] text-xs text-white focus:outline-none focus:border-[#4F7CFF]"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#0B1020] border border-[#22375F] text-xs text-white focus:outline-none"
            >
              {departments.map(d => (
                <option key={d} value={d}>
                  {d === 'ALL' ? 'All Departments' : d}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={locationFilter}
              onChange={e => setLocationFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#0B1020] border border-[#22375F] text-xs text-white focus:outline-none"
            >
              {locations.map(l => (
                <option key={l} value={l}>
                  {l === 'ALL' ? 'All Locations' : l}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredEmployees.map(emp => (
          <Card
            key={emp.id}
            variant="surface"
            onClick={() => handleOpenProfile(emp)}
            className="p-5 flex flex-col justify-between cursor-pointer hover:border-[#4F7CFF]/60 transition-all group"
          >
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${emp.avatarColor} flex items-center justify-center text-white text-base font-extrabold shadow relative`}>
                  {emp.avatarInitials}
                  <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-[#111A2E] ${
                    emp.status === 'ONLINE' ? 'bg-emerald-400' : emp.status === 'BUSY' ? 'bg-rose-400' : 'bg-amber-400'
                  }`} />
                </div>
                <StatusBadge type={emp.status} size="sm" />
              </div>

              <h4 className="text-sm font-bold text-white group-hover:text-cyan-200 transition-colors truncate">
                {emp.name}
              </h4>
              <p className="text-xs text-slate-300 truncate mt-0.5">{emp.roleTitle}</p>
              <p className="text-[11px] text-[#27D8E8] font-mono mt-0.5">{emp.department}</p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 text-slate-500 shrink-0" /> {emp.location}
              </p>

              {/* Skills preview tags */}
              <div className="mt-3 flex flex-wrap gap-1">
                {emp.skills.slice(0, 2).map((s, idx) => (
                  <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-[#0B1020] border border-[#22375F] text-slate-300">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#22375F] flex items-center justify-between gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEmp(emp);
                  setEmailModalOpen(true);
                }}
                leftIcon={<Mail className="w-3 h-3" />}
                className="text-xs py-1 px-2"
              >
                Message
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEmp(emp);
                  setScheduleModalOpen(true);
                }}
                leftIcon={<Calendar className="w-3 h-3" />}
                className="text-xs py-1 px-2"
              >
                Sync
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Colleague Detail Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedEmp ? selectedEmp.name : 'Colleague Profile'}
        subtitle={selectedEmp ? `${selectedEmp.roleTitle} • ${selectedEmp.department}` : ''}
        width="md"
      >
        {selectedEmp && (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-[#0B1020] border border-[#22375F] flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${selectedEmp.avatarColor} flex items-center justify-center text-white text-xl font-extrabold shadow shrink-0`}>
                {selectedEmp.avatarInitials}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-white truncate">{selectedEmp.name}</h3>
                <p className="text-xs text-slate-300">{selectedEmp.roleTitle}</p>
                <div className="mt-1">
                  <StatusBadge type={selectedEmp.status} size="sm" />
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-3 rounded-xl bg-[#15223D] border border-[#22375F] flex justify-between">
                <span className="text-slate-400">Work Email:</span>
                <span className="text-white truncate">{selectedEmp.email}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#15223D] border border-[#22375F] flex justify-between">
                <span className="text-slate-400">Office Location:</span>
                <span className="text-cyan-300">{selectedEmp.location}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#15223D] border border-[#22375F] flex justify-between">
                <span className="text-slate-400">Manager:</span>
                <span className="text-purple-300">{selectedEmp.manager}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#15223D] border border-[#22375F] flex justify-between">
                <span className="text-slate-400">Member Since:</span>
                <span className="text-emerald-300">{selectedEmp.joinedYear}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono mb-2">
                Core Competencies & Skills
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedEmp.skills.map((skill, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-xl bg-[#0B1020] border border-[#22375F] text-xs text-slate-200">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-[#22375F] flex gap-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setEmailModalOpen(true)}
                leftIcon={<Mail className="w-4 h-4" />}
                className="flex-1"
              >
                Send Message
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => setScheduleModalOpen(true)}
                leftIcon={<Calendar className="w-4 h-4" />}
                className="flex-1"
              >
                Schedule Meeting
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Send Message Modal */}
      <Modal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        title={`Message ${selectedEmp?.name}`}
        subtitle={`Send asynchronous note to ${selectedEmp?.email}`}
        maxWidth="md"
      >
        <form onSubmit={handleSendEmail} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Subject
            </label>
            <input
              type="text"
              required
              value={emailSubject}
              onChange={e => setEmailSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#0B1020] border border-[#22375F] text-xs text-white focus:outline-none focus:border-[#4F7CFF]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Message Content
            </label>
            <textarea
              rows={4}
              required
              value={emailBody}
              onChange={e => setEmailBody(e.target.value)}
              placeholder="Hi there, reaching out to coordinate on..."
              className="w-full p-3 rounded-xl bg-[#0B1020] border border-[#22375F] text-xs text-white focus:outline-none focus:border-[#4F7CFF]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setEmailModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Send Note
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quick Schedule Modal */}
      <Modal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title={`Schedule Sync with ${selectedEmp?.name}`}
        subtitle="Create a calendar file you can import. This preview cannot send invitations."
        maxWidth="sm"
      >
        <form onSubmit={handleScheduleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Date
            </label>
            <input
              type="date"
              required
              name="meetingDate"
              defaultValue="2026-10-15"
              className="w-full px-3 py-2 rounded-xl bg-[#0B1020] border border-[#22375F] text-xs text-white focus:outline-none focus:border-[#4F7CFF]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Time
            </label>
            <input
              type="time"
              required
              name="meetingTime"
              defaultValue="14:00"
              className="w-full px-3 py-2 rounded-xl bg-[#0B1020] border border-[#22375F] text-xs text-white focus:outline-none focus:border-[#4F7CFF]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setScheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Download .ics file
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
