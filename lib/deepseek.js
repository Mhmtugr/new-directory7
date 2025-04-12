import axios from 'axios';
import { logError } from './errorLogging';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

/**
 * DeepSeek API ile sohbet isteği göndermek için yardımcı fonksiyon
 * @param {Array} messages - Sohbet mesajları
 * @param {Object} options - API için ek seçenekler
 * @returns {Promise} - API yanıtı
 */
export async function createChatCompletion(messages, options = {}) {
  try {
    const response = await axios.post(
      `${DEEPSEEK_API_URL}/chat/completions`,
      {
        model: options.model || 'deepseek-chat',
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 800,
        ...options
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        }
      }
    );

    // Başarılı yanıt işleme
    if (options.logInteractions && response.data) {
      logAIInteraction(messages, response.data);
    }

    return response.data;
  } catch (error) {
    // Hata yakalama ve loglama
    logError('DeepSeek API Error', { 
      error: error.response?.data || error.message,
      messages: messages.map(m => ({ role: m.role, content: m.content.substring(0, 100) + '...' }))
    }, 'error');
    
    // API hatası durumunda daha okunaklı hata fırlatma
    if (error.response?.data) {
      throw new Error(`DeepSeek API Error: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * DeepSeek API ile analiz yapmak için yardımcı fonksiyon
 * @param {String} prompt - Analiz için giriş metni
 * @param {Object} options - API için ek seçenekler
 * @returns {Promise} - API yanıtı
 */
export async function createAnalysis(prompt, options = {}) {
  const messages = [
    { role: 'system', content: options.systemPrompt || 'Sen üretim süreçleri konusunda uzman bir analistsin.' },
    { role: 'user', content: prompt }
  ];
  
  return createChatCompletion(messages, {
    ...options,
    logInteractions: true
  });
}

/**
 * DeepSeek API ile sorun belirleme ve çözüm önerisi almak için yardımcı fonksiyon
 * @param {Object} productionData - Üretim verileri
 * @param {Object} options - API için ek seçenekler
 * @returns {Promise} - API yanıtı (sorunlar ve çözüm önerileri)
 */
export async function detectProductionIssues(productionData, options = {}) {
  const systemPrompt = `
    Sen üretim süreçleri ve darboğaz tespitinde uzmanlaşmış bir yapay zeka asistanısın.
    Verilen üretim verilerini analiz et ve aşağıdakileri belirle:
    1. Mevcut veya potansiyel darboğazlar
    2. Gecikme riski olan işler
    3. Kapasite veya kaynak yetersizlikleri
    4. Çözüm önerileri

    Yanıtını aşağıdaki formatta yapılandır:
    - Tespit Edilen Sorunlar: [sorun listesi]
    - Risk Seviyesi: [düşük/orta/yüksek]
    - Etkilenen Departmanlar: [departman listesi]
    - Önerilen Çözümler: [çözüm önerileri]
    - Tahmini Etki: [etki analizi]
  `;
  
  const prompt = `
    Aşağıdaki üretim verilerini analiz et ve potansiyel sorunları tespit et:
    ${JSON.stringify(productionData)}
  `;
  
  return createAnalysis(prompt, {
    systemPrompt,
    temperature: 0.3, // Daha tutarlı sonuçlar için düşük sıcaklık
    max_tokens: 1000,
    ...options
  });
}

/**
 * Yapay zeka etkileşimlerini öğrenme amacıyla loglar
 * @private
 */
function logAIInteraction(messages, response) {
  try {
    // Basit loglama - gerçek bir uygulamada veritabanına kaydedilebilir
    console.log(`AI Interaction logged: ${new Date().toISOString()}`);
    // Burada veritabanına kaydetme işlemi olabilir
  } catch (error) {
    console.error('Error logging AI interaction:', error);
  }
}

export default {
  createChatCompletion,
  createAnalysis,
  detectProductionIssues
};
