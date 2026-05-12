export const fmt = {
  currency: (val, currency = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(val || 0),
  number: (val) => new Intl.NumberFormat('en-US').format(val || 0),
  date: (val) => val ? new Date(val).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—',
  datetime: (val) => val ? new Date(val).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—',
  percent: (val) => `${(val || 0).toFixed(1)}%`,
}
