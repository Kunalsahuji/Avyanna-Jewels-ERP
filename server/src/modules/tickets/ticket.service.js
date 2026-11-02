import { BaseService } from '../../common/base.service.js';
import { nextSeq } from '../../common/Counter.js';
import { addDays, startOfDay, endOfDay } from '../../utils/dates.js';
import { AppError } from '../../utils/AppError.js';
import { Ticket } from './ticket.model.js';

class TicketService extends BaseService {
  // Anyone can raise a ticket and sees the ones they raised or were assigned.
  scope(user) {
    return user.role === 'doer' ? { $or: [{ assignedTo: user._id }, { raisedBy: user._id }] } : {};
  }

  async buildForCreate(user, data) {
    const seq = await nextSeq('ticket', 5);
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const userPrefix = (user.name || 'USER')
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const ticketNo = `AV${userPrefix}${dateStr}H${seq}`;

    const cleanData = { ...data };
    if (!cleanData.assignedTo) delete cleanData.assignedTo;

    return [
      {
        dueDate: cleanData.dueDate || addDays(new Date(), 3),
        ...cleanData,
        ticketNo,
        raisedBy: user._id,
      },
    ];
  }

  async stats(user, q = {}) {
    const scope = { ...this.scope(user) };
    if (q.assignedTo && user.role !== 'doer') scope.assignedTo = q.assignedTo;
    if (q.department) scope.department = q.department;

    const [total, open, inProgress, review, closed, overdue, dueToday] = await Promise.all([
      this.Model.countDocuments(scope),
      this.Model.countDocuments({ ...scope, status: 'open' }),
      this.Model.countDocuments({ ...scope, status: 'in_progress' }),
      this.Model.countDocuments({ ...scope, status: 'review' }),
      this.Model.countDocuments({ ...scope, status: 'closed' }),
      this.Model.countDocuments({
        ...scope,
        status: { $in: ['open', 'in_progress', 'review'] },
        dueDate: { $lt: startOfDay() },
      }),
      this.Model.countDocuments({
        ...scope,
        status: { $in: ['open', 'in_progress', 'review'] },
        dueDate: { $gte: startOfDay(), $lte: endOfDay() },
      }),
    ]);

    return { total, open, inProgress, review, closed, overdue, dueToday };
  }

  async resolve(user, id, body = {}) {
    const doc = await this.Model.findById(id);
    if (!doc) throw new AppError('Ticket not found', 404);
    if (doc.status === 'closed') throw new AppError('Ticket is already closed', 400);

    doc.status = user.role === 'doer' ? 'review' : 'closed';
    if (body.resolutionNotes) doc.resolutionNotes = body.resolutionNotes;
    if (doc.status === 'closed') {
      doc.closedAt = new Date();
      doc.closedBy = user._id;
    }
    if (body.remark) {
      doc.comments.push({
        user: user._id,
        text: body.remark,
        createdAt: new Date(),
      });
    }

    await doc.save();
    return this.Model.findById(id).populate(this.cfg.populate);
  }

  async close(user, id, body = {}) {
    const doc = await this.Model.findById(id);
    if (!doc) throw new AppError('Ticket not found', 404);
    doc.status = 'closed';
    doc.closedAt = new Date();
    doc.closedBy = user._id;
    if (body.resolutionNotes) doc.resolutionNotes = body.resolutionNotes;
    if (body.remark) {
      doc.comments.push({
        user: user._id,
        text: `Ticket closed: ${body.remark}`,
        createdAt: new Date(),
      });
    }
    await doc.save();
    return this.Model.findById(id).populate(this.cfg.populate);
  }

  async reopen(user, id, body = {}) {
    const doc = await this.Model.findById(id);
    if (!doc) throw new AppError('Ticket not found', 404);
    doc.status = 'in_progress';
    if (body.remark) {
      doc.comments.push({
        user: user._id,
        text: `Reopened for review: ${body.remark}`,
        createdAt: new Date(),
      });
    }
    await doc.save();
    return this.Model.findById(id).populate(this.cfg.populate);
  }

  async addComment(user, id, text) {
    if (!text || !text.trim()) throw new AppError('Comment text cannot be empty', 400);
    const doc = await this.Model.findById(id);
    if (!doc) throw new AppError('Ticket not found', 404);

    doc.comments.push({
      user: user._id,
      text: text.trim(),
      createdAt: new Date(),
    });

    await doc.save();
    return this.Model.findById(id).populate(this.cfg.populate);
  }
}

export const ticketService = new TicketService(Ticket, {
  key: 'ticket',
  dateField: 'dueDate',
  doneStatus: 'closed',
  doneField: 'closedAt',
  openStatuses: ['open', 'in_progress', 'review'],
  searchFields: ['ticketNo', 'title', 'description'],
  populate: [
    { path: 'assignedTo', select: 'name email department' },
    { path: 'raisedBy', select: 'name email department' },
    { path: 'comments.user', select: 'name' },
    { path: 'closedBy', select: 'name' },
  ],
});
