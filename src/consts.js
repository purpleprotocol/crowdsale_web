export const API_URL = process.env.REACT_APP_API;
export const CONTRACT_ADDR = process.env.REACT_APP_CONTRACT_ADDRESS;
export const DENOM = 1000000000000000000;
export const STAGES_NO = 3;
export const CONFIRMATIONS_NO = 7;
export const POLL_RATE = 30000;

export const KYC_STATE = {
  NotVerified: 'NotVerified',
  Started: 'Started',
  Pending: 'Pending',
  VerifiedRequiresAuthorisation: 'VerifiedRequiresAuthorisation',
  Verified: 'Verified',
  Rejected: 'Rejected'
};

export const STATE = {
  Undefined: -1,
  Initial: 0,
  VerificationRequired: 1,
  VerificationPending: 2,
  VerificationDonePendingTransaction: 3,
  Authorised: 4,
  Rejected: 5,
  VerificationFinishedOnClient: 6
};

export const STAGE_NAME = {
  0: "Pre-sale (-66% off)",
  1: "Early Bird (-33% off)",
  2: "Public Sale"
};