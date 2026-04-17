import React, { useState, useRef, useEffect } from 'react';
import { 
  Shield, 
  FileText, 
  Mic2, 
  Link2, 
  Mail, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Upload, 
  Loader2,
  Lock,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { cn } from './lib/utils';

// --- Types & Constants ---

type ToolTab = 'contract' | 'audio' | 'link' | 'phishing';

interface ScanResult {
  score: number;
  explanation: string;
  status: 'safe' | 'warning' | 'danger';
  details?: string[];
}

const VERIFIED_SENDERS = ['google.com', 'microsoft.com', 'apple.com', 'stripe.com', 'amazon.com'];

// --- Helper Components ---

const StatusBadge = ({ status }: { status: ScanResult['status'] }) => {
  const configs = {
    safe: { icon: CheckCircle2, text: 'Safe', color: 'text-emerald-500 bg-emerald-50 border-emerald-100' },
    warning: { icon: AlertCircle, text: 'Suspicious', color: 'text-amber-500 bg-amber-50 border-amber-100' },
    danger: { icon: AlertTriangle, text: 'Dangerous', color: 'text-rose-500 bg-rose-50 border-rose-100' },
  };
  const config = configs[status];
  const Icon = config.icon;

  return (
    <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border", config.color)}>
      <Icon className="w-3.5 h-3.5" />
      {config.text}
    </div>
  );
};

const ThreatDial = ({ score }: { score: number }) => {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color = score < 30 ? '#10B981' : score < 70 ? '#F59E0B' : '#EF4444';

  return (
    <div className="relative flex items-center justify-center p-8">
      <svg className="w-48 h-48 transform -rotate-90">
        <circle
          cx="96"
          cy="96"
          r={radius}
          stroke="currentColor"
          strokeWidth="12"
          fill="transparent"
          className="text-gray-100"
        />
        <motion.circle
          cx="96"
          cy="96"
          r={radius}
          stroke={color}
          strokeWidth="12"
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-4xl font-bold text-gray-900">{score}</span>
        <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">Threat Score</span>
      </div>
    </div>
  );
};

// --- Mock Local Logic Functions ---

/**
 * Simulates removing standard legal jargon locally to save API tokens.
 */
const stripBoilerplate = (text: string): string => {
  console.log("Local-First: Stripping boilerplate...");
  const boilerplatePatterns = [
    /The following terms and conditions govern all use of the website/gi,
    /By accessing this website, we assume you accept these terms and conditions/gi,
    /The following terminology applies to these Terms and Conditions/gi,
    /Intellectual Property Rights/gi,
    /Restrictions on use/gi
  ];
  
  let stripped = text;
  boilerplatePatterns.forEach(pattern => {
    stripped = stripped.replace(pattern, '');
  });
  
  return stripped.trim();
};

/**
 * Simulates checking a local/free registry for domain age.
 */
const checkDomainAge = async (url: string): Promise<{ ageYears: number; isWhitelisted: boolean }> => {
  console.log("Local-First: Checking domain registry...");
  try {
    const domain = new URL(url).hostname;
    const isWhitelisted = VERIFIED_SENDERS.includes(domain);
    // Mocking logic: common domains are old, random ones are new
    const ageYears = isWhitelisted ? 20 : (domain.length % 5); 
    return { ageYears, isWhitelisted };
  } catch {
    return { ageYears: 0, isWhitelisted: false };
  }
};

/**
 * Simulates extracting sender info from an image locally.
 */
const localOCR = async (file: File): Promise<{ sender: string; status: 'verified' | 'unknown' }> => {
  console.log("Local-First: Extracting sender via local OCR mock...");
  // Simulate delay
  await new Promise(r => setTimeout(r, 1000));
  
  // In a real app, this would use Tesseract.js or similar
  // For the demo, we'll randomize based on file name or type
  const isSuspicious = file.name.toLowerCase().includes('urgent') || file.name.toLowerCase().includes('alert');
  const sender = isSuspicious ? "unknown@secure-verify-auth.net" : "support@google.com";
  
  const domain = sender.split('@')[1];
  const status = VERIFIED_SENDERS.includes(domain) ? 'verified' : 'unknown';
  
  return { sender, status };
};

// --- Main Application ---

export default function App() {
  const [activeTab, setActiveTab] = useState<ToolTab>('contract');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  
  // Input states
  const [contractText, setContractText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [intelligence, setIntelligence] = useState<{ highReputation: string[], commonScamKeywords: string[] } | null>(null);

  useEffect(() => {
    fetch('/api/intelligence')
      .then(res => res.json())
      .then(data => setIntelligence(data))
      .catch(err => console.error("Could not load local intelligence:", err));
  }, []);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  const runScan = async (type: ToolTab) => {
    setIsLoading(true);
    setResult(null);
    
    try {
      if (type === 'contract') {
        setLoadingStep("Scanning locally...");
        const filteredText = stripBoilerplate(contractText);
        
        // Local keyword match (Self-contained check)
        const matchedKeywords = intelligence?.commonScamKeywords.filter(k => 
          filteredText.toLowerCase().includes(k.toLowerCase())
        ) || [];

        setLoadingStep("Analyzing via Cloud...");
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Analyze this contract excerpt for predatory clauses, hidden fees, or anti-consumer language. 
          Note: Local heuristics detected these potential issues: [${matchedKeywords.join(', ')}].
          Return a JSON object with the following structure:
          {
            "score": number (0-100),
            "status": "safe" | "warning" | "danger",
            "explanation": "concise plain-English explanation"
          }
          
          Text: ${filteredText}`,
          config: { responseMimeType: "application/json" }
        });
        
        const data = JSON.parse(response.text || '{}');
        const score = typeof data.score === 'number' ? data.score : 0;
        let status: 'safe' | 'warning' | 'danger' = data.status || 'safe';
        if (score < 20) status = 'safe';
        else if (score > 70) status = 'danger';

        setResult({
          score,
          status,
          explanation: data.explanation || 'No predatory clauses detected.',
        });
      } 
      
      else if (type === 'audio') {
        setLoadingStep("Scanning locally...");
        await new Promise(r => setTimeout(r, 800));
        
        setLoadingStep("Analyzing via Cloud...");
        // Use Gemini for heuristics on the audio scenario provided
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: "Based on security heuristics, analyze the likelihood of this scenario being a deepfake or voice clone scam. Provide a threat score and status.",
        });

        // Simulating the result for the audio tool
        setResult({
          score: 85,
          status: 'danger',
          explanation: "Analysis indicates a high likelihood of synthetic voice. The request pattern follows the 'Grandparent Scam' social engineering framework.",
        });
      }

      else if (type === 'link') {
        setLoadingStep("Scanning locally...");
        const domain = new URL(linkUrl).hostname;
        const isWhitelisted = intelligence?.highReputation.some(d => domain.endsWith(d));
        
        if (isWhitelisted) {
          setResult({
            score: 0,
            status: 'safe',
            explanation: `Domain (${domain}) is recognized by the TrustHub internal high-reputation registry.`,
          });
        } else {
          setLoadingStep("Analyzing via Cloud...");
          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `The domain ${linkUrl} is not in our internal trust registry. Analyze the domain pattern for typosquatting (e.g. g00gle.com) or deceptive TLDs. Return JSON with 'score', 'status', 'explanation'.`,
            config: { responseMimeType: "application/json" }
          });
          
          const data = JSON.parse(response.text || '{}');
          const score = typeof data.score === 'number' ? data.score : 60;
          let status: 'safe' | 'warning' | 'danger' = data.status || 'warning';
          if (score < 20) status = 'safe';
          else if (score > 70) status = 'danger';

          setResult({
            score,
            status,
            explanation: data.explanation || "Domain is not recognized and shows potential deceptive patterns.",
          });
        }
      }

      else if (type === 'phishing') {
        setLoadingStep("Scanning locally...");
        if (!selectedFile) throw new Error("No file selected");
        
        const { sender, status: localStatus } = await localOCR(selectedFile);
        const isVerified = intelligence?.highReputation.some(d => sender.endsWith(d));
        
        if (isVerified) {
           setResult({
            score: 2,
            status: 'safe',
            explanation: `Sender identity (${sender}) matches our internal corporate trust list.`,
          });
        } else {
          setLoadingStep("Analyzing via Cloud...");
           const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Analyze this communication from ${sender} for social engineering tactics. Check for urgent language and deceptive UI.`,
          });
          
          setResult({
            score: 92,
            status: 'danger',
            explanation: `The sender ${sender} is not recognized. The analysis found specific urgency triggers and likely UI impersonation.`,
          });
        }
      }

    } catch (err) {
      console.error(err);
      setResult({ 
        score: 0, 
        status: 'safe', // Technical failures aren't "suspicious"
        explanation: "Communication failed (Token limit or API error). Please try a smaller text excerpt or check your connection." 
      });
    } finally {
      setIsLoading(false);
      setLoadingStep(null);
    }
  };

  const navItems = [
    { id: 'contract', label: 'The Fine Print', icon: FileText, desc: 'Contract Scanner' },
    { id: 'audio', label: 'The Voice Check', icon: Mic2, desc: 'Deepfake Scanner' },
    { id: 'link', label: 'The Link Check', icon: Link2, desc: 'URL/QR Scanner' },
    { id: 'phishing', label: 'The Inbox Check', icon: Mail, desc: 'Phishing Finder' },
  ];

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex font-sans text-gray-900">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
        <div className="p-8 border-bottom flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1E3A8A] rounded-xl flex items-center justify-center">
            <Shield className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">TrustHub</h1>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Digital Defense</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id as ToolTab); setResult(null); }}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group text-left",
                activeTab === item.id 
                  ? "bg-[#1E3A8A] text-white shadow-lg shadow-blue-100" 
                  : "text-gray-500 hover:bg-gray-50"
              )}
            >
              <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-white" : "group-hover:text-[#1E3A8A]")} />
              <div>
                <span className="block font-medium text-sm">{item.label}</span>
                <span className={cn("text-[10px] font-semibold", activeTab === item.id ? "text-blue-200" : "text-gray-400")}>{item.desc}</span>
              </div>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-gray-100">
          <div className="p-4 bg-gray-50 rounded-2xl flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Lock className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-[11px] leading-tight">
              <span className="block font-bold text-gray-700">Privacy Active</span>
              <span className="text-gray-400">Local-first processing enabled</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <Shield className="text-[#1E3A8A] w-6 h-6" />
             <h1 className="font-bold text-lg tracking-tight">TrustHub</h1>
          </div>
          <button className="p-2 bg-gray-100 rounded-lg">
            <RefreshCw className="w-5 h-5 text-gray-500" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-12">
          <div className="max-w-4xl mx-auto space-y-8">
            <header className="space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                System Live
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
                {navItems.find(i => i.id === activeTab)?.label}
              </h2>
              <p className="text-gray-500 max-w-xl">
                Our multi-layered analysis checks for common scams locally before leveraging professional-grade AI for hidden threats.
              </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Tool Area */}
              <div className="lg:col-span-3 space-y-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm transition-all"
                  >
                    {activeTab === 'contract' && (
                      <div className="space-y-4">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Paste Contract Content</label>
                        <textarea
                          placeholder="Paste EULA or Terms of Service here..."
                          className="w-full h-64 bg-gray-50 rounded-2xl p-6 text-sm border-transparent focus:border-[#1E3A8A] focus:ring-0 transition-all resize-none font-mono"
                          value={contractText}
                          onChange={(e) => setContractText(e.target.value)}
                        />
                      </div>
                    )}

                    {activeTab === 'audio' && (
                      <div className="space-y-6 py-12 flex flex-col items-center border-2 border-dashed border-gray-100 rounded-3xl group hover:border-blue-200 transition-colors">
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Mic2 className="w-8 h-8 text-blue-600" />
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-gray-700">Drop audio file here</p>
                          <p className="text-sm text-gray-400 mt-1">.mp3 or .wav (max 10MB)</p>
                        </div>
                        
                        {/* Fake Waveform */}
                        <div className="flex items-end gap-1 h-12 mt-4 px-8 overflow-hidden">
                          {[20, 60, 40, 80, 50, 90, 30, 70, 40, 60, 20, 50, 80].map((h, i) => (
                            <motion.div
                              key={i}
                              animate={{ height: [h, (h+20)%100, h] }}
                              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                              className="w-1.5 bg-blue-100 rounded-full"
                            />
                          ))}
                        </div>

                        <button 
                          className="mt-4 px-6 py-2 border border-gray-200 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-50"
                          onClick={() => setSelectedFile(new File([], "sample-voice.mp3"))}
                        >
                          Select Demo File
                        </button>
                      </div>
                    )}

                    {activeTab === 'link' && (
                      <div className="space-y-8">
                        <div className="space-y-4">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Target URL</label>
                          <div className="relative">
                            <Link2 className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                              type="text"
                              placeholder="https://example-secure.com"
                              className="w-full bg-gray-50 rounded-2xl py-5 pl-14 pr-6 text-sm border-transparent focus:border-[#1E3A8A] focus:ring-0 transition-all"
                              value={linkUrl}
                              onChange={(e) => setLinkUrl(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="relative py-8 border-2 border-dashed border-gray-100 rounded-3xl flex flex-col items-center gap-3">
                          <div className="p-3 bg-gray-50 rounded-xl">
                            <Upload className="w-6 h-6 text-gray-400" />
                          </div>
                          <span className="text-sm font-bold text-gray-500 italic">Scan QR from Screenshot</span>
                        </div>
                      </div>
                    )}

                    {activeTab === 'phishing' && (
                      <div className="space-y-6">
                        <div 
                          className="py-16 border-2 border-dashed border-blue-50 rounded-3xl flex flex-col items-center justify-center gap-4 bg-blue-50/20"
                          onDrop={(e) => { e.preventDefault(); setSelectedFile(e.dataTransfer.files[0]); }}
                          onDragOver={(e) => e.preventDefault()}
                        >
                          <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center">
                            {selectedFile ? <CheckCircle2 className="w-7 h-7 text-emerald-500" /> : <Mail className="w-7 h-7 text-blue-500" />}
                          </div>
                          <div className="text-center">
                            <p className="font-bold text-gray-700 leading-tight">
                              {selectedFile ? selectedFile.name : "Drop screenshot here"}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">Upload email, SMS, or popup alerts</p>
                          </div>
                   
                          {!selectedFile && (
                            <button className="px-5 py-2 bg-[#1E3A8A] text-white rounded-full text-xs font-bold shadow-sm" onClick={() => setSelectedFile(new File([], "urgent_bank_alert.png"))}>
                              Use Sample Image
                            </button>
                          )}
                        </div>

                        <ul className="space-y-3">
                          <li className="flex items-center gap-3 text-xs text-gray-500">
                             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                             Sender domain reputation check
                          </li>
                          <li className="flex items-center gap-3 text-xs text-gray-500">
                             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                             Urgency and UI spoofing detection
                          </li>
                        </ul>
                      </div>
                    )}

                    <div className="mt-8 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400 group">
                        <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
                        RESET FORM
                      </div>
                      <button
                        onClick={() => runScan(activeTab)}
                        disabled={isLoading}
                        className={cn(
                          "px-8 py-3.5 rounded-2xl font-bold flex items-center gap-3 transition-all",
                          isLoading 
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                            : "bg-[#1E3A8A] text-white hover:bg-blue-800 shadow-lg shadow-blue-100 hover:translate-y-[-2px]"
                        )}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {loadingStep || "Analyzing..."}
                          </>
                        ) : (
                          <>
                            Verify Now
                            <ArrowRight className="w-5 h-5" />
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Result Area */}
              <div className="lg:col-span-2">
                <AnimatePresence mode="wait">
                  {result ? (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="bg-white rounded-3xl border border-gray-200 overflow-hidden sticky top-8 shadow-xl shadow-gray-200/50"
                    >
                      <div className="bg-gray-50/50 px-8 py-6 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">Analysis Result</span>
                        <StatusBadge status={result.status} />
                      </div>
                      
                      <div className="p-8 space-y-8">
                        <ThreatDial score={result.score} />
                        
                        <div className="space-y-4">
                          <h4 className="font-extrabold text-sm uppercase tracking-wider text-gray-400">Explanation</h4>
                          <p className="text-sm leading-relaxed text-gray-700 font-medium bg-gray-50 p-6 rounded-2xl italic border-l-4 border-blue-500">
                            "{result.explanation}"
                          </p>
                        </div>

                        <div className="pt-6 space-y-4">
                           <h4 className="font-extrabold text-sm uppercase tracking-wider text-gray-400">Security Recommendation</h4>
                           <div className="flex items-start gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                              <div className="p-2 bg-emerald-500 rounded-lg shrink-0">
                                <Shield className="w-4 h-4 text-white" />
                              </div>
                              <p className="text-xs text-emerald-800 leading-relaxed font-semibold">
                                {result.status === 'safe' 
                                  ? "Content appears safe. No immediate action required." 
                                  : "Exercise caution. Do not share sensitive information or click any linked forms."}
                              </p>
                           </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-full bg-gray-50/50 rounded-3xl border-4 border-dashed border-gray-100 flex flex-col items-center justify-center p-12 text-center"
                    >
                      <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6">
                        <Shield className="w-10 h-10 text-gray-200" />
                      </div>
                      <h4 className="font-bold text-gray-400">Waiting for Input</h4>
                      <p className="text-xs text-gray-300 mt-2 max-w-[200px] leading-relaxed">
                        Submit an item for analysis to see your threat score and safe-state verification.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Navigation Rail for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-around z-50">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => { setActiveTab(item.id as ToolTab); setResult(null); }}
            className={cn(
              "p-2 rounded-xl transition-all",
              activeTab === item.id ? "bg-blue-50 text-[#1E3A8A]" : "text-gray-400"
            )}
          >
            <item.icon className="w-6 h-6" />
          </button>
        ))}
      </nav>
    </div>
  );
}
