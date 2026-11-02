import { BaseService } from '../../common/base.service.js';
import { MasterItem } from './masters.model.js';

export class MastersService extends BaseService {
  constructor() {
    super(MasterItem, {
      searchFields: ['code', 'name', 'description', 'category'],
      populate: [
        { path: 'createdBy', select: 'name email role department' },
        { path: 'auditTrail.performedBy', select: 'name email' },
      ],
    });
  }

  async create(user, payloads) {
    const arr = Array.isArray(payloads) ? payloads : [payloads];
    const createdDocs = [];

    for (const item of arr) {
      item.createdBy = item.createdBy || user?._id || user?.id;

      if (!item.auditTrail) {
        item.auditTrail = [];
      }
      item.auditTrail.push({
        action: 'MASTER_CREATED',
        performedBy: user?._id || user?.id,
        performedByName: user?.name || 'System Admin',
        notes: `Created [${item.category}] master item: ${item.name} (${item.code})`,
        timestamp: new Date(),
      });

      const doc = await MasterItem.create(item);
      const populated = await MasterItem.findById(doc._id).populate(this.cfg.populate);
      createdDocs.push(populated);
    }

    return Array.isArray(payloads) ? createdDocs : createdDocs[0];
  }

  async toggleActive(user, id) {
    const item = await MasterItem.findById(id);
    if (!item) {
      const err = new Error('Master record not found');
      err.status = 404;
      throw err;
    }

    item.isActive = !item.isActive;
    item.auditTrail.push({
      action: 'STATUS_TOGGLED',
      performedBy: user?._id || user?.id,
      performedByName: user?.name || 'Admin',
      notes: `Master record set to ${item.isActive ? 'ACTIVE' : 'INACTIVE'}`,
      timestamp: new Date(),
    });

    await item.save();
    return MasterItem.findById(item._id).populate(this.cfg.populate);
  }

  async updateRate(user, id, { newRate, notes }) {
    const item = await MasterItem.findById(id);
    if (!item) {
      const err = new Error('Purity rate master not found');
      err.status = 404;
      throw err;
    }

    const oldRate = item.details?.currentRatePerGram || 0;
    item.details = {
      ...(item.details || {}),
      currentRatePerGram: Number(newRate),
      lastUpdated: new Date(),
    };
    item.markModified('details');

    item.auditTrail.push({
      action: 'BULLION_RATE_UPDATED',
      performedBy: user?._id || user?.id,
      performedByName: user?.name || 'Bullion Desk Lead',
      notes: notes || `Rate adjusted from ₹${oldRate}/g to ₹${newRate}/g.`,
      timestamp: new Date(),
    });

    await item.save();
    return MasterItem.findById(item._id).populate(this.cfg.populate);
  }

  async getStats() {
    const totalKarigars = await MasterItem.countDocuments({ category: 'karigar', isActive: true });
    const totalPurityRates = await MasterItem.countDocuments({ category: 'purity_rate', isActive: true });
    const totalGemstones = await MasterItem.countDocuments({ category: 'gemstone', isActive: true });
    const totalVaults = await MasterItem.countDocuments({ category: 'vault_safe', isActive: true });

    return {
      totalKarigars,
      totalPurityRates,
      totalGemstones,
      totalVaults,
      totalMasters: totalKarigars + totalPurityRates + totalGemstones + totalVaults,
    };
  }
}

export const mastersService = new MastersService();
