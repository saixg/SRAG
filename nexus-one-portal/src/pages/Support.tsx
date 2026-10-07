import React, { useState } from 'react';
import {
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  LifeBuoy,
  Laptop,
  Building,
  CreditCard,
  ShieldCheck,
  Plus,
  Clock,
  CheckCircle2,
  MessageSquare,
  FileText,
  AlertCircle
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { Drawer } from '../components/common/Drawer';
import { INITIAL_FAQS, INITIAL_TICKETS } from '../data/mockData';
import { useToast } from '../context/ToastContext';
import { SupportTicket, TicketPriority, TicketStatus } from '../types';

export const Support: React.FC = () => {
  const { addToast } = useToast();
  const [faqs, setFaqs] = useState(INITIAL_FAQS);
  const [tickets, setTickets] = useState<SupportTicket[]>(INITIAL_TICKETS);
  const [expandedFaq, setExpandedFaq] = useState<string | null>('faq_01');
  const [searchQuery, setSearchQuery] = useState('');

  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // New ticket form
  const [ticketCategory, setTicketCategory] = useState<'IT Help Desk' | 'People Operations' | 'Facilities' | 'Payroll Support' | 'Workplace Services'>('IT Help Desk');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketPriority, setTicketPriority] = useState<TicketPriority>('Medium');

  const filteredFaqs = faqs.filter(faq => {
    if (!searchQuery) return true;
    return faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
           faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
           faq.category.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDescription.trim()) return;

    const newTicket: SupportTicket = {
      id: `TCK-${Date.now().toString().slice(-4)}`,
      subject: ticketSubject,
      category: ticketCategory,
      status: 'Open',
      priority: ticketPriority,
      createdAt: 'Just now',
      lastUpdated: 'Just now',
      description: ticketDescription
    };

    setTickets([newTicket, ...tickets]);
    setTicketSubject('');
    setTicketDescription('');
    setIsTicketModalOpen(false);
    addToast(`Support ticket ${newTicket.id} saved in preview`, 'success', 'It has not been sent to a company support system.');
  };

  const supportDesks = [
    { title: 'IT Help Desk', desc: 'Hardware, VPN, software licenses & network access', icon: Laptop, email: 'it-support@nexus.demo', sla: '< 2 hrs' },
    { title: 'People Operations', desc: 'Benefits, leaves, onboarding & policy guidance', icon: ShieldCheck, email: 'people-ops@nexus.demo', sla: '< 4 hrs' },
    { title: 'Facilities', desc: 'Desk seating, badges, office supplies & parking', icon: Building, email: 'facilities@nexus.demo', sla: '< 24 hrs' },
    { title: 'Payroll Support', desc: 'Tax withholding, payslips & compensation queries', icon: CreditCard, email: 'payroll@nexus.demo', sla: '< 12 hrs' }
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111A2E]/90 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#4F7CFF]/10 via-[#27D8E8]/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            Help & Enterprise Support
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Search knowledge articles, explore FAQs, or submit an incident ticket to IT, People Ops, or Facilities.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsTicketModalOpen(true)}
          >
            Open Support Ticket
          </Button>
        </div>
      </div>

      {/* Search Header */}
      <div className="relative max-w-2xl mx-auto my-4">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search support articles, answers, policies (e.g. leave, vpn, payslip)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-[#111A2E] border border-slate-800 text-sm text-white placeholder-slate-500 shadow-xl focus:outline-none focus:border-[#4F7CFF] transition-all"
        />
      </div>

      {/* Support Desks Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {supportDesks.map((desk, idx) => {
          const Icon = desk.icon;
          return (
            <Card key={idx} hover className="flex flex-col justify-between border-slate-800/80 bg-[#111A2E]/70">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#4F7CFF]/10 border border-[#4F7CFF]/20 flex items-center justify-center text-[#4F7CFF] mb-3">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">{desk.title}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{desk.desc}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-slate-500">SLA: {desk.sla}</span>
                <button
                  onClick={() => {
                    setTicketCategory(desk.title as any);
                    setIsTicketModalOpen(true);
                  }}
                  className="text-[#27D8E8] font-medium hover:underline"
                >
                  Contact →
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Split: FAQ Accordion & Active Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* FAQs (7 cols) */}
        <div className="lg:col-span-7">
          <Card
            title="Frequently Asked Questions"
            subtitle="Standard answers to workplace and system queries"
            action={<span className="text-xs text-slate-400">{filteredFaqs.length} articles</span>}
          >
            <div className="space-y-3">
              {filteredFaqs.map(faq => {
                const isOpen = expandedFaq === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="border border-slate-800/80 rounded-xl overflow-hidden bg-[#0B1020]/40 transition-colors"
                  >
                    <button
                      onClick={() => setExpandedFaq(isOpen ? null : faq.id)}
                      className="w-full py-3.5 px-4 flex items-center justify-between text-left hover:bg-slate-900/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-[#4F7CFF]">
                          {faq.category}
                        </span>
                        <span className="text-sm font-medium text-slate-200">{faq.question}</span>
                      </div>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 text-xs text-slate-300 leading-relaxed border-t border-slate-800/40 bg-slate-950/20">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Support Tickets (5 cols) */}
        <div className="lg:col-span-5">
          <Card
            title="Your Support Tickets"
            subtitle="Live status of raised incidents and queries"
            action={<span className="text-xs text-[#27D8E8] font-medium">{tickets.length} Active</span>}
          >
            <div className="space-y-3">
              {tickets.map(ticket => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className="p-3.5 rounded-xl bg-[#0B1020]/60 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400">{ticket.id}</span>
                    <StatusBadge type={ticket.status} />
                  </div>
                  <h4 className="text-sm font-semibold text-white line-clamp-1">{ticket.subject}</h4>
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/40">
                    <span>{ticket.category}</span>
                    <span>Updated {ticket.lastUpdated}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Ticket Details Drawer */}
      <Drawer
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title={selectedTicket?.subject || 'Support Ticket Details'}
      >
        {selectedTicket && (
          <div className="space-y-5">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B1020]/60 border border-slate-800">
              <span className="font-mono text-xs text-slate-400">{selectedTicket.id}</span>
              <StatusBadge type={selectedTicket.status} />
            </div>

            <div className="p-4 rounded-xl bg-[#0B1020]/40 border border-slate-800 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Issue Description</h4>
              <p className="text-xs text-slate-200 leading-relaxed">{selectedTicket.description}</p>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center p-3 rounded-xl bg-[#0B1020]/30 border border-slate-800">
                <span className="text-xs text-slate-400">Category</span>
                <span className="text-xs font-semibold text-white">{selectedTicket.category}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-[#0B1020]/30 border border-slate-800">
                <span className="text-xs text-slate-400">Priority</span>
                <span className="text-xs font-semibold text-amber-400">{selectedTicket.priority}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-[#0B1020]/30 border border-slate-800">
                <span className="text-xs text-slate-400">Created Date</span>
                <span className="text-xs font-semibold text-white">{selectedTicket.createdAt}</span>
              </div>
            </div>

            <div className="pt-4 flex gap-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  addToast(`Live chat initiated for ${selectedTicket.id}`, 'info');
                }}
              >
                Chat with Help Desk
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* New Ticket Modal */}
      <Modal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        title="Open Support Ticket"
        subtitle="Submit an issue or service request to enterprise internal teams"
      >
        <form onSubmit={handleCreateTicket} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Category
            </label>
            <select
              value={ticketCategory}
              onChange={(e) => setTicketCategory(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1020] border border-slate-800 text-sm text-white focus:outline-none focus:border-[#4F7CFF]"
            >
              <option value="IT Help Desk">IT Help Desk & Access</option>
              <option value="People Operations">People Operations & Policies</option>
              <option value="Payroll Support">Payroll & Compensation</option>
              <option value="Facilities">Workplace & Facilities</option>
              <option value="Workplace Services">Workplace Services</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Subject Summary
            </label>
            <input
              type="text"
              required
              value={ticketSubject}
              onChange={(e) => setTicketSubject(e.target.value)}
              placeholder="e.g. Requesting Figma Organization License renewal"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1020] border border-slate-800 text-sm text-white focus:outline-none focus:border-[#4F7CFF]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Detailed Description
            </label>
            <textarea
              required
              rows={4}
              value={ticketDescription}
              onChange={(e) => setTicketDescription(e.target.value)}
              placeholder="Please describe the issue, error codes, hardware models, or steps to reproduce..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1020] border border-slate-800 text-sm text-white focus:outline-none focus:border-[#4F7CFF]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Priority Level
            </label>
            <select
              value={ticketPriority}
              onChange={(e) => setTicketPriority(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1020] border border-slate-800 text-sm text-white focus:outline-none focus:border-[#4F7CFF]"
            >
              <option value="Low">Low - General query</option>
              <option value="Medium">Medium - Standard workflow issue</option>
              <option value="High">High - Impeding daily work</option>
              <option value="Critical">Critical - Complete blocker / security incident</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsTicketModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Submit Ticket</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
