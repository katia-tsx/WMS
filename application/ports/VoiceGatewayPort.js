'use strict';

/**
 * VoiceGatewayPort — outbound port for the Voice AI bounded context.
 * Describes only what the application layer needs from a voice provider
 * (synthesize speech from text), not how any specific vendor implements
 * it. infrastructure/third-party/elevenLabsVoiceGateway.js is today's
 * adapter; swapping vendors means writing a new adapter, not touching
 * this port or any use case that depends on it.
 *
 * @typedef {Object} VoiceGatewayPort
 * @property {function(text: string, voiceId: string): Promise<Buffer>} synthesizeSpeech
 */

module.exports = {};
