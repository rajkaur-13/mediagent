import React, { useState, useEffect, useRef, useCallback } from "react";
import './App.css';
import "../styles/patients.css";
import "../styles/tools.css";

// Hooks
import { useAuth } from '../features/auth/hooks/useAuth';
import { useChat } from '../features/chat/hooks/useChat';
import { usePatients } from '../features/patients/hooks/usePatients';
import { useSoap } from '../features/soap/hooks/useSoap';
import { usePrescription } from '../features/prescriptions/hooks/usePrescription';
import { useAppointments } from '../features/appointments/hooks/useAppointments';

// Components
import ChatPanel from "../features/chat/components/ChatPanel";
import PatientPanel from "../features/patients/components/PatientPanel";
import Login from "../features/auth/components/Login";
import XRayAnalyzer from '../features/imaging/components/XRayAnalyzer';

function App() {
  // ===== AUTH =====
  const { token, isAuthenticated, handleLogin, handleLogout, recentAppointments, setRecentAppointments } = useAuth();

  // ===== CHAT =====
  const welcomeMessage = `🏥 <strong>Welcome to MediAgent!</strong><br/>
I'm your AI medical assistant.<br/><br/>
🔹 <strong>To work with a patient:</strong> Search for them above<br/>
🔹 <strong>To ask a medical question:</strong> Just type your question<br/><br/>
Selected patient will appear here, and all tools will become available.<br/><br/>
How can I help you today?`;

  const [messages, setMessages] = useState([
    { id: '1', text: welcomeMessage, isUser: false, timestamp: new Date() }
  ]);

  const {
    input,
    setInput,
    loading,
    sendMessage: sendChatMessage,
    handleKeyPress,
    messagesEndRef
  } = useChat(token, setMessages);

  // ===== PATIENTS =====
  const {
    patients,
    currentPatient,
    setCurrentPatient,
    patientCache,
    setPatientCache,
    allPatientNames,
    setAllPatientNames,
    showAddPatient,
    setShowAddPatient,
    newPatient,
    setNewPatient,
    handleDirectPatientSelect,
    handlePatientClick,
    handleAddPatient
  } = usePatients(token, setMessages);

  // ===== SOAP =====
  const {
    soapNote,
    setSoapNote,
    handleSaveSoapNote
  } = useSoap(token, currentPatient, setMessages);

  // ===== PRESCRIPTION =====
  const {
    prescription,
    setPrescription,
    handleGeneratePrescription
  } = usePrescription(token, currentPatient, handleDirectPatientSelect);

  // ===== APPOINTMENTS =====
  const { getRelativeDate, upcomingAppointments } = useAppointments(recentAppointments);

  // ===== STATE =====
  const [activeTab, setActiveTab] = useState('soap');
  const [mobileTab, setMobileTab] = useState('chat');
  const hasPatientSelected = currentPatient !== null;

  // ===== Expose for clickable patient names =====
  useEffect(() => {
    window.directSelectPatient = handleDirectPatientSelect;
  }, [handleDirectPatientSelect]);

  // ===== AUTO-LOAD PATIENT INTO CHAT WHEN SELECTED =====
  useEffect(() => {
    if (currentPatient) {
      // Check if patient info already exists in chat
      const patientInfoExists = messages.some(msg => 
        msg.text && msg.text.includes(`Patient Selected: ${currentPatient.name}`)
      );

      // Only add if not already showing and not the welcome message
      if (!patientInfoExists && messages.length > 0) {
        const patientMessage = `👤 <strong>Patient Selected: ${currentPatient.name}</strong><br/>
MRN: ${currentPatient.mrn} • Age: ${currentPatient.age} yrs • Gender: ${currentPatient.gender}<br/><br/>
📋 <strong>Medical History:</strong><br/>
• Allergies: ${currentPatient.allergies?.length > 0 ? currentPatient.allergies.join(', ') : 'None'}<br/>
• Conditions: ${currentPatient.conditions?.length > 0 ? currentPatient.conditions.join(', ') : 'None'}<br/>
• Phone: ${currentPatient.phone || 'N/A'}<br/><br/>
How can I help you with ${currentPatient.name} today?`;

        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: patientMessage,
          isUser: false,
          timestamp: new Date()
        }]);
      }
    }
  }, [currentPatient]);

  // ===== IF NOT LOGGED IN, SHOW LOGIN =====
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // ===== WRAPPER FUNCTIONS =====
  const sendMessage = () => {
    if (!input.trim() || !token) return;
    sendChatMessage(input, token, currentPatient, setCurrentPatient, setPatientCache, setAllPatientNames, allPatientNames);
  };

  // Handle analysis complete from X-Ray or Analyze button
  const handleAnalysisComplete = (analysis) => {
    if (analysis?.formatted_response) {
      const formatMessage = (text) => {
        if (!text) return '';
        let formatted = text.replace(/\n/g, '<br/>');
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return formatted;
      };
      const formattedMessage = formatMessage(analysis.formatted_response);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        text: formattedMessage, 
        isUser: false, 
        timestamp: new Date() 
      }]);
    }
  };

  const renderMessage = (text) => {
    return { __html: text };
  };

  // ===== RENDER =====
  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <span className="logo">🏥</span>
          <span className="title">MediAgent</span>
          <span className="badge">AI Medical Assistant</span>
        </div>
        <div className="header-center">
          <span className="doctor-info">👨‍⚕️ Dr. Sarah Wilson</span>
        </div>
        <div className="header-right">
          <button className="icon-btn">🔔</button>
          <button className="icon-btn">⚙️</button>
          <button className="icon-btn" onClick={handleLogout}>👤</button>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="mobile-top-nav">
        <button 
          className={`mobile-top-btn ${mobileTab === 'patients' ? 'active' : ''}`}
          onClick={() => setMobileTab('patients')}
        >
          <span className="mobile-top-icon">👤</span>
          <span>Patients</span>
        </button>
        <button 
          className={`mobile-top-btn ${mobileTab === 'chat' ? 'active' : ''}`}
          onClick={() => setMobileTab('chat')}
        >
          <span className="mobile-top-icon">💬</span>
          <span>Chat</span>
        </button>
        <button 
          className={`mobile-top-btn ${mobileTab === 'tools' ? 'active' : ''}`}
          onClick={() => setMobileTab('tools')}
        >
          <span className="mobile-top-icon">🛠️</span>
          <span>Tools</span>
        </button>
      </div>

      <div className="main-container">
        {/* ===== LEFT PANEL - PATIENTS ===== */}
        <PatientPanel
          patients={patients}
          currentPatient={currentPatient}
          setCurrentPatient={setCurrentPatient}
          loading={loading}
          showAddPatient={showAddPatient}
          setShowAddPatient={setShowAddPatient}
          newPatient={newPatient}
          setNewPatient={setNewPatient}
          handleAddPatient={handleAddPatient}
          token={token}
          onAnalysisComplete={handleAnalysisComplete}
          upcomingAppointments={recentAppointments}
          getRelativeDate={getRelativeDate}
          handlePatientClick={handlePatientClick}
        />

        {/* ===== CENTER PANEL - CHAT ===== */}
        <ChatPanel
          messages={messages}
          loading={loading}
          input={input}
          setInput={setInput}
          sendMessage={sendMessage}
          handleKeyPress={handleKeyPress}
          messagesEndRef={messagesEndRef}
        />

        {/* ===== RIGHT PANEL - CLINICAL DOCUMENTATION ===== */}
        <div className="panel panel-tools">
          {/* Panel Header */}
          <div className="clinical-header">
            <div className="clinical-header-top">
              <div className="clinical-header-title">
                <span className="clinical-header-icon">📝</span>
                <div>
                  <h2>Clinical Documentation</h2>
                  <p>Create SOAP notes, prescriptions &amp; imaging requests</p>
                </div>
              </div>
            </div>

            {/* Patient Context */}
            <div className="clinical-patient-context">
              {hasPatientSelected ? (
                <>
                  <div className="clinical-patient-avatar">
                    {currentPatient.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
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

          {/* Tabs */}
          <div className="clinical-tabs">
            <button 
              className={`clinical-tab ${activeTab === 'soap' ? 'active' : ''} ${!hasPatientSelected ? 'disabled' : ''}`}
              onClick={() => hasPatientSelected && setActiveTab('soap')}
              disabled={!hasPatientSelected}
            >
              <span className="tab-icon">📝</span>
              SOAP Note
            </button>
            <button 
              className={`clinical-tab ${activeTab === 'rx' ? 'active' : ''} ${!hasPatientSelected ? 'disabled' : ''}`}
              onClick={() => hasPatientSelected && setActiveTab('rx')}
              disabled={!hasPatientSelected}
            >
              <span className="tab-icon">💊</span>
              Prescription
            </button>
            <button 
              className={`clinical-tab ${activeTab === 'xray' ? 'active' : ''} ${!hasPatientSelected ? 'disabled' : ''}`}
              onClick={() => hasPatientSelected && setActiveTab('xray')}
              disabled={!hasPatientSelected}
            >
              <span className="tab-icon">🩻</span>
              Imaging
            </button>
          </div>

          {/* Content Area */}
          <div className="clinical-content">
            {/* SOAP Tab */}
            {activeTab === 'soap' && (
              <div className="soap-editor-premium">
                {!hasPatientSelected ? (
                  <div className="empty-state-premium">
                    <span className="empty-icon">🔒</span>
                    <h3>No Patient Selected</h3>
                    <p>Select a patient from the Patient Context panel to begin documentation.</p>
                  </div>
                ) : (
                  <>
                    {/* Subjective */}
                    <div className="soap-section-card">
                      <div className="soap-section-header">
                        <div className="soap-section-title">
                          <span className="section-icon">🗣</span>
                          <div>
                            <h4>SUBJECTIVE</h4>
                            <p>Patient's complaints &amp; history</p>
                          </div>
                        </div>
                        <button className="ai-suggest-btn" onClick={() => {
                          setInput(`Suggest subjective for SOAP note for ${currentPatient.name}`);
                          setTimeout(() => sendMessage(), 100);
                        }}>
                          ✨ AI Suggest
                        </button>
                      </div>
                      <textarea
                        className="soap-textarea-premium"
                        placeholder="e.g., Patient complains of chest pain for 2 hours, radiating to left arm..."
                        value={soapNote.subjective}
                        onChange={(e) => setSoapNote({...soapNote, subjective: e.target.value})}
                        rows="4"
                        maxLength="1000"
                      />
                      <div className="character-counter">
                        {soapNote.subjective?.length || 0}/1000 characters
                      </div>
                    </div>

                    {/* Objective */}
                    <div className="soap-section-card">
                      <div className="soap-section-header">
                        <div className="soap-section-title">
                          <span className="section-icon">❤️</span>
                          <div>
                            <h4>OBJECTIVE</h4>
                            <p>Vitals &amp; examination findings</p>
                          </div>
                        </div>
                        <button className="ai-suggest-btn" onClick={() => {
                          setInput(`Suggest objective for SOAP note for ${currentPatient.name}`);
                          setTimeout(() => sendMessage(), 100);
                        }}>
                          ✨ AI Suggest
                        </button>
                      </div>
                      <textarea
                        className="soap-textarea-premium"
                        placeholder="e.g., BP 165/95, HR 112, O2 92%, ECG shows ST depression..."
                        value={soapNote.objective}
                        onChange={(e) => setSoapNote({...soapNote, objective: e.target.value})}
                        rows="4"
                        maxLength="1000"
                      />
                      <div className="character-counter">
                        {soapNote.objective?.length || 0}/1000 characters
                      </div>
                    </div>

                    {/* Assessment */}
                    <div className="soap-section-card">
                      <div className="soap-section-header">
                        <div className="soap-section-title">
                          <span className="section-icon">🧠</span>
                          <div>
                            <h4>ASSESSMENT</h4>
                            <p>Clinical diagnosis &amp; differential</p>
                          </div>
                        </div>
                        <button className="ai-suggest-btn" onClick={() => {
                          setInput(`Suggest assessment for SOAP note for ${currentPatient.name}`);
                          setTimeout(() => sendMessage(), 100);
                        }}>
                          ✨ AI Suggest
                        </button>
                      </div>
                      <textarea
                        className="soap-textarea-premium"
                        placeholder="e.g., Acute coronary syndrome suspected. Risk factors: diabetes, hypertension..."
                        value={soapNote.assessment}
                        onChange={(e) => setSoapNote({...soapNote, assessment: e.target.value})}
                        rows="4"
                        maxLength="1000"
                      />
                      <div className="character-counter">
                        {soapNote.assessment?.length || 0}/1000 characters
                      </div>
                    </div>

                    {/* Plan */}
                    <div className="soap-section-card">
                      <div className="soap-section-header">
                        <div className="soap-section-title">
                          <span className="section-icon">📋</span>
                          <div>
                            <h4>PLAN</h4>
                            <p>Treatment &amp; follow-up</p>
                          </div>
                        </div>
                        <button className="ai-suggest-btn" onClick={() => {
                          setInput(`Suggest plan for SOAP note for ${currentPatient.name}`);
                          setTimeout(() => sendMessage(), 100);
                        }}>
                          ✨ AI Suggest
                        </button>
                      </div>
                      <textarea
                        className="soap-textarea-premium"
                        placeholder="e.g., Admit to cardiology, start aspirin, order troponin test, follow-up in 48 hours..."
                        value={soapNote.plan}
                        onChange={(e) => setSoapNote({...soapNote, plan: e.target.value})}
                        rows="4"
                        maxLength="1000"
                      />
                      <div className="character-counter">
                        {soapNote.plan?.length || 0}/1000 characters
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Prescription Tab */}
            {activeTab === 'rx' && (
              <div className="soap-editor-premium">
                {!hasPatientSelected ? (
                  <div className="empty-state-premium">
                    <span className="empty-icon">🔒</span>
                    <h3>No Patient Selected</h3>
                    <p>Select a patient from the Patient Context panel to begin documentation.</p>
                  </div>
                ) : (
                  <>
                    <div className="prescription-patient-header">
                      <h4>💊 Prescription for {currentPatient.name}</h4>
                      <p>MRN: {currentPatient.mrn} • {currentPatient.age} yrs • {currentPatient.gender}</p>
                    </div>

                    <div className="soap-section-card">
                      <div className="soap-section-header">
                        <div className="soap-section-title">
                          <span className="section-icon">💊</span>
                          <div>
                            <h4>Medication Name</h4>
                          </div>
                        </div>
                      </div>
                      <input
                        className="soap-input-premium"
                        type="text"
                        placeholder="e.g., Amoxicillin, Metformin"
                        value={prescription.medication}
                        onChange={(e) => setPrescription({...prescription, medication: e.target.value})}
                      />
                    </div>

                    <div className="soap-section-card">
                      <div className="soap-section-header">
                        <div className="soap-section-title">
                          <span className="section-icon">📏</span>
                          <div>
                            <h4>Dosage</h4>
                          </div>
                        </div>
                      </div>
                      <input
                        className="soap-input-premium"
                        type="text"
                        placeholder="e.g., 500mg, 10mg"
                        value={prescription.dosage}
                        onChange={(e) => setPrescription({...prescription, dosage: e.target.value})}
                      />
                    </div>

                    <div className="soap-section-card">
                      <div className="soap-section-header">
                        <div className="soap-section-title">
                          <span className="section-icon">⏰</span>
                          <div>
                            <h4>Frequency</h4>
                          </div>
                        </div>
                      </div>
                      <select
                        className="soap-select-premium"
                        value={prescription.frequency}
                        onChange={(e) => setPrescription({...prescription, frequency: e.target.value})}
                      >
                        <option>Once daily</option>
                        <option>Twice daily</option>
                        <option>Three times daily</option>
                        <option>Every 4 hours</option>
                        <option>Every 6 hours</option>
                        <option>As needed</option>
                      </select>
                    </div>

                    <div className="soap-section-card">
                      <div className="soap-section-header">
                        <div className="soap-section-title">
                          <span className="section-icon">📅</span>
                          <div>
                            <h4>Duration</h4>
                          </div>
                        </div>
                      </div>
                      <input
                        className="soap-input-premium"
                        type="text"
                        placeholder="e.g., 7 days, 30 days"
                        value={prescription.duration}
                        onChange={(e) => setPrescription({...prescription, duration: e.target.value})}
                      />
                    </div>

                    <div className="soap-section-card">
                      <div className="soap-section-header">
                        <div className="soap-section-title">
                          <span className="section-icon">📝</span>
                          <div>
                            <h4>Special Instructions</h4>
                          </div>
                        </div>
                      </div>
                      <textarea
                        className="soap-textarea-premium"
                        placeholder="e.g., Take with food, Avoid alcohol"
                        value={prescription.instructions}
                        onChange={(e) => setPrescription({...prescription, instructions: e.target.value})}
                        rows="2"
                      />
                    </div>

                    <button className="clinical-primary-action" onClick={handleGeneratePrescription} style={{ marginTop: '8px' }}>
                      <span className="action-icon">💊</span>
                      <div className="action-content">
                        <span className="action-title">Generate Prescription</span>
                        <span className="action-subtitle">Create a prescription for {currentPatient.name}</span>
                      </div>
                      <span className="action-arrow">→</span>
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Imaging Tab */}
            {activeTab === 'xray' && (
              <div className="soap-editor-premium">
                {!hasPatientSelected ? (
                  <div className="empty-state-premium">
                    <span className="empty-icon">🔒</span>
                    <h3>No Patient Selected</h3>
                    <p>Select a patient from the Patient Context panel to begin documentation.</p>
                  </div>
                ) : (
                  <div className="imaging-upload-premium">
                    <div className="imaging-patient-header">
                      <h4>🩻 Imaging for {currentPatient.name}</h4>
                      <p>Upload and analyze medical images</p>
                    </div>
                    {token && <XRayAnalyzer patientId={currentPatient?.id} token={token} onAnalysisComplete={handleAnalysisComplete} />}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sticky Footer */}
          <div className="clinical-footer">
            {/* Primary AI Action */}
            {hasPatientSelected ? (
              <button className="clinical-primary-action" onClick={handleSaveSoapNote}>
                <span className="action-icon">✨</span>
                <div className="action-content">
                  <span className="action-title">Create SOAP Note</span>
                  <span className="action-subtitle">Generate structured clinical documentation using AI</span>
                </div>
                <span className="action-arrow">→</span>
              </button>
            ) : (
              <button className="clinical-primary-action disabled" disabled>
                <span className="action-icon">🔒</span>
                <div className="action-content">
                  <span className="action-title">Create SOAP Note</span>
                  <span className="action-subtitle">Select a patient to begin documentation</span>
                </div>
              </button>
            )}

            {/* Secondary Actions */}
            <div className="clinical-secondary-actions">
              <button 
                className={`clinical-action-btn ${!hasPatientSelected ? 'disabled' : ''}`}
                onClick={() => {
                  if (hasPatientSelected) {
                    setInput(`Show SOAP note for ${currentPatient.name}`);
                    setTimeout(() => sendMessage(), 100);
                  }
                }}
                disabled={!hasPatientSelected}
              >
                <span className="action-btn-icon">📄</span>
                Show SOAP Note{hasPatientSelected ? ` for ${currentPatient.name}` : ''}
              </button>
              <button 
                className={`clinical-action-btn ${!hasPatientSelected ? 'disabled' : ''}`}
                onClick={() => {
                  if (hasPatientSelected) {
                    setInput(`Show prescription for ${currentPatient.name}`);
                    setTimeout(() => sendMessage(), 100);
                  }
                }}
                disabled={!hasPatientSelected}
              >
                <span className="action-btn-icon">💊</span>
                Show Prescription{hasPatientSelected ? ` for ${currentPatient.name}` : ''}
              </button>
              <button 
                className={`clinical-action-btn ${!hasPatientSelected ? 'disabled' : ''}`}
                onClick={() => {
                  if (hasPatientSelected) {
                    setInput(`Show imaging for ${currentPatient.name}`);
                    setTimeout(() => sendMessage(), 100);
                  }
                }}
                disabled={!hasPatientSelected}
              >
                <span className="action-btn-icon">🩻</span>
                Show Imaging{hasPatientSelected ? ` for ${currentPatient.name}` : ''}
              </button>
              <button 
                className={`clinical-action-btn ${!hasPatientSelected ? 'disabled' : ''}`}
                onClick={() => {
                  if (hasPatientSelected) {
                    setInput(`Schedule follow-up for ${currentPatient.name}`);
                    setTimeout(() => sendMessage(), 100);
                  }
                }}
                disabled={!hasPatientSelected}
              >
                <span className="action-btn-icon">📅</span>
                Schedule Follow-up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;