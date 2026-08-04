'use strict';

const { Port } = require('./Port');

/**
 * IVoiceSynthesisGateway Port Interface
 */
class IVoiceSynthesisGateway extends Port {
  /**
   * Synthesizes spoken audio from text.
   * @param {string} text
   * @param {string} [voiceId]
   * @returns {Promise<Buffer|{ audioUrl: string, durationSeconds: number }>}
   */
  async synthesizeSpeech(text, voiceId) {
    this._abstract('synthesizeSpeech');
  }

  async speak(text) {
    return this.synthesizeSpeech(text);
  }
}

module.exports = { IVoiceSynthesisGateway };
