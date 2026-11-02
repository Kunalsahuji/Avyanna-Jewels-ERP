import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { User } from './modules/users/user.model.js';
import { Delegation } from './modules/delegation/delegation.model.js';
import { Checklist } from './modules/checklist/checklist.model.js';
import { Ticket } from './modules/tickets/ticket.model.js';
import { addDays } from './utils/dates.js';

await connectDB();
await Promise.all([User, Delegation, Checklist, Ticket, mongoose.connection.collection('counters')].map((m) => (m.deleteMany ? m.deleteMany({}) : null)));

const pw = env.seedPassword;
const domain = env.seedDomain;
const toEmail = (handle) => `${handle}@${domain}`;

const users = await User.create([
  { name: 'Devraj Sharma', email: env.seedAdminEmail, password: pw, role: 'admin', department: 'Management' },
  { name: 'Aarti Panchal', email: toEmail('aarti'), password: pw, role: 'admin', department: 'Operations' },
  { name: 'Abhimanyu Singh Krishnawat', email: toEmail('abhimanyu'), password: pw, role: 'admin', department: 'Operations' },
  { name: 'Meera Shah', email: toEmail('meera'), password: pw, role: 'manager', department: 'Operations' },
  { name: 'Ratan Singh Bijarniya', email: toEmail('ratan'), password: pw, role: 'doer', department: 'Accounts' },
  { name: 'Priya Sogarwal', email: toEmail('priya'), password: pw, role: 'doer', department: 'Accounts' },
  { name: 'Aliya', email: toEmail('aliya'), password: pw, role: 'doer', department: 'Sales' },
  { name: 'Swechha Jain', email: toEmail('swechha'), password: pw, role: 'doer', department: 'Sales' },
  { name: 'Amit Agarwal', email: toEmail('amit'), password: pw, role: 'doer', department: 'Operations' },
  { name: 'Pia Mirwani', email: toEmail('pia'), password: pw, role: 'doer', department: 'HR' },
  { name: 'Harshika Joshi', email: toEmail('harshika'), password: pw, role: 'doer', department: 'HR' },
  { name: 'Mahesh Sharma', email: toEmail('mahesh'), password: pw, role: 'doer', department: 'Production' },
  { name: 'Harsh Saraswat', email: toEmail('harsh'), password: pw, role: 'doer', department: 'Operations' },
  { name: 'Himanshu', email: toEmail('himanshu'), password: pw, role: 'doer', department: 'Sales' },
]);

const userMap = Object.fromEntries(users.map((u) => [u.name, u]));
const now = new Date();

// 1. Delegations
const delegationsData = [
  { taskId: 'TSK-000010', description: 'test', assignedTo: userMap['Harsh Saraswat']._id, assignedBy: userMap['Devraj Sharma']._id, dueDate: now, status: 'pending', priority: 'high', revisions: 0 },
  { taskId: 'TSK-000009', description: 'purchase of diamonds princess cut and round cut', assignedTo: userMap['Amit Agarwal']._id, assignedBy: userMap['Aarti Panchal']._id, dueDate: addDays(now, -80), status: 'pending', priority: 'critical', revisions: 0 },
  { taskId: 'TSK-000008', description: 'Hyderabad exhibition sheet', assignedTo: userMap['Ratan Singh Bijarniya']._id, assignedBy: userMap['Aarti Panchal']._id, dueDate: addDays(now, -90), status: 'pending', priority: 'high', revisions: 0 },
  { taskId: 'TSK-000007', description: 'fix the things in new bombay office - wifi...', assignedTo: userMap['Amit Agarwal']._id, assignedBy: userMap['Aarti Panchal']._id, dueDate: addDays(now, -91), status: 'pending', priority: 'high', revisions: 0 },
  { taskId: 'TSK-000006', description: 'need to buy the fridge , printer for bombay office', assignedTo: userMap['Amit Agarwal']._id, assignedBy: userMap['Aarti Panchal']._id, dueDate: addDays(now, -91), status: 'pending', priority: 'high', revisions: 0 },
  { taskId: 'TSK-000005', description: 'start customer calling', assignedTo: userMap['Himanshu']._id, assignedBy: userMap['Aarti Panchal']._id, dueDate: addDays(now, -135), status: 'completed', priority: 'medium', revisions: 0, completedAt: addDays(now, -134) },
  { taskId: 'TSK-000004', description: 'Verify safe gold bullion weights', assignedTo: userMap['Ratan Singh Bijarniya']._id, assignedBy: userMap['Devraj Sharma']._id, dueDate: addDays(now, -2), status: 'completed', priority: 'high', revisions: 0, completedAt: addDays(now, -1) },
  { taskId: 'TSK-000003', description: 'Update festival collection pricing catalogue', assignedTo: userMap['Aliya']._id, assignedBy: userMap['Devraj Sharma']._id, dueDate: addDays(now, -5), status: 'completed', priority: 'medium', revisions: 0, completedAt: addDays(now, -4) },
  { taskId: 'TSK-000002', description: 'Prepare showroom CCTV security audit report', assignedTo: userMap['Amit Agarwal']._id, assignedBy: userMap['Devraj Sharma']._id, dueDate: addDays(now, 2), status: 'pending', priority: 'low', revisions: 0 },
  { taskId: 'TSK-000001', description: 'Vendor payment reconciliations for bullion supplier', assignedTo: userMap['Priya Sogarwal']._id, assignedBy: userMap['Devraj Sharma']._id, dueDate: addDays(now, 1), status: 'pending', priority: 'high', revisions: 0 },
];
await Delegation.insertMany(delegationsData);

// 2. Checklists (General and Account)
let chkCounter = 1435;
const checklistData = [];

// Create Account Checklists for Ratan and Priya
const ratan = userMap['Ratan Singh Bijarniya'];
for (let d = -20; d <= 5; d++) {
  const pDate = addDays(now, d);
  const isDone = d <= 0 ? Math.random() < 0.78 : false;
  chkCounter++;
  checklistData.push({
    taskCode: String(chkCounter),
    category: 'account',
    description: 'Inventory Management',
    frequency: 'daily',
    assignedTo: ratan._id,
    plannedDate: pDate,
    status: isDone ? 'completed' : 'pending',
    actualDate: isDone ? (Math.random() < 0.5 ? pDate : addDays(pDate, 1)) : undefined,
    proofRequired: false,
    remark: isDone ? 'Reconciled closing balance' : '',
  });
}

// Checklists for other team members
const doerList = [
  userMap['Aliya'],
  userMap['Swechha Jain'],
  userMap['Amit Agarwal'],
  userMap['Pia Mirwani'],
  userMap['Harshika Joshi'],
  userMap['Mahesh Sharma'],
  userMap['Priya Sogarwal'],
];

const generalTasks = [
  'Showroom morning display setup & light check',
  'Safe lock physical count & seal check',
  'Customer follow-up register update',
  'Workshop job slip collection',
  'Daily attendance & overtime register check',
];

for (const user of doerList) {
  for (let d = -15; d <= 4; d++) {
    chkCounter++;
    const pDate = addDays(now, d);
    const isDone = d <= 0 ? Math.random() < 0.72 : false;
    checklistData.push({
      taskCode: String(chkCounter),
      category: user.department === 'Accounts' ? 'account' : 'general',
      description: generalTasks[chkCounter % generalTasks.length],
      frequency: 'daily',
      assignedTo: user._id,
      plannedDate: pDate,
      status: isDone ? 'completed' : 'pending',
      actualDate: isDone ? (Math.random() < 0.6 ? pDate : addDays(pDate, 2)) : undefined,
      proofRequired: Math.random() < 0.3,
    });
  }
}
await Checklist.insertMany(checklistData);

// 3. Help Tickets (Matching screenshot late items)
const ticketsData = [
  { ticketNo: 'TJP260526H101', title: 'task', raisedBy: userMap['Devraj Sharma']._id, assignedTo: userMap['Amit Agarwal']._id, priority: 'high', status: 'open', dueDate: addDays(now, -157) },
  { ticketNo: 'TJCRK260526H102', title: 'task', raisedBy: userMap['Ratan Singh Bijarniya']._id, assignedTo: userMap['Amit Agarwal']._id, priority: 'high', status: 'open', dueDate: addDays(now, -156) },
  { ticketNo: 'TJA280526H105', title: 'not able to access data', raisedBy: userMap['Abhimanyu Singh Krishnawat']._id, assignedTo: userMap['Amit Agarwal']._id, priority: 'critical', status: 'open', dueDate: addDays(now, -155) },
  { ticketNo: 'TJAA280526H103', title: 'testing', raisedBy: userMap['Amit Agarwal']._id, assignedTo: userMap['Amit Agarwal']._id, priority: 'medium', status: 'open', dueDate: addDays(now, -155) },
  { ticketNo: 'TJH280526H104', title: 'yuiopghjk', raisedBy: userMap['Himanshu']._id, assignedTo: userMap['Amit Agarwal']._id, priority: 'low', status: 'open', dueDate: addDays(now, -155) },
  { ticketNo: 'TJQC149', title: 'Quality Control (Open Setting)', raisedBy: userMap['Mahesh Sharma']._id, assignedTo: userMap['Mahesh Sharma']._id, priority: 'high', status: 'review', dueDate: addDays(now, -149) },
  { ticketNo: 'TJ801', title: 'Billing printer thermal roll jam in counter 2', raisedBy: userMap['Aliya']._id, assignedTo: userMap['Amit Agarwal']._id, priority: 'high', status: 'open', dueDate: addDays(now, -1) },
  { ticketNo: 'TJ802', title: 'Weighing scale calibration error in production room', raisedBy: userMap['Mahesh Sharma']._id, assignedTo: userMap['Devraj Sharma']._id, priority: 'critical', status: 'review', dueDate: addDays(now, -2) },
];
await Ticket.insertMany(ticketsData);

logger.info(`Database seeded with ${users.length} users, ${delegationsData.length} delegations, ${checklistData.length} checklists, and ${ticketsData.length} tickets.`);
logger.info(`Credentials configured via environment variables (SEED_ADMIN_EMAIL: ${env.seedAdminEmail}).`);

await mongoose.disconnect();
