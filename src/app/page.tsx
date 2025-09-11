"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StockORLoginPage() {
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<{display?: string; role?: string} | null>(null);
  const router = useRouter();

  // Fetch user info when employeeId changes
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!employeeId.trim()) {
        setUserInfo(null);
        return;
      }

      try {
        const response = await fetch(`/api/users/${employeeId.trim()}`);
        if (response.ok) {
          const data = await response.json();
          setUserInfo(data.user);
        } else {
          setUserInfo(null);
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
        setUserInfo(null);
      }
    };

    // Add debounce to prevent too many API calls
    const timer = setTimeout(fetchUserInfo, 500);
    return () => clearTimeout(timer);
  }, [employeeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    console.log("🚀 Starting login process...");

    if (!employeeId.trim() || !password) {
      setError("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
      setIsLoading(false);
      return;
    }

    try {
      console.log("📤 Sending login request...");

      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: employeeId.trim(),
          password: password,
        }),
      });

      console.log("📥 Received response status:", response.status);

      const contentType = response.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
        console.log("Response data:", data);
      } else {
        const text = await response.text();
        console.error("❌ Non-JSON response:", text);
        throw new Error("ได้รับข้อมูลที่ไม่ถูกต้องจากเซิร์ฟเวอร์");
      }

      if (!response.ok) {
        console.error("❌ API Error:", data);
        throw new Error(data.error || `เกิดข้อผิดพลาด (${response.status})`);
      }

      if (data && data.success) {
        console.log("✅ Login successful, storing user data");
        if (typeof window !== "undefined") {
          localStorage.setItem("user", JSON.stringify(data.user));
          console.log("💾 User data stored in localStorage");
        }
        console.log("🔄 Redirecting to /stock");
        router.push("/stock");
      } else {
        console.error("❌ Login failed:", data);
        throw new Error(data.error || "การเข้าสู่ระบบล้มเหลว");
      }
    } catch (err) {
      console.error("❌ Login error:", err);
      let errorMessage = "เกิดข้อผิดพลาดในการเข้าสู่ระบบ";
      if (err instanceof Error) errorMessage = err.message;
      else if (typeof err === "string") errorMessage = err;
      setError(errorMessage);
    } finally {
      console.log("Login process completed");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative">
      {/* Left Side - Illustration */}
      <div className="flex-1 relative overflow-hidden block -mr-0 md:-mr-4 h-80 md:h-auto">
        <div
          className="absolute inset-0 md:relative md:max-w-3xl md:mx-auto md:my-auto md:h-4/5 md:w-4/5"
          style={{
            backgroundImage: "url(/69507-tux-icons-computer-linux-free-download-png-hd.png)",
            animation: "bounce 15s ease-in-out infinite",
            backgroundPosition: "center",
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            height: "100%",
            width: "100%",
            maxWidth: "500px",
          }}
        >
          <style jsx global>{`
            @keyframes bounce {
              0%,
              100% {
                transform: scale(1) translateY(0);
              }
              50% {
                transform: scale(1.05) translateY(-10px);
              }
            }
          `}</style>
        </div>
        <div className="relative z-10 h-full flex items-center justify-center p-12">
          <div className="max-w-md"></div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 relative z-10">
        <div className="w-full max-w-md mx-auto bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/50 p-6 sm:p-8">
          <div className="mb-8 text-center">
            <div className="flex flex-col items-center mb-6">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-300 to-blue-500 rounded-xl blur-sm opacity-50 group-hover:opacity-70 transition duration-200"></div>
                <div className="relative">
                  <img
                    src="/ram-logo.jpg"
                    alt="RAM Hospital Logo"
                    className="w-40 h-40 sm:w-48 sm:h-48 md:w-55 md:h-55 mb-6 rounded-lg object-cover border-4 border-white shadow-lg"
                  />
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-3xl font-bold">
                  <span className="bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 bg-clip-text text-transparent">
                    <span className="text-blue-700">Check</span>{' '}
                    <span className="text-blue-500">Stock</span>{' '}
                    <span className="text-blue-400">OR</span>
                  </span>
                </span>
              </div>
            </div>
            <p className="text-gray-600">ยินดีต้อนรับสู่ระบบจัดการสต็อกห้องผ่าตัด</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-2">
                รหัสพนักงาน
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="employeeId"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="กรอกรหัสพนักงาน"
                  disabled={isLoading}
                />
                {userInfo?.display && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-md">
                    {userInfo.display}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                รหัสผ่าน
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="กรอกรหัสผ่าน"
                disabled={isLoading}
              />
            </div>

            {error && <div className="text-red-500 text-sm mb-4 p-2 bg-red-50 rounded-lg">{error}</div>}

            <button
              type="submit"
              disabled={isLoading}
              className={`relative w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-xl font-medium overflow-hidden group ${
                isLoading ? "opacity-70 cursor-not-allowed" : "hover:shadow-lg active:scale-95"
              } transition-all duration-300 ease-out`}
            >
              <span className="relative z-10">
                {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
              </span>
              {/* Hover effect */}
              <span className="absolute inset-0 w-0 bg-white/20 group-hover:w-full transition-all duration-300 ease-out"></span>
              {/* Ripple effect */}
              <span className="absolute inset-0 rounded-xl opacity-0 group-active:opacity-30 group-active:bg-white group-active:animate-ripple"></span>
              
              {/* Add animation keyframes */}
              <style jsx global>{`
                @keyframes ripple {
                  to {
                    transform: scale(4);
                    opacity: 0;
                  }
                }
                .animate-ripple {
                  animation: ripple 0.6s ease-out;
                }
              `}</style>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
