import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from 'next-themes';
import {
  Building2,
  Key,
  RefreshCw,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit2,
  Plus,
  Search,
  ArrowLeft,
  Activity,
  Terminal,
  ArrowRight,
  Lock,
  Unlock,
  Clock,
  Link,
  ShieldCheck,
  Building,
  Users,
  Layers,
  Send,
  HelpCircle
} from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { ThemeToggleButton } from '../ThemeToggle';

interface Institute {
  _id: string;
  name: string;
  instituteId: string;
  email: string;
  contactPerson: string;
  phone: string;
  domain: string;
  subscription: string;
  status: 'active' | 'suspended' | 'deleted';
  apiKeyConfigured: boolean;
  studentCount: number;
  courseCount: number;
  createdAt: string;
}

interface APILog {
  _id: string;
  eventType: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export default function InstitutesManagementPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [isDark, setIsDark] = useState(true);

  // States
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [selectedInst, setSelectedInst] = useState<Institute | null>(null);
  const [instDetails, setInstDetails] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals / Wizards
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1: Info, 2: Key Gen, 3: Test Connection
  const [wizardForm, setWizardForm] = useState({ name: '', email: '', contactPerson: '', phone: '', domain: '', subscription: 'enterprise' });
  const [createdInstId, setCreatedInstId] = useState('');
  const [createdInst, setCreatedInst] = useState<Institute | null>(null);
  const [generatedApiKey, setGeneratedApiKey] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [testApiKey, setTestApiKey] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  // CRM Integration configuration states
  const [crmApiUrl, setCrmApiUrl] = useState('');
  const [crmInstituteId, setCrmInstituteId] = useState('');
  const [crmApiKey, setCrmApiKey] = useState('');
  const [crmApiVersion, setCrmApiVersion] = useState('v1');
  const [crmSyncEnabled, setCrmSyncEnabled] = useState(false);
  const [savingCrm, setSavingCrm] = useState(false);
  const [testingCrm, setTestingCrm] = useState(false);
  const [crmTestResult, setCrmTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Edit State
  const [editingInst, setEditingInst] = useState<Institute | null>(null);
  const [editForm, setEditForm] = useState({ name: '', instituteId: '', contactPerson: '', phone: '', domain: '', subscription: '' });

  // Key Alert State (for manual gen outside wizard)
  const [displayNewKey, setDisplayNewKey] = useState('');

  // Sync theme
  useEffect(() => {
    setIsDark(theme !== 'light');
  }, [theme]);

  // Load Institutes
  const loadInstitutes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/owner/institutes');
      setInstitutes(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load institutes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInstitutes();
  }, [loadInstitutes]);

  // Sync CRM Integration states when details are loaded
  useEffect(() => {
    if (instDetails?.profile?.integration) {
      setCrmApiUrl(instDetails.profile.integration.crmApiUrl || '');
      setCrmInstituteId(instDetails.profile.integration.crmInstituteId || '');
      setCrmApiKey(instDetails.profile.integration.apiKeyHash ? '••••••••' : '');
      setCrmApiVersion(instDetails.profile.integration.apiVersion || 'v1');
      setCrmSyncEnabled(instDetails.profile.integration.syncEnabled === true);
      setCrmTestResult(null);
    } else {
      setCrmApiUrl('');
      setCrmInstituteId('');
      setCrmApiKey('');
      setCrmApiVersion('v1');
      setCrmSyncEnabled(false);
      setCrmTestResult(null);
    }
  }, [instDetails]);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Never';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const handleSaveCrmConfig = async () => {
    if (!selectedInst) return;
    setSavingCrm(true);
    setError('');
    setSuccess('');
    try {
      const updated = await apiFetch(`/owner/institutes/${selectedInst._id}/crm-integration`, {
        method: 'PUT',
        body: JSON.stringify({
          crmApiUrl,
          crmInstituteId,
          apiKey: crmApiKey === '••••••••' ? undefined : crmApiKey,
          apiVersion: crmApiVersion,
          syncEnabled: crmSyncEnabled
        })
      });
      setSuccess('CRM Integration settings saved successfully.');
      loadDetails(selectedInst._id);
    } catch (err: any) {
      setError(err.message || 'Failed to save CRM settings');
    } finally {
      setSavingCrm(false);
    }
  };

  const handleTestCrm = async () => {
    if (!selectedInst) return;
    setTestingCrm(true);
    setCrmTestResult(null);
    try {
      const res = await apiFetch(`/owner/institutes/${selectedInst._id}/test-crm`, {
        method: 'POST'
      });
      if (res.success) {
        setCrmTestResult({ success: true, message: res.message || 'CRM connection successful!' });
        loadDetails(selectedInst._id);
      } else {
        setCrmTestResult({ success: false, message: res.message || 'CRM connection failed.' });
      }
    } catch (err: any) {
      setCrmTestResult({ success: false, message: err.message || 'Connection request failed.' });
    } finally {
      setTestingCrm(false);
    }
  };

  // Load Institute details
  const loadDetails = async (id: string) => {
    setError('');
    try {
      const data = await apiFetch(`/owner/institutes/${id}/details`);
      setInstDetails(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load details');
    }
  };

  const handleSelectInstitute = (inst: Institute) => {
    setSelectedInst(inst);
    loadDetails(inst._id);
  };

  // Toggle status
  const handleToggleSuspend = async (inst: Institute) => {
    if (!confirm(`Are you sure you want to ${inst.status === 'active' ? 'suspend' : 'activate'} ${inst.name}?`)) return;
    setError('');
    setSuccess('');
    try {
      const updated = await apiFetch(`/owner/institutes/${inst._id}/suspend`, { method: 'PUT' });
      setSuccess(`Institute ${inst.name} status updated successfully.`);
      loadInstitutes();
      if (selectedInst?._id === inst._id) {
        setSelectedInst({ ...selectedInst, status: updated.status });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update status.');
    }
  };

  // Onboarding Wizard - Step 1: Create
  const handleCreateInstitute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wizardForm.name || !wizardForm.email) return;
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch('/owner/institutes', {
        method: 'POST',
        body: JSON.stringify(wizardForm)
      });
      setCreatedInstId(data._id);
      setCreatedInst(data);
      setWizardStep(2);
      loadInstitutes();
    } catch (err: any) {
      setError(err.message || 'Failed to create institute');
    } finally {
      setLoading(false);
    }
  };

  // Onboarding Wizard - Step 2: Key Gen
  const handleGenerateKey = async (id: string) => {
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch(`/owner/institutes/${id}/api-key`, { method: 'POST' });
      setGeneratedApiKey(data.apiKey);
      setTestApiKey(data.apiKey); // autofill test field
      loadInstitutes();
      if (selectedInst?._id === id) {
        loadDetails(id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate API Key');
    } finally {
      setLoading(false);
    }
  };

  // Onboarding Wizard - Step 3: Test
  const handleTestCRMConnection = async () => {
    if (!testApiKey) return;
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/integration/health', {
        method: 'GET',
        headers: {
          'x-api-key': testApiKey,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({ success: true, message: 'CRM integration authenticated successfully!' });
      } else {
        setTestResult({ success: false, message: data.message || 'Invalid API Key configuration.' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Network connection failed.' });
    } finally {
      setTestingConnection(false);
    }
  };

  // Close Wizard
  const closeWizard = () => {
    setShowCreateWizard(false);
    setWizardStep(1);
    setWizardForm({ name: '', email: '', contactPerson: '', phone: '', domain: '', subscription: 'enterprise' });
    setCreatedInstId('');
    setCreatedInst(null);
    setGeneratedApiKey('');
    setTestApiKey('');
    setTestResult(null);
    setCopiedKey(false);
  };

  // Edit modal
  const startEdit = (inst: Institute) => {
    setEditingInst(inst);
    setEditForm({
      name: inst.name,
      instituteId: inst.instituteId || '',
      contactPerson: inst.contactPerson || '',
      phone: inst.phone || '',
      domain: inst.domain || '',
      subscription: inst.subscription || ''
    });
  };

  const handleUpdateInstitute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInst) return;
    setError('');
    setSuccess('');
    try {
      const updated = await apiFetch(`/owner/institutes/${editingInst._id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm)
      });
      setSuccess(`Institute details saved successfully.`);
      setEditingInst(null);
      loadInstitutes();
      if (selectedInst?._id === editingInst._id) {
        handleSelectInstitute(updated);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update institute details.');
    }
  };

  // API Key Disable
  const handleDisableKey = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to disable the API key for ${name}? Connection keys will be completely revoked.`)) return;
    setError('');
    setSuccess('');
    try {
      await apiFetch(`/owner/institutes/${id}/api-key`, { method: 'DELETE' });
      setSuccess(`API key revoked for ${name}.`);
      loadInstitutes();
      if (selectedInst?._id === id) {
        loadDetails(id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to revoke API key.');
    }
  };

  // API Key Generation (outside Wizard)
  const handleGenerateKeyManual = async (id: string, name: string) => {
    setError('');
    setSuccess('');
    setDisplayNewKey('');
    try {
      const data = await apiFetch(`/owner/institutes/${id}/api-key`, { method: 'POST' });
      setDisplayNewKey(data.apiKey);
      loadInstitutes();
      if (selectedInst?._id === id) {
        loadDetails(id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate key.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const filtered = institutes.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.instituteId && i.instituteId.toLowerCase().includes(search.toLowerCase())) ||
    i.email.toLowerCase().includes(search.toLowerCase())
  );

  const integrationBaseUrl = window.location.origin + '/api/integration';

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-[#06060f] text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      <div className="flex-grow flex flex-col min-w-0">
        
        {/* Header */}
        <header className={`min-h-16 flex flex-wrap items-center justify-between gap-4 px-6 py-3 border-b backdrop-blur-xl ${
          isDark ? 'border-white/[0.05] bg-[#08081a]/80' : 'border-slate-200/60 bg-white/80'
        }`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/owner')}
              className={`p-2 rounded-xl transition-all border ${
                isDark ? 'bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.08] text-white' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold leading-none">Institute & CRM Integrations</h1>
              <p className={`text-xs mt-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Onboard tenants, issue API keys, and test active syncs</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggleButton />
            <button
              onClick={() => setShowCreateWizard(true)}
              className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-violet-500/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Onboard Institute</span>
            </button>
          </div>
        </header>

        {/* Workspace Layout */}
        <main className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-0 overflow-y-auto">
          
          {/* List panel */}
          <section className={`xl:col-span-4 border-r p-6 space-y-4 ${
            isDark ? 'border-white/[0.05]' : 'border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-violet-500">Tenants List</h2>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                isDark ? 'bg-white/[0.04] text-white/40 border border-white/[0.06]' : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}>{filtered.length} total</span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, ID or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-xs border transition-all ${
                  isDark ? 'bg-white/[0.02] border-white/[0.06] focus:border-violet-500/50 text-white focus:bg-white/[0.04]' : 'bg-white border-slate-200 focus:border-violet-500 text-slate-800'
                }`}
              />
            </div>

            {/* Errors/Success */}
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="flex-1">{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="flex-1">{success}</span>
              </div>
            )}

            {/* Institutes list cards */}
            <div className="space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto">
              <AnimatePresence>
                {filtered.map(inst => {
                  const isSelected = selectedInst?._id === inst._id;
                  return (
                    <motion.div
                      layout
                      key={inst._id}
                      onClick={() => handleSelectInstitute(inst)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? isDark
                            ? 'bg-violet-600/10 border-violet-500/40 text-white shadow-md shadow-violet-500/5'
                            : 'bg-violet-50 border-violet-200 text-slate-900 shadow-sm'
                          : isDark
                            ? 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]'
                            : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm hover:shadow'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Building className={`w-4 h-4 ${isSelected ? 'text-violet-500' : 'text-slate-400'}`} />
                          <h3 className="text-xs font-bold truncate max-w-[160px]">{inst.name}</h3>
                        </div>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          inst.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>{inst.status}</span>
                      </div>
                      
                      <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400">
                        <span>ID: <code className="text-white/60 font-mono text-[9px]">{inst.instituteId || 'None'}</code></span>
                        <span>Key: {inst.apiKeyConfigured ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-0.5"><ShieldCheck className="w-3 h-3" /> Active</span>
                        ) : (
                          <span className="text-slate-500 font-semibold">None Issued</span>
                        )}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {filtered.length === 0 && (
                <div className={`p-8 rounded-xl border border-dashed text-center text-xs ${
                  isDark ? 'border-white/[0.06] text-white/30' : 'border-slate-200 text-slate-400'
                }`}>
                  No institutes match your search.
                </div>
              )}
            </div>
          </section>

          {/* Details & Logs panel */}
          <section className={`xl:col-span-8 p-6 space-y-6 overflow-y-auto ${
            isDark ? 'bg-[#04040a]' : 'bg-slate-50'
          }`}>
            <AnimatePresence mode="wait">
              {selectedInst && instDetails ? (
                <motion.div
                  key={selectedInst._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {/* Banner */}
                  <div className={`p-5 rounded-2xl border ${
                    isDark ? 'bg-gradient-to-br from-violet-950/20 to-indigo-950/10 border-white/[0.06]' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-lg font-bold">{selectedInst.name}</h2>
                          <button
                            onClick={() => startEdit(selectedInst)}
                            className={`p-1.5 rounded-lg border transition-all ${
                              isDark ? 'bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.08] text-white/60' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                            }`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className={`text-xs mt-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Onboarded on {new Date(selectedInst.createdAt).toLocaleDateString()}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Status controls */}
                        <button
                          onClick={() => handleToggleSuspend(selectedInst)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                            selectedInst.status === 'active'
                              ? 'text-red-400 border-red-500/20 bg-red-500/10 hover:bg-red-500/20'
                              : 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20'
                          }`}
                        >
                          {selectedInst.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>

                        {/* Revoke / Generate Keys */}
                        {instDetails.profile.apiKeyConfigured ? (
                          <>
                            <button
                              onClick={() => handleDisableKey(selectedInst._id, selectedInst.name)}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-rose-500/30 text-rose-400 bg-rose-500/5 hover:bg-rose-500/10"
                            >
                              Disable Key
                            </button>
                            <button
                              onClick={() => handleGenerateKeyManual(selectedInst._id, selectedInst.name)}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-violet-500/30 text-violet-400 bg-violet-500/5 hover:bg-violet-500/10"
                            >
                              Regenerate Key
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleGenerateKeyManual(selectedInst._id, selectedInst.name)}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white"
                          >
                            Generate API Key
                          </button>
                        )}
                      </div>
                    </div>

                    {/* API Key Modal display once */}
                    {displayNewKey && (
                      <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 space-y-2.5">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <h4 className="text-xs font-bold uppercase tracking-wider">New CRM API Key Generated</h4>
                        </div>
                        <p className="text-[11px] leading-relaxed opacity-80">
                          This API Key is shown <strong>only once</strong> for security. Copy it now and save it securely in your CRM config (e.g. GFI CRM environment variables).
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <code className="flex-1 bg-black/40 px-3 py-2 rounded-lg text-xs font-mono select-all text-white border border-white/[0.08] break-all">{displayNewKey}</code>
                          <button
                            onClick={() => copyToClipboard(displayNewKey)}
                            className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                          >
                            {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Summary Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className={`p-4 rounded-xl border ${isDark ? 'bg-white/[0.02] border-white/[0.04]' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Institute ID</div>
                      <div className="text-xs font-mono font-bold mt-1 text-violet-400">{selectedInst.instituteId || 'None'}</div>
                    </div>
                    <div className={`p-4 rounded-xl border ${isDark ? 'bg-white/[0.02] border-white/[0.04]' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Students Synced</div>
                      <div className="text-base font-bold mt-1 flex items-center gap-2"><Users className="w-4 h-4 text-sky-400" /> {instDetails.stats.students}</div>
                    </div>
                    <div className={`p-4 rounded-xl border ${isDark ? 'bg-white/[0.02] border-white/[0.04]' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Course Assignments</div>
                      <div className="text-base font-bold mt-1 flex items-center gap-2"><Layers className="w-4 h-4 text-violet-400" /> {instDetails.stats.courseAssignmentsCount || 0}</div>
                    </div>
                    <div className={`p-4 rounded-xl border ${isDark ? 'bg-white/[0.02] border-white/[0.04]' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Last API Sync</div>
                      <div className="text-[11px] font-bold mt-1.5 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span className="truncate">{instDetails.stats.lastApiUsage ? new Date(instDetails.stats.lastApiUsage).toLocaleDateString() : 'Never'}</span>
                      </div>
                    </div>
                  </div>

                  {/* CRM Integration Settings Page */}
                  <div className={`p-5 rounded-xl border ${isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-violet-500" />
                        <h3 className="text-xs font-bold uppercase tracking-wider">CRM Integration Settings</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Onboarding status badges */}
                        {instDetails.profile.integration?.onboardingStatus === 'verified' && (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <Check className="w-3 h-3" /> CRM Connected
                          </span>
                        )}
                        {instDetails.profile.integration?.onboardingStatus === 'configured' && (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Connection Pending/Failed
                          </span>
                        )}
                        {(instDetails.profile.integration?.onboardingStatus === 'pending' || !instDetails.profile.integration?.onboardingStatus) && (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Not Configured
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* CRM Integration Decoupled / Coming Soon Notification */}
                      <div className="p-4 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400 text-xs flex flex-col gap-1 shadow-lg shadow-violet-500/5">
                        <span className="font-bold text-sm">CRM Integration</span>
                        <span className="font-semibold text-xs text-violet-300">Coming Soon</span>
                        <span className="opacity-80">Available in a future update</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-slate-400">CRM API Base URL</label>
                          <input
                            type="text"
                            placeholder="e.g. https://crm.gfi.edu"
                            value={crmApiUrl}
                            onChange={(e) => setCrmApiUrl(e.target.value)}
                            disabled={true}
                            className={`w-full px-3.5 py-2.5 rounded-xl text-xs border ${
                              isDark ? 'bg-[#0f0f23] border-white/[0.08] text-white/50 focus:border-violet-500 focus:bg-[#0f0f2a]' : 'bg-slate-100 border-slate-200 text-slate-400'
                            }`}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-slate-400">CRM Institute ID</label>
                          <input
                            type="text"
                            placeholder="e.g. 6a2d10978f77d510c879f5aa"
                            value={crmInstituteId}
                            onChange={(e) => setCrmInstituteId(e.target.value)}
                            disabled={true}
                            className={`w-full px-3.5 py-2.5 rounded-xl text-xs border ${
                              isDark ? 'bg-[#0f0f23] border-white/[0.08] text-white/50 focus:border-violet-500 focus:bg-[#0f0f2a]' : 'bg-slate-100 border-slate-200 text-slate-400'
                            }`}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-slate-400">API Version</label>
                          <select
                            value={crmApiVersion}
                            onChange={(e) => setCrmApiVersion(e.target.value)}
                            disabled={true}
                            className={`w-full px-3.5 py-2.5 rounded-xl text-xs border ${
                              isDark ? 'bg-[#0f0f23] border-white/[0.08] text-white/50 focus:border-violet-500 focus:bg-[#0f0f2a]' : 'bg-slate-100 border-slate-200 text-slate-400'
                            }`}
                          >
                            <option value="v1">v1 (Default)</option>
                            <option value="v2">v2 (Legacy Backup)</option>
                            <option value="v3">v3 (Advanced ERP)</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-slate-400">CRM API Token / Key</label>
                          <input
                            type="password"
                            placeholder="Type new API key..."
                            value={crmApiKey}
                            onChange={(e) => setCrmApiKey(e.target.value)}
                            disabled={true}
                            className={`w-full px-3.5 py-2.5 rounded-xl text-xs border ${
                              isDark ? 'bg-[#0f0f23] border-white/[0.08] text-white/50 focus:border-violet-500 focus:bg-[#0f0f2a]' : 'bg-slate-100 border-slate-200 text-slate-400'
                            }`}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between py-2 border-t border-b border-white/[0.04] mt-2">
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-semibold text-slate-300">Enable Background Sync</span>
                          <p className={`text-[10px] ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Allow SSO logins to query this CRM for student profile updates</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={crmSyncEnabled}
                            onChange={(e) => setCrmSyncEnabled(e.target.checked)}
                            disabled={true}
                            className="sr-only peer"
                          />
                          <div className={`w-9 h-5 rounded-full peer transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${
                            isDark 
                              ? 'bg-white/[0.08] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-checked:after:border-white' 
                              : 'bg-slate-200 peer-checked:bg-violet-600 peer-checked:after:translate-x-full'
                          }`}></div>
                        </label>
                      </div>

                      {/* Connection Test Log & Sync Stats Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 p-3 rounded-xl bg-white/[0.01] border border-white/[0.04]">
                        <div className="space-y-1.5">
                          <h4 className="text-[10px] font-bold uppercase text-slate-400">Connection Log</h4>
                          <div className="text-[11px] text-slate-300 space-y-1 leading-relaxed">
                            <div>Test Result: <span className={`font-mono text-[10px] font-bold ${
                              instDetails.profile.integration?.lastConnectionTestResult === 'success' ? 'text-emerald-400' : 'text-red-400'
                            }`}>{instDetails.profile.integration?.lastConnectionTestResult || 'No checks performed'}</span></div>
                            <div>Last Checked: <span className="font-semibold text-slate-400">{formatDate(instDetails.profile.integration?.lastConnectionTestAt)}</span></div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <h4 className="text-[10px] font-bold uppercase text-slate-400">Sync Statistics</h4>
                          <div className="text-[11px] text-slate-300 space-y-1 leading-relaxed">
                            <div>Success Rate: <span className="text-emerald-400 font-bold">{instDetails.profile.integration?.successfulSyncCount || 0}</span> success, <span className="text-red-400 font-bold">{instDetails.profile.integration?.failedSyncCount || 0}</span> failed</div>
                            <div>Last Sync: <span className="font-semibold text-slate-400">{formatDate(instDetails.profile.integration?.lastSuccessfulSyncAt)}</span></div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-white/[0.05]">
                        <button
                          onClick={handleTestCrm}
                          disabled={true}
                          className="px-4 py-2.5 rounded-xl border border-slate-500/30 text-slate-400 disabled:opacity-50 text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-not-allowed"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Test Connection</span>
                        </button>

                        <button
                          onClick={handleSaveCrmConfig}
                          disabled={true}
                          className="px-4 py-2.5 rounded-xl bg-slate-700 text-slate-400 disabled:opacity-50 text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-not-allowed"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Save Configuration</span>
                        </button>
                      </div>

                      {crmTestResult && (
                        <div className={`p-3 rounded-lg flex items-center gap-2.5 text-xs ${
                          crmTestResult.success
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/10 border border-red-500/20 text-red-400'
                        }`}>
                          {crmTestResult.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          <span>{crmTestResult.message}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* API Logs & Docs Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* API Logs panel */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-violet-500 flex items-center gap-2">
                          <Terminal className="w-4 h-4" /> API Access Logs
                        </h3>
                        <span className="text-[10px] text-slate-500">{instDetails.recentActivity.apiLogs?.length || 0} logs</span>
                      </div>
                      
                      <div className={`max-h-[350px] overflow-y-auto rounded-xl border divide-y ${
                        isDark ? 'bg-black/20 border-white/[0.05] divide-white/[0.04]' : 'bg-white border-slate-200 divide-slate-100'
                      }`}>
                        {instDetails.recentActivity.apiLogs && instDetails.recentActivity.apiLogs.map((log: APILog) => (
                          <div key={log._id} className="p-3 text-[11px] hover:bg-white/[0.01]">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-300">{log.eventType}</span>
                              <span className="text-slate-500 text-[10px]">{new Date(log.createdAt).toLocaleTimeString()}</span>
                            </div>
                            <p className="mt-1 text-slate-400 leading-relaxed font-mono text-[10px]">{log.details}</p>
                            <div className="mt-1.5 flex items-center gap-3 text-[9px] text-slate-500">
                              <span>IP: {log.ipAddress}</span>
                              <span className="truncate max-w-[150px]">UA: {log.userAgent}</span>
                            </div>
                          </div>
                        ))}

                        {(!instDetails.recentActivity.apiLogs || instDetails.recentActivity.apiLogs.length === 0) && (
                          <div className="p-8 text-center text-slate-500 text-xs">
                            No API requests logged yet.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Integrated Documentation Panel */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-violet-500 flex items-center gap-2">
                        <HelpCircle className="w-4 h-4" /> Integration Panel
                      </h3>
                      
                      <div className={`p-4 rounded-xl border space-y-4 text-xs ${
                        isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-white border-slate-200 shadow-sm'
                      }`}>
                        <div>
                          <div className="font-semibold text-slate-300">Base URL:</div>
                          <code className="block bg-black/40 p-2 rounded-lg text-[10px] font-mono select-all text-white border border-white/[0.05] mt-1 break-all">{integrationBaseUrl}</code>
                        </div>

                        <div>
                          <div className="font-semibold text-slate-300">Required Header:</div>
                          <code className="block bg-black/40 p-2 rounded-lg text-[10px] font-mono select-all text-white border border-white/[0.05] mt-1 break-all">x-api-key: [apiKey]</code>
                        </div>

                        <div className="pt-2 border-t border-white/[0.05] space-y-1 text-[10px] text-slate-400">
                          <div className="font-semibold text-slate-300 uppercase tracking-wider text-[9px] mb-1">Payload Specs:</div>
                          <div>• <strong>POST `/students`</strong>: Sync student. Fields: `studentId`, `name`, `email`, `phone`.</div>
                          <div>• <strong>POST `/course-assignments`</strong>: Link student to course. Fields: `studentId`, `courseId`.</div>
                          <div>• <strong>GET `/student-access/:studentId`</strong>: Fetch permissions card.</div>
                        </div>
                      </div>
                    </div>
                  </div>

                </motion.div>
              ) : (
                <div className="h-96 flex flex-col items-center justify-center text-center space-y-4">
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/[0.02] border-white/[0.04]' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <Building2 className="w-10 h-10 text-slate-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">No Institute Selected</h3>
                    <p className={`text-xs mt-1 max-w-xs ${isDark ? 'text-white/40' : 'text-slate-400'}`}>Select an institute from the side panel to manage configurations, credentials, and access API logs.</p>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </section>
        </main>
      </div>

      {/* Onboarding Wizard Modal */}
      {showCreateWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden transition-all ${
            isDark ? 'bg-[#0b0b1c] border-white/[0.08]' : 'bg-white border-slate-200'
          }`}>
            <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-white/[0.05]' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-violet-500" />
                <h3 className="text-sm font-bold">New Institute CRM Onboarding</h3>
              </div>
              <button onClick={closeWizard} className="text-slate-400 hover:text-white">&times;</button>
            </div>

            {/* Steps indicator */}
            <div className={`flex items-center justify-between px-6 py-3 border-b text-[10px] font-bold ${
              isDark ? 'bg-white/[0.02] border-white/[0.04] text-white/40' : 'bg-slate-50 border-slate-100 text-slate-500'
            }`}>
              <span className={wizardStep === 1 ? 'text-violet-400' : 'text-slate-500'}>1. METADATA</span>
              <ArrowRight className="w-3.5 h-3.5" />
              <span className={wizardStep === 2 ? 'text-violet-400' : 'text-slate-500'}>2. CREDENTIALS</span>
              <ArrowRight className="w-3.5 h-3.5" />
              <span className={wizardStep === 3 ? 'text-violet-400' : 'text-slate-500'}>3. CONNECTIVITY TEST</span>
            </div>

            <div className="p-6">
              {wizardStep === 1 && (
                <form onSubmit={handleCreateInstitute} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400">Institute Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Stanford University"
                      value={wizardForm.name}
                      onChange={(e) => setWizardForm({ ...wizardForm, name: e.target.value })}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs border ${
                        isDark ? 'bg-white/[0.02] border-white/[0.08] text-white focus:border-violet-500' : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400">Primary Contact Email</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. Stanford@stanford.edu"
                      value={wizardForm.email}
                      onChange={(e) => setWizardForm({ ...wizardForm, email: e.target.value })}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs border ${
                        isDark ? 'bg-white/[0.02] border-white/[0.08] text-white focus:border-violet-500' : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400">Domain Slug</label>
                      <input
                        type="text"
                        placeholder="stanford.edu"
                        value={wizardForm.domain}
                        onChange={(e) => setWizardForm({ ...wizardForm, domain: e.target.value })}
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs border ${
                          isDark ? 'bg-white/[0.02] border-white/[0.08] text-white focus:border-violet-500' : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400">Contact Person</label>
                      <input
                        type="text"
                        placeholder="Dr. Emily Watson"
                        value={wizardForm.contactPerson}
                        onChange={(e) => setWizardForm({ ...wizardForm, contactPerson: e.target.value })}
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs border ${
                          isDark ? 'bg-white/[0.02] border-white/[0.08] text-white focus:border-violet-500' : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    <button type="button" onClick={closeWizard} className={`text-xs px-4 py-2.5 rounded-xl font-bold transition-all border ${
                      isDark ? 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !wizardForm.name || !wizardForm.email}
                      className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all disabled:opacity-50"
                    >
                      {loading ? 'Creating...' : 'Create & Continue'}
                    </button>
                  </div>
                </form>
              )}

              {wizardStep === 2 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold">Institute Profile Created Successfully!</h4>
                      <p className="text-[10px] opacity-80 mt-0.5">Instance ID: <strong>{createdInst?.instituteId}</strong></p>
                    </div>
                  </div>

                  {!generatedApiKey ? (
                    <div className="text-center py-6 space-y-4">
                      <Key className="w-12 h-12 text-violet-500 mx-auto animate-pulse" />
                      <div>
                        <h4 className="text-xs font-bold">Generate CRM Authentication Token</h4>
                        <p className={`text-[10px] max-w-sm mx-auto mt-1 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                          Every CRM requires a token to connect. Generating the key creates a one-time credential block.
                        </p>
                      </div>
                      <button
                        onClick={() => handleGenerateKey(createdInstId)}
                        className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-lg shadow-violet-500/20 active:scale-95 transition-all"
                      >
                        Generate Key Pair
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed space-y-2">
                        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                          <AlertCircle className="w-4 h-4 shrink-0" /> One-time token generated
                        </div>
                        <p className="text-[10px] opacity-85">
                          Copy the key now. It is hashed using bcrypt and stored securely. You will **not** be able to see it again.
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <code className="flex-1 bg-black/40 px-3 py-2 rounded-lg text-xs font-mono text-white border border-white/[0.08] break-all">{generatedApiKey}</code>
                          <button
                            onClick={() => copyToClipboard(generatedApiKey)}
                            className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                          >
                            {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/[0.05] flex justify-end">
                        <button
                          onClick={() => setWizardStep(3)}
                          className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-violet-500/25 transition-all"
                        >
                          <span>Proceed to Connectivity Test</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Verify Connection Status</h4>
                    <p className={`text-[11px] mt-1 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                      Let's run a test verification loop with the newly generated key to ensure routing and API authentication are healthy.
                    </p>
                  </div>

                  <div className={`p-4 rounded-xl border text-xs space-y-3 ${isDark ? 'bg-white/[0.01] border-white/[0.05]' : 'bg-slate-50 border-slate-100 shadow-sm'}`}>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500">INTEGRATION URL:</span>
                      <code className="block mt-1 bg-black/30 p-2 rounded text-[10px] font-mono select-all text-white border border-white/[0.04] break-all">{integrationBaseUrl}/health</code>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500">API KEY TO TEST:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="password"
                          placeholder="Paste API Key here..."
                          value={testApiKey}
                          onChange={(e) => setTestApiKey(e.target.value)}
                          className={`flex-1 px-3 py-2 rounded-lg text-xs font-mono border ${
                            isDark ? 'bg-[#0f0f23] border-white/[0.08] text-white focus:border-violet-500' : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        />
                        <button
                          onClick={handleTestCRMConnection}
                          disabled={testingConnection || !testApiKey}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{testingConnection ? 'Testing...' : 'Test Connection'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {testResult && (
                    <div className={`p-3 rounded-lg flex items-center gap-2.5 text-xs ${
                      testResult.success
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/10 border border-red-500/20 text-red-400'
                    }`}>
                      {testResult.success ? <CheckCircle2 className="w-4.5 h-4.5" /> : <XCircle className="w-4.5 h-4.5" />}
                      <span>{testResult.message}</span>
                    </div>
                  )}

                  <div className="pt-4 border-t border-white/[0.05] flex justify-end">
                    <button
                      onClick={closeWizard}
                      className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-lg shadow-violet-500/25 active:scale-95 transition-all"
                    >
                      Finish Onboarding
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Institute Modal */}
      {editingInst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <form onSubmit={handleUpdateInstitute} className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden transition-all ${
            isDark ? 'bg-[#0b0b1c] border-white/[0.08]' : 'bg-white border-slate-200'
          }`}>
            <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-white/[0.05]' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-violet-500" />
                <h3 className="text-sm font-bold">Edit Institute Metadata</h3>
              </div>
              <button type="button" onClick={() => setEditingInst(null)} className="text-slate-400 hover:text-white">&times;</button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Institute Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border ${
                    isDark ? 'bg-white/[0.02] border-white/[0.08] text-white focus:border-violet-500' : 'bg-white border-slate-200 text-slate-700'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Institute ID (Unique Slug)</label>
                <input
                  type="text"
                  required
                  value={editForm.instituteId}
                  onChange={(e) => setEditForm({ ...editForm, instituteId: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border ${
                    isDark ? 'bg-white/[0.02] border-white/[0.08] text-white focus:border-violet-500' : 'bg-white border-slate-200 text-slate-700'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Domain Slug</label>
                <input
                  type="text"
                  value={editForm.domain}
                  onChange={(e) => setEditForm({ ...editForm, domain: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border ${
                    isDark ? 'bg-white/[0.02] border-white/[0.08] text-white focus:border-violet-500' : 'bg-white border-slate-200 text-slate-700'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Contact Person</label>
                  <input
                    type="text"
                    value={editForm.contactPerson}
                    onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border ${
                      isDark ? 'bg-white/[0.02] border-white/[0.08] text-white focus:border-violet-500' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Contact Phone</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border ${
                      isDark ? 'bg-white/[0.02] border-white/[0.08] text-white focus:border-violet-500' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className={`p-5 border-t flex justify-end gap-3 ${isDark ? 'border-white/[0.05]' : 'border-slate-100'}`}>
              <button
                type="button"
                onClick={() => setEditingInst(null)}
                className={`text-xs px-4 py-2.5 rounded-xl font-bold border ${
                  isDark ? 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-lg shadow-violet-500/20 active:scale-95 transition-all"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
