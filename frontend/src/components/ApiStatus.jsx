import { useState, useEffect } from 'react';

const ApiStatus = () => {
  const [status, setStatus] = useState('checking...');
  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

  useEffect(() => {
    const checkApi = async () => {
      try {
        const response = await fetch(`${apiUrl}/health`);
        if (response.ok) {
          setStatus('✅ Connected');
        } else {
          setStatus(`❌ Error: ${response.status}`);
        }
      } catch (error) {
        setStatus(`❌ Failed: ${error.message}`);
      }
    };
    checkApi();
  }, [apiUrl]);

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '10px', 
      right: '10px', 
      padding: '10px', 
      background: '#f0f0f0',
      border: '1px solid #ccc',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999
    }}>
      <div><strong>API URL:</strong> {apiUrl}</div>
      <div><strong>Status:</strong> {status}</div>
    </div>
  );
};

export default ApiStatus;
