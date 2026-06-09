import React, { useState } from 'react';

function XRayAnalyzer({ patientId, token, onAnalysisComplete }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageType, setImageType] = useState('chest_xray');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  const imageTypes = [
    { value: 'chest_xray', label: '🩻 Chest X-Ray', icon: '🫁' },
    { value: 'ct_scan', label: '🧠 CT Scan', icon: '📊' },
    { value: 'mri', label: '🧬 MRI', icon: '🔬' },
    { value: 'ecg', label: '❤️ ECG', icon: '📈' },
    { value: 'retinal', label: '👁️ Retinal Scan', icon: '👁️' }
  ];

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setAnalysis(null);
    }
  };

  const handleAnalyzeAndSave = async () => {
    if (!selectedFile) {
      alert('Please select an image first');
      return;
    }

    if (!patientId) {
      alert('Please select a patient first');
      return;
    }

    setAnalyzing(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('image_type', imageType);
    formData.append('analyze', 'true');

    try {
      // Upload and analyze in one call
      const response = await fetch(`http://localhost:8000/api/images/upload/${patientId}?analyze=true&image_type=${imageType}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      
      if (response.ok) {
        setAnalysis(data.analysis);
        setSaving(false);
        alert('✅ Image analyzed and saved to patient record!');
        
        if (onAnalysisComplete) {
          onAnalysisComplete(data);
        }
      } else {
        alert('Analysis failed: ' + (data.detail || 'Unknown error'));
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="xray-analyzer">
      <div className="image-type-selector">
        <label>📋 Select Image Type:</label>
        <select value={imageType} onChange={(e) => setImageType(e.target.value)}>
          {imageTypes.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>

      <div className="upload-area" onClick={() => document.getElementById('fileInput').click()}>
        <input
          id="fileInput"
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        {preview ? (
          <img src={preview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' }} />
        ) : (
          <>
            <span>🩻</span>
            <p>Click to upload medical image</p>
            <small>Supports: X-ray, CT, MRI, ECG, Retinal scans</small>
          </>
        )}
      </div>

      {selectedFile && !analysis && (
        <button onClick={handleAnalyzeAndSave} disabled={analyzing} className="analyze-btn">
          {analyzing ? '🔍 Analyzing and Saving...' : '🔬 Analyze & Save to Patient'}
        </button>
      )}

      {analysis && (
        <div className="analysis-result">
          <h4>📊 Analysis Result</h4>
          <div className="finding">{analysis.findings}</div>
          <div className="confidence">
            Confidence: {(analysis.confidence * 100).toFixed(1)}%
          </div>
          <div className="recommendation">
            💡 {analysis.recommendation}
          </div>
          {analysis.need_followup && (
            <div className="followup-warning">⚠️ Follow-up recommended</div>
          )}
          <div className="saved-note">✅ Saved to patient record</div>
        </div>
      )}
    </div>
  );
}

export default XRayAnalyzer;
