import { BaseService } from '../../common/base.service.js';
import { nextSeq } from '../../common/Counter.js';
import { AppError } from '../../utils/AppError.js';
import { Stock } from './stock.model.js';

class StockService extends BaseService {
  scope(user) {
    // If doer is a karigar, they see items assigned to them or company-wide stock if permitted
    return user.role === 'doer' && user.department === 'Production'
      ? { $or: [{ assignedTo: user._id }, { location: 'Karigar Workshop' }] }
      : {};
  } 

  async buildForCreate(user, data) {
    const seq = await nextSeq('parcel', 6);
    const parcelId = `PRC-${seq}`;
    const barcode = `TJ-STK-${seq}`;

    const gross = Number(data.grossWeight) || 0;
    const net = Number(data.netWeight) || gross;

    const initialHistory = [
      {
        action: 'CREATED',
        fromLocation: 'Intake / Inward',
        toLocation: data.location || 'Main Vault',
        user: user._id,
        remarks: 'Parcel registered and barcoded into stock vault.',
        weightAtAction: net,
        timestamp: new Date(),
      },
    ];

    return [
      {
        ...data,
        parcelId,
        barcode,
        grossWeight: gross,
        netWeight: net,
        diamondCarat: Number(data.diamondCarat) || 0,
        stonePieces: Number(data.stonePieces) || 0,
        valuation: Number(data.valuation) || 0,
        createdBy: user._id,
        history: initialHistory,
      },
    ];
  }

  async stats(user, q = {}) {
    const scope = { ...this.scope(user) };
    if (q.location) scope.location = q.location;
    if (q.itemType) scope.itemType = q.itemType;
    if (q.purity) scope.purity = q.purity;

    const [
      totalParcels,
      inVault,
      inWorkshop,
      inTransit,
      sold,
      weightAgg,
    ] = await Promise.all([
      this.Model.countDocuments(scope),
      this.Model.countDocuments({ ...scope, status: 'in_stock' }),
      this.Model.countDocuments({ ...scope, status: 'issued_to_karigar' }),
      this.Model.countDocuments({ ...scope, status: 'in_transit' }),
      this.Model.countDocuments({ ...scope, status: 'sold' }),
      this.Model.aggregate([
        { $match: scope },
        {
          $group: {
            _id: null,
            totalGrossWeight: { $sum: '$grossWeight' },
            totalNetWeight: { $sum: '$netWeight' },
            totalDiamondCarats: { $sum: '$diamondCarat' },
            totalValuation: { $sum: '$valuation' },
          },
        },
      ]),
    ]);

    const weights = weightAgg[0] || {
      totalGrossWeight: 0,
      totalNetWeight: 0,
      totalDiamondCarats: 0,
      totalValuation: 0,
    };

    return {
      totalParcels,
      inVault,
      inWorkshop,
      inTransit,
      sold,
      totalGrossWeight: Number(weights.totalGrossWeight.toFixed(2)),
      totalNetWeight: Number(weights.totalNetWeight.toFixed(2)),
      totalDiamondCarats: Number(weights.totalDiamondCarats.toFixed(2)),
      totalValuation: Math.round(weights.totalValuation),
    };
  }

  async transferLocation(user, id, { toLocation, remarks }) {
    if (!toLocation) throw new AppError('Destination location is required', 400);
    const doc = await this.Model.findById(id);
    if (!doc) throw new AppError('Stock parcel not found', 404);

    const fromLocation = doc.location;
    doc.location = toLocation;
    doc.status = toLocation === 'In Transit' ? 'in_transit' : 'in_stock';

    doc.history.push({
      action: 'LOCATION_TRANSFER',
      fromLocation,
      toLocation,
      user: user._id,
      remarks: remarks || `Transferred from ${fromLocation} to ${toLocation}`,
      weightAtAction: doc.netWeight,
      timestamp: new Date(),
    });

    await doc.save();
    return this.Model.findById(id).populate(this.cfg.populate);
  }

  async issueToKarigar(user, id, { karigarId, remarks }) {
    if (!karigarId) throw new AppError('Karigar selection is required', 400);
    const doc = await this.Model.findById(id);
    if (!doc) throw new AppError('Stock parcel not found', 404);

    const fromLocation = doc.location;
    doc.location = 'Karigar Workshop';
    doc.status = 'issued_to_karigar';
    doc.assignedTo = karigarId;

    doc.history.push({
      action: 'ISSUED_TO_KARIGAR',
      fromLocation,
      toLocation: 'Karigar Workshop',
      user: user._id,
      remarks: remarks || `Issued to Karigar for setting/filing.`,
      weightAtAction: doc.netWeight,
      timestamp: new Date(),
    });

    await doc.save();
    return this.Model.findById(id).populate(this.cfg.populate);
  }

  async returnToVault(user, id, { returnedWeight, remarks }) {
    const doc = await this.Model.findById(id);
    if (!doc) throw new AppError('Stock parcel not found', 404);

    const prevNet = doc.netWeight;
    const finalNet = returnedWeight !== undefined && returnedWeight !== null ? Number(returnedWeight) : prevNet;
    const loss = Number((prevNet - finalNet).toFixed(3));

    const fromLocation = doc.location;
    doc.location = 'Main Vault';
    doc.status = 'in_stock';
    doc.assignedTo = null;
    doc.netWeight = finalNet;

    doc.history.push({
      action: 'RETURNED_TO_VAULT',
      fromLocation,
      toLocation: 'Main Vault',
      user: user._id,
      remarks: remarks || (loss > 0 ? `Returned to vault with ${loss}g metal loss.` : `Returned intact to vault.`),
      weightAtAction: finalNet,
      timestamp: new Date(),
    });

    await doc.save();
    return this.Model.findById(id).populate(this.cfg.populate);
  }
}

export const stockService = new StockService(Stock, {
  key: 'stock',
  dateField: 'createdAt',
  doneStatus: 'sold',
  doneField: 'updatedAt',
  openStatuses: ['in_stock', 'issued_to_karigar', 'transfer_pending', 'in_transit'],
  searchFields: ['parcelId', 'barcode', 'title', 'description', 'huid'],
  populate: [
    { path: 'assignedTo', select: 'name email department' },
    { path: 'createdBy', select: 'name email' },
    { path: 'history.user', select: 'name' },
  ],
});
