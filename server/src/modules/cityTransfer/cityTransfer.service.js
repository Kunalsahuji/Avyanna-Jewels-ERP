import { BaseService } from '../../common/base.service.js';
import { nextSeq } from '../../common/Counter.js';
import { AppError } from '../../utils/AppError.js';
import { CityTransfer } from './cityTransfer.model.js';
import { Stock } from '../stock/stock.model.js';

class CityTransferService extends BaseService {
  scope(user) {
    // Managers & Admins see all; doers see transfers they requested or received
    return user.role === 'doer'
      ? { $or: [{ requestedBy: user._id }, { receivedBy: user._id }] }
      : {};
  }

  async buildForCreate(user, data) {
    const seq = await nextSeq('city_transfer', 6);
    const transferNo = `CTA-${seq}`;

    const parcels = Array.isArray(data.parcels) ? data.parcels : [];
    let gross = Number(data.totalGrossWeight) || 0;
    let net = Number(data.totalNetWeight) || 0;
    let diamond = Number(data.totalDiamondCarat) || 0;
    let val = Number(data.totalValuation) || 0;

    // If parcel items are provided, auto-compute totals
    if (parcels.length > 0) {
      gross = Number(parcels.reduce((sum, p) => sum + (Number(p.grossWeight) || 0), 0).toFixed(2));
      net = Number(parcels.reduce((sum, p) => sum + (Number(p.netWeight) || 0), 0).toFixed(2));
      diamond = Number(parcels.reduce((sum, p) => sum + (Number(p.diamondCarat) || 0), 0).toFixed(2));
      val = Math.round(parcels.reduce((sum, p) => sum + (Number(p.valuation) || 0), 0));
    }

    const initialTimeline = [
      {
        action: 'REQUESTED',
        user: user._id,
        remarks: data.notes || `Inter-branch transfer requested from ${data.fromLocation} to ${data.toLocation}.`,
        timestamp: new Date(),
      },
    ];

    return [
      {
        ...data,
        transferNo,
        parcels,
        totalGrossWeight: gross,
        totalNetWeight: net,
        totalDiamondCarat: diamond,
        totalValuation: val,
        requestedBy: user._id,
        timeline: initialTimeline,
      },
    ];
  }

  async stats(user, q = {}) {
    const scope = { ...this.scope(user) };
    if (q.fromLocation) scope.fromLocation = q.fromLocation;
    if (q.toLocation) scope.toLocation = q.toLocation;

    const [
      totalTransfers,
      pendingApprovals,
      approved,
      inTransit,
      received,
      inTransitAgg,
    ] = await Promise.all([
      this.Model.countDocuments(scope),
      this.Model.countDocuments({ ...scope, status: 'requested' }),
      this.Model.countDocuments({ ...scope, status: 'approved' }),
      this.Model.countDocuments({ ...scope, status: 'in_transit' }),
      this.Model.countDocuments({ ...scope, status: 'received' }),
      this.Model.aggregate([
        { $match: { ...scope, status: 'in_transit' } },
        {
          $group: {
            _id: null,
            totalValue: { $sum: '$totalValuation' },
            totalGold: { $sum: '$totalNetWeight' },
            totalDiamond: { $sum: '$totalDiamondCarat' },
          },
        },
      ]),
    ]);

    const transitMetrics = inTransitAgg[0] || {
      totalValue: 0,
      totalGold: 0,
      totalDiamond: 0,
    };

    return {
      totalTransfers,
      pendingApprovals,
      approved,
      inTransit,
      received,
      totalInTransitValue: Math.round(transitMetrics.totalValue),
      totalInTransitGold: Number(transitMetrics.totalGold.toFixed(2)),
      totalInTransitDiamond: Number(transitMetrics.totalDiamond.toFixed(2)),
    };
  }

  async approveTransfer(user, id, { remarks }) {
    const doc = await this.Model.findById(id);
    if (!doc) throw new AppError('City transfer request not found', 404);
    if (doc.status !== 'requested') throw new AppError('Transfer is already processed or approved', 400);

    const passSeq = await nextSeq('gate_pass', 5);
    const gatePassNo = `GP-${new Date().getFullYear()}-${passSeq}`;

    doc.status = 'approved';
    doc.gatePassNo = gatePassNo;
    doc.approvedBy = user._id;
    doc.approvedAt = new Date();

    doc.timeline.push({
      action: 'APPROVED',
      user: user._id,
      gatePassNo,
      remarks: remarks || `Digital Gate Pass ${gatePassNo} generated and signed off by ${user.name}.`,
      timestamp: new Date(),
    });

    await doc.save();
    return this.Model.findById(id).populate(this.cfg.populate);
  }

  async dispatchTransfer(user, id, body = {}) {
    const doc = await this.Model.findById(id);
    if (!doc) throw new AppError('City transfer not found', 404);
    if (doc.status !== 'approved') throw new AppError('Transfer must be approved before armored dispatch', 400);

    doc.status = 'in_transit';
    doc.dispatchedAt = new Date();
    if (body.carrierType) doc.carrierType = body.carrierType;
    if (body.carrierPersonName) doc.carrierPersonName = body.carrierPersonName;
    if (body.carrierContact) doc.carrierContact = body.carrierContact;
    if (body.waybillNo) doc.waybillNo = body.waybillNo;
    if (body.vehicleNo) doc.vehicleNo = body.vehicleNo;

    doc.timeline.push({
      action: 'DISPATCHED',
      user: user._id,
      gatePassNo: doc.gatePassNo,
      remarks:
        body.remarks ||
        `Handed over to ${doc.carrierType} (${doc.carrierPersonName || 'Courier Agent'}). Air Waybill: ${doc.waybillNo || 'N/A'}.`,
      timestamp: new Date(),
    });

    // Update status of any linked stock parcels
    if (doc.parcels?.length > 0) {
      const parcelIds = doc.parcels.map((p) => p.parcelId);
      await Stock.updateMany(
        { parcelId: { $in: parcelIds } },
        { location: 'In Transit', status: 'in_transit' }
      );
    }

    await doc.save();
    return this.Model.findById(id).populate(this.cfg.populate);
  }

  async receiveTransfer(user, id, body = {}) {
    const doc = await this.Model.findById(id);
    if (!doc) throw new AppError('City transfer not found', 404);
    if (doc.status !== 'in_transit') throw new AppError('Transfer is not marked as in transit', 400);

    const weighed = Number(body.weighedReturnGrossWeight) || doc.totalGrossWeight;
    const variance = Number((doc.totalGrossWeight - weighed).toFixed(3));

    doc.status = 'received';
    doc.receivedAt = new Date();
    doc.receivedBy = user._id;
    doc.weighedReturnGrossWeight = weighed;
    doc.weightVariance = variance;

    const varianceNotice =
      variance !== 0
        ? ` Weighed arrival: ${weighed}g (Variance: ${variance > 0 ? `-${variance}g loss` : `+${Math.abs(variance)}g`}).`
        : ` Weighed arrival: ${weighed}g (Exact 100% weight match).`;

    doc.timeline.push({
      action: 'RECEIVED',
      user: user._id,
      gatePassNo: doc.gatePassNo,
      remarks:
        (body.remarks || `Safely received into destination vault at ${doc.toLocation}.`) + varianceNotice,
      timestamp: new Date(),
    });

    // Update stock parcels to destination location
    if (doc.parcels?.length > 0) {
      const parcelIds = doc.parcels.map((p) => p.parcelId);
      await Stock.updateMany(
        { parcelId: { $in: parcelIds } },
        { location: doc.toLocation, status: 'in_stock' }
      );
    }

    await doc.save();
    return this.Model.findById(id).populate(this.cfg.populate);
  }

  async rejectTransfer(user, id, { reason }) {
    const doc = await this.Model.findById(id);
    if (!doc) throw new AppError('City transfer not found', 404);

    doc.status = 'rejected';
    doc.timeline.push({
      action: 'REJECTED',
      user: user._id,
      remarks: reason || 'Transfer request rejected by management.',
      timestamp: new Date(),
    });

    await doc.save();
    return this.Model.findById(id).populate(this.cfg.populate);
  }
}

export const cityTransferService = new CityTransferService(CityTransfer, {
  key: 'city_transfer',
  dateField: 'createdAt',
  doneStatus: 'received',
  doneField: 'receivedAt',
  openStatuses: ['requested', 'approved', 'in_transit'],
  searchFields: ['transferNo', 'gatePassNo', 'waybillNo', 'fromLocation', 'toLocation', 'carrierPersonName'],
  populate: [
    { path: 'requestedBy', select: 'name email department' },
    { path: 'approvedBy', select: 'name email department' },
    { path: 'receivedBy', select: 'name email department' },
    { path: 'timeline.user', select: 'name' },
  ],
});
