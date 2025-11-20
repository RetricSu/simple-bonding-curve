export function xlogx(x: number): number {
  if (x === 0) return 0;
  return x * Math.log(x);
}

export function calculatePurchaseCost(
  purchaseAmount: number,
  remaining: number,
  totalSupply: number,
  k: number
) {
  const s0 = totalSupply - remaining; // Initial amount already purchased
  const s1 = s0 + purchaseAmount; // Final amount already purchased

  // Calculate total cost: K * [s1*log(s1) - s0*log(s0) - Δx]
  const cost = k * (xlogx(s1) - xlogx(s0) - purchaseAmount);

  // Handle floating point precision issues
  return Math.max(0, cost);
}

export function calculateRedemptionReturn(
  redemptionAmount: number,
  remaining: number,
  totalSupply: number,
  k: number
) {
  const s0 = totalSupply - remaining; // Initial amount already purchased
  const s1 = s0 - redemptionAmount; // Final amount already purchased

  // make sure s1 is not negative
  if (s1 < 0) {
    throw new Error(`redemption (${redemptionAmount}) over (${s0})`);
  }

  // Calculate total return: K * [s0*log(s0) - s1*log(s1) + Δx]
  const ret = k * (xlogx(s0) - xlogx(s1) + redemptionAmount);

  // Handle floating point precision issues
  return Math.max(0, ret);
}

export function calculatePurchaseAmount(
  ckbAmount: number,
  remaining: number,
  totalSupply: number,
  k: number
): number {
  // Binary search to find the UDT amount that costs exactly ckbAmount
  let low = 0;
  let high = remaining; // Can't buy more than remaining
  const epsilon = 0.01; // Precision

  while (high - low > epsilon) {
    const mid = (low + high) / 2;
    const cost = calculatePurchaseCost(mid, remaining, totalSupply, k);

    if (cost < ckbAmount) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}
