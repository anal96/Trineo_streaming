import mongoose from 'mongoose';

/**
 * UsedSSOToken — replay protection store.
 *
 * Every time a valid SSO JWT is consumed, its `jti` (JWT ID) is recorded here.
 * Any subsequent attempt to reuse the same token is rejected immediately,
 * even if the token has not yet expired.
 *
 * Indexes:
 *  - jti: unique — prevents race-condition double-use
 *  - expiresAt: TTL — MongoDB automatically removes documents after the token's
 *    own expiry, so the collection stays lean without manual cleanup.
 */
const usedSSOTokenSchema = new mongoose.Schema({
  jti: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    required: true
  },
  usedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // TTL — MongoDB drops the doc when expiresAt is reached
  }
});

export const UsedSSOToken = mongoose.model('UsedSSOToken', usedSSOTokenSchema);
