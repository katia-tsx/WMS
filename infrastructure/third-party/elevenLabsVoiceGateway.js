'use strict';

/**
 * @typedef {import('../../application/ports/VoiceGatewayPort').VoiceGatewayPort} VoiceGatewayPort
 */

/**
 * ElevenLabsVoiceGateway — a driven adapter implementing VoiceGatewayPort
 * against the ElevenLabs text-to-speech API. Nothing in application/ or
 * domain/ knows this vendor exists; only this file and the composition
 * root do.
 *
 * @implements {VoiceGatewayPort}
 */
class ElevenLabsVoiceGateway {
  /** @param {string} apiKey */
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
  }

  /**
   * @param {string} text
   * @param {string} voiceId
   * @returns {Promise<Buffer>}
   */
  async synthesizeSpeech(text, voiceId) {
    const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs request failed with status ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

module.exports = { ElevenLabsVoiceGateway };
