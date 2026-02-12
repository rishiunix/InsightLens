import React, { useEffect, useState } from 'react';
import { getAnalysis } from '../services/api';

interface AnalysisResultsProps {
  analysisId: string;
  mode: 'general' | 'food';
}

const AnalysisResults: React.FC<AnalysisResultsProps> = ({ analysisId, mode }) => {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { icon: '1', title: 'Uploading', desc: 'Sending image to cloud storage' },
    { icon: '2', title: 'AI Analysis', desc: 'Processing with Bedrock & Rekognition' },
    { icon: '3', title: 'Text Extraction', desc: 'Extracting text with Textract' },
    { icon: '4', title: 'Aggregating', desc: 'Combining all results' },
    { icon: '5', title: 'Complete', desc: 'Analysis ready!' },
  ];

  useEffect(() => {
    setResults(null);
    setLoading(true);
    setCurrentStep(0);
    
    let stepInterval: NodeJS.Timeout;
    let pollTimeout: NodeJS.Timeout;
    let isMounted = true;
    
    const pollResults = async () => {
      if (!isMounted) return;
      
      try {
        const data = await getAnalysis(analysisId);
        if (!isMounted) return;
        
        if (data.status === 'completed' && data.results) {
          setResults(data.results);
          setCurrentStep(4);
          setLoading(false);
          if (stepInterval) clearInterval(stepInterval);
        } else {
          pollTimeout = setTimeout(pollResults, 3000);
        }
      } catch (error) {
        console.error('Failed to fetch results:', error);
        if (isMounted) {
          pollTimeout = setTimeout(pollResults, 3000);
        }
      }
    };

    stepInterval = setInterval(() => {
      if (isMounted) {
        setCurrentStep(prev => (prev < 3 ? prev + 1 : prev));
      }
    }, 4000);

    pollResults();

    return () => {
      isMounted = false;
      if (stepInterval) clearInterval(stepInterval);
      if (pollTimeout) clearTimeout(pollTimeout);
    };
  }, [analysisId]);

  if (loading) {
    return (
      <div className="results-container">
        <div className="loading">
          <div className="progress-container">
            <div className="spinner"></div>
            <h3>AI Analysis in Progress</h3>
            <p>Processing your image with multiple AI services</p>
            
            <div className="progress-steps">
              {steps.map((step, idx) => (
                <div 
                  key={idx} 
                  className={`progress-step ${
                    idx === currentStep ? 'active' : 
                    idx < currentStep ? 'completed' : ''
                  }`}
                >
                  <span className="step-icon" style={{
                    background: idx <= currentStep ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e2e8f0',
                    color: idx <= currentStep ? 'white' : '#a0aec0',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '1rem'
                  }}>{step.icon}</span>
                  <div className="step-text">
                    <div className="step-title">{step.title}</div>
                    <div className="step-desc">{step.desc}</div>
                  </div>
                  <span className="step-status" style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: '2px solid',
                    borderColor: idx < currentStep ? '#48bb78' : idx === currentStep ? '#667eea' : '#cbd5e0',
                    background: idx < currentStep ? '#48bb78' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}>
                    {idx < currentStep ? '✓' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { rekognition, bedrock, textract } = results;

  const handleNewUpload = () => {
    window.location.reload();
  };

  return (
    <div className="results-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#e2e8f0', fontSize: '1.8rem', margin: 0 }}>
          Analysis Complete
        </h2>
        <button onClick={handleNewUpload} className="upload-button" style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}>
          Analyze Another Image
        </button>
      </div>

      <div className="results-grid">
        {mode === 'food' && bedrock?.nutrition_analysis && !bedrock.nutrition_analysis.includes('Not a food image') && (
          <div className="result-card" style={{ gridColumn: '1 / -1', background: 'linear-gradient(135deg, #2d3748 0%, #1a4d2e 100%)', borderColor: '#48bb78' }}>
            <h3 style={{ color: '#68d391' }}>Nutrition Analysis</h3>
            <p style={{ whiteSpace: 'pre-line' }}>{bedrock.nutrition_analysis}</p>
          </div>
        )}

        {mode === 'general' && bedrock?.detailed_description && (
          <div className="result-card">
            <h3>Creative Description</h3>
            <p>{bedrock.detailed_description}</p>
          </div>
        )}

        {mode === 'general' && bedrock?.scene_understanding && (
          <div className="result-card">
            <h3>Scene Analysis</h3>
            <p>{bedrock.scene_understanding}</p>
          </div>
        )}

        {rekognition?.labels && rekognition.labels.length > 0 && (
          <div className="result-card">
            <h3>Detected Objects</h3>
            <div className="labels-list">
              {rekognition.labels.slice(0, 10).map((label: any, idx: number) => (
                <span key={idx} className="label-tag">
                  {label.Name} ({Math.round(label.Confidence)}%)
                </span>
              ))}
            </div>
          </div>
        )}

        {rekognition?.textDetections && rekognition.textDetections.length > 0 && (
          <div className="result-card">
            <h3>Text Detected</h3>
            <div className="labels-list">
              {rekognition.textDetections
                .filter((t: any) => t.Type === 'LINE' && t.Confidence > 50)
                .map((text: any, idx: number) => (
                  <span key={idx} className="label-tag">
                    {text.DetectedText}
                  </span>
                ))}
            </div>
            {rekognition.textDetections.filter((t: any) => t.Type === 'LINE' && t.Confidence > 50).length === 0 && (
              <p style={{ fontSize: '0.9rem', color: '#718096' }}>Low confidence text detected (likely false positive)</p>
            )}
          </div>
        )}

        {rekognition?.faces && rekognition.faces.length > 0 && (
          <div className="result-card">
            <h3>Face Analysis</h3>
            <p>Detected {rekognition.faces.length} face(s)</p>
            {rekognition.faces[0].Emotions && (
              <div className="labels-list">
                {rekognition.faces[0].Emotions.slice(0, 3).map((emotion: any, idx: number) => (
                  <span key={idx} className="label-tag">
                    {emotion.Type} ({Math.round(emotion.Confidence)}%)
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {bedrock?.safety_analysis && (
          <div className="result-card">
            <h3>Safety Check</h3>
            <p>{bedrock.safety_analysis}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisResults;
