export function formatModIds(ids, build) {
  if (!build) return '';
  if (!['41', '42'].includes(build)) throw new RangeError('Choose Build 41 or Build 42.');
  const unique = [...new Set(ids.map(id => id.trim().replace(/^\\+/, '')).filter(Boolean))];
  return unique.map(id => build === '42' ? `\\${id}` : id).join(';');
}
