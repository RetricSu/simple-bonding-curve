import { hexFrom, Transaction, hashTypeToBytes } from '@ckb-ccc/core';
import { readFileSync } from 'fs';
import { Resource, Verifier, DEFAULT_SCRIPT_ALWAYS_SUCCESS, DEFAULT_SCRIPT_CKB_JS_VM } from 'ckb-testtool';
import { calculatePurchaseCost } from '../contracts/bonding-curve-lock/src/price';

describe('bonding-curve-lock contract', () => {
  test('should purchase successfully', async () => {
    const resource = Resource.default();
    const tx = Transaction.default();

    const mainScript = resource.deployCell(hexFrom(readFileSync(DEFAULT_SCRIPT_CKB_JS_VM)), tx, false);
    const alwaysSuccessScript = resource.deployCell(hexFrom(readFileSync(DEFAULT_SCRIPT_ALWAYS_SUCCESS)), tx, false);
    const contractScript = resource.deployCell(hexFrom(readFileSync('dist/bonding-curve-lock.bc')), tx, false);
    const udtScript = alwaysSuccessScript;

    const k = '0x01000000'; // value 1 in uint32 little-endian
    const totalSupply = '0xFF000000000000000000000000000000'; // value 255 in uint128 little-endian
    const remainingUdtAmountOutput = '0xFA000000000000000000000000000000'; // value 250 in uint128 little-endian, diff value is 2 meaning that 2 tokens are purchased

    const requiredCKBAmount = calculatePurchaseCost(5, 255, 255, 1); // purchase 2 tokens, remaining 255, totalSupply 255, k=1
    const requiredCKBAmountCapacity = BigInt(Math.ceil(requiredCKBAmount * 10 ** 8));
    const poolInputCKBCapacity = BigInt(200 * 10 ** 8); // initial pool capacity = 200 CKB
    const poolOutputCKBCapacity = poolInputCKBCapacity + requiredCKBAmountCapacity;
    console.log(`requiredCKBAmountCapacity: ${requiredCKBAmountCapacity}, poolInputCKBCapacity: ${poolInputCKBCapacity}, poolOutputCKBCapacity: ${poolOutputCKBCapacity}`);

    mainScript.args = hexFrom(
      '0x0000' +
        contractScript.codeHash.slice(2) +
        hexFrom(hashTypeToBytes(contractScript.hashType)).slice(2) +
        k.slice(2) +
        totalSupply.slice(2),
    );

    // 1 input cell
    const inputCell = resource.mockCell(mainScript, udtScript, totalSupply, BigInt(poolInputCKBCapacity));
    tx.inputs.push(Resource.createCellInput(inputCell));

    // 2 output cells
    tx.outputs.push(Resource.createCellOutput(mainScript, udtScript, BigInt(poolOutputCKBCapacity)));
    tx.outputsData.push(remainingUdtAmountOutput);
    tx.outputs.push(Resource.createCellOutput(alwaysSuccessScript));
    tx.outputsData.push(remainingUdtAmountOutput);

    const verifier = Verifier.from(resource, tx);
    // if you are using the native ckb-debugger, you can delete the following line.
    verifier.setWasmDebuggerEnabled(true);
    await verifier.verifySuccess(true);
  });
});
