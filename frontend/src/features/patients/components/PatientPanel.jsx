import React, { useState, useEffect, useRef } from 'react';
import AnalyzeButton from '../../imaging/components/AnalyzeButton.jsx';

const PatientPanel = ({ 
  patients, 
  currentPatient, 
  setCurrentPatient, 
  loading,
  showAddPatient,
  setShowAddPatient,
  newPatient,
  setNewPatient,
  handleAddPatient,
  token,
  onAnalysisComplete,
  upcomingAppointments,
  getRelativeDate,
  handlePatientClick
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const resultsRef = useRef(null);

  // Filter patients based on search
  const filteredPatients = patients?.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.mrn?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Handle patient selection from search
  const handleSelectPatient = (patient) => {
    console.log('🖱️ Selecting patient from search:', patient.name);
    handlePatientClick(patient.name);
    setSearchTerm('');
    setShowResults(false);
  };

  // Handle Enter key in search
  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter' && filteredPatients.length > 0) {
      handleSelectPatient(filteredPatients[0]);
    }
  };

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show results when typing
  useEffect(() => {
    if (searchTerm.length > 0) {
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  }, [searchTerm]);

  // Mock document counts - replace with real data from API
  const documentCounts = {
    soap: currentPatient?.soap_count || 0,
    prescriptions: currentPatient?.prescription_count || 0,
    images: currentPatient?.image_count || 0
  };

  return (
    <div className="panel panel-patient">
      {/* ===== HEADER ===== */}
      <div className="patient-panel-header">
        <div className="patient-panel-title">
          <span className="icon">📋</span> Patient Context
        </div>
        <div className="patient-panel-menu">⋯</div>
      </div>

      {/* ===== SUBTITLE ===== */}
      <div className="patient-panel-subtitle">
        Patient information &amp; AI-powered actions.
      </div>

      {/* ===== SEARCH ===== */}
      <div className="search-container" ref={searchRef}>
        <span className="search-icon">🔍</span>
        <input 
          type="text" 
          placeholder="Search patient by name or MRN..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={handleSearchKeyPress}
          onFocus={() => searchTerm.length > 0 && setShowResults(true)}
        />
        {searchTerm && filteredPatients.length > 0 && (
          <span 
            className="search-arrow"
            onClick={() => handleSelectPatient(filteredPatients[0])}
            title="Select first result"
          >
            →
          </span>
        )}
        {searchTerm && filteredPatients.length === 0 && (
          <span className="search-arrow disabled">✕</span>
        )}
      </div>

      {/* ===== SEARCH RESULTS ===== */}
      {showResults && searchTerm && (
        <div className="patient-search-results" ref={resultsRef}>
          <div className="search-results-header">
            <span>{filteredPatients.length} result{filteredPatients.length !== 1 ? 's' : ''}</span>
          </div>
          {filteredPatients.length > 0 ? (
            filteredPatients.map((patient) => (
              <div 
                key={patient.id || patient.mrn}
                className="patient-list-item"
                onClick={() => handleSelectPatient(patient)}
              >
                <div className="patient-list-avatar">
                  {getInitials(patient.name)}
                </div>
                <div className="patient-list-info">
                  <div className="patient-list-name">{patient.name}</div>
                  <div className="patient-list-details">
                    <span>{patient.mrn}</span>
                    <span>•</span>
                    <span>{patient.age} yrs</span>
                    <span>•</span>
                    <span>{patient.gender}</span>
                  </div>
                </div>
                <span className="patient-list-arrow">→</span>
              </div>
            ))
          ) : (
            <div className="no-search-results">
              <span>🔍</span>
              <p>No patients found</p>
              <small>Try a different search term</small>
            </div>
          )}
        </div>
      )}

      {/* ===== ADD PATIENT ===== */}
      <div className="add-patient-wrapper">
        <button 
          className="add-patient-btn"
          onClick={() => setShowAddPatient(!showAddPatient)}
        >
          ＋ Add New Patient
        </button>
      </div>

      {/* ===== CURRENT PATIENT CARD ===== */}
      {currentPatient ? (
        <div className="current-patient-card">
          {/* Avatar & Name - Vertical Layout */}
          <div className="patient-avatar-section-vertical">
            <div className="patient-avatar-large">
              {getInitials(currentPatient.name)}
            </div>
            <div className="patient-info-vertical">
              <div className="patient-name-vertical">{currentPatient.name}</div>
              <div className="patient-status-vertical">
                <span className="status-dot-green-small"></span>
                <span>Active</span>
              </div>
            </div>
          </div>

          {/* Patient Details - Vertical Layout */}
          <div className="patient-details-vertical">
            <div className="patient-detail-row">
              <span className="detail-label">MRN</span>
              <span className="detail-value">{currentPatient.mrn}</span>
            </div>
            <div className="patient-detail-row">
              <span className="detail-label">Age</span>
              <span className="detail-value">{currentPatient.age} yrs</span>
            </div>
            <div className="patient-detail-row">
              <span className="detail-label">Gender</span>
              <span className="detail-value">{currentPatient.gender}</span>
            </div>
          </div>

          {/* Medical Info - Vertical Layout */}
          <div className="patient-medical-vertical">
            <div className="medical-row-vertical">
              <span className="medical-icon">⚠️</span>
              <span className="medical-label">Allergies</span>
              <span className="medical-value badge-danger-small">
                {currentPatient.allergies?.length > 0 ? currentPatient.allergies.join(', ') : 'None'}
              </span>
            </div>
            <div className="medical-row-vertical">
              <span className="medical-icon">💊</span>
              <span className="medical-label">Conditions</span>
              <span className="medical-value badge-primary-small">
                {currentPatient.conditions?.length > 0 ? currentPatient.conditions.join(', ') : 'None'}
              </span>
            </div>
            <div className="medical-row-vertical">
              <span className="medical-icon">📞</span>
              <span className="medical-label">Phone</span>
              <span className="medical-value">{currentPatient.phone || 'N/A'}</span>
            </div>
            <div className="medical-row-vertical">
              <span className="medical-icon">🩺</span>
              <span className="medical-label">Last Visit</span>
              <span className="medical-value">{currentPatient.last_visit || 'N/A'}</span>
            </div>
          </div>

          {/* Document Counters */}
          <div className="document-counters">
            <div className="doc-counter">
              <span className="doc-icon">📄</span>
              <span className="doc-label">SOAP Notes</span>
              <span className="doc-count">{documentCounts.soap}</span>
            </div>
            <div className="doc-counter">
              <span className="doc-icon">💊</span>
              <span className="doc-label">Prescriptions</span>
              <span className="doc-count">{documentCounts.prescriptions}</span>
            </div>
            <div className="doc-counter">
              <span className="doc-icon">🖼️</span>
              <span className="doc-label">Images</span>
              <span className="doc-count">{documentCounts.images}</span>
            </div>
          </div>

          {/* Bottom Actions - Same Row */}
          <div className="patient-actions-row">
            <button 
              className="clear-selection-btn-compact"
              onClick={() => setCurrentPatient(null)}
            >
              ✖ Clear
            </button>
            {token && currentPatient && (
              <AnalyzeButton 
                patientId={currentPatient.id} 
                token={token} 
                onAnalysisComplete={onAnalysisComplete}
              />
            )}
          </div>
        </div>
      ) : (
        /* ===== NO PATIENT SELECTED ===== */
        <div className="no-patient-compact">
          <span>👤</span>
          <p>No Patient Selected</p>
          <small>Search or add a patient above</small>
        </div>
      )}

      {/* ===== APPOINTMENTS - FIXED HEIGHT WITH SCROLL ===== */}
      <div className="appointments-card">
        <div className="appointments-header">
          <h4>📅 Upcoming Appointments</h4>
          <span className="view-all">View all →</span>
        </div>
        <div className="appointments-scroll">
          {upcomingAppointments && upcomingAppointments.length > 0 ? (
            upcomingAppointments.map((apt, idx) => (
              <div key={idx} className="appointment-item">
                <div className="appointment-name">{apt.patient_name}</div>
                <div className="appointment-date">{getRelativeDate(apt.date)}</div>
              </div>
            ))
          ) : (
            <div className="no-appointments">
              <div className="calendar-icon">📅</div>
              <div className="main-text">No upcoming appointments</div>
              <div className="sub-text">You're all caught up!</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientPanel;