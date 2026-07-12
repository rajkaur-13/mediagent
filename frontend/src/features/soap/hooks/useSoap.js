import { useState } from 'react';
import { api } from '../../../services/api';

export const useSoap = (token, currentPatient, setMessages) => {
  const [soapNote, setSoapNote] = useState({ 
    subjective: '', 
    objective: '', 
    assessment: '', 
    plan: '' 
  });
  const [currentSoapNoteId, setCurrentSoapNoteId] = useState(null);
  const [savingSoap, setSavingSoap] = useState(false);

  const formatMessage = (text) => {
    if (!text) return '';
    let formatted = text.replace(/\n/g, '<br/>');
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return formatted;
  };

  const handleSaveSoapNote = async () => {
    if (!currentPatient) {
      alert('Please select a patient first');
      return;
    }
    
    if (!soapNote.subjective.trim() || !soapNote.objective.trim() || 
        !soapNote.assessment.trim() || !soapNote.plan.trim()) {
      alert('Please fill in all SOAP note fields');
      return;
    }
    
    setSavingSoap(true);
    
    const soapMessage = `Generate SOAP note for ${currentPatient.name} with:
Subjective: ${soapNote.subjective}
Objective: ${soapNote.objective}
Assessment: ${soapNote.assessment}
Plan: ${soapNote.plan}`;
    
    try {
      const data = await api.sendChatMessage(token, soapMessage, 'web_' + Date.now());
      
      console.log('📥 Response:', data);
      
      if (data.reply) {
        const formattedMessage = formatMessage(data.reply);
        setMessages(prev => [...prev, { 
          id: (Date.now()+1).toString(), 
          text: formattedMessage, 
          isUser: false, 
          timestamp: new Date() 
        }]);
        
        setSoapNote({ subjective: '', objective: '', assessment: '', plan: '' });
        alert(`✅ SOAP note saved for ${currentPatient.name}!`);
        
        // Refresh patient data silently
        try {
          const refreshData = await api.sendChatMessage(
            token, 
            `Show me ${currentPatient.name}`, 
            'silent_refresh_' + Date.now()
          );
          if (refreshData.patient) {
            // Patient data updated - parent component will handle this
            console.log('✅ Patient data refreshed');
          }
        } catch (refreshError) {
          console.error('Error refreshing patient:', refreshError);
        }
      } else {
        alert('Error: No response from server');
      }
    } catch (error) {
      console.error('❌ Error:', error);
      alert('Error saving SOAP note: ' + error.message);
    } finally {
      setSavingSoap(false);
    }
  };

  return {
    soapNote,
    setSoapNote,
    currentSoapNoteId,
    setCurrentSoapNoteId,
    savingSoap,
    handleSaveSoapNote
  };
};

export default useSoap;
