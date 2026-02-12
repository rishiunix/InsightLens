import React, { useState } from 'react';
import './App.css';
import ImageUploader from './components/ImageUploader';
import AnalysisResults from './components/AnalysisResults';
import AnalysisHistory from './components/AnalysisHistory';
import { submitFeedback } from './services/api';

type AnalysisMode = 'general' | 'food';

const App: React.FC = () => {
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('food');
  const [refreshHistory, setRefreshHistory] = useState(0);

  const handleAnalysisStart = (analysisId: string) => {
    setCurrentAnalysisId(analysisId);
    setRefreshHistory(prev => prev + 1);
  };

  const handleSelectFromHistory = (analysisId: string) => {
    setCurrentAnalysisId(analysisId);
    setActiveTab('upload');
  };

  const handleTabChange = (tab: 'upload' | 'history') => {
    setActiveTab(tab);
    if (tab === 'history') {
      setRefreshHistory(prev => prev + 1);
    }
  };

  const handleModeChange = (mode: AnalysisMode) => {
    setAnalysisMode(mode);
    setCurrentAnalysisId(null);
  };

  const handleFeedbackSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const feedback = (form.elements.namedItem('feedback') as HTMLTextAreaElement).value;
    
    try {
      await submitFeedback(feedback);
      alert('Thank you! Your feedback has been submitted.');
      form.reset();
    } catch (error) {
      console.error('Feedback error:', error);
      alert('Failed to submit feedback. Please try again.');
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1 className="logo">
            <img src="/logo.png" alt="InsightLens" style={{ height: '50px', marginRight: '10px' }} />
            InsightLens
          </h1>
          <p className="tagline">AI-Powered Multi-Modal Image Analysis</p>
        </div>
      </header>

      <nav className="nav-tabs">
        <button
          className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => handleTabChange('upload')}
        >
          Upload & Analyze
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => handleTabChange('history')}
        >
          History
        </button>
      </nav>

      <main className="main-content">
        {activeTab === 'upload' ? (
          <div className="upload-section">
            <div className="mode-selector">
              <button
                className={`mode-button ${analysisMode === 'food' ? 'active' : ''}`}
                onClick={() => handleModeChange('food')}
              >
                Food Analysis
              </button>
              <button
                className={`mode-button ${analysisMode === 'general' ? 'active' : ''}`}
                onClick={() => handleModeChange('general')}
              >
                General Image Analysis
              </button>
            </div>
            
            <div style={{ textAlign: 'center', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(72, 187, 120, 0.1)', borderRadius: '8px', border: '1px solid rgba(72, 187, 120, 0.3)' }}>
              <p style={{ color: '#68d391', fontSize: '1rem', fontWeight: '600', margin: 0 }}>
                {analysisMode === 'food' 
                  ? 'Upload food, meals, snacks, or beverages only' 
                  : 'Upload any general images (landscapes, objects, people, etc.)'}
              </p>
            </div>

            <div className="info-banner">
              <h3>{analysisMode === 'food' ? 'Food Analysis Guidelines' : 'Usage Guidelines'}</h3>
              <ul>
                {analysisMode === 'food' ? (
                  <>
                    <li>Upload clear photos of food, meals, or dishes</li>
                    <li>Get instant nutrition analysis, calorie estimates, and macro breakdown</li>
                    <li>Receive health scores and healthier alternatives</li>
                    <li>Works with restaurant meals, home-cooked food, and packaged items</li>
                  </>
                ) : (
                  <>
                    <li>Upload appropriate, non-offensive images only</li>
                    <li>Do not upload images containing sensitive personal information</li>
                    <li>Respect copyright and intellectual property rights</li>
                    <li>AI analysis is for informational purposes - verify critical information</li>
                  </>
                )}
              </ul>
            </div>
            {!currentAnalysisId && <ImageUploader onAnalysisStart={handleAnalysisStart} mode={analysisMode} />}
            {currentAnalysisId && <AnalysisResults analysisId={currentAnalysisId} mode={analysisMode} />}
          </div>
        ) : (
          <AnalysisHistory onSelectAnalysis={handleSelectFromHistory} key={refreshHistory} />
        )}
      </main>

      <footer className="footer">
        <div className="footer-content">
          <p>Powered by AWS Bedrock Claude 3 • Rekognition • Textract • Step Functions</p>
          
          <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', maxWidth: '600px', margin: '1.5rem auto 0' }}>
            <h4 style={{ color: '#90cdf4', marginBottom: '1rem', fontSize: '1rem' }}>Send Feedback</h4>
            <form onSubmit={handleFeedbackSubmit}>
              <textarea
                name="feedback"
                placeholder="Share your thoughts, suggestions, or report issues..."
                required
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #4a5568',
                  background: '#2d3748',
                  color: '#e2e8f0',
                  fontSize: '0.9rem',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
              <button
                type="submit"
                style={{
                  marginTop: '0.75rem',
                  padding: '0.6rem 1.5rem',
                  background: 'linear-gradient(135deg, #3182ce 0%, #2c5282 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Submit Feedback
              </button>
            </form>
          </div>
          
          <p className="disclaimer">Use Responsibly • No Obscene Content • Educational Purpose Only</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
