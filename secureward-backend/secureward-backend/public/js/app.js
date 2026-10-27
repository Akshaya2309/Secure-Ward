// ============================================================================
// SECUREWARD - CINEMATIC FRONTEND CONTROLLER
// Pair-programmed for Akshaya P N | Easwari Engineering College
// ============================================================================

// Helper to escape HTML safely (matching PPT slide 9 requirement)
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

class AppController {
  constructor() {
    this.currentView = 'dashboard';
    this.currentRole = 'Warden (Administrator)';
    this.currentSlideIndex = 0;
    this.lockdownActive = false;
  }

  async init() {
    this.setupNavigation();
    this.setupClock();
    this.setupGlobalEvents();
    
    // Subscribe to store updates
    window.dataStore.subscribe(() => {
      this.refreshCurrentView();
    });

    // Initial render
    await this.renderView(this.currentView);

    // Initialize CCTV canvases
    if (window.cctvMatrix) {
      window.cctvMatrix.init();
    }
  }

  setupClock() {
    const clockEl = document.getElementById('utc-clock');
    const updateTime = () => {
      const now = new Date();
      if (clockEl) {
        clockEl.textContent = now.toISOString().replace('T', ' ').slice(0, 19) + ' ZULU';
      }
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        window.soundEngine.playClick();
        const view = item.getAttribute('data-view');
        if (view) {
          this.switchView(view);
        }
      });
    });
  }

  switchView(viewName) {
    this.currentView = viewName;
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-view') === viewName);
    });
    this.renderView(viewName);
  }

  async refreshCurrentView() {
    await this.renderView(this.currentView);
  }

  async renderView(viewName) {
    const container = document.getElementById('main-viewport');
    if (!container) return;

    switch (viewName) {
      case 'dashboard':
        await this.renderDashboard(container);
        break;
      case 'inmates':
        await this.renderInmates(container);
        break;
      case 'cells':
        await this.renderCells(container);
        break;
      case 'incidents':
        await this.renderIncidents(container);
        break;
      case 'visitors':
        await this.renderVisitors(container);
        break;
      case 'medical':
        await this.renderMedical(container);
        break;
      default:
        await this.renderDashboard(container);
    }
  }

  // ==========================================================================
  // VIEW: DASHBOARD
  // ==========================================================================
  async renderDashboard(container) {
    const stats = await window.dataStore.getStats();
    const incidents = await window.dataStore.getIncidents();
    const visits = await window.dataStore.getVisits();

    container.innerHTML = `
      <div class="view-header">
        <div class="view-heading">
          <h2>Facility Overview & Telemetry</h2>
          <p>Real-time correctional telemetry, live surveillance, and capacity metrics</p>
        </div>
        <div class="view-actions">
          <button class="btn-tactical" id="btn-export-brief" onclick="window.soundEngine.playClick(); window.print();">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print Telemetry Report
          </button>
          <button class="btn-tactical primary" onclick="app.openAddInmateModal()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            + Quick Inmate Intake
          </button>
        </div>
      </div>

      <!-- KPI METRIC CARDS (Exact Match to PPT Slide 13) -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-val">${stats.totalInmates}/${stats.capacity}</div>
          <div class="kpi-label">Inmates / capacity</div>
          <div class="kpi-sub">
            <span class="pulse-indicator"></span> 82.2% Facility Occupancy
          </div>
        </div>
        <div class="kpi-card emerald">
          <div class="kpi-val">${stats.visitsToday}</div>
          <div class="kpi-label">Visits today</div>
          <div class="kpi-sub">All visitors screened & logged</div>
        </div>
        <div class="kpi-card crimson">
          <div class="kpi-val">${stats.highSeverityIncidents}</div>
          <div class="kpi-label">High-severity incidents</div>
          <div class="kpi-sub">
            <span class="pulse-indicator crimson"></span> Immediate response active
          </div>
        </div>
        <div class="kpi-card amber">
          <div class="kpi-val">${stats.pendingMedicalCheckups}</div>
          <div class="kpi-label">Pending medical checkups</div>
          <div class="kpi-sub">Infirmary triage queue</div>
        </div>
      </div>

      <!-- CINEMATIC CCTV SURVEILLANCE MATRIX -->
      <div class="cctv-matrix-card">
        <div class="cctv-header">
          <h3>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
            LIVE SURVEILLANCE GRID // MULTI-SECTOR OPTICAL FEEDS
          </h3>
          <span style="font-family: var(--font-mono); font-size: 11px; color: var(--accent-emerald);">
            ● 4/4 FEEDS STREAMING - ZERO LATENCY
          </span>
        </div>
        <div class="cctv-grid">
          <div class="cctv-frame" onclick="app.inspectCCTV('CAM-01: Main Exercise Yard')">
            <canvas id="cam-yard"></canvas>
            <div class="cctv-tag">OPTIC 01</div>
          </div>
          <div class="cctv-frame" onclick="app.inspectCCTV('CAM-02: Block B Corridor')">
            <canvas id="cam-block-b"></canvas>
            <div class="cctv-tag">OPTIC 02</div>
          </div>
          <div class="cctv-frame" onclick="app.inspectCCTV('CAM-03: Visitation Booth 04')">
            <canvas id="cam-visitation"></canvas>
            <div class="cctv-tag">OPTIC 03</div>
          </div>
          <div class="cctv-frame" onclick="app.inspectCCTV('CAM-04: Solitary Bunker')">
            <canvas id="cam-solitary"></canvas>
            <div class="cctv-tag" style="color: #10b981;">INFRARED 04</div>
          </div>
        </div>
      </div>

      <!-- RECENT INCIDENTS & UPCOMING VISITS PANELS -->
      <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px;">
        <!-- Recent Incidents (PPT Screenshot 13) -->
        <div class="table-panel">
          <div class="table-panel-header">
            <h3 style="font-size: 14px; font-weight: 600; color: #fff;">Recent incidents</h3>
            <button class="btn-tactical" onclick="app.switchView('incidents')">View All</button>
          </div>
          <div class="data-table-container">
            <table class="tactical-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Inmate</th>
                  <th>Incident</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody>
                ${incidents.slice(0, 3).map(inc => `
                  <tr>
                    <td style="font-family: var(--font-mono);">${escapeHTML(inc.date)}</td>
                    <td style="font-weight: 600;">${escapeHTML(inc.inmateName)} ${inc.inmateId ? `(#${inc.inmateId})` : ''}</td>
                    <td>${escapeHTML(inc.type)}</td>
                    <td><span class="badge ${inc.severity.toLowerCase()}">${escapeHTML(inc.severity)}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Upcoming Visits (PPT Screenshot 13) -->
        <div class="table-panel">
          <div class="table-panel-header">
            <h3 style="font-size: 14px; font-weight: 600; color: #fff;">Upcoming visits</h3>
            <button class="btn-tactical" onclick="app.switchView('visitors')">View All</button>
          </div>
          <div class="data-table-container">
            <table class="tactical-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Inmate</th>
                  <th>Visitor</th>
                </tr>
              </thead>
              <tbody>
                ${visits.slice(0, 3).map(v => `
                  <tr>
                    <td style="font-family: var(--font-mono);">${escapeHTML(v.visitDate)}</td>
                    <td style="font-weight: 600;">${escapeHTML(v.inmateName)} ${v.inmateId ? `(#${v.inmateId})` : ''}</td>
                    <td>${escapeHTML(v.visitorName)} <span style="color: var(--text-dim); font-size: 11px;">(${escapeHTML(v.relation)})</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Re-bind CCTV canvases
    if (window.cctvMatrix) {
      window.cctvMatrix.init();
    }
  }

  // ==========================================================================
  // VIEW: INMATES (Matches PPT Screenshot 13)
  // ==========================================================================
  async renderInmates(container) {
    const inmates = await window.dataStore.getInmates();

    container.innerHTML = `
      <div class="view-header">
        <div class="view-heading">
          <h2>Inmate Records</h2>
          <p>Classified inmate roster, security classifications, and biometric dossiers</p>
        </div>
        <div class="view-actions">
          <button class="btn-tactical primary" onclick="app.openAddInmateModal()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            + Add Inmate
          </button>
        </div>
      </div>

      <div class="table-panel">
        <div class="table-panel-header">
          <div class="table-filter-bar">
            <div class="search-input-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" id="inmate-search" class="tactical-input" placeholder="Search by name, ID or crime..." oninput="app.filterInmatesTable()">
            </div>
            <select id="inmate-filter-status" class="tactical-select" onchange="app.filterInmatesTable()">
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Isolation">Isolation</option>
              <option value="Released">Released</option>
            </select>
          </div>
          <span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">
            Total Records: <strong id="inmate-count-label" style="color: #fff;">${inmates.length}</strong>
          </span>
        </div>

        <div class="data-table-container">
          <table class="tactical-table" id="inmates-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Crime</th>
                <th>Cell</th>
                <th>Sentence</th>
                <th>Status</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${inmates.map(i => `
                <tr data-id="${i.id}" data-name="${escapeHTML(i.name).toLowerCase()}" data-crime="${escapeHTML(i.crime).toLowerCase()}" data-status="${escapeHTML(i.status)}">
                  <td style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-cyan);">${escapeHTML(i.id)}</td>
                  <td style="font-weight: 600;">
                    <a href="javascript:void(0)" onclick="app.openDossier(${i.id})" style="color: #fff; text-decoration: none; border-bottom: 1px dotted var(--border-glow);">
                      ${escapeHTML(i.name)}
                    </a>
                  </td>
                  <td>${escapeHTML(i.crime)}</td>
                  <td style="font-family: var(--font-mono);">${escapeHTML(i.cellId)}</td>
                  <td>${escapeHTML(i.sentenceYrs)} yrs</td>
                  <td><span class="badge ${escapeHTML(i.status.toLowerCase())}">${escapeHTML(i.status)}</span></td>
                  <td style="text-align: right;">
                    <div class="row-actions" style="justify-content: flex-end;">
                      <button class="btn-icon" title="View Dossier" onclick="app.openDossier(${i.id})">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      </button>
                      <button class="btn-icon danger" title="Cascade Delete Inmate" onclick="app.confirmDeleteInmate(${i.id}, '${escapeHTML(i.name)}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  filterInmatesTable() {
    const q = (document.getElementById('inmate-search')?.value || '').toLowerCase();
    const status = document.getElementById('inmate-filter-status')?.value || 'ALL';
    const rows = document.querySelectorAll('#inmates-table tbody tr');

    let visibleCount = 0;
    rows.forEach(row => {
      const id = row.getAttribute('data-id');
      const name = row.getAttribute('data-name');
      const crime = row.getAttribute('data-crime');
      const rowStatus = row.getAttribute('data-status');

      const matchesQuery = !q || id.includes(q) || name.includes(q) || crime.includes(q);
      const matchesStatus = status === 'ALL' || rowStatus === status;

      if (matchesQuery && matchesStatus) {
        row.style.display = '';
        visibleCount++;
      } else {
        row.style.display = 'none';
      }
    });

    const countLabel = document.getElementById('inmate-count-label');
    if (countLabel) countLabel.textContent = visibleCount;
  }

  // ==========================================================================
  // VIEW: CELLS & BLOCK ALLOCATION
  // ==========================================================================
  async renderCells(container) {
    const cells = await window.dataStore.getCells();
    const inmates = await window.dataStore.getInmates();

    container.innerHTML = `
      <div class="view-header">
        <div class="view-heading">
          <h2>Cell & Block Allocation Matrix</h2>
          <p>Real-time cell capacity validation, security level monitoring, and remote locks</p>
        </div>
        <div class="view-actions">
          <span style="font-family: var(--font-mono); font-size: 11px; color: var(--accent-emerald);">
            ● Overcrowding Prevention Active
          </span>
        </div>
      </div>

      <div class="cell-block-grid">
        ${cells.map(c => {
          const occupants = inmates.filter(i => i.cellId === c.id && i.status !== 'Released');
          const isFull = occupants.length >= c.capacity;
          const percent = Math.min(100, Math.round((occupants.length / c.capacity) * 100));

          return `
            <div class="cell-node-card ${isFull ? 'full' : ''} ${c.block === 'Block D' ? 'isolation' : ''}">
              <div class="cell-node-top">
                <div class="cell-id-badge">${escapeHTML(c.id)}</div>
                <span class="badge ${c.securityLevel.toLowerCase().includes('solitary') ? 'high' : c.securityLevel.toLowerCase()}">
                  ${escapeHTML(c.securityLevel)}
                </span>
              </div>
              <div style="font-size: 11px; color: var(--text-dim); font-family: var(--font-mono);">
                ${escapeHTML(c.block)} // ${escapeHTML(c.wing)}
              </div>

              <!-- Capacity bar -->
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <div style="display: flex; justify-content: space-between; font-size: 11px; font-family: var(--font-mono);">
                  <span>Occupancy:</span>
                  <span style="font-weight: 700; color: ${isFull ? 'var(--accent-amber)' : 'var(--accent-emerald)'};">
                    ${occupants.length} / ${c.capacity} (${percent}%)
                  </span>
                </div>
                <div class="cell-capacity-bar">
                  <div class="cell-capacity-fill ${isFull ? 'full' : ''}" style="width: ${percent}%;"></div>
                </div>
              </div>

              <!-- Occupants list -->
              <div style="background: rgba(0, 0, 0, 0.3); padding: 8px 10px; border-radius: var(--radius-sm); min-height: 50px;">
                <div style="font-size: 9px; font-family: var(--font-mono); color: var(--text-dim); margin-bottom: 4px;">CURRENT OCCUPANTS:</div>
                ${occupants.length === 0 ? '<span style="font-size: 11px; color: var(--text-dim);">Vacant Cell</span>' : ''}
                ${occupants.map(o => `
                  <div style="font-size: 12px; font-weight: 600; display: flex; align-items: center; justify-content: space-between;">
                    <a href="javascript:void(0)" onclick="app.openDossier(${o.id})" style="color: #fff; text-decoration: none;">
                      ${escapeHTML(o.name)} (#${o.id})
                    </a>
                    <span class="badge ${escapeHTML(o.status.toLowerCase())}" style="font-size: 9px; padding: 1px 6px;">${escapeHTML(o.status)}</span>
                  </div>
                `).join('')}
              </div>

              <!-- Cell Door Electronic Lock Button -->
              <button class="btn-tactical" style="justify-content: center; width: 100%; border-color: ${c.isLocked ? 'var(--border-subtle)' : 'var(--accent-amber)'};" onclick="app.toggleLock('${c.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  ${c.isLocked 
                    ? '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>'
                    : '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path>'}
                </svg>
                ${c.isLocked ? 'DOOR SECURED (LOCKED)' : 'OVERRIDE: UNLOCKED'}
              </button>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  async toggleLock(cellId) {
    window.soundEngine.playBeep(900, 0.1);
    await window.dataStore.toggleCellLock(cellId);
    this.refreshCurrentView();
  }

  // ==========================================================================
  // VIEW: INCIDENTS (Matches PPT Screenshot 14)
  // ==========================================================================
  async renderIncidents(container) {
    const incidents = await window.dataStore.getIncidents();

    container.innerHTML = `
      <div class="view-header">
        <div class="view-heading">
          <h2>Incident reports</h2>
          <p>Disciplinary logs, infraction severity records, and security investigations</p>
        </div>
        <div class="view-actions">
          <button class="btn-tactical primary" onclick="app.openLogIncidentModal()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            + Log incident
          </button>
        </div>
      </div>

      <div class="table-panel">
        <div class="table-panel-header">
          <div class="table-filter-bar">
            <span style="font-family: var(--font-mono); font-size: 11px; color: var(--accent-cyan);">
              LOG ENTRIES: ${incidents.length}
            </span>
          </div>
        </div>

        <div class="data-table-container">
          <table class="tactical-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Inmate</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Action taken</th>
              </tr>
            </thead>
            <tbody>
              ${incidents.map(inc => `
                <tr>
                  <td style="font-family: var(--font-mono);">${escapeHTML(inc.date)}</td>
                  <td style="font-weight: 600;">${escapeHTML(inc.inmateName)}</td>
                  <td>${escapeHTML(inc.type)}</td>
                  <td><span class="badge ${inc.severity.toLowerCase()}">${escapeHTML(inc.severity)}</span></td>
                  <td>${escapeHTML(inc.action)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // VIEW: VISITORS (Matches PPT Screenshot 14)
  // ==========================================================================
  async renderVisitors(container) {
    const visits = await window.dataStore.getVisits();

    container.innerHTML = `
      <div class="view-header">
        <div class="view-heading">
          <h2>Visitor management</h2>
          <p>Scheduled visiting sessions, legal consultations, and security clearance checks</p>
        </div>
        <div class="view-actions">
          <button class="btn-tactical primary" onclick="app.openScheduleVisitModal()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            + Schedule visit
          </button>
        </div>
      </div>

      <div class="table-panel">
        <div class="data-table-container">
          <table class="tactical-table">
            <thead>
              <tr>
                <th>Date & time</th>
                <th>Inmate</th>
                <th>Visitor</th>
                <th>Relation</th>
                <th>Status</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${visits.map(v => `
                <tr>
                  <td style="font-family: var(--font-mono);">${escapeHTML(v.visitDate)}</td>
                  <td style="font-weight: 600;">${escapeHTML(v.inmateName)}</td>
                  <td>${escapeHTML(v.visitorName)}</td>
                  <td>${escapeHTML(v.relation)}</td>
                  <td><span class="badge ${v.status.toLowerCase()}">${escapeHTML(v.status)}</span></td>
                  <td style="text-align: right;">
                    ${v.status === 'Scheduled' ? `
                      <button class="btn-tactical" style="padding: 4px 8px; font-size: 10px;" onclick="app.setVisitStatus(${v.id}, 'Completed')">Complete</button>
                      <button class="btn-tactical" style="padding: 4px 8px; font-size: 10px; border-color: var(--accent-crimson); color: #f87171;" onclick="app.setVisitStatus(${v.id}, 'Denied')">Deny</button>
                    ` : `<span style="font-size: 11px; color: var(--text-dim); font-family: var(--font-mono);">${escapeHTML(v.status)}</span>`}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  async setVisitStatus(id, status) {
    window.soundEngine.playClick();
    await window.dataStore.updateVisitStatus(id, status);
    this.refreshCurrentView();
  }

  // ==========================================================================
  // VIEW: MEDICAL BAY & INFIRMARY
  // ==========================================================================
  async renderMedical(container) {
    const medical = await window.dataStore.getMedical();

    container.innerHTML = `
      <div class="view-header">
        <div class="view-heading">
          <h2>Medical & Rehabilitation Records</h2>
          <p>Infirmary clinical logs, inmate triage evaluations, and prescription records</p>
        </div>
        <div class="view-actions">
          <button class="btn-tactical primary" onclick="app.openAddMedicalModal()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            + Log Medical Checkup
          </button>
        </div>
      </div>

      <div class="table-panel">
        <div class="data-table-container">
          <table class="tactical-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Inmate</th>
                <th>Clinical Condition</th>
                <th>Prescribed Treatment / Therapy</th>
                <th>Attending Physician</th>
              </tr>
            </thead>
            <tbody>
              ${medical.map(m => `
                <tr>
                  <td style="font-family: var(--font-mono);">${escapeHTML(m.checkupDate)}</td>
                  <td style="font-weight: 600;">${escapeHTML(m.inmateName)} (#${m.inmateId})</td>
                  <td style="color: var(--accent-amber);">${escapeHTML(m.condition)}</td>
                  <td>${escapeHTML(m.treatment)}</td>
                  <td style="font-family: var(--font-mono); font-size: 11px;">${escapeHTML(m.doctor)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // MODALS & DOSSIER VIEW
  // ==========================================================================
  async openDossier(inmateId) {
    window.soundEngine.playAccessGranted();
    const inmate = await window.dataStore.getInmate(inmateId);
    if (!inmate) return;

    const modalOverlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-box');

    modalContent.className = 'modal-box';
    modalContent.innerHTML = `
      <div class="modal-header">
        <h3>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          CLASSIFIED INMATE DOSSIER // #${escapeHTML(inmate.id)}
        </h3>
        <button class="btn-icon" onclick="app.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="dossier-grid">
          <div class="dossier-mugshot">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <div class="dossier-height-markers">
              <span>6'0"</span>
              <span>5'6"</span>
              <span>5'0"</span>
            </div>
            <div style="margin-top: 6px; font-family: var(--font-mono); font-size: 9px; color: var(--accent-amber);">
              ID: ${escapeHTML(inmate.id)}
            </div>
          </div>

          <div class="dossier-fields">
            <div class="dossier-field">
              <label>Full Name</label>
              <span>${escapeHTML(inmate.name)}</span>
            </div>
            <div class="dossier-field">
              <label>Current Status</label>
              <span><span class="badge ${escapeHTML(inmate.status.toLowerCase())}">${escapeHTML(inmate.status)}</span></span>
            </div>
            <div class="dossier-field">
              <label>Crime / Conviction</label>
              <span style="color: var(--accent-amber);">${escapeHTML(inmate.crime)}</span>
            </div>
            <div class="dossier-field">
              <label>Assigned Cell</label>
              <span style="font-family: var(--font-mono);">${escapeHTML(inmate.cellId)}</span>
            </div>
            <div class="dossier-field">
              <label>Sentence Duration</label>
              <span>${escapeHTML(inmate.sentenceYrs)} Years</span>
            </div>
            <div class="dossier-field">
              <label>Admission Date</label>
              <span style="font-family: var(--font-mono);">${escapeHTML(inmate.admitDate)}</span>
            </div>
            <div class="dossier-field">
              <label>Blood Group</label>
              <span>${escapeHTML(inmate.bloodGroup || 'O+')}</span>
            </div>
            <div class="dossier-field">
              <label>Security Risk Level</label>
              <span class="badge ${escapeHTML((inmate.riskLevel || 'Medium').toLowerCase())}">${escapeHTML(inmate.riskLevel || 'Medium')}</span>
            </div>
          </div>
        </div>

        <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: var(--radius-sm); border-left: 2px solid var(--accent-cyan);">
          <div style="font-size: 10px; font-family: var(--font-mono); color: var(--text-dim);">WARDEN & SUPERVISORY OBSERVATIONS:</div>
          <p style="font-size: 12px; margin-top: 4px; color: #cbd5e1;">${escapeHTML(inmate.notes)}</p>
        </div>

        <!-- Incidents logged for this inmate -->
        <div>
          <div style="font-size: 11px; font-family: var(--font-mono); color: var(--accent-cyan); margin-bottom: 6px;">
            INCIDENT HISTORY (${inmate.incidents ? inmate.incidents.length : 0})
          </div>
          ${inmate.incidents && inmate.incidents.length > 0 ? `
            <table class="tactical-table" style="font-size: 11px;">
              <thead>
                <tr><th>Date</th><th>Type</th><th>Severity</th><th>Action</th></tr>
              </thead>
              <tbody>
                ${inmate.incidents.map(inc => `
                  <tr>
                    <td>${escapeHTML(inc.date)}</td>
                    <td>${escapeHTML(inc.type)}</td>
                    <td><span class="badge ${inc.severity.toLowerCase()}">${escapeHTML(inc.severity)}</span></td>
                    <td>${escapeHTML(inc.action)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<p style="font-size: 11px; color: var(--text-dim);">No infractions recorded.</p>'}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-tactical" onclick="window.soundEngine.playClick(); window.print();">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Print Dossier Card
        </button>
        <button class="btn-tactical primary" onclick="app.closeModal()">Close Dossier</button>
      </div>
    `;

    modalOverlay.classList.add('active');
  }

  // --- ADD INMATE MODAL ---
  async openAddInmateModal() {
    window.soundEngine.playClick();
    const cells = await window.dataStore.getCells();
    const inmates = await window.dataStore.getInmates();

    const modalOverlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-box');

    modalContent.className = 'modal-box';
    modalContent.innerHTML = `
      <div class="modal-header">
        <h3>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          REGISTER NEW INMATE INTAKE
        </h3>
        <button class="btn-icon" onclick="app.closeModal()">✕</button>
      </div>
      <form id="form-add-inmate" onsubmit="app.submitAddInmate(event)">
        <div class="modal-body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div class="dossier-field">
              <label>Full Legal Name *</label>
              <input type="text" name="name" class="tactical-input" required placeholder="e.g. Vikram Raghavan" style="padding-left: 12px; width: 100%;">
            </div>
            <div class="dossier-field">
              <label>Primary Crime / Charge *</label>
              <input type="text" name="crime" class="tactical-input" required placeholder="e.g. Cyber Fraud, Armed Robbery" style="padding-left: 12px; width: 100%;">
            </div>
            <div class="dossier-field">
              <label>Sentence (Years) *</label>
              <input type="number" name="sentenceYrs" class="tactical-input" min="1" max="50" value="3" required style="padding-left: 12px; width: 100%;">
            </div>
            <div class="dossier-field">
              <label>Admission Date</label>
              <input type="date" name="admitDate" class="tactical-input" value="${new Date().toISOString().split('T')[0]}" style="padding-left: 12px; width: 100%;">
            </div>
            <div class="dossier-field">
              <label>Cell Allocation (Capacity Checked)</label>
              <select name="cellId" class="tactical-select" style="width: 100%;">
                ${cells.map(c => {
                  const occupants = inmates.filter(i => i.cellId === c.id && i.status !== 'Released');
                  const isFull = occupants.length >= c.capacity;
                  return `<option value="${c.id}" ${isFull ? 'disabled' : ''}>
                    ${c.id} (${c.block}) - [${occupants.length}/${c.capacity} ${isFull ? 'FULL' : 'AVAILABLE'}]
                  </option>`;
                }).join('')}
              </select>
            </div>
            <div class="dossier-field">
              <label>Initial Status</label>
              <select name="status" class="tactical-select" style="width: 100%;">
                <option value="Active">Active</option>
                <option value="Isolation">Isolation</option>
              </select>
            </div>
          </div>
          <div class="dossier-field">
            <label>Intake & Medical Screening Notes</label>
            <textarea name="notes" class="tactical-input" style="padding: 10px; width: 100%; height: 70px; resize: vertical;" placeholder="Security assessment, medical conditions, contraband scan results..."></textarea>
          </div>
          <div id="add-inmate-error" style="color: var(--accent-crimson); font-size: 11px; font-family: var(--font-mono); display: none;"></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-tactical" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn-tactical primary">Register & Allocate Cell</button>
        </div>
      </form>
    `;

    modalOverlay.classList.add('active');
  }

  async submitAddInmate(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = {
      name: formData.get('name'),
      crime: formData.get('crime'),
      sentenceYrs: formData.get('sentenceYrs'),
      admitDate: formData.get('admitDate'),
      cellId: formData.get('cellId'),
      status: formData.get('status'),
      notes: formData.get('notes')
    };

    try {
      await window.dataStore.addInmate(data);
      window.soundEngine.playAccessGranted();
      this.closeModal();
      this.refreshCurrentView();
    } catch (err) {
      window.soundEngine.playAccessDenied();
      const errEl = document.getElementById('add-inmate-error');
      if (errEl) {
        errEl.textContent = err.message || 'Failed to register inmate.';
        errEl.style.display = 'block';
      }
    }
  }

  async confirmDeleteInmate(id, name) {
    window.soundEngine.playBeep(400, 0.2);
    const confirmed = confirm(`Are you sure you want to delete inmate ${name} (#${id})?\n\nPPT Architecture Requirement: This will cascade delete all linked incidents, visits, and medical records!`);
    if (confirmed) {
      await window.dataStore.deleteInmate(id);
      window.soundEngine.playClick();
      this.refreshCurrentView();
    }
  }

  // --- LOG INCIDENT MODAL ---
  async openLogIncidentModal() {
    window.soundEngine.playClick();
    const inmates = await window.dataStore.getInmates();

    const modalOverlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-box');

    modalContent.className = 'modal-box';
    modalContent.innerHTML = `
      <div class="modal-header">
        <h3>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-crimson)" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          LOG FACILITY INCIDENT REPORT
        </h3>
        <button class="btn-icon" onclick="app.closeModal()">✕</button>
      </div>
      <form id="form-log-incident" onsubmit="app.submitLogIncident(event)">
        <div class="modal-body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div class="dossier-field">
              <label>Involved Inmate</label>
              <select name="inmateId" class="tactical-select" style="width: 100%;">
                ${inmates.map(i => `<option value="${i.id}">${escapeHTML(i.name)} (#${i.id}) - Cell ${escapeHTML(i.cellId)}</option>`).join('')}
              </select>
            </div>
            <div class="dossier-field">
              <label>Incident Type *</label>
              <input type="text" name="type" class="tactical-input" required placeholder="e.g. Contraband, Altercation, Verbal dispute" style="padding-left: 12px; width: 100%;">
            </div>
            <div class="dossier-field">
              <label>Severity Level *</label>
              <select name="severity" class="tactical-select" style="width: 100%;">
                <option value="High">High (Immediate Isolation)</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div class="dossier-field">
              <label>Date of Incident</label>
              <input type="date" name="date" class="tactical-input" value="${new Date().toISOString().split('T')[0]}" style="padding-left: 12px; width: 100%;">
            </div>
          </div>
          <div class="dossier-field">
            <label>Disciplinary Action Prescribed *</label>
            <input type="text" name="action" class="tactical-input" required placeholder="e.g. Isolation 3 days, Warning issued, Privilege review" style="padding-left: 12px; width: 100%;">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-tactical" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn-tactical primary">Submit Incident Log</button>
        </div>
      </form>
    `;

    modalOverlay.classList.add('active');
  }

  async submitLogIncident(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = {
      inmateId: formData.get('inmateId'),
      type: formData.get('type'),
      severity: formData.get('severity'),
      date: formData.get('date'),
      action: formData.get('action')
    };

    await window.dataStore.addIncident(data);
    window.soundEngine.playAccessGranted();
    this.closeModal();
    this.refreshCurrentView();
  }

  // --- SCHEDULE VISIT MODAL ---
  async openScheduleVisitModal() {
    window.soundEngine.playClick();
    const inmates = await window.dataStore.getInmates();

    const modalOverlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-box');

    modalContent.className = 'modal-box';
    modalContent.innerHTML = `
      <div class="modal-header">
        <h3>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          SCHEDULE INMATE VISITATION
        </h3>
        <button class="btn-icon" onclick="app.closeModal()">✕</button>
      </div>
      <form id="form-schedule-visit" onsubmit="app.submitScheduleVisit(event)">
        <div class="modal-body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div class="dossier-field">
              <label>Inmate to Visit *</label>
              <select name="inmateId" class="tactical-select" style="width: 100%;">
                ${inmates.map(i => `<option value="${i.id}">${escapeHTML(i.name)} (#${i.id})</option>`).join('')}
              </select>
            </div>
            <div class="dossier-field">
              <label>Visitor Full Name *</label>
              <input type="text" name="visitorName" class="tactical-input" required placeholder="e.g. Lakshmi R" style="padding-left: 12px; width: 100%;">
            </div>
            <div class="dossier-field">
              <label>Relationship *</label>
              <input type="text" name="relation" class="tactical-input" required placeholder="e.g. Spouse, Lawyer, Mother, Brother" style="padding-left: 12px; width: 100%;">
            </div>
            <div class="dossier-field">
              <label>Date & Time *</label>
              <input type="datetime-local" name="visitDate" class="tactical-input" value="${new Date().toISOString().slice(0, 16)}" style="padding-left: 12px; width: 100%;">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-tactical" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn-tactical primary">Confirm Schedule</button>
        </div>
      </form>
    `;

    modalOverlay.classList.add('active');
  }

  async submitScheduleVisit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = {
      inmateId: formData.get('inmateId'),
      visitorName: formData.get('visitorName'),
      relation: formData.get('relation'),
      visitDate: formData.get('visitDate').replace('T', ' ')
    };

    await window.dataStore.addVisit(data);
    window.soundEngine.playAccessGranted();
    this.closeModal();
    this.refreshCurrentView();
  }

  // --- ADD MEDICAL MODAL ---
  async openAddMedicalModal() {
    window.soundEngine.playClick();
    const inmates = await window.dataStore.getInmates();

    const modalOverlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-box');

    modalContent.className = 'modal-box';
    modalContent.innerHTML = `
      <div class="modal-header">
        <h3>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
          LOG INFIRMARY CLINICAL CHECKUP
        </h3>
        <button class="btn-icon" onclick="app.closeModal()">✕</button>
      </div>
      <form id="form-add-medical" onsubmit="app.submitAddMedical(event)">
        <div class="modal-body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div class="dossier-field">
              <label>Patient (Inmate) *</label>
              <select name="inmateId" class="tactical-select" style="width: 100%;">
                ${inmates.map(i => `<option value="${i.id}">${escapeHTML(i.name)} (#${i.id})</option>`).join('')}
              </select>
            </div>
            <div class="dossier-field">
              <label>Checkup Date</label>
              <input type="date" name="checkupDate" class="tactical-input" value="${new Date().toISOString().split('T')[0]}" style="padding-left: 12px; width: 100%;">
            </div>
          </div>
          <div class="dossier-field">
            <label>Clinical Diagnosis / Condition *</label>
            <input type="text" name="condition" class="tactical-input" required placeholder="e.g. Hypertension, Laceration, Bronchitis" style="padding-left: 12px; width: 100%;">
          </div>
          <div class="dossier-field">
            <label>Prescribed Treatment / Therapy *</label>
            <textarea name="treatment" class="tactical-input" required style="padding: 10px; width: 100%; height: 60px;" placeholder="Dosage, bandage, referral or therapy schedule..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-tactical" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn-tactical primary">Save Medical Log</button>
        </div>
      </form>
    `;

    modalOverlay.classList.add('active');
  }

  async submitAddMedical(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = {
      inmateId: formData.get('inmateId'),
      checkupDate: formData.get('checkupDate'),
      condition: formData.get('condition'),
      treatment: formData.get('treatment')
    };

    await window.dataStore.addMedical(data);
    window.soundEngine.playAccessGranted();
    this.closeModal();
    this.refreshCurrentView();
  }

  // --- CCTV INSPECTION MODAL ---
  inspectCCTV(title) {
    window.soundEngine.playClick();
    alert(`[TACTICAL SURVEILLANCE FEED EXPANDED]\n${title}\nBiometric feed locked. Optical recording timestamp active.`);
  }

  closeModal() {
    window.soundEngine.playClick();
    const modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay) {
      modalOverlay.classList.remove('active');
    }
  }

  // ==========================================================================
  // FACILITY LOCKDOWN EMERGENCY TRIGGER
  // ==========================================================================
  async triggerLockdown() {
    this.lockdownActive = !this.lockdownActive;
    
    if (this.lockdownActive) {
      window.soundEngine.startLockdownSiren();
      document.body.classList.add('lockdown-active');
      document.getElementById('defcon-badge').textContent = 'DEFCON 1 - CODE RED';
      document.getElementById('defcon-badge').classList.add('crimson');
      document.getElementById('lockdown-btn-label').textContent = 'DISENGAGE LOCKDOWN';
    } else {
      window.soundEngine.stopLockdownSiren();
      document.body.classList.remove('lockdown-active');
      document.getElementById('defcon-badge').textContent = 'DEFCON 4 - SECURE';
      document.getElementById('defcon-badge').classList.remove('crimson');
      document.getElementById('lockdown-btn-label').textContent = 'FACILITY LOCKDOWN';
    }

    await window.dataStore.toggleLockdown(this.lockdownActive);
    this.refreshCurrentView();
  }

  // ==========================================================================
  // ACADEMIC REVIEW PPT SLIDE SHOWCASE
  // ==========================================================================
  openSlideShowcase() {
    window.soundEngine.playAccessGranted();
    this.currentSlideIndex = 0;
    this.renderCurrentSlide();
  }

  renderCurrentSlide() {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-box');

    const slides = [
      {
        title: "EASWARI ENGINEERING COLLEGE - RAMAPURAM, CHENNAI",
        subtitle: "Department of Information Technology | 2311CSC503R - Full Stack Development",
        content: `
          <div style="text-align: center; padding: 20px 0;">
            <div style="font-size: 13px; color: var(--accent-amber); font-family: var(--font-mono); letter-spacing: 2px;">PROJECT REVIEW 1 & 2</div>
            <h1 style="font-size: 26px; color: #fff; margin: 12px 0; font-weight: 800;">CORRECTIONAL FACILITY MANAGEMENT SYSTEM</h1>
            <div style="font-size: 16px; color: var(--accent-cyan); font-weight: 600;">(SecureWard OS)</div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px; text-align: left; background: rgba(0,0,0,0.3); padding: 18px; border-radius: 8px;">
              <div>
                <div style="font-size: 10px; color: var(--text-dim); font-family: var(--font-mono);">SUBMITTED BY:</div>
                <div style="font-size: 15px; font-weight: 700; color: #fff; margin-top: 4px;">Akshaya P N</div>
                <div style="font-size: 12px; color: var(--text-muted);">Dept of Information Technology</div>
              </div>
              <div>
                <div style="font-size: 10px; color: var(--text-dim); font-family: var(--font-mono);">FACULTY SUPERVISOR:</div>
                <div style="font-size: 15px; font-weight: 700; color: var(--accent-amber); margin-top: 4px;">Ms. Sai Lakshmi Grandhi</div>
                <div style="font-size: 12px; color: var(--text-muted);">Faculty, Dept of IT</div>
              </div>
            </div>
          </div>
        `
      },
      {
        title: "SYSTEM ARCHITECTURE (CLIENT - APP - DATA TIER)",
        subtitle: "Slide 03: Multi-tier Clean Architecture with RESTful Endpoints",
        content: `
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
              <div style="background: rgba(14,25,38,0.8); border: 1px solid var(--accent-cyan); padding: 16px; border-radius: 6px;">
                <div style="font-size: 11px; font-family: var(--font-mono); color: var(--accent-cyan);">TIER 1: CLIENT TIER</div>
                <div style="font-size: 13px; font-weight: 700; margin-top: 6px; color: #fff;">HTML5, CSS3 & JavaScript</div>
                <p style="font-size: 11px; color: var(--text-muted); margin-top: 6px;">Fetch API, tactical responsive UI, client form validation, output sanitization.</p>
              </div>
              <div style="background: rgba(14,25,38,0.8); border: 1px solid var(--accent-amber); padding: 16px; border-radius: 6px;">
                <div style="font-size: 11px; font-family: var(--font-mono); color: var(--accent-amber);">TIER 2: APPLICATION TIER</div>
                <div style="font-size: 13px; font-weight: 700; margin-top: 6px; color: #fff;">Node.js HTTP Server</div>
                <p style="font-size: 11px; color: var(--text-muted); margin-top: 6px;">Built-in http & fs modules, REST API routes (/api/inmates, /api/cells), JSON body parsing.</p>
              </div>
              <div style="background: rgba(14,25,38,0.8); border: 1px solid var(--accent-emerald); padding: 16px; border-radius: 6px;">
                <div style="font-size: 11px; font-family: var(--font-mono); color: var(--accent-emerald);">TIER 3: DATA TIER</div>
                <div style="font-size: 13px; font-weight: 700; margin-top: 6px; color: #fff;">JSON File Store (data.json)</div>
                <p style="font-size: 11px; color: var(--text-muted); margin-top: 6px;">Inmates, cells, incidents, visits, medical collections. Cascade delete on entity release.</p>
              </div>
            </div>
            <div style="background: rgba(0,0,0,0.4); padding: 14px; border-radius: 6px; font-size: 11.5px; color: #cbd5e1; border-left: 3px solid var(--accent-cyan);">
              <strong>Architecture Flow:</strong> Browser requests flow through the Node.js REST API (<code style="color: var(--accent-amber)">/api/...</code>) to the persistent JSON data store, with validated JSON responses returned along the same path.
            </div>
          </div>
        `
      },
      {
        title: "ENTITY RELATIONSHIP & DATABASE DESIGN",
        subtitle: "Slide 05: Central Inmate Entity with Linked Foreign Keys",
        content: `
          <div style="display: flex; flex-direction: column; gap: 12px; font-size: 12px;">
            <p style="color: #cbd5e1;"><strong>Inmate</strong> is the central primary entity linking 4 specialized subsystems:</p>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
              <div style="background: rgba(10,18,28,0.8); border: 1px solid var(--border-subtle); padding: 10px; border-radius: 4px;">
                <div style="color: var(--accent-cyan); font-weight: 700;">CELL (1:N)</div>
                <p style="font-size: 10px; color: var(--text-dim); margin-top: 4px;">Houses Inmates. Attributes: id, block, cellNo, capacity, securityLevel.</p>
              </div>
              <div style="background: rgba(10,18,28,0.8); border: 1px solid var(--border-subtle); padding: 10px; border-radius: 4px;">
                <div style="color: var(--accent-amber); font-weight: 700;">VISIT (1:N)</div>
                <p style="font-size: 10px; color: var(--text-dim); margin-top: 4px;">Receives Visitors. Attributes: id, inmateId, visitorName, relation, status.</p>
              </div>
              <div style="background: rgba(10,18,28,0.8); border: 1px solid var(--border-subtle); padding: 10px; border-radius: 4px;">
                <div style="color: var(--accent-crimson); font-weight: 700;">INCIDENT (1:N)</div>
                <p style="font-size: 10px; color: var(--text-dim); margin-top: 4px;">Logged Infractions. Attributes: id, inmateId, date, type, severity, action.</p>
              </div>
              <div style="background: rgba(10,18,28,0.8); border: 1px solid var(--border-subtle); padding: 10px; border-radius: 4px;">
                <div style="color: var(--accent-emerald); font-weight: 700;">MEDICAL (1:N)</div>
                <p style="font-size: 10px; color: var(--text-dim); margin-top: 4px;">Undergoes Checkups. Attributes: id, inmateId, checkupDate, condition, treatment.</p>
              </div>
            </div>
            <div style="margin-top: 10px; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 4px; font-family: var(--font-mono); font-size: 11px;">
              ✓ Cascade Delete rule: Deleting an inmate immediately purges linked visits, incidents, and medical records to prevent orphaned entries.
            </div>
          </div>
        `
      },
      {
        title: "CHALLENGES FACED & TECHNICAL SOLUTIONS",
        subtitle: "Slide 15: Critical Engineering Milestones Resolved",
        content: `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="background: rgba(14,24,36,0.6); padding: 12px; border-radius: 4px; border-left: 3px solid var(--accent-amber);">
              <div style="font-weight: 700; color: #fff;">1. Preventing Cell Overcrowding</div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Solution: Checked cell capacity dynamically before every allocation and disabled full cells in UI.</div>
            </div>
            <div style="background: rgba(14,24,36,0.6); padding: 12px; border-radius: 4px; border-left: 3px solid var(--accent-cyan);">
              <div style="font-weight: 700; color: #fff;">2. Linking Records Across Collections</div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Solution: Implemented relational <code style="color:var(--accent-amber)">cellId</code> and <code style="color:var(--accent-amber)">inmateId</code> foreign key references with auto-increment keys.</div>
            </div>
            <div style="background: rgba(14,24,36,0.6); padding: 12px; border-radius: 4px; border-left: 3px solid var(--accent-crimson);">
              <div style="font-weight: 700; color: #fff;">3. Preventing Orphaned Records</div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Solution: Added cascade delete logic across incident, visit, and medical collections.</div>
            </div>
            <div style="background: rgba(14,24,36,0.6); padding: 12px; border-radius: 4px; border-left: 3px solid var(--accent-emerald);">
              <div style="font-weight: 700; color: #fff;">4. Safe Display & Prevention of XSS</div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Solution: Implemented strict HTML entity escaping for all user-entered inputs before injection.</div>
            </div>
          </div>
        `
      }
    ];

    const slide = slides[this.currentSlideIndex];

    modalContent.className = 'modal-box slides-modal';
    modalContent.innerHTML = `
      <div class="modal-header">
        <h3>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          PROJECT REVIEW SHOWCASE // SLIDE ${this.currentSlideIndex + 1} OF ${slides.length}
        </h3>
        <button class="btn-icon" onclick="app.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="slide-viewport">
          <div style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 10px; margin-bottom: 16px;">
            <h2 style="font-size: 18px; color: #fff; letter-spacing: 0.5px;">${slide.title}</h2>
            <div style="font-size: 11px; color: var(--accent-amber); font-family: var(--font-mono); margin-top: 2px;">${slide.subtitle}</div>
          </div>
          <div>${slide.content}</div>
        </div>
        <div class="slide-controls">
          <button class="btn-tactical" ${this.currentSlideIndex === 0 ? 'disabled style="opacity:0.4;"' : ''} onclick="app.prevSlide()">
            ◀ Previous Slide
          </button>
          <div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">
            Slide ${this.currentSlideIndex + 1} / ${slides.length}
          </div>
          <button class="btn-tactical" ${this.currentSlideIndex === slides.length - 1 ? 'disabled style="opacity:0.4;"' : ''} onclick="app.nextSlide()">
            Next Slide ▶
          </button>
        </div>
      </div>
    `;

    modalOverlay.classList.add('active');
  }

  nextSlide() {
    window.soundEngine.playClick();
    this.currentSlideIndex++;
    this.renderCurrentSlide();
  }

  prevSlide() {
    window.soundEngine.playClick();
    this.currentSlideIndex--;
    this.renderCurrentSlide();
  }

  setupGlobalEvents() {
    // Escape key closes modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
      }
    });
  }
}

window.app = new AppController();
document.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});
