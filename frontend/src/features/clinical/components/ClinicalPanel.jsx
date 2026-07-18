import React, { useState } from 'react';
import { 
  FileText, 
  Pill, 
  Image, 
  Stethoscope, 
  Lock, 
  Plus, 
  Save, 
  Upload, 
  Sparkles, 
  Calendar, 
  Clipboard,
  X,
  Search,
  ChevronDown,
  SquarePen,
  Trash2,
  Check,
  Activity
} from 'lucide-react';
import { api } from '../../../services/api';

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

  // Imaging states
  const [selectedType, setSelectedType] = useState('xray');
  const [displayType, setDisplayType] = useState('More');
  const [uploadedStudies, setUploadedStudies] = useState([]);
  const [selectedStudy, setSelectedStudy] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showMoreTypes, setShowMoreTypes] = useState(false);

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

  // ===== IMAGING FUNCTIONS =====
  const handleTypeSelect = (type) => {
    setSelectedType(type);
    
    if (selectedStudy) {
      const updated = uploadedStudies.map(s => 
        s.id === selectedStudy.id ? { ...s, type: type } : s
      );
      setUploadedStudies(updated);
      const updatedStudy = updated.find(s => s.id === selectedStudy.id);
      if (updatedStudy) {
        setSelectedStudy(updatedStudy);
      }
    }
  };

  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const newStudy = {
          id: Date.now(),
          name: file.name,
          type: selectedType,
          status: 'pending',
          image: URL.createObjectURL(file),
          thumbnail: URL.createObjectURL(file),
          findings: '',
          impression: '',
          doctorNotes: '',
          aiGenerated: false
        };
        setUploadedStudies([...uploadedStudies, newStudy]);
        setSelectedStudy(newStudy);
      }
    };
    input.click();
  };

  const handleSelectStudy = (id) => {
    const study = uploadedStudies.find(s => s.id === id);
    if (study) {
      setSelectedStudy(study);
    }
  };

  const handleStudyChange = (id, field, value) => {
    const updated = uploadedStudies.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    );
    setUploadedStudies(updated);
    const updatedStudy = updated.find(s => s.id === id);
    if (updatedStudy) {
      setSelectedStudy(updatedStudy);
    }
  };

  const handleAIAnalysis = async () => {
    if (!selectedStudy) return;
    
    setIsAnalyzing(true);
    try {
      const result = await api.analyzeImage(token, selectedStudy.id, selectedStudy.type);
      
      if (result) {
        const updated = uploadedStudies.map(s => 
          s.id === selectedStudy.id ? { 
            ...s, 
            findings: result.findings || 'AI generated findings...',
            impression: result.impression || 'AI generated impression...',
            aiGenerated: true,
            status: 'ai-draft'
          } : s
        );
        setUploadedStudies(updated);
        const updatedStudy = updated.find(s => s.id === selectedStudy.id);
        if (updatedStudy) {
          setSelectedStudy(updatedStudy);
        }
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
      alert('AI analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveImagingReport = async () => {
    if (!selectedStudy) {
      alert('Please select an image to save');
      return;
    }
    
    try {
      await api.saveImagingReport(token, {
        patientId: currentPatient?.id,
        studyId: selectedStudy.id,
        type: selectedStudy.type,
        findings: selectedStudy.findings,
        impression: selectedStudy.impression,
        doctorNotes: selectedStudy.doctorNotes,
        status: 'saved'
      });
      
      const updated = uploadedStudies.map(s => 
        s.id === selectedStudy.id ? { ...s, status: 'saved' } : s
      );
      setUploadedStudies(updated);
      const updatedStudy = updated.find(s => s.id === selectedStudy.id);
      if (updatedStudy) {
        setSelectedStudy(updatedStudy);
      }
      
      alert('Report saved successfully!');
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save report. Please try again.');
    }
  };

  const soapSections = ['subjective', 'objective', 'assessment', 'plan'];

  return (
    <div className="panel panel-tools">
      {/* ===== HEADER ===== */}
      <div className="clinical-header">
        <div className="clinical-header-top">
          <div className="clinical-header-title">
            <div className="header-icon-wrapper">
              <FileText size={16} className="header-icon" />
            </div>
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
              <Lock size={14} className="no-patient-icon" />
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
          <div className="tab-icon-wrapper">
            <Stethoscope size={14} className="tab-icon" />
          </div>
          SOAP
          <span className="tab-underline"></span>
        </button>
        <button
          className={`clinical-tab ${activeTab === 'rx' ? 'active' : ''}`}
          onClick={() => setActiveTab('rx')}
          disabled={!hasPatientSelected}
        >
          <div className="tab-icon-wrapper">
            <Pill size={14} className="tab-icon" />
          </div>
          Prescription
          <span className="tab-underline"></span>
        </button>
        <button
          className={`clinical-tab ${activeTab === 'imaging' ? 'active' : ''}`}
          onClick={() => setActiveTab('imaging')}
          disabled={!hasPatientSelected}
        >
          <div className="tab-icon-wrapper">
            <Image size={14} className="tab-icon" />
          </div>
          Imaging
          <span className="tab-underline"></span>
        </button>
      </div>

      {/* ===== CONTENT - SCROLLABLE ===== */}
      <div className="clinical-content">
        {!hasPatientSelected ? (
          <div className="empty-state-premium">
            <Lock size={40} className="empty-icon" />
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
                              <Save size={14} />
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
                    <div className="prescription-header-icon-wrapper">
                      <Pill size={16} className="prescription-header-icon" />
                    </div>
                    <div>
                      <h4>Medication Orders</h4>
                      <span className="prescription-subtitle">Manage medications prescribed during this consultation.</span>
                    </div>
                  </div>
                  <button className="add-medication-btn" onClick={handleAddMedication}>
                    <Plus size={16} />
                    Add Medication
                  </button>
                </div>

                {medications.length === 0 ? (
                  <div className="empty-prescription">
                    <Pill size={32} className="empty-icon" />
                    <p>No medications added</p>
                    <button className="add-medication-btn-primary" onClick={handleAddMedication}>
                      <Plus size={16} />
                      Add Medication
                    </button>
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
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="special-instructions">
                  <div className="special-instructions-label-wrapper">
                    <FileText size={14} className="special-instructions-icon" />
                    <label>Special Instructions</label>
                  </div>
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

            {/* ===== IMAGING TAB ===== */}
            {activeTab === 'imaging' && (
              <div className="imaging-tab-container">
                <div className="imaging-section">
                  <div className="imaging-section-header">
                    <span className="imaging-section-title">Image Type</span>
                  </div>
                  <div className="imaging-top-row">
                    <div className="imaging-type-chips">
                      <button className={`imaging-chip ${selectedType === 'xray' ? 'active' : ''}`} onClick={() => handleTypeSelect('xray')}>X-Ray</button>
                      <button className={`imaging-chip ${selectedType === 'ct' ? 'active' : ''}`} onClick={() => handleTypeSelect('ct')}>CT</button>
                      <button className={`imaging-chip ${selectedType === 'mri' ? 'active' : ''}`} onClick={() => handleTypeSelect('mri')}>MRI</button>
                      <div className="imaging-chip-dropdown">
                        <button 
                          className="imaging-chip" 
                          onClick={() => setShowMoreTypes(!showMoreTypes)}
                        >
                          {displayType} ▾
                        </button>
                        {showMoreTypes && (
                          <div className="imaging-dropdown-menu">
                            <button className="imaging-dropdown-item" onClick={() => { 
                              handleTypeSelect('ultrasound');
                              setDisplayType('Ultrasound');
                              setShowMoreTypes(false); 
                            }}>Ultrasound</button>
                            <button className="imaging-dropdown-item" onClick={() => { 
                              handleTypeSelect('retina');
                              setDisplayType('Retina');
                              setShowMoreTypes(false); 
                            }}>Retina</button>
                            <button className="imaging-dropdown-item" onClick={() => { 
                              handleTypeSelect('ecg');
                              setDisplayType('ECG');
                              setShowMoreTypes(false); 
                            }}>ECG</button>
                            <button className="imaging-dropdown-item" onClick={() => { 
                              handleTypeSelect('mammogram');
                              setDisplayType('Mammogram');
                              setShowMoreTypes(false); 
                            }}>Mammogram</button>
                            <button className="imaging-dropdown-item" onClick={() => { 
                              handleTypeSelect('fluoroscopy');
                              setDisplayType('Fluoroscopy');
                              setShowMoreTypes(false); 
                            }}>Fluoroscopy</button>
                            <button className="imaging-dropdown-item" onClick={() => { 
                              handleTypeSelect('pet');
                              setDisplayType('PET');
                              setShowMoreTypes(false); 
                            }}>PET</button>
                            <button className="imaging-dropdown-item" onClick={() => { 
                              handleTypeSelect('spect');
                              setDisplayType('SPECT');
                              setShowMoreTypes(false); 
                            }}>SPECT</button>
                          </div>
                        )}
                      </div>
                    </div>
                    <button className="imaging-upload-btn-outline" onClick={handleImageUpload}>
                      <Upload size={14} className="upload-icon" />
                      Upload
                    </button>
                  </div>
                </div>

                <div className="imaging-section">
                  <div className="imaging-section-header">
                    <span className="imaging-section-title">
                      Uploaded Images <span className="imaging-count">({uploadedStudies.length})</span>
                    </span>
                  </div>
                  <div className="imaging-studies-strip">
                    {uploadedStudies.length === 0 ? (
                      <div className="imaging-empty-state">
                        <Image size={20} className="empty-icon" />
                        <p>No images uploaded</p>
                      </div>
                    ) : (
                      uploadedStudies.map((study) => (
                        <div 
                          key={study.id}
                          className={`imaging-study-card ${study.id === selectedStudy?.id ? 'selected' : ''}`}
                          onClick={() => handleSelectStudy(study.id)}
                        >
                          <div className="study-thumbnail">
                            {study.thumbnail ? (
                              <img src={study.thumbnail} alt={study.name} />
                            ) : (
                              <Image size={20} className="study-placeholder" />
                            )}
                          </div>
                          <div className="study-info">
                            <span className="study-name">{study.name}</span>
                            <span className={`study-status ${study.status}`}>{study.status}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="imaging-section report-section">
                  <div className="imaging-section-header">
                    <span className="imaging-section-title">
                      Report {selectedStudy ? `(${selectedStudy.type} Report)` : ''}
                    </span>
                    {selectedStudy && (
                      <button 
                        className="imaging-ai-compact" 
                        onClick={handleAIAnalysis}
                        disabled={isAnalyzing}
                      >
                        <Sparkles size={14} />
                        {isAnalyzing ? 'Analyzing...' : 'Generate AI'}
                      </button>
                    )}
                  </div>

                  {selectedStudy ? (
                    <div className="imaging-report-grid">
                      <div className="imaging-preview">
                        {selectedStudy.image ? (
                          <img src={selectedStudy.image} alt={selectedStudy.name} />
                        ) : (
                          <Image size={48} className="preview-placeholder" />
                        )}
                      </div>

                      <div className="imaging-text-fields">
                        <div className="imaging-field">
                          <label>Findings</label>
                          <textarea 
                            className="imaging-textarea" 
                            placeholder="Describe findings..."
                            value={selectedStudy.findings || ''} 
                            onChange={(e) => handleStudyChange(selectedStudy.id, 'findings', e.target.value)}
                            rows="2"
                          />
                        </div>
                        <div className="imaging-field">
                          <label>Impression</label>
                          <textarea 
                            className="imaging-textarea" 
                            placeholder="Clinical impression..."
                            value={selectedStudy.impression || ''} 
                            onChange={(e) => handleStudyChange(selectedStudy.id, 'impression', e.target.value)}
                            rows="2"
                          />
                        </div>
                        <div className="imaging-field">
                          <label>Doctor Notes</label>
                          <textarea 
                            className="imaging-textarea" 
                            placeholder="Additional notes..."
                            value={selectedStudy.doctorNotes || ''} 
                            onChange={(e) => handleStudyChange(selectedStudy.id, 'doctorNotes', e.target.value)}
                            rows="2"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="imaging-no-study">
                      <Image size={28} className="no-study-icon" />
                      <p>Select an image to view report</p>
                    </div>
                  )}
                </div>

                <button className="imaging-save-btn" onClick={handleSaveImagingReport}>
                  <Save size={16} />
                  Save Report
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ===== PRESCRIPTION SAVE BUTTON ===== */}
      {hasPatientSelected && activeTab === 'rx' && (
        <div className="prescription-save-wrapper">
          <button className="prescription-save-btn" onClick={handleGeneratePrescription}>
            <Save size={14} />
            Save Prescription
          </button>
        </div>
      )}

      {/* ===== QUICK ACTIONS ===== */}
      <div className="quick-actions-compact">
        <button className={`quick-chip ${activeTab === 'soap' ? 'active' : ''}`} onClick={() => setActiveTab('soap')} disabled={!hasPatientSelected}>
          <div className="quick-chip-icon-wrapper">
            <Stethoscope size={12} className="quick-chip-icon" />
          </div>
          SOAP
        </button>
        <button className={`quick-chip ${activeTab === 'rx' ? 'active' : ''}`} onClick={() => setActiveTab('rx')} disabled={!hasPatientSelected}>
          <div className="quick-chip-icon-wrapper">
            <Pill size={12} className="quick-chip-icon" />
          </div>
          Prescription
        </button>
        <button className={`quick-chip ${activeTab === 'imaging' ? 'active' : ''}`} onClick={() => setActiveTab('imaging')} disabled={!hasPatientSelected}>
          <div className="quick-chip-icon-wrapper">
            <Image size={12} className="quick-chip-icon" />
          </div>
          Imaging
        </button>
        <button className="quick-chip" onClick={() => onScheduleFollowUp?.(currentPatient)} disabled={!hasPatientSelected}>
          <div className="quick-chip-icon-wrapper">
            <Calendar size={12} className="quick-chip-icon" />
          </div>
          Schedule
        </button>
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