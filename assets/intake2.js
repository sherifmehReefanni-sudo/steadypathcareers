/* Steady Path Careers: Intake 2.0 (preview). One question per card, five stops on a path, a branching module per field.
   Keeps every field the current intake sends (same keys, same meanings) so the backend and the Sheet columns stay as they are;
   everything new rides along in b.v2. Backend v1.27 stores b.v2 in new columns plus one JSON column; v1.26 (live today) ignores it.
   PREVIEW mode never makes a network call to the backend (no intake, no draft save or load, no funnel events): the last step shows
   exactly what would be sent. Answers autosave on this device only. All backend calls go through post(), which refuses in PREVIEW. */
(function () {
  'use strict';
  var ROOT = document.getElementById('i2');
  if (!ROOT) return;
  var PREVIEW = ROOT.getAttribute('data-preview') !== 'off';
  var API = 'https://script.google.com/macros/s/AKfycbywIXNDqOMhCuyNx9px8cKGQy4zsuDwxihOF_jMr_jTxv8QOy2OxBrlXC9WffPWZcU/exec';
  var KEY = PREVIEW ? 'sp_intake2_preview' : 'sp_intake2';
  var TERMS_VERSION = '2026-10-27';
  var BOOK = 'https://calendar.app.google/8wyFoDK5k6k1iamT9';
  var HEADSHOT = ROOT.getAttribute('data-headshot') || '/img/sherif-mehanni.jpg';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function uniq(a) { var o = []; a.forEach(function (x) { if (x && o.indexOf(x) < 0) o.push(x); }); return o; }
  var mq = null; try { mq = window.matchMedia('(prefers-reduced-motion: reduce)'); } catch (e) {}
  function RM() { return mq ? mq.matches : true; }
  function buzz() { try { if (!RM() && navigator.vibrate) navigator.vibrate(8); } catch (e) {} }

  /* ---------------- options ---------------- */
  var O = {
    contactBy: ['Text', 'Call', 'Email', 'WhatsApp'], times: ['Mornings', 'Afternoons', 'Evenings', 'Weekends'],
    relocating: ['No, I already live here', 'Yes, to New Jersey', 'Yes, to New York', 'Yes, either one'],
    situation: ['Laid off or downsized', 'Employed, but looking', 'Returning to work', 'New graduate', 'Changing careers', 'Relocating to NY or NJ'],
    urgency: ['I need something as soon as possible', 'Soon, within a month or two', 'Steady, a few months is fine', 'Taking my time to find the right fit'],
    start: ['Immediately', 'Within 2 weeks', 'Within a month', '1 to 3 months'],
    workAuth: ['Yes', 'No'], sponsorship: ['Yes', 'No', 'Not sure'], yesno: ['Yes', 'No'],
    education: ['High school or GED', 'Some college', "Associate's degree", "Bachelor's degree", "Master's or higher", 'Doctorate', 'Trade or certificate program', 'Prefer not to show'],
    seniority: ['Entry level', 'Some experience (2 to 5 years)', 'Experienced (5 to 10 years)', 'Senior or lead', 'Manager or director'],
    settings: ['On site', 'Hybrid', 'Remote', 'Open to all'],
    travel: ['No travel', 'Occasional', 'Up to 25%', 'Up to 50%', 'Heavy travel is fine'],
    nycHybrid: ['Yes', 'Maybe', 'No'], getThere: ['Driving', 'Public transit', 'Either'],
    empTypes: ['Full-time', 'Part-time', 'Contract', 'Temp-to-hire', 'Per diem'],
    shifts: ['Weekday days', 'Evenings', 'Overnights', 'Weekends', 'Rotating shifts'],
    standOut: ['Health insurance', 'Dental and vision coverage', 'Retirement plan or 401(k) match', 'Generous paid time off', 'Flexible hours', 'Ability to work remote', 'Hybrid schedule', 'One location (not split across offices)', 'Guaranteed base pay (not commission or production only)', 'Signing bonus', 'Paid training or continuing education', 'Clear path to promotion', 'Tuition help', 'Short commute', 'Weekends off', 'Stable, established employer', 'Mission-driven organization'],
    companyTypes: ['Startup', 'Mid-size company', 'Large corporation', 'Government', 'Nonprofit', 'Healthcare system', 'Private practice', 'No preference'],
    software: ['Microsoft Office (Word, Excel, Outlook)', 'Google Workspace', 'Workday', 'ADP', 'UKG', 'SAP', 'Oracle', 'Dayforce', 'NetSuite', 'QuickBooks', 'Salesforce or another CRM', 'Epic or another medical records system', 'Zendesk or another help desk tool', 'Point of sale (POS)', 'Power BI, Tableau or SQL', 'None of these'],
    privateSearch: ['Yes', 'No'],
    resumeStyle: ['Modern', 'Classic', 'No preference'], coverTone: ['Warm', 'Confident', 'Formal', 'No preference']
  };
  var DEAL = [
    { k: 'Heavy travel', d: 'Away from home often' }, { k: 'Night shifts', d: 'Overnight hours' },
    { k: 'Commission-only pay', d: 'No base salary', old: 'Commission-only pay' }, { k: 'Cold calling', d: 'Calling strangers to sell', old: 'Door-to-door or cold-call sales' },
    { k: 'Weekend work', d: 'Regular Saturdays or Sundays' }, { k: 'Long commute', d: 'Over an hour each way' },
    { k: 'On-call duty', d: 'Reachable after hours' }, { k: 'Physically demanding work', d: 'Lifting, standing all day' },
    { k: 'Door-to-door sales', d: 'Selling in person, house to house', old: 'Door-to-door or cold-call sales' }, { k: 'Call center work', d: 'Phones all day in a queue', old: 'Call center' }
  ];
  var STYLE = [['Working on a team', 'Working on my own'], ['Fast-paced', 'Steady pace'], ['Clear structure', 'Flexible and open'], ['Facing people', 'Behind the scenes']];
  var OWN_MAX = 10;
  var STRENGTHS = ['Communication', 'Problem solving', 'Teamwork', 'Leadership', 'Training others', 'Organization', 'Customer care', 'Attention to detail', 'Adapting to change', 'Time management', 'Calm under pressure', 'Learning new systems fast'];

  /* Fields: tile, the old "Type of work" values it stands for, suggested titles, skills, extra strengths, and its module screens.
     A module screen is a list of questions: [key, label, kind ('one' | 'many' | 'text' | 'area'), options, help]. */
  var F = {
    clinical: { t: 'Healthcare, clinical', s: 'Dentists, doctors, PAs, therapists', ic: 'tooth', old: ['Dental'],
      titles: ['General Dentist', 'Associate Dentist', 'Lead Dentist', 'Dental Director', 'Physician Assistant', 'Physical Therapist', 'Primary Care Physician'],
      skills: ['Treatment planning', 'Restorative care', 'Endodontics', 'Oral surgery', 'Implants', 'Invisalign or clear aligners', 'Pediatric patients', 'Patients with special needs', 'Infection control', 'Digital imaging'],
      str: ['Patient education', 'Chairside manner'],
      mod: [
        [['specialty', 'Your specialty', 'one', ['General dentistry', 'Pediatric dentistry', 'Orthodontics', 'Oral surgery', 'Endodontics', 'Periodontics', 'Prosthodontics', 'Primary care', 'Internal medicine', 'Pediatrics', 'Emergency medicine', 'Physician assistant', 'Physical therapy', 'Occupational therapy', 'Speech therapy', 'Pharmacy', 'Something else']]],
        [['licStates', 'States where you hold a license', 'many', ['New York', 'New Jersey', 'Connecticut', 'Pennsylvania', 'Another state']], ['licStatus', 'License status', 'one', ['Active', 'Pending', 'Expired']], ['board', 'Board certified?', 'one', ['Yes', 'In progress', 'No', 'Not applicable']]],
        [['practice', 'Where would you like to work?', 'many', ['Private practice', 'Group practice', 'Hospital', 'DSO or corporate group', 'Community health center', 'Academic or teaching']], ['volume', 'Patient volume you prefer', 'one', ['Lighter', 'Moderate', 'High volume', 'No preference']]],
        [['ownership', 'Interested in an ownership or partnership track?', 'one', ['Yes', 'Maybe later', 'No']], ['call', 'On-call schedule', 'one', ['None, please', 'Occasional is fine', 'Regular call is fine']], ['ehr', 'Records systems you have used', 'many', ['Dentrix', 'Eaglesoft', 'Open Dental', 'Axium', 'Epic', 'Cerner', 'athenahealth', 'eClinicalWorks', 'Something else']]]
      ] },
    nursing: { t: 'Nursing and allied health', s: 'RN, LPN, NP, CNA, MA, techs', ic: 'cross', old: ['Nursing (RN or LPN)', 'Healthcare support (CNA, medical assistant, techs, aides)'],
      titles: ['Registered Nurse', 'Licensed Practical Nurse', 'Nurse Practitioner', 'Certified Nursing Assistant', 'Medical Assistant', 'Patient Care Technician'],
      skills: ['Patient assessment', 'Medication administration', 'IV therapy', 'Wound care', 'Charting in an EHR', 'Triage', 'Care planning', 'Patient education'],
      str: ['Bedside manner', 'Calm in emergencies'],
      mod: [
        [['license', 'Your license or role', 'many', ['RN', 'LPN', 'NP', 'CNA', 'Medical assistant', 'Technician', 'Something else']], ['compact', 'Do you hold a compact (multistate) license?', 'one', ['Yes', 'No', 'Not sure']]],
        [['unit', 'Units or specialties', 'many', ['Med-surg', 'ICU', 'Emergency', 'Operating room', 'Labor and delivery', 'Pediatrics', 'Home health', 'Long-term care', 'Outpatient or clinic', 'School nurse', 'Something else']]],
        [['shiftPref', 'Shift preferences', 'many', ['Days', 'Nights', '12-hour shifts', '8-hour shifts', 'Weekends are fine']], ['certs', 'Certifications', 'many', ['BLS', 'ACLS', 'PALS', 'NRP', 'TNCC', 'CCRN', 'None yet']]]
      ] },
    it: { t: 'IT and tech', s: 'Support, network, cloud, security, dev, data', ic: 'chip', old: ['IT and tech'],
      titles: ['IT Support Specialist', 'Help Desk Technician', 'Network Administrator', 'Systems Administrator', 'Cloud Engineer', 'Security Analyst', 'Data Analyst', 'Software Developer'],
      skills: ['Troubleshooting', 'Active Directory', 'Microsoft 365 admin', 'Networking (TCP/IP, DNS)', 'Cloud (AWS or Azure)', 'Scripting', 'SQL', 'Ticketing systems', 'Security tools', 'Documentation'],
      str: ['Explaining tech simply', 'Curiosity'],
      mod: [
        [['family', 'Which kind of tech work?', 'many', ['Help desk and support', 'Network', 'Cloud', 'Security', 'Software development', 'Data and analytics', 'Systems admin', 'Project or product']]],
        [['stack', 'Tools and tech you know', 'many', ['Windows', 'Linux', 'Mac', 'Microsoft 365', 'Azure', 'AWS', 'Google Cloud', 'Active Directory', 'Cisco', 'Python', 'SQL', 'JavaScript', 'Java', 'ServiceNow', 'Jira']]],
        [['certs', 'Certifications', 'many', ['A+', 'Network+', 'Security+', 'CCNA', 'AWS', 'Azure', 'Google Cloud', 'CISSP', 'ITIL', 'In progress', 'None yet']], ['oncall', 'On-call rotations', 'one', ['No, please', 'Occasional is fine', 'Fine with it']], ['clearance', 'Security clearance', 'one', ['None', 'Public trust', 'Secret', 'Top secret', 'Could obtain one']]]
      ] },
    finance: { t: 'Finance and accounting', s: 'Accounting, payroll, AP/AR, analysts', ic: 'chart', old: ['Payroll, HR or finance'],
      titles: ['Staff Accountant', 'Senior Accountant', 'Payroll Specialist', 'Accounts Payable Specialist', 'Financial Analyst', 'Bookkeeper', 'Controller'],
      skills: ['Month-end close', 'Reconciliations', 'Payroll processing', 'Accounts payable', 'Accounts receivable', 'Financial reporting', 'Budgeting', 'Audit support', 'Tax compliance', 'Excel modeling'],
      str: ['Accuracy', 'Meeting deadlines'],
      mod: [
        [['cred', 'Credentials', 'many', ['CPA (licensed)', 'CPA (in progress)', 'CMA', 'EA', 'None']], ['industry', 'Where have you worked?', 'many', ['Public accounting', 'Corporate', 'Nonprofit', 'Government', 'Healthcare', 'Banking or financial services']]],
        [['fsoft', 'Finance software', 'many', ['QuickBooks', 'NetSuite', 'SAP', 'Oracle', 'Workday', 'ADP', 'Sage', 'Bill.com', 'Excel (advanced)', 'Excel (basic)']], ['busy', 'Busy season with long hours', 'one', ['Fine', 'I would rather not', 'No']]]
      ] },
    sales: { t: 'Sales and customer success', s: 'Account management, CSM, business development', ic: 'handshake', old: ['Sales', 'Customer service'],
      titles: ['Account Executive', 'Account Manager', 'Customer Success Manager', 'Sales Representative', 'Business Development Representative', 'Sales Manager'],
      skills: ['Prospecting', 'Closing', 'Account management', 'Renewals', 'Upselling', 'Pipeline management', 'Presentations', 'Negotiation', 'Onboarding customers', 'CRM hygiene'],
      str: ['Building relationships', 'Resilience'],
      mod: [
        [['market', 'Who have you sold to?', 'many', ['Businesses (B2B)', 'Consumers (B2C)']], ['motion', 'Inside or outside sales', 'one', ['Inside', 'Outside (field)', 'Either']], ['deal', 'Typical deal size', 'one', ['Under $1,000', '$1,000 to $10,000', '$10,000 to $100,000', 'Over $100,000', 'Not sure']]],
        [['comp', 'Pay mix you are comfortable with', 'one', ['Base salary only', 'Base plus commission', 'Mostly commission is fine']], ['quota', 'Quota results, if you want to share (optional)', 'text', null, 'For example: 112% of quota in 2025']],
        [['crm', 'CRM tools', 'many', ['Salesforce', 'HubSpot', 'Microsoft Dynamics', 'Zoho', 'Something else', 'None']], ['industries', 'Industries you have sold into (optional)', 'text', null, 'For example: payroll software, insurance, telecom']]
      ] },
    insurance: { t: 'Insurance', s: 'Producers, account managers, underwriting, claims', ic: 'shield', old: ['Insurance'],
      titles: ['Commercial Lines Account Manager', 'Personal Lines Account Manager', 'Insurance Producer', 'Client Executive', 'Underwriter', 'Claims Adjuster', 'Customer Service Representative'],
      skills: ['Renewals', 'Endorsements', 'Certificates of insurance', 'Coverage reviews', 'Marketing to carriers', 'New business', 'Cross-selling', 'Claims handling', 'Agency management systems'],
      str: ['Explaining coverage clearly', 'Client retention'],
      mod: [
        [['lines', 'Lines of business', 'many', ['Personal P&C', 'Commercial P&C', 'Life', 'Health', 'Employee benefits', 'Specialty']], ['role', 'Kind of role', 'many', ['Producer', 'Account manager', 'Customer service', 'Underwriter', 'Claims', 'Agency operations']]],
        [['licStates', 'Where are you licensed?', 'many', ['New Jersey', 'New York', 'Pennsylvania', 'Connecticut', 'Other states', 'Not licensed yet']], ['book', 'Book of business', 'one', ['No book', 'A small book', 'An established book']]]
      ] },
    office: { t: 'Office, admin and HR', s: 'Reception, admin, HR, payroll support', ic: 'clip', old: ['Office and admin'],
      titles: ['Administrative Assistant', 'Office Manager', 'Executive Assistant', 'Receptionist', 'HR Generalist', 'HR Coordinator', 'Data Entry Specialist'],
      skills: ['Scheduling', 'Data entry', 'Phones and front desk', 'Record keeping', 'Onboarding new hires', 'Benefits administration', 'Recruiting coordination', 'Invoicing', 'Event planning'],
      str: ['Keeping things organized', 'Discretion'],
      mod: [
        [['role', 'Kind of role', 'many', ['Front desk or reception', 'Admin assistant', 'Office manager', 'Executive assistant', 'Data entry', 'HR generalist', 'Recruiting', 'Payroll']], ['side', 'Front desk or back office', 'one', ['Front desk', 'Back office', 'Either']]],
        [['typing', 'Typing and data entry', 'one', ['Basic', 'Comfortable', 'Fast and accurate']], ['hrCerts', 'HR certifications', 'many', ['SHRM-CP', 'SHRM-SCP', 'PHR', 'SPHR', 'None']]]
      ] },
    trades: { t: 'Skilled trades and construction', s: 'Electrical, plumbing, HVAC, maintenance', ic: 'wrench', old: ['Construction and skilled trades', 'Facilities and maintenance'],
      titles: ['Electrician', 'Plumber', 'HVAC Technician', 'Maintenance Technician', 'Carpenter', 'Welder', 'Construction Laborer', 'Foreman'],
      skills: ['Reading blueprints', 'Preventive maintenance', 'Troubleshooting', 'Code compliance', 'Power tools', 'Safety practices', 'Estimating', 'Leading a crew'],
      str: ['Safety first', 'Working with my hands'],
      mod: [
        [['trade', 'Your trade', 'many', ['Electrician', 'Plumber', 'HVAC', 'Carpenter', 'Welder', 'General construction', 'Maintenance', 'Painter', 'Something else']], ['status', 'License or union status', 'many', ['Licensed', 'Apprentice', 'Union member', 'None yet']]],
        [['tools', 'Your own tools', 'one', ['Full set', 'Some tools', 'None']], ['vehicle', "Valid driver's license and your own vehicle?", 'one', ['Yes', 'License only', 'No']], ['osha', 'OSHA training', 'many', ['OSHA 10', 'OSHA 30', 'None']], ['radius', 'How far will you go for job sites?', 'one', ['Local only', 'Up to 30 miles', 'Up to 60 miles', 'Anywhere in NJ or NY']]]
      ] },
    education: { t: 'Education', s: 'Teachers, aides, school staff', ic: 'book', old: ['Education and school jobs'],
      titles: ['Teacher', 'Special Education Teacher', 'Teacher Assistant', 'Paraprofessional', 'Substitute Teacher', 'School Counselor'],
      skills: ['Lesson planning', 'Classroom management', 'IEPs', 'Differentiated instruction', 'Parent communication', 'Assessment', 'Google Classroom'],
      str: ['Patience', 'Encouraging others'],
      mod: [
        [['role', 'Kind of role', 'many', ['Teacher', 'Paraprofessional or aide', 'Substitute', 'Special education', 'Counselor', 'Administrator', 'College or university']], ['cert', 'Teaching certification', 'one', ['Certified', 'In progress', 'Not certified']]],
        [['grades', 'Grade levels', 'many', ['Pre-K', 'Elementary', 'Middle school', 'High school', 'College']], ['subjects', 'Subjects (optional)', 'text', null, 'For example: math, ESL, special education'], ['schoolType', 'School type', 'many', ['Public', 'Private', 'Charter']], ['calendar', 'Schedule', 'one', ['School year', 'Year-round', 'Either']]]
      ] },
    retail: { t: 'Retail, hospitality and service', s: 'Stores, restaurants, hotels, service', ic: 'bag', old: ['Retail', 'Hospitality and food service'],
      titles: ['Store Manager', 'Assistant Store Manager', 'Sales Associate', 'Shift Supervisor', 'Restaurant Manager', 'Front Desk Agent'],
      skills: ['Customer service', 'Cash handling', 'Opening and closing', 'Inventory', 'Visual merchandising', 'Scheduling staff', 'Hitting sales goals'],
      str: ['Friendly under pressure', 'Reliability'],
      mod: [
        [['area', 'Where would you like to work?', 'many', ['Retail store', 'Restaurant or food service', 'Hotel', 'Customer service desk', 'Personal services']], ['level', 'Management or floor', 'one', ['Management', 'Floor or staff', 'Either']]],
        [['weekends', 'Weekends and holidays', 'one', ['Fine', 'Some are fine', 'No']], ['physical', 'On your feet all day', 'one', ['Fine', 'Light duty preferred']]]
      ] },
    logistics: { t: 'Logistics, warehouse and drivers', s: 'Warehouse, forklift, CDL, delivery', ic: 'truck', old: ['Warehouse and logistics', 'Driving (CDL or delivery)'],
      titles: ['Warehouse Associate', 'Forklift Operator', 'CDL Driver', 'Delivery Driver', 'Dispatcher', 'Inventory Specialist', 'Warehouse Supervisor'],
      skills: ['Picking and packing', 'Shipping and receiving', 'Inventory counts', 'Forklift', 'Pallet jack', 'Route planning', 'Safety rules', 'Scanners and WMS'],
      str: ['Dependable', 'Safety first'],
      mod: [
        [['role', 'Kind of role', 'many', ['Warehouse associate', 'Forklift operator', 'CDL driver', 'Delivery driver (non-CDL)', 'Dispatcher', 'Inventory or supply chain', 'Supervisor']]],
        [['cdl', 'CDL', 'one', ['Class A', 'Class B', 'None']], ['endorse', 'Endorsements (if any)', 'many', ['Hazmat', 'Tanker', 'Doubles or triples', 'Passenger', 'None']], ['forklift', 'Forklift certified?', 'one', ['Yes', 'No']], ['lifting', 'Lifting comfort', 'one', ['Up to 25 lb', 'Up to 50 lb', 'Over 50 lb']]]
      ] },
    legal: { t: 'Legal', s: 'Attorneys, paralegals, legal assistants', ic: 'scale', old: ['Other'],
      titles: ['Paralegal', 'Legal Assistant', 'Associate Attorney', 'Compliance Specialist', 'Contracts Administrator', 'Litigation Paralegal'],
      skills: ['Legal research', 'Drafting', 'E-filing', 'Discovery', 'Case management software', 'Contract review', 'Client intake', 'Calendaring deadlines'],
      str: ['Precise writing', 'Confidentiality'],
      mod: [
        [['role', 'Kind of role', 'many', ['Attorney', 'Paralegal', 'Legal assistant', 'Compliance', 'Contracts administration']], ['bar', 'Bar admissions', 'many', ['New York', 'New Jersey', 'Another state', 'None']]],
        [['areas', 'Practice areas', 'many', ['Litigation', 'Corporate', 'Real estate', 'Family', 'Immigration', 'Employment', 'Intellectual property', 'Personal injury', 'Something else']], ['where', 'Firm or in-house', 'one', ['Law firm', 'In-house', 'Government', 'Either']]]
      ] },
    other: { t: 'Something else', s: 'Tell me in your own words', ic: 'spark', old: ['Other'],
      titles: [], skills: [], str: [],
      mod: [
        [['describe', 'Describe the work you do or want', 'area', null, 'For example: security officer, social services caseworker, government clerk. I may text you a quick question.']]
      ] }
  };
  var FIELDS = ['clinical', 'nursing', 'it', 'finance', 'sales', 'insurance', 'office', 'trades', 'education', 'retail', 'logistics', 'legal', 'other'];

  /* ---------------- icons (inline SVG, 24 box) ---------------- */
  var IC = {
    tooth: '<path d="M7 3c-2.2 0-4 1.8-4 4.2 0 2.4 1 4 1.6 6 .6 2.2.8 7.8 2.6 7.8s1.8-4.5 3-5.2c.6-.4 1-.4 1.6 0 1.2.7 1.2 5.2 3 5.2s2-5.6 2.6-7.8c.6-2 1.6-3.6 1.6-6C19 4.8 17.2 3 15 3c-1.6 0-2.4 1-3 1S8.6 3 7 3z"/>',
    cross: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
    chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
    handshake: '<path d="M2 12l4-4 4 2 4-3 4 1 4 4-6 6-3-2-3 2-4-3z"/>',
    shield: '<path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    clip: '<rect x="5" y="4" width="14" height="18" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M8 11h8M8 15h8M8 19h5"/>',
    wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    book: '<path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-5a3 3 0 0 0-3 3"/><path d="M20 4v14h-6"/>',
    bag: '<path d="M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2"/>',
    truck: '<path d="M2 6h11v10H2zM13 10h4l3 3v3h-7z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    scale: '<path d="M12 3v18M7 21h10M4 7h16M4 7l-2 6a3 3 0 0 0 6 0zM20 7l-2 6a3 3 0 0 0 6 0z"/>',
    spark: '<path d="M12 2c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z"/>'
  };
  function icon(n, cls) { return '<svg class="' + (cls || 'ic') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (IC[n] || IC.spark) + '</svg>'; }

  /* ---------------- state ---------------- */
  /* Saved answers (this device or an emailed draft) are untrusted. cleanState() builds a brand-new state from an allow-list of
     known keys, read with hasOwnProperty, each checked for its type. __proto__, constructor and prototype are never copied, and
     the agreement boxes, signature, honeypot, text-message consent and any file are never restored. The backend (draftClean_ in
     Code_v1.27.gs) applies the same list before it stores a draft. */
  function blankState() { return { times: [], v2: { alsoOpen: [], titles: [], skills: {}, mod: {}, settingsPick: [], empTypes: [], standOut: [], rank: [], companyTypes: [], dream: [], avoid: [], deal: {}, style: {}, strengths: [], strengthsOwn: [], shifts: [], software: [] } }; }
  var NOSAVE = ['agreeTrue', 'agreeTrial', 'signature', 'website', 'resume', 'textOk'];
  var BADKEY = ['__proto__', 'constructor', 'prototype'];
  var ST = {
    str: ['referred', 'name', 'email', 'phone', 'contactBy', 'city', 'relocating', 'moveWhen', 'resumeName', 'jobNowTitle', 'jobNowEmployer', 'stillThere', 'endedOn', 'years', 'licenses', 'history', 'education', 'school', 'linkedin', 'start', 'workAuth', 'sponsorship', 'softwareOther', 'standOutOther', 'notWantOther', 'numbers', 'gaps', 'gapWords', 'neverMention', 'privateSearch', 'anythingElse', 'nycHybrid'],
    list: ['times'],
    v2str: ['situation', 'urgency', 'field', 'seniority', 'payUnit', 'payFloor', 'payTarget', 'currentPay', 'travel', 'getThere', 'relocateAreas', 'proudestWin', 'whyLooking', 'accommodations', 'resumeStyle', 'coverTone'],
    v2num: ['commuteMin'], v2bool: ['noResume', 'linkedinMakeover'],
    v2list: ['alsoOpen', 'titles', 'settingsPick', 'empTypes', 'standOut', 'rank', 'companyTypes', 'dream', 'avoid', 'strengths', 'strengthsOwn', 'shifts', 'software']
  };
  function own(o, k) { return !!o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k); }
  function okKey(k) { return typeof k === 'string' && k.length > 0 && k.length <= 200 && BADKEY.indexOf(k) < 0 && NOSAVE.indexOf(k) < 0; }
  function cStr(v, max) { return typeof v === 'string' ? v.slice(0, max || 4000) : undefined; }
  function cList(v) { if (!Array.isArray(v)) return undefined; var o = []; for (var i = 0; i < v.length && o.length < 40; i++) if (typeof v[i] === 'string' && v[i].trim() && o.indexOf(v[i].slice(0, 300)) < 0) o.push(v[i].slice(0, 300)); return o; }
  function cMap(v, val) { var o = {}; if (!v || typeof v !== 'object' || Array.isArray(v)) return o; var ks = Object.keys(v); for (var i = 0, n = 0; i < ks.length && n < 60; i++) { var k = ks[i]; if (!okKey(k) || !own(v, k)) continue; var x = val(v[k], k); if (x !== undefined) { o[k] = x; n++; } } return o; }
  function cleanState(src, keepMeta) {
    var out = blankState(), v = own(src, 'v2') && src.v2 && typeof src.v2 === 'object' && !Array.isArray(src.v2) ? src.v2 : {}, w = out.v2, x;
    if (!src || typeof src !== 'object' || Array.isArray(src)) return out;
    ST.str.forEach(function (k) { if (own(src, k) && (x = cStr(src[k])) !== undefined) out[k] = x; });
    ST.list.forEach(function (k) { if (own(src, k) && (x = cList(src[k]))) out[k] = x; });
    out.times = out.times.filter(function (t) { return O.times.indexOf(t) >= 0; });
    if (own(src, '_at') && typeof src._at === 'number' && isFinite(src._at)) out._at = Math.max(0, Math.min(200, Math.floor(src._at)));
    if (keepMeta && own(src, '_saved') && typeof src._saved === 'number') out._saved = src._saved;
    ST.v2str.forEach(function (k) { if (own(v, k) && (x = cStr(v[k])) !== undefined) w[k] = x; });
    ST.v2num.forEach(function (k) { if (own(v, k) && typeof v[k] === 'number' && isFinite(v[k])) w[k] = v[k]; });
    ST.v2bool.forEach(function (k) { if (own(v, k) && typeof v[k] === 'boolean') w[k] = v[k]; });
    ST.v2list.forEach(function (k) { if (own(v, k) && (x = cList(v[k]))) w[k] = x; });
    if (w.field && FIELDS.indexOf(w.field) < 0) delete w.field;
    w.alsoOpen = w.alsoOpen.filter(function (k) { return FIELDS.indexOf(k) >= 0 && k !== 'other' && k !== w.field; }).slice(0, 2);
    /* on-screen limits: picks from a fixed list keep only real options; free text lists keep the screen's maximum */
    var only = { settingsPick: O.settings, empTypes: O.empTypes, standOut: O.standOut, companyTypes: O.companyTypes, shifts: O.shifts, software: O.software };
    Object.keys(only).forEach(function (k) { w[k] = w[k].filter(function (t) { return only[k].indexOf(t) >= 0; }); });
    var CAP = { titles: 5, strengths: 5, rank: 3, dream: 15, avoid: 15 };
    Object.keys(CAP).forEach(function (k) { w[k] = uniq(w[k]).slice(0, CAP[k]); });
    /* own strengths: at most OWN_MAX (the strengths screen shows the same limit); picked ones always stay */
    w.strengthsOwn = uniq(w.strengths.filter(function (t) { return STRENGTHS.indexOf(t) < 0 && !FIELDS.some(function (k) { return F[k].str.indexOf(t) >= 0; }); }).concat(w.strengthsOwn)).slice(0, OWN_MAX);
    w.rank = w.rank.filter(function (t) { return w.standOut.indexOf(t) >= 0; });
    if (w.payUnit && w.payUnit !== 'Hourly' && w.payUnit !== 'Yearly') delete w.payUnit;
    if (w.urgency && O.urgency.indexOf(w.urgency) < 0) delete w.urgency;
    if (own(v, 'skills')) w.skills = cMap(v.skills, function (s) { return s === 'nice' || s === 'must' ? s : undefined; });
    if (own(v, 'deal')) w.deal = cMap(v.deal, function (s, k) { return (s === 'no' || s === 'ok') && DEAL.some(function (c) { return c.k === k; }) ? s : undefined; });
    if (own(v, 'style')) w.style = cMap(v.style, function (s, k) { return typeof s === 'string' && /^[0-3]$/.test(k) ? s.slice(0, 100) : undefined; });
    if (own(v, 'mod')) {
      var m = v.mod, ks = m && typeof m === 'object' && !Array.isArray(m) ? Object.keys(m) : [], flat = ks.some(function (k) { return !m[k] || typeof m[k] !== 'object' || Array.isArray(m[k]); });
      var one = function (q) { return cMap(q, function (a) { return typeof a === 'string' ? a.slice(0, 2000) : cList(a); }); };
      if (flat) { if (w.field) w.mod[w.field] = one(m); }
      else ks.forEach(function (k) { if ((FIELDS.indexOf(k) >= 0 || k === '_') && own(m, k)) w.mod[k] = one(m[k]); });
    }
    return out;
  }
  var D = blankState();
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && typeof saved === 'object' && saved.v2 && typeof saved.v2 === 'object') { D = cleanState(saved, true); localStorage.setItem(KEY, JSON.stringify(D)); } /* written back clean */
  } catch (e) {}
  var V = D.v2;
  /* v2.mod holds one answer set per field (finding 3): { insurance: { role: [...] }, office: {...} }. Older saves kept one flat set. */
  function plain(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
  function fixMod() {
    if (!plain(V.mod)) V.mod = {};
    var ks = Object.keys(V.mod), flat = ks.length && ks.some(function (k) { return !plain(V.mod[k]); });
    if (flat) { var o = {}; o[V.field || '_'] = V.mod; V.mod = o; }
    if (!plain(V.skills)) V.skills = {}; if (!plain(V.deal)) V.deal = {}; if (!plain(V.style)) V.style = {};
  }
  fixMod();
  var cur = Math.max(0, Number(D._at) || 0), file = null, parsed = null, parsing = false, msg = '', msgKind = '', bad = [], busy = false, sent = null, payOk = '';
  var autoT = null, fromReview = false, laterOpen = false, laterBusy = false, laterMsg = '', laterKind = '', dealAnim = false, parseT = null;
  /* returns true only when the saved copy reads back exactly as written */
  function save() { try { var c = cleanState(JSON.parse(JSON.stringify(D))); c._at = cur; c._saved = Date.now(); var t = JSON.stringify(c); localStorage.setItem(KEY, t); return localStorage.getItem(KEY) === t; } catch (e) { return false; } }

  /* ---------------- backend calls (never in PREVIEW) ---------------- */
  /* Same request style as the live form's submit() in /start/: POST, JSON body as text/plain (no CORS preflight), follow the redirect. */
  /* Every call gives up after about 15 seconds (AbortController), so a slow or stuck backend never leaves the page waiting.
     The intake itself gets longer, since it can carry a resume file of up to 10 MB. */
  var TIMEOUT = 15000, TEST_TIMEOUT = Math.max(0, Number(ROOT.getAttribute('data-timeout')) || 0); /* data-timeout: tests only */
  function post(body, ms) {
    if (PREVIEW) return Promise.reject(new Error('preview'));
    var ac = null, tm = null; try { ac = new AbortController(); } catch (e) {}
    var opts = { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow' };
    if (ac) { opts.signal = ac.signal; tm = setTimeout(function () { ac.abort(); }, TEST_TIMEOUT || ms || TIMEOUT); }
    return fetch(API, opts)
      .then(function (r) { return r.text().then(function (t) { var d = null; try { d = JSON.parse(t); } catch (e) {} return d && typeof d === 'object' && r.ok ? d : { ok: false, error: 'server' }; }); })
      .then(function (d) { clearTimeout(tm); return d; }, function (e) { clearTimeout(tm); throw e; });
  }
  /* funnel: a random id per browser tab, nothing personal */
  var SID = (function () {
    var s = ''; try { s = sessionStorage.getItem('sp_i2_sid') || ''; } catch (e) {}
    if (!/^[a-z0-9]{12,24}$/.test(s)) {
      s = ''; var a = 'abcdefghijklmnopqrstuvwxyz0123456789';
      try { var u = new Uint8Array(16); crypto.getRandomValues(u); for (var i = 0; i < 16; i++) s += a[u[i] % 36]; } catch (e) { for (var j = 0; j < 16; j++) s += a[Math.floor(Math.random() * 36)]; }
      try { sessionStorage.setItem('sp_i2_sid', s); } catch (e) {}
    }
    return s;
  })();
  var lastEv = '';
  function ievent(screen, stop) {
    if (PREVIEW || !/^[a-zA-Z0-9]{1,20}$/.test(screen) || screen === lastEv) return;
    lastEv = screen;
    try { post({ action: 'ievent', sid: SID, screen: screen, stop: Math.max(0, Math.min(4, stop | 0)), field: FIELDS.indexOf(V.field) >= 0 ? V.field : '' }).catch(function () {}); } catch (e) {}
  }
  /* "finish later" draft: everything on this device except the agreement boxes, the signature, the honeypot and any file */
  function draftData() { var c = cleanState(JSON.parse(JSON.stringify(D))); c._at = cur; return c; }

  /* ---------------- helpers that read answers ---------------- */
  function field() { return FIELDS.indexOf(V.field) >= 0 ? F[V.field] : null; }
  function fieldsAll() { return uniq([V.field].concat(arr(V.alsoOpen))).filter(function (k) { return FIELDS.indexOf(k) >= 0; }); }
  function remoteOnly() { var s = arr(V.settingsPick); return s.length === 1 && s[0] === 'Remote'; }
  var DESK = ['it', 'finance', 'sales', 'insurance', 'office', 'legal'];
  function settingsOld() { var s = arr(V.settingsPick); return s.indexOf('Open to all') >= 0 ? ['On site', 'Hybrid', 'Remote'] : s.filter(function (x) { return x !== 'Open to all'; }); }
  function yearly(n) { return V.payUnit === 'Hourly' ? Math.round(n * 2080) : Math.round(n); }
  function num(v) { var m = String(v == null ? '' : v).replace(/[$,\s]/g, '').match(/^(\d+(?:\.\d+)?)(k)?$/i); if (!m) return NaN; return parseFloat(m[1]) * (m[2] ? 1000 : 1); }
  function payFloorYear() { var n = num(V.payFloor); if (!(n > 0)) return NaN; var y = yearly(n); return y >= 1000 ? y : NaN; }
  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function money2(n) { return '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
  /* answers for one field's module (finding 3: each field keeps its own set, so a field you left never leaks into the payload) */
  function modOf(k) { k = k || V.field || '_'; if (!plain(V.mod[k])) V.mod[k] = {}; return V.mod[k]; }
  /* every skill offered for the main field plus the also-open fields (no cap, so adding a field never cuts one) */
  function skillPool() { return uniq([].concat.apply([], fieldsAll().map(function (k) { return F[k].skills; }))); }
  function skillsPicked(kind) { var pool = skillPool(); return pool.filter(function (s) { return kind ? V.skills[s] === kind : !!V.skills[s]; }); }
  /* commute counts only once the slider was moved (finding 10): the live form left it blank, which the backend reads as 50 miles */
  function commuteSet() { return Number(V.commuteMin) > 0; }
  /* Old "Type of work" values (finding 10). The live form (/start/index.html OPT.types) only accepts:
       Office and admin, Customer service, Sales, Insurance, Payroll HR or finance, Healthcare admin or front desk, Nursing (RN or LPN),
       Healthcare support (CNA, medical assistant, techs, aides), Dental, IT and tech, Construction and skilled trades,
       Facilities and maintenance, Warehouse and logistics, Driving (CDL or delivery), Retail, Hospitality and food service,
       Education and school jobs, Government and civil service, Social and human services, Security, Other.
     Mapping from the new fields:
       clinical -> "Dental" only for a dental specialty (or, with no specialty answered, dental titles); physicians, PAs, therapists,
                   pharmacists and anything else -> "Other", with the specialty written out in the anythingElse summary line.
       legal    -> "Office and admin" for paralegal, legal assistant or contracts administration (the closest live value);
                   attorney or compliance -> "Other". No role answered -> "Office and admin". The role goes in the summary line.
       other    -> "Other", with the client's own description in the summary line.
       every other field -> its F[k].old list, unchanged. */
  var DENTAL = ['General dentistry', 'Pediatric dentistry', 'Orthodontics', 'Oral surgery', 'Endodontics', 'Periodontics', 'Prosthodontics'];
  function typesFor(k) {
    var m = plain(V.mod[k]) ? V.mod[k] : {};
    if (k === 'clinical') { var sp = m.specialty; if (sp) return [DENTAL.indexOf(sp) >= 0 ? 'Dental' : 'Other']; return [titleList().some(function (t) { return /\bdent(al|ist)/i.test(t); }) ? 'Dental' : 'Other']; }
    if (k === 'legal') { var r = arr(m.role); if (!r.length) return ['Office and admin']; var o = []; if (r.some(function (x) { return /Paralegal|Legal assistant|Contracts/.test(x); })) o.push('Office and admin'); if (r.some(function (x) { return /Attorney|Compliance/.test(x); })) o.push('Other'); return o; }
    return F[k].old;
  }
  function typesOld() { return uniq([].concat.apply([], fieldsAll().map(typesFor))); }
  /* words for the summary line, so "Other" never arrives without a description */
  function typesNote() {
    return fieldsAll().map(function (k) {
      var m = plain(V.mod[k]) ? V.mod[k] : {};
      if (k === 'other') return String(m.describe || '').trim() ? 'In their words: ' + String(m.describe).trim() : '';
      if (k === 'clinical' && typesFor(k).indexOf('Other') >= 0) return F[k].t + (m.specialty ? ' (' + m.specialty + ')' : '');
      if (k === 'legal') return F[k].t + (arr(m.role).length ? ' (' + arr(m.role).join(', ') + ')' : '');
      return '';
    }).filter(String).join('; ');
  }
  /* Old "Full-time or part-time" (finding 10). Live values: Full-time only, Part-time only, Either. There is no contract value, so
     Contract or Temp-to-hire with neither Full-time nor Part-time sends "Either" (no hours limit), Per diem alone sends
     "Part-time only", and the summary line spells out the exact kinds picked. */
  function hoursOld() {
    var et = arr(V.empTypes), ft = et.indexOf('Full-time') >= 0, pt = et.indexOf('Part-time') >= 0;
    if (ft && !pt) return 'Full-time only'; if (pt && !ft) return 'Part-time only';
    if (!ft && !pt && et.length === 1 && et[0] === 'Per diem') return 'Part-time only';
    return 'Either';
  }
  function commuteOld(m) { m = Number(m); if (!m) return ''; if (m <= 15) return 'Up to 15 min'; if (m <= 30) return 'Up to 30 min'; if (m <= 45) return 'Up to 45 min'; if (m <= 60) return 'Up to 1 hour'; if (m < 120) return '1 hour or more'; return 'Any distance'; }
  function payAimOld(y) { if (!(y > 0)) return ''; if (y < 40000) return 'Under $40,000'; if (y < 50000) return '$40,000 to $50,000'; if (y < 60000) return '$50,000 to $60,000'; if (y < 75000) return '$60,000 to $75,000'; if (y < 90000) return '$75,000 to $90,000'; return '$90,000 or more'; }
  function dealList() { return DEAL.filter(function (c) { return V.deal[c.k] === 'no'; }).map(function (c) { return c.k; }); }
  function titleList() { return uniq(arr(V.titles).map(function (s) { return String(s).trim(); }).filter(String)); }

  /* ---------------- resume reading (on this device only) ---------------- */
  var LIBS = {
    pdf: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    pdfw: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    docx: 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js'
  };
  var loaded = {};
  function load(src) {
    if (loaded[src]) return loaded[src];
    loaded[src] = new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.async = true; s.onload = ok; s.onerror = function () { delete loaded[src]; no(new Error('load')); }; document.head.appendChild(s); });
    return loaded[src];
  }
  function fileText(f) {
    var name = String(f.name || '').toLowerCase();
    var buf = function () { return new Promise(function (ok, no) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.onerror = no; r.readAsArrayBuffer(f); }); };
    if (/\.pdf$/.test(name) || f.type === 'application/pdf') {
      return load(LIBS.pdf).then(function () {
        var lib = window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = LIBS.pdfw;
        return buf().then(function (b) { return lib.getDocument({ data: new Uint8Array(b) }).promise; }).then(function (doc) {
          var pages = []; for (var i = 1; i <= Math.min(doc.numPages, 6); i++) pages.push(i);
          return Promise.all(pages.map(function (p) { return doc.getPage(p).then(function (pg) { return pg.getTextContent(); }).then(function (tc) {
            var lines = [], y = null, line = '';
            tc.items.forEach(function (it) { var yy = Math.round(it.transform[5]); if (y !== null && Math.abs(yy - y) > 2) { lines.push(line); line = ''; } line += (line && !/\s$/.test(line) && !/^\s/.test(it.str) ? ' ' : '') + it.str; y = yy; if (it.hasEOL) { lines.push(line); line = ''; y = null; } });
            if (line) lines.push(line); return lines.join('\n');
          }); })).then(function (t) { return t.join('\n'); });
        });
      });
    }
    if (/\.docx$/.test(name)) return load(LIBS.docx).then(function () { return buf().then(function (b) { return window.mammoth.extractRawText({ arrayBuffer: b }); }).then(function (r) { return r.value; }); });
    if (/\.txt$/.test(name)) return new Promise(function (ok, no) { var r = new FileReader(); r.onload = function () { ok(String(r.result)); }; r.onerror = no; r.readAsText(f); });
    return Promise.reject(new Error('type'));
  }
  var MONTH = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?';
  var DATE = '(?:' + MONTH + '\\s+)?(?:19|20)\\d\\d|\\d{1,2}\\/(?:19|20)?\\d\\d';
  var RANGE = new RegExp('(' + DATE + ')\\s*(?:-|–|—|to|until|through)\\s*(' + DATE + '|present|current|now|today)', 'i');
  function yearOf(s) { var m = String(s).match(/(19|20)\d\d/); if (m) return +m[0]; var m2 = String(s).match(/\/(\d\d)$/); return m2 ? 2000 + +m2[1] : NaN; }
  /* Pure: resume text in, best guesses out. Every guess is shown to the client to confirm or change; nothing is kept silently. */
  function parseResume(text) {
    var lines = String(text || '').split(/\r?\n/).map(function (s) { return s.replace(/\s+/g, ' ').trim(); }).filter(String);
    var out = { title: '', employer: '', current: '', years: '', employers: [], education: '', school: '', certs: [], linkedin: '' };
    var li = String(text).match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_%-]+/i); if (li) out.linkedin = (/^https?:/i.test(li[0]) ? '' : 'https://') + li[0].replace(/^(?:https?:\/\/)?(?:www\.)?/i, 'www.');
    var jobs = [], firstYear = NaN, lastYear = NaN, nowY = new Date().getFullYear(), prevJ = -1;
    /* Sections (finding 6): a heading is a short line that is only a section name. Jobs are read from Experience sections and from
       lines before any heading; Education, Skills, Certifications and the like are skipped wherever they sit, so an Education or
       Skills block above Experience no longer ends the job scan. */
    var SEC = /^(?:((?:professional |work |relevant |career |employment )?(?:experience|history)|employment(?: history)?)|(education|academic background|training)|((?:technical |core |key )?skills|core competencies|competencies|areas of expertise|expertise)|(certifications?|licen[sc]es?|credentials)|(summary|professional summary|profile|professional profile|objective|career objective|about me)|(volunteer(?:ing| work| experience)?|awards|honors|projects|languages|interests|references|additional information|activities|publications))(?:\s+(?:and|&)\s+[a-z ]{3,30})?\s*:?$/i;
    var secOf = [], kind = '';
    for (var i = 0; i < lines.length; i++) {
      var hm = lines[i].length <= 48 ? lines[i].match(SEC) : null;
      if (hm) { kind = hm[1] ? 'exp' : hm[2] ? 'edu' : hm[3] ? 'skills' : hm[4] ? 'cert' : hm[5] ? 'summary' : 'other'; secOf.push('head'); }
      else secOf.push(kind || 'none');
    }
    function inJobs(n) { return secOf[n] === 'exp' || secOf[n] === 'none'; }
    var stopAt = lines.length;
    var ROLE = /\b(dentist|physician|doctor|nurse|assistant|associate|specialist|technician|tech|executive|manager|analyst|representative|rep|lead|director|engineer|coordinator|teacher|driver|officer|consultant|administrator|admin|clerk|agent|supervisor|developer|accountant|bookkeeper|paralegal|attorney|producer|underwriter|adjuster|therapist|hygienist|operator|associate|intern|owner|founder|president|cashier|server|electrician|plumber|carpenter|welder|mechanic|designer|writer|recruiter|generalist|advisor|counselor)\b/i;
    var ORG = /\b(inc|llc|corp|corporation|company|co\.|group|dental|hospital|bank|university|college|network|health|associates|services|school|agency|center|clinic|partners|systems|solutions|usa|international)\b/i;
    var PLACE = /^[A-Z][A-Za-z.]+(?: [A-Z][A-Za-z.]+)*,\s*[A-Z]{2}\b/;
    var HEAD = /^[A-Z][A-Z &/]{3,}$/;
    for (var j = 0; j < stopAt; j++) {
      if (!inJobs(j)) continue;
      var m = lines[j].match(RANGE); if (!m) continue;
      var a = yearOf(m[1]), cur = /present|current|now|today/i.test(m[2]), b = cur ? nowY : yearOf(m[2]);
      if (!(a > 1960) || !(b >= a)) continue;
      /* pieces: the text on the date line, then up to two lines above it (never reaching back into the previous job) */
      var cand = [lines[j].replace(RANGE, '')];
      for (var up = 1; up <= 2; up++) { var L = lines[j - up]; if (L == null || j - up <= prevJ || secOf[j - up] === 'head' || !inJobs(j - up) || RANGE.test(L) || /^[-•·*]/.test(L) || HEAD.test(L) || L.length > 90) break; cand.unshift(L); }
      prevJ = j;
      var pieces = [];
      cand.forEach(function (c) { c = c.replace(/^[\s|,•·:–—-]+|[\s|,•·:–—-]+$/g, ''); if (!c) return;
        var at = c.split(/\s+at\s+/); if (at.length === 2) { pieces.push(at[0]); pieces.push(at[1].split(/\s*[|•·]\s*/)[0]); return; }
        var seg = c.split(/\s*[|•·]\s*/); seg.forEach(function (x, n) { if (n === 0 || !PLACE.test(x)) pieces.push(x); });
      });
      pieces = pieces.map(function (x) { return x.trim(); }).filter(function (x) { return x && !PLACE.test(x) && !/@|\d{3}.\d{3}.\d{4}/.test(x); });
      /* "Title, Employer" on one line */
      if (pieces.length === 1 && pieces[0].indexOf(',') > 0) { var cm = pieces[0].split(/,\s*/); if (ROLE.test(cm[0])) pieces = [cm[0], cm.slice(1).join(', ')]; }
      var ttl = pieces.filter(function (x) { return ROLE.test(x) && !ORG.test(x.replace(/\bassociates\b/i, '')); })[0] || pieces.filter(function (x) { return ROLE.test(x); })[0] || '';
      var emp = pieces.filter(function (x) { return x !== ttl; })[0] || '';
      if (!ttl && pieces.length) { ttl = pieces[0]; emp = pieces[1] || ''; }
      jobs.push({ title: ttl.slice(0, 80), employer: emp.replace(/,\s*[A-Z][A-Za-z. ]+,\s*[A-Z]{2}$/, '').replace(/,\s*[A-Z]{2}$/, '').slice(0, 80), from: a, to: b, current: cur });
      if (!(firstYear <= a)) firstYear = a; if (!(lastYear >= b)) lastYear = b;
    }
    if (jobs.length) {
      out.title = jobs[0].title; out.employer = jobs[0].employer; out.current = jobs[0].current ? 'Yes' : 'No';
      out.employers = uniq(jobs.map(function (x) { return x.employer; }).filter(Boolean)).slice(0, 5);
      var yrs = Math.max(0, (lastYear || nowY) - firstYear); out.years = yrs ? String(yrs) : '';
    }
    /* Degrees (finding 6): words match in any case; short forms (MD, MA, MS, BA...) match only in capitals, standing alone, and only
       after "City, ST" and "ST 12345" are taken out of the line, so a state in an address never reads as a degree. */
    var AB = function (s) { return new RegExp('(?:^|[^A-Za-z])(?:' + s + ')(?![A-Za-z])'); };
    var deg = [
      [[/\b(doctor(ate)? of|doctoral|dental surgery)\b/i, AB('Ph\\.?\\s?D\\.?|D\\.D\\.S\\.?|DDS|D\\.M\\.D\\.?|DMD|M\\.D\\.|MD|J\\.D\\.|JD|Pharm\\.?\\s?D\\.?|Psy\\.?\\s?D\\.?|DPT|DNP|Ed\\.?D\\.?|DVM|O\\.D\\.|OD')], 'Doctorate'],
      [[/\bmaster'?s?\b/i, AB('M\\.?B\\.?A\\.?|M\\.S\\.?|MS|M\\.A\\.?|MA|M\\.Ed\\.?|MEd|MSN|MPH|MSW|M\\.Sc\\.?|MSc|MPA|LL\\.?M\\.?')], "Master's or higher"],
      [[/\bbachelor'?s?\b/i, AB('B\\.S\\.?|BS|B\\.A\\.?|BA|B\\.Sc\\.?|BSc|BSN|BBA|B\\.B\\.A\\.?|BFA|B\\.Ed\\.?')], "Bachelor's degree"],
      [[/\bassociate'?s?\s+(degree|of|in)\b/i, AB('A\\.A\\.S?\\.?|AAS|AA|A\\.S\\.|ASN|A\\.A\\.S\\.')], "Associate's degree"],
      [[/\b(ged|high school diploma)\b/i], 'High school or GED']
    ];
    var noPlace = function (s) { return s.replace(/,\s*[A-Z]{2}(?:\s+\d{5}(?:-\d{4})?)?(?=\s*$|\s*[|•·,;()]|\s+(?:19|20)\d\d|\s+[–—-])/g, '').replace(/\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/g, ''); };
    var edLines = lines.filter(function (s, n) { return secOf[n] === 'edu'; }).slice(0, 12);
    if (!edLines.length) edLines = lines;
    for (var d = 0; d < deg.length && !out.education; d++) { for (var e = 0; e < edLines.length; e++) { var tl = noPlace(edLines[e]); if (deg[d][0].some(function (re) { return re.test(tl); })) { out.education = deg[d][1]; out.school = edLines[e].slice(0, 160); break; } } }
    /* Licenses (finding 6): every line of a Certifications or Licenses section, plus, outside it, only real license lines: a license
       number, or a short line that starts with License, Licensed in, Certified or Certification (never a job line or a sentence). */
    var certLines = lines.filter(function (s, n) { return secOf[n] === 'cert' && !/^[A-Z][A-Z &]{4,}$/.test(s); }).slice(0, 8);
    lines.forEach(function (s, n) {
      if (secOf[n] === 'cert' || secOf[n] === 'head' || s.length >= 90 || RANGE.test(s) || certLines.indexOf(s) >= 0) return;
      var t = s.replace(/^[-•·*]\s*/, ''), words = t.split(/\s+/).length;
      var number = /\blicen[sc]e\s*(?:#|no\.?|number|num\.?)\s*:?\s*[A-Z0-9][A-Z0-9-]{2,}/i.test(t);
      var starts = /^(licen[sc]e[ds]?\b|licensed in\b|certified\b|certification\b|board certified\b)/i.test(t) || /^[A-Z]{2}\s+[A-Za-z ]{2,40}\blicen[sc]e\b/.test(t);
      if (number || (starts && secOf[n] !== 'exp' && words <= 10 && !/\.\s*$/.test(t))) certLines.push(t);
    });
    out.certs = uniq(certLines.map(function (s) { return s.replace(/^[-•·\\]+\s*/, '').trim(); }).filter(function (s) { return s.length > 2; })).slice(0, 6);
    return out;
  }
  window.__i2parse = parseResume; /* for tests */

  /* ---------------- screens ---------------- */
  var STOPS = ['Welcome', 'You', 'Your field', 'Your ideal job', 'Your story'], SHORT = ['Start', 'You', 'Field', 'Ideal job', 'Story'];
  var CHEER = ['', 'Nice start. Next, the work you do.', "That's the hardest part done.", 'Almost there. Now the fun part: your story.', ''];
  /* A screen: id, stop (0-4), show() (optional), html(), need() returns missing keys, auto (single-tap screens move on by themselves). */
  var S = [];
  function add(s) { S.push(s); }

  add({ id: 'welcome', stop: 0, bare: 1, html: function () {
    var resume = D._saved && D.name ? '<p class="i2-note">Welcome back, ' + esc(String(D.name).split(' ')[0]) + '. Your answers are saved on this device, so you can pick up where you left off.</p>' : '';
    return '<div class="i2-hi"><img class="i2-face" src="' + esc(HEADSHOT) + '" alt="Sherif Mehanni" width="88" height="88" decoding="async"><div><p class="i2-k">Steady Path Careers</p><h2 class="i2-h">Hi, I\'m Sherif.</h2><p class="i2-p">A few minutes here helps me find jobs that actually fit you.</p></div></div>' +
      '<ul class="i2-facts"><li>' + icon('spark', 'ic sm') + '<span>About 10 minutes, mostly taps</span></li><li>' + icon('shield', 'ic sm') + '<span>Answers save on this device as you go</span></li><li>' + icon('clip', 'ic sm') + '<span>Have your resume handy, if you have one</span></li></ul>' + resume +
      (PREVIEW ? '<p class="i2-warn"><b>Preview.</b> This version sends nothing. At the end you will see exactly what it would send.</p>' : '');
  }, next: "Let's go" });
  add({ id: 'referred', stop: 0, html: function () { return h('Did someone send you my way?', 'Optional. It helps me thank them.') + inp('referred', 'Their name', 'text', { ph: 'First and last name', ac: 'off' }); }, skip: 1 });

  add({ id: 'contact', stop: 1, need: ['name', 'email', 'phone'], html: function () {
    return h('First, how do I reach you?', 'Your email is also how you sign in to your portal.') +
      inp('name', 'First and last name, as it should appear on your resume', 'text', { ac: 'name', req: 1 }) +
      inp('email', 'Email you check daily', 'email', { ac: 'email', req: 1, im: 'email' }) +
      inp('phone', 'Phone', 'tel', { ac: 'tel', req: 1, im: 'tel', ph: '732-555-0123' });
  } });
  add({ id: 'reach', stop: 1, need: ['contactBy'], html: function () { return h('Best way to reach you?', '') + chips('contactBy', '', O.contactBy, { one: 1 }) + chips('times', 'Best times (optional)', O.times, {}); } });
  add({ id: 'where', stop: 1, need: ['city'], html: function () {
    return h('Where do you live?', 'City, state and ZIP. I measure commutes from here.') + inp('city', 'Home city, state, ZIP', 'text', { req: 1, ph: 'Maplewood, NJ 07040', ac: 'address-level2' }) +
      chips('relocating', 'Moving to New Jersey or New York?', O.relocating, { one: 1 }) + (/^Yes/.test(D.relocating || '') ? inp('moveWhen', 'When, and to what town or area?', 'text', { ph: 'March 2027, Jersey City or Hoboken' }) : '');
  } });
  add({ id: 'resume', stop: 1, html: function () {
    var st = parsing ? '<p class="i2-reading" role="status"><span class="i2-dots" aria-hidden="true"><i></i><i></i><i></i></span>Reading your resume…</p>' :
      parsed ? '<p class="i2-okline" role="status">' + icon('shield', 'ic sm') + 'Read it. Next, you will check what I found.</p>' : '';
    return h('Upload your resume', 'PDF or Word, up to 10 MB. I read it right here on your device to fill in the next screen. Any version is fine.') +
      '<label class="i2-drop" id="i2drop"><input type="file" id="i2file" accept=".pdf,.doc,.docx,.rtf,.txt"><span class="i2-dropin">' + icon('clip', 'ic') +
      '<b>' + (file ? esc(file.name) : D.resumeName ? 'Attach ' + esc(D.resumeName) + ' again' : 'Tap to choose a file') + '</b><span>' + (file ? 'Tap to change it' : 'or drag it here') + '</span></span></label>' + st +
      '<button type="button" class="i2-link" data-act="noresume">No resume? No problem. Answer a few questions instead.</button>';
  }, nextLabel: function () { return file ? 'Continue' : 'Skip for now'; } });
  /* shown after a file, after "No resume", and after a reload that lost the file but kept the answers (finding 8) */
  add({ id: 'confirm', stop: 1, show: function () { return !!(file || V.noResume || D.resumeName); }, html: function () {
    var p = parsed || {};
    var lead = V.noResume ? h('A few quick questions instead', 'I will build your resume from these. You can add more on a call.') :
      parsing ? h('Still reading your resume', 'This takes a few seconds. The boxes below fill in when I finish. Anything you type stays as you typed it.') +
        '<p class="i2-reading" role="status"><span class="i2-dots" aria-hidden="true"><i></i><i></i><i></i></span>Still reading your resume…</p>' :
      lostResume() ? h('Check your work details', 'Your answers are saved, but your resume file did not carry over when the page reloaded. Tap Back to attach it again, or keep going and attach it before you send.') :
      h('Here is what I found', p.title || p.employer || D.jobNowTitle ? 'Check each one. Change anything I got wrong.' : 'I could not read much from that file. Please fill these in.');
    return lead + '<div class="i2-two">' + inp('jobNowTitle', 'Current or most recent job title', 'text', { ph: 'Business Operations Analyst' }) + inp('jobNowEmployer', 'Employer', 'text', { ph: 'AT&T' }) + '</div>' +
      chips('stillThere', 'Still in that job?', O.yesno, { one: 1 }) + (D.stillThere === 'No' ? inp('endedOn', 'Month and year it ended', 'text', { ph: 'September 2026' }) : '') +
      inp('years', 'Years of work experience', 'text', { im: 'numeric', ph: '8' }) +
      inp('licenses', 'Licenses and certifications: exact name, state, active or expired', 'area', { help: 'Only ones you hold, written exactly as issued.' }) +
      (V.noResume ? inp('history', 'Your work history: employer, title, dates, what you did', 'area', { ph: 'Comfort Dental, General Dentist, Nov 2024 to Mar 2025…' }) : '');
  } });
  add({ id: 'edu', stop: 1, html: function () { return h('Highest education to show', 'I use this on your resume and to skip jobs that need a degree you do not want shown.') + chips('education', '', O.education, { one: 1 }) + inp('school', 'School or program, and years if you want them shown (optional)', 'text'); } });
  add({ id: 'linkedin', stop: 1, html: function () {
    return h('Your LinkedIn', 'Optional. Recruiters check it, so it should match your resume.') + inp('linkedin', 'LinkedIn profile link', 'url', { ph: 'https://www.linkedin.com/in/…', im: 'url' }) +
      toggle('linkedinMakeover', 'I am interested in a LinkedIn makeover too', 'Just tells me you are interested. Nothing is added or charged.');
  } });
  add({ id: 'situation', stop: 1, auto: 1, need: ['v2.situation'], html: function () { return h('Which fits you best right now?', 'No judgment. It helps me pitch you the right way.') + cards('v2.situation', O.situation); } });
  add({ id: 'urgency', stop: 1, need: ['start'], html: function () {
    var set0 = O.urgency.indexOf(V.urgency) >= 0, u = set0 ? O.urgency.indexOf(V.urgency) : 1;
    return h('How soon do you need something?', 'Slide to the spot that fits. Optional.') +
      '<div class="q"><label class="lab" for="i2urg">' + esc(set0 ? O.urgency[u] : 'Slide to choose') + '</label><input type="range" id="i2urg" min="0" max="3" step="1" value="' + u + '" data-range="urgency" aria-valuetext="' + esc(set0 ? O.urgency[u] : 'Not chosen') + '"><div class="i2-ends"><span>As soon as possible</span><span>Taking my time</span></div></div>' +
      chips('start', 'Earliest start date', O.start, { one: 1, req: 1 });
  } });
  add({ id: 'auth', stop: 1, need: ['workAuth', 'sponsorship'], html: function () {
    return h('Two questions employers always ask', 'Your answers help me pick jobs that fit.') + chips('workAuth', 'Are you legally authorized to work in the United States?', O.workAuth, { one: 1, req: 1 }) +
      chips('sponsorship', 'Will you now or in the future need visa sponsorship?', O.sponsorship, { one: 1, req: 1 });
  } });

  add({ id: 'field', stop: 2, need: ['v2.field'], html: function () {
    return h('What field are you in?', 'Pick your main field. Then, if you like, up to two more you are open to.') +
      '<div class="i2-tiles" id="g_f_v2_field" role="radiogroup" aria-label="Main field">' + FIELDS.map(function (k) { var f = F[k], on = V.field === k; return '<button type="button" class="i2-tile' + (on ? ' on' : '') + '" role="radio" aria-checked="' + on + '" data-tile="' + k + '">' + icon(f.ic, 'ic lg') + '<b>' + esc(f.t) + '</b><span>' + esc(f.s) + '</span></button>'; }).join('') + '</div>' +
      (V.field ? '<div class="q"><div class="lab" id="l_also">Also open to (up to two, optional)</div><div class="chips" role="group" aria-labelledby="l_also">' + FIELDS.filter(function (k) { return k !== V.field && k !== 'other'; }).map(function (k) { var on = arr(V.alsoOpen).indexOf(k) >= 0, full = !on && arr(V.alsoOpen).length >= 2; return '<label' + (full ? ' class="off"' : '') + '><input type="checkbox" data-also="' + k + '"' + (on ? ' checked' : '') + (full ? ' disabled' : '') + '>' + esc(F[k].t) + '</label>'; }).join('') + '</div></div>' : '');
  } });
  /* module screens: up to 4 per field; only the main field's module runs */
  for (var mi = 0; mi < 4; mi++) (function (mi) {
    add({ id: 'mod' + mi, stop: 2, show: function () { var f = field(); return !!(f && f.mod[mi]); }, need: function () {
      var f = field(); if (!f || !f.mod[mi]) return [];
      return V.field === 'other' ? (String(modOf().describe || '').trim() ? [] : ['v2.mod.describe']) : [];
    }, html: function () {
      var f = field(), qs = f.mod[mi];
      return h(mi === 0 ? f.t : f.t + ', continued', mi === 0 ? 'A few questions just for your field.' : '') + qs.map(function (q) {
        var k = 'v2.mod.' + q[0];
        if (q[2] === 'text' || q[2] === 'area') return inp(k, q[1], q[2] === 'area' ? 'area' : 'text', { help: q[4] });
        return chips(k, q[1], q[3], { one: q[2] === 'one' });
      }).join('');
    } });
  })(mi);
  add({ id: 'titles', stop: 2, need: ['v2.titles'], html: function () {
    var sug = uniq([].concat.apply([], fieldsAll().map(function (k) { return F[k].titles; }))).slice(0, 14);
    var on = titleList();
    return h('Job titles to search for', 'Pick at least two, up to five. Add your own if they are missing.') +
      '<div class="chips" id="g_f_v2_titles" role="group" aria-label="Suggested titles">' + uniq(sug.concat(on)).map(function (t) { var c = on.indexOf(t) >= 0, full = !c && on.length >= 5; return '<label' + (full ? ' class="off"' : '') + '><input type="checkbox" data-title="' + esc(t) + '"' + (c ? ' checked' : '') + (full ? ' disabled' : '') + '>' + esc(t) + '</label>'; }).join('') + '</div>' +
      addOwn('title', 'Add a title', 'Payroll Analyst') + '<p class="i2-count" aria-live="polite">' + on.length + ' of 5 picked' + (on.length < 2 ? ', pick at least 2' : '') + '</p>';
  } });
  add({ id: 'seniority', stop: 2, auto: 1, need: ['v2.seniority'], html: function () { return h('What level are you aiming for?', '') + cards('v2.seniority', O.seniority); } });
  add({ id: 'skills', stop: 2, show: function () { return fieldsAll().some(function (k) { return F[k].skills.length; }); }, html: function () {
    var sk = skillPool();
    return h('Your skills', 'Tap once for a skill you have and want to use. Tap again if it is a must-have in your next job. A third tap clears it.') +
      '<div class="i2-skills">' + sk.map(function (s) { var st = V.skills[s] || ''; return '<button type="button" class="i2-skill ' + st + '" data-skill="' + esc(s) + '" aria-pressed="' + (st ? 'true' : 'false') + '">' + esc(s) + '<em>' + (st === 'must' ? 'Must-have' : st === 'nice' ? 'Have it' : '') + '</em></button>'; }).join('') + '</div>';
  } });
  add({ id: 'software', stop: 2, html: function () { return h('Software you have really used', 'Not just seen. These go on your resume only if you pick them.') + chips('v2.software', '', O.software, {}) + inp('softwareOther', 'Other software (optional)', 'text'); } });

  add({ id: 'pay', stop: 3, need: ['payFloor'], html: function () {
    var hr = V.payUnit === 'Hourly', fy = payFloorYear(), ty = (function () { var n = num(V.payTarget); return n > 0 ? yearly(n) : NaN; })();
    return h('Pay', 'I only send jobs whose posted pay reaches your floor.') +
      '<div class="i2-seg" role="radiogroup" aria-label="Pay type">' + ['Yearly', 'Hourly'].map(function (u) { var on = (V.payUnit || 'Yearly') === u; return '<button type="button" role="radio" aria-checked="' + on + '" class="' + (on ? 'on' : '') + '" data-unit="' + u + '">' + u + '</button>'; }).join('') + '</div>' +
      '<div class="i2-two">' + inp('v2.payFloor', hr ? 'Lowest hourly pay you would accept' : 'Lowest yearly pay you would accept', 'text', { req: 1, im: 'decimal', ph: hr ? '28' : '65000', help: hr ? 'Dollars per hour.' : 'Like 65000 or 65k.' }) +
        inp('v2.payTarget', hr ? 'Hourly pay you are aiming for' : 'Pay you are aiming for', 'text', { im: 'decimal', ph: hr ? '34' : '80000' }) + '</div>' +
      (hr && fy ? '<p class="i2-note">That is about ' + money(fy) + ' a year full-time' + (ty ? ', aiming for about ' + money(ty) : '') + '.</p>' : '') +
      '<p class="i2-why"><b>Why I ask:</b> I use this to filter jobs, never to share. Employers do not see it.</p>' +
      inp('v2.currentPay', 'Current or last pay (optional, for negotiation prep)', 'text', { ph: hr ? '25 an hour' : '72000' });
  } });
  add({ id: 'setting', stop: 3, need: ['v2.settingsPick'], html: function () {
    return h('Where do you want to work?', 'Pick any that work for you.') + cards('v2.settingsPick', O.settings, { many: 1 }) +
      chips('v2.travel', 'Travel', O.travel, { one: 1 }) + (remoteOnly() ? '' : chips('nycHybrid', 'Open to a hybrid job in New York City, 2 to 3 days a week?', O.nycHybrid, { one: 1 }));
  } });
  add({ id: 'commute', stop: 3, show: function () { return !remoteOnly(); }, html: function () {
    var on = commuteSet(), m = on ? Number(V.commuteMin) : 45, lab = !on ? 'Slide to choose your longest commute' : m >= 120 ? 'Any distance' : m + ' minutes each way';
    /* h() escapes, so the city goes in raw (finding 12: it was escaped twice) */
    return h('Your commute', 'From ' + (D.city || 'home') + '. Optional. If you skip it, I use about 50 miles.') +
      '<div class="q"><label class="lab" for="i2com">' + esc(lab) + '</label><input type="range" id="i2com" min="15" max="120" step="15" value="' + m + '" data-range="commuteMin" aria-valuetext="' + esc(on ? lab : 'Not chosen') + '"><div class="i2-ends"><span>15 min</span><span>Any distance</span></div></div>' +
      chips('v2.getThere', 'How do you get to work?', O.getThere, { one: 1 }) +
      (/^Yes/.test(D.relocating || '') ? inp('v2.relocateAreas', 'Areas you are moving to', 'text', { ph: 'Jersey City, Hoboken' }) : '');
  } });
  add({ id: 'schedule', stop: 3, need: ['v2.empTypes'], html: function () {
    var hideShifts = remoteOnly() && DESK.indexOf(V.field) >= 0;
    return h('Your schedule', '') + chips('v2.empTypes', 'Kinds of work', O.empTypes, {}) + (hideShifts ? '' : chips('v2.shifts', 'Shifts you CAN work', O.shifts, {}));
  } });
  add({ id: 'standout', stop: 3, html: function () { return h('What makes a job stand out?', 'Select all that apply. Pay is covered already.') + chips('v2.standOut', '', O.standOut, {}) + inp('standOutOther', 'Anything else? (optional)', 'text', { ph: 'A mentor, free parking, a guaranteed daily rate' }); } });
  add({ id: 'rank', stop: 3, show: function () { return arr(V.standOut).length >= 2; }, html: function () {
    syncRank(); var r = V.rank;
    return h('Rank your top ' + Math.min(3, r.length), 'Drag to reorder, or use the arrows. The top one counts most when I rank your matches.') +
      '<ol class="i2-rank" id="i2rank">' + r.map(function (x, i) { return '<li draggable="true" data-r="' + i + '"><span class="i2-n">' + (i + 1) + '</span><span class="i2-rt">' + esc(x) + '</span><span class="i2-rb"><button type="button" data-up="' + i + '" aria-label="Move ' + esc(x) + ' up"' + (i ? '' : ' disabled') + '>&uarr;</button><button type="button" data-down="' + i + '" aria-label="Move ' + esc(x) + ' down"' + (i < r.length - 1 ? '' : ' disabled') + '>&darr;</button></span></li>'; }).join('') + '</ol>' +
      (arr(V.standOut).length > 3 ? '<p class="i2-note">Want a different top 3? Tap one below to swap it in.</p><div class="chips">' + arr(V.standOut).filter(function (x) { return r.indexOf(x) < 0; }).map(function (x) { return '<button type="button" class="i2-chipbtn" data-swap="' + esc(x) + '">' + esc(x) + '</button>'; }).join('') + '</div>' : '');
  } });
  add({ id: 'companies', stop: 3, html: function () {
    return h('Kinds of employers', 'Pick any you like.') + chips('v2.companyTypes', '', O.companyTypes, {}) +
      '<div class="q"><div class="lab">Dream employers (optional)</div>' + tags('dream') + addOwn('dream', 'Add an employer', 'Northwell Health') + '</div>' +
      '<div class="q"><div class="lab">Employers to skip (optional)</div><div class="help">A past employer, or anywhere you would rather not go. <b>Why I ask:</b> I never send you their jobs or contact them.</div>' + tags('avoid') + addOwn('avoid', 'Add an employer to skip', 'Company name') + '</div>';
  } });
  add({ id: 'deal', stop: 3, html: function () {
    var left = DEAL.filter(function (c) { return !V.deal[c.k]; }), c = left[0];
    var done = DEAL.length - left.length;
    return h('Deal-breakers', 'Swipe left on anything that rules a job out. Swipe right if it is fine. Or use the buttons.') +
      '<div class="i2-deck" aria-live="polite">' + (c ? '<div class="i2-card" id="i2card" data-deal="' + esc(c.k) + '" tabindex="0" aria-label="' + esc(c.k) + '. Press the left arrow for deal-breaker, right arrow for fine."><b>' + esc(c.k) + '</b><span>' + esc(c.d) + '</span><i class="i2-stamp no">Deal-breaker</i><i class="i2-stamp ok">Fine</i></div>' :
        '<div class="i2-card done" id="i2done" tabindex="-1"><b>All sorted</b><span>' + (dealList().length ? 'Ruled out: ' + esc(dealList().join(', ')) : 'Nothing ruled out.') + '</span></div>') + '</div>' +
      (c ? '<div class="i2-deckbtns"><button type="button" class="btn ghost" data-deal-ans="no" aria-label="Deal-breaker">&larr; Rules it out</button><span class="i2-count">' + (done + 1) + ' of ' + DEAL.length + '</span><button type="button" class="btn ghost" data-deal-ans="ok" aria-label="Fine">Fine &rarr;</button></div>' :
        '<button type="button" class="i2-link" data-act="dealreset">Start the cards over</button>') +
      (done ? '<button type="button" class="i2-link" data-act="dealundo">Undo last card</button>' : '') +
      inp('notWantOther', 'Anything else that rules a job out? (optional)', 'text');
  } });
  add({ id: 'style', stop: 3, html: function () {
    return h('This or that?', 'One tap each. Pick the one that sounds more like you, or skip.') + STYLE.map(function (p, i) {
      return '<div class="i2-pair" role="radiogroup" aria-label="' + esc(p[0] + ' or ' + p[1]) + '">' + p.map(function (x) { var on = V.style[i] === x; return '<button type="button" role="radio" aria-checked="' + on + '" class="' + (on ? 'on' : '') + '" data-style="' + i + '" data-v="' + esc(x) + '">' + esc(x) + '</button>'; }).join('<span>or</span>') + '</div>';
    }).join('');
  } });

  add({ id: 'strengths', stop: 4, html: function () {
    var pool = uniq(STRENGTHS.concat.apply(STRENGTHS, fieldsAll().map(function (k) { return F[k].str; })).concat(arr(V.strengthsOwn)));
    var on = arr(V.strengths), ownN = arr(V.strengthsOwn).length;
    return h('Your top strengths', 'Pick up to five.') + '<div class="chips" role="group" aria-label="Strengths">' + pool.map(function (s) { var c = on.indexOf(s) >= 0, full = !c && on.length >= 5, mine = arr(V.strengthsOwn).indexOf(s) >= 0;
        return '<span class="i2-ownchip"><label' + (full ? ' class="off"' : '') + '><input type="checkbox" data-strength="' + esc(s) + '"' + (c ? ' checked' : '') + (full ? ' disabled' : '') + '>' + esc(s) + '</label>' +
          (mine ? '<button type="button" class="i2-link i2-rm" data-rmown="' + esc(s) + '" aria-label="Remove ' + esc(s) + '">Remove</button>' : '') + '</span>'; }).join('') + '</div>' +
      (ownN >= OWN_MAX ? '<p class="i2-count" id="i2ownfull" aria-live="polite">You have added ' + OWN_MAX + ' of your own, the most this list holds. Tap Remove next to one you added to make room for another.</p>' :
        addOwn('strength', 'Add your own', 'Bilingual: Spanish') + '<p class="i2-count" aria-live="polite">' + ownN + ' of ' + OWN_MAX + ' of your own added</p>');
  } });
  add({ id: 'win', stop: 4, html: function () {
    return h('Your proudest win at work', 'One or two sentences. Numbers help a lot. For example: "Grew my territory 30%" or "Trained 12 new hires."') +
      inp('v2.proudestWin', 'Your proudest win', 'area', { voice: 1 }) +
      inp('numbers', 'Any other numbers worth showing? People, accounts, dollars, volume (optional)', 'area', { ph: 'Payroll for about 3,000 employees in 6 states, biweekly' });
  } });
  add({ id: 'why', stop: 4, html: function () { return h('Why are you looking? (optional)', 'Private. Only I see it. It helps me set the right tone in your cover letters and interview prep.') + inp('v2.whyLooking', 'In your own words', 'area'); } });
  add({ id: 'know', stop: 4, html: function () {
    return h('Anything I should know?', 'All optional. Only I see these.') +
      chips('gaps', 'Any gaps of 3 months or more in your work history?', O.yesno, { one: 1 }) + (D.gaps === 'Yes' ? inp('gapWords', 'How do you want the gap described? (your words)', 'area', { help: 'I use your wording, not mine.' }) : '') +
      inp('v2.accommodations', 'Anything I should plan around? (optional)', 'text', { help: 'Only if you want me to know. For example: schedule needs or a workplace accommodation.' }) +
      inp('neverMention', 'Anything you do NOT want mentioned anywhere', 'area', { help: 'A hard rule. I check it on every document.' }) +
      chips('privateSearch', 'Should your search stay private?', O.privateSearch, { one: 1, help: 'Private means I search job postings only, never public job-board profiles.' }) +
      inp('anythingElse', 'Anything else', 'area');
  } });
  add({ id: 'docs', stop: 4, html: function () { return h('How should your documents sound?', '') + chips('v2.resumeStyle', 'Resume style', O.resumeStyle, { one: 1 }) + chips('v2.coverTone', 'Cover letter tone', O.coverTone, { one: 1 }); } });
  add({ id: 'review', stop: 4, html: function () { return h('Check your answers', 'Tap Edit on anything you want to change.') + review(); } });
  add({ id: 'confirmSend', stop: 4, need: ['agreeTrue', 'agreeTrial', 'signature'], html: function () {
    return h('Confirm and send', 'Last step.') +
      '<label class="i2-agree" id="a_agreeTrue"><input type="checkbox" data-b="agreeTrue"' + (D.agreeTrue ? ' checked' : '') + '>Everything I entered is true. I understand nothing goes on a document unless I said it is true, and that I approve every document before it is used.</label>' +
      '<label class="i2-agree" id="a_agreeTrial"><input type="checkbox" data-b="agreeTrial"' + (D.agreeTrial ? ' checked' : '') + '><span>I understand the pilot is free, that I submit all applications myself, and that no job, interview or pay is promised. I agree to the <a href="/terms/" target="_blank" rel="noopener">Terms of Service</a> and <a href="/privacy/" target="_blank" rel="noopener">Privacy Policy</a>.</span></label>' +
      '<label class="i2-agree"><input type="checkbox" data-b2="textOk"' + (V.textOk ? ' checked' : '') + '><span>Optional: you may text me about my search at the number I gave. Message and data rates may apply. Reply STOP anytime.</span></label>' +
      inp('signature', 'Type your name as a signature', 'text', { req: 1, ac: 'off' }) +
      '<div class="hp" aria-hidden="true"><label>Website<input tabindex="-1" autocomplete="off" data-k="website"></label></div>';
  }, next: function () { return PREVIEW ? 'See what would be sent' : (busy ? 'Sending…' : 'Send my intake'); } });

  /* ---------------- small builders ---------------- */
  function h(t, s) { return '<h2 class="i2-h">' + esc(t) + '</h2>' + (s ? '<p class="i2-p">' + esc(s) + '</p>' : ''); }
  function get(k) { if (k.indexOf('v2.mod.') === 0) return modOf()[k.slice(7)]; if (k.indexOf('v2.') === 0) return V[k.slice(3)]; return D[k]; }
  function set(k, v) { if (k.indexOf('v2.mod.') === 0) modOf()[k.slice(7)] = v; else if (k.indexOf('v2.') === 0) V[k.slice(3)] = v; else D[k] = v; }
  function idOf(k) { return 'f_' + k.replace(/\W/g, '_'); }
  function inp(k, label, type, o) {
    o = o || {}; var id = idOf(k), v = get(k) == null ? '' : get(k);
    var lab = label ? '<label class="lab" for="' + id + '">' + esc(label) + (o.req ? ' <span class="req" aria-hidden="true">*</span>' : '') + '</label>' : '';
    var help = o.help ? '<div class="help" id="' + id + '_h">' + esc(o.help) + '</div>' : '';
    var desc = o.help ? ' aria-describedby="' + id + '_h"' : '';
    var field = type === 'area' ? '<textarea id="' + id + '" data-k="' + k + '"' + desc + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + '>' + esc(v) + '</textarea>'
      : '<input id="' + id + '" data-k="' + k + '" type="' + type + '"' + desc + (o.req ? ' aria-required="true"' : '') + (o.im ? ' inputmode="' + o.im + '"' : '') + (o.ac ? ' autocomplete="' + o.ac + '"' : '') + ' value="' + esc(v) + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + '>';
    var mic = o.voice && SR ? '<button type="button" class="i2-mic" data-mic="' + k + '" aria-label="Speak instead of typing">' + MIC + '<span>Speak</span></button>' : '';
    return '<div class="q" id="q_' + id + '">' + lab + help + field + mic + '</div>';
  }
  function chips(k, label, opts, o) {
    o = o || {}; var v = get(k), id = idOf(k), one = !!o.one;
    return '<div class="q" id="q_' + id + '">' + (label ? '<div class="lab" id="l_' + id + '">' + esc(label) + (o.req ? ' <span class="req" aria-hidden="true">*</span>' : '') + '</div>' : '') + (o.help ? '<div class="help">' + esc(o.help) + '</div>' : '') +
      '<div class="chips" id="g_' + id + '" role="' + (one ? 'radiogroup' : 'group') + '"' + (label ? ' aria-labelledby="l_' + id + '"' : '') + '>' +
      opts.map(function (x) { var on = one ? v === x : arr(v).indexOf(x) >= 0; return '<label><input type="' + (one ? 'radio' : 'checkbox') + '" name="' + id + '" data-c="' + k + '" value="' + esc(x) + '"' + (on ? ' checked' : '') + '>' + esc(x) + '</label>'; }).join('') + '</div></div>';
  }
  function cards(k, opts, o) {
    o = o || {}; var v = get(k), many = !!o.many;
    return '<div class="i2-cards" id="g_' + idOf(k) + '" role="' + (many ? 'group' : 'radiogroup') + '">' + opts.map(function (x) { var on = many ? arr(v).indexOf(x) >= 0 : v === x; return '<button type="button" class="i2-opt' + (on ? ' on' : '') + '" role="' + (many ? 'checkbox' : 'radio') + '" aria-checked="' + on + '" data-card="' + k + '" data-v="' + esc(x) + '"' + (many ? ' data-many="1"' : '') + '>' + esc(x) + '</button>'; }).join('') + '</div>';
  }
  function toggle(k, label, help) { var on = !!V[k]; return '<button type="button" class="i2-toggle' + (on ? ' on' : '') + '" role="switch" aria-checked="' + on + '" data-toggle="' + k + '"><span class="i2-sw" aria-hidden="true"></span><span><b>' + esc(label) + '</b>' + (help ? '<em>' + esc(help) + '</em>' : '') + '</span></button>'; }
  function addOwn(kind, label, ph) { var id = 'own_' + kind; return '<div class="i2-own"><label class="vh" for="' + id + '">' + esc(label) + '</label><input id="' + id + '" type="text" placeholder="' + esc(label + (ph ? ', like ' + ph : '')) + '" data-own="' + kind + '" maxlength="80"><button type="button" class="btn ghost" data-add="' + kind + '">Add</button></div>'; }
  function tags(k) { var a = arr(V[k]); return a.length ? '<div class="chips">' + a.map(function (x, i) { return '<button type="button" class="i2-chipbtn on" data-untag="' + k + '" data-i="' + i + '" aria-label="Remove ' + esc(x) + '">' + esc(x) + ' &times;</button>'; }).join('') + '</div>' : ''; }
  function syncRank() { var s = arr(V.standOut); V.rank = arr(V.rank).filter(function (x) { return s.indexOf(x) >= 0; }); s.forEach(function (x) { if (V.rank.length < 3 && V.rank.indexOf(x) < 0) V.rank.push(x); }); V.rank = V.rank.slice(0, 3); }

  /* voice to text (optional; only where the browser has it) */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  var MIC = '<svg viewBox="0 0 24 24" class="ic sm" aria-hidden="true" focusable="false"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';

  /* ---------------- profile strength ---------------- */
  function strength() {
    var checks = [
      [!!file || !!String(D.history || '').trim(), 'Add your resume or work history'], [!!String(D.linkedin || '').trim(), 'Add your LinkedIn link'],
      [titleList().length >= 3, 'Pick at least 3 job titles'], [skillsPicked().length > 0, 'Mark your skills'],
      [!!String(V.proudestWin || '').trim(), 'Add a proudest win'], [!!String(D.numbers || '').trim(), 'Add a few numbers from your work'],
      [arr(V.strengths).length >= 3, 'Pick 3 or more strengths'], [arr(V.rank).length > 0, 'Rank what matters most'],
      [!!String(D.licenses || '').trim() || D.education, 'Add your education or licenses'], [DEAL.every(function (c) { return V.deal[c.k]; }), 'Finish the deal-breaker cards']
    ];
    var score = Math.round(100 * checks.filter(function (c) { return c[0]; }).length / checks.length);
    return { score: score, tips: checks.filter(function (c) { return !c[0]; }).map(function (c) { return c[1]; }).slice(0, 3) };
  }
  function meter() { var s = strength(); return '<div class="i2-meter"><div class="i2-mrow"><b>Your profile strength</b><span>' + s.score + '%</span></div><div class="i2-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + s.score + '" aria-label="Profile strength"><i style="width:' + s.score + '%"></i></div>' + (s.tips.length ? '<ul>' + s.tips.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '<p>Strong profile. Nice work.</p>') + '</div>'; }

  /* ---------------- review ---------------- */
  function review() {
    var f = field(), rows = [
      [1, 'You', [D.name, D.email, D.phone, D.city, 'Reach by ' + (D.contactBy || '?'), V.situation, 'Start: ' + (D.start || '?'), 'Work authorization: ' + (D.workAuth || '?') + '; sponsorship: ' + (D.sponsorship || '?')]],
      [1, 'Your work so far', [(file ? 'Resume: ' + file.name : V.noResume ? 'No resume (I will build one)' : lostResume() ? 'Resume: ' + D.resumeName + ' needs to be attached again' : 'No resume attached'), [D.jobNowTitle, D.jobNowEmployer].filter(Boolean).join(', '), D.years ? D.years + ' years of experience' : '', D.education]],
      [2, 'Your field', [f ? f.t : '?', arr(V.alsoOpen).length ? 'Also open to: ' + V.alsoOpen.map(function (k) { return F[k].t; }).join(', ') : '', 'Titles: ' + (titleList().join(', ') || '?'), V.seniority]],
      [3, 'Your ideal job', ['Pay floor: ' + (payFloorYear() ? money(payFloorYear()) + ' a year' : '?'), 'Settings: ' + (settingsOld().join(', ') || '?'), remoteOnly() ? '' : 'Commute: ' + (commuteSet() ? commuteOld(V.commuteMin) : 'not set (I use about 50 miles)'), 'Kinds of work: ' + (arr(V.empTypes).join(', ') || '?'), arr(V.rank).length ? 'Top priorities: ' + V.rank.join(', ') : '', dealList().length ? 'Deal-breakers: ' + dealList().join(', ') : '']],
      [4, 'Your story', [arr(V.strengths).length ? 'Strengths: ' + V.strengths.join(', ') : '', V.proudestWin ? 'Proudest win: ' + V.proudestWin : '', V.resumeStyle ? 'Resume style: ' + V.resumeStyle : '']]
    ];
    var jump = { 'You': idx('contact'), 'Your work so far': idx('resume'), 'Your field': idx('field'), 'Your ideal job': idx('pay'), 'Your story': idx('strengths') };
    return reattach() + rows.map(function (r) { return '<div class="i2-rev"><div class="i2-revh"><b>' + esc(r[1]) + '</b><button type="button" class="i2-link" data-jump="' + jump[r[1]] + '" aria-label="Edit ' + esc(r[1]) + '">Edit</button></div><p>' + r[2].filter(Boolean).map(esc).join('<br>') + '</p></div>'; }).join('') + meter();
  }
  /* finding 8: the file itself never survives a reload (only its name does), so say so where it matters */
  function lostResume() { return !file && !!D.resumeName && !V.noResume; }
  function reattach() { return lostResume() ? '<div class="i2-info"><b>Please attach your resume again.</b> ' + esc(D.resumeName) + ' did not carry over when the page reloaded. Your other answers are all here. <button type="button" class="i2-link" data-jump="' + idx('resume') + '">Attach it again</button></div>' : ''; }
  function idx(id) { for (var i = 0; i < S.length; i++) if (S[i].id === id) return i; return 0; }

  /* ---------------- flow ---------------- */
  function visible(i) { var s = S[i]; return s && (!s.show || s.show()); }
  function nextIdx(i, dir) { var j = i + dir; while (j >= 0 && j < S.length && !visible(j)) j += dir; return j; }
  function needOf(s) { var n = typeof s.need === 'function' ? s.need() : (s.need || []); return n.filter(function (k) { return missingKey(k); }); }
  function missingKey(k) {
    var v = get(k);
    if (k === 'email') return !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v || '').trim());
    if (k === 'phone') return String(v || '').replace(/\D/g, '').length < 10;
    if (k === 'v2.titles') return titleList().length < 2;
    if (k === 'payFloor') return !payFloorYear();
    if (k === 'signature' || k === 'name' || k === 'city') return !String(v || '').trim();
    return Array.isArray(v) ? !v.length : !v;
  }
  var LABEL = { name: 'your name', email: 'an email that works', phone: 'a phone number (10 digits)', contactBy: 'the best way to reach you', city: 'your city, state and ZIP', start: 'your earliest start date', workAuth: 'work authorization', sponsorship: 'visa sponsorship', 'v2.situation': 'what fits you best', 'v2.field': 'your main field', 'v2.titles': 'at least 2 job titles', 'v2.seniority': 'a level', payFloor: 'the lowest pay you would accept', 'v2.settingsPick': 'at least one work setting', 'v2.empTypes': 'at least one kind of work', agreeTrue: 'the first box', agreeTrial: 'the second box', signature: 'your signature', 'v2.mod.describe': 'a short description of your field' };

  function stopOf(i) { return S[Math.min(Math.max(i, 0), S.length - 1)].stop; }
  /* Focus (finding 4): after a full render, focus goes to the new question (or to an error); after an in-place render(false),
     it goes back to the control that was used, found again by its data attributes. */
  var FKEYS = [['card', 'v'], ['c', 'value'], ['style', 'v'], ['tile'], ['also'], ['title'], ['strength'], ['unit'], ['toggle'], ['swap'], ['skill'], ['k'], ['own'], ['untag', 'i'], ['dealAns'], ['act'], ['nav'], ['b'], ['b2'], ['range'], ['mic'], ['add'], ['jump']];
  function attrName(k) { return 'data-' + k.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }); }
  function focusSel(el) {
    if (!el || el === document.body || !ROOT.contains(el)) return null;
    var d = el.dataset || {};
    for (var i = 0; i < FKEYS.length; i++) {
      var k = FKEYS[i][0]; if (d[k] == null) continue;
      var sel = '[' + attrName(k) + '="' + cssq(d[k]) + '"]';
      var k2 = FKEYS[i][1]; if (k2) { var v2 = k2 === 'value' ? el.value : d[k2]; if (v2 != null) sel += '[' + (k2 === 'value' ? 'value' : attrName(k2)) + '="' + cssq(v2) + '"]'; }
      return sel;
    }
    return el.id ? '#' + cssq(el.id) : null;
  }
  function render(focus) {
    var s = S[cur], st = s.stop, ae = document.activeElement, keep = focus === false ? focusSel(ae) : null, had = focus === false && ae && ROOT.contains(ae) && ae !== ROOT;
    var caret = null; try { if (keep && ae.selectionStart != null) caret = [ae.selectionStart, ae.selectionEnd]; } catch (e) {}
    var cls = msgKind === 'err' ? 'i2-err' : 'i2-info', role = msgKind === 'err' ? 'alert' : 'status';
    var html = pathbar(st) + '<div class="i2-card-wrap"><section class="i2-sheet' + (s.bare ? ' bare' : '') + '" data-screen="' + s.id + '" aria-labelledby="i2title i2q">' +
      '<p class="i2-step" id="i2title">' + (s.bare ? 'Welcome' : 'Stop ' + (st + 1) + ' of 5: ' + esc(STOPS[st])) + '</p>' +
      (msg ? '<div class="' + cls + '" id="i2msg" role="' + role + '" tabindex="-1">' + msg + '</div>' : '') +
      s.html() + nav(s) + '</section></div>';
    ROOT.innerHTML = html;
    var q = ROOT.querySelector('.i2-sheet .i2-h'); if (q) { q.id = 'i2q'; q.setAttribute('tabindex', '-1'); }
    markBad();
    if (focus !== false) focusFirst();
    else if (had) {
      var n = null; try { n = keep ? ROOT.querySelector(keep) : null; } catch (e) { n = null; }
      if (n && !n.disabled) { try { n.focus({ preventScroll: true }); if (caret && n.setSelectionRange) n.setSelectionRange(caret[0], caret[1]); } catch (e) {} }
      else { var f = document.getElementById('i2done') || q || document.getElementById('i2title'); try { f.focus({ preventScroll: true }); } catch (e) {} }
    }
    var deck = document.getElementById('i2card'); if (deck) bindDeck(deck);
    var rank = document.getElementById('i2rank'); if (rank) bindRank(rank);
    ievent(s.id, st);
  }
  function nav(s) {
    var back = nextIdx(cur, -1) >= 0 ? '<button type="button" class="btn ghost" data-nav="back">Back</button>' : '<span></span>';
    var label = typeof s.next === 'function' ? s.next() : s.next || (s.nextLabel ? s.nextLabel() : 'Continue');
    var fwd = s.auto && !needOf(s).length ? '<button type="button" class="btn gold" data-nav="next">Continue</button>' : '<button type="button" class="btn gold" data-nav="next"' + (busy ? ' disabled' : '') + '>' + esc(label) + '</button>';
    /* finding 15: after Edit on the review, one tap goes straight back */
    var toRev = fromReview && s.id !== 'review' && s.id !== 'confirmSend' ? '<p class="i2-torev"><button type="button" class="btn ghost" data-act="toreview">Back to review</button></p>' : '';
    var later = cur > 0 ? '<div class="i2-later"><p>Your answers save on this device. <button type="button" class="i2-link" data-act="later" aria-expanded="' + laterOpen + '" aria-controls="i2laterbox">Email me a link to finish later</button></p>' + (laterOpen ? laterBox() : '') + '</div>' : '';
    return '<div class="i2-nav">' + back + (s.skip ? '<button type="button" class="i2-link" data-nav="next">Skip</button>' : '') + fwd + '</div>' + toRev + later;
  }
  function laterBox() {
    var lm = laterMsg ? '<div class="' + (laterKind === 'err' ? 'i2-err' : 'i2-info') + '" id="i2latermsg" role="' + (laterKind === 'err' ? 'alert' : 'status') + '" tabindex="-1">' + laterMsg + '</div>' : '';
    return '<div class="i2-laterbox" id="i2laterbox"><p class="i2-note">I will email you a private link that opens this form where you left off. This link works for 30 days. Once you open it and pick up where you left off, it stops working. Your agreement boxes, signature and resume file are not saved in it.</p>' +
      '<div class="i2-own"><label class="vh" for="i2lateremail">Email for the link</label><input id="i2lateremail" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" value="' + esc(D.email || '') + '"><button type="button" class="btn ghost" data-act="latersend"' + (laterBusy ? ' disabled' : '') + '>' + (laterBusy ? 'Sending…' : 'Send me the link') + '</button></div>' + lm + '</div>';
  }
  function pathbar(st) {
    var pts = [[20, 34], [110, 18], [200, 30], [290, 14], [380, 26]];
    var d = 'M20 34 C 60 34 70 18 110 18 S 170 30 200 30 S 250 14 290 14 S 350 26 380 26';
    var prog = S.length > 1 ? cur / (S.length - 1) : 0;
    return '<div class="i2-path" role="img" aria-label="Stop ' + (st + 1) + ' of 5, ' + esc(STOPS[st]) + '"><svg viewBox="0 0 400 52" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"><path class="i2-track" d="' + d + '"/><path class="i2-fill" pathLength="1" d="' + d + '" style="stroke-dashoffset:' + (1 - prog).toFixed(3) + '"/>' +
      pts.map(function (p, i) { return '<circle class="i2-dot' + (i < st ? ' on' : i === st ? ' now' : '') + '" cx="' + p[0] + '" cy="' + p[1] + '" r="' + (i === st ? 8 : 6) + '"/>'; }).join('') + '</svg>' +
      '<ol class="i2-stops" aria-hidden="true">' + SHORT.map(function (n, i) { return '<li class="' + (i < st ? 'on' : i === st ? 'now' : '') + '">' + esc(n) + '</li>'; }).join('') + '</ol></div>';
  }
  /* finding 11: an error or a question about the answer takes focus; the cheer between stops does not (it is a status, read out
     on its own), so focus lands on the new question */
  function focusFirst() {
    var t = (msg && msgKind !== 'cheer' && document.getElementById('i2msg')) || document.getElementById('i2q') || document.getElementById('i2title');
    try { t.focus({ preventScroll: true }); } catch (e) {}
    var top = ROOT.getBoundingClientRect().top + (window.pageYOffset || 0) - 12;
    if (Math.abs((window.pageYOffset || 0) - top) > 40) window.scrollTo({ top: top, behavior: RM() ? 'auto' : 'smooth' });
  }
  /* finding 11: inputs, chip groups, cards, tiles and title groups all carry an id the error can point at */
  function markBad() { bad.forEach(function (k) { var id = idOf(k), el = document.getElementById(id) || document.getElementById('g_' + id) || document.getElementById('a_' + k); if (el) { el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', 'i2msg'); el.classList.add('bad'); } }); }
  /* finding 2 and 15: question pay that looks typed in the wrong box, with words that fit the box the person is in */
  function payQuestion() {
    var hr = V.payUnit === 'Hourly', n = num(V.payFloor), y = payFloorYear(), t = num(V.payTarget), ty = t > 0 ? yearly(t) : NaN;
    if (hr && n > 200) return 'Is ' + money2(n) + ' an hour right? That works out to about ' + money(y) + ' a year. If you meant yearly pay, tap Yearly. If it is right, tap Continue again.';
    if (!hr && y > 1000000) return 'Is ' + money(y) + ' a year right? That is over a million dollars a year. If it is right, tap Continue again.';
    if (y < 20000) return hr ? 'Is ' + money2(n) + ' an hour right? That is about ' + money(y) + ' a year full-time. If it is right, tap Continue again.' : 'Is ' + money(y) + ' a year right? If you meant hourly pay, tap Hourly. If it is right, tap Continue again.';
    if (hr && t > 200) return 'Is ' + money2(t) + ' an hour right for the pay you are aiming for? That is about ' + money(ty) + ' a year. If it is right, tap Continue again.';
    if (!hr && ty > 1000000) return 'Is ' + money(ty) + ' a year right for the pay you are aiming for? If it is right, tap Continue again.';
    return '';
  }
  function go(dir) {
    if (autoT) { clearTimeout(autoT); autoT = null; }
    flushDeal();
    if (dir > 0) {
      var s = S[cur], m = needOf(s);
      if (m.length) { bad = m; msgKind = 'err'; msg = 'Please add ' + m.map(function (k) { return LABEL[k] || k; }).join(', ') + '.'; render(); return; }
      if (s.id === 'pay') { var pq = payQuestion(), pk = (V.payUnit || 'Yearly') + '|' + V.payFloor + '|' + V.payTarget; if (pq && payOk !== pk) { payOk = pk; bad = []; msgKind = 'info'; msg = esc(pq); render(); return; } }
      if (s.id === 'confirm' && parsing) { msgKind = 'info'; msg = 'Still reading your resume. One moment, and the boxes fill in.'; render(); return; }
      if (s.id === 'confirmSend') { submit(); return; }
    }
    var j = nextIdx(cur, dir); if (j < 0 || j >= S.length) return;
    var was = stopOf(cur); cur = j; msg = ''; bad = []; laterOpen = false; laterMsg = '';
    if (S[cur].id === 'review' || S[cur].id === 'confirmSend') fromReview = false;
    save();
    if (dir > 0 && stopOf(cur) > was && CHEER[was]) { cheer(CHEER[was]); }
    render();
  }
  /* "Back to review": check every screen up to the review first, so a changed field cannot skip a required answer */
  function toReview() {
    var r = idx('review');
    for (var i = cur; i < r; i++) {
      if (!visible(i)) continue;
      var m = needOf(S[i]);
      if (m.length) { cur = i; bad = m; msgKind = 'err'; msg = 'Please add ' + m.map(function (k) { return LABEL[k] || k; }).join(', ') + '.'; save(); render(); return; }
      if (S[i].id === 'pay' && payQuestion() && payOk !== (V.payUnit || 'Yearly') + '|' + V.payFloor + '|' + V.payTarget) { cur = i; go(1); return; }
    }
    cur = r; fromReview = false; msg = ''; bad = []; save(); render();
  }
  function cheer(t) { msgKind = 'cheer'; msg = esc(t); try { if (window.SPFX && window.SPFX.burst && !RM()) { var r = ROOT.getBoundingClientRect(); window.SPFX.burst(r.left + r.width / 2, r.top + 40, { n: 10 }); } } catch (e) {} }

  /* ---------------- payload: every old key, plus v2 ---------------- */
  function payload() {
    var f = fieldsAll(), y = payFloorYear(), tgt = (function () { var n = num(V.payTarget); return n > 0 ? yearly(n) : NaN; })();
    var oldNotWant = uniq(DEAL.filter(function (c) { return V.deal[c.k] === 'no' && c.old; }).map(function (c) { return c.old; }));
    var otherDeal = DEAL.filter(function (c) { return V.deal[c.k] === 'no' && !c.old; }).map(function (c) { return c.k.toLowerCase(); });
    var et = arr(V.empTypes);
    /* finding 3: only skills offered for the fields picked now */
    var mustSkills = skillsPicked('must'), haveSkills = skillsPicked();
    var b = {
      action: 'intake', website: D.website || '',
      name: String(D.name || '').trim(), phone: String(D.phone || '').trim(), email: String(D.email || '').trim(), city: String(D.city || '').trim(),
      relocating: D.relocating || '', moveWhen: [D.moveWhen, V.relocateAreas].filter(Boolean).join('; '),
      workAuth: D.workAuth || '', sponsorship: D.sponsorship || '', linkedin: String(D.linkedin || '').trim(), contactBy: D.contactBy || '', times: arr(D.times),
      types: typesOld(), titles: titleList().join('\n'),
      notWant: oldNotWant, notWantOther: [otherDeal.join(', '), D.notWantOther].filter(Boolean).join('; '),
      settings: settingsOld(), commute: remoteOnly() || !commuteSet() ? '' : commuteOld(V.commuteMin), getThere: { Driving: 'Car', 'Public transit': 'Public transit', Either: 'Either' }[V.getThere] || '',
      nycHybrid: remoteOnly() ? '' : (D.nycHybrid || ''), payFloor: y ? String(y) : '', payAim: payAimOld(tgt), start: D.start || '',
      hours: hoursOld(), shifts: arr(V.shifts),
      standOut: arr(V.standOut).join(', '), standOutTop: arr(V.rank)[0] || '', standOutOther: D.standOutOther || '',
      history: D.history || '', jobNow: [D.jobNowEmployer, D.jobNowTitle].filter(Boolean).join(', '), stillThere: D.stillThere || '', endedOn: D.stillThere === 'No' ? (D.endedOn || '') : '',
      numbers: D.numbers || '', software: arr(V.software), softwareOther: D.softwareOther || '', education: D.education || '', school: D.school || '', licenses: D.licenses || '',
      gaps: D.gaps || '', gapWords: D.gaps === 'Yes' ? (D.gapWords || '') : '', neverMention: D.neverMention || '', excludeEmployers: arr(V.avoid).join('\n'),
      privateSearch: D.privateSearch || '', referred: D.referred || '',
      agreeTrue: !!D.agreeTrue, agreeTrial: !!D.agreeTrial, signature: String(D.signature || '').trim(), termsVersion: TERMS_VERSION
    };
    /* same summary lines the current form adds, so nothing is lost before the backend learns the new columns */
    var tn = typesNote();
    var extra = [tn ? 'Type of work: ' + tn : '', 'Full-time or part-time: ' + b.hours + (et.length ? ' (kinds of work picked: ' + et.join(', ') + ')' : ''), 'What makes a job stand out: ' + (b.standOut || 'none picked') + (b.standOutTop ? ' (most important: ' + b.standOutTop + ')' : '') + (b.standOutOther ? '; also: ' + b.standOutOther : '')].filter(String).join('\n');
    b.anythingElse = (D.anythingElse ? D.anythingElse + '\n\n' : '') + extra;
    b.v2 = {
      version: '2', situation: V.situation || '', urgency: V.urgency || '', field: V.field ? F[V.field].t : '', alsoOpen: arr(V.alsoOpen).map(function (k) { return F[k].t; }),
      seniority: V.seniority || '', yearsExperience: String(D.years || ''), mustSkills: mustSkills, skills: haveSkills,
      payType: V.payUnit || 'Yearly', payFloorEntered: String(V.payFloor || ''), payTarget: tgt ? String(tgt) : '', currentPay: String(V.currentPay || ''),
      travel: V.travel || '', commuteMinutes: remoteOnly() || !commuteSet() ? '' : String(V.commuteMin), employmentTypes: et, topPriorities: arr(V.rank), companyTypes: arr(V.companyTypes),
      dreamCompanies: arr(V.dream), dealBreakers: dealList(), workStyle: STYLE.map(function (p, i) { return V.style[i] || ''; }).filter(Boolean),
      strengths: arr(V.strengths), proudestWin: V.proudestWin || '', whyLooking: V.whyLooking || '', accommodations: V.accommodations || '',
      resumeStyle: V.resumeStyle || '', coverTone: V.coverTone || '', textOk: !!V.textOk, linkedinMakeover: !!V.linkedinMakeover, needsResumeBuild: !file && (!!V.noResume || (!D.resumeName && !String(D.history || '').trim())), resumeAttached: !!file || !!D.resumeName,
      profileStrength: strength().score, fieldAnswers: modAnswers()
    };
    return b;
  }
  function modAnswers() { var f = field(), o = {}, m = modOf(); if (!f) return o; f.mod.forEach(function (sc) { sc.forEach(function (q) { var v = m[q[0]]; if (v != null && (Array.isArray(v) ? v.length : String(v).trim())) o[q[1]] = v; }); }); return o; }
  window.__i2payload = payload; /* for tests */

  function toB64(f) { return new Promise(function (ok, no) { var r = new FileReader(); r.onload = function () { ok(String(r.result).split(',')[1]); }; r.onerror = no; r.readAsDataURL(f); }); }
  function submit() {
    var b = payload();
    if (PREVIEW) { sent = b; finish(true); return; }
    busy = true; msg = ''; render(false);
    (file ? toB64(file) : Promise.resolve(null)).then(function (data) {
      if (data) b.resume = { name: file.name, type: file.type, data: data };
      return post(b, 120000);
    }).then(function (d) {
      busy = false;
      if (d.ok) { sent = d; ievent('sent', 4); try { localStorage.removeItem(KEY); if (d.token) localStorage.setItem('sp_token', d.token); } catch (e) {} finish(false); return; }
      msgKind = d.error === 'recent' ? 'info' : 'err';
      msg = d.error === 'recent' ? 'An intake from this email came in a few minutes ago, so this one was not saved twice. You can <a href="/portal/">sign in to your portal</a> anytime.' :
        d.error === 'missing' ? 'A few required answers are missing: ' + esc((d.fields || []).join(', ')) + '.' :
        d.error === 'file too large' ? 'That resume file is over 10 MB. Try a PDF, or go back and choose "No resume".' : 'Something went wrong on my side. Please try again in a few minutes, or email hello@steadypathcareers.com.';
      render();
    }).catch(function () { busy = false; msgKind = 'err'; msg = 'Your intake did not send. Please check your connection and try again. Your answers are saved on this device.'; render(); });
  }
  function finish(preview) {
    var token = !preview && sent && sent.token ? sent.token : '';
    ROOT.innerHTML = pathbar(4).replace('class="i2-path"', 'class="i2-path done"') + '<div class="i2-card-wrap"><section class="i2-sheet i2-done" aria-labelledby="i2title"><h2 class="i2-h" id="i2title" tabindex="-1">You\'re all set.</h2>' +
      '<ol class="i2-next"><li><b>I review your answers</b>, usually within a business day.</li><li><b>I email you any questions</b> and the job titles I suggest. You tell me which ones to keep.</li><li><b>Your search starts once the titles are agreed.</b> Any matches I find then show up in your portal, each with pay and a link to the posting.</li></ol>' +
      '<div class="i2-ctas">' + (preview ? '' : '<a class="btn gold" href="/portal/' + (token ? '?t=' + encodeURIComponent(token) : '') + '">Open my portal</a>') + '<a class="btn ghost" href="' + BOOK + '" target="_blank" rel="noopener">Book an optional intro call</a></div>' + meter() +
      (preview ? '<details class="i2-sent" open><summary>Preview: what this would send</summary><p class="i2-note">Every field the current form sends is here with the same name. The new answers are under "v2". The resume file itself is attached only when it is really sent.</p><pre>' + esc(JSON.stringify(sent, null, 2)) + '</pre><button type="button" class="btn ghost" data-act="restart">Start the preview over</button></details>' : '') +
      '</section></div>';
    try { document.getElementById('i2title').focus({ preventScroll: true }); } catch (e) {}
    try { if (window.SPFX && window.SPFX.burst && !RM()) { var r = ROOT.getBoundingClientRect(); window.SPFX.burst(r.left + r.width / 2, Math.max(60, r.top + 60), { n: 22 }); } } catch (e) {}
    window.scrollTo({ top: ROOT.getBoundingClientRect().top + (window.pageYOffset || 0) - 12, behavior: RM() ? 'auto' : 'smooth' });
  }

  /* ---------------- events ---------------- */
  function onFile(f) {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { msgKind = 'err'; msg = 'That file is over 10 MB. Please choose a smaller file, or tap "No resume".'; render(); return; }
    file = f; D.resumeName = f.name; V.noResume = false; parsed = null; parsing = true; msg = ''; save(); render(false);
    var mine = f, done = false;
    var fin = function (p) {
      if (done || file !== mine) return; done = true; clearTimeout(parseT);
      parsing = false; parsed = p || {};
      /* fill only blanks: never overwrite something the client already typed */
      if (!D.jobNowTitle && p.title) D.jobNowTitle = p.title; if (!D.jobNowEmployer && p.employer) D.jobNowEmployer = p.employer;
      if (!D.stillThere && p.current) D.stillThere = p.current; if (!D.years && p.years) D.years = p.years;
      if (!D.education && p.education) D.education = p.education; if (!D.school && p.school) D.school = p.school;
      if (!D.licenses && p.certs && p.certs.length) D.licenses = p.certs.join('\n'); if (!D.linkedin && p.linkedin) D.linkedin = p.linkedin;
      save();
      /* finding 7: the check screen shows "Still reading" until now, then redraws with what was found */
      var id = S[cur].id;
      if (id === 'confirm' && msgKind === 'info' && /^Still reading/.test(msg)) msg = '';
      if (id === 'resume' || id === 'confirm') render(false);
    };
    /* a file that takes too long counts as unreadable, so nobody waits forever */
    clearTimeout(parseT); parseT = setTimeout(function () { fin({}); }, 20000);
    fileText(f).then(function (t) { fin(parseResume(t)); }).catch(function () { fin({}); });
  }
  ROOT.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'i2file') { onFile(t.files && t.files[0]); return; }
    if (t.dataset.c) {
      var k = t.dataset.c; if (t.type === 'checkbox') { var a = arr(get(k)).slice(); if (t.checked) { if (a.indexOf(t.value) < 0) a.push(t.value); } else a = a.filter(function (x) { return x !== t.value; }); set(k, a); } else set(k, t.value);
      buzz(); clearBad(k); save();
      if (k === 'v2.standOut') syncRank();
      if (['relocating', 'stillThere', 'gaps', 'v2.software'].indexOf(k) >= 0) { if (k === 'v2.software' && t.value === 'None of these' && t.checked) set(k, ['None of these']); else if (k === 'v2.software' && t.checked) set(k, arr(get(k)).filter(function (x) { return x !== 'None of these'; })); render(false); }
      return;
    }
    if (t.dataset.b) { D[t.dataset.b] = t.checked; clearBad(t.dataset.b); save(); return; }
    if (t.dataset.b2) { V[t.dataset.b2] = t.checked; save(); return; }
    if (t.dataset.also) { var al = arr(V.alsoOpen).filter(function (x) { return x !== t.dataset.also; }); if (t.checked && al.length < 2) al.push(t.dataset.also); V.alsoOpen = al; save(); render(false); return; }
    if (t.dataset.title != null) { var tl = titleList().filter(function (x) { return x !== t.dataset.title; }); if (t.checked && tl.length < 5) tl.push(t.dataset.title); V.titles = tl; clearBad('v2.titles'); save(); render(false); return; }
    if (t.dataset.strength != null) { var sl = arr(V.strengths).filter(function (x) { return x !== t.dataset.strength; }); if (t.checked && sl.length < 5) sl.push(t.dataset.strength); V.strengths = sl; save(); render(false); return; }
  });
  ROOT.addEventListener('input', function (e) {
    var t = e.target;
    if (t.dataset.k) { set(t.dataset.k, t.value); clearBad(t.dataset.k); if (t.dataset.k === 'v2.payFloor' || t.dataset.k === 'v2.payTarget') payOk = ''; save(); return; }
    if (t.dataset.range) { var v = +t.value; if (t.dataset.range === 'urgency') V.urgency = O.urgency[v]; else V.commuteMin = v; save();
      var lab = t.dataset.range === 'urgency' ? O.urgency[v] : (v >= 120 ? 'Any distance' : v + ' minutes each way'); t.setAttribute('aria-valuetext', lab); var l = ROOT.querySelector('label[for="' + t.id + '"]'); if (l) l.textContent = lab; }
  });
  ROOT.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t.id === 'i2lateremail' && e.key === 'Enter') { e.preventDefault(); sendLater(); return; }
    if (t.dataset && t.dataset.own != null && e.key === 'Enter') { e.preventDefault(); addOwnVal(t.dataset.own); return; }
    if (t.id === 'i2card' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); answerDeal(e.key === 'ArrowLeft' ? 'no' : 'ok'); return; }
    if (e.key === 'Enter' && t.tagName === 'INPUT' && t.type !== 'checkbox' && t.type !== 'radio' && t.type !== 'file' && !t.dataset.own) { e.preventDefault(); go(1); }
  });
  ROOT.addEventListener('click', function (e) {
    var b = e.target.closest('button, [data-nav]'); if (!b || !ROOT.contains(b)) return;
    var d = b.dataset;
    /* finding 5: the second click of a double tap never moves on again */
    if (d.nav) { if (e.detail > 1) return; go(d.nav === 'back' ? -1 : 1); return; }
    if (d.card) { var k = d.card; if (d.many) { var a = arr(get(k)).slice(), v = d.v; if (a.indexOf(v) >= 0) a = a.filter(function (x) { return x !== v; }); else { if (v === 'Open to all') a = ['Open to all']; else { a = a.filter(function (x) { return x !== 'Open to all'; }); a.push(v); } } set(k, a); clearBad(k); save(); buzz(); render(false); return; }
      set(k, d.v); clearBad(k); save(); buzz(); render(false);
      /* finding 5: one pending move at a time, and only from the screen that was tapped */
      if (S[cur].auto && !autoT && e.detail < 2) { var sid = S[cur].id; autoT = setTimeout(function () { autoT = null; if (S[cur].id === sid) go(1); }, RM() ? 0 : 260); }
      return; }
    if (d.tile) { V.field = d.tile; V.alsoOpen = arr(V.alsoOpen).filter(function (x) { return x !== d.tile; }); clearBad('v2.field'); save(); buzz(); render(false); return; }
    if (d.unit) { V.payUnit = d.unit; payOk = ''; save(); render(false); return; }
    if (d.toggle) { V[d.toggle] = !V[d.toggle]; save(); buzz(); render(false); return; }
    if (d.skill != null) { var cur2 = V.skills[d.skill] || ''; V.skills[d.skill] = cur2 === '' ? 'nice' : cur2 === 'nice' ? 'must' : ''; if (!V.skills[d.skill]) delete V.skills[d.skill]; save(); buzz(); render(false); var nb = ROOT.querySelector('[data-skill="' + cssq(d.skill) + '"]'); if (nb) nb.focus(); return; }
    if (d.add) { addOwnVal(d.add); return; }
    /* round 5: a strength you added stays (unticked) until you remove it */
    if (d.rmown != null) { var rv = d.rmown; V.strengthsOwn = arr(V.strengthsOwn).filter(function (x) { return x !== rv; }); V.strengths = arr(V.strengths).filter(function (x) { return x !== rv; }); save(); render(false); var nf = ROOT.querySelector('[data-own="strength"]') || ROOT.querySelector('#i2q'); if (nf) nf.focus(); return; }
    if (d.untag) { var ta = arr(V[d.untag]).slice(); ta.splice(+d.i, 1); V[d.untag] = ta; save(); render(false); return; }
    if (d.style != null) { V.style[d.style] = V.style[d.style] === d.v ? '' : d.v; save(); buzz(); render(false); return; }
    if (d.dealAns) { answerDeal(d.dealAns); return; }
    if (d.up != null || d.down != null) { var i = +(d.up != null ? d.up : d.down), j = d.up != null ? i - 1 : i + 1; var r = V.rank.slice(); var tmp = r[i]; r[i] = r[j]; r[j] = tmp; V.rank = r; save(); render(false); var fb = ROOT.querySelector('[data-' + (d.up != null ? 'up' : 'down') + '="' + j + '"]') || ROOT.querySelector('[data-r="' + j + '"] button:not([disabled])'); if (fb) fb.focus(); return; }
    if (d.swap) { syncRank(); var rr = V.rank.slice(); rr[rr.length - 1] = d.swap; V.rank = rr; save(); render(false); var sw = ROOT.querySelector('[data-swap]') || ROOT.querySelector('#i2rank button:not([disabled])'); if (sw) sw.focus(); return; }
    if (d.jump != null) { flushDeal(); fromReview = S[cur].id === 'review'; cur = +d.jump; msg = ''; bad = []; laterOpen = false; save(); render(); return; }
    if (d.mic) { listen(d.mic, b); return; }
    if (d.act === 'toreview') { flushDeal(); toReview(); return; }
    if (d.act === 'noresume') { V.noResume = true; file = null; D.resumeName = ''; parsed = null; parsing = false; save(); cur = idx('confirm'); render(); return; }
    if (d.act === 'dealreset') { V.deal = {}; save(); render(false); return; }
    if (d.act === 'dealundo') { flushDeal(); var ks = DEAL.map(function (c) { return c.k; }).filter(function (k2) { return V.deal[k2]; }); if (ks.length) delete V.deal[ks[ks.length - 1]]; save(); render(false); return; }
    if (d.act === 'restart') { try { localStorage.removeItem(KEY); } catch (er) {} location.reload(); return; }
    if (d.act === 'later') { laterOpen = !laterOpen; laterMsg = ''; render(false); var le = document.getElementById('i2lateremail'); if (le) le.focus(); return; }
    if (d.act === 'latersend') { sendLater(); return; }
  });
  /* "Email me a link to finish later" (backend v1.27 intakeDraftSave). In PREVIEW it shows what would be sent and sends nothing. */
  var LATER_ERR = {
    'too large': 'Your answers are too long to save in a link. Try shortening your longest answer, or finish the form now.',
    'bad email': 'That email does not look right. Please check it and try again.',
    'bad draft': 'I could not save your answers in a link. They are still saved on this device.',
    busy: 'Too many links were asked for just now. Please try again later. Your answers are still saved on this device.'
  };
  function sendLater() {
    if (laterBusy) return;
    var el = document.getElementById('i2lateremail'), em = String(el ? el.value : D.email || '').trim();
    var done = function (kind, text) { laterBusy = false; laterKind = kind; laterMsg = text; laterOpen = true; if (S[cur]) render(false); var m = document.getElementById('i2latermsg'); if (m) try { m.focus({ preventScroll: true }); } catch (e) {} };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em) || em.length > 254) { done('err', esc(LATER_ERR['bad email'])); return; }
    var draft = draftData(), body = { action: 'intakeDraftSave', email: em, draft: draft }, size = JSON.stringify(draft).length;
    if (size > 60000) { done('err', esc(LATER_ERR['too large'])); return; }
    if (PREVIEW) { done('info', '<b>Preview: nothing was sent.</b> The live form would send this and email a link to ' + esc(em) + '.<details class="i2-sent"><summary>What would be sent</summary><pre>' + esc(JSON.stringify(body, null, 2)) + '</pre></details>'); return; }
    laterBusy = true; render(false);
    post(body, 45000).then(function (d) {
      if (d && d.ok) { done('info', 'Check your email. I sent a link to ' + esc(em) + '. This link works for 30 days. Once you open it and pick up where you left off, it stops working.'); return; }
      var er = d && d.error; done('err', esc(LATER_ERR[er] || 'The link did not send. Please try again later. Your answers are still saved on this device.'));
    }).catch(function (e) {
      /* a timeout may still have saved and emailed the link, so do not invite a second try right away */
      if (e && e.name === 'AbortError') { done('err', 'I am not sure that went through. Check your email in a few minutes before trying again.'); return; }
      done('err', 'The link did not send. Please check your connection and try again. Your answers are still saved on this device.');
    });
  }
  function cssq(s) { return String(s).replace(/["\\]/g, '\\$&'); }
  function addOwnVal(kind) {
    var el = ROOT.querySelector('[data-own="' + kind + '"]'); if (!el) return; var v = el.value.replace(/\s+/g, ' ').trim().slice(0, 80); if (!v) { el.focus(); return; }
    if (kind === 'title') { var tl = titleList(); if (tl.length >= 5) { msgKind = 'info'; msg = 'You already have 5 titles. Remove one to add another.'; render(); return; } if (tl.indexOf(v) < 0) tl.push(v); V.titles = tl; clearBad('v2.titles'); }
    else if (kind === 'strength') { if (arr(V.strengthsOwn).indexOf(v) < 0 && arr(V.strengthsOwn).length >= OWN_MAX) { render(false); return; } V.strengthsOwn = uniq(arr(V.strengthsOwn).concat([v])); var sl = arr(V.strengths); if (sl.length < 5 && sl.indexOf(v) < 0) sl.push(v); V.strengths = sl; }
    else { V[kind] = uniq(arr(V[kind]).concat([v])).slice(0, 15); }
    save(); render(false); var n = ROOT.querySelector('[data-own="' + kind + '"]'); if (n) n.focus();
  }
  function clearBad(k) { bad = bad.filter(function (x) { return x !== k; }); var id = idOf(k), el = document.getElementById(id) || document.getElementById('g_' + id) || document.getElementById('a_' + k); if (el) { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); el.classList.remove('bad'); } }

  /* deal-breaker deck: drag, keys or buttons. Finding 16: answers given while a card is still flying off wait in a queue and
     are applied in order; leaving the screen applies them at once. */
  var dealQ = [], dealCommit = null, dealFlush = false;
  function answerDeal(a) {
    if (dealAnim) { dealQ.push(a); return; }
    var c = DEAL.filter(function (x) { return !V.deal[x.k]; })[0]; if (!c) { dealQ = []; return; }
    var el = document.getElementById('i2card'), tm = null, did = false;
    var commit = function () {
      if (did) return; did = true; clearTimeout(tm); dealAnim = false; dealCommit = null;
      V.deal[c.k] = a; save(); buzz();
      if (!dealFlush && S[cur].id === 'deal') render(false);
      if (dealQ.length) answerDeal(dealQ.shift());
    };
    if (el && !dealFlush && !RM() && el.animate) {
      dealAnim = true; dealCommit = commit;
      el.animate([{ transform: el.style.transform || 'none', opacity: 1 }, { transform: 'translateX(' + (a === 'no' ? -420 : 420) + 'px) rotate(' + (a === 'no' ? -14 : 14) + 'deg)', opacity: 0 }], { duration: dealQ.length ? 110 : 220, easing: 'ease-in' }).onfinish = commit;
      tm = setTimeout(commit, 600);
    } else commit();
  }
  function flushDeal() { if (!dealAnim && !dealQ.length) return; dealFlush = true; try { if (dealCommit) dealCommit(); while (dealQ.length) answerDeal(dealQ.shift()); } finally { dealFlush = false; } }
  function bindDeck(el) {
    var x0 = null, dx = 0;
    el.addEventListener('pointerdown', function (e) { x0 = e.clientX; dx = 0; try { el.setPointerCapture(e.pointerId); } catch (er) {} });
    el.addEventListener('pointermove', function (e) { if (x0 == null) return; dx = e.clientX - x0; el.style.transform = 'translateX(' + dx + 'px) rotate(' + (dx / 24) + 'deg)'; el.classList.toggle('lean-no', dx < -30); el.classList.toggle('lean-ok', dx > 30); });
    var end = function () { if (x0 == null) return; x0 = null; if (Math.abs(dx) > 90) answerDeal(dx < 0 ? 'no' : 'ok'); else { el.style.transform = ''; el.classList.remove('lean-no', 'lean-ok'); } };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }
  /* rank: drag and drop with the up/down buttons as the always-available way */
  function bindRank(ol) {
    var from = null;
    ol.addEventListener('dragstart', function (e) { var li = e.target.closest('li'); if (!li) return; from = +li.dataset.r; try { e.dataTransfer.setData('text/plain', String(from)); e.dataTransfer.effectAllowed = 'move'; } catch (er) {} });
    ol.addEventListener('dragover', function (e) { if (from != null) e.preventDefault(); });
    ol.addEventListener('drop', function (e) { e.preventDefault(); var li = e.target.closest('li'); if (!li || from == null) return; var to = +li.dataset.r, r = V.rank.slice(), x = r.splice(from, 1)[0]; r.splice(to, 0, x); V.rank = r; from = null; save(); render(false); });
  }
  /* voice input */
  function listen(k, btn) {
    if (!SR) return; var r; try { r = new SR(); } catch (e) { return; }
    r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 1;
    btn.classList.add('on'); btn.querySelector('span').textContent = 'Listening…';
    r.onresult = function (ev) { var t = ev.results[0][0].transcript; var prev = String(get(k) || '').trim(); set(k, (prev ? prev + ' ' : '') + t); save(); };
    r.onend = function () { render(false); };
    r.onerror = function () { render(false); };
    try { r.start(); } catch (e) { render(false); }
  }
  /* drag a file onto the drop zone */
  document.addEventListener('dragover', function (e) { if (e.target.closest && e.target.closest('#i2drop')) { e.preventDefault(); e.target.closest('#i2drop').classList.add('over'); } });
  document.addEventListener('dragleave', function (e) { var z = e.target.closest && e.target.closest('#i2drop'); if (z) z.classList.remove('over'); });
  document.addEventListener('drop', function (e) { var z = e.target.closest && e.target.closest('#i2drop'); if (!z) return; e.preventDefault(); z.classList.remove('over'); onFile(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]); });

  /* start: never past the first screen with a missing required answer, never straight onto Confirm (at most the review), and a
     hidden screen falls back to the nearest earlier one, not to the welcome (finding 8) */
  function startAt() {
    if (!(cur >= 0) || cur >= S.length) cur = 0;
    cur = Math.min(cur, idx('review'));
    for (var i = 0; i < cur; i++) if (visible(i) && needOf(S[i]).length) { cur = i; break; }
    while (cur > 0 && !visible(cur)) cur--;
  }
  function useState(st) { D = st; V = D.v2; fixMod(); file = null; parsed = null; parsing = false; cur = Number(D._at) || 0; startAt(); }
  function hasLocal() { return !!(D._saved && (String(D.name || '').trim() || String(D.email || '').trim() || V.field)); }
  /* "finish later" link: /start/v2/?d=<key> (backend v1.27 intakeDraftLoad). Never in PREVIEW. The emailed answers replace the
     ones on this device as a whole; when this device already has answers, the person picks one set. The two are never mixed. */
  var dkey = null; try { dkey = new URLSearchParams(location.search).get('d'); } catch (e) {}
  function dropKey() { try { var u = new URL(location.href); u.searchParams.delete('d'); history.replaceState(null, '', u.pathname + u.search + u.hash); } catch (e) {} }
  var pendingDraft = null;
  function shell(inner) { ROOT.innerHTML = pathbar(0) + '<div class="i2-card-wrap"><section class="i2-sheet" data-screen="draft" aria-labelledby="i2title i2q"><p class="i2-step" id="i2title">Welcome back</p>' + inner + '</section></div>'; var q = document.getElementById('i2q'); if (q) try { q.focus({ preventScroll: true }); } catch (e) {} }
  /* round 3: the backend hands a draft out without using it up; this tells it the answers were applied or set aside */
  function draftDone() { if (PREVIEW || !/^[a-z0-9]{40}$/.test(String(dkey || ''))) return; try { post({ action: 'intakeDraftDone', key: dkey }).catch(function () {}); } catch (e) {} }
  /* round 4: applied only after a tap (a link scanner opening the page never uses the link up), and done is sent only when the
     saved copy reads back; if this browser will not save, the answers stay in the tab and the link keeps working */
  function applyDraft() {
    var st = cleanState(pendingDraft); pendingDraft = null; useState(st);
    if (save()) { dropKey(); draftDone(); msgKind = 'info'; msg = 'Your emailed answers are here, so you can pick up where you left off.' + (lostResume() ? ' Please attach your resume again; files are not saved in the link.' : ''); }
    else { msgKind = 'err'; msg = 'Your browser is not letting this page save your answers, so keep this tab open until you send the form.'; }
    render();
  }
  var USED = 'That link has already been used or has expired. If you opened it on another device, your answers are there. Otherwise you can start a fresh form here.';
  function expired() { dropKey(); if (!hasLocal()) cur = 0; startAt(); msgKind = 'info'; msg = USED; render(false); }
  /* round 5: nothing is asked of the backend until the person taps Open or Use. The live backend starts a 60-minute clock on the
     first load, so a link scanner or a quick look must never load it. Keep sends only done (always ok) and makes no load call.
     ?d= leaves the address bar only once the draft is applied or set aside, or the link is used, expired or malformed; on a
     timeout or busy answer it stays, so a reload tries again. */
  var loadingDraft = false;
  function loadDraft() {
    if (loadingDraft) return; loadingDraft = true;
    shell('<p class="i2-reading" role="status"><span class="i2-dots" aria-hidden="true"><i></i><i></i><i></i></span>Opening your saved answers…</p>');
    post({ action: 'intakeDraftLoad', key: dkey }, 45000).then(function (d) {
      loadingDraft = false;
      if (d && d.ok && d.draft && typeof d.draft === 'object' && !Array.isArray(d.draft)) { pendingDraft = d.draft; applyDraft(); return; }
      if (d && d.error === 'expired') { expired(); return; }
      /* an old backend that does not know the action: after two such answers for the same link, treat it as used or expired */
      if (d && d.error === 'unknown action') { var uk = 'sp_i2_unk_' + dkey, un = 0; try { un = Number(sessionStorage.getItem(uk)) + 1; sessionStorage.setItem(uk, String(un)); } catch (e) {} if (un >= 2) { expired(); return; } }
      startAt(); msgKind = 'info'; msg = 'I could not open your saved answers just now, so you are seeing the answers on this device. Reload this page in a few minutes to try the link again.'; render(false);
    }).catch(function (e) {
      loadingDraft = false; startAt(); msgKind = 'info';
      msg = (e && e.name === 'AbortError' ? 'Your saved answers are taking too long to open' : 'I could not reach my server to open your saved answers') + ', so you are seeing the answers on this device. Reload this page to try the link again.';
      render(false);
    });
  }
  ROOT.addEventListener('click', function (e) {
    var b = e.target.closest('[data-draft]'); if (!b || loadingDraft || !dkey || !ROOT.querySelector('[data-screen="draft"]')) return;
    if (b.getAttribute('data-draft') === 'use') { loadDraft(); return; }
    dropKey(); draftDone(); dkey = null; startAt(); save(); msgKind = 'info'; msg = 'I kept the answers on this device. The emailed answers were set aside and that link will no longer work.'; render();
  });
  if (dkey != null && !PREVIEW) {
    if (!/^[a-z0-9]{40}$/.test(dkey)) expired();
    else if (!hasLocal()) shell('<h2 class="i2-h" id="i2q" tabindex="-1">Your saved answers are ready</h2><p class="i2-p">Tap below to pick up where you left off.</p>' +
      '<div class="i2-ctas"><button type="button" class="btn gold" data-draft="use">Open my saved answers</button></div>');
    else shell('<h2 class="i2-h" id="i2q" tabindex="-1">Which answers do you want to use?</h2><p class="i2-p">This device already has answers saved from before. If you use the emailed answers, they replace these. I never mix the two.</p>' +
      '<div class="i2-ctas"><button type="button" class="btn gold" data-draft="use">Use the emailed answers</button><button type="button" class="btn ghost" data-draft="keep">Keep what is on this device</button></div>');
  } else {
    if (dkey != null) { dropKey(); msgKind = 'info'; msg = 'Preview: saved-answer links open only on the live form, so nothing was loaded.'; }
    startAt(); render(false);
  }
})();
