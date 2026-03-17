'use client';

import { useState, useEffect } from 'react';
import { XCircle, ImageIcon, Loader2, MapPin, Power, Volume2, VolumeX, BellRing } from 'lucide-react';
import dynamic from 'next/dynamic';

const LocationPickerMap = dynamic(() => import('./LocationPickerMap'), { 
  ssr: false,
  loading: () => <div className="h-[250px] w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl flex items-center justify-center text-slate-500">Loading Map...</div>
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
  // 🌟 สร้าง State โดยดึงค่าจาก initialData ตรงๆ
  const [formData, setFormData] = useState(initialData);

  // 🌟 หัวใจสำคัญ: เมื่อเปิด Modal หรือข้อมูลเปลี่ยน ต้อง Sync ค่าใหม่ทันที
  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        ...initialData,
        // เช็คให้แน่ใจว่าถ้าเป็น false ต้องได้ false (ห้ามเป็น undefined)
        isActive: initialData.isActive === false ? false : true,
        isBuzzerEnabled: initialData.isBuzzerEnabled === false ? false : true,
      });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("📤 Sending to Server:", formData);
    onSubmit(formData, editingId);
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 ${modalAnim ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`bg-white/80 dark:bg-[#1e2330]/80 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-2xl border border-white/50 dark:border-white/10 transform transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1) ${modalAnim ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'} text-slate-800 dark:text-white overflow-hidden max-h-[90vh] flex flex-col`}>
        
        <div className="px-6 py-4 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-white/30 dark:bg-black/10 shrink-0">
          <div className="flex gap-1.5">
            <button type="button" onClick={onClose} className="w-3 h-3 rounded-full bg-[#ff5f56] border border-black/10 hover:brightness-110 flex items-center justify-center group"><XCircle size={8} className="text-red-900 opacity-0 group-hover:opacity-100"/></button>
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-black/10"></div>
            <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-black/10"></div>
          </div>
          <h3 className="font-bold text-xs text-slate-600 dark:text-slate-300">{editingId ? 'Edit Node Configuration' : 'Register New Node'}</h3>
          <div className="w-10"></div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <input required type="text" placeholder="Device Name" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="col-span-2 md:col-span-1 p-3 bg-white/50 dark:bg-black/30 border border-white/50 rounded-xl outline-none text-sm text-slate-800 dark:text-white shadow-inner focus:ring-2 focus:ring-blue-500/50 transition-all" />
            <input required type="text" placeholder="MAC Address" value={formData.mac || ''} onChange={e => setFormData({...formData, mac: e.target.value})} className="col-span-2 md:col-span-1 p-3 bg-white/50 dark:bg-black/30 border border-white/50 rounded-xl outline-none text-sm font-mono text-slate-800 dark:text-white shadow-inner" />
            
            <div className="col-span-2 flex items-center gap-4 p-3 bg-white/30 dark:bg-black/20 border border-white/50 rounded-xl shadow-inner">
               <div className="w-16 h-16 bg-white/80 dark:bg-black/50 rounded-lg overflow-hidden border border-white/50 dark:border-white/10 flex items-center justify-center shrink-0">
                 {formData.image ? <img src={formData.image} className="w-full h-full object-cover" alt="device" /> : <ImageIcon size={20} className="text-slate-400"/>}
               </div>
               <input type="file" accept="image/*" onChange={handleImageProcess} className="text-xs text-slate-500" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase">Warning (cm)</label>
              <input type="number" value={formData.warningThreshold ?? 3} onChange={e => setFormData({...formData, warningThreshold: Number(e.target.value)})} className="w-full p-3 bg-orange-50/50 dark:bg-orange-500/5 border border-orange-200/50 rounded-xl text-orange-600 font-bold text-sm text-center" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase">Critical (cm)</label>
              <input type="number" value={formData.criticalThreshold ?? 7} onChange={e => setFormData({...formData, criticalThreshold: Number(e.target.value)})} className="w-full p-3 bg-red-50/50 dark:bg-red-500/5 border border-red-200/50 rounded-xl text-red-600 font-bold text-sm text-center" />
            </div>
          </div>

          {/* 🌟 REMOTE CONTROL SECTION (สวิตช์ Toggle) */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase flex items-center gap-2">Remote Control & Notification</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              
              {/* System Status Toggle */}
              <div className="flex items-center justify-between p-3 bg-white/30 dark:bg-black/20 border border-white/50 dark:border-white/5 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${formData.isActive ? 'bg-blue-500/20 text-blue-500' : 'bg-slate-500/20 text-slate-500'}`}><Power size={16} /></div>
                  <div className="flex flex-col"><span className="text-xs font-bold">System Status</span></div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setFormData((prev: any) => ({ ...prev, isActive: !prev.isActive }))}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${formData.isActive ? 'bg-blue-600' : 'bg-slate-600'}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${formData.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Buzzer Audio Toggle */}
              <div className="flex items-center justify-between p-3 bg-white/30 dark:bg-black/20 border border-white/50 dark:border-white/5 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${formData.isBuzzerEnabled ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                    {formData.isBuzzerEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  </div>
                  <div className="flex flex-col"><span className="text-xs font-bold">Buzzer Audio</span></div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setFormData((prev: any) => ({ ...prev, isBuzzerEnabled: !prev.isBuzzerEnabled }))}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${formData.isBuzzerEnabled ? 'bg-emerald-600' : 'bg-slate-600'}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${formData.isBuzzerEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

            </div>
          </div>

          <div className="col-span-2 space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2"><MapPin size={16} /> Location</label>
            <div className="p-1 rounded-xl bg-white/30 dark:bg-black/20 border border-white/50">
              <LocationPickerMap lat={formData.lat} lng={formData.lng} onChange={(newLat, newLng) => setFormData((prev: any) => ({ ...prev, lat: newLat, lng: newLng }))} />
            </div>
          </div>

          <button type="submit" disabled={isSaving} className="w-full py-3 mt-4 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-500 transition-all flex justify-center items-center gap-2">
             {isSaving ? <Loader2 className="animate-spin" size={20}/> : <BellRing size={18} />}
             {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </form>
      </div>
    </div>
  );
}