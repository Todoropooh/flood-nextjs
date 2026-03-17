'use client';

interface Log {
  _id: string;
  level: number;
  status: string;
  createdAt: string;
}

export default function RecentLogs({ logs }: { logs: Log[] }) {
  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl h-full">
      <div className="p-4 border-b border-slate-700 bg-slate-800/50">
        <h3 className="font-semibold text-slate-200">ประวัติล่าสุด (Recent Logs)</h3>
      </div>
      <div className="overflow-y-auto max-h-[400px]">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-400 uppercase bg-slate-900/50 sticky top-0">
            <tr>
              <th className="px-6 py-3">เวลา</th>
              <th className="px-6 py-3">ระดับน้ำ (cm)</th>
              <th className="px-6 py-3">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {[...logs].reverse().map((log) => {
              
              // ✅ 1. คำนวณระดับน้ำ: 70 - distance
              const sensorHeight = 70;
              const rawDist = Number(log.level) || 70;
              let waterLevel = sensorHeight - rawDist;
              
              // Clamp ค่าให้อยู่ในสเกลถัง 20 cm
              if (waterLevel > 20) waterLevel = 20;
              if (waterLevel < 0) waterLevel = 0;

              // ✅ 2. กำหนดเกณฑ์แจ้งเตือนใหม่ (7 / 14) และใช้ชื่อภาษาไทย
              let displayStatus = 'ปลอดภัย';
              let statusClasses = 'bg-emerald-500/20 text-emerald-400';

              if (waterLevel > 14) {
                displayStatus = 'อันตราย';
                statusClasses = 'bg-red-500/20 text-red-400';
              } else if (waterLevel > 7) {
                displayStatus = 'เฝ้าระวัง';
                statusClasses = 'bg-orange-500/20 text-orange-400';
              }

              return (
                <tr key={log._id} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-3 font-mono text-slate-300">
                    {new Date(log.createdAt).toLocaleTimeString('th-TH')}
                  </td>
                  
                  <td className="px-6 py-3 font-medium text-white">
                    {waterLevel.toFixed(1)} cm
                  </td>
                  
                  <td className="px-6 py-3">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusClasses}`}>
                      {displayStatus}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="p-10 text-center text-slate-500 italic">
            ไม่มีข้อมูลบันทึกในขณะนี้
          </div>
        )}
      </div>
    </div>
  );
}