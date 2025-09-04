// Simple nano id substitute (collision risk acceptable for prototype)
// size: total length you want (including prefix)

import type { typeBoxID } from "../types/TypeSchema";

// prefix: 고정하고 싶은 앞부분
export function nanoid(size = 8, prefix = '_'): typeBoxID {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  if (prefix.length > size) {
    throw new Error('prefix length exceeds total size');
  }
  const remaining = size - prefix.length;
  let out = prefix;
  for (let i = 0; i < remaining; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out as typeBoxID;
}

// 사용 예:
// nanoid(10, 'ab_')  => 'ab_x3f9k2'
