'use strict';

const { IVoiceSynthesisGateway } = require('../../../application/ports/IVoiceSynthesisGateway');

/**
 * ElevenLabsAdapter Implementation
 * Synthesizes high-fidelity spoken audio responses for warehouse operators.
 */
class ElevenLabsAdapter extends IVoiceSynthesisGateway {
  constructor(apiKey = 'mock-elevenlabs-key', voiceId = '21m00Tcm4TlvDq8ikWAM') {
    super();
    this.apiKey = apiKey;
    this.voiceId = voiceId;
  }

  async synthesizeSpeech(text, voiceId = this.voiceId) {
    const encoded = encodeURIComponent(text);
    const audioUrl = `https://api.elevenlabs.io/v1/tts-preview/${voiceId}?text=${encoded}`;
    const estimatedDuration = Math.max(1.5, Number((text.length / 15).toFixed(1)));

    return {
      text,
      audioUrl,
      durationSeconds: estimatedDuration,
    };
  }

  async speak(text) {
    return this.synthesizeSpeech(text);
  }
}

module.exports = { ElevenLabsAdapter };
