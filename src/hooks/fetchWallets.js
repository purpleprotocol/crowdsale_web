import { ethers } from "ethers";
import { useEffect, useState } from "react";
import { abi } from "../config/abi";
import { hex2int } from "../utils";

const CONTRACT_ADDR = process.env.REACT_APP_CONTRACT_ADDRESS;

export default function FetchWallets() {
  const [loading, setLoading] = useState(true);
  const [hasMetaMask, setHasMetaMask] = useState(false);
  const [isMainNet, setIsMainNet] = useState(false);

  const [hasGlobalInfo, setHasGlobalInfo] = useState(true);
  const [stageGlobal, setStageGlobal] = useState(null);
  const [rateGlobal, setRateGlobal] = useState(null);
  const [totalSoldPsatsGlobal, setTotalSoldPsatsGlobal] = useState(null);
  const [totalPsatsInEscrowGlobal, setTotalPsatsInEscrowGlobal] = useState(null);
  const [tokensCapGlobal, setTokensCapGlobal] = useState(null);

  useEffect(() => {
    const fn = async () => {
      try {
        // const provider = new ethers.providers.getDefaultProvider("http://localhost:8545");
        const provider = new ethers.providers.getDefaultProvider("mainnet");
        const contract = new ethers.Contract(CONTRACT_ADDR, abi, provider);

        const cRate = await contract.rate();
        setRateGlobal(hex2int(cRate._hex));
        const cStage = await contract.getCurrentStage();
        setStageGlobal(hex2int(cStage._hex));

        const cTotalSoldPsats = await contract.totalSoldPsats();
        setTotalSoldPsatsGlobal(hex2int(cTotalSoldPsats._hex));
        const cTokensCap = await contract.tokensCap();
        setTokensCapGlobal(hex2int(cTokensCap._hex));
        const cTotalPsatsInEscrow = await contract.totalPsatsInEscrow();
        setTotalPsatsInEscrowGlobal(hex2int(cTotalPsatsInEscrow._hex));
      } catch {
        setHasGlobalInfo(false);
      }

      if (!window.ethereum) {
        setHasMetaMask(false);
        setLoading(false);
        return;
      }

      setHasMetaMask(true);
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      // setIsMainNet(parseInt(chainId.substring(2), 16) === 1);
      setIsMainNet(true);

      setLoading(false);
    };

    fn();
  }, [])

  return {
    loading,
    hasMetaMask,
    isMainNet,
    hasGlobalInfo,
    stageGlobal,
    rateGlobal,
    totalSoldPsatsGlobal,
    totalPsatsInEscrowGlobal,
    tokensCapGlobal
  };
}
