import { Veriff } from '@veriff/js-sdk';
import { useEffect } from 'react';

const VERIFF_API_KEY = process.env.REACT_APP_VERIFF_API_KEY;

export default function Verification({ jwt }) {
  useEffect(() => {
    const veriff = Veriff({
      host: 'https://stationapi.veriff.com',
      apiKey: VERIFF_API_KEY,
      parentId: 'veriff',
      onSession: function (_, response) {
        window.veriffSDK.createVeriffFrame({ url: response.verification.url });
      }
    });

    veriff.setParams({ vendorData: jwt.user_id });
    veriff.mount();
    // eslint-disable-next-line
  }, [])

  return <>
    <div id='veriff'></div>
  </>
}