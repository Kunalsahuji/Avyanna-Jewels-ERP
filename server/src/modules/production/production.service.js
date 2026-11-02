import { BaseService } from '../../common/base.service.js';
import { nextSeq } from '../../common/Counter.js';
import { AppError } from '../../utils/AppError.js';
import { ProductionJob, PRODUCTION_STAGES } from './production.model.js';

class ProductionService extends BaseService {
  scope(user) {
    // If doer is a karigar, they see jobs assigned to them or unassigned in production
    return user.role === 'doer' && user.department === 'Production'
      ? { $or: [{ assignedKarigar: user._id }, { status: 'in_progress' }] }
      : {};
  }

  async buildForCreate(user, data) {
    const seq = await nextSeq('production_job', 6);
    const jobNo = `JOB-${seq}`;

    const initialWeight = Number(data.initialGoldWeight) || 0;
    const currentWeight = Number(data.currentGoldWeight) || initialWeight;
    const firstStage = data.currentStage || 'cad_design';
    const stageIdx = PRODUCTION_STAGES.indexOf(firstStage);

    const initialStageHistory = [
      {
        stage: firstStage,
        karigar: data.assignedKarigar || null,
        startedAt: new Date(),
        issuedWeight: initialWeight,
        notes: data.notes || 'Job order opened and scheduled for CAD design.',
      },
    ];

    return [
      {
        ...data,
        jobNo,
        initialGoldWeight: initialWeight,
        currentGoldWeight: currentWeight,
        totalGoldLoss: 0,
        stageIndex: stageIdx >= 0 ? stageIdx : 0,
        totalDiamondsPieces: Number(data.totalDiamondsPieces) || 0,
        totalDiamondsCarat: Number(data.totalDiamondsCarat) || 0,
        createdBy: user._id,
        stageHistory: initialStageHistory,
      },
    ];
  }

  async stats(user, q = {}) {
    const scope = { ...this.scope(user) };
    if (q.category) scope.category = q.category;
    if (q.purity) scope.purity = q.purity;

    const [
      totalJobs,
      inCasting,
      inSetting,
      inQc,
      completed,
      rushOrders,
      activeAgg,
    ] = await Promise.all([
      this.Model.countDocuments(scope),
      this.Model.countDocuments({ ...scope, currentStage: { $in: ['cad_design', 'casting'] } }),
      this.Model.countDocuments({ ...scope, currentStage: { $in: ['filing_grinding', 'diamond_setting'] } }),
      this.Model.countDocuments({ ...scope, currentStage: { $in: ['polishing_rhodium', 'quality_qc'] } }),
      this.Model.countDocuments({ ...scope, currentStage: 'completed' }),
      this.Model.countDocuments({ ...scope, priority: 'rush_urgent', currentStage: { $ne: 'completed' } }),
      this.Model.aggregate([
        { $match: { ...scope, currentStage: { $ne: 'completed' } } },
        {
          $group: {
            _id: null,
            totalGold: { $sum: '$currentGoldWeight' },
            totalDiamonds: { $sum: '$totalDiamondsCarat' },
            totalLoss: { $sum: '$totalGoldLoss' },
          },
        },
      ]),
    ]);

    const activeMetrics = activeAgg[0] || {
      totalGold: 0,
      totalDiamonds: 0,
      totalLoss: 0,
    };

    return {
      totalJobs,
      inCasting,
      inSetting,
      inQc,
      completed,
      rushOrders,
      totalGoldInProcess: Number(activeMetrics.totalGold.toFixed(2)),
      totalDiamondsInProcess: Number(activeMetrics.totalDiamonds.toFixed(2)),
      totalGoldLoss: Number(activeMetrics.totalLoss.toFixed(3)),
    };
  }

  async advanceStage(user, id, body = {}) {
    const doc = await this.Model.findById(id);
    if (!doc) throw new AppError('Production job not found', 404);
    if (doc.currentStage === 'completed') throw new AppError('Job is already completed', 400);

    const nextStage = body.nextStage;
    if (!nextStage || !PRODUCTION_STAGES.includes(nextStage)) {
      throw new AppError('Valid next production stage is required', 400);
    }

    // 1. Close current stage in history
    const currentHist = doc.stageHistory[doc.stageHistory.length - 1];
    const prevWeight = doc.currentGoldWeight;
    let returned = body.returnedWeight !== undefined && body.returnedWeight !== null
      ? Number(body.returnedWeight)
      : prevWeight;
    const stageLoss = Number(Math.max(0, prevWeight - returned).toFixed(3));
    const lossPct = prevWeight > 0 ? Number(((stageLoss / prevWeight) * 100).toFixed(2)) : 0;

    if (currentHist) {
      currentHist.completedAt = new Date();
      currentHist.returnedWeight = returned;
      currentHist.metalLoss = stageLoss;
      currentHist.lossPct = lossPct;
      if (body.notes) currentHist.notes = (currentHist.notes ? currentHist.notes + ' | ' : '') + body.notes;
    }

    // 2. Update Job level weights and stages
    doc.currentGoldWeight = returned;
    doc.totalGoldLoss = Number((doc.totalGoldLoss + stageLoss).toFixed(3));
    doc.currentStage = nextStage;
    doc.stageIndex = PRODUCTION_STAGES.indexOf(nextStage);

    if (body.karigarId) {
      doc.assignedKarigar = body.karigarId;
    }

    if (nextStage === 'completed') {
      doc.status = 'completed';
      doc.completedAt = new Date();
      doc.assignedKarigar = null;
    } else {
      // 3. Open next stage in history
      doc.stageHistory.push({
        stage: nextStage,
        karigar: doc.assignedKarigar,
        startedAt: new Date(),
        issuedWeight: returned,
        notes: body.notes || `Advanced to stage ${nextStage}.`,
      });
    }

    await doc.save();
    return this.Model.findById(id).populate(this.cfg.populate);
  }

  async qcInspect(user, id, body = {}) {
    const doc = await this.Model.findById(id);
    if (!doc) throw new AppError('Production job not found', 404);

    const currentHist = doc.stageHistory[doc.stageHistory.length - 1];
    if (body.huidCode) {
      doc.huid = body.huidCode.toUpperCase().trim();
      if (currentHist) currentHist.huidCode = doc.huid;
    }

    if (currentHist) {
      currentHist.passedQc = body.passed !== false;
      currentHist.notes = body.findings || (body.passed !== false ? 'Quality check passed with flying colors.' : 'Quality check defects flagged.');
    }

    if (body.passed !== false) {
      // Automatically advance to completed if at quality_qc
      if (doc.currentStage === 'quality_qc') {
        return this.advanceStage(user, id, {
          nextStage: 'completed',
          returnedWeight: doc.currentGoldWeight,
          notes: `Hallmarking HUID ${doc.huid || 'verified'}. Quality inspection approved.`,
        });
      }
    } else {
      doc.status = 'on_hold';
    }

    await doc.save();
    return this.Model.findById(id).populate(this.cfg.populate);
  }
}

export const productionService = new ProductionService(ProductionJob, {
  key: 'production_job',
  dateField: 'dueDate',
  doneStatus: 'completed',
  doneField: 'completedAt',
  openStatuses: ['in_progress', 'pending', 'on_hold'],
  searchFields: ['jobNo', 'designCode', 'title', 'clientOrderNo', 'huid'],
  populate: [
    { path: 'assignedKarigar', select: 'name email department' },
    { path: 'createdBy', select: 'name email' },
    { path: 'stageHistory.karigar', select: 'name department' },
  ],
});
