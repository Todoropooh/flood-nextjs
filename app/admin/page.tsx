'use client';

import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useTheme } from 'next-themes'; 
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Trash2, XCircle, Search, Cpu, Plus, Edit2, Users, ShieldCheck, 
  Loader2, FileText, Calendar, Sun, Moon, Settings, UserCog, Ruler, Zap, Bell, Database,
  Image as ImageIcon, Save, CheckCircle2 
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

  // --- Auth & Initial Load ---
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/');
    else if (status === 'authenticated' && (session?.user as any)?.role !== 'admin') router.push('/');
  }, [status, session, router]);

  useEffect(() => { 
    setIsMounted(true); 
    if (status === 'authenticated' && (session?.user as any)?.role === 'admin') {
      fetchData();
      fetchSettings();
      setTimeout(() => setShowUI(true), 100);
    }
  }, [status, session]);

  // --- API Functions ---
  const fetchData = async () => {
    try {
      const t = Date.now();
      const [devRes, userRes] = await Promise.all([
        fetch(`/api/devices?t=${t}`, { cache: 'no-store' }), 
        fetch(`/api/users?t=${t}`, { cache: 'no-store' })
      ]);
      if (devRes.ok) setDevices(await devRes.json());
      if (userRes.ok) setUsers(await userRes.json());
    } catch (e) { console.error(e); }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSystemSettings(data);
        setBotToken(data.botToken || "");
        setChatId(data.chatId || "");
        setQrImage(data.qrImage || "/telegram.jpg");
      }
    } catch (e) { console.error(e); }
  };

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
    const method = currentEditingId ? 'PUT' : 'POST';
    const res = await fetch('/api/devices', { 
      method, 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(currentEditingId ? { ...submittedData, _id: currentEditingId } : submittedData) 
    });
    if (res.ok) { await fetchData(); closeModal(); } 
    else { alert("Error saving device"); setIsSaving(false); }
  };

  const handleUserSubmit = async (e: any) => {
    e.preventDefault(); 
    setIsSaving(true);
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch('/api/users', { 
      method, 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(editingId ? { ...userFormData, _id: editingId } : userFormData) 
    });
    if (res.ok) { await fetchData(); closeModal(); } 
    else { alert("Error saving user"); setIsSaving(false); }
  };

  const handleDeleteUser = async (id: string) => {
    if(!confirm('ลบผู้ใช้นี้อย่างถาวร?')) return;
    const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
    if (res.ok) fetchData();
  };

  const handleApproveUser = async (id: string, approve: boolean) => {
    const msg = approve ? "ยืนยันการอนุมัติสมาชิก?" : "ยืนยันการปฏิเสธสมาชิก?";
    if(!confirm(msg)) return;
    setIsSaving(true);
    const res = await fetch(`/api/users/${id}/approve`, { method: approve ? 'PUT' : 'DELETE' });
    if(res.ok) { fetchData(); alert(approve ? "อนุมัติสำเร็จ ✅" : "ปฏิเสธสำเร็จ ❌"); }
    setIsSaving(false);
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

  // --- Export PDF ---
  const executeExportPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      if (activeTab === 'users') {
        autoTable(doc, {
          startY: 20,
          head: [['#', 'Name', 'Username', 'Role', 'Status']],
          body: users.map((u, i) => [i + 1, `${u.firstname} ${u.lastname}`, u.username, u.role.toUpperCase(), u.isApproved ? 'Approved' : 'Pending']),
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
        autoTable(doc, { startY: 120, head: [['Time', 'Node', 'Level (m)']], body: logs.map((l:any)=>[new Date(l.createdAt).toLocaleString(), l.mac, l.level]) });
        doc.save(`Flood_Report.pdf`);
      }
    } catch (e) { alert("Export Failed"); }
    closeModal();
    setIsExporting(false);
  };

  if (!isMounted || status === 'loading') return <div className="min-h-screen bg-slate-100 dark:bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={40} /></div>;

  const pendingUsers = users.filter(u => !u.isApproved);
  const activeUsers = users.filter(u => u.isApproved && u.username !== (session?.user as any)?.username);

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-[#020617] text-slate-800 dark:text-slate-100 transition-colors duration-500 pb-24">
      
      {/* 🔝 Navbar */}
      <header className={`sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-800 transition-all ${showUI ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg"><ArrowLeft size={16} /></Link>
            <h1 className="text-sm font-black uppercase flex items-center gap-2"><ShieldCheck size={18} className="text-blue-600" /> Admin Portal</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border dark:border-slate-800">
              {(['nodes', 'users', 'system'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === tab ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-400'}`}>{tab}</button>
              ))}
            </div>
            <button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800">{resolvedTheme === 'dark' ? <Sun size={16}/> : <Moon size={16}/>}</button>
            <button onClick={() => signOut({ callbackUrl: '/' })} className="px-4 py-2.5 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-xl text-[10px] font-black uppercase">Logout</button>
          </div>
        </div>
      </header>

      {/* 📊 Content */}
      <div className="max-w-6xl mx-auto p-4 md:px-6 mt-8">
        
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-3xl border dark:border-slate-800 shadow-sm">
           <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded-xl text-xs font-bold outline-none" />
           </div>
           <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={() => openModal('export')} className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-xl border dark:border-slate-800"><FileText size={18} /></button>
              {activeTab !== 'system' && (
                <button onClick={() => openModal(activeTab === 'nodes' ? 'add' : 'user')} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-blue-500/20"><Plus size={16}/> Add New</button>
              )}
           </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-[2.5rem] shadow-xl overflow-hidden">
          
          {/* Nodes Tab */}
          {activeTab === 'nodes' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase text-slate-400">
                  <tr><th className="px-8 py-5">Node Info</th><th className="px-8 py-5">Settings</th><th className="px-8 py-5 text-right">Action</th></tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-800/50">
                  {devices.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase())).map(device => (
                    <tr key={device._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-8 py-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-950 flex items-center justify-center relative border dark:border-slate-800">
                          {device.image ? <img src={device.image} className="w-full h-full object-cover rounded-2xl" /> : <Cpu size={20} />}
                        </div>
                        <div><div className="font-black">{device.name}</div><div className="text-[10px] font-mono text-slate-400">{device.mac}</div></div>
                      </td>
                      <td className="px-8 py-5 font-bold text-xs">H: {device.installHeight}m | <span className="text-red-500">Crit: {device.criticalThreshold}m</span></td>
                      <td className="px-8 py-5 text-right">
                        <button onClick={() => { setEditingId(device._id); openModal('add'); }} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl"><Edit2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="p-2 space-y-6">
              {/* Approval Section */}
              {pendingUsers.length > 0 && (
                <div className="p-6">
                  <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2">Pending Approval ({pendingUsers.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingUsers.map(u => (
                      <div key={u._id} className="p-5 bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/20 rounded-[2rem] flex items-center justify-between">
                        <div className="font-black text-sm">{u.firstname} {u.lastname} <span className="block text-[10px] font-normal text-slate-500">@{u.username}</span></div>
                        <div className="flex gap-2">
                          <button onClick={() => handleApproveUser(u._id, true)} className="p-2 bg-emerald-500 text-white rounded-full"><CheckCircle2 size={18}/></button>
                          <button onClick={() => handleApproveUser(u._id, false)} className="p-2 bg-red-500 text-white rounded-full"><XCircle size={18}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Active Users Table */}
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase text-slate-400">
                  <tr><th className="px-8 py-5">User</th><th className="px-8 py-5">Role</th><th className="px-8 py-5 text-right">Action</th></tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-800/50">
                  {activeUsers.map(user => (
                    <tr key={user._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-8 py-5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                          {user.image ? <img src={user.image} className="w-full h-full object-cover" /> : <Users size={18} className="m-auto mt-2 text-slate-400" />}
                        </div>
                        <div><div className="font-black">{user.firstname} {user.lastname}</div><div className="text-[10px] text-slate-400">@{user.username}</div></div>
                      </td>
                      <td className="px-8 py-5"><span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase bg-blue-100 text-blue-600 dark:bg-blue-500/10">{user.role}</span></td>
                      <td className="px-8 py-5 text-right space-x-2">
                        <button onClick={() => { setEditingId(user._id); setUserFormData({...user, password: ''}); openModal('user'); }} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl"><Edit2 size={14} /></button>
                        <button onClick={() => handleDeleteUser(user._id)} className="p-2.5 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-xl"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* System Tab */}
          {activeTab === 'system' && (
            <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-[2.5rem] border dark:border-slate-800 space-y-6">
                  <div className="flex items-center gap-3"><Bell size={20} className="text-blue-600"/><h3 className="font-black text-lg">Telegram Notifications</h3></div>
                  <div className="space-y-4">
                    <input type="text" placeholder="Bot API Token" value={botToken} onChange={e => setBotToken(e.target.value)} className="w-full px-5 py-3.5 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl text-xs font-bold outline-none" />
                    <input type="text" placeholder="Chat ID" value={chatId} onChange={e => setChatId(e.target.value)} className="w-full px-5 py-3.5 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl text-xs font-bold outline-none" />
                    <button onClick={handleTestTelegram} disabled={isSaving} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20">Test Connection</button>
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-[2.5rem] border dark:border-slate-800 flex flex-col items-center justify-center gap-6 text-center">
                   <div className="relative group cursor-pointer rounded-3xl overflow-hidden shadow-xl border-4 border-white dark:border-slate-800">
                      <img src={qrImage} alt="QR" className="w-48 h-48 object-cover" />
                      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-all cursor-pointer"><ImageIcon size={24} /><span className="text-[10px] font-black uppercase mt-2">Change Image</span><input type="file" accept="image/*" className="hidden" onChange={handleQRUpload} /></label>
                   </div>
                   <h4 className="font-black text-xs uppercase text-slate-800 dark:text-white">Subscriber QR Code</h4>
                </div>
              </div>
              <button onClick={handleSaveSystemSettings} disabled={isSaving} className="w-full bg-[#1155FA] text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/25 transition-all active:scale-95 flex items-center justify-center gap-3">{isSaving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20}/> Update System Config</>}</button>
            </div>
          )}
        </div>
      </div>

      {/* Export Modal */}
      {modalState.export && (
        <div className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all ${modalAnim ? 'opacity-100' : 'opacity-0'}`}>
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm p-8 text-center space-y-6">
              <FileText size={48} className="mx-auto text-blue-600"/>
              <h3 className="font-black text-lg">Generate Report</h3>
              <select value={exportDays} onChange={e => setExportDays(Number(e.target.value))} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 outline-none font-black text-sm text-center">
                <option value={1}>Last 24 Hours</option><option value={7}>Last 7 Days</option><option value={30}>Last 30 Days</option>
              </select>
              <button onClick={executeExportPDF} disabled={isExporting} className="w-full py-4 bg-emerald-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg flex items-center justify-center gap-2">{isExporting ? <Loader2 className="animate-spin" size={20} /> : 'Download PDF'}</button>
              <button onClick={closeModal} className="text-[10px] font-black text-slate-400 uppercase hover:text-red-500 transition-colors">Close Window</button>
          </div>
        </div>
      )}

      {/* NodeModal */}
      <NodeModal isOpen={modalState.add} modalAnim={modalAnim} editingId={editingId} initialData={editingId ? devices.find(d => d._id === editingId) : {}} onClose={closeModal} onSubmit={handleDeviceSubmit} isSaving={isSaving} />

      {/* Hidden PDF Chart */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '800px', height: '400px', zIndex: -1 }}>
        <div id="pdf-chart-container" className="bg-white p-10"><h2 className="text-center font-bold text-xl mb-4">Flood Monitoring Trend</h2>
            <div className="h-[300px]"><WaterLevelChart data={exportLogs} timeframe="month" isDark={false} devices={devices} selectedDeviceMac="ALL" /></div>
        </div>
      </div>
    </main>
  );
}