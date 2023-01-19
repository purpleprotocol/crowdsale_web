import { useEffect, useState } from "react";

export default function FetchWallets() {
  const [wallet, setWallet] = useState(null);
  const [wallets, setWallets] = useState(null);
  const [hasMetaMask, setHasMetaMask] = useState(false);

  useEffect(() => {
    if (window.ethereum) {
      setHasMetaMask(true);
    }
  }, [])

  return {
    wallet,
    setWallet,
    wallets,
    setWallets,
    hasMetaMask,
  };
}
