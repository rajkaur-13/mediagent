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
  const [expandedSection, setExpandedSection] = useState('subjective');
  const [medications, setMedications] = useState([]);
  const hasPatientSelected = currentPatient !== null;

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleAIAction = (action) => {
    if (!currentPatient) return;
    const messages = {
      soap: `Generate SOAP note for ${currentPatient.name}`,
      prescription: `Generate prescription for ${currentPatient.name}`,
      imaging: `Generate imaging report for ${currentPatient.name}`
    };
    onAnalysisComplete?.({ formatted_response: messages[action] });
  };

  const handleAddMedication = () => {
    setMedications([...medications, { 
      id: Date.now(), 
      name: '', 
      dosage: '', 
      frequency: '', 
      duration: '' 
    }]);
  };

  const handleRemoveMedication = (id) => {
    setMedications(medications.filter(m => m.id !== id));
  };

  return (
    <div className="panel panel-tools">
      {/* ===== HEADER ===== */}
      <div className="clinical-header">
        <div className="clinical-header-top">
          <div className="clinical-header-title">
            <span className="clinical-header-icon">📝</span>
            <div>
              <h2>Clinical Documentation</h2>
              <p>AI-assisted SOAP Notes • Prescriptions • Medical Imaging</p>
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

      {/* ===== CONTENT ===== */}
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
                <div className="soap-accordion">
                  <div className="soap-accordion-header" onClick={() => toggleSection('subjective')}>
                    <div className="soap-accordion-title">
                      <span className="accordion-icon">🩺</span>
                      <span>Subjective</span>
                      <span className="accordion-subtitle">Patient's complaints & history</span>
                    </div>
                    <div className="soap-accordion-actions">
                      <button className="ai-suggest-compact" onClick={(e) => {
                        e.stopPropagation();
                        onAnalysisComplete?.({ formatted_response: `Suggest subjective for ${currentPatient.name}` });
                      }}>
                        ✨ Generate with AI
                      </button>
                      <span className="accordion-arrow">{expandedSection === 'subjective' ? '▼' : '▶'}</span>
                    </div>
                  </div>
                  {expandedSection === 'subjective' && (
                    <div className="soap-accordion-content">
                      <textarea className="soap-textarea-premium" placeholder="Patient's symptoms, history, and chief complaints..." value={soapNote.subjective || ''} onChange={(e) => setSoapNote({...soapNote, subjective: e.target.value})} rows="4" maxLength="1000" />
                      <div className="character-counter">{soapNote.subjective?.length || 0}/1000 characters</div>
                    </div>
                  )}
                </div>

                <div className="soap-accordion">
                  <div className="soap-accordion-header" onClick={() => toggleSection('objective')}>
                    <div className="soap-accordion-title">
                      <span className="accordion-icon">❤️</span>
                      <span>Objective</span>
                      <span className="accordion-subtitle">Vitals & examination</span>
                    </div>
                    <div className="soap-accordion-actions">
                      <button className="ai-suggest-compact" onClick={(e) => {
                        e.stopPropagation();
                        onAnalysisComplete?.({ formatted_response: `Suggest objective for ${currentPatient.name}` });
                      }}>
                        ✨ Generate with AI
                      </button>
                      <span className="accordion-arrow">{expandedSection === 'objective' ? '▼' : '▶'}</span>
                    </div>
                  </div>
                  {expandedSection === 'objective' && (
                    <div className="soap-accordion-content">
                      <textarea className="soap-textarea-premium" placeholder="Vitals, physical exam findings, test results..." value={soapNote.objective || ''} onChange={(e) => setSoapNote({...soapNote, objective: e.target.value})} rows="4" maxLength="1000" />
                      <div className="character-counter">{soapNote.objective?.length || 0}/1000 characters</div>
                    </div>
                  )}
                </div>

                <div className="soap-accordion">
                  <div className="soap-accordion-header" onClick={() => toggleSection('assessment')}>
                    <div className="soap-accordion-title">
                      <span className="accordion-icon">🧠</span>
                      <span>Assessment</span>
                      <span className="accordion-subtitle">Diagnosis & differential</span>
                    </div>
                    <div className="soap-accordion-actions">
                      <button className="ai-suggest-compact" onClick={(e) => {
                        e.stopPropagation();
                        onAnalysisComplete?.({ formatted_response: `Suggest assessment for ${currentPatient.name}` });
                      }}>
                        ✨ Generate with AI
                      </button>
                      <span className="accordion-arrow">{expandedSection === 'assessment' ? '▼' : '▶'}</span>
                    </div>
                  </div>
                  {expandedSection === 'assessment' && (
                    <div className="soap-accordion-content">
                      <textarea className="soap-textarea-premium" placeholder="Diagnosis, differential diagnoses, clinical reasoning..." value={soapNote.assessment || ''} onChange={(e) => setSoapNote({...soapNote, assessment: e.target.value})} rows="4" maxLength="1000" />
                      <div className="character-counter">{soapNote.assessment?.length || 0}/1000 characters</div>
                    </div>
                  )}
                </div>

                <div className="soap-accordion">
                  <div className="soap-accordion-header" onClick={() => toggleSection('plan')}>
                    <div className="soap-accordion-title">
                      <span className="accordion-icon">📋</span>
                      <span>Plan</span>
                      <span className="accordion-subtitle">Treatment & follow-up</span>
                    </div>
                    <div className="soap-accordion-actions">
                      <button className="ai-suggest-compact" onClick={(e) => {
                        e.stopPropagation();
                        onAnalysisComplete?.({ formatted_response: `Suggest plan for ${currentPatient.name}` });
                      }}>
                        ✨ Generate with AI
                      </button>
                      <span className="accordion-arrow">{expandedSection === 'plan' ? '▼' : '▶'}</span>
                    </div>
                  </div>
                  {expandedSection === 'plan' && (
                    <div className="soap-accordion-content">
                      <textarea className="soap-textarea-premium" placeholder="Treatment plan, medications, follow-up schedule, referrals..." value={soapNote.plan || ''} onChange={(e) => setSoapNote({...soapNote, plan: e.target.value})} rows="4" maxLength="1000" />
                      <div className="character-counter">{soapNote.plan?.length || 0}/1000 characters</div>
                    </div>
                  )}
                </div>

                <div className="soap-action-bar">
                  <button className="soap-action-secondary" onClick={() => setSoapNote({ subjective: '', objective: '', assessment: '', plan: '' })}>Start Writing</button>
                  <button className="soap-action-primary" onClick={() => handleAIAction('soap')}>✨ Generate SOAP with AI</button>
                </div>
              </div>
            )}

            {/* PRESCRIPTION TAB */}
            {activeTab === 'rx' && (
              <div className="prescription-container">
                <div className="prescription-header">
                  <h4>💊 Prescription</h4>
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
                      <span>Medication</span><span>Dosage</span><span>Frequency</span><span>Duration</span><span></span>
                    </div>
                    {medications.map((med) => (
                      <div key={med.id} className="medication-table-row">
                        <input className="med-input" placeholder="e.g., Amoxicillin" value={med.name || ''} onChange={(e) => { const updated = medications.map(m => m.id === med.id ? {...m, name: e.target.value} : m); setMedications(updated); }} />
                        <input className="med-input" placeholder="500mg" value={med.dosage || ''} onChange={(e) => { const updated = medications.map(m => m.id === med.id ? {...m, dosage: e.target.value} : m); setMedications(updated); }} />
                        <select className="med-select" value={med.frequency || ''} onChange={(e) => { const updated = medications.map(m => m.id === med.id ? {...m, frequency: e.target.value} : m); setMedications(updated); }}>
                          <option value="">Select</option>
                          <option>Once daily</option><option>Twice daily</option><option>Three times daily</option>
                          <option>Every 4 hours</option><option>Every 6 hours</option><option>As needed</option>
                        </select>
                        <input className="med-input" placeholder="7 days" value={med.duration || ''} onChange={(e) => { const updated = medications.map(m => m.id === med.id ? {...m, duration: e.target.value} : m); setMedications(updated); }} />
                        <button className="med-remove-btn" onClick={() => handleRemoveMedication(med.id)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="special-instructions">
                  <label>📝 Special Instructions</label>
                  <textarea className="soap-textarea-premium" placeholder="Additional instructions for the patient..." value={prescription?.instructions || ''} onChange={(e) => setPrescription({...prescription, instructions: e.target.value})} rows="2" />
                </div>

                <div className="prescription-action-bar">
                  <button className="prescription-action-secondary">Save Draft</button>
                  <button className="prescription-action-primary" onClick={() => handleAIAction('prescription')}>✨ Generate AI Prescription</button>
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
                <div className="imaging-action-bar">
                  <span className="imaging-action-label">AI Imaging Report</span>
                  <button className="imaging-action-primary" onClick={() => handleAIAction('imaging')}>✨ Generate Report</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

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