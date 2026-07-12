import { useState } from 'react';
import { api } from '../../../services/api';

export const usePrescription = (token, currentPatient, handleDirectPatientSelect) => {
  const [prescription, setPrescription] = useState({
    medication: '',
    dosage: '',
    frequency: 'Once daily',
    duration: '7 days',
    instructions: ''
  });
  const [generating, setGenerating] = useState(false);

  const handleGeneratePrescription = async () => {
    if (!currentPatient) {
      alert('Please select a patient first');
      return;
    }

    if (!prescription.medication) {
      alert('Please enter medication name');
      return;
    }

    setGenerating(true);

    try {
      const prescriptionData = {
        patient_id: currentPatient.id,
        medication: prescription.medication,
        dosage: prescription.dosage,
        frequency: prescription.frequency,
        duration: prescription.duration,
        instructions: prescription.instructions || `Take ${prescription.dosage} ${prescription.frequency} for ${prescription.duration}`
      };

      await api.generatePrescription(token, prescriptionData);
      
      alert(`✅ Prescription generated for ${currentPatient.name}!`);
      setPrescription({ 
        medication: '', 
        dosage: '', 
        frequency: 'Once daily', 
        duration: '7 days', 
        instructions: '' 
      });
      
      // Refresh patient data
      if (handleDirectPatientSelect) {
        handleDirectPatientSelect(currentPatient.name);
      }
    } catch (error) {
      alert('Error generating prescription: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  return {
    prescription,
    setPrescription,
    generating,
    handleGeneratePrescription
  };
};

export default usePrescription;
