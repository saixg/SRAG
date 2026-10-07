import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Award,
  FileText,
  Edit3,
  Download,
  MessageSquare,
  Plus,
  X,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Globe
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Tabs } from '../components/common/Tabs';
import { StatusBadge } from '../components/common/StatusBadge';
import { ProgressBar } from '../components/common/ProgressBar';
import { Modal } from '../components/common/Modal';
import { downloadFile } from '../utils/downloadFile';

export const Profile: React.FC = () => {
  const { user, updateUserProfile } = useAuth();
  const { showSuccess, showInfo } = useToast();

  const [activeTab, setActiveTab] = useState('overview');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addSkillOpen, setAddSkillOpen] = useState(false);
  const [contactManagerOpen, setContactManagerOpen] = useState(false);

  // Edit form state
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editLocation, setEditLocation] = useState(user?.location || '');
  const [newSkillText, setNewSkillText] = useState('');
  const [managerMessage, setManagerMessage] = useState('');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <User className="w-4 h-4" /> },
    { id: 'personal', label: 'Personal Information', icon: <Mail className="w-4 h-4" /> },
    { id: 'work', label: 'Work Information', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'skills', label: 'Skills & Certifications', icon: <Award className="w-4 h-4" /> },
    { id: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
  ];

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({
      bio: editBio,
      phone: editPhone,
      location: editLocation
    });
    showSuccess('Profile updated', 'Changes are visible in this session. They have not been synced to an HR system.');
    setEditModalOpen(false);
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillText.trim() || !user) return;
    const current = user.skills || [];
    if (!current.includes(newSkillText.trim())) {
      updateUserProfile({ skills: [...current, newSkillText.trim()] });
      showSuccess('Skill Added', newSkillText);
    }
    setNewSkillText('');
    setAddSkillOpen(false);
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    if (!user) return;
    const current = user.skills || [];
    updateUserProfile({ skills: current.filter(s => s !== skillToRemove) });
    showInfo('Skill Removed', skillToRemove);
  };

  const handleContactManager = (e: React.FormEvent) => {
    e.preventDefault();
    showInfo('Message draft saved', 'No message was sent. Connect a company messaging service to contact your manager.');
    setManagerMessage('');
    setContactManagerOpen(false);
  };

  const handleDownloadProfile = () => {
    const profile = [`Name: ${user?.name || ''}`, `Email: ${user?.email || ''}`, `Role: ${user?.roleTitle || ''}`, `Department: ${user?.department || ''}`, `Location: ${user?.location || ''}`, `Employee ID: ${user?.employeeId || ''}`, '', 'Fictional portal preview profile summary.'].join('\n');
    downloadFile('nexus-one-profile-summary.txt', profile);
    showSuccess('Profile summary downloaded', 'A text summary of the visible profile was saved.');
  };

  return (
    <div className="space-y-8">
      {/* Profile Top Banner Card */}
      <Card variant="surface" className="overflow-hidden border-[#22375F]">
        {/* Banner Gradient Header */}
        <div className="h-36 bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-950 p-6 flex justify-end items-start relative">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadProfile}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export PDF
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setEditModalOpen(true)}
              leftIcon={<Edit3 className="w-3.5 h-3.5" />}
            >
              Edit Profile
            </Button>
          </div>
        </div>

        {/* User Info Bar */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 mb-4">
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-[#4F7CFF] via-[#2563EB] to-[#8B6CFF] border-4 border-[#111A2E] flex items-center justify-center text-white text-2xl font-extrabold shadow-2xl shrink-0">
                {user?.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="mb-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl lg:text-2xl font-bold text-white">{user?.name}</h2>
                  <StatusBadge type={user?.role || 'EMPLOYEE'} size="sm" />
                </div>
                <p className="text-xs text-slate-300 font-medium mt-0.5">{user?.roleTitle}</p>
                <p className="text-[11px] text-[#27D8E8] font-mono mt-0.5">{user?.department} • ID: {user?.employeeId}</p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setContactManagerOpen(true)}
              leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
            >
              Contact Manager ({user?.manager.split(' ')[0]})
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#22375F] text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#4F7CFF]" />
              <span className="text-slate-200 truncate">{user?.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#8B6CFF]" />
              <span className="text-slate-200 truncate">{user?.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-3.5 h-3.5 text-[#21C7A8]" />
              <span className="text-slate-200 truncate">Manager: {user?.manager}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-200 truncate">Joined: {user?.joinedDate}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs Navigation */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <Card variant="surface" className="p-6 space-y-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                About Me
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {user?.bio}
              </p>
            </Card>

            <Card variant="surface" className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Primary Skills & Specializations
                </h3>
                <button
                  onClick={() => setAddSkillOpen(true)}
                  className="text-xs text-[#4F7CFF] hover:underline flex items-center gap-1 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Skill
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {user?.skills?.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#1C2D4F] border border-[#22375F] text-xs font-medium text-slate-200 group"
                  >
                    <span>{skill}</span>
                    <button
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-slate-500 hover:text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </Card>

            <Card variant="surface" className="p-6 space-y-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Career Interests & Growth Paths
              </h3>
              <div className="flex flex-wrap gap-2">
                {user?.careerInterests?.map((interest, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-xl bg-purple-950/50 border border-purple-500/40 text-xs font-medium text-purple-200"
                  >
                    ✨ {interest}
                  </span>
                ))}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <Card variant="surface" className="p-5 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Profile Completeness
              </h4>
              <ProgressBar progress={95} color="blue" showLabel />
              <p className="text-[11px] text-slate-400">
                Your profile is 95% complete with verified skills and work details.
              </p>
            </Card>

            <Card variant="surface" className="p-5 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Work Arrangement
              </h4>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Policy:</span>
                  <span className="text-slate-200">{user?.workArrangement}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Time Zone:</span>
                  <span className="text-slate-200">{user?.timeZone}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Working Hours:</span>
                  <span className="text-slate-200">9:00 AM – 6:00 PM</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Personal Information */}
      {activeTab === 'personal' && (
        <Card variant="surface" className="p-6 space-y-4 max-w-2xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Personal & Emergency Contact Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-[#0B1020] border border-[#22375F]">
              <p className="text-[10px] text-slate-400 uppercase font-mono">Personal Email</p>
              <p className="font-semibold text-white mt-0.5">ananya.sharma.personal@nexusdemo.internal</p>
            </div>
            <div className="p-3 rounded-xl bg-[#0B1020] border border-[#22375F]">
              <p className="text-[10px] text-slate-400 uppercase font-mono">Phone Number</p>
              <p className="font-semibold text-white mt-0.5">{user?.phone}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#0B1020] border border-[#22375F]">
              <p className="text-[10px] text-slate-400 uppercase font-mono">Emergency Contact</p>
              <p className="font-semibold text-white mt-0.5">Rajesh Sharma (Spouse) • +91 98765 00000</p>
            </div>
            <div className="p-3 rounded-xl bg-[#0B1020] border border-[#22375F]">
              <p className="text-[10px] text-slate-400 uppercase font-mono">Residential Address</p>
              <p className="font-semibold text-white mt-0.5">Koramangala 4th Block, Bengaluru 560034</p>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 3: Work Information */}
      {activeTab === 'work' && (
        <Card variant="surface" className="p-6 space-y-4 max-w-2xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Organizational Placement & Reporting
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3 rounded-xl bg-[#0B1020] border border-[#22375F]">
              <p className="text-[10px] text-slate-400 uppercase">Department</p>
              <p className="font-bold text-cyan-300 mt-0.5">{user?.department}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#0B1020] border border-[#22375F]">
              <p className="text-[10px] text-slate-400 uppercase">Cost Center</p>
              <p className="font-bold text-white mt-0.5">CC-DES-8810</p>
            </div>
            <div className="p-3 rounded-xl bg-[#0B1020] border border-[#22375F]">
              <p className="text-[10px] text-slate-400 uppercase">Reporting Manager</p>
              <p className="font-bold text-purple-300 mt-0.5">{user?.manager}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#0B1020] border border-[#22375F]">
              <p className="text-[10px] text-slate-400 uppercase">Tenure</p>
              <p className="font-bold text-emerald-300 mt-0.5">3 Years 2 Months</p>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 4: Skills & Certifications */}
      {activeTab === 'skills' && (
        <Card variant="surface" className="p-6 space-y-5">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-2">
              Verified Certifications
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {user?.certifications?.map((cert, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-[#0B1020] border border-[#22375F] flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-500/40">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{cert}</p>
                    <p className="text-[10px] text-slate-400 font-mono">Issued by Nexus Academy</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Tab 5: Documents */}
      {activeTab === 'documents' && (
        <Card variant="surface" className="p-6 space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Employee Documents</h3>
          <div className="rounded-xl border border-dashed border-[#22375F] p-8 text-center">
            <FileText className="w-8 h-8 mx-auto text-slate-400" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-white">No company documents are connected</p>
            <p className="mt-1 text-xs text-slate-400">Official HR documents will appear here when the company document service is configured.</p>
          </div>
        </Card>
      )}

      {/* Edit Profile Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Employee Profile"
        subtitle="Update your contact, location, and bio"
        maxWidth="md"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Professional Bio
            </label>
            <textarea
              rows={3}
              value={editBio}
              onChange={e => setEditBio(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#0B1020] border border-[#22375F] text-xs text-white focus:outline-none focus:border-[#4F7CFF]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Work Location
            </label>
            <input
              type="text"
              value={editLocation}
              onChange={e => setEditLocation(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#0B1020] border border-[#22375F] text-xs text-white focus:outline-none focus:border-[#4F7CFF]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Phone Number
            </label>
            <input
              type="text"
              value={editPhone}
              onChange={e => setEditPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#0B1020] border border-[#22375F] text-xs text-white focus:outline-none focus:border-[#4F7CFF]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Skill Modal */}
      <Modal
        isOpen={addSkillOpen}
        onClose={() => setAddSkillOpen(false)}
        title="Add Skill or Specialization"
        subtitle="Highlight your craft competencies"
        maxWidth="sm"
      >
        <form onSubmit={handleAddSkill} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Skill Name
            </label>
            <input
              type="text"
              required
              value={newSkillText}
              onChange={e => setNewSkillText(e.target.value)}
              placeholder="e.g. Design Systems, React 19"
              className="w-full px-3 py-2 rounded-xl bg-[#0B1020] border border-[#22375F] text-xs text-white focus:outline-none focus:border-[#4F7CFF]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setAddSkillOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Add Skill
            </Button>
          </div>
        </form>
      </Modal>

      {/* Contact Manager Modal */}
      <Modal
        isOpen={contactManagerOpen}
        onClose={() => setContactManagerOpen(false)}
        title={`Message Manager (${user?.manager})`}
        subtitle="Send direct asynchronous inquiry to your manager"
        maxWidth="md"
      >
        <form onSubmit={handleContactManager} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Message Note
            </label>
            <textarea
              rows={4}
              required
              value={managerMessage}
              onChange={e => setManagerMessage(e.target.value)}
              placeholder="Write your note or question here..."
              className="w-full p-3 rounded-xl bg-[#0B1020] border border-[#22375F] text-xs text-white focus:outline-none focus:border-[#4F7CFF]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setContactManagerOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Send Message
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
