import './App.css';
import { Button, Dimmer, Image, Loader, Progress, Statistic } from 'semantic-ui-react';
import metamask from './assets/icons/metamask.svg';
import gemini from './assets/icons/gemini.svg';
import logo from "./logo_white.png";
import PurpleHeader from './components/header';
import Main from './components/main';
import fetchWallets from './hooks/fetchWallets';

import { WalletContext } from './hooks/walletContext';
import { isMobile } from 'react-device-detect';

import { STAGES_NO, STAGE_NAME } from './consts';
import { useState } from 'react';

export default function App() {
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(null);
  const [connectionError, setConnectionError] = useState(null);

  if (isMobile) {
    return <div className='purple-content mobile'>
      <div className='custom-header center-text'>
        <Image src={logo} size="tiny" />
        <span className='title-small'>Please visit this from a desktop browser</span>
        <span className='sub-title'>Supported browsers: Chrome, Firefox, Edge, and Brave</span>
      </div>
    </div>;
  }

  const { loading, hasMetaMask, isMainNet, hasGlobalInfo, stageGlobal, rateGlobal, totalSoldPsatsGlobal, totalPsatsInEscrowGlobal, tokensCapGlobal } = fetchWallets();

  if (loading) {
    return <Dimmer active inverted>
      <Loader inverted size="huge" />
    </Dimmer>
  }

  const willShowMain = hasMetaMask && isMainNet && wallet && balance !== 0;
  const hideProgress = !hasGlobalInfo || willShowMain;

  const onWalletConnect = async () => {
    try {
      const res = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setWallet(res[0]);

      if (res[0]) {
        const b = await window.ethereum.request({ method: 'eth_getBalance', params: [res[0], 'latest'] });
        setBalance(parseInt(b.substring(2), 16) / 1000000000000000000);
      }
    } catch {
      setConnectionError(true);
    }
  }

  return (
    <>
      <WalletContext.Provider value={{ wallet, hasMetaMask }}>
        <PurpleHeader />
        <div className='purple-content'>
          {!hideProgress && <>
            <h1 className="hero-title">Buy Purplecoins in {STAGE_NAME[stageGlobal]}</h1>
            <div className="sale-progress">
              <Progress color="purple" percent={Math.min(totalSoldPsatsGlobal + totalPsatsInEscrowGlobal, tokensCapGlobal / STAGES_NO) / (tokensCapGlobal / STAGES_NO) * 100} size='small'>
                <span><b>Stage:</b> {STAGE_NAME[0]}</span>
              </Progress>
              <Progress color="purple" percent={Math.max(totalSoldPsatsGlobal + totalPsatsInEscrowGlobal - Math.min(totalSoldPsatsGlobal + totalPsatsInEscrowGlobal, tokensCapGlobal / STAGES_NO), 0) / (tokensCapGlobal / STAGES_NO) * 100} size='small'>
                <span><b>Stage:</b> {STAGE_NAME[1]}</span>
              </Progress>
              <Progress color="purple" percent={Math.max(totalSoldPsatsGlobal + totalPsatsInEscrowGlobal - Math.min(totalSoldPsatsGlobal + totalPsatsInEscrowGlobal, (tokensCapGlobal / STAGES_NO) * 2), 0) / (tokensCapGlobal / STAGES_NO) * 100} size='small'>
                <span><b>Stage:</b> {STAGE_NAME[2]}</span>
              </Progress>
            </div>

            <Statistic.Group size="mini" widths='one' style={{ marginBottom: "1em" }}>
              <Statistic size="mini">
                <Statistic.Value>1 ETH = {rateGlobal * (STAGES_NO - stageGlobal)} XPU</Statistic.Value>
                <Statistic.Label>Current rate</Statistic.Label>
              </Statistic>
            </Statistic.Group>
          </>}

          {connectionError && <>
            <div className='custom-header' style={{ textAlign: "center" }}>
              <Image src={metamask} size="tiny" />
              <span className='title'>Wallet locked</span>
              <span className='sub-title'>Follow the instruction in the Metamask window to connect your wallet<br />After you're done, please refresh this page</span>
            </div>
          </>}

          {!connectionError && !hasMetaMask && <>
            <div className='custom-header'>
              <Image src={metamask} size="tiny" />
              <span className='title'>Metamask extension not available. Follow <a target="_blank" href="https://github.com/purpleprotocol/purplecoin/blob/main/doc/crowdsale.md#how-to-participate">this guide</a> on how to participate in the sale.</span>
              <span className='sub-title'>Metamask is needed to participate in the sale. Install it from <a href="https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn?hl=en" target="_blank" rel="noreferrer">here</a> (or enable it if already installed)</span>
            </div>
            <div className='top-distance'><b>Supported browsers: Chrome, Firefox, Edge, and Brave</b></div>
          </>}
          {!connectionError && hasMetaMask && !isMainNet && <>
            <div className='custom-header center-text'>
              <Image src={metamask} size="tiny" />
              <span className='title'>Metamask not connected to Ethereum Mainnet</span>
              <span className='sub-title'>Please make sure Ethereum Mainnet is selected in Metamask and retry</span>
            </div>
          </>}
          {!connectionError && hasMetaMask && isMainNet && !wallet && <>
            <div className='custom-header center-text'>
              <Image src={metamask} size="tiny" />
              <span className='title'>No Metamask wallet was connected</span>
              <span className='sub-title'>Metamask installed but not connected, please connect your metamask wallet. Follow <a target="_blank" href="https://github.com/purpleprotocol/purplecoin/blob/main/doc/crowdsale.md#how-to-participate">this guide</a> on how to participate in the sale.</span>
              <span className='top-distance sub-title'><b>Once you have successfully connected your wallet, the next step is to transfer Ethereum to your newly created wallet<br />You must transfer at least 0.01 ETH in order to participate in the sale, and make sure you have your ID/Passport ready for the identity verification</b></span>
              <div><Button color="purple" onClick={onWalletConnect} size="large" style={{ marginBottom: "1rem", marginTop: "1rem" }}>Connect wallet</Button></div>
            </div>
          </>}
          {!connectionError && hasMetaMask && isMainNet && wallet && balance === 0 && <>
            <div className='custom-header center-text'>
              <Image src={metamask} size="tiny" />
              <span className='title'>Insufficient funds</span>
              <span className='sub-title'>You must transfer <b>at least 0.01 ETH</b> to your wallet in order to participate in the sale, and make sure you have your ID/Passport ready for the identity verification. Follow <a target="_blank" href="https://github.com/purpleprotocol/purplecoin/blob/main/doc/crowdsale.md#how-to-participate">this guide</a> on how to participate in the sale.</span>
              <a className='top-distance' href="https://www.gemini.com/share/dz5e4za2l" target="_blank" rel="noreferrer">
                <Button basic className='button-img margin-all' size='big'>
                  <Image src={gemini} size="mini" />Buy Ethereum on GEMINI
                </Button>
              </a>
              <b>(And receive $10 in BTC if you create a new account)</b>
            </div>
          </>}
          {!connectionError && hasMetaMask && isMainNet && wallet && balance !== 0 && <div className='purple-content-inner'><Main /></div>}

          {!willShowMain && <><div className="disclaimer">By purchasing Purplecoins, you declare to have read, understood, and agreed to the <a href="https://purplecoin.io/tsa" target="_blank" rel="noreferrer">Token Sale Agreement</a></div></>}
        </div>
      </WalletContext.Provider>
    </>
  )
}
