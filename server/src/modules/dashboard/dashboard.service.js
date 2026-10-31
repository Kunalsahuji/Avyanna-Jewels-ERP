import { User } from '../users/user.model.js';
import { delegationService } from '../delegation/delegation.service.js';
import { checklistService } from '../checklist/checklist.service.js';
import { ticketService } from '../tickets/ticket.service.js';
import { startOfDay, endOfDay, addDays, dayKey } from '../../utils/dates.js';

const SOURCES = [
  { label: 'Delegation', svc: delegationService, text: 'description' },
  { label: 'Checklist', svc: checklistService, text: 'description' },
  { label: 'Help Tickets', svc: ticketService, text: 'title' },
];

// Every module is flattened to the same shape so the dashboard maths is written once.
const normalise = (doc, { label, svc, text }) => {
  const c = svc.cfg;
  return {
    module: label,
    title: doc[text],
    due: doc[c.dateField],
    done: doc.status === c.doneStatus,
    doneAt: doc[c.doneField],
    assignee: doc[c.assigneeField] ? String(doc[c.assigneeField]) : null,
  };
};

export async function getDashboard(user, { days = 30, userId } = {}) {
  const today = startOfDay();
  const since = startOfDay(addDays(today, -(days - 1)));
  const weekEnd = endOfDay(addDays(today, 6));

  // Admins/managers may focus on one person; doers are always scoped to themselves.
  const extra = userId && user.role !== 'doer' ? { assignedTo: userId } : {};

  const perSource = await Promise.all(
    SOURCES.map(async (src) => {
      const { svc } = src;
      const c = svc.cfg;
      const scope = { ...svc.scope(user), ...extra };
      const [windowDocs, overdueOpen, overdueCount, upcoming] = await Promise.all([
        svc.Model.find({ ...scope, [c.dateField]: { $gte: since, $lte: endOfDay() } }).lean(),
        svc.Model.find({ ...scope, status: { $in: c.openStatuses }, [c.dateField]: { $lt: today } })
          .sort({ [c.dateField]: 1 }).limit(6).lean(),
        svc.Model.countDocuments({ ...scope, status: { $in: c.openStatuses }, [c.dateField]: { $lt: today } }),
        svc.Model.find({ ...scope, status: { $in: c.openStatuses }, [c.dateField]: { $gte: today, $lte: weekEnd } }).lean(),
      ]);
      return {
        src,
        items: windowDocs.map((d) => normalise(d, src)),
        overdueOpen: overdueOpen.map((d) => normalise(d, src)),
        overdueCount,
        upcoming: upcoming.map((d) => normalise(d, src)),
      };
    })
  );

  const items = perSource.flatMap((p) => p.items);
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

  // Delivery: work due each day, split into completed / pending
  const delivery = [];
  for (let i = 0; i < days; i += 1) delivery.push({ date: dayKey(addDays(since, i)), completed: 0, pending: 0 });
  const byDay = Object.fromEntries(delivery.map((d) => [d.date, d]));
  items.forEach((i) => { const d = byDay[dayKey(i.due)]; if (d) d[i.done ? 'completed' : 'pending'] += 1; });

  const byModule = perSource.map((p) => ({
    module: p.src.label,
    total: p.items.length,
    completed: p.items.filter((i) => i.done).length,
    pending: p.items.filter((i) => !i.done).length,
  }));

  // Team table (admins/managers only)
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
        return { userId: u._id, name: u.name, department: u.department, role: u.role, ...t, pending: t.total - t.completed };
      })
      .sort((a, b) => b.pending - a.pending);
  }

  // Week ahead: open work due in the next 7 days
  const weekAhead = Array.from({ length: 7 }, (_, i) => ({ date: dayKey(addDays(today, i)), count: 0 }));
  const weekMap = Object.fromEntries(weekAhead.map((d) => [d.date, d]));
  perSource.flatMap((p) => p.upcoming).forEach((i) => { const d = weekMap[dayKey(i.due)]; if (d) d.count += 1; });

  const needsAttention = perSource
    .flatMap((p) => p.overdueOpen)
    .sort((a, b) => new Date(a.due) - new Date(b.due))
    .slice(0, 6)
    .map((i) => ({ ...i, daysLate: Math.floor((today - startOfDay(i.due)) / 86400000) }));

  return {
    days,
    summary,
    delivery,
    byModule,
    team,
    weekAhead,
    needsAttention,
    overdueTotal: perSource.reduce((n, p) => n + p.overdueCount, 0),
  };
}
