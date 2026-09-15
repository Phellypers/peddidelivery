export function toCurrencyCents(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

export function getSplitPaymentStatus(total, amounts = {}) {
  const totalCents = Math.max(0, toCurrencyCents(total));
  const paidCents = Object.values(amounts).reduce(
    (sum, value) => sum + Math.max(0, toCurrencyCents(value)),
    0,
  );
  const differenceCents = totalCents - paidCents;

  return {
    totalCents,
    paidCents,
    differenceCents,
    difference: differenceCents / 100,
    isValid: differenceCents === 0,
  };
}
