import { Button, Image } from 'semantic-ui-react';
import './App.css';
import metamask from './assets/icons/metamask.svg';
import gemini from './assets/icons/gemini.svg';
import logo from "./logo_white.png";
import PurpleHeader from './components/header';
import Main from './components/main';
import fetchWallets from './hooks/fetchWallets';

import { WalletContext } from './hooks/walletContext';
import { isMobile } from 'react-device-detect';

export default function App() {
  if (isMobile) {
    return <div className='purple-content mobile'>
      <div className='custom-header center-text'>
        <Image src={logo} size="tiny" />
        <span className='title-small'>Please visit this from a desktop browser</span>
        <span className='sub-title'>Supported browsers: Chrome, Firefox, Edge, and Brave</span>
      </div>
    </div>;
  }

  const { loading, balance, wallet, wallets, hasMetaMask, isMainNet, connectionError } = fetchWallets();

  if (loading) {
    return <></>;
  }

  if (connectionError) {
    return <>
      <WalletContext.Provider value={{ wallet }}>
        <PurpleHeader />
        <div className='purple-content'>
          <div className='custom-header'>
            <Image src={metamask} size="tiny" />
            <span className='title'>Wallet locked</span>
            <span className='sub-title'>Follow the instruction in the Metamask window to connect your wallet</span>
          </div>
        </div>
      </WalletContext.Provider>
    </>;
  }

  return (
    <>
      <WalletContext.Provider value={{ wallet, wallets, hasMetaMask }}>
        <PurpleHeader />
        <div className='purple-content'>
          {!hasMetaMask && <>
            <div className='custom-header'>
              <Image src={metamask} size="tiny" />
              <span className='title'>Metamask extension not available. Follow <a target="_blank" href="https://github.com/purpleprotocol/purplecoin/blob/main/doc/crowdsale.md#how-to-participate">this guide</a> on how to participate in the sale.</span>
              <span className='sub-title'>Metamask is needed to participate in the sale. Install it from <a href="https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn?hl=en" target="_blank" rel="noreferrer">here</a> (or enable it if already installed)</span>
            </div>
            <div className='top-distance'><b>Supported browsers: Chrome, Firefox, Edge, and Brave</b></div>
          </>}
          {hasMetaMask && !isMainNet && <>
            <div className='custom-header center-text'>
              <Image src={metamask} size="tiny" />
              <span className='title'>Metamask not connected to Ethereum Mainnet</span>
              <span className='sub-title'>Please make sure Ethereum Mainnet is selected in Metamask and retry</span>
            </div>
          </>}
          {hasMetaMask && isMainNet && !wallet && <>
            <div className='custom-header center-text'>
              <Image src={metamask} size="tiny" />
              <span className='title'>No Metamask wallet was connected</span>
              <span className='sub-title'>Metamask installed but not connected, please connect your metamask wallet and refresh the page. Follow <a target="_blank" href="https://github.com/purpleprotocol/purplecoin/blob/main/doc/crowdsale.md#how-to-participate">this guide</a> on how to participate in the sale.</span>
              <span className='top-distance sub-title'><b>Once you have successfully connected your wallet, the next step is to transfer Ethereum to your newly created wallet<br/>You must transfer at least 0.25 ETH in order to participate in the sale</b></span>
            </div>
          </>}
          {hasMetaMask && isMainNet && wallet && balance === 0 && <>
            <div className='custom-header center-text'>
              <Image src={metamask} size="tiny" />
              <span className='title'>Insufficient funds</span>
              <span className='sub-title'>You must transfer <b>at least 0.25 ETH</b> to your wallet in order to participate in the sale. Follow <a target="_blank" href="https://github.com/purpleprotocol/purplecoin/blob/main/doc/crowdsale.md#how-to-participate">this guide</a> on how to participate in the sale.</span>
              <a className='top-distance' href="https://www.gemini.com/share/dz5e4za2l" target="_blank" rel="noreferrer">
                <Button basic className='button-img margin-all' size='big'>
                  <Image src={gemini} size="mini" />Buy Ethereum on GEMINI
                </Button>
              </a>
              <b>(And receive $10 in BTC if you create a new account)</b>
            </div>
          </>}
          {hasMetaMask && isMainNet && wallet && balance !== 0 && <div className='purple-content-inner'><Main /></div>}
        </div>
      </WalletContext.Provider>
    </>
  )
}
