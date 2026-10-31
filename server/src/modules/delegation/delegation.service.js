import { BaseService } from '../../common/base.service.js';
import { nextSeq } from '../../common/Counter.js';
import { AppError } from '../../utils/AppError.js';
import { startOfDay, endOfDay } from '../../utils/dates.js';
import { Delegation } from './delegation.model.js';

class DelegationService extends BaseService {
  // Assignees can also see tasks they handed out
  scope(user) {
    return user.role === 'doer' ? { $or: [{ assignedTo: user._id }, { assignedBy: user._id }] } : {};
  }

  async buildForCreate(user, data) {
    const seq = await nextSeq('delegation', 6);
    return [
      {
        ...data,
        taskId: `TSK-${seq}`,
        assignedBy: user._id,
        originalDueDate: data.dueDate,
      },
    ];
  }

  async stats(user, q = {}) {
    const scope = { ...this.scope(user) };
    if (q.assignedTo && user.role !== 'doer') scope.assignedTo = q.assignedTo;

    const [total, pending, approvalWaiting, completed, shifted, overdue, dueToday] = await Promise.all([
      this.Model.countDocuments(scope),
      this.Model.countDocuments({ ...scope, status: 'pending' }),
      this.Model.countDocuments({ ...scope, status: 'approval_waiting' }),
      this.Model.countDocuments({ ...scope, status: 'completed' }),
      this.Model.countDocuments({ ...scope, status: 'shifted' }),
      this.Model.countDocuments({
        ...scope,
        status: { $in: ['pending', 'approval_waiting', 'shifted'] },
        dueDate: { $lt: startOfDay() },
      }),
      this.Model.countDocuments({
        ...scope,
        status: { $in: ['pending', 'approval_waiting', 'shifted'] },
        dueDate: { $gte: startOfDay(), $lte: endOfDay() },
      }),
    ]);

    return { total, pending, approvalWaiting, completed, shifted, overdue, dueToday };
  }

  // A doer finishing someone else's task sends it for approval instead of closing it.
  completionStatus(user, doc) {
    return user.role === 'doer' && String(doc.assignedBy) !== String(user._id)
      ? 'approval_waiting'
      : 'completed';
  }

  async approve(id) {
    const doc = await this.Model.findById(id);
    if (!doc) throw new AppError('Delegation not found', 404);
    if (doc.status !== 'approval_waiting') throw new AppError('Nothing to approve on this task', 409);
    doc.status = 'completed';
    doc.completedAt = new Date();
    await doc.save();
    return this.Model.findById(id).populate(this.cfg.populate);
  }

  async sendBack(id, remark) {
    const doc = await this.Model.findById(id);
    if (!doc) throw new AppError('Delegation not found', 404);
    if (doc.status !== 'approval_waiting') throw new AppError('Nothing to send back on this task', 409);
    doc.status = 'pending';
    doc.revisions += 1;
    if (remark) {
      doc.remark = remark;
      doc.remarks.push({ user: doc.assignedBy, text: `Sent back: ${remark}`, createdAt: new Date() });
    }
    await doc.save();
    return this.Model.findById(id).populate(this.cfg.populate);
  }

  async shiftDate(user, id, { newDate, reason }) {
    if (!newDate || !reason) throw new AppError('New date and shift reason are required', 400);
    const doc = await this.Model.findById(id);
    if (!doc) throw new AppError('Delegation not found', 404);

    const prev = doc.dueDate;
    doc.dueDate = new Date(newDate);
    doc.status = 'shifted';
    doc.revisions += 1;
    doc.shiftHistory.push({
      previousDate: prev,
      newDate: doc.dueDate,
      reason,
      shiftedBy: user._id,
      createdAt: new Date(),
    });

    await doc.save();
    return this.Model.findById(id).populate(this.cfg.populate);
  }

  async addRemark(user, id, body) {
    const text = typeof body === 'string' ? body : body.text;
    const remarkType = typeof body === 'object' && body.remarkType ? body.remarkType : 'Follow-Up (MD)';
    const newStatus = typeof body === 'object' ? body.status : undefined;

    if (!text || !text.trim()) throw new AppError('Remark text cannot be empty', 400);
    const doc = await this.Model.findById(id);
    if (!doc) throw new AppError('Delegation not found', 404);

    const oldStatus = doc.status;
    let statusChange;
    if (newStatus && newStatus !== oldStatus) {
      doc.status = newStatus;
      statusChange = `Status changed to ${newStatus}`;
      if (newStatus === 'completed' && !doc.completedAt) {
        doc.completedAt = new Date();
      } else if (newStatus !== 'completed') {
        doc.completedAt = undefined;
      }
    }

    doc.remarks.push({
      user: user._id,
      type: remarkType,
      text: text.trim(),
      statusChange,
      createdAt: new Date(),
    });
    doc.remark = text.trim();

    await doc.save();
    return this.Model.findById(id).populate(this.cfg.populate);
  }
}

export const delegationService = new DelegationService(Delegation, {
  key: 'delegation',
  dateField: 'dueDate',
  doneStatus: 'completed',
  doneField: 'completedAt',
  openStatuses: ['pending', 'approval_waiting', 'shifted'],
  searchFields: ['taskId', 'description'],
  populate: [
    { path: 'assignedTo', select: 'name email department' },
    { path: 'assignedBy', select: 'name email department' },
    { path: 'remarks.user', select: 'name' },
    { path: 'shiftHistory.shiftedBy', select: 'name' },
  ],
});
