// Utility to format all messages consistently

export const formatMessage = (text, isUser = false) => {
  if (isUser) {
    // User messages - just escape and return
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // AI messages - apply all formatting
  let formatted = text;
  
  // 1. Convert markdown bold **text** to <strong>text</strong>
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // 2. Convert bullet points - ensure each on new line
  // Replace ● or • followed by content with bullet on new line
  formatted = formatted.replace(/[●•]\s*([^●•\n]+)/g, '<br/>• $1');
  
  // 3. Fix patient list formatting - ensure line breaks before each patient
  formatted = formatted.replace(/([A-Z][a-z]+)\s+([A-Z][a-z]+)\s*\(MRN:/g, '<br/>• $1 $2 (MRN:');
  
  // 4. Clean up multiple line breaks
  formatted = formatted.replace(/(<br\/>\s*){3,}/g, '<br/><br/>');
  
  // 5. Convert single newlines to <br/> (but don't double up)
  formatted = formatted.replace(/\n/g, '<br/>');
  
  // 6. Make patient names clickable
  const patientNames = [
    'Sarah Johnson', 'Michael Chen', 'Emily Rodriguez', 
    'James Williams', 'Maria Garcia', 'Robert', 'robert'
  ];
  
  patientNames.forEach(name => {
    const regex = new RegExp(`\\b(${name})\\b`, 'gi');
    formatted = formatted.replace(regex, (match) => {
      return `<span class="patient-name-link" onclick="window.directSelectPatient('${match}')">${match}</span>`;
    });
  });
  
  return formatted;
};
