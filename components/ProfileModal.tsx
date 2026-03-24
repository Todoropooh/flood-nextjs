'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react'; // 🌟 เพิ่มตัวสั่ง Logout
import { XCircle, Lock, User, Image as ImageIcon, Loader2, Save, LogOut } from 'lucide-react';

export default function ProfileModal({ isOpen, onClose, userData }: { isOpen: boolean, onClose: () => void, userData: any }) {
  const [formData, setFormData] = useState({
    firstname: userData?.firstname || '',
    lastname: userData?.lastname || '',
    image: userData?.image || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, image: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      return setErrorMsg("รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน!");
    }
    if (formData.newPassword && !formData.currentPassword) {
      return setErrorMsg("กรุณากรอกรหัสผ่านปัจจุบันเพื่อยืนยันตัวตน!");
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userData._id,
          firstname: formData.firstname,
          lastname: formData.lastname,
          image: formData.image,
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });
      const data = await res.json();
      if (!res.ok) setErrorMsg(data.error);
      else {
        alert("✅ อัปเดตโปรไฟล์เรียบร้อย!");
        window.location.reload();
      }
    } catch (err) { setErrorMsg("เกิดข้อผิดพลาด"); }
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative">
        
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/50">
          <h3 className="font-black text-sm uppercase flex items-center gap-2"><User size={18} className="text-blue-500" /> My Account</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors"><XCircle size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[85vh] overflow-y-auto">
          
          <div className="flex flex-col items-center gap-3">
            <div className="relative group cursor-pointer">
              <div className="w-24 h-24 rounded-full border-4 border-slate-100 dark:border-slate-800 overflow-hidden bg-slate-100 flex items-center justify-center">
                {formData.image ? <img src={formData.image} className="w-full h-full object-cover" /> : <User size={40} className="text-slate-400" />}
              </div>
              <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center text-white cursor-pointer">
                <ImageIcon size={20} />
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
            <p className="font-black text-slate-800 dark:text-white uppercase text-sm">{formData.firstname} {formData.lastname}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">First Name</label>
              <input required type="text" value={formData.firstname} onChange={e => setFormData({...formData, firstname: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-950 rounded-xl outline-none font-bold text-sm border border-transparent focus:border-blue-500" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Last Name</label>
              <input required type="text" value={formData.lastname} onChange={e => setFormData({...formData, lastname: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-950 rounded-xl outline-none font-bold text-sm border border-transparent focus:border-blue-500" />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[11px] font-black text-slate-400 uppercase flex items-center gap-2 mb-2"><Lock size={14} /> Change Password</h4>
            {errorMsg && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold text-center">{errorMsg}</div>}
            <input type="password" placeholder="Current Password" value={formData.currentPassword} onChange={e => setFormData({...formData, currentPassword: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-950 rounded-xl outline-none font-bold text-sm border border-transparent focus:border-amber-500" />
            <input type="password" placeholder="New Password" value={formData.newPassword} onChange={e => setFormData({...formData, newPassword: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-950 rounded-xl outline-none font-bold text-sm border border-transparent focus:border-blue-500" />
            {formData.newPassword && <input type="password" placeholder="Confirm New Password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-950 rounded-xl outline-none font-bold text-sm border border-transparent focus:border-blue-500" />}
          </div>

          <div className="pt-4 space-y-3">
            <button disabled={isSaving} type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg flex justify-center items-center gap-2 hover:bg-blue-500 transition-all active:scale-95">
              {isSaving ? <Loader2 className="animate-spin" size={18}/> : <><Save size={18}/> Save Changes</>}
            </button>

            {/* 🌟 ปุ่ม LOGOUT แดงๆ อยู่ตรงนี้ครับพี่ */}
            <button 
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })} 
              className="w-full py-4 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-2xl font-black uppercase tracking-widest flex justify-center items-center gap-2 hover:bg-red-100 transition-all active:scale-95 border border-red-100 dark:border-red-500/20"
            >
              <LogOut size={18}/> Logout
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}