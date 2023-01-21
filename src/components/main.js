import { useContext, useEffect, useState } from "react";
import { Button, Input, Progress, Segment, Statistic } from "semantic-ui-react";
import { WalletContext } from "../hooks/walletContext";
import axios from 'axios';
import { ethers } from "ethers";
import Verification from "./verification";
import { keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { abi } from "../config/abi";

const API_URL = process.env.REACT_APP_API;
const CONTRACT_ADDR = process.env.REACT_APP_CONTRACT_ADDRESS;

const GNOSIS_SAFE_ADDR = process.env.REACT_APP_GNOSIS_SAFE_ADDRESS;
const GNOSIS_PROXY_ADDR = process.env.REACT_APP_GNOSIS_PROXY_ADDRESS;

const KYC_STATE = {
  NotVerified: 'NotVerified',
  Started: 'Started',
  Pending: 'Pending',
  VerifiedRequiresAuthorisation: 'VerifiedRequiresAuthorisation',
  Verified: 'Verified'
};
const STATE = {
  Undefined: -1,
  Initial: 0,
  VerificationRequired: 1,
  VerificationPending: 2,
  VerificationDonePendingTransaction: 3,
  Authorised: 4
};
const STAGE_NAME = {
  0: "Pre-sale (-66% off)",
  1: "Early Bird (-33% off)",
  2: "Public Sale"
};

export default function Main() {
  // Wallet of the buyer
  const { wallet } = useContext(WalletContext);

  // SmartContract
  const [contract, setContract] = useState(null);
  const [totalSoldPsats, setTotalSoldPsats] = useState(null);
  const [totalPsatsInEscrow, setTotalPsatsInEscrow] = useState(null);
  const [tokensCap, setTokensCap] = useState(null);
  const [rate, setRate] = useState(null);
  const [stage, setStage] = useState(null);
  const [balance, setBalance] = useState(null);
  const [pendingBalance, setPendingBalance] = useState(null);
  const [individualTokensCap, setIndividualTokensCap] = useState(null);
  const [transactionHash, setTransactionHash] = useState(null);

  // Authentication
  const [jwt, setJwt] = useState(null);

  const [loading, setLoading] = useState(true);
  const [state, setState] = useState(STATE.Undefined);
  const [error, setError] = useState(null);
  const [invalid, setInvalid] = useState(true);
  const [changed, setChanged] = useState(false);
  const [flag, setFlag] = useState(0);

  const getEthMessage = message => {
    return keccak256(toUtf8Bytes(`\x19Ethereum Signed Message:\n${message.length}${message}`));
  }

  const hexToBytes = hex => {
    const bytes = [];
    for (let c = 2, l = hex.length; c < l; c += 2) { bytes.push(parseInt(hex.substr(c, 2), 16)) }

    return bytes;
  }

  const hex2a = hexx => {
    let hex = hexx.toString(), str = '';
    for (let i = 0, l = hex.length; i < l; i += 2) { str += String.fromCharCode(parseInt(hex.substr(i, 2), 16)) }

    return str;
  }

  const hexToInt = (hex) => {
    return parseInt(hex.substring(2), 16);
  }

  const auth = async () => {
    try {
      const nonce = await axios.post(API_URL + `/auth/request_nonce/${wallet}`);
      const message = nonce.data.message;
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const eth = getEthMessage(message);
      const bytes = hexToBytes(eth);
      const signature = await signer._legacySignMessage(bytes);

      const resp = await axios.post(API_URL + `/auth/request_jwt/${message}/${signature.substring(2)}`);
      const respHex = resp.data.jwt.split('.')[0];
      const json = hex2a(respHex);

      const parsed = JSON.parse(json);
      setJwt(parsed);
      return parsed;
    } catch (e) {
      setError("Authentication error. Please try again.");
      console.log(e);
      return undefined;
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const ctr = new ethers.Contract(CONTRACT_ADDR, abi, signer);
        setContract(ctr);

        const cPending = await ctr.pending(wallet);
        const cAuthorised = await ctr.kyc_authorised(wallet);

        const cTotalSoldPsats = await ctr.totalSoldPsats();
        setTotalSoldPsats(hexToInt(cTotalSoldPsats._hex));
        const cTokensCap = await ctr.tokensCap();
        setTokensCap(hexToInt(cTokensCap._hex));
        const cTotalPsatsInEscrow = await ctr.totalPsatsInEscrow();
        setTotalPsatsInEscrow(hexToInt(cTotalPsatsInEscrow._hex));

        const cRate = await ctr.rate();
        setRate(hexToInt(cRate._hex));
        const cStage = await ctr.getCurrentStage();
        setStage(hexToInt(cStage._hex));
        const cIndividualTokensCap = await ctr.individualTokensCap();
        setIndividualTokensCap(hexToInt(cIndividualTokensCap._hex));

        if (!cPending && !cAuthorised) {
          setState(STATE.Initial);
        } else if (cPending && !cAuthorised) {
          const cBalance = await ctr.balanceOf(wallet);
          setBalance(hexToInt(cBalance._hex));

          const authState = await auth();
          if (authState) {
            switch (authState.kyc_state) {
              case KYC_STATE.NotVerified:
                const cPendingBalance1 = await ctr.pending_psats(wallet);
                setPendingBalance(hexToInt(cPendingBalance1._hex));
                setState(STATE.VerificationRequired);
                break;
              case KYC_STATE.Started:
              case KYC_STATE.Pending:
                const cPendingBalance2 = await ctr.pending_psats(wallet);
                setPendingBalance(hexToInt(cPendingBalance2._hex));
                setState(STATE.VerificationPending);
                break;
              case KYC_STATE.VerifiedRequiresAuthorisation:
                const cPendingBalance3 = await ctr.pending_psats(wallet);
                setPendingBalance(hexToInt(cPendingBalance3._hex));
                setState(STATE.VerificationDonePendingTransaction);
                break;
              case KYC_STATE.Verified:
                setState(STATE.Authorised);
                break;
              default:
                break;
            }
          } else {
            // error occured, just display it
          }
        } else if (!cPending && cAuthorised) {
          const cBalance = await ctr.balanceOf(wallet);
          setBalance(hexToInt(cBalance._hex));
          setState(STATE.Authorised);
        }
      } catch (e) {
        setError("Error communicating with the smart contract. Please try again.");
        console.log(e);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line
  }, [flag]);

  const onBuyCoins = async () => {
    try {
      const access_list = [
        {
          address: wallet,
          storageKeys: ["0x0000000000000000000000000000000000000000000000000000000000000000"]
        },
        {
          address: GNOSIS_SAFE_ADDR,
          storageKeys: ["0x0000000000000000000000000000000000000000000000000000000000000000"]
        },
        {
          address: GNOSIS_PROXY_ADDR,
          storageKeys: []
        }
      ];

      const cResult = await contract.buyTokens(wallet, { value: ethers.utils.parseEther(document.getElementById("eth").value) });
      console.log(cResult);

      const txHash = cResult.hash;
      setTransactionHash(txHash);
      const scan = new ethers.providers.EtherscanProvider();

      let interval = setInterval(async () => {
        try {
          const resp = await scan.getTransaction(txHash);
          console.log(resp);
          if (resp && resp.confirmations >= 15) {
            clearInterval(interval);
            setFlag(flag + 1);
          }
        } catch (e) {
          // setError("Checking transaction state failed. Refresh the page to change the state.");
          console.log(e);
        }
      }, 5000);

      setError(null);
    } catch (e) {
      setError('Buy coins failed. Please try again.');
    }
  }

  const onEthChange = e => {
    const val = parseFloat(e.target.value);
    if (val < 0.25 || val > (individualTokensCap - balance - pendingBalance) / rate * (3 - stage) / 1000000000000000000) {
      setInvalid(true);
    } else {
      document.getElementById("xpu").value = val * rate * (3 - stage);
      setInvalid(false);
    }
    setChanged(true);
  }

  const onXPUChange = e => {
    const val = parseFloat(e.target.value);
    if (val < 0.25 * rate * (3 - stage) || val > (individualTokensCap - balance - pendingBalance) / 1000000000000000000) {
      setInvalid(true);
    } else {
      document.getElementById("eth").value = parseFloat(e.target.value) / (rate * (3 - stage));
      setInvalid(false);
    }
    setChanged(true);
  }

  if (loading) {
    return <></>;
  }

  return <>
    <h1 className="hero-title">Buy Purplecoins in {STAGE_NAME[stage]}</h1>
    <div className="sale-progress">
      <Progress color="purple" percent={Math.min(totalSoldPsats + totalPsatsInEscrow, tokensCap / 3) / (tokensCap / 3) * 100} size='small'>
        <span><b>Stage:</b> {STAGE_NAME[0]}</span>
      </Progress>
      <Progress color="purple" percent={Math.max(totalSoldPsats + totalPsatsInEscrow - Math.min(totalSoldPsats + totalPsatsInEscrow, tokensCap / 3), 0) / (tokensCap / 3) * 100} size='small'>
        <span><b>Stage:</b> {STAGE_NAME[1]}</span>
      </Progress>
      <Progress color="purple" percent={Math.max(totalSoldPsats + totalPsatsInEscrow - Math.min(totalSoldPsats + totalPsatsInEscrow, (tokensCap / 3) * 2), 0) / (tokensCap / 3) * 100} size='small'>
        <span><b>Stage:</b> {STAGE_NAME[2]}</span>
      </Progress>
    </div>

    {(state === STATE.Initial || state === STATE.Authorised) && <>
      <Statistic.Group size="mini" widths='two'>
        <Statistic size="mini">
          <Statistic.Value>1 ETH = {rate * (3 - stage)} XPU</Statistic.Value>
          <Statistic.Label>Current rate</Statistic.Label>
        </Statistic>
        <Statistic size="mini">
          <Statistic.Value>{balance / 1000000000000000000} XPU</Statistic.Value>
          <Statistic.Label>Current balance</Statistic.Label>
        </Statistic>
      </Statistic.Group>

      <Segment className="segment-box-vertical">
        <div className="buy-coins">
          <div className="buy-coins-inputs">
            <Input error={invalid && changed} id="eth" placeholder='0.25' onChange={onEthChange} labelPosition="right" label="ETH" type="number" min="0.25" max={(individualTokensCap - balance - pendingBalance) / rate * (3 - stage) / 1000000000000000000} />
            <Input error={invalid && changed} id="xpu" placeholder={0.25 * rate * (3 - stage)} onChange={onXPUChange} labelPosition="right" label="XPU" type="number" min={0.25 * rate * (3 - stage)} max={(individualTokensCap - balance - pendingBalance) / 1000000000000000000} />
          </div>
          <div className="buy-coins-button">
            <Button fluid disabled={invalid} color="purple" onClick={onBuyCoins}>Purchase coins</Button>
          </div>

          {transactionHash && <>Pending transaction: <a href={"https://etherscan.io/tx/" + transactionHash} target="_blank" rel="noreferrer">{transactionHash}</a></>}
          {invalid && changed && <div className="buy-coins-message">
            There is a 50k XPU cap per person. You already bought {balance / 1000000000000000000}, and have {(individualTokensCap - balance - pendingBalance) / 1000000000000000000} left you can buy.
          </div>}
        </div>
      </Segment>

      <div className="disclaimer">By purchasing Purplecoins, you declare to have read and understood the <a href="https://purplecoin.io/tsa" target="_blank" rel="noreferrer">Token Sale Agreement</a></div>
    </>}

    {state === STATE.VerificationRequired && <>
      <Statistic.Group size="mini" widths='two'>
        <Statistic size="mini">
          <Statistic.Value>1 ETH = {rate * (3 - stage)} XPU</Statistic.Value>
          <Statistic.Label>Current rate</Statistic.Label>
        </Statistic>
        <Statistic size="mini">
          <Statistic.Value>{pendingBalance / 1000000000000000000} XPU</Statistic.Value>
          <Statistic.Label>Current balance</Statistic.Label>
        </Statistic>
      </Statistic.Group>

      <div className="disclaimer center"><h3>Thank you for your purchase. The next step is to verify your identity. <br />Please do so in the following 2 weeks to finalise your purchase.</h3></div>

      <Segment className="segment-box-vertical" >
        <span>Account verification status: <b>{jwt.kyc_state}</b></span>
        <Verification jwt={jwt} />
      </Segment>
    </>}

    {state === STATE.VerificationPending && <>
      The KYC verification is ongoing. As soon as it's done, buying more coins will be possible.
    </>}

    {state === STATE.VerificationDonePendingTransaction && <>
      The KYC verification is complete. We are still processing the request.
    </>}

    {error && <div className="error"> {error} </div>}
  </>
}
