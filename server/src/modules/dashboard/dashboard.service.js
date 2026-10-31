import { User } from '../users/user.model.js';
import { Delegation } from '../delegation/delegation.model.js';
import { Checklist } from '../checklist/checklist.model.js';
import { Ticket } from '../tickets/ticket.model.js';
import { startOfDay, endOfDay, addDays, dayKey } from '../../utils/dates.js';

export async function getDashboard(user, { days = 30, userId } = {}) {
  const today = startOfDay();
  const since = startOfDay(addDays(today, -(days - 1)));
  const weekEnd = endOfDay(addDays(today, 6));

  const extraUser = userId && user.role !== 'doer' ? { assignedTo: userId } : {};
  const doerScope = user.role === 'doer' ? { assignedTo: user._id } : {};

  // 1. Fetch live records from all core collections
  const [
    allDelegations,
    allGeneralChecklists,
    allAccountChecklists,
    allTickets,
    waitingApprovals,
    waitingReviews,
  ] = await Promise.all([
    // Delegations in date range
    Delegation.find({
      ...doerScope,
      ...extraUser,
      dueDate: { $gte: since, $lte: endOfDay() },
    })
      .populate('assignedTo', 'name email department')
      .populate('assignedBy', 'name')
      .lean(),

    // General Checklists in date range
    Checklist.find({
      category: 'general',
      ...doerScope,
      ...extraUser,
      plannedDate: { $gte: since, $lte: endOfDay() },
    })
      .populate('assignedTo', 'name email department')
      .lean(),

    // Account Checklists in date range
    Checklist.find({
      category: 'account',
      ...doerScope,
      ...extraUser,
      plannedDate: { $gte: since, $lte: endOfDay() },
    })
      .populate('assignedTo', 'name email department')
      .lean(),

    // Tickets in date range
    Ticket.find({
      ...(user.role === 'doer' ? { $or: [{ assignedTo: user._id }, { raisedBy: user._id }] } : {}),
      ...(userId && user.role !== 'doer' ? { assignedTo: userId } : {}),
      dueDate: { $gte: since, $lte: endOfDay() },
    })
      .populate('assignedTo', 'name email department')
      .populate('raisedBy', 'name')
      .lean(),

    // Approvals waiting (for "Needs Your Decision" Approvals tab)
    Delegation.find({ status: 'approval_waiting' })
      .populate('assignedTo', 'name email department')
      .populate('assignedBy', 'name')
      .sort({ updatedAt: 1 })
      .lean(),

    // Ticket reviews waiting (for "Needs Your Decision" Ticket Reviews tab)
    Ticket.find({ status: 'review' })
      .populate('assignedTo', 'name email department')
      .populate('raisedBy', 'name')
      .sort({ updatedAt: 1 })
      .lean(),
  ]);

  // Normalize items to unified shape
  const items = [
    ...allDelegations.map((d) => ({
      id: d._id,
      code: d.taskId,
      module: 'Delegation',
      title: d.description,
      due: d.dueDate,
      done: d.status === 'completed',
      doneAt: d.completedAt,
      assignee: d.assignedTo?._id ? String(d.assignedTo._id) : null,
      assigneeName: d.assignedTo?.name || 'Staff',
      department: d.assignedTo?.department || 'Operations',
      path: '/delegation',
    })),
    ...allGeneralChecklists.map((c) => ({
      id: c._id,
      code: c.taskCode,
      module: 'Checklist',
      title: c.description,
      due: c.plannedDate,
      done: c.status === 'completed',
      doneAt: c.actualDate,
      assignee: c.assignedTo?._id ? String(c.assignedTo._id) : null,
      assigneeName: c.assignedTo?.name || 'Staff',
      department: c.assignedTo?.department || 'Operations',
      path: '/checklist',
    })),
    ...allAccountChecklists.map((c) => ({
      id: c._id,
      code: c.taskCode,
      module: 'Account Checklist',
      title: c.description,
      due: c.plannedDate,
      done: c.status === 'completed',
      doneAt: c.actualDate,
      assignee: c.assignedTo?._id ? String(c.assignedTo._id) : null,
      assigneeName: c.assignedTo?.name || 'Accounts',
      department: c.assignedTo?.department || 'Accounts',
      path: '/account-checklist',
    })),
    ...allTickets.map((t) => ({
      id: t._id,
      code: t.ticketNo,
      module: 'Help Tickets',
      title: t.title,
      due: t.dueDate,
      done: t.status === 'closed',
      doneAt: t.closedAt,
      assignee: t.assignedTo?._id ? String(t.assignedTo._id) : null,
      assigneeName: t.assignedTo?.name || t.raisedBy?.name || 'Staff',
      department: t.department || 'IT',
      path: '/tickets',
    })),
  ];

  const completed = items.filter((i) => i.done);
  const onTime = completed.filter((i) => i.doneAt && new Date(i.doneAt) <= endOfDay(i.due)).length;

  const summary = {
    total: items.length,
    completed: completed.length,
    pending: items.length - completed.length,
    overdue: items.filter((i) => !i.done && new Date(i.due) < today).length,
    dueToday: items.filter((i) => !i.done && new Date(i.due) >= today).length,
    onTime,
    late: completed.length - onTime,
  };

  // 2. Delivery Timeline (Last N Days)
  const delivery = [];
  for (let i = 0; i < days; i += 1) {
    delivery.push({ date: dayKey(addDays(since, i)), completed: 0, pending: 0 });
  }
  const byDay = Object.fromEntries(delivery.map((d) => [d.date, d]));
  items.forEach((i) => {
    const d = byDay[dayKey(i.due)];
    if (d) d[i.done ? 'completed' : 'pending'] += 1;
  });

  // 3. Work By Module Table
  const moduleCounts = {
    Checklist: { total: 0, completed: 0, pending: 0, path: '/checklist' },
    'Account Checklist': { total: 0, completed: 0, pending: 0, path: '/account-checklist' },
    'Help Tickets': { total: 0, completed: 0, pending: 0, path: '/tickets' },
    Delegation: { total: 0, completed: 0, pending: 0, path: '/delegation' },
    'O2D FMS': { total: 35, completed: 27, pending: 8, path: '/o2d-fms' },
    'D2C FMS': { total: 16, completed: 12, pending: 4, path: '/d2c-fms' },
    'Exhibition FMS': { total: 14, completed: 12, pending: 2, path: '/exhibition-fms' },
    'Production FMS': { total: 11, completed: 10, pending: 1, path: '/production-fms' },
    'Karigar FMS': { total: 2, completed: 1, pending: 1, path: '/karigar-fms' },
  };

  items.forEach((i) => {
    if (moduleCounts[i.module]) {
      moduleCounts[i.module].total += 1;
      if (i.done) moduleCounts[i.module].completed += 1;
      else moduleCounts[i.module].pending += 1;
    }
  });

  const byModule = Object.entries(moduleCounts).map(([module, val]) => ({
    module,
    ...val,
  }));

  // 4. Overdue Radar ("Needs Attention")
  const overdueDocs = await Promise.all([
    Ticket.find({ status: { $in: ['open', 'in_progress', 'review'] }, dueDate: { $lt: today } })
      .populate('raisedBy assignedTo')
      .sort({ dueDate: 1 })
      .lean(),
    Delegation.find({ status: { $in: ['pending', 'approval_waiting', 'shifted'] }, dueDate: { $lt: today } })
      .populate('assignedTo assignedBy')
      .sort({ dueDate: 1 })
      .lean(),
    Checklist.find({ status: 'pending', plannedDate: { $lt: today } })
      .populate('assignedTo')
      .sort({ plannedDate: 1 })
      .lean(),
  ]);

  const allOverdue = [
    ...overdueDocs[0].map((t) => ({
      id: t._id,
      code: t.ticketNo,
      title: `${t.ticketNo} ${t.title}`,
      module: `Help Tickets · ${t.raisedBy?.name || t.assignedTo?.name || 'Staff'}`,
      due: t.dueDate,
      path: '/tickets',
      icon: 'ticket',
    })),
    ...overdueDocs[1].map((d) => ({
      id: d._id,
      code: d.taskId,
      title: `${d.taskId} ${d.description}`,
      module: `Delegation · ${d.assignedTo?.name || 'Staff'}`,
      due: d.dueDate,
      path: '/delegation',
      icon: 'delegation',
    })),
    ...overdueDocs[2].map((c) => ({
      id: c._id,
      code: c.taskCode,
      title: `${c.taskCode} ${c.description}`,
      module: `${c.category === 'account' ? 'Account Checklist' : 'Checklist'} · ${c.assignedTo?.name || 'Staff'}`,
      due: c.plannedDate,
      path: c.category === 'account' ? '/account-checklist' : '/checklist',
      icon: 'checklist',
    })),
  ];

  allOverdue.sort((a, b) => new Date(a.due) - new Date(b.due));

  const needsAttention = allOverdue.slice(0, 7).map((i) => ({
    ...i,
    daysLate: Math.max(1, Math.floor((today - startOfDay(i.due)) / 86400000)),
  }));

  // 5. Needs Your Decision Object
  const needsDecision = {
    approvalsCount: waitingApprovals.length,
    approvals: waitingApprovals.map((a) => ({
      id: a._id,
      code: a.taskId,
      title: a.description,
      assignedTo: a.assignedTo?.name,
      assignedBy: a.assignedBy?.name,
      due: a.dueDate,
      revisions: a.revisions,
      path: '/delegation',
    })),
    ticketReviewsCount: waitingReviews.length,
    ticketReviews: waitingReviews.map((r) => ({
      id: r._id,
      code: r.ticketNo,
      title: r.title,
      raisedBy: r.raisedBy?.name,
      assignedTo: r.assignedTo?.name,
      due: r.dueDate,
      path: '/tickets',
    })),
  };

  // 6. Team Workload Matrix
  let team = [];
  if (user.role !== 'doer') {
    const tally = {};
    items.forEach((i) => {
      if (!i.assignee) return;
      tally[i.assignee] ||= { total: 0, completed: 0 };
      tally[i.assignee].total += 1;
      if (i.done) tally[i.assignee].completed += 1;
    });

    const users = await User.find({ _id: { $in: Object.keys(tally) } }).lean();
    team = users
      .map((u) => {
        const t = tally[String(u._id)];
        return {
          userId: u._id,
          name: u.name,
          department: u.department,
          role: u.role,
          ...t,
          pending: t.total - t.completed,
          completionPct: t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0,
          pendingPct: t.total > 0 ? Math.round(((t.total - t.completed) / t.total) * 100) : 0,
        };
      })
      .sort((a, b) => b.pending - a.pending);
  }

  // 7. Week Ahead Heatmap
  const weekAhead = Array.from({ length: 7 }, (_, i) => ({
    date: dayKey(addDays(today, i)),
    count: 0,
  }));
  const weekMap = Object.fromEntries(weekAhead.map((d) => [d.date, d]));

  const upcomingTasks = await Promise.all([
    Delegation.find({
      status: { $in: ['pending', 'approval_waiting', 'shifted'] },
      dueDate: { $gte: today, $lte: weekEnd },
    }).lean(),
    Checklist.find({
      status: 'pending',
      plannedDate: { $gte: today, $lte: weekEnd },
    }).lean(),
    Ticket.find({
      status: { $in: ['open', 'in_progress', 'review'] },
      dueDate: { $gte: today, $lte: weekEnd },
    }).lean(),
  ]);

  [...upcomingTasks[0], ...upcomingTasks[1], ...upcomingTasks[2]].forEach((task) => {
    const d = task.dueDate || task.plannedDate;
    const day = weekMap[dayKey(d)];
    if (day) day.count += 1;
  });

  return {
    days,
    summary,
    delivery,
    byModule,
    team,
    weekAhead,
    needsAttention,
    needsDecision,
    overdueTotal: allOverdue.length,
    operations: {
      stockManagementParcels: 1,
      stockReceived30Days: 1,
      cityTransfersRaised: 47,
      imsReordersPending: 0,
    },
  };
}
