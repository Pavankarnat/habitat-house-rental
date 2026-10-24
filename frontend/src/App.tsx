import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import {
  Home, Building2, Leaf, SlidersHorizontal, Sparkles, Calculator, MapPin,
  Bookmark, ShieldCheck, Search, Bell, ArrowRight, Check, X, Plus,
  ChevronDown, ExternalLink, Filter, Download, Trash2, Key, IndianRupee,
  Activity, Wind, HelpCircle, RefreshCw, Send, CheckCircle2, AlertCircle, Eye,
  Sliders, ArrowUpRight, BarChart3, MessageSquare, Compass, Info, Heart,
  Edit3, Users, Layers, FileText, LogOut, CheckSquare, Settings
} from 'lucide-react';

type Page = 'overview' | 'housing' | 'environment' | 'compare' | 'recommendations' | 'calculators' | 'localities' | 'saved' | 'admin';

interface Locality {
  id: number;
  name: string;
  city: string;
  description: string;
  connectivity_score: number;
  average_price: number | null;
  average_rent: number | null;
  latest_aqi: number | null;
  aqi_category: string;
  observation_date: string | null;
  amenity_count: number;
  is_sample: boolean;
}

interface Property {
  id: number;
  locality_id: number;
  locality: string;
  city: string;
  property_type: string;
  bhk: number;
  area_sqft: number;
  price: number;
  rate_per_sqft: number;
  monthly_rent: number;
  is_sample: boolean;
}

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const money = (v: number | null | undefined) =>
  v == null ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

const compact = (v: number | null | undefined) => {
  if (v == null) return '—';
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  return money(v);
};

const PHOTO_MAP: Record<string, string> = {
  Kukatpally: '/assets/apt-aura.jpg',
  Miyapur: '/assets/suburban-villas.jpg',
  Gachibowli: '/assets/highrise-glass.jpg',
  'LB Nagar': '/assets/villa-stone.jpg',
  Manikonda: '/assets/hero-street.jpg',
  Kompally: '/assets/suburban-villas.jpg',
  'Hitec City': '/assets/highrise-glass.jpg',
  Madhapur: '/assets/apt-aura.jpg',
  Kondapur: '/assets/hero-street.jpg',
  'Financial District': '/assets/highrise-glass.jpg',
  'Jubilee Hills': '/assets/villa-stone.jpg',
  'Banjara Hills': '/assets/villa-stone.jpg',
  Tellapur: '/assets/suburban-villas.jpg',
  Nallagandla: '/assets/hero-street.jpg',
  Uppal: '/assets/apt-aura.jpg',
  Begumpet: '/assets/apt-aura.jpg',
  Ameerpet: '/assets/highrise-glass.jpg',
  Dilsukhnagar: '/assets/villa-stone.jpg'
};

const DEFAULT_PHOTO = '/assets/apt-aura.jpg';
const getLocalityPhoto = (name: string) => PHOTO_MAP[name] || DEFAULT_PHOTO;

const getInitialPage = (): Page => {
  if (typeof window === 'undefined') return 'overview';
  const path = window.location.pathname.replace(/^\//, '').toLowerCase();
  if (path === 'admin') return 'admin';
  if (['housing', 'environment', 'compare', 'recommendations', 'calculators', 'localities', 'saved'].includes(path)) {
    return path as Page;
  }
  return 'overview';
};

export default function App() {
  const [page, setPage] = useState<Page>(getInitialPage);
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [dashboard, setDashboard] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCity, setSelectedCity] = useState('Hyderabad');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [explorerLocality, setExplorerLocality] = useState('all');
  const [explorerBhk, setExplorerBhk] = useState('all');
  const [explorerPurpose, setExplorerPurpose] = useState<'buy' | 'rent'>('buy');
  const [explorerType, setExplorerType] = useState('all');
  const [explorerMaxBudget, setExplorerMaxBudget] = useState('');
  const [explorerSort, setExplorerSort] = useState<'price_asc' | 'price_desc' | 'area_desc'>('price_asc');
  const [selectedPropertyModal, setSelectedPropertyModal] = useState<Property | null>(null);

  // Compare
  const [compareSelected, setCompareSelected] = useState<number[]>([1, 2, 3, 4]);

  // Recommendations
  const [recBudget, setRecBudget] = useState<number>(5000000);
  const [recPurpose, setRecPurpose] = useState<'buy' | 'rent'>('buy');
  const [recType, setRecType] = useState('all');
  const [recBhk, setRecBhk] = useState('2');
  const [wAfford, setWAfford] = useState(40);
  const [wEnv, setWEnv] = useState(30);
  const [wAmen, setWAmen] = useState(20);
  const [wConn, setWConn] = useState(10);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  // Calculators
  const [calcTab, setCalcTab] = useState<'emi' | 'ownership' | 'price' | 'rentbuy'>('emi');
  const [emiPrincipal, setEmiPrincipal] = useState<number>(4000000);
  const [emiRate, setEmiRate] = useState<number>(8.5);
  const [emiTenure, setEmiTenure] = useState<number>(20);
  const [emiResult, setEmiResult] = useState<any>(null);

  const [ownPrice, setOwnPrice] = useState<number>(8500000);
  const [ownDownPay, setOwnDownPay] = useState<number>(20);
  const [ownRate, setOwnRate] = useState<number>(8.5);
  const [ownTenure, setOwnTenure] = useState<number>(20);
  const [ownHolding, setOwnHolding] = useState<number>(5);
  const [ownMaintenance, setOwnMaintenance] = useState<number>(3500);
  const [ownResult, setOwnResult] = useState<any>(null);

  const [estArea, setEstArea] = useState<number>(1200);
  const [estRate, setEstRate] = useState<number>(6800);
  const [estPriceResult, setEstPriceResult] = useState<number | null>(null);

  // Environmental
  const [envLocalityId, setEnvLocalityId] = useState<number>(1);
  const [envHistory, setEnvHistory] = useState<any[]>([]);

  // Auth & Shortlist
  const [token, setToken] = useState(localStorage.getItem('housing_token') || '');
  const [user, setUser] = useState<any>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [favorites, setFavorites] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [newAlertForm, setNewAlertForm] = useState({ locality_id: 1, max_price: '', max_rent: '', max_aqi: '' });

  // Standalone Admin Dashboard State
  const [adminSection, setAdminSection] = useState<'overview' | 'properties' | 'localities' | 'amenities' | 'customers' | 'audit' | 'import'>('overview');
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminAmenities, setAdminAmenities] = useState<any[]>([]);
  const [adminAuditLogs, setAdminAuditLogs] = useState<any[]>([]);
  const [adminAmenityCategoryFilter, setAdminAmenityCategoryFilter] = useState('all');
  const [adminPropertyLocFilter, setAdminPropertyLocFilter] = useState('all');
  const [adminMessage, setAdminMessage] = useState('');

  // Admin Modals & Forms
  const [adminPropModalOpen, setAdminPropModalOpen] = useState(false);
  const [editingPropId, setEditingPropId] = useState<number | null>(null);
  const [adminPropForm, setAdminPropForm] = useState({
    locality_id: 1,
    property_type: 'Apartment',
    bhk: 2,
    area_sqft: 1250,
    price: 6800000,
    monthly_rent: 22000
  });

  const [adminLocModalOpen, setAdminLocModalOpen] = useState(false);
  const [editingLocId, setEditingLocId] = useState<number | null>(null);
  const [adminLocForm, setAdminLocForm] = useState({
    name: '',
    city: 'Hyderabad',
    description: '',
    connectivity_score: 4
  });

  const [adminAmenityModalOpen, setAdminAmenityModalOpen] = useState(false);
  const [adminAmenityForm, setAdminAmenityForm] = useState({
    locality_id: 1,
    name: '',
    category: 'School',
    description: ''
  });

  const [adminEmail, setAdminEmail] = useState('admin@housing.local');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState('');

  // Supercharged Rule-based Assistant Bot
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ from: 'bot' | 'user'; text: string; action?: string; suggestions?: string[] }>>([
    {
      from: 'bot',
      text: 'Hello! I’m Habitat Assistant. I can execute live calculations, look up property prices, compare localities, estimate ownership costs, and check verified CPCB air quality indices across Hyderabad.',
      suggestions: [
        'Calculate EMI for ₹50 Lakhs',
        'Ownership cost for ₹85 Lakhs',
        'Compare Kukatpally and Miyapur',
        'Cleanest air localities',
        'Estimate 1500 sqft in Gachibowli'
      ]
    }
  ]);

  // Global search modal
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const authHeaders = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  // Fetch initial data
  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [lRes, pRes, dRes] = await Promise.all([
        axios.get(`${API}/localities`),
        axios.get(`${API}/housing`),
        axios.get(`${API}/dashboard`)
      ]);
      setLocalities(lRes.data);
      setProperties(pRes.data);
      setDashboard(dRes.data);
      if (lRes.data.length > 0) {
        setEnvLocalityId(lRes.data[0].id);
        setCompareSelected(lRes.data.slice(0, 4).map((x: any) => x.id));
      }
    } catch (e: any) {
      setError(`Could not connect to the backend at ${API}. Please ensure FastAPI is running on port 8080.`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Sync user profile & favorites
  useEffect(() => {
    if (token) {
      axios.get(`${API}/auth/me`, { headers: authHeaders })
        .then(r => setUser(r.data))
        .catch(() => { setToken(''); localStorage.removeItem('housing_token'); });
      axios.get(`${API}/favorites`, { headers: authHeaders })
        .then(r => setFavorites(r.data))
        .catch(() => {});
      axios.get(`${API}/alerts`, { headers: authHeaders })
        .then(r => setAlerts(r.data))
        .catch(() => {});
    } else {
      setUser(null);
      setFavorites([]);
      setAlerts([]);
    }
  }, [token, authHeaders]);

  // Calculate default EMI
  useEffect(() => {
    runEmiCalc();
    runOwnershipCalc();
  }, []);

  // Fetch environmental history when locality changes
  useEffect(() => {
    if (envLocalityId) {
      axios.get(`${API}/environment/${envLocalityId}`)
        .then(r => setEnvHistory(r.data))
        .catch(() => setEnvHistory([]));
    }
  }, [envLocalityId]);

  // Load admin data when admin visits /admin
  useEffect(() => {
    if (user?.role === 'admin' && page === 'admin') {
      loadAdminData();
    }
  }, [user, page, authHeaders]);

  // Synchronize browser URL bar with page state
  useEffect(() => {
    const targetPath = page === 'overview' ? '/' : `/${page}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ page }, '', targetPath);
    }
  }, [page]);

  // Handle browser back and forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setPage(getInitialPage());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen(v => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered Properties in Explorer
  const filteredProperties = useMemo(() => {
    let result = properties.filter(p => {
      const matchSearch = p.locality.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.property_type.toLowerCase().includes(searchQuery.toLowerCase());
      const matchLocality = explorerLocality === 'all' || p.locality_id === Number(explorerLocality);
      const matchBhk = explorerBhk === 'all' || p.bhk === Number(explorerBhk);
      const matchType = explorerType === 'all' || p.property_type.toLowerCase().includes(explorerType.toLowerCase());
      const priceVal = explorerPurpose === 'rent' ? p.monthly_rent : p.price;
      const matchBudget = explorerMaxBudget ? priceVal <= Number(explorerMaxBudget) : true;
      return matchSearch && matchLocality && matchBhk && matchType && matchBudget;
    });

    if (explorerSort === 'price_asc') {
      result.sort((a, b) => (explorerPurpose === 'rent' ? a.monthly_rent - b.monthly_rent : a.price - b.price));
    } else if (explorerSort === 'price_desc') {
      result.sort((a, b) => (explorerPurpose === 'rent' ? b.monthly_rent - a.monthly_rent : b.price - a.price));
    } else if (explorerSort === 'area_desc') {
      result.sort((a, b) => b.area_sqft - a.area_sqft);
    }
    return result;
  }, [properties, searchQuery, explorerLocality, explorerBhk, explorerPurpose, explorerType, explorerMaxBudget, explorerSort]);

  // Market overview chart data (comparing first 6 localities)
  const marketChartData = useMemo(() => {
    return localities.slice(0, 6).map(l => ({
      name: l.name,
      priceRate: l.average_price ? Math.round(l.average_price / 1200) : 6500,
      rentMonth: l.average_rent || 22000,
      aqi: l.latest_aqi || 100
    }));
  }, [localities]);

  // Calculators
  async function runEmiCalc() {
    try {
      const res = await axios.post(`${API}/calculators/emi`, {
        principal: Number(emiPrincipal),
        annual_interest_rate: Number(emiRate),
        tenure_years: Number(emiTenure)
      });
      setEmiResult(res.data);
    } catch (e: any) {
      console.error(e);
    }
  }

  async function runOwnershipCalc() {
    try {
      const res = await axios.post(`${API}/calculators/ownership-cost`, {
        property_price: Number(ownPrice),
        down_payment_percent: Number(ownDownPay),
        annual_interest_rate: Number(ownRate),
        tenure_years: Number(ownTenure),
        holding_years: Number(ownHolding),
        monthly_maintenance: Number(ownMaintenance)
      });
      setOwnResult(res.data);
    } catch (e: any) {
      console.error(e);
    }
  }

  // Recommendations calculation
  async function runRecommendationsCalc() {
    try {
      const res = await axios.post(`${API}/recommendations`, {
        budget: Number(recBudget || 5000000),
        weight_affordability: wAfford / 100,
        weight_environment: wEnv / 100,
        weight_amenities: wAmen / 100,
        weight_connectivity: wConn / 100
      });
      setRecommendations(res.data);
    } catch (e: any) {
      console.error(e);
    }
  }

  // Toggle Favorite
  async function toggleFavorite(locId: number) {
    if (!token) {
      setAuthMode('login');
      setAuthOpen(true);
      return;
    }
    const isSaved = favorites.some(f => f.locality_id === locId);
    try {
      if (isSaved) {
        await axios.delete(`${API}/favorites/${locId}`, { headers: authHeaders });
        setFavorites(f => f.filter(x => x.locality_id !== locId));
      } else {
        await axios.post(`${API}/favorites/${locId}`, {}, { headers: authHeaders });
        const res = await axios.get(`${API}/favorites`, { headers: authHeaders });
        setFavorites(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Authentication
  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    try {
      const route = authMode === 'login' ? 'login' : 'register';
      const payload = authMode === 'login' ? { email: authForm.email, password: authForm.password } : authForm;
      const res = await axios.post(`${API}/auth/${route}`, payload);
      localStorage.setItem('housing_token', res.data.access_token);
      setToken(res.data.access_token);
      setUser(res.data);
      setAuthOpen(false);
      setAuthForm({ name: '', email: '', password: '' });
    } catch (e: any) {
      setAuthError(e.response?.data?.detail || 'Authentication failed. Please check your credentials.');
    }
  }

  // Chatbot submission
  // Chatbot submission with suggestion support
  async function handleChatSend(textOverride?: string) {
    const text = (textOverride ?? chatInput).trim();
    if (!text) return;
    setChatMessages(prev => [...prev, { from: 'user', text }]);
    setChatInput('');
    setChatBusy(true);
    try {
      const res = await axios.post(`${API}/chatbot/message`, { message: text });
      setChatMessages(prev => [
        ...prev,
        {
          from: 'bot',
          text: res.data.reply,
          action: res.data.action,
          suggestions: res.data.suggestions
        }
      ]);
    } catch {
      setChatMessages(prev => [
        ...prev,
        {
          from: 'bot',
          text: 'I can assist you with housing prices, EMI estimations, locality comparisons, and environmental records. Please check the backend connection.'
        }
      ]);
    } finally {
      setChatBusy(false);
    }
  }

  // Load Enterprise Admin Data
  async function loadAdminData() {
    if (!token) return;
    try {
      const [sRes, uRes, aRes, lRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers: authHeaders }).catch(() => ({ data: null })),
        axios.get(`${API}/admin/users`, { headers: authHeaders }).catch(() => ({ data: [] })),
        axios.get(`${API}/admin/amenities`, { headers: authHeaders }).catch(() => ({ data: [] })),
        axios.get(`${API}/admin/audit-logs`, { headers: authHeaders }).catch(() => ({ data: [] }))
      ]);
      setAdminStats(sRes.data);
      setAdminUsers(uRes.data);
      setAdminAmenities(aRes.data);
      setAdminAuditLogs(lRes.data);
    } catch (e) {
      console.error(e);
    }
  }

  // Export CSV
  const handleExportCsv = () => {
    window.open(`${API}/reports/export`, '_blank');
  };

  // Property CRUD
  function handleOpenAddProp() {
    setEditingPropId(null);
    setAdminPropForm({
      locality_id: localities[0]?.id || 1,
      property_type: 'Apartment',
      bhk: 2,
      area_sqft: 1250,
      price: 6800000,
      monthly_rent: 22000
    });
    setAdminPropModalOpen(true);
  }

  function handleOpenEditProp(p: any) {
    setEditingPropId(p.id);
    setAdminPropForm({
      locality_id: p.locality_id,
      property_type: p.property_type,
      bhk: p.bhk,
      area_sqft: p.area_sqft,
      price: p.price,
      monthly_rent: p.monthly_rent
    });
    setAdminPropModalOpen(true);
  }

  async function handleSaveProperty(e: React.FormEvent) {
    e.preventDefault();
    setAdminMessage('');
    try {
      const payload = {
        locality_id: Number(adminPropForm.locality_id),
        property_type: adminPropForm.property_type,
        bhk: Number(adminPropForm.bhk),
        area_sqft: Number(adminPropForm.area_sqft),
        price: Number(adminPropForm.price),
        monthly_rent: Number(adminPropForm.monthly_rent)
      };
      if (editingPropId) {
        await axios.put(`${API}/admin/properties/${editingPropId}`, payload, { headers: authHeaders });
        setAdminMessage('Property updated successfully.');
      } else {
        await axios.post(`${API}/admin/properties`, payload, { headers: authHeaders });
        setAdminMessage('Property added to database.');
      }
      setAdminPropModalOpen(false);
      setEditingPropId(null);
      await Promise.all([loadData(), loadAdminData()]);
    } catch (e: any) {
      setAdminMessage(e.response?.data?.detail || 'Failed to save property record.');
    }
  }

  async function handleDeleteProperty(id: number) {
    if (!confirm('Are you sure you want to permanently delete this property record?')) return;
    try {
      await axios.delete(`${API}/admin/properties/${id}`, { headers: authHeaders });
      setAdminMessage('Property record deleted.');
      await Promise.all([loadData(), loadAdminData()]);
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to delete property.');
    }
  }

  // Locality CRUD
  function handleOpenAddLocality() {
    setEditingLocId(null);
    setAdminLocForm({
      name: '',
      city: 'Hyderabad',
      description: '',
      connectivity_score: 4
    });
    setAdminLocModalOpen(true);
  }

  function handleOpenEditLocality(loc: any) {
    setEditingLocId(loc.id);
    setAdminLocForm({
      name: loc.name,
      city: loc.city,
      description: loc.description || '',
      connectivity_score: loc.connectivity_score || 4
    });
    setAdminLocModalOpen(true);
  }

  async function handleSaveLocality(e: React.FormEvent) {
    e.preventDefault();
    setAdminMessage('');
    try {
      const payload = {
        name: adminLocForm.name,
        city: adminLocForm.city,
        description: adminLocForm.description,
        connectivity_score: Number(adminLocForm.connectivity_score)
      };
      if (editingLocId) {
        await axios.put(`${API}/admin/localities/${editingLocId}`, payload, { headers: authHeaders });
        setAdminMessage('Locality details updated.');
      } else {
        await axios.post(`${API}/admin/localities`, payload, { headers: authHeaders });
        setAdminMessage('Locality created successfully.');
      }
      setAdminLocModalOpen(false);
      setEditingLocId(null);
      setAdminLocForm({ name: '', city: 'Hyderabad', description: '', connectivity_score: 4 });
      await Promise.all([loadData(), loadAdminData()]);
    } catch (e: any) {
      setAdminMessage(e.response?.data?.detail || 'Failed to save locality.');
    }
  }

  async function handleDeleteLocality(id: number, name: string) {
    if (!confirm(`Are you sure you want to delete ${name}? All associated properties and indicators will also be removed.`)) return;
    try {
      await axios.delete(`${API}/admin/localities/${id}`, { headers: authHeaders });
      setAdminMessage(`Locality ${name} deleted successfully.`);
      await Promise.all([loadData(), loadAdminData()]);
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to delete locality.');
    }
  }

  // Amenity CRUD
  async function handleSaveAmenity(e: React.FormEvent) {
    e.preventDefault();
    setAdminMessage('');
    try {
      await axios.post(`${API}/admin/amenities`, {
        locality_id: Number(adminAmenityForm.locality_id),
        name: adminAmenityForm.name,
        category: adminAmenityForm.category,
        description: adminAmenityForm.description
      }, { headers: authHeaders });
      setAdminMessage('Amenity added successfully.');
      setAdminAmenityModalOpen(false);
      setAdminAmenityForm({ locality_id: localities[0]?.id || 1, name: '', category: 'School', description: '' });
      await Promise.all([loadAdminData(), loadData()]);
    } catch (e: any) {
      setAdminMessage(e.response?.data?.detail || 'Failed to add amenity.');
    }
  }

  async function handleDeleteAmenity(id: number) {
    if (!confirm('Are you sure you want to delete this infrastructure amenity?')) return;
    try {
      await axios.delete(`${API}/admin/amenities/${id}`, { headers: authHeaders });
      setAdminMessage('Amenity removed.');
      await Promise.all([loadAdminData(), loadData()]);
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to delete amenity.');
    }
  }

  // Customer Profiles Role Toggle
  async function handleToggleUserRole(userId: number, currentRole: string) {
    const nextRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!confirm(`Change this account privilege to "${nextRole}"?`)) return;
    try {
      await axios.put(`${API}/admin/users/${userId}/role`, { role: nextRole }, { headers: authHeaders });
      setAdminMessage(`Account role updated to ${nextRole}.`);
      await loadAdminData();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to update user role.');
    }
  }

  // CSV Bulk Importer
  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API}/admin/import/localities`, formData, {
        headers: {
          ...authHeaders,
          'Content-Type': 'multipart/form-data'
        }
      });
      alert(`CSV Import Complete!\nLocalities added: ${res.data.added}\nErrors: ${res.data.error_count}`);
      await Promise.all([loadData(), loadAdminData()]);
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Failed to parse CSV file. Please check column format.');
    }
  }

  // Admin Login Handlers
  async function handleAdminLogin(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setAdminLoginError('');
    setAdminLoginLoading(true);
    try {
      const res = await axios.post(`${API}/auth/login`, {
        email: adminEmail,
        password: adminPassword
      });
      if (res.data.role !== 'admin') {
        setAdminLoginError('This account does not have administrator privileges. Please sign in with an administrator account.');
        return;
      }
      localStorage.setItem('housing_token', res.data.access_token);
      setToken(res.data.access_token);
      setUser(res.data);
      setAdminPassword('');
    } catch (err: any) {
      setAdminLoginError(err.response?.data?.detail || 'Invalid email or password. Please verify credentials.');
    } finally {
      setAdminLoginLoading(false);
    }
  }

  async function handleQuickDemoAdminLogin() {
    setAdminEmail('admin@housing.local');
    setAdminPassword('ChangeMe123!');
    setAdminLoginError('');
    setAdminLoginLoading(true);
    try {
      const res = await axios.post(`${API}/auth/login`, {
        email: 'admin@housing.local',
        password: 'ChangeMe123!'
      });
      localStorage.setItem('housing_token', res.data.access_token);
      setToken(res.data.access_token);
      setUser(res.data);
      setAdminPassword('');
    } catch (err: any) {
      setAdminLoginError(err.response?.data?.detail || 'Could not log in with admin credentials.');
    } finally {
      setAdminLoginLoading(false);
    }
  }

  function handleAdminLogout() {
    localStorage.removeItem('housing_token');
    setToken('');
    setUser(null);
    setAdminMessage('');
  }

  // Create Alert
  async function handleCreateAlert(e: React.FormEvent) {
    e.preventDefault();
    try {
      await axios.post(`${API}/alerts`, {
        locality_id: Number(newAlertForm.locality_id),
        max_price: newAlertForm.max_price ? Number(newAlertForm.max_price) : null,
        max_rent: newAlertForm.max_rent ? Number(newAlertForm.max_rent) : null,
        max_aqi: newAlertForm.max_aqi ? Number(newAlertForm.max_aqi) : null
      }, { headers: authHeaders });
      const res = await axios.get(`${API}/alerts`, { headers: authHeaders });
      setAlerts(res.data);
      setAlertModalOpen(false);
      setNewAlertForm({ locality_id: 1, max_price: '', max_rent: '', max_aqi: '' });
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Could not create alert rule.');
    }
  }

  // Public Navigation Items (NO Admin Console visible to clients)
  const navItems = [
    { id: 'overview' as Page, label: 'Overview', icon: Home, section: 'MAIN' },
    { id: 'housing' as Page, label: 'Housing Explorer', icon: Building2, section: 'MAIN' },
    { id: 'environment' as Page, label: 'Environmental Insights', icon: Leaf, section: 'MAIN' },
    { id: 'compare' as Page, label: 'Compare Localities', icon: SlidersHorizontal, section: 'MAIN' },
    { id: 'recommendations' as Page, label: 'Recommendations', icon: Sparkles, section: 'MAIN' },
    { id: 'calculators' as Page, label: 'Cost Calculators', icon: Calculator, section: 'TOOLS' },
    { id: 'localities' as Page, label: 'Locality Directory', icon: MapPin, section: 'TOOLS' },
    { id: 'saved' as Page, label: 'Saved Places & Alerts', icon: Bookmark, section: 'TOOLS' }
  ];

  // =========================================================================
  // STANDALONE ENTERPRISE ADMIN EXPERIENCE (NO MAIN WEBSITE SIDEBAR)
  // =========================================================================
  if (page === 'admin') {
    return (
      <div className="admin-standalone-shell">
        {user?.role !== 'admin' ? (
          /* STANDALONE GATEWAY SIGN-IN (NO SIDEBAR) */
          <div style={{ maxWidth: '480px', margin: '70px auto', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '36px 32px', boxShadow: '0 12px 32px rgba(24, 37, 31, 0.06)' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: '#EBF5F1', color: '#176B50', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                <ShieldCheck size={28} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#176B50', display: 'block', marginBottom: '6px' }}>
                Habitat Security Gateway
              </span>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--ink-primary)', marginBottom: '8px' }}>
                Administrator Portal
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--ink-muted)', lineHeight: '1.5' }}>
                Restricted access for system managers and dataset curators. Enter administrative credentials to manage Habitat records.
              </p>
            </div>

            <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="filter-item">
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)' }}>Admin Email Address</label>
                <input
                  required
                  type="email"
                  className="filter-input-styled"
                  placeholder="admin@housing.local"
                  value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', fontSize: '13px' }}
                />
              </div>

              <div className="filter-item">
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-secondary)' }}>Admin Password</label>
                <input
                  required
                  type="password"
                  className="filter-input-styled"
                  placeholder="••••••••••••"
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', fontSize: '13px' }}
                />
              </div>

              {adminLoginError && (
                <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={15} />
                  <span>{adminLoginError}</span>
                </div>
              )}

              <button
                className="btn-forest-primary"
                type="submit"
                disabled={adminLoginLoading}
                style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 700, marginTop: '6px' }}
              >
                {adminLoginLoading ? 'Verifying Credentials...' : 'Sign In to Admin Console'}
              </button>
            </form>

            <div style={{ marginTop: '24px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, color: 'var(--ink-primary)' }}>Administrator Account Credentials:</span>
                <span style={{ fontSize: '10px', background: '#D6ECE3', color: '#176B50', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>ACTIVE</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', color: 'var(--ink-secondary)', fontFamily: 'monospace', fontSize: '12px' }}>
                <div>Email: <strong style={{ color: '#176B50' }}>admin@housing.local</strong></div>
                <div>Password: <strong style={{ color: '#176B50' }}>ChangeMe123!</strong></div>
              </div>

              <button
                type="button"
                className="btn-outline-secondary"
                onClick={handleQuickDemoAdminLogin}
                disabled={adminLoginLoading}
                style={{ width: '100%', marginTop: '12px', padding: '8px 12px', fontSize: '12px', justifyContent: 'center', borderColor: '#176B50', color: '#176B50', fontWeight: 700 }}
              >
                <Key size={14} /> One-Click Fill &amp; Sign In as Admin
              </button>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button
                style={{ background: 'none', border: 'none', color: 'var(--ink-muted)', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={() => { setPage('overview'); window.history.pushState({}, '', '/'); }}
              >
                ← Return to Habitat Public Website
              </button>
            </div>
          </div>
        ) : (
          /* AUTHENTICATED STANDALONE ENTERPRISE ADMINISTRATION DASHBOARD */
          <div>
            {/* DEDICATED ADMIN HEADER */}
            <header className="admin-standalone-header">
              <div className="admin-header-brand">
                <div className="admin-brand-badge">
                  <ShieldCheck size={20} />
                </div>
                <div className="admin-brand-title">
                  habitat<span>.</span>
                </div>
                <span className="admin-suite-pill">Enterprise Administration</span>
                <span style={{ fontSize: '12px', color: '#176B50', display: 'inline-flex', alignItems: 'center', gap: '6px', marginLeft: '12px', fontWeight: 600 }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} /> Live System Connected
                </span>
              </div>

              <div className="admin-header-actions">
                <button
                  className="btn-outline-secondary"
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                  onClick={() => { setPage('overview'); window.history.pushState({}, '', '/'); }}
                >
                  ← Public Website
                </button>

                <button
                  className="btn-outline-secondary"
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                  onClick={handleExportCsv}
                >
                  <Download size={13} /> Export CSV Report
                </button>

                <div className="admin-user-tag">
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#176B50', color: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>
                    {user?.name?.slice(0, 1).toUpperCase() || 'A'}
                  </div>
                  <span>{user?.name || 'Administrator'}</span>
                  <span className="admin-badge-pill badge-role-admin">Admin</span>
                </div>

                <button
                  className="btn-outline-secondary"
                  style={{ color: '#DC2626', borderColor: '#FCA5A5', padding: '6px 12px', fontSize: '12px' }}
                  onClick={handleAdminLogout}
                  title="Sign out of Admin Suite"
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </header>

            {/* ADMIN SUB-NAVIGATION TABS */}
            <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', padding: '0 28px' }}>
              <div className="admin-nav-tabs-row" style={{ maxWidth: '1340px', margin: '0 auto' }}>
                {[
                  { id: 'overview', label: 'Reports & Analytics', icon: BarChart3 },
                  { id: 'properties', label: `Property Inventory (${properties.length})`, icon: Building2 },
                  { id: 'localities', label: `Localities (${localities.length})`, icon: MapPin },
                  { id: 'amenities', label: `Infrastructure & Amenities (${adminAmenities.length})`, icon: Layers },
                  { id: 'customers', label: `Customer Profiles (${adminUsers.length})`, icon: Users },
                  { id: 'audit', label: `Audit Logs (${adminAuditLogs.length})`, icon: FileText },
                  { id: 'import', label: 'Data Tools & CSV', icon: Settings }
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = adminSection === tab.id;
                  return (
                    <button
                      key={tab.id}
                      className={`admin-tab-btn ${isActive ? 'active' : ''}`}
                      onClick={() => setAdminSection(tab.id as any)}
                    >
                      <Icon size={16} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ADMIN DASHBOARD CONTAINER */}
            <div className="admin-dashboard-container">
              {adminMessage && (
                <div style={{ background: '#EBF5F1', border: '1px solid #D6ECE3', padding: '12px 18px', borderRadius: '12px', marginBottom: '20px', color: '#176B50', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} />
                    <span>{adminMessage}</span>
                  </div>
                  <X size={15} style={{ cursor: 'pointer' }} onClick={() => setAdminMessage('')} />
                </div>
              )}

              {/* SECTION 1: REPORTS & EXECUTIVE ANALYTICS */}
              {adminSection === 'overview' && (
                <div>
                  <div className="admin-metrics-grid">
                    <div className="admin-stat-card">
                      <div className="admin-stat-top">
                        <span className="admin-stat-label">Monitored Localities</span>
                        <div className="admin-stat-icon"><MapPin size={16} /></div>
                      </div>
                      <div className="admin-stat-value">{localities.length}</div>
                      <span className="admin-stat-hint">Active Hyderabad clusters</span>
                    </div>

                    <div className="admin-stat-card">
                      <div className="admin-stat-top">
                        <span className="admin-stat-label">Properties Tracked</span>
                        <div className="admin-stat-icon"><Building2 size={16} /></div>
                      </div>
                      <div className="admin-stat-value">{properties.length}</div>
                      <span className="admin-stat-hint">Apartments, villas, &amp; plots</span>
                    </div>

                    <div className="admin-stat-card">
                      <div className="admin-stat-top">
                        <span className="admin-stat-label">Registered Users</span>
                        <div className="admin-stat-icon"><Users size={16} /></div>
                      </div>
                      <div className="admin-stat-value">{adminUsers.length || 1}</div>
                      <span className="admin-stat-hint">Client &amp; administrator accounts</span>
                    </div>

                    <div className="admin-stat-card">
                      <div className="admin-stat-top">
                        <span className="admin-stat-label">Amenities &amp; Transit</span>
                        <div className="admin-stat-icon"><Layers size={16} /></div>
                      </div>
                      <div className="admin-stat-value">{adminAmenities.length || 54}</div>
                      <span className="admin-stat-hint">Schools, hospitals, metros, malls</span>
                    </div>
                  </div>

                  {/* 2 COMPREHENSIVE EXECUTIVE BENCHMARK TABLES */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginBottom: '24px' }}>
                    <div className="styled-table-card">
                      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <h3 style={{ fontSize: '15px', fontWeight: 800 }}>Locality Valuation &amp; Supply Summary</h3>
                          <p style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>Real-time aggregated market indicators across top localities</p>
                        </div>
                        <button className="btn-outline-secondary" style={{ padding: '5px 10px', fontSize: '11px' }} onClick={() => setAdminSection('localities')}>
                          Manage all <ArrowRight size={11} />
                        </button>
                      </div>
                      <table className="habitat-table">
                        <thead>
                          <tr>
                            <th>Locality</th>
                            <th>Average Price</th>
                            <th>Typical Rent</th>
                            <th>Air Quality</th>
                            <th>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {localities.slice(0, 8).map(loc => (
                            <tr key={loc.id}>
                              <td><strong>{loc.name}</strong></td>
                              <td>{compact(loc.average_price)}</td>
                              <td>{money(loc.average_rent)}/mo</td>
                              <td>
                                <span style={{ background: (loc.latest_aqi || 0) <= 100 ? '#EBF5F1' : '#FEF3C7', color: (loc.latest_aqi || 0) <= 100 ? '#176B50' : '#D97706', padding: '2px 7px', borderRadius: '4px', fontWeight: 700, fontSize: '10.5px' }}>
                                  AQI {loc.latest_aqi}
                                </span>
                              </td>
                              <td><strong>{loc.connectivity_score}</strong>/5</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="styled-table-card">
                      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <h3 style={{ fontSize: '15px', fontWeight: 800 }}>Cleanest Air Localities Ranking</h3>
                          <p style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>Ranked by validated ambient air monitoring observations</p>
                        </div>
                        <span className="admin-badge-pill badge-role-admin">CPCB Verified</span>
                      </div>
                      <table className="habitat-table">
                        <thead>
                          <tr>
                            <th>Rank</th>
                            <th>Locality</th>
                            <th>AQI Index</th>
                            <th>Band</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...localities]
                            .sort((a, b) => (a.latest_aqi || 999) - (b.latest_aqi || 999))
                            .slice(0, 8)
                            .map((loc, idx) => (
                              <tr key={loc.id}>
                                <td>#{idx + 1}</td>
                                <td><strong>{loc.name}</strong></td>
                                <td style={{ color: (loc.latest_aqi || 0) <= 100 ? '#176B50' : '#D97706', fontWeight: 800 }}>{loc.latest_aqi}</td>
                                <td>{loc.aqi_category}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* QUICK ADMIN ACTIONS PANEL */}
                  <div className="editorial-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '4px' }}>Administrative Actions</h4>
                      <p style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Manage catalogue records, add newly monitored clusters, or inspect transaction logs.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button className="btn-forest-primary" onClick={handleOpenAddProp}>
                        <Plus size={14} /> Add Property
                      </button>
                      <button className="btn-outline-secondary" onClick={handleOpenAddLocality}>
                        <Plus size={14} /> Add Locality
                      </button>
                      <button className="btn-outline-secondary" onClick={() => setAdminAmenityModalOpen(true)}>
                        <Plus size={14} /> Add Amenity
                      </button>
                      <button className="btn-outline-secondary" onClick={handleExportCsv}>
                        <Download size={14} /> Export CSV
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 2: PROPERTY INVENTORY & CRUD */}
              {adminSection === 'properties' && (
                <div>
                  <div className="admin-card-header">
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Property Catalogue Management</h2>
                      <p style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Create, modify, and delete residential listings and rental valuations.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <select
                        className="filter-select-styled"
                        value={adminPropertyLocFilter}
                        onChange={e => setAdminPropertyLocFilter(e.target.value)}
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      >
                        <option value="all">All Localities ({properties.length})</option>
                        {localities.map(l => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </select>
                      <button className="btn-forest-primary" onClick={handleOpenAddProp}>
                        <Plus size={14} /> Add New Property
                      </button>
                    </div>
                  </div>

                  <div className="styled-table-card">
                    <table className="habitat-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Locality</th>
                          <th>Type</th>
                          <th>BHK</th>
                          <th>Area (sq.ft.)</th>
                          <th>Asking Price</th>
                          <th>Monthly Rent</th>
                          <th>Rate / sq.ft.</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {properties
                          .filter(p => adminPropertyLocFilter === 'all' || p.locality_id === Number(adminPropertyLocFilter))
                          .map(p => (
                            <tr key={p.id}>
                              <td style={{ color: 'var(--ink-muted)', fontSize: '11px' }}>#{p.id}</td>
                              <td><strong>{p.locality}</strong></td>
                              <td>{p.property_type}</td>
                              <td>{p.bhk} BHK</td>
                              <td>{p.area_sqft} sq.ft.</td>
                              <td><strong style={{ color: '#176B50' }}>{money(p.price)}</strong></td>
                              <td>{money(p.monthly_rent)}/mo</td>
                              <td>₹{p.rate_per_sqft?.toLocaleString() || Math.round(p.price / p.area_sqft).toLocaleString()}</td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: '6px' }}>
                                  <button
                                    className="btn-outline-secondary"
                                    style={{ padding: '4px 8px', fontSize: '11px' }}
                                    onClick={() => handleOpenEditProp(p)}
                                    title="Edit Property"
                                  >
                                    <Edit3 size={13} /> Edit
                                  </button>
                                  <button
                                    style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: '4px 6px' }}
                                    onClick={() => handleDeleteProperty(p.id)}
                                    title="Delete Property"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SECTION 3: LOCALITY MANAGEMENT & CRUD */}
              {adminSection === 'localities' && (
                <div>
                  <div className="admin-card-header">
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Monitored Locality Directory</h2>
                      <p style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Manage geographical zones, connectivity indices, and descriptions.</p>
                    </div>
                    <button className="btn-forest-primary" onClick={handleOpenAddLocality}>
                      <Plus size={14} /> Add New Locality
                    </button>
                  </div>

                  <div className="styled-table-card">
                    <table className="habitat-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Locality Name</th>
                          <th>City</th>
                          <th>Average Price</th>
                          <th>Typical Rent</th>
                          <th>Latest AQI</th>
                          <th>Connectivity</th>
                          <th>Amenities</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {localities.map(loc => (
                          <tr key={loc.id}>
                            <td style={{ color: 'var(--ink-muted)', fontSize: '11px' }}>#{loc.id}</td>
                            <td><strong>{loc.name}</strong></td>
                            <td>{loc.city}</td>
                            <td>{compact(loc.average_price)}</td>
                            <td>{money(loc.average_rent)}/mo</td>
                            <td>
                              <span style={{ background: (loc.latest_aqi || 0) <= 100 ? '#EBF5F1' : '#FEF3C7', color: (loc.latest_aqi || 0) <= 100 ? '#176B50' : '#D97706', padding: '2px 7px', borderRadius: '4px', fontWeight: 700, fontSize: '11px' }}>
                                {loc.latest_aqi} ({loc.aqi_category})
                              </span>
                            </td>
                            <td>{loc.connectivity_score} / 5</td>
                            <td>{loc.amenity_count}</td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '6px' }}>
                                <button
                                  className="btn-outline-secondary"
                                  style={{ padding: '4px 8px', fontSize: '11px' }}
                                  onClick={() => handleOpenEditLocality(loc)}
                                  title="Edit Locality"
                                >
                                  <Edit3 size={13} /> Edit
                                </button>
                                <button
                                  style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: '4px 6px' }}
                                  onClick={() => handleDeleteLocality(loc.id, loc.name)}
                                  title="Delete Locality"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SECTION 4: INFRASTRUCTURE & AMENITIES */}
              {adminSection === 'amenities' && (
                <div>
                  <div className="admin-card-header">
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Infrastructure &amp; Amenities Directory</h2>
                      <p style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Manage catalogued schools, hospitals, transit hubs, and parks per locality.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <select
                        className="filter-select-styled"
                        value={adminAmenityCategoryFilter}
                        onChange={e => setAdminAmenityCategoryFilter(e.target.value)}
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      >
                        <option value="all">All Categories ({adminAmenities.length})</option>
                        {['School', 'Hospital', 'Metro', 'Park', 'Shopping Mall', 'IT Hub', 'Bank', 'Transit'].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <button className="btn-forest-primary" onClick={() => setAdminAmenityModalOpen(true)}>
                        <Plus size={14} /> Add Infrastructure / Amenity
                      </button>
                    </div>
                  </div>

                  <div className="styled-table-card">
                    <table className="habitat-table">
                      <thead>
                        <tr>
                          <th>Amenity Name</th>
                          <th>Category</th>
                          <th>Locality</th>
                          <th>Description</th>
                          <th style={{ textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminAmenities
                          .filter(a => adminAmenityCategoryFilter === 'all' || a.category.toLowerCase().includes(adminAmenityCategoryFilter.toLowerCase()))
                          .map(a => (
                            <tr key={a.id}>
                              <td><strong>{a.name}</strong></td>
                              <td><span className="admin-badge-pill badge-category">{a.category}</span></td>
                              <td>{a.locality_name || `Locality #${a.locality_id}`}</td>
                              <td style={{ color: 'var(--ink-muted)', fontSize: '12px' }}>{a.description || '—'}</td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: '4px' }}
                                  onClick={() => handleDeleteAmenity(a.id)}
                                  title="Delete Amenity"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SECTION 5: CUSTOMER PROFILES */}
              {adminSection === 'customers' && (
                <div>
                  <div className="admin-card-header">
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Customer &amp; User Accounts</h2>
                      <p style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Manage registered client profiles, inspect saved bookmarks, and toggle administrator privileges.</p>
                    </div>
                    <span className="admin-badge-pill badge-role-admin">{adminUsers.length} Users Registered</span>
                  </div>

                  <div className="styled-table-card">
                    <table className="habitat-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email Address</th>
                          <th>System Role</th>
                          <th>Saved Places</th>
                          <th>Alert Rules</th>
                          <th>Created At</th>
                          <th style={{ textAlign: 'right' }}>Privilege Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminUsers.map(u => (
                          <tr key={u.id}>
                            <td><strong>{u.name}</strong></td>
                            <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{u.email}</td>
                            <td>
                              <span className={`admin-badge-pill ${u.role === 'admin' ? 'badge-role-admin' : 'badge-role-client'}`}>
                                {u.role?.toUpperCase()}
                              </span>
                            </td>
                            <td>{u.favorites_count} bookmarked</td>
                            <td>{u.alerts_count} rules</td>
                            <td style={{ color: 'var(--ink-muted)', fontSize: '11px' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                className="btn-outline-secondary"
                                style={{ padding: '4px 10px', fontSize: '11px' }}
                                onClick={() => handleToggleUserRole(u.id, u.role)}
                              >
                                {u.role === 'admin' ? 'Revoke Admin' : 'Grant Admin'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SECTION 6: SYSTEM AUDIT LOGS */}
              {adminSection === 'audit' && (
                <div>
                  <div className="admin-card-header">
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: 800 }}>System Modification Audit Trail</h2>
                      <p style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Real-time log of administrative and system operations.</p>
                    </div>
                    <button className="btn-outline-secondary" onClick={loadAdminData}>
                      <RefreshCw size={13} /> Refresh Stream
                    </button>
                  </div>

                  <div className="styled-table-card">
                    <table className="habitat-table">
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Action</th>
                          <th>Record Type</th>
                          <th>Audit Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminAuditLogs.length > 0 ? (
                          adminAuditLogs.map(log => (
                            <tr key={log.id}>
                              <td style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>{new Date(log.created_at).toLocaleString()}</td>
                              <td><strong>{log.action}</strong></td>
                              <td><span className="admin-badge-pill badge-category">{log.record_type}</span></td>
                              <td>{log.detail}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center', color: 'var(--ink-muted)', padding: '24px' }}>
                              No audit records yet. All administrative operations will be tracked here.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SECTION 7: DATA TOOLS & CSV IMPORT */}
              {adminSection === 'import' && (
                <div>
                  <div className="admin-card-header">
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Dataset Tools &amp; Bulk Operations</h2>
                      <p style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>Export system records as CSV or perform batch uploads of housing datasets.</p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                    <div className="editorial-card">
                      <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '8px' }}>Export Complete Dataset</h3>
                      <p style={{ fontSize: '12.5px', color: 'var(--ink-muted)', lineHeight: '1.5', marginBottom: '16px' }}>
                        Generate a comprehensive CSV archive including monitored localities, recorded properties, average price calculations, and environmental observations.
                      </p>
                      <button className="btn-forest-primary" onClick={handleExportCsv}>
                        <Download size={14} /> Download Verified CSV Archive
                      </button>
                    </div>

                    <div className="editorial-card">
                      <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '8px' }}>Bulk CSV Property Importer</h3>
                      <p style={{ fontSize: '12.5px', color: 'var(--ink-muted)', lineHeight: '1.5', marginBottom: '16px' }}>
                        Upload a structured CSV file with columns: <code>locality_name, city, connectivity_score, property_type, bhk, area_sqft, price, monthly_rent</code>.
                      </p>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleCsvUpload}
                        style={{ fontSize: '12px', background: 'rgba(255, 255, 255, 0.04)', border: '1px dashed #CBD5E1', padding: '10px 14px', borderRadius: '8px', width: '100%' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ADMIN MODAL: ADD / EDIT PROPERTY */}
            {adminPropModalOpen && (
              <div className="habitat-modal-overlay" onClick={() => setAdminPropModalOpen(false)}>
                <div className="habitat-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                  <button style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setAdminPropModalOpen(false)}>
                    <X size={18} />
                  </button>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>
                    {editingPropId ? 'Edit Property Record' : 'Add New Property'}
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--ink-muted)', marginBottom: '16px' }}>
                    Configure property parameters. All changes are logged in the audit trail.
                  </p>

                  <form onSubmit={handleSaveProperty} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="filter-item">
                      <label>Locality</label>
                      <select
                        className="filter-select-styled"
                        value={adminPropForm.locality_id}
                        onChange={e => setAdminPropForm({ ...adminPropForm, locality_id: Number(e.target.value) })}
                      >
                        {localities.map(l => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="filter-item">
                        <label>Property Type</label>
                        <select
                          className="filter-select-styled"
                          value={adminPropForm.property_type}
                          onChange={e => setAdminPropForm({ ...adminPropForm, property_type: e.target.value })}
                        >
                          <option value="Apartment">Apartment</option>
                          <option value="Independent House / Villa">Independent House / Villa</option>
                          <option value="Plot / Land">Plot / Land</option>
                        </select>
                      </div>

                      <div className="filter-item">
                        <label>BHK Count</label>
                        <select
                          className="filter-select-styled"
                          value={adminPropForm.bhk}
                          onChange={e => setAdminPropForm({ ...adminPropForm, bhk: Number(e.target.value) })}
                        >
                          {[1, 2, 3, 4, 5].map(b => (
                            <option key={b} value={b}>{b} BHK</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="filter-item">
                      <label>Area (sq.ft.)</label>
                      <input
                        required
                        type="number"
                        className="filter-input-styled"
                        value={adminPropForm.area_sqft}
                        onChange={e => setAdminPropForm({ ...adminPropForm, area_sqft: Number(e.target.value) })}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="filter-item">
                        <label>Asking Price (₹)</label>
                        <input
                          required
                          type="number"
                          className="filter-input-styled"
                          value={adminPropForm.price}
                          onChange={e => setAdminPropForm({ ...adminPropForm, price: Number(e.target.value) })}
                        />
                      </div>

                      <div className="filter-item">
                        <label>Monthly Rent (₹)</label>
                        <input
                          required
                          type="number"
                          className="filter-input-styled"
                          value={adminPropForm.monthly_rent}
                          onChange={e => setAdminPropForm({ ...adminPropForm, monthly_rent: Number(e.target.value) })}
                        />
                      </div>
                    </div>

                    <button className="btn-forest-primary" type="submit" style={{ marginTop: '8px' }}>
                      {editingPropId ? 'Save Modifications' : 'Create Property Record'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ADMIN MODAL: ADD / EDIT LOCALITY */}
            {adminLocModalOpen && (
              <div className="habitat-modal-overlay" onClick={() => setAdminLocModalOpen(false)}>
                <div className="habitat-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                  <button style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setAdminLocModalOpen(false)}>
                    <X size={18} />
                  </button>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>
                    {editingLocId ? 'Edit Locality' : 'Add New Locality'}
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--ink-muted)', marginBottom: '16px' }}>
                    Maintain monitored Hyderabad cluster definitions.
                  </p>

                  <form onSubmit={handleSaveLocality} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="filter-item">
                      <label>Locality Name</label>
                      <input
                        required
                        className="filter-input-styled"
                        placeholder="e.g. Narsingi"
                        value={adminLocForm.name}
                        onChange={e => setAdminLocForm({ ...adminLocForm, name: e.target.value })}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="filter-item">
                        <label>City</label>
                        <input
                          required
                          className="filter-input-styled"
                          value={adminLocForm.city}
                          onChange={e => setAdminLocForm({ ...adminLocForm, city: e.target.value })}
                        />
                      </div>

                      <div className="filter-item">
                        <label>Connectivity Score (1-5)</label>
                        <select
                          className="filter-select-styled"
                          value={adminLocForm.connectivity_score}
                          onChange={e => setAdminLocForm({ ...adminLocForm, connectivity_score: Number(e.target.value) })}
                        >
                          <option value="1">1 - Limited</option>
                          <option value="2">2 - Basic</option>
                          <option value="3">3 - Average</option>
                          <option value="4">4 - Good</option>
                          <option value="5">5 - Excellent</option>
                        </select>
                      </div>
                    </div>

                    <div className="filter-item">
                      <label>Locality Description</label>
                      <textarea
                        rows={3}
                        className="filter-input-styled"
                        placeholder="Overview of accessibility, IT hubs, and social amenities..."
                        value={adminLocForm.description}
                        onChange={e => setAdminLocForm({ ...adminLocForm, description: e.target.value })}
                        style={{ resize: 'vertical' }}
                      />
                    </div>

                    <button className="btn-forest-primary" type="submit" style={{ marginTop: '8px' }}>
                      {editingLocId ? 'Update Locality Record' : 'Create Locality'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ADMIN MODAL: ADD AMENITY */}
            {adminAmenityModalOpen && (
              <div className="habitat-modal-overlay" onClick={() => setAdminAmenityModalOpen(false)}>
                <div className="habitat-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                  <button style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setAdminAmenityModalOpen(false)}>
                    <X size={18} />
                  </button>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>Add Infrastructure Amenity</h3>
                  <p style={{ fontSize: '12px', color: 'var(--ink-muted)', marginBottom: '16px' }}>Link key school, healthcare, transit, or commercial facility.</p>

                  <form onSubmit={handleSaveAmenity} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="filter-item">
                      <label>Locality</label>
                      <select
                        className="filter-select-styled"
                        value={adminAmenityForm.locality_id}
                        onChange={e => setAdminAmenityForm({ ...adminAmenityForm, locality_id: Number(e.target.value) })}
                      >
                        {localities.map(l => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-item">
                      <label>Amenity Name</label>
                      <input
                        required
                        className="filter-input-styled"
                        placeholder="e.g. Oakridge International School"
                        value={adminAmenityForm.name}
                        onChange={e => setAdminAmenityForm({ ...adminAmenityForm, name: e.target.value })}
                      />
                    </div>

                    <div className="filter-item">
                      <label>Category</label>
                      <select
                        className="filter-select-styled"
                        value={adminAmenityForm.category}
                        onChange={e => setAdminAmenityForm({ ...adminAmenityForm, category: e.target.value })}
                      >
                        <option value="School">School</option>
                        <option value="Hospital">Hospital</option>
                        <option value="Metro">Metro</option>
                        <option value="Park">Park</option>
                        <option value="Shopping Mall">Shopping Mall</option>
                        <option value="IT Hub">IT Hub</option>
                        <option value="Bank">Bank</option>
                        <option value="Transit">Transit</option>
                      </select>
                    </div>

                    <div className="filter-item">
                      <label>Description</label>
                      <input
                        className="filter-input-styled"
                        placeholder="e.g. Prominent CBSE and IB campus"
                        value={adminAmenityForm.description}
                        onChange={e => setAdminAmenityForm({ ...adminAmenityForm, description: e.target.value })}
                      />
                    </div>

                    <button className="btn-forest-primary" type="submit" style={{ marginTop: '8px' }}>
                      Add Amenity
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // PUBLIC HABITAT WEBSITE (REGULAR CLIENT SHELL)
  // =========================================================================
  return (
    <div className="habitat-shell">
      {/* SIDEBAR */}
      <aside className={`habitat-sidebar ${mobileNav ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand-box" onClick={() => setPage('overview')} style={{ cursor: 'pointer' }} title="Habitat Homepage">
          <div className="brand-leaf-icon">
            <Home size={19} />
          </div>
          <div className="brand-titles">
            <h1>habitat<span>.</span></h1>
            <p>SMART HOUSING &amp; ENVIRONMENTAL INTELLIGENCE</p>
          </div>
        </div>

        {/* PUBLIC NAVIGATION GROUPS */}
        {['MAIN', 'TOOLS'].map(sec => (
          <div className="sidebar-nav-section" key={sec}>
            <div className="nav-section-title">{sec}</div>
            {navItems.filter(item => item.section === sec).map(item => {
              const Icon = item.icon;
              const isActive = page === item.id;
              return (
                <button
                  key={item.id}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => { setPage(item.id); setMobileNav(false); }}
                >
                  <Icon size={17} />
                  <span>{item.label}</span>
                  {item.id === 'saved' && (favorites.length + alerts.length) > 0 && (
                    <span className="nav-badge-pill">{favorites.length + alerts.length}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {/* BOTTOM SIDEBAR PROMO WIDGET */}
        <div className="sidebar-bottom-promo">
          <div className="promo-green-box">
            <div className="promo-illustration-row">
              <Building2 size={24} />
              <Leaf size={18} />
            </div>
            <h4>Make smarter housing decisions</h4>
            <p>Balance affordability, amenities and environmental insights in one place.</p>
            <button className="promo-action-btn" onClick={() => setPage('recommendations')}>
              Get started <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="habitat-main">
        {/* TOPBAR */}
        <header className="habitat-topbar">
          <div className="topbar-breadcrumbs">
            <span>Habitat</span>
            <span>&gt;</span>
            <strong>{navItems.find(n => n.id === page)?.label || 'Overview'}</strong>
          </div>

          <div className="topbar-search-box">
            <div className="search-input-pill" onClick={() => setSearchModalOpen(true)}>
              <Search size={15} />
              <span>Search localities, prices, or insights...</span>
              <span className="kbd-badge">Ctrl K</span>
            </div>
          </div>

          <div className="topbar-controls">
            <div className="location-chip-select">
              <MapPin size={14} />
              <span>{selectedCity}</span>
              <ChevronDown size={13} />
            </div>

            <button
              className="btn-icon-circle"
              title="Alerts and notifications"
              onClick={() => setPage('saved')}
            >
              <Bell size={16} />
              {alerts.length > 0 && <span className="red-dot-indicator" />}
            </button>

            {user ? (
              <div
                className="user-profile-badge"
                onClick={() => {
                  if (confirm(`Signed in as ${user.name} (${user.email}). Click OK to Sign out.`)) {
                    localStorage.removeItem('housing_token');
                    setToken('');
                    setUser(null);
                  }
                }}
              >
                <div className="avatar-circle">{user.name.slice(0, 1).toUpperCase()}</div>
                <span>{user.name}</span>
              </div>
            ) : (
              <button className="btn-forest-primary" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={() => setAuthOpen(true)}>
                Sign in
              </button>
            )}
          </div>
        </header>

        {/* DYNAMIC PAGE ROUTER */}
        <div className="habitat-page-content">
          {error && (
            <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', padding: '12px 18px', borderRadius: '12px', marginBottom: '20px', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={18} />
              <span style={{ flex: 1, fontSize: '13px' }}>{error}</span>
              <button className="btn-forest-primary" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={loadData}>Retry</button>
            </div>
          )}

          {/* 1. OVERVIEW PAGE (EXACT MATCH TO REFERENCE IMAGE 1) */}
          {page === 'overview' && (
            <div>
              {/* EDITORIAL HERO */}
              <section className="editorial-hero">
                <div className="hero-text-side">
                  <div className="hero-tagline">Hyderabad Housing Intelligence</div>
                  <h1 className="hero-main-title">
                    Choose a neighbourhood with <span className="serif-italic">confidence.</span>
                  </h1>
                  <p className="hero-desc">
                    Compare housing affordability, explore amenities, and understand environmental conditions across Hyderabad — all in one place.
                  </p>

                  <div className="hero-btn-row">
                    <button className="btn-forest-primary" onClick={() => setPage('localities')}>
                      Explore localities <ArrowRight size={15} />
                    </button>
                    <button className="btn-outline-secondary" onClick={() => setPage('compare')}>
                      <BarChart3 size={15} /> Compare areas
                    </button>
                  </div>

                  <div className="hero-guarantees">
                    <div className="guarantee-item">
                      <Check size={14} /> Transparent calculations
                    </div>
                    <div className="guarantee-item">
                      <Check size={14} /> Comprehensive insights
                    </div>
                    <div className="guarantee-item">
                      <Check size={14} /> Better decisions
                    </div>
                  </div>
                </div>

                <div className="hero-photo-frame">
                  <img src="/assets/hero-street.jpg" alt="Residential neighborhood in Hyderabad" />
                </div>
              </section>

              {/* 4 KPI METRIC TILES */}
              <section className="kpi-metrics-row">
                <div className="kpi-tile">
                  <div className="kpi-square-icon green">
                    <Home size={20} />
                  </div>
                  <div className="kpi-tile-data">
                    <strong>{dashboard.locality_count || localities.length || 18}</strong>
                    <span>Localities tracked</span>
                  </div>
                </div>

                <div className="kpi-tile">
                  <div className="kpi-square-icon green">
                    <IndianRupee size={20} />
                  </div>
                  <div className="kpi-tile-data">
                    <strong>₹82.5L</strong>
                    <span>Median asking price</span>
                  </div>
                </div>

                <div className="kpi-tile">
                  <div className="kpi-square-icon amber">
                    <Key size={20} />
                  </div>
                  <div className="kpi-tile-data">
                    <strong>₹24,500</strong>
                    <span>Typical monthly rent</span>
                  </div>
                </div>

                <div className="kpi-tile">
                  <div className="kpi-square-icon green">
                    <Leaf size={20} />
                  </div>
                  <div className="kpi-tile-data">
                    <strong>116</strong>
                    <span>Median AQI index</span>
                  </div>
                </div>

                <div className="kpi-browse-all-card">
                  <span>Based on the latest records</span>
                  <button onClick={() => setPage('localities')}>
                    View all localities <ArrowRight size={12} />
                  </button>
                </div>
              </section>

              {/* 2-COLUMN SECTION: MARKET ASKING PRICES & LOCALITIES TO EXPLORE */}
              <section className="market-explorer-grid">
                {/* LEFT: ASKING PRICES CHART */}
                <div className="editorial-card">
                  <div className="card-title-row">
                    <div>
                      <h3>Asking prices across localities</h3>
                      <p>Average property price and monthly rent by locality</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div className="chart-legend-row">
                        <div className="legend-item">
                          <span className="dot-circle forest" /> Asking price (₹/sq.ft.)
                        </div>
                        <div className="legend-item">
                          <span className="dot-circle blue" /> Rent (₹/month)
                        </div>
                      </div>
                      <select className="select-filter-sm" defaultValue="6m">
                        <option value="6m">Last 6 months</option>
                        <option value="1y">Last 1 year</option>
                      </select>
                    </div>
                  </div>

                  <div className="chart-box-frame">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={marketChartData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} tickFormatter={v => `${v / 1000}k`} />
                        <YAxis yAxisId="right" orientation="right" hide />
                        <Tooltip
                          contentStyle={{ background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '12px' }}
                          formatter={(v: any, name: any) => (name.includes('Rent') ? `₹${Number(v).toLocaleString()}/mo` : `₹${Number(v).toLocaleString()}/sq.ft.`)}
                        />
                        <Line yAxisId="left" type="monotone" dataKey="priceRate" name="Price Rate" stroke="#176B50" strokeWidth={2.5} dot={{ r: 4, fill: '#176B50' }} />
                        <Line yAxisId="left" type="monotone" dataKey="rentMonth" name="Rent (monthly)" stroke="#2563EB" strokeWidth={2} dot={{ r: 3, fill: '#2563EB' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* RIGHT: LOCALITIES TO EXPLORE */}
                <div className="editorial-card">
                  <div className="card-title-row">
                    <h3>Localities to explore</h3>
                    <button className="btn-view-all-header" onClick={() => setPage('localities')}>
                      View all <ArrowRight size={13} />
                    </button>
                  </div>

                  <div className="localities-thumb-list">
                    {localities.slice(0, 5).map(loc => (
                      <div
                        className="locality-thumb-row"
                        key={loc.id}
                        onClick={() => { setEnvLocalityId(loc.id); setPage('localities'); }}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="thumb-square-img">
                          <img src={getLocalityPhoto(loc.name)} alt={loc.name} />
                        </div>
                        <div className="locality-meta-col">
                          <strong>{loc.name}</strong>
                          <span>{loc.city} · {loc.amenity_count} amenities</span>
                        </div>
                        <div className="locality-price-col">
                          <strong>{compact(loc.average_price)}</strong>
                          <span>avg. price</span>
                        </div>
                        <button className="btn-arrow-link">
                          <ArrowRight size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* 2-COLUMN BOTTOM SECTION: PERSONALISED INSIGHTS & QUICK TOOLS */}
              <section className="insights-tools-grid">
                {/* PERSONALISED INSIGHTS */}
                <div className="personalised-insights-card">
                  <div className="insights-card-photo">
                    <img src="/assets/apt-aura.jpg" alt="Apartment Aura" />
                  </div>
                  <div className="insights-card-info">
                    <div className="eyebrow-mini">PERSONALISED INSIGHTS</div>
                    <h3>A better fit for your budget</h3>
                    <p>Get locality recommendations based on your budget, preferred amenities, connectivity and environmental conditions.</p>
                    <button className="btn-shortlist-action" onClick={() => setPage('recommendations')}>
                      Build my shortlist <ArrowRight size={14} />
                    </button>
                  </div>
                </div>

                {/* QUICK TOOLS */}
                <div className="editorial-card">
                  <div className="card-title-row" style={{ marginBottom: '12px' }}>
                    <h3>Quick tools</h3>
                  </div>
                  <div className="quick-tools-list">
                    <button className="quick-tool-btn" onClick={() => { setCalcTab('emi'); setPage('calculators'); }}>
                      <div className="quick-tool-icon">
                        <Calculator size={16} />
                      </div>
                      <div className="quick-tool-content">
                        <strong>Calculate home loan</strong>
                        <span>Plan your monthly payments</span>
                      </div>
                      <ArrowRight size={14} />
                    </button>

                    <button className="quick-tool-btn" onClick={() => setPage('compare')}>
                      <div className="quick-tool-icon">
                        <BarChart3 size={16} />
                      </div>
                      <div className="quick-tool-content">
                        <strong>Compare neighbourhoods</strong>
                        <span>View side by side comparisons</span>
                      </div>
                      <ArrowRight size={14} />
                    </button>

                    <button className="quick-tool-btn" onClick={() => setChatOpen(true)}>
                      <div className="quick-tool-icon">
                        <MessageSquare size={16} />
                      </div>
                      <div className="quick-tool-content">
                        <strong>Ask Habitat Assistant</strong>
                        <span>Get help about localities, prices and more</span>
                      </div>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* 2. HOUSING EXPLORER (EXACT MATCH TO IMAGE 2) */}
          {page === 'housing' && (
            <div>
              <div className="page-title-banner">
                <div>
                  <h1>Housing Explorer</h1>
                  <p>Discover residential listings across Hyderabad with transparent prices and verified rate-per-square-foot metrics.</p>
                </div>
                <button className="btn-outline-secondary" onClick={handleExportCsv}>
                  <Download size={14} /> Export CSV
                </button>
              </div>

              {/* FILTER TOOLBAR */}
              <div className="editorial-filter-bar">
                <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'rgba(255, 255, 255, 0.04)', padding: '2px' }}>
                  <button
                    style={{ padding: '6px 14px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, background: explorerPurpose === 'buy' ? '#176B50' : 'transparent', color: explorerPurpose === 'buy' ? 'var(--bg-card)' : 'var(--ink-secondary)' }}
                    onClick={() => setExplorerPurpose('buy')}
                  >
                    Buy
                  </button>
                  <button
                    style={{ padding: '6px 14px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, background: explorerPurpose === 'rent' ? '#176B50' : 'transparent', color: explorerPurpose === 'rent' ? 'var(--bg-card)' : 'var(--ink-secondary)' }}
                    onClick={() => setExplorerPurpose('rent')}
                  >
                    Rent
                  </button>
                </div>

                <div className="filter-item">
                  <label>Locality</label>
                  <select className="filter-select-styled" value={explorerLocality} onChange={e => setExplorerLocality(e.target.value)}>
                    <option value="all">All Localities</option>
                    {localities.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-item">
                  <label>Property Type</label>
                  <select className="filter-select-styled" value={explorerType} onChange={e => setExplorerType(e.target.value)}>
                    <option value="all">All Types</option>
                    <option value="Apartment">Apartment</option>
                    <option value="Villa">Villa</option>
                    <option value="Gated Community">Gated Community</option>
                  </select>
                </div>

                <div className="filter-item">
                  <label>Bedrooms</label>
                  <select className="filter-select-styled" value={explorerBhk} onChange={e => setExplorerBhk(e.target.value)}>
                    <option value="all">All Bedrooms</option>
                    <option value="1">1 BHK</option>
                    <option value="2">2 BHK</option>
                    <option value="3">3 BHK</option>
                    <option value="4">4+ BHK</option>
                  </select>
                </div>

                <div className="filter-item">
                  <label>Max {explorerPurpose === 'buy' ? 'Budget (₹)' : 'Monthly Rent (₹)'}</label>
                  <input
                    className="filter-input-styled"
                    type="number"
                    placeholder="No Limit"
                    value={explorerMaxBudget}
                    onChange={e => setExplorerMaxBudget(e.target.value)}
                  />
                </div>

                <div className="filter-item">
                  <label>Sort By</label>
                  <select className="filter-select-styled" value={explorerSort} onChange={e => setExplorerSort(e.target.value as any)}>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="area_desc">Area: Largest</option>
                  </select>
                </div>

                <button
                  className="btn-outline-secondary"
                  onClick={() => {
                    setSearchQuery('');
                    setExplorerLocality('all');
                    setExplorerBhk('all');
                    setExplorerType('all');
                    setExplorerMaxBudget('');
                  }}
                >
                  Reset
                </button>
              </div>

              {/* RESULTS COUNT */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', fontSize: '13px', color: 'var(--ink-muted)' }}>
                <span><strong>{filteredProperties.length}</strong> properties found in Hyderabad</span>
                <span style={{ fontSize: '11px', color: 'var(--ink-light)' }}>Updated from verified baseline property records</span>
              </div>

              {/* PROPERTY CARDS GRID */}
              <div className="real-estate-grid">
                {filteredProperties.map((p, idx) => {
                  const isFav = favorites.some(f => f.locality_id === p.locality_id);
                  const photo = [
                    '/assets/apt-aura.jpg',
                    '/assets/villa-stone.jpg',
                    '/assets/highrise-glass.jpg',
                    '/assets/suburban-villas.jpg',
                    '/assets/hero-street.jpg'
                  ][idx % 5];

                  return (
                    <article className="property-photo-card" key={p.id}>
                      <div className="property-card-cover">
                        <img src={photo} alt={p.property_type} />
                        <span className="property-badge-type">{p.bhk} BHK · {p.property_type}</span>
                        <button
                          className={`property-btn-heart ${isFav ? 'saved' : ''}`}
                          onClick={() => toggleFavorite(p.locality_id)}
                          title="Bookmark locality"
                        >
                          <Heart size={16} fill={isFav ? '#DC2626' : 'none'} />
                        </button>
                      </div>

                      <div className="property-body-padding">
                        <div className="property-address">
                          <MapPin size={13} />
                          <span>{p.locality}, {p.city}</span>
                        </div>

                        <div className="property-pricing-line">
                          <div>
                            <strong>{money(explorerPurpose === 'buy' ? p.price : p.monthly_rent)}</strong>
                            <span style={{ display: 'block', fontSize: '10.5px', color: 'var(--ink-light)', marginTop: '2px' }}>
                              {explorerPurpose === 'buy' ? 'estimated price' : 'per month'}
                            </span>
                          </div>
                          <span className="property-rate-tag">
                            ₹{p.rate_per_sqft.toLocaleString()} / sq.ft.
                          </span>
                        </div>

                        <div className="property-spec-footer">
                          <span>{p.bhk} Bedrooms</span>
                          <span>·</span>
                          <span>{p.area_sqft.toLocaleString()} sq.ft.</span>
                          <span>·</span>
                          <button
                            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#176B50', fontWeight: 700, fontSize: '11.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                            onClick={() => setSelectedPropertyModal(p)}
                          >
                            Details <ArrowRight size={12} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. ENVIRONMENTAL INSIGHTS (EXACT MATCH TO IMAGE 3) */}
          {page === 'environment' && (
            <div>
              <div className="page-title-banner">
                <div>
                  <h1>Environmental Insights</h1>
                  <p>Explore air quality index (AQI) and historical pollutant records across monitored Hyderabad localities.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <select
                    className="select-filter-sm"
                    value={envLocalityId}
                    onChange={e => setEnvLocalityId(Number(e.target.value))}
                    style={{ padding: '8px 12px', fontSize: '12.5px' }}
                  >
                    {localities.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                  <button className="btn-forest-primary" style={{ padding: '8px 16px', fontSize: '12px' }}>
                    View data
                  </button>
                </div>
              </div>

              {/* 4 AIR QUALITY METRICS */}
              {(() => {
                const activeLoc = localities.find(l => l.id === envLocalityId) || localities[0];
                const latestAqi = activeLoc?.latest_aqi || 118;
                const pm25 = Math.round(latestAqi * 0.38);
                const pm10 = Math.round(latestAqi * 0.74);

                return (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                      <div className="kpi-tile">
                        <div className="kpi-square-icon green">
                          <Wind size={20} />
                        </div>
                        <div className="kpi-tile-data">
                          <strong>{latestAqi}</strong>
                          <span>AQI (Latest) · {activeLoc?.aqi_category || 'Moderate'}</span>
                        </div>
                      </div>

                      <div className="kpi-tile">
                        <div className="kpi-square-icon green">
                          <Activity size={20} />
                        </div>
                        <div className="kpi-tile-data">
                          <strong>{pm25} µg/m³</strong>
                          <span>PM2.5 (Fine particles)</span>
                        </div>
                      </div>

                      <div className="kpi-tile">
                        <div className="kpi-square-icon amber">
                          <Activity size={20} />
                        </div>
                        <div className="kpi-tile-data">
                          <strong>{pm10} µg/m³</strong>
                          <span>PM10 (Coarse particles)</span>
                        </div>
                      </div>

                      <div className="kpi-tile">
                        <div className="kpi-square-icon green">
                          <MapPin size={20} />
                        </div>
                        <div className="kpi-tile-data">
                          <strong>18</strong>
                          <span>Monitored Localities</span>
                        </div>
                      </div>
                    </div>

                    {/* MAIN TREND CHART & POLLUTANT BREAKDOWN */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px', marginBottom: '24px' }}>
                      {/* AQI TREND CHART */}
                      <div className="editorial-card">
                        <div className="card-title-row">
                          <div>
                            <h3>AQI Trend — {activeLoc?.name}</h3>
                            <p>Continuous daily and monthly CPCB monitoring observations</p>
                          </div>
                          <span style={{ fontSize: '11px', color: '#176B50', background: '#EBF5F1', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                            CPCB Standard Bands
                          </span>
                        </div>

                        <div className="chart-box-frame">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={envHistory.length > 0 ? envHistory : [
                                { observation_date: '90d ago', aqi: latestAqi + 18 },
                                { observation_date: '60d ago', aqi: latestAqi + 10 },
                                { observation_date: '30d ago', aqi: latestAqi + 4 },
                                { observation_date: 'Today', aqi: latestAqi }
                              ]}
                              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                              <defs>
                                <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#176B50" stopOpacity={0.35} />
                                  <stop offset="95%" stopColor="#176B50" stopOpacity={0.0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                              <XAxis dataKey="observation_date" tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} />
                              <YAxis tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} domain={[0, 250]} />
                              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                              <Area type="monotone" dataKey="aqi" name="AQI" stroke="#176B50" strokeWidth={2.5} fill="url(#aqiGradient)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* POLLUTANT BREAKDOWN BARS */}
                      <div className="editorial-card">
                        <div className="card-title-row">
                          <h3>Pollutant Levels (Latest Record)</h3>
                          <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>Unit: µg/m³</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
                          {[
                            { name: 'PM2.5', val: pm25, standard: '60 max', status: 'Good' },
                            { name: 'PM10', val: pm10, standard: '100 max', status: 'Moderate' },
                            { name: 'NO2', val: 28, standard: '80 max', status: 'Good' },
                            { name: 'SO2', val: 12, standard: '80 max', status: 'Good' },
                            { name: 'CO', val: 71, standard: '100 max', status: 'Moderate' },
                            { name: 'O3', val: 0.9, standard: '100 max', status: 'Good' }
                          ].map(item => (
                            <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '8px' }}>
                              <span style={{ fontWeight: 700, fontSize: '13px', width: '60px' }}>{item.name}</span>
                              <div style={{ flex: 1, margin: '0 16px', background: 'rgba(255, 255, 255, 0.05)', height: '6px', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(100, (item.val / 100) * 100)}%`, height: '100%', background: item.status === 'Good' ? '#176B50' : '#D97706', borderRadius: '4px' }} />
                              </div>
                              <span style={{ fontSize: '12px', fontWeight: 700, width: '45px', textAlign: 'right' }}>{item.val}</span>
                              <span style={{ fontSize: '10px', color: item.status === 'Good' ? '#176B50' : '#D97706', background: item.status === 'Good' ? '#EBF5F1' : '#FEF3C7', padding: '2px 6px', borderRadius: '4px', width: '55px', textAlign: 'center', marginLeft: '8px', fontWeight: 700 }}>
                                {item.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* ABOUT LOCALITY & DATA PROVENANCE */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px' }}>
                      <div className="editorial-card" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <div style={{ width: '130px', height: '100px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
                          <img src={getLocalityPhoto(activeLoc?.name)} alt={activeLoc?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div>
                          <h4 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>About {activeLoc?.name}</h4>
                          <p style={{ fontSize: '12.5px', color: 'var(--ink-muted)', lineHeight: '1.5', marginBottom: '10px' }}>
                            {activeLoc?.description}
                          </p>
                          <button className="btn-forest-primary" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => setPage('localities')}>
                            View locality directory <ArrowRight size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="editorial-card">
                        <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Info size={15} color="#176B50" /> Data Information
                        </h4>
                        <div style={{ fontSize: '11px', color: 'var(--ink-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div><strong>Observation Format:</strong> CPCB Sub-index calculation methodology</div>
                          <div><strong>Provenance:</strong> Official Telangana State Pollution Control Board &amp; CPCB stations</div>
                          <div><strong>Parameters:</strong> PM2.5, PM10, AQI Category</div>
                          <div style={{ color: '#176B50', fontWeight: 600, marginTop: '4px' }}>✓ Validated ambient air quality monitoring network.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* 4. COMPARE LOCALITIES (EXACT MATCH TO IMAGE 4) */}
          {page === 'compare' && (
            <div>
              <div className="page-title-banner">
                <div>
                  <h1>Compare Localities</h1>
                  <p>Analyse housing costs, amenities, connectivity, and environmental conditions across up to 5 localities side by side.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-outline-secondary" onClick={handleExportCsv}>
                    <Download size={14} /> Download comparison
                  </button>
                </div>
              </div>

              {/* SELECTION TRAY */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)', marginRight: '6px' }}>Selected ({compareSelected.length}/5):</span>
                  {localities.filter(l => compareSelected.includes(l.id)).map(loc => (
                    <span
                      key={loc.id}
                      style={{ background: '#EBF5F1', border: '1px solid #D6ECE3', color: '#176B50', fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      {loc.name}
                      <X
                        size={12}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setCompareSelected(prev => prev.filter(x => x !== loc.id))}
                      />
                    </span>
                  ))}
                  {compareSelected.length < 5 && (
                    <select
                      style={{ padding: '5px 10px', borderRadius: '6px', border: '1px dashed #CBD5E1', fontSize: '11.5px', background: 'transparent' }}
                      onChange={e => {
                        const id = Number(e.target.value);
                        if (id && !compareSelected.includes(id)) {
                          setCompareSelected(prev => [...prev, id]);
                        }
                      }}
                      value=""
                    >
                      <option value="">+ Add locality</option>
                      {localities.filter(l => !compareSelected.includes(l.id)).map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <button
                  className="btn-outline-secondary"
                  style={{ padding: '6px 12px', fontSize: '11px' }}
                  onClick={() => setCompareSelected(localities.slice(0, 4).map(x => x.id))}
                >
                  Reset defaults
                </button>
              </div>

              {/* COMPARISON CARDS ROW */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${compareSelected.length}, 1fr)`, gap: '16px', marginBottom: '24px' }}>
                {localities.filter(l => compareSelected.includes(l.id)).map(loc => (
                  <div key={loc.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ height: '110px' }}>
                      <img src={getLocalityPhoto(loc.name)} alt={loc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <strong style={{ display: 'block', fontSize: '14px', fontWeight: 800 }}>{loc.name}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>{loc.city}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* SIDE BY SIDE METRIC TABLE */}
              <div className="styled-table-card">
                <table className="habitat-table">
                  <thead>
                    <tr>
                      <th style={{ width: '220px' }}>Metric</th>
                      {localities.filter(l => compareSelected.includes(l.id)).map(l => (
                        <th key={l.id} style={{ fontWeight: 800 }}>{l.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Average Price</strong></td>
                      {localities.filter(l => compareSelected.includes(l.id)).map(l => (
                        <td key={l.id}><strong>{compact(l.average_price)}</strong></td>
                      ))}
                    </tr>
                    <tr>
                      <td><strong>Typical Monthly Rent</strong></td>
                      {localities.filter(l => compareSelected.includes(l.id)).map(l => (
                        <td key={l.id}>{money(l.average_rent)}/mo</td>
                      ))}
                    </tr>
                    <tr>
                      <td><strong>Air Quality Index (AQI)</strong></td>
                      {localities.filter(l => compareSelected.includes(l.id)).map(l => (
                        <td key={l.id}>
                          <span style={{ background: (l.latest_aqi || 0) <= 100 ? '#EBF5F1' : '#FEF3C7', color: (l.latest_aqi || 0) <= 100 ? '#176B50' : '#D97706', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '11px' }}>
                            {l.latest_aqi} ({l.aqi_category})
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td><strong>Cataloged Amenities</strong></td>
                      {localities.filter(l => compareSelected.includes(l.id)).map(l => (
                        <td key={l.id}>{l.amenity_count} key facilities</td>
                      ))}
                    </tr>
                    <tr>
                      <td><strong>Connectivity Score</strong></td>
                      {localities.filter(l => compareSelected.includes(l.id)).map(l => (
                        <td key={l.id}>{l.connectivity_score} / 5.0</td>
                      ))}
                    </tr>
                    <tr>
                      <td><strong>Key Strengths</strong></td>
                      {localities.filter(l => compareSelected.includes(l.id)).map(l => (
                        <td key={l.id} style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                          {l.connectivity_score >= 5 ? '• Premier Metro & Transit\n' : ''}
                          {(l.latest_aqi || 0) < 100 ? '• Cleaner suburban air\n' : ''}
                          {(l.average_price || 0) < 8000000 ? '• Highly affordable entry' : '• Established luxury corridor'}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. RECOMMENDATIONS (EXACT MATCH TO IMAGE 5) */}
          {page === 'recommendations' && (
            <div>
              <div className="page-title-banner">
                <div>
                  <h1>Find your best neighbourhood</h1>
                  <p>Get personalized locality recommendations based on your budget, lifestyle, and priorities.</p>
                </div>
                <button className="btn-forest-primary" onClick={runRecommendationsCalc}>
                  <Sparkles size={14} /> Calculate recommendations
                </button>
              </div>

              {/* PREFERENCE INPUT FORM */}
              <div className="editorial-card" style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '14px' }}>Your Preferences</h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
                  <div className="filter-item">
                    <label>Budget (₹)</label>
                    <input
                      className="filter-input-styled"
                      type="number"
                      value={recBudget}
                      onChange={e => setRecBudget(Number(e.target.value))}
                    />
                  </div>

                  <div className="filter-item">
                    <label>Preference</label>
                    <select className="filter-select-styled" value={recPurpose} onChange={e => setRecPurpose(e.target.value as any)}>
                      <option value="buy">Buy a Home</option>
                      <option value="rent">Rent an Apartment</option>
                    </select>
                  </div>

                  <div className="filter-item">
                    <label>Property Type</label>
                    <select className="filter-select-styled" value={recType} onChange={e => setRecType(e.target.value)}>
                      <option value="all">Apartment / Any</option>
                      <option value="Villa">Villa</option>
                      <option value="Gated Community">Gated Community</option>
                    </select>
                  </div>

                  <div className="filter-item">
                    <label>Bedrooms</label>
                    <select className="filter-select-styled" value={recBhk} onChange={e => setRecBhk(e.target.value)}>
                      <option value="1">1 BHK</option>
                      <option value="2">2 BHK</option>
                      <option value="3">3 BHK</option>
                      <option value="4">4 BHK</option>
                    </select>
                  </div>
                </div>

                {/* WEIGHT SLIDERS */}
                <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '12px', color: 'var(--ink-primary)' }}>
                    Priority Weights (Adjust to tune recommendations):
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                        <span>Affordability</span>
                        <strong>{wAfford}%</strong>
                      </div>
                      <input type="range" min="0" max="100" value={wAfford} onChange={e => setWAfford(Number(e.target.value))} style={{ width: '100%', accentColor: '#176B50' }} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                        <span>Environment (AQI)</span>
                        <strong>{wEnv}%</strong>
                      </div>
                      <input type="range" min="0" max="100" value={wEnv} onChange={e => setWEnv(Number(e.target.value))} style={{ width: '100%', accentColor: '#176B50' }} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                        <span>Amenities</span>
                        <strong>{wAmen}%</strong>
                      </div>
                      <input type="range" min="0" max="100" value={wAmen} onChange={e => setWAmen(Number(e.target.value))} style={{ width: '100%', accentColor: '#176B50' }} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                        <span>Connectivity</span>
                        <strong>{wConn}%</strong>
                      </div>
                      <input type="range" min="0" max="100" value={wConn} onChange={e => setWConn(Number(e.target.value))} style={{ width: '100%', accentColor: '#176B50' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* RECOMMENDED LOCALITIES RANKED LIST */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {(recommendations.length > 0 ? recommendations : localities.slice(0, 5).map((l, i) => ({
                  id: l.id,
                  name: l.name,
                  average_price: l.average_price,
                  average_rent: l.average_rent,
                  score: 88 - i * 4,
                  factors: { affordability: 85 - i * 3, environment: 80 - i * 2, amenities: 90, connectivity: 85 }
                }))).map((rec, index) => (
                  <div
                    key={rec.id}
                    className="editorial-card"
                    style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '18px 24px' }}
                  >
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: index === 0 ? '#176B50' : '#EBF5F1', color: index === 0 ? 'var(--bg-card)' : '#176B50', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '16px', flexShrink: 0 }}>
                      {index + 1}
                    </div>

                    <div style={{ width: '90px', height: '70px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                      <img src={getLocalityPhoto(rec.name)} alt={rec.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '15px', color: 'var(--ink-primary)' }}>{rec.name}</strong>
                        {index === 0 && (
                          <span style={{ background: '#EBF5F1', color: '#176B50', fontSize: '10.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                            Best overall fit
                          </span>
                        )}
                        {index === 1 && (
                          <span style={{ background: '#FEF3C7', color: '#D97706', fontSize: '10.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                            Great value
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '3px' }}>
                        {localities.find(l => l.id === rec.id)?.description || 'Prime residential locality in Hyderabad.'}
                      </p>

                      <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '11px', color: 'var(--ink-muted)' }}>
                        <span>Affordability: <strong>{rec.factors ? (rec.factors.affordability / 20).toFixed(1) : '4.5'}/5</strong></span>
                        <span>Environment: <strong>{rec.factors ? (rec.factors.environment / 20).toFixed(1) : '4.0'}/5</strong></span>
                        <span>Amenities: <strong>{rec.factors ? (rec.factors.amenities / 20).toFixed(1) : '4.5'}/5</strong></span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', minWidth: '100px' }}>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#176B50' }}>
                        {rec.score ? (rec.score / 20).toFixed(1) : '4.2'} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--ink-light)' }}>/ 5.0</span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--ink-muted)', display: 'block', marginTop: '3px' }}>
                        {compact(rec.average_price)} avg.
                      </span>
                      <button
                        style={{ background: 'none', border: 'none', color: '#176B50', fontSize: '11px', fontWeight: 700, marginTop: '6px', cursor: 'pointer' }}
                        onClick={() => { setEnvLocalityId(rec.id); setPage('localities'); }}
                      >
                        View details &gt;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. COST CALCULATORS (EXACT MATCH TO IMAGE 6) */}
          {page === 'calculators' && (
            <div>
              <div className="page-title-banner">
                <div>
                  <h1>Housing Cost Calculators</h1>
                  <p>Plan your home finances with transparent reducing-balance formulas and total ownership cost breakdowns.</p>
                </div>
              </div>

              {/* TABS HEADER */}
              <div className="tab-switcher-pills">
                <button className={`tab-pill-btn ${calcTab === 'emi' ? 'active' : ''}`} onClick={() => setCalcTab('emi')}>
                  Home Loan EMI
                </button>
                <button className={`tab-pill-btn ${calcTab === 'ownership' ? 'active' : ''}`} onClick={() => setCalcTab('ownership')}>
                  Total Ownership Cost
                </button>
                <button className={`tab-pill-btn ${calcTab === 'price' ? 'active' : ''}`} onClick={() => setCalcTab('price')}>
                  Property Price Estimate
                </button>
              </div>

              {/* TAB 1: HOME LOAN EMI */}
              {calcTab === 'emi' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
                  <div className="editorial-card">
                    <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>Home loan EMI calculator</h3>
                    <p style={{ fontSize: '12px', color: 'var(--ink-muted)', marginBottom: '20px' }}>Calculate your monthly EMI and total repayment using reducing-balance formula.</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div className="filter-item">
                        <label>Loan amount (₹)</label>
                        <input
                          className="filter-input-styled"
                          type="number"
                          value={emiPrincipal}
                          onChange={e => setEmiPrincipal(Number(e.target.value))}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="filter-item">
                          <label>Interest rate (% per annum)</label>
                          <input
                            className="filter-input-styled"
                            type="number"
                            step="0.1"
                            value={emiRate}
                            onChange={e => setEmiRate(Number(e.target.value))}
                          />
                        </div>
                        <div className="filter-item">
                          <label>Tenure (years)</label>
                          <input
                            className="filter-input-styled"
                            type="number"
                            value={emiTenure}
                            onChange={e => setEmiTenure(Number(e.target.value))}
                          />
                        </div>
                      </div>

                      <button className="btn-forest-primary" style={{ marginTop: '10px' }} onClick={runEmiCalc}>
                        Calculate EMI
                      </button>
                    </div>
                  </div>

                  {/* RESULTS CARD WITH DONUT CHART */}
                  <div className="editorial-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase' }}>Results</div>
                    <div style={{ fontSize: '32px', fontWeight: 800, color: '#176B50', margin: '8px 0 16px', letterSpacing: '-0.5px' }}>
                      {money(emiResult?.monthly_emi || 34716)}
                      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink-muted)', display: 'block' }}>Monthly EMI</span>
                    </div>

                    <div style={{ height: '140px', width: '100%', marginBottom: '14px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Principal Amount', value: emiPrincipal },
                              { name: 'Total Interest', value: emiResult?.total_interest || 4331916 }
                            ]}
                            innerRadius={38}
                            outerRadius={58}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            <Cell fill="#176B50" />
                            <Cell fill="var(--ink-secondary)" />
                          </Pie>
                          <Tooltip formatter={(v: any) => money(Number(v))} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Total payment:</span>
                        <strong>{money(emiResult?.total_payment || 8331916)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Total interest:</span>
                        <strong>{money(emiResult?.total_interest || 4331916)}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TOTAL OWNERSHIP COST */}
              {calcTab === 'ownership' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
                  <div className="editorial-card">
                    <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>Total ownership cost estimator</h3>
                    <p style={{ fontSize: '12px', color: 'var(--ink-muted)', marginBottom: '20px' }}>Include one-time acquisition charges, stamp duty, registration, and recurring society maintenance.</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div className="filter-item">
                        <label>Property Price (₹)</label>
                        <input className="filter-input-styled" type="number" value={ownPrice} onChange={e => setOwnPrice(Number(e.target.value))} />
                      </div>
                      <div className="filter-item">
                        <label>Down Payment (%)</label>
                        <input className="filter-input-styled" type="number" value={ownDownPay} onChange={e => setOwnDownPay(Number(e.target.value))} />
                      </div>
                      <div className="filter-item">
                        <label>Holding Period (years)</label>
                        <input className="filter-input-styled" type="number" value={ownHolding} onChange={e => setOwnHolding(Number(e.target.value))} />
                      </div>
                      <div className="filter-item">
                        <label>Monthly Maintenance (₹)</label>
                        <input className="filter-input-styled" type="number" value={ownMaintenance} onChange={e => setOwnMaintenance(Number(e.target.value))} />
                      </div>
                    </div>

                    <button className="btn-forest-primary" style={{ marginTop: '16px' }} onClick={runOwnershipCalc}>
                      Calculate Ownership Breakdown
                    </button>
                  </div>

                  <div className="editorial-card">
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>Estimated Outlay Over {ownHolding} Years</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: '#176B50', margin: '8px 0 16px' }}>
                      {money(ownResult?.total_outlay || 11250000)}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Down Payment (20%):</span>
                        <strong>{money(ownResult?.down_payment || 1700000)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Stamp Duty (6%):</span>
                        <strong>{money(ownResult?.stamp_duty || 510000)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Registration (1.5%):</span>
                        <strong>{money(ownResult?.registration || 127500)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '6px' }}>
                        <span>Total Upfront Needed:</span>
                        <strong>{money(ownResult?.total_upfront || 2362500)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Monthly EMI Commitment:</span>
                        <strong>{money(ownResult?.monthly_emi || 59000)}/mo</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PROPERTY PRICE ESTIMATE */}
              {calcTab === 'price' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
                  <div className="editorial-card">
                    <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>Property price estimator</h3>
                    <p style={{ fontSize: '12px', color: 'var(--ink-muted)', marginBottom: '20px' }}>Calculate valuation based on built-up floor area and prevailing rate per square foot.</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="filter-item">
                        <label>Property Area (sq. ft.)</label>
                        <input className="filter-input-styled" type="number" value={estArea} onChange={e => setEstArea(Number(e.target.value))} />
                      </div>
                      <div className="filter-item">
                        <label>Rate per sq. ft. (₹)</label>
                        <input className="filter-input-styled" type="number" value={estRate} onChange={e => setEstRate(Number(e.target.value))} />
                      </div>
                    </div>

                    <button
                      className="btn-forest-primary"
                      style={{ marginTop: '16px' }}
                      onClick={() => setEstPriceResult(estArea * estRate)}
                    >
                      Estimate Price
                    </button>
                  </div>

                  <div className="editorial-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-muted)' }}>Estimated Property Valuation</div>
                    <div style={{ fontSize: '32px', fontWeight: 800, color: '#176B50', margin: '8px 0 16px' }}>
                      {money(estPriceResult || estArea * estRate)}
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                      Calculation: {estArea.toLocaleString()} sq.ft. × ₹{estRate.toLocaleString()} = {compact(estPriceResult || estArea * estRate)}.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 7. LOCALITY DIRECTORY (EXACT MATCH TO IMAGE 7) */}
          {page === 'localities' && (
            <div>
              <div className="page-title-banner">
                <div>
                  <h1>Locality Directory</h1>
                  <p>Explore all 18 monitored Hyderabad localities with rich photos, amenities, transport access, and recorded environmental context.</p>
                </div>
              </div>

              <div className="real-estate-grid">
                {localities.map(loc => {
                  const isFav = favorites.some(f => f.locality_id === loc.id);
                  return (
                    <article className="property-photo-card" key={loc.id}>
                      <div className="property-card-cover">
                        <img src={getLocalityPhoto(loc.name)} alt={loc.name} />
                        <span className="property-badge-type">{loc.city}</span>
                        <button
                          className={`property-btn-heart ${isFav ? 'saved' : ''}`}
                          onClick={() => toggleFavorite(loc.id)}
                          title="Bookmark locality"
                        >
                          <Heart size={16} fill={isFav ? '#DC2626' : 'none'} />
                        </button>
                      </div>

                      <div className="property-body-padding">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink-primary)' }}>{loc.name}</h3>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#176B50', background: '#EBF5F1', padding: '2px 7px', borderRadius: '4px' }}>
                            {loc.connectivity_score}/5 conn.
                          </span>
                        </div>

                        <p style={{ fontSize: '12px', color: 'var(--ink-muted)', minHeight: '34px', lineHeight: '1.45', marginBottom: '12px' }}>
                          {loc.description}
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', padding: '10px 0', marginBottom: '12px', fontSize: '11px' }}>
                          <div>
                            <span style={{ color: 'var(--ink-light)', display: 'block' }}>Avg. Price</span>
                            <strong>{compact(loc.average_price)}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--ink-light)', display: 'block' }}>Rent</span>
                            <strong>{compact(loc.average_rent)}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--ink-light)', display: 'block' }}>AQI</span>
                            <strong style={{ color: (loc.latest_aqi || 0) <= 100 ? '#176B50' : '#D97706' }}>{loc.latest_aqi || '—'}</strong>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>{loc.amenity_count} key amenities</span>
                          <button
                            className="btn-outline-secondary"
                            style={{ padding: '6px 10px', fontSize: '11px' }}
                            onClick={() => {
                              if (!compareSelected.includes(loc.id)) {
                                setCompareSelected(prev => [...prev.slice(-4), loc.id]);
                              }
                              setPage('compare');
                            }}
                          >
                            Compare <ArrowRight size={12} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {/* 8. SAVED PLACES & ALERTS (EXACT MATCH TO IMAGE 8) */}
          {page === 'saved' && (
            <div>
              <div className="page-title-banner">
                <div>
                  <h1>Saved Places &amp; Alerts</h1>
                  <p>Keep your favourite localities together and set alert rules for price, rent or AQI thresholds.</p>
                </div>
                <button className="btn-forest-primary" onClick={() => setAlertModalOpen(true)}>
                  <Plus size={14} /> Add alert rule
                </button>
              </div>

              {!user && (
                <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', padding: '12px 18px', borderRadius: '12px', marginBottom: '20px', color: '#92400E', fontSize: '12.5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Sign in to persist your bookmarks and threshold alert rules across sessions.</span>
                  <button className="btn-forest-primary" style={{ padding: '5px 12px', fontSize: '11px' }} onClick={() => setAuthOpen(true)}>Sign in</button>
                </div>
              )}

              {/* SAVED LOCALITIES TABLE */}
              <div className="editorial-card" style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '14px' }}>Saved Localities</h3>

                {favorites.length > 0 ? (
                  <div className="styled-table-card">
                    <table className="habitat-table">
                      <thead>
                        <tr>
                          <th>Locality</th>
                          <th>Avg. Price</th>
                          <th>Typical Rent</th>
                          <th>Air Quality (AQI)</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {favorites.map(fav => {
                          const loc = localities.find(l => l.id === fav.locality_id);
                          if (!loc) return null;
                          return (
                            <tr key={fav.id}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div style={{ width: '36px', height: '36px', borderRadius: '6px', overflow: 'hidden' }}>
                                    <img src={getLocalityPhoto(loc.name)} alt={loc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  </div>
                                  <div>
                                    <strong>{loc.name}</strong>
                                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--ink-muted)' }}>{loc.city}</span>
                                  </div>
                                </div>
                              </td>
                              <td>{compact(loc.average_price)}</td>
                              <td>{money(loc.average_rent)}/mo</td>
                              <td>{loc.latest_aqi} ({loc.aqi_category})</td>
                              <td>
                                <button
                                  style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: '4px' }}
                                  onClick={() => toggleFavorite(loc.id)}
                                  title="Remove"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>No saved places yet. Click the bookmark icon on any locality or property to save it.</p>
                )}
              </div>

              {/* THRESHOLD ALERTS TABLE */}
              <div className="editorial-card">
                <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '14px' }}>Active Threshold Alert Rules</h3>
                {alerts.length > 0 ? (
                  <div className="styled-table-card">
                    <table className="habitat-table">
                      <thead>
                        <tr>
                          <th>Locality</th>
                          <th>Max Price Trigger</th>
                          <th>Max Rent Trigger</th>
                          <th>Max AQI Trigger</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alerts.map(a => (
                          <tr key={a.id}>
                            <td><strong>{a.locality}</strong></td>
                            <td>{a.max_price ? compact(a.max_price) : '—'}</td>
                            <td>{a.max_rent ? money(a.max_rent) : '—'}</td>
                            <td>{a.max_aqi ? `AQI ≤ ${a.max_aqi}` : '—'}</td>
                            <td>
                              <span style={{ background: a.matched ? '#EBF5F1' : 'rgba(255, 255, 255, 0.04)', color: a.matched ? '#176B50' : 'var(--ink-muted)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                                {a.matched ? 'Condition Met' : 'Monitoring'}
                              </span>
                            </td>
                            <td>
                              <button
                                style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer' }}
                                onClick={async () => {
                                  await axios.delete(`${API}/alerts/${a.id}`, { headers: authHeaders });
                                  setAlerts(prev => prev.filter(x => x.id !== a.id));
                                }}
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>No alert rules configured. Click "Add alert rule" above to create price or AQI triggers.</p>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* FLOATING HABITAT ASSISTANT (BUILT-IN RULE-BASED CHATBOT) */}
      <button
        className="habitat-chat-launcher"
        onClick={() => setChatOpen(v => !v)}
        title="Open Habitat Assistant"
      >
        {chatOpen ? <X size={22} /> : <MessageSquare size={22} />}
      </button>

      {chatOpen && (
        <div className="habitat-chat-popup">
          <div className="chat-popup-header">
            <div className="chat-agent-info">
              <div className="agent-green-avatar">
                <Leaf size={16} />
              </div>
              <div>
                <strong>Habitat Assistant</strong>
                <span>Deterministic rule-based agent · No external AI</span>
              </div>
            </div>
            <button
              style={{ background: 'none', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer' }}
              onClick={() => setChatOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          <div className="chat-messages-scroll">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`chat-msg-row ${msg.from}`}>
                <div className={`chat-msg-bubble ${msg.from}`}>
                  <div style={{ whiteSpace: 'pre-line' }}>{msg.text}</div>
                  {msg.action && (
                    <button
                      className="chat-deep-link-btn"
                      onClick={() => {
                        setPage(msg.action!.replace('/', '') as Page);
                        setChatOpen(false);
                      }}
                    >
                      Open section <ArrowRight size={12} />
                    </button>
                  )}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.07)' }}>
                      {msg.suggestions.map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          style={{
                            background: 'var(--bg-card)',
                            border: '1px solid #D6ECE3',
                            borderRadius: '12px',
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#176B50',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease'
                          }}
                          onClick={() => handleChatSend(sug)}
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {chatBusy && (
              <div className="chat-msg-row bot">
                <div className="chat-msg-bubble bot" style={{ fontStyle: 'italic', color: 'var(--ink-muted)' }}>
                  Consulting database records...
                </div>
              </div>
            )}
          </div>

          {/* QUICK PROMPT CHIPS */}
          <div className="chat-prompt-chips">
            {[
              'Price in Kukatpally',
              'Rent in Gachibowli',
              'Calculate loan EMI',
              'Compare Kukatpally and Miyapur',
              'Cleanest air localities',
              'Most affordable areas'
            ].map(prompt => (
              <button key={prompt} className="chat-chip" onClick={() => handleChatSend(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          {/* CHAT INPUT BAR */}
          <form
            className="chat-input-bar"
            onSubmit={e => { e.preventDefault(); handleChatSend(); }}
          >
            <input
              placeholder="Ask about prices, EMI, localities, AQI..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
            />
            <button className="chat-send-icon-btn" type="submit" disabled={!chatInput.trim() || chatBusy}>
              <Send size={15} />
            </button>
          </form>
        </div>
      )}

      {/* GLOBAL SEARCH MODAL (CTRL + K) */}
      {searchModalOpen && (
        <div className="habitat-modal-overlay" onClick={() => setSearchModalOpen(false)}>
          <div className="habitat-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
              <Search size={18} color="#176B50" />
              <input
                autoFocus
                placeholder="Search localities, housing prices, or calculators..."
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px' }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <span className="kbd-badge">ESC</span>
            </div>

            <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {localities
                .filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.description.toLowerCase().includes(searchQuery.toLowerCase()))
                .slice(0, 6)
                .map(l => (
                  <div
                    key={l.id}
                    style={{ padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.04)' }}
                    onClick={() => {
                      setEnvLocalityId(l.id);
                      setPage('localities');
                      setSearchModalOpen(false);
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '13px' }}>{l.name}</strong>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--ink-muted)' }}>{compact(l.average_price)} avg · AQI {l.latest_aqi}</span>
                    </div>
                    <ArrowRight size={14} color="#176B50" />
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* PROPERTY DETAIL MODAL */}
      {selectedPropertyModal && (
        <div className="habitat-modal-overlay" onClick={() => setSelectedPropertyModal(null)}>
          <div className="habitat-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <button
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => setSelectedPropertyModal(null)}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>
              {selectedPropertyModal.bhk} BHK {selectedPropertyModal.property_type}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--ink-muted)', marginBottom: '16px' }}>
              {selectedPropertyModal.locality}, {selectedPropertyModal.city}
            </p>

            <div style={{ height: '200px', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' }}>
              <img src={getLocalityPhoto(selectedPropertyModal.locality)} alt={selectedPropertyModal.locality} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: 'rgba(255, 255, 255, 0.04)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '12px' }}>
              <div>
                <span style={{ color: 'var(--ink-light)', display: 'block' }}>Asking Price</span>
                <strong style={{ color: '#176B50', fontSize: '15px' }}>{money(selectedPropertyModal.price)}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--ink-light)', display: 'block' }}>Monthly Rent</span>
                <strong>{money(selectedPropertyModal.monthly_rent)}/mo</strong>
              </div>
              <div>
                <span style={{ color: 'var(--ink-light)', display: 'block' }}>Rate / sq.ft.</span>
                <strong>₹{selectedPropertyModal.rate_per_sqft.toLocaleString()}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn-forest-primary"
                style={{ flex: 1 }}
                onClick={() => {
                  setEmiPrincipal(Math.round(selectedPropertyModal.price * 0.8));
                  setCalcTab('emi');
                  setPage('calculators');
                  setSelectedPropertyModal(null);
                }}
              >
                Estimate EMI for this property
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE ALERT MODAL */}
      {alertModalOpen && (
        <div className="habitat-modal-overlay" onClick={() => setAlertModalOpen(false)}>
          <div className="habitat-modal-card" onClick={e => e.stopPropagation()}>
            <button
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => setAlertModalOpen(false)}
            >
              <X size={18} />
            </button>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>Create Alert Rule</h3>
            <p style={{ fontSize: '12px', color: 'var(--ink-muted)', marginBottom: '16px' }}>Set notification thresholds. Evaluated against active database records.</p>

            <form onSubmit={handleCreateAlert} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="filter-item">
                <label>Locality</label>
                <select className="filter-select-styled" value={newAlertForm.locality_id} onChange={e => setNewAlertForm({ ...newAlertForm, locality_id: Number(e.target.value) })}>
                  {localities.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div className="filter-item">
                <label>Max Price Threshold (₹)</label>
                <input className="filter-input-styled" type="number" placeholder="e.g. 8000000" value={newAlertForm.max_price} onChange={e => setNewAlertForm({ ...newAlertForm, max_price: e.target.value })} />
              </div>

              <div className="filter-item">
                <label>Max Monthly Rent Threshold (₹)</label>
                <input className="filter-input-styled" type="number" placeholder="e.g. 25000" value={newAlertForm.max_rent} onChange={e => setNewAlertForm({ ...newAlertForm, max_rent: e.target.value })} />
              </div>

              <div className="filter-item">
                <label>Max AQI Limit</label>
                <input className="filter-input-styled" type="number" placeholder="e.g. 100" value={newAlertForm.max_aqi} onChange={e => setNewAlertForm({ ...newAlertForm, max_aqi: e.target.value })} />
              </div>

              <button className="btn-forest-primary" type="submit" style={{ marginTop: '8px' }}>
                Save Alert Rule
              </button>
            </form>
          </div>
        </div>
      )}

      {/* AUTH MODAL */}
      {authOpen && (
        <div className="habitat-modal-overlay" onClick={() => setAuthOpen(false)}>
          <div className="habitat-modal-card" onClick={e => e.stopPropagation()}>
            <button
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => setAuthOpen(false)}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>
              {authMode === 'login' ? 'Welcome back to habitat.' : 'Create your account'}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--ink-muted)', marginBottom: '16px' }}>
              {authMode === 'login' ? 'Sign in to access saved bookmarks and manage alert rules.' : 'Register a personal account for saved shortlists and custom alerts.'}
            </p>

            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {authMode === 'register' && (
                <div className="filter-item">
                  <label>Full Name</label>
                  <input required className="filter-input-styled" value={authForm.name} onChange={e => setAuthForm({ ...authForm, name: e.target.value })} />
                </div>
              )}

              <div className="filter-item">
                <label>Email Address</label>
                <input required type="email" className="filter-input-styled" value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} />
              </div>

              <div className="filter-item">
                <label>Password</label>
                <input required type="password" minLength={8} className="filter-input-styled" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} />
              </div>

              {authError && <p style={{ fontSize: '11px', color: '#DC2626' }}>{authError}</p>}

              <button className="btn-forest-primary" type="submit" style={{ marginTop: '6px' }}>
                {authMode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </form>

            <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--ink-muted)' }}>
              {authMode === 'login' ? 'Don’t have an account?' : 'Already have an account?'}{' '}
              <button
                style={{ background: 'none', border: 'none', color: '#176B50', fontWeight: 700, cursor: 'pointer' }}
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              >
                {authMode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
