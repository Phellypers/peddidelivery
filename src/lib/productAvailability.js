export function isProductAvailable(product, date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone:'America/Sao_Paulo', weekday:'short', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).formatToParts(date).map(part => [part.type,part.value]));
  const days = ['dom','seg','ter','qua','qui','sex','sab'];
  const index = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(parts.weekday);
  const time = `${parts.hour}:${parts.minute}`;
  const schedule = product.availability_by_day || Object.fromEntries(days.map(day => [day, {
    enabled: !product.available_days?.length || product.available_days.includes(day), start:product.availability_start || '',end:product.availability_end || '',
  }]));
  const today = schedule[days[index]], previous = schedule[days[(index+6)%7]];
  if (previous?.enabled && previous.start && previous.end && previous.end < previous.start && time < previous.end) return true;
  if (!today?.enabled) return false;
  if (!today.start && !today.end) return true;
  if (!today.start || !today.end) return false;
  return today.start < today.end ? time >= today.start && time < today.end : time >= today.start;
}
