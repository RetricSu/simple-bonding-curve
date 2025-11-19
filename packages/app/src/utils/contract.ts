import { NetworkType } from "./env";
import scripts from "../deployment/scripts.json";
import systemScripts from "../deployment/system-scripts.json";
import { ccc, hashTypeToBytes, Hex, hexFrom } from "@ckb-ccc/connector-react";
import { buildClient } from "./ckbClient";
import { calculatePurchaseCost, calculateRedemptionReturn } from "./price";
import { numToLeBytes } from "./num";

export class BondingCurveContract {
  contractScript: (typeof scripts.devnet)["bonding-curve-lock.bc"];
  ckbJsVmScript: Omit<(typeof systemScripts.devnet)["ckb_js_vm"], "file">;
  xudtScript: Omit<(typeof systemScripts.devnet)["xudt"], "file">;

  client: ccc.Client;
  network: NetworkType;

  constructor(network: NetworkType) {
    this.network = network;

    this.ckbJsVmScript =
      this.network === "devnet"
        ? systemScripts.devnet["ckb_js_vm"]
        : systemScripts.testnet["ckb_js_vm"];
    this.xudtScript =
      this.network === "devnet"
        ? systemScripts.devnet.xudt
        : systemScripts.testnet.xudt;
    this.contractScript =
      network === "devnet"
        ? scripts.devnet["bonding-curve-lock.bc"]
        : scripts.devnet["bonding-curve-lock.bc"]!; // todo: use testnet when available

    this.client = buildClient(network);
  }

  async createPoolCell(
    signer: ccc.Signer,
    initialPoolCapacity: bigint,
    k: bigint,
    totalSupply: bigint
  ) {
    const kHex = numToLeBytes(k, 4);
    const totalSupplyHex = numToLeBytes(totalSupply, 16);

    const args = ccc.hexFrom(
      "0x0000" +
        this.contractScript.codeHash.slice(2) +
        ccc
          .hexFrom(ccc.hashTypeToBytes(this.contractScript.hashType))
          .slice(2) +
        kHex.slice(2) +
        totalSupplyHex.slice(2)
    );

    const mainScript = {
      codeHash: this.ckbJsVmScript.script.codeHash,
      hashType: this.ckbJsVmScript.script.hashType,
      args,
    };

    const signerAddressObj = await signer.getRecommendedAddressObj();
    const signerLock = signerAddressObj.script;
    const udtTypeScript = {
      codeHash: systemScripts.devnet.xudt.script.codeHash,
      hashType: systemScripts.devnet.xudt.script.hashType,
      args: signerLock.hash(), // XUDT owner is the signer
    };

    const txObj = ccc.Transaction.from({
      outputs: [
        {
          capacity: ccc.fixedPointFrom(initialPoolCapacity),
          lock: mainScript,
          type: udtTypeScript,
        },
      ],
      outputsData: [numToLeBytes(totalSupply, 16)],
      cellDeps: [
        ...this.ckbJsVmScript.script.cellDeps.map((c) => c.cellDep),
        ...this.contractScript.cellDeps.map((c) => c.cellDep),
        ...this.xudtScript.script.cellDeps.map((c) => c.cellDep),
      ],
    });

    await txObj.completeInputsAll(signer);
    await txObj.completeFeeBy(signer, 1000);
    return signer.sendTransaction(txObj);
  }

  async findPoolCells(udtArgs: Hex) {
    const ckbJsVmScript =
      this.network === "devnet"
        ? systemScripts.devnet["ckb_js_vm"]
        : systemScripts.testnet["ckb_js_vm"];

    const udtTypeScript = {
      codeHash: systemScripts.devnet.xudt.script.codeHash,
      hashType: systemScripts.devnet.xudt.script.hashType,
      args: udtArgs, // XUDT owner is the signer
    };

    const mainScript = {
      codeHash: ckbJsVmScript.script.codeHash,
      hashType: ckbJsVmScript.script.hashType,
      args: hexFrom(
        "0x0000" +
          this.contractScript.codeHash.slice(2) +
          hexFrom(hashTypeToBytes(this.contractScript.hashType)).slice(2)
      ),
    };

    const cellIter = this.client.findCells({
      script: mainScript,
      scriptType: "lock",
      scriptSearchMode: "prefix",
      filter: {
        script: udtTypeScript,
      },
    });
    const cells = [];
    for await (const cell of cellIter) {
      cells.push(cell);
    }
    return cells;
  }

  private parsePoolArgs(args: Hex): { k: number; totalSupply: bigint } {
    // args: 0x0000 + codeHash(32) + hashType(1) + k(4) + totalSupply(16)
    const argsBytes = ccc.bytesFrom(args);
    const kBytes = argsBytes.slice(2 + 32 + 1, 2 + 32 + 1 + 4);
    const totalSupplyBytes = argsBytes.slice(
      2 + 32 + 1 + 4,
      2 + 32 + 1 + 4 + 16
    );

    const k = new DataView(kBytes.buffer).getUint32(0, true);
    const totalSupply =
      new DataView(totalSupplyBytes.buffer).getBigUint64(0, true) |
      (new DataView(totalSupplyBytes.buffer).getBigUint64(8, true) <<
        BigInt(64));

    return { k, totalSupply };
  }

  async purchase(
    signer: ccc.Signer,
    poolCell: ccc.Cell,
    purchaseAmount: bigint
  ) {
    const { k, totalSupply } = this.parsePoolArgs(
      poolCell.cellOutput.lock.args
    );
    const remainingUdt = BigInt(ccc.hexFrom(poolCell.outputData));

    const cost = calculatePurchaseCost(
      Number(purchaseAmount),
      Number(remainingUdt),
      Number(totalSupply),
      k
    );
    const costCapacity = BigInt(Math.ceil(cost * 10 ** 8));

    const signerAddressObj = await signer.getRecommendedAddressObj();
    const signerLock = signerAddressObj.script;

    const udtTypeScript = poolCell.cellOutput.type!;

    const txObj = ccc.Transaction.from({
      inputs: [poolCell],
      outputs: [
        {
          capacity:
            poolCell.cellOutput.capacity + ccc.fixedPointFrom(costCapacity),
          lock: poolCell.cellOutput.lock,
          type: udtTypeScript,
        },
        {
          lock: signerLock,
          type: udtTypeScript,
        },
      ],
      outputsData: [
        numToLeBytes(remainingUdt - purchaseAmount, 16),
        numToLeBytes(purchaseAmount, 16),
      ],
      cellDeps: [
        ...this.ckbJsVmScript.script.cellDeps.map((c) => c.cellDep),
        ...this.contractScript.cellDeps.map((c) => c.cellDep),
        ...this.xudtScript.script.cellDeps.map((c) => c.cellDep),
      ],
    });

    await txObj.completeInputsByCapacity(signer);
    await txObj.completeFeeBy(signer, 1000);
    return signer.sendTransaction(txObj);
  }

  async redeem(
    signer: ccc.Signer,
    poolCell: ccc.Cell,
    redemptionAmount: bigint
  ) {
    const { k, totalSupply } = this.parsePoolArgs(
      poolCell.cellOutput.lock.args
    );
    const remainingUdt = BigInt(ccc.hexFrom(poolCell.outputData));

    const ret = calculateRedemptionReturn(
      Number(redemptionAmount),
      Number(remainingUdt),
      Number(totalSupply),
      k
    );
    const retCapacity = BigInt(Math.ceil(ret * 10 ** 8));

    const signerAddressObj = await signer.getRecommendedAddressObj();
    const signerLock = signerAddressObj.script;

    const udtTypeScript = poolCell.cellOutput.type!;

    // Find user's UDT cell
    const userUdtCells = await this.client.findCells({
      script: udtTypeScript,
      scriptType: "type",
      scriptSearchMode: "exact",
      filter: {
        script: signerLock,
      },
    });
    const userUdtCellIter = userUdtCells[Symbol.asyncIterator]();
    const userUdtCell = await userUdtCellIter.next();
    if (userUdtCell.done) {
      throw new Error("User UDT cell not found");
    }

    const txObj = ccc.Transaction.from({
      inputs: [poolCell, userUdtCell.value],
      outputs: [
        {
          capacity:
            poolCell.cellOutput.capacity - ccc.fixedPointFrom(retCapacity),
          lock: poolCell.cellOutput.lock,
          type: udtTypeScript,
        },
        {
          capacity:
            userUdtCell.value.cellOutput.capacity +
            ccc.fixedPointFrom(retCapacity),
          lock: signerLock,
          type: udtTypeScript,
        },
      ],
      outputsData: [
        numToLeBytes(remainingUdt + redemptionAmount, 16),
        numToLeBytes(BigInt(0), 16), // assuming full redemption
      ],
      cellDeps: [
        ...this.ckbJsVmScript.script.cellDeps.map((c) => c.cellDep),
        ...this.contractScript.cellDeps.map((c) => c.cellDep),
        ...this.xudtScript.script.cellDeps.map((c) => c.cellDep),
      ],
    });

    await txObj.completeInputsByCapacity(signer);
    await txObj.completeFeeBy(signer, 1000);
    return signer.sendTransaction(txObj);
  }
}
