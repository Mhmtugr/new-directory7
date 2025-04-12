import { createContext, useState } from 'react';
import axios from 'axios';

export const AIContext = createContext();

export const AIProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const askAI = async (query) => {
    try {
      setLoading(true);
      
      // Add user message to chat history
      const userMessage = { role: 'user', content: query, timestamp: new Date().toISOString() };
      setChatHistory(prev => [...prev, userMessage]);
      
      // Call the AI API with the query and context
      const response = await axios.post('/api/ai/assistant', { 
        query,
        chatHistory: chatHistory.slice(-10) // Send last 10 messages for context
      });
      
      // Add AI response to chat history
      const aiMessage = { 
        role: 'assistant', 
        content: response.data.response, 
        timestamp: new Date().toISOString(),
        data: response.data.data || null // Optional structured data
      };
      
      setChatHistory(prev => [...prev, aiMessage]);
      setAiResponse(response.data);
      
      return response.data;
    } catch (error) {
      console.error('AI Assistant error:', error);
      const errorMessage = { 
        role: 'assistant', 
        content: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.', 
        timestamp: new Date().toISOString(),
        error: true
      };
      setChatHistory(prev => [...prev, errorMessage]);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (reportType, params) => {
    try {
      setLoading(true);
      const response = await axios.post('/api/ai/generate-report', { reportType, params });
      return response.data;
    } catch (error) {
      console.error('Report generation error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const predictProblems = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/ai/predict-problems');
      return response.data;
    } catch (error) {
      console.error('Problem prediction error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const toggleChat = () => {
    setIsChatOpen(prev => !prev);
  };

  const clearChatHistory = () => {
    setChatHistory([]);
  };

  return (
    <AIContext.Provider value={{ 
      loading, 
      aiResponse, 
      chatHistory,
      isChatOpen,
      askAI, 
      generateReport,
      predictProblems,
      toggleChat,
      clearChatHistory
    }}>
      {children}
    </AIContext.Provider>
  );
};
