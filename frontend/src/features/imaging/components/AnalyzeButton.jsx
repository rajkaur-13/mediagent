import React, { useState } from 'react';
import { api } from '../../../services/api';

const AnalyzeButton = ({ patientId, token, onAnalysisComplete }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!patientId) {
      alert('Please select a patient first');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await api.analyzePatient(token, patientId);
      
      // Send analysis to chat panel via callback
      if (onAnalysisComplete) {
        onAnalysisComplete(result);
      }
      
      setIsAnalyzing(false);
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Analysis failed: ' + error.message);
      setIsAnalyzing(false);
    }
  };

  return (
    <button 
      className="analyze-btn-premium"
      onClick={handleAnalyze}
      disabled={isAnalyzing}
    >
      {isAnalyzing ? (
        <>
          <span className="analyze-spinner"></span>
          Analyzing...
        </>
      ) : (
        <>
          <span className="analyze-icon">✨</span>
          Analyze & Recommend
        </>
      )}
    </button>
  );
};

export default AnalyzeButton;