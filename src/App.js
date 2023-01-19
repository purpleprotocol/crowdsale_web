import { useEffect } from 'react';
import { Image } from 'semantic-ui-react';
import './App.css';
import metamask from './assets/icons/metamask.svg';
import PurpleHeader from './components/header';
import Main from './components/main';
import fetchWallets from './hooks/fetchWallets';

import { WalletContext } from './hooks/walletContext';

export default function App() {
  const { wallet, setWallet, wallets, setWallets, hasMetaMask } = fetchWallets();

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_requestAccounts' }).then(res => {
        setWallets(res);
        setWallet(res[0]);
      });
    }
    // eslint-disable-next-line
  }, []);

  if (hasMetaMask && !wallet) {
    return <></>;
  }

  return (
    <>
      <WalletContext.Provider value={{ wallet, setWallet, wallets, setWallets, hasMetaMask }}>
        <PurpleHeader />
        <div className='purple-content'>
          {!hasMetaMask && <>
            <div className='custom-header'>
              <Image src={metamask} size="tiny" />
              <span className='title'>MetaMask extension not available</span>
              <span className='sub-title'>MetaMask is needed to join the sale. Install it from <a href="https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn?hl=en" target="_blank" rel="noreferrer">here</a> or enable it</span>
            </div>
          </>}
          {hasMetaMask && wallet && <div className='purple-content-inner'><Main /></div>}
        </div>
      </WalletContext.Provider>
    </>
  )
}
