<template>
  <div class="login-container">
    <div class="login-wrapper">
      <div class="card login-card">
        <div class="card-header text-center py-3">
          <h4 class="mb-0">ElektroTrack</h4>
          <p class="text-muted small mb-0">Güç Hücresi Yönetim Sistemi</p>
        </div>

        <div class="card-body">
          <div v-if="view === 'login'">
            <h5 class="card-title text-center mb-4">Giriş Yap</h5>
            <form @submit.prevent="login">
              <div class="mb-3">
                <label for="email" class="form-label">E-posta</label>
                <input
                  type="email"
                  class="form-control"
                  id="email"
                  v-model="loginForm.email"
                  placeholder="E-posta adresiniz"
                  required
                />
              </div>

              <div class="mb-3">
                <label for="password" class="form-label">Şifre</label>
                <div class="input-group">
                  <input
                    :type="showPassword ? 'text' : 'password'"
                    class="form-control"
                    id="password"
                    v-model="loginForm.password"
                    placeholder="Şifreniz"
                    required
                  />
                  <button
                    class="btn btn-outline-secondary"
                    type="button"
                    @click="showPassword = !showPassword"
                  >
                    <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                  </button>
                </div>
              </div>

              <div class="d-flex justify-content-between align-items-center mb-3">
                <div class="form-check">
                  <input
                    type="checkbox"
                    class="form-check-input"
                    id="remember-me"
                    v-model="loginForm.rememberMe"
                  />
                  <label class="form-check-label" for="remember-me">
                    Beni hatırla
                  </label>
                </div>
                <a href="#" @click.prevent="view = 'forgot'" class="text-decoration-none">
                  Şifremi Unuttum
                </a>
              </div>

              <div class="d-grid gap-2">
                <button
                  type="submit"
                  class="btn btn-primary"
                  :disabled="loading"
                >
                  <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                  Giriş Yap
                </button>
              </div>
            </form>

            <hr class="my-4" />

            <div class="d-grid gap-2">
              <button
                type="button"
                class="btn btn-outline-secondary"
                @click="loginWithGoogle"
                :disabled="loading"
              >
                <i class="fab fa-google me-2"></i> Google ile Giriş Yap
              </button>
              <button
                type="button"
                class="btn btn-outline-secondary"
                @click="demoLogin"
                :disabled="loading"
              >
                <i class="fas fa-user-circle me-2"></i> Demo Kullanıcı ile Giriş
              </button>
            </div>

            <div class="text-center mt-4">
              <p>
                Hesabınız yok mu?
                <a href="#" @click.prevent="view = 'register'" class="text-decoration-none">
                  Kayıt Ol
                </a>
              </p>
            </div>
          </div>

          <div v-else-if="view === 'register'">
            <h5 class="card-title text-center mb-4">Kayıt Ol</h5>
            <form @submit.prevent="register">
              <div class="mb-3">
                <label for="register-name" class="form-label">Ad Soyad</label>
                <input
                  type="text"
                  class="form-control"
                  id="register-name"
                  v-model="registerForm.name"
                  placeholder="Ad Soyad"
                  required
                />
              </div>

              <div class="mb-3">
                <label for="register-email" class="form-label">E-posta</label>
                <input
                  type="email"
                  class="form-control"
                  id="register-email"
                  v-model="registerForm.email"
                  placeholder="E-posta adresiniz"
                  required
                />
              </div>

              <div class="mb-3">
                <label for="register-username" class="form-label">Kullanıcı Adı</label>
                <input
                  type="text"
                  class="form-control"
                  id="register-username"
                  v-model="registerForm.username"
                  placeholder="Kullanıcı adınız"
                  required
                />
              </div>

              <div class="mb-3">
                <label for="register-department" class="form-label">Departman</label>
                <select
                  class="form-select"
                  id="register-department"
                  v-model="registerForm.department"
                  required
                >
                  <option value="" disabled selected>Departmanınızı seçin</option>
                  <option value="Yönetim">Yönetim</option>
                  <option value="Teknik">Teknik</option>
                  <option value="Üretim">Üretim</option>
                  <option value="Satın Alma">Satın Alma</option>
                  <option value="Kalite Kontrol">Kalite Kontrol</option>
                  <option value="İnsan Kaynakları">İnsan Kaynakları</option>
                </select>
              </div>

              <div class="mb-3">
                <label for="register-password" class="form-label">Şifre</label>
                <input
                  type="password"
                  class="form-control"
                  id="register-password"
                  v-model="registerForm.password"
                  placeholder="Şifre (en az 6 karakter)"
                  required
                  minlength="6"
                />
              </div>

              <div class="mb-3">
                <label for="register-password-confirm" class="form-label">Şifre Tekrar</label>
                <input
                  type="password"
                  class="form-control"
                  id="register-password-confirm"
                  v-model="registerForm.confirmPassword"
                  placeholder="Şifrenizi tekrar girin"
                  required
                />
                <div class="form-text text-danger" v-if="passwordMismatch">
                  Şifreler eşleşmiyor
                </div>
              </div>

              <div class="d-grid gap-2">
                <button
                  type="submit"
                  class="btn btn-primary"
                  :disabled="loading || passwordMismatch"
                >
                  <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                  Kayıt Ol
                </button>
              </div>
            </form>

            <div class="text-center mt-4">
              <p>
                Zaten hesabınız var mı?
                <a href="#" @click.prevent="view = 'login'" class="text-decoration-none">
                  Giriş Yap
                </a>
              </p>
            </div>
          </div>

          <div v-else-if="view === 'forgot'">
            <h5 class="card-title text-center mb-4">Şifremi Unuttum</h5>
            <form @submit.prevent="resetPassword">
              <div class="mb-3">
                <label for="forgot-email" class="form-label">E-posta</label>
                <input
                  type="email"
                  class="form-control"
                  id="forgot-email"
                  v-model="forgotForm.email"
                  placeholder="E-posta adresiniz"
                  required
                />
              </div>

              <div class="d-grid gap-2">
                <button
                  type="submit"
                  class="btn btn-primary"
                  :disabled="loading"
                >
                  <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                  Şifre Sıfırlama Bağlantısı Gönder
                </button>
              </div>
            </form>

            <div class="text-center mt-4">
              <p>
                <a href="#" @click.prevent="view = 'login'" class="text-decoration-none">
                  Giriş sayfasına dön
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from '@/composables/useToast';
import { useAuthStore } from '@/store/auth';

export default {
  name: 'Login',
  setup() {
    const router = useRouter();
    const { toast } = useToast();
    const authStore = useAuthStore();
    
    // State
    const view = ref('login');
    const loading = ref(false);
    const showPassword = ref(false);
    
    // Forms
    const loginForm = ref({
      email: '',
      password: '',
      rememberMe: false
    });
    
    const registerForm = ref({
      name: '',
      email: '',
      username: '',
      department: '',
      password: '',
      confirmPassword: ''
    });
    
    const forgotForm = ref({
      email: ''
    });

    // Computed
    const passwordMismatch = computed(() =>
      registerForm.value.password !== '' &&
      registerForm.value.confirmPassword !== '' &&
      registerForm.value.password !== registerForm.value.confirmPassword
    );

    // Methods
    const login = async () => {
      if (!loginForm.value.email || !loginForm.value.password) {
        toast.warning('E-posta ve şifre giriniz');
        return;
      }
      
      loading.value = true;
      
      try {
        const result = await authStore.login({
          email: loginForm.value.email,
          password: loginForm.value.password,
          rememberMe: loginForm.value.rememberMe
        });
        
        if (result.success) {
          toast.success(`Hoş geldiniz, ${result.user.displayName || result.user.email}`);
          router.push('/dashboard');
        } else {
          toast.error(result.error || 'Giriş başarısız');
        }
      } catch (error) {
        toast.error('Giriş yapılırken bir hata oluştu');
        console.error('Giriş hatası:', error);
      } finally {
        loading.value = false;
      }
    };
    
    const register = async () => {
      if (passwordMismatch.value) {
        toast.warning('Şifreler eşleşmiyor');
        return;
      }
      
      if (!registerForm.value.name ||
          !registerForm.value.email ||
          !registerForm.value.username ||
          !registerForm.value.department ||
          !registerForm.value.password) {
        toast.warning('Tüm alanları doldurunuz');
        return;
      }
      
      loading.value = true;
      
      try {
        const result = await authStore.register({
          name: registerForm.value.name,
          email: registerForm.value.email,
          username: registerForm.value.username,
          department: registerForm.value.department,
          password: registerForm.value.password
        });
        
        if (result.success) {
          toast.success('Kayıt işlemi başarılı! Giriş yapabilirsiniz.');
          view.value = 'login';
          // Kayıt sonrası e-posta otomatik doldur
          loginForm.value.email = registerForm.value.email;
          registerForm.value = {
            name: '',
            email: '',
            username: '',
            department: '',
            password: '',
            confirmPassword: ''
          };
        } else {
          toast.error(result.error || 'Kayıt işlemi başarısız');
        }
      } catch (error) {
        toast.error('Kayıt olurken bir hata oluştu');
        console.error('Kayıt hatası:', error);
      } finally {
        loading.value = false;
      }
    };
    
    const resetPassword = async () => {
      if (!forgotForm.value.email) {
        toast.warning('E-posta adresinizi giriniz');
        return;
      }
      
      loading.value = true;
      
      try {
        const result = await authStore.resetPassword(forgotForm.value.email);
        
        if (result.success) {
          toast.success(`${forgotForm.value.email} adresine şifre sıfırlama bağlantısı gönderildi.`);
          view.value = 'login';
          forgotForm.value.email = '';
        } else {
          toast.error(result.error || 'Şifre sıfırlama işlemi başarısız');
        }
      } catch (error) {
        toast.error('Şifre sıfırlama işlemi sırasında bir hata oluştu');
        console.error('Şifre sıfırlama hatası:', error);
      } finally {
        loading.value = false;
      }
    };
    
    const loginWithGoogle = async () => {
      loading.value = true;
      
      try {
        const result = await authStore.loginWithGoogle();
        
        if (result.success) {
          toast.success(`Hoş geldiniz, ${result.user.displayName || result.user.email}`);
          router.push('/dashboard');
        } else {
          // Kullanıcı popup'ı kapattıysa sessizce başarısız
          if (result.code === 'auth/popup-closed-by-user') {
            console.log('Kullanıcı popup\'ı kapattı');
          } else {
            toast.error(result.error || 'Google ile giriş başarısız');
          }
        }
      } catch (error) {
        toast.error('Google ile giriş yapılırken bir hata oluştu');
        console.error('Google giriş hatası:', error);
      } finally {
        loading.value = false;
      }
    };
    
    const demoLogin = async () => {
      loading.value = true;
      
      try {
        const result = await authStore.demoLogin();
        
        if (result.success) {
          toast.info('Demo modunda giriş yapıldı');
          router.push('/dashboard');
        } else {
          toast.error(result.error || 'Demo giriş başarısız');
        }
      } catch (error) {
        toast.error('Demo giriş yapılırken bir hata oluştu');
        console.error('Demo giriş hatası:', error);
      } finally {
        loading.value = false;
      }
    };

    return {
      view,
      loading,
      showPassword,
      loginForm,
      registerForm,
      forgotForm,
      passwordMismatch,
      login,
      register,
      resetPassword,
      loginWithGoogle,
      demoLogin
    };
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f8fa;
}

.login-wrapper {
  width: 100%;
  max-width: 400px;
  padding: 1rem;
}

.login-card {
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.card-header {
  border-bottom: none;
  background-color: #fff;
}

/* Responsive adjustments */
@media (max-width: 576px) {
  .login-card {
    border-radius: 0;
    margin: -1rem;
    box-shadow: none;
  }
  
  .login-wrapper {
    max-width: 100%;
  }
}
</style>