'use strict';

/**
 * VoiceCommand Value Object
 */
class VoiceCommand {
  constructor({ rawTranscript, intent = 'UNKNOWN', confidenceScore = 0.9, slots = {} }) {
    if (!rawTranscript || typeof rawTranscript !== 'string') {
      throw new Error('VoiceCommand requires rawTranscript');
    }

    this.rawTranscript = rawTranscript;
    this.intent = intent;
    this.confidenceScore = confidenceScore;
    this.slots = slots;
  }
}

module.exports = { VoiceCommand };
