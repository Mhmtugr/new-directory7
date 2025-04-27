<template>
  <div class="ai-chatbot-button-container">
    <button 
      @click="toggleChatModal" 
      :class="['ai-chatbot-button', { 'has-notification': hasNotification }]"
      :aria-label="$t('ai.openChatbot')"
    >
      <div class="button-inner">
        <div class="icon-container">
          <span class="icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-6h2v2h-2zm0-8h2v6h-2z" />
            </svg>
          </span>
        </div>
        <span class="text">{{ $t('ai.assistant') }}</span>
        <span v-if="hasNotification" class="notification-dot" aria-hidden="true"></span>
      </div>
    </button>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useTechnicalStore } from '@/store/technical'; // Import Pinia store
import { aiService } from '@/services/ai-service'; // Correct named import

export default {
  name: 'AIChatbotButton',
  
  setup() {
    const technicalStore = useTechnicalStore(); // Use Pinia store
    const hasNotification = computed(() => aiService.hasNewSuggestion.value);
    const isModalOpen = computed(() => technicalStore.isAIChatModalOpen); // Use Pinia getter
    
    // AI Chatbot modalını aç/kapat
    const toggleChatModal = () => {
      technicalStore.toggleAIChatModal(); // Call Pinia action
      
      // Eğer modal açıldıysa bildirimleri okundu olarak işaretle
      if (isModalOpen.value) { 
        aiService.clearSuggestions(); // Use clearSuggestions instead
      }
    };
    
    // AI servisini başlat
    onMounted(async () => {
      try {
        if (!aiService.isConnected.value) {
          await aiService.initialize(); // Use initialize instead
        }
      } catch (error) {
        console.error('AI servisi başlatılamadı:', error);
      }
    });
    
    return {
      hasNotification,
      toggleChatModal
    };
  }
};
</script>

<style lang="scss" scoped>
@use "@/styles/base/variables" as vars;

.ai-chatbot-button-container {
  position: fixed;
  right: 2rem;
  bottom: 2rem;
  z-index: 999;
  
  .ai-chatbot-button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem 1.25rem;
    border-radius: 100px;
    border: none;
    background: linear-gradient(135deg, #3a75c4, #6764bc);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    color: white;
    cursor: pointer;
    transition: all 0.3s ease;
    outline: none;
    
    &:hover, &:focus {
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      transform: translateY(-2px);
    }
    
    &:active {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      transform: translateY(1px);
    }
    
    &.has-notification {
      animation: pulse 2s infinite;
    }
    
    .button-inner {
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    
    .icon-container {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 0.5rem;
      
      .icon {
        display: inline-block;
        width: 1.25rem;
        height: 1.25rem;
      }
    }
    
    .text {
      font-size: 0.9rem;
      font-weight: 500;
    }
    
    .notification-dot {
      position: absolute;
      top: -8px;
      right: -8px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background-color: #f44336;
    }
  }
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(58, 117, 196, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(58, 117, 196, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(58, 117, 196, 0);
  }
}
</style>