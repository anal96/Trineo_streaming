import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { apiFetch } from '../../utils/api';
import trineoLogoImg from '@/images/trineoStream-1.png';
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  User, 
  Users, 
  Lock, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  Globe, 
  Megaphone,
  Eye, 
  EyeOff, 
  Check, 
  ShieldCheck, 
  Crown,
  HelpCircle,
  BookOpen, 
  Award, 
  BarChart3, 
  Headphones,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { ThemeToggleButton } from '../ThemeToggle';

interface Plan {
  _id: string;
  name: string;
  price: number;
  billingCycle: string;
  studentLimit: number;
  storageLimit: number;
  features: string[];
  description?: string;
}

const COUNTRIES = [
  'United States',
  'India',
  'Canada',
  'United Kingdom',
  'Australia',
  'Singapore',
  'Germany',
  'United Arab Emirates',
  'Other'
];

const STATES_BY_COUNTRY: Record<string, string[]> = {
  'United States': [
    'California', 'Massachusetts', 'New York', 'Texas', 'Florida', 
    'Illinois', 'Washington', 'Pennsylvania', 'Ohio', 'Georgia'
  ],
  'India': [
    'Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Telangana', 
    'Uttar Pradesh', 'Gujarat', 'West Bengal', 'Rajasthan', 'Kerala'
  ],
  'Canada': [
    'Ontario', 'Quebec', 'British Columbia', 'Alberta', 'Manitoba', 
    'Saskatchewan', 'Nova Scotia'
  ]
};

const STUDENT_COUNTS = [
  { label: 'Under 50 Students', value: 50 },
  { label: '50 - 100 Students', value: 100 },
  { label: '101 - 500 Students', value: 500 },
  { label: '501 - 1000 Students', value: 1000 },
  { label: '1000+ Students', value: 2000 }
];

const HEAR_ABOUT_US_OPTIONS = [
  'Google Search',
  'Social Media (LinkedIn, Twitter, etc.)',
  'Word of Mouth / Recommendation',
  'YouTube / Video Ads',
  'News / Article',
  'Other'
];

export default function InstituteRegisterPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [isDark, setIsDark] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  
  // Step system: 1 = Details, 2 = Review, 3 = Success
  const [currentStep, setCurrentStep] = useState(1);

  // Form states
  const [name, setName] = useState('');
  const [instituteEmail, setInstituteEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [studentCount, setStudentCount] = useState<number>(100); // Defaults to 50-100 range (value 100)
  const [hearAbout, setHearAbout] = useState('');

  // Admin Account details
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setIsDark(theme !== 'light');
  }, [theme]);

  // Synchronize Admin Email/Name initially to save clicks, but let them customize
  useEffect(() => {
    if (!adminEmail && instituteEmail) {
      setAdminEmail(instituteEmail);
    }
  }, [instituteEmail]);

  useEffect(() => {
    // Fetch active plans on mount
    const fetchPlans = async () => {
      try {
        const data = await apiFetch('/onboarding/plans');
        setPlans(data);
        if (data && data.length > 0) {
          // Select Professional plan by default if available
          const prof = data.find((p: Plan) => p.name.toLowerCase() === 'professional');
          setSelectedPlanId(prof ? prof._id : data[0]._id);
        }
      } catch (err: any) {
        console.error('Failed to load plans:', err);
      }
    };
    fetchPlans();
  }, []);

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Field checks
    if (!name.trim()) return setError('Institute Name is required.');
    if (!instituteEmail.trim()) return setError('Institute Email is required.');
    if (!phone.trim()) return setError('Phone Number is required.');
    if (!address.trim()) return setError('Street Address is required.');
    if (!country) return setError('Please select a Country.');
    if (!state.trim()) return setError('State / Province is required.');
    if (!city.trim()) return setError('City is required.');
    if (!adminName.trim()) return setError('Administrator Name is required.');
    if (!adminEmail.trim()) return setError('Administrator Email is required.');
    if (!adminPassword) return setError('Administrator Password is required.');
    if (adminPassword.length < 6) return setError('Password must be at least 6 characters.');
    if (adminPassword !== confirmPassword) return setError('Passwords do not match.');
    if (!selectedPlanId) return setError('Please select a subscription plan.');

    // Proceed to Step 2 (Review)
    setCurrentStep(2);
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    
    // Build combined address
    const fullAddress = `${address}, ${city}, ${state}, ${country}${website ? ` (Website: ${website})` : ''}${hearAbout ? ` | Referral: ${hearAbout}` : ''}`;

    try {
      await apiFetch('/onboarding/register', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email: adminEmail, // Admin email will be used as login user email
          phone,
          address: fullAddress,
          contactPerson: adminName,
          studentCount: Number(studentCount),
          planId: selectedPlanId,
          adminPassword
        })
      });
      setSuccess(true);
      setCurrentStep(3);
    } catch (err: any) {
      setError(err.message || 'Onboarding registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = plans.find(p => p._id === selectedPlanId);

  return (
    <div className={`min-h-screen py-4 px-4 sm:px-6 lg:px-8 transition-colors duration-300 relative ${
      isDark 
        ? 'bg-[#080816] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/15 via-[#080816] to-[#04040a] text-white' 
        : 'bg-[#f5f6fa] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-50/20 via-[#f5f6fa] to-slate-100/60 text-slate-800'
    }`}>
      {/* Floating Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggleButton className="rounded-xl border border-slate-200 dark:border-white/10 shadow-sm" />
      </div>

      {isDark && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[45%] -left-[15%] w-[75%] h-[75%] rounded-full bg-violet-600/5 blur-[120px]" />
          <div className="absolute -bottom-[45%] -right-[15%] w-[75%] h-[75%] rounded-full bg-indigo-600/5 blur-[120px]" />
        </div>
      )}

      {/* Main Container - Optimized for desktop screens 1920x1080 */}
      <div className="w-full max-w-[1520px] mx-auto relative z-10 my-1">
        
        {/* Compact Logo and Help Header */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <div className={`w-10 h-10 rounded-xl overflow-hidden bg-white shadow-sm flex items-center justify-center border ${
              isDark ? 'border-white/10' : 'border-slate-200/60'
            }`}>
              <img src={trineoLogoImg} alt="Trineo Logo" className="w-7 h-7 object-contain" />
            </div>
            <div>
              <div className={`text-base font-extrabold tracking-tight leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>Trineo Stream</div>
              <div className="text-[9px] text-violet-600 dark:text-violet-400 font-bold tracking-widest mt-0.5 uppercase">SaaS LMS Platform</div>
            </div>
          </div>

          <a 
            href="mailto:support@trineostream.com" 
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isDark 
                ? 'border-white/10 text-white/80 hover:bg-white/[0.04] hover:text-white' 
                : 'border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-violet-500" />
            Need Help? Contact Us
          </a>
        </div>

        {/* Compact Hero Section */}
        <div className="flex flex-col items-center mb-6">
          <h2 className={`text-xl sm:text-2xl font-black text-center tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Register Your Institute
          </h2>
          <p className={`text-[11px] sm:text-xs text-center mt-1 max-w-md ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
            Join Trineo Stream and transform the way you teach, manage and grow.
          </p>

          {/* Stepper Steps UI - SaaS progress tracker */}
          <div className="flex items-center w-full max-w-xl mt-6 relative">
            <div className="absolute left-0 right-0 top-5 h-[2px] bg-slate-200 dark:bg-slate-800 -z-10" />
            <div 
              className="absolute left-0 top-5 h-[2px] bg-gradient-to-r from-violet-600 to-indigo-600 transition-all duration-300 -z-10"
              style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }}
            />

            {/* Step 1 */}
            <div className="flex flex-col items-center flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-black transition-all duration-300 ${
                currentStep >= 1 
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20 ring-4 ring-violet-500/10' 
                  : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {currentStep > 1 ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : '1'}
              </div>
              <span className={`text-xs sm:text-sm font-bold mt-2 ${
                currentStep >= 1 ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 dark:text-slate-500'
              }`}>
                Institute Details
              </span>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-black transition-all duration-300 ${
                currentStep >= 2 
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20 ring-4 ring-violet-500/10' 
                  : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {currentStep > 2 ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : '2'}
              </div>
              <span className={`text-xs sm:text-sm font-bold mt-2 ${
                currentStep >= 2 ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 dark:text-slate-500'
              }`}>
                Review & Plan
              </span>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-black transition-all duration-300 ${
                currentStep === 3 
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 ring-4 ring-emerald-500/10' 
                  : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {currentStep === 3 && success ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : '3'}
              </div>
              <span className={`text-xs sm:text-sm font-bold mt-2 ${
                currentStep === 3 ? 'text-emerald-500 font-bold' : 'text-slate-400 dark:text-slate-500'
              }`}>
                Submit Request
              </span>
            </div>
          </div>
        </div>

        {/* Main Interface Content Card */}
        {currentStep === 3 && success ? (
          /* SUCCESS VIEW */
          <div className={`p-8 sm:p-12 rounded-3xl border backdrop-blur-xl shadow-xl max-w-lg mx-auto text-center transition-all ${
            isDark ? 'bg-[#0f0f26]/85 border-white/[0.06] text-white' : 'bg-white border-slate-200/80 text-slate-800'
          }`}>
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
            </div>
            <h3 className={`text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>Application Submitted!</h3>
            <p className={`text-xs sm:text-sm leading-relaxed mb-6 ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
              Thank you for registering. Our platform owner is reviewing your request. We will email your credentials and activation code to <strong className={isDark ? 'text-white/90' : 'text-slate-950'}>{adminEmail}</strong> immediately upon approval.
            </p>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm transition-all shadow-md shadow-violet-500/20"
            >
              Back to Home
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* 65/35 Desktop Grid Split: lg:grid-cols-12 with col-span-8 and col-span-4 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Form Details OR Review (65% width) */}
              <div className={`lg:col-span-8 p-6 lg:p-8 rounded-3xl border backdrop-blur-xl shadow-md space-y-6 ${
                isDark ? 'bg-[#0f0f26]/85 border-white/[0.06]' : 'bg-white border-slate-200/80'
              }`}>
                {currentStep === 1 ? (
                  /* STEP 1: FORM INPUTS */
                  <form onSubmit={handleNextStep} className="space-y-5">
                    <h3 className={`text-base font-extrabold flex items-center gap-2 pb-2.5 border-b ${
                      isDark ? 'text-white border-white/[0.04]' : 'text-slate-900 border-slate-200/60'
                    }`}>
                      <Building2 className="w-4.5 h-4.5 text-violet-500" />
                      Institute & Admin Details
                      <span className={`text-[10px] font-normal ml-auto ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                        Provide your institute information and admin account details
                      </span>
                    </h3>

                    {error && (
                      <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                        <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-600 dark:text-red-300 font-semibold leading-normal">{error}</p>
                      </div>
                    )}

                    {/* Institute Information Sub-section */}
                    <div className="space-y-3.5">
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-violet-600 dark:text-violet-400">
                        Institute Information
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                            Institute Name <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Building2 className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-white/20' : 'text-slate-400'}`} />
                            <input
                              type="text"
                              required
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="e.g. Greenfield Academy"
                              className={`w-full border focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl pl-9 pr-4 py-2 text-xs transition-all outline-none ${
                                isDark 
                                  ? 'bg-[#13132e] border-white/[0.06] text-white placeholder-white/20' 
                                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                              }`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                            Institute Email <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Mail className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-white/20' : 'text-slate-400'}`} />
                            <input
                              type="email"
                              required
                              value={instituteEmail}
                              onChange={(e) => setInstituteEmail(e.target.value)}
                              placeholder="e.g. contact@greenfield.edu"
                              className={`w-full border focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl pl-9 pr-4 py-2 text-xs transition-all outline-none ${
                                isDark 
                                  ? 'bg-[#13132e] border-white/[0.06] text-white placeholder-white/20' 
                                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                            Phone Number <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Phone className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-white/20' : 'text-slate-400'}`} />
                            <input
                              type="tel"
                              required
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="e.g. +1 555-0199"
                              className={`w-full border focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl pl-9 pr-4 py-2 text-xs transition-all outline-none ${
                                isDark 
                                  ? 'bg-[#13132e] border-white/[0.06] text-white placeholder-white/20' 
                                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                              }`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                            Website (Optional)
                          </label>
                          <div className="relative">
                            <Globe className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-white/20' : 'text-slate-400'}`} />
                            <input
                              type="text"
                              value={website}
                              onChange={(e) => setWebsite(e.target.value)}
                              placeholder="e.g. www.greenfield.edu"
                              className={`w-full border focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl pl-9 pr-4 py-2 text-xs transition-all outline-none ${
                                isDark 
                                  ? 'bg-[#13132e] border-white/[0.06] text-white placeholder-white/20' 
                                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                          Address <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <MapPin className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-white/20' : 'text-slate-400'}`} />
                          <input
                            type="text"
                            required
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="e.g. 102 Science Dr, Boston, MA 02115"
                            className={`w-full border focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl pl-9 pr-4 py-2 text-xs transition-all outline-none ${
                              isDark 
                                ? 'bg-[#13132e] border-white/[0.06] text-white placeholder-white/20' 
                                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                            }`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                            Country <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Globe className={`absolute left-3 top-3 w-4 h-4 z-10 ${isDark ? 'text-white/20' : 'text-slate-400'}`} />
                            <select
                              required
                              value={country}
                              onChange={(e) => {
                                setCountry(e.target.value);
                                setState('');
                              }}
                              className={`w-full border focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl pl-9 pr-4 py-2 text-xs transition-all outline-none appearance-none ${
                                isDark 
                                  ? 'bg-[#13132e] border-white/[0.06] text-white' 
                                  : 'bg-slate-50 border-slate-200 text-slate-900'
                              }`}
                            >
                              <option value="" disabled>Select Country</option>
                              {COUNTRIES.map(c => (
                                <option key={c} value={c} className="text-slate-900">{c}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                            State / Province <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <MapPin className={`absolute left-3 top-3 w-4 h-4 z-10 ${isDark ? 'text-white/20' : 'text-slate-400'}`} />
                            {STATES_BY_COUNTRY[country] ? (
                              <select
                                required
                                value={state}
                                onChange={(e) => setState(e.target.value)}
                                className={`w-full border focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl pl-9 pr-4 py-2 text-xs transition-all outline-none appearance-none ${
                                  isDark 
                                    ? 'bg-[#13132e] border-white/[0.06] text-white' 
                                    : 'bg-slate-50 border-slate-200 text-slate-900'
                                }`}
                              >
                                <option value="" disabled>Select State</option>
                                {STATES_BY_COUNTRY[country].map(s => (
                                  <option key={s} value={s} className="text-slate-900">{s}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                required
                                value={state}
                                onChange={(e) => setState(e.target.value)}
                                placeholder="Enter State"
                                className={`w-full border focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl pl-9 pr-4 py-2 text-xs transition-all outline-none ${
                                  isDark 
                                    ? 'bg-[#13132e] border-white/[0.06] text-white placeholder-white/20' 
                                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                                }`}
                              />
                            )}
                          </div>
                        </div>

                        <div>
                          <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                            City <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Building2 className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-white/20' : 'text-slate-400'}`} />
                            <input
                              type="text"
                              required
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              placeholder="Enter City"
                              className={`w-full border focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl pl-9 pr-4 py-2 text-xs transition-all outline-none ${
                                isDark 
                                  ? 'bg-[#13132e] border-white/[0.06] text-white placeholder-white/20' 
                                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                            Estimated Student Count <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Users className={`absolute left-3 top-3 w-4 h-4 z-10 ${isDark ? 'text-white/20' : 'text-slate-400'}`} />
                            <select
                              required
                              value={studentCount}
                              onChange={(e) => setStudentCount(Number(e.target.value))}
                              className={`w-full border focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl pl-9 pr-4 py-2 text-xs transition-all outline-none appearance-none ${
                                isDark 
                                  ? 'bg-[#13132e] border-white/[0.06] text-white' 
                                  : 'bg-slate-50 border-slate-200 text-slate-900'
                              }`}
                            >
                              {STUDENT_COUNTS.map(sc => (
                                <option key={sc.value} value={sc.value} className="text-slate-900">{sc.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                            How did you hear about us?
                          </label>
                          <div className="relative">
                            <Megaphone className={`absolute left-3 top-3 w-4 h-4 z-10 ${isDark ? 'text-white/20' : 'text-slate-400'}`} />
                            <select
                              value={hearAbout}
                              onChange={(e) => setHearAbout(e.target.value)}
                              className={`w-full border focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl pl-9 pr-4 py-2 text-xs transition-all outline-none appearance-none ${
                                isDark 
                                  ? 'bg-[#13132e] border-white/[0.06] text-white' 
                                  : 'bg-slate-50 border-slate-200 text-slate-900'
                              }`}
                            >
                              <option value="" disabled>Select an option</option>
                              {HEAR_ABOUT_US_OPTIONS.map(opt => (
                                <option key={opt} value={opt} className="text-slate-900">{opt}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Administrator Account Sub-section */}
                    <div className="space-y-3.5 pt-4 border-t border-slate-200/50 dark:border-white/[0.04]">
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-violet-600 dark:text-violet-400">
                        Administrator Account
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                            Admin Name <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <User className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-white/20' : 'text-slate-400'}`} />
                            <input
                              type="text"
                              required
                              value={adminName}
                              onChange={(e) => setAdminName(e.target.value)}
                              placeholder="e.g. Sarah Johnson"
                              className={`w-full border focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl pl-9 pr-4 py-2 text-xs transition-all outline-none ${
                                isDark 
                                  ? 'bg-[#13132e] border-white/[0.06] text-white placeholder-white/20' 
                                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                              }`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                            Admin Email <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Mail className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-white/20' : 'text-slate-400'}`} />
                            <input
                              type="email"
                              required
                              autoComplete="new-username"
                              value={adminEmail}
                              onChange={(e) => setAdminEmail(e.target.value)}
                              placeholder="e.g. admin@greenfield.edu"
                              className={`w-full border focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl pl-9 pr-4 py-2 text-xs transition-all outline-none ${
                                isDark 
                                  ? 'bg-[#13132e] border-white/[0.06] text-white placeholder-white/20' 
                                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                            Password <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Lock className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-white/20' : 'text-slate-400'}`} />
                            <input
                              type={showPassword ? 'text' : 'password'}
                              required
                              autoComplete="new-password"
                              value={adminPassword}
                              onChange={(e) => setAdminPassword(e.target.value)}
                              placeholder="••••••••••••"
                              className={`w-full border focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl pl-9 pr-10 py-2 text-xs transition-all outline-none ${
                                isDark 
                                  ? 'bg-[#13132e] border-white/[0.06] text-white placeholder-white/20' 
                                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className={`absolute right-3 top-2.5 transition-colors ${
                                isDark ? 'text-white/40 hover:text-white' : 'text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                            Confirm Password <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Lock className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-white/20' : 'text-slate-400'}`} />
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              required
                              autoComplete="new-password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="••••••••••••"
                              className={`w-full border focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl pl-9 pr-10 py-2 text-xs transition-all outline-none ${
                                isDark 
                                  ? 'bg-[#13132e] border-white/[0.06] text-white placeholder-white/20' 
                                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className={`absolute right-3 top-2.5 transition-colors ${
                                isDark ? 'text-white/40 hover:text-white' : 'text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Disclaimer and Submit */}
                    <div className="space-y-4 pt-2">
                      <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                        isDark ? 'bg-violet-600/[0.03] border-violet-500/10' : 'bg-violet-50/40 border-violet-100/60'
                      }`}>
                        <ShieldCheck className="w-4.5 h-4.5 text-violet-500 shrink-0 mt-0.5" />
                        <p className={`text-[10px] leading-relaxed ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
                          Your account will be created after your institute is approved by our team.
                        </p>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-violet-500/10 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        Continue to Plan Selection
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                ) : (
                  /* STEP 2: SUMMARY REVIEW */
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/60 dark:border-white/[0.04]">
                      <h3 className={`text-lg sm:text-xl font-black flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        <Building2 className="w-5.5 h-5.5 text-violet-500" />
                        Review Your Registration
                      </h3>
                      <span className={`text-xs ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                        Verify your details before submitting onboarding request
                      </span>
                    </div>

                    {error && (
                      <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                        <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-600 dark:text-red-300 font-semibold leading-normal">{error}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Institute Information Details */}
                      <div className="space-y-3">
                        <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-violet-600 dark:text-violet-400">
                          Institute Details
                        </h4>
                        <div className={`p-5 rounded-2xl border text-xs sm:text-sm space-y-3 ${
                          isDark ? 'bg-white/[0.02] border-white/[0.04]' : 'bg-slate-50 border-slate-200/60 shadow-sm'
                        }`}>
                          <div>
                            <span className={isDark ? 'text-white/30' : 'text-slate-400'}>Institute Name:</span>
                            <div className="font-semibold mt-0.5">{name}</div>
                          </div>
                          <div>
                            <span className={isDark ? 'text-white/30' : 'text-slate-400'}>Institute Email:</span>
                            <div className="font-semibold mt-0.5">{instituteEmail}</div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className={isDark ? 'text-white/30' : 'text-slate-400'}>Phone:</span>
                              <div className="font-semibold mt-0.5">{phone}</div>
                            </div>
                            <div>
                              <span className={isDark ? 'text-white/30' : 'text-slate-400'}>Website:</span>
                              <div className="font-semibold mt-0.5 text-ellipsis overflow-hidden">{website || 'N/A'}</div>
                            </div>
                          </div>
                          <div>
                            <span className={isDark ? 'text-white/30' : 'text-slate-400'}>Address:</span>
                            <div className="font-semibold mt-0.5">{`${address}, ${city}, ${state}, ${country}`}</div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className={isDark ? 'text-white/30' : 'text-slate-400'}>Est. Students:</span>
                              <div className="font-semibold mt-0.5">{studentCount} Students</div>
                            </div>
                            <div>
                              <span className={isDark ? 'text-white/30' : 'text-slate-400'}>Referral:</span>
                              <div className="font-semibold mt-0.5">{hearAbout || 'Direct'}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Administrator Account Details */}
                      <div className="space-y-3">
                        <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-violet-600 dark:text-violet-400">
                          Administrator Account
                        </h4>
                        <div className={`p-5 rounded-2xl border text-xs sm:text-sm space-y-3.5 ${
                          isDark ? 'bg-white/[0.02] border-white/[0.04]' : 'bg-slate-50 border-slate-200/60 shadow-sm'
                        }`}>
                          <div>
                            <span className={isDark ? 'text-white/30' : 'text-slate-400'}>Admin Name:</span>
                            <div className="font-semibold mt-0.5">{adminName}</div>
                          </div>
                          <div>
                            <span className={isDark ? 'text-white/30' : 'text-slate-400'}>Admin Email:</span>
                            <div className="font-semibold mt-0.5">{adminEmail}</div>
                          </div>
                          <div>
                            <span className={isDark ? 'text-white/30' : 'text-slate-400'}>System Access:</span>
                            <div className="font-semibold text-emerald-500 mt-0.5">Provisioned upon approval</div>
                          </div>
                        </div>

                        {/* Selected Plan Summary */}
                        {selectedPlan && (
                          <div className={`p-5 rounded-2xl border flex items-center justify-between ${
                            isDark ? 'bg-violet-600/10 border-violet-500/20' : 'bg-violet-50/50 border-violet-100 shadow-sm'
                          }`}>
                            <div>
                              <div className="text-xs sm:text-sm font-black text-violet-600 dark:text-violet-400">{selectedPlan.name} Plan</div>
                              <div className={`text-xs mt-1 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                                {selectedPlan.studentLimit === 0 ? 'Unlimited' : `${selectedPlan.studentLimit} Students`} • {selectedPlan.storageLimit === 0 ? 'Unlimited' : `${selectedPlan.storageLimit} GB`}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-base sm:text-lg font-extrabold text-violet-600 dark:text-violet-400">${selectedPlan.price}</span>
                              <span className={`text-[10px] sm:text-xs font-normal ${isDark ? 'text-white/40' : 'text-slate-500'}`}>/mo</span>
                              <div className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase mt-1">Instant Activation</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Back and Confirm Button Row */}
                    <div className="flex flex-col sm:flex-row items-center gap-3.5 pt-3">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className={`w-full sm:w-auto py-3 px-6 rounded-xl border flex items-center justify-center gap-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                          isDark 
                            ? 'border-white/10 text-white hover:bg-white/[0.04]' 
                            : 'border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-800'
                        }`}
                      >
                        <ArrowLeft className="w-4.5 h-4.5" />
                        Back to Details
                      </button>

                      <button
                        type="button"
                        disabled={loading}
                        onClick={handleSubmit}
                        className="w-full sm:flex-1 py-3.5 px-7 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-violet-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4.5 h-4.5 animate-spin" />
                            Submitting Onboarding Request...
                          </>
                        ) : (
                          <>
                            Submit Onboarding Request
                            <ChevronRight className="w-4.5 h-4.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Plans and Disclaimers (35% width - premium cards) */}
              <div className="lg:col-span-4 space-y-4">
                <div className={`p-6 lg:p-7 rounded-3xl border backdrop-blur-xl shadow-md space-y-5 ${
                  isDark ? 'bg-[#0f0f26]/85 border-white/[0.06]' : 'bg-white border-slate-200/80 shadow-sm'
                }`}>
                  <h3 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${
                    isDark ? 'text-white/40' : 'text-slate-500'
                  }`}>
                    <Crown className="w-4.5 h-4.5 text-violet-500" />
                    Choose Your Plan
                    <span className="text-[9px] font-normal lowercase ml-auto">Pay once, activate instantly</span>
                  </h3>
                  
                  {/* Subscription Plan List - upgraded, taller padding, stronger active selection glows */}
                  <div className="space-y-4">
                    {plans.map((plan) => {
                      const isSelected = selectedPlanId === plan._id;
                      return (
                        <div
                          key={plan._id}
                          onClick={() => setSelectedPlanId(plan._id)}
                          className={`p-6 rounded-2xl cursor-pointer border transition-all duration-300 flex gap-3.5 items-start relative ${
                            isSelected
                              ? isDark 
                                ? 'bg-violet-600/[0.08] border-violet-500 shadow-[0_0_25px_-5px_rgba(124,58,237,0.3)] ring-2 ring-violet-500/35 scale-[1.01]' 
                                : 'bg-violet-50/70 border-violet-500 shadow-[0_0_20px_-5px_rgba(124,58,237,0.2)] ring-2 ring-violet-500/20 scale-[1.01]'
                              : isDark 
                                ? 'bg-[#0f0f26]/60 border-white/[0.04] hover:bg-[#0f0f26]/80 hover:border-white/[0.08] hover:scale-[1.005]' 
                                : 'bg-white border-slate-200/80 hover:bg-slate-50 hover:scale-[1.005] shadow-sm'
                          }`}
                        >
                          {/* Circular selector */}
                          <div className="mt-1">
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                              isSelected 
                                ? 'border-violet-500 bg-violet-600 text-white' 
                                : isDark ? 'border-white/20' : 'border-slate-300'
                            }`}>
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <h4 className={`text-sm font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h4>
                              <span className="text-sm font-extrabold text-violet-600 dark:text-violet-400">
                                ${plan.price}
                                <span className={`text-[10px] font-normal ${isDark ? 'text-white/40' : 'text-slate-500'}`}>/mo</span>
                              </span>
                            </div>
                            <p className={`text-[11px] mb-3.5 leading-relaxed ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{plan.description}</p>
                            <div className="flex flex-wrap gap-2">
                              <span className={`px-2 py-0.5 rounded-full border text-[9px] font-semibold uppercase ${
                                isDark ? 'bg-white/[0.04] border-white/[0.06] text-white/50' : 'bg-slate-100 border-slate-200/60 text-slate-600'
                              }`}>
                                Quota: {plan.studentLimit === 0 ? 'Unlimited' : `${plan.studentLimit} Students`}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full border text-[9px] font-semibold uppercase ${
                                isDark ? 'bg-white/[0.04] border-white/[0.06] text-white/50' : 'bg-slate-100 border-slate-200/60 text-slate-600'
                              }`}>
                                Storage: {plan.storageLimit === 0 ? 'Unlimited' : `${plan.storageLimit} GB`}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* All Plans Include Box */}
                  <div className={`p-4.5 rounded-2xl border ${
                    isDark ? 'bg-[#12122d]/50 border-white/[0.04]' : 'bg-slate-50 border-slate-200/60'
                  }`}>
                    <h4 className="text-[10px] font-extrabold mb-3 uppercase tracking-wider text-violet-600 dark:text-violet-400">
                      All Plans Include
                    </h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {[
                        'Instant Activation', 'Secure & Reliable', 
                        'No Setup Fees', 'Data Backup', 
                        '24/7 Support', 'Mobile App Access', 
                        'Regular Updates', 'Easy to Use'
                      ].map((feat) => (
                        <div key={feat} className="flex items-center gap-1.5 text-[10px]">
                          <Check className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                          <span className={isDark ? 'text-white/70' : 'text-slate-600'}>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Plan Billing Disclaimer */}
                  <div className={`p-4 rounded-xl border ${
                    isDark ? 'bg-white/[0.02] border-white/[0.04]' : 'bg-slate-50 border-slate-200/60'
                  }`}>
                    <div className="flex gap-2.5 items-start">
                      <ShieldCheck className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                      <p className={`text-[10px] leading-normal ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                        <strong className={isDark ? 'text-white/85' : 'text-slate-700'}>You won't be charged automatically.</strong> Our team will contact you to collect payment and activate your subscription upon approval.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-center text-[10px] flex items-center justify-center gap-1.5 text-slate-400 dark:text-slate-600">
                  <Lock className="w-3 h-3" />
                  Your information is secure and will never be shared.
                </div>
              </div>
            </div>

            {/* Bottom Row: Features layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-200/60 dark:border-white/[0.04]">
              {[
                {
                  title: 'Easy Onboarding',
                  desc: 'Quick setup and dedicated support to get you started',
                  icon: BookOpen
                },
                {
                  title: 'Secure & Reliable',
                  desc: 'Enterprise-grade security and 99.9% uptime',
                  icon: Award
                },
                {
                  title: 'Scalable Platform',
                  desc: 'Grow your institute with our scalable solution',
                  icon: BarChart3
                },
                {
                  title: 'Dedicated Support',
                  desc: 'Get help whenever you need it from our experts',
                  icon: Headphones
                }
              ].map((feat, idx) => (
                <div 
                  key={idx}
                  className={`p-4 rounded-2xl border flex gap-3 items-start transition-all hover:scale-[1.02] ${
                    isDark 
                      ? 'bg-white/[0.01] border-white/[0.04] hover:bg-white/[0.02]' 
                      : 'bg-white border-slate-200/60 hover:bg-slate-50 shadow-sm'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isDark ? 'bg-violet-600/10 text-violet-400' : 'bg-violet-50 text-violet-600'
                  }`}>
                    <feat.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{feat.title}</h4>
                    <p className={`text-[10px] mt-1 leading-normal ${isDark ? 'text-white/40' : 'text-slate-500'}`}>{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
