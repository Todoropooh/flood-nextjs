'use client';

import { useState, useEffect, useCallback } from 'react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useTheme } from 'next-themes'; 
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Trash2, XCircle, Search, Cpu, Plus, Edit2, Users, ShieldCheck, 
  Loader2, FileText, Calendar, Sun, Moon, Settings, UserCog, Ruler, Zap, Bell, Database,
  Image as ImageIcon, Save, CheckCircle2, X
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as htmlToImage from 'html-to-image'; 

import NodeModal from '@/components/NodeModal'; 
import WaterLevelChart from '@/components/WaterLevelChart'; 

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme(); 

  // --- States ---
  const [activeTab, setActiveTab] = useState<'nodes' | 'users' | 'system'>('nodes');
  const [devices, setDevices] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [modalState, setModalState] = useState({ add: false, user: false, export: false });
  const [modalAnim, setModalAnim] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportDays, setExportDays] = useState<number>(30); 
  const [showUI, setShowUI] = useState(false);

  // System Config States
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [qrImage, setQrImage] = useState("/telegram.jpg"); 
  const [systemSettings, setSystemSettings] = useState({ systemOn: true, buzzerOn: true });
  const [exportLogs, setExportLogs] = useState<any[]>([]); 

  const [userFormData, setUserFormData] = useState({ username: '', password: '', firstname: '', lastname: '', role: 'user', phone: '', image: '' });
  const [isMounted, setIsMounted] = useState(false);

  // --- API Functions ---
  const fetchData = useCallback(async () => {
    try {
      const t = Date.now();
      const [devRes, userRes] = await Promise.all([
        fetch(`/api/devices?t=${t}`, { cache: 'no-store' }), 
        fetch(`/api/users?t=${t}`, { cache: 'no-store' })
      ]);
      
      if (devRes.ok) {
        const devData = await devRes.json();
        setDevices(Array.isArray(devData) ? devData : (devData?.mac ? [devData] : []));
      }
      
      if (userRes.ok) {
        const userData = await userRes.json();
        setUsers(Array.isArray(userData) ? userData : []);
      }
    } catch (e) { 
      console.error("Fetch error:", e);
      setDevices([]); 
      setUsers([]);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setSystemSettings(data || { systemOn: true, buzzerOn: true });
        setBotToken(data?.botToken || "");
        setChatId(data?.chatId || "");
        setQrImage(data?.qrImage || "/telegram.jpg");
      }
    } catch (e) { console.error("Settings error:", e); }
  }, []);

  // --- Initial Load ---
  useEffect(() => {
    setIsMounted(true);
    if (status === 'unauthenticated') router.push('/');
    else if (status === 'authenticated' && (session?.user as any)?.role !== 'admin') router.push('/');
  }, [status, session, router]);

  useEffect(() => { 
    if (status === 'authenticated' && (session?.user as any)?.role === 'admin') {
      fetchData();
      fetchSettings();
      setTimeout(() => setShowUI(true), 100);
    }
  }, [status, session, fetchData, fetchSettings]);

  // --- Modal Logic ---
  const openModal = (type: keyof typeof modalState) => {
    setModalState(prev => ({ ...prev, [type]: true }));
    setTimeout(() => setModalAnim(true), 10);
  };

  const closeModal = () => {
    setModalAnim(false);
    setTimeout(() => {
      setModalState({ add: false, user: false, export: false });
      setEditingId(null);
      setIsSaving(false);
    }, 300);
  };

  // --- Submit Handlers ---
  const handleDeviceSubmit = async (submittedData: any, currentEditingId: string | null) => {
    setIsSaving(true);
    try {
      const method = currentEditingId ? 'PUT' : 'POST';
      const res = await fetch('/api/devices', { 
        method, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(currentEditingId ? { ...submittedData, _id: currentEditingId } : submittedData) 
      });
      if (res.ok) { await fetchData(); closeModal(); } 
      else { alert("Error saving device"); }
    } finally {
      setIsSaving(false);
    }
  };

  const handleUserSubmit = async (e: any) => {
    e.preventDefault(); 
    setIsSaving(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch('/api/users', { 
        method, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(editingId ? { ...userFormData, _id: editingId } : userFormData) 
      });
      if (res.ok) { await fetchData(); closeModal(); } 
      else { alert("Error saving user"); }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if(!confirm('ลบผู้ใช้นี้อย่างถาวร?')) return;
    const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
    if (res.ok) fetchData();
  };

  const handleApproveUser = async (id: string, approve: boolean) => {
    const msg = approve ? "ยืนยันการอนุมัติสมาชิก?" : "ยืนยันการปฏิเสธสมาชิก (ลบข้อมูล)?";
    if(!confirm(msg)) return;
    
    setIsSaving(true);
    try {
      const res = await fetch(`/api/users/${id}/approve`, { 
        method: approve ? 'PUT' : 'DELETE', 
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        alert(approve ? "อนุมัติสำเร็จ ✅" : "ปฏิเสธสำเร็จ ❌");
        await fetchData();
      }
    } catch (error) {
      console.error("Approve error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSystemSettings = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken, chatId, qrImage, ...systemSettings })
      });
      if (res.ok) alert("บันทึกการตั้งค่าเรียบร้อย! ✅");
    } catch (e) { alert("Error saving settings"); }
    setIsSaving(false);
  };

  const handleQRUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setQrImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleTestTelegram = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/test-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: botToken })
      });
      const data = await res.json();
      alert(data.success ? "✅ ส่งข้อความทดสอบสำเร็จ!" : "❌ ผิดพลาด: " + data.error);
    } catch (e) { alert("❌ เชื่อมต่อบอทไม่ได้"); }
    setIsSaving(false);
  };

  const executeExportPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      if (activeTab === 'users') {
        autoTable(doc, {
          startY: 20,
          head: [['#', 'Name', 'Username', 'Role', 'Status']],
          body: users.map((u, i) => [i + 1, `${u.firstname || ''} ${u.lastname || ''}`, u.username || '', u.role?.toUpperCase() || '', u.isApproved ? 'Approved' : 'Pending']),
        });
        doc.save(`User_Report.pdf`);
      } else {
        const res = await fetch(`/api/flood?timeframe=month`);
        const logs = res.ok ? await res.json() : [];
        setExportLogs(logs);
        await new Promise(r => setTimeout(r, 1000));
        const chartElem = document.getElementById('pdf-chart-container');
        if (chartElem) {
          const chartImg = await htmlToImage.toPng(chartElem, { backgroundColor: '#ffffff' });
          doc.addImage(chartImg, 'PNG', 10, 30, 190, 80);
        }
        autoTable(doc, { startY: 120, head: [['Time', 'Node', 'Level (cm)']], body: logs.map((l:any)=>[new Date(l.createdAt).toLocaleString(), l.mac, l.level]) });
        doc.save(`Flood_Report.pdf`);
      }
    } catch (e) { alert("Export Failed"); }
    closeModal();
    setIsExporting(false);
  };

  if (!isMounted || status === 'loading') return (
    <div className="flex h-screen items-center justify-center relative overflow-hidden">
      <div className="fixed inset-0 -z-10 bg-[#0f172a]">
        <img src="https://images.pexels.com/photos/1295138/pexels-photo-1295138.jpeg" className="w-full h-full object-cover opacity-100" alt="background" />
        <div className="absolute inset-0 bg-white/20 dark:bg-black/70 backdrop-blur-2xl transition-colors duration-500" />
      </div>
      <Loader2 className="animate-spin text-white drop-shadow-lg" size={40} />
    </div>
  );

  const pendingUsers = users.filter(u => !u.isApproved);
  const activeUsers = users.filter(u => u.isApproved && u.username !== (session?.user as any)?.username);
  const isDark = resolvedTheme === 'dark';

  return (
    <main className="min-h-screen font-sans pb-24 md:pb-10 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 -z-10 bg-[#0f172a]">
        <img src="https://images.pexels.com/photos/1295138/pexels-photo-1295138.jpeg" className="w-full h-full object-cover opacity-100" alt="background" />
        <div className="absolute inset-0 bg-slate-100/50 dark:bg-black/70 backdrop-blur-[40px] transition-colors duration-500" />
      </div>

      <header className={`sticky top-0 z-40 bg-white/40 dark:bg-black/40 backdrop-blur-2xl border-b border-white/50 dark:border-white/10 transition-all duration-500 ${showUI ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2.5 bg-white/50 dark:bg-black/50 rounded-xl shadow-sm border border-white/50 dark:border-white/10 backdrop-blur-md hover:scale-105 transition-transform">
              <ArrowLeft size={16} className={isDark ? 'text-white' : 'text-slate-800'} />
            </Link>
            <h1 className="text-sm font-black uppercase flex items-center gap-2 text-slate-800 dark:text-white drop-shadow-sm tracking-widest">
              <ShieldCheck size={20} className="text-blue-600 dark:text-blue-400" /> Admin Portal
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex p-1.5 bg-white/40 dark:bg-black/40 rounded-xl border border-white/50 dark:border-white/10 backdrop-blur-md shadow-inner">
              {(['nodes', 'users', 'system'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} 
                  className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all 
                  ${activeTab === tab 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                  {tab}
                </button>
              ))}
            </div>
            <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className="p-3 rounded-xl bg-white/40 dark:bg-black/40 border border-white/50 dark:border-white/10 backdrop-blur-md text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-black/60 transition-all shadow-sm">
              {isDark ? <Sun size={16}/> : <Moon size={16}/>}
            </button>
            <button onClick={() => signOut({ callbackUrl: '/' })} className="px-5 py-3 bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 hover:bg-red-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest backdrop-blur-md transition-all">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className={`max-w-6xl mx-auto p-4 md:px-6 mt-8 relative z-10 transition-all duration-700 ${showUI ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        <div className={`flex flex-col sm:flex-row gap-4 mb-6 justify-between items-center p-5 rounded-[2rem] shadow-xl backdrop-blur-xl ${isDark ? 'bg-[#1C1C1E]/60 border border-white/10' : 'bg-white/60 border border-white/50'}`}>
            <div className="relative w-full sm:w-72">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
               <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
                 className={`w-full pl-12 pr-4 py-3 rounded-xl text-xs font-bold outline-none backdrop-blur-sm shadow-inner transition-all ${isDark ? 'bg-black/40 border border-white/10 text-white focus:border-blue-500/50' : 'bg-white/50 border border-white/40 text-slate-800 focus:border-blue-400/50'}`} />
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
               <button onClick={() => openModal('export')} className="p-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/30 backdrop-blur-md transition-all shadow-sm"><FileText size={18} /></button>
               {activeTab !== 'system' && (
                 <button onClick={() => openModal(activeTab === 'nodes' ? 'add' : 'user')} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-500/30 border border-white/20 backdrop-blur-md transition-all"><Plus size={16}/> Add New</button>
               )}
            </div>
        </div>

        <div className={`rounded-[2.5rem] shadow-2xl overflow-hidden backdrop-blur-xl transition-all ${isDark ? 'bg-[#1C1C1E]/60 border border-white/10' : 'bg-white/60 border border-white/50'}`}>
          
          {/* ===================== NODES TAB ===================== */}
          {activeTab === 'nodes' && (
            <div className="overflow-x-auto p-2">
              <table className="w-full text-left text-sm">
                <thead className={`text-[10px] font-black uppercase tracking-widest backdrop-blur-md ${isDark ? 'bg-black/20 text-slate-400 border-b border-white/10' : 'bg-white/20 text-slate-500 border-b border-white/30'}`}>
                  <tr><th className="px-8 py-5">Node Info</th><th className="px-8 py-5">Settings</th><th className="px-8 py-5 text-right">Action</th></tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-white/30'}`}>
                  {devices.filter(d => (d?.name || '').toLowerCase().includes(searchTerm.toLowerCase())).map(device => (
                    <tr key={device?._id} className={`transition-colors group ${isDark ? 'hover:bg-white/5 text-slate-200' : 'hover:bg-white/40 text-slate-700'}`}>
                      <td className="px-8 py-5 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border backdrop-blur-sm shadow-inner group-hover:scale-105 transition-transform ${isDark ? 'bg-black/40 border-white/10' : 'bg-white/50 border-white/40'}`}>
                          {device?.image ? <img src={device.image} className="w-full h-full object-cover rounded-2xl" /> : <Cpu size={20} className={isDark ? 'text-slate-400' : 'text-blue-500'}/>}
                        </div>
                        <div><div className="font-black text-sm uppercase tracking-wide drop-shadow-sm">{device?.name || 'N/A'}</div><div className="text-[10px] font-mono font-bold opacity-60 mt-0.5">{device?.mac || 'Unknown'}</div></div>
                      </td>
                      <td className="px-8 py-5 font-bold text-[11px] uppercase tracking-wider">
                        H: {device?.installHeight || 0}m | <span className="text-red-500 dark:text-red-400 ml-1">Crit: {device?.criticalThreshold || 0}m</span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button onClick={() => { setEditingId(device._id); openModal('add'); }} className={`p-3 rounded-xl backdrop-blur-md shadow-sm transition-all ${isDark ? 'bg-black/40 hover:bg-white/10 text-slate-300' : 'bg-white/60 hover:bg-white border border-white/40 text-slate-600'}`}><Edit2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ===================== USERS TAB ===================== */}
          {activeTab === 'users' && (
            <div className="flex flex-col h-full">
              {pendingUsers.length > 0 && (
                <div className="p-6">
                  <h3 className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-4 drop-shadow-sm">Pending Approval ({pendingUsers.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingUsers.map(u => (
                      <div key={u._id} className="p-5 bg-amber-500/10 border border-amber-500/30 backdrop-blur-md rounded-[2rem] flex items-center justify-between shadow-sm">
                        <div className={`font-black text-sm uppercase tracking-wide drop-shadow-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>{u.firstname || ''} {u.lastname || ''} <span className="block text-[9px] font-mono font-bold opacity-70 mt-1">@{u.username}</span></div>
                        <div className="flex gap-2">
                          <button onClick={() => handleApproveUser(u._id, true)} disabled={isSaving} className="p-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl shadow-lg transition-all"><CheckCircle2 size={18}/></button>
                          <button onClick={() => handleApproveUser(u._id, false)} disabled={isSaving} className="p-3 bg-red-500 hover:bg-red-400 text-white rounded-xl shadow-lg transition-all"><XCircle size={18}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="overflow-x-auto border-t border-white/30 dark:border-white/10 p-2">
                <table className="w-full text-left text-sm">
                  <thead className={`text-[10px] font-black uppercase tracking-widest backdrop-blur-md ${isDark ? 'bg-black/20 text-slate-400 border-b border-white/10' : 'bg-white/20 text-slate-500 border-b border-white/30'}`}>
                    <tr><th className="px-8 py-5">User Profile</th><th className="px-8 py-5 text-center">Role</th><th className="px-8 py-5 text-right">Action</th></tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-white/30'}`}>
                    {activeUsers.map(user => (
                      <tr key={user._id} className={`transition-colors group ${isDark ? 'hover:bg-white/5 text-slate-200' : 'hover:bg-white/40 text-slate-700'}`}>
                        <td className="px-8 py-5 flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full overflow-hidden border backdrop-blur-sm shadow-inner group-hover:scale-105 transition-transform ${isDark ? 'bg-black/40 border-white/10' : 'bg-white/50 border-white/40'}`}>
                            {user?.image ? <img src={user.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Users size={20} className="text-slate-400" /></div>}
                          </div>
                          <div><div className="font-black text-sm uppercase tracking-wide drop-shadow-sm">{user.firstname || ''} {user.lastname || ''}</div><div className="text-[10px] font-mono font-bold opacity-60 mt-0.5">@{user.username || 'unknown'}</div></div>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className={`inline-block px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border backdrop-blur-md ${user.role === 'admin' ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30' : 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30'}`}>
                            {user.role || 'user'}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right space-x-2">
                          <button onClick={() => { setEditingId(user._id); setUserFormData({...user, password: ''}); openModal('user'); }} className={`p-3 rounded-xl backdrop-blur-md shadow-sm transition-all ${isDark ? 'bg-black/40 hover:bg-white/10 text-slate-300' : 'bg-white/60 hover:bg-white border border-white/40 text-slate-600'}`}><Edit2 size={16} /></button>
                          <button onClick={() => handleDeleteUser(user._id)} className="p-3 bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 rounded-xl border border-red-500/30 backdrop-blur-md transition-all shadow-sm"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===================== SYSTEM TAB ===================== */}
          {activeTab === 'system' && (
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className={`p-8 rounded-[2.5rem] shadow-xl backdrop-blur-xl border ${isDark ? 'bg-black/40 border-white/10' : 'bg-white/40 border-white/50'}`}>
                  <div className="flex items-center gap-3 mb-6"><Bell size={24} className="text-blue-600 dark:text-blue-400 drop-shadow-md"/><h3 className={`font-black text-xl uppercase tracking-widest drop-shadow-sm ${isDark ? 'text-white':'text-slate-800'}`}>Telegram Integration</h3></div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2 mb-1 block">Bot API Token</label>
                      <input type="text" placeholder="Enter Bot Token" value={botToken} onChange={e => setBotToken(e.target.value)} 
                        className={`w-full px-5 py-4 rounded-2xl text-xs font-bold outline-none backdrop-blur-sm shadow-inner transition-all ${isDark ? 'bg-black/60 border border-white/10 text-white focus:border-blue-500/50' : 'bg-white/60 border border-white/40 text-slate-800 focus:border-blue-400/50'}`} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2 mb-1 block">Target Chat ID</label>
                      <input type="text" placeholder="Enter Chat ID" value={chatId} onChange={e => setChatId(e.target.value)} 
                        className={`w-full px-5 py-4 rounded-2xl text-xs font-bold outline-none backdrop-blur-sm shadow-inner transition-all ${isDark ? 'bg-black/60 border border-white/10 text-white focus:border-blue-500/50' : 'bg-white/60 border border-white/40 text-slate-800 focus:border-blue-400/50'}`} />
                    </div>
                    <button onClick={handleTestTelegram} disabled={isSaving} className="w-full py-4 mt-4 bg-emerald-500/90 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-lg shadow-emerald-500/30 transition-all border border-white/20 backdrop-blur-md flex justify-center items-center gap-2">
                       <Zap size={16}/> Test Connection
                    </button>
                  </div>
                </div>
                <div className={`p-8 rounded-[2.5rem] shadow-xl backdrop-blur-xl border flex flex-col items-center justify-center gap-6 text-center ${isDark ? 'bg-black/40 border-white/10' : 'bg-white/40 border-white/50'}`}>
                   <div className="relative group cursor-pointer rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white/50 dark:border-white/10">
                      <img src={qrImage} alt="QR" className="w-48 h-48 object-cover" />
                      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-all cursor-pointer backdrop-blur-md">
                        <ImageIcon size={28} className="mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Change QR Image</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleQRUpload} />
                      </label>
                   </div>
                   <div>
                     <h4 className="font-black text-sm uppercase tracking-widest text-slate-800 dark:text-slate-200 drop-shadow-sm">Subscriber QR Code</h4>
                     <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">For users to scan and join alert group</p>
                   </div>
                </div>
              </div>
              <button onClick={handleSaveSystemSettings} disabled={isSaving} className="w-full bg-blue-600/90 hover:bg-blue-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/30 transition-all flex items-center justify-center gap-3 border border-white/20 backdrop-blur-md">
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20}/> Update System Configuration</>}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ===================== MODALS ===================== */}

      {/* Export Modal */}
      {modalState.export && (
        <div className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all duration-300 ${modalAnim ? 'opacity-100' : 'opacity-0'}`}>
          <div className={`rounded-[3rem] shadow-2xl w-full max-w-sm p-8 text-center space-y-6 border backdrop-blur-2xl transform transition-transform duration-300 ${modalAnim ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'} ${isDark ? 'bg-[#1C1C1E]/80 border-white/10' : 'bg-white/80 border-white/50'}`}>
              <div className="p-5 bg-blue-500/10 rounded-3xl w-24 h-24 mx-auto flex items-center justify-center border border-blue-500/20 shadow-inner"><FileText size={40} className="text-blue-600 dark:text-blue-400"/></div>
              <div>
                <h3 className={`font-black text-2xl uppercase tracking-tight drop-shadow-sm ${isDark ? 'text-white':'text-slate-800'}`}>Generate Report</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Download PDF Document</p>
              </div>
              <select value={exportDays} onChange={e => setExportDays(Number(e.target.value))} 
                className={`w-full p-4 rounded-2xl outline-none font-black text-xs uppercase tracking-widest text-center backdrop-blur-sm shadow-inner cursor-pointer ${isDark ? 'bg-black/40 border border-white/10 text-white' : 'bg-white/60 border border-white/40 text-slate-800'}`}>
                <option value={1} className="text-black">Last 24 Hours</option><option value={7} className="text-black">Last 7 Days</option><option value={30} className="text-black">Last 30 Days</option>
              </select>
              <button onClick={executeExportPDF} disabled={isExporting} className="w-full py-4 bg-emerald-500/90 hover:bg-emerald-500 text-white font-black uppercase text-[11px] tracking-widest rounded-2xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all border border-white/20 backdrop-blur-md">
                {isExporting ? <Loader2 className="animate-spin" size={20} /> : <><Download size={16}/> Download PDF</>}
              </button>
              <button onClick={closeModal} className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors p-2">Cancel & Close</button>
          </div>
        </div>
      )}

      {/* 🌟 [NEW] USER EDIT MODAL (กดปุ่มดินสอแล้วเด้งอันนี้) */}
      {modalState.user && (
        <div className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all duration-300 ${modalAnim ? 'opacity-100' : 'opacity-0'}`}>
          <div className={`rounded-[3rem] shadow-2xl w-full max-w-md p-8 border backdrop-blur-2xl transform transition-transform duration-300 ${modalAnim ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'} ${isDark ? 'bg-[#1C1C1E]/90 border-white/10' : 'bg-white/90 border-white/50'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className={`font-black text-xl uppercase tracking-tight flex items-center gap-2 drop-shadow-sm ${isDark ? 'text-white':'text-slate-800'}`}>
                <UserCog size={24} className="text-blue-500" /> {editingId ? 'Edit User Role' : 'Add New User'}
              </h3>
              <button onClick={closeModal} className="p-2 bg-white/20 dark:bg-black/20 rounded-full hover:bg-red-500/20 hover:text-red-500 transition-colors"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2 mb-1 block">First Name</label>
                  <input type="text" required value={userFormData.firstname} onChange={e => setUserFormData({...userFormData, firstname: e.target.value})} className={`w-full px-4 py-3 rounded-2xl text-xs font-bold outline-none backdrop-blur-sm shadow-inner ${isDark ? 'bg-black/40 border border-white/10 text-white' : 'bg-white/60 border border-white/40 text-slate-800'}`} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2 mb-1 block">Last Name</label>
                  <input type="text" required value={userFormData.lastname} onChange={e => setUserFormData({...userFormData, lastname: e.target.value})} className={`w-full px-4 py-3 rounded-2xl text-xs font-bold outline-none backdrop-blur-sm shadow-inner ${isDark ? 'bg-black/40 border border-white/10 text-white' : 'bg-white/60 border border-white/40 text-slate-800'}`} />
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2 mb-1 block">Username</label>
                <input type="text" required value={userFormData.username} onChange={e => setUserFormData({...userFormData, username: e.target.value})} disabled={!!editingId} className={`w-full px-4 py-3 rounded-2xl text-xs font-bold outline-none backdrop-blur-sm shadow-inner disabled:opacity-50 ${isDark ? 'bg-black/40 border border-white/10 text-white' : 'bg-white/60 border border-white/40 text-slate-800'}`} />
              </div>

              {!editingId && (
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2 mb-1 block">Password</label>
                  <input type="password" required value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} className={`w-full px-4 py-3 rounded-2xl text-xs font-bold outline-none backdrop-blur-sm shadow-inner ${isDark ? 'bg-black/40 border border-white/10 text-white' : 'bg-white/60 border border-white/40 text-slate-800'}`} />
                </div>
              )}

              {/* 🌟 จุดสำคัญ: เปลี่ยน Role ผู้ใช้ */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2 mb-1 block">System Role</label>
                <select value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value})} className={`w-full px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest outline-none backdrop-blur-sm shadow-inner cursor-pointer ${isDark ? 'bg-black/40 border border-white/10 text-white' : 'bg-white/60 border border-white/40 text-slate-800'}`}>
                  <option value="user" className="text-black">User (View Only)</option>
                  <option value="admin" className="text-black">Admin (Full Access)</option>
                </select>
              </div>

              <button type="submit" disabled={isSaving} className="w-full mt-6 py-4 bg-blue-600/90 hover:bg-blue-500 text-white font-black uppercase text-[11px] tracking-widest rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all border border-white/20 backdrop-blur-md">
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={16}/> Save User Data</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* NodeModal (External Component) */}
      <NodeModal 
        isOpen={modalState.add} 
        modalAnim={modalAnim} 
        editingId={editingId} 
        initialData={editingId ? (devices.find(d => d._id === editingId) || {}) : {}} 
        onClose={closeModal} 
        onSubmit={handleDeviceSubmit} 
        isSaving={isSaving} 
      />

      {/* PDF Chart Container (Hidden) */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '800px', height: '400px', zIndex: -1 }}>
        <div id="pdf-chart-container" className="bg-white p-10"><h2 className="text-center font-bold text-xl mb-4">Flood Monitoring Trend</h2>
            <div className="h-[300px]"><WaterLevelChart data={exportLogs} timeframe="month" isDark={false} devices={devices} selectedDeviceMac="ALL" /></div>
        </div>
      </div>
    </main>
  );
}