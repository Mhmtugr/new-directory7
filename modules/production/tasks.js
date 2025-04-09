/**
 * Günlük Görev Yönetimi Modülü
 * Orta Gerilim Hücre Üretim Takip Sistemi
 */

// Task verileri için yapı
class TaskManager {
    constructor() {
        this.tasks = [];
        this.statuses = ['pending', 'in-progress', 'completed', 'delayed', 'cancelled'];
        this.departments = [
            'Elektrik Tasarım', 'Mekanik Tasarım', 'Satın Alma', 
            'Mekanik Üretim', 'İç Montaj', 'Kablaj', 'Genel Montaj', 'Test'
        ];
    }

    // LocalStorage'dan görevleri yükle
    loadTasks() {
        const savedTasks = localStorage.getItem('mets_tasks');
        if (savedTasks) {
            try {
                this.tasks = JSON.parse(savedTasks);
            } catch (e) {
                console.error('Görevler yüklenirken hata:', e);
                this.tasks = [];
            }
        }
        
        // İlk kez çalıştırılıyorsa örnek görevleri ekle
        if (this.tasks.length === 0) {
            this.addSampleTasks();
        }
        
        return this.tasks;
    }

    // Görevleri LocalStorage'a kaydet
    saveTasks() {
        localStorage.setItem('mets_tasks', JSON.stringify(this.tasks));
    }

    // Örnek görevler ekle (ilk çalıştırma için)
    addSampleTasks() {
        const sampleTasks = [
            {
                id: 'TSK-001',
                orderId: '#0424-1251',
                stage: 'Mekanik Üretim',
                responsible: 'Ahmet Yılmaz',
                plannedTime: '8 saat',
                status: 'in-progress',
                progress: 60,
                delayReason: 'Malzeme tedarik gecikmesi',
                overtime: 2,
                createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 gün önce
                dueDate: new Date(Date.now() + 86400000).toISOString() // 1 gün sonra
            },
            {
                id: 'TSK-002',
                orderId: '#0424-1245',
                stage: 'Elektrik Montaj',
                responsible: 'Mehmet Demir',
                plannedTime: '6 saat',
                status: 'completed',
                progress: 100,
                delayReason: '',
                overtime: 0,
                createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 gün önce
                dueDate: new Date(Date.now() - 86400000).toISOString() // 1 gün önce (tamamlandı)
            },
            {
                id: 'TSK-003',
                orderId: '#0424-1239',
                stage: 'Kablaj',
                responsible: 'Fatma Şahin',
                plannedTime: '4 saat',
                status: 'pending',
                progress: 0,
                delayReason: '',
                overtime: 0,
                createdAt: new Date(Date.now() - 43200000).toISOString(), // 12 saat önce
                dueDate: new Date(Date.now() + 172800000).toISOString() // 2 gün sonra
            }
        ];

        this.tasks = sampleTasks;
        this.saveTasks();
    }

    // Görev ekle
    addTask(task) {
        // Yeni ID oluştur
        const newId = `TSK-${String(this.tasks.length + 1).padStart(3, '0')}`;
        
        // Eksik alanları varsayılanlarla doldur
        const newTask = {
            id: newId,
            createdAt: new Date().toISOString(),
            progress: 0,
            delayReason: '',
            overtime: 0,
            ...task
        };
        
        this.tasks.push(newTask);
        this.saveTasks();
        
        return newTask;
    }

    // Görev güncelle
    updateTask(taskId, updates) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return null;
        
        // Görev nesnesini güncelle
        this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...updates };
        this.saveTasks();
        
        return this.tasks[taskIndex];
    }

    // Görev sil
    deleteTask(taskId) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return false;
        
        this.tasks.splice(taskIndex, 1);
        this.saveTasks();
        
        return true;
    }

    // Görev durumu güncelle
    updateTaskStatus(taskId, newStatus, delayReason = '') {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return null;
        
        // Durumu güncelle
        this.tasks[taskIndex].status = newStatus;
        
        // Eğer gecikme sebebi belirtildiyse onu da güncelle
        if (newStatus === 'delayed' && delayReason) {
            this.tasks[taskIndex].delayReason = delayReason;
        }
        
        // Tamamlandı durumuna geçtiyse ilerlemeyi %100 yap
        if (newStatus === 'completed') {
            this.tasks[taskIndex].progress = 100;
        }
        
        this.saveTasks();
        
        return this.tasks[taskIndex];
    }

    // İlerleme güncelle
    updateTaskProgress(taskId, progress) {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return null;
        
        // İlerlemeyi güncelle
        this.tasks[taskIndex].progress = progress;
        
        // İlerleme 100 ise durumu tamamlandı olarak güncelle
        if (progress >= 100) {
            this.tasks[taskIndex].status = 'completed';
        }
        
        this.saveTasks();
        
        return this.tasks[taskIndex];
    }

    // Görevleri filtrele
    filterTasks(filters = {}) {
        let filteredTasks = [...this.tasks];
        
        // Sipariş numarasına göre filtrele
        if (filters.orderId) {
            filteredTasks = filteredTasks.filter(t => t.orderId === filters.orderId);
        }
        
        // Duruma göre filtrele
        if (filters.status) {
            filteredTasks = filteredTasks.filter(t => t.status === filters.status);
        }
        
        // Sorumluya göre filtrele
        if (filters.responsible) {
            filteredTasks = filteredTasks.filter(t => t.responsible === filters.responsible);
        }
        
        // Aşamaya göre filtrele
        if (filters.stage) {
            filteredTasks = filteredTasks.filter(t => t.stage === filters.stage);
        }
        
        return filteredTasks;
    }

    // İstatistikleri hesapla
    calculateStats() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(t => t.status === 'completed').length;
        const inProgressTasks = this.tasks.filter(t => t.status === 'in-progress').length;
        const pendingTasks = this.tasks.filter(t => t.status === 'pending').length;
        const delayedTasks = this.tasks.filter(t => t.status === 'delayed').length;
        
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        // Sipariş bazlı istatistikler
        const orderStats = {};
        this.tasks.forEach(task => {
            if (!orderStats[task.orderId]) {
                orderStats[task.orderId] = {
                    total: 0,
                    completed: 0,
                    delayed: 0
                };
            }
            
            orderStats[task.orderId].total++;
            if (task.status === 'completed') orderStats[task.orderId].completed++;
            if (task.status === 'delayed') orderStats[task.orderId].delayed++;
        });
        
        return {
            total: totalTasks,
            completed: completedTasks,
            inProgress: inProgressTasks,
            pending: pendingTasks,
            delayed: delayedTasks,
            completionRate: completionRate,
            orderStats: orderStats
        };
    }
}

// UI için yardımcı fonksiyonlar
const TaskUI = {
    // Tablo satirini oluştur
    createTaskRow(task) {
        const row = document.createElement('tr');
        row.dataset.taskId = task.id;
        
        // Hücre durum sınıfı ekle
        if (task.status === 'delayed') {
            row.classList.add('table-danger');
        } else if (task.status === 'completed') {
            row.classList.add('table-success');
        } else if (task.status === 'in-progress') {
            row.classList.add('table-warning');
        }
        
        row.innerHTML = `
            <td>${task.id}</td>
            <td>${task.orderId}</td>
            <td>${task.stage}</td>
            <td>${task.responsible}</td>
            <td>${task.plannedTime}</td>
            <td>
                <span class="badge ${this.getStatusBadgeClass(task.status)}">${this.getStatusText(task.status)}</span>
            </td>
            <td>
                <div class="progress" style="height: 6px;">
                    <div class="progress-bar ${this.getProgressBarClass(task.status)}" 
                         role="progressbar" style="width: ${task.progress}%"></div>
                </div>
                <div class="small text-muted text-end">${task.progress}%</div>
            </td>
            <td>${task.delayReason || '-'}</td>
            <td>${task.overtime > 0 ? `${task.overtime} saat` : '-'}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button type="button" class="btn btn-outline-primary edit-task-btn" title="Düzenle">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button type="button" class="btn btn-outline-success update-progress-btn" title="İlerleme Güncelle" 
                            ${task.status === 'completed' ? 'disabled' : ''}>
                        <i class="bi bi-graph-up"></i>
                    </button>
                    <button type="button" class="btn btn-outline-danger delete-task-btn" title="Sil">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        // Butonlara event dinleyicileri ekle
        row.querySelector('.edit-task-btn').addEventListener('click', () => {
            this.showEditTaskModal(task);
        });
        
        row.querySelector('.update-progress-btn').addEventListener('click', () => {
            this.showUpdateProgressModal(task);
        });
        
        row.querySelector('.delete-task-btn').addEventListener('click', () => {
            this.showDeleteTaskConfirmation(task);
        });
        
        return row;
    },
    
    // Durum badge sınıfı
    getStatusBadgeClass(status) {
        switch (status) {
            case 'completed': return 'bg-success';
            case 'in-progress': return 'bg-warning text-dark';
            case 'pending': return 'bg-info text-dark';
            case 'delayed': return 'bg-danger';
            case 'cancelled': return 'bg-secondary';
            default: return 'bg-secondary';
        }
    },
    
    // Durum metni
    getStatusText(status) {
        switch (status) {
            case 'completed': return 'Tamamlandı';
            case 'in-progress': return 'Devam Ediyor';
            case 'pending': return 'Bekliyor';
            case 'delayed': return 'Gecikti';
            case 'cancelled': return 'İptal Edildi';
            default: return status;
        }
    },
    
    // İlerleme çubuğu sınıfı
    getProgressBarClass(status) {
        switch (status) {
            case 'completed': return 'bg-success';
            case 'in-progress': return 'bg-warning';
            case 'delayed': return 'bg-danger';
            default: return 'bg-info';
        }
    },
    
    // İstatistik kartını güncelle
    updateStatsCard(stats) {
        const container = document.getElementById('taskStats');
        if (!container) return;
        
        container.innerHTML = `
            <div class="row text-center">
                <div class="col-md-2 col-sm-4 mb-3">
                    <div class="card">
                        <div class="card-body py-2">
                            <h3 class="card-title mb-0">${stats.total}</h3>
                            <p class="card-text small text-muted mb-0">Toplam Görev</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-2 col-sm-4 mb-3">
                    <div class="card">
                        <div class="card-body py-2">
                            <h3 class="card-title mb-0">${stats.completed}</h3>
                            <p class="card-text small text-muted mb-0">Tamamlanan</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-2 col-sm-4 mb-3">
                    <div class="card">
                        <div class="card-body py-2">
                            <h3 class="card-title mb-0">${stats.inProgress}</h3>
                            <p class="card-text small text-muted mb-0">Devam Eden</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-2 col-sm-4 mb-3">
                    <div class="card">
                        <div class="card-body py-2">
                            <h3 class="card-title mb-0">${stats.pending}</h3>
                            <p class="card-text small text-muted mb-0">Bekleyen</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-2 col-sm-4 mb-3">
                    <div class="card">
                        <div class="card-body py-2">
                            <h3 class="card-title mb-0">${stats.delayed}</h3>
                            <p class="card-text small text-muted mb-0">Geciken</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-2 col-sm-4 mb-3">
                    <div class="card">
                        <div class="card-body py-2">
                            <h3 class="card-title mb-0">${stats.completionRate}%</h3>
                            <p class="card-text small text-muted mb-0">Tamamlama Oranı</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    // Yeni görev modalını göster
    showAddTaskModal() {
        // Modal içeriği oluştur
        const modalHTML = `
            <div class="modal fade" id="addTaskModal" tabindex="-1" aria-labelledby="addTaskModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="addTaskModalLabel">Yeni Görev Ekle</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="addTaskForm">
                                <div class="mb-3">
                                    <label for="orderId" class="form-label">Sipariş No</label>
                                    <select class="form-select" id="orderId" required>
                                        <option value="" selected disabled>Sipariş Seçin</option>
                                        <option value="#0424-1251">#0424-1251 (AYEDAŞ)</option>
                                        <option value="#0424-1245">#0424-1245 (TEİAŞ)</option>
                                        <option value="#0424-1239">#0424-1239 (BEDAŞ)</option>
                                        <option value="#0424-1235">#0424-1235 (OSMANİYE ELEKTRİK)</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="stage" class="form-label">Aşama</label>
                                    <select class="form-select" id="stage" required>
                                        <option value="" selected disabled>Aşama Seçin</option>
                                        <option value="Elektrik Tasarım">Elektrik Tasarım</option>
                                        <option value="Mekanik Tasarım">Mekanik Tasarım</option>
                                        <option value="Satın Alma">Satın Alma</option>
                                        <option value="Mekanik Üretim">Mekanik Üretim</option>
                                        <option value="İç Montaj">İç Montaj</option>
                                        <option value="Kablaj">Kablaj</option>
                                        <option value="Genel Montaj">Genel Montaj</option>
                                        <option value="Test">Test</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="responsible" class="form-label">Sorumlu</label>
                                    <select class="form-select" id="responsible" required>
                                        <option value="" selected disabled>Sorumlu Seçin</option>
                                        <option value="Ahmet Yılmaz">Ahmet Yılmaz</option>
                                        <option value="Mehmet Demir">Mehmet Demir</option>
                                        <option value="Fatma Şahin">Fatma Şahin</option>
                                        <option value="Ayşe Kaya">Ayşe Kaya</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="plannedTime" class="form-label">Planlanan Süre</label>
                                    <div class="input-group">
                                        <input type="number" class="form-control" id="plannedTimeValue" min="1" value="4" required>
                                        <span class="input-group-text">saat</span>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="status" class="form-label">Durum</label>
                                    <select class="form-select" id="status" required>
                                        <option value="pending" selected>Bekliyor</option>
                                        <option value="in-progress">Devam Ediyor</option>
                                        <option value="completed">Tamamlandı</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="dueDate" class="form-label">Bitiş Tarihi</label>
                                    <input type="datetime-local" class="form-control" id="dueDate" required>
                                </div>
                                <div class="mb-3 d-none" id="progressGroup">
                                    <label for="progress" class="form-label">İlerleme (%)</label>
                                    <input type="range" class="form-range" id="progress" min="0" max="100" step="5" value="0">
                                    <div class="text-center" id="progressValue">0%</div>
                                </div>
                                <div class="mb-3 d-none" id="delayReasonGroup">
                                    <label for="delayReason" class="form-label">Gecikme Nedeni</label>
                                    <select class="form-select" id="delayReason">
                                        <option value="" selected disabled>Neden Seçin</option>
                                        <option value="Malzeme tedarik gecikmesi">Malzeme tedarik gecikmesi</option>
                                        <option value="Personel eksikliği">Personel eksikliği</option>
                                        <option value="Teknik sorunlar">Teknik sorunlar</option>
                                        <option value="Tasarım değişikliği">Tasarım değişikliği</option>
                                        <option value="Öncelik değişimi">Öncelik değişimi</option>
                                        <option value="Diğer">Diğer</option>
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">İptal</button>
                            <button type="button" class="btn btn-primary" id="saveTaskBtn">Kaydet</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Modal'ı sayfaya ekle
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Modal nesnesini oluştur
        const modal = new bootstrap.Modal(document.getElementById('addTaskModal'));
        
        // Durum değişikliğinde ilgili alanları göster/gizle
        document.getElementById('status').addEventListener('change', function() {
            const progressGroup = document.getElementById('progressGroup');
            const delayReasonGroup = document.getElementById('delayReasonGroup');
            
            if (this.value === 'in-progress' || this.value === 'completed') {
                progressGroup.classList.remove('d-none');
            } else {
                progressGroup.classList.add('d-none');
            }
            
            if (this.value === 'delayed') {
                delayReasonGroup.classList.remove('d-none');
            } else {
                delayReasonGroup.classList.add('d-none');
            }
            
            // Tamamlandıysa ilerleme %100 yap
            if (this.value === 'completed') {
                document.getElementById('progress').value = 100;
                document.getElementById('progressValue').textContent = '100%';
            }
        });
        
        // İlerleme değeri değişince metin güncelle
        document.getElementById('progress').addEventListener('input', function() {
            document.getElementById('progressValue').textContent = `${this.value}%`;
        });
        
        // Duedate alanını bugüne ayarla
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(tomorrow.getHours() + 4);
        const tomorrowStr = tomorrow.toISOString().slice(0, 16);
        document.getElementById('dueDate').value = tomorrowStr;
        
        // Modal'ı göster
        modal.show();
        
        // Kaydet butonuna click event ekle
        document.getElementById('saveTaskBtn').addEventListener('click', function() {
            // Form verilerini al
            const orderId = document.getElementById('orderId').value;
            const stage = document.getElementById('stage').value;
            const responsible = document.getElementById('responsible').value;
            const plannedTimeValue = document.getElementById('plannedTimeValue').value;
            const status = document.getElementById('status').value;
            const dueDate = document.getElementById('dueDate').value;
            const progress = document.getElementById('progress').value;
            const delayReason = document.getElementById('delayReason')?.value;
            
            // Temel validasyon
            if (!orderId || !stage || !responsible || !plannedTimeValue || !status || !dueDate) {
                alert('Lütfen tüm zorunlu alanları doldurun.');
                return;
            }
            
            // Görev nesnesini oluştur
            const newTask = {
                orderId,
                stage,
                responsible,
                plannedTime: `${plannedTimeValue} saat`,
                status,
                dueDate: new Date(dueDate).toISOString(),
                progress: parseInt(progress) || 0,
                delayReason: delayReason || '',
                overtime: 0
            };
            
            // Görev ekleme olayını tetikle
            const event = new CustomEvent('task:add', { detail: newTask });
            document.dispatchEvent(event);
            
            // Modal'ı kapat
            modal.hide();
            document.getElementById('addTaskModal').remove();
        });
        
        // Modal kapatıldığında temizlik yap
        document.getElementById('addTaskModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    },
    
    // Düzenleme modalını göster
    showEditTaskModal(task) {
        // Modal içeriği oluştur
        const modalHTML = `
            <div class="modal fade" id="editTaskModal" tabindex="-1" aria-labelledby="editTaskModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="editTaskModalLabel">Görevi Düzenle - ${task.id}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editTaskForm">
                                <input type="hidden" id="taskId" value="${task.id}">
                                <div class="mb-3">
                                    <label for="orderId" class="form-label">Sipariş No</label>
                                    <select class="form-select" id="orderId" required>
                                        <option value="#0424-1251" ${task.orderId === '#0424-1251' ? 'selected' : ''}>#0424-1251 (AYEDAŞ)</option>
                                        <option value="#0424-1245" ${task.orderId === '#0424-1245' ? 'selected' : ''}>#0424-1245 (TEİAŞ)</option>
                                        <option value="#0424-1239" ${task.orderId === '#0424-1239' ? 'selected' : ''}>#0424-1239 (BEDAŞ)</option>
                                        <option value="#0424-1235" ${task.orderId === '#0424-1235' ? 'selected' : ''}>#0424-1235 (OSMANİYE ELEKTRİK)</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="stage" class="form-label">Aşama</label>
                                    <select class="form-select" id="stage" required>
                                        <option value="Elektrik Tasarım" ${task.stage === 'Elektrik Tasarım' ? 'selected' : ''}>Elektrik Tasarım</option>
                                        <option value="Mekanik Tasarım" ${task.stage === 'Mekanik Tasarım' ? 'selected' : ''}>Mekanik Tasarım</option>
                                        <option value="Satın Alma" ${task.stage === 'Satın Alma' ? 'selected' : ''}>Satın Alma</option>
                                        <option value="Mekanik Üretim" ${task.stage === 'Mekanik Üretim' ? 'selected' : ''}>Mekanik Üretim</option>
                                        <option value="İç Montaj" ${task.stage === 'İç Montaj' ? 'selected' : ''}>İç Montaj</option>
                                        <option value="Kablaj" ${task.stage === 'Kablaj' ? 'selected' : ''}>Kablaj</option>
                                        <option value="Genel Montaj" ${task.stage === 'Genel Montaj' ? 'selected' : ''}>Genel Montaj</option>
                                        <option value="Test" ${task.stage === 'Test' ? 'selected' : ''}>Test</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="responsible" class="form-label">Sorumlu</label>
                                    <select class="form-select" id="responsible" required>
                                        <option value="Ahmet Yılmaz" ${task.responsible === 'Ahmet Yılmaz' ? 'selected' : ''}>Ahmet Yılmaz</option>
                                        <option value="Mehmet Demir" ${task.responsible === 'Mehmet Demir' ? 'selected' : ''}>Mehmet Demir</option>
                                        <option value="Fatma Şahin" ${task.responsible === 'Fatma Şahin' ? 'selected' : ''}>Fatma Şahin</option>
                                        <option value="Ayşe Kaya" ${task.responsible === 'Ayşe Kaya' ? 'selected' : ''}>Ayşe Kaya</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="plannedTime" class="form-label">Planlanan Süre</label>
                                    <div class="input-group">
                                        <input type="number" class="form-control" id="plannedTimeValue" min="1" value="${task.plannedTime.split(' ')[0]}" required>
                                        <span class="input-group-text">saat</span>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="status" class="form-label">Durum</label>
                                    <select class="form-select" id="status" required>
                                        <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>Bekliyor</option>
                                        <option value="in-progress" ${task.status === 'in-progress' ? 'selected' : ''}>Devam Ediyor</option>
                                        <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Tamamlandı</option>
                                        <option value="delayed" ${task.status === 'delayed' ? 'selected' : ''}>Gecikti</option>
                                        <option value="cancelled" ${task.status === 'cancelled' ? 'selected' : ''}>İptal Edildi</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="dueDate" class="form-label">Bitiş Tarihi</label>
                                    <input type="datetime-local" class="form-control" id="dueDate" value="${new Date(task.dueDate).toISOString().slice(0, 16)}" required>
                                </div>
                                <div class="mb-3 ${task.status === 'in-progress' || task.status === 'completed' ? '' : 'd-none'}" id="progressGroup">
                                    <label for="progress" class="form-label">İlerleme (%)</label>
                                    <input type="range" class="form-range" id="progress" min="0" max="100" step="5" value="${task.progress}">
                                    <div class="text-center" id="progressValue">${task.progress}%</div>
                                </div>
                                <div class="mb-3 ${task.status === 'delayed' ? '' : 'd-none'}" id="delayReasonGroup">
                                    <label for="delayReason" class="form-label">Gecikme Nedeni</label>
                                    <select class="form-select" id="delayReason">
                                        <option value="" ${!task.delayReason ? 'selected' : ''} disabled>Neden Seçin</option>
                                        <option value="Malzeme tedarik gecikmesi" ${task.delayReason === 'Malzeme tedarik gecikmesi' ? 'selected' : ''}>Malzeme tedarik gecikmesi</option>
                                        <option value="Personel eksikliği" ${task.delayReason === 'Personel eksikliği' ? 'selected' : ''}>Personel eksikliği</option>
                                        <option value="Teknik sorunlar" ${task.delayReason === 'Teknik sorunlar' ? 'selected' : ''}>Teknik sorunlar</option>
                                        <option value="Tasarım değişikliği" ${task.delayReason === 'Tasarım değişikliği' ? 'selected' : ''}>Tasarım değişikliği</option>
                                        <option value="Öncelik değişimi" ${task.delayReason === 'Öncelik değişimi' ? 'selected' : ''}>Öncelik değişimi</option>
                                        <option value="Diğer" ${task.delayReason === 'Diğer' ? 'selected' : ''}>Diğer</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="overtime" class="form-label">Ek Mesai (saat)</label>
                                    <input type="number" class="form-control" id="overtime" min="0" value="${task.overtime || 0}">
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">İptal</button>
                            <button type="button" class="btn btn-primary" id="updateTaskBtn">Güncelle</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Modal'ı sayfaya ekle
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Modal nesnesini oluştur
        const modal = new bootstrap.Modal(document.getElementById('editTaskModal'));
        
        // Durum değişikliğinde ilgili alanları göster/gizle
        document.getElementById('status').addEventListener('change', function() {
            const progressGroup = document.getElementById('progressGroup');
            const delayReasonGroup = document.getElementById('delayReasonGroup');
            
            if (this.value === 'in-progress' || this.value === 'completed') {
                progressGroup.classList.remove('d-none');
            } else {
                progressGroup.classList.add('d-none');
            }
            
            if (this.value === 'delayed') {
                delayReasonGroup.classList.remove('d-none');
            } else {
                delayReasonGroup.classList.add('d-none');
            }
            
            // Tamamlandıysa ilerleme %100 yap
            if (this.value === 'completed') {
                document.getElementById('progress').value = 100;
                document.getElementById('progressValue').textContent = '100%';
            }
        });
        
        // İlerleme değeri değişince metin güncelle
        document.getElementById('progress').addEventListener('input', function() {
            document.getElementById('progressValue').textContent = `${this.value}%`;
        });
        
        // Modal'ı göster
        modal.show();
        
        // Güncelle butonuna click event ekle
        document.getElementById('updateTaskBtn').addEventListener('click', function() {
            // Form verilerini al
            const taskId = document.getElementById('taskId').value;
            const orderId = document.getElementById('orderId').value;
            const stage = document.getElementById('stage').value;
            const responsible = document.getElementById('responsible').value;
            const plannedTimeValue = document.getElementById('plannedTimeValue').value;
            const status = document.getElementById('status').value;
            const dueDate = document.getElementById('dueDate').value;
            const progress = document.getElementById('progress').value;
            const delayReason = document.getElementById('delayReason')?.value;
            const overtime = document.getElementById('overtime').value;
            
            // Temel validasyon
            if (!orderId || !stage || !responsible || !plannedTimeValue || !status || !dueDate) {
                alert('Lütfen tüm zorunlu alanları doldurun.');
                return;
            }
            
            // Görev güncellemesi için nesneyi oluştur
            const updateData = {
                orderId,
                stage,
                responsible,
                plannedTime: `${plannedTimeValue} saat`,
                status,
                dueDate: new Date(dueDate).toISOString(),
                progress: parseInt(progress) || 0,
                delayReason: delayReason || '',
                overtime: parseInt(overtime) || 0
            };
            
            // Görev güncelleme olayını tetikle
            const event = new CustomEvent('task:update', { 
                detail: { 
                    taskId, 
                    updateData 
                }
            });
            document.dispatchEvent(event);
            
            // Modal'ı kapat
            modal.hide();
            document.getElementById('editTaskModal').remove();
        });
        
        // Modal kapatıldığında temizlik yap
        document.getElementById('editTaskModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    },
    
    // İlerleme güncelleme modalı
    showUpdateProgressModal(task) {
        // Modal içeriği oluştur
        const modalHTML = `
            <div class="modal fade" id="updateProgressModal" tabindex="-1" aria-labelledby="updateProgressModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-sm">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="updateProgressModalLabel">İlerleme Güncelle - ${task.id}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="updateProgressForm">
                                <input type="hidden" id="taskIdProgress" value="${task.id}">
                                <div class="mb-3 text-center">
                                    <label for="taskProgress" class="form-label">İlerleme (%)</label>
                                    <input type="range" class="form-range" id="taskProgress" min="0" max="100" step="5" value="${task.progress}">
                                    <div class="progress mt-2" style="height: 20px;">
                                        <div class="progress-bar" role="progressbar" id="progressBarPreview" style="width: ${task.progress}%;">${task.progress}%</div>
                                    </div>
                                </div>
                                <div class="mb-3" id="delayReasonProgressGroup" style="display: none;">
                                    <label for="delayReasonProgress" class="form-label">Gecikme Nedeni</label>
                                    <select class="form-select" id="delayReasonProgress">
                                        <option value="" selected disabled>Neden Seçin</option>
                                        <option value="Malzeme tedarik gecikmesi">Malzeme tedarik gecikmesi</option>
                                        <option value="Personel eksikliği">Personel eksikliği</option>
                                        <option value="Teknik sorunlar">Teknik sorunlar</option>
                                        <option value="Tasarım değişikliği">Tasarım değişikliği</option>
                                        <option value="Öncelik değişimi">Öncelik değişimi</option>
                                        <option value="Diğer">Diğer</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="isDelayed">
                                        <label class="form-check-label" for="isDelayed">
                                            Gecikme var
                                        </label>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">İptal</button>
                            <button type="button" class="btn btn-primary" id="saveProgressBtn">Kaydet</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Modal'ı sayfaya ekle
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Modal nesnesini oluştur
        const modal = new bootstrap.Modal(document.getElementById('updateProgressModal'));
        
        // Progress bar güncelleme
        document.getElementById('taskProgress').addEventListener('input', function() {
            const progressBar = document.getElementById('progressBarPreview');
            progressBar.style.width = `${this.value}%`;
            progressBar.textContent = `${this.value}%`;
        });
        
        // Gecikme checkbox kontrolü
        document.getElementById('isDelayed').addEventListener('change', function() {
            document.getElementById('delayReasonProgressGroup').style.display = this.checked ? 'block' : 'none';
        });
        
        // Modal'ı göster
        modal.show();
        
        // Kaydet butonuna click event ekle
        document.getElementById('saveProgressBtn').addEventListener('click', function() {
            const taskId = document.getElementById('taskIdProgress').value;
            const progress = parseInt(document.getElementById('taskProgress').value);
            const isDelayed = document.getElementById('isDelayed').checked;
            const delayReason = isDelayed ? document.getElementById('delayReasonProgress').value : '';
            
            // Gecikme seçildi ama nedeni seçilmedi kontrolü
            if (isDelayed && !delayReason) {
                alert('Lütfen gecikme nedeni seçin.');
                return;
            }
            
            // İlerleme güncelleme için yeni durum belirle
            let newStatus;
            if (isDelayed) {
                newStatus = 'delayed';
            } else if (progress >= 100) {
                newStatus = 'completed';
            } else if (progress > 0) {
                newStatus = 'in-progress';
            } else {
                newStatus = 'pending';
            }
            
            // Görev güncelleme için olay tetikle
            const event = new CustomEvent('task:progress', { 
                detail: { 
                    taskId, 
                    progress,
                    status: newStatus,
                    delayReason
                }
            });
            document.dispatchEvent(event);
            
            // Modal'ı kapat
            modal.hide();
            document.getElementById('updateProgressModal').remove();
        });
        
        // Modal kapatıldığında temizlik yap
        document.getElementById('updateProgressModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    },
    
    // Silme onay modalı
    showDeleteTaskConfirmation(task) {
        // Modal içeriği oluştur
        const modalHTML = `
            <div class="modal fade" id="deleteTaskModal" tabindex="-1" aria-labelledby="deleteTaskModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-sm">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="deleteTaskModalLabel">Görevi Sil</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p>
                                <strong>${task.id}</strong> numaralı görevi silmek istediğinize emin misiniz?
                            </p>
                            <p class="text-danger">Bu işlem geri alınamaz!</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">İptal</button>
                            <button type="button" class="btn btn-danger" id="confirmDeleteBtn">Sil</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Modal'ı sayfaya ekle
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Modal nesnesini oluştur
        const modal = new bootstrap.Modal(document.getElementById('deleteTaskModal'));
        
        // Modal'ı göster
        modal.show();
        
        // Sil butonuna click event ekle
        document.getElementById('confirmDeleteBtn').addEventListener('click', function() {
            // Görev silme olayını tetikle
            const event = new CustomEvent('task:delete', { detail: { taskId: task.id } });
            document.dispatchEvent(event);
            
            // Modal'ı kapat
            modal.hide();
            document.getElementById('deleteTaskModal').remove();
        });
        
        // Modal kapatıldığında temizlik yap
        document.getElementById('deleteTaskModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    }
};

// Task yönetim sistemi ana modülü
function initTaskManagement() {
    const taskManager = new TaskManager();
    const taskTable = document.getElementById('taskTable').querySelector('tbody');
    
    // Görevleri yükle ve göster
    function loadAndDisplayTasks() {
        const tasks = taskManager.loadTasks();
        renderTasks(tasks);
        updateStats();
    }
    
    // Görevleri tabloya ekle
    function renderTasks(tasks) {
        taskTable.innerHTML = '';
        
        if (tasks.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="10" class="text-center">Henüz görev bulunmuyor. Yeni görev ekleyebilirsiniz.</td>
            `;
            taskTable.appendChild(emptyRow);
            return;
        }
        
        tasks.forEach(task => {
            const row = TaskUI.createTaskRow(task);
            taskTable.appendChild(row);
        });
    }
    
    // İstatistikleri güncelle
    function updateStats() {
        const stats = taskManager.calculateStats();
        TaskUI.updateStatsCard(stats);
    }
    
    // Görev ekle butonuna tıklanınca
    document.getElementById('refreshTasksBtn').addEventListener('click', function() {
        loadAndDisplayTasks();
    });
    
    // Görev ekle butonuna tıklanınca
    document.querySelector('[data-bs-target="#addTaskModal"]').addEventListener('click', function() {
        TaskUI.showAddTaskModal();
    });
    
    // Görev ekleme olayını dinle
    document.addEventListener('task:add', function(e) {
        const newTask = taskManager.addTask(e.detail);
        loadAndDisplayTasks(); // Tüm görevleri yeniden yükle ve göster
    });
    
    // Görev güncelleme olayını dinle
    document.addEventListener('task:update', function(e) {
        const { taskId, updateData } = e.detail;
        taskManager.updateTask(taskId, updateData);
        loadAndDisplayTasks(); // Tüm görevleri yeniden yükle ve göster
    });
    
    // İlerleme güncelleme olayını dinle
    document.addEventListener('task:progress', function(e) {
        const { taskId, progress, status, delayReason } = e.detail;
        
        // Önce durumu güncelle
        taskManager.updateTaskStatus(taskId, status, delayReason);
        
        // Sonra ilerlemeyi güncelle
        taskManager.updateTaskProgress(taskId, progress);
        
        loadAndDisplayTasks(); // Tüm görevleri yeniden yükle ve göster
    });
    
    // Görev silme olayını dinle
    document.addEventListener('task:delete', function(e) {
        const { taskId } = e.detail;
        taskManager.deleteTask(taskId);
        loadAndDisplayTasks(); // Tüm görevleri yeniden yükle ve göster
    });
    
    // Sayfa yüklendiğinde görevleri göster
    loadAndDisplayTasks();
}

// Dışa aktarma
export { initTaskManagement, TaskManager, TaskUI };
