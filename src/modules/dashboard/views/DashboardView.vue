<template>
  <div class="dashboard-view">
    <!-- Başlık ve Kullanıcı Dropdown (Header bileşenine taşınabilir) -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h2 class="mb-0">Genel Bakış</h2>
      <!-- Kullanıcı dropdown burada veya Header bileşeninde olabilir -->
    </div>

    <!-- İstatistik Kartları -->
    <div class="row mb-4">
      <div class="col-md-3">
        <div class="card">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="text-muted mb-2">Aktif Siparişler</h6>
                <h3 class="mb-0">24</h3> <!-- Dinamik veri -->
              </div>
              <div class="bg-primary bg-opacity-10 p-3 rounded">
                <i class="bi bi-file-earmark-text text-primary" style="font-size: 1.5rem;"></i>
              </div>
            </div>
            <div class="mt-3">
              <span class="text-success"><i class="bi bi-arrow-up"></i> 5.2%</span> <!-- Dinamik veri -->
              <span class="text-muted">geçen aya göre</span>
            </div>
          </div>
        </div>
      </div>
      <!-- Diğer 3 istatistik kartı -->
      <div class="col-md-3">
          <div class="card">
              <div class="card-body">
                  <div class="d-flex justify-content-between align-items-center">
                      <div>
                          <h6 class="text-muted mb-2">Devam Eden Üretim</h6>
                          <h3 class="mb-0">18</h3> <!-- Dinamik veri -->
                      </div>
                      <div class="bg-warning bg-opacity-10 p-3 rounded">
                          <i class="bi bi-gear text-warning" style="font-size: 1.5rem;"></i>
                      </div>
                  </div>
                  <div class="mt-3">
                      <span class="text-danger"><i class="bi bi-arrow-down"></i> 2.1%</span> <!-- Dinamik veri -->
                      <span class="text-muted">geçen aya göre</span>
                  </div>
              </div>
          </div>
      </div>
      <div class="col-md-3">
          <div class="card">
              <div class="card-body">
                  <div class="d-flex justify-content-between align-items-center">
                      <div>
                          <h6 class="text-muted mb-2">Geciken Siparişler</h6>
                          <h3 class="mb-0">3</h3> <!-- Dinamik veri -->
                      </div>
                      <div class="bg-danger bg-opacity-10 p-3 rounded">
                          <i class="bi bi-exclamation-triangle text-danger" style="font-size: 1.5rem;"></i>
                      </div>
                  </div>
                  <div class="mt-3">
                      <span class="text-success"><i class="bi bi-arrow-down"></i> 1.8%</span> <!-- Dinamik veri -->
                      <span class="text-muted">geçen aya göre</span>
                  </div>
              </div>
          </div>
      </div>
      <div class="col-md-3">
          <div class="card">
              <div class="card-body">
                  <div class="d-flex justify-content-between align-items-center">
                      <div>
                          <h6 class="text-muted mb-2">Tamamlanan Siparişler</h6>
                          <h3 class="mb-0">42</h3> <!-- Dinamik veri -->
                      </div>
                      <div class="bg-success bg-opacity-10 p-3 rounded">
                          <i class="bi bi-check-circle text-success" style="font-size: 1.5rem;"></i>
                      </div>
                  </div>
                  <div class="mt-3">
                      <span class="text-success"><i class="bi bi-arrow-up"></i> 8.7%</span> <!-- Dinamik veri -->
                      <span class="text-muted">geçen aya göre</span>
                  </div>
              </div>
          </div>
      </div>
    </div>

    <!-- Grafikler -->
    <div class="row">
      <div class="col-md-8">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Üretim Durumu</h5>
            <!-- Dropdown buraya eklenecek -->
          </div>
          <div class="card-body">
            <canvas id="productionChart" height="300"></canvas> <!-- Chart.js bileşeni olacak -->
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">Hücre Tipi Dağılımı</h5>
          </div>
          <div class="card-body">
            <canvas id="cellTypeChart" height="300"></canvas> <!-- Chart.js bileşeni olacak -->
          </div>
        </div>
      </div>
    </div>

    <!-- Listeler -->
    <div class="row mt-4">
      <div class="col-md-6">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Kritik Malzeme Durumu</h5>
            <router-link to="/materials" class="btn btn-sm btn-outline-primary">Tümünü Gör</router-link>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-hover">
                <thead>
                  <tr>
                    <th>Malzeme Kodu</th>
                    <th>Malzeme Adı</th>
                    <th>Stok</th>
                    <th>İhtiyaç</th>
                    <th>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  <!-- Dinamik veri -->
                  <tr class="material-critical">
                      <td>137998%</td>
                      <td>Siemens 7SR1003-1JA20-2DA0+ZY20 24VDC</td>
                      <td>2</td>
                      <td>8</td>
                      <td><span class="badge bg-danger">Kritik</span></td>
                  </tr>
                  <tr class="material-required">
                      <td>144866%</td>
                      <td>KAP-80/190-95 Akım Trafosu</td>
                      <td>3</td>
                      <td>5</td>
                      <td><span class="badge bg-warning">Eksik</span></td>
                  </tr>
                   <!-- Diğer satırlar -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Son Uyarılar</h5>
             <router-link to="/notifications" class="btn btn-sm btn-outline-primary">Tümünü Gör</router-link> <!-- Uyarılar sayfası -->
          </div>
          <div class="card-body">
            <div class="list-group">
              <!-- Dinamik veri -->
              <a href="#" class="list-group-item list-group-item-action border-danger border-start-0 border-end-0 border-top-0 border-3">
                  <div class="d-flex w-100 justify-content-between">
                      <h6 class="mb-1">Teslim Tarihi Gecikmesi</h6>
                      <small class="text-danger">1 saat önce</small>
                  </div>
                  <p class="mb-1">Sipariş No: #0424-1251 - RM 36 CB hücresinin mekanik montajı gecikiyor.</p>
                  <small class="text-muted">Mekanik Üretim Birimi</small>
              </a>
               <a href="#" class="list-group-item list-group-item-action border-warning border-start-0 border-end-0 border-top-0 border-3">
                  <div class="d-flex w-100 justify-content-between">
                      <h6 class="mb-1">Malzeme Eksikliği</h6>
                      <small class="text-warning">3 saat önce</small>
                  </div>
                  <p class="mb-1">Sipariş No: #0424-1245 için gerekli akım trafosu stokta yok.</p>
                  <small class="text-muted">Satın Alma Birimi</small>
              </a>
              <!-- Diğer uyarılar -->
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// import { ref, onMounted } from 'vue';
// import Chart from 'chart.js/auto'; // Chart.js import edilecek
// import apiService from '@/services/api-service'; // Veri çekmek için

// const dashboardData = ref(null);

// onMounted(async () => {
//   // Veri çekme ve grafik oluşturma işlemleri
//   // dashboardData.value = await apiService.getDashboardData();
//   // setupCharts();
// });

// const setupCharts = () => {
//   // Chart.js grafiklerini oluşturma mantığı
// };

</script>

<style scoped>
/* Dashboard özel stilleri */
.card-body i {
  font-size: 1.5rem;
}
</style> 