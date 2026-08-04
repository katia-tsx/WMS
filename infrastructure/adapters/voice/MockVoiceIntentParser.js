'use strict';

const { IVoiceIntentParser } = require('../../../application/ports/IVoiceIntentParser');
const { VoiceCommand } = require('../../../domain/voice/value-objects/VoiceCommand');

/**
 * MockVoiceIntentParser Implementation
 * STT + NLU intent classification pipeline for hands-free receiving and cycle counting.
 */
class MockVoiceIntentParser extends IVoiceIntentParser {
  async parseIntent(rawTranscript = '') {
    const text = rawTranscript.toLowerCase().trim();

    // Regex matching "receive 50 units of WMS-1001"
    const receiveMatch = text.match(/receive (\d+) units? of ([a-z0-9-]+)/i);
    if (receiveMatch) {
      return new VoiceCommand({
        rawTranscript,
        intent: 'RECEIVE_STOCK',
        confidenceScore: 0.95,
        slots: {
          quantity: parseInt(receiveMatch[1], 10),
          sku: receiveMatch[2].toUpperCase(),
        },
      });
    }

    // Regex matching "count 100 units at A1-02-C for WMS-1001"
    const countMatch = text.match(/count (\d+) units? (?:at|in) ([a-z0-9-]+) for ([a-z0-9-]+)/i);
    if (countMatch) {
      return new VoiceCommand({
        rawTranscript,
        intent: 'CYCLE_COUNT',
        confidenceScore: 0.92,
        slots: {
          quantity: parseInt(countMatch[1], 10),
          binId: countMatch[2].toUpperCase(),
          sku: countMatch[3].toUpperCase(),
        },
      });
    }

    // Low-confidence fallback test
    if (text.includes('fifty or fifteen') || text.includes('maybe')) {
      return new VoiceCommand({
        rawTranscript,
        intent: 'RECEIVE_STOCK',
        confidenceScore: 0.65, // Below 0.80 threshold -> triggers clarification loop
        slots: { quantity: 50, sku: 'WMS-1001' },
      });
    }

    return new VoiceCommand({
      rawTranscript,
      intent: 'UNKNOWN',
      confidenceScore: 0.2,
      slots: {},
    });
  }
}

module.exports = { MockVoiceIntentParser };
