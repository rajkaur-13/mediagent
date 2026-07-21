import { useState, useRef, useCallback } from 'react';
import { api } from '../../../services/api';

export const useChat = (token, setMessages) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

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
      
      // ✅ FIX: ALWAYS add as a new message (NOT replace)
      setMessages(prev => [...prev, { 
        id: (Date.now()+1).toString(), 
        text: data.reply,  // Raw text from backend
        isUser: false, 
        timestamp: new Date() 
      }]);
      
      setLoading(false);
      return data;
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        id: (Date.now()+1).toString(), 
        text: '❌ Error: ' + error.message, 
        isUser: false, 
        timestamp: new Date() 
      }]);
      setLoading(false);
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
    scrollToBottom
  };
};

export default useChat;