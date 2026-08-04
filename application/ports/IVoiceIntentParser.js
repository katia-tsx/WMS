'use strict';

/**
 * Swappable IVoiceIntentParser Port Interface
 * Speech-to-text + Intent NLU parsing port.
 */
class IVoiceIntentParser {
  /**
   * Parses spoken transcript into structured VoiceCommand intent and slots.
   * @param {string} rawTranscript
   * @returns {Promise<import('../../domain/voice/value-objects/VoiceCommand').VoiceCommand>}
   */
  async parseIntent(rawTranscript) {
    throw new Error('IVoiceIntentParser#parseIntent must be implemented by subclass');
  }
}

module.exports = { IVoiceIntentParser };
