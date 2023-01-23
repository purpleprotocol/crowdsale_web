import { createVeriffFrame, MESSAGES } from '@veriff/incontext-sdk';
import { Veriff } from '@veriff/js-sdk';
import { useEffect, useState } from 'react';

const VERIFF_API_KEY = process.env.REACT_APP_VERIFF_API_KEY;
const VERIFF_STATE_CURRENT = {
  NOTSTARTED: 0,
  CANCELED: 1,
  FINISHED: 2
};

export default function Verification({ jwt, onFinish }) {
  const [veriffState, setVeriffState] = useState(VERIFF_STATE_CURRENT.NOTSTARTED)

  useEffect(() => {
    const veriff = Veriff({
      host: 'https://stationapi.veriff.com',
      apiKey: VERIFF_API_KEY,
      parentId: 'veriff',
      onSession: function (_, response) {
        createVeriffFrame({
          url: response.verification.url,
          onEvent: function (msg) {
            switch (msg) {
              case MESSAGES.CANCELED:
                setVeriffState(VERIFF_STATE_CURRENT.CANCELED);
                break;
              case MESSAGES.FINISHED:
                onFinish();
                break;
              default:
                break;
            }
          }
        });
      }
    });

    veriff.setParams({ vendorData: jwt.user_id || jwt.id });
    veriff.mount();
    // eslint-disable-next-line
  }, [])

  return <>
    {veriffState !== VERIFF_STATE_CURRENT.FINISHED && <div id='veriff'></div>}
    {veriffState === VERIFF_STATE_CURRENT.CANCELED && <div className="disclaimer center"><h3>Your KYC verification is mandatory in order to finalize the purchase. Please retry it.</h3></div>}
  </>
}
