'use strict';

const { VoiceSession, VOICE_SESSION_STATES } = require('../entities/VoiceSession');

class VoiceCommandProcessor {
  constructor({ intentParser, voiceSynthesisGateway, receiveStockUseCase, submitCycleCountUseCase }) {
    this.intentParser = intentParser;
    this.voiceSynthesisGateway = voiceSynthesisGateway;
    this.receiveStockUseCase = receiveStockUseCase;
    this.submitCycleCountUseCase = submitCycleCountUseCase;
  }

  /**
   * Processes an incoming operator speech utterance.
   * @param {VoiceSession} session
   * @param {string} rawTranscript
   * @returns {Promise<{ sessionState: string, spokenResponse: string, executed: boolean }>}
   */
  async processUtterance(session, rawTranscript) {
    if (!session) throw new Error('VoiceCommandProcessor requires session');

    // If session is awaiting confirmation and operator says "yes" / "confirm"
    if (session.state === VOICE_SESSION_STATES.AWAITING_CONFIRMATION) {
      const text = rawTranscript.toLowerCase();
      if (text.includes('yes') || text.includes('confirm') || text.includes('correct')) {
        session.confirm();
        return await this._executePendingCommand(session);
      } else if (text.includes('no') || text.includes('cancel')) {
        session.reset();
        const spoken = await this.voiceSynthesisGateway.speak('Command cancelled.');
        return { sessionState: session.state, spokenResponse: spoken.text, executed: false };
      }
    }

    // Parse intent from speech
    const command = await this.intentParser.parseIntent(rawTranscript);

    // Low-confidence threshold check (< 0.80) -> trigger clarification loop
    if (command.confidenceScore < 0.8) {
      session.requestClarification();
      const question = `I heard "${rawTranscript}", but confidence was low. Did you say ${command.slots.quantity || 'this'} units of ${command.slots.sku || 'product'}?`;
      const spoken = await this.voiceSynthesisGateway.speak(question);
      return {
        sessionState: session.state,
        spokenResponse: spoken.text,
        executed: false,
        requiresClarification: true,
      };
    }

    // High confidence -> Set pending command & initiate spoken readback confirmation
    session.setPendingCommand(command);
    let readbackText = '';
    if (command.intent === 'RECEIVE_STOCK') {
      readbackText = `Receive ${command.slots.quantity} units of SKU ${command.slots.sku}? Say yes to confirm.`;
    } else if (command.intent === 'CYCLE_COUNT') {
      readbackText = `Confirm cycle count of ${command.slots.quantity} units at Bin ${command.slots.binId} for ${command.slots.sku}? Say yes to confirm.`;
    } else {
      readbackText = `Command not recognized. Please repeat.`;
    }

    const spoken = await this.voiceSynthesisGateway.speak(readbackText);
    return {
      sessionState: session.state,
      spokenResponse: spoken.text,
      executed: false,
    };
  }

  async _executePendingCommand(session) {
    const cmd = session.pendingCommand;
    if (!cmd) throw new Error('No pending command to execute');

    if (cmd.intent === 'RECEIVE_STOCK' && this.receiveStockUseCase) {
      await this.receiveStockUseCase.execute({ sku: cmd.slots.sku, quantity: cmd.slots.quantity });
    } else if (cmd.intent === 'CYCLE_COUNT' && this.submitCycleCountUseCase) {
      await this.submitCycleCountUseCase.execute({
        sessionId: 'session-voice',
        operatorId: session.operatorId,
        binId: cmd.slots.binId,
        sku: cmd.slots.sku,
        count: cmd.slots.quantity,
      });
    }

    session.reset();
    const spoken = await this.voiceSynthesisGateway.speak(`Stock operation confirmed and updated in inventory.`);
    return {
      sessionState: session.state,
      spokenResponse: spoken.text,
      executed: true,
    };
  }
}

module.exports = { VoiceCommandProcessor };
