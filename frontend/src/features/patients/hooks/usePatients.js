import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../services/api';

export const usePatients = (token, setMessages) => {
  const [currentPatient, setCurrentPatient] = useState(null);
  const [patientCache, setPatientCache] = useState({});
  const [patients, setPatients] = useState([]);
  const [allPatientNames, setAllPatientNames] = useState([]);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: '',
    age: '',
    gender: 'Male',
    phone: '',
    email: '',
    conditions: '',
    allergies: ''
  });

  // Fetch all patients on token change
  useEffect(() => {
    const fetchAllPatients = async () => {
      if (!token) return;
      try {
        console.log('📡 Fetching all patients...');
        const data = await api.getPatients(token);
        const nameMap = {};
        const names = [];
        const patientList = data.patients || [];
        setPatients(patientList);
        patientList.forEach(p => {
          nameMap[p.name] = p.mrn || p.id;
          names.push(p.name);
        });
        setPatientCache(nameMap);
        setAllPatientNames(names);
        console.log(`📋 Loaded ${names.length} patient names into cache:`, names);
      } catch (error) {
        console.error('❌ Failed to fetch patient names:', error);
      }
    };
    
    if (token) {
      fetchAllPatients();
    }
  }, [token]);

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
    
    try {
      console.log('📡 Sending request for:', patientName);
      const data = await api.sendChatMessage(token, `Show me ${patientName}`, 'direct_select_' + Date.now());
      
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
        
        const formatMessage = (text) => {
          if (!text) return '';
          let formatted = text.replace(/\n/g, '<br/>');
          formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          return formatted;
        };
        
        const formattedMessage = formatMessage(data.reply);
        setMessages(prev => [...prev, { 
          id: Date.now().toString(), 
          text: formattedMessage, 
          isUser: false, 
          timestamp: new Date() 
        }]);
      } else {
        console.log('❌ No patient found for:', patientName);
        const similarPatients = allPatientNames
          .filter(name => name.toLowerCase().includes(patientName.toLowerCase()))
          .slice(0, 5);
        
        let errorMsg = `❌ Patient "${patientName}" not found.`;
        if (similarPatients.length > 0) {
          errorMsg += ` Did you mean: ${similarPatients.join(', ')}?`;
        }
        setMessages(prev => [...prev, { 
          id: Date.now().toString(), 
          text: errorMsg, 
          isUser: false, 
          timestamp: new Date() 
        }]);
      }
    } catch (error) {
      console.error('❌ Failed to select patient:', error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        text: '❌ Error selecting patient. Please try again or search manually.', 
        isUser: false, 
        timestamp: new Date() 
      }]);
    }
  }, [token, allPatientNames, setMessages]);

  const handlePatientClick = useCallback((patientName) => {
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
  }, [allPatientNames, handleDirectPatientSelect]);

  const handleAddPatient = async () => {
    if (!newPatient.name) {
      alert('Please enter patient name');
      return;
    }

    try {
      const patientData = {
        name: newPatient.name,
        age: parseInt(newPatient.age) || 0,
        gender: newPatient.gender,
        phone: newPatient.phone,
        email: newPatient.email,
        conditions: newPatient.conditions ? newPatient.conditions.split(',').map(c => c.trim()) : [],
        allergies: newPatient.allergies ? newPatient.allergies.split(',').map(a => a.trim()) : []
      };

      await api.addPatient(token, patientData);
      
      alert(`Patient ${newPatient.name} added successfully!`);
      setShowAddPatient(false);
      setNewPatient({ name: '', age: '', gender: 'Male', phone: '', email: '', conditions: '', allergies: '' });
      
      // Refresh patient list
      const data = await api.getPatients(token);
      const names = data.patients.map(p => p.name);
      setAllPatientNames(names);
      
      handleDirectPatientSelect(newPatient.name);
    } catch (error) {
      alert('Error adding patient: ' + error.message);
    }
  };

  // Expose directSelectPatient to window for clickable names
  useEffect(() => {
    window.directSelectPatient = (name) => {
      console.log('🌐 window.directSelectPatient called with:', name);
      handleDirectPatientSelect(name);
    };
  }, [handleDirectPatientSelect]);

  return {
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
  };
};

export default usePatients;
