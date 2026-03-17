// components/RecentLogs.tsx
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
      <div className="overflow-y-auto max-h-[300px]">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-400 uppercase bg-slate-900/50 sticky top-0">
            <tr>
              <th className="px-6 py-3">เวลา</th>
              <th className="px-6 py-3">ระดับน้ำ (cm)</th>
              <th className="px-6 py-3">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {/* ✅ ใช้ .reverse() เพื่อให้ข้อมูลล่าสุดเด้งมาอยู่บรรทัดแรกของตาราง */}
            {[...logs].reverse().map((log) => {
              
              // ✅ 1. แปลงระยะเซนเซอร์เป็นความสูงน้ำจริง (0-20 ซม.)
              const rawDist = Number(log.level) || 70;
              let waterLevel = 70 - rawDist;
              if (waterLevel > 20) waterLevel = 20;
              if (waterLevel < 0) waterLevel = 0;

              // ✅ 2. คำนวณสถานะใหม่ให้ตรงกับหน้า Dashboard (วิกฤต >= 17, เตือน >= 10)
              let displayStatus = 'Normal';
              if (waterLevel >= 17) displayStatus = 'Critical';
              else if (waterLevel >= 10) displayStatus = 'Warning';

              return (
                <tr key={log._id} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-3 font-mono text-slate-300">
                    {new Date(log.createdAt).toLocaleTimeString('th-TH')}
                  </td>
                  
                  {/* ✅ โชว์ความสูงน้ำจริง */}
                  <td className="px-6 py-3 font-medium text-white">
                    {waterLevel.toFixed(1)} cm
                  </td>
                  
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold
                      ${displayStatus === 'Critical' ? 'bg-red-500/20 text-red-400' :
                        displayStatus === 'Warning' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-emerald-500/20 text-emerald-400'
                      }`}>
                      {displayStatus}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="p-6 text-center text-slate-500">ยังไม่มีข้อมูล</div>
        )}
      </div>
    </div>
  );
}