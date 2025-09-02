import axios from 'axios';

// Configuração base da API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor para adicionar token de autenticação
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Log do erro para debug
    console.error('API Error:', {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method
    });
    
    // Tratar erro 429 (Rate Limiting)
    if (error.response?.status === 429) {
      const retryAfter = error.response?.data?.retryAfter || 900; // 15 minutos padrão
      const minutes = Math.ceil(retryAfter / 60);
      
      // Mostrar mensagem mais amigável
      const friendlyMessage = `Muitas tentativas de acesso. Tente novamente em ${minutes} minuto${minutes > 1 ? 's' : ''}.`;
      
      // Criar um novo erro com mensagem amigável
      const rateLimitError = new Error(friendlyMessage);
      rateLimitError.response = {
        ...error.response,
        data: {
          ...error.response.data,
          message: friendlyMessage
        }
      };
      
      return Promise.reject(rateLimitError);
    }
    
    // Tratar erro 401 (Token expirado/inválido)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (refreshToken && originalRequest.url !== '/auth/refresh') {
        try {
          // Tentar renovar o token
          const response = await api.post('/auth/refresh', {
            refreshToken: refreshToken
          });
          
          if (response.data.success) {
            const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;
            
            // Atualizar tokens no localStorage
            localStorage.setItem('auth_token', accessToken);
            localStorage.setItem('refresh_token', newRefreshToken);
            
            // Atualizar o header da requisição original
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            
            // Repetir a requisição original
            return api(originalRequest);
          }
        } catch (refreshError) {
          console.error('Erro ao renovar token:', refreshError);
          
          // Se falhou ao renovar, limpar tokens e redirecionar para login
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          
          // Recarregar a página para forçar novo login
          window.location.reload();
        }
      } else {
        // Não há refresh token ou já tentou renovar, limpar e redirecionar
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        window.location.reload();
      }
    }
    
    return Promise.reject(error);
  }
);

// API endpoints
// Auth API
export const authAPI = {
  // Registrar novo usuário
  register: (data: { name: string; email: string; password: string; confirmPassword: string; phone?: string }) => 
    api.post('/auth/register', data),
  
  // Login de usuário
  login: (data: { email: string; password: string }) => 
    api.post('/auth/login', data),
  
  // Logout
  logout: () => api.post('/auth/logout'),
  
  // Obter perfil do usuário
  getProfile: () => api.get('/auth/profile'),
  
  // Atualizar perfil
  updateProfile: (data: { name?: string; phone?: string }) => 
    api.put('/auth/profile', data),
  
  // Alterar senha
  changePassword: (data: { currentPassword: string; newPassword: string }) => 
    api.put('/auth/change-password', data),
};

// Channels API
export const channelsAPI = {
  // Listar todos os canais
  getAll: () => api.get('/channels'),
  
  // Criar novo canal
  create: (data: { name: string; api: string }) => 
    api.post('/channels', data),
  
  // Criar novo canal e conectar automaticamente
  createAndConnect: (data: { name: string; api: string }) => 
    api.post('/channels/create-and-connect', data),
  
  // Conectar canal
  connect: (channelId: string) => 
    api.post(`/channels/${channelId}/connect`),
  
  // Desconectar canal
  disconnect: (channelId: string) => 
    api.post(`/channels/${channelId}/disconnect`),
  
  // Obter QR Code
  getQRCode: (channelId: string) => 
    api.get(`/channels/${channelId}/qr`),
  
  // Obter status do canal
  getStatus: (channelId: string) => 
    api.get(`/channels/${channelId}/status`),
  
  // Deletar canal
  delete: (channelId: string) => 
    api.delete(`/channels/${channelId}`),
};

export const messagesAPI = {
  // Send message
  send: (data: { channelId: string; to: string; message: string; type?: string }) => 
    api.post('/messages/send', data),
  
  // Get messages for a contact
  getByContact: (contactId: string) => api.get(`/messages/contact/${contactId}`),
  
  // Send bulk messages
  sendBulk: (data: { channelId: string; contacts: string[]; message: string }) => 
    api.post('/messages/bulk', data),
};

export const contactsAPI = {
  // Listar todos os contatos
  getAll: () => api.get('/contacts'),

  // Criar novo contato
  create: (data: { name: string; phone: string; email?: string }) => 
    api.post('/contacts', data),

  // Atualizar contato
  update: (id: string, data: Partial<{ name: string; phone: string; email: string }>) => 
    api.put(`/contacts/${id}`, data),

  // Deletar contato
  delete: (id: string) => api.delete(`/contacts/${id}`),
};

// Quick Replies API
export const quickRepliesAPI = {
  // Listar todas as respostas rápidas
  getAll: () => api.get('/quick-replies'),

  // Criar nova resposta rápida
  create: (data: { title: string; content: string; shortcut?: string; category?: string }) => 
    api.post('/quick-replies', data),

  // Obter resposta rápida por ID
  getById: (id: string) => api.get(`/quick-replies/${id}`),

  // Atualizar resposta rápida
  update: (id: string, data: Partial<{ title: string; content: string; shortcut: string; category: string }>) => 
    api.put(`/quick-replies/${id}`, data),

  // Deletar resposta rápida
  delete: (id: string) => api.delete(`/quick-replies/${id}`),

  // Buscar respostas rápidas
  search: (query: string) => api.get(`/quick-replies/search?q=${encodeURIComponent(query)}`),

  // Obter estatísticas
  getStats: () => api.get('/quick-replies/stats'),
};

export default api;