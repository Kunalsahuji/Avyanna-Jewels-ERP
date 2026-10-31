import { BaseService } from '../../common/base.service.js';
import { nextSeq } from '../../common/Counter.js';
import { AppError } from '../../utils/AppError.js';
import { Delegation } from './delegation.model.js';

class DelegationService extends BaseService {
  // Assignees can also see tasks they handed out
  scope(user) {
    return user.role === 'doer' ? { $or: [{ assignedTo: user._id }, { assignedBy: user._id }] } : {};
  }

  async buildForCreate(user, data) {
    return [{ ...data, taskId: `TSK-${await nextSeq('delegation')}`, assignedBy: user._id }];
  }

  // A doer finishing someone else's task sends it for approval instead of closing it.
  completionStatus(user, doc) {
    return user.role === 'doer' && String(doc.assignedBy) !== String(user._id) ? 'approval_waiting' : 'completed';
  }

  async approve(id) {
    const doc = await this.Model.findById(id);
    if (!doc) throw new AppError('Not found', 404);
    if (doc.status !== 'approval_waiting') throw new AppError('Nothing to approve on this task', 409);
    doc.status = 'completed';
    doc.completedAt = new Date();
    return doc.save();
  }

  async sendBack(id, remark) {
    const doc = await this.Model.findById(id);
    if (!doc) throw new AppError('Not found', 404);
    if (doc.status !== 'approval_waiting') throw new AppError('Nothing to send back on this task', 409);
    doc.status = 'pending';
    doc.revisions += 1;
    if (remark) doc.remark = remark;
    return doc.save();
  }
}

export const delegationService = new DelegationService(Delegation, {
  key: 'delegation',
  dateField: 'dueDate',
  doneStatus: 'completed',
  doneField: 'completedAt',
  openStatuses: ['pending', 'approval_waiting'],
  searchFields: ['taskId', 'description'],
  populate: [
    { path: 'assignedTo', select: 'name email department' },
    { path: 'assignedBy', select: 'name' },
  ],
});
