import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck, Plus, Trash2, Edit2, Upload, BarChart3, Users, AlertTriangle,
  Check, RefreshCw, FileText, Swords, X, Search, Filter, Ban, Trophy,
  Coins, Zap, Shield, ArrowUpRight, Flame, CheckCircle2, ChevronRight, ArrowLeft
} from 'lucide-react';

interface AdminPanelProps {
  onNavigateTab?: (tab: any) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onNavigateTab }) => {
  const { user, loginWithCredentials } = useAuth();
  const [activeTab, setActiveTab] = useState<'questions' | 'analytics' | 'reports' | 'users' | 'battles'>('questions');
  const [questions, setQuestions] = useState<any[]>([]);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [analytics, setAnalytics] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [battles, setBattles] = useState<{ live: any[]; recent: any[] }>({ live: [], recent: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<string | null>(null);

  // Filter & Search state for Questions
  const [qSearch, setQSearch] = useState('');
  const [qExam, setQExam] = useState('all');
  const [qSubject, setQSubject] = useState('all');
  const [qDifficulty, setQDifficulty] = useState('all');
  const [qPage, setQPage] = useState(1);

  // Search state for Users
  const [userSearch, setUserSearch] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingQ, setEditingQ] = useState<any | null>(null);
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [bulkInput, setBulkInput] = useState<string>('');

  // Edit User Modal
  const [showEditUserModal, setShowEditUserModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Form State for Add Question
  const initialQState = {
    exam_id: 'exam-cgl',
    subject_id: 'sub-math',
    difficulty: 'moderate',
    question_en: '',
    question_hi: '',
    option_a_en: '',
    option_a_hi: '',
    option_b_en: '',
    option_b_hi: '',
    option_c_en: '',
    option_c_hi: '',
    option_d_en: '',
    option_d_hi: '',
    correct_option: 0,
    explanation_en: '',
    explanation_hi: '',
    pyq_source: 'SSC CGL 2024 Tier-1'
  };
  const [newQ, setNewQ] = useState(initialQState);

  const showMsg = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const qParams = new URLSearchParams({
        page: String(qPage),
        limit: '25',
        search: qSearch,
        examId: qExam,
        subjectId: qSubject,
        difficulty: qDifficulty
      });

      const [qRes, aRes, rRes, uRes, bRes] = await Promise.all([
        fetch(`/api/admin/questions?${qParams.toString()}`),
        fetch('/api/admin/analytics'),
        fetch('/api/admin/reports'),
        fetch(`/api/admin/users?search=${encodeURIComponent(userSearch)}`),
        fetch('/api/admin/battles')
      ]);

      if (qRes.ok) {
        const qData = await qRes.json();
        setQuestions(qData.questions || []);
        setTotalQuestions(qData.total || 0);
      }
      if (aRes.ok) setAnalytics((await aRes.json()).analytics || null);
      if (rRes.ok) setReports((await rRes.json()).reports || []);
      if (uRes.ok) setUsers((await uRes.json()).users || []);
      if (bRes.ok) setBattles((await bRes.json()) || { live: [], recent: [] });
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [qPage, qExam, qSubject, qDifficulty]);

  const handleSearchQuestions = (e: React.FormEvent) => {
    e.preventDefault();
    setQPage(1);
    fetchData();
  };

  const handleSearchUsers = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  // Add Question
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQ)
      });
      if (res.ok) {
        showMsg('✅ New Question added to verified question bank!');
        setShowAddModal(false);
        setNewQ(initialQState);
        fetchData();
      } else {
        const err = await res.json();
        showMsg('❌ Error: ' + (err.error || 'Failed to add question'));
      }
    } catch (err: any) {
      showMsg('❌ Error: ' + err.message);
    }
  };

  // Open Edit Modal
  const openEditQuestionModal = (q: any) => {
    setEditingQ({
      ...q,
      correct_option: Number(q.correct_option)
    });
    setShowEditModal(true);
  };

  // Save Edit Question
  const handleSaveEditQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQ) return;
    try {
      const res = await fetch(`/api/admin/questions/${editingQ.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingQ)
      });
      if (res.ok) {
        showMsg('✅ Question updated successfully!');
        setShowEditModal(false);
        setEditingQ(null);
        fetchData();
      } else {
        const err = await res.json();
        showMsg('❌ Error: ' + (err.error || 'Failed to update'));
      }
    } catch (err: any) {
      showMsg('❌ Error: ' + err.message);
    }
  };

  // Delete Question
  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      const res = await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showMsg('🗑️ Question deleted from repository.');
        fetchData();
      }
    } catch (err: any) {
      showMsg('Error deleting question');
    }
  };

  // Bulk Import
  const handleBulkImport = async () => {
    try {
      const parsed = JSON.parse(bulkInput);
      const res = await fetch('/api/admin/questions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: parsed })
      });
      const data = await res.json();
      if (res.ok) {
        showMsg(`✅ Imported ${data.count} verified questions!`);
        setShowBulkModal(false);
        setBulkInput('');
        fetchData();
      } else {
        showMsg('❌ Bulk import failed: ' + data.error);
      }
    } catch (err: any) {
      showMsg('❌ Invalid JSON format: Ensure it is a valid JSON array');
    }
  };

  const loadSampleBulkJson = () => {
    const sample = [
      {
        exam_id: 'exam-cgl',
        subject_id: 'sub-gk',
        difficulty: 'moderate',
        question_en: 'Who among the following was the founder of the Nanda Dynasty?',
        question_hi: 'निम्नलिखित में से कौन नंद वंश का संस्थापक था?',
        option_a_en: 'Mahapadma Nanda',
        option_a_hi: 'महापद्मनंद',
        option_b_en: 'Dhana Nanda',
        option_b_hi: 'धनानंद',
        option_c_en: 'Bimbisara',
        option_c_hi: 'बिंबिसार',
        option_d_en: 'Ajatashatru',
        option_d_hi: 'अजातशत्रु',
        correct_option: 0,
        explanation_en: 'Mahapadma Nanda established the Nanda dynasty in Magadha around 345 BCE.',
        explanation_hi: 'महापद्मनंद ने 345 ईसा पूर्व के आसपास मगध में नंद वंश की स्थापना की थी।',
        pyq_source: 'SSC CGL 2023 Tier-1'
      }
    ];
    setBulkInput(JSON.stringify(sample, null, 2));
  };

  // Save User Edit
  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coins: editingUser.coins,
          rating: editingUser.rating,
          rank_tier: editingUser.rank_tier,
          level: editingUser.level,
          is_admin: editingUser.is_admin
        })
      });
      if (res.ok) {
        showMsg('✅ Aspirant stats and permissions updated!');
        setShowEditUserModal(false);
        setEditingUser(null);
        fetchData();
      } else {
        showMsg('❌ Failed to update user.');
      }
    } catch (err: any) {
      showMsg('❌ Error updating user: ' + err.message);
    }
  };

  // Ban User
  const handleBanUser = async (id: string, uname: string) => {
    if (!window.confirm(`Are you sure you want to ban/remove ${uname}?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showMsg(`🚫 User ${uname} has been banned and deleted.`);
        fetchData();
      }
    } catch (err: any) {
      showMsg('Error banning user');
    }
  };

  // Resolve Report
  const handleUpdateReport = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        showMsg(`Report marked as ${status}.`);
        fetchData();
      }
    } catch (err: any) {
      showMsg('Error updating report');
    }
  };

  // Terminate Battle
  const handleTerminateBattle = async (battleId: string) => {
    if (!window.confirm(`Force terminate Battle ${battleId}?`)) return;
    try {
      const res = await fetch(`/api/admin/battles/${battleId}/terminate`, { method: 'POST' });
      if (res.ok) {
        showMsg(`🛑 Battle ${battleId} terminated!`);
        fetchData();
      }
    } catch (err: any) {
      showMsg('Error terminating battle');
    }
  };

  // Quick Admin Demo Login
  const handleAdminDemoLogin = async () => {
    setLoading(true);
    await loginWithCredentials('ArenaMaster', 'admin123');
    setLoading(false);
  };

  // If user is not logged in as Admin
  if (!user?.is_admin) {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8 text-amber-400" />
        </div>
        <h2 className="font-gaming font-black text-2xl text-white mb-2">Admin Portal Authentication</h2>
        <p className="text-slate-400 text-xs mb-6 max-w-sm">
          Access to Question Bank management, User stats modulation, and Battle telemetry requires Admin privileges.
        </p>

        <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-left text-xs mb-6">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
            <span className="font-gaming font-bold text-slate-300">Default Admin Credentials</span>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono">Demo Ready</span>
          </div>
          <div className="space-y-1 font-mono text-slate-400">
            <div>Username: <strong className="text-white">ArenaMaster</strong></div>
            <div>Email: <strong className="text-white">admin@examarena.com</strong></div>
            <div>Password: <strong className="text-white">admin123</strong></div>
          </div>
        </div>

        <button
          onClick={handleAdminDemoLogin}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-slate-950 font-gaming font-black text-sm tracking-wide shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 mb-3"
        >
          <Zap className="w-4 h-4 fill-slate-950" />
          <span>Login as ArenaMaster (Admin)</span>
        </button>

        {onNavigateTab && (
          <button
            onClick={() => onNavigateTab('home')}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-gaming"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Home</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-4 pb-24 flex flex-col gap-4">
      {/* Back to Home Button */}
      {onNavigateTab && (
        <div>
          <button
            onClick={() => onNavigateTab('home')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-gaming font-bold transition-all active:scale-95 shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
            <span>← Return to Home</span>
          </button>
        </div>
      )}

      {/* 1. Header Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-gaming font-black text-2xl text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            ADMIN CONTROL PANEL
          </h1>
          <p className="text-xs text-slate-400">1v1 Real-Time Battle Engine & Platform Management</p>
        </div>

        <button
          onClick={fetchData}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors shadow-sm"
          title="Refresh Telemetry"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
        </button>
      </div>

      {notification && (
        <div className="p-3 bg-indigo-600/90 text-white rounded-xl text-xs font-bold font-gaming flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{notification}</span>
        </div>
      )}

      {/* 2. Admin Navigation Tabs */}
      <div className="grid grid-cols-5 gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs font-gaming font-bold">
        <button
          onClick={() => setActiveTab('questions')}
          className={`py-2 rounded-lg transition-colors flex items-center justify-center gap-1 ${activeTab === 'questions' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
        >
          <span>Questions</span>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`py-2 rounded-lg transition-colors flex items-center justify-center gap-1 ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
        >
          <span>Aspirants</span>
        </button>
        <button
          onClick={() => setActiveTab('battles')}
          className={`py-2 rounded-lg transition-colors flex items-center justify-center gap-1 ${activeTab === 'battles' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
        >
          <span>1v1 Battles</span>
          {battles.live.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`py-2 rounded-lg transition-colors flex items-center justify-center gap-1 ${activeTab === 'reports' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
        >
          <span>Reports</span>
          {reports.filter(r => r.status === 'pending').length > 0 && (
            <span className="bg-rose-500 text-white text-[9px] px-1 rounded-full font-sans">
              {reports.filter(r => r.status === 'pending').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`py-2 rounded-lg transition-colors flex items-center justify-center gap-1 ${activeTab === 'analytics' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
        >
          <span>Analytics</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: QUESTIONS MANAGEMENT                              */}
      {/* ======================================================== */}
      {activeTab === 'questions' && (
        <div className="flex flex-col gap-3">
          {/* Controls bar */}
          <div className="flex flex-col sm:flex-row gap-2 justify-between">
            <form onSubmit={handleSearchQuestions} className="flex-1 flex gap-1.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search questions or PYQ exam year..."
                  value={qSearch}
                  onChange={(e) => setQSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-gaming font-bold border border-slate-700"
              >
                Search
              </button>
            </form>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBulkModal(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-gaming font-bold flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Bulk Import</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-gaming font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Question</span>
              </button>
            </div>
          </div>

          {/* Filters row */}
          <div className="grid grid-cols-3 gap-2 bg-slate-900/50 p-2 rounded-xl border border-slate-800 text-xs">
            <select
              value={qExam}
              onChange={(e) => { setQExam(e.target.value); setQPage(1); }}
              className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-slate-300"
            >
              <option value="all">All Exams</option>
              <option value="exam-cgl">SSC CGL</option>
              <option value="exam-chsl">SSC CHSL</option>
              <option value="exam-cpo">SSC CPO</option>
              <option value="exam-gd">SSC GD</option>
              <option value="exam-banking">Banking</option>
              <option value="exam-railway">Railway</option>
              <option value="exam-state">State Exams</option>
            </select>

            <select
              value={qSubject}
              onChange={(e) => { setQSubject(e.target.value); setQPage(1); }}
              className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-slate-300"
            >
              <option value="all">All Subjects</option>
              <option value="sub-math">Mathematics</option>
              <option value="sub-reasoning">Reasoning</option>
              <option value="sub-english">English</option>
              <option value="sub-gk">General Awareness</option>
            </select>

            <select
              value={qDifficulty}
              onChange={(e) => { setQDifficulty(e.target.value); setQPage(1); }}
              className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-slate-300"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="moderate">Moderate</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 font-gaming">
            <span>Showing {questions.length} of {totalQuestions} questions</span>
            <div className="flex items-center gap-2">
              <button
                disabled={qPage <= 1}
                onClick={() => setQPage(p => p - 1)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 disabled:opacity-40 text-slate-300 hover:bg-slate-700"
              >
                Prev
              </button>
              <span>Page {qPage}</span>
              <button
                disabled={questions.length < 25}
                onClick={() => setQPage(p => p + 1)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 disabled:opacity-40 text-slate-300 hover:bg-slate-700"
              >
                Next
              </button>
            </div>
          </div>

          {/* Question Cards List */}
          <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
            {questions.map((q) => (
              <div key={q.id} className="bg-arena-card border border-arena-border rounded-2xl p-3.5 text-xs shadow-md hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-bold text-[10px]">
                      {q.exam_name || q.exam_id}
                    </span>
                    <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px]">
                      {q.subject_name || q.subject_id}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      q.difficulty === 'easy' ? 'bg-emerald-500/20 text-emerald-300' :
                      q.difficulty === 'hard' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {q.difficulty}
                    </span>
                    <span className="text-amber-400 text-[10px] font-mono">
                      {q.pyq_source}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditQuestionModal(q)}
                      className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Edit Question"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Delete Question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="font-semibold text-white mb-1">{q.question_en}</p>
                <p className="text-slate-400 text-[11px] mb-2">{q.question_hi}</p>

                <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-slate-900/80 p-2 rounded-xl border border-slate-800 mb-2">
                  <div className={`p-1.5 rounded-lg ${q.correct_option === 0 ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40' : 'text-slate-400'}`}>
                    A: {q.option_a_en} / {q.option_a_hi}
                  </div>
                  <div className={`p-1.5 rounded-lg ${q.correct_option === 1 ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40' : 'text-slate-400'}`}>
                    B: {q.option_b_en} / {q.option_b_hi}
                  </div>
                  <div className={`p-1.5 rounded-lg ${q.correct_option === 2 ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40' : 'text-slate-400'}`}>
                    C: {q.option_c_en} / {q.option_c_hi}
                  </div>
                  <div className={`p-1.5 rounded-lg ${q.correct_option === 3 ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40' : 'text-slate-400'}`}>
                    D: {q.option_d_en} / {q.option_d_hi}
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 bg-slate-900/40 p-2 rounded-lg border border-slate-800/60">
                  <span className="text-indigo-400 font-bold">Explanation: </span>
                  {q.explanation_en} (Hindi: {q.explanation_hi})
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: ASPIRANTS / USER MANAGEMENT                       */}
      {/* ======================================================== */}
      {activeTab === 'users' && (
        <div className="flex flex-col gap-3">
          <form onSubmit={handleSearchUsers} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search aspirant username or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-gaming font-bold border border-slate-700"
            >
              Filter
            </button>
          </form>

          <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
            {users.map((u) => (
              <div key={u.id} className="bg-arena-card border border-arena-border rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-md">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={u.avatar} alt={u.username} className="w-11 h-11 rounded-full bg-slate-800 object-cover border border-slate-700" />
                    {u.is_admin ? (
                      <span className="absolute -top-1 -right-1 text-[8px] bg-amber-500 text-slate-950 px-1 rounded-full font-black font-gaming">ADMIN</span>
                    ) : null}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{u.username}</span>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-gaming font-bold">
                        {u.rank_tier || 'Silver'}
                      </span>
                      <span className="text-[10px] text-cyan-400 font-mono">
                        {u.rating || 1200} Elo
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>LVL {u.level || 1} ({u.xp || 0} XP)</span>
                      <span>·</span>
                      <span className="text-amber-400 font-semibold">{u.coins || 100} Coins</span>
                      <span>·</span>
                      <span className="text-emerald-400 font-semibold">{u.wins || 0}W</span>
                      <span className="text-rose-400">{u.losses || 0}L</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => {
                      setEditingUser({ ...u });
                      setShowEditUserModal(true);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-gaming font-bold flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Edit Stats</span>
                  </button>

                  <button
                    onClick={() => handleBanUser(u.id, u.username)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                    title="Ban / Delete Account"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: 1V1 BATTLE MONITORING                             */}
      {/* ======================================================== */}
      {activeTab === 'battles' && (
        <div className="flex flex-col gap-4">
          {/* Active Live Rooms */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-gaming font-bold text-sm text-white flex items-center gap-2">
                <Swords className="w-4 h-4 text-emerald-400" />
                Live 1v1 Rooms ({battles.live.length})
              </h3>
              <span className="text-[10px] text-emerald-400 font-mono animate-pulse">● AUTHORITATIVE ENGINE ACTIVE</span>
            </div>

            {battles.live.length === 0 ? (
              <div className="bg-arena-card border border-arena-border p-6 rounded-2xl text-center text-slate-400 text-xs">
                No active 1v1 battles in progress right now. Matchmaking queue is ready.
              </div>
            ) : (
              <div className="space-y-2.5">
                {battles.live.map((b) => (
                  <div key={b.battleId} className="bg-arena-card border border-emerald-500/30 rounded-2xl p-3.5 text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[10px] text-slate-400">ID: {b.battleId}</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">
                        Question {b.currentQuestionIndex + 1}/{b.totalQuestions} ({b.state})
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800 mb-2">
                      <div className="flex items-center gap-2">
                        <img src={b.player1.avatar} className="w-7 h-7 rounded-full" />
                        <div>
                          <div className="font-bold text-white text-xs">{b.player1.username}</div>
                          <div className="text-cyan-400 font-gaming font-black">{b.player1.score} PTS</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 text-right">
                        <div>
                          <div className="font-bold text-white text-xs">{b.player2.username}</div>
                          <div className="text-indigo-400 font-gaming font-black">{b.player2.score} PTS</div>
                        </div>
                        <img src={b.player2.avatar} className="w-7 h-7 rounded-full" />
                      </div>
                    </div>

                    <button
                      onClick={() => handleTerminateBattle(b.battleId)}
                      className="w-full py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg font-gaming font-bold text-[11px] transition-colors"
                    >
                      Force Terminate Battle
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Match History */}
          <div>
            <h3 className="font-gaming font-bold text-sm text-white flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Recent Completed Battles ({battles.recent.length})
            </h3>

            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {battles.recent.map((b) => (
                <div key={b.id} className="bg-arena-card border border-arena-border rounded-xl p-3 text-xs flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                        {b.mode}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{b.created_at}</span>
                    </div>
                    <div className="font-bold text-white">
                      {b.player1_username || 'Player 1'} ({b.player1_score} pts) vs {b.player2_username || 'Player 2'} ({b.player2_score} pts)
                    </div>
                  </div>

                  <div>
                    <span className={`text-[11px] font-gaming font-bold px-2 py-0.5 rounded ${
                      b.status === 'completed' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: REPORTS MODERATION                                */}
      {/* ======================================================== */}
      {activeTab === 'reports' && (
        <div className="space-y-2.5">
          {reports.length === 0 ? (
            <div className="bg-arena-card p-6 rounded-2xl text-center text-slate-400 text-xs">
              No reported questions at this time. All questions verified.
            </div>
          ) : (
            reports.map((r) => (
              <div key={r.id} className="bg-arena-card border border-rose-500/30 rounded-2xl p-3.5 text-xs shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                      Reason: {r.reason}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      r.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {r.status}
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-500 font-mono">{r.created_at}</span>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 mb-2">
                  <p className="font-medium text-slate-200 mb-1">{r.question_en}</p>
                  <p className="text-slate-400 text-[11px]">{r.question_hi}</p>
                  <div className="text-[10px] text-emerald-400 mt-1">
                    Correct Option: Option {['A', 'B', 'C', 'D'][r.correct_option || 0]}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    Flagged by: <strong className="text-white">{r.reporter_username || 'Aspirant'}</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    {r.status !== 'resolved' && (
                      <button
                        onClick={() => handleUpdateReport(r.id, 'resolved')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-gaming font-bold text-[10px]"
                      >
                        Mark Resolved
                      </button>
                    )}
                    <button
                      onClick={() => handleUpdateReport(r.id, 'dismissed')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-gaming font-bold text-[10px]"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: ANALYTICS                                         */}
      {/* ======================================================== */}
      {activeTab === 'analytics' && analytics && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-arena-card border border-arena-border rounded-2xl p-4 text-center shadow-lg">
              <span className="text-[10px] text-slate-400 uppercase font-gaming block mb-1">Total Aspirants</span>
              <span className="font-gaming font-black text-3xl text-cyan-400">{analytics.totalUsers}</span>
            </div>
            <div className="bg-arena-card border border-arena-border rounded-2xl p-4 text-center shadow-lg">
              <span className="text-[10px] text-slate-400 uppercase font-gaming block mb-1">Battles Completed</span>
              <span className="font-gaming font-black text-3xl text-indigo-400">{analytics.totalBattles}</span>
            </div>
            <div className="bg-arena-card border border-arena-border rounded-2xl p-4 text-center shadow-lg">
              <span className="text-[10px] text-slate-400 uppercase font-gaming block mb-1">Verified Questions</span>
              <span className="font-gaming font-black text-3xl text-emerald-400">{analytics.totalQuestions}</span>
            </div>
            <div className="bg-arena-card border border-arena-border rounded-2xl p-4 text-center shadow-lg">
              <span className="text-[10px] text-slate-400 uppercase font-gaming block mb-1">Live Battles Now</span>
              <span className="font-gaming font-black text-3xl text-amber-400">{analytics.activeBattlesNow}</span>
            </div>
            <div className="bg-arena-card border border-arena-border rounded-2xl p-4 text-center shadow-lg">
              <span className="text-[10px] text-slate-400 uppercase font-gaming block mb-1">Average Elo</span>
              <span className="font-gaming font-black text-3xl text-purple-400">{analytics.avgRating}</span>
            </div>
            <div className="bg-arena-card border border-arena-border rounded-2xl p-4 text-center shadow-lg">
              <span className="text-[10px] text-slate-400 uppercase font-gaming block mb-1">Pending Reports</span>
              <span className="font-gaming font-black text-3xl text-rose-400">{analytics.totalPendingReports}</span>
            </div>
          </div>

          {/* Tier distribution */}
          <div className="bg-arena-card border border-arena-border rounded-2xl p-4">
            <h3 className="font-gaming font-bold text-xs text-white uppercase tracking-wider mb-3">
              Aspirants Rank Distribution
            </h3>
            <div className="space-y-2">
              {analytics.rankDistribution?.map((r: any) => (
                <div key={r.rank_tier} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold">{r.rank_tier}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-cyan-400 font-bold">{r.count} users</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD BILINGUAL QUESTION                            */}
      {/* ======================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-arena-surface border border-arena-border rounded-3xl p-5 my-auto max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-gaming font-bold text-lg text-white">Add Bilingual Question</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddQuestion} className="flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Exam</label>
                  <select
                    value={newQ.exam_id}
                    onChange={(e) => setNewQ({ ...newQ, exam_id: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                  >
                    <option value="exam-cgl">SSC CGL</option>
                    <option value="exam-chsl">SSC CHSL</option>
                    <option value="exam-cpo">SSC CPO</option>
                    <option value="exam-gd">SSC GD</option>
                    <option value="exam-banking">Banking</option>
                    <option value="exam-railway">Railway</option>
                    <option value="exam-state">State Exams</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Subject</label>
                  <select
                    value={newQ.subject_id}
                    onChange={(e) => setNewQ({ ...newQ, subject_id: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                  >
                    <option value="sub-math">Mathematics</option>
                    <option value="sub-reasoning">Reasoning</option>
                    <option value="sub-english">English</option>
                    <option value="sub-gk">General Awareness</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Difficulty</label>
                  <select
                    value={newQ.difficulty}
                    onChange={(e) => setNewQ({ ...newQ, difficulty: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                  >
                    <option value="easy">Easy</option>
                    <option value="moderate">Moderate</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Question Text (English)</label>
                <textarea
                  required
                  rows={2}
                  value={newQ.question_en}
                  onChange={(e) => setNewQ({ ...newQ, question_en: e.target.value })}
                  placeholder="e.g. If 20% of a number is 50, then 60% of the number is..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Question Text (Hindi - हिंदी अनुवाद)</label>
                <textarea
                  required
                  rows={2}
                  value={newQ.question_hi}
                  onChange={(e) => setNewQ({ ...newQ, question_hi: e.target.value })}
                  placeholder="उदा. यदि किसी संख्या का 20% 50 है, तो उस संख्या का 60% क्या होगा?"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              {/* Options */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Option A (EN)</label>
                  <input
                    required
                    type="text"
                    value={newQ.option_a_en}
                    onChange={(e) => setNewQ({ ...newQ, option_a_en: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Option A (HI)</label>
                  <input
                    required
                    type="text"
                    value={newQ.option_a_hi}
                    onChange={(e) => setNewQ({ ...newQ, option_a_hi: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Option B (EN)</label>
                  <input
                    required
                    type="text"
                    value={newQ.option_b_en}
                    onChange={(e) => setNewQ({ ...newQ, option_b_en: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Option B (HI)</label>
                  <input
                    required
                    type="text"
                    value={newQ.option_b_hi}
                    onChange={(e) => setNewQ({ ...newQ, option_b_hi: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Option C (EN)</label>
                  <input
                    required
                    type="text"
                    value={newQ.option_c_en}
                    onChange={(e) => setNewQ({ ...newQ, option_c_en: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Option C (HI)</label>
                  <input
                    required
                    type="text"
                    value={newQ.option_c_hi}
                    onChange={(e) => setNewQ({ ...newQ, option_c_hi: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Option D (EN)</label>
                  <input
                    required
                    type="text"
                    value={newQ.option_d_en}
                    onChange={(e) => setNewQ({ ...newQ, option_d_en: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Option D (HI)</label>
                  <input
                    required
                    type="text"
                    value={newQ.option_d_hi}
                    onChange={(e) => setNewQ({ ...newQ, option_d_hi: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Correct Answer</label>
                <select
                  value={newQ.correct_option}
                  onChange={(e) => setNewQ({ ...newQ, correct_option: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-emerald-500/50 rounded-xl p-2 text-emerald-400 font-bold"
                >
                  <option value={0}>Option A</option>
                  <option value={1}>Option B</option>
                  <option value={2}>Option C</option>
                  <option value={3}>Option D</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Explanation (EN)</label>
                  <input
                    type="text"
                    value={newQ.explanation_en}
                    onChange={(e) => setNewQ({ ...newQ, explanation_en: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Explanation (HI)</label>
                  <input
                    type="text"
                    value={newQ.explanation_hi}
                    onChange={(e) => setNewQ({ ...newQ, explanation_hi: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">PYQ Source Tag</label>
                <input
                  type="text"
                  value={newQ.pyq_source}
                  onChange={(e) => setNewQ({ ...newQ, pyq_source: e.target.value })}
                  placeholder="e.g. SSC CGL 2024 Tier-1 Shift-3"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-gaming font-bold"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT QUESTION                                     */}
      {/* ======================================================== */}
      {showEditModal && editingQ && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-arena-surface border border-arena-border rounded-3xl p-5 my-auto max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-gaming font-bold text-lg text-white">Edit Question (ID: {editingQ.id})</h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditQuestion} className="flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Exam</label>
                  <select
                    value={editingQ.exam_id}
                    onChange={(e) => setEditingQ({ ...editingQ, exam_id: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                  >
                    <option value="exam-cgl">SSC CGL</option>
                    <option value="exam-chsl">SSC CHSL</option>
                    <option value="exam-cpo">SSC CPO</option>
                    <option value="exam-gd">SSC GD</option>
                    <option value="exam-banking">Banking</option>
                    <option value="exam-railway">Railway</option>
                    <option value="exam-state">State Exams</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Subject</label>
                  <select
                    value={editingQ.subject_id}
                    onChange={(e) => setEditingQ({ ...editingQ, subject_id: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                  >
                    <option value="sub-math">Mathematics</option>
                    <option value="sub-reasoning">Reasoning</option>
                    <option value="sub-english">English</option>
                    <option value="sub-gk">General Awareness</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Difficulty</label>
                  <select
                    value={editingQ.difficulty}
                    onChange={(e) => setEditingQ({ ...editingQ, difficulty: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                  >
                    <option value="easy">Easy</option>
                    <option value="moderate">Moderate</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Question (English)</label>
                <textarea
                  required
                  rows={2}
                  value={editingQ.question_en}
                  onChange={(e) => setEditingQ({ ...editingQ, question_en: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Question (Hindi)</label>
                <textarea
                  required
                  rows={2}
                  value={editingQ.question_hi}
                  onChange={(e) => setEditingQ({ ...editingQ, question_hi: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Option A (EN)</label>
                  <input
                    type="text"
                    value={editingQ.option_a_en}
                    onChange={(e) => setEditingQ({ ...editingQ, option_a_en: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Option A (HI)</label>
                  <input
                    type="text"
                    value={editingQ.option_a_hi}
                    onChange={(e) => setEditingQ({ ...editingQ, option_a_hi: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Option B (EN)</label>
                  <input
                    type="text"
                    value={editingQ.option_b_en}
                    onChange={(e) => setEditingQ({ ...editingQ, option_b_en: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Option B (HI)</label>
                  <input
                    type="text"
                    value={editingQ.option_b_hi}
                    onChange={(e) => setEditingQ({ ...editingQ, option_b_hi: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Option C (EN)</label>
                  <input
                    type="text"
                    value={editingQ.option_c_en}
                    onChange={(e) => setEditingQ({ ...editingQ, option_c_en: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Option C (HI)</label>
                  <input
                    type="text"
                    value={editingQ.option_c_hi}
                    onChange={(e) => setEditingQ({ ...editingQ, option_c_hi: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Option D (EN)</label>
                  <input
                    type="text"
                    value={editingQ.option_d_en}
                    onChange={(e) => setEditingQ({ ...editingQ, option_d_en: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Option D (HI)</label>
                  <input
                    type="text"
                    value={editingQ.option_d_hi}
                    onChange={(e) => setEditingQ({ ...editingQ, option_d_hi: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Correct Answer</label>
                <select
                  value={editingQ.correct_option}
                  onChange={(e) => setEditingQ({ ...editingQ, correct_option: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-emerald-500/50 rounded-xl p-2 text-emerald-400 font-bold"
                >
                  <option value={0}>Option A</option>
                  <option value={1}>Option B</option>
                  <option value={2}>Option C</option>
                  <option value={3}>Option D</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">PYQ Source Tag</label>
                <input
                  type="text"
                  value={editingQ.pyq_source}
                  onChange={(e) => setEditingQ({ ...editingQ, pyq_source: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-gaming font-bold"
                >
                  Update Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT ASPIRANT / USER                              */}
      {/* ======================================================== */}
      {showEditUserModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-arena-surface border border-arena-border rounded-3xl p-5 my-auto shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-gaming font-bold text-lg text-white">Manage Aspirant: {editingUser.username}</h2>
              <button onClick={() => setShowEditUserModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Coins Balance</label>
                  <input
                    type="number"
                    value={editingUser.coins}
                    onChange={(e) => setEditingUser({ ...editingUser, coins: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-amber-400 font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Elo Rating</label>
                  <input
                    type="number"
                    value={editingUser.rating}
                    onChange={(e) => setEditingUser({ ...editingUser, rating: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-cyan-400 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Rank Tier</label>
                  <select
                    value={editingUser.rank_tier}
                    onChange={(e) => setEditingUser({ ...editingUser, rank_tier: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                  >
                    <option value="Bronze">Bronze</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                    <option value="Platinum">Platinum</option>
                    <option value="Diamond">Diamond</option>
                    <option value="Master">Master</option>
                    <option value="Grandmaster">Grandmaster</option>
                    <option value="Legend">Legend</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Level</label>
                  <input
                    type="number"
                    value={editingUser.level}
                    onChange={(e) => setEditingUser({ ...editingUser, level: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">Admin Privileges</div>
                  <div className="text-[11px] text-slate-400">Can view & edit admin portal</div>
                </div>
                <input
                  type="checkbox"
                  checked={editingUser.is_admin === 1}
                  onChange={(e) => setEditingUser({ ...editingUser, is_admin: e.target.checked ? 1 : 0 })}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowEditUserModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-gaming font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: BULK IMPORT QUESTIONS                             */}
      {/* ======================================================== */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-arena-surface border border-arena-border rounded-3xl p-5 my-auto shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-gaming font-bold text-lg text-white">Bulk Question Import (JSON)</h2>
              <button onClick={() => setShowBulkModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-400 text-xs mb-3">
              Paste an array of question objects containing English and Hindi texts, four options, and correct_option index (0 to 3).
            </p>

            <button
              onClick={loadSampleBulkJson}
              className="mb-2 text-indigo-400 hover:text-indigo-300 text-xs font-gaming font-bold underline"
            >
              Load Sample JSON Template
            </button>

            <textarea
              rows={9}
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder={'[ { "question_en": "...", "question_hi": "...", "correct_option": 0 } ]'}
              className="w-full font-mono text-xs bg-slate-900 border border-slate-700 rounded-xl p-3 text-emerald-400 mb-3"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowBulkModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkImport}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-gaming font-bold text-xs"
              >
                Import Questions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
