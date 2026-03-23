'use client';

import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useTheme } from 'next-themes'; 
import { 
  ArrowLeft, Trash2, XCircle, Search, Cpu, 
  Plus, Edit2, Users, ShieldCheck, Image as ImageIcon, 
  Loader2, FileText, Calendar, Sun, Moon, Settings, UserCog, Ruler
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as htmlToImage from 'html-to-image'; 

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

  // 🌟 เพิ่ม installHeight: 62.0 เป็นค่าเริ่มต้น
  const defaultDevice = { 
    name: '', mac: '', location: '', type: 'ESP32', image: '', 
    warningThreshold: 5.0, criticalThreshold: 10.0, installHeight: 62.0, 
    lat: 14.8824, lng: 103.4936, isActive: true, isBuzzerEnabled: true 
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
    <main className="min-h-screen relative font-sans text-slate-800 dark:text-slate-100 pb-20 bg-slate-100 dark:bg-[#020617] transition-colors duration-500">
      
      <div className={`sticky top-0 z-40 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-700 ${showUI ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 space-y-4">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <ArrowLeft size={16} className="text-slate-600 dark:text-slate-300" />
              </Link>
              <h1 className="text-sm font-black tracking-wide flex items-center gap-2 text-slate-800 dark:text-white uppercase">
                <ShieldCheck size={18} className="text-blue-600" /> Admin Portal
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600 transition-colors">
                {resolvedTheme === 'dark' ? <Sun size={16}/> : <Moon size={16}/>}
              </button>
              <button onClick={() => signOut()} className="px-4 py-2.5 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-xl text-[11px] font-black uppercase transition-colors hover:bg-red-100 dark:hover:bg-red-500/20">
                Logout
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between pt-2">
            {myProfileData && (
              <div className="flex items-center justify-between w-full lg:w-auto gap-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 pr-3 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 overflow-hidden flex items-center justify-center text-white font-black text-lg shadow-sm shrink-0">
                    {myProfileData.image ? <img src={myProfileData.image} className="w-full h-full object-cover" alt="Me" /> : myProfileData.firstname.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-slate-700 dark:text-slate-200">สวัสดี, {myProfileData.firstname}</h2>
                    <p className="text-[9px] text-slate-400 uppercase mt-0.5 font-bold">Administrator</p>
                  </div>
                </div>
                <button onClick={() => { setEditingId(myProfileData._id); setUserFormData({...myProfileData, password: ''}); setIsUserModalOpen(true); setTimeout(() => setModalAnim(true), 10); }} className="p-2 bg-white dark:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-600 shadow-sm transition-colors"><Edit2 size={14} /></button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 items-center w-full lg:w-auto">
              <div className="flex gap-1 p-1.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl w-full sm:w-auto justify-center">
                <button onClick={() => setActiveTab('nodes')} className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'nodes' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Nodes</button>
                <button onClick={() => setActiveTab('users')} className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Users</button>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-grow min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-colors" />
                </div>
                <button onClick={() => { setIsExportModalOpen(true); setTimeout(()=>setModalAnim(true),10); }} className="p-2.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-xl shadow-sm hover:bg-emerald-100 transition-colors"><FileText size={18} /></button>
                <button onClick={() => { setIsSettingsModalOpen(true); setTimeout(()=>setModalAnim(true),10); }} className="p-2.5 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:text-blue-600 transition-colors"><Settings size={18} /></button>
                <button onClick={() => { if(activeTab==='nodes') {setEditingId(null); setIsAddModalOpen(true);} else {setEditingId(null); setUserFormData(defaultUser); setIsUserModalOpen(true);} setTimeout(()=>setModalAnim(true),10); }} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors shadow-md flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest"><Plus size={16}/> Add New</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:px-6 mt-8 relative z-10">
        
        <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-xl overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-8 py-5">Identity / Status</th>
                  <th className="px-8 py-5">System Details</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {activeTab === 'nodes' ? devices.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase())).map((device) => (
                  <tr key={device._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center relative">
                          {device.image ? <img src={device.image} className="w-full h-full object-cover" alt="Node" /> : <Cpu size={20} className="text-slate-400" />}
                          <div className={`absolute top-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${device.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        </div>
                        <div>
                          <div className="font-black text-sm text-slate-800 dark:text-white">{device.name}</div>
                          <div className="text-[10px] font-mono text-slate-400 font-bold mt-0.5">{device.mac} {!device.isBuzzerEnabled && <span className="text-red-500 ml-1">[Muted]</span>}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1">
                        <div className="text-[11px] font-black text-slate-500 flex items-center gap-2">
                           <span className="text-blue-500 flex items-center gap-1"><Ruler size={12}/> โผล่พ้นพื้น: {device.installHeight ?? 62.0}cm</span>
                        </div>
                        <div className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-2 mt-1">
                           <span className="text-orange-500">Warn: {device.warningThreshold ?? 5}cm</span> | 
                           <span className="text-red-500">Crit: {device.criticalThreshold ?? 10}cm</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right space-x-2">
                      <button onClick={() => { setEditingId(device._id); setIsAddModalOpen(true); setTimeout(() => setModalAnim(true), 10); }} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                      <button onClick={() => { if(confirm('Delete Node?')) fetch(`/api/devices?id=${device._id}`, {method:'DELETE'}).then(()=>fetchData()) }} className="p-2.5 bg-red-50 dark:bg-red-500/10 rounded-xl text-red-500 hover:bg-red-100 transition-colors"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                )) : displayUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-indigo-500 shrink-0">
                          {user.image ? <img src={user.image} className="w-full h-full object-cover" alt="User" /> : <Users size={20} />}
                        </div>
                        <div>
                          <div className="font-black text-sm text-slate-800 dark:text-white">{user.firstname} {user.lastname}</div>
                          <div className="text-[10px] font-mono text-slate-400 font-bold mt-0.5">@{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${user.role==='admin'?'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400':'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400'}`}>{user.role}</span>
                    </td>
                    <td className="px-8 py-5 text-right space-x-2">
                      <button onClick={() => { setEditingId(user._id); setUserFormData({...user, password: ''}); setIsUserModalOpen(true); setTimeout(() => setModalAnim(true), 10); }} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                      <button onClick={() => handleDeleteUser(user._id)} className="p-2.5 bg-red-50 dark:bg-red-500/10 rounded-xl text-red-500 hover:bg-red-100 transition-colors"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
          <div className={`bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 transform transition-all duration-300 ${modalAnim ? 'scale-100' : 'scale-95'} overflow-hidden`}>
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/50">
              <h3 className="font-black text-xs uppercase tracking-widest text-slate-500">{editingId ? 'Edit User Profile' : 'Register New User'}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-red-500 transition-colors"><XCircle size={20}/></button>
            </div>
            <form onSubmit={handleUserSubmit} className="p-8 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="flex flex-col items-center gap-3">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 flex items-center justify-center relative group">
                  {userFormData.image ? <img src={userFormData.image} className="w-full h-full object-cover" /> : <Users size={32} className="text-slate-400" />}
                </div>
                <input type="file" accept="image/*" onChange={(e) => handleImageProcess(e, 'user')} className="text-[10px] font-bold text-slate-500" />
              </div>
              <input required type="text" placeholder="First Name" value={userFormData.firstname} onChange={e => setUserFormData({...userFormData, firstname: e.target.value})} className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm font-bold focus:border-blue-500 transition-colors" />
              <input required type="text" placeholder="Last Name" value={userFormData.lastname} onChange={e => setUserFormData({...userFormData, lastname: e.target.value})} className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm font-bold focus:border-blue-500 transition-colors" />
              <input required type="text" placeholder="Username" value={userFormData.username} onChange={e => setUserFormData({...userFormData, username: e.target.value})} className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm font-bold focus:border-blue-500 transition-colors" />
              <input type="password" placeholder={editingId ? "New Password (Leave blank)" : "Password"} value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm font-bold focus:border-blue-500 transition-colors" />
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">System Role</label>
                <div className="relative">
                  <select 
                    value={userFormData.role} 
                    onChange={e => setUserFormData({...userFormData, role: e.target.value})}
                    className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm appearance-none font-bold focus:border-blue-500 transition-colors"
                  >
                    <option value="user">User (Standard)</option>
                    <option value="admin">Admin (Full Control)</option>
                    <option value="viewer">Viewer (Read Only)</option>
                  </select>
                  <UserCog size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <button disabled={isSaving} className="w-full py-4 mt-4 bg-blue-600 text-white font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-blue-500 flex justify-center transition-colors">
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : 'Save User'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isExportModalOpen && (
        <div className={`fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 ${modalAnim ? 'opacity-100' : 'opacity-0'}`}>
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800 p-8 space-y-6 text-center transform transition-all">
             <Calendar size={48} className="mx-auto text-blue-500 mb-2" />
             <h3 className="font-black text-lg text-slate-800 dark:text-white">Export Flood Report</h3>
             <select value={exportDays} onChange={e => setExportDays(Number(e.target.value))} className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none font-bold text-center text-slate-700 dark:text-slate-200">
                <option value={1}>Last 24 Hours</option>
                <option value={7}>Last 7 Days</option>
                <option value={30}>Last 30 Days</option>
             </select>
             <button onClick={executeExportPDF} disabled={isExporting} className="w-full py-3.5 bg-emerald-500 text-white font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-emerald-400 active:scale-95 transition-all">
                {isExporting ? <Loader2 className="animate-spin mx-auto" /> : 'Download PDF Report'}
             </button>
             <button onClick={closeModal} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {isSettingsModalOpen && (
        <div className={`fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 ${modalAnim ? 'opacity-100' : 'opacity-0'}`}>
          <div className={`bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800 transform transition-all duration-300 ${modalAnim ? 'scale-100' : 'scale-95'} overflow-hidden p-8`}>
            
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-black text-lg flex items-center gap-2 text-slate-800 dark:text-white"><Settings size={20} className="text-blue-500" /> System Settings</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-red-500 transition-colors"><XCircle size={20}/></button>
            </div>
            
            <div className="space-y-6">
              <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white">ระบบการทำงานหลัก</h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">เปิด-ปิด รับส่งข้อมูล</p>
                </div>
                <button onClick={() => handleToggleSettings('system')} className={`w-14 h-7 rounded-full transition-colors relative shadow-inner ${systemSettings.systemOn ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-1 shadow-md transition-transform ${systemSettings.systemOn ? 'translate-x-8' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white">ระบบเสียงเตือน</h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Buzzer Control</p>
                </div>
                <button onClick={() => handleToggleSettings('buzzer')} className={`w-14 h-7 rounded-full transition-colors relative shadow-inner ${systemSettings.buzzerOn ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-1 shadow-md transition-transform ${systemSettings.buzzerOn ? 'translate-x-8' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
            
            <button onClick={closeModal} className="w-full mt-8 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black uppercase tracking-widest text-[11px] rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Close Menu</button>
          </div>
        </div>
      )}

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