import { hexFrom, Transaction, hashTypeToBytes } from '@ckb-ccc/core';
import { readFileSync } from 'fs';
import { Resource, Verifier, DEFAULT_SCRIPT_ALWAYS_SUCCESS, DEFAULT_SCRIPT_CKB_JS_VM } from 'ckb-testtool';

describe('bonding-curve-lock contract', () => {
  test('should execute successfully', async () => {
    const resource = Resource.default();
    const tx = Transaction.default();

    const mainScript = resource.deployCell(hexFrom(readFileSync(DEFAULT_SCRIPT_CKB_JS_VM)), tx, false);
    const alwaysSuccessScript = resource.deployCell(hexFrom(readFileSync(DEFAULT_SCRIPT_ALWAYS_SUCCESS)), tx, false);
    const contractScript = resource.deployCell(hexFrom(readFileSync('dist/bonding-curve-lock.bc')), tx, false);
    const k = '0x10000000';
    const totalSupply = '0xFF000000000000000000000000000000';

    mainScript.args = hexFrom(
      '0x0000' +
        contractScript.codeHash.slice(2) +
        hexFrom(hashTypeToBytes(contractScript.hashType)).slice(2) +
        k.slice(2) +
        totalSupply.slice(2),
    );

    // 1 input cell
    const inputCell = resource.mockCell(mainScript, alwaysSuccessScript, '0xFF000000000000000000000000000000');
    tx.inputs.push(Resource.createCellInput(inputCell));

    // 2 output cells
    tx.outputs.push(Resource.createCellOutput(mainScript, alwaysSuccessScript));
    tx.outputsData.push(hexFrom('0xFE000000000000000000000000000000'));
    tx.outputs.push(Resource.createCellOutput(alwaysSuccessScript));
    tx.outputsData.push(hexFrom('0x01000000000000000000000000000000'));

    const verifier = Verifier.from(resource, tx);
    // if you are using the native ckb-debugger, you can delete the following line.
    verifier.setWasmDebuggerEnabled(true);
    await verifier.verifySuccess(true);
  });
});
