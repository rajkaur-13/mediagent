import React, { useState, useRef, useEffect, useCallback } from 'react';
import XRayAnalyzer from './components/XRayAnalyzer';
import AnalyzeButton from './components/AnalyzeButton';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

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
  
  const [mobileTab, setMobileTab] = useState('chat');
  
  const messagesEndRef = useRef(null);

  const [patientCache, setPatientCache] = useState({});
  const [allPatientNames, setAllPatientNames] = useState([]);

  const hasPatientSelected = currentPatient !== null;

  useEffect(() => {
    window.__debug = {
      currentPatient,
      allPatientNames,
      token,
      setCurrentPatient,
      setAllPatientNames,
      patientCache,
    };
    console.log('🐛 Debug object available as window.__debug');
    console.log('📋 Current patient:', currentPatient?.name || 'None');
    console.log('📋 All patient names:', allPatientNames);
  }, [currentPatient, allPatientNames, token, patientCache]);

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
        console.log('✅ Auto-login successful!');
        fetchAppointments(data.token);
      } catch (error) {
        console.error('❌ Login failed:', error);
      }
    };
    login();
  }, []);

  useEffect(() => {
    const fetchAllPatients = async () => {
      if (!token) return;
      try {
        console.log('📡 Fetching all patients...');
        const response = await fetch(`${API_URL}/api/patients/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          const nameMap = {};
          const names = [];
          data.patients?.forEach(p => {
            nameMap[p.name] = p.mrn || p.id;
            names.push(p.name);
          });
          setPatientCache(nameMap);
          setAllPatientNames(names);
          console.log(`📋 Loaded ${names.length} patient names into cache:`, names);
        } else {
          console.error('❌ Failed to fetch patients:', response.status);
        }
      } catch (error) {
        console.error('❌ Failed to fetch patient names:', error);
      }
    };
    
    if (token) {
      fetchAllPatients();
    }
  }, [token]);

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
    
    const patientNameMatches = text.matchAll(/(?:Patient Selected:|✅ Patient Selected:)\s*([^\n<]+)/g);
    const patientNames = [];
    
    for (const match of patientNameMatches) {
      const name = match[1].trim();
      if (!patientNames.includes(name) && name.length > 0) {
        patientNames.push(name);
        console.log('🔍 Found patient name in message:', name);
      }
    }
    
    const listMatches = text.matchAll(/•\s*([^\n(]+?)(?:\s*\(|$)/g);
    for (const match of listMatches) {
      const name = match[1].trim();
      if (!patientNames.includes(name) && name.length > 0) {
        patientNames.push(name);
        console.log('🔍 Found patient name in list:', name);
      }
    }
    
    patientNames.forEach(name => {
      if (name.length < 2) return;
      
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?<![<"'])\\b${escapedName}\\b(?![^<]*<\/)`, 'g');
      
      formatted = formatted.replace(regex, (match) => {
        return `<span class="patient-name-link" onclick="window.directSelectPatient('${match.replace(/'/g, "\\'")}')">${match}</span>`;
      });
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
      
      console.log('📥 Chat response:', data);
      
      if (data.patient) {
        console.log('✅ Setting current patient to:', data.patient.name);
        setCurrentPatient(data.patient);
        setPatientCache(prev => ({
          ...prev,
          [data.patient.name]: data.patient.mrn || data.patient.id
        }));
        if (!allPatientNames.includes(data.patient.name)) {
          setAllPatientNames(prev => [...prev, data.patient.name]);
        }
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
  }, [input, token, allPatientNames]);

  const handleDirectPatientSelect = useCallback(async (patientName) => {
    console.log('🔍 Selecting patient:', patientName);
    
    if (!token) {
      console.error('❌ No token - please login first');
      return;
    }
    
    if (allPatientNames.length > 0 && !allPatientNames.includes(patientName)) {
      console.warn(`⚠️ Patient "${patientName}" not found in cache`);
      const matchedName = allPatientNames.find(name => 
        name.toLowerCase().includes(patientName.toLowerCase()) ||
        patientName.toLowerCase().includes(name.toLowerCase())
      );
      
      if (matchedName) {
        patientName = matchedName;
        console.log(`🔄 Using closest match: "${matchedName}"`);
      }
    }
    
    setLoading(true);
    
    try {
      console.log('📡 Sending request for:', patientName);
      const response = await fetch(`${API_URL}/api/chat/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          message: `Show me ${patientName}`, 
          session_id: 'direct_select_' + Date.now() 
        })
      });
      
      const data = await response.json();
      console.log('📥 Response data:', data);
      
      if (data.patient) {
        console.log('✅ Patient found:', data.patient.name);
        setCurrentPatient(data.patient);
        setPatientCache(prev => ({
          ...prev,
          [data.patient.name]: data.patient.mrn || data.patient.id
        }));
        if (!allPatientNames.includes(data.patient.name)) {
          setAllPatientNames(prev => [...prev, data.patient.name]);
        }
        
        const formattedMessage = formatMessage(data.reply);
        setMessages(prev => [...prev, { 
          id: Date.now().toString(), 
          text: formattedMessage, 
          isUser: false, 
          timestamp: new Date() 
        }]);
        scrollToBottom();
      } else {
        console.log('❌ No patient found for:', patientName);
        const similarPatients = allPatientNames
          .filter(name => name.toLowerCase().includes(patientName.toLowerCase()))
          .slice(0, 5);
        
        let errorMsg = `❌ Patient "${patientName}" not found.`;
        if (similarPatients.length > 0) {
          errorMsg += ` Did you mean: ${similarPatients.join(', ')}?`;
        }
        const errorMessage = formatMessage(errorMsg);
        setMessages(prev => [...prev, { 
          id: Date.now().toString(), 
          text: errorMessage, 
          isUser: false, 
          timestamp: new Date() 
        }]);
      }
    } catch (error) {
      console.error('❌ Failed to select patient:', error);
      const errorMessage = formatMessage(`❌ Error selecting patient. Please try again or search manually.`);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        text: errorMessage, 
        isUser: false, 
        timestamp: new Date() 
      }]);
    } finally {
      setLoading(false);
    }
  }, [token, allPatientNames]);

  const handlePatientClick = (patientName) => {
    console.log('🖱️ Patient clicked:', patientName);
    if (!patientName || patientName.trim() === '') return;
    
    const exactMatch = allPatientNames.find(name => 
      name.toLowerCase() === patientName.toLowerCase()
    );
    
    if (exactMatch) {
      console.log('✅ Exact match found:', exactMatch);
      handleDirectPatientSelect(exactMatch);
    } else {
      const fuzzyMatch = allPatientNames.find(name => 
        name.toLowerCase().includes(patientName.toLowerCase()) ||
        patientName.toLowerCase().includes(name.toLowerCase())
      );
      if (fuzzyMatch) {
        console.log('🔄 Fuzzy match found:', fuzzyMatch);
        handleDirectPatientSelect(fuzzyMatch);
      } else {
        console.log('🔍 No match found, searching by name:', patientName);
        handleDirectPatientSelect(patientName);
      }
    }
  };

  useEffect(() => {
    window.directSelectPatient = (name) => {
      console.log('🌐 window.directSelectPatient called with:', name);
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
        const fetchResponse = await fetch(`${API_URL}/api/patients/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (fetchResponse.ok) {
          const data = await fetchResponse.json();
          const names = data.patients.map(p => p.name);
          setAllPatientNames(names);
        }
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

  // ✅ FIXED: Using the WORKING chat endpoint with NO duplicate messages
  const handleSaveSoapNote = async () => {
    if (!currentPatient) {
      alert('Please select a patient first');
      return;
    }
    
    if (!soapNote.subjective.trim() || !soapNote.objective.trim() || !soapNote.assessment.trim() || !soapNote.plan.trim()) {
      alert('Please fill in all SOAP note fields');
      return;
    }
    
    const soapMessage = `Generate SOAP note for ${currentPatient.name} with:
Subjective: ${soapNote.subjective}
Objective: ${soapNote.objective}
Assessment: ${soapNote.assessment}
Plan: ${soapNote.plan}`;
    
    try {
      const response = await fetch(`${API_URL}/api/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: soapMessage, session_id: 'web_' + Date.now() })
      });
      
      const data = await response.json();
      console.log('📥 Response:', data);
      
      if (data.reply) {
        // ✅ Show ONLY ONE message - the SOAP note result
        const formattedMessage = formatMessage(data.reply);
        setMessages(prev => [...prev, { 
          id: (Date.now()+1).toString(), 
          text: formattedMessage, 
          isUser: false, 
          timestamp: new Date() 
        }]);
        
        // ✅ Clear the form
        setSoapNote({ subjective: '', objective: '', assessment: '', plan: '' });
        
        alert(`✅ SOAP note saved for ${currentPatient.name}!`);
        
        // ✅ Update the patient data WITHOUT adding a new message
        const refreshResponse = await fetch(`${API_URL}/api/chat/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ 
            message: `Show me ${currentPatient.name}`, 
            session_id: 'silent_refresh_' + Date.now() 
          })
        });
        const refreshData = await refreshResponse.json();
        if (refreshData.patient) {
          // ✅ Update patient state silently (no new message)
          setCurrentPatient(refreshData.patient);
          // ✅ Update patient cache silently
          setPatientCache(prev => ({
            ...prev,
            [refreshData.patient.name]: refreshData.patient.mrn || refreshData.patient.id
          }));
        }
      } else {
        alert('Error: No response from server');
      }
    } catch (error) {
      console.error('❌ Error:', error);
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