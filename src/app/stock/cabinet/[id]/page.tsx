"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "../../../../components/Header";
import Swal from 'sweetalert2';

interface StockRecord {
  date: number;
  stock: number;
}

interface Device {
  id: number;
  name: string;
  initialStock: number;
  stockRecords: StockRecord[];
}

interface CabinetData {
  id: number;
  name: string;
  month: number;
  year: number;
  devices: Device[];
  lastUpdated?: string;
}

export default function CabinetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [cabinet, setCabinet] = useState<CabinetData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDeleteId, setSelectedDeleteId] = useState<number | null>(null);
  
  // Thai month names for display
  const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
  ];
  
  // Cabinet color themes - same as main page
  const cabinetColors = [
    "from-blue-500 to-blue-600 border-blue-200",
    "from-emerald-500 to-emerald-600 border-emerald-200", 
    "from-purple-500 to-purple-600 border-purple-200",
    "from-orange-500 to-orange-600 border-orange-200",
    "from-pink-500 to-pink-600 border-pink-200",
    "from-indigo-500 to-indigo-600 border-indigo-200",
    "from-teal-500 to-teal-600 border-teal-200",
    "from-red-500 to-red-600 border-red-200",
    "from-cyan-500 to-cyan-600 border-cyan-200",
  ];
  
  const displayBEYear = currentYear + 543;
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const dates = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  // Get cabinet color theme
  const cabinetId = Number(params.id);
  const colorClass = cabinetColors[(cabinetId - 1) % cabinetColors.length];

  // Fetch cabinet data
  useEffect(() => {
    // resolve role from localStorage or cookies
    try {
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem("user");
        if (raw) {
          const u = JSON.parse(raw) as { role?: string };
          if (u?.role) setIsAdmin(u.role === "admin");
        } else {
          const m = document.cookie.match(/(?:^|; )role=([^;]*)/);
          if (m) setIsAdmin(decodeURIComponent(m[1]) === "admin");
        }
      }
    } catch {}

    const fetchData = async () => {
      try {
        const query = new URLSearchParams({
          id: String(params.id),
          month: String(currentMonth),
          year: String(currentYear),
        }).toString();
        const res = await fetch(`/api/stock?${query}`);

        if (res.status === 404) {
          setCabinet({
            id: Number(params.id),
            name: `ตู้ ${params.id}`,
            month: currentMonth,
            year: currentYear,
            devices: [],
          });
          return;
        }
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data: CabinetData = await res.json();
        setCabinet({
          ...data,
          devices: Array.isArray(data.devices) ? data.devices : [],
        });
      } catch (error) {
        console.error("Error fetching cabinet data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [params.id, currentMonth, currentYear]);

  // Keep delete selector in sync with devices
  useEffect(() => {
    if (!cabinet) return;
    if (cabinet.devices.length === 0) {
      setSelectedDeleteId(null);
      return;
    }
    // If current selected id is missing, default to first device
    const exists = cabinet.devices.some((d) => d.id === selectedDeleteId);
    if (!exists) setSelectedDeleteId(cabinet.devices[0].id);
  }, [cabinet]);

  const updateInitialStock = async (deviceId: number, initialStock: number) => {
    try {
      await fetch("/api/stock", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cabinetId: Number(params.id),
          deviceId,
          year: currentYear,
          month: currentMonth,
          initialStock,
        }),
      });
    } catch (e) {
      console.error("Failed to update initialStock:", e);
    }
  };

  const deleteSelectedDevice = async () => {
    if (!cabinet || selectedDeleteId == null) return;
    
    const device = cabinet.devices.find((d) => d.id === selectedDeleteId);
    const deviceName = device?.name || 'อุปกรณ์นี้';
    
    const result = await Swal.fire({
      title: 'ยืนยันการลบ',
      text: `ต้องการลบอุปกรณ์ "${deviceName}" ใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    try {
      // Show loading
      Swal.fire({
        title: 'กำลังลบ...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newDevices = cabinet.devices.filter((d) => d.id !== selectedDeleteId);
      const newCabinet: CabinetData = { ...cabinet, devices: newDevices };
      setCabinet(newCabinet);
      
      // Show success message
      await Swal.fire({
        icon: 'success',
        title: 'ลบสำเร็จ!',
        text: `ลบอุปกรณ์ "${deviceName}" เรียบร้อยแล้ว`,
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#3085d6',
      });
      
    } catch (error) {
      console.error('Error deleting device:', error);
      await Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถลบอุปกรณ์ได้ กรุณาลองใหม่อีกครั้ง',
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#d33',
      });
    }
  };

  const addNewDevice = () => {
    if (!cabinet) return;
    
    const newDevice: Device = {
      id: cabinet.devices.length > 0 ? Math.max(...cabinet.devices.map(d => d.id)) + 1 : 1,
      name: `อุปกรณ์ ${cabinet.devices.length + 1}`,
      initialStock: 0,
      stockRecords: dates.map((d) => ({ date: d, stock: 0 })),
    };
    
    const newCabinet: CabinetData = {
      ...cabinet,
      devices: [...cabinet.devices, newDevice],
    };
    setCabinet(newCabinet);
  };

  const updateDeviceName = async (deviceId: number, name: string) => {
    try {
      await fetch("/api/stock", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cabinetId: Number(params.id),
          deviceId,
          year: currentYear,
          month: currentMonth,
          name,
        }),
      });
    } catch (e) {
      console.error("Failed to update device name:", e);
    }
  };

  const updateDailyStock = async (deviceId: number, day: number, stock: number) => {
    try {
      await fetch("/api/stock", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cabinetId: Number(params.id),
          deviceId,
          year: currentYear,
          month: currentMonth,
          day,
          stock,
        }),
      });
    } catch (e) {
      console.error("Failed to update stock:", e);
    }
  };

  const saveData = async () => {
    if (!cabinet) return;
    
    // Show loading
    Swal.fire({
      title: 'กำลังบันทึกข้อมูล...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    try {
      const res = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cabinet),
      });
      
      const data = await res.json();
      
      if (data.success) {
        await Swal.fire({
          icon: 'success',
          title: 'สำเร็จ!',
          text: 'บันทึกข้อมูลเรียบร้อยแล้ว',
          confirmButtonText: 'ตกลง',
          confirmButtonColor: '#3085d6',
        });
      } else {
        throw new Error(data.message || 'บันทึกไม่สำเร็จ');
      }
    } catch (error) {
      console.error("Error saving cabinet:", error);
      await Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: error instanceof Error ? error.message : 'ไม่สามารถบันทึกข้อมูลได้',
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#d33',
      });
    }
  };

  if (isLoading || !cabinet) {
    return (
      <>
        <Header />
        <div className="min-h-screen">
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-lg text-gray-600">กำลังโหลด...</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen">
        <div className="p-3 sm:p-4">
          {/* Header Section */}
          <div className={`mb-4 p-4 rounded-xl bg-gradient-to-br ${colorClass} shadow-md border backdrop-blur-sm`}>
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-3xl">📦</span>
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white">
                    {cabinet.name}
                  </h1>
                  <p className="text-white/80 text-sm sm:text-base">
                    {thaiMonths[currentMonth - 1]} {displayBEYear}
                  </p>
                </div>
              </div>
              
              {/* Month Navigation */}
              <div className="flex items-center gap-2 bg-white/20 rounded-lg p-2 backdrop-blur-sm">
                <button
                  onClick={() => {
                    setIsLoading(true);
                    setCurrentMonth((m) => {
                      if (m === 1) {
                        setCurrentYear((y) => y - 1);
                        return 12;
                      }
                      return m - 1;
                    });
                  }}
                  className="w-8 h-8 rounded-md bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all duration-200 hover:scale-105"
                  aria-label="เดือนก่อนหน้า"
                >
                  ◀
                </button>
                
                <select
                  className="bg-white/90 text-gray-800 px-2 py-1 rounded-md text-sm font-medium shadow-sm"
                  value={currentMonth}
                  onChange={(e) => { setIsLoading(true); setCurrentMonth(Number(e.target.value)); }}
                >
                  {thaiMonths.map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>{name}</option>
                  ))}
                </select>
                
                <select
                  className="bg-white/90 text-gray-800 px-2 py-1 rounded-md text-sm font-medium shadow-sm"
                  value={currentYear}
                  onChange={(e) => { setIsLoading(true); setCurrentYear(Number(e.target.value)); }}
                >
                  {Array.from({ length: 11 }, (_, i) => currentYear - 5 + i).map((y) => (
                    <option key={y} value={y}>{y + 543}</option>
                  ))}
                </select>
                
                <button
                  onClick={() => {
                    setIsLoading(true);
                    setCurrentMonth((m) => {
                      if (m === 12) {
                        setCurrentYear((y) => y + 1);
                        return 1;
                      }
                      return m + 1;
                    });
                  }}
                  className="w-8 h-8 rounded-md bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all duration-200 hover:scale-105"
                  aria-label="เดือนถัดไป"
                >
                  ▶
                </button>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
            <div className="overflow-x-auto">
              <div className="text-xs sm:text-sm">
                <table className="w-full table-fixed min-w-max">
                  <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
                    <tr>
                      <th className="border border-blue-200 px-2 py-3 text-center font-bold text-gray-700 idx-col">ลำดับ</th>
                      <th className="border border-blue-200 px-2 py-3 text-left font-bold text-gray-700 name-col">ชื่ออุปกรณ์</th>
                      <th className="border border-blue-200 px-2 py-3 text-center font-bold text-gray-700 stock-col">Stock</th>
                      {dates.map((d) => (
                        <th key={d} className="border border-blue-200 px-1 py-3 text-center font-bold text-gray-700 num-col">
                          {d}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(cabinet.devices ?? []).map((device, idx) => (
                      <tr key={device.id} className="hover:bg-blue-50/50 transition-colors group">
                        <td className="border border-gray-200 text-center py-2 idx-col bg-gray-50 font-semibold text-gray-600">
                          {idx + 1}
                        </td>
                        <td className="border border-gray-200 px-2 py-1 name-col">
                          <input
                            type="text"
                            value={device.name}
                            onChange={(e) => {
                              const newName = e.target.value;
                              setCabinet((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      devices: prev.devices.map((d) =>
                                        d.id === device.id ? { ...d, name: newName } : d
                                      ),
                                    }
                                  : prev
                              );
                              updateDeviceName(device.id, newName);
                            }}
                            className="w-full py-1 px-2 rounded border-0 bg-transparent focus:bg-white focus:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all"
                            placeholder="ชื่ออุปกรณ์"
                          />
                        </td>
                        <td className="border border-gray-200 text-center stock-col">
                          <input
                            type="number"
                            value={device.initialStock === 0 ? "" : device.initialStock}
                            onChange={(e) => {
                              const val = parseInt(e.target.value || "0");
                              setCabinet((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      devices: prev.devices.map((d) =>
                                        d.id === device.id ? { ...d, initialStock: val } : d
                                      ),
                                    }
                                  : prev
                              );
                              updateInitialStock(device.id, val);
                            }}
                            className="w-full text-center py-1 px-1 rounded border-0 bg-transparent focus:bg-white focus:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all"
                            placeholder=""
                          />
                        </td>
                        {(device.stockRecords ?? []).map((record) => (
                          <td key={record.date} className="border border-gray-200 text-center num-col px-0">
                            <input
                              type="number"
                              value={record.stock === 0 ? "" : record.stock}
                              onChange={(e) => {
                                const val = parseInt(e.target.value || "0");
                                setCabinet((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        devices: prev.devices.map((d) =>
                                          d.id === device.id
                                            ? {
                                                ...d,
                                                stockRecords: d.stockRecords.map((r) =>
                                                  r.date === record.date ? { ...r, stock: val } : r
                                                ),
                                              }
                                            : d
                                        ),
                                      }
                                    : prev
                                );
                                updateDailyStock(device.id, record.date, val);
                              }}
                              className="w-full text-center py-1 px-0.5 border-0 bg-transparent focus:bg-white focus:shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-300 transition-all text-xs"
                              placeholder=""
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Action Buttons (role-based) */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button 
              onClick={() => router.back()} 
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              กลับ
            </button>
            {isAdmin && (
              <>
                <button 
                  onClick={addNewDevice} 
                  className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  เพิ่มอุปกรณ์
                </button>

                {/* Delete device controls */}
                <div className="flex items-center gap-2">
                  <select
                    className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 shadow-sm min-w-[12rem]"
                    value={selectedDeleteId ?? ""}
                    onChange={(e) => setSelectedDeleteId(e.target.value ? Number(e.target.value) : null)}
                    disabled={!cabinet.devices || cabinet.devices.length === 0}
                  >
                    <option value="" disabled>
                      เลือกอุปกรณ์ที่จะลบ
                    </option>
                    {(cabinet.devices ?? []).map((d, idx) => (
                      <option key={d.id} value={d.id}>{idx + 1}. {d.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={deleteSelectedDevice}
                    disabled={!cabinet.devices || cabinet.devices.length === 0 || selectedDeleteId == null}
                    className="px-6 py-3 bg-red-500 disabled:bg-red-300 hover:bg-red-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" />
                    </svg>
                    ลบอุปกรณ์
                  </button>
                </div>
                
                <button 
                  onClick={saveData} 
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  บันทึก
                </button>
              </>
            )}
          </div>

          {/* Summary Info */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/20">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{cabinet.devices.length}</div>
                <div className="text-gray-600 text-sm font-medium">อุปกรณ์ทั้งหมด</div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/20">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {cabinet.devices.reduce((sum, d) => sum + d.initialStock, 0)}
                </div>
                <div className="text-gray-600 text-sm font-medium">Stock รวม</div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/20">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{daysInMonth}</div>
                <div className="text-gray-600 text-sm font-medium">วันในเดือน</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .idx-col { width: 3rem; }
        .stock-col { width: 4rem; }
        .num-col { width: 2.2rem; }
        .name-col { width: 16rem; }
        
        @media (max-width: 640px) {
          .idx-col { width: 2.5rem; }
          .stock-col { width: 3.5rem; }
          .num-col { width: 2rem; }
          .name-col { width: 12rem; }
        }
      `}</style>
    </>
  );
}