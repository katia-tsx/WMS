import '../../design-system/index.js';
import '../../components/wms-notification-center.js';

export class VoiceHandsFreeView {
  constructor(container) {
    this.container = container;
    this.micActive = false;
  }

  mount() {
    this.container.innerHTML = `
      <div class="voice-handsfree-module" style="font-family: var(--font-sans);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <div>
            <h1 style="font-size: 1.5rem; font-weight: 600; margin: 0;">Hands-Free Voice AI Mode &amp; Notifications</h1>
            <p style="color: var(--color-text-secondary); margin: 4px 0 0; font-size: 0.875rem;">
              ElevenLabs TTS audio readback, speech intent parsing, and low-confidence clarification multi-turn sessions.
            </p>
          </div>
          <div style="display: flex; gap: 12px; align-items: center;">
            <wms-notification-center></wms-notification-center>
            <wms-button id="btn-toggle-handsfree" variant="primary" size="sm">🎙️ Hands-Free Mode: OFF</wms-button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 24px;">
          <!-- Mic & Transcript Visual Feedback -->
          <wms-card>
            <span slot="header">Voice Input &amp; ElevenLabs Audio Readback</span>
            
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; background: var(--color-bg-subtle); border-radius: 12px; margin-bottom: 20px;">
              <div id="mic-indicator" style="width: 64px; height: 64px; border-radius: 50%; background: var(--color-border-default); display: flex; align-items: center; justify-content: center; font-size: 1.75rem; transition: all 300ms ease;">
                🎙️
              </div>
              <div style="margin-top: 12px; font-weight: 600; font-size: 0.875rem;" id="mic-status-text">Microphone Idle</div>
            </div>

            <!-- Real-time Transcript Visual Feedback -->
            <div style="background: var(--color-bg-surface); border: 1px solid var(--color-border-default); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
              <div style="font-size: 0.75rem; color: var(--color-text-secondary); font-weight: 600; margin-bottom: 4px;">OPERATOR TRANSCRIPT (STT)</div>
              <div style="font-size: 1rem; font-weight: 600; color: var(--color-text-primary);" id="transcript-display">"Say a command or click a simulated utterance below..."</div>
            </div>

            <!-- Spoken Readback (ElevenLabs TTS) -->
            <div style="background: rgba(79, 70, 229, 0.05); border: 1px solid var(--color-primary); border-radius: 8px; padding: 16px;">
              <div style="font-size: 0.75rem; color: var(--color-primary); font-weight: 600; margin-bottom: 4px;">ELEVENLABS TTS SPOKEN RESPONSE</div>
              <div style="font-size: 0.875rem; font-weight: 600; color: var(--color-primary);" id="tts-display">Awaiting voice command...</div>
            </div>
          </wms-card>

          <!-- Simulated Utterance Buttons for Demo -->
          <wms-card>
            <span slot="header">Simulated Speech Commands</span>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <wms-button id="btn-cmd-receive" variant="outline" size="sm" style="text-align: left;">
                🗣️ "Receive 50 units of WMS-1001"
              </wms-button>

              <wms-button id="btn-cmd-count" variant="outline" size="sm" style="text-align: left;">
                🗣️ "Count 100 units at A1-02-C for WMS-1001"
              </wms-button>

              <wms-button id="btn-cmd-clarify" variant="warning" size="sm" style="text-align: left;">
                ⚠️ "Fifty or Fifteen units?" (Low Confidence Test)
              </wms-button>

              <wms-button id="btn-cmd-confirm" variant="success" size="sm">
                ✅ "Yes, Confirm"
              </wms-button>
            </div>
          </wms-card>
        </div>
      </div>
    `;

    const toggleBtn = this.container.querySelector('#btn-toggle-handsfree');
    const micInd = this.container.querySelector('#mic-indicator');
    const micText = this.container.querySelector('#mic-status-text');
    const transcriptEl = this.container.querySelector('#transcript-display');
    const ttsEl = this.container.querySelector('#tts-display');

    toggleBtn.addEventListener('click', () => {
      this.micActive = !this.micActive;
      toggleBtn.textContent = this.micActive ? '🎙️ Hands-Free Mode: ACTIVE' : '🎙️ Hands-Free Mode: OFF';
      toggleBtn.variant = this.micActive ? 'danger' : 'primary';

      micInd.style.background = this.micActive ? 'var(--color-danger)' : 'var(--color-border-default)';
      micInd.style.boxShadow = this.micActive ? '0 0 0 8px rgba(239, 68, 68, 0.2)' : 'none';
      micText.textContent = this.micActive ? 'Listening for voice commands...' : 'Microphone Idle';
    });

    this.container.querySelector('#btn-cmd-receive').addEventListener('click', () => {
      transcriptEl.textContent = '"Receive 50 units of WMS-1001"';
      ttsEl.textContent = '🔊 "Receive 50 units of SKU WMS-1001? Say yes to confirm."';
    });

    this.container.querySelector('#btn-cmd-count').addEventListener('click', () => {
      transcriptEl.textContent = '"Count 100 units at A1-02-C for WMS-1001"';
      ttsEl.textContent = '🔊 "Confirm cycle count of 100 units at Bin A1-02-C for WMS-1001? Say yes to confirm."';
    });

    this.container.querySelector('#btn-cmd-clarify').addEventListener('click', () => {
      transcriptEl.textContent = '"Fifty or Fifteen units?"';
      ttsEl.textContent = '⚠️ 🔊 "I heard "Fifty or Fifteen units?", but confidence was low. Did you say 50 units of WMS-1001?"';
    });

    this.container.querySelector('#btn-cmd-confirm').addEventListener('click', () => {
      transcriptEl.textContent = '"Yes, confirm"';
      ttsEl.textContent = '🔊 "Stock operation confirmed and updated in inventory."';
    });
  }
}
