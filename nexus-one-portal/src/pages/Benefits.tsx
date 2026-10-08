import React, { useState } from 'react';
import {
  Shield,
  Smile,
  Eye,
  HeartPulse,
  Coins,
  Brain,
  Download,
  CheckCircle2,
  PhoneCall,
  ArrowRight,
  Plus
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { BenefitPlan } from '../types';
import { INITIAL_BENEFITS } from '../data/mockData';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { Drawer } from '../components/common/Drawer';
import { Modal } from '../components/common/Modal';
import { downloadFile } from '../utils/downloadFile';

export const Benefits: React.FC = () => {
  const { showSuccess } = useToast();
  const [benefits, setBenefits] = useState<BenefitPlan[]>(INITIAL_BENEFITS);
  const [selectedPlan, setSelectedPlan] = useState<BenefitPlan | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);

  // Enrollment form state
  const [chosenCategory, setChosenCategory] = useState('Health');
  const [tierOption, setTierOption] = useState('Employee + Dependents');
  const [confirmedAgreement, setConfirmedAgreement] = useState(false);

  const handleOpenDetail = (plan: BenefitPlan) => {
    setSelectedPlan(plan);
    setIsDrawerOpen(true);
  };

  const handleDownloadGuide = () => {
    const contents = ['Nexus One Benefits Summary', 'Fictional sample content for portal preview only', '', ...benefits.map(plan => `${plan.title} ? ${plan.status}: ${plan.coverageSummary}`)].join('\n');
    downloadFile('nexus-one-benefits-summary.txt', contents);
    showSuccess('Benefits summary downloaded', 'The sample plan summary was saved as a text file.');
  };

  const handleEnrollmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmedAgreement) return;
    const selected = benefits.find(plan => plan.category.toLowerCase().includes(chosenCategory.toLowerCase())) || benefits[0];
    if (selected) setBenefits(current => current.map(plan => plan.id === selected.id ? { ...plan, status: 'Pending Review' } : plan));
    showSuccess('Selection recorded', `${chosenCategory} (${tierOption}) is marked pending in this local preview.`);
    setConfirmedAgreement(false);
    setEnrollModalOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#22375F]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl lg:text-2xl font-extrabold text-white tracking-tight">
              Benefits & Total Wellness
            </h2>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-semibold">
              ✓ Open Enrollment Active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Explore and manage your global health coverage, dental, retirement match, and wellness stipends
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadGuide}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Download Benefits Guide
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setEnrollModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Modify Elections
          </Button>
        </div>
      </div>

      {/* Benefits Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {benefits.map(plan => {
          let icon = <Shield className="w-5 h-5 text-[#4F7CFF]" />;
          if (plan.category === 'Dental') icon = <Smile className="w-5 h-5 text-cyan-400" />;
          else if (plan.category === 'Vision') icon = <Eye className="w-5 h-5 text-purple-400" />;
          else if (plan.category === 'Wellness') icon = <HeartPulse className="w-5 h-5 text-rose-400" />;
          else if (plan.category === 'Retirement') icon = <Coins className="w-5 h-5 text-amber-400" />;
          else if (plan.category === 'Mental Health') icon = <Brain className="w-5 h-5 text-teal-400" />;

          return (
            <Card
              key={plan.id}
              variant="surface"
              onClick={() => handleOpenDetail(plan)}
              className="p-6 flex flex-col justify-between cursor-pointer hover:border-[#4F7CFF]/50 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-2xl bg-[#0B1020] border border-[#22375F]">
                    {icon}
                  </div>
                  <StatusBadge type={plan.status} size="sm" />
                </div>

                <h3 className="text-base font-bold text-white leading-snug group-hover:text-cyan-200 transition-colors">
                  {plan.title}
                </h3>
                <p className="text-xs text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                  {plan.coverageSummary}
                </p>

                <div className="mt-4 pt-3 border-t border-[#22375F] space-y-1.5 text-xs font-mono text-slate-400">
                  <p className="text-[11px] truncate">Provider: <span className="text-slate-200">{plan.provider}</span></p>
                  <p className="text-[11px]">Contribution: <span className="text-emerald-400">{plan.employerContribution}</span></p>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-[#22375F] flex items-center justify-between text-xs text-[#4F7CFF] font-medium">
                <span>View Plan Coverage</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Plan Detail Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedPlan ? selectedPlan.title : 'Plan Coverage Details'}
        subtitle={selectedPlan ? `Provider: ${selectedPlan.provider}` : ''}
        width="lg"
      >
        {selectedPlan && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <StatusBadge type={selectedPlan.status} />
              <span className="text-xs font-mono text-slate-400">Renewal: {selectedPlan.renewalDate}</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0B1020] border border-[#22375F] space-y-1">
              <p className="text-xs font-bold text-slate-300 font-mono uppercase">Coverage Summary</p>
              <p className="text-xs text-white leading-relaxed">{selectedPlan.coverageSummary}</p>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Key Policy Highlights
              </h4>
              <ul className="space-y-2 text-xs text-slate-200">
                {selectedPlan.details.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#0B1020] border border-[#22375F]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t border-[#22375F] flex gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={handleDownloadGuide}
                leftIcon={<Download className="w-4 h-4" />}
                className="flex-1"
              >
                Download Sample Summary
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Enrollment Modal */}
      <Modal
        isOpen={enrollModalOpen}
        onClose={() => setEnrollModalOpen(false)}
        title="Open Enrollment Election"
        subtitle="Select your tier and confirm benefits coverage for 2026-2027"
        maxWidth="md"
      >
        <form onSubmit={handleEnrollmentSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Benefit Plan Category
            </label>
            <select
              value={chosenCategory}
              onChange={e => setChosenCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#0B1020] border border-[#22375F] text-xs text-white focus:outline-none focus:border-[#4F7CFF]"
            >
              <option value="Comprehensive Health">Comprehensive Global Health Shield</option>
              <option value="Dental & Orthodontic">Dental & Orthodontic Care Plus</option>
              <option value="Vision Care">Vision Care & Optical Wellness</option>
              <option value="Lifestyle Wellness">Quarterly Lifestyle & Wellness ($750)</option>
              <option value="401(k) Match">401(k) Retirement 6% Match</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Coverage Tier
            </label>
            <div className="space-y-2">
              {['Employee Only (100% Nexus Covered)', 'Employee + Spouse / Partner', 'Employee + Family / Dependents'].map(t => (
                <label
                  key={t}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                    tierOption === t ? 'bg-blue-950/40 border-[#4F7CFF] text-white' : 'bg-[#0B1020] border-[#22375F] text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="tier"
                    value={t}
                    checked={tierOption === t}
                    onChange={() => setTierOption(t)}
                    className="text-[#4F7CFF]"
                  />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-start">
            <input
              id="confirmAgree"
              type="checkbox"
              required
              checked={confirmedAgreement}
              onChange={e => setConfirmedAgreement(e.target.checked)}
              className="rounded bg-[#0B1020] border-[#22375F] text-[#4F7CFF] mt-0.5"
            />
            <label htmlFor="confirmAgree" className="ml-2 text-xs text-slate-300 cursor-pointer">
              I authorize Nexus Total Rewards to execute this election and update monthly payroll deductions accordingly.
            </label>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setEnrollModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={!confirmedAgreement}>
              Confirm Election
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
