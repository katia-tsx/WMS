import '../../design-system/index.js';

export class VehicleRosterView {
  constructor(container) {
    this.container = container;
  }

  mount() {
    this.container.innerHTML = `
      <div class="vehicle-roster-module" style="font-family: var(--font-sans);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <div>
            <h1 style="font-size: 1.5rem; font-weight: 600; margin: 0;">Fleet Management &amp; Vehicle Roster</h1>
            <p style="color: var(--color-text-secondary); margin: 4px 0 0; font-size: 0.875rem;">
              Vehicle availability status, driver certification tracking, and scheduled maintenance calendar.
            </p>
          </div>
          <div>
            <wms-button id="btn-schedule-maint" size="sm">+ Schedule Maintenance</wms-button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
          <!-- Vehicle Roster Grid -->
          <wms-card>
            <span slot="header">Fleet Vehicle Roster</span>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
              <thead>
                <tr style="border-bottom: 1px solid var(--color-border-default); text-align: left; color: var(--color-text-secondary);">
                  <th style="padding: 8px;">License Plate</th>
                  <th style="padding: 8px;">Capacity</th>
                  <th style="padding: 8px;">Odometer</th>
                  <th style="padding: 8px;">Status</th>
                  <th style="padding: 8px;">Assigned Driver</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid var(--color-border-subtle);">
                  <td style="padding: 8px; font-weight: 600; font-family: var(--font-mono);">TX-V101</td>
                  <td style="padding: 8px;">1,200 kg</td>
                  <td style="padding: 8px;">42,150 km</td>
                  <td style="padding: 8px;"><wms-badge variant="success" size="sm" dot>AVAILABLE</wms-badge></td>
                  <td style="padding: 8px;">John Doe</td>
                </tr>
                <tr style="border-bottom: 1px solid var(--color-border-subtle);">
                  <td style="padding: 8px; font-weight: 600; font-family: var(--font-mono);">TX-V102</td>
                  <td style="padding: 8px;">2,500 kg</td>
                  <td style="padding: 8px;">89,400 km</td>
                  <td style="padding: 8px;"><wms-badge variant="warning" size="sm" dot>IN MAINTENANCE</wms-badge></td>
                  <td style="padding: 8px;">Sarah Smith</td>
                </tr>
                <tr>
                  <td style="padding: 8px; font-weight: 600; font-family: var(--font-mono);">TX-V103</td>
                  <td style="padding: 8px;">800 kg</td>
                  <td style="padding: 8px;">15,800 km</td>
                  <td style="padding: 8px;"><wms-badge variant="primary" size="sm" dot>ON ROUTE</wms-badge></td>
                  <td style="padding: 8px;">Robert Chen</td>
                </tr>
              </tbody>
            </table>
          </wms-card>

          <!-- Driver Roster & Certification Expiry Alerts -->
          <wms-card>
            <span slot="header">Driver Roster &amp; Certifications</span>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div style="padding: 10px; border-radius: 8px; background: var(--color-bg-subtle);">
                <div style="display: flex; justify-content: space-between; font-size: 0.875rem; font-weight: 600;">
                  <span>John Doe</span>
                  <wms-badge variant="success" size="sm">VALID</wms-badge>
                </div>
                <div style="font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 2px;">
                  Cert Expiry: 2027-05-15
                </div>
              </div>

              <div style="padding: 10px; border-radius: 8px; background: var(--color-bg-subtle);">
                <div style="display: flex; justify-content: space-between; font-size: 0.875rem; font-weight: 600;">
                  <span>Sarah Smith</span>
                  <wms-badge variant="warning" size="sm">EXPIRING SOON</wms-badge>
                </div>
                <div style="font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 2px;">
                  Cert Expiry: 2026-08-15 (11 days remaining)
                </div>
              </div>

              <div style="padding: 10px; border-radius: 8px; background: var(--color-bg-subtle);">
                <div style="display: flex; justify-content: space-between; font-size: 0.875rem; font-weight: 600;">
                  <span>Alex Rivera</span>
                  <wms-badge variant="danger" size="sm">EXPIRED</wms-badge>
                </div>
                <div style="font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 2px;">
                  Cert Expiry: 2026-07-30 (Assignment Blocked)
                </div>
              </div>
            </div>
          </wms-card>
        </div>
      </div>
    `;

    this.container.querySelector('#btn-schedule-maint').addEventListener('click', () => {
      alert('Maintenance service scheduled for vehicle TX-V102. Vehicle status updated to IN_MAINTENANCE.');
    });
  }
}
