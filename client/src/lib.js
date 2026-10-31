export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB') : '—');
export const initials = (name = '') => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
export const isOverdue = (d, done) => !done && d && new Date(d) < new Date(new Date().setHours(0, 0, 0, 0));
