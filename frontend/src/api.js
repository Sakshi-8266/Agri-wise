const API_BASE = '/api/v1';

export const DEMO_ACCOUNTS = {
  Farmer: { email: 'farmer@agriwise.com', password: 'Farmer@123', label: 'Ramesh Patel (Farmer)', role: 'Farmer' },
  Buyer: { email: 'buyer@agriwise.com', password: 'Buyer@123', label: 'Ananya Sharma (Buyer)', role: 'Buyer' },
  Delivery: { email: 'delivery@agriwise.com', password: 'Delivery@123', label: 'Vikram Singh (Delivery Partner)', role: 'Delivery' },
  FPO: { email: 'fpo@agriwise.com', password: 'FPO@123', label: 'Sanjay Verma (FPO Lead)', role: 'FPO' },
  Admin: { email: 'admin@agriwise.com', password: 'Admin@123', label: 'Platform Administrator', role: 'Admin' }
};

export const api = {
  getToken: () => localStorage.getItem('agriwise_token'),
  setToken: (token) => localStorage.setItem('agriwise_token', token),
  clearToken: () => localStorage.removeItem('agriwise_token'),
  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem('agriwise_user'));
    } catch {
      return null;
    }
  },
  setUser: (user) => localStorage.setItem('agriwise_user', JSON.stringify(user)),
  clearUser: () => localStorage.removeItem('agriwise_user'),

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (res.status === 401) {
      // Auto logout on expired session
      this.clearToken();
      this.clearUser();
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({
        detail: res.status === 502
          ? 'Bad Gateway (502): The backend API server (port 8000) is unreachable. Please verify the backend service is running.'
          : res.statusText
      }));
      throw new Error(errData.detail || 'Network error');
    }

    return res.json();
  },

  // Auth
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setToken(data.access_token);
    this.setUser(data.user);
    return data;
  },

  async register(payload) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    this.setToken(data.access_token);
    this.setUser(data.user);
    return data;
  },

  async getMe() {
    return this.request('/auth/me');
  },

  async getProfile() {
    return this.request('/auth/profile');
  },

  async updatePreferences(pref) {
    return this.request('/auth/preferences', {
      method: 'PATCH',
      body: JSON.stringify(pref)
    });
  },

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    this.clearToken();
    this.clearUser();
  },

  // Farms
  getFarms: () => api.request('/farms'),
  createFarm: (farm) => api.request('/farms', { method: 'POST', body: JSON.stringify(farm) }),
  deleteFarm: (id) => api.request(`/farms/${id}`, { method: 'DELETE' }),
  getFarmActivities: (farmId) => api.request(`/farms/${farmId}/activities`),
  addFarmActivity: (farmId, act) => api.request(`/farms/${farmId}/activities`, { method: 'POST', body: JSON.stringify(act) }),
  getFarmExpenses: (farmId) => api.request(`/farms/${farmId}/expenses`),
  addFarmExpense: (farmId, exp) => api.request(`/farms/${farmId}/expenses`, { method: 'POST', body: JSON.stringify(exp) }),

  // Crops
  getCrops: (farmId) => api.request(farmId ? `/crops?farm_id=${farmId}` : '/crops'),
  createCrop: (crop) => api.request('/crops', { method: 'POST', body: JSON.stringify(crop) }),
  updateCrop: (id, updates) => api.request(`/crops/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
  deleteCrop: (id) => api.request(`/crops/${id}`, { method: 'DELETE' }),

  // Recommendation
  getCropRecommendation: (req) => api.request('/recommendations/crop', { method: 'POST', body: JSON.stringify(req) }),
  getRecommendationHistory: () => api.request('/recommendations/history'),

  // Weather
  getWeather: (lat, lon, location) => api.request(`/weather?lat=${lat || 22.5645}&lon=${lon || 72.9289}&location=${encodeURIComponent(location || 'Anand, Gujarat')}`),

  // Disease
  analyzeDisease: (formData) => api.request('/disease/analyze', { method: 'POST', body: formData }),
  getDiseaseHistory: () => api.request('/disease/history'),

  // RAG Assistant
  chatAssistant: (message, conversation_id) => api.request('/assistant/chat', { method: 'POST', body: JSON.stringify({ message, conversation_id }) }),
  getConversations: () => api.request('/assistant/conversations'),
  getConversationMessages: (id) => api.request(`/assistant/conversations/${id}`),

  // Market
  getCommodities: () => api.request('/market/commodities'),
  getMarketForecast: (product, location) => api.request(`/market/forecast?product=${encodeURIComponent(product)}&location=${encodeURIComponent(location || 'Central Mandi Hub')}`),

  // Marketplace
  getProducts: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api.request(`/products${q ? '?' + q : ''}`);
  },
  createProduct: (prod) => api.request('/products', { method: 'POST', body: JSON.stringify(prod) }),
  getProductDetail: (id) => api.request(`/products/${id}`),
  updateProduct: (id, updates) => api.request(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
  deleteProduct: (id) => api.request(`/products/${id}`, { method: 'DELETE' }),

  // Orders
  createOrder: (order) => api.request('/orders', { method: 'POST', body: JSON.stringify(order) }),
  getOrders: () => api.request('/orders'),
  getOrderDetail: (id) => api.request(`/orders/${id}`),
  updateOrderStatus: (id, status) => api.request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Notifications
  getNotifications: () => api.request('/notifications'),
  markNotificationRead: (id) => api.request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => api.request('/notifications/mark-all-read', { method: 'POST' }),

  // FPO
  getFpoOverview: () => api.request('/fpo/overview'),

  // Admin
  getAdminMetrics: () => api.request('/admin/metrics'),
  getAllUsers: () => api.request('/admin/users'),
  toggleUserStatus: (id, account_status) => api.request(`/admin/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ account_status }) }),
  updateUserRole: (id, role) => api.request(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  getAuditLogs: () => api.request('/admin/audit-logs'),

  // Decision Support
  getDecisionSupport: () => api.request('/decision-support/dashboard'),

  // Delivery Partner Logistics & Telemetry
  getAssignedDeliveries: () => api.request('/delivery/orders/assigned'),
  getAvailableDeliveries: () => api.request('/delivery/orders/available'),
  getDeliveryHistory: () => api.request('/delivery/orders/history'),
  getDeliveryOrderDetail: (id) => api.request(`/delivery/orders/${id}`),
  claimDeliveryOrder: (id) => api.request(`/delivery/orders/${id}/claim`, { method: 'POST' }),
  updateDeliveryStatus: (id, payload) => api.request(`/delivery/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify(payload) }),
  confirmDeliveryOtp: (id, payload) => api.request(`/delivery/orders/${id}/confirm`, { method: 'POST', body: JSON.stringify(payload) }),
  updateDeliveryGps: (id, payload) => api.request(`/delivery/orders/${id}/gps`, { method: 'POST', body: JSON.stringify(payload) }),
  getDeliveryRouteOptimization: (id) => api.request(`/delivery/orders/${id}/route`),
  getDeliveryCheckpoints: (id) => api.request(`/delivery/orders/${id}/checkpoints`),
  getDeliveryTelemetry: () => api.request('/delivery/telemetry/overview'),
};

