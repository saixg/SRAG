export type PublicResource = {
  slug: string;
  title: string;
  type: 'Guide' | 'FAQ' | 'Template' | 'Training' | 'Product update';
  topic: 'Getting started' | 'People operations' | 'Product';
  summary: string;
  body: string;
  status: 'Preview content';
};

export const publicSolutions = [
  {
    id: 'employee-self-service',
    audience: 'Employees',
    title: 'Make everyday work easier to find',
    summary: 'Bring profile details, leave information, payroll links, learning, and support into one employee workspace.',
    points: ['A familiar place to start the workday', 'Clear paths to common employee tasks', 'Updates, events, and colleagues in context'],
  },
  {
    id: 'people-operations',
    audience: 'People teams',
    title: 'Give people a clearer path to help',
    summary: 'Organize company announcements, employee resources, frequently asked questions, and service entry points.',
    points: ['Company information in one place', 'Self-service guides and support paths', 'A consistent experience across devices'],
  },
  {
    id: 'team-work',
    audience: 'Team leaders',
    title: 'Keep team work in view',
    summary: 'Give employees a place to see team context, upcoming events, learning, and their next actions.',
    points: ['Team and colleague discovery', 'Tasks and approval entry points', 'Events and learning alongside daily work'],
  },
];

export const publicResources: PublicResource[] = [
  { slug: 'employee-portal-overview', title: 'A practical guide to an employee portal', type: 'Guide', topic: 'Getting started', summary: 'What employees can expect to find in a connected workplace portal.', body: 'An employee portal can bring common destinations—company updates, employee information, leave and attendance, learning, events, and support—into a single starting point. Actual services and data depend on the organization’s connected systems.', status: 'Preview content' },
  { slug: 'first-week-checklist', title: 'New employee first-week checklist', type: 'Template', topic: 'Getting started', summary: 'A simple checklist for setting up a profile, finding colleagues, and locating support.', body: 'Start with your profile and contact details, learn where company announcements are posted, find your team in the directory, review upcoming events, and save the support contact your organization provides.', status: 'Preview content' },
  { slug: 'leave-and-attendance', title: 'Understanding leave and attendance', type: 'Guide', topic: 'People operations', summary: 'A plain-language overview of leave requests and attendance information.', body: 'The exact leave types, balances, eligibility rules, and approval steps are set by your employer. Check your organization’s policy and use its connected HR system for current balances and requests.', status: 'Preview content' },
  { slug: 'portal-faq', title: 'Employee portal: frequently asked questions', type: 'FAQ', topic: 'People operations', summary: 'Answers to common questions about accounts, profile details, and support.', body: 'Account access is managed by your organization. If you cannot sign in, contact your workplace administrator. Use only your own account and follow your company’s privacy and data-handling rules.', status: 'Preview content' },
  { slug: 'workspace-learning', title: 'Getting started with workplace learning', type: 'Training', topic: 'Product', summary: 'A short orientation to finding courses and tracking learning progress.', body: 'Browse available courses, choose a learning path that fits your role, and review your progress from the learning area. Course availability depends on the learning content configured by your organization.', status: 'Preview content' },
  { slug: 'nexus-one-preview', title: 'Nexus One preview: what is included', type: 'Product update', topic: 'Product', summary: 'A clear description of the current employee portal preview and its limitations.', body: 'The preview contains employee-facing screens and sample workspace content. Authentication is configured by the organization. Some workflows are illustrative and do not write to a live HR system. RAG document search and public customer results are not included in this preview.', status: 'Preview content' },
];

export const publicFaqs = [
  { question: 'What is Nexus One?', answer: 'Nexus One is an employee workspace concept that brings common company destinations—updates, employee services, team information, events, learning, and support—together in one portal.' },
  { question: 'Does the preview connect to our HR or payroll system?', answer: 'No live HR or payroll connection is configured in this preview. Some screens show sample data. A production deployment needs approved integrations with your organization’s systems.' },
  { question: 'Can I see a colleague’s private information?', answer: 'The preview is not a production source of employee records. Access to private information must be enforced by the connected backend and the organization’s access policies.' },
  { question: 'How do we learn about pricing?', answer: 'Public pricing is not available for this preview. Pricing and deployment scope need to be confirmed by the product owner after requirements are understood.' },
];

export const publicNavigation = [
  { label: 'Solutions', path: '/solutions' },
  { label: 'Resources', path: '/resources' },
  { label: 'Customer stories', path: '/customers' },
  { label: 'Pricing', path: '/pricing' },
  { label: 'Trust', path: '/trust' },
  { label: 'Company', path: '/company' },
];
