export function numToLeBytes(num: bigint | number, bytes: number): string {
  let hex = BigInt(num).toString(16);
  if (hex.length % 2 !== 0) hex = "0" + hex;
  const byteLen = hex.length / 2;
  if (byteLen > bytes) throw new Error("Number too large");
  const padding = "00".repeat(bytes - byteLen);
  const paddedHex = padding + hex;
  const le = paddedHex.match(/../g)!.reverse().join("");
  return "0x" + le;
}
