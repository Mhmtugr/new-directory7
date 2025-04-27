<template>
  <div class="planning-view">
    <div class="row">
      <div class="col-md-12">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Üretim Planlama Takvimi</h5>
            <!-- Zaman Aralığı Seçimi -->
            <div class="btn-group">
              <button class="btn btn-sm btn-outline-secondary" :class="{ active: calendarView === 'dayGridWeek' }" @click="changeCalendarView('dayGridWeek')">Haftalık</button>
              <button class="btn btn-sm btn-outline-secondary" :class="{ active: calendarView === 'dayGridMonth' }" @click="changeCalendarView('dayGridMonth')">Aylık</button>
              <!-- Diğer görünümler eklenebilir (Günlük vb.) -->
            </div>
          </div>
          <div class="card-body">
            <!-- FullCalendar Bileşeni Buraya Gelecek -->
            <div id="productionCalendarPlaceholder">
                 <p class="text-muted text-center">FullCalendar bileşeni buraya eklenecek.</p>
                 <!-- Örnek statik takvim görünümü -->
                 <div class="d-none">
                      <!-- Takvim HTML yapısı (basitleştirilmiş) -->
                 </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="row mt-4">
      <div class="col-md-6">
        <!-- Kapasite Planlama Kartı -->
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Kapasite Planlama</h5>
            <!-- Birim Filtreleme Dropdown -->
             <div class="dropdown">
                 <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" id="capacityUnitDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                     {{ selectedCapacityUnit || 'Tüm Birimler' }}
                 </button>
                 <ul class="dropdown-menu" aria-labelledby="capacityUnitDropdown">
                     <li><a class="dropdown-item" href="#" @click.prevent="selectCapacityUnit(null)">Tüm Birimler</a></li>
                     <li><a class="dropdown-item" href="#" @click.prevent="selectCapacityUnit('Elektrik Tasarım')">Elektrik Tasarım</a></li>
                     <!-- Diğer birimler -->
                 </ul>
             </div>
          </div>
          <div class="card-body">
            <canvas id="capacityChart" height="300"></canvas> <!-- Chart.js bileşeni -->
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <!-- Teslimat Tahminleri Kartı -->
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Teslimat Tahminleri</h5>
            <!-- Zaman Aralığı Dropdown -->
             <div class="dropdown">
                 <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" id="deliveryRangeDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                     {{ selectedDeliveryRange || 'Son 30 Gün' }}
                 </button>
                 <ul class="dropdown-menu" aria-labelledby="deliveryRangeDropdown">
                     <li><a class="dropdown-item" href="#" @click.prevent="selectDeliveryRange('Son 7 Gün')">Son 7 Gün</a></li>
                     <li><a class="dropdown-item" href="#" @click.prevent="selectDeliveryRange('Son 30 Gün')">Son 30 Gün</a></li>
                     <li><a class="dropdown-item" href="#" @click.prevent="selectDeliveryRange('Son 90 Gün')">Son 90 Gün</a></li>
                     <li><a class="dropdown-item" href="#" @click.prevent="selectDeliveryRange('Bu Yıl')">Bu Yıl</a></li>
                 </ul>
             </div>
          </div>
          <div class="card-body">
            <canvas id="deliveryChart" height="300"></canvas> <!-- Chart.js bileşeni -->
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
// import { Calendar } from '@fullcalendar/core';
// import dayGridPlugin from '@fullcalendar/daygrid';
// import interactionPlugin from '@fullcalendar/interaction'; // Gerekirse
// import Chart from 'chart.js/auto';
// import apiService from '@/services/api-service';

// const calendar = ref(null);
const calendarView = ref('dayGridWeek');
const selectedCapacityUnit = ref(null);
const selectedDeliveryRange = ref('Son 30 Gün');

// let capacityChartInstance = null;
// let deliveryChartInstance = null;

onMounted(async () => {
  // Veri çekme
  // const events = await apiService.getCalendarEvents();
  // const capacityData = await apiService.getCapacityData(selectedCapacityUnit.value);
  // const deliveryData = await apiService.getDeliveryData(selectedDeliveryRange.value);

  // Takvimi başlat
  // initializeCalendar(events);
  // Grafikleri başlat
  // setupCapacityChart(capacityData);
  // setupDeliveryChart(deliveryData);
});

// onBeforeUnmount(() => {
//   // Takvim ve grafik örneklerini temizle
//   if (calendar.value) {
//     calendar.value.destroy();
//   }
//   if (capacityChartInstance) {
//      capacityChartInstance.destroy();
//   }
//   if (deliveryChartInstance) {
//       deliveryChartInstance.destroy();
//   }
// });

// const initializeCalendar = (events) => {
//   const calendarEl = document.getElementById('productionCalendarPlaceholder');
//   if (!calendarEl) return;

//   calendar.value = new Calendar(calendarEl, {
//     plugins: [dayGridPlugin, interactionPlugin],
//     initialView: calendarView.value,
//     headerToolbar: {
//       left: 'prev,next today',
//       center: 'title',
//       right: 'dayGridMonth,dayGridWeek' // Butonlarla kontrol edildiği için kaldırılabilir
//     },
//     events: events || [
//       // Örnek eventler (R3/index.html'den)
//       { title: '#0424-1251 Mekanik Üretim', start: '2023-11-06', end: '2023-11-10', color: '#e74c3c' },
//       { title: '#0424-1245 Montaj', start: '2023-11-08', end: '2023-11-12', color: '#f39c12' },
//       { title: '#0424-1239 Test', start: '2023-11-13', end: '2023-11-15', color: '#27ae60' }
//     ],
//     // Diğer FullCalendar seçenekleri (editable, dateClick vb.)
//   });
//   calendar.value.render();
// };

const changeCalendarView = (view) => {
  calendarView.value = view;
  // if (calendar.value) {
  //   calendar.value.changeView(view);
  // }
};

const selectCapacityUnit = (unit) => {
    selectedCapacityUnit.value = unit;
    // Yeni veri çek ve grafiği güncelle: setupCapacityChart(await apiService.getCapacityData(unit));
}

const selectDeliveryRange = (range) => {
    selectedDeliveryRange.value = range;
    // Yeni veri çek ve grafiği güncelle: setupDeliveryChart(await apiService.getDeliveryData(range));
}

// const setupCapacityChart = (data) => {
//   const ctx = document.getElementById('capacityChart')?.getContext('2d');
//   if (!ctx) return;
//   if(capacityChartInstance) capacityChartInstance.destroy(); // Önceki grafiği temizle
//   capacityChartInstance = new Chart(ctx, {
//     type: 'bar', // Veya line
//     data: { /* API'den gelen veriye göre */ labels: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum'], datasets: [{ label: 'Kullanılan Kapasite (%)', data: [60, 75, 80, 65, 70], backgroundColor: 'rgba(52, 152, 219, 0.6)' }] },
//     options: { /* Chart.js seçenekleri */ }
//   });
// };

// const setupDeliveryChart = (data) => {
//   const ctx = document.getElementById('deliveryChart')?.getContext('2d');
//   if (!ctx) return;
//    if(deliveryChartInstance) deliveryChartInstance.destroy(); // Önceki grafiği temizle
//   deliveryChartInstance = new Chart(ctx, {
//     type: 'line',
//     data: { /* API'den gelen veriye göre */ labels: ['Hafta 1', 'Hafta 2', 'Hafta 3', 'Hafta 4'], datasets: [{ label: 'Teslim Edilen Sipariş', data: [8, 10, 12, 9], borderColor: '#27ae60' }] },
//     options: { /* Chart.js seçenekleri */ }
//   });
// };

</script>

<style scoped>
/* Planlama görünümü özel stilleri */
#productionCalendarPlaceholder {
    min-height: 500px; /* Takvim yüklenene kadar yer tutucu */
}
</style> 