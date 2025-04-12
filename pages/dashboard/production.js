                      </Box>
                    )}
                  </Paper>
                </Grid>
                
                {/* Departman KPI kartları */}
                {(departmentFilter === 'all' ? ['ENGINEERING', 'ASSEMBLY', 'TESTING', 'PACKAGING'] : [departmentFilter]).map(dept => (
                  <Grid item xs={12} md={departmentFilter === 'all' ? 6 : 12} key={dept}>
                    <DepartmentKPI 
                      department={dept} 
                      stats={productionData?.departmentDetail?.[dept] || {}} 
                    />
                  </Grid>
                ))}
                
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Departman Bazında Verimlilik Trendi
                    </Typography>
                    <Box height={300}>
                      <Chart 
                        type="line"
                        data={{
                          labels: productionData?.efficiencyTrend?.dates || [],
                          datasets: [
                            ...(departmentFilter === 'all' ? [
                              {
                                label: 'Mühendislik',
                                data: productionData?.efficiencyTrend?.ENGINEERING || [],
                                borderColor: 'rgba(75, 192, 192, 1)',
                                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                              },
                              {
                                label: 'Montaj',
                                data: productionData?.efficiencyTrend?.ASSEMBLY || [],
                                borderColor: 'rgba(54, 162, 235, 1)',
                                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                              },
                              {
                                label: 'Test',
                                data: productionData?.efficiencyTrend?.TESTING || [],
                                borderColor: 'rgba(153, 102, 255, 1)',
                                backgroundColor: 'rgba(153, 102, 255, 0.2)',
                              },
                              {
                                label: 'Paketleme',
                                data: productionData?.efficiencyTrend?.PACKAGING || [],
                                borderColor: 'rgba(255, 159, 64, 1)',
                                backgroundColor: 'rgba(255, 159, 64, 0.2)',
                              }
                            ] : [
                              {
                                label: departmentFilter,
                                data: productionData?.efficiencyTrend?.[departmentFilter] || [],
                                borderColor: 'rgba(75, 192, 192, 1)',
                                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                              }
                            ])
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'top',
                            },
                            title: {
                              display: true,
                              text: 'Verimlilik Trendi (%)'
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              max: 100,
                            }
                          }
                        }}
                      />
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            )}
            
            {/* İş Yükü Tahmini */}
            {activeTab === 2 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6">
                        Departman İş Yükü Tahmini (30 Gün)
                      </Typography>
                      {departmentFilter !== 'all' && (
                        <Button
                          startIcon={loadingPrediction ? <CircularProgress size={20} /> : <RefreshIcon />}
                          onClick={() => fetchDepartmentPrediction(departmentFilter)}
                          disabled={loadingPrediction}
                        >
                          Tahmin Yenile
                        </Button>
                      )}
                    </Box>
                    
                    {departmentFilter === 'all' ? (
                      <Alert severity="info">
                        İş yükü tahminini görüntülemek için lütfen bir departman seçin.
                      </Alert>
                    ) : loadingPrediction ? (
                      <Box display="flex" justifyContent="center" my={5}>
                        <CircularProgress />
                      </Box>
                    ) : !predictionData ? (
                      <Alert severity="info">
                        {departmentFilter} departmanı için iş yükü tahmini henüz oluşturulmadı. Tahmin oluşturmak için "Tahmin Yenile" butonuna tıklayın.
                      </Alert>
                    ) : (
                      <>
                        <Box height={300}>
                          <Chart 
                            type="line"
                            data={{
                              labels: Array.from({ length: 30 }, (_, i) => `Gün ${i + 1}`),
                              datasets: [
                                {
                                  label: 'Tahmin Edilen İş Yükü (Saat)',
                                  data: predictionData.forecast || [],
                                  borderColor: 'rgba(54, 162, 235, 1)',
                                  backgroundColor: 'rgba(54, 162, 235, 0.2)',
                                  fill: true,
                                },
                                {
                                  label: 'Günlük Kapasite',
                                  data: Array(30).fill(predictionData.dailyCapacity || 24),
                                  borderColor: 'rgba(255, 99, 132, 1)',
                                  borderWidth: 2,
                                  borderDash: [5, 5],
                                  fill: false,
                                }
                              ]
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: {
                                  position: 'top',
                                },
                                title: {
                                  display: true,
                                  text: `${departmentFilter} Departmanı İş Yükü Tahmini`
                                },
                              },
                              scales: {
                                y: {
                                  beginAtZero: true,
                                  title: {
                                    display: true,
                                    text: 'İş Yükü (Saat)'
                                  }
                                }
                              }
                            }}
                          />
                        </Box>
                        
                        <Grid container spacing={3} mt={1}>
                          <Grid item xs={12} sm={4}>
                            <Paper sx={{ p: 2, bgcolor: 'info.light', color: 'white' }}>
                              <Typography variant="h6">%{predictionData.utilizationRate?.toFixed(1) || 0}</Typography>
                              <Typography variant="body2">Ortalama Kapasite Kullanımı</Typography>
                            </Paper>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Paper sx={{ p: 2, bgcolor: predictionData.overloadDays > 5 ? 'error.light' : 'warning.light', color: 'white' }}>
                              <Typography variant="h6">{predictionData.overloadDays || 0} gün</Typography>
                              <Typography variant="body2">Aşırı Yük Beklenen Günler</Typography>
                            </Paper>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            <Paper sx={{ p: 2, bgcolor: 'success.light', color: 'white' }}>
                              <Typography variant="h6">{30 - (predictionData.overloadDays || 0)} gün</Typography>
                              <Typography variant="body2">Normal Yük Beklenen Günler</Typography>
                            </Paper>
                          </Grid>
                        </Grid>
                      </>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            )}
          </Box>
        </>
      )}
    </Container>
  );
}
