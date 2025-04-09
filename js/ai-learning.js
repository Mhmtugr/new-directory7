/**
 * METS Gelişmiş Yapay Zeka Asistanı - Öğrenme Modülü
 * Bu dosya yapay zeka asistanının sürekli öğrenme ve gelişme yeteneklerini içerir
 */

class AILearningSystem {
    constructor() {
        this.learningData = [];
        this.patterns = new Map();
        this.modelVersion = '1.0.0';
        this.lastTrainingDate = null;
        this.isTraining = false;
        this.accuracyScore = 0;
        this.loadPersistedData();
    }
    
    // Kalıcı verileri yükle
    loadPersistedData() {
        try {
            const storedData = localStorage.getItem('metsAiLearningSystem');
            if (storedData) {
                const parsedData = JSON.parse(storedData);
                this.patterns = new Map(parsedData.patterns);
                this.modelVersion = parsedData.modelVersion;
                this.lastTrainingDate = new Date(parsedData.lastTrainingDate);
                this.accuracyScore = parsedData.accuracyScore || 0;
                console.log('Öğrenme sistemi verileri yüklendi.');
            }
        } catch (error) {
            console.error('Öğrenme sistemi verileri yüklenirken hata:', error);
        }
    }
    
    // Öğrenme verilerini kaydet
    persistData() {
        try {
            const dataToStore = {
                patterns: Array.from(this.patterns.entries()),
                modelVersion: this.modelVersion,
                lastTrainingDate: new Date().toISOString(),
                accuracyScore: this.accuracyScore
            };
            localStorage.setItem('metsAiLearningSystem', JSON.stringify(dataToStore));
        } catch (error) {
            console.error('Öğrenme sistemi verileri kaydedilirken hata:', error);
        }
    }
    
    // Kullanıcı etkileşimlerinden öğren
    learnFromInteraction(userMessage, aiResponse) {
        if (!userMessage || !aiResponse) return;
        
        try {
            // Mesajları öğrenme verilerine ekle
            this.learningData.push({
                timestamp: new Date().toISOString(),
                userMessage: userMessage,
                aiResponse: aiResponse,
                context: window.aiAssistant ? window.aiAssistant.context : null,
                mode: window.aiAssistant ? window.aiAssistant.currentMode : 'assistant'
            });
            
            // Veri setini sınırla (hafıza yönetimi için)
            if (this.learningData.length > 500) {
                this.learningData = this.learningData.slice(-500);
            }
            
            // Pattern tespiti
            this.detectPatterns(userMessage, aiResponse);
            
            // Her 50 etkileşimde bir modeli güncelle
            if (this.learningData.length % 50 === 0) {
                this.updateModel();
            }
            
            return true;
        } catch (error) {
            console.error('Etkileşimden öğrenme hatası:', error);
            return false;
        }
    }
    
    // Kalıpları tespit et
    detectPatterns(userMessage, aiResponse) {
        // Anahtar kelime çıkarma (basit bir şekilde)
        const keywords = this.extractKeywords(userMessage);
        
        // Her anahtar kelime için
        keywords.forEach(keyword => {
            if (this.patterns.has(keyword)) {
                // Mevcut kalıbı güncelle
                const pattern = this.patterns.get(keyword);
                pattern.count++;
                pattern.recentResponses.unshift(aiResponse);
                
                // Son 5 yanıtı tut
                if (pattern.recentResponses.length > 5) {
                    pattern.recentResponses = pattern.recentResponses.slice(0, 5);
                }
                
                this.patterns.set(keyword, pattern);
            } else {
                // Yeni kalıp oluştur
                this.patterns.set(keyword, {
                    count: 1,
                    recentResponses: [aiResponse],
                    lastUsed: new Date().toISOString()
                });
            }
        });
    }
    
    // Anahtar kelimeleri çıkar
    extractKeywords(text) {
        if (!text) return [];
        
        // Basit anahtar kelime çıkarma
        // Gerçek bir uygulamada NLP kütüphaneleri kullanılacaktır
        const words = text.toLowerCase()
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
            .split(/\s+/);
        
        // Stop words filtreleme (Türkçe yaygın kelimeler)
        const stopWords = ['ve', 'veya', 'bir', 'bu', 'şu', 'için', 'ile', 'de', 'da', 'mi', 'mı', 'ne', 'o', 'ama'];
        
        // Filtreleme
        const filteredWords = words.filter(word => 
            word.length > 2 && !stopWords.includes(word)
        );
        
        return filteredWords;
    }
    
    // Modeli güncelle
    updateModel() {
        if (this.isTraining) return;
        
        this.isTraining = true;
        console.log('Yapay zeka modeli güncelleniyor...');
        
        // Gerçek bir uygulamada burada makine öğrenmesi algoritması çalıştırılacaktır
        // Bu demo sürümünde basit bir simülasyon yapıyoruz
        
        setTimeout(() => {
            // Basit bir simülasyon
            this.modelVersion = `1.0.${parseInt(this.modelVersion.split('.')[2] || '0') + 1}`;
            this.accuracyScore = Math.min(0.95, this.accuracyScore + 0.01);
            this.lastTrainingDate = new Date();
            
            // Verileri kaydet
            this.persistData();
            
            console.log(`Model güncellendi: v${this.modelVersion}, doğruluk: %${Math.round(this.accuracyScore*100)}`);
            this.isTraining = false;
        }, 2000);
    }
    
    // Önerilen yanıtları getir
    getSuggestedResponse(userMessage, context) {
        if (!userMessage) return null;
        
        const keywords = this.extractKeywords(userMessage);
        let bestMatch = null;
        let highestCount = 0;
        
        // Anahtar kelimelerle en iyi eşleşmeyi bul
        keywords.forEach(keyword => {
            if (this.patterns.has(keyword)) {
                const pattern = this.patterns.get(keyword);
                if (pattern.count > highestCount) {
                    highestCount = pattern.count;
                    bestMatch = pattern;
                }
            }
        });
        
        // Eşleşme bulunduysa öneri döndür
        if (bestMatch && bestMatch.recentResponses.length > 0) {
            return bestMatch.recentResponses[0];
        }
        
        return null;
    }
    
    // Öğrenme istatistiklerini getir
    getLearningStats() {
        return {
            learningDataPoints: this.learningData.length,
            patternCount: this.patterns.size,
            modelVersion: this.modelVersion,
            lastTrainingDate: this.lastTrainingDate,
            accuracyScore: this.accuracyScore
        };
    }
}

// Global nesne olarak dışa aktar
window.aiLearningSystem = new AILearningSystem();

// Yapay zeka asistanına öğrenme sistemini bağla
document.addEventListener('DOMContentLoaded', function() {
    if (window.aiAssistant) {
        // Önceki öğrenme fonksiyonunu yedekle
        const originalLearningFunction = window.learnFromInteraction || function() {};
        
        // Yeni öğrenme fonksiyonu
        window.learnFromInteraction = function(userMessage, aiResponse) {
            // Orijinal fonksiyonu çağır
            originalLearningFunction(userMessage, aiResponse);
            
            // Gelişmiş öğrenme sistemini kullan
            window.aiLearningSystem.learnFromInteraction(userMessage, aiResponse);
        };
        
        console.log('Gelişmiş öğrenme sistemi yapay zeka asistanına entegre edildi.');
    }
});
