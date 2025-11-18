import { calculatePurchaseCost, calculateRedemptionReturn, xlogx } from "../contracts/bonding-curve-lock/src/price";

describe("calculatePurchaseCost", () => {
  test("should calculate purchase cost correctly for normal case", () => {
    const purchaseAmount = 10;
    const remaining = 90;
    const totalSupply = 100;
    const k = 1;
    const expected = k * ((totalSupply - remaining + purchaseAmount) * Math.log(totalSupply - remaining + purchaseAmount) - (totalSupply - remaining) * Math.log(totalSupply - remaining) - purchaseAmount);
    const result = calculatePurchaseCost(purchaseAmount, remaining, totalSupply, k);
    expect(result).toBeCloseTo(expected, 5);
  });

  test("should return 0 when purchase amount is 0", () => {
    const purchaseAmount = 0;
    const remaining = 100;
    const totalSupply = 100;
    const k = 1;
    const result = calculatePurchaseCost(purchaseAmount, remaining, totalSupply, k);
    expect(result).toBe(0);
  });

  test("should handle large purchase amounts", () => {
    const purchaseAmount = 50;
    const remaining = 50;
    const totalSupply = 100;
    const k = 2;
    const s0 = totalSupply - remaining;
    const s1 = s0 + purchaseAmount;
    const expected = k * (s1 * Math.log(s1) - s0 * Math.log(s0) - purchaseAmount);
    const result = calculatePurchaseCost(purchaseAmount, remaining, totalSupply, k);
    expect(result).toBeCloseTo(expected, 5);
  });

  test("should handle floating point precision", () => {
    const purchaseAmount = 1;
    const remaining = 99;
    const totalSupply = 100;
    const k = 1;
    const result = calculatePurchaseCost(purchaseAmount, remaining, totalSupply, k);
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

describe("calculateRedemptionReturn", () => {
  test("should calculate redemption return correctly for normal case", () => {
    const redemptionAmount = 10;
    const remaining = 90;
    const totalSupply = 100;
    const k = 1;
    const s0 = totalSupply - remaining;
    const s1 = s0 - redemptionAmount;
    const expected = k * (xlogx(s0) - xlogx(s1) + redemptionAmount);
    const result = calculateRedemptionReturn(redemptionAmount, remaining, totalSupply, k);
    expect(result).toBeCloseTo(expected, 5);
  });

  test("should return 0 when redemption amount is 0", () => {
    const redemptionAmount = 0;
    const remaining = 100;
    const totalSupply = 100;
    const k = 1;
    const result = calculateRedemptionReturn(redemptionAmount, remaining, totalSupply, k);
    expect(result).toBe(0);
  });

  test("should throw error when redemption amount exceeds purchased amount", () => {
    const redemptionAmount = 20;
    const remaining = 90;
    const totalSupply = 100;
    const k = 1;
    expect(() => calculateRedemptionReturn(redemptionAmount, remaining, totalSupply, k)).toThrow("redemption (20) over (10)");
  });

  test("should handle redemption when s0 is 0", () => {
    const redemptionAmount = 0;
    const remaining = 100;
    const totalSupply = 100;
    const k = 1;
    const result = calculateRedemptionReturn(redemptionAmount, remaining, totalSupply, k);
    expect(result).toBe(0);
  });

  test("should handle large redemption amounts", () => {
    const redemptionAmount = 50;
    const remaining = 50;
    const totalSupply = 100;
    const k = 2;
    const s0 = totalSupply - remaining;
    const s1 = s0 - redemptionAmount;
    const expected = k * (xlogx(s0) - xlogx(s1) + redemptionAmount);
    const result = calculateRedemptionReturn(redemptionAmount, remaining, totalSupply, k);
    expect(result).toBeCloseTo(expected, 5);
  });

  test("should handle floating point precision", () => {
    const redemptionAmount = 1;
    const remaining = 99;
    const totalSupply = 100;
    const k = 1;
    const result = calculateRedemptionReturn(redemptionAmount, remaining, totalSupply, k);
    expect(result).toBeGreaterThanOrEqual(0);
  });
});
