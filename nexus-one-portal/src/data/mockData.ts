import {
  User,
  UserRole,
  Announcement,
  LeaveRequest,
  AttendanceDay,
  Payslip,
  BenefitPlan,
  Course,
  DirectoryEmployee,
  TeamObjective,
  TaskItem,
  CompanyEvent,
  SupportTicket,
  FaqItem,
  NotificationItem,
  UserSettings
} from '../types';

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann_01',
    title: 'Nexus Launches Next-Generation Collaborative Design Tokens Architecture',
    summary: 'Our engineering and design teams have successfully rolled out the unified multi-platform token pipeline across all Nexus digital products.',
    content: `We are thrilled to announce the official release of our next-generation collaborative design system tokens. Over the past six months, cross-functional teams across Bengaluru, London, and San Francisco have unified our color, typography, and elevation standards.

### Key Milestones:
- **Zero-drift multi-platform syncing:** Automated Figma-to-code pipelines for React, iOS, and Android.
- **Enhanced accessibility:** All token pairs meet or exceed WCAG 2.2 AAA contrast standards.
- **Developer velocity:** Component assembly time reduced by an estimated 35%.

A huge congratulations to the Product Experience and Platform Engineering pods for this landmark milestone!`,
    category: 'Product Updates',
    author: 'Daniel Morgan',
    authorRole: 'VP, Product Experience',
    publishedAt: 'Today, 9:30 AM',
    readTime: '3 min read',
    isPinned: true,
    isRead: false,
    isBookmarked: true,
    likesCount: 68,
    commentsCount: 14,
    gradient: 'from-blue-600/40 via-cyan-600/30 to-transparent'
  },
  {
    id: 'ann_02',
    title: 'Annual Global Hackathon 2026: "Innovate Together" Registrations Open',
    summary: 'Join over 1,200 colleagues across 14 global offices for our 48-hour internal innovation hackathon with $50,000 in project incubation grants.',
    content: `Get ready to build, collaborate, and push boundaries! The Nexus Annual Hackathon returns this November. Whether you are in Engineering, People Ops, Design, or Finance, this is your opportunity to team up and solve real workplace and customer challenges.`,
    category: 'Events',
    author: 'Sofia Williams',
    authorRole: 'People Operations',
    publishedAt: 'Yesterday',
    readTime: '2 min read',
    isPinned: true,
    isRead: false,
    likesCount: 124,
    commentsCount: 32,
    gradient: 'from-purple-600/40 via-violet-600/30 to-transparent'
  },
  {
    id: 'ann_03',
    title: 'Updated Global Wellness Days and Recharge Policy for Q4',
    summary: 'To promote sustained work-life balance, Nexus is adding 2 dedicated quarterly company-wide recharge days for all full-time employees.',
    content: `Employee wellbeing remains our foundational commitment. Starting this quarter, all teams will observe company-wide recharge days on the last Friday of October and November.`,
    category: 'Benefits',
    author: 'Sofia Williams',
    authorRole: 'People Operations',
    publishedAt: 'Oct 04, 2026',
    readTime: '2 min read',
    isRead: true,
    likesCount: 210,
    commentsCount: 19,
    gradient: 'from-teal-600/40 via-emerald-600/30 to-transparent'
  },
  {
    id: 'ann_04',
    title: 'Nexus Cloud Infrastructure Migration Reaches 100% Milestone',
    summary: 'All core microservices have transitioned to modern serverless and containerized clusters with zero customer downtime.',
    content: `Our SecOps and Cloud Infrastructure teams have successfully completed the migration of all remaining legacy services into high-performance, auto-scaling Kubernetes nodes.`,
    category: 'Technology',
    author: 'Ethan Brown',
    authorRole: 'Engineering Manager',
    publishedAt: 'Sep 28, 2026',
    readTime: '4 min read',
    isRead: true,
    likesCount: 89,
    commentsCount: 8,
    gradient: 'from-cyan-600/40 via-blue-600/30 to-transparent'
  },
  {
    id: 'ann_05',
    title: 'Introducing the Nexus Mentorship Fellowship: Cohort 4',
    summary: 'Applications are now live for mentors and mentees looking to accelerate their craft, product thinking, and leadership trajectory.',
    content: `The Nexus Mentorship Fellowship pairs emerging professionals with senior leaders across cross-functional departments for structured 6-month mentorship sprints.`,
    category: 'People & Culture',
    author: 'Isha Verma',
    authorRole: 'Learning Program Manager',
    publishedAt: 'Sep 22, 2026',
    readTime: '3 min read',
    isRead: true,
    likesCount: 142,
    commentsCount: 27,
    gradient: 'from-violet-600/40 via-purple-600/30 to-transparent'
  }
];

export const INITIAL_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: 'lreq_01',
    type: 'Annual Leave',
    startDate: '2026-10-24',
    endDate: '2026-10-28',
    days: 5,
    reason: 'Family holiday and personal travel.',
    status: 'Approved',
    appliedOn: '2026-10-02',
    approver: 'Daniel Morgan'
  },
  {
    id: 'lreq_02',
    type: 'Wellness Day',
    startDate: '2026-10-15',
    endDate: '2026-10-15',
    days: 1,
    reason: 'Quarterly health checkup and wellness day.',
    status: 'Approved',
    appliedOn: '2026-09-28',
    approver: 'Daniel Morgan'
  },
  {
    id: 'lreq_03',
    type: 'Casual / Personal',
    startDate: '2026-11-12',
    endDate: '2026-11-13',
    days: 2,
    reason: 'Personal family commitments.',
    status: 'Pending',
    appliedOn: '2026-10-06',
    approver: 'Daniel Morgan'
  }
];

export const ATTENDANCE_CALENDAR_DAYS: AttendanceDay[] = Array.from({ length: 31 }, (_, i) => {
  const day = i + 1;
  const isWeekend = day % 7 === 4 || day % 7 === 5; // simulated weekend pattern
  let status: AttendanceDay['status'] = 'PRESENT';
  let hours = 8.5;

  if (isWeekend) {
    status = 'WEEKEND';
    hours = 0;
  } else if (day === 2 || day === 16) {
    status = 'HOLIDAY';
    hours = 0;
  } else if (day === 15) {
    status = 'LEAVE';
    hours = 0;
  } else if (day % 3 === 0) {
    status = 'WFH';
    hours = 8.0;
  }

  return {
    date: `2026-10-${day < 10 ? '0' + day : day}`,
    dayNumber: day,
    dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day % 7],
    status,
    hoursLogged: hours,
    notes: status === 'HOLIDAY' ? 'Nexus Autumn Festival' : status === 'WFH' ? 'Work from home approved' : undefined
  };
});

export const PAYSLIPS_LIST: Payslip[] = [
  {
    id: 'ps_sep_2026',
    month: 'September',
    year: 2026,
    payDate: 'Sep 30, 2026',
    grossPay: 12500,
    netPay: 9850,
    status: 'Paid',
    baseSalary: 10000,
    housingAllowance: 1500,
    wellnessAllowance: 1000,
    taxDeduction: 1850,
    providentFund: 500,
    insuranceContribution: 300
  },
  {
    id: 'ps_aug_2026',
    month: 'August',
    year: 2026,
    payDate: 'Aug 31, 2026',
    grossPay: 12500,
    netPay: 9850,
    status: 'Paid',
    baseSalary: 10000,
    housingAllowance: 1500,
    wellnessAllowance: 1000,
    taxDeduction: 1850,
    providentFund: 500,
    insuranceContribution: 300
  },
  {
    id: 'ps_jul_2026',
    month: 'July',
    year: 2026,
    payDate: 'Jul 31, 2026',
    grossPay: 12500,
    netPay: 9850,
    status: 'Paid',
    baseSalary: 10000,
    housingAllowance: 1500,
    wellnessAllowance: 1000,
    taxDeduction: 1850,
    providentFund: 500,
    insuranceContribution: 300
  }
];

export const INITIAL_BENEFITS: BenefitPlan[] = [
  {
    id: 'ben_01',
    title: 'Comprehensive Global Health Shield (Tier 1)',
    category: 'Health',
    status: 'Enrolled',
    coverageSummary: '$1,000,000 Major Medical & Hospitalization with zero in-network deductible.',
    provider: 'Nexus Health Alliance (BlueCross)',
    renewalDate: 'Dec 31, 2026',
    employerContribution: '100% covered by Nexus',
    details: [
      'In-network preventative care covered at 100%',
      'Worldwide emergency evacuation and outpatient coverage',
      'Prescription drug co-pay capped at $15 for brand-name equivalents',
      'Direct billing at all partner clinics in 45 countries'
    ],
    iconName: 'Shield'
  },
  {
    id: 'ben_02',
    title: 'Dental & Orthodontic Care Plus',
    category: 'Dental',
    status: 'Enrolled',
    coverageSummary: 'Annual $3,500 maximum coverage with 100% preventative cleaning & 80% restorative.',
    provider: 'Delta Dental Premier',
    renewalDate: 'Dec 31, 2026',
    employerContribution: '90% covered by Nexus',
    details: [
      'Two free cleanings and comprehensive x-rays per year',
      'Orthodontic adult and dependent benefit up to $2,500 lifetime',
      'Emergency dental care coverage worldwide'
    ],
    iconName: 'Smile'
  },
  {
    id: 'ben_03',
    title: 'Vision Care & Optical Wellness',
    category: 'Vision',
    status: 'Enrolled',
    coverageSummary: '$400 annual eyewear allowance plus 100% annual retinal eye examinations.',
    provider: 'VSP Vision Care',
    renewalDate: 'Dec 31, 2026',
    employerContribution: '100% covered by Nexus',
    details: [
      '$10 copay for comprehensive annual eye exams',
      '$400 frame or contact lens annual allowance',
      'Anti-glare and blue-light screen coating discounts'
    ],
    iconName: 'Eye'
  },
  {
    id: 'ben_04',
    title: 'Quarterly Lifestyle & Wellness Reimbursement',
    category: 'Wellness',
    status: 'Enrolled',
    coverageSummary: '$750 quarterly stipend for gym, yoga, ergonomic desk equipment, and sports gear.',
    provider: 'Nexus People Rewards',
    renewalDate: 'Auto-refreshes quarterly',
    employerContribution: '$3,000 annual allowance',
    details: [
      'Reimburses fitness memberships, running shoes, and sports equipment',
      'Ergonomic monitor arms, standing desks, and orthopedic chairs eligible',
      'Direct reimbursement deposited into monthly payroll'
    ],
    iconName: 'HeartPulse'
  },
  {
    id: 'ben_05',
    title: '401(k) Retirement Match Program',
    category: 'Retirement',
    status: 'Enrolled',
    coverageSummary: 'Dollar-for-dollar company match up to 6% of base salary with immediate 100% vesting.',
    provider: 'Fidelity Investments',
    renewalDate: 'Continuous',
    employerContribution: 'Up to 6% salary match',
    details: [
      'Pre-tax and Roth 401(k) contribution options',
      'Access to low-cost institutional target-date and index funds',
      'Complimentary 1-on-1 financial advisor consultations'
    ],
    iconName: 'Coins'
  },
  {
    id: 'ben_06',
    title: 'Mental Health & Confidential Therapy (Modern Health)',
    category: 'Mental Health',
    status: 'Enrolled',
    coverageSummary: '12 free confidential therapy and executive coaching sessions per year.',
    provider: 'Modern Health Inc.',
    renewalDate: 'Dec 31, 2026',
    employerContribution: '100% covered by Nexus',
    details: [
      '12 dedicated 1-on-1 video sessions with licensed therapists',
      '24/7 crisis support hotline in 18 languages',
      'Guided mindfulness meditation and sleep aid audio courses'
    ],
    iconName: 'Brain'
  }
];

export const INITIAL_COURSES: Course[] = [
  {
    id: 'crs_01',
    title: 'Advanced Design Systems: Multi-Brand Tokens & Component Architecture',
    category: 'Design',
    instructor: 'Daniel Morgan & Sarah Chen',
    duration: '4h 30m',
    level: 'Advanced',
    rating: 4.9,
    progressPercent: 68,
    currentLesson: 'Module 4: Dynamic Theme Switching & Contrast Math',
    totalModules: 8,
    completedModules: 5,
    isBookmarked: true,
    description: 'Learn how to architect enterprise-scale design tokens with automated synchronization into code repositories.',
    thumbnailColor: 'from-blue-600 to-cyan-500'
  },
  {
    id: 'crs_02',
    title: 'Inclusive Design & WCAG 2.2 AAA Accessibility Mastery',
    category: 'Design',
    instructor: 'Meera Kapoor',
    duration: '3h 15m',
    level: 'Intermediate',
    rating: 4.8,
    progressPercent: 40,
    currentLesson: 'Module 3: Screen Reader Testing & Focus Flow',
    totalModules: 6,
    completedModules: 2,
    isBookmarked: true,
    description: 'A comprehensive deep dive into designing accessible web products that empower every human user.',
    thumbnailColor: 'from-purple-600 to-violet-500'
  },
  {
    id: 'crs_03',
    title: 'Cross-Functional Product Leadership & Influence Without Authority',
    category: 'Leadership',
    instructor: 'Priya Nair',
    duration: '5h 00m',
    level: 'Intermediate',
    rating: 4.9,
    progressPercent: 0,
    totalModules: 10,
    completedModules: 0,
    description: 'Master the art of aligning engineering, design, and business executives to ship high-impact product roadmaps.',
    thumbnailColor: 'from-teal-600 to-emerald-500'
  },
  {
    id: 'crs_04',
    title: 'High-Performance React & Modern Frontend Engineering 2026',
    category: 'Engineering',
    instructor: 'Arjun Mehta',
    duration: '6h 45m',
    level: 'Advanced',
    rating: 4.9,
    progressPercent: 0,
    totalModules: 12,
    completedModules: 0,
    description: 'Explore the newest React compiler optimizations, server actions, and micro-frontend state coordination.',
    thumbnailColor: 'from-cyan-600 to-blue-500'
  },
  {
    id: 'crs_05',
    title: 'Executive Communication & High-Stakes Stakeholder Presentations',
    category: 'Communication',
    instructor: 'Dr. Aris Thorne',
    duration: '2h 45m',
    level: 'Intermediate',
    rating: 4.7,
    progressPercent: 100,
    totalModules: 5,
    completedModules: 5,
    description: 'Craft persuasive product narratives and present complex technical findings with clarity and executive confidence.',
    thumbnailColor: 'from-amber-600 to-orange-500'
  }
];

export const DIRECTORY_EMPLOYEES: DirectoryEmployee[] = [
  {
    id: 'emp_01',
    name: 'Ananya Sharma',
    roleTitle: 'Product Designer',
    department: 'Product Experience',
    location: 'Bengaluru, India',
    email: 'ananya.sharma@nexustechnologies.demo',
    manager: 'Daniel Morgan',
    avatarInitials: 'AS',
    avatarColor: 'from-blue-600 to-cyan-500',
    status: 'ONLINE',
    skills: ['Product Design', 'Design Systems', 'WCAG Accessibility', 'Figma Tokens'],
    joinedYear: '2023'
  },
  {
    id: 'emp_02',
    name: 'Daniel Morgan',
    roleTitle: 'VP, Product Experience',
    department: 'Product Experience',
    location: 'San Francisco, CA',
    email: 'daniel.morgan@nexustechnologies.demo',
    manager: 'Sarah Jenkins',
    avatarInitials: 'DM',
    avatarColor: 'from-violet-600 to-purple-500',
    status: 'BUSY',
    skills: ['Design Strategy', 'Product Vision', 'Design Leadership', 'Executive Alignment'],
    joinedYear: '2021'
  },
  {
    id: 'emp_03',
    name: 'Priya Nair',
    roleTitle: 'Senior Product Manager',
    department: 'Product Experience',
    location: 'Bengaluru, India',
    email: 'priya.nair@nexustechnologies.demo',
    manager: 'Daniel Morgan',
    avatarInitials: 'PN',
    avatarColor: 'from-cyan-600 to-teal-500',
    status: 'ONLINE',
    skills: ['Roadmapping', 'User Journey Mapping', 'A/B Experimentation', 'Analytics'],
    joinedYear: '2022'
  },
  {
    id: 'emp_04',
    name: 'Arjun Mehta',
    roleTitle: 'Lead Frontend Engineer',
    department: 'Engineering',
    location: 'Bengaluru, India',
    email: 'arjun.mehta@nexustechnologies.demo',
    manager: 'Ethan Brown',
    avatarInitials: 'AM',
    avatarColor: 'from-emerald-600 to-teal-500',
    status: 'ONLINE',
    skills: ['React 19', 'TypeScript', 'Tailwind CSS', 'Web Performance'],
    joinedYear: '2022'
  },
  {
    id: 'emp_05',
    name: 'Sofia Williams',
    roleTitle: 'Lead People Operations',
    department: 'People Operations',
    location: 'London, UK',
    email: 'sofia.williams@nexustechnologies.demo',
    manager: 'Elena Rostova',
    avatarInitials: 'SW',
    avatarColor: 'from-purple-600 to-pink-500',
    status: 'ONLINE',
    skills: ['Talent Strategy', 'Compensation Bands', 'Culture Programs', 'Onboarding'],
    joinedYear: '2022'
  },
  {
    id: 'emp_06',
    name: 'Ethan Brown',
    roleTitle: 'Engineering Manager',
    department: 'Engineering',
    location: 'Austin, TX',
    email: 'ethan.brown@nexustechnologies.demo',
    manager: 'Marcus Vance',
    avatarInitials: 'EB',
    avatarColor: 'from-blue-600 to-indigo-500',
    status: 'AWAY',
    skills: ['Engineering Leadership', 'Distributed Systems', 'Cloud Native', 'Team Coaching'],
    joinedYear: '2020'
  },
  {
    id: 'emp_07',
    name: 'Meera Kapoor',
    roleTitle: 'Senior UX Researcher',
    department: 'Product Experience',
    location: 'Bengaluru, India',
    email: 'meera.kapoor@nexustechnologies.demo',
    manager: 'Daniel Morgan',
    avatarInitials: 'MK',
    avatarColor: 'from-amber-600 to-orange-500',
    status: 'ONLINE',
    skills: ['Qualitative Interviews', 'Usability Testing', 'Card Sorting', 'Persona Synthesis'],
    joinedYear: '2023'
  },
  {
    id: 'emp_08',
    name: 'Lucas Chen',
    roleTitle: 'Lead Data Analyst',
    department: 'Product Experience',
    location: 'Toronto, Canada',
    email: 'lucas.chen@nexustechnologies.demo',
    manager: 'Priya Nair',
    avatarInitials: 'LC',
    avatarColor: 'from-teal-600 to-cyan-500',
    status: 'OFFLINE',
    skills: ['SQL', 'Product Telemetry', 'Cohort Analysis', 'Dashboard Architecture'],
    joinedYear: '2023'
  }
];

export const INITIAL_TEAM_OBJECTIVES: TeamObjective[] = [
  {
    id: 'obj_01',
    title: 'Launch Universal Multi-Brand Design Tokens Across Web & Mobile',
    progress: 88,
    targetDate: 'Oct 31, 2026',
    owner: 'Ananya Sharma',
    status: 'On Track'
  },
  {
    id: 'obj_02',
    title: 'Achieve 100% WCAG 2.2 AAA Accessibility Compliance on Core Flows',
    progress: 92,
    targetDate: 'Nov 15, 2026',
    owner: 'Meera Kapoor',
    status: 'On Track'
  },
  {
    id: 'obj_03',
    title: 'Revamp Employee Onboarding Portal Time-to-Productivity to Under 3 Days',
    progress: 65,
    targetDate: 'Dec 10, 2026',
    owner: 'Priya Nair',
    status: 'On Track'
  }
];

export const INITIAL_TASKS: TaskItem[] = [
  {
    id: 'tsk_01',
    title: 'Finalize Design Tokens Spec for Dark & High-Contrast Mode',
    description: 'Coordinate with frontend engineers to review semantic token definitions and verify variable contrast ratios.',
    project: 'Design System 3.0',
    assignee: 'Ananya Sharma',
    priority: 'Urgent',
    dueDate: 'Today, 5:00 PM',
    status: 'In Progress',
    progress: 75,
    commentsCount: 6
  },
  {
    id: 'tsk_02',
    title: 'Review Prototype for Q4 Team Workspace Sprint Board',
    description: 'Test responsive interactions and keyboard focus states on mobile drawer viewport.',
    project: 'Nexus One Portal',
    assignee: 'Daniel Morgan',
    priority: 'High',
    dueDate: 'Tomorrow, 2:00 PM',
    status: 'Pending',
    progress: 30,
    commentsCount: 4,
    isApprovalRequired: true,
    approvalType: 'Design Review'
  },
  {
    id: 'tsk_03',
    title: 'Submit Leave Approval for Q4 Vacation Request',
    description: 'Annual leave dates: Oct 24 to Oct 28 (5 business days).',
    project: 'People Operations',
    assignee: 'Daniel Morgan',
    priority: 'Medium',
    dueDate: 'Oct 12, 2026',
    status: 'Pending',
    progress: 0,
    commentsCount: 1,
    isApprovalRequired: true,
    approvalType: 'Leave Request'
  },
  {
    id: 'tsk_04',
    title: 'Conduct Usability Walkthrough for Onboarding Flow',
    description: 'Run 5 remote participant sessions testing self-serve benefits enrollment.',
    project: 'User Research',
    assignee: 'Meera Kapoor',
    priority: 'High',
    dueDate: 'Oct 14, 2026',
    status: 'In Progress',
    progress: 50,
    commentsCount: 3
  },
  {
    id: 'tsk_05',
    title: 'Publish Sprint 24 Retrospective Summary to Team Hub',
    description: 'Document key wins, cycle time metrics, and follow-up action items.',
    project: 'Sprint Execution',
    assignee: 'Priya Nair',
    priority: 'Medium',
    dueDate: 'Oct 16, 2026',
    status: 'Completed',
    progress: 100,
    commentsCount: 8
  }
];

export const INITIAL_EVENTS: CompanyEvent[] = [
  {
    id: 'evt_01',
    title: 'Nexus Global All-Hands & Q3 Product Launch Celebration',
    category: 'Town Hall',
    date: 'Oct 16, 2026',
    time: '4:00 PM - 5:30 PM IST',
    location: 'Bengaluru Auditorium & Virtual Live Stream',
    isVirtual: true,
    speaker: 'Dr. Aris Thorne & Sarah Jenkins',
    speakerRole: 'Executive Leadership Team',
    registeredCount: 840,
    isRegistered: true,
    description: 'Join us for our global quarterly town hall celebrating Q3 milestones, customer stories, product demos, and open Q&A.'
  },
  {
    id: 'evt_02',
    title: 'Inclusive Design & Token Architecture Workshop',
    category: 'Workshop',
    date: 'Oct 20, 2026',
    time: '2:30 PM - 4:00 PM IST',
    location: 'Design Studio Lab A & Zoom',
    isVirtual: true,
    speaker: 'Ananya Sharma & Daniel Morgan',
    speakerRole: 'Product Experience',
    registeredCount: 195,
    isRegistered: true,
    description: 'Hands-on interactive masterclass on crafting robust design tokens with automated accessibility testing in Figma and React.'
  },
  {
    id: 'evt_03',
    title: 'Mindfulness & Mental Wellness Recharge Hour',
    category: 'Wellness',
    date: 'Oct 22, 2026',
    time: '11:00 AM - 12:00 PM IST',
    location: 'Wellness Suite (4th Floor) & Virtual',
    isVirtual: true,
    speaker: 'Dr. Alisha Gomez',
    speakerRole: 'Modern Health Lead Specialist',
    registeredCount: 120,
    isRegistered: false,
    description: 'Guided breathing, stress reduction strategies, and practical micro-habits for sustainable mental clarity during high-velocity sprints.'
  },
  {
    id: 'evt_04',
    title: 'Engineering Tech Talk: Building Ultra-Low Latency Micro-Frontends',
    category: 'Training',
    date: 'Oct 27, 2026',
    time: '3:00 PM - 4:30 PM IST',
    location: 'Virtual Tech Stage',
    isVirtual: true,
    speaker: 'Arjun Mehta',
    speakerRole: 'Lead Frontend Engineer',
    registeredCount: 310,
    isRegistered: false,
    description: 'A deep architectural breakdown of how Nexus achieves sub-50ms page transitions and seamless state sync across distributed web pods.'
  }
];

export const INITIAL_FAQS: FaqItem[] = [
  {
    id: 'faq_01',
    category: 'Leave & Attendance',
    question: 'How do I apply for annual or wellness leave?',
    answer: 'Navigate to the Leave & Attendance page, click "Apply for Leave", select your leave type, start/end dates, and submit. Your manager will receive an immediate approval request.'
  },
  {
    id: 'faq_02',
    category: 'Payroll & Compensation',
    question: 'When is monthly salary deposited and where can I download payslips?',
    answer: 'Payroll is processed on the final working day of each calendar month. You can view your detailed earnings/deductions breakdown and download PDF payslips directly under the Payroll section.'
  },
  {
    id: 'faq_03',
    category: 'Benefits & Wellness',
    question: 'How do I claim my quarterly $750 lifestyle & wellness reimbursement?',
    answer: 'Submit receipts for eligible gym memberships, ergonomic furniture, or fitness equipment via the Benefits & Wellness page or through the People Operations support portal.'
  },
  {
    id: 'faq_04',
    category: 'IT & Hardware',
    question: 'How do I request replacement hardware or request VPN support?',
    answer: 'Open a support ticket with the IT Help Desk category on the Help & Support page. Critical hardware issues are addressed with a 4-hour replacement SLA.'
  }
];

export const INITIAL_TICKETS: SupportTicket[] = [
  {
    id: 'TCK-8921',
    subject: 'Request for secondary 4K HDR designer monitor (Ergonomic Desk Setup)',
    category: 'IT Help Desk',
    priority: 'Medium',
    status: 'In Progress',
    createdAt: 'Oct 05, 2026',
    lastUpdated: 'Yesterday, 3:15 PM',
    description: 'Need a color-calibrated 4K display for WCAG contrast verification and multi-brand token testing.'
  },
  {
    id: 'TCK-8740',
    subject: 'Confirmation of international travel medical insurance certificate',
    category: 'People Operations',
    priority: 'Low',
    status: 'Resolved',
    createdAt: 'Sep 29, 2026',
    lastUpdated: 'Oct 01, 2026',
    description: 'Certificate issued for upcoming London design summit travel.'
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif_01',
    title: 'Leave Request Approved',
    description: 'Daniel Morgan approved your 5-day annual leave (Oct 24 - Oct 28).',
    timestamp: '15 mins ago',
    isRead: false,
    type: 'leave'
  },
  {
    id: 'notif_02',
    title: 'New Featured Announcement',
    description: 'Nexus Launches Next-Generation Collaborative Design Tokens.',
    timestamp: '1 hour ago',
    isRead: false,
    type: 'announcement'
  },
  {
    id: 'notif_03',
    title: 'Task Due Tomorrow',
    description: 'Review Prototype for Q4 Team Workspace Sprint Board.',
    timestamp: '3 hours ago',
    isRead: false,
    type: 'task'
  },
  {
    id: 'notif_04',
    title: 'Event Reminder: Global All-Hands',
    description: 'Global town hall begins on Oct 16 at 4:00 PM IST.',
    timestamp: '1 day ago',
    isRead: true,
    type: 'event'
  }
];

export const DEFAULT_USER_SETTINGS: UserSettings = {
  emailNotifications: true,
  announcementNotifications: true,
  taskReminders: true,
  eventReminders: true,
  learningReminders: false,
  theme: 'dark',
  density: 'comfortable',
  accentColor: '#4F7CFF',
  language: 'English (US)',
  profileVisibility: 'Company'
};
