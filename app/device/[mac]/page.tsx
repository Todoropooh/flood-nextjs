'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, MapPin, Cpu, Image as ImageIcon, 
  AlertTriangle, Camera, UploadCloud, Loader2 
} from 'lucide-react';

export default function DeviceProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [device, setDevice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false); // 🌟 state สำหรับเช็คว่ากำลังเซฟรูปไหม

  useEffect(() => {
    const fetchDevice = async () => {
      try {
        const res = await fetch(`/api/devices`);
        if (res.ok) {
          const allDevices = await res.json();
          const macFromUrl = decodeURIComponent(params.mac as string);
          const found = allDevices.find((d: any) => d.mac === macFromUrl);
          setDevice(found);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchDevice();
  }, [params.mac]);

  // 📸 ฟังก์ชันอัปโหลด/ถ่ายรูป แล้วเซฟลง Database ทันที
  const handleImageUpdate = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("ไฟล์ภาพใหญ่เกินไป กรุณาอัปโหลดรูปขนาดไม่เกิน 2MB ครับ");
      return;
    }

    setIsSaving(true);
    const reader = new FileReader();
    
    reader.onloadend = async () => {
      const base64Image = reader.result as string;
      
      try {
        // อัปเดตข้อมูลลง Database
        const res = await fetch('/api/devices', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...device, image: base64Image })
        });

        if (res.ok) {
          // อัปเดตรูปในหน้าเว็บให้เปลี่ยนทันที
          setDevice({ ...device, image: base64Image });
        } else {
          alert('ไม่สามารถบันทึกรูปภาพได้');
        }
      } catch (error) {
        console.error("Error saving image:", error);
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      } finally {
        setIsSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-white font-bold tracking-widest uppercase"><Loader2 className="animate-spin mr-2" /> Loading Data...</div>;
  
  if (!device) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a] text-white">
      <h1 className="text-2xl font-black mb-4 uppercase tracking-widest text-slate-500">Device Not Found</h1>
      <button onClick={() => router.push('/admin')} className="px-6 py-3 bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all">กลับหน้า Admin</button>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#0f172a] text-white p-6 md:p-10 font-sans relative z-10 pb-20">
      
      {/* 🌌 Background */}
      <div className="fixed inset-0 -z-10 bg-[#0f172a]">
        <img src="https://images.pexels.com/photos/1295138/pexels-photo-1295138.jpeg" className="w-full h-full object-cover opacity-30" alt="bg" />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-3xl" />
      </div>

      {/* 🔙 Navbar กลับหน้าหลัก */}
      <nav className="max-w-4xl mx-auto mb-10 flex items-center gap-4">
        <button onClick={() => router.push('/admin')} className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-blue-400">{device.name}</h1>
          <p className="text-slate-400 text-xs font-mono uppercase tracking-widest mt-1">Node ID: {device.mac}</p>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 📸 กล่องโชว์รูปภาพ และ ปุ่มถ่ายรูป */}
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 backdrop-blur-xl flex flex-col">
          <div className="flex items-center gap-2 mb-4 text-emerald-400">
            <ImageIcon size={20} />
            <h3 className="text-[11px] font-black uppercase tracking-widest">Installation Site</h3>
          </div>
          
          <div className="w-full flex-grow rounded-[2rem] overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center shadow-inner min-h-[250px] relative group">
            
            {/* โชว์รูป หรือ โชว์ข้อความ */}
            {device.image ? (
              <img src={device.image} alt={device.name} className="absolute inset-0 w-full h-full object-cover group-hover:blur-sm transition-all duration-500" />
            ) : (
              <span className="text-slate-500 text-xs font-black uppercase tracking-widest z-0">No photo uploaded</span>
            )}

            {/* โหลดดิ้งตอนเซฟรูป */}
            {isSaving && (
              <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center text-emerald-400">
                <Loader2 size={32} className="animate-spin mb-2" />
                <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Saving...</span>
              </div>
            )}

            {/* 🛠️ ปุ่ม Action (อัปโหลด / ถ่ายรูป) จะโชว์ตลอดถ้าไม่มีรูป แต่ถ้ามีรูปจะโชว์ตอนเอาเมาส์ชี้ */}
            <div className={`absolute inset-0 z-10 flex items-center justify-center gap-4 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${device.image ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
              
              {/* ปุ่ม 1: อัปโหลดจากเครื่อง */}
              <label className="flex flex-col items-center justify-center w-16 h-16 bg-blue-600/90 text-white rounded-2xl cursor-pointer hover:scale-110 hover:bg-blue-500 transition-all shadow-lg border border-blue-400/30">
                <UploadCloud size={24} className="mb-1" />
                <span className="text-[8px] font-black uppercase tracking-widest">Upload</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpdate} />
              </label>

              {/* ปุ่ม 2: ถ่ายรูป (ใช้ capture="environment" เพื่อเปิดกล้องหลัง) */}
              <label className="flex flex-col items-center justify-center w-16 h-16 bg-emerald-600/90 text-white rounded-2xl cursor-pointer hover:scale-110 hover:bg-emerald-500 transition-all shadow-lg border border-emerald-400/30">
                <Camera size={24} className="mb-1" />
                <span className="text-[8px] font-black uppercase tracking-widest">Camera</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpdate} />
              </label>

            </div>
          </div>
          
          <div className="mt-6 flex items-start gap-3 bg-black/20 p-4 rounded-2xl border border-white/5">
            <MapPin size={18} className="text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Location Details</div>
              <div className="text-sm font-bold text-slate-300">{device.location || 'Unknown Location'}</div>
            </div>
          </div>
        </div>

        {/* ⚙️ กล่องโชว์สเปค & Threshold */}
        <div className="space-y-6 flex flex-col">
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-4 text-purple-400">
              <Cpu size={20} />
              <h3 className="text-[11px] font-black uppercase tracking-widest">Hardware Spec</h3>
            </div>
            <div className="bg-purple-500/10 p-5 rounded-2xl border border-purple-500/20 flex items-center justify-between">
               <span className="text-[10px] font-black uppercase text-purple-400 tracking-widest">Model Unit</span>
               <span className="text-lg font-black tracking-widest text-white">{device.type || 'ESP32 Default'}</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 backdrop-blur-xl flex-grow">
            <div className="flex items-center gap-2 mb-6 text-orange-400">
              <AlertTriangle size={20} />
              <h3 className="text-[11px] font-black uppercase tracking-widest">Safety Thresholds</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30 p-5 rounded-[2rem] text-center shadow-lg">
                <div className="text-[10px] font-black uppercase text-orange-500 mb-2 tracking-widest">Warning Level</div>
                <div className="text-4xl font-black text-white">{device.warningThreshold}<span className="text-sm font-bold text-orange-500 ml-1">cm</span></div>
              </div>
              <div className="bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-500/30 p-5 rounded-[2rem] text-center shadow-lg">
                <div className="text-[10px] font-black uppercase text-red-500 mb-2 tracking-widest">Critical Level</div>
                <div className="text-4xl font-black text-white">{device.criticalThreshold}<span className="text-sm font-bold text-red-500 ml-1">cm</span></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}