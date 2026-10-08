export type UserRole = 'EMPLOYEE' | 'MANAGER' | 'PEOPLE_OPS' | 'ADMINISTRATOR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleTitle: string;
  department: string;
  location: string;
  employeeId: string;
  manager: string;
  joinedDate: string;
  avatarUrl?: string;
  phone?: string;
  workArrangement?: string;
  timeZone?: string;
  bio?: string;
  skills?: string[];
  certifications?: string[];
  careerInterests?: string[];
  status?: 'ONLINE' | 'BUSY' | 'AWAY' | 'OFFLINE';
}

export type AnnouncementCategory = 'Company News' | 'Product Updates' | 'People & Culture' | 'Benefits' | 'Technology' | 'Events';

export interface Announcement {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: AnnouncementCategory;
  author: string;
  authorRole: string;
  authorAvatar?: string;
  publishedAt: string;
  readTime: string;
  isPinned?: boolean;
  isRead?: boolean;
  isBookmarked?: boolean;
  likesCount: number;
  commentsCount: number;
  gradient: string;
}

export type LeaveType = 'Annual Leave' | 'Sick Leave' | 'Casual / Personal' | 'Wellness Day' | 'Parental Leave';
export type LeaveStatus = 'Approved' | 'Pending' | 'Rejected' | 'Cancelled';

export interface LeaveRequest {
  id: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  appliedOn: string;
  isHalfDay?: boolean;
  approver?: string;
}

export interface AttendanceDay {
  date: string;
  dayNumber: number;
  dayName: string;
  status: 'PRESENT' | 'WFH' | 'LEAVE' | 'HOLIDAY' | 'WEEKEND';
  hoursLogged?: number;
  notes?: string;
}

export interface Payslip {
  id: string;
  month: string;
  year: number;
  payDate: string;
  grossPay: number;
  netPay: number;
  status: 'Paid' | 'Processing';
  baseSalary: number;
  housingAllowance: number;
  wellnessAllowance: number;
  taxDeduction: number;
  providentFund: number;
  insuranceContribution: number;
}

export interface BenefitPlan {
  id: string;
  title: string;
  category: 'Health' | 'Dental' | 'Vision' | 'Wellness' | 'Retirement' | 'Mental Health';
  status: 'Enrolled' | 'Available' | 'Pending Review';
  coverageSummary: string;
  provider: string;
  renewalDate: string;
  employerContribution: string;
  details: string[];
  iconName: string;
}

export interface Course {
  id: string;
  title: string;
  category: 'Leadership' | 'Product' | 'Engineering' | 'Design' | 'Communication' | 'Security';
  instructor: string;
  duration: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  rating: number;
  progressPercent: number;
  currentLesson?: string;
  totalModules: number;
  completedModules: number;
  isBookmarked?: boolean;
  description: string;
  thumbnailColor: string;
}

export interface DirectoryEmployee {
  id: string;
  name: string;
  roleTitle: string;
  department: string;
  location: string;
  email: string;
  manager: string;
  avatarInitials: string;
  avatarColor: string;
  status: 'ONLINE' | 'BUSY' | 'AWAY' | 'OFFLINE';
  skills: string[];
  joinedYear: string;
}

export interface TeamObjective {
  id: string;
  title: string;
  progress: number;
  targetDate: string;
  owner: string;
  status: 'On Track' | 'At Risk' | 'Completed';
}

export type TaskPriority = 'Urgent' | 'High' | 'Medium' | 'Low';
export type TaskStatus = 'Pending' | 'In Progress' | 'Under Review' | 'Completed';

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  project: string;
  assignee: string;
  assigneeAvatar?: string;
  priority: TaskPriority;
  dueDate: string;
  status: TaskStatus;
  progress: number;
  commentsCount: number;
  isApprovalRequired?: boolean;
  approvalType?: 'Leave Request' | 'Design Review' | 'Budget Approval' | 'Contract Signoff';
}

export type EventCategory = 'Town Hall' | 'Workshop' | 'Team Event' | 'Wellness' | 'Culture' | 'Training';

export interface CompanyEvent {
  id: string;
  title: string;
  category: EventCategory;
  date: string;
  time: string;
  location: string;
  isVirtual: boolean;
  speaker: string;
  speakerRole: string;
  registeredCount: number;
  isRegistered: boolean;
  description: string;
}

export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TicketStatus = 'Open' | 'In Progress' | 'Waiting for Response' | 'Resolved';

export interface SupportTicket {
  id: string;
  subject: string;
  category: 'IT Help Desk' | 'People Operations' | 'Facilities' | 'Payroll Support' | 'Workplace Services';
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  lastUpdated: string;
  description: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  type: 'announcement' | 'task' | 'leave' | 'event' | 'learning' | 'system';
}

export interface UserSettings {
  emailNotifications: boolean;
  announcementNotifications: boolean;
  taskReminders: boolean;
  eventReminders: boolean;
  learningReminders: boolean;
  theme: 'dark' | 'light' | 'blue' | 'aurora';
  density: 'comfortable' | 'compact';
  accentColor: string;
  language: string;
  profileVisibility: 'Company' | 'Team Only' | 'Private';
}
