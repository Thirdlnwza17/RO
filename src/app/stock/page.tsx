"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";

interface CabinetSummary {
  id: number;
  name?: string;
  tableCount?: number;
  lastUpdated?: string;
  lastUpdatedBy?: string;
  month?: number;
  year?: number;
}

export default function StockPage() {
  const [cabinets, setCabinets] = useState<CabinetSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Thai months for display
  const thaiMonths = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
  ];

  // Cabinet color themes with 8-bit borders
  const cabinetColors = [
    "from-blue-500 to-blue-600 border-blue-800",
    "from-emerald-500 to-emerald-600 border-emerald-800",
    "from-purple-500 to-purple-600 border-purple-800",
    "from-orange-500 to-orange-600 border-orange-800",
    "from-pink-500 to-pink-600 border-pink-800",
    "from-indigo-500 to-indigo-600 border-indigo-800",
    "from-teal-500 to-teal-600 border-teal-800",
    "from-red-500 to-red-600 border-red-800",
    "from-cyan-500 to-cyan-600 border-cyan-800",
  ];

  const handleCabinetClick = (cabinetId: number) => {
    router.push(`/stock/cabinet/${cabinetId}`);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/stock");
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        if (!Array.isArray(data)) {
          throw new Error('Invalid data format received from API');
        }
        setCabinets(data);
      } catch (error) {
        console.error("Error fetching cabinets:", error);
        setError(error instanceof Error ? error.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) return (
    <>
      <Header />
      <div className="pt-16 p-4 min-h-screen">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-4 text-lg text-gray-600">กำลังโหลด...</span>
        </div>
      </div>
    </>
  );

  if (error) return (
    <>
      <Header />
      <div className="pt-16 p-4 min-h-screen">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 max-w-md mx-auto mt-20">
          <div className="text-red-600 text-center">
            <div className="text-2xl mb-2">⚠️</div>
            <div className="font-semibold">เกิดข้อผิดพลาด</div>
            <div className="text-sm mt-1">{error}</div>
          </div>
        </div>
      </div>
    </>
  );

  if (!Array.isArray(cabinets)) return (
    <>
      <Header />
      <div className="pt-16 p-4 min-h-screen">
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 max-w-md mx-auto mt-20">
          <div className="text-yellow-600 text-center">
            <div className="text-2xl mb-2">📁</div>
            <div className="font-semibold">ไม่พบข้อมูลตู้</div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <Header />
      <div className="pt-2 min-h-screen">
        <div className="px-6 pt-4 pb-6">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              จัดการสต็อกตู้
            </h1>
            <p className="text-gray-600">เลือกตู้ที่ต้องการดูข้อมูล</p>
          </div>
          
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 9 }).map((_, i) => {
                const cab = Array.isArray(cabinets) ? cabinets.find((c) => c?.id === i + 1) : null;
                const colorClass = cabinetColors[i % cabinetColors.length];
                
                return (
                  <div
                    key={i}
                    onClick={() => handleCabinetClick(i + 1)}
                    className={`group relative bg-gradient-to-br ${colorClass} p-6 cursor-pointer transform transition-all duration-300 hover:-translate-y-2 hover:scale-105 backdrop-blur-sm
                      border-4 
                      shadow-[8px_8px_0px_rgba(0,0,0,0.3),4px_4px_0px_rgba(0,0,0,0.2),2px_2px_0px_rgba(0,0,0,0.1)]
                      hover:shadow-[12px_12px_0px_rgba(0,0,0,0.4),6px_6px_0px_rgba(0,0,0,0.3),3px_3px_0px_rgba(0,0,0,0.2)]
                      rounded-none
                      relative
                      before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-full 
                      before:border-2 before:border-white/30 before:rounded-none before:pointer-events-none
                      after:content-[''] after:absolute after:top-1 after:left-1 after:right-1 after:bottom-1 
                      after:border-2 after:border-black/20 after:rounded-none after:pointer-events-none
                    `}
                    style={{
                      clipPath: `polygon(
                        0 8px, 8px 8px, 8px 0, 
                        calc(100% - 8px) 0, calc(100% - 8px) 8px, 100% 8px,
                        100% calc(100% - 8px), calc(100% - 8px) calc(100% - 8px), calc(100% - 8px) 100%,
                        8px 100%, 8px calc(100% - 8px), 0 calc(100% - 8px)
                      )`
                    }}
                  >
                    {/* Decorative pixelated corner elements */}
                    <div className="absolute top-2 right-2 w-6 h-6 bg-white/40 opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                         style={{
                           clipPath: `polygon(
                             0 0, 4px 0, 4px 4px, 8px 4px, 8px 8px, 12px 8px, 12px 12px, 16px 12px, 16px 16px, 20px 16px, 20px 20px, 24px 20px, 24px 24px,
                             20px 24px, 20px 20px, 16px 20px, 16px 16px, 12px 16px, 12px 12px, 8px 12px, 8px 8px, 4px 8px, 4px 4px, 0 4px
                           )`
                         }}>
                      <div className="w-4 h-4 bg-white/60 m-1 flex items-center justify-center">
                        <span className="text-xs font-bold">{i + 1}</span>
                      </div>
                    </div>
                    
                    {/* 8-bit style shine effect */}
                    <div className="absolute inset-2 bg-gradient-to-br from-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                         style={{
                           clipPath: `polygon(0 0, 100% 0, 100% 50%, 50% 100%, 0 100%)`
                         }}></div>
                    
                    <div className="relative z-10">
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-white/30 border-2 border-white/50 flex items-center justify-center mr-3"
                             style={{
                               clipPath: `polygon(0 4px, 4px 4px, 4px 0, calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px))`
                             }}>
                          <span className="text-2xl">📦</span>
                        </div>
                        <h2 className="text-xl font-bold text-white font-mono">{`ตู้ ${i + 1}`}</h2>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="bg-black/20 border-2 border-white/30 p-3 backdrop-blur-sm"
                             style={{
                               clipPath: `polygon(0 2px, 2px 2px, 2px 0, calc(100% - 2px) 0, calc(100% - 2px) 2px, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 2px calc(100% - 2px), 0 calc(100% - 2px))`
                             }}>
                          <div className="text-white/80 text-sm mb-1 font-mono">อัปเดตล่าสุด</div>
                          <div className="text-white font-medium font-mono">
                            {cab?.lastUpdated ? new Date(cab.lastUpdated).toLocaleDateString("th-TH") : "-"}
                          </div>
                          {cab?.lastUpdatedBy && (
                            <div className="text-white/70 text-xs font-mono mt-1">
                              โดย {cab.lastUpdatedBy}
                            </div>
                          )}
                        </div>
                        
                        <div className="bg-black/20 border-2 border-white/30 p-3 backdrop-blur-sm"
                             style={{
                               clipPath: `polygon(0 2px, 2px 2px, 2px 0, calc(100% - 2px) 0, calc(100% - 2px) 2px, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 2px calc(100% - 2px), 0 calc(100% - 2px))`
                             }}>
                          <div className="text-white/80 text-sm mb-1 font-mono">ข้อมูลเดือน</div>
                          <div className="text-white font-medium font-mono">
                            {cab?.month && cab?.year
                              ? `${thaiMonths[(cab.month ?? 1) - 1]} ${cab.year + 543}`
                              : "-"}
                          </div>
                        </div>
                        
                        <div className="bg-white/20 border-2 border-white/50 p-3 backdrop-blur-sm"
                             style={{
                               clipPath: `polygon(0 2px, 2px 2px, 2px 0, calc(100% - 2px) 0, calc(100% - 2px) 2px, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 2px calc(100% - 2px), 0 calc(100% - 2px))`
                             }}>
                          <div className="flex items-center justify-between">
                            <span className="text-white/90 text-sm font-mono">จำนวนตาราง</span>
                            <div className="flex items-center">
                              <span className="text-2xl font-bold text-white mr-1 font-mono">
                                {cab?.tableCount ?? 0}
                              </span>
                              <span className="text-white/80 text-sm font-mono">ตาราง</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* 8-bit style click indicator */}
                      <div className="mt-4 text-center">
                        <div className="inline-flex items-center text-white/80 text-sm group-hover:text-white transition-colors font-mono">
                          <span className="mr-1">คลิกเพื่อดูรายละเอียด</span>
                          <span className="transform group-hover:translate-x-1 transition-transform text-lg">►</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Pixelated pulse animation for active cabinets */}
                    {cab && cab.tableCount && cab.tableCount > 0 && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 animate-pulse border-2 border-green-600"
                           style={{
                             clipPath: `polygon(0 2px, 2px 2px, 2px 0, calc(100% - 2px) 0, calc(100% - 2px) 2px, 100% 2px, 100% calc(100% - 2px), calc(100% - 2px) calc(100% - 2px), calc(100% - 2px) 100%, 2px 100%, 2px calc(100% - 2px), 0 calc(100% - 2px))`
                           }}>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Summary section with 8-bit styling */}
          <div className="mt-12 max-w-4xl mx-auto">
            <div className="bg-white/90 backdrop-blur-sm p-6 border-4 border-gray-800"
                 style={{
                   clipPath: `polygon(0 8px, 8px 8px, 8px 0, calc(100% - 8px) 0, calc(100% - 8px) 8px, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 8px calc(100% - 8px), 0 calc(100% - 8px))`,
                   boxShadow: `8px 8px 0px rgba(0,0,0,0.3), 4px 4px 0px rgba(0,0,0,0.2)`
                 }}>
              <h3 className="text-lg font-bold text-gray-800 mb-4 font-mono">สรุปภาพรวม</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-100 border-2 border-blue-600"
                     style={{
                       clipPath: `polygon(0 4px, 4px 4px, 4px 0, calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px))`
                     }}>
                  <div className="text-2xl font-bold text-blue-600 font-mono">9</div>
                  <div className="text-gray-600 text-sm font-mono">ตู้ทั้งหมด</div>
                </div>
                <div className="text-center p-4 bg-green-100 border-2 border-green-600"
                     style={{
                       clipPath: `polygon(0 4px, 4px 4px, 4px 0, calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px))`
                     }}>
                  <div className="text-2xl font-bold text-green-600 font-mono">
                    {cabinets.filter(c => c?.tableCount && c.tableCount > 0).length}
                  </div>
                  <div className="text-gray-600 text-sm font-mono">ตู้ที่มีข้อมูล</div>
                </div>
                <div className="text-center p-4 bg-purple-100 border-2 border-purple-600"
                     style={{
                       clipPath: `polygon(0 4px, 4px 4px, 4px 0, calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px))`
                     }}>
                  <div className="text-2xl font-bold text-purple-600 font-mono">
                    {cabinets.reduce((sum, c) => sum + (c?.tableCount || 0), 0)}
                  </div>
                  <div className="text-gray-600 text-sm font-mono">ตารางรวม</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}