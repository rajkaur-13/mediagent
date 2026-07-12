import React, { useState, useEffect, useRef, useCallback } from "react";
import './App.css';

// Hooks
import { useAuth } from '../features/auth/hooks/useAuth';
import { useChat } from '../features/chat/hooks/useChat';
import { usePatients } from '../features/patients/hooks/usePatients';
import { useSoap } from '../features/soap/hooks/useSoap';
import { usePrescription } from '../features/prescriptions/hooks/usePrescription';
import { useAppointments } from '../features/appointments/hooks/useAppointments';
import ChatPanel from "../features/chat/components/ChatPanel";
import PatientPanel from "../features/patients/components/PatientPanel";


// Components
import XRayAnalyzer from '../features/imaging/components/XRayAnalyzer';
import AnalyzeButton from '../features/imaging/components/AnalyzeButton';

function App() {
  // ===== AUTH =====
  const { token, recentAppointments, setRecentAppointments } = useAuth();

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

  // ===== WRAPPER FUNCTIONS =====
  const sendMessage = () => {
    if (!input.trim() || !token) return;
    sendChatMessage(input, token, currentPatient, setCurrentPatient, setPatientCache, setAllPatientNames, allPatientNames);
  };
  const quickAction = (action) => {
    if (!currentPatient && action !== 'schedule') {
      alert('Please select a patient first');
      return;
    }
    
    const actionMap = {
      'schedule': 'Schedule appointment for ' + (currentPatient?.name || 'patient'),
      'soap': `Generate SOAP note for ${currentPatient?.name}`,
      'xray': `Upload X-ray for ${currentPatient?.name}`,
      'rx': `Write prescription for ${currentPatient?.name}`
    };
    setInput(actionMap[action]);
    setTimeout(() => sendMessage(), 100);
  };

  const handleAnalysisComplete = (analysis) => {
    if (analysis.formatted_response) {
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

  const getTabLabel = (base, icon) => {
    if (hasPatientSelected) {
      return `${icon} ${base} for ${currentPatient.name.split(' ')[0]}`;
    }
    return `${icon} ${base}`;
  };

  // Expose for clickable patient names
  useEffect(() => {
    window.directSelectPatient = handleDirectPatientSelect;
  }, [handleDirectPatientSelect]);

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
          <button className="icon-btn">👤</button>
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
        <div className="panel panel-patient">
          <div className="panel-header">📋 Patient Context</div>
          
          <div className="search-box">
            <input 
              type="text" 
              placeholder="🔍 Search patient by name or MRN..." 
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  setInput(`Show me ${e.target.value}`);
                  setTimeout(() => sendMessage(), 100);
                }
              }} 
            />
            <button className="add-patient-btn" onClick={() => setShowAddPatient(!showAddPatient)}>
              + Add New Patient
            </button>
          </div>

          {showAddPatient && (
            <div className="add-patient-form">
              <h4>➕ New Patient</h4>
              <input type="text" placeholder="Full Name *" value={newPatient.name} onChange={(e) => setNewPatient({...newPatient, name: e.target.value})} />
              <input type="number" placeholder="Age" value={newPatient.age} onChange={(e) => setNewPatient({...newPatient, age: e.target.value})} />
              <select value={newPatient.gender} onChange={(e) => setNewPatient({...newPatient, gender: e.target.value})}>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
              <input type="tel" placeholder="Phone" value={newPatient.phone} onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})} />
              <input type="email" placeholder="Email" value={newPatient.email} onChange={(e) => setNewPatient({...newPatient, email: e.target.value})} />
              <input type="text" placeholder="Conditions (comma separated)" value={newPatient.conditions} onChange={(e) => setNewPatient({...newPatient, conditions: e.target.value})} />
              <input type="text" placeholder="Allergies (comma separated)" value={newPatient.allergies} onChange={(e) => setNewPatient({...newPatient, allergies: e.target.value})} />
              <div className="form-buttons">
                <button className="save-btn" onClick={handleAddPatient}>💾 Save</button>
                <button className="cancel-btn" onClick={() => setShowAddPatient(false)}>❌ Cancel</button>
              </div>
            </div>
          )}

          <div className="patient-card">
            <h4>{currentPatient ? '✅ Current Patient' : '⚠️ No Patient Selected'}</h4>
            {currentPatient ? (
              <>
                <div className="patient-name">{currentPatient.name}</div>
                <div className="patient-detail">📋 MRN: {currentPatient.mrn}</div>
                <div className="patient-detail">🎂 Age: {currentPatient.age} | {currentPatient.gender}</div>
                {currentPatient.allergies?.length > 0 && (
                  <div className="alert-badge">⚠️ Allergies: {currentPatient.allergies.join(', ')}</div>
                )}
                <div className="patient-detail">💊 Conditions: {currentPatient.conditions?.join(', ') || 'None'}</div>
                <div className="patient-detail">📞 Phone: {currentPatient.phone || 'N/A'}</div>
                <button className="clear-patient-btn" onClick={() => setCurrentPatient(null)}>✖️ Clear Selection</button>
              </>
            ) : (
              <div className="no-patient">
                <span>🔒</span>
                <p>Select a patient to enable tools</p>
                <small>Search above by name or MRN</small>
              </div>
            )}
            {token && currentPatient && (
              <AnalyzeButton 
                patientId={currentPatient.id} 
                token={token} 
                onAnalysisComplete={handleAnalysisComplete}
              />
            )}
          </div>

          <div className="appointments-card">
            <h4>📅 Upcoming Appointments</h4>
            {upcomingAppointments.length > 0 ? (
              upcomingAppointments.map((apt, idx) => (
                <div key={idx} className="appointment-item">
                  <div className="appointment-patient">{apt.patient_name}</div>
                  <div className="appointment-date">{getRelativeDate(apt.date)}</div>
                  <div className="appointment-time">{apt.time}</div>
                  <div className="appointment-reason" title={apt.reason}>{apt.reason?.substring(0, 40)}...</div>
                </div>
              ))
            ) : (
              <div className="no-appointments">No upcoming appointments</div>
            )}
          </div>
        </div>

        {/* ===== CENTER PANEL - CHAT ===== */}
        <div className="panel panel-chat">
          <div className="panel-header">💬 Conversation</div>
          <div className="chat-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.isUser ? 'user' : 'ai'}`}>
                <div className="message-avatar">{msg.isUser ? '👨‍⚕️' : '🤖'}</div>
                <div className="message-bubble">
                  <div className="message-text" dangerouslySetInnerHTML={renderMessage(msg.text)} />
                  <div className="message-time">{msg.timestamp.toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="message ai">
                <div className="message-avatar">🤖</div>
                <div className="message-bubble">
                  <div className="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input-area">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here... (Press Enter to send)"
              rows="2"
            />
            <button className="send-btn" onClick={sendMessage}>📤 Send</button>
          </div>
        </div>

        {/* ===== RIGHT PANEL - TOOLS ===== */}
        <div className="panel panel-tools">
          <div className="panel-tabs">
            <button 
              className={`tab ${activeTab === 'soap' ? 'active' : ''} ${!hasPatientSelected ? 'disabled' : ''}`}
              onClick={() => hasPatientSelected && setActiveTab('soap')}
              title={!hasPatientSelected ? "Select a patient first" : ""}
            >
              {getTabLabel('SOAP', '📝')}
            </button>
            <button 
              className={`tab ${activeTab === 'rx' ? 'active' : ''} ${!hasPatientSelected ? 'disabled' : ''}`}
              onClick={() => hasPatientSelected && setActiveTab('rx')}
              title={!hasPatientSelected ? "Select a patient first" : ""}
            >
              {getTabLabel('Rx', '💊')}
            </button>
            <button 
              className={`tab ${activeTab === 'xray' ? 'active' : ''} ${!hasPatientSelected ? 'disabled' : ''}`}
              onClick={() => hasPatientSelected && setActiveTab('xray')}
              title={!hasPatientSelected ? "Select a patient first" : ""}
            >
              {getTabLabel('Imaging', '🩻')}
            </button>
          </div>

          {/* SOAP Tab */}
          {activeTab === 'soap' && (
            <div className="soap-editor">
              {!hasPatientSelected ? (
                <div className="disabled-overlay">
                  <span>🔒</span>
                  <p>Select a patient first to create SOAP notes</p>
                </div>
              ) : (
                <>
                  <div className="soap-field">
                    <label>📋 Subjective (Patient's words/symptoms)</label>
                    <textarea 
                      placeholder="e.g., Patient complains of chest pain for 2 hours, radiating to left arm..."
                      value={soapNote.subjective} 
                      onChange={(e) => setSoapNote({...soapNote, subjective: e.target.value})} 
                      rows="4" 
                    />
                  </div>
                  <div className="soap-field">
                    <label>🔬 Objective (Vitals, exam findings, test results)</label>
                    <textarea 
                      placeholder="e.g., BP 165/95, HR 112, O2 92%, ECG shows ST depression..."
                      value={soapNote.objective} 
                      onChange={(e) => setSoapNote({...soapNote, objective: e.target.value})} 
                      rows="4" 
                    />
                  </div>
                  <div className="soap-field">
                    <label>🧠 Assessment (Diagnosis, differential)</label>
                    <textarea 
                      placeholder="e.g., Acute coronary syndrome suspected. Risk factors: diabetes, hypertension..."
                      value={soapNote.assessment} 
                      onChange={(e) => setSoapNote({...soapNote, assessment: e.target.value})} 
                      rows="4" 
                    />
                  </div>
                  <div className="soap-field">
                    <label>📋 Plan (Treatment, follow-up, referrals)</label>
                    <textarea 
                      placeholder="e.g., Admit to cardiology, start aspirin, order troponin, cardiology consult..."
                      value={soapNote.plan} 
                      onChange={(e) => setSoapNote({...soapNote, plan: e.target.value})} 
                      rows="4" 
                    />
                  </div>
                  <button className="save-btn" onClick={handleSaveSoapNote}>💾 Save SOAP Note</button>
                </>
              )}
            </div>
          )}

          {/* Prescription Tab */}
          {activeTab === 'rx' && (
            <div className="soap-editor">
              {!hasPatientSelected ? (
                <div className="disabled-overlay">
                  <span>🔒</span>
                  <p>Select a patient first to generate prescriptions</p>
                </div>
              ) : (
                <>
                  <h4>💊 Prescription for {currentPatient?.name}</h4>
                  <div className="soap-field">
                    <label>💊 Medication Name</label>
                    <input type="text" placeholder="e.g., Amoxicillin, Metformin" value={prescription.medication} onChange={(e) => setPrescription({...prescription, medication: e.target.value})} />
                  </div>
                  <div className="soap-field">
                    <label>📏 Dosage</label>
                    <input type="text" placeholder="e.g., 500mg, 10mg" value={prescription.dosage} onChange={(e) => setPrescription({...prescription, dosage: e.target.value})} />
                  </div>
                  <div className="soap-field">
                    <label>⏰ Frequency</label>
                    <select value={prescription.frequency} onChange={(e) => setPrescription({...prescription, frequency: e.target.value})}>
                      <option>Once daily</option>
                      <option>Twice daily</option>
                      <option>Three times daily</option>
                      <option>Every 4 hours</option>
                      <option>Every 6 hours</option>
                      <option>As needed</option>
                    </select>
                  </div>
                  <div className="soap-field">
                    <label>📅 Duration</label>
                    <input type="text" placeholder="e.g., 7 days, 30 days" value={prescription.duration} onChange={(e) => setPrescription({...prescription, duration: e.target.value})} />
                  </div>
                  <div className="soap-field">
                    <label>📝 Special Instructions</label>
                    <textarea placeholder="e.g., Take with food, Avoid alcohol" value={prescription.instructions} onChange={(e) => setPrescription({...prescription, instructions: e.target.value})} rows="2" />
                  </div>
                  <button className="save-btn" onClick={handleGeneratePrescription}>💊 Generate Prescription</button>
                </>
              )}
            </div>
          )}

          {/* Imaging Tab */}
          {activeTab === 'xray' && (
            <div className="xray-tab">
              {!hasPatientSelected ? (
                <div className="disabled-overlay">
                  <span>🔒</span>
                  <p>Select a patient first to upload and analyze images</p>
                </div>
              ) : (
                token && <XRayAnalyzer patientId={currentPatient?.id} token={token} onAnalysisComplete={handleAnalysisComplete} />
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div className="quick-actions">
            <button className="quick-btn" onClick={() => quickAction('schedule')}>📅 Schedule</button>
            <button className="quick-btn" onClick={() => quickAction('soap')} disabled={!hasPatientSelected}>📝 SOAP Note</button>
            <button className="quick-btn" onClick={() => quickAction('rx')} disabled={!hasPatientSelected}>💊 Prescription</button>
            <button className="quick-btn" onClick={() => quickAction('xray')} disabled={!hasPatientSelected}>🩻 Imaging</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
