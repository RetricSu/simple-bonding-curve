import * as bindings from "@ckb-js-std/bindings";
import { Script, HighLevel, log, bytesEq } from "@ckb-js-std/core";
import { getFirstUdtCell, getUDTAmountFromData, readU32LEHex } from "./util";
import { BondingCurveLockError } from "./error";

function main(): number {
  log.setLevel(log.LogLevel.Debug);
  // NAME
  // Simple Bonding Curve Lock
  //
  // DESCRIPTION
  // A simple bonding curve lock script implemented in TypeScript for CKB blockchain.
  //
  // ARGS STRUCTURE
  //     [0..4]    :   4-byte curve parameter (u32, little-endian), the value of K
  //     [4..20]   :   16-byte the total supply of tokens (u128, little-endian, compatible with UDT amount), the value of TotalSupply
  //
  // BEHAVIOR
  // This lock script enforces a bonding curve mechanism for token issuance and redemption.
  // The lock script must be used with UDT Type Script to create a pool cell that holds the tokens and distributes them according to the bonding curve.
  // The lock script only validates the bonding-curve logics while the basic token function is proxy to the Cell's UDT Type Script, eg: remaining amount is recorded in the data field of the UDT cell.
  //
  // Pool Cell:
  //   - Lock Script: Simple Bonding Curve Lock Script
  //   - Type Script: UDT Type Script
  //   - Data: Remaining supply of tokens (u128, little-endian, compatible with UDT amount)
  //
  // BONDING CURVE FORMULA
  // The price of tokens increases as more tokens are issued according to the bonding curve formula.
  //
  //    Price = K · log(TotalSupply − Remaining)
  //
  //
  // VALIDATION LOGIC
  // 1. Get the curve parameter K and TotalSupply from the script args.
  // 2. Identify the first UDT cell associated with this lock script in the inputs to determine the current Remaining supply.
  // 3. Identify the first UDT cell associated with this lock script in the outputs to determine the new Remaining supply.
  // 4. Calculate the expected price change based on the bonding curve formula.
  // 5. validates:
  //    - 1. There must be only one cell associated with this lock script in both inputs and outputs.
  //    - 2. The TotalSupply and K in the script args must remain the same in both inputs and outputs, it can't be changed.
  //    - 3. The change in Remaining supply must correspond to the correct price change according to the bonding curve.
  //    - 4. For token issuance (Remaining decreases): Ensure that the transaction includes sufficient CKB to cover the price increase.
  //    - 5. For token redemption (Remaining increases): Ensure that the transaction returns sufficient CKB to the lock script to cover the price decrease.

  // NOTE
  // This is a simplified example for educational purposes and may not cover all edge cases or security considerations.

  const script = HighLevel.loadScript();
  const argsInHex = bindings.hex.encode(script.args.slice(35)); // ckb-js-vm has leading 35 bytes args

  const k = readU32LEHex(bindings.hex.decode(argsInHex.slice(0, 8)));
  const totalSupply = getUDTAmountFromData(
    bindings.hex.decode(argsInHex.slice(8, 40))
  );

  log.debug(`K=${k}, TotalSupply=${totalSupply}`);

  const [poolCellIndexInInputs, remainingUdtAmountInput] = getFirstUdtCell(script.hash(), bindings.SOURCE_INPUT);
  const [poolCellIndexInOutputs, remainingUdtAmountOutput] = getFirstUdtCell(script.hash(), bindings.SOURCE_OUTPUT);

  if (poolCellIndexInInputs === -1 || poolCellIndexInOutputs === -1) {
    log.error("No pool cell found in inputs or outputs");
    return BondingCurveLockError.PoolCellNotFound;
  }

  log.debug(`RemainingInput=${remainingUdtAmountInput}, RemainingOutput=${remainingUdtAmountOutput}`);

  if (remainingUdtAmountInput === remainingUdtAmountOutput) {
    log.debug("No change in remaining UDT amount, skipping bonding curve validation");
    return 0;
  }

  if (remainingUdtAmountInput > totalSupply || remainingUdtAmountOutput > totalSupply) {
    log.error("Remaining UDT amount exceeds TotalSupply");
    return BondingCurveLockError.InvalidPoolCellData;
  }

  // Calculate price change
  const priceInput =
    k * Math.log(Number(totalSupply - remainingUdtAmountInput));
  const priceOutput =
    k * Math.log(Number(totalSupply - remainingUdtAmountOutput));
  const priceChange = priceOutput - priceInput;

  log.debug(`PriceInput=${priceInput}, PriceOutput=${priceOutput}, PriceChange=${priceChange}`);

  if (remainingUdtAmountInput > remainingUdtAmountOutput) {
    // Token issuance
    log.debug("Token issuance detected");
    const ckbInput = HighLevel.loadCellCapacity(poolCellIndexInInputs, bindings.SOURCE_INPUT);
    const ckbOutput = HighLevel.loadCellCapacity(poolCellIndexInOutputs, bindings.SOURCE_OUTPUT);
    const ckbChange = Number(ckbOutput - ckbInput);

    log.debug(`CKBInput=${ckbInput}, CKBOutput=${ckbOutput}, CKBChange=${ckbChange}`);

    if (ckbChange < priceChange) {
      log.error("Insufficient CKB provided for token issuance");
      return BondingCurveLockError.PriceExchangeNotMeet;
    }
  } else {
    // Token redemption
    log.debug("Token redemption detected");
    const ckbInput = HighLevel.loadCellCapacity(poolCellIndexInInputs, bindings.SOURCE_INPUT);
    const ckbOutput = HighLevel.loadCellCapacity(poolCellIndexInOutputs, bindings.SOURCE_OUTPUT);
    const ckbChange = Number(ckbOutput - ckbInput);

    log.debug(`CKBInput=${ckbInput}, CKBOutput=${ckbOutput}, CKBChange=${ckbChange}`);

    if (-ckbChange < -priceChange) {
      log.error("Insufficient CKB returned for token redemption");
      return BondingCurveLockError.PriceExchangeNotMeet;
    }
  }

  return 0;
}

bindings.exit(main());
