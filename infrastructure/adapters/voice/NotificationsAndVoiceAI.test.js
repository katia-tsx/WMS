'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { Notification } = require('../../../domain/notifications/entities/Notification');
const { NotificationPreference } = require('../../../domain/notifications/entities/NotificationPreference');
const { NotificationDispatchService } = require('../../../domain/notifications/services/NotificationDispatchService');
const { InAppNotificationAdapter } = require('../notifications/InAppNotificationAdapter');
const { EmailNotificationAdapter } = require('../notifications/EmailNotificationAdapter');

const { VoiceCommand } = require('../../../domain/voice/value-objects/VoiceCommand');
const { VoiceSession, VOICE_SESSION_STATES } = require('../../../domain/voice/entities/VoiceSession');
const { ElevenLabsAdapter } = require('../elevenlabs/ElevenLabsAdapter');
const { MockVoiceIntentParser } = require('./MockVoiceIntentParser');
const { VoiceCommandProcessor } = require('../../../domain/voice/services/VoiceCommandProcessor');

describe('Notifications Bounded Context', () => {
  it('dispatches notifications across active channel adapters according to user preferences', async () => {
    const inAppAdapter = new InAppNotificationAdapter();
    const emailAdapter = new EmailNotificationAdapter();

    const dispatchService = new NotificationDispatchService({
      channelAdapters: { IN_APP: inAppAdapter, EMAIL: emailAdapter },
    });

    await dispatchService.handleDomainEvent({
      eventType: 'inventory.low-stock-breached',
      sku: 'WMS-1001',
      currentQuantity: 5,
      threshold: 10,
    });

    const inAppNotifs = inAppAdapter.getNotificationsForUser('usr-admin');
    assert.equal(inAppNotifs.length, 1);
    assert.equal(inAppNotifs[0].templateId, 'LOW_STOCK');
    assert.equal(emailAdapter.sentEmails.length, 1);
  });
});

describe('Voice AI Integration & Hands-Free Workflows', () => {
  it('ElevenLabsAdapter synthesizes text-to-speech spoken audio', async () => {
    const tts = new ElevenLabsAdapter();
    const res = await tts.speak('Stock adjustment confirmed for SKU WMS-1001');

    assert.ok(res.audioUrl.includes('elevenlabs.io'));
    assert.equal(res.text, 'Stock adjustment confirmed for SKU WMS-1001');
  });

  it('MockVoiceIntentParser classifies utterances into structured VoiceCommands', async () => {
    const parser = new MockVoiceIntentParser();

    const cmdReceive = await parser.parseIntent('receive 50 units of WMS-1001');
    assert.equal(cmdReceive.intent, 'RECEIVE_STOCK');
    assert.equal(cmdReceive.slots.quantity, 50);
    assert.equal(cmdReceive.slots.sku, 'WMS-1001');

    const cmdCount = await parser.parseIntent('count 100 units at A1-02-C for WMS-1001');
    assert.equal(cmdCount.intent, 'CYCLE_COUNT');
    assert.equal(cmdCount.slots.quantity, 100);
    assert.equal(cmdCount.slots.binId, 'A1-02-C');
  });

  it('VoiceCommandProcessor handles multi-turn verbal confirmation and low-confidence clarification loops', async () => {
    const parser = new MockVoiceIntentParser();
    const tts = new ElevenLabsAdapter();

    let stockReceived = false;
    const mockReceiveUseCase = {
      execute: async () => {
        stockReceived = true;
      },
    };

    const processor = new VoiceCommandProcessor({
      intentParser: parser,
      voiceSynthesisGateway: tts,
      receiveStockUseCase: mockReceiveUseCase,
    });

    const session = new VoiceSession({ id: 's-1', operatorId: 'op-007' });

    // Step 1: Speak utterance -> High confidence -> AWAITING_CONFIRMATION
    const step1 = await processor.processUtterance(session, 'receive 50 units of WMS-1001');
    assert.equal(session.state, VOICE_SESSION_STATES.AWAITING_CONFIRMATION);
    assert.equal(step1.executed, false);
    assert.ok(step1.spokenResponse.includes('Receive 50 units'));

    // Step 2: Confirm -> Executed
    const step2 = await processor.processUtterance(session, 'yes, confirm');
    assert.equal(session.state, VOICE_SESSION_STATES.IDLE);
    assert.equal(step2.executed, true);
    assert.equal(stockReceived, true);

    // Step 3: Low Confidence test -> CLARIFYING
    const step3 = await processor.processUtterance(session, 'fifty or fifteen units?');
    assert.equal(session.state, VOICE_SESSION_STATES.CLARIFYING);
    assert.equal(step3.requiresClarification, true);
  });
});
