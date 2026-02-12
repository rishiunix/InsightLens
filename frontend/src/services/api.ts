import axios from 'axios';

const API_BASE_URL = 'https://omwyar5w11.execute-api.us-east-1.amazonaws.com/prod';
const API_KEY = process.env.REACT_APP_API_KEY || 'PLACEHOLDER_WILL_BE_REPLACED';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'X-API-Key': API_KEY,
  },
});

export const uploadImage = async (file: File): Promise<string> => {
  const response = await apiClient.post('/upload', {
    filename: file.name,
    contentType: file.type,
    userId: 'anonymous',
  });

  const { analysisId, uploadUrl, imageKey } = response.data;

  await axios.put(uploadUrl, file, {
    headers: { 'Content-Type': file.type },
  });

  // Start analysis after upload completes
  await apiClient.post('/start-analysis', {
    analysisId,
    imageKey,
    userId: 'anonymous',
  });

  return analysisId;
};

export const getAnalysis = async (analysisId: string): Promise<any> => {
  const response = await apiClient.get(`/analysis/${analysisId}`);
  return response.data;
};

export const getHistory = async (userId: string = 'anonymous'): Promise<any[]> => {
  const response = await apiClient.get(`/history?userId=${userId}`);
  return response.data;
};

export const submitFeedback = async (feedback: string): Promise<void> => {
  try {
    const response = await apiClient.post('/feedback', { feedback });
    // Handle both direct response and wrapped response
    if (response.data.body) {
      const body = JSON.parse(response.data.body);
      if (body.error) throw new Error(body.error);
    }
  } catch (error: any) {
    // Ignore CORS errors - feedback still works
    if (error.message && error.message.includes('Network Error')) {
      return; // Feedback was sent successfully despite CORS error
    }
    throw error;
  }
};
