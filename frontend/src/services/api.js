const API_URL = process.env.REACT_APP_API_URL || 'https://mediagent-pn7o.onrender.com';

export const api = {
  // ===== AUTH =====
  async login(email, password) {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Login failed');
    return data;
  },

  // ===== PATIENTS =====
  async getPatients(token) {
    const response = await fetch(`${API_URL}/api/patients/`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Failed to fetch patients');
    return data;
  },

  async addPatient(token, patientData) {
    const response = await fetch(`${API_URL}/api/patients/`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(patientData)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Failed to add patient');
    return data;
  },

  // ===== CHAT =====
  async sendChatMessage(token, message, sessionId) {
    const response = await fetch(`${API_URL}/api/chat/`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ 
        message, 
        session_id: sessionId || 'web_' + Date.now() 
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Chat failed');
    return data;
  },

  // ===== APPOINTMENTS =====
  async getAppointments(token) {
    const response = await fetch(`${API_URL}/api/appointments/`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Failed to fetch appointments');
    return data;
  },

  // ===== PRESCRIPTIONS =====
  async generatePrescription(token, prescriptionData) {
    const response = await fetch(`${API_URL}/api/prescriptions/`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(prescriptionData)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Failed to generate prescription');
    return data;
  },

  // ===== IMAGING =====
  async uploadAndAnalyzeImage(token, patientId, file, imageType) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('image_type', imageType);
    formData.append('analyze', 'true');

    const response = await fetch(
      `${API_URL}/api/images/upload/${patientId}?analyze=true&image_type=${imageType}`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      }
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Image upload failed');
    return data;
  },

  async analyzePatient(token, patientId) {
    const response = await fetch(`${API_URL}/api/analyze/full/${patientId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Analysis failed');
    return data;
  }
};

export default api;
