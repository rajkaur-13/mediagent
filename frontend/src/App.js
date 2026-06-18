import React, { useState, useRef, useEffect, useCallback } from 'react';
import XRayAnalyzer from './components/XRayAnalyzer';
import AnalyzeButton from './components/AnalyzeButton';
import './App.css';

const API_URL = 'https://mediagent-pn7o.onrender.com';

function App() {
  const welcomeMessage = `🏥 <strong>Welcome to MediAgent!</strong><br/>
I'm your AI medical assistant.<br/><br/>
🔹 <strong>To work with a patient:</strong> Search for them above<br/>
🔹 <strong>To ask a medical question:</strong> Just type your question<br/><br/>
Selected patient will appear here, and all tools will become available.<br/><br/>
How can I help you today?`;

  const [messages, setMessages] = useState([
    { id: '1', text: welcomeMessage, isUser: false, timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [soapNote, setSoapNote] = useState({ subjective: '', objective: '', assessment: '', plan: '' });
  const [activeTab, setActiveTab] = useState('soap');
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [currentSoapNoteId, setCurrentSoapNoteId] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [prescription, setPrescription] = useState({
    medication: '',
    dosage: '',
    frequency: 'Once daily',
    duration: '7 days',
    instructions: ''
  });
  const [newPatient, setNewPatient] = useState({
    name: '',
    age: '',
    gender: 'Male',
    phone: '',
    email: '',
    conditions: '',
    allergies: ''
  });
  const [token, setToken] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const messagesEndRef = useRef(null);

  const hasPatientSelected = currentPatient !== null;

  useEffect(() => {
    const login = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'doctor@mediagent.com', password: 'password123' })
        });
        const data = await response.json();
        setToken(data.token);
        console.log('Auto-login successful!');
        fetchAppointments(data.token);
      } catch (error) {
        console.error('Login failed:', error);
      }
    };
    login();
  }, []);

  const fetchAppointments = async (authToken) => {
    try {
      const response = await fetch(`${API_URL}/api/appointments/`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await response.json();
      if (response.ok) {
        setRecentAppointments(data.appointments || []);
      }
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    }
  };

  const getRelativeDate = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointmentDate = new Date(dateStr);
    appointmentDate.setHours(0, 0, 0, 0);
    
    const diffTime = appointmentDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
    if (diffDays > 7) return `In ${Math.floor(diffDays / 7)} weeks`;
    if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
    return dateStr;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatPatientDetails = (patient) => {
    return `✅ <strong>Patient Selected: ${patient.name}</strong><br/>
📋 <strong>Demographics:</strong> MRN: ${patient.mrn} | Age: ${patient.age} | Gender: ${patient.gender}<br/>
🩺 <strong>Medical History:</strong> Allergies: ${patient.allergies?.length > 0 ? patient.allergies.join(', ') : 'None'} | Conditions: ${patient.conditions?.length > 0 ? patient.conditions.join(', ') : 'None'}<br/>
💊 <strong>Medications:</strong> ${patient.medications?.length > 0 ? patient.medications.join(', ') : 'None'}<br/>
✅ Tools are now active for ${patient.name}`;
  };

  const formatMessage = (text) => {
    if (!text) return '';
    
    let formatted = text;
    
    formatted = formatted.replace(/\n/g, '<br/>');
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    const patientNames = [
      'Sarah Johnson', 'Michael Chen', 'Emily Rodriguez', 
      'James Williams', 'Maria Garcia', 'Robert', 'John Smith'
    ];
    
    patientNames.forEach(name => {
      const regex = new RegExp(`(${name})`, 'g');
      formatted = formatted.replace(regex, (match) => {
        return `<span class="patient-name-link" onclick="window.directSelectPatient('${match}')">${match}</span>`;
      });
    });
    
    formatted = formatted.replace(/robert/g, (match) => {
      return `<span class="patient-name-link" onclick="window.directSelectPatient('Robert')">Robert</span>`;
    });
    
    return formatted;
  };

  const handleAnalysisComplete = (analysis) => {
    if (analysis.formatted_response) {
      const formattedMessage = formatMessage(analysis.formatted_response);
      setMessages(prev => [...prev, { id: Date.now().toString(), text: formattedMessage, isUser: false, timestamp: new Date() }]);
      scrollToBottom();
    }
  };

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !token) return;

    const userMessage = { id: Date.now().toString(), text: input, isUser: true, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: input, session_id: 'web_' + Date.now() })
      });
      const data = await response.json();
      
      if (data.patient) {
        setCurrentPatient(data.patient);
      }
      
      const formattedMessage = formatMessage(data.reply);
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), text: formattedMessage, isUser: false, timestamp: new Date() }]);
      
      if (input.toLowerCase().includes('schedule') || input.toLowerCase().includes('appointment')) {
        fetchAppointments(token);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), text: '❌ Error: ' + error.message, isUser: false, timestamp: new Date() }]);
    }
    setLoading(false);
  }, [input, token]);

  const handleDirectPatientSelect = useCallback(async (patientName) => {
    if (!token) return;
    
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: `Show me ${patientName}`, session_id: 'direct_select_' + Date.now() })
      });
      const data = await response.json();
      
      if (data.patient) {
        setCurrentPatient(data.patient);
        const formattedMessage = formatMessage(data.reply);
        
        const systemMessage = { 
          id: Date.now().toString(), 
          text: formattedMessage, 
          isUser: false, 
          timestamp: new Date() 
        };
        setMessages(prev => [...prev, systemMessage]);
        scrollToBottom();
      } else {
        const errorMessage = formatMessage(`❌ Patient "${patientName}" not found. Please check the name.`);
        setMessages(prev => [...prev, { id: Date.now().toString(), text: errorMessage, isUser: false, timestamp: new Date() }]);
      }
    } catch (error) {
      console.error('Failed to select patient:', error);
      const errorMessage = formatMessage(`❌ Error selecting patient. Please try again.`);
      setMessages(prev => [...prev, { id: Date.now().toString(), text: errorMessage, isUser: false, timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    window.directSelectPatient = (name) => {
      handleDirectPatientSelect(name);
    };
  }, [handleDirectPatientSelect]);

  const handleKeyPress = (e) => { 
    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault(); 
      sendMessage(); 
    } 
  };

  const handleAddPatient = async () => {
    if (!newPatient.name) {
      alert('Please enter patient name');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/patients/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          name: newPatient.name,
          age: parseInt(newPatient.age) || 0,
          gender: newPatient.gender,
          phone: newPatient.phone,
          email: newPatient.email,
          conditions: newPatient.conditions ? newPatient.conditions.split(',').map(c => c.trim()) : [],
          allergies: newPatient.allergies ? newPatient.allergies.split(',').map(a => a.trim()) : []
        })
      });
      
      if (response.ok) {
        alert(`Patient ${newPatient.name} added successfully!`);
        setShowAddPatient(false);
        setNewPatient({ name: '', age: '', gender: 'Male', phone: '', email: '', conditions: '', allergies: '' });
        handleDirectPatientSelect(newPatient.name);
      } else {
        const error = await response.json();
        alert('Error: ' + (error.detail || 'Failed to add patient'));
      }
    } catch (error) {
      alert('Error adding patient: ' + error.message);
    }
  };

  const handleGeneratePrescription = async () => {
    if (!currentPatient) {
      alert('Please select a patient first');
      return;
    }

    if (!prescription.medication) {
      alert('Please enter medication name');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/prescriptions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          patient_id: currentPatient.id,
          medication: prescription.medication,
          dosage: prescription.dosage,
          frequency: prescription.frequency,
          duration: prescription.duration,
          instructions: prescription.instructions || `Take ${prescription.dosage} ${prescription.frequency} for ${prescription.duration}`
        })
      });
      
      if (response.ok) {
        alert(`Prescription generated for ${currentPatient.name}!`);
        setPrescription({ medication: '', dosage: '', frequency: 'Once daily', duration: '7 days', instructions: '' });
        handleDirectPatientSelect(currentPatient.name);
      } else {
        alert('Error generating prescription');
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleSaveSoapNote = async () => {
    if (!currentPatient) {
      alert('Please select a patient first');
      return;
    }
    
    const soapContent = `Generate SOAP note for ${currentPatient.name} with:
Subjective: ${soapNote.subjective}
Objective: ${soapNote.objective}
Assessment: ${soapNote.assessment}
Plan: ${soapNote.plan}`;
    
    try {
      const response = await fetch(`${API_URL}/api/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          message: soapContent,
          session_id: 'web_' + Date.now()
        })
      });
      
      const data = await response.json();
      const formattedMessage = formatMessage(data.reply);
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), text: formattedMessage, isUser: false, timestamp: new Date() }]);
      
      const idMatch = data.reply.match(/ID: ([a-f0-9-]+)/i);
      if (idMatch) {
        setCurrentSoapNoteId(idMatch[1]);
      }
      
      alert(`SOAP note saved for ${currentPatient.name}!`);
    } catch (error) {
      alert('Error saving SOAP note: ' + error.message);
    }
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

  const upcomingAppointments = recentAppointments
    .filter(apt => new Date(apt.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  const getTabLabel = (base, icon) => {
    if (hasPatientSelected) {
      return `${icon} ${base} for ${currentPatient.name.split(' ')[0]}`;
    }
    return `${icon} ${base}`;
  };

  const renderMessage = (text) => {
    return { __html: text };
  };

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

      <div className="main-container">
        <div className="panel panel-patient">
          <div className="panel-header">📋 Patient Context</div>
          
          <div className="search-box">
            <input 
              type="text" 
              placeholder="🔍 Search patient by name or MRN..." 
              onKeyPress={(e) => {
                if (e.key === 'Enter') setInput(`Show me ${e.target.value}`);
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

          {activeTab === 'xray' && (
            <div className="xray-tab">
              {!hasPatientSelected ? (
                <div className="disabled-overlay">
                  <span>🔒</span>
                  <p>Select a patient first to upload and analyze images</p>
                </div>
              ) : (
                token && <XRayAnalyzer patientId={currentPatient?.id} token={token} />
              )}
            </div>
          )}

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

