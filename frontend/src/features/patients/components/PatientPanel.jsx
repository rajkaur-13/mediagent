import React, { useState, useEffect, useRef } from 'react';
import AnalyzeButton from '../../imaging/components/AnalyzeButton.jsx';
import { FileText, Pill, Image, AlertTriangle, HeartPulse, Droplet, Phone, Calendar } from 'lucide-react';

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
  const [showDropdown, setShowDropdown] = useState(false);
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
    setShowDropdown(false);
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
        setShowDropdown(false);
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

  // Get today's appointments
  const todayAppointments = upcomingAppointments?.filter(apt => 
    new Date(apt.date).toDateString() === new Date().toDateString()
  ) || [];

  return (
    <div className="panel panel-patient">
      {/* ===== HEADER ===== */}
      <div className="patient-panel-header-wrapper">
        <div className="patient-panel-header">
          <div className="patient-panel-title">
            <span className="icon">📋</span> Patient Context
          </div>
          <div className="patient-panel-menu">⋯</div>
        </div>
        <div className="patient-panel-subtitle">
          Patient information &amp; AI-powered actions.
        </div>
      </div>

      {/* ===== SEARCH ===== */}
      <div className="search-container" ref={searchRef}>
        <span className="search-icon">🔍</span>
        <input 
          type="text" 
          placeholder="Search patient by Name or MRN..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={handleSearchKeyPress}
          onFocus={() => {
            if (searchTerm.length > 0) {
              setShowResults(true);
            } else {
              setShowDropdown(true);
            }
          }}
        />
        <span 
          className="search-dropdown-arrow"
          onClick={() => {
            setShowDropdown(!showDropdown);
            setShowResults(false);
          }}
        >
          ▼
        </span>
        {searchTerm && filteredPatients.length > 0 && (
          <span 
            className="search-arrow"
            onClick={() => handleSelectPatient(filteredPatients[0])}
            title="Select first result"
          >
            →
          </span>
        )}
      </div>

      {/* ===== SEARCH RESULTS ===== */}
      {(showResults || showDropdown) && (
        <div className="patient-search-results" ref={resultsRef}>
          {showDropdown && !searchTerm ? (
            <>
              <div className="search-results-header">Recent Patients</div>
              {patients?.slice(0, 5).map((patient) => (
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
                    </div>
                  </div>
                  <span className="patient-list-arrow">→</span>
                </div>
              ))}
              {patients?.length === 0 && (
                <div className="no-search-results">
                  <span>👤</span>
                  <p>No recent patients</p>
                </div>
              )}
            </>
          ) : (
            <>
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
            </>
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
        <div className="current-patient-card-premium">
          {/* Avatar & Name */}
          <div className="patient-avatar-premium">
            <div className="patient-avatar-circle">
              {getInitials(currentPatient.name)}
            </div>
            <div className="patient-name-section">
              <div className="patient-name-premium">{currentPatient.name}</div>
              <div className="patient-status-premium">
                <span className="status-dot-premium"></span>
                Active
              </div>
            </div>
          </div>

          {/* Patient Details Grid */}
          <div className="patient-details-premium">
            <div className="detail-item">
              <span className="detail-label">MRN</span>
              <span className="detail-value">{currentPatient.mrn}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Age</span>
              <span className="detail-value">{currentPatient.age} yrs</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Gender</span>
              <span className="detail-value">{currentPatient.gender}</span>
            </div>
          </div>

          {/* Medical Info Chips */}
<div className="medical-chips-premium">
  <div className="chip-row">
    <AlertTriangle className="chip-icon" size={16} strokeWidth={1.8} />
    <span className="chip-label">Allergies</span>
    <span>
      {currentPatient.allergies?.length > 0 ? (
        currentPatient.allergies.map((allergy, i) => (
          <span key={i} className="chip-tag chip-tag-danger">{allergy}</span>
        ))
      ) : (
        <span className="chip-tag chip-tag-neutral">None</span>
      )}
    </span>
  </div>
  <div className="chip-row">
    <HeartPulse className="chip-icon" size={16} strokeWidth={1.8} />
    <span className="chip-label">Conditions</span>
    <span>
      {currentPatient.conditions?.length > 0 ? (
        currentPatient.conditions.map((condition, i) => (
          <span key={i} className="chip-tag chip-tag-primary">{condition}</span>
        ))
      ) : (
        <span className="chip-tag chip-tag-neutral">None</span>
      )}
    </span>
  </div>
  <div className="chip-row">
    <Droplet className="chip-icon" size={16} strokeWidth={1.8} />
    <span className="chip-label">Blood Group</span>
    <span className="chip-value">{currentPatient.blood_group || <span className="chip-tag chip-tag-neutral">N/A</span>}</span>
  </div>
  <div className="chip-row">
    <Phone className="chip-icon" size={16} strokeWidth={1.8} />
    <span className="chip-label">Phone</span>
    <span className="chip-value">{currentPatient.phone || 'N/A'}</span>
  </div>
  <div className="chip-row">
    <Calendar className="chip-icon" size={16} strokeWidth={1.8} />
    <span className="chip-label">Last Visit</span>
    <span className="chip-value">{currentPatient.last_visit || 'N/A'}</span>
  </div>
</div>
          {/* Stats Cards */}
<div className="stats-cards-premium">
  <div className="stat-card">
    <div className="stat-icon-wrapper">
      <FileText className="stat-icon" size={20} strokeWidth={1.8} />
    </div>
    <div className="stat-content">
      <span className="stat-label">SOAP Notes</span>
      <span className="stat-number">{documentCounts.soap}</span>
    </div>
  </div>
  <div className="stat-card">
    <div className="stat-icon-wrapper">
      <Pill className="stat-icon" size={20} strokeWidth={1.8} />
    </div>
    <div className="stat-content">
      <span className="stat-label">Prescriptions</span>
      <span className="stat-number">{documentCounts.prescriptions}</span>
    </div>
  </div>
  <div className="stat-card">
    <div className="stat-icon-wrapper">
      <Image className="stat-icon" size={20} strokeWidth={1.8} />
    </div>
    <div className="stat-content">
      <span className="stat-label">Images</span>
      <span className="stat-number">{documentCounts.images}</span>
    </div>
  </div>
</div>

          {/* Action Buttons */}
          <div className="patient-actions-premium">
            <button 
              className="action-secondary"
              onClick={() => setCurrentPatient(null)}
            >
              ✖ Clear Selection
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
        <div className="no-patient-premium">
          <span>👤</span>
          <p>No Patient Selected</p>
          <small>Search or add a patient above</small>
        </div>
      )}

      {/* ===== APPOINTMENTS ===== */}
      <div className="appointments-card-premium">
        <div className="appointments-header-premium">
          <h4>📅 Upcoming Appointments</h4>
          <span className="view-all">View All →</span>
        </div>

        {/* Today's Summary */}
        {todayAppointments.length > 0 && (
          <div className="today-summary">
            <span className="today-label">Today</span>
            <span className="today-count">{todayAppointments.length} appointment{todayAppointments.length > 1 ? 's' : ''}</span>
          </div>
        )}

        <div className="appointments-scroll-premium">
          {upcomingAppointments && upcomingAppointments.length > 0 ? (
            upcomingAppointments.map((apt, idx) => {
              const isToday = new Date(apt.date).toDateString() === new Date().toDateString();
              return (
                <div key={idx} className="appointment-item-premium">
                  <div className="appointment-time">{apt.time || '09:00'}</div>
                  <div className="appointment-info">
                    <div className="appointment-name">{apt.patient_name}</div>
                    <div className="appointment-type">{apt.type || 'Follow-up'}</div>
                  </div>
                  <span className={`appointment-status ${apt.status === 'Confirmed' ? 'status-confirmed' : 'status-pending'}`}>
                    {apt.status || 'Confirmed'}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="no-appointments-premium">
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