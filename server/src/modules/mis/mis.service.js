import { BaseService } from '../../common/base.service.js';
import { MisScore } from './mis.model.js';

export class MisService extends BaseService {
  constructor() {
    super(MisScore, {
      searchFields: ['userName', 'department', 'role', 'period', 'appraisalNotes'],
      populate: [
        { path: 'userId', select: 'name email role department' },
        { path: 'evaluatedBy', select: 'name email role department' },
        { path: 'auditTrail.performedBy', select: 'name email' },
      ],
    });
  }

  calculateGrade(compositeScore) {
    if (compositeScore >= 90) return { grade: 'A+', band: 'exceptional' };
    if (compositeScore >= 80) return { grade: 'A', band: 'exceeds_expectations' };
    if (compositeScore >= 70) return { grade: 'B', band: 'meets_expectations' };
    if (compositeScore >= 60) return { grade: 'C', band: 'needs_improvement' };
    return { grade: 'D', band: 'critical_attention' };
  }

  computeComposite(kpis) {
    let totalWeighted = 0;
    for (const kpi of kpis) {
      const weight = Number(kpi.weightPct || 0);
      const score = Number(kpi.score || 0);
      const weightedScore = Number(((score * weight) / 100).toFixed(2));
      kpi.weightedScore = weightedScore;
      totalWeighted += weightedScore;
    }
    return Number(totalWeighted.toFixed(1));
  }

  async create(user, payloads) {
    const arr = Array.isArray(payloads) ? payloads : [payloads];
    const createdDocs = [];

    for (const item of arr) {
      if (!item.period) {
        const d = new Date();
        item.period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }

      if (Array.isArray(item.kpis)) {
        item.compositeScore = this.computeComposite(item.kpis);
      }

      const { grade, band } = this.calculateGrade(item.compositeScore || 75);
      item.grade = item.grade || grade;
      item.performanceBand = item.performanceBand || band;
      item.evaluatedBy = item.evaluatedBy || user?._id || user?.id;

      if (!item.auditTrail) {
        item.auditTrail = [];
      }
      item.auditTrail.push({
        action: 'EVALUATION_CREATED',
        performedBy: user?._id || user?.id,
        performedByName: user?.name || 'Evaluator',
        notes: `MIS score computed: ${item.compositeScore}/100 (Grade ${item.grade}) for ${item.userName}`,
        timestamp: new Date(),
      });

      const doc = await MisScore.create(item);
      const populated = await MisScore.findById(doc._id).populate(this.cfg.populate);
      createdDocs.push(populated);
    }

    return Array.isArray(payloads) ? createdDocs : createdDocs[0];
  }

  async approveScore(user, id, { remarks }) {
    const record = await MisScore.findById(id);
    if (!record) {
      const err = new Error('MIS performance score record not found');
      err.status = 404;
      throw err;
    }

    record.signOffStatus = 'approved';
    if (remarks) record.appraisalNotes = remarks;

    record.auditTrail.push({
      action: 'EXECUTIVE_APPROVED',
      performedBy: user?._id || user?.id,
      performedByName: user?.name || 'Executive Director',
      notes: remarks || 'MIS evaluation finalized and approved for performance incentive tally.',
      timestamp: new Date(),
    });

    await record.save();
    return MisScore.findById(record._id).populate(this.cfg.populate);
  }

  async getStats(query = {}) {
    const period = query.period || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const scores = await MisScore.find({ period });

    let totalScore = 0;
    let gradeAPlus = 0;
    let gradeA = 0;
    let needsImprovement = 0;
    const deptTotals = {};

    for (const s of scores) {
      totalScore += s.compositeScore || 0;
      if (s.grade === 'A+') gradeAPlus += 1;
      else if (s.grade === 'A') gradeA += 1;
      else if (s.grade === 'C' || s.grade === 'D') needsImprovement += 1;

      const d = s.department || 'General';
      if (!deptTotals[d]) deptTotals[d] = { count: 0, sum: 0 };
      deptTotals[d].count += 1;
      deptTotals[d].sum += s.compositeScore || 0;
    }

    const averageScore = scores.length > 0 ? Number((totalScore / scores.length).toFixed(1)) : 0;

    let topDept = 'Management';
    let topDeptAvg = 0;
    for (const [dept, v] of Object.entries(deptTotals)) {
      const avg = v.sum / v.count;
      if (avg > topDeptAvg) {
        topDeptAvg = avg;
        topDept = dept;
      }
    }

    return {
      period,
      totalEvaluations: scores.length,
      averageScore,
      gradeAPlus,
      gradeA,
      needsImprovement,
      topDepartment: topDept,
      topDepartmentScore: Number(topDeptAvg.toFixed(1)),
      incentiveEligible: gradeAPlus + gradeA,
    };
  }
}

export const misService = new MisService();
