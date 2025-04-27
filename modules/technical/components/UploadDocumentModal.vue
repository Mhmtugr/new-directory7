<template>
  <div class="modal fade" id="uploadDocumentModalComponent" tabindex="-1" aria-labelledby="uploadDocumentModalLabel" aria-hidden="true" ref="modalRef">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="uploadDocumentModalLabel">Teknik Doküman Yükle</h5>
          <button type="button" class="btn-close" @click="closeModal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="uploadDocument">
            <div class="mb-3">
              <label for="documentFile" class="form-label">Doküman Seç</label>
              <input class="form-control" type="file" id="documentFile" @change="handleFileChange" required>
            </div>
            <div class="mb-3">
              <label for="documentName" class="form-label">Doküman Adı</label>
              <input type="text" class="form-control" id="documentName" v-model="documentData.name" required>
            </div>
            <div class="mb-3">
              <label for="documentType" class="form-label">Doküman Türü</label>
              <select class="form-select" id="documentType" v-model="documentData.type" required>
                <option value="" disabled>Seçiniz</option>
                <option value="manual">Kullanım Kılavuzu</option>
                <option value="datasheet">Veri Sayfası</option>
                <option value="drawing">Teknik Çizim</option>
                <option value="test_report">Test Raporu</option>
                <option value="certificate">Sertifika</option>
                <option value="other">Diğer</option>
              </select>
            </div>
             <div class="mb-3">
                <label for="documentTags" class="form-label">Etiketler (virgülle ayırın)</label>
                <input type="text" class="form-control" id="documentTags" v-model="documentData.tags">
             </div>
             <div class="mb-3">
                <label for="documentDescription" class="form-label">Açıklama</label>
                <textarea class="form-control" id="documentDescription" rows="3" v-model="documentData.description"></textarea>
             </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeModal">Kapat</button>
          <button type="button" class="btn btn-primary" @click="uploadDocument">Yükle</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { Modal } from 'bootstrap';
// import technicalService from '@/services/technical-service';

const emit = defineEmits(['close', 'document-uploaded']);

const modalRef = ref(null);
let modalInstance = null;
const selectedFile = ref(null);

const documentData = ref({
  name: '',
  type: '',
  tags: '',
  description: ''
});

onMounted(() => {
  if (modalRef.value) {
    modalInstance = new Modal(modalRef.value);
    // modalInstance.show(); // Gerekirse programatik olarak göster
  }
});

onBeforeUnmount(() => {
  modalInstance?.dispose();
});

const handleFileChange = (event) => {
  selectedFile.value = event.target.files[0];
  // Dosya adını otomatik doldur (opsiyonel)
  if (selectedFile.value && !documentData.value.name) {
    documentData.value.name = selectedFile.value.name.split('.').slice(0, -1).join('.');
  }
};

const closeModal = () => {
  modalInstance?.hide();
  resetForm();
  emit('close');
};

const resetForm = () => {
    documentData.value = {
        name: '',
        type: '',
        tags: '',
        description: ''
    };
    selectedFile.value = null;
    // Dosya input alanını sıfırlama (eğer gerekliyse)
    const fileInput = document.getElementById('documentFile');
    if (fileInput) fileInput.value = '';
};

const uploadDocument = async () => {
  if (!selectedFile.value) {
    alert('Lütfen bir doküman seçin.');
    return;
  }

  console.log('Uploading document:', documentData.value.name, selectedFile.value);

  const formData = new FormData();
  formData.append('file', selectedFile.value);
  formData.append('name', documentData.value.name);
  formData.append('type', documentData.value.type);
  formData.append('tags', documentData.value.tags);
  formData.append('description', documentData.value.description);

  try {
    // const uploadedDocument = await technicalService.uploadDocument(formData);
    // console.log('Document uploaded successfully:', uploadedDocument);
    // emit('document-uploaded', uploadedDocument);
    alert('Doküman başarıyla yüklendi (simülasyon).');
    closeModal();
  } catch (error) {
    console.error('Doküman yüklenemedi:', error);
    alert('Doküman yüklenirken bir hata oluştu.');
  }
};

</script>

<style scoped>
textarea {
    resize: vertical;
}
</style> 