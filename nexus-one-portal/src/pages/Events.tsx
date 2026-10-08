import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  MapPin,
  Users,
  Clock,
  Video,
  Search,
  CheckCircle2,
  Share2,
  ExternalLink
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Tabs } from '../components/common/Tabs';
import { INITIAL_EVENTS } from '../data/mockData';
import { useToast } from '../context/ToastContext';
import { CompanyEvent } from '../types';
import { downloadFile } from '../utils/downloadFile';
import { getRegisteredEventIds, saveRegisteredEventIds } from '../utils/eventRsvp';
import { useAuth } from '../context/AuthContext';

export const Events: React.FC<{ onNavigate?: (route: string) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [events, setEvents] = useState<CompanyEvent[]>(() => {
    const registered = getRegisteredEventIds(user?.id || 'preview', INITIAL_EVENTS.filter(event => event.isRegistered).map(event => event.id));
    return INITIAL_EVENTS.map(event => ({ ...event, isRegistered: registered.includes(event.id) }));
  });
  const [activeTab, setActiveTab] = useState<'all' | 'registered' | 'past'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<CompanyEvent | null>(null);

  const categories = ['All', 'Town Hall', 'Workshop', 'Culture', 'Wellness', 'Training', 'Team Event'];

  const filteredEvents = events.filter(event => {
    // Search
    if (searchQuery && !event.title.toLowerCase().includes(searchQuery.toLowerCase()) && !event.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Category
    if (selectedCategory !== 'All' && event.category !== selectedCategory) {
      return false;
    }
    // Tab
    if (activeTab === 'registered') {
      return event.isRegistered;
    }
    if (activeTab === 'past') {
      return new Date(event.date).getTime() < Date.now();
    }
    return true;
  });

  const handleToggleRegistration = (id: string) => {
    const event = events.find(item => item.id === id);
    const nextRegistered = event?.isRegistered
      ? events.filter(item => item.isRegistered && item.id !== id).map(item => item.id)
      : [...events.filter(item => item.isRegistered).map(item => item.id), id];
    saveRegisteredEventIds(user?.id || 'preview', nextRegistered);
    setEvents(prev => prev.map(ev => {
      if (ev.id === id) {
        const nextReg = !ev.isRegistered;
        const nextCount = nextReg ? ev.registeredCount + 1 : ev.registeredCount - 1;
        addToast(
          nextReg ? `RSVP saved for "${ev.title}" in this browser preview.` : `RSVP cancelled for "${ev.title}".`,
          nextReg ? 'success' : 'info'
        );
        return { ...ev, isRegistered: nextReg, registeredCount: nextCount };
      }
      return ev;
    }));

    if (selectedEvent?.id === id) {
      setSelectedEvent(prev => prev ? {
        ...prev,
        isRegistered: !prev.isRegistered,
        registeredCount: !prev.isRegistered ? prev.registeredCount + 1 : prev.registeredCount - 1
      } : null);
    }
  };

  const toIcsText = (event: CompanyEvent) => {
    const escapeIcs = (value: string) => value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
    const date = new Date(event.date);
    const times = [...event.time.matchAll(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi)];
    if (Number.isNaN(date.getTime()) || times.length === 0) return null;
    const compact = (match: RegExpMatchArray) => {
      let hour = Number(match[1]) % 12;
      if (match[3].toUpperCase() === 'PM') hour += 12;
      return `${String(date.getFullYear())}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}T${String(hour).padStart(2, '0')}${match[2]}00`;
    };
    const start = compact(times[0]);
    const end = times[1] ? compact(times[1]) : `${start.slice(0, 9)}${String((Number(start.slice(9, 11)) + 1) % 24).padStart(2, '0')}${start.slice(11)}`;
    const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Nexus One//Employee Workspace//EN','CALSCALE:GREGORIAN','BEGIN:VTIMEZONE','TZID:Asia/Kolkata','BEGIN:STANDARD','DTSTART:19700101T000000','TZOFFSETFROM:+0530','TZOFFSETTO:+0530','TZNAME:IST','END:STANDARD','END:VTIMEZONE','BEGIN:VEVENT',`UID:${event.id}@nexus-one.local`,`DTSTAMP:${now}`,`DTSTART;TZID=Asia/Kolkata:${start}`,`DTEND;TZID=Asia/Kolkata:${end}`,`SUMMARY:${escapeIcs(event.title)}`,`DESCRIPTION:${escapeIcs(event.description)}`,`LOCATION:${escapeIcs(event.location)}`,'END:VEVENT','END:VCALENDAR'].join('\r\n');
  };

  const handleAddToCalendar = (event: CompanyEvent) => {
    const calendar = toIcsText(event);
    if (!calendar) { addToast('Calendar export unavailable', 'error', 'This event is missing a valid date or time.'); return; }
    downloadFile(`${event.id}.ics`, calendar, 'text/calendar;charset=utf-8');
    addToast('Calendar file downloaded', 'success', 'Import the .ics file into your calendar app.');
  };

  const handleExportCalendar = () => {
    const entries = events.map(event => { const text = toIcsText(event); if (!text) return null; const start = text.indexOf('BEGIN:VEVENT'); const end = text.indexOf('END:VEVENT', start) + 'END:VEVENT'.length; return start >= 0 && end > start ? text.slice(start, end) : null; }).filter((entry): entry is string => Boolean(entry));
    if (!entries.length) { addToast('No events to export', 'info'); return; }
    const calendar = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Nexus One//Employee Workspace//EN','CALSCALE:GREGORIAN','BEGIN:VTIMEZONE','TZID:Asia/Kolkata','BEGIN:STANDARD','DTSTART:19700101T000000','TZOFFSETFROM:+0530','TZOFFSETTO:+0530','TZNAME:IST','END:STANDARD','END:VTIMEZONE',...entries,'END:VCALENDAR'].join('\r\n');
    downloadFile('nexus-one-events.ics', calendar, 'text/calendar;charset=utf-8');
    addToast('Calendar file downloaded', 'success', 'Import nexus-one-events.ics into Google Calendar or Outlook.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111A2E]/90 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#27D8E8]/10 via-[#4F7CFF]/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            Events & Community
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Town halls, technical workshops, culture sessions, and team gatherings across global offices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            icon={<CalendarIcon className="w-4 h-4" />}
            onClick={handleExportCalendar}
          >
            Download .ics
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Tabs
            tabs={[
              { id: 'all', label: 'Upcoming Events', count: events.length },
              { id: 'registered', label: 'My RSVPs', count: events.filter(e => e.isRegistered).length },
              { id: 'past', label: 'Past Archives' }
            ]}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as any)}
          />

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search events, topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3.5 py-1.5 rounded-xl bg-[#111A2E] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#4F7CFF] w-48 sm:w-60"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-[#4F7CFF] text-white'
                      : 'bg-[#111A2E] text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Events Grid */}
        {filteredEvents.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <CalendarIcon className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">No events match your selection</h3>
              <p className="text-xs text-slate-400 mt-1">Try switching tabs or resetting your search filter.</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map(event => {
              const eventDate = new Date(event.date);
              const month = eventDate.toLocaleString('default', { month: 'short' }).toUpperCase();
              const day = eventDate.getDate() || '15';

              return (
                <Card
                  key={event.id}
                  hover
                  className="flex flex-col justify-between border-slate-800/80 bg-[#111A2E]/80 group"
                >
                  <div>
                    {/* Top Row: Date badge + Category */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-[#4F7CFF]/10 border border-[#4F7CFF]/30 text-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-[#27D8E8] leading-none">{month}</span>
                          <span className="text-lg font-extrabold text-white leading-tight">{day}</span>
                        </div>
                        <div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-[#8B6CFF] border border-slate-700">
                            {event.category}
                          </span>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" /> {event.time}
                          </p>
                        </div>
                      </div>

                      {event.isRegistered && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> RSVP'd
                        </span>
                      )}
                    </div>

                    <h3
                      onClick={() => setSelectedEvent(event)}
                      className="text-base font-bold text-white group-hover:text-[#27D8E8] transition-colors cursor-pointer line-clamp-2"
                    >
                      {event.title}
                    </h3>

                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {event.description}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-800/60 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        {event.isVirtual ? (
                          <Video className="w-3.5 h-3.5 text-[#27D8E8]" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <span className="truncate">{event.location}</span>
                      </div>

                      {event.speaker && (
                        <p className="text-xs text-slate-400">
                          Host: <span className="text-slate-200">{event.speaker}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-500" /> {event.registeredCount} attending
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedEvent(event)}
                      >
                        Details
                      </Button>
                      <Button
                        variant={event.isRegistered ? 'danger' : 'primary'}
                        size="sm"
                        onClick={() => handleToggleRegistration(event.id)}
                        aria-pressed={event.isRegistered}
                        aria-label={event.isRegistered ? `Cancel RSVP for ${event.title}` : `Register for ${event.title}`}
                      >
                        {event.isRegistered ? 'Cancel RSVP' : 'Register'}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Event Details Modal */}
      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title || 'Event Details'}
        subtitle={`${selectedEvent?.category} • ${selectedEvent?.date}`}
      >
        {selectedEvent && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-[#0B1020]/60 border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">About This Session</span>
              <p className="text-sm text-slate-200 leading-relaxed">{selectedEvent.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-[#0B1020]/40 border border-slate-800">
                <span className="text-xs text-slate-400">Time & Duration</span>
                <p className="text-sm font-semibold text-white mt-0.5">{selectedEvent.time}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0B1020]/40 border border-slate-800">
                <span className="text-xs text-slate-400">Location</span>
                <p className="text-sm font-semibold text-white mt-0.5">{selectedEvent.location}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0B1020]/40 border border-slate-800">
                <span className="text-xs text-slate-400">Host / Keynote</span>
                <p className="text-sm font-semibold text-white mt-0.5">{selectedEvent.speaker || 'Nexus Operations'}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0B1020]/40 border border-slate-800">
                <span className="text-xs text-slate-400">Confirmed Attendees</span>
                <p className="text-sm font-semibold text-white mt-0.5">{selectedEvent.registeredCount} colleagues</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                icon={<CalendarIcon className="w-4 h-4" />}
                onClick={() => handleAddToCalendar(selectedEvent)}
              >
                Add to Calendar
              </Button>

              <div className="flex gap-2">
                {onNavigate && <Button variant="secondary" size="sm" onClick={() => { setSelectedEvent(null); onNavigate('support'); }}>Event help</Button>}
                <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(null)}>Close</Button>
                <Button
                  variant={selectedEvent.isRegistered ? 'danger' : 'primary'}
                  size="sm"
                  onClick={() => handleToggleRegistration(selectedEvent.id)}
                >
                  {selectedEvent.isRegistered ? 'Cancel RSVP' : 'Confirm RSVP'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
