import React, { useState } from 'react';

const ClinicalPanel = ({
  currentPatient,
  token,
  soapNote = { subjective: '', objective: '', assessment: '', plan: '' },
  setSoapNote,
  handleSaveSoapNote,
  prescription = { medication: '', dosage: '', frequency: '', duration: '', instructions: '' },
  setPrescription,
  handleGeneratePrescription,
  onAnalysisComplete,
  onScheduleFollowUp
}) => {
  const [activeTab, setActiveTab] = useState('soap');
  const [expandedSection, setExpandedSection] = useState(null);
  const [medications, setMedications] = useState([]);
  const [soapStatus, setSoapStatus] = useState({
    subjective: 'not_started',
    objective: 'not_started',
    assessment: 'not_started',
    plan: 'not_started'
  });
  const hasPatientSelected = currentPatient !== null;

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Get status label and color
  const getStatusInfo = (status) => {
    switch(status) {
      case 'saved':
        return { label: '✓ Saved', className: 'status-saved' };
      case 'editing':
        return { label: 'Editing', className: 'status-editing' };
      case 'in_progress':
        return { label: 'In Progress', className: 'status-in-progress' };
      default:
        return { label: 'Not Started', className: 'status-not-started' };
    }
  };

  // Get section color
  const getSectionColor = (section) => {
    const colors = {
      subjective: '#2563EB',  // Blue
      objective: '#06B6D4',   // Cyan
      assessment: '#F59E0B',  // Orange
      plan: '#22C55E'         // Green
    };
    return colors[section] || '#2563EB';
  };

  // Get section letter
  const getSectionLetter = (section) => {
    const letters = {
      subjective: 'S',
      objective: 'O',
      assessment: 'A',
      plan: 'P'
    };
    return letters[section] || '?';
  };

  // Get section title
  const getSectionTitle = (section) => {
    const titles = {
      subjective: 'Subjective',
      objective: 'Objective',
      assessment: 'Assessment',
      plan: 'Plan'
    };
    return titles[section] || '';
  };

  // Get section subtitle
  const getSectionSubtitle = (section) => {
    const subtitles = {
      subjective: "Patient's complaints & history",
      objective: 'Vitals & examination',
      assessment: 'Diagnosis & differential',
      plan: 'Treatment & follow-up'
    };
    return subtitles[section] || '';
  };

  // Get section placeholder
  const getSectionPlaceholder = (section) => {
    const placeholders = {
      subjective: "Write today's patient complaints and history...",
      objective: "Write vitals, physical exam findings, test results...",
      assessment: "Write diagnosis, differential diagnoses, clinical reasoning...",
      plan: "Write treatment plan, medications, follow-up schedule..."
    };
    return placeholders[section] || '';
  };

  // Toggle section
  const toggleSection = (section) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
      if (soapStatus[section] === 'not_started') {
        setSoapStatus({ ...soapStatus, [section]: 'in_progress' });
      } else if (soapStatus[section] === 'saved') {
        setSoapStatus({ ...soapStatus, [section]: 'editing' });
      }
    }
  };

  // Save section
  const handleSaveSection = (section) => {
    handleSaveSoapNote();
    setSoapStatus({ ...soapStatus, [section]: 'saved' });
    setExpandedSection(null);
  };

  const handleAddMedication = () => {
    setMedications([...medications, { 
      id: Date.now(), 
      name: '', 
      dosage: '', 
      route: '',
      frequency: '', 
      duration: '' 
    }]);
  };

  const handleRemoveMedication = (id) => {
    setMedications(medications.filter(m => m.id !== id));
  };

  const soapSections = ['subjective', 'objective', 'assessment', 'plan'];

  return (
    <div className="panel panel-tools">
      {/* ===== HEADER ===== */}
      <div className="clinical-header">
        <div className="clinical-header-top">
          <div className="clinical-header-title">
            <span className="clinical-header-icon">📝</span>
            <div>
              <h2>Clinical Documentation</h2>
              <p>SOAP Notes • Prescriptions • Medical Imaging</p>
            </div>
          </div>
        </div>

        <div className="clinical-patient-context">
          {hasPatientSelected ? (
            <>
              <div className="clinical-patient-avatar">
                {getInitials(currentPatient.name)}
              </div>
              <div className="clinical-patient-info">
                <div className="clinical-patient-name">
                  <span className="status-dot-green"></span>
                  {currentPatient.name}
                </div>
                <div className="clinical-patient-details">
                  <span>{currentPatient.mrn}</span>
                  <span className="separator">•</span>
                  <span>{currentPatient.age} yrs</span>
                  <span className="separator">•</span>
                  <span>{currentPatient.gender}</span>
                </div>
              </div>
              <div className="clinical-patient-status">Active</div>
            </>
          ) : (
            <div className="clinical-no-patient-context">
              <span>🔒</span>
              <span>No patient selected</span>
            </div>
          )}
        </div>
      </div>

      {/* ===== TABS ===== */}
      <div className="clinical-tabs">
        <button
          className={`clinical-tab ${activeTab === 'soap' ? 'active' : ''}`}
          onClick={() => setActiveTab('soap')}
          disabled={!hasPatientSelected}
        >
          <span className="tab-icon">📝</span>
          SOAP
          <span className="tab-underline"></span>
        </button>
        <button
          className={`clinical-tab ${activeTab === 'rx' ? 'active' : ''}`}
          onClick={() => setActiveTab('rx')}
          disabled={!hasPatientSelected}
        >
          <span className="tab-icon">💊</span>
          Prescription
          <span className="tab-underline"></span>
        </button>
        <button
          className={`clinical-tab ${activeTab === 'imaging' ? 'active' : ''}`}
          onClick={() => setActiveTab('imaging')}
          disabled={!hasPatientSelected}
        >
          <span className="tab-icon">🩻</span>
          Imaging
          <span className="tab-underline"></span>
        </button>
      </div>

      {/* ===== CONTENT - SCROLLABLE ===== */}
      <div className="clinical-content">
        {!hasPatientSelected ? (
          <div className="empty-state-premium">
            <span className="empty-icon">🔒</span>
            <h3>No Patient Selected</h3>
            <p>Select a patient from the Patient Context panel to begin documentation.</p>
          </div>
        ) : (
          <>
            {/* SOAP TAB */}
            {activeTab === 'soap' && (
              <div className="soap-container">
                {soapSections.map((section) => {
                  const status = getStatusInfo(soapStatus[section]);
                  const color = getSectionColor(section);
                  const letter = getSectionLetter(section);
                  const title = getSectionTitle(section);
                  const subtitle = getSectionSubtitle(section);
                  const placeholder = getSectionPlaceholder(section);
                  const isExpanded = expandedSection === section;
                  const noteValue = soapNote[section] || '';

                  return (
                    <div 
                      key={section}
                      className={`soap-card ${isExpanded ? 'expanded' : 'collapsed'}`}
                      style={{ borderLeftColor: color }}
                    >
                      <div 
                        className="soap-card-header"
                        onClick={() => toggleSection(section)}
                      >
                        <div className="soap-card-left">
                          <span className="soap-card-letter" style={{ color: color }}>
                            {letter}
                          </span>
                          <div className="soap-card-info">
                            <span className="soap-card-title">{title}</span>
                            <span className="soap-card-subtitle">{subtitle}</span>
                          </div>
                        </div>
                        <div className="soap-card-right">
                          <span className={`soap-card-status ${status.className}`}>
                            {status.label}
                          </span>
                          <span className="soap-card-chevron">
                            {isExpanded ? '▼' : '▶'}
                          </span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="soap-card-content">
                          <textarea
                            className="soap-textarea-premium"
                            placeholder={placeholder}
                            value={noteValue}
                            onChange={(e) => setSoapNote({...soapNote, [section]: e.target.value})}
                            rows="4"
                            maxLength="1000"
                          />
                          <div className="soap-card-actions">
                            <span className="character-counter">
                              {noteValue.length}/1000 characters
                            </span>
                            <button 
                              className="soap-save-btn"
                              onClick={() => handleSaveSection(section)}
                            >
                              Save {title}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* PRESCRIPTION TAB */}
            {activeTab === 'rx' && (
              <div className="prescription-container">
                <div className="prescription-header">
                  <div className="prescription-header-left">
                    <h4>Medication Orders</h4>
                    <span className="prescription-subtitle">Manage medications prescribed during this consultation.</span>
                  </div>
                  <button className="add-medication-btn" onClick={handleAddMedication}>+ Add Medication</button>
                </div>

                {medications.length === 0 ? (
                  <div className="empty-prescription">
                    <span>💊</span>
                    <p>No medications added</p>
                    <button className="add-medication-btn-primary" onClick={handleAddMedication}>+ Add Medication</button>
                  </div>
                ) : (
                  <div className="medication-table">
                    <div className="medication-table-header">
                      <span>Med</span>
                      <span>Dosage</span>
                      <span>Route</span>
                      <span>Freq</span>
                      <span>Dur</span>
                      <span></span>
                    </div>
                    {medications.map((med) => (
                      <div key={med.id} className="medication-table-row">
                        <input 
                          className="med-input" 
                          placeholder="e.g., Amoxicillin" 
                          value={med.name || ''} 
                          onChange={(e) => { 
                            const updated = medications.map(m => m.id === med.id ? {...m, name: e.target.value} : m); 
                            setMedications(updated); 
                          }} 
                        />
                        <input 
                          className="med-input" 
                          placeholder="500mg" 
                          value={med.dosage || ''} 
                          onChange={(e) => { 
                            const updated = medications.map(m => m.id === med.id ? {...m, dosage: e.target.value} : m); 
                            setMedications(updated); 
                          }} 
                        />
                        <select 
                          className="med-select" 
                          value={med.route || ''} 
                          onChange={(e) => { 
                            const updated = medications.map(m => m.id === med.id ? {...m, route: e.target.value} : m); 
                            setMedications(updated); 
                          }}
                        >
                          <option value="">Select</option>
                          <option value="Oral">Oral</option>
                          <option value="IV">IV</option>
                          <option value="IM">IM</option>
                          <option value="SC">SC</option>
                          <option value="Topical">Topical</option>
                          <option value="Eye">Eye</option>
                          <option value="Ear">Ear</option>
                          <option value="Nasal">Nasal</option>
                          <option value="Inhalation">Inhalation</option>
                        </select>
                        <select 
                          className="med-select" 
                          value={med.frequency || ''} 
                          onChange={(e) => { 
                            const updated = medications.map(m => m.id === med.id ? {...m, frequency: e.target.value} : m); 
                            setMedications(updated); 
                          }}
                        >
                          <option value="">Select</option>
                          <option value="OD">OD</option>
                          <option value="BD">BD</option>
                          <option value="TDS">TDS</option>
                          <option value="QID">QID</option>
                          <option value="SOS">SOS</option>
                          <option value="Weekly">Weekly</option>
                          <option value="Custom">Custom</option>
                        </select>
                        <input 
                          className="med-input" 
                          placeholder="7 days" 
                          value={med.duration || ''} 
                          onChange={(e) => { 
                            const updated = medications.map(m => m.id === med.id ? {...m, duration: e.target.value} : m); 
                            setMedications(updated); 
                          }} 
                        />
                        <button 
                          className="med-remove-btn" 
                          onClick={() => handleRemoveMedication(med.id)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="special-instructions">
                  <label>📝 Special Instructions</label>
                  <textarea 
                    className="soap-textarea-premium" 
                    placeholder="e.g., Take after meals, Avoid alcohol, Return if fever persists"
                    value={prescription?.instructions || ''} 
                    onChange={(e) => setPrescription({...prescription, instructions: e.target.value})} 
                    rows="2" 
                  />
                </div>
              </div>
            )}

            {/* IMAGING TAB */}
            {activeTab === 'imaging' && (
              <div className="imaging-container">
                <div className="imaging-upload-area">
                  <span className="imaging-upload-icon">📤</span>
                  <h4>Upload Medical Image</h4>
                  <p>or Drag & Drop</p>
                  <span className="imaging-supported">X-ray • CT • MRI • ECG • Retinal</span>
                  <span className="imaging-formats">DICOM • PNG • JPG • PDF</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ===== PRESCRIPTION SAVE BUTTON ===== */}
      {hasPatientSelected && activeTab === 'rx' && (
        <div className="prescription-save-wrapper">
          <button className="prescription-save-btn" onClick={handleGeneratePrescription}>
            💾 Save Prescription
          </button>
        </div>
      )}

      {/* ===== IMAGING ACTION BAR ===== */}
      {hasPatientSelected && activeTab === 'imaging' && (
        <div className="imaging-action-bar">
          <span className="imaging-action-label">AI Imaging Report</span>
          <button className="imaging-action-primary" onClick={() => {
            if (currentPatient) {
              onAnalysisComplete?.({ formatted_response: `Generate imaging report for ${currentPatient.name}` });
            }
          }}>
            ✨ Generate Report
          </button>
        </div>
      )}

      {/* ===== QUICK ACTIONS ===== */}
      <div className="quick-actions-compact">
        <button className={`quick-chip ${activeTab === 'soap' ? 'active' : ''}`} onClick={() => setActiveTab('soap')} disabled={!hasPatientSelected}>📝 SOAP</button>
        <button className={`quick-chip ${activeTab === 'rx' ? 'active' : ''}`} onClick={() => setActiveTab('rx')} disabled={!hasPatientSelected}>💊 Prescription</button>
        <button className={`quick-chip ${activeTab === 'imaging' ? 'active' : ''}`} onClick={() => setActiveTab('imaging')} disabled={!hasPatientSelected}>🩻 Imaging</button>
        <button className="quick-chip" onClick={() => onScheduleFollowUp?.(currentPatient)} disabled={!hasPatientSelected}>📅 Schedule</button>
      </div>

      {/* ===== FOOTER ===== */}
      <div className="clinical-footer-compact">
        <span>Last saved: Just now</span>
        <span>•</span>
        <span>Connected to MediAgent DB</span>
      </div>
    </div>
  );
};

export default ClinicalPanel;