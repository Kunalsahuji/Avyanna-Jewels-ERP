import { BaseService } from '../../common/base.service.js';
import { Attendance } from './attendance.model.js';
import { User } from '../users/user.model.js';

export class AttendanceService extends BaseService {
  constructor() {
    super(Attendance, {
      searchFields: ['userName', 'department', 'biometricDeviceId', 'remarks'],
      populate: [
        { path: 'userId', select: 'name email role department' },
        { path: 'regularizedBy', select: 'name email role' },
        { path: 'auditTrail.performedBy', select: 'name email' },
      ],
    });
  }

  normalizeDate(d = new Date()) {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  async punchIn(user, { shift = 'general_day', biometricDeviceId = 'BIO-GATE-MAIN-01' }) {
    const today = this.normalizeDate();
    const existing = await Attendance.findOne({ userId: user._id, date: today });
    if (existing && existing.punchIn) {
      const err = new Error('Biometric punch-in already recorded for today');
      err.status = 400;
      throw err;
    }

    const now = new Date();
    // Shift expected start at 09:30 AM
    const expectedStart = new Date(today);
    expectedStart.setHours(9, 30, 0, 0);

    let lateMinutes = 0;
    let status = 'present';
    if (now > expectedStart) {
      lateMinutes = Math.round((now - expectedStart) / (1000 * 60));
      if (lateMinutes > 15) {
        status = 'late';
      }
    }

    const payload = {
      userId: user._id,
      userName: user.name,
      department: user.department || 'General',
      date: today,
      shift,
      punchIn: now,
      status,
      lateMinutes,
      biometricDeviceId,
      auditTrail: [
        {
          action: 'PUNCH_IN',
          performedBy: user._id,
          performedByName: user.name,
          notes: `Biometric punch registered via device ${biometricDeviceId} at ${now.toLocaleTimeString()}`,
          timestamp: now,
        },
      ],
    };

    let doc;
    if (existing) {
      Object.assign(existing, payload);
      doc = await existing.save();
    } else {
      doc = await Attendance.create(payload);
    }

    return Attendance.findById(doc._id).populate(this.cfg.populate);
  }

  async punchOut(user, { vaultClearanceCheck = true, remarks = '' }) {
    const today = this.normalizeDate();
    const record = await Attendance.findOne({ userId: user._id, date: today });
    if (!record || !record.punchIn) {
      const err = new Error('Cannot punch out without prior punch-in today');
      err.status = 400;
      throw err;
    }

    const now = new Date();
    record.punchOut = now;
    record.vaultClearanceCheck = Boolean(vaultClearanceCheck);
    if (remarks) record.remarks = remarks;

    // Calculate work hours
    const diffMs = now - record.punchIn;
    const workHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
    record.workHours = workHours;

    if (workHours > 8.5) {
      record.overtimeHours = Number((workHours - 8.5).toFixed(2));
    } else if (workHours < 4.5) {
      record.status = 'half_day';
    }

    record.auditTrail.push({
      action: 'PUNCH_OUT',
      performedBy: user._id,
      performedByName: user.name,
      notes: `Exit punch recorded. Work: ${workHours} hrs. Body metal detector vault scan: ${vaultClearanceCheck ? 'CLEARED' : 'FLAGGED'}`,
      timestamp: now,
    });

    await record.save();
    return Attendance.findById(record._id).populate(this.cfg.populate);
  }

  async regularize(manager, id, { punchIn, punchOut, status, reason }) {
    const record = await Attendance.findById(id);
    if (!record) {
      const err = new Error('Attendance record not found');
      err.status = 404;
      throw err;
    }

    if (punchIn) record.punchIn = new Date(punchIn);
    if (punchOut) record.punchOut = new Date(punchOut);
    if (status) record.status = status;
    record.regularizedBy = manager._id;
    record.regularizationReason = reason || 'Manager manual regularization';

    if (record.punchIn && record.punchOut) {
      const diffMs = record.punchOut - record.punchIn;
      record.workHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
      record.lateMinutes = 0;
    }

    record.auditTrail.push({
      action: 'REGULARIZED',
      performedBy: manager._id,
      performedByName: manager.name,
      notes: `Attendance regularized by manager: ${reason || 'Approved adjustment'}`,
      timestamp: new Date(),
    });

    await record.save();
    return Attendance.findById(record._id).populate(this.cfg.populate);
  }

  async getStats() {
    const today = this.normalizeDate();
    const totalStaff = await User.countDocuments({ isActive: true });
    const todayRecords = await Attendance.find({ date: today });

    let present = 0;
    let late = 0;
    let onLeave = 0;
    let halfDay = 0;
    let totalOvertime = 0;
    let clearedVault = 0;

    for (const r of todayRecords) {
      if (r.status === 'present') present += 1;
      else if (r.status === 'late') {
        present += 1;
        late += 1;
      } else if (r.status === 'half_day') {
        present += 1;
        halfDay += 1;
      } else if (r.status === 'on_leave') onLeave += 1;

      totalOvertime += r.overtimeHours || 0;
      if (r.vaultClearanceCheck) clearedVault += 1;
    }

    const absent = Math.max(0, totalStaff - (present + onLeave));
    const presenceRate = totalStaff > 0 ? Math.round((present / totalStaff) * 100) : 0;
    const vaultClearancePct = todayRecords.length > 0 ? Math.round((clearedVault / todayRecords.length) * 100) : 100;

    return {
      totalStaff,
      present,
      absent,
      late,
      onLeave,
      halfDay,
      presenceRate,
      totalOvertime: Number(totalOvertime.toFixed(1)),
      vaultClearancePct,
    };
  }
}

export const attendanceService = new AttendanceService();
