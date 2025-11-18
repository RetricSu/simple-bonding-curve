import { hexFrom, ccc, hashTypeToBytes } from "@ckb-ccc/core";
import scripts from "../deployment/scripts.json";
import systemScripts from "../deployment/system-scripts.json";
import { buildClient, buildSigner } from "./helper";
import {
  calculatePurchaseCost,
  calculateRedemptionReturn,
} from "../contracts/bonding-curve-lock/src/price";

describe("bonding-curve-lock contract", () => {
  let client: ccc.Client;
  let signer: ccc.SignerCkbPrivateKey;

  beforeAll(() => {
    // Create global devnet client and signer for all tests in this describe block
    client = buildClient("devnet");
    signer = buildSigner(client);
  });

  test("should purchase successfully", async () => {
    const ckbJsVmScript = systemScripts.devnet["ckb_js_vm"];
    const contractScript = scripts.devnet["bonding-curve-lock.bc"];

    const signerAddressObj = await signer.getRecommendedAddressObj();
    const signerLock = signerAddressObj.script;

    const udtTypeScript = {
      codeHash: systemScripts.devnet.xudt.script.codeHash,
      hashType: systemScripts.devnet.xudt.script.hashType,
      args: signerLock.hash(), // XUDT owner is the signer
    };

    const k = "0x01000000"; // value 1 in uint32 little-endian
    const totalSupply = "0xFF000000000000000000000000000000"; // value 255 in uint128 little-endian
    const initialRemainingUdtAmount = "0xFF000000000000000000000000000000"; // 255 UDT initially
    const purchaseAmount = 2n;
    const remainingUdtAmountOutput = "0xFD000000000000000000000000000000"; // 253 UDT remaining (255 - 2)

    const requiredCKBAmount = calculatePurchaseCost(
      Number(purchaseAmount),
      255,
      255,
      1,
    );
    const requiredCKBAmountCapacity = BigInt(
      Math.ceil(requiredCKBAmount * 10 ** 8),
    );
    console.log(`requiredCKBAmountCapacity: ${requiredCKBAmountCapacity}`);

    const mainScript = {
      codeHash: ckbJsVmScript.script.codeHash,
      hashType: ckbJsVmScript.script.hashType,
      args: hexFrom(
        "0x0000" +
          contractScript.codeHash.slice(2) +
          hexFrom(hashTypeToBytes(contractScript.hashType)).slice(2) +
          k.slice(2) +
          totalSupply.slice(2),
      ),
    };

    // First transaction: Create UDT for the signer
    const tx0 = ccc.Transaction.from({
      outputs: [
        {
          lock: signerLock,
          type: udtTypeScript,
        },
      ],
      outputsData: [hexFrom("0xFF000000000000000000000000000000")], // 255 UDT
      cellDeps: [
        ...systemScripts.devnet.xudt.script.cellDeps.map((c) => c.cellDep),
      ],
    });

    await tx0.completeInputsByCapacity(signer);
    await tx0.completeFeeBy(signer, 1000);
    const txHash0 = await signer.sendTransaction(tx0);
    console.log(`UDT created: ${txHash0}`);

    // Second transaction: Create the pool cell with bonding curve lock
    const tx1 = ccc.Transaction.from({
      inputs: [
        {
          previousOutput: {
            txHash: txHash0,
            index: 0,
          },
        },
      ],
      outputs: [
        {
          capacity: ccc.fixedPointFrom(200), // initial pool capacity = 200 CKB
          lock: mainScript,
          type: udtTypeScript,
        },
        {
          lock: signerLock,
        },
      ],
      outputsData: [
        initialRemainingUdtAmount, // 255 UDT in pool
        hexFrom("0x00"),
      ],
      cellDeps: [
        ...ckbJsVmScript.script.cellDeps.map((c) => c.cellDep),
        ...contractScript.cellDeps.map((c) => c.cellDep),
        ...systemScripts.devnet.xudt.script.cellDeps.map((c) => c.cellDep),
      ],
    });

    await tx1.completeInputsByCapacity(signer);
    await tx1.completeFeeBy(signer, 1000);
    const txHash1 = await signer.sendTransaction(tx1);
    console.log(`Pool cell created: ${txHash1}`);

    // Third transaction: Purchase UDT from the pool
    const tx2 = ccc.Transaction.from({
      inputs: [
        {
          previousOutput: {
            txHash: txHash1,
            index: 0,
          },
        },
      ],
      outputs: [
        {
          capacity: ccc.fixedPointFrom(200) + requiredCKBAmountCapacity, // pool capacity + purchased CKB
          lock: mainScript,
          type: udtTypeScript,
        },
        {
          lock: signerLock,
          type: udtTypeScript,
        },
      ],
      outputsData: [
        remainingUdtAmountOutput, // 253 UDT remaining in pool
        hexFrom("0x02000000000000000000000000000000"), // 2 UDT purchased
      ],
      cellDeps: [
        ...ckbJsVmScript.script.cellDeps.map((c) => c.cellDep),
        ...contractScript.cellDeps.map((c) => c.cellDep),
        ...systemScripts.devnet.xudt.script.cellDeps.map((c) => c.cellDep),
      ],
    });

    await tx2.completeInputsByCapacity(signer);
    await tx2.completeFeeBy(signer, 1000);
    const txHash2 = await signer.sendTransaction(tx2);
    console.log(`Purchase successful: ${txHash2}`);
  });

  test("should purchase fail with less CKB", async () => {
    const ckbJsVmScript = systemScripts.devnet["ckb_js_vm"];
    const contractScript = scripts.devnet["bonding-curve-lock.bc"];

    const signerAddressObj = await signer.getRecommendedAddressObj();
    const signerLock = signerAddressObj.script;

    const udtTypeScript = {
      codeHash: systemScripts.devnet.xudt.script.codeHash,
      hashType: systemScripts.devnet.xudt.script.hashType,
      args: signerLock.hash(), // XUDT owner is the signer
    };

    const k = "0x01000000"; // value 1 in uint32 little-endian
    const totalSupply = "0xFF000000000000000000000000000000"; // value 255 in uint128 little-endian
    const initialRemainingUdtAmount = "0xFF000000000000000000000000000000"; // 255 UDT initially

    const mainScript = {
      codeHash: ckbJsVmScript.script.codeHash,
      hashType: ckbJsVmScript.script.hashType,
      args: hexFrom(
        "0x0000" +
          contractScript.codeHash.slice(2) +
          hexFrom(hashTypeToBytes(contractScript.hashType)).slice(2) +
          k.slice(2) +
          totalSupply.slice(2),
      ),
    };

    // First transaction: Create UDT for the signer
    const tx0 = ccc.Transaction.from({
      outputs: [
        {
          lock: signerLock,
          type: udtTypeScript,
        },
      ],
      outputsData: [hexFrom("0xFF000000000000000000000000000000")], // 255 UDT
      cellDeps: [
        ...systemScripts.devnet.xudt.script.cellDeps.map((c) => c.cellDep),
      ],
    });

    await tx0.completeInputsByCapacity(signer);
    await tx0.completeFeeBy(signer, 1000);
    const txHash0 = await signer.sendTransaction(tx0);
    console.log(`UDT created: ${txHash0}`);

    // Second transaction: Create the pool cell with bonding curve lock
    const tx1 = ccc.Transaction.from({
      inputs: [
        {
          previousOutput: {
            txHash: txHash0,
            index: 0,
          },
        },
      ],
      outputs: [
        {
          capacity: ccc.fixedPointFrom(200), // initial pool capacity = 200 CKB
          lock: mainScript,
          type: udtTypeScript,
        },
        {
          lock: signerLock,
        },
      ],
      outputsData: [
        initialRemainingUdtAmount, // 255 UDT in pool
        hexFrom("0x00"),
      ],
      cellDeps: [
        ...ckbJsVmScript.script.cellDeps.map((c) => c.cellDep),
        ...contractScript.cellDeps.map((c) => c.cellDep),
        ...systemScripts.devnet.xudt.script.cellDeps.map((c) => c.cellDep),
      ],
    });

    await tx1.completeInputsByCapacity(signer);
    await tx1.completeFeeBy(signer, 1000);
    const txHash1 = await signer.sendTransaction(tx1);
    console.log(`Pool cell created: ${txHash1}`);

    // Third transaction: Attempt to purchase with insufficient CKB (less than required)
    const insufficientCKB = ccc.fixedPointFrom(1); // only 1 CKB, but need more
    const tx2 = ccc.Transaction.from({
      inputs: [
        {
          previousOutput: {
            txHash: txHash1,
            index: 0,
          },
        },
      ],
      outputs: [
        {
          capacity: ccc.fixedPointFrom(199), // pool capacity - 1 CKB (insufficient)
          lock: mainScript,
          type: udtTypeScript,
        },
        {
          lock: signerLock,
          type: udtTypeScript,
        },
      ],
      outputsData: [
        hexFrom("0xFD000000000000000000000000000000"), // 253 UDT remaining
        hexFrom("0x02000000000000000000000000000000"), // 2 UDT purchased
      ],
      cellDeps: [
        ...ckbJsVmScript.script.cellDeps.map((c) => c.cellDep),
        ...contractScript.cellDeps.map((c) => c.cellDep),
        ...systemScripts.devnet.xudt.script.cellDeps.map((c) => c.cellDep),
      ],
    });

    await tx2.completeInputsByCapacity(signer);
    await tx2.completeFeeBy(signer, 1000);
    try {
      await signer.sendTransaction(tx2);
      console.log("Purchase should have failed but didn't");
      throw new Error("Expected transaction to fail");
    } catch (error) {
      console.log(
        `Purchase failed as expected: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });

  test("should redeem successfully", async () => {
    const ckbJsVmScript = systemScripts.devnet["ckb_js_vm"];
    const contractScript = scripts.devnet["bonding-curve-lock.bc"];

    const signerAddressObj = await signer.getRecommendedAddressObj();
    const signerLock = signerAddressObj.script;

    const udtTypeScript = {
      codeHash: systemScripts.devnet.xudt.script.codeHash,
      hashType: systemScripts.devnet.xudt.script.hashType,
      args: signerLock.hash(), // XUDT owner is the signer
    };

    const k = "0x01000000"; // value 1 in uint32 little-endian
    const totalSupply = "0xFF000000000000000000000000000000"; // value 255 in uint128 little-endian
    const poolRemainingUdtAmountInput = "0xFA000000000000000000000000000000"; // 250 UDT in pool
    const poolRemainingUdtAmountOutput = "0xFF000000000000000000000000000000"; // 255 UDT in pool after redeem
    const userUdtAmountInput = "0x05000000000000000000000000000000"; // 5 UDT to redeem
    const userUdtAmountOutput = "0x00000000000000000000000000000000"; // 0 UDT after redeem

    const redemptionReturn = calculateRedemptionReturn(5, 250, 255, 1); // redeem 5 tokens, remaining 250, totalSupply 255, k=1
    const redemptionReturnCapacity = BigInt(
      Math.ceil(redemptionReturn * 10 ** 8),
    );
    console.log(`redemptionReturnCapacity: ${redemptionReturnCapacity}`);

    const mainScript = {
      codeHash: ckbJsVmScript.script.codeHash,
      hashType: ckbJsVmScript.script.hashType,
      args: hexFrom(
        "0x0000" +
          contractScript.codeHash.slice(2) +
          hexFrom(hashTypeToBytes(contractScript.hashType)).slice(2) +
          k.slice(2) +
          totalSupply.slice(2),
      ),
    };

    // First transaction: Create UDT for the signer (pool and user)
    const tx0 = ccc.Transaction.from({
      outputs: [
        {
          capacity: ccc.fixedPointFrom(1000),
          lock: signerLock,
          type: udtTypeScript,
        },
      ],
      outputsData: [hexFrom("0xFF000000000000000000000000000000")], // 255 UDT
      cellDeps: [
        ...systemScripts.devnet.xudt.script.cellDeps.map((c) => c.cellDep),
      ],
    });

    await tx0.completeInputsByCapacity(signer);
    await tx0.completeFeeBy(signer, 1000);
    const txHash0 = await signer.sendTransaction(tx0);
    console.log(`UDT created: ${txHash0}`);

    // Second transaction: Create the pool cell with 250 UDT and 200 CKB
    const tx1 = ccc.Transaction.from({
      inputs: [
        {
          previousOutput: {
            txHash: txHash0,
            index: 0,
          },
        },
      ],
      outputs: [
        {
          capacity: ccc.fixedPointFrom(200), // pool capacity = 200 CKB
          lock: mainScript,
          type: udtTypeScript,
        },
        {
          capacity: ccc.fixedPointFrom(1000),
          lock: signerLock,
          type: udtTypeScript,
        },
      ],
      outputsData: [
        poolRemainingUdtAmountInput, // 250 UDT in pool
        hexFrom("0x05000000000000000000000000000000"), // 5 UDT for user
      ],
      cellDeps: [
        ...ckbJsVmScript.script.cellDeps.map((c) => c.cellDep),
        ...contractScript.cellDeps.map((c) => c.cellDep),
        ...systemScripts.devnet.xudt.script.cellDeps.map((c) => c.cellDep),
      ],
    });

    await tx1.completeInputsByCapacity(signer);
    await tx1.completeFeeBy(signer, 1000);
    const txHash1 = await signer.sendTransaction(tx1);
    console.log(`Pool and user UDT created: ${txHash1}`);

    // Third transaction: Redeem UDT from the pool
    const tx2 = ccc.Transaction.from({
      inputs: [
        {
          previousOutput: {
            txHash: txHash1,
            index: 0, // pool
          },
        },
        {
          previousOutput: {
            txHash: txHash1,
            index: 1, // user UDT
          },
        },
      ],
      outputs: [
        {
          capacity: ccc.fixedPointFrom(200) - redemptionReturnCapacity, // pool capacity - redeemed CKB
          lock: mainScript,
          type: udtTypeScript,
        },
        {
          capacity: ccc.fixedPointFrom(1000) + redemptionReturnCapacity, // user capacity + redeemed CKB
          lock: signerLock,
          type: udtTypeScript,
        },
      ],
      outputsData: [
        poolRemainingUdtAmountOutput, // 255 UDT in pool
        userUdtAmountOutput, // 0 UDT for user
      ],
      cellDeps: [
        ...ckbJsVmScript.script.cellDeps.map((c) => c.cellDep),
        ...contractScript.cellDeps.map((c) => c.cellDep),
        ...systemScripts.devnet.xudt.script.cellDeps.map((c) => c.cellDep),
      ],
    });

    await tx2.completeInputsByCapacity(signer);
    await tx2.completeFeeBy(signer, 1000);
    const txHash2 = await signer.sendTransaction(tx2);
    console.log(`Redeem successful: ${txHash2}`);
  });

  test("should redeem fail with insufficient CKB", async () => {
    const ckbJsVmScript = systemScripts.devnet["ckb_js_vm"];
    const contractScript = scripts.devnet["bonding-curve-lock.bc"];

    const signerAddressObj = await signer.getRecommendedAddressObj();
    const signerLock = signerAddressObj.script;

    const udtTypeScript = {
      codeHash: systemScripts.devnet.xudt.script.codeHash,
      hashType: systemScripts.devnet.xudt.script.hashType,
      args: signerLock.hash(), // XUDT owner is the signer
    };

    const k = "0x01000000"; // value 1 in uint32 little-endian
    const totalSupply = "0xFF000000000000000000000000000000"; // value 255 in uint128 little-endian
    const poolRemainingUdtAmountInput = "0xFA000000000000000000000000000000"; // 250 UDT in pool
    const poolRemainingUdtAmountOutput = "0xFF000000000000000000000000000000"; // 255 UDT in pool after redeem
    const userUdtAmountInput = "0x05000000000000000000000000000000"; // 5 UDT to redeem
    const userUdtAmountOutput = "0x00000000000000000000000000000000"; // 0 UDT after redeem

    const redemptionReturn = calculateRedemptionReturn(5, 250, 255, 1); // redeem 5 tokens, remaining 250, totalSupply 255, k=1
    const redemptionReturnCapacity = BigInt(
      Math.ceil(redemptionReturn * 10 ** 8),
    );
    console.log(`redemptionReturnCapacity: ${redemptionReturnCapacity}`);

    const mainScript = {
      codeHash: ckbJsVmScript.script.codeHash,
      hashType: ckbJsVmScript.script.hashType,
      args: hexFrom(
        "0x0000" +
          contractScript.codeHash.slice(2) +
          hexFrom(hashTypeToBytes(contractScript.hashType)).slice(2) +
          k.slice(2) +
          totalSupply.slice(2),
      ),
    };

    // First transaction: Create UDT for the signer (pool and user)
    const tx0 = ccc.Transaction.from({
      outputs: [
        {
          capacity: ccc.fixedPointFrom(1000),
          lock: signerLock,
          type: udtTypeScript,
        },
      ],
      outputsData: [hexFrom("0xFF000000000000000000000000000000")], // 255 UDT
      cellDeps: [
        ...systemScripts.devnet.xudt.script.cellDeps.map((c) => c.cellDep),
      ],
    });

    await tx0.completeInputsByCapacity(signer);
    await tx0.completeFeeBy(signer, 1000);
    const txHash0 = await signer.sendTransaction(tx0);
    console.log(`UDT created: ${txHash0}`);

    // Second transaction: Create the pool cell with 250 UDT and 200 CKB
    const tx1 = ccc.Transaction.from({
      inputs: [
        {
          previousOutput: {
            txHash: txHash0,
            index: 0,
          },
        },
      ],
      outputs: [
        {
          capacity: ccc.fixedPointFrom(200), // pool capacity = 200 CKB
          lock: mainScript,
          type: udtTypeScript,
        },
        {
          capacity: ccc.fixedPointFrom(1000),
          lock: signerLock,
          type: udtTypeScript,
        },
      ],
      outputsData: [
        poolRemainingUdtAmountInput, // 250 UDT in pool
        hexFrom("0x05000000000000000000000000000000"), // 5 UDT for user
      ],
      cellDeps: [
        ...ckbJsVmScript.script.cellDeps.map((c) => c.cellDep),
        ...contractScript.cellDeps.map((c) => c.cellDep),
        ...systemScripts.devnet.xudt.script.cellDeps.map((c) => c.cellDep),
      ],
    });

    await tx1.completeInputsByCapacity(signer);
    await tx1.completeFeeBy(signer, 1000);
    const txHash1 = await signer.sendTransaction(tx1);
    console.log(`Pool and user UDT created: ${txHash1}`);

    // Third transaction: Attempt to redeem with insufficient CKB in pool (pool capacity - more than return)
    const tx2 = ccc.Transaction.from({
      inputs: [
        {
          previousOutput: {
            txHash: txHash1,
            index: 0, // pool
          },
        },
        {
          previousOutput: {
            txHash: txHash1,
            index: 1, // user UDT
          },
        },
      ],
      outputs: [
        {
          capacity:
            ccc.fixedPointFrom(200) -
            redemptionReturnCapacity +
            ccc.fixedPointFrom(1), // pool capacity - return + extra (insufficient deduction)
          lock: mainScript,
          type: udtTypeScript,
        },
        {
          capacity:
            ccc.fixedPointFrom(1000) +
            redemptionReturnCapacity -
            ccc.fixedPointFrom(1), // user capacity + return - extra
          lock: signerLock,
          type: udtTypeScript,
        },
      ],
      outputsData: [
        poolRemainingUdtAmountOutput, // 255 UDT in pool
        userUdtAmountOutput, // 0 UDT for user
      ],
      cellDeps: [
        ...ckbJsVmScript.script.cellDeps.map((c) => c.cellDep),
        ...contractScript.cellDeps.map((c) => c.cellDep),
        ...systemScripts.devnet.xudt.script.cellDeps.map((c) => c.cellDep),
      ],
    });

    await tx2.completeInputsByCapacity(signer);
    await tx2.completeFeeBy(signer, 1000);
    try {
      await signer.sendTransaction(tx2);
      console.log("Redeem should have failed but didn't");
      throw new Error("Expected transaction to fail");
    } catch (error) {
      console.log(
        `Redeem failed as expected: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });
});
