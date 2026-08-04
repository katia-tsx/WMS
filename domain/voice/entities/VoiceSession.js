'use strict';

const VOICE_SESSION_STATES = {
  IDLE: 'IDLE',
  AWAITING_CONFIRMATION: 'AWAITING_CONFIRMATION',
  CONFIRMED: 'CONFIRMED',
  CLARIFYING: 'CLARIFYING',
};

class VoiceSession {
  constructor({ id, operatorId, state = VOICE_SESSION_STATES.IDLE, pendingCommand = null }) {
    if (!id) throw new Error('VoiceSession requires id');
    if (!operatorId) throw new Error('VoiceSession requires operatorId');

    this.id = id;
    this.operatorId = operatorId;
    this.state = state;
    this.pendingCommand = pendingCommand;
  }

  setPendingCommand(command) {
    this.pendingCommand = command;
    this.state = VOICE_SESSION_STATES.AWAITING_CONFIRMATION;
  }

  confirm() {
    this.state = VOICE_SESSION_STATES.CONFIRMED;
  }

  requestClarification() {
    this.state = VOICE_SESSION_STATES.CLARIFYING;
  }

  reset() {
    this.pendingCommand = null;
    this.state = VOICE_SESSION_STATES.IDLE;
  }
}

module.exports = { VOICE_SESSION_STATES, VoiceSession };
