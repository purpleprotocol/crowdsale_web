import React, { useContext } from "react";
import logo from "./../logo_white.png";
import { WalletContext } from "../hooks/walletContext";

import { Button, Icon, Image } from "semantic-ui-react";

export default function Header() {
  const { wallet } = useContext(WalletContext);

  return <div className="purple-header">
    <div className="left">
      <Image src={logo} /> <span>Purplecoin Sale</span>
    </div>
    <div className="right">
      {wallet && <Button className="message" basic size="small" disabled>
        <span>
          Wallet connected<br />{wallet.substring(0, 8) + "..." + wallet.substring(wallet.length - 6)}
        </span>

      </Button>}
      <a className="github" href="https://github.com/purpleprotocol/purplecoin" target="_blank" rel="noreferrer">
        <Button basic size="small">
          <Button.Content>
            <Icon name="github" size="large" />
          </Button.Content>
        </Button>
      </a>
      <a className="discord" href="https://discord.gg/4hD4DzmD" target="_blank" rel="noreferrer">
        <Button basic size="small">
          <Button.Content>
            <Icon name="discord" size="large" /> Join us on Discord
          </Button.Content>
        </Button>
      </a>
    </div>
  </div>;
}
