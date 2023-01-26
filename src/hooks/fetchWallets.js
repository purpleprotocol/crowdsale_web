import { useEffect, useState } from "react";

export default function FetchWallets() {
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [wallets, setWallets] = useState(null);
  const [hasMetaMask, setHasMetaMask] = useState(false);
  const [isMainNet, setIsMainNet] = useState(false);

  useEffect(() => {
    const fn = async () => {
      if (!window.ethereum) {
        setHasMetaMask(false);
        setLoading(false);
        return;
      }

      setHasMetaMask(true);
      setIsMainNet(parseInt(window.ethereum.chainId.substring(2), 16) === 1);

      try {
        const res = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setWallets(res);
        setWallet(res[0]);

        if (res[0]) {
          const b = await window.ethereum.request({ method: 'eth_getBalance', params: [res[0], 'latest'] });
          setBalance(parseInt(b.substring(2), 16) / 1000000000000000000);
        }
      } finally {
        setLoading(false);
      }
    };

    fn();
  }, [])

  return {
    loading,
    wallet,
    wallets,
    hasMetaMask,
    balance,
    isMainNet
  };
}
