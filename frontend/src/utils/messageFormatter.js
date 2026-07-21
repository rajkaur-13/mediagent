// ========================================
// PREMIUM MEDICAL MESSAGE FORMATTER
// Complete rewrite with Lucide icons & structured content
// ========================================

/**
 * Format medical messages with structured sections, badges, and premium styling
 * All information is preserved - only presentation changes
 */
export const formatMedicalMessage = (text, isUser = false) => {
  if (isUser) {
    // User messages - just escape and return
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // ✅ FIX: If message already contains HTML, return it as-is
  if (text.includes('<br/>') || text.includes('<strong>') || text.includes('<div')) {
    return text;
  }
  
  let formatted = text;
  
  // ===== STEP 1: DETECT CONTENT TYPE =====
  const isPatientList = formatted.includes('Found') && formatted.includes('patients in your clinic');
  const isPatientSelected = formatted.includes('Patient Selected:') || formatted.includes('✓ Patient Selected');
  const isSOAPNote = formatted.includes('SUBJECTIVE:') || formatted.includes('Objective:') || formatted.includes('SOAP Note');
  const isPrescription = formatted.includes('Prescription') && formatted.includes('Medication:');
  const isAppointment = formatted.includes('Appointment') && formatted.includes('scheduled');
  const isMedicalAdvice = formatted.includes('Diagnosis') || formatted.includes('Treatment') || formatted.includes('Red Flags');
  
  // ===== STEP 2: PATIENT LIST =====
  if (isPatientList) {
    return formatPatientList(formatted);
  }
  
  // ===== STEP 3: PATIENT SELECTED =====
  if (isPatientSelected) {
    return formatPatientSelected(formatted);
  }
  
  // ===== STEP 4: SOAP NOTE =====
  if (isSOAPNote) {
    return formatSOAPNote(formatted);
  }
  
  // ===== STEP 5: PRESCRIPTION =====
  if (isPrescription) {
    return formatPrescription(formatted);
  }
  
  // ===== STEP 6: APPOINTMENT =====
  if (isAppointment) {
    return formatAppointment(formatted);
  }
  
  // ===== STEP 7: MEDICAL ADVICE =====
  if (isMedicalAdvice) {
    return formatMedicalAdvice(formatted);
  }
  
  // ===== STEP 8: DEFAULT - Format with basic enhancements =====
  return formatDefault(formatted);
};

// ========================================
// ICON HELPERS
// ========================================

const icons = {
  // Alert Triangle (Red)
  alertTriangle: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>`,
  
  // Heart Pulse (Purple)
  heartPulse: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5H21"/></svg>`,
  
  // Pill (Green)
  pill: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 20.5 3.5 13.5a4.95 4.95 0 0 1 0-7l2-2a4.95 4.95 0 0 1 7 0l7 7a4.95 4.95 0 0 1 0 7l-2 2a4.95 4.95 0 0 1-7 0Z"/><path d="m8.5 8.5 7 7"/></svg>`,
  
  // File Text (Blue)
  fileText: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  
  // Notebook Pen (Amber)
  notebookPen: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4"/><path d="M2 6h4"/><path d="M2 10h4"/><path d="M2 14h4"/><path d="M2 18h4"/><path d="M18.4 2.6a2 2 0 0 1 2.8 2.8l-9 9-4.2 1.4 1.4-4.2Z"/></svg>`,
  
  // Scan Line (Indigo)
  scanLine: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>`,
  
  // Calendar Days (Green)
  calendarDays: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>`,
  
  // Brain (Blue gradient)
  brain: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4a4 4 0 0 1 3.5 6A4 4 0 0 1 12 20a4 4 0 0 1-3.5-6A4 4 0 0 1 12 4Z"/><path d="M12 10v4"/><path d="M10 12h4"/></svg>`,
  
  // Check Circle (Green)
  checkCircle: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  
  // Chevron Right
  chevronRight: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
};

// ========================================
// CONTENT TYPE FORMATTERS
// ========================================

/**
 * Format patient list as clean search result rows
 */
function formatPatientList(text) {
  // Extract all patient lines
  const lines = text.split('\n');
  const patientLines = lines.filter(line => line.includes('•') || line.includes('MRN'));
  
  // Get count
  const count = patientLines.length;
  
  let result = `
    <div class="patient-list-wrapper">
      <div class="patient-list-header">
        <span class="patient-list-icon">👥</span>
        <span class="patient-list-title">Recent Patients</span>
      </div>
      <div class="patient-list-subheader">Here are the latest ${count} patients</div>
      <div class="patient-list-container">
  `;
  
  patientLines.forEach(line => {
    // Extract patient name, MRN, Age
    const nameMatch = line.match(/•\s*([^(]+?)\s*\(/);
    const mrnMatch = line.match(/MRN:\s*([^,)]+)/);
    const ageMatch = line.match(/Age:\s*(\d+)/);
    
    const name = nameMatch ? nameMatch[1].trim() : 'Unknown';
    const mrn = mrnMatch ? mrnMatch[1].trim() : 'N/A';
    const age = ageMatch ? ageMatch[1] : 'N/A';
    
    // Get initials
    const initials = name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
    
    result += `
      <div class="patient-row" onclick="window.directSelectPatient('${name}')">
        <div class="patient-row-avatar">
          <span class="patient-row-initials">${initials}</span>
        </div>
        <div class="patient-row-info">
          <div class="patient-row-name">${name}</div>
          <div class="patient-row-meta">${mrn} • ${age} Years</div>
        </div>
        <div class="patient-row-chevron">›</div>
      </div>
    `;
  });
  
  result += `
      </div>
      <div class="patient-list-footer">Showing recent patients</div>
      <div class="quick-tip-box">
        <div class="quick-tip-header">💡 Quick Tip</div>
        <div class="quick-tip-content">
          You can find any patient by typing:
          <div class="quick-tip-examples">
            <span class="example-pill" onclick="window.directSetInput('Show me [patient name]')">Show me [patient name]</span>
            <span class="example-pill" onclick="window.directSetInput('Find MRN001')">Find MRN001</span>
            <span class="example-pill" onclick="window.directSetInput('Search phone number')">Search phone number</span>
          </div>
        </div>
      </div>
    </div>
  `;
  
  return result;
}

/**
 * Format patient selected as premium Clinical Snapshot Card with Lucide icons
 * Only shows when patient data is explicitly requested
 */
function formatPatientSelected(text) {
  // ===== IF NO PATIENT DATA, RETURN AS-IS =====
  const hasPatientData = text.includes('Demographics:') || 
                         text.includes('Medical History:') ||
                         text.includes('MRN') ||
                         text.includes('Patient Selected:');
  
  // If there's no patient data, just return the text
  if (!hasPatientData) {
    return text;
  }
  
  // If it says "No patient found", return as-is
  if (text.includes('No patient found')) {
    return text;
  }
  
  // ===== EXTRACT PATIENT NAME =====
  let patientName = 'Patient';
  
  let nameMatch = text.match(/Patient Selected:\s*([^\n]+)/);
  if (nameMatch) {
    patientName = nameMatch[1].trim();
  }
  
  if (!nameMatch) {
    nameMatch = text.match(/✓ Patient Selected\s*\n?\s*\*\*?([^*\n]+)\*\*?/);
    if (nameMatch) {
      patientName = nameMatch[1].trim();
    }
  }
  
  patientName = patientName.replace(/\*\*/g, '');
  
  // ===== EXTRACT DEMOGRAPHICS =====
  let mrn = 'N/A', age = 'N/A', gender = 'N/A';
  
  const demoMatch = text.match(/Demographics:\s*([^\n]+)/);
  if (demoMatch) {
    const parts = demoMatch[1].split('|').map(s => s.trim());
    parts.forEach(part => {
      if (part.includes('MRN:')) mrn = part.replace('MRN:', '').trim();
      if (part.includes('Age:')) age = part.replace('Age:', '').trim();
      if (part.includes('Gender:')) gender = part.replace('Gender:', '').trim();
    });
  }
  
  if (mrn === 'N/A' || age === 'N/A') {
    const metaMatch = text.match(/\*\*?\s*([A-Z0-9]+)\s*[•|]\s*([A-Z])\s*[•|]\s*(\d+)\s*Years?\s*\*\*?/i);
    if (metaMatch) {
      mrn = metaMatch[1].trim();
      gender = metaMatch[2].trim();
      age = metaMatch[3].trim();
    }
  }
  
  if (mrn === 'N/A' || age === 'N/A') {
    const metaMatch = text.match(/([A-Z0-9]+)\s*[•|]\s*([A-Z])\s*[•|]\s*(\d+)\s*Years?/i);
    if (metaMatch) {
      mrn = metaMatch[1].trim();
      gender = metaMatch[2].trim();
      age = metaMatch[3].trim();
    }
  }
  
  // ===== EXTRACT MEDICAL HISTORY =====
  let allergies = 'None', conditions = 'None';
  const historyMatch = text.match(/Medical History:\s*([^\n]+)/);
  if (historyMatch) {
    const historyText = historyMatch[1];
    const allergyMatch = historyText.match(/Allergies:\s*([^|]+)/);
    const conditionMatch = historyText.match(/Conditions:\s*([^|]+)/);
    if (allergyMatch) allergies = allergyMatch[1].trim() || 'None';
    if (conditionMatch) conditions = conditionMatch[1].trim() || 'None';
  }
  
  // ===== EXTRACT MEDICATIONS =====
  let medications = [];
  const medsMatch = text.match(/Current Medications:\s*([^\n]+)/);
  if (medsMatch) {
    const medsText = medsMatch[1].trim();
    if (medsText !== 'None' && medsText !== '') {
      medications = medsText.split(',').map(m => m.trim()).filter(m => m !== 'None' && m !== '');
    }
  }
  
  if (medications.length === 0) {
    const bulletMeds = text.match(/[•●]\s*([^\n]+)/g);
    if (bulletMeds) {
      const medKeywords = ['mg', 'tablet', 'capsule', 'injection', 'syrup', 'drop', 'ointment', 'cream'];
      medications = bulletMeds
        .map(m => m.replace(/[•●]\s*/, '').trim())
        .filter(m => medKeywords.some(keyword => m.toLowerCase().includes(keyword)) || m.length < 50);
    }
  }
  
  // ===== EXTRACT SOAP NOTES =====
  let soapCount = 0;
  let soapDate = '';
  
  if (text.includes('No SOAP notes') || text.includes('No SOAP notes yet')) {
    soapCount = 0;
  } else {
    const soapSection = text.match(/SOAP Notes?\s*\((\d+)\)/i);
    if (soapSection) {
      soapCount = parseInt(soapSection[1]);
    }
    
    if (soapCount === 0) {
      const soapContent = text.match(/Latest SOAP Note:\s*\n?\s*([^\n]+)/i);
      if (soapContent && !soapContent[1].includes('No SOAP notes')) {
        soapCount = 1;
        const dateMatch = soapContent[1].match(/\d{4}-\d{2}-\d{2}/);
        if (dateMatch) soapDate = dateMatch[0];
      }
    }
  }
  
  // ===== EXTRACT PRESCRIPTIONS =====
  let prescriptions = [];
  const noRxMatch = text.match(/No prescriptions yet/i);
  if (!noRxMatch) {
    const rxSection = text.match(/Prescriptions?\s*\((\d+)\)/i);
    if (rxSection) {
      const rxCount = parseInt(rxSection[1]);
      const rxLines = text.match(/[•●]\s*([^\n]+)/g);
      if (rxLines) {
        const rxKeywords = ['mg', 'tablet', 'capsule', 'injection', 'syrup', 'drop', 'ointment', 'cream'];
        prescriptions = rxLines
          .slice(0, rxCount)
          .map(m => m.replace(/[•●]\s*/, '').trim())
          .filter(m => rxKeywords.some(keyword => m.toLowerCase().includes(keyword)) || m.length < 50);
      }
    }
  }
  
  // ===== EXTRACT APPOINTMENTS =====
  let appointments = [];
  
  if (text.includes('No appointments scheduled') || text.includes('No upcoming appointments')) {
    appointments = [];
  } else {
    const aptSection = text.match(/Appointments?\s*\((\d+)\)/i);
    if (aptSection) {
      const aptCount = parseInt(aptSection[1]);
      const aptLines = text.match(/[•●]\s*([^\n]+)/g);
      if (aptLines) {
        appointments = aptLines
          .slice(0, aptCount)
          .map(m => m.replace(/[•●]\s*/, '').trim())
          .filter(m => m.includes('AM') || m.includes('PM') || m.includes('follow-up') || m.includes('review'));
      }
    }
    
    if (appointments.length === 0) {
      const aptLines = text.match(/[•●]\s*([^\n]+(?:AM|PM)[^\n]*)/g);
      if (aptLines) {
        appointments = aptLines.map(m => m.replace(/[•●]\s*/, '').trim());
      }
    }
  }
  
  // ===== EXTRACT IMAGING REPORTS =====
  let imagingReports = [];
  const noImgMatch = text.match(/No images analyzed yet/i);
  if (!noImgMatch) {
    const imgSection = text.match(/Imaging Reports?\s*\((\d+)\)/i);
    if (imgSection) {
      const imgCount = parseInt(imgSection[1]);
      const imgLines = text.match(/[•●]\s*([^\n]+)/g);
      if (imgLines) {
        imagingReports = imgLines
          .slice(0, imgCount)
          .map(m => m.replace(/[•●]\s*/, '').trim())
          .filter(m => m.includes('X-Ray') || m.includes('CT') || m.includes('MRI') || m.includes('Ultrasound'));
      }
    }
  }
  
  // ===== BUILD THE PREMIUM CARD =====
  const allergyList = allergies !== 'None' ? allergies.split(',').map(a => a.trim()).filter(a => a !== '') : [];
  const conditionList = conditions !== 'None' ? conditions.split(',').map(c => c.trim()).filter(c => c !== '') : [];
  
  const medDisplay = medications.slice(0, 2).map(m => `• ${m}`).join('');
  const medMore = medications.length > 2 ? medications.length - 2 : 0;
  
  const rxDisplay = prescriptions.slice(0, 2).map(rx => `• ${rx}`).join('');
  const rxMore = prescriptions.length > 2 ? prescriptions.length - 2 : 0;
  
  const aptDisplay = appointments.slice(0, 2).map(apt => `• ${apt}`).join('');
  const aptMore = appointments.length > 2 ? appointments.length - 2 : 0;
  
  const imgDisplay = imagingReports.slice(0, 2).map(img => `• ${img}`).join('');
  const imgMore = imagingReports.length > 2 ? imagingReports.length - 2 : 0;
  
  let result = `
    <div class="premium-snapshot-card">
      <div class="snapshot-intro">
        I've loaded the patient context. Here's the clinical snapshot for ${patientName}.
      </div>
      
      <div class="snapshot-inner-card">
        
        <div class="snapshot-status">
          <span class="status-check">${icons.checkCircle}</span>
          <span class="status-text">Patient Selected</span>
        </div>
        
        <div class="snapshot-identity">
          <div class="identity-avatar">
            <span class="avatar-initial">${patientName.charAt(0)}</span>
          </div>
          <div class="identity-info">
            <div class="identity-name">${patientName}</div>
            <div class="identity-meta">${mrn} • ${gender} • ${age} Years</div>
            <div class="identity-since">Patient Since ${new Date().getFullYear() - 1}</div>
          </div>
        </div>
        
        <div class="snapshot-alerts-row">
          <div class="alert-card alert-allergy">
            <div class="alert-icon-wrapper alert-icon-red">
              <span class="alert-icon">${icons.alertTriangle}</span>
            </div>
            <div class="alert-content">
              <div class="alert-label">Allergies</div>
              <div class="alert-value">${allergyList.length > 0 ? allergyList.join(', ') : 'None'}</div>
            </div>
            <span class="alert-chevron">${icons.chevronRight}</span>
          </div>
          <div class="alert-card alert-condition">
            <div class="alert-icon-wrapper alert-icon-purple">
              <span class="alert-icon">${icons.heartPulse}</span>
            </div>
            <div class="alert-content">
              <div class="alert-label">Active Conditions</div>
              <div class="alert-value">${conditionList.length > 0 ? conditionList.join(', ') : 'None'}</div>
            </div>
            <span class="alert-chevron">${icons.chevronRight}</span>
          </div>
        </div>
        
        <div class="snapshot-row">
          <div class="row-icon green">${icons.pill}</div>
          <div class="row-content">
            <div class="row-title">Active Medications (${medications.length})</div>
            <div class="row-items">${medDisplay}</div>
          </div>
          <div class="row-action">
            ${medMore > 0 ? `<span class="action-text green">+ ${medMore} More</span>` : ''}
            <span class="action-chevron">${icons.chevronRight}</span>
          </div>
        </div>
        
        <div class="snapshot-row">
          <div class="row-icon blue">${icons.fileText}</div>
          <div class="row-content">
            <div class="row-title">Active Prescriptions (${prescriptions.length})</div>
            <div class="row-items">${rxDisplay}</div>
          </div>
          <div class="row-action">
            ${rxMore > 0 ? `<span class="action-text blue">+ ${rxMore} More</span>` : ''}
            <span class="action-chevron">${icons.chevronRight}</span>
          </div>
        </div>
        
        <div class="snapshot-row">
          <div class="row-icon amber">${icons.notebookPen}</div>
          <div class="row-content">
            <div class="row-title">SOAP Notes (${soapCount})</div>
            ${soapCount > 0 ? `
              <div class="row-subtitle">Latest SOAP Note</div>
              <div class="row-date">${soapDate || ''}</div>
            ` : `
              <div class="row-empty">No SOAP Notes Available</div>
            `}
          </div>
          <div class="row-action">
            ${soapCount > 0 ? `<span class="action-text amber">View SOAP Notes</span>` : ''}
            <span class="action-chevron">${icons.chevronRight}</span>
          </div>
        </div>
        
        <div class="snapshot-row">
          <div class="row-icon indigo">${icons.scanLine}</div>
          <div class="row-content">
            <div class="row-title">Imaging Reports (${imagingReports.length})</div>
            <div class="row-items">${imgDisplay}</div>
          </div>
          <div class="row-action">
            ${imgMore > 0 ? `<span class="action-text indigo">+ ${imgMore} More Reports</span>` : ''}
            <span class="action-chevron">${icons.chevronRight}</span>
          </div>
        </div>
        
        <div class="snapshot-row">
          <div class="row-icon green">${icons.calendarDays}</div>
          <div class="row-content">
            <div class="row-title">Upcoming Appointments (${appointments.length})</div>
            <div class="row-items">${aptDisplay}</div>
          </div>
          <div class="row-action">
            ${aptMore > 0 ? `<span class="action-text green">+ ${aptMore} More Appointments</span>` : ''}
            <span class="action-chevron">${icons.chevronRight}</span>
          </div>
        </div>
        
        <div class="snapshot-cta">
          <div class="cta-content">
            <div class="cta-icon">${icons.brain}</div>
            <div class="cta-info">
              <div class="cta-title">Analyze & Recommend</div>
              <div class="cta-desc">Get clinical insights, risk assessment, recommendations, and follow-up guidance.</div>
            </div>
          </div>
          <button class="cta-btn">Analyze Patient</button>
        </div>
        
        <div class="snapshot-footer">
          ℹ Clinical snapshot based on the latest available data.
        </div>
        
      </div>
    </div>
  `;
  
  return result;
}

/**
 * Format remaining content (SOAP, prescriptions, appointments)
 */
function formatRemainingContent(text) {
  let result = '';
  
  if (text.includes('SOAP Note') || text.includes('SUBJECTIVE:')) {
    const soapMatch = text.match(/(📝\s*SOAP Note.*?)(?=\n\s*💊|\n\s*🩻|\n\s*📅|$)/s);
    if (soapMatch) {
      result += formatSOAPNote(soapMatch[1]);
    }
  }
  
  if (text.includes('Prescriptions:')) {
    const rxMatch = text.match(/(💊\s*Prescriptions:.*?)(?=\n\s*🩻|\n\s*📅|$)/s);
    if (rxMatch) {
      result += formatPrescription(rxMatch[1]);
    }
  }
  
  if (text.includes('Appointments:')) {
    const aptMatch = text.match(/(📅\s*Appointments:.*?)(?=\n\s*✅|$)/s);
    if (aptMatch) {
      result += formatAppointment(aptMatch[1]);
    }
  }
  
  return result;
}

/**
 * Format SOAP Note as premium sections
 */
function formatSOAPNote(text) {
  const subjectiveMatch = text.match(/SUBJECTIVE:\s*([\s\S]*?)(?=OBJECTIVE:|Objective:|$)/i);
  const objectiveMatch = text.match(/OBJECTIVE:\s*([\s\S]*?)(?=ASSESSMENT:|Assessment:|$)/i);
  const assessmentMatch = text.match(/ASSESSMENT:\s*([\s\S]*?)(?=PLAN:|Plan:|$)/i);
  const planMatch = text.match(/PLAN:\s*([\s\S]*?)(?=\n\s*💊|\n\s*🩻|\n\s*📅|$)/i);
  
  let result = `
    <div class="message-section soap-section-wrapper">
      <div class="section-header">
        <span class="section-icon">📋</span>
        <span class="section-title">SOAP Note</span>
      </div>
      <div class="soap-grid">
  `;
  
  if (subjectiveMatch) {
    result += `
      <div class="soap-card subjective-card">
        <div class="soap-card-header">
          <span class="soap-card-icon">📋</span>
          <span class="soap-card-label">Subjective</span>
        </div>
        <div class="soap-card-content">${subjectiveMatch[1].trim()}</div>
      </div>
    `;
  }
  
  if (objectiveMatch) {
    result += `
      <div class="soap-card objective-card">
        <div class="soap-card-header">
          <span class="soap-card-icon">🔬</span>
          <span class="soap-card-label">Objective</span>
        </div>
        <div class="soap-card-content">${objectiveMatch[1].trim()}</div>
      </div>
    `;
  }
  
  if (assessmentMatch) {
    result += `
      <div class="soap-card assessment-card">
        <div class="soap-card-header">
          <span class="soap-card-icon">🧠</span>
          <span class="soap-card-label">Assessment</span>
        </div>
        <div class="soap-card-content">${assessmentMatch[1].trim()}</div>
      </div>
    `;
  }
  
  if (planMatch) {
    result += `
      <div class="soap-card plan-card">
        <div class="soap-card-header">
          <span class="soap-card-icon">📋</span>
          <span class="soap-card-label">Plan</span>
        </div>
        <div class="soap-card-content">${planMatch[1].trim()}</div>
      </div>
    `;
  }
  
  result += `
      </div>
    </div>
  `;
  
  return result;
}

/**
 * Format Prescription as premium card
 */
function formatPrescription(text) {
  const medMatch = text.match(/Medication:\s*([^\n]+)/);
  const dosageMatch = text.match(/Dosage:\s*([^\n]+)/);
  const frequencyMatch = text.match(/Frequency:\s*([^\n]+)/);
  const durationMatch = text.match(/Duration:\s*([^\n]+)/);
  const instructionsMatch = text.match(/Instructions:\s*([^\n]+)/);
  
  let result = `
    <div class="message-section prescription-section">
      <div class="section-header">
        <span class="section-icon">💊</span>
        <span class="section-title">Prescription</span>
      </div>
      <div class="prescription-card">
  `;
  
  if (medMatch) {
    result += `
      <div class="prescription-row">
        <span class="prescription-label">Medication</span>
        <span class="prescription-value">${medMatch[1].trim()}</span>
      </div>
    `;
  }
  
  if (dosageMatch) {
    result += `
      <div class="prescription-row">
        <span class="prescription-label">Dosage</span>
        <span class="prescription-value dosage-pill">${dosageMatch[1].trim()}</span>
      </div>
    `;
  }
  
  if (frequencyMatch) {
    result += `
      <div class="prescription-row">
        <span class="prescription-label">Frequency</span>
        <span class="prescription-value">${frequencyMatch[1].trim()}</span>
      </div>
    `;
  }
  
  if (durationMatch) {
    result += `
      <div class="prescription-row">
        <span class="prescription-label">Duration</span>
        <span class="prescription-value duration-badge">${durationMatch[1].trim()}</span>
      </div>
    `;
  }
  
  if (instructionsMatch) {
    result += `
      <div class="prescription-row instructions-row">
        <span class="prescription-label">Instructions</span>
        <span class="prescription-value">${instructionsMatch[1].trim()}</span>
      </div>
    `;
  }
  
  result += `
      </div>
    </div>
  `;
  
  return result;
}

/**
 * Format Appointment as premium timeline card
 */
function formatAppointment(text) {
  const lines = text.split('\n');
  const appointmentLines = lines.filter(line => line.includes('•') || line.includes('scheduled'));
  
  let result = `
    <div class="message-section appointment-section">
      <div class="section-header">
        <span class="section-icon">📅</span>
        <span class="section-title">Appointments</span>
        <span class="appointment-count">${appointmentLines.length}</span>
      </div>
      <div class="appointment-timeline">
  `;
  
  appointmentLines.forEach(line => {
    const dateMatch = line.match(/(\d{4}-\d{2}-\d{2})/);
    const timeMatch = line.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/);
    const reasonMatch = line.match(/-\s*([^-]+)$/);
    
    const date = dateMatch ? dateMatch[1] : 'Unknown';
    const time = timeMatch ? timeMatch[1] : 'Unknown';
    const reason = reasonMatch ? reasonMatch[1].trim() : 'Appointment';
    
    result += `
      <div class="appointment-item">
        <div class="appointment-date-badge">
          <span class="appointment-day">${new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
          <span class="appointment-date">${date}</span>
        </div>
        <div class="appointment-details">
          <div class="appointment-time">${time}</div>
          <div class="appointment-reason">${reason}</div>
        </div>
      </div>
    `;
  });
  
  result += `
      </div>
    </div>
  `;
  
  return result;
}

/**
 * Format Medical Advice as structured sections
 */
function formatMedicalAdvice(text) {
  let result = `
    <div class="message-section medical-advice-section">
      <div class="section-header">
        <span class="section-icon">🏥</span>
        <span class="section-title">Medical Analysis</span>
      </div>
  `;
  
  const diagnosisMatch = text.match(/(?:DIAGNOSIS|Diagnosis)[:\s]*([\s\S]*?)(?=RED FLAGS|WARNINGS|TREATMENT|Treatment|$)/i);
  if (diagnosisMatch) {
    result += `
      <div class="medical-section diagnosis-section">
        <div class="medical-section-header">
          <span class="medical-section-icon">🩺</span>
          <span class="medical-section-label">Diagnosis</span>
        </div>
        <div class="medical-section-content">${formatBulletPoints(diagnosisMatch[1].trim())}</div>
      </div>
    `;
  }
  
  const flagsMatch = text.match(/(?:RED FLAGS|WARNINGS)[:\s]*([\s\S]*?)(?=TREATMENT|Treatment|TESTS|Tests|FOLLOW-UP|$)/i);
  if (flagsMatch) {
    result += `
      <div class="medical-section warning-section">
        <div class="medical-section-header">
          <span class="medical-section-icon">⚠️</span>
          <span class="medical-section-label">Red Flags</span>
        </div>
        <div class="medical-section-content">${formatBulletPoints(flagsMatch[1].trim())}</div>
      </div>
    `;
  }
  
  const treatmentMatch = text.match(/(?:TREATMENT|Treatment)[:\s]*([\s\S]*?)(?=TESTS|Tests|FOLLOW-UP|Follow-up|$)/i);
  if (treatmentMatch) {
    result += `
      <div class="medical-section treatment-section">
        <div class="medical-section-header">
          <span class="medical-section-icon">💊</span>
          <span class="medical-section-label">Treatment</span>
        </div>
        <div class="medical-section-content">${formatBulletPoints(treatmentMatch[1].trim())}</div>
      </div>
    `;
  }
  
  const testsMatch = text.match(/(?:TESTS|Tests)[:\s]*([\s\S]*?)(?=FOLLOW-UP|Follow-up|$)/i);
  if (testsMatch) {
    result += `
      <div class="medical-section tests-section">
        <div class="medical-section-header">
          <span class="medical-section-icon">🔬</span>
          <span class="medical-section-label">Recommended Tests</span>
        </div>
        <div class="medical-section-content">${formatBulletPoints(testsMatch[1].trim())}</div>
      </div>
    `;
  }
  
  const followupMatch = text.match(/(?:FOLLOW-UP|Follow-up)[:\s]*([\s\S]*?)$/i);
  if (followupMatch) {
    result += `
      <div class="medical-section followup-section">
        <div class="medical-section-header">
          <span class="medical-section-icon">📋</span>
          <span class="medical-section-label">Follow-up</span>
        </div>
        <div class="medical-section-content">${formatBulletPoints(followupMatch[1].trim())}</div>
      </div>
    `;
  }
  
  result += `</div>`;
  return result;
}

/**
 * Format bullet points as structured list items
 */
function formatBulletPoints(text) {
  let formatted = text;
  
  formatted = formatted.replace(/[●•]\s*([^●•\n]+)/g, (match, content) => {
    const confidenceMatch = content.match(/(\d+)%/);
    if (confidenceMatch) {
      return `<div class="bullet-item confidence-item">
                <span class="bullet-dot"></span>
                <span class="bullet-text">${content.trim()}</span>
                <span class="confidence-badge">${confidenceMatch[1]}%</span>
              </div>`;
    }
    return `<div class="bullet-item">
              <span class="bullet-dot"></span>
              <span class="bullet-text">${content.trim()}</span>
            </div>`;
  });
  
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\n/g, '<br/>');
  
  return formatted;
}

/**
 * Format default content with basic enhancements
 */
function formatDefault(text) {
  let formatted = text;
  
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/[●•]\s*([^●•\n]+)/g, 
    '<div class="bullet-item"><span class="bullet-dot"></span><span class="bullet-text">$1</span></div>'
  );
  formatted = formatted.replace(/\n/g, '<br/>');
  formatted = formatted.replace(/(<br\/>\s*){3,}/g, '<br/><br/>');
  
  return formatted;
}

// ========================================
// EXPORT UTILITY FUNCTIONS
// ========================================

export const renderMedicalBadge = (type, text) => {
  const badges = {
    diagnosis: { class: 'badge-diagnosis', icon: '🩺' },
    treatment: { class: 'badge-treatment', icon: '💊' },
    warning: { class: 'badge-warning', icon: '⚠️' },
    test: { class: 'badge-test', icon: '🔬' },
    followup: { class: 'badge-followup', icon: '📋' },
    confidence: { class: 'badge-confidence', icon: '📊' },
    patient: { class: 'badge-patient', icon: '👤' },
    appointment: { class: 'badge-appointment', icon: '📅' },
    prescription: { class: 'badge-prescription', icon: '💊' },
  };
  
  const badge = badges[type] || badges.diagnosis;
  return `<span class="medical-badge ${badge.class}">${badge.icon} ${text}</span>`;
};

export const formatPatientCard = (patient) => {
  if (!patient) return '';
  
  return `
    <div class="patient-card">
      <div class="patient-card-header">
        <span class="patient-card-icon">👤</span>
        <span class="patient-card-name">${patient.name || 'Unknown Patient'}</span>
      </div>
      <div class="patient-card-details">
        <div class="patient-detail-row">
          <span class="detail-label">MRN:</span>
          <span class="detail-value">${patient.mrn || 'N/A'}</span>
        </div>
        <div class="patient-detail-row">
          <span class="detail-label">Age:</span>
          <span class="detail-value">${patient.age || 'N/A'}</span>
        </div>
        <div class="patient-detail-row">
          <span class="detail-label">Gender:</span>
          <span class="detail-value">${patient.gender || 'N/A'}</span>
        </div>
        ${patient.conditions && patient.conditions.length > 0 ? `
          <div class="patient-detail-row">
            <span class="detail-label">Conditions:</span>
            <span class="detail-value conditions-list">
              ${patient.conditions.map(c => `<span class="condition-tag">${c}</span>`).join(' ')}
            </span>
          </div>
        ` : ''}
        ${patient.allergies && patient.allergies.length > 0 ? `
          <div class="patient-detail-row">
            <span class="detail-label">Allergies:</span>
            <span class="detail-value">
              ${patient.allergies.map(a => `<span class="allergy-tag">${a}</span>`).join(' ')}
            </span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
};