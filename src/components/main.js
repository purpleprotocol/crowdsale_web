import { useContext, useEffect, useState } from "react";
import { Button, Dimmer, Divider, Input, Loader, Progress, Segment, Statistic } from "semantic-ui-react";
import { WalletContext } from "../hooks/walletContext";
import axios from 'axios';
import { ethers } from "ethers";
import Verification from "./verification";
import { abi } from "../config/abi";
import Decimal from "decimal.js";
import { hex2int, hex2a } from "../utils";

import { API_URL, CONTRACT_ADDR, DENOM, STAGES_NO, CONFIRMATIONS_NO, POLL_RATE, KYC_STATE, STATE, STAGE_NAME } from "../consts";

export default function Main() {
  Decimal.set({
    rounding: 8
  });

  // Wallet of the buyer
  const { wallet } = useContext(WalletContext);

  // SmartContract
  const [contract, setContract] = useState(null);
  const [totalSoldPsats, setTotalSoldPsats] = useState(null);
  const [totalPsatsInEscrow, setTotalPsatsInEscrow] = useState(null);
  const [tokensCap, setTokensCap] = useState(null);
  const [rate, setRate] = useState(null);
  const [stage, setStage] = useState(null);
  const [balance, setBalance] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [individualTokensCap, setIndividualTokensCap] = useState(null);
  const [transactionHash, setTransactionHash] = useState(null);
  const [minBuy, setMinBuy] = useState(null);
  const [confirmations, setConfirmations] = useState(0);

  const [walletBalance, setWalletBalance] = useState(null);
  const [eth, setETH] = useState(null);
  const [xpu, setXPU] = useState(null);
  const [hasFunds, setHasFunds] = useState(null);

  // Authentication
  const [jwt, setJwt] = useState(null);

  const [loading, setLoading] = useState(true);
  const [state, setState] = useState(STATE.Undefined);
  const [error, setError] = useState(null);
  const [invalid, setInvalid] = useState(false);
  const [changed, setChanged] = useState(false);

  // const getEthMessage = message => {
  //   return keccak256(toUtf8Bytes(`\x19Ethereum Signed Message:\n${message.length}${message}`));
  // }

  // const hexToBytes = hex => {
  //   const bytes = [];
  //   for (let c = 2, l = hex.length; c < l; c += 2) { bytes.push(parseInt(hex.substr(c, 2), 16)) }

  //   return bytes;
  // }

  const auth = async (light = true) => {
    try {
      const ls = localStorage.getItem(wallet);
      if (ls) {
        const item = JSON.parse(ls);
        const id = item.user_id || item.id;
        if (typeof id === "string") {
          try {
            const r = await axios.post(API_URL + `/users/${id}`);
            localStorage.setItem(wallet, JSON.stringify(r.data));
            setJwt(r.data);
            return r.data;
          } catch { }
        }
      }

      if (light) { return {} }

      const nonce = await axios.post(API_URL + `/auth/request_nonce/${wallet}`);
      const message = nonce.data.message;
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const signature = await signer.signMessage(message);

      const resp = await axios.post(API_URL + `/auth/request_jwt/${message}/${signature.substring(2)}`);
      const respHex = resp.data.jwt.split('.')[0];
      const json = hex2a(respHex);

      const parsed = JSON.parse(json);
      setJwt(parsed);
      localStorage.setItem(wallet, json);
      return parsed;
    } catch (e) {
      setError("Authentication error. Please try again.");
      console.log(e);
      return {};
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const ctr = new ethers.Contract(CONTRACT_ADDR, abi, signer);
        setContract(ctr);

        const wBalance = await provider.getBalance(wallet);
        const wBalanceConv = new Decimal(hex2int(wBalance._hex)).div(DENOM);
        setWalletBalance(wBalanceConv);

        // const cMinBuy = await ctr.minBuy();
        // const convMinBuy = new Decimal(hex2int(cMinBuy._hex)).div(DENOM);
        const convMinBuy = new Decimal(0.01);
        setMinBuy(convMinBuy);

        setHasFunds(wBalanceConv.comparedTo(convMinBuy) === 1);

        const cPending = await ctr.pending(wallet);
        const cAuthorised = await ctr.kyc_authorised(wallet);

        const cTotalSoldPsats = await ctr.totalSoldPsats();
        setTotalSoldPsats(hex2int(cTotalSoldPsats._hex));
        const cTokensCap = await ctr.tokensCap();
        setTokensCap(hex2int(cTokensCap._hex));
        const cTotalPsatsInEscrow = await ctr.totalPsatsInEscrow();
        setTotalPsatsInEscrow(hex2int(cTotalPsatsInEscrow._hex));

        const cRate = await ctr.rate();
        const convRate = hex2int(cRate._hex);
        setRate(convRate);
        const cStage = await ctr.getCurrentStage();
        const convStage = hex2int(cStage._hex);
        setStage(convStage);

        setETH(convMinBuy);
        setXPU(convMinBuy.mul(convRate).mul(STAGES_NO - convStage));

        const cIndividualTokensCap = await ctr.individualTokensCap();
        setIndividualTokensCap(hex2int(cIndividualTokensCap._hex));

        const authState = await auth(!cPending && !cAuthorised);

        // authState.kyc_state = KYC_STATE.NotVerified;

        if (authState.kyc_state === KYC_STATE.Rejected) {
          const cPendingBalance4 = await ctr.pending_psats(wallet);
          setPendingBalance(hex2int(cPendingBalance4._hex));
          setState(STATE.Rejected);
          return;
        }

        const cBalance = await ctr.balanceOf(wallet);
        setBalance(hex2int(cBalance._hex));

        if (!cPending && !cAuthorised) {
          setState(STATE.Initial);
        } else if (cPending && !cAuthorised) {
          if (authState) {
            switch (authState.kyc_state) {
              case KYC_STATE.NotVerified:
                const cPendingBalance1 = await ctr.pending_psats(wallet);
                setPendingBalance(hex2int(cPendingBalance1._hex));
                setState(STATE.VerificationRequired);
                break;
              case KYC_STATE.Started:
              case KYC_STATE.Pending:
                const cPendingBalance2 = await ctr.pending_psats(wallet);
                setPendingBalance(hex2int(cPendingBalance2._hex));
                setState(STATE.VerificationPending);
                break;
              case KYC_STATE.VerifiedRequiresAuthorisation:
                const cPendingBalance3 = await ctr.pending_psats(wallet);
                setPendingBalance(hex2int(cPendingBalance3._hex));
                setState(STATE.VerificationDonePendingTransaction);
                break;
              case KYC_STATE.Verified:
                setState(STATE.Authorised);
                break;
              // case KYC_STATE.Rejected:
              //   const cPendingBalance4 = await ctr.pending_psats(wallet);
              //   setPendingBalance(hex2int(cPendingBalance4._hex));
              //   setState(STATE.Rejected);
              //   break;
              default:
                break;
            }
          } else {
            // error occured, just display it
          }
        } else if (!cPending && cAuthorised) {
          setState(STATE.Authorised);
        }
      } catch (e) {
        setError("Error communicating with the smart contract. Make sure the MetaMask wallet is connected and selected properly.");
        console.log(e);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line
  }, []);

  const onBuyCoins = async () => {
    try {
      const amount = eth.toString();
      const cResult = await contract.buyTokens(wallet, { value: ethers.utils.parseEther(amount) });
      console.log(cResult);

      const txHash = cResult.hash;
      setTransactionHash(txHash);
      const scan = new ethers.providers.EtherscanProvider();

      let interval = setInterval(async () => {
        try {
          const resp = await scan.getTransaction(txHash);
          if (resp) {
            if (resp.confirmations >= CONFIRMATIONS_NO) {
              clearInterval(interval);
              window.location.reload();
            } else {
              setConfirmations(resp.confirmations);
            }
          }
        } catch (e) {
          console.log(e);
        }
      }, POLL_RATE);

      setError(null);
    } catch (e) {
      setError('Buy coins failed. Please try again.');
    }
  }

  const onRefund = async () => {
    try {
      const cResult = await contract.cancelPurchaseFor(wallet);
      console.log(cResult);

      const txHash = cResult.hash;
      setTransactionHash(txHash);
      const scan = new ethers.providers.EtherscanProvider();

      let interval = setInterval(async () => {
        try {
          const resp = await scan.getTransaction(txHash);
          if (resp) {
            if (resp.confirmations >= CONFIRMATIONS_NO) {
              clearInterval(interval);
              window.location.reload();
            } else {
              setConfirmations(resp.confirmations);
            }
          }
        } catch (e) {
          console.log(e);
        }
      }, POLL_RATE);

      setError(null);
    } catch (e) {
      setError('Refund coins failed. Please try again.');
    }
  }

  const onEthFocus = e => {
    e.target.closest(".ui.input").style.display = "none";
    const input = document.getElementById("eth-input");
    input.value = eth.toString();
    input.closest(".ui.input").style.display = "inline-flex";
    input.focus();
  }

  const onEthBlur = e => {
    e.target.closest(".ui.input").style.display = "none";
    const display = document.getElementById("eth-display");
    display.closest(".ui.input").style.display = "inline-flex";
  }

  const onEthChange = e => {
    const val = new Decimal(e.target.value === "" ? 0 : e.target.value);
    const lt = minBuy;
    const gt = new Decimal((individualTokensCap - balance - pendingBalance) / DENOM).div(rate).div(STAGES_NO - stage);

    if (val.comparedTo(lt) === -1 || val.comparedTo(gt) === 1) {
      setInvalid(true);

      if (!eth || val.comparedTo(eth) !== 0) setETH(val);
      setXPU(val.mul(rate).mul(3 - stage));
    } else {
      if (!eth || val.comparedTo(eth) !== 0) setETH(val);
      setXPU(val.mul(rate).mul(3 - stage));

      setInvalid(false);
    }

    setChanged(true);
  }

  const onVeriffFinished = () => {
    setState(STATE.VerificationFinishedOnClient);
  }

  if (loading) {
    return <></>;
  }

  if (transactionHash) {
    return <>
      <Dimmer active inverted>
        <Loader inverted size="huge">
          <h2>Please wait for the transaction to confirm and don't close the tab</h2>
          View on Etherscan: <a href={"https://etherscan.io/tx/" + transactionHash} target="_blank" rel="noreferrer">{transactionHash}</a><br />
          Confirmations: {confirmations} out of {CONFIRMATIONS_NO}
        </Loader>
      </Dimmer>
    </>;
  }

  return <>
    <h1 className="hero-title">Buy Purplecoins in {STAGE_NAME[stage]}</h1>
    <div className="sale-progress">
      <Progress color="purple" percent={Math.min(totalSoldPsats + totalPsatsInEscrow, tokensCap / STAGES_NO) / (tokensCap / STAGES_NO) * 100} size='small'>
        <span><b>Stage:</b> {STAGE_NAME[0]}</span>
      </Progress>
      <Progress color="purple" percent={Math.max(totalSoldPsats + totalPsatsInEscrow - Math.min(totalSoldPsats + totalPsatsInEscrow, tokensCap / STAGES_NO), 0) / (tokensCap / STAGES_NO) * 100} size='small'>
        <span><b>Stage:</b> {STAGE_NAME[1]}</span>
      </Progress>
      <Progress color="purple" percent={Math.max(totalSoldPsats + totalPsatsInEscrow - Math.min(totalSoldPsats + totalPsatsInEscrow, (tokensCap / STAGES_NO) * 2), 0) / (tokensCap / STAGES_NO) * 100} size='small'>
        <span><b>Stage:</b> {STAGE_NAME[2]}</span>
      </Progress>
    </div>

    {(state === STATE.Initial || state === STATE.Authorised) && <>
      <Statistic.Group size="mini" widths='two'>
        <Statistic size="mini">
          <Statistic.Value>1 ETH = {rate * (STAGES_NO - stage)} XPU</Statistic.Value>
          <Statistic.Label>Current rate</Statistic.Label>
        </Statistic>
        <Statistic size="mini">
          <Statistic.Value>{balance / DENOM} XPU</Statistic.Value>
          <Statistic.Label>Current balance</Statistic.Label>
        </Statistic>
      </Statistic.Group>

      <Segment className="segment-box-vertical">
        <div className="buy-coins">

          <div className="buy-coins-inputs">
            <div id="eth">
              <Input id="eth-display" error={invalid && changed} value={eth} onFocus={onEthFocus} placeholder={minBuy} labelPosition="right" label="ETH" type="number" min={minBuy} max={(individualTokensCap - balance - pendingBalance) / rate / (3 - stage) / DENOM} />
              <Input id="eth-input" style={{ display: "none" }} error={invalid && changed} placeholder={minBuy} onChange={onEthChange} onBlur={onEthBlur} labelPosition="right" label="ETH" type="number" min={minBuy} max={(individualTokensCap - balance - pendingBalance) / rate / (3 - stage) / DENOM} />
            </div>

            <Input error={invalid && changed} id="xpu" disabled={true} value={xpu} placeholder={minBuy.mul(rate).mul(3 - stage)} labelPosition="right" label="XPU" type="number" />
          </div>
          {hasFunds && <div className="buy-coins-button">
            <Button fluid disabled={invalid} color="purple" onClick={onBuyCoins}>Purchase coins</Button>
          </div>}

          {transactionHash && <>Pending transaction: <a href={"https://etherscan.io/tx/" + transactionHash} target="_blank" rel="noreferrer">{transactionHash}</a></>}
          {invalid && changed && <div className="buy-coins-message">
            There is a <b>{Number(new Decimal(individualTokensCap).div(DENOM).toString()).toLocaleString()} XPU</b> cap per person. Minimum purchase: <b>{minBuy.toString()} ETH</b><br /> You already bought <b>{new Decimal(balance).div(DENOM).toString()} XPU</b>, and have <b>{Number(new Decimal(individualTokensCap).sub(balance || 0).sub(pendingBalance || 0).div(DENOM).toString()).toLocaleString()} XPU</b> left you can buy.
          </div>}
          {invalid && <Divider />}
          <div className="balances">
            {!hasFunds && <div>
              Not enough funds (<b>{walletBalance.toString()} ETH</b>). You need to deposit <b>{minBuy.sub(walletBalance).toString()} ETH</b> to your wallet to participate
            </div>}

            {hasFunds && <div className="funds">
              <div>Total wallet balance: <b>{walletBalance.toString()} ETH</b></div>
              <div>Available for purchase: <b>{walletBalance.comparedTo(new Decimal((individualTokensCap - balance - pendingBalance) / DENOM).div(rate).div(STAGES_NO - stage)) === -1 ? walletBalance.toString() : new Decimal((individualTokensCap - balance - pendingBalance) / DENOM).div(rate).div(STAGES_NO - stage).toString()} ETH</b></div>
            </div>}
          </div>
        </div>
      </Segment>

      <div className="disclaimer">By purchasing Purplecoins, you declare to have read, understood, and agreed to the <a href="https://purplecoin.io/tsa" target="_blank" rel="noreferrer">Token Sale Agreement</a></div>
    </>}

    {state === STATE.VerificationRequired && <>
      <Statistic.Group size="mini" widths='two'>
        <Statistic size="mini">
          <Statistic.Value>1 ETH = {rate * (3 - stage)} XPU</Statistic.Value>
          <Statistic.Label>Current rate</Statistic.Label>
        </Statistic>
        <Statistic size="mini">
          <Statistic.Value>{pendingBalance / DENOM} XPU</Statistic.Value>
          <Statistic.Label>Current balance</Statistic.Label>
        </Statistic>
      </Statistic.Group>

      <div className="disclaimer center"><h3>Thank you for your purchase. The next step is to verify your identity. <br />Please do so in the following 2 weeks to finalise your purchase.</h3></div>

      <Segment className="segment-box-vertical" >
        <span>Account verification status: <b>{jwt.kyc_state}</b></span>
        <Verification jwt={jwt} onFinish={onVeriffFinished} />
      </Segment>
    </>}

    {state === STATE.VerificationPending && <>
      The KYC verification is ongoing. As soon as it's done, buying more coins will be possible.
    </>}

    {state === STATE.VerificationFinishedOnClient && <>
      KYC verification submitted. Thank you!
    </>}

    {state === STATE.VerificationDonePendingTransaction && <>
      The KYC verification is complete. We are still processing the request.
    </>}

    {state === STATE.Rejected && <>
      <Statistic size="mini">
        <Statistic.Value>{pendingBalance / DENOM} XPU</Statistic.Value>
        <Statistic.Label>Current balance</Statistic.Label>
      </Statistic>

      {pendingBalance === 0 && <>
        <Segment className="segment-box-vertical">
          Sorry, your KYC verification was rejected
        </Segment>
      </>}

      {pendingBalance !== 0 && <>
        <Segment className="segment-box-vertical">
          Sorry, your KYC verification was rejected. {!transactionHash && "Click below to refund the purchase."}

          <div className="refund-coins">
            {!transactionHash && <div>
              <Button fluid color="purple" onClick={onRefund}>Refund</Button>
            </div>}

            {transactionHash && <>
              Pending transaction: <a href={"https://etherscan.io/tx/" + transactionHash} target="_blank" rel="noreferrer">{transactionHash}</a>
            </>}
          </div>
        </Segment>
      </>}
    </>}

    {error && <div className="error"> {error} </div>}
  </>
}
