import { ccc } from "@ckb-ccc/connector-react";
import { useState, useEffect, useCallback } from "react";

export function useBalance() {
  const signer = ccc.useSigner();

  const [balance, setBalance] = useState<string>("");
  const [address, setAddress] = useState<string>("");

  useEffect(() => {
    if (!signer) {
      return;
    }

    (async () => {
      const addr = await signer.getRecommendedAddress();
      setAddress(addr);
    })();

    (async () => {
      const capacity = await signer.getBalance();
      setBalance(ccc.fixedPointToString(capacity));
    })();

    return () => {};
  }, [signer]);

  const getUdtBalance = useCallback(
    async (udt: ccc.Script) => {
      if (!signer) return BigInt(0);
      const lockScript = (await signer.getRecommendedAddressObj())?.script;

      const cellIter = signer.client.findCells({
        script: udt,
        scriptType: "type",
        scriptSearchMode: "prefix",
        filter: {
          script: lockScript,
        },
      });
      const cells = [];
      for await (const cell of cellIter) {
        cells.push(cell);
      }
      const balance = cells.reduce(
        (sum, c) => ccc.numLeFromBytes(c.outputData) + sum,
        BigInt(0)
      );
      return balance;
    },
    [signer]
  );
  return { balance, address, getUdtBalance };
}
