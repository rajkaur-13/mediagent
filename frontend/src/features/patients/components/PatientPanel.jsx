import React from 'react';

const PatientPanel = ({ 
  patients, 
  currentPatient, 
  setCurrentPatient, 
  loading,
  showAddPatient,
  setShowAddPatient,
  newPatient,
  setNewPatient,
  handleAddPatient
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredPatients = patients?.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.mrn?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="panel panel-patient">
      <div className="panel-header">📋 Patient Context</div>
      
      <div className="search-box">
        <input 
          type="text" 
          placeholder="🔍 Search patient by name or MRN..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
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
      </div>
    </div>
  );
};

export default PatientPanel;
