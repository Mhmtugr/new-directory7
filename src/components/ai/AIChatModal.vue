<template>
  <div class="ai-chat-modal" :class="{ 'show': isVisible }">
    <div class="ai-chat-modal-backdrop" @click="closeModal"></div>
    <div class="ai-chat-modal-container">
      <!-- Modal Header -->
      <div class="ai-chat-modal-header">
        <div class="ai-chat-modal-title">
          <i class="bi bi-robot me-2"></i>
          <span>AI Asistan</span>
        </div>
        <div class="ai-chat-modal-actions">
          <button 
            class="ai-chat-mode-selector" 
            @click="toggleModeSelector" 
            :title="currentModeName"
          >
            <i :class="currentModeIcon"></i>
          </button>
          <button class="ai-chat-modal-close" @click="closeModal">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>

      <!-- Mode Selector -->
      <div class="ai-chat-mode-dropdown" v-show="showModeSelector">
        <div class="ai-chat-mode-list">
          <button 
            v-for="mode in availableModes" 
            :key="mode.id" 
            class="ai-chat-mode-item"
            :class="{ 'active': mode.id === currentMode }"
            @click="changeMode(mode.id)"
          >
            <i :class="'bi ' + mode.icon"></i>
            <span>{{ mode.name }}</span>
          </button>
        </div>
      </div>

      <!-- Chat Messages -->
      <div class="ai-chat-messages" ref="messagesContainer">
        <div v-if="chatHistory.length === 0" class="ai-chat-empty">
          <div class="ai-chat-empty-icon">
            <i class="bi bi-chat-dots"></i>
          </div>
          <div class="ai-chat-empty-text">
            <p>AI asistan yardıma hazır.</p>
            <p class="ai-chat-empty-hint">Aşağıdan bir mesaj göndererek başlayabilirsiniz.</p>
          </div>
        </div>

        <template v-else>
          <div 
            v-for="message in chatHistory" 
            :key="message.id" 
            class="ai-chat-message"
            :class="message.sender === 'user' ? 'ai-chat-message-user' : 'ai-chat-message-ai'"
          >
            <!-- User Message -->
            <template v-if="message.sender === 'user'">
              <div class="ai-chat-message-avatar">
                <i class="bi bi-person-fill"></i>
              </div>
              <div class="ai-chat-message-content">
                <div class="ai-chat-message-text">{{ message.text }}</div>
                <div class="ai-chat-message-time">{{ formatTime(message.timestamp) }}</div>
              </div>
            </template>

            <!-- AI Message -->
            <template v-else>
              <div class="ai-chat-message-avatar">
                <i class="bi bi-robot"></i>
              </div>
              <div class="ai-chat-message-content">
                <!-- Regular message -->
                <div class="ai-chat-message-text" v-html="formatMessage(message.text)"></div>
                
                <!-- Stock alert data -->
                <div class="ai-chat-stock-alert" v-if="message.additionalData?.type === 'stockAlert'">
                  <h5>Kritik Seviye Altındaki Malzemeler</h5>
                  <div class="ai-chat-stock-table">
                    <div class="ai-chat-stock-header">
                      <div>Kod</div>
                      <div>Malzeme</div>
                      <div>Stok</div>
                      <div>Min.</div>
                    </div>
                    <div 
                      v-for="item in message.additionalData.items" 
                      :key="item.id"
                      class="ai-chat-stock-row"
                    >
                      <div>{{ item.id }}</div>
                      <div>{{ item.name }}</div>
                      <div :class="{'text-danger': item.currentStock === 0}">
                        {{ item.currentStock }}
                      </div>
                      <div>{{ item.minLevel }}</div>
                    </div>
                  </div>
                </div>

                <!-- Report data -->
                <div class="ai-chat-report-card" v-if="message.isReport">
                  <div class="ai-chat-report-header">
                    <i class="bi bi-file-earmark-text"></i>
                    <span>{{ message.reportData.title }}</span>
                  </div>
                  <div class="ai-chat-report-body">
                    <p>{{ message.reportData.content }}</p>
                    <div class="ai-chat-report-actions">
                      <button class="btn btn-sm btn-outline-primary">
                        <i class="bi bi-download me-1"></i> İndir
                      </button>
                      <button class="btn btn-sm btn-outline-secondary">
                        <i class="bi bi-share me-1"></i> Paylaş
                      </button>
                    </div>
                  </div>
                </div>

                <div class="ai-chat-message-time">
                  <span>{{ formatTime(message.timestamp) }}</span>
                  <span v-if="message.mode" class="ai-chat-message-mode">
                    <i :class="'bi ' + getModeIcon(message.mode)"></i>
                  </span>
                </div>
              </div>
            </template>
          </div>

          <!-- AI thinking indicator -->
          <div class="ai-chat-thinking" v-if="isThinking">
            <div class="ai-chat-message-avatar">
              <i class="bi bi-robot"></i>
            </div>
            <div class="ai-chat-thinking-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </template>
      </div>

      <!-- Chat Input -->
      <div class="ai-chat-input-container">
        <div class="ai-chat-input-wrapper">
          <textarea 
            ref="inputField"
            class="ai-chat-input" 
            placeholder="Mesajınızı yazın..."
            v-model="userInput"
            @keydown.enter.prevent="sendMessage"
            :disabled="isThinking"
          ></textarea>
          <button 
            class="ai-chat-send-btn" 
            @click="sendMessage" 
            :disabled="!userInput.trim() || isThinking"
          >
            <i class="bi bi-send-fill"></i>
          </button>
        </div>

        <!-- Input Tools -->
        <div class="ai-chat-input-tools">
          <button 
            class="ai-chat-tool-btn" 
            title="Rapor Oluştur"
            @click="openReportGenerator"
          >
            <i class="bi bi-file-earmark-bar-graph"></i>
          </button>
          
          <button 
            class="ai-chat-tool-btn" 
            title="Geçmişi Temizle"
            @click="clearHistory"
            :disabled="chatHistory.length === 0"
          >
            <i class="bi bi-trash"></i>
          </button>

          <button 
            class="ai-chat-tool-btn" 
            title="Öğrenme Modunu Aç/Kapa"
            @click="toggleLearningMode"
            :class="{ 'active': learningMode }"
          >
            <i class="bi bi-lightbulb"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, nextTick } from 'vue';
import { aiService } from '@/services/ai-service'; // Named import olarak düzeltildi
import { useNotificationStore } from '@/store/notification';
import { useTechnicalStore } from '@/store/technical';

export default {
  name: 'AIChatModal',
  
  props: {
    isVisible: {
      type: Boolean,
      default: false
    }
  },
  
  setup(props, { emit }) {
    const store = useStore();
    const userInput = ref('');
    const isThinking = ref(false);
    const messagesContainer = ref(null);
    const inputField = ref(null);
    const showModeSelector = ref(false);
    const learningMode = ref(aiService.getLearningMode());
    
    // Chat history from service
    const chatHistory = computed(() => aiService.getChatHistory());
    
    // Current mode
    const currentMode = computed(() => aiService.getCurrentMode());
    const availableModes = computed(() => aiService.getModes());
    const currentModeData = computed(() => {
      return availableModes.value.find(m => m.id === currentMode.value) || availableModes.value[0];
    });
    const currentModeName = computed(() => currentModeData.value.name);
    const currentModeIcon = computed(() => 'bi ' + currentModeData.value.icon);

    // Format timestamp to readable time
    const formatTime = (timestamp) => {
      if (!timestamp) return '';
      
      const date = new Date(timestamp);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      // Format Hours:Minutes
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // If today, show only time
      if (messageDate.getTime() === today.getTime()) {
        return timeStr;
      }
      
      // If this year, show day and month
      if (date.getFullYear() === now.getFullYear()) {
        return `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })} ${timeStr}`;
      }
      
      // Otherwise show full date
      return `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()} ${timeStr}`;
    };
    
    // Format message text (convert links, etc)
    const formatMessage = (text) => {
      if (!text) return '';
      
      // Convert URLs to links
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      let formattedText = text.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
      });
      
      // Replace newlines with <br>
      formattedText = formattedText.replace(/\n/g, '<br>');
      
      return formattedText;
    };
    
    // Send message to AI
    const sendMessage = async () => {
      const message = userInput.value.trim();
      if (!message || isThinking.value) return;
      
      userInput.value = '';
      isThinking.value = true;
      
      try {
        await aiService.sendMessage(message);
      } catch (error) {
        // Show error notification
        store.dispatch('notification/add', {
          title: 'Hata',
          message: 'Mesajınız gönderilemedi. Lütfen tekrar deneyin.',
          type: 'danger'
        });
      } finally {
        isThinking.value = false;
        scrollToBottom();
        focusInput();
      }
    };
    
    // Close modal
    const closeModal = () => {
      emit('close');
    };
    
    // Toggle mode selector
    const toggleModeSelector = () => {
      showModeSelector.value = !showModeSelector.value;
    };
    
    // Change AI mode
    const changeMode = (modeId) => {
      aiService.setMode(modeId);
      showModeSelector.value = false;
    };
    
    // Clear chat history
    const clearHistory = () => {
      if (window.confirm('Sohbet geçmişini temizlemek istediğinizden emin misiniz?')) {
        aiService.clearChatHistory();
      }
    };
    
    // Toggle learning mode
    const toggleLearningMode = () => {
      learningMode.value = !learningMode.value;
      aiService.setLearningMode(learningMode.value);
      
      // Show notification
      store.dispatch('notification/add', {
        title: 'AI Öğrenme Modu',
        message: `Öğrenme modu ${learningMode.value ? 'açıldı' : 'kapatıldı'}.`,
        type: 'info'
      });
    };
    
    // Get mode icon
    const getModeIcon = (modeId) => {
      const mode = availableModes.value.find(m => m.id === modeId);
      return mode ? mode.icon : 'bi-chat';
    };
    
    // Open report generator
    const openReportGenerator = () => {
      aiService.setMode('report');
      
      // Show notification
      store.dispatch('notification/add', {
        title: 'Rapor Modu',
        message: 'AI asistan rapor oluşturma moduna geçti.',
        type: 'info'
      });
    };
    
    // Scroll to bottom of chat
    const scrollToBottom = () => {
      nextTick(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
        }
      });
    };
    
    // Focus input field
    const focusInput = () => {
      nextTick(() => {
        if (inputField.value) {
          inputField.value.focus();
        }
      });
    };
    
    // Watch for visibility changes
    watch(() => props.isVisible, (isVisible) => {
      if (isVisible) {
        focusInput();
        scrollToBottom();
      } else {
        showModeSelector.value = false;
      }
    });
    
    // Watch for chat history changes to scroll
    watch(chatHistory, () => {
      scrollToBottom();
    }, { deep: true });
    
    return {
      userInput,
      isThinking,
      messagesContainer,
      inputField,
      chatHistory,
      currentMode,
      availableModes,
      currentModeName,
      currentModeIcon,
      showModeSelector,
      learningMode,
      formatTime,
      formatMessage,
      sendMessage,
      closeModal,
      toggleModeSelector,
      changeMode,
      clearHistory,
      toggleLearningMode,
      getModeIcon,
      openReportGenerator
    };
  }
};
</script>

<style lang="scss">
.ai-chat-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease, visibility 0.2s ease;
  
  &.show {
    opacity: 1;
    visibility: visible;
  }
  
  .ai-chat-modal-backdrop {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(3px);
  }
  
  .ai-chat-modal-container {
    position: relative;
    width: 100%;
    max-width: 600px;
    height: 80vh;
    max-height: 700px;
    background-color: #fff;
    border-radius: 10px;
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transform: scale(0.95);
    transition: transform 0.2s ease;
    
    .show & {
      transform: scale(1);
    }
  }
  
  .ai-chat-modal-header {
    padding: 15px 20px;
    background-color: var(--primary-color, #007bff);
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    
    .ai-chat-modal-title {
      display: flex;
      align-items: center;
      font-weight: 600;
      font-size: 1.1rem;
      
      i {
        margin-right: 8px;
      }
    }
    
    .ai-chat-modal-actions {
      display: flex;
      align-items: center;
      
      button {
        background: none;
        border: none;
        color: white;
        padding: 5px;
        margin-left: 5px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background-color 0.2s;
        
        &:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }
        
        i {
          font-size: 1.1rem;
        }
      }
    }
  }
  
  .ai-chat-mode-dropdown {
    position: absolute;
    top: 60px;
    right: 60px;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    z-index: 10;
    border: 1px solid rgba(0, 0, 0, 0.1);
    
    .ai-chat-mode-list {
      display: flex;
      flex-direction: column;
      padding: 5px;
      
      .ai-chat-mode-item {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        border: none;
        background: none;
        cursor: pointer;
        border-radius: 5px;
        text-align: left;
        
        i {
          margin-right: 10px;
          font-size: 1.1rem;
        }
        
        &:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }
        
        &.active {
          color: var(--primary-color, #007bff);
          background-color: rgba(0, 123, 255, 0.1);
          font-weight: 500;
        }
      }
    }
  }
  
  .ai-chat-messages {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 15px;
    
    .ai-chat-empty {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      color: #adb5bd;
      padding: 20px;
      
      .ai-chat-empty-icon {
        font-size: 4rem;
        margin-bottom: 20px;
        color: #e9ecef;
      }
      
      .ai-chat-empty-text {
        text-align: center;
        
        p {
          margin-bottom: 5px;
          font-size: 1.1rem;
        }
        
        .ai-chat-empty-hint {
          font-size: 0.9rem;
          color: #6c757d;
        }
      }
    }
    
    .ai-chat-message {
      display: flex;
      margin-bottom: 15px;
      
      .ai-chat-message-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background-color: #f8f9fa;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 10px;
        flex-shrink: 0;
        
        i {
          font-size: 1.2rem;
          color: #6c757d;
        }
      }
      
      .ai-chat-message-content {
        flex: 1;
        
        .ai-chat-message-text {
          background-color: #f8f9fa;
          border-radius: 10px;
          padding: 12px 15px;
          color: #212529;
          max-width: 80%;
          word-break: break-word;
          line-height: 1.5;
          
          a {
            color: var(--primary-color, #007bff);
            text-decoration: none;
            
            &:hover {
              text-decoration: underline;
            }
          }
        }
        
        .ai-chat-message-time {
          font-size: 0.75rem;
          color: #adb5bd;
          margin-top: 5px;
          display: flex;
          align-items: center;
          
          .ai-chat-message-mode {
            margin-left: 8px;
            display: flex;
            align-items: center;
            
            i {
              font-size: 0.8rem;
              color: var(--primary-color, #007bff);
            }
          }
        }
      }
      
      &.ai-chat-message-user {
        flex-direction: row-reverse;
        
        .ai-chat-message-avatar {
          margin-right: 0;
          margin-left: 10px;
          background-color: var(--primary-color, #007bff);
          
          i {
            color: white;
          }
        }
        
        .ai-chat-message-content {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          
          .ai-chat-message-text {
            background-color: var(--primary-color, #007bff);
            color: white;
          }
          
          .ai-chat-message-time {
            text-align: right;
          }
        }
      }
      
      .ai-chat-stock-alert {
        margin-top: 15px;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        overflow: hidden;
        
        h5 {
          margin: 0;
          padding: 10px 15px;
          background-color: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
          font-size: 0.9rem;
          font-weight: 600;
        }
        
        .ai-chat-stock-table {
          display: flex;
          flex-direction: column;
          
          .ai-chat-stock-header {
            display: grid;
            grid-template-columns: 0.8fr 2fr 0.5fr 0.5fr;
            gap: 10px;
            padding: 8px 15px;
            border-bottom: 1px solid #dee2e6;
            font-weight: 500;
            font-size: 0.8rem;
            background-color: #f8f9fa;
          }
          
          .ai-chat-stock-row {
            display: grid;
            grid-template-columns: 0.8fr 2fr 0.5fr 0.5fr;
            gap: 10px;
            padding: 8px 15px;
            border-bottom: 1px solid #f8f9fa;
            font-size: 0.85rem;
            
            &:last-child {
              border-bottom: none;
            }
            
            .text-danger {
              color: var(--danger-color, #dc3545);
              font-weight: 500;
            }
          }
        }
      }
      
      .ai-chat-report-card {
        margin-top: 15px;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        overflow: hidden;
        width: 100%;
        
        .ai-chat-report-header {
          display: flex;
          align-items: center;
          padding: 10px 15px;
          background-color: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
          
          i {
            margin-right: 8px;
            color: var(--primary-color, #007bff);
          }
          
          span {
            font-weight: 600;
            font-size: 0.9rem;
          }
        }
        
        .ai-chat-report-body {
          padding: 15px;
          
          p {
            margin-bottom: 15px;
            font-size: 0.9rem;
          }
          
          .ai-chat-report-actions {
            display: flex;
            gap: 10px;
            
            button {
              font-size: 0.8rem;
              
              i {
                font-size: 0.85rem;
              }
            }
          }
        }
      }
    }
    
    .ai-chat-thinking {
      display: flex;
      
      .ai-chat-message-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background-color: #f8f9fa;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 10px;
        flex-shrink: 0;
        
        i {
          font-size: 1.2rem;
          color: #6c757d;
        }
      }
      
      .ai-chat-thinking-dots {
        background-color: #f8f9fa;
        border-radius: 10px;
        padding: 15px 20px;
        display: flex;
        align-items: center;
        gap: 5px;
        
        span {
          display: block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #adb5bd;
          animation: thinking 1.5s infinite;
          
          &:nth-child(2) {
            animation-delay: 0.2s;
          }
          
          &:nth-child(3) {
            animation-delay: 0.4s;
          }
        }
      }
    }
  }
  
  .ai-chat-input-container {
    padding: 15px 20px;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    background-color: #fff;
    
    .ai-chat-input-wrapper {
      display: flex;
      position: relative;
      
      .ai-chat-input {
        flex: 1;
        padding: 12px 15px;
        padding-right: 50px;
        border: 1px solid #ced4da;
        border-radius: 8px;
        resize: none;
        height: 50px;
        max-height: 120px;
        font-family: inherit;
        font-size: 0.95rem;
        transition: border-color 0.2s;
        
        &:focus {
          outline: none;
          border-color: var(--primary-color, #007bff);
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.2);
        }
        
        &:disabled {
          background-color: #f8f9fa;
          cursor: not-allowed;
        }
      }
      
      .ai-chat-send-btn {
        position: absolute;
        right: 5px;
        top: 50%;
        transform: translateY(-50%);
        background-color: var(--primary-color, #007bff);
        border: none;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        cursor: pointer;
        transition: background-color 0.2s;
        
        i {
          font-size: 1rem;
        }
        
        &:hover {
          background-color: var(--primary-dark-color, #0069d9);
        }
        
        &:disabled {
          background-color: #adb5bd;
          cursor: not-allowed;
        }
      }
    }
    
    .ai-chat-input-tools {
      display: flex;
      justify-content: flex-start;
      gap: 10px;
      margin-top: 10px;
      
      .ai-chat-tool-btn {
        background: none;
        border: none;
        color: #6c757d;
        padding: 5px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
        
        i {
          font-size: 1rem;
        }
        
        &:hover {
          color: var(--primary-color, #007bff);
          background-color: rgba(0, 123, 255, 0.1);
        }
        
        &.active {
          color: var(--primary-color, #007bff);
          background-color: rgba(0, 123, 255, 0.1);
        }
        
        &:disabled {
          color: #ced4da;
          cursor: not-allowed;
          
          &:hover {
            background-color: transparent;
          }
        }
      }
    }
  }
  
  @keyframes thinking {
    0%, 60%, 100% {
      transform: translateY(0);
    }
    30% {
      transform: translateY(-5px);
    }
  }
}

@media (max-width: 768px) {
  .ai-chat-modal {
    .ai-chat-modal-container {
      width: 95%;
      height: 90vh;
      max-height: none;
    }
    
    .ai-chat-messages {
      .ai-chat-message {
        .ai-chat-message-content {
          .ai-chat-message-text {
            max-width: 90%;
          }
        }
      }
    }
  }
}
</style>