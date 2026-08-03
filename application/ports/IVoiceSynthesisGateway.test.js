'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { IVoiceSynthesisGateway } = require('./IVoiceSynthesisGateway');
const { NotImplementedError } = require('./errors/NotImplementedError');

describe('IVoiceSynthesisGateway (base contract)', () => {
  test('synthesizeSpeech rejects with NotImplementedError when not overridden', async () => {
    const gateway = new IVoiceSynthesisGateway();
    await assert.rejects(() => gateway.synthesizeSpeech('hello', 'voice-1'), NotImplementedError);
  });
});

describe('IVoiceSynthesisGateway (fake adapter)', () => {
  class FakeVoiceSynthesisGateway extends IVoiceSynthesisGateway {
    async synthesizeSpeech(text, voiceId) {
      return Buffer.from(`${voiceId}:${text}`);
    }
  }

  test('a fake adapter can return deterministic audio for a use case test', async () => {
    const gateway = new FakeVoiceSynthesisGateway();
    const audio = await gateway.synthesizeSpeech('Low stock alert', 'voice-1');
    assert.equal(audio.toString(), 'voice-1:Low stock alert');
  });
});
