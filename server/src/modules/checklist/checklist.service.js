import { BaseService } from '../../common/base.service.js';
import { nextSeq } from '../../common/Counter.js';
import { addDays, startOfDay, endOfDay } from '../../utils/dates.js';
import { Checklist } from './checklist.model.js';
import { User } from '../users/user.model.js';
import { AppError } from '../../utils/AppError.js';

const MAX_OCCURRENCES = 366;

function occurrences(start, frequency, until) {
  if (frequency === 'once' || !until) return [new Date(start)];
  const dates = [];
  for (let d = new Date(start); d <= until && dates.length < MAX_OCCURRENCES; ) {
    dates.push(new Date(d));
    if (frequency === 'daily') d = addDays(d, 1);
    else if (frequency === 'weekly') d = addDays(d, 7);
    else {
      d = new Date(d);
      d.setMonth(d.getMonth() + 1);
    }
  }
  return dates;
}

class ChecklistService extends BaseService {
  async buildForCreate(user, { repeatUntil, ...data }) {
    const dates = occurrences(data.plannedDate, data.frequency, repeatUntil);
    const rows = [];
    for (const plannedDate of dates) {
      rows.push({
        ...data,
        plannedDate,
        taskCode: String(await nextSeq('checklist', 5)),
      });
    }
    return rows;
  }

  async stats(user, q = {}) {
    const base = await super.stats(user, q);
    const scope = { ...this.scope(user) };
    if (q.category) scope.category = q.category;
    if (q.assignedTo && user.role !== 'doer') scope.assignedTo = q.assignedTo;

    const lateDone = await this.Model.countDocuments({
      ...scope,
      status: 'completed',
      $expr: { $gt: ['$actualDate', '$plannedDate'] },
    });

    return {
      ...base,
      lateDone,
    };
  }

  async perPerson(user, q = {}) {
    const scope = { ...this.scope(user) };
    if (q.category) scope.category = q.category;
    if (q.from || q.to) {
      scope.plannedDate = {
        ...(q.from && { $gte: startOfDay(q.from) }),
        ...(q.to && { $lte: endOfDay(q.to) }),
      };
    }

    const items = await this.Model.find(scope).populate('assignedTo', 'name email department').lean();

    const tally = {};
    for (const item of items) {
      if (!item.assignedTo) continue;
      const uid = String(item.assignedTo._id);
      if (!tally[uid]) {
        tally[uid] = {
          user: item.assignedTo,
          total: 0,
          completed: 0,
          pending: 0,
          lateDone: 0,
        };
      }
      tally[uid].total += 1;
      if (item.status === 'completed') {
        tally[uid].completed += 1;
        if (item.actualDate && new Date(item.actualDate) > endOfDay(item.plannedDate)) {
          tally[uid].lateDone += 1;
        }
      } else {
        tally[uid].pending += 1;
      }
    }

    return Object.values(tally).map((row) => {
      const notDonePct = row.total > 0 ? Math.round((row.pending / row.total) * 100) : 0;
      const completionPct = row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0;
      const lateComplPct = row.completed > 0 ? Math.round((row.lateDone / row.completed) * 100) : 0;
      return {
        ...row,
        notDonePct,
        completionPct,
        lateComplPct,
      };
    });
  }

  async complete(user, id, body = {}) {
    const doc = await this.getOwned(user, id);
    if (doc.status === 'completed') throw new AppError('Checklist item already completed', 400);

    doc.status = 'completed';
    doc.actualDate = new Date();
    doc.completedBy = user._id;
    if (body.proofUrl) doc.proofUrl = body.proofUrl;
    if (body.documentName) doc.documentName = body.documentName;
    if (body.remark) doc.remark = body.remark;
    if (body.mdRemark) doc.mdRemark = body.mdRemark;

    await doc.save();
    return doc;
  }

  async updateMdRemark(user, id, mdRemark) {
    const doc = await this.Model.findById(id);
    if (!doc) throw new AppError('Checklist item not found', 404);
    doc.mdRemark = mdRemark;
    await doc.save();
    return doc;
  }
}

export const checklistService = new ChecklistService(Checklist, {
  key: 'checklist',
  dateField: 'plannedDate',
  doneStatus: 'completed',
  doneField: 'actualDate',
  openStatuses: ['pending'],
  searchFields: ['taskCode', 'description'],
});
