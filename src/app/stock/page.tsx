"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Header from "../../components/Header";
import { FaPlus, FaChevronLeft, FaChevronRight } from "react-icons/fa";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStockNumber, setNewStockNumber] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const itemsPerPage = 9;

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
        // Check admin status
        const roleRes = await fetch('/api/auth/check-role');
        if (roleRes.ok) {
          const roleData = await roleRes.json();
          setIsAdmin(roleData.role === 'admin');
        }

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
        console.error("Error fetching data:", error);
        setError(error instanceof Error ? error.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAddStock = async () => {
    if (!newStockNumber || isNaN(Number(newStockNumber)) || Number(newStockNumber) <= 0) {
      alert('กรุณากรอกหมายเลข Stock ที่ถูกต้อง');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'addStock',
          stockNumber: Number(newStockNumber)
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        // Refresh the stock list
        const res = await fetch("/api/stock");
        const data = await res.json();
        setCabinets(data);
        setShowAddModal(false);
        setNewStockNumber('');
      } else {
        throw new Error(result.error || 'Failed to add stock');
      }
    } catch (error) {
      console.error('Error adding stock:', error);
      alert(error instanceof Error ? error.message : 'Failed to add stock');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <div className="font-semibold">ไม่พบข้อมูล</div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <Header />
      <div className="pt-0 min-h-screen">
        <div className="px-6 pt-2 pb-6">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold mb-2">
              <div className="flex justify-center space-x-1">
                {"Let's Manage".split('').map((letter, index) => (
                  <motion.span
                    key={index}
                    className="inline-block bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent"
                    animate={{
                      y: [0, -10, 0],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      repeatType: "loop",
                      delay: index * 0.3,
                      ease: "easeInOut",
                    }}
                  >
                    {letter === ' ' ? '\u00A0' : letter}
                  </motion.span>
                ))}
              </div>
            </h1>
            <p className="text-gray-600">เลือกStockที่ต้องการดูข้อมูล</p>
          </div>
          
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Stock ทั้งหมด</h2>
                <p className="text-gray-600 text-sm mt-1">
                  แสดง {Math.min((currentPage - 1) * itemsPerPage + 1, cabinets.length)}-{Math.min(currentPage * itemsPerPage, cabinets.length)} จากทั้งหมด {cabinets.length} รายการ
                </p>
              </div>
              
              <div className="flex items-center gap-4 w-full sm:w-auto">
                {/* Pagination */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaChevronLeft />
                  </button>
                  
                  {Array.from({ length: Math.ceil(cabinets.length / itemsPerPage) }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 text-sm rounded-md ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(cabinets.length / itemsPerPage), p + 1))}
                    disabled={currentPage >= Math.ceil(cabinets.length / itemsPerPage)}
                    className="p-2 rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaChevronRight />
                  </button>
                </div>
                
                {/* Add Stock Button */}
                {isAdmin && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex-shrink-0 flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    <FaPlus className="mr-2" />
                    เพิ่ม Stock
                  </button>
                )}
              </div>
            </div>

          {/* Add Stock Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-xl font-bold mb-4">เพิ่ม Stock ใหม่</h3>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">หมายเลข Stock</label>
                  <input
                    type="number"
                    value={newStockNumber}
                    onChange={(e) => setNewStockNumber(e.target.value ? parseInt(e.target.value) : '')}
                    className="w-full p-2 border rounded"
                    placeholder="ระบุหมายเลข Stock"
                    min="1"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setNewStockNumber('');
                    }}
                    className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                    disabled={isSubmitting}
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleAddStock}
                    disabled={isSubmitting || !newStockNumber}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSubmitting ? 'กำลังเพิ่ม...' : 'เพิ่ม Stock'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {cabinets
              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
              .map((cab, i) => {
                const indexInPage = ((currentPage - 1) * itemsPerPage) + i;
                const colorClass = cabinetColors[indexInPage % cabinetColors.length];
                
                return (
                  <div
                    key={cab.id}
                    onClick={() => handleCabinetClick(cab.id)}
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
                        <h2 className="text-xl font-bold text-white font-mono">{`Stock ${cab.id}`}</h2>
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
                  <div className="text-gray-600 text-sm font-mono">Stockทั้งหมด</div>
                </div>
                <div className="text-center p-4 bg-green-100 border-2 border-green-600"
                     style={{
                       clipPath: `polygon(0 4px, 4px 4px, 4px 0, calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px))`
                     }}>
                  <div className="text-2xl font-bold text-green-600 font-mono">
                    {cabinets.filter(c => c?.tableCount && c.tableCount > 0).length}
                  </div>
                  <div className="text-gray-600 text-sm font-mono">Stockที่มีข้อมูล</div>
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
      
      <style jsx global>{`
        /* Gradient animation keyframes */
        @keyframes gradient-x {
          0%, 100% {
            background-size: 200% 200%;
            background-position: left center;
          }
          50% {
            background-size: 200% 200%;
            background-position: right center;
          }
        }
        
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
          display: inline-block;
        }
      `}</style>
    </>
  );
}