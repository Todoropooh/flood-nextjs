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
              <th className="px-6 py-3">ระดับน้ำ</th>
              <th className="px-6 py-3">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log._id} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                <td className="px-6 py-3 font-mono text-slate-300">
                  {new Date(log.createdAt).toLocaleTimeString('th-TH')}
                </td>
                <td className="px-6 py-3 font-medium text-white">
                  {log.level} cm
                </td>
                <td className="px-6 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold
                    ${log.status === 'Critical' ? 'bg-red-500/20 text-red-400' :
                      log.status === 'Warning' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                    {log.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="p-6 text-center text-slate-500">ยังไม่มีข้อมูล</div>
        )}
      </div>
    </div>
  );
}