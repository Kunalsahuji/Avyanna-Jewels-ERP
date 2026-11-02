import { BaseService } from '../../common/base.service.js';
import { PreExhibitionTask } from './preExhibition.model.js';

export class PreExhibitionService extends BaseService {
  constructor() {
    super(PreExhibitionTask, {
      idPrefix: 'PEX',
      searchFields: ['taskCode', 'title', 'exhibitionTitle', 'description', 'proofDocument'],
      populate: [
        { path: 'assignedTo', select: 'name email role department' },
        { path: 'leadSignOff', select: 'name email role department' },
        { path: 'exhibitionId', select: 'eventCode title city venue' },
        { path: 'auditTrail.performedBy', select: 'name email' },
      ],
    });
  }

  async generateTaskCode() {
    const year = new Date().getFullYear();
    const count = await PreExhibitionTask.countDocuments();
    const seq = String(count + 1).padStart(4, '0');
    return `PEX-${year}-${seq}`;
  }

  async create(user, payloads) {
    const arr = Array.isArray(payloads) ? payloads : [payloads];
    const createdDocs = [];

    for (const item of arr) {
      if (!item.taskCode) {
        item.taskCode = await this.generateTaskCode();
      }

      item.assignedTo = item.assignedTo || user?._id || user?.id;

      if (!item.auditTrail) {
        item.auditTrail = [];
      }
      item.auditTrail.push({
        action: 'TASK_CREATED',
        performedBy: user?._id || user?.id,
        performedByName: user?.name || 'Pre-Exhibition Coordinator',
        notes: `Created milestone gate: ${item.title} for ${item.exhibitionTitle}`,
        timestamp: new Date(),
      });

      const doc = await PreExhibitionTask.create(item);
      const populated = await PreExhibitionTask.findById(doc._id).populate(this.cfg.populate);
      createdDocs.push(populated);
    }

    return Array.isArray(payloads) ? createdDocs : createdDocs[0];
  }

  async toggleChecklistItem(user, taskId, { itemIndex, isDone }) {
    const task = await PreExhibitionTask.findById(taskId);
    if (!task) {
      const err = new Error('Pre-exhibition task not found');
      err.status = 404;
      throw err;
    }

    if (!task.checklistItems || !task.checklistItems[itemIndex]) {
      const err = new Error('Checklist sub-item index not found');
      err.status = 404;
      throw err;
    }

    task.checklistItems[itemIndex].isDone = isDone;
    if (isDone) {
      task.checklistItems[itemIndex].completedAt = new Date();
      task.checklistItems[itemIndex].completedBy = user?._id || user?.id;
    } else {
      task.checklistItems[itemIndex].completedAt = null;
      task.checklistItems[itemIndex].completedBy = null;
    }

    // Auto-update task status if all items are done
    const allDone = task.checklistItems.length > 0 && task.checklistItems.every((i) => i.isDone);
    if (allDone && task.status !== 'completed') {
      task.status = 'review_required';
    } else if (!allDone && task.status === 'review_required') {
      task.status = 'in_progress';
    }

    task.auditTrail.push({
      action: 'CHECKLIST_UPDATED',
      performedBy: user?._id || user?.id,
      performedByName: user?.name || 'Staff Member',
      notes: `Sub-item "${task.checklistItems[itemIndex].itemText}" marked as ${isDone ? 'COMPLETED' : 'PENDING'}`,
      timestamp: new Date(),
    });

    await task.save();
    return PreExhibitionTask.findById(task._id).populate(this.cfg.populate);
  }

  async signOffTask(user, taskId, { remarks, proofDocument }) {
    const task = await PreExhibitionTask.findById(taskId);
    if (!task) {
      const err = new Error('Pre-exhibition task not found');
      err.status = 404;
      throw err;
    }

    task.status = 'completed';
    task.leadSignOff = user?._id || user?.id;
    if (remarks) task.remarks = remarks;
    if (proofDocument) task.proofDocument = proofDocument;

    // Mark all checklist items as done
    if (task.checklistItems) {
      for (const i of task.checklistItems) {
        if (!i.isDone) {
          i.isDone = true;
          i.completedAt = new Date();
          i.completedBy = user?._id || user?.id;
        }
      }
    }

    task.auditTrail.push({
      action: 'LEAD_SIGNOFF_COMPLETED',
      performedBy: user?._id || user?.id,
      performedByName: user?.name || 'Exhibition Lead',
      notes: remarks || 'Milestone verified and signed off for exhibition readiness.',
      timestamp: new Date(),
    });

    await task.save();
    return PreExhibitionTask.findById(task._id).populate(this.cfg.populate);
  }

  async getStats() {
    const totalTasks = await PreExhibitionTask.countDocuments();
    const completed = await PreExhibitionTask.countDocuments({ status: 'completed' });
    const inProgress = await PreExhibitionTask.countDocuments({ status: { $in: ['in_progress', 'review_required'] } });
    const pending = await PreExhibitionTask.countDocuments({ status: 'pending' });
    const criticalPending = await PreExhibitionTask.countDocuments({
      priority: 'critical',
      status: { $ne: 'completed' },
    });

    const readinessScore = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

    return {
      totalTasks,
      completed,
      inProgress,
      pending,
      criticalPending,
      readinessScore,
    };
  }
}

export const preExhibitionService = new PreExhibitionService();
