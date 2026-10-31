import { BaseService } from '../../common/base.service.js';
import { nextSeq } from '../../common/Counter.js';
import { addDays } from '../../utils/dates.js';
import { Ticket } from './ticket.model.js';

class TicketService extends BaseService {
  // Anyone can raise a ticket and sees the ones they raised or were assigned.
  scope(user) {
    return user.role === 'doer' ? { $or: [{ assignedTo: user._id }, { raisedBy: user._id }] } : {};
  }

  async buildForCreate(user, data) {
    return [{ dueDate: addDays(new Date(), 3), ...data, ticketNo: `TKT-${await nextSeq('ticket', 5)}`, raisedBy: user._id }];
  }

  // Review step: a doer resolving a ticket sends it to review; staff close directly.
  completionStatus(user) {
    return user.role === 'doer' ? 'review' : 'closed';
  }
}

export const ticketService = new TicketService(Ticket, {
  key: 'ticket',
  dateField: 'dueDate',
  doneStatus: 'closed',
  doneField: 'closedAt',
  openStatuses: ['open', 'in_progress', 'review'],
  searchFields: ['ticketNo', 'title'],
  populate: [
    { path: 'assignedTo', select: 'name email department' },
    { path: 'raisedBy', select: 'name' },
  ],
});
