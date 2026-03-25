'use client';

import { useState, useEffect } from 'react';
import { XCircle, ImageIcon, Loader2, MapPin, Power, Volume2, VolumeX, BellRing, Settings, Save, Cpu } from 'lucide-react';
import dynamic from 'next/dynamic';

const LocationPickerMap = dynamic(() => import('./LocationPickerMap'), { 
  ssr: false,
  loading: () => <div className="h-[250px] w-full bg-white/20 backdrop-blur-md animate-pulse rounded-[2rem] flex items-center justify-center text-slate-500 font-bold text-[10px] uppercase tracking-widest">Loading Satellite Data...</div>
});

interface NodeModalProps {
  isOpen: boolean;
  modalAnim: boolean;
  editingId: string | null;
  initialData: any;
  onClose: () => void;
  onSubmit: (formData: any, editingId: string | null) => void;
  isSaving: boolean;
}

export default function NodeModal({ isOpen, modalAnim, editingId, initialData, onClose, onSubmit, isSaving }: NodeModalProps) {
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (isOpen) {
      if (initialData && Object.keys(initialData).length > 0) {
        setFormData({
          ...initialData,
          isActive: initialData.isActive ?? true,
          isBuzzerEnabled: initialData.isBuzzerEnabled ?? true,
          installHeight: initialData.installHeight ?? 62.0,
          warningThreshold: initialData.warningThreshold ?? 5.0,
          criticalThreshold: initialData.criticalThreshold ?? 10.0,
          lat: initialData.lat ?? 14.8824,
          lng: initialData.lng ?? 103.4936
        });
      } else {
        setFormData({
          name: '', mac: '', isActive: true, isBuzzerEnabled: true,
          installHeight: 62.0, warningThreshold: 5.0, criticalThreshold: 10.0,
          lat: 14.8824, lng: 103.4936
        });
      }
    }
  }, [initialData, isOpen]);

  const handleImageProcess = (e: any) => {
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
        setFormData((prev: any) => ({ ...prev, image: canvas.toDataURL('image/jpeg', 0.7) }));
      };
    };
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all duration-500 ${modalAnim ? 'opacity-100' : 'opacity-0'}`}>
      
      {/* 💎 Glass Main Container */}
      <div className={`bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-[30px] rounded-[2.5rem] shadow-2xl w-full max-w-2xl border border-white/40 dark:border-white/10 transform transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${modalAnim ? 'scale-100 translate-y-0' : 'scale-95 translate-y-12'} text-slate-800 dark:text-white overflow-hidden max-h-[90vh] flex flex-col`}>
        
        {/* ✨ Header Section */}
        <div className="px-8 py-6 border-b border-white/20 dark:border-white/5 flex justify-between items-center bg-white/20 dark:bg-black/20 shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600/90 rounded-2xl shadow-lg shadow-blue-500/20 text-white">
              <Cpu size={20} />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-[0.1em]">
                {editingId ? 'Node Configuration' : 'Network Registration'}
              </h3>
              <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">
                Terminal ID: {formData.mac || 'New Device'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-full transition-all active:scale-90">
            <XCircle size={22} />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData, editingId); }} className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar">
          
          {/* 📍 Grid: Identity & Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 ml-1 tracking-tighter">Device Alias</label>
              <input required type="text" placeholder="Main Gate Station" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} 
                className="w-full p-4 bg-white/40 dark:bg-black/40 border border-white/40 dark:border-white/10 rounded-2xl outline-none text-sm font-bold focus:border-blue-500 transition-all backdrop-blur-md shadow-sm" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 ml-1 tracking-tighter">MAC Address</label>
              <input required type="text" placeholder="XX:XX:XX:XX:XX:XX" value={formData.mac || ''} onChange={e => setFormData({...formData, mac: e.target.value})} 
                className="w-full p-4 bg-white/40 dark:bg-black/40 border border-white/40 dark:border-white/10 rounded-2xl outline-none text-sm font-mono font-bold focus:border-blue-500 transition-all backdrop-blur-md shadow-sm" />
            </div>

            {/* 📸 Image Box */}
            <div className="col-span-1 md:col-span-2 p-5 bg-white/30 dark:bg-black/20 border border-white/40 dark:border-white/10 rounded-[2rem] backdrop-blur-md flex items-center gap-6 group">
               <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-3xl overflow-hidden border border-white/50 dark:border-white/5 flex items-center justify-center shrink-0 shadow-xl group-hover:scale-105 transition-transform duration-500">
                 {formData.image ? <img src={formData.image} className="w-full h-full object-cover" alt="preview" /> : <ImageIcon size={32} className="text-slate-300 dark:text-slate-700"/>}
               </div>
               <div className="flex flex-col gap-2">
                 <label className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-widest">Physical Reference</label>
                 <input type="file" accept="image/*" onChange={handleImageProcess} 
                  className="text-[10px] text-slate-500 font-bold file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-blue-600 file:text-white file:uppercase hover:file:bg-blue-700 cursor-pointer transition-all" />
               </div>
            </div>

            {/* 🌊 Metrics Section */}
            <div className="col-span-1 md:col-span-2 grid grid-cols-3 gap-4 bg-white/20 dark:bg-black/10 p-2 rounded-[1.8rem] border border-white/20">
               <MetricInput label="Height" unit="cm" value={formData.installHeight} color="text-blue-500" onChange={v => setFormData({...formData, installHeight: v})} />
               <MetricInput label="Warning" unit="cm" value={formData.warningThreshold} color="text-orange-500" onChange={v => setFormData({...formData, warningThreshold: v})} />
               <MetricInput label="Critical" unit="cm" value={formData.criticalThreshold} color="text-red-500" onChange={v => setFormData({...formData, criticalThreshold: v})} />
            </div>
          </div>

          {/* 🕹️ Toggles Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlassSwitch label="Node Status" icon={<Power size={18}/>} isActive={formData.isActive} onToggle={() => setFormData((p:any)=>({...p, isActive: !p.isActive}))} color="bg-blue-600" />
            <GlassSwitch label="Local Buzzer" icon={formData.isBuzzerEnabled ? <Volume2 size={18}/> : <VolumeX size={18}/>} isActive={formData.isBuzzerEnabled} onToggle={() => setFormData((p:any)=>({...p, isBuzzerEnabled: !p.isBuzzerEnabled}))} color="bg-emerald-500" />
          </div>

          {/* 🗺️ Map Section */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <MapPin size={14} className="text-red-500" /> Deployment Coordinates
            </label>
            <div className="p-1 rounded-[2rem] bg-white/40 dark:bg-black/40 border border-white/50 dark:border-white/10 backdrop-blur-md overflow-hidden shadow-inner">
              <LocationPickerMap lat={formData.lat} lng={formData.lng} onChange={(newLat, newLng) => setFormData((prev: any) => ({ ...prev, lat: newLat, lng: newLng }))} />
            </div>
          </div>

          {/* 🚀 Submit Button */}
          <button type="submit" disabled={isSaving} 
            className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-[0.3em] text-[11px] rounded-[1.5rem] shadow-2xl shadow-blue-500/40 transition-all flex justify-center items-center gap-3 active:scale-[0.98] disabled:opacity-50">
             {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20} />}
             {isSaving ? 'Syncing with Server...' : editingId ? 'Update Network Node' : 'Register New Station'}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- 💎 Glass Metrics Sub-component ---
function MetricInput({ label, unit, value, color, onChange }: any) {
  return (
    <div className="flex flex-col items-center p-3 space-y-1">
      <span className={`text-[9px] font-black uppercase tracking-tighter ${color}`}>{label} ({unit})</span>
      <input type="number" step="0.1" value={value ?? 0} onChange={e => onChange(Number(e.target.value))} 
        className="w-full bg-transparent text-center text-lg font-black outline-none dark:text-white" />
    </div>
  );
}

// --- 💎 Glass Switch Sub-component ---
function GlassSwitch({ label, icon, isActive, onToggle, color }: any) {
  return (
    <div className="flex items-center justify-between p-5 bg-white/40 dark:bg-black/40 border border-white/50 dark:border-white/10 rounded-[1.8rem] backdrop-blur-md shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${isActive ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-md' : 'bg-slate-200/50 text-slate-400'}`}>{icon}</div>
        <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-tighter">{label}</span>
      </div>
      <button type="button" onClick={onToggle} className={`w-12 h-7 flex items-center rounded-full p-1 transition-all duration-500 shadow-inner ${isActive ? color : 'bg-slate-300/50 dark:bg-slate-700'}`}>
        <div className={`bg-white w-5 h-5 rounded-full shadow-lg transform transition-transform duration-500 ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}