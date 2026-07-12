import { useState, useRef, useCallback } from 'react';
import { api } from '../../../services/api';

export const useChat = (token, setMessages) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const formatMessage = (text) => {
    if (!text) return '';
    
    let formatted = text;
    
    formatted = formatted.replace(/\n/g, '<br/>');
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Patient name linking
    const patientNameMatches = text.matchAll(/(?:Patient Selected:|✅ Patient Selected:)\s*([^\n<]+)/g);
    const patientNames = [];
    
    for (const match of patientNameMatches) {
      const name = match[1].trim();
      if (!patientNames.includes(name) && name.length > 0) {
        patientNames.push(name);
      }
    }
    
    const listMatches = text.matchAll(/•\s*([^\n(]+?)(?:\s*\(|$)/g);
    for (const match of listMatches) {
      const name = match[1].trim();
      if (!patientNames.includes(name) && name.length > 0) {
        patientNames.push(name);
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = useCallback(async (input, token, currentPatient, setCurrentPatient, setPatientCache, setAllPatientNames, allPatientNames) => {
    if (!input.trim() || !token) return;

    const userMessage = { 
      id: Date.now().toString(), 
      text: input, 
      isUser: true, 
      timestamp: new Date() 
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const data = await api.sendChatMessage(token, input);
      
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
      setMessages(prev => [...prev, { 
        id: (Date.now()+1).toString(), 
        text: formattedMessage, 
        isUser: false, 
        timestamp: new Date() 
      }]);
      
      setLoading(false);  // ✅ Move this here
      return data;
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        id: (Date.now()+1).toString(), 
        text: '❌ Error: ' + error.message, 
        isUser: false, 
        timestamp: new Date() 
      }]);
      setLoading(false);  // ✅ Also keep here for errors
    }
  }, []);

  const handleKeyPress = (e) => { 
    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault(); 
      sendMessage(); 
    } 
  };

  return {
    input,
    setInput,
    loading,
    setLoading,
    messagesEndRef,
    sendMessage,
    handleKeyPress,
    scrollToBottom,
    formatMessage
  };
};

export default useChat;
