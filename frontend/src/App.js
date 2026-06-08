import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([
    { id: '1', text: "Hello! I'm MediAgent, your AI medical assistant. How can I help you today?", isUser: false, timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [soapNote, setSoapNote] = useState({ subjective: '', objective: '', assessment: '', plan: '' });
  const [activeTab, setActiveTab] = useState('soap');
  const [showAddPatient, setShowAddPatient] = useState(false);
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
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const login = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'doctor@mediagent.com', password: 'password123' })
        });
        const data = await response.json();
        setToken(data.token);
        console.log('✅ Auto-login successful!');
      } catch (error) {
        console.error('Login failed:', error);
      }
    };
    login();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !token) return;

    const userMessage = { id: Date.now().toString(), text: input, isUser: true, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: input, session_id: 'web_' + Date.now() })
      });
      const data = await response.json();
      
      if (data.patient) {
        setCurrentPatient(data.patient);
      }
      
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), text: data.reply, isUser: false, timestamp: new Date() }]);
    } catch (error) {
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), text: 'Error: ' + error.message, isUser: false, timestamp: new Date() }]);
    }
    setLoading(false);
  };

  const handleKeyPress = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const handleAddPatient = async () => {
    if (!newPatient.name) {
      alert('Please enter patient name');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/patients/', {
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
        alert(`✅ Patient ${newPatient.name} added successfully!`);
        setShowAddPatient(false);
        setNewPatient({ name: '', age: '', gender: 'Male', phone: '', email: '', conditions: '', allergies: '' });
        setInput(`Show me ${newPatient.name}`);
        setTimeout(() => sendMessage(), 100);
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
      const response = await fetch('http://localhost:8000/api/prescriptions/', {
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
        const data = await response.json();
        alert(`✅ Prescription generated for ${currentPatient.name}!`);
        setPrescription({ medication: '', dosage: '', frequency: 'Once daily', duration: '7 days', instructions: '' });
        setInput(`Show me prescriptions for ${currentPatient.name}`);
        setTimeout(() => sendMessage(), 100);
      } else {
        alert('Error generating prescription');
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const quickAction = (action) => {
    const actionMap = {
      'schedule': 'Schedule appointment for ' + (currentPatient?.name || 'patient'),
      'soap': 'Generate SOAP note',
      'xray': 'Upload X-ray for analysis',
      'rx': 'Write prescription for ' + (currentPatient?.name || 'patient')
    };
    setInput(actionMap[action]);
    setTimeout(() => sendMessage(), 100);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <span className="logo">🏥</span>
          <span className="title">MediAgent V2</span>
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
              placeholder="🔍 Search patient..." 
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
            <h4>{currentPatient ? 'Current Patient' : 'No Patient Selected'}</h4>
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
              </>
            ) : (
              <div className="no-patient">🔍 Search or add a patient</div>
            )}
          </div>

          <div className="vitals-card">
            <h4>📊 Vital Signs</h4>
            <div className="vital-row"><span>❤️ BP:</span><span>120/80 mmHg</span></div>
            <div className="vital-row"><span>💓 HR:</span><span>72 bpm</span></div>
            <div className="vital-row"><span>🌡️ Temp:</span><span>98.6 °F</span></div>
            <div className="vital-row"><span>🫁 SpO2:</span><span>98%</span></div>
          </div>
        </div>

        <div className="panel panel-chat">
          <div className="panel-header">💬 Conversation</div>
          <div className="chat-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.isUser ? 'user' : 'ai'}`}>
                <div className="message-avatar">{msg.isUser ? '👨‍⚕️' : '🤖'}</div>
                <div className="message-bubble">
                  <div className="message-text">{msg.text}</div>
                  <div className="message-time">{msg.timestamp.toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="message ai">
                <div className="message-avatar">🤖</div>
                <div className="message-bubble typing">Typing<span>.</span><span>.</span><span>.</span></div>
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
            <button className={`tab ${activeTab === 'soap' ? 'active' : ''}`} onClick={() => setActiveTab('soap')}>📝 SOAP</button>
            <button className={`tab ${activeTab === 'rx' ? 'active' : ''}`} onClick={() => setActiveTab('rx')}>💊 Rx</button>
            <button className={`tab ${activeTab === 'xray' ? 'active' : ''}`} onClick={() => setActiveTab('xray')}>🩻 X-Ray</button>
          </div>

          {activeTab === 'soap' && (
            <div className="soap-editor">
              <div className="soap-field">
                <label>📋 Subjective</label>
                <textarea placeholder="Patient's symptoms, history..." value={soapNote.subjective} onChange={(e) => setSoapNote({...soapNote, subjective: e.target.value})} rows="2" />
              </div>
              <div className="soap-field">
                <label>🔬 Objective</label>
                <textarea placeholder="Exam findings, vitals..." value={soapNote.objective} onChange={(e) => setSoapNote({...soapNote, objective: e.target.value})} rows="2" />
              </div>
              <div className="soap-field">
                <label>🧠 Assessment</label>
                <textarea placeholder="Diagnosis, differential..." value={soapNote.assessment} onChange={(e) => setSoapNote({...soapNote, assessment: e.target.value})} rows="2" />
              </div>
              <div className="soap-field">
                <label>📋 Plan</label>
                <textarea placeholder="Treatment, follow-up..." value={soapNote.plan} onChange={(e) => setSoapNote({...soapNote, plan: e.target.value})} rows="2" />
              </div>
              <button className="save-btn" onClick={() => alert('SOAP note saved!')}>💾 Save SOAP Note</button>
            </div>
          )}

          {activeTab === 'rx' && (
            <div className="soap-editor">
              <h4>💊 Prescription Generator</h4>
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
            </div>
          )}

          {activeTab === 'xray' && (
            <div className="xray-tab">
              <div className="upload-area">
                <span>🩻</span>
                <p>Upload Chest X-Ray</p>
                <small>Coming soon!</small>
              </div>
            </div>
          )}

          <div className="quick-actions">
            <button className="quick-btn" onClick={() => quickAction('schedule')}>📅 Schedule</button>
            <button className="quick-btn" onClick={() => quickAction('soap')}>📝 SOAP Note</button>
            <button className="quick-btn" onClick={() => quickAction('rx')}>💊 Prescription</button>
            <button className="quick-btn" onClick={() => quickAction('xray')}>🩻 X-Ray</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
