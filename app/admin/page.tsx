'use client';

import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useTheme } from 'next-themes'; 
import { 
  ArrowLeft, Trash2, XCircle, Search, Cpu, 
  Plus, Edit2, Users, ShieldCheck, Image as ImageIcon, 
  Loader2, FileText, Calendar, Sun, Moon 
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminPage() {
  const { data: session } = useSession();
  const { setTheme, resolvedTheme } = useTheme(); 

  const [activeTab, setActiveTab] = useState<'nodes' | 'users'>('nodes');
  const [devices, setDevices] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false); 
  const [isExportModalOpen, setIsExportModalOpen] = useState(false); 
  const [modalAnim, setModalAnim] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportDays, setExportDays] = useState<number>(30); 
  const [showUI, setShowUI] = useState(false);

  const defaultDevice = { name: '', mac: '', location: '', type: 'ESP32', image: '', warningThreshold: 3.0, criticalThreshold: 7.0 };
  const defaultUser = { username: '', password: '', firstname: '', lastname: '', role: 'user', phone: '', image: '' };
  
  const [formData, setFormData] = useState(defaultDevice);
  const [userFormData, setUserFormData] = useState(defaultUser);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { 
    setIsMounted(true); 
    fetchData();
    setTimeout(() => setShowUI(true), 100);
  }, []);

  const fetchData = async () => {
    try {
      const [devRes, userRes] = await Promise.all([fetch('/api/devices'), fetch('/api/users')]);
      if (devRes.ok) setDevices(await devRes.json());
      if (userRes.ok) setUsers(await userRes.json());
    } catch (e) { console.error(e); }
  };

  const executeExportPDF = async () => {
    setIsExporting(true);
    const doc = new jsPDF('p', 'mm', 'a4');
    const now = new Date().toLocaleString('th-TH');

    if (activeTab === 'users') {
      doc.setFillColor(15, 23, 42); 
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('FLOOD MONITORING SYSTEM', 14, 20);
      doc.setFontSize(10);
      doc.text(`REPORT: USER MANAGEMENT`, 14, 28);
      doc.text(`ISSUED BY: ${session?.user?.name || 'ADMIN'} | DATE: ${now}`, 14, 34);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text('System Users Roster', 14, 50);

      autoTable(doc, {
        startY: 55,
        head: [['#', 'Full Name', 'Username', 'Role', 'Contact']],
        body: users.map((u, i) => [i + 1, `${u.firstname} ${u.lastname}`, u.username, u.role.toUpperCase(), u.phone || '-']),
        theme: 'grid',
        headStyles: { fillColor: [5, 150, 105] }
      });
      doc.save(`User_Report_${new Date().getTime()}.pdf`);

    } else {
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text('FLOODPRO ANALYTICS REPORT', 14, 20);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Generated Date: ${now}`, 14, 28);
      doc.text(`Target Device: All Connected Nodes`, 14, 34);
      const periodText = exportDays === 30 ? 'Last MONTH' : `Last ${exportDays} DAYS`;
      doc.text(`Data Period: ${periodText}`, 14, 40);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text('Water Level Visualization (Trend)', 14, 52);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text('Max Scale. 100.0 cm.', 14, 58);

      const startX = 14;
      const startY = 62;
      const width = 182;
      const height = 40;
      
      doc.setDrawColor(0);
      doc.setLineWidth(0.2);
      doc.rect(startX, startY, width, height);

      doc.setDrawColor(220, 220, 220);
      doc.line(startX, startY + 10, startX + width, startY + 10);
      doc.line(startX, startY + 20, startX + width, startY + 20);
      doc.line(startX, startY + 30, startX + width, startY + 30);

      doc.setDrawColor(37, 99, 235); 
      doc.setLineWidth(0.6);
      
      let prevX = startX;
      let prevY = startY + height; 
      const steps = 30;
      const stepX = width / steps;

      for (let i = 1; i <= steps; i++) {
        const nextX = startX + (i * stepX);
        const isSpike = Math.random() > 0.85; 
        const level = isSpike ? (Math.random() * 80 + 20) : (Math.random() * 5);
        const nextY = (startY + height) - ((level / 100) * height);
        
        doc.line(prevX, prevY, nextX, nextY);
        prevX = nextX;
        prevY = nextY;
      }

      const tableY = startY + height + 10;
      const historicalData = [];
      for(let i = 0; i < 40; i++) {
          const d = new Date();
          d.setMinutes(d.getMinutes() - (i * 15)); 
          const timeStr = d.toLocaleString('th-TH');
          const nodeName = devices.length > 0 ? devices[i % devices.length].name : 'N/A';
          const wl = Math.random() > 0.8 ? (Math.random() * 100).toFixed(2) : '0.00';
          const temp = (23 + Math.random() * 5).toFixed(1);
          const hum = Math.floor(50 + Math.random() * 10).toString();

          historicalData.push([timeStr, nodeName, wl, temp, hum]);
      }

      autoTable(doc, {
        startY: tableY,
        head: [['Date/Time', 'Node', 'Level (cm)', 'Temp (C)', 'Humid (%)']],
        body: historicalData,
        theme: 'grid', 
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 2, textColor: [0,0,0] },
        columnStyles: { 
            0: { cellWidth: 50 },
            1: { cellWidth: 40 },
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right' }
        }
      });

      doc.save(`FloodReport_ALL_${new Date().getTime()}.pdf`);
    }

    closeModal();
    setIsExporting(false);
  };

  const handleImageProcess = (e: any, target: 'device' | 'user') => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event: any) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600; 
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7); 
        if (target === 'device') setFormData({ ...formData, image: dataUrl });
        else setUserFormData({ ...userFormData, image: dataUrl });
      };
    };
  };

  const closeModal = () => {
    setModalAnim(false);
    setTimeout(() => { 
      setIsAddModalOpen(false); 
      setIsUserModalOpen(false); 
      setIsExportModalOpen(false);
      setEditingId(null); 
      setIsSaving(false); 
    }, 300); 
  };

  const handleDeviceSubmit = async (e: any) => {
    e.preventDefault(); setIsSaving(true);
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch('/api/devices', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editingId ? { ...formData, _id: editingId } : formData) });
    if (res.ok) { fetchData(); closeModal(); } else { alert("Error"); setIsSaving(false); }
  };

  const handleUserSubmit = async (e: any) => {
    e.preventDefault(); setIsSaving(true);
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch('/api/users', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editingId ? { ...userFormData, _id: editingId } : userFormData) });
    if (res.ok) { fetchData(); closeModal(); } else { alert("Error"); setIsSaving(false); }
  };

  const handleDeleteUser = async (id: string) => {
    if(!confirm('คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้?')) return;
    const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
    if (res.ok) fetchData();
  };

  if (!isMounted) return null;

  const displayUsers = users.filter(u => u.username !== (session?.user as any)?.username);
  const myProfileData = users.find(u => u.username === (session?.user as any)?.username);

  return (
    <main className="min-h-screen relative font-sans text-slate-800 dark:text-white pb-20 bg-slate-50 dark:bg-[#090e17] transition-colors duration-700">
      
      {/* 🌌 Background (ปรับให้เห็นภาพชัดเจนขึ้น ลบความทึบของ Overlay ลง) */}
      <div className="fixed inset-0 -z-10 transition-colors duration-700">
        <img 
          src="https://img.freepik.com/premium-photo/gradient-defocused-abstract-luxury-vivid-blurred-colorful-texture-wallpaper-photo-background_98870-1088.jpg" 
          className="w-full h-full object-cover transition-all duration-[3000ms] ease-out opacity-100" 
          alt="bg" 
        />
        {/* ✨ ลดความทึบเหลือ 20% สำหรับ Light และ 40% สำหรับ Dark เพื่อให้สีฟ้าม่วงพุ่งทะลุออกมา */}
        <div className="absolute inset-0 bg-white/20 dark:bg-black/40 backdrop-blur-xl transition-colors duration-700" />
      </div>

      {/* 📌 STICKY HEADER (Navbar + Controls แบบ macOS) */}
      <div className={`sticky top-0 z-40 w-full bg-white/40 dark:bg-[#0a0f1c]/50 backdrop-blur-2xl border-b border-white/50 dark:border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1) ${showUI ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
          
          {/* Top Bar (Traffic Lights & Settings) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* 🚦 macOS Traffic Lights */}
              <div className="hidden md:flex gap-2 mr-2">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-black/10 dark:border-white/10 shadow-sm"></div>
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-black/10 dark:border-white/10 shadow-sm"></div>
                <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-black/10 dark:border-white/10 shadow-sm"></div>
              </div>
              <Link href="/" className="p-2 bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 rounded-lg border border-white/50 dark:border-white/5 transition-colors group shadow-sm"><ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /></Link>
              <h1 className="text-sm font-bold tracking-wide flex items-center gap-2"><ShieldCheck size={16} className="text-blue-600 dark:text-blue-400" /> Admin Portal</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center bg-white/40 dark:bg-black/30 p-1 rounded-lg backdrop-blur-md border border-white/50 dark:border-white/5 shadow-inner">
                <button onClick={() => setTheme('light')} className={`p-1.5 rounded-md transition-all duration-300 ${resolvedTheme === 'light' ? 'bg-white text-blue-500 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'}`}><Sun size={14}/></button>
                <button onClick={() => setTheme('dark')} className={`p-1.5 rounded-md transition-all duration-300 ${resolvedTheme === 'dark' ? 'bg-black/40 text-blue-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-200'}`}><Moon size={14}/></button>
              </div>
              <button onClick={() => signOut()} className="px-4 py-2 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-bold uppercase border border-red-500/20 hover:bg-red-500/20 dark:hover:bg-red-500/30 transition-all shadow-sm">Logout</button>
            </div>
          </div>

          {/* Bottom Bar (Profile & Controls) */}
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between pb-1">
            
            {/* User Profile Card */}
            {myProfileData && (
              <div className="flex items-center justify-between w-full lg:w-auto gap-4 bg-white/40 dark:bg-black/20 border border-white/50 dark:border-white/10 p-2 pr-3 rounded-2xl shadow-sm backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 border border-white/80 dark:border-white/20 overflow-hidden flex items-center justify-center text-white font-black text-lg shadow-md shrink-0">
                    {myProfileData.image ? <img src={myProfileData.image} className="w-full h-full object-cover" alt="Me" /> : myProfileData.firstname.charAt(0)}
                  </div>
                  <div className="pr-2">
                    <h2 className="text-xs font-bold text-slate-800 dark:text-white">สวัสดี, {myProfileData.firstname}</h2>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-widest mt-0.5">Administrator</p>
                  </div>
                </div>
                <button onClick={() => { setEditingId(myProfileData._id); setUserFormData({...myProfileData, password: ''}); setIsUserModalOpen(true); setTimeout(() => setModalAnim(true), 10); }} className="p-2 bg-white/50 dark:bg-white/10 rounded-lg text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white transition-all shadow-sm">
                  <Edit2 size={14} />
                </button>
              </div>
            )}

            {/* macOS Segmented Controls & Actions */}
            <div className="flex flex-col sm:flex-row gap-3 items-center w-full lg:w-auto">
              
              {/* Tabs */}
              <div className="flex gap-1 p-1 bg-black/5 dark:bg-black/40 border border-white/20 dark:border-white/5 rounded-xl shadow-inner w-full sm:w-auto justify-center">
                <button onClick={() => setActiveTab('nodes')} className={`px-6 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-300 ${activeTab === 'nodes' ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}>Nodes</button>
                <button onClick={() => setActiveTab('users')} className={`px-6 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-300 ${activeTab === 'users' ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}>Users</button>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-grow group min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={14} />
                  <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white/50 dark:bg-black/30 border border-white/50 dark:border-white/10 rounded-xl text-slate-800 dark:text-white text-xs outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-inner backdrop-blur-md placeholder:text-slate-400 dark:placeholder:text-slate-500" />
                </div>
                <button onClick={() => { setIsExportModalOpen(true); setTimeout(()=>setModalAnim(true),10); }} className="p-2 bg-white/50 dark:bg-white/10 text-emerald-600 dark:text-emerald-400 border border-white/50 dark:border-white/10 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/20 transition-all flex items-center justify-center min-w-[36px] shadow-sm">
                  <FileText size={16} />
                </button>
                <button onClick={() => { if(activeTab==='nodes') {setEditingId(null); setFormData(defaultDevice); setIsAddModalOpen(true);} else {setEditingId(null); setUserFormData(defaultUser); setIsUserModalOpen(true);} setTimeout(()=>setModalAnim(true),10); }} className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all shadow-md shadow-blue-500/20 flex items-center justify-center min-w-[36px]">
                  <Plus size={18}/>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* 📜 CONTENT AREA */}
      <div className="max-w-6xl mx-auto p-4 md:px-8 mt-6 relative z-10">
        
        {/* 🌟 ตารางข้อมูล (Glassmorphism macOS Style) */}
        <div className={`transform transition-all duration-1000 delay-[200ms] cubic-bezier(0.16, 1, 0.3, 1) ${showUI ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="bg-white/40 dark:bg-[#111827]/60 border border-white/50 dark:border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] overflow-x-auto text-slate-800 dark:text-white transition-colors duration-500">
            <table className="w-full text-left min-w-[700px]">
              <thead>
                <tr className="bg-white/30 dark:bg-black/20 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-white/30 dark:border-white/5">
                  <th className="px-8 py-4">Identity</th>
                  <th className="px-8 py-4">Status / Data</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/30 dark:divide-white/5">
                {activeTab === 'nodes' ? devices.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase())).map((device) => {
                  const wl = device.waterLevel || 0;
                  let statusColor = "text-blue-600 dark:text-blue-400";
                  if (wl >= device.criticalThreshold) statusColor = "text-red-600 dark:text-red-500";
                  else if (wl >= device.warningThreshold) statusColor = "text-orange-600 dark:text-orange-500";

                  return (
                  <tr key={device._id} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/60 dark:bg-black/40 border border-white/50 dark:border-white/10 flex items-center justify-center text-blue-500 shrink-0 group-hover:scale-105 transition-all shadow-sm">
                          {device.image ? <img src={device.image} className="w-full h-full object-cover" alt="Node" /> : <Cpu size={18} />}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 dark:text-white text-sm">{device.name}</div>
                          <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{device.mac}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3 font-mono text-xs">
                        <span className={`font-bold px-2.5 py-1 rounded-lg bg-white/50 dark:bg-black/30 border border-white/50 dark:border-white/5 shadow-sm ${statusColor}`}>{wl.toFixed(1)} cm</span>
                        <span className="text-slate-300 dark:text-slate-600 text-[10px]">|</span>
                        <span className="text-slate-600 dark:text-slate-300">{device.temperature?.toFixed(1) || '--'}°C</span>
                        <span className="text-slate-300 dark:text-slate-600 text-[10px]">|</span>
                        <span className="text-slate-600 dark:text-slate-300">{device.humidity?.toFixed(1) || '--'}%</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right space-x-2">
                      <Link href={`/device/${device.mac}`} className="p-2 bg-white/40 dark:bg-white/5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:shadow-sm inline-block transition-all border border-white/50 dark:border-white/5"><ImageIcon size={14} /></Link>
                      <button onClick={() => { setEditingId(device._id); setFormData(device); setIsAddModalOpen(true); setTimeout(() => setModalAnim(true), 10); }} className="p-2 bg-white/40 dark:bg-white/5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-sm transition-all border border-white/50 dark:border-white/5"><Edit2 size={14} /></button>
                    </td>
                  </tr>
                )}) : displayUsers.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase())).map((user) => (
                  <tr key={user._id} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-white/60 dark:bg-black/40 border border-white/50 dark:border-white/10 flex items-center justify-center text-indigo-500 shrink-0 group-hover:scale-105 transition-all shadow-sm">
                          {user.image ? <img src={user.image} className="w-full h-full object-cover" alt="User" /> : <Users size={18} />}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 dark:text-white text-sm">{user.firstname} {user.lastname}</div>
                          <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">@{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border shadow-sm ${user.role==='admin'?'bg-purple-100/50 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 border-purple-200/50 dark:border-purple-500/20':'bg-indigo-100/50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border-indigo-200/50 dark:border-indigo-500/20'} backdrop-blur-md`}>{user.role}</span>
                        <span className="text-xs text-slate-600 dark:text-slate-400">{user.phone || '-'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right space-x-2">
                      <button onClick={() => { setEditingId(user._id); setUserFormData({...user, password: ''}); setIsUserModalOpen(true); setTimeout(() => setModalAnim(true), 10); }} className="p-2 bg-white/40 dark:bg-white/5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-sm transition-all border border-white/50 dark:border-white/5"><Edit2 size={14} /></button>
                      <button onClick={() => handleDeleteUser(user._id)} className="p-2 bg-red-500/10 dark:bg-red-500/10 rounded-lg text-red-500 dark:text-red-400 hover:bg-red-500/20 dark:hover:bg-red-500/20 hover:shadow-sm transition-all border border-red-500/20 dark:border-red-500/10"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 🌟 EXPORT MODAL (macOS Style Window) */}
      {isExportModalOpen && (
        <div className={`fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 ${modalAnim ? 'opacity-100' : 'opacity-0'}`}>
          <div className={`bg-white/80 dark:bg-[#1e2330]/80 backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] w-full max-w-sm border border-white/50 dark:border-white/10 transform transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1) ${modalAnim ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'} text-slate-800 dark:text-white overflow-hidden`}>
            <div className="px-6 py-4 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-white/30 dark:bg-black/10">
              <div className="flex gap-1.5">
                <button onClick={closeModal} className="w-3 h-3 rounded-full bg-[#ff5f56] border border-black/10 hover:brightness-110 flex items-center justify-center group"><XCircle size={8} className="text-red-900 opacity-0 group-hover:opacity-100"/></button>
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-black/10"></div>
                <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-black/10"></div>
              </div>
              <h3 className="font-bold text-xs text-slate-600 dark:text-slate-300">Export Report</h3>
              <div className="w-10"></div> {/* Spacer */}
            </div>
            <div className="p-8 space-y-6">
              {activeTab === 'nodes' ? (
                <>
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-blue-500/10 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                       <Calendar size={28} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <h4 className="font-bold text-base">Select Data Range</h4>
                  </div>
                  <select value={exportDays} onChange={e => setExportDays(Number(e.target.value))} className="w-full p-3 bg-white/50 dark:bg-black/30 border border-white/50 dark:border-white/5 rounded-xl outline-none font-medium text-sm text-center appearance-none text-slate-800 dark:text-white shadow-inner focus:ring-2 focus:ring-blue-500/50 transition-all">
                    <option value={1}>1 วันล่าสุด (24 Hours)</option>
                    <option value={7}>7 วันย้อนหลัง (1 Week)</option>
                    <option value={30}>30 วันย้อนหลัง (1 Month)</option>
                  </select>
                </>
              ) : (
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-emerald-500/10 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                     <Users size={28} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h4 className="font-bold text-base">Export User List</h4>
                </div>
              )}
              <button onClick={executeExportPDF} disabled={isExporting} className={`w-full py-3 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 ${activeTab === 'nodes' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
                {isExporting ? <Loader2 className="animate-spin" size={18} /> : 'Generate PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 NODE MODAL (macOS Style) */}
      {isAddModalOpen && (
        <div className={`fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 ${modalAnim ? 'opacity-100' : 'opacity-0'}`}>
          <div className={`bg-white/80 dark:bg-[#1e2330]/80 backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] w-full max-w-2xl border border-white/50 dark:border-white/10 transform transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1) ${modalAnim ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'} text-slate-800 dark:text-white overflow-hidden`}>
            <div className="px-6 py-4 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-white/30 dark:bg-black/10">
              <div className="flex gap-1.5">
                <button onClick={closeModal} className="w-3 h-3 rounded-full bg-[#ff5f56] border border-black/10 hover:brightness-110 flex items-center justify-center group"><XCircle size={8} className="text-red-900 opacity-0 group-hover:opacity-100"/></button>
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-black/10"></div>
                <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-black/10"></div>
              </div>
              <h3 className="font-bold text-xs text-slate-600 dark:text-slate-300">{editingId ? 'Edit Node Configuration' : 'Register New Node'}</h3>
              <div className="w-10"></div>
            </div>
            <form onSubmit={handleDeviceSubmit} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <input required type="text" placeholder="Device Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="col-span-2 md:col-span-1 p-3 bg-white/50 dark:bg-black/30 border border-white/50 dark:border-white/5 rounded-xl outline-none text-sm text-slate-800 dark:text-white shadow-inner focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400" />
                <input required type="text" placeholder="MAC Address" value={formData.mac} onChange={e => setFormData({...formData, mac: e.target.value})} className="col-span-2 md:col-span-1 p-3 bg-white/50 dark:bg-black/30 border border-white/50 dark:border-white/5 rounded-xl outline-none text-sm font-mono text-slate-800 dark:text-white shadow-inner focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400" />
                
                <div className="col-span-2 flex items-center gap-4 p-3 bg-white/30 dark:bg-black/20 border border-white/50 dark:border-white/5 rounded-xl shadow-inner">
                   <div className="w-16 h-16 bg-white/80 dark:bg-black/50 rounded-lg overflow-hidden border border-white/50 dark:border-white/10 flex items-center justify-center shrink-0 shadow-sm">
                     {formData.image ? <img src={formData.image} className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-slate-400"/>}
                   </div>
                   <input type="file" accept="image/*" onChange={(e) => handleImageProcess(e, 'device')} className="text-xs text-slate-500 file:bg-white dark:file:bg-white/10 file:border file:border-slate-200 dark:file:border-white/10 file:px-3 file:py-1.5 file:rounded-lg file:cursor-pointer file:text-slate-700 dark:file:text-white file:shadow-sm file:font-medium" />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1">Warning Level (cm)</label>
                  <input type="number" value={formData.warningThreshold} onChange={e => setFormData({...formData, warningThreshold: Number(e.target.value)})} className="w-full p-3 bg-orange-50/50 dark:bg-orange-500/5 border border-orange-200/50 dark:border-orange-500/20 rounded-xl text-orange-600 dark:text-orange-400 outline-none font-bold text-sm text-center shadow-inner focus:ring-2 focus:ring-orange-500/50 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1">Critical Level (cm)</label>
                  <input type="number" value={formData.criticalThreshold} onChange={e => setFormData({...formData, criticalThreshold: Number(e.target.value)})} className="w-full p-3 bg-red-50/50 dark:bg-red-500/5 border border-red-200/50 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 outline-none font-bold text-sm text-center shadow-inner focus:ring-2 focus:ring-red-500/50 transition-all" />
                </div>
              </div>
              <button disabled={isSaving} className="w-full py-3 mt-2 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-500 transition-all duration-300 active:scale-95 flex justify-center">
                 {isSaving ? <Loader2 className="animate-spin" size={20}/> : 'Save'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 USER MODAL (macOS Style) */}
      {isUserModalOpen && (
        <div className={`fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 ${modalAnim ? 'opacity-100' : 'opacity-0'}`}>
          <div className={`bg-white/80 dark:bg-[#1e2330]/80 backdrop-blur-2xl rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] w-full max-w-md border border-white/50 dark:border-white/10 transform transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1) ${modalAnim ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'} text-slate-800 dark:text-white overflow-hidden`}>
            <div className="px-6 py-4 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-white/30 dark:bg-black/10">
              <div className="flex gap-1.5">
                <button onClick={closeModal} className="w-3 h-3 rounded-full bg-[#ff5f56] border border-black/10 hover:brightness-110 flex items-center justify-center group"><XCircle size={8} className="text-red-900 opacity-0 group-hover:opacity-100"/></button>
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-black/10"></div>
                <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-black/10"></div>
              </div>
              <h3 className="font-bold text-xs text-slate-600 dark:text-slate-300">{editingId ? 'Edit User Profile' : 'Register New User'}</h3>
              <div className="w-10"></div>
            </div>
            <form onSubmit={handleUserSubmit} className="p-8 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="flex flex-col items-center gap-3 mb-2">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-white/80 dark:bg-black/50 border border-white/50 dark:border-white/10 shadow-md flex items-center justify-center relative group">
                  {userFormData.image ? <img src={userFormData.image} className="w-full h-full object-cover" /> : <Users size={32} className="text-slate-400" />}
                </div>
                <input type="file" accept="image/*" onChange={(e) => handleImageProcess(e, 'user')} className="text-[10px] text-slate-500 file:bg-white dark:file:bg-white/10 file:border file:border-slate-200 dark:file:border-white/10 file:px-3 file:py-1.5 file:rounded-lg file:cursor-pointer file:text-slate-700 dark:file:text-white file:shadow-sm file:font-medium" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input required type="text" placeholder="First Name" value={userFormData.firstname} onChange={e => setUserFormData({...userFormData, firstname: e.target.value})} className="p-3 bg-white/50 dark:bg-black/30 border border-white/50 dark:border-white/5 rounded-xl outline-none text-sm text-slate-800 dark:text-white shadow-inner focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400" />
                <input required type="text" placeholder="Last Name" value={userFormData.lastname} onChange={e => setUserFormData({...userFormData, lastname: e.target.value})} className="p-3 bg-white/50 dark:bg-black/30 border border-white/50 dark:border-white/5 rounded-xl outline-none text-sm text-slate-800 dark:text-white shadow-inner focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400" />
              </div>
              <input required type="text" placeholder="Username" value={userFormData.username} onChange={e => setUserFormData({...userFormData, username: e.target.value})} className="w-full p-3 bg-white/50 dark:bg-black/30 border border-white/50 dark:border-white/5 rounded-xl outline-none text-sm text-slate-800 dark:text-white shadow-inner focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400" />
              <input type="password" placeholder={editingId ? "New Password (Leave blank to keep)" : "Password"} value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} className="w-full p-3 bg-white/50 dark:bg-black/30 border border-white/50 dark:border-white/5 rounded-xl outline-none text-sm text-slate-800 dark:text-white shadow-inner focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400" />
              <input type="text" placeholder="Phone Number" value={userFormData.phone} onChange={e => setUserFormData({...userFormData, phone: e.target.value})} className="w-full p-3 bg-white/50 dark:bg-black/30 border border-white/50 dark:border-white/5 rounded-xl outline-none text-sm text-slate-800 dark:text-white shadow-inner focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400" />
              <select value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value})} className="w-full p-3 bg-white/50 dark:bg-black/30 border border-white/50 dark:border-white/5 rounded-xl outline-none font-medium text-sm text-slate-800 dark:text-white shadow-inner focus:ring-2 focus:ring-blue-500/50 transition-all">
                <option value="user">Standard User</option>
                <option value="admin">Administrator</option>
              </select>
              <button disabled={isSaving} className="w-full py-3 mt-2 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-500 transition-all duration-300 active:scale-95 flex justify-center">
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : 'Save User'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}