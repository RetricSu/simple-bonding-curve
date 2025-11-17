import { Bytes, bytesEq, HighLevel, log } from "@ckb-js-std/core";
import * as bindings from "@ckb-js-std/bindings";

export function readU32LEHex(data: ArrayBuffer): number {
  const n = new Uint32Array(data);
  return n[0];
}

export function getUDTAmountFromData(data: ArrayBuffer): bigint {
  const n = new BigUint64Array(data);
  return n[0] | (n[1] << 64n);
}

export function getFirstUdtCell(
  lockScriptHash: Bytes,
  source: bindings.SourceType
): [number, bigint] {
  let udtAmount = BigInt(0);
  let cellIndex = -1;

  for (let i = 0; ; i++) {
    try {
      const cell = HighLevel.loadCell(i, source);
      if (bytesEq(cell.lock.hash(), lockScriptHash)) {
        cellIndex = i;
        if (cell.type != null) {
          try {
            const cellData = HighLevel.loadCellData(i, source);
            if (cellData.byteLength === 16) {
              udtAmount = getUDTAmountFromData(cellData);
            }
          } catch (error) {
            log.error("Failed to load cell data");
          }
        }
        break;
      }
    } catch (error) {
      // index out of range
      break;
    }
  }

  return [cellIndex, udtAmount];
}
