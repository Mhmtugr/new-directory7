/**
 * technical.js
 * Teknik doküman ve sorgulamalar için Pinia store
 */

import { defineStore } from 'pinia';
import { useTechnicalService } from '@/modules/technical';
import { apiService } from '@/services/api-service';

export const useTechnicalStore = defineStore('technical', {
  state: () => ({
    documents: [],
    loading: false,
    searchQuery: '',
    aiResponse: null,
    queryLoading: false,
    aiActivities: [],
    aiSessionActive: false,
    isAIChatModalOpen: false,
    aiStatus: { connected: false, mode: 'normal' },
    chatHistory: [], 
    aiLearningProgress: { total: 0, processed: 0, percentage: 0 }
  }),

  getters: {
    filteredDocuments: (state) => {
      if (!state.searchQuery) return state.documents;
      
      const query = state.searchQuery.toLowerCase().trim();
      return state.documents.filter(doc => 
        doc.name?.toLowerCase().includes(query) || 
        doc.department?.toLowerCase().includes(query) || 
        doc.author?.toLowerCase().includes(query)
      );
    },
    
    documentById: (state) => (id) => {
      return state.documents.find(doc => doc.id === id);
    },
    
    getAIActivities: (state) => state.aiActivities,
    isAISessionActive: (state) => state.aiSessionActive,
    getIsAIChatModalOpen: (state) => state.isAIChatModalOpen,
    getChatHistory: (state) => state.chatHistory,
    getAIStatus: (state) => state.aiStatus,
    getAILearningProgress: (state) => state.aiLearningProgress
  },

  actions: {
    /**
     * Tüm teknik dokümanları yükle
     */
    async fetchDocuments() {
      this.loading = true;
      try {
        const technicalService = useTechnicalService();
        this.documents = await technicalService.getDocuments();
      } catch (error) {
        console.error('Dokümanlar yüklenemedi:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Doküman yükle
     * @param {Object} document Yüklenecek doküman 
     */
    async uploadDocument(document) {
      try {
        const technicalService = useTechnicalService();
        const uploadedDocument = await technicalService.uploadDocument(document);
        
        // Aynı ID'ye sahip dokümanı güncelle veya yeni doküman ekle
        const index = this.documents.findIndex(d => d.id === uploadedDocument.id);
        if (index !== -1) {
          this.documents.splice(index, 1, uploadedDocument);
        } else {
          this.documents.unshift(uploadedDocument); // Yeni dokümanları başta göster
        }
        
        return uploadedDocument;
      } catch (error) {
        console.error('Doküman yüklenemedi:', error);
        throw error;
      }
    },
    
    /**
     * Arama sorgusu güncelle
     * @param {string} query Arama sorgusu
     */
    updateSearchQuery(query) {
      this.searchQuery = query;
    },
    
    /**
     * Teknik sorgu yap
     * @param {string} query Teknik sorgu
     */
    async submitTechnicalQuery(query) {
      this.queryLoading = true;
      this.aiResponse = null;
      
      try {
        const technicalService = useTechnicalService();
        const response = await technicalService.submitQuery(query);
        this.aiResponse = response;
        return response;
      } catch (error) {
        console.error('Sorgu yapılamadı:', error);
        throw error;
      } finally {
        this.queryLoading = false;
      }
    },
    
    /**
     * AI aktivitesi kaydetme
     * @param {Object} activity AI aktivitesi
     */
    logAIActivity(activity) {
      this.aiActivities.push(activity);
      
      // Gerçek bir uygulamada, bu aktivite backend'e de kaydedilebilir
      // apiService.post('/ai/activity', activity);
      
      return activity;
    },
    
    /**
     * AI oturumunu başlatma
     */
    startAISession() {
      this.aiSessionActive = true;
      
      // Gerçek bir uygulamada, backend'e session başlatma bilgisi gönderebilirsiniz
      // apiService.post('/ai/session/start');
    },
    
    /**
     * AI oturumunu sonlandırma
     */
    endAISession() {
      this.aiSessionActive = false;
      
      // Gerçek bir uygulamada, backend'e session kapama bilgisi gönderebilirsiniz
      // apiService.post('/ai/session/end');
    },

    /**
     * AI Chat modalını aç/kapat
     */
    toggleAIChatModal() {
      this.isAIChatModalOpen = !this.isAIChatModalOpen;
    },

    /**
     * AI durumunu güncelle
     * @param {object} status - Yeni durum { connected, mode }
     */
    setAIStatus(status) {
      this.aiStatus = { ...this.aiStatus, ...status };
    },

    /**
     * Kullanıcı mesajını sohbet geçmişine ekle
     * @param {object} message - Mesaj objesi { text, timestamp }
     */
    addUserMessage(message) {
      this.chatHistory.push({ ...message, sender: 'user', id: Date.now() });
    },

    /**
     * AI yanıtını sohbet geçmişine ekle
     * @param {object} response - Yanıt objesi { text, timestamp, suggestions?, ... }
     */
    addAIResponse(response) {
      this.chatHistory.push({ ...response, sender: 'ai', id: Date.now() });
    },

    /**
     * Sohbet geçmişini temizle
     */
    clearChatHistory() {
      this.chatHistory = [];
    },

    /**
     * AI öğrenme ilerlemesini güncelle
     * @param {object} progress - İlerleme objesi { total, processed, percentage }
     */
    updateAILearningProgress(progress) {
      this.aiLearningProgress = progress;
    }
  }
});