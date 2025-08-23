// Simple nano id substitute (collision risk acceptable for prototype)
export function nanoid(size = 8): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let out = '';
  for (let i = 0; i < size; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
