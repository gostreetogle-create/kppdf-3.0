import { CounterModel } from './counter.model';

/**
 * Generates the next auto-number for a document type.
 *
 * Format: `{prefix}-{year}-{paddedSeq}` (e.g. "КП-2026-0005").
 *
 * Uses findOneAndUpdate with $inc to atomically increment the counter.
 * Creates a new counter row for the current year if none exists.
 *
 * @param entity  Counter entity name (e.g. 'quotation', 'order', 'purchase_order')
 * @returns       Formatted number string (e.g. "КП-2026-0005")
 */
export async function getNextNumber(entity: string): Promise<string> {
  const year = new Date().getFullYear();

  const doc = await CounterModel.findOneAndUpdate(
    { entity, year },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  );

  return `${doc.prefix}${year}-${String(doc.seq).padStart(3, '0')}`;
}
