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
import ClinicalPanel from "../features/clinical/components/ClinicalPanel";

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
        <ClinicalPanel
         currentPatient={currentPatient}
         token={token}
         soapNote={soapNote}
         setSoapNote={setSoapNote}
         handleSaveSoapNote={handleSaveSoapNote}
         prescription={prescription}
         setPrescription={setPrescription}
         handleGeneratePrescription={handleGeneratePrescription}
         onAnalysisComplete={handleAnalysisComplete}
         onScheduleFollowUp={(patient) => {
            if (patient) {
              setInput(`Schedule follow-up for ${patient.name}`);
              setTimeout(() => sendMessage(), 100);
            }
          }}
        />

      </div>
    </div>
  );
}

export default App;