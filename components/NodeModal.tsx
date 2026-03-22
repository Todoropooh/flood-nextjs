'use client';

import { useState, useEffect } from 'react';
import { XCircle, ImageIcon, Loader2, MapPin, Power, Volume2, VolumeX, BellRing, Settings } from 'lucide-react';
import dynamic from 'next/dynamic';

const LocationPickerMap = dynamic(() => import('./LocationPickerMap'), { 
  ssr: false,
  loading: () => <div className="h-[250px] w-full bg-slate-100 dark:bg-slate-900 animate-pulse rounded-xl flex items-center justify-center text-slate-500 font-bold text-xs uppercase tracking-widest">Loading Map...</div>
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
      
      {/* 🌟 ปรับ Container ใหม่ ทึบและชัดเจนขึ้น */}
      <div className={`bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 transform transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1) ${modalAnim ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'} text-slate-800 dark:text-white overflow-hidden max-h-[90vh] flex flex-col`}>
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/50 shrink-0">
          <h3 className="font-black text-xs text-slate-600 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
            <Settings size={16} className="text-blue-500" />
            {editingId ? 'Edit Node Configuration' : 'Register New Node'}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors p-1">
            <XCircle size={20} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 overflow-y-auto">
          
          {/* ข้อมูลอุปกรณ์ */}
          <div className="grid grid-cols-2 gap-4">
            <input required type="text" placeholder="Device Name" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="col-span-2 md:col-span-1 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm font-bold text-slate-800 dark:text-white focus:border-blue-500 transition-colors" />
            <input required type="text" placeholder="MAC Address" value={formData.mac || ''} onChange={e => setFormData({...formData, mac: e.target.value})} className="col-span-2 md:col-span-1 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm font-mono font-bold text-slate-800 dark:text-white focus:border-blue-500 transition-colors" />
            
            {/* อัปโหลดรูป */}
            <div className="col-span-2 flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
               <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0 shadow-sm">
                 {formData.image ? <img src={formData.image} className="w-full h-full object-cover" alt="device" /> : <ImageIcon size={24} className="text-slate-300 dark:text-slate-700"/>}
               </div>
               <div className="flex flex-col gap-1">
                 <label className="text-[10px] font-black uppercase text-slate-400">Device Image</label>
                 <input type="file" accept="image/*" onChange={handleImageProcess} className="text-xs text-slate-500 font-bold" />
               </div>
            </div>

            {/* เกณฑ์แจ้งเตือน */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-orange-500 uppercase ml-1 tracking-widest">Warning (cm)</label>
              <input type="number" step="0.1" value={formData.warningThreshold ?? 3} onChange={e => setFormData({...formData, warningThreshold: Number(e.target.value)})} className="w-full p-3.5 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-xl text-orange-600 dark:text-orange-400 font-black text-sm text-center focus:border-orange-500 outline-none transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-red-500 uppercase ml-1 tracking-widest">Critical (cm)</label>
              <input type="number" step="0.1" value={formData.criticalThreshold ?? 7} onChange={e => setFormData({...formData, criticalThreshold: Number(e.target.value)})} className="w-full p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 font-black text-sm text-center focus:border-red-500 outline-none transition-colors" />
            </div>
          </div>

          {/* 🌟 REMOTE CONTROL SECTION (สวิตช์ Toggle) */}
          <div className="pt-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-3 block">Remote Control & Notification</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* System Status Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${formData.isActive ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}><Power size={18} /></div>
                  <div className="flex flex-col"><span className="text-xs font-black text-slate-700 dark:text-slate-200">System Status</span></div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setFormData((prev: any) => ({ ...prev, isActive: !prev.isActive }))}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 shadow-inner ${formData.isActive ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${formData.isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Buzzer Audio Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${formData.isBuzzerEnabled ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'}`}>
                    {formData.isBuzzerEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                  </div>
                  <div className="flex flex-col"><span className="text-xs font-black text-slate-700 dark:text-slate-200">Buzzer Audio</span></div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setFormData((prev: any) => ({ ...prev, isBuzzerEnabled: !prev.isBuzzerEnabled }))}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 shadow-inner ${formData.isBuzzerEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${formData.isBuzzerEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

            </div>
          </div>

          {/* แผนที่ */}
          <div className="space-y-2 pt-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><MapPin size={14} /> Location Map</label>
            <div className="p-1 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <LocationPickerMap lat={formData.lat} lng={formData.lng} onChange={(newLat, newLng) => setFormData((prev: any) => ({ ...prev, lat: newLat, lng: newLng }))} />
            </div>
          </div>

          <button type="submit" disabled={isSaving} className="w-full py-4 mt-6 bg-blue-600 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg hover:bg-blue-500 transition-colors flex justify-center items-center gap-2 active:scale-95">
             {isSaving ? <Loader2 className="animate-spin" size={18}/> : <BellRing size={16} />}
             {isSaving ? 'Saving Changes...' : 'Save Configuration'}
          </button>
        </form>
      </div>
    </div>
  );
}