import { ConflictError, ValidationError } from '../shared/errors.js';

export function calculateOutstanding(amountMinor, allocatedMinor) {
  if (!Number.isSafeInteger(amountMinor) || !Number.isSafeInteger(allocatedMinor)) {
    throw new ValidationError('আর্থিক হিসাবের মান সঠিক নয়।');
  }
  if (allocatedMinor < 0 || allocatedMinor > amountMinor) {
    throw new ConflictError('বরাদ্দের পরিমাণ ফি আইটেমের বকেয়ার সীমা অতিক্রম করেছে।');
  }
  return amountMinor - allocatedMinor;
}

/**
 * Validate a manual allocation before the repository starts its transaction.
 * The repository repeats the important checks inside the transaction so a
 * second cashier request cannot bypass this boundary.
 */
export function validatePaymentAllocations(paymentMinor, allocations, feeItemsById) {
  if (!Array.isArray(allocations) || allocations.length === 0) {
    throw new ValidationError('অন্তত একটি ফি আইটেমে টাকা বরাদ্দ করুন।');
  }
  const seen = new Set();
  let allocatedTotal = 0;
  const normalized = allocations.map((allocation) => {
    if (!allocation || typeof allocation.feeItemId !== 'string' || !Number.isSafeInteger(allocation.amountMinor)) {
      throw new ValidationError('পেমেন্ট বরাদ্দের তথ্য সঠিক নয়।');
    }
    if (allocation.amountMinor <= 0) {
      throw new ValidationError('বরাদ্দের পরিমাণ শূন্যের বেশি হতে হবে।');
    }
    if (seen.has(allocation.feeItemId)) {
      throw new ValidationError('একই ফি আইটেম একাধিকবার বরাদ্দ করা যাবে না।');
    }
    seen.add(allocation.feeItemId);
    const feeItem = feeItemsById.get(allocation.feeItemId);
    if (!feeItem) throw new ValidationError('নির্বাচিত ফি আইটেমটি পাওয়া যায়নি।');
    const outstanding = feeItem.amountMinor - feeItem.allocatedMinor;
    if (allocation.amountMinor > outstanding) {
      throw new ConflictError('কোনো ফি আইটেমের বকেয়ার চেয়ে বেশি বরাদ্দ করা যাবে না।');
    }
    allocatedTotal += allocation.amountMinor;
    return { feeItemId: allocation.feeItemId, amountMinor: allocation.amountMinor };
  });
  if (allocatedTotal > paymentMinor) {
    throw new ConflictError('বরাদ্দের মোট পরিমাণ পেমেন্টের চেয়ে বেশি।');
  }
  return { allocations: normalized, allocatedTotal, unallocatedMinor: paymentMinor - allocatedTotal };
}

export function studentStatusTransition(currentStatus, nextStatus) {
  const allowed = new Set(['active', 'inactive', 'archived', 'withdrawn']);
  if (!allowed.has(currentStatus) || !allowed.has(nextStatus)) {
    throw new ValidationError('শিক্ষার্থীর অবস্থা সঠিক নয়।');
  }
  if (currentStatus === 'archived' && nextStatus !== 'archived') {
    throw new ConflictError('আর্কাইভ করা শিক্ষার্থীকে পুনরায় সক্রিয় করতে অনুমোদিত পুনরুদ্ধার প্রক্রিয়া প্রয়োজন।');
  }
  return nextStatus;
}
