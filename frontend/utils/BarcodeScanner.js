/**
 * BarcodeScanner utility
 * Interfaces with device camera via navigator.mediaDevices.getUserMedia
 * with fallback simulation mode for floor operator testing.
 */
export class BarcodeScanner {
  constructor(videoElement, onScanCallback) {
    this.videoElement = videoElement;
    this.onScanCallback = onScanCallback || (() => {});
    this.stream = null;
    this.isScanning = false;
  }

  async startCamera() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      console.warn('Camera API unavailable — fallback to manual / barcode simulation mode');
      return false;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (this.videoElement) {
        this.videoElement.srcObject = this.stream;
        await this.videoElement.play();
      }
      this.isScanning = true;
      return true;
    } catch (err) {
      console.warn('Could not access camera:', err.message);
      return false;
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.isScanning = false;
  }

  /**
   * Simulates a barcode scan (useful for UI testing and floor workflows)
   * @param {string} barcode
   */
  simulateScan(barcode = 'WMS-1001') {
    this.onScanCallback(barcode);
  }
}
