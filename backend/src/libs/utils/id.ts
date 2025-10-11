import { createHash } from 'crypto';

// High 4 bits used for type prefixes
const TYPE_BITS = {
  funding: 0b0001n,
  control: 0b0010n,
};

// Total bits: 128
const TOTAL_BITS = 128n;
const PREFIX_BITS = 4n;
const PAYLOAD_BITS = TOTAL_BITS - PREFIX_BITS;

// Mask to extract only the lower 124 bits from the hash
const PAYLOAD_MASK = (1n << PAYLOAD_BITS) - 1n;

/**
 * Generates a deterministic 128-bit unsigned integer ID with a 4-bit type prefix.
 *
 * @param typeKey - The type of entity (e.g., 'account', 'control', 'transfer').
 * @param input - A unique string to deterministically hash into the payload (e.g., account ID).
 * @returns A bigint representing the 128-bit ID.
 * @throws If the typeKey is invalid or not registered in TYPE_BITS.
 */
export function generateDeterministicId(typeKey: keyof typeof TYPE_BITS, input: string): bigint {
  const prefix = TYPE_BITS[typeKey];
  if (prefix === undefined) {
    throw new Error(`Unknown type key: ${typeKey}`);
  }

  // Hash input deterministically (SHA-256 → 256 bits)
  const hash = createHash('sha256').update(input).digest(); // 32 bytes

  // Extract the first 16 bytes (128 bits)
  const hash128 = BigInt('0x' + hash.subarray(0, 16).toString('hex'));

  // Apply payload mask to keep only lower 124 bits
  const payload = hash128 & PAYLOAD_MASK;

  // Shift prefix to high 4 bits and combine
  const id = (prefix << PAYLOAD_BITS) | payload;

  return id;
}
