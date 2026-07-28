export interface Candidate {
  id: string;
  name: string;
  role: string;
  industry: string;
  experience: string;
  workMode: string;
  skills: string[];
  resumeText: string;
}

export const mockCandidates: Candidate[] = [
  {
    id: '101',
    name: 'Eleanor Vance',
    role: 'Senior Civil Engineer',
    industry: 'Engineering',
    experience: '10+ Years',
    workMode: 'Remote',
    skills: ['AutoCAD', 'Structural Analysis', 'Project Management'],
    resumeText: 'Passionate Senior Civil Engineer with over 10 years of experience in managing large-scale infrastructure projects. Proven track record of delivering projects on time and within budget. Excellent leadership and communication skills. Willing to relocate and work remotely.',
  },
  {
    id: '102',
    name: 'Michael Chang',
    role: 'HR Manager',
    industry: 'HR',
    experience: '5 Years',
    workMode: 'Hybrid',
    skills: ['Recruitment', 'Employee Relations', 'Performance Management'],
    resumeText: 'Dedicated HR Manager with 5 years of experience in streamlining HR operations, improving employee retention, and fostering a positive workplace culture. Strong background in conflict resolution and talent acquisition.',
  },
  {
    id: '103',
    name: 'Sarah Jenkins',
    role: 'Software Engineer',
    industry: 'IT',
    experience: '3 Years',
    workMode: 'Remote',
    skills: ['Python', 'Java', 'AWS', 'React'],
    resumeText: 'Results-driven Software Engineer with 3 years of experience in full-stack development. Proficient in Python, Java, and modern JavaScript frameworks. Experienced in deploying scalable applications on AWS.',
  },
  {
    id: '104',
    name: 'David Miller',
    role: 'Financial Analyst',
    industry: 'Finance',
    experience: '8 Years',
    workMode: 'On-site',
    skills: ['Financial Modeling', 'Data Analysis', 'Excel', 'SQL'],
    resumeText: 'Detail-oriented Financial Analyst with 8 years of experience in financial forecasting, risk management, and data analysis. Highly proficient in Excel and SQL. Extensive experience in the banking sector.',
  },
  {
    id: '105',
    name: 'Jessica Lee',
    role: 'Marketing Director',
    industry: 'Marketing',
    experience: '12 Years',
    workMode: 'Hybrid',
    skills: ['Digital Marketing', 'SEO', 'Brand Management', 'Team Leadership'],
    resumeText: 'Creative Marketing Director with 12 years of experience leading successful global marketing campaigns. Exceptional skills in SEO/SEM, brand positioning, and team leadership. Increased ROI by 40% in previous role.',
  }
];

export const dashboardMetrics = {
  totalCandidates: 1250,
  seniorProfiles: 300,
  remoteReady: 450,
  industries: 12,
};
