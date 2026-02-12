import React, { useEffect, useState } from 'react';
import { getHistory } from '../services/api';

interface AnalysisHistoryProps {
  onSelectAnalysis: (analysisId: string) => void;
}

const AnalysisHistory: React.FC<AnalysisHistoryProps> = ({ onSelectAnalysis }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetchHistory = async () => {
      try {
        const data = await getHistory();
        setHistory(data);
      } catch (error) {
        console.error('Failed to fetch history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="history-container">
        <div className="loading">
          <div className="spinner"></div>
          <h3>Loading history...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="history-container">
      <h2 style={{ color: '#1a202c', marginBottom: '1.5rem', fontSize: '1.8rem' }}>
        Analysis History
      </h2>

      {history.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#718096', fontSize: '1rem', padding: '2rem' }}>
          No analyses yet. Upload an image to get started!
        </p>
      ) : (
        <div className="history-grid">
          {history.map((item) => (
            <div
              key={item.analysisId}
              className="history-card"
              onClick={() => {
                onSelectAnalysis(item.analysisId);
              }}
            >
              <h4 style={{ color: '#2d3748', marginBottom: '0.5rem' }}>
                {item.filename || 'Image Analysis'}
              </h4>
              <p style={{ fontSize: '0.9rem', color: '#718096' }}>
                {new Date(Number(item.timestamp)).toLocaleString()}
              </p>
              <p style={{ fontSize: '0.85rem', color: '#a0aec0', marginTop: '0.5rem' }}>
                Status: {item.status}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnalysisHistory;
