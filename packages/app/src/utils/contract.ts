import { NetworkType } from "./env";
import scripts from "../deployment/scripts.json";
import systemScripts from "../deployment/system-scripts.json";
import { ccc, hashTypeToBytes, Hex, hexFrom } from "@ckb-ccc/connector-react";
import { buildClient } from "./ckbClient";
import { calculatePurchaseCost, calculateRedemptionReturn } from "./price";
import { Pool, UDT } from "../types";

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
        : scripts.testnet["bonding-curve-lock.bc"];

    this.client = buildClient(network);
  }

  async createPoolCell(
    signer: ccc.Signer,
    initialPoolCapacity: bigint,
    k: bigint,
    totalSupply: bigint
  ) {
    const kHex = ccc.hexFrom(ccc.numLeToBytes(k, 4));
    const totalSupplyHex = ccc.hexFrom(ccc.numLeToBytes(totalSupply, 16));

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
      outputsData: [ccc.hexFrom(ccc.numLeToBytes(totalSupply, 16))],
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

  async findAllPoolCells() {
    const ckbJsVmScript =
      this.network === "devnet"
        ? systemScripts.devnet["ckb_js_vm"]
        : systemScripts.testnet["ckb_js_vm"];

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
    });
    const cells = [];
    for await (const cell of cellIter) {
      cells.push(cell);
    }
    return cells;
  }

  async getPools(): Promise<Pool[]> {
    const cells = await this.findAllPoolCells();
    const pools = cells.map((cell) => {
      const { k, totalSupply } = this.parsePoolArgs(cell.cellOutput.lock.args);
      const remainingTokens = Number(ccc.numLeFromBytes(cell.outputData));
      const ckbBalance = Number(cell.cellOutput.capacity) / 10 ** 8; // Convert to CKB
      const udtTypeHash = cell.cellOutput.type!.hash();
      const creator = cell.cellOutput.type!.args; // The UDT owner

      return {
        id: `${cell.outPoint.txHash}-${cell.outPoint.index}`,
        cell,
        udtTypeHash,
        udtScript: cell.cellOutput.type!,
        k,
        totalSupply: Number(totalSupply),
        remainingTokens,
        ckbBalance,
        creator,
      };
    });
    return pools;
  }

  async getUDTs(pools: Pool[]): Promise<UDT[]> {
    const uniqueUdtTypeHashes = Array.from(
      new Set(pools.map((p) => p.udtTypeHash))
    );
    const udts = uniqueUdtTypeHashes.map((typeHash, index) => ({
      typeHash,
      name: `UDT ${typeHash.slice(2, 6)}`,
      symbol: `UDT ${typeHash.slice(2, 6)}`,
      script: pools.find((p) => p.udtTypeHash === typeHash)!.udtScript,
    }));
    return udts;
  }

  private parsePoolArgs(args: Hex): { k: number; totalSupply: bigint } {
    const argsBytes = ccc.bytesFrom(args);
    // args: 0x0000 + codeHash(32) + hashType(1) + k(4) + totalSupply(16)
    const kBytes = argsBytes.slice(2 + 32 + 1, 2 + 32 + 1 + 4);
    const totalSupplyBytes = argsBytes.slice(
      2 + 32 + 1 + 4,
      2 + 32 + 1 + 4 + 16
    );

    const k = +ccc.numLeFromBytes(kBytes).toString();
    const totalSupply = ccc.numLeFromBytes(totalSupplyBytes);
    console.log(k, totalSupply);
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
    const remainingUdt = BigInt(ccc.numLeFromBytes(poolCell.outputData));

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
        ccc.hexFrom(ccc.numLeToBytes(remainingUdt - purchaseAmount, 16)),
        ccc.hexFrom(ccc.numLeToBytes(purchaseAmount, 16)),
      ],
      cellDeps: [
        ...this.ckbJsVmScript.script.cellDeps.map((c) => c.cellDep),
        ...this.contractScript.cellDeps.map((c) => c.cellDep),
        ...this.xudtScript.script.cellDeps.map((c) => c.cellDep),
      ],
    });

    await txObj.completeInputsByCapacity(signer);
    await txObj.completeFeeBy(signer, 1000);
    return await signer.sendTransaction(txObj);
  }

  async redeem(
    signer: ccc.Signer,
    poolCell: ccc.Cell,
    redemptionAmount: bigint
  ) {
    const { k, totalSupply } = this.parsePoolArgs(
      poolCell.cellOutput.lock.args
    );
    const remainingUdt = BigInt(ccc.numLeFromBytes(poolCell.outputData));

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
        ccc.numLeToBytes(remainingUdt + redemptionAmount, 16),
        ccc.numLeToBytes(BigInt(0), 16), // assuming full redemption
      ],
      cellDeps: [
        ...this.ckbJsVmScript.script.cellDeps.map((c) => c.cellDep),
        ...this.contractScript.cellDeps.map((c) => c.cellDep),
        ...this.xudtScript.script.cellDeps.map((c) => c.cellDep),
      ],
    });

    await txObj.completeInputsByCapacity(signer);
    await txObj.completeFeeBy(signer, 1000);
    return await signer.sendTransaction(txObj);
  }
}
