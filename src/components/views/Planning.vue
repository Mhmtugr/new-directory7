<template>
  <div class="planning-module">
    <div class="row mb-4">
      <div class="col-12">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Üretim Takvimi</h5>
            <div class="btn-group" role="group">
              <button type="button" class="btn btn-sm btn-outline-primary active">Günlük</button>
              <button type="button" class="btn btn-sm btn-outline-primary">Haftalık</button>
              <button type="button" class="btn btn-sm btn-outline-primary">Aylık</button>
            </div>
          </div>
          <div class="card-body">
            <div class="calendar-container" :class="{ 'loading': loading }">
              <div v-if="loading" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">Yükleniyor...</span>
                </div>
                <p class="mt-2">Planlama verileri yükleniyor...</p>
              </div>
              <div v-else-if="schedule.length === 0" class="text-center py-4">
                <p class="text-muted">Planlanmış üretim bulunmuyor.</p>
              </div>
              <div v-else id="productionCalendar">
                <!-- Takvim içeriği buraya yüklenecek -->
                <ul class="list-group">
                  <li v-for="task in sortedSchedule" :key="task.id" class="list-group-item">
                    <strong>{{ task.taskName }}</strong><br>
                    <small>Başlangıç: {{ formatDate(task.start) }}</small><br>
                    <small>Bitiş: {{ formatDate(task.end) }}</small>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <!-- Kapasite Yönetimi -->
      <div class="col-md-6">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Kapasite Kullanımı</h5>
            <div class="dropdown">
              <button class="btn btn-sm btn-outline-secondary dropdown-toggle" 
                      type="button" 
                      id="capacityDropdown" 
                      data-bs-toggle="dropdown" 
                      aria-expanded="false">
                {{ selectedUnit ? selectedUnit.name : 'Tüm Birimler' }}
              </button>
              <ul class="dropdown-menu" aria-labelledby="capacityDropdown">
                <li>
                  <a class="dropdown-item" href="#" @click.prevent="selectUnit(null)">
                    Tüm Birimler
                  </a>
                </li>
                <li v-for="unit in productionUnits" :key="unit.id">
                  <a class="dropdown-item" href="#" @click.prevent="selectUnit(unit)">
                    {{ unit.name }}
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div class="card-body">
            <div class="chart-container" style="height: 300px; position: relative;">
              <canvas ref="capacityChart"></canvas>
            </div>
          </div>
        </div>
      </div>

      <!-- Teslimat Tahminleri -->
      <div class="col-md-6">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Teslimat Tahminleri</h5>
            <div class="dropdown">
              <button class="btn btn-sm btn-outline-secondary dropdown-toggle" 
                      type="button" 
                      id="deliveryDropdown" 
                      data-bs-toggle="dropdown" 
                      aria-expanded="false">
                {{ timePeriodLabel }}
              </button>
              <ul class="dropdown-menu" aria-labelledby="deliveryDropdown">
                <li v-for="(label, period) in timePeriods" :key="period">
                  <a class="dropdown-item" href="#" @click.prevent="selectTimePeriod(period)">
                    {{ label }}
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div class="card-body">
            <div class="chart-container" style="height: 300px; position: relative;">
              <canvas ref="deliveryChart"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useStore } from 'pinia';
import { usePlanningStore } from '@/store/planning';
import Chart from 'chart.js/auto';

export default {
  name: 'Planning',
  setup() {
    // Store
    const planningStore = usePlanningStore();
    
    // Refs for DOM elements
    const capacityChart = ref(null);
    const deliveryChart = ref(null);
    
    // Charts instances
    let capacityChartInstance = null;
    let deliveryChartInstance = null;
    
    // State
    const loading = ref(true);
    const selectedUnit = ref(null);
    const selectedPeriod = ref('30d');
    const timePeriods = {
      '7d': 'Son 7 Gün',
      '30d': 'Son 30 Gün',
      '90d': 'Son 90 Gün',
      '1y': 'Bu Yıl'
    };

    // Computed
    const timePeriodLabel = computed(() => timePeriods[selectedPeriod.value]);
    const productionUnits = computed(() => planningStore.productionUnits);
    const capacityLoad = computed(() => planningStore.capacityLoad);
    const schedule = computed(() => planningStore.schedule);
    const deliveryEstimates = computed(() => planningStore.deliveryEstimates);
    const sortedSchedule = computed(() => {
      return [...schedule.value].sort((a, b) => new Date(a.start) - new Date(b.start));
    });

    // Methods
    const loadData = async () => {
      loading.value = true;
      try {
        await planningStore.fetchPlanningData();
      } catch (error) {
        console.error('Planlama verileri yüklenemedi:', error);
      } finally {
        loading.value = false;
      }
    };

    const formatDate = (date) => {
      return new Date(date).toLocaleString('tr-TR');
    };

    const selectUnit = (unit) => {
      selectedUnit.value = unit;
      renderCapacityChart();
    };

    const selectTimePeriod = (period) => {
      selectedPeriod.value = period;
      renderDeliveryChart();
    };

    const renderCapacityChart = () => {
      if (!capacityChart.value || !productionUnits.value.length) return;

      nextTick(() => {
        const ctx = capacityChart.value.getContext('2d');
        
        if (capacityChartInstance) {
          capacityChartInstance.destroy();
        }

        // Filter units if needed
        const unitsToRender = selectedUnit.value 
          ? [selectedUnit.value] 
          : productionUnits.value;
        
        // Prepare chart data
        const labels = unitsToRender.map(unit => unit.name);
        const data = unitsToRender.map(unit => {
          const load = capacityLoad.value[unit.id] || 0;
          const capacity = unit.capacity || 1;
          return Math.min(100, (load / capacity) * 100);
        });

        // Set colors based on load percentage
        const backgroundColors = unitsToRender.map(unit => {
          const load = capacityLoad.value[unit.id] || 0;
          const capacity = unit.capacity || 1;
          const percentage = load / capacity;
          
          if (percentage > 0.9) return 'rgba(255, 99, 132, 0.6)'; // Kırmızı (>90%)
          if (percentage > 0.7) return 'rgba(255, 206, 86, 0.6)'; // Sarı (>70%)
          return 'rgba(75, 192, 192, 0.6)'; // Yeşil/Mavi
        });

        const borderColors = backgroundColors.map(color => color.replace('0.6', '1'));

        // Create chart
        capacityChartInstance = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [{
              label: 'Haftalık Kapasite Kullanım Yüzdesi (%)',
              data: data,
              backgroundColor: backgroundColors,
              borderColor: borderColors,
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                max: 100,
                title: {
                  display: true,
                  text: 'Kullanım Oranı (%)'
                }
              }
            },
            plugins: {
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const unitName = context.label;
                    const unit = productionUnits.value.find(u => u.name === unitName);
                    const load = capacityLoad.value[unit?.id] || 0;
                    
                    let label = context.dataset.label || '';
                    if (label) label += ': ';
                    
                    if (context.parsed.y !== null) {
                      label += context.parsed.y.toFixed(1) + '%';
                      if (unit) {
                        label += ` (${load.toFixed(1)} / ${unit.capacity} saat)`;
                      }
                    }
                    return label;
                  }
                }
              }
            }
          }
        });
      });
    };
    
    const renderDeliveryChart = () => {
      if (!deliveryChart.value || !deliveryEstimates.value.length) return;
      
      nextTick(() => {
        const ctx = deliveryChart.value.getContext('2d');
        
        if (deliveryChartInstance) {
          deliveryChartInstance.destroy();
        }
        
        // Prepare time range based on selected period
        const today = new Date();
        const startDate = new Date();
        
        switch (selectedPeriod.value) {
          case '7d':
            startDate.setDate(today.getDate() - 7);
            break;
          case '90d':
            startDate.setDate(today.getDate() - 90);
            break;
          case '1y':
            startDate.setFullYear(today.getFullYear() - 1);
            break;
          default: // 30d
            startDate.setDate(today.getDate() - 30);
        }
        
        // Group data by date
        const countsByDate = {};
        deliveryEstimates.value.forEach(delivery => {
          const deliveryDate = new Date(delivery.estimatedDeliveryDate);
          if (deliveryDate >= startDate && deliveryDate <= today) {
            const dateStr = deliveryDate.toISOString().split('T')[0]; // YYYY-MM-DD
            countsByDate[dateStr] = (countsByDate[dateStr] || 0) + 1;
          }
        });
        
        // Generate labels and data for chart
        const labels = [];
        const data = [];
        let currentDate = new Date(startDate);
        
        while (currentDate <= today) {
          const dateStr = currentDate.toISOString().split('T')[0];
          labels.push(dateStr);
          data.push(countsByDate[dateStr] || 0);
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Create chart
        deliveryChartInstance = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: `Günlük Tahmini Teslimat Sayısı (${timePeriodLabel.value})`,
              data: data,
              borderColor: 'rgb(75, 192, 192)',
              tension: 0.1,
              fill: false
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Teslimat Sayısı'
                }
              },
              x: {
                title: {
                  display: true,
                  text: 'Tarih'
                }
              }
            }
          }
        });
      });
    };

    // Watch for data changes
    watch(capacityLoad, renderCapacityChart);
    watch(deliveryEstimates, renderDeliveryChart);
    
    // Lifecycle hooks
    onMounted(() => {
      loadData().then(() => {
        renderCapacityChart();
        renderDeliveryChart();
      });
    });

    return {
      loading,
      productionUnits,
      schedule,
      sortedSchedule,
      selectedUnit,
      selectedPeriod,
      timePeriods,
      timePeriodLabel,
      capacityChart,
      deliveryChart,
      formatDate,
      selectUnit,
      selectTimePeriod
    };
  }
}
</script>

<style scoped>
.planning-module {
  padding: 1rem;
}

.card {
  margin-bottom: 1.5rem;
  box-shadow: var(--shadow);
}

.calendar-container {
  min-height: 300px;
}

.calendar-container.loading {
  opacity: 0.6;
}

.chart-container {
  position: relative;
  height: 300px;

/* Mobil uyumlu düzenlemeler */
@media (max-width: 768px) {
  .planning-module {
    padding: 0.5rem;
  }
  
  .card-header {
    flex-direction: column;
    align-items: flex-start !important;
  }
  
  .card-header .btn-group,
  .card-header .dropdown {
    margin-top: 0.5rem;
  }
}
</style>