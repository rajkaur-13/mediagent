import React, { useState } from 'react';
const API_URL = 'https://mediagent-pn7o.onrender.com';

function AnalyzeButton({ patientId, token, onAnalysisComplete }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const handleAnalyze = async () => {
    if (!patientId) {
      alert('Please select a patient first');
      return;
    }

    setAnalyzing(true);
    
    try {
      const response = await fetch(`${API_URL}/api/analyze/full/${patientId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      setAnalysis(data);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(data);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Analysis failed: ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="analyze-container">
      <button 
        className="analyze-full-btn" 
        onClick={handleAnalyze} 
        disabled={analyzing || !patientId}
      >
        {analyzing ? '🔍 Analyzing with latest research...' : '🔬 Analyze & Recommend'}
      </button>
      
      {analysis && analysis.formatted_response && (
        <div className="analysis-full-result">
          <div dangerouslySetInnerHTML={{ __html: analysis.formatted_response.replace(/\n/g, '<br/>') }} />
        </div>
      )}
    </div>
  );
}

export default AnalyzeButton;
