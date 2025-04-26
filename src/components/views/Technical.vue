<!-- Technical.vue - Teknik Dokümanlar Bileşeni -->
<template>
  <div class="technical-module">
    <div class="row">
      <!-- Dokümanlar Bölümü -->
      <div class="col-md-7">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Teknik Dokümanlar</h5>
            <button 
              class="btn btn-sm btn-primary" 
              data-bs-toggle="modal" 
              data-bs-target="#uploadDocumentModal"
              @click="openUploadModal">
              <i class="bi bi-cloud-upload me-1"></i> Doküman Yükle
            </button>
          </div>
          <div class="card-body">
            <div class="input-group mb-3">
              <input type="text" class="form-control" v-model="searchQuery" placeholder="Doküman ara..." @keyup.enter="searchDocuments">
              <button class="btn btn-outline-secondary" type="button" @click="searchDocuments">
                <i class="bi bi-search"></i>
              </button>
            </div>
            <div class="list-group" v-if="!loading">
              <div v-if="documents.length === 0" class="text-center py-4">
                <p class="text-muted">Doküman bulunamadı.</p>
              </div>
              <a 
                v-for="doc in documents" 
                :key="doc.id" 
                :href="doc.url || '#'" 
                class="list-group-item list-group-item-action"
                target="_blank"
                rel="noopener noreferrer">
                <div class="d-flex w-100 justify-content-between">
                  <h6 class="mb-1">{{ doc.name }}</h6>
                  <small class="text-muted">{{ doc.date || '-' }}</small>
                </div>
                <p class="mb-1">Rev. {{ doc.revision || '-' }} - Son güncelleme: {{ doc.author || '-' }}</p>
                <small class="text-muted">{{ doc.department || '-' }}</small>
              </a>
            </div>
            <div v-else class="text-center py-4">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Yükleniyor...</span>
              </div>
              <p class="mt-2">Dokümanlar yükleniyor...</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Teknik Sorgulama Bölümü -->
      <div class="col-md-5">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">Teknik Sorgulama</h5>
          </div>
          <div class="card-body">
            <div class="mb-3">
              <label for="technicalQuestion" class="form-label">Teknik Soru</label>
              <textarea 
                class="form-control" 
                id="technicalQuestion" 
                v-model="technicalQuery"
                rows="3" 
                placeholder="Örn: RM 36 CB hücresinde hangi akım trafoları kullanılır?"></textarea>
            </div>
            <button class="btn btn-primary" @click="submitTechnicalQuery" :disabled="queryLoading">
              <span v-if="queryLoading" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              <i v-else class="bi bi-search me-1"></i>
              Sorgula
            </button>

            <div v-if="aiResponse" class="alert alert-info mt-3">
              <h6><i class="bi bi-lightbulb"></i> Yapay Zeka Cevabı:</h6>
              <p>{{ aiResponse }}</p>
              <p v-if="aiResponseReference" class="mb-0">Referans doküman: <a :href="aiResponseReference.url || '#'">{{ aiResponseReference.name }}</a></p>
            </div>
            
            <div v-if="relatedDocuments && relatedDocuments.length > 0" class="mt-3">
              <h6>İlgili Dokümanlar:</h6>
              <ul>
                <li v-for="doc in relatedDocuments" :key="doc.id">
                  <a :href="doc.url || '#'" target="_blank" rel="noopener noreferrer">{{ doc.name }}</a> - Rev.{{ doc.revision || '-' }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Doküman Yükleme Modal -->
    <div class="modal fade" id="uploadDocumentModal" tabindex="-1" aria-labelledby="uploadDocumentModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="uploadDocumentModalLabel">Teknik Doküman Yükle</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Kapat"></button>
          </div>
          <div class="modal-body">
            <form id="upload-document-form" @submit.prevent="handleDocumentUpload">
              <div id="upload-message" class="alert d-none"></div>
              
              <div class="mb-3">
                <label for="docName" class="form-label">Doküman Adı</label>
                <input type="text" class="form-control" id="docName" v-model="newDocument.name" required>
              </div>
              
              <div class="mb-3">
                <label for="docRevision" class="form-label">Revizyon</label>
                <input type="text" class="form-control" id="docRevision" v-model="newDocument.revision" placeholder="Örn: 1.0">
              </div>
              
              <div class="mb-3">
                <label for="docDepartment" class="form-label">Departman</label>
                <select class="form-control" id="docDepartment" v-model="newDocument.department">
                  <option value="Elektrik Tasarım">Elektrik Tasarım</option>
                  <option value="Mekanik Tasarım">Mekanik Tasarım</option>
                  <option value="Test Birimi">Test Birimi</option>
                  <option value="Kablaj Birimi">Kablaj Birimi</option>
                  <option value="Üretim">Üretim</option>
                  <option value="Genel">Genel</option>
                </select>
              </div>
              
              <div class="mb-3">
                <label for="docFile" class="form-label">Dosya</label>
                <input type="file" class="form-control" id="docFile" @change="handleFileSelected" required>
              </div>
              
              <div class="text-end">
                <button type="button" class="btn btn-secondary me-2" data-bs-dismiss="modal">İptal</button>
                <button type="submit" class="btn btn-primary" id="upload-doc-btn" :disabled="uploading">
                  <span v-if="uploading" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                  Yükle
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { useStore } from 'vuex';
import { useTechnicalService } from '@/modules/technical';
import { useToast } from '@/composables/useToast';

export default {
  name: 'Technical',
  setup() {
    const store = useStore();
    const { toast } = useToast();
    const technicalService = useTechnicalService();
    
    // Doküman Yönetimi
    const loading = ref(false);
    const allDocuments = ref([]);
    const searchQuery = ref('');
    const documents = computed(() => {
      if (!searchQuery.value) return allDocuments.value;
      const query = searchQuery.value.toLowerCase().trim();
      return allDocuments.value.filter(doc => 
        doc.name?.toLowerCase().includes(query) || 
        doc.department?.toLowerCase().includes(query) || 
        doc.author?.toLowerCase().includes(query)
      );
    });
    
    // Doküman Yükleme
    const uploading = ref(false);
    const newDocument = ref({
      name: '',
      revision: '1.0',
      department: 'Genel',
      file: null
    });
    
    // Teknik Sorgulama
    const technicalQuery = ref('');
    const queryLoading = ref(false);
    const aiResponse = ref('');
    const aiResponseReference = ref(null);
    const relatedDocuments = ref([]);
    
    // Dokümanları yükle
    const loadDocuments = async () => {
      loading.value = true;
      try {
        const result = await technicalService.getDocuments();
        allDocuments.value = result;
      } catch (error) {
        console.error('Doküman yükleme hatası:', error);
        toast.error('Dokümanlar yüklenemedi: ' + error.message);
      } finally {
        loading.value = false;
      }
    };
    
    // Doküman ara
    const searchDocuments = () => {
      // computed özelliği otomatik olarak filtreleme yapıyor
      console.log('Arama sonuçları:', documents.value.length);
    };
    
    // Dosya seçildiğinde
    const handleFileSelected = (event) => {
      const file = event.target.files[0];
      if (file) {
        newDocument.value.file = file;
      }
    };
    
    // Doküman yükleme modalını aç
    const openUploadModal = () => {
      // Modal Bootstrap tarafından açılacak
      // Form alanlarını sıfırla
      newDocument.value = {
        name: '',
        revision: '1.0',
        department: 'Genel',
        file: null
      };
      
      // Modal içindeki mesaj alanını temizle
      const messageDiv = document.getElementById('upload-message');
      if (messageDiv) {
        messageDiv.className = 'alert d-none';
        messageDiv.textContent = '';
      }
    };
    
    // Doküman yükleme
    const handleDocumentUpload = async () => {
      const messageDiv = document.getElementById('upload-message');
      if (!newDocument.value.file || !newDocument.value.name) {
        if (messageDiv) {
          messageDiv.textContent = "Lütfen doküman adını ve dosyayı seçin.";
          messageDiv.className = 'alert alert-warning';
        }
        return;
      }
      
      uploading.value = true;
      if (messageDiv) {
        messageDiv.textContent = "Doküman yükleniyor...";
        messageDiv.className = 'alert alert-info';
      }
      
      try {
        await technicalService.uploadDocument(newDocument.value);
        
        if (messageDiv) {
          messageDiv.textContent = "Doküman başarıyla yüklendi.";
          messageDiv.className = 'alert alert-success';
        }
        
        // Dokümanları yenile
        await loadDocuments();
        
        // Modalı kapat
        setTimeout(() => {
          const modalElement = document.getElementById('uploadDocumentModal');
          if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
          }
        }, 1500);
        
      } catch (error) {
        console.error('Doküman yükleme hatası:', error);
        if (messageDiv) {
          messageDiv.textContent = `Yükleme başarısız: ${error.message}`;
          messageDiv.className = 'alert alert-danger';
        }
      } finally {
        uploading.value = false;
      }
    };
    
    // Teknik sorgu gönder
    const submitTechnicalQuery = async () => {
      if (!technicalQuery.value.trim()) return;
      
      queryLoading.value = true;
      aiResponse.value = '';
      aiResponseReference.value = null;
      relatedDocuments.value = [];
      
      try {
        const result = await technicalService.submitQuery(technicalQuery.value);
        aiResponse.value = result.text;
        aiResponseReference.value = result.reference ? {
          name: result.reference,
          url: '#'
        } : null;
        
        // İlgili dokümanları al
        if (result.relatedDocIds && result.relatedDocIds.length > 0) {
          relatedDocuments.value = allDocuments.value.filter(doc => 
            result.relatedDocIds.includes(doc.id)
          );
        }
        
      } catch (error) {
        console.error('Teknik sorgu hatası:', error);
        toast.error('Sorgulama sırasında bir hata oluştu: ' + error.message);
      } finally {
        queryLoading.value = false;
      }
    };
    
    onMounted(() => {
      loadDocuments();
    });
    
    return {
      // Doküman listesi
      loading,
      documents,
      searchQuery,
      searchDocuments,
      
      // Doküman yükleme
      uploading,
      newDocument,
      handleFileSelected,
      openUploadModal,
      handleDocumentUpload,
      
      // Teknik sorgulama
      technicalQuery,
      queryLoading,
      aiResponse,
      aiResponseReference,
      relatedDocuments,
      submitTechnicalQuery
    };
  }
}
</script>

<style scoped>
.technical-module {
  padding: 1rem;
}

.card {
  margin-bottom: 1.5rem;
  box-shadow: var(--shadow);
}

.list-group-item {
  transition: all 0.2s;
}

.list-group-item:hover {
  background-color: var(--gray-100);
}

/* Mobil uyumlu düzenlemeler */
@media (max-width: 768px) {
  .technical-module {
    padding: 0.5rem;
  }
  
  .card-header {
    flex-direction: column;
    align-items: flex-start !important;
  }
  
  .card-header button {
    margin-top: 0.5rem;
  }
}
</style>