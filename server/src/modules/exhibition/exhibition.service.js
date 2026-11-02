import { BaseService } from '../../common/base.service.js';
import { Exhibition } from './exhibition.model.js';

export class ExhibitionService extends BaseService {
  constructor() {
    super(Exhibition, {
      idPrefix: 'EXH',
      searchFields: ['eventCode', 'title', 'city', 'venue', 'boothNumber', 'transitInsurancePolicy'],
      populate: [
        { path: 'leadManager', select: 'name email role department' },
        { path: 'boothStaff', select: 'name email role department' },
        { path: 'auditTrail.performedBy', select: 'name email' },
      ],
    });
  }

  async generateEventCode() {
    const year = new Date().getFullYear();
    const count = await Exhibition.countDocuments();
    const seq = String(count + 1).padStart(3, '0');
    return `EXH-${year}-${seq}`;
  }

  recalculateAllocations(exhibition) {
    let totalVal = 0;
    let totalGrossWt = 0;
    let totalDiaCarats = 0;
    let totalSold = 0;
    let soldAmt = 0;

    for (const item of exhibition.allocatedItems || []) {
      totalVal += Number(item.tagPrice || 0);
      totalGrossWt += Number(item.grossWeight || 0);
      totalDiaCarats += Number(item.diamondWeight || 0);

      if (item.status === 'sold') {
        totalSold += 1;
        soldAmt += Number(item.soldAmount || item.tagPrice || 0);
      }
    }

    exhibition.allocatedStockValue = Math.round(totalVal);
    exhibition.allocatedPieces = (exhibition.allocatedItems || []).length;
    exhibition.allocatedWeight = Number(totalGrossWt.toFixed(2));
    exhibition.allocatedDiamondsCarats = Number(totalDiaCarats.toFixed(2));
    exhibition.totalPiecesSold = totalSold;
    exhibition.totalSalesAchieved = Math.round(soldAmt);
  }

  async create(user, payloads) {
    const arr = Array.isArray(payloads) ? payloads : [payloads];
    const createdDocs = [];

    for (const item of arr) {
      if (!item.eventCode) {
        item.eventCode = await this.generateEventCode();
      }

      item.leadManager = item.leadManager || user?._id || user?.id;

      if (!item.auditTrail) {
        item.auditTrail = [];
      }
      item.auditTrail.push({
        action: 'EVENT_CREATED',
        performedBy: user?._id || user?.id,
        performedByName: user?.name || 'Exhibition Director',
        notes: `Exhibition scheduled: ${item.title} at ${item.venue}, ${item.city}`,
        timestamp: new Date(),
      });

      const doc = new Exhibition(item);
      this.recalculateAllocations(doc);
      await doc.save();

      const populated = await Exhibition.findById(doc._id).populate(this.cfg.populate);
      createdDocs.push(populated);
    }

    return Array.isArray(payloads) ? createdDocs : createdDocs[0];
  }

  async allocateStock(user, id, { items }) {
    const exhibition = await Exhibition.findById(id);
    if (!exhibition) {
      const err = new Error('Exhibition not found');
      err.status = 404;
      throw err;
    }

    if (Array.isArray(items) && items.length > 0) {
      exhibition.allocatedItems.push(...items);
    }

    exhibition.status = 'stock_allocated';
    this.recalculateAllocations(exhibition);

    exhibition.auditTrail.push({
      action: 'STOCK_ALLOCATED',
      performedBy: user?._id || user?.id,
      performedByName: user?.name || 'Inventory Controller',
      notes: `Allocated ${items.length} fine jewelry pieces worth ₹${exhibition.allocatedStockValue.toLocaleString('en-IN')}`,
      timestamp: new Date(),
    });

    await exhibition.save();
    return Exhibition.findById(exhibition._id).populate(this.cfg.populate);
  }

  async recordSale(user, id, { itemId, customerName, saleAmount, invoiceNumber }) {
    const exhibition = await Exhibition.findById(id);
    if (!exhibition) {
      const err = new Error('Exhibition not found');
      err.status = 404;
      throw err;
    }

    const item = exhibition.allocatedItems.id(itemId);
    if (!item) {
      const err = new Error('Showcase item not found in exhibition manifest');
      err.status = 404;
      throw err;
    }

    item.status = 'sold';
    item.soldToCustomer = customerName;
    item.soldAmount = Number(saleAmount) || item.tagPrice;
    item.invoiceNumber = invoiceNumber;
    item.soldAt = new Date();

    this.recalculateAllocations(exhibition);

    exhibition.auditTrail.push({
      action: 'SALE_RECORDED',
      performedBy: user?._id || user?.id,
      performedByName: user?.name || 'Booth Sales Lead',
      notes: `Sold [${item.parcelNumber}] ${item.title} to ${customerName} for ₹${Number(item.soldAmount).toLocaleString('en-IN')}`,
      timestamp: new Date(),
    });

    await exhibition.save();
    return Exhibition.findById(exhibition._id).populate(this.cfg.populate);
  }

  async reconcileAndClose(user, id, { notes }) {
    const exhibition = await Exhibition.findById(id);
    if (!exhibition) {
      const err = new Error('Exhibition not found');
      err.status = 404;
      throw err;
    }

    // Mark all unsold items as returned to vault
    for (const item of exhibition.allocatedItems) {
      if (item.status === 'on_display' || item.status === 'allocated') {
        item.status = 'returned_to_vault';
      }
    }

    exhibition.status = 'closed';
    this.recalculateAllocations(exhibition);

    exhibition.auditTrail.push({
      action: 'RECONCILED_AND_CLOSED',
      performedBy: user?._id || user?.id,
      performedByName: user?.name || 'Audit Manager',
      notes: notes || `Reconciled: ${exhibition.totalPiecesSold} pieces sold (₹${exhibition.totalSalesAchieved.toLocaleString('en-IN')}). Remaining items returned to vault safe.`,
      timestamp: new Date(),
    });

    await exhibition.save();
    return Exhibition.findById(exhibition._id).populate(this.cfg.populate);
  }

  async getStats() {
    const totalExhibitions = await Exhibition.countDocuments();
    const liveNow = await Exhibition.countDocuments({ status: 'live_exhibition' });
    const upcoming = await Exhibition.countDocuments({ status: { $in: ['planning', 'stock_allocated', 'in_transit'] } });
    const closed = await Exhibition.countDocuments({ status: 'closed' });

    const totals = await Exhibition.aggregate([
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalSalesAchieved' },
          totalAllocatedValue: { $sum: '$allocatedStockValue' },
          totalPiecesSold: { $sum: '$totalPiecesSold' },
          totalGrossGoldWeight: { $sum: '$allocatedWeight' },
          totalSalesTarget: { $sum: '$salesTarget' },
        },
      },
    ]);

    const agg = totals[0] || {
      totalSales: 0,
      totalAllocatedValue: 0,
      totalPiecesSold: 0,
      totalGrossGoldWeight: 0,
      totalSalesTarget: 0,
    };

    const targetProgress = agg.totalSalesTarget > 0 ? Number(((agg.totalSales / agg.totalSalesTarget) * 100).toFixed(1)) : 0;

    return {
      totalExhibitions,
      liveNow,
      upcoming,
      closed,
      totalSales: Math.round(agg.totalSales),
      totalAllocatedValue: Math.round(agg.totalAllocatedValue),
      totalPiecesSold: agg.totalPiecesSold,
      totalGrossGoldWeight: Number(agg.totalGrossGoldWeight.toFixed(2)),
      totalSalesTarget: Math.round(agg.totalSalesTarget),
      targetProgress,
    };
  }
}

export const exhibitionService = new ExhibitionService();
