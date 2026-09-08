// ============================================================
// CONFIG.JS — API endpoints and app configuration
// ============================================================

export const API_BASE_URL    = 'http://localhost:5000/api';
export const AI_SERVICE_URL  = 'http://localhost:8000';

export const APP_NAME = 'Problem2Impact';

export const CATEGORIES = [
  { id: 'education',        label: 'Education',          icon: '🎓' },
  { id: 'healthcare',       label: 'Healthcare',         icon: '🏥' },
  { id: 'agriculture',      label: 'Agriculture',        icon: '🌾' },
  { id: 'transportation',   label: 'Transportation',     icon: '🚌' },
  { id: 'industry',         label: 'Industry',           icon: '🏭' },
  { id: 'environment',      label: 'Environment',        icon: '🌿' },
  { id: 'water-sanitation', label: 'Water & Sanitation', icon: '💧' },
  { id: 'other',            label: 'Other',              icon: '📌' },
];

export const SKILLS = [
  'Python', 'JavaScript', 'React', 'Node.js', 'IoT',
  'Machine Learning', 'Computer Vision', 'NLP',
  'UI/UX Design', 'Data Analysis', 'Civil Engineering',
  'Public Health', 'Agronomy', 'Embedded Systems',
  'Cloud / DevOps', 'Mobile Development', 'Blockchain',
  'Robotics', 'Biotechnology', 'Social Work',
];

export const ROLES = [
  { id: 'citizen',    label: 'Citizen',    icon: '👤' },
  { id: 'student',    label: 'Student',    icon: '🎒' },
  { id: 'faculty',    label: 'Faculty',    icon: '🧑‍🏫' },
  { id: 'employee',   label: 'Employee',   icon: '💼' },
  { id: 'government', label: 'Government', icon: '🏛️' },
  { id: 'ngo',        label: 'NGO',        icon: '🤝' },
  { id: 'industry',   label: 'Industry',   icon: '🏢' },
];

export const SORT_OPTIONS = [
  { value: 'newest',         label: 'Newest first' },
  { value: 'most-solutions', label: 'Most solutions' },
  { value: 'deadline',       label: 'Deadline' },
  { value: 'budget',         label: 'Budget (high to low)' },
];

export const STATUS_LABELS = {
  open:           { label: 'Open',           cls: 'badge--teal' },
  in_progress:    { label: 'In Progress',    cls: 'badge--saffron' },
  under_review:   { label: 'Under Review',   cls: 'badge--navy' },
  solved:         { label: 'Solved',         cls: 'badge--success' },
  closed:         { label: 'Closed',         cls: 'badge--gray' },
};