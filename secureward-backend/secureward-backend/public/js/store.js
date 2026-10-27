// ============================================================================
// SECUREWARD - DATA STORE (REST API Client with LocalStorage Fallback)
// Ensures 100% offline and standalone operation or full Node.js API connectivity
// ============================================================================

const SEED_DATA = {
  inmates: [
    { id: 1042, name: "Ravi Kumar", crime: "Burglary", cellId: "B-14", sentenceYrs: 5, admitDate: "2023-03-15", status: "Active", riskLevel: "Medium", notes: "Cooperative, assigned to laundry workshop duty. High alert contraband history.", bloodGroup: "O+", dob: "1994-06-22" },
    { id: 1051, name: "Arun Prasad", crime: "Fraud", cellId: "A-03", sentenceYrs: 3, admitDate: "2024-01-10", status: "Active", riskLevel: "Low", notes: "White-collar inmate. Assists with library cataloguing.", bloodGroup: "B+", dob: "1988-11-04" },
    { id: 1063, name: "Selvam M", crime: "Assault", cellId: "C-21", sentenceYrs: 7, admitDate: "2022-08-19", status: "Isolation", riskLevel: "High", notes: "Placed in solitary confinement following physical aggression during yard time.", bloodGroup: "A+", dob: "1991-02-14" },
    { id: 1075, name: "Karthik V", crime: "Theft", cellId: "B-09", sentenceYrs: 2, admitDate: "2025-05-12", status: "Active", riskLevel: "Low", notes: "Good conduct, eligible for parole review in Q2.", bloodGroup: "AB+", dob: "1997-09-30" },
    { id: 1087, name: "Mohan S", crime: "Assault", cellId: "C-18", sentenceYrs: 4, admitDate: "2023-11-20", status: "Active", riskLevel: "Medium", notes: "Reprimanded for dining hall dispute. Enrolled in anger management.", bloodGroup: "O-", dob: "1993-08-18" },
    { id: 1094, name: "Imran Khan", crime: "Forgery", cellId: "A-11", sentenceYrs: 1, admitDate: "2025-10-01", status: "Released", riskLevel: "Low", notes: "Sentence completed with full remission. Formal discharge filed.", bloodGroup: "A-", dob: "1995-12-05" }
  ],
  cells: [
    { id: "A-03", block: "Block A", cellNo: "03", capacity: 2, currentOccupants: 1, securityLevel: "Minimum", wing: "East Wing", isLocked: true },
    { id: "A-11", block: "Block A", cellNo: "11", capacity: 2, currentOccupants: 0, securityLevel: "Minimum", wing: "East Wing", isLocked: true },
    { id: "B-09", block: "Block B", cellNo: "09", capacity: 4, currentOccupants: 1, securityLevel: "Medium", wing: "North Wing", isLocked: true },
    { id: "B-14", block: "Block B", cellNo: "14", capacity: 4, currentOccupants: 1, securityLevel: "Medium", wing: "North Wing", isLocked: true },
    { id: "C-18", block: "Block C", cellNo: "18", capacity: 2, currentOccupants: 1, securityLevel: "Maximum", wing: "South Wing", isLocked: true },
    { id: "C-21", block: "Block C", cellNo: "21", capacity: 1, currentOccupants: 1, securityLevel: "Maximum", wing: "South Wing", isLocked: true },
    { id: "D-01", block: "Block D", cellNo: "01", capacity: 1, currentOccupants: 0, securityLevel: "High / Solitary", wing: "Isolation Bunker", isLocked: true },
    { id: "D-02", block: "Block D", cellNo: "02", capacity: 1, currentOccupants: 0, securityLevel: "High / Solitary", wing: "Isolation Bunker", isLocked: true }
  ],
  incidents: [
    { id: 1, inmateId: 1042, inmateName: "Ravi Kumar", date: "2026-10-12", time: "14:20", type: "Contraband in cell", severity: "High", action: "Isolation 3 days", location: "Cell B-14", officer: "Officer J. Vance", status: "Resolved" },
    { id: 2, inmateId: 1087, inmateName: "Mohan S", date: "2026-10-11", time: "12:45", type: "Altercation", severity: "Medium", action: "Warning issued", location: "Dining Hall B", officer: "Officer K. Raman", status: "Closed" },
    { id: 3, inmateId: 1063, inmateName: "Selvam M", date: "2026-10-09", time: "07:00", type: "Refused roll call", severity: "Low", action: "Counselling", location: "Block C Corridor", officer: "Sgt. D. Thomas", status: "Closed" },
    { id: 4, inmateId: 1075, inmateName: "Karthik V", date: "2026-10-06", time: "18:30", type: "Unauthorised item", severity: "Medium", action: "Privilege review", location: "Recreation Yard", officer: "Officer M. Stewart", status: "Closed" },
    { id: 5, inmateId: 1051, inmateName: "Arun Prasad", date: "2026-10-02", time: "10:15", type: "Verbal dispute", severity: "Low", action: "Warning issued", location: "Library Annex", officer: "Officer R. Nathan", status: "Closed" },
    { id: 6, inmateId: 1063, inmateName: "Selvam M", date: "2026-09-28", time: "16:40", type: "Assault on inmate", severity: "High", action: "Isolation 7 days", location: "Main Exercise Yard", officer: "Captain H. Miller", status: "Resolved" }
  ],
  visits: [
    { id: 1, inmateId: 1042, inmateName: "Ravi Kumar", visitorName: "Lakshmi R", relation: "Spouse", visitDate: "2026-10-14 10:30", status: "Scheduled", booth: "Booth 02", idProof: "Govt Photo ID (Verified)" },
    { id: 2, inmateId: 1051, inmateName: "Arun Prasad", visitorName: "Suresh P", relation: "Brother", visitDate: "2026-10-14 11:15", status: "Scheduled", booth: "Booth 04", idProof: "Passport (Verified)" },
    { id: 3, inmateId: 1075, inmateName: "Karthik V", visitorName: "Meena V", relation: "Mother", visitDate: "2026-10-13 14:00", status: "Completed", booth: "Booth 01", idProof: "Aadhaar Card (Verified)" },
    { id: 4, inmateId: 1094, inmateName: "Imran Khan", visitorName: "Adv. S Rao", relation: "Lawyer", visitDate: "2026-10-13 15:00", status: "Completed", booth: "Legal Suite A", idProof: "Bar Council Credential" },
    { id: 5, inmateId: 1063, inmateName: "Selvam M", visitorName: "Ganesh M", relation: "Friend", visitDate: "2026-10-12 10:00", status: "Denied", booth: "N/A", idProof: "Flagged - Disciplinary Restriction Active" },
    { id: 6, inmateId: 1087, inmateName: "Mohan S", visitorName: "Revathi S", relation: "Wife", visitDate: "2026-10-11 11:00", status: "Completed", booth: "Booth 03", idProof: "Govt Photo ID (Verified)" }
  ],
  medical: [
    { id: 1, inmateId: 1042, inmateName: "Ravi Kumar", checkupDate: "2026-10-13", condition: "Minor laceration right arm", treatment: "Antiseptic dressing & Tetanus toxoid booster administered. Routine follow-up 48h.", doctor: "Dr. Sarah Paul, MD", triage: "Routine" },
    { id: 2, inmateId: 1063, inmateName: "Selvam M", checkupDate: "2026-10-12", condition: "Stress induced hypertension (BP 155/95)", treatment: "Amlodipine 5mg daily. Psychiatric evaluation scheduled.", doctor: "Dr. A. Verma, MBBS", triage: "Priority" },
    { id: 3, inmateId: 1075, inmateName: "Karthik V", checkupDate: "2026-10-10", condition: "Acute bronchitis", treatment: "Azithromycin 500mg, steam inhalation therapy.", doctor: "Dr. Sarah Paul, MD", triage: "Routine" },
    { id: 4, inmateId: 1051, inmateName: "Arun Prasad", checkupDate: "2026-10-08", condition: "Dental caries with localized abscess", treatment: "Amoxicillin 500mg, analgesics, extraction scheduled.", doctor: "Dr. G. Sundaram, BDS", triage: "Routine" },
    { id: 5, inmateId: 1087, inmateName: "Mohan S", checkupDate: "2026-10-05", condition: "Contusion facial zygomatic area", treatment: "Ice compression, Ibuprofen 400mg, cleared for regular cell block.", doctor: "Dr. Sarah Paul, MD", triage: "Priority" }
  ],
  facilityStats: {
    totalInmates: 148,
    capacity: 180,
    visitsToday: 12,
    highSeverityIncidents: 3,
    pendingMedicalCheckups: 5,
    activeGuardsOnDuty: 24,
    lockdownActive: false,
    defconLevel: "DEFCON 4 - NORMAL SECURE"
  }
};

class DataStore {
  constructor() {
    this.isApiAvailable = null;
    this.storageKey = 'secureward_local_db_v1';
    this.listeners = [];
  }

  async checkApi() {
    if (this.isApiAvailable !== null) return this.isApiAvailable;
    try {
      const res = await fetch('/api/stats', { method: 'GET', cache: 'no-store' });
      this.isApiAvailable = res.ok;
    } catch (e) {
      this.isApiAvailable = false;
    }
    return this.isApiAvailable;
  }

  getLocalDB() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    // Seed
    localStorage.setItem(this.storageKey, JSON.stringify(SEED_DATA));
    return JSON.parse(JSON.stringify(SEED_DATA));
  }

  saveLocalDB(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      this.notifyListeners();
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notifyListeners() {
    this.listeners.forEach(fn => fn());
  }

  // --- STATS ---
  async getStats() {
    if (await this.checkApi()) {
      try {
        const res = await fetch('/api/stats');
        return await res.json();
      } catch (e) {}
    }
    const db = this.getLocalDB();
    const activeInmates = db.inmates.filter(i => i.status !== 'Released').length;
    const highSev = db.incidents.filter(inc => inc.severity === 'High').length;
    return {
      ...db.facilityStats,
      activeRosterCount: activeInmates,
      totalInmates: 148,
      highSeverityIncidents: highSev,
      totalIncidents: db.incidents.length,
      totalVisits: db.visits.length,
      totalMedical: db.medical.length
    };
  }

  // --- LOCKDOWN ---
  async toggleLockdown(desiredState) {
    if (await this.checkApi()) {
      try {
        const res = await fetch('/api/lockdown', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: desiredState })
        });
        const json = await res.json();
        this.notifyListeners();
        return json;
      } catch (e) {}
    }
    const db = this.getLocalDB();
    db.facilityStats.lockdownActive = typeof desiredState === 'boolean' ? desiredState : !db.facilityStats.lockdownActive;
    db.facilityStats.defconLevel = db.facilityStats.lockdownActive ? 'DEFCON 1 - MAXIMUM LOCKDOWN' : 'DEFCON 4 - NORMAL SECURE';
    if (db.facilityStats.lockdownActive) {
      db.cells.forEach(c => c.isLocked = true);
    }
    this.saveLocalDB(db);
    return {
      success: true,
      lockdownActive: db.facilityStats.lockdownActive,
      defconLevel: db.facilityStats.defconLevel
    };
  }

  // --- INMATES ---
  async getInmates() {
    if (await this.checkApi()) {
      try {
        const res = await fetch('/api/inmates');
        return await res.json();
      } catch (e) {}
    }
    return this.getLocalDB().inmates;
  }

  async getInmate(id) {
    if (await this.checkApi()) {
      try {
        const res = await fetch(`/api/inmates/${id}`);
        if (res.ok) return await res.json();
      } catch (e) {}
    }
    const db = this.getLocalDB();
    const inmate = db.inmates.find(i => i.id == id);
    if (!inmate) return null;
    return {
      ...inmate,
      incidents: db.incidents.filter(inc => inc.inmateId == id),
      visits: db.visits.filter(v => v.inmateId == id),
      medical: db.medical.filter(m => m.inmateId == id)
    };
  }

  async addInmate(inmateData) {
    if (await this.checkApi()) {
      try {
        const res = await fetch('/api/inmates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inmateData)
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to add inmate');
        }
        this.notifyListeners();
        return await res.json();
      } catch (e) {
        if (e.message && !e.message.includes('fetch')) throw e;
      }
    }

    const db = this.getLocalDB();
    // Validate cell capacity
    if (inmateData.cellId && inmateData.cellId !== 'Unassigned') {
      const cell = db.cells.find(c => c.id === inmateData.cellId);
      if (cell) {
        const currentCount = db.inmates.filter(i => i.cellId === cell.id && i.status !== 'Released').length;
        if (currentCount >= cell.capacity) {
          throw new Error(`Cell ${cell.id} is full (${cell.capacity}/${cell.capacity}). Please select another cell.`);
        }
      }
    }

    const maxId = db.inmates.reduce((max, i) => Math.max(max, Number(i.id) || 1000), 1000);
    const newInmate = {
      id: maxId + 1,
      name: inmateData.name,
      crime: inmateData.crime,
      cellId: inmateData.cellId || 'Unassigned',
      sentenceYrs: Number(inmateData.sentenceYrs) || 1,
      admitDate: inmateData.admitDate || new Date().toISOString().split('T')[0],
      status: inmateData.status || 'Active',
      riskLevel: inmateData.riskLevel || 'Medium',
      notes: inmateData.notes || 'Intake screening complete.',
      bloodGroup: inmateData.bloodGroup || 'O+',
      dob: inmateData.dob || '1995-01-01'
    };

    db.inmates.unshift(newInmate);
    this.saveLocalDB(db);
    return newInmate;
  }

  async updateInmate(id, updates) {
    if (await this.checkApi()) {
      try {
        const res = await fetch(`/api/inmates/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
        this.notifyListeners();
        return await res.json();
      } catch (e) {}
    }
    const db = this.getLocalDB();
    const idx = db.inmates.findIndex(i => i.id == id);
    if (idx !== -1) {
      db.inmates[idx] = { ...db.inmates[idx], ...updates };
      this.saveLocalDB(db);
      return db.inmates[idx];
    }
    return null;
  }

  async deleteInmate(id) {
    if (await this.checkApi()) {
      try {
        const res = await fetch(`/api/inmates/${id}`, { method: 'DELETE' });
        this.notifyListeners();
        return await res.json();
      } catch (e) {}
    }
    const db = this.getLocalDB();
    db.inmates = db.inmates.filter(i => i.id != id);
    // Cascade delete linked records (PPT requirement)
    db.incidents = db.incidents.filter(inc => inc.inmateId != id);
    db.visits = db.visits.filter(v => v.inmateId != id);
    db.medical = db.medical.filter(m => m.inmateId != id);
    this.saveLocalDB(db);
    return { success: true };
  }

  // --- CELLS ---
  async getCells() {
    if (await this.checkApi()) {
      try {
        const res = await fetch('/api/cells');
        return await res.json();
      } catch (e) {}
    }
    const db = this.getLocalDB();
    // recount occupants
    const cellCounts = {};
    db.inmates.forEach(i => {
      if (i.status !== 'Released' && i.cellId) {
        cellCounts[i.cellId] = (cellCounts[i.cellId] || 0) + 1;
      }
    });
    db.cells.forEach(c => {
      c.currentOccupants = cellCounts[c.id] || 0;
    });
    return db.cells;
  }

  async toggleCellLock(cellId) {
    if (await this.checkApi()) {
      try {
        const res = await fetch(`/api/cells/${cellId}/toggle-lock`, { method: 'POST' });
        this.notifyListeners();
        return await res.json();
      } catch (e) {}
    }
    const db = this.getLocalDB();
    const cell = db.cells.find(c => c.id === cellId);
    if (cell) {
      cell.isLocked = !cell.isLocked;
      this.saveLocalDB(db);
      return { success: true, cellId: cell.id, isLocked: cell.isLocked };
    }
    return null;
  }

  // --- INCIDENTS ---
  async getIncidents() {
    if (await this.checkApi()) {
      try {
        const res = await fetch('/api/incidents');
        return await res.json();
      } catch (e) {}
    }
    return this.getLocalDB().incidents;
  }

  async addIncident(data) {
    if (await this.checkApi()) {
      try {
        const res = await fetch('/api/incidents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        this.notifyListeners();
        return await res.json();
      } catch (e) {}
    }
    const db = this.getLocalDB();
    const maxId = db.incidents.reduce((m, i) => Math.max(m, Number(i.id) || 0), 0);
    const newInc = {
      id: maxId + 1,
      inmateId: data.inmateId ? Number(data.inmateId) : null,
      inmateName: data.inmateName || 'General Facility',
      date: data.date || new Date().toISOString().split('T')[0],
      time: data.time || new Date().toTimeString().slice(0, 5),
      type: data.type,
      severity: data.severity,
      action: data.action || 'Disciplinary record logged',
      location: data.location || 'Cell Block',
      officer: data.officer || 'Duty Officer',
      status: 'Active'
    };

    if (data.inmateId && data.action && (data.action.toLowerCase().includes('isolation') || data.action.toLowerCase().includes('solitary'))) {
      const inmate = db.inmates.find(i => i.id == data.inmateId);
      if (inmate) {
        inmate.status = 'Isolation';
        inmate.cellId = 'D-01';
      }
    }

    db.incidents.unshift(newInc);
    this.saveLocalDB(db);
    return newInc;
  }

  // --- VISITS ---
  async getVisits() {
    if (await this.checkApi()) {
      try {
        const res = await fetch('/api/visits');
        return await res.json();
      } catch (e) {}
    }
    return this.getLocalDB().visits;
  }

  async addVisit(data) {
    if (await this.checkApi()) {
      try {
        const res = await fetch('/api/visits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        this.notifyListeners();
        return await res.json();
      } catch (e) {}
    }
    const db = this.getLocalDB();
    const maxId = db.visits.reduce((m, v) => Math.max(m, Number(v.id) || 0), 0);
    const inmate = db.inmates.find(i => i.id == data.inmateId);
    const newVisit = {
      id: maxId + 1,
      inmateId: Number(data.inmateId),
      inmateName: inmate ? inmate.name : 'Unknown Inmate',
      visitorName: data.visitorName,
      relation: data.relation || 'Relative',
      visitDate: data.visitDate || new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: data.status || 'Scheduled',
      booth: data.booth || 'Booth 01',
      idProof: data.idProof || 'Verified Govt ID'
    };
    db.visits.unshift(newVisit);
    this.saveLocalDB(db);
    return newVisit;
  }

  async updateVisitStatus(id, status) {
    if (await this.checkApi()) {
      try {
        const res = await fetch(`/api/visits/${id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        this.notifyListeners();
        return await res.json();
      } catch (e) {}
    }
    const db = this.getLocalDB();
    const v = db.visits.find(item => item.id == id);
    if (v) {
      v.status = status;
      this.saveLocalDB(db);
      return v;
    }
    return null;
  }

  // --- MEDICAL ---
  async getMedical() {
    if (await this.checkApi()) {
      try {
        const res = await fetch('/api/medical');
        return await res.json();
      } catch (e) {}
    }
    return this.getLocalDB().medical;
  }

  async addMedical(data) {
    if (await this.checkApi()) {
      try {
        const res = await fetch('/api/medical', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        this.notifyListeners();
        return await res.json();
      } catch (e) {}
    }
    const db = this.getLocalDB();
    const maxId = db.medical.reduce((m, med) => Math.max(m, Number(med.id) || 0), 0);
    const inmate = db.inmates.find(i => i.id == data.inmateId);
    const newMed = {
      id: maxId + 1,
      inmateId: Number(data.inmateId),
      inmateName: inmate ? inmate.name : 'Unknown Inmate',
      checkupDate: data.checkupDate || new Date().toISOString().split('T')[0],
      condition: data.condition,
      treatment: data.treatment || 'Prescribed medication',
      doctor: data.doctor || 'Dr. Sarah Paul, MD',
      triage: data.triage || 'Routine'
    };
    db.medical.unshift(newMed);
    this.saveLocalDB(db);
    return newMed;
  }

  // --- RESET DB ---
  async resetDatabase() {
    if (await this.checkApi()) {
      try {
        const res = await fetch('/api/reset', { method: 'POST' });
        this.notifyListeners();
        return await res.json();
      } catch (e) {}
    }
    localStorage.removeItem(this.storageKey);
    const fresh = this.getLocalDB();
    this.notifyListeners();
    return { success: true, data: fresh };
  }
}

window.dataStore = new DataStore();
