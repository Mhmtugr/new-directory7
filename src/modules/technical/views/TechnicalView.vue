<template>
  <div class="technical-view">
    <div class="row">
      <!-- Teknik Dokümanlar Listesi -->
      <div class="col-md-5">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Teknik Dokümanlar</h5>
            <button class="btn btn-sm btn-primary" @click="openUploadModal">
              <i class="bi bi-upload"></i> Yükle
            </button>
          </div>
          <div class="card-body">
            <!-- Arama Çubuğu -->
            <div class="input-group mb-3">
              <input type="text" class="form-control" placeholder="Doküman ara..." v-model="searchTerm">
              <button class="btn btn-outline-secondary" type="button" @click="searchDocuments">
                <i class="bi bi-search"></i>
              </button>
            </div>
            <!-- Doküman Listesi -->
            <div class="list-group" v-if="filteredDocuments.length > 0">
              <a href="#" class="list-group-item list-group-item-action" v-for="doc in filteredDocuments" :key="doc.id" @click.prevent="viewDocument(doc)">
                <div class="d-flex w-100 justify-content-between">
                  <h6 class="mb-1">{{ doc.name }}</h6>
                  <small class="text-muted">{{ formatDate(doc.date) }}</small>
                </div>
                <p class="mb-1">Rev. {{ doc.revision }} - Son güncelleme: {{ doc.updatedBy }}</p>
                <small class="text-muted">{{ doc.department }}</small>
              </a>
            </div>
             <p v-else class="text-center text-muted">Gösterilecek doküman bulunamadı.</p>
          </div>
        </div>
      </div>

      <!-- Teknik Sorgulama Alanı -->
      <div class="col-md-7">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">Teknik Sorgulama (AI Destekli)</h5>
          </div>
          <div class="card-body">
            <div class="mb-3">
              <label for="technicalQuestion" class="form-label">Teknik sorunuzu yazın:</label>
              <textarea class="form-control" id="technicalQuestion" rows="3" placeholder="Örneğin: RM 36 CB hücresinde hangi akım trafosu kullanılır?" v-model="technicalQuestion"></textarea>
            </div>
            <button class="btn btn-primary" @click="queryAI" :disabled="isQueryingAI">
                <span v-if="isQueryingAI" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                <span v-else>Sorgula</span>
            </button>
            <hr v-if="aiResponse || relatedDocuments.length > 0">
            <!-- AI Cevabı -->
            <div class="alert alert-info mt-3" v-if="aiResponse">
              <h6><i class="bi bi-lightbulb"></i> Yapay Zeka Cevabı:</h6>
              <p>{{ aiResponse.text }}</p>
              <p class="mb-0">Referans doküman: <a href="#" @click.prevent="viewDocumentByName(aiResponse.reference)">{{ aiResponse.reference }}</a></p>
            </div>
            <!-- İlgili Dokümanlar -->
            <div class="mt-3" v-if="relatedDocuments.length > 0">
              <h6>İlgili Dokümanlar:</h6>
              <ul>
                <li v-for="doc in relatedDocuments" :key="doc.id"><a href="#" @click.prevent="viewDocument(doc)">{{ doc.name }} - Rev.{{ doc.revision }}</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Doküman Yükleme Modalı -->
    <!-- <UploadDocumentModal v-if="isUploadModalOpen" @close="closeUploadModal" /> -->

    <!-- Doküman Görüntüleme Modalı/Paneli -->
    <!-- <DocumentViewer v-if="selectedDocument" :document="selectedDocument" @close="selectedDocument = null" /> -->

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
// import apiService from '@/services/api-service';
// import aiService from '@/services/ai-service';
// import UploadDocumentModal from '@/components/technical/UploadDocumentModal.vue';
// import DocumentViewer from '@/components/technical/DocumentViewer.vue';

const documents = ref([]);
const searchTerm = ref('');
const technicalQuestion = ref('');
const aiResponse = ref(null);
const relatedDocuments = ref([]);
const isQueryingAI = ref(false);
const isUploadModalOpen = ref(false);
const selectedDocument = ref(null); // Görüntülenen doküman

onMounted(async () => {
  // Veri çekme
  // documents.value = await apiService.getTechnicalDocuments();

  // Örnek Veriler
  documents.value = [
    { id: 'doc1', name: 'RM 36 CB Teknik Çizim', date: '2024-10-15', revision: '2.1', updatedBy: 'Ahmet Yılmaz', department: 'Elektrik Tasarım', contentUrl: '/docs/rm36cb_drawing.pdf' },
    { id: 'doc2', name: 'RM 36 LB Montaj Talimatı', date: '2024-10-10', revision: '1.3', updatedBy: 'Mehmet Demir', department: 'Mekanik Tasarım', contentUrl: '/docs/rm36lb_assembly.pdf' },
    { id: 'doc3', name: 'RM 36 FL Test Prosedürü', date: '2024-10-05', revision: '3.0', updatedBy: 'Ayşe Kaya', department: 'Test Birimi', contentUrl: '/docs/rm36fl_test.pdf' },
    { id: 'doc4', name: 'RMU Kablaj Şeması', date: '2024-10-01', revision: '1.5', updatedBy: 'Fatma Şahin', department: 'Kablaj Birimi', contentUrl: '/docs/rmu_wiring.pdf' },
    { id: 'doc5', name: 'Akım Trafosu Seçim Kılavuzu', date: '2024-09-20', revision: '1.3', updatedBy: 'Ahmet Yılmaz', department: 'Elektrik Tasarım', contentUrl: '/docs/ct_selection_guide.pdf' },
  ];
});

const filteredDocuments = computed(() => {
  if (!searchTerm.value) {
    return documents.value;
  }
  const lowerSearchTerm = searchTerm.value.toLowerCase();
  return documents.value.filter(doc =>
    doc.name.toLowerCase().includes(lowerSearchTerm) ||
    doc.department.toLowerCase().includes(lowerSearchTerm) ||
    doc.updatedBy.toLowerCase().includes(lowerSearchTerm)
  );
});

const searchDocuments = () => {
  // Arama butonu için ek mantık gerekirse buraya
  console.log('Searching for:', searchTerm.value);
};

const queryAI = async () => {
  if (!technicalQuestion.value.trim()) return;

  isQueryingAI.value = true;
  aiResponse.value = null;
  relatedDocuments.value = [];

  try {
    // const response = await aiService.queryTechnical(technicalQuestion.value);
    // aiResponse.value = response.answer;
    // relatedDocuments.value = response.relatedDocs;

    // Örnek Yanıt (Simülasyon)
    await new Promise(resolve => setTimeout(resolve, 1500)); // Gecikme simülasyonu
    const lowerQuestion = technicalQuestion.value.toLowerCase();
    if (lowerQuestion.includes('akım trafosu')) {
         aiResponse.value = { text: 'RM 36 CB hücresinde genellikle 200-400/5-5A 5P20 7,5/15VA veya 300-600/5-5A 5P20 7,5/15VA özelliklerinde toroidal tip akım trafoları kullanılmaktadır. Canias kodları: 144866% (KAP-80/190-95) veya 142227% (KAT-85/190-95).', reference: 'Akım Trafosu Seçim Kılavuzu' };
         relatedDocuments.value = documents.value.filter(doc => doc.name.includes('Akım Trafosu') || doc.name.includes('RM 36 CB'));
    } else if (lowerQuestion.includes('rmu')) {
        aiResponse.value = { text: 'RMU (Ring Main Unit) kablaj şeması Rev. 1.5 olarak mevcuttur. Şema, ring şalteri ve kesici bağlantılarını detaylandırmaktadır.', reference: 'RMU Kablaj Şeması' };
        relatedDocuments.value = documents.value.filter(doc => doc.name.includes('RMU'));
    } else {
        aiResponse.value = { text: 'Sorunuzla ilgili spesifik bir doküman bulunamadı, ancak genel teknik şartnameler veya ilgili hücre tipi dokümanları yardımcı olabilir.', reference: 'RM 36 CB Teknik Çizim' }; // Örnek referans
        relatedDocuments.value = documents.value.slice(0, 2); // İlk iki dokümanı göster
    }

  } catch (error) {
    console.error('AI query failed:', error);
    aiResponse.value = { text: 'Sorgulama sırasında bir hata oluştu.', reference: '' };
  } finally {
    isQueryingAI.value = false;
  }
};

const openUploadModal = () => {
  isUploadModalOpen.value = true;
  console.log('Opening upload modal...');
};

const closeUploadModal = () => {
  isUploadModalOpen.value = false;
};

const viewDocument = (doc) => {
    selectedDocument.value = doc;
    console.log('Viewing document:', doc.name);
    // Gerçek doküman görüntüleyici açılacak
    alert(`Doküman görüntüleyici açılıyor: ${doc.name} (${doc.contentUrl})`);
};

const viewDocumentByName = (docName) => {
    const doc = documents.value.find(d => d.name === docName);
    if(doc) {
        viewDocument(doc);
    }
}

const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
        return new Date(dateString).toLocaleDateString('tr-TR');
    } catch (e) {
        return dateString;
    }
};

</script>

<style scoped>
/* Teknik görünüm özel stilleri */
.list-group-item-action:hover {
  background-color: #f8f9fa;
}
textarea {
    resize: vertical;
}
</style> 