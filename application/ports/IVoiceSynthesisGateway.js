'use strict';

const { Port } = require('./Port');

/**
 * IVoiceSynthesisGateway — outbound port for the Voice AI bounded context:
 * turning text into speech audio through whatever vendor a concrete
 * adapter wraps (ElevenLabs today — see
 * infrastructure/third-party/elevenLabsVoiceGateway.js — a different
 * vendor tomorrow, without any use case changing). The application layer
 * only ever depends on this shape, never on a vendor SDK.
 *
 * @interface
 */
class IVoiceSynthesisGateway extends Port {
  /**
   * Pre:  `text` is non-empty; `voiceId` identifies a voice the adapter's
   *       vendor recognizes.
   * Post: resolves to the synthesized audio as a Buffer. Rejects if the
   *       vendor could not synthesize the request (invalid voiceId, vendor
   *       outage, etc.) — that is an infrastructure failure, not an
   *       expected business outcome, so it is rejected/thrown rather than
   *       returned as a `Result.err(...)`.
   *
   * @param {string} text
   * @param {string} voiceId
   * @returns {Promise<Buffer>}
   */
  async synthesizeSpeech(text, voiceId) {
    this._abstract('synthesizeSpeech');
  }
}

module.exports = { IVoiceSynthesisGateway };
