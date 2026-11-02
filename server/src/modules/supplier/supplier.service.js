import { BaseService } from '../../common/base.service.js';
import { SupplierOrder } from './supplier.model.js';

export class SupplierService extends BaseService {
  constructor() {
    super(SupplierOrder, {
      idPrefix: 'PO',
      searchFields: ['orderNumber', 'supplierName', 'description', 'gstin', 'invoiceNumber'],
      populate: [
        { path: 'createdBy', select: 'name email role department' },
        { path: 'assignedInspector', select: 'name email role department' },
        { path: 'approvedBy', select: 'name email role department' },
        { path: 'auditTrail.performedBy', select: 'name email' },
      ],
    });
  }

  async generateOrderNumber() {
    const year = new Date().getFullYear();
    const count = await SupplierOrder.countDocuments();
    const seq = String(count + 1).padStart(5, '0');
    return `PO-${year}-${seq}`;
  }

  async create(user, payloads) {
    const arr = Array.isArray(payloads) ? payloads : [payloads];
    const createdDocs = [];

    for (const item of arr) {
      if (!item.orderNumber) {
        item.orderNumber = await this.generateOrderNumber();
      }

      const qty = Number(item.quantityOrWeight || 0);
      const rate = Number(item.ratePerUnit || 0);
      const subTotal = Number((qty * rate).toFixed(2));
      const taxRate = Number(item.taxRate !== undefined ? item.taxRate : 3);
      const taxAmount = Number(((subTotal * taxRate) / 100).toFixed(2));
      const grandTotal = Number((subTotal + taxAmount).toFixed(2));

      item.subTotal = subTotal;
      item.taxAmount = taxAmount;
      item.grandTotal = grandTotal;
      item.createdBy = user?._id || user?.id;

      if (!item.auditTrail) {
        item.auditTrail = [];
      }
      item.auditTrail.push({
        action: 'CREATED',
        performedBy: user?._id || user?.id,
        performedByName: user?.name || 'Authorized Purchaser',
        notes: `PO Created for ${item.supplierName} - ₹${grandTotal.toLocaleString('en-IN')}`,
        timestamp: new Date(),
      });

      const doc = await SupplierOrder.create(item);
      const populated = await SupplierOrder.findById(doc._id).populate(this.cfg.populate);
      createdDocs.push(populated);
    }

    return Array.isArray(payloads) ? createdDocs : createdDocs[0];
  }

  async receiveAndAssay(user, id, { testedWeight, assayTestedPurity, findings }) {
    const order = await SupplierOrder.findById(id);
    if (!order) {
      const err = new Error('Supplier purchase order not found');
      err.status = 404;
      throw err;
    }

    order.status = 'received_testing';
    order.testedWeight = Number(testedWeight) || order.quantityOrWeight;
    order.assayTestedPurity = assayTestedPurity || order.purity;
    order.assayFindings = findings || 'Lab assay completed within permissible tolerance';
    order.assignedInspector = user?._id || user?.id;

    order.auditTrail.push({
      action: 'ASSAY_VERIFIED',
      performedBy: user?._id || user?.id,
      performedByName: user?.name || 'Assay Specialist',
      notes: `Scale weight: ${order.testedWeight} ${order.unit}, Tested Purity: ${order.assayTestedPurity}. Findings: ${order.assayFindings}`,
      timestamp: new Date(),
    });

    await order.save();
    return SupplierOrder.findById(order._id).populate(this.cfg.populate);
  }

  async approveOrder(user, id, { notes }) {
    const order = await SupplierOrder.findById(id);
    if (!order) {
      const err = new Error('Supplier purchase order not found');
      err.status = 404;
      throw err;
    }

    order.status = 'approved';
    order.approvedBy = user?._id || user?.id;

    order.auditTrail.push({
      action: 'APPROVED_AND_VAULTED',
      performedBy: user?._id || user?.id,
      performedByName: user?.name || 'Purchase Manager',
      notes: notes || 'Verified quality & invoice tally. Transferred to central vault inventory.',
      timestamp: new Date(),
    });

    await order.save();
    return SupplierOrder.findById(order._id).populate(this.cfg.populate);
  }

  async rejectOrder(user, id, { reason }) {
    const order = await SupplierOrder.findById(id);
    if (!order) {
      const err = new Error('Supplier purchase order not found');
      err.status = 404;
      throw err;
    }

    order.status = 'rejected';

    order.auditTrail.push({
      action: 'REJECTED_RETURNED',
      performedBy: user?._id || user?.id,
      performedByName: user?.name || 'QC Manager',
      notes: reason || 'Assay purity failure or weight discrepancy beyond permissible limit.',
      timestamp: new Date(),
    });

    await order.save();
    return SupplierOrder.findById(order._id).populate(this.cfg.populate);
  }

  async getStats() {
    const totalOrders = await SupplierOrder.countDocuments();
    const ordered = await SupplierOrder.countDocuments({ status: 'ordered' });
    const inTransit = await SupplierOrder.countDocuments({ status: 'in_transit' });
    const receivedTesting = await SupplierOrder.countDocuments({ status: 'received_testing' });
    const approved = await SupplierOrder.countDocuments({ status: 'approved' });
    const rejected = await SupplierOrder.countDocuments({ status: 'rejected' });

    // Aggregate totals
    const grandTotals = await SupplierOrder.aggregate([
      {
        $group: {
          _id: null,
          totalSpend: { $sum: '$grandTotal' },
          totalGoldGrams: {
            $sum: {
              $cond: [{ $eq: ['$itemType', 'bullion_gold'] }, '$quantityOrWeight', 0],
            },
          },
          totalDiamondsCarats: {
            $sum: {
              $cond: [{ $eq: ['$itemType', 'loose_diamonds'] }, '$quantityOrWeight', 0],
            },
          },
        },
      },
    ]);

    const stats = grandTotals[0] || {
      totalSpend: 0,
      totalGoldGrams: 0,
      totalDiamondsCarats: 0,
    };

    return {
      totalOrders,
      ordered,
      inTransit,
      receivedTesting,
      approved,
      rejected,
      totalSpend: Math.round(stats.totalSpend),
      totalGoldGrams: Number(stats.totalGoldGrams.toFixed(2)),
      totalDiamondsCarats: Number(stats.totalDiamondsCarats.toFixed(2)),
    };
  }
}

export const supplierService = new SupplierService();
