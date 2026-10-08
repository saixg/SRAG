import React, { useState } from 'react';
import {
  Receipt,
  Download,
  DollarSign,
  PieChart,
  TrendingUp,
  FileText,
  HelpCircle,
  Eye,
  Lock
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { Payslip } from '../types';
import { PAYSLIPS_LIST } from '../data/mockData';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { MetricCard } from '../components/common/MetricCard';
import { DataTable, Column } from '../components/common/DataTable';
import { Drawer } from '../components/common/Drawer';
import { Modal } from '../components/common/Modal';
import { downloadFile } from '../utils/downloadFile';

export const Payroll: React.FC = () => {
  const { showSuccess, showInfo } = useToast();
  const [payslips] = useState<Payslip[]>(PAYSLIPS_LIST);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(payslips[0]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [inquiryText, setInquiryText] = useState('');

  const currentSlip = payslips[0];

  const handleDownload = (ps: Payslip, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const csvValue = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const rows = [
      ['Nexus One sample payroll statement', `${ps.month} ${ps.year}`],
      ['Notice', 'Fictional sample data for portal preview only'],
      ['Pay date', ps.payDate], ['Gross pay', ps.grossPay], ['Net pay', ps.netPay],
      ['Base pay', ps.baseSalary], ['Housing allowance', ps.housingAllowance],
      ['Wellness allowance', ps.wellnessAllowance], ['Tax deduction', ps.taxDeduction],
      ['Retirement contribution', ps.providentFund], ['Benefits contribution', ps.insuranceContribution],
    ].map(row => row.map(value => csvValue(value)).join(',')).join('\r\n');
    downloadFile(`nexus-one-sample-payslip-${ps.year}-${ps.month.toLowerCase().replace(/\s+/g, '-')}.csv`, rows, 'text/csv;charset=utf-8');
    showSuccess('Statement downloaded', 'A CSV file with fictional sample payroll values was saved.');
  };

  const handleOpenDetail = (ps: Payslip) => {
    setSelectedPayslip(ps);
    setIsDrawerOpen(true);
  };

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showInfo('Inquiry saved in preview', 'No message was sent to a payroll system.');
    setInquiryText('');
    setSupportModalOpen(false);
  };

  const columns: Column<Payslip>[] = [
    {
      key: 'period',
      header: 'Pay Period',
      render: (ps) => (
        <span className="font-bold text-white text-xs">{ps.month} {ps.year}</span>
      )
    },
    {
      key: 'payDate',
      header: 'Disbursement Date',
      render: (ps) => (
        <span className="text-xs font-mono text-slate-300">{ps.payDate}</span>
      )
    },
    {
      key: 'gross',
      header: 'Gross Earnings',
      render: (ps) => (
        <span className="text-xs font-mono text-slate-200">${ps.grossPay.toLocaleString()}</span>
      )
    },
    {
      key: 'net',
      header: 'Net Disbursed',
      render: (ps) => (
        <span className="text-xs font-mono text-emerald-400 font-bold">${ps.netPay.toLocaleString()}</span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (ps) => <StatusBadge type={ps.status} size="sm" />
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (ps) => (
        <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenDetail(ps)}
            leftIcon={<Eye className="w-3 h-3" />}
          >
            View Breakdown
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => handleDownload(ps, e)}
            leftIcon={<Download className="w-3 h-3" />}
          >
            PDF
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-8">
      {/* Page Header with synthetic notice */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#22375F]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl lg:text-2xl font-extrabold text-white tracking-tight">
              Payroll & Compensation
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-500/30 font-semibold">
              Synthetic Demo Data
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Review your monthly salary disbursements, tax withholding, and benefit contributions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSupportModalOpen(true)}
            leftIcon={<HelpCircle className="w-3.5 h-3.5" />}
          >
            Payroll Support
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleDownload(currentSlip)}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Download CSV Statement
          </Button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Net Disbursed (Sep)"
          value={`$${currentSlip.netPay.toLocaleString()}`}
          subtext="Deposited on Sep 30, 2026"
          icon={<Receipt className="w-5 h-5" />}
          accentColor="green"
        />
        <MetricCard
          label="Gross Salary (Sep)"
          value={`$${currentSlip.grossPay.toLocaleString()}`}
          subtext="Base + allowances"
          icon={<DollarSign className="w-5 h-5" />}
          accentColor="blue"
        />
        <MetricCard
          label="Total Deductions (Sep)"
          value={`$${(currentSlip.grossPay - currentSlip.netPay).toLocaleString()}`}
          subtext="Tax + 401(k) + Insurance"
          icon={<PieChart className="w-5 h-5" />}
          accentColor="amber"
        />
        <MetricCard
          label="YTD Earnings 2026"
          value="$112,500"
          subtext="9 pay cycles completed"
          icon={<TrendingUp className="w-5 h-5" />}
          accentColor="violet"
        />
      </div>

      {/* Breakdown: Earnings vs Deductions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Earnings Card (6 cols) */}
        <div className="lg:col-span-6">
          <Card variant="surface" className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#22375F]">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Monthly Earnings Breakdown
              </h3>
              <span className="text-xs font-mono font-bold text-cyan-300">
                ${currentSlip.grossPay.toLocaleString()}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-3 rounded-xl bg-[#0B1020] border border-[#22375F]">
                <div>
                  <p className="font-semibold text-white">Base Professional Salary</p>
                  <p className="text-[10px] text-slate-400 font-mono">Fixed monthly remuneration</p>
                </div>
                <span className="font-mono text-white font-bold">${currentSlip.baseSalary.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-[#0B1020] border border-[#22375F]">
                <div>
                  <p className="font-semibold text-white">Housing & Flexible Work Allowance</p>
                  <p className="text-[10px] text-slate-400 font-mono">Monthly standard allowance</p>
                </div>
                <span className="font-mono text-white font-bold">${currentSlip.housingAllowance.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-[#0B1020] border border-[#22375F]">
                <div>
                  <p className="font-semibold text-white">Lifestyle & Wellness Stipend</p>
                  <p className="text-[10px] text-slate-400 font-mono">Health & fitness credit</p>
                </div>
                <span className="font-mono text-white font-bold">${currentSlip.wellnessAllowance.toLocaleString()}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Deductions Card (6 cols) */}
        <div className="lg:col-span-6">
          <Card variant="surface" className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#22375F]">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Monthly Deductions & Withholdings
              </h3>
              <span className="text-xs font-mono font-bold text-amber-300">
                ${(currentSlip.grossPay - currentSlip.netPay).toLocaleString()}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-3 rounded-xl bg-[#0B1020] border border-[#22375F]">
                <div>
                  <p className="font-semibold text-white">Income Tax Withholding (PAYE)</p>
                  <p className="text-[10px] text-slate-400 font-mono">Federal & regional taxes</p>
                </div>
                <span className="font-mono text-amber-300 font-bold">-${currentSlip.taxDeduction.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-[#0B1020] border border-[#22375F]">
                <div>
                  <p className="font-semibold text-white">401(k) / Provident Fund Match</p>
                  <p className="text-[10px] text-slate-400 font-mono">6% employee retirement savings</p>
                </div>
                <span className="font-mono text-amber-300 font-bold">-${currentSlip.providentFund.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-[#0B1020] border border-[#22375F]">
                <div>
                  <p className="font-semibold text-white">Voluntary Health & Dental Shield</p>
                  <p className="text-[10px] text-slate-400 font-mono">Dependent medical contribution</p>
                </div>
                <span className="font-mono text-amber-300 font-bold">-${currentSlip.insuranceContribution.toLocaleString()}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Historical Payslips Table */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
          Payslip & Tax Statement History
        </h3>
        <DataTable
          columns={columns}
          data={payslips}
          onRowClick={handleOpenDetail}
        />
      </div>

      {/* Payslip Detail Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedPayslip ? `${selectedPayslip.month} ${selectedPayslip.year} Payslip` : 'Payslip Breakdown'}
        subtitle={selectedPayslip ? `Disbursed on ${selectedPayslip.payDate}` : ''}
        width="lg"
      >
        {selectedPayslip && (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-[#0B1020] border border-[#22375F] space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Employee Name:</span>
                <span className="text-white font-sans font-bold">Ananya Sharma (NX-1042)</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Department:</span>
                <span className="text-white font-sans">Product Experience</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Bank Account:</span>
                <span className="text-cyan-300">•••• •••• •••• 4492 (Nexus Direct Deposit)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-[#15223D] border border-[#22375F]">
                <p className="text-[10px] text-slate-400 uppercase">Gross Earnings</p>
                <p className="text-base font-bold text-white mt-1">${selectedPayslip.grossPay.toLocaleString()}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#15223D] border border-[#22375F]">
                <p className="text-[10px] text-slate-400 uppercase">Net Disbursed</p>
                <p className="text-base font-bold text-emerald-400 mt-1">${selectedPayslip.netPay.toLocaleString()}</p>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => handleDownload(selectedPayslip)}
              leftIcon={<Download className="w-4 h-4" />}
              className="w-full"
            >
              Download CSV Statement
            </Button>
          </div>
        )}
      </Drawer>

      {/* Support Inquiry Modal */}
      <Modal
        isOpen={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
        title="Contact Payroll Operations"
        subtitle="Submit a confidential inquiry to the compensation desk"
        maxWidth="md"
      >
        <form onSubmit={handleSupportSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Inquiry Details
            </label>
            <textarea
              rows={4}
              required
              value={inquiryText}
              onChange={e => setInquiryText(e.target.value)}
              placeholder="Detail your question regarding tax withholding, allowances, or pay slips..."
              className="w-full p-3 rounded-xl bg-[#0B1020] border border-[#22375F] text-xs text-white focus:outline-none focus:border-[#4F7CFF]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setSupportModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Submit Inquiry
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
