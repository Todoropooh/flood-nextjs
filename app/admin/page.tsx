'use client';

import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useTheme } from 'next-themes'; 
import { 
  ArrowLeft, Trash2, XCircle, Search, Cpu, 
  Plus, Edit2, Users, ShieldCheck, Image as ImageIcon, 
  Loader2, FileText, Calendar, Sun, Moon, Settings, UserCog
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as htmlToImage from 'html-to-image'; // 🌟 ใช้ html-to-image ถ่ายรูปกราฟ

// 🌟 Import Component
import NodeModal from '@/components/NodeModal'; 
import WaterLevelChart from '@/components/WaterLevelChart'; 

export default function AdminPage() {
  const { data: session } = useSession();
  const { setTheme, resolvedTheme } = useTheme(); 

  const [activeTab, setActiveTab] = useState<'nodes' | 'users'>('nodes');
  const [devices, setDevices] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false); 
  const [isExportModalOpen, setIsExportModalOpen] = useState(false); 
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [modalAnim, setModalAnim] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportDays, setExportDays] = useState<number>(30); 
  const [showUI, setShowUI] = useState(false);

  const [systemSettings, setSystemSettings] = useState({ systemOn: true, buzzerOn: true });
  const [exportLogs, setExportLogs] = useState<any[]>([]); 

  const defaultDevice = { 
    name: '', mac: '', location: '', type: 'ESP32', image: '', 
    warningThreshold: 3.0, criticalThreshold: 7.0, lat: 14.8824, lng: 103.4936,
    isActive: true, isBuzzerEnabled: true 
  };
  
  const defaultUser = { username: '', password: '', firstname: '', lastname: '', role: 'user', phone: '', image: '' };
  
  const [userFormData, setUserFormData] = useState(defaultUser);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { 
    setIsMounted(true); 
    fetchData();
    fetchSettings();
    setTimeout(() => setShowUI(true), 100);
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) setSystemSettings(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchData = async () => {
    try {
      const timestamp = Date.now();
      const [devRes, userRes] = await Promise.all([
        fetch(`/api/devices?t=${timestamp}`, { cache: 'no-store' }), 
        fetch(`/api/users?t=${timestamp}`, { cache: 'no-store' })
      ]);
      if (devRes.ok) setDevices(await devRes.json());
      if (userRes.ok) setUsers(await userRes.json());
    } catch (e) { console.error(e); }
  };

  const executeExportPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const now = new Date().toLocaleString('th-TH');

      if (activeTab === 'users') {
        doc.setFillColor(15, 23, 42); 
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text('FLOOD MONITORING SYSTEM', 14, 20);
        doc.text(`REPORT: USER MANAGEMENT`, 14, 28);
        autoTable(doc, {
          startY: 55,
          head: [['#', 'Full Name', 'Username', 'Role', 'Contact']],
          body: users.map((u, i) => [i + 1, `${u.firstname} ${u.lastname}`, u.username, u.role.toUpperCase(), u.phone || '-']),
          theme: 'grid'
        });
        doc.save(`User_Report_${new Date().getTime()}.pdf`);
      } else {
        const res = await fetch(`/api/flood?timeframe=month`);
        let logs = [];
        if (res.ok) logs = await res.json();
        const cutoffTime = Date.now() - (exportDays * 24 * 60 * 60 * 1000);
        const filteredLogs = logs.filter((l: any) => new Date(l.createdAt || l.timestamp).getTime() > cutoffTime);

        setExportLogs(filteredLogs);
        await new Promise(resolve => setTimeout(resolve, 1500));

        const chartElem = document.getElementById('pdf-chart-container');
        let chartImgData = null;
        let canvasWidth = 800;
        let canvasHeight = 400;

        if (chartElem) {
          try {
            canvasWidth = chartElem.offsetWidth || 800;
            canvasHeight = chartElem.offsetHeight || 400;
            chartImgData = await htmlToImage.toPng(chartElem, { 
              backgroundColor: '#ffffff',
              pixelRatio: 2 
            });
          } catch (err) {
            console.error("ถ่ายรูปกราฟไม่สำเร็จ: ", err);
          }
        }

        doc.setFillColor(41, 128, 185); 
        doc.rect(0, 0, 210, 35, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('FLOODPRO DETAILED ANALYTICS', 14, 18);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated: ${now} | Period: Last ${exportDays} Days`, 14, 26);
        doc.text(`Total Records: ${filteredLogs.length} logs`, 14, 31);

        let currentY = 45;
        if (chartImgData) {
          const imgWidth = 182; 
          const imgHeight = (canvasHeight * imgWidth) / canvasWidth; 
          doc.addImage(chartImgData, 'PNG', 14, currentY, imgWidth, imgHeight);
          currentY += imgHeight + 10; 
        }

        const tableData = filteredLogs.map((l: any) => {
          const dName = devices.find(d => d.mac === l.mac || d.device_id === l.device_id)?.name || l.mac || 'Unknown';
          const sensorDist = Number(l.level) || 84;
          let waterLevel = (84.0 - sensorDist) - 5.0;
          if (sensorDist <= 0.5 || sensorDist > 90) waterLevel = 0;
          if (waterLevel < 0) waterLevel = 0;
          if (waterLevel > 40) waterLevel = 40;

          const dateStr = new Date(l.createdAt || l.timestamp).toLocaleString('th-TH');
          return [
            dateStr,
            dName,
            waterLevel.toFixed(2),
            (Number(l.temperature) || 0).toFixed(1),
            (Number(l.humidity || l.air_humidity) || 0).toFixed(0),
            (Number(l.signal) || 0).toString()
          ];
        });

        autoTable(doc, {
          startY: currentY,
          head: [['Date/Time', 'Node Name', 'Water (cm)', 'Temp (C)', 'Humid (%)', 'SIM Signal']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 8, cellPadding: 3 },
          alternateRowStyles: { fillColor: [245, 247, 250] }
        });

        doc.save(`FloodReport_Detailed_${exportDays}Days_${new Date().getTime()}.pdf`);
      }
    } catch (error) {
      console.error("Export Error:", error);
      alert("เกิดข้อผิดพลาดในการสร้าง PDF");
    }
    closeModal();
    setIsExporting(false);
  };

  const handleImageProcess = (e: any, target: 'user') => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event: any) => {
      setUserFormData({ ...userFormData, image: event.target.result });
    };
  };

  const closeModal = () => {
    setModalAnim(false);
    setTimeout(() => { 
      setIsAddModalOpen(false); setIsUserModalOpen(false); setIsExportModalOpen(false); setIsSettingsModalOpen(false);
      setEditingId(null); setIsSaving(false); 
    }, 300); 
  };

  const handleDeviceSubmit = async (submittedData: any, currentEditingId: string | null) => {
    setIsSaving(true);
    const method = currentEditingId ? 'PUT' : 'POST';
    const bodyData = currentEditingId ? { ...submittedData, _id: currentEditingId } : submittedData;
    const res = await fetch('/api/devices', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyData) });
    if (res.ok) { await fetchData(); closeModal(); } else { alert("Error"); setIsSaving(false); }
  };

  const handleUserSubmit = async (e: any) => {
    e.preventDefault(); setIsSaving(true);
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch('/api/users', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editingId ? { ...userFormData, _id: editingId } : userFormData) });
    if (res.ok) { await fetchData(); closeModal(); } else { alert("Error"); setIsSaving(false); }
  };

  const handleDeleteUser = async (id: string) => {
    if(!confirm('คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้?')) return;
    const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
    if (res.ok) fetchData();
  };

  const handleToggleSettings = async (type: 'system' | 'buzzer') => {
    const newValue = type === 'system' ? !systemSettings.systemOn : !systemSettings.buzzerOn;
    setSystemSettings(prev => ({ ...prev, [type === 'system' ? 'systemOn' : 'buzzerOn']: newValue }));
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(type === 'system' ? { systemOn: newValue } : { buzzerOn: newValue })
    });
  };

  if (!isMounted) return null;

  const displayUsers = users.filter(u => u.username !== (session?.user as any)?.username);
  const myProfileData = users.find(u => u.username === (session?.user as any)?.username);

  return (
    <main className="min-h-screen relative font-sans text-slate-800 dark:text-white pb-20 bg-slate-50 dark:bg-[#090e17] transition-colors duration-700">
      <div className="fixed inset-0 -z-10">
        <img src="https://img.freepik.com/premium-photo/gradient-defocused-abstract-luxury-vivid-blurred-colorful-texture-wallpaper-photo-background_98870-1088.jpg" className="w-full h-full object-cover" alt="bg" />
        <div className="absolute inset-0 bg-white/20 dark:bg-black/40 backdrop-blur-xl" />
      </div>

      <div className={`sticky top-0 z-40 w-full bg-white/40 dark:bg-[#0a0f1c]/50 backdrop-blur-2xl border-b border-white/50 dark:border-white/10 shadow-sm transition-all duration-1000 ${showUI ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 bg-white/50 dark:bg-white/5 rounded-lg border border-white/50 shadow-sm"><ArrowLeft size={16} /></Link>
              <h1 className="text-sm font-bold tracking-wide flex items-center gap-2"><ShieldCheck size={16} className="text-blue-600 dark:text-blue-400" /> Admin Portal</h1>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-xl bg-white/40 dark:bg-black/40 border border-white/50 transition-all">
                {resolvedTheme === 'dark' ? <Sun size={14}/> : <Moon size={14}/>}
              </button>
              <button onClick={() => signOut()} className="px-4 py-2 bg-red-500/10 text-red-600 rounded-lg text-[10px] font-bold uppercase border border-red-500/20 shadow-sm">Logout</button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between pb-1">
            {myProfileData && (
              <div className="flex items-center justify-between w-full lg:w-auto gap-4 bg-white/40 dark:bg-black/20 border border-white/50 p-2 pr-3 rounded-2xl shadow-sm backdrop-blur-md text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 border border-white/80 overflow-hidden flex items-center justify-center text-white font-black text-lg shadow-md shrink-0">
                    {myProfileData.image ? <img src={myProfileData.image} className="w-full h-full object-cover" alt="Me" /> : myProfileData.firstname.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xs font-bold">สวัสดี, {myProfileData.firstname}</h2>
                    <p className="text-[9px] text-slate-500 uppercase mt-0.5">Administrator</p>
                  </div>
                </div>
                <button onClick={() => { setEditingId(myProfileData._id); setUserFormData({...myProfileData, password: ''}); setIsUserModalOpen(true); setTimeout(() => setModalAnim(true), 10); }} className="p-2 bg-white/50 dark:bg-white/10 rounded-lg text-slate-600 shadow-sm"><Edit2 size={14} /></button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 items-center w-full lg:w-auto">
              <div className="flex gap-1 p-1 bg-black/5 dark:bg-black/40 border border-white/20 rounded-xl shadow-inner w-full sm:w-auto justify-center">
                <button onClick={() => setActiveTab('nodes')} className={`px-6 py-1.5 rounded-lg text-[11px] font-bold transition-all ${activeTab === 'nodes' ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600'}`}>Nodes</button>
                <button onClick={() => setActiveTab('users')} className={`px-6 py-1.5 rounded-lg text-[11px] font-bold transition-all ${activeTab === 'users' ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600'}`}>Users</button>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-grow min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white/50 dark:bg-black/30 border border-white/50 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/50" />
                </div>
                <button onClick={() => { setIsExportModalOpen(true); setTimeout(()=>setModalAnim(true),10); }} className="p-2 bg-white/50 dark:bg-white/10 text-emerald-600 border border-white/50 rounded-xl shadow-sm"><FileText size={16} /></button>
                <button onClick={() => { setIsSettingsModalOpen(true); setTimeout(()=>setModalAnim(true),10); }} className="p-2 bg-white/50 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-white/50 rounded-xl shadow-sm hover:text-blue-500"><Settings size={16} /></button>
                <button onClick={() => { if(activeTab==='nodes') {setEditingId(null); setIsAddModalOpen(true);} else {setEditingId(null); setUserFormData(defaultUser); setIsUserModalOpen(true);} setTimeout(()=>setModalAnim(true),10); }} className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all shadow-md min-w-[36px] flex items-center justify-center"><Plus size={18}/></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:px-8 mt-6 relative z-10">
        <div className={`bg-white/40 dark:bg-[#111827]/60 border border-white/50 dark:border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl shadow-lg overflow-x-auto`}>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/30 dark:bg-black/20 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-white/30">
                <th className="px-8 py-4">Identity / Remote Status</th>
                <th className="px-8 py-4">Data</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/30 dark:divide-white/5">
              {activeTab === 'nodes' ? devices.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase())).map((device) => (
                <tr key={device._id} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4 text-left">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/60 dark:bg-black/40 border border-white/50 flex items-center justify-center relative">
                        {device.image ? <img src={device.image} className="w-full h-full object-cover" alt="Node" /> : <Cpu size={18} />}
                        <div className={`absolute top-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${device.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                      </div>
                      <div>
                        <div className="font-bold text-sm">{device.name}</div>
                        <div className="text-[9px] font-mono text-slate-500">{device.mac} {!device.isBuzzerEnabled && <span className="text-red-500 font-bold">[Muted]</span>}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3 font-mono text-xs font-bold">
                      <span className="text-blue-600">{device.waterLevel?.toFixed(1) || '0.0'} cm</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right space-x-2">
                    <button onClick={() => { setEditingId(device._id); setIsAddModalOpen(true); setTimeout(() => setModalAnim(true), 10); }} className="p-2 bg-white/40 dark:bg-white/5 rounded-lg text-slate-500 hover:text-blue-600 transition-all border border-white/50"><Edit2 size={14} /></button>
                    <button onClick={() => { if(confirm('Delete Node?')) fetch(`/api/devices?id=${device._id}`, {method:'DELETE'}).then(()=>fetchData()) }} className="p-2 bg-red-500/10 rounded-lg text-red-500 border border-red-500/10 shadow-sm"><Trash2 size={14} /></button>
                  </td>
                </tr>
              )) : displayUsers.map((user) => (
                <tr key={user._id} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4 text-left">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-white/60 dark:bg-black/40 border border-white/50 flex items-center justify-center text-indigo-500 shrink-0">
                        {user.image ? <img src={user.image} className="w-full h-full object-cover" alt="User" /> : <Users size={18} />}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{user.firstname} {user.lastname}</div>
                        <div className="text-[10px] font-mono text-slate-500">@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${user.role==='admin'?'bg-purple-100/50 text-purple-600 border-purple-200/50':'bg-indigo-100/50 text-indigo-600 border-indigo-200/50'}`}>{user.role}</span>
                  </td>
                  <td className="px-8 py-5 text-right space-x-2">
                    <button onClick={() => { setEditingId(user._id); setUserFormData({...user, password: ''}); setIsUserModalOpen(true); setTimeout(() => setModalAnim(true), 10); }} className="p-2 bg-white/40 dark:bg-white/5 rounded-lg text-slate-500 hover:text-blue-600 transition-all border border-white/50"><Edit2 size={14} /></button>
                    <button onClick={() => handleDeleteUser(user._id)} className="p-2 bg-red-500/10 rounded-lg text-red-500 border border-red-500/20"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <NodeModal 
        key={editingId || 'new'} 
        isOpen={isAddModalOpen}
        modalAnim={modalAnim}
        editingId={editingId}
        initialData={editingId ? devices.find(d => d._id === editingId) : defaultDevice}
        onClose={closeModal}
        onSubmit={handleDeviceSubmit}
        isSaving={isSaving}
      />

      {isUserModalOpen && (
        <div className={`fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 ${modalAnim ? 'opacity-100' : 'opacity-0'}`}>
          <div className={`bg-white/80 dark:bg-[#1e2330]/80 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-md border border-white/50 transform transition-all duration-300 ${modalAnim ? 'scale-100' : 'scale-95'} overflow-hidden`}>
            <div className="px-6 py-4 border-b border-black/5 flex justify-between items-center bg-white/30 dark:bg-black/10">
              <h3 className="font-bold text-xs">{editingId ? 'Edit User Profile' : 'Register New User'}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-red-500"><XCircle size={18}/></button>
            </div>
            <form onSubmit={handleUserSubmit} className="p-8 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-white/80 dark:bg-black/50 border flex items-center justify-center relative group">
                  {userFormData.image ? <img src={userFormData.image} className="w-full h-full object-cover" /> : <Users size={32} className="text-slate-400" />}
                </div>
                <input type="file" accept="image/*" onChange={(e) => handleImageProcess(e, 'user')} className="text-[10px]" />
              </div>
              <input required type="text" placeholder="First Name" value={userFormData.firstname} onChange={e => setUserFormData({...userFormData, firstname: e.target.value})} className="w-full p-3 bg-white/50 dark:bg-black/30 border rounded-xl outline-none text-sm" />
              <input required type="text" placeholder="Last Name" value={userFormData.lastname} onChange={e => setUserFormData({...userFormData, lastname: e.target.value})} className="w-full p-3 bg-white/50 dark:bg-black/30 border rounded-xl outline-none text-sm" />
              <input required type="text" placeholder="Username" value={userFormData.username} onChange={e => setUserFormData({...userFormData, username: e.target.value})} className="w-full p-3 bg-white/50 dark:bg-black/30 border rounded-xl outline-none text-sm" />
              <input type="password" placeholder={editingId ? "New Password (Leave blank)" : "Password"} value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} className="w-full p-3 bg-white/50 dark:bg-black/30 border rounded-xl outline-none text-sm" />
              
              {/* 🎯 [เพิ่มใหม่] ส่วนกำหนด ROLE (Roll) */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">System Role</label>
                <div className="relative">
                  <select 
                    value={userFormData.role} 
                    onChange={e => setUserFormData({...userFormData, role: e.target.value})}
                    className="w-full p-3 bg-white/50 dark:bg-black/30 border rounded-xl outline-none text-sm appearance-none font-bold"
                  >
                    <option value="user">User (Standard)</option>
                    <option value="admin">Admin (Full Control)</option>
                    <option value="viewer">Viewer (Read Only)</option>
                  </select>
                  <UserCog size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <button disabled={isSaving} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-500 flex justify-center">
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : 'Save User'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isExportModalOpen && (
        <div className={`fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 ${modalAnim ? 'opacity-100' : 'opacity-0'}`}>
          <div className="bg-white/80 dark:bg-[#1e2330]/80 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-sm border p-8 space-y-6 text-center transform transition-all">
             <Calendar size={48} className="mx-auto text-blue-500 mb-2" />
             <h3 className="font-bold text-lg">Export Flood Report</h3>
             <select value={exportDays} onChange={e => setExportDays(Number(e.target.value))} className="w-full p-3 rounded-xl bg-white/50 border border-white/50 outline-none font-bold text-center">
                <option value={1}>Last 24 Hours</option>
                <option value={7}>Last 7 Days</option>
                <option value={30}>Last 30 Days</option>
             </select>
             <button onClick={executeExportPDF} disabled={isExporting} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-500 active:scale-95 transition-all">
                {isExporting ? <Loader2 className="animate-spin mx-auto" /> : 'Download PDF Report'}
             </button>
             <button onClick={closeModal} className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {isSettingsModalOpen && (
        <div className={`fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 ${modalAnim ? 'opacity-100' : 'opacity-0'}`}>
          <div className={`bg-white dark:bg-[#1e2330] rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 transform transition-all duration-300 ${modalAnim ? 'scale-100' : 'scale-95'} overflow-hidden p-6`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg">Device Management</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-red-500"><XCircle size={20}/></button>
            </div>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-sm">ระบบการทำงาน</h4>
                  <p className="text-xs text-slate-500 mt-1">เปิด-ปิด การรับส่งข้อมูลของอุปกรณ์</p>
                </div>
                <button onClick={() => handleToggleSettings('system')} className={`w-12 h-6 rounded-full transition-colors relative ${systemSettings.systemOn ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${systemSettings.systemOn ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-sm">เสียงแจ้งเตือน (Buzzer)</h4>
                  <p className="text-xs text-slate-500 mt-1">เปิด-ปิด เสียงร้องเตือนที่ตัวอุปกรณ์</p>
                </div>
                <button onClick={() => handleToggleSettings('buzzer')} className={`w-12 h-6 rounded-full transition-colors relative ${systemSettings.buzzerOn ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${systemSettings.buzzerOn ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
            <button onClick={closeModal} className="w-full mt-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">ปิดหน้าต่าง</button>
          </div>
        </div>
      )}

      {/* 🌟 ฐานลับนินจา: ซ่อนกราฟไว้หลังฉาก */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '800px', height: '400px', zIndex: -50 }}>
        <div id="pdf-chart-container" style={{ width: '100%', height: '100%', backgroundColor: 'white', padding: '20px', borderRadius: '10px' }}>
           <h2 style={{ textAlign: 'center', color: '#1e293b', marginBottom: '15px', fontFamily: 'sans-serif', fontSize: '18px', fontWeight: 'bold' }}>
             Water Level Trend (Last {exportDays} Days)
           </h2>
           <div style={{ width: '100%', height: '320px' }}>
             <WaterLevelChart data={exportLogs} timeframe={exportDays === 1 ? 'day' : exportDays === 7 ? 'week' : 'month'} isDark={false} devices={devices} selectedDeviceMac="ALL" />
           </div>
        </div>
      </div>
    </main>
  );
}