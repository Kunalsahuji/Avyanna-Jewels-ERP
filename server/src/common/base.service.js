import { AppError } from '../utils/AppError.js';
import { startOfDay, endOfDay } from '../utils/dates.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Shared behaviour for every "work item" module (delegation, checklist, tickets).
 * A module supplies a config describing which fields play which role, and can
 * override hooks (buildForCreate, scope, completionStatus) for module-specific rules.
 */
export class BaseService {
  constructor(Model, cfg) {
    this.Model = Model;
    this.cfg = {
      key: 'item',
      dateField: 'dueDate',
      doneStatus: 'completed',
      doneField: 'completedAt',
      openStatuses: ['pending'],
      assigneeField: 'assignedTo',
      searchFields: [],
      populate: [{ path: 'assignedTo', select: 'name email department' }],
      ...cfg,
    };
  }

  // Doers only see their own work; admins/managers see everything.
  scope(user) {
    return user.role === 'doer' ? { [this.cfg.assigneeField]: user._id } : {};
  }

  async list(user, q) {
    const { dateField, openStatuses, searchFields, populate } = this.cfg;
    const page = Math.max(Number(q.page) || 1, 1);
    const limit = Math.min(Number(q.limit) || 20, 100);
    const and = [this.scope(user)];

    if (q.status) and.push({ status: q.status });
    if (q.category) and.push({ category: q.category });
    if (q.assignedTo && user.role !== 'doer') and.push({ [this.cfg.assigneeField]: q.assignedTo });
    if (q.overdue === 'true') and.push({ status: { $in: openStatuses }, [dateField]: { $lt: startOfDay() } });
    if (q.from || q.to) {
      and.push({
        [dateField]: {
          ...(q.from && { $gte: startOfDay(q.from) }),
          ...(q.to && { $lte: endOfDay(q.to) }),
        },
      });
    }
    if (q.search && searchFields.length) {
      and.push({ $or: searchFields.map((f) => ({ [f]: { $regex: escapeRegex(q.search), $options: 'i' } })) });
    }

    const filter = { $and: and };
    const [items, total] = await Promise.all([
      this.Model.find(filter).sort({ [dateField]: -1 }).skip((page - 1) * limit).limit(limit).populate(populate).lean(),
      this.Model.countDocuments(filter),
    ]);
    return { items, page, limit, total, pages: Math.ceil(total / limit) };
  }

  async stats(user, q = {}) {
    const { dateField, openStatuses, doneStatus } = this.cfg;
    const scope = { ...this.scope(user) };
    if (q.category) scope.category = q.category;
    if (q.assignedTo && user.role !== 'doer') scope[this.cfg.assigneeField] = q.assignedTo;
    const [total, pending, completed, overdue, dueToday] = await Promise.all([
      this.Model.countDocuments(scope),
      this.Model.countDocuments({ ...scope, status: { $in: openStatuses } }),
      this.Model.countDocuments({ ...scope, status: doneStatus }),
      this.Model.countDocuments({ ...scope, status: { $in: openStatuses }, [dateField]: { $lt: startOfDay() } }),
      this.Model.countDocuments({ ...scope, status: { $in: openStatuses }, [dateField]: { $gte: startOfDay(), $lte: endOfDay() } }),
    ]);
    return { total, pending, completed, overdue, dueToday };
  }

  async getOwned(user, id) {
    const doc = await this.Model.findOne({ _id: id, ...this.scope(user) });
    if (!doc) throw new AppError('Not found', 404);
    return doc;
  }

  // Hook: return the payload(s) to insert. Override to generate IDs, expand recurrence, etc.
  async buildForCreate(user, data) {
    return [data];
  }

  async create(user, data) {
    const payloads = await this.buildForCreate(user, data);
    const docs = await this.Model.insertMany(payloads);
    return docs.length === 1 ? docs[0] : { created: docs.length };
  }

  async update(user, id, data) {
    const doc = await this.Model.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(this.cfg.populate);
    if (!doc) throw new AppError('Not found', 404);
    return doc;
  }

  // Hook: which status a completion results in. Override for approval flows.
  completionStatus() {
    return this.cfg.doneStatus;
  }

  async complete(user, id, body = {}) {
    const { openStatuses, doneField } = this.cfg;
    const doc = await this.getOwned(user, id);
    if (!openStatuses.includes(doc.status)) throw new AppError(`Already ${doc.status.replace('_', ' ')}`, 409);
    doc.status = this.completionStatus(user, doc);
    if (doc.status === this.cfg.doneStatus) doc[doneField] = new Date();
    if (body.remark) doc.remark = body.remark;
    await doc.save();
    return doc;
  }

  async remove(id) {
    const doc = await this.Model.findByIdAndDelete(id);
    if (!doc) throw new AppError('Not found', 404);
  }
}
