"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { isWithinAllowedTime } from "@/utils/timeCheck";

interface DbUser {
  _id?: string;
  username?: string;
  display?: string;
  role?: string;
}

export default function Header() {
  const [user, setUser] = useState<DbUser | null>(() => {
    if (typeof window !== "undefined") {
      // Primary: user object saved at login
      try {
        const raw = window.localStorage.getItem("user");
        if (raw) {
          const parsed = JSON.parse(raw) as DbUser;
          if (parsed && (parsed.display || parsed.username)) return parsed;
        }
      } catch {}

      // Fallbacks
      const d =
        window.localStorage.getItem("display") ||
        window.sessionStorage.getItem("display") ||
        (() => {
          const m = document.cookie.match(/(?:^|; )display=([^;]*)/);
          return m ? decodeURIComponent(m[1]) : null;
        })();
      if (d) return { display: d };
    }
    return null;
  });
  const [displayName, setDisplayName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      // Prefer display from saved user object
      try {
        const raw = window.localStorage.getItem("user");
        if (raw) {
          const parsed = JSON.parse(raw) as DbUser;
          if (parsed?.display) return parsed.display;
          if (parsed?.username) return parsed.username;
        }
      } catch {}

      const d =
        window.localStorage.getItem("display") ||
        window.sessionStorage.getItem("display") ||
        (() => {
          const m = document.cookie.match(/(?:^|; )display=([^;]*)/);
          return m ? decodeURIComponent(m[1]) : null;
        })();
      if (d) return d;
      const id =
        window.localStorage.getItem("username") ||
        window.localStorage.getItem("employeeId") ||
        window.sessionStorage.getItem("username") ||
        window.sessionStorage.getItem("employeeId") ||
        (() => {
          const mu = document.cookie.match(/(?:^|; )username=([^;]*)/);
          const me = document.cookie.match(/(?:^|; )employeeId=([^;]*)/);
          return mu ? decodeURIComponent(mu[1]) : me ? decodeURIComponent(me[1]) : "";
        })();
      return id || "";
    }
    return "";
  });
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [timeStr, setTimeStr] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");

  // real-time clock (Thai locale) - Using time slots from timeCheck.ts
  useEffect(() => {
    const formatNow = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      
      // Format time with leading zeros
      const formatNum = (num: number) => num.toString().padStart(2, '0');
      const time = `${formatNum(hours)}:${formatNum(minutes)}:${formatNum(seconds)}`;
      
      const date = now.toLocaleDateString("th-TH", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      
      return { time, date };
    };
    
    const updateTime = () => {
      const { time, date } = formatNow();
      setTimeStr(time);
      setCurrentDate(date);
    };
    
    updateTime();
    const t = setInterval(updateTime, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (typeof window !== "undefined") {
          // 0) Try to use full user object from localStorage (set at login)
          try {
            const raw = window.localStorage.getItem("user");
            if (raw) {
              const parsed = JSON.parse(raw) as DbUser;
              if (parsed) {
                setUser(parsed);
                if (parsed.display) setDisplayName(parsed.display);
                else if (parsed.username) setDisplayName(parsed.username);
                return;
              }
            }
          } catch {}

          // 1) If display is already known, use it directly (no API call)
          const storedDisplay =
            window.localStorage.getItem("display") ||
            window.sessionStorage.getItem("display") ||
            (() => {
              const m = document.cookie.match(/(?:^|; )display=([^;]*)/);
              return m ? decodeURIComponent(m[1]) : null;
            })();
          if (storedDisplay) {
            setUser({ display: storedDisplay });
            setDisplayName(storedDisplay);
            return;
          }
          // 2) If we have an id, fetch from API
          const storedId =
            window.localStorage.getItem("username") ||
            window.localStorage.getItem("employeeId") ||
            window.sessionStorage.getItem("username") ||
            window.sessionStorage.getItem("employeeId") ||
            (() => {
              const mu = document.cookie.match(/(?:^|; )username=([^;]*)/);
              const me = document.cookie.match(/(?:^|; )employeeId=([^;]*)/);
              return mu ? decodeURIComponent(mu[1]) : me ? decodeURIComponent(me[1]) : null;
            })();
          if (storedId) {
            // show the id immediately as a temporary display
            setDisplayName((prev) => prev || storedId);
            const res = await fetch(`/api/users/${encodeURIComponent(storedId)}`, { cache: "no-store" });
            if (res.ok) {
              const data = await res.json();
              if (data?.user) {
                setUser(data.user);
                if (data.user.display) {
                  setDisplayName(data.user.display);
                  try { window.localStorage.setItem("display", data.user.display); } catch {}
                }
                return;
              }
            }
          }
        }

        // Fallback: fetch list and take first
        const resAll = await fetch("/api/users", { cache: "no-store" });
        if (resAll.ok) {
          const dataAll = await resAll.json();
          const u = Array.isArray(dataAll?.users) && dataAll.users.length > 0 ? dataAll.users[0] : null;
          setUser(u);
          if (u?.display) {
            setDisplayName(u.display);
            try { window.localStorage.setItem("display", u.display); } catch {}
          }
        }
      } catch (e) {
        // ignore
      }
    };
    fetchUser();
  }, []);

  // close dropdown when clicking outside
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const logout = async () => {
    try {
      setOpen(false);
      try {
        window.localStorage.removeItem("user");
        window.localStorage.removeItem("display");
        window.localStorage.removeItem("username");
        window.localStorage.removeItem("employeeId");
      } catch {}
      router.push("/");
    } catch (e) {
      // ignore
    }
  };

  return (
    <>
      <header className="sticky top-0 left-0 right-0 z-50 w-full bg-white/95 backdrop-blur-lg shadow-lg border-b border-blue-100">
        <div className="w-full px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Brand Section - Enhanced with Check Stock OR gradient */}
            <div className="flex items-center gap-4 select-none">
              <div className="relative group">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
                  <img
                    src="/ram-logo.jpg"
                    alt="RAM Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <div className="relative">
                  {/* Main gradient text with Check Stock OR style */}
                  <span className="font-black text-xl sm:text-2xl md:text-3xl leading-tight relative">
                    <span className="bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent animate-gradient-x">
                    OR stock management
                    </span>
                  </span>
                  
                  {/* Animated background glow */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-emerald-400/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                </div>
                
                <span className="text-xs sm:text-sm text-gray-500 font-medium tracking-wide">
                  Inventory Management System
                </span>
              </div>
            </div>

            {/* Enhanced Time Display */}
            <div className="hidden sm:flex flex-col items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl px-4 py-2 shadow-inner border border-blue-100">
              <div className={`text-lg md:text-xl font-mono font-bold tracking-wider tabular-nums transition-colors duration-1000 ${isWithinAllowedTime() ? 'text-blue-400' : 'text-red-600'}`}>
                {timeStr}
              </div>
              <div className="text-xs text-gray-600 font-medium mt-1 text-center leading-tight">
                {currentDate}
              </div>
            </div>

            {/* Mobile Time Display */}
            <div className="sm:hidden flex flex-col items-center">
              <div className={`text-sm font-mono font-bold tracking-wide tabular-nums transition-colors duration-1000 ${isWithinAllowedTime() ? 'text-blue-400' : 'text-red-600'}`}>
                {timeStr}
              </div>
              <div className="text-xs text-gray-500 font-medium">
                {currentDate.split(' ')[0]} {/* Just show day name on mobile */}
              </div>
            </div>

            {/* Enhanced User Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-3 bg-gradient-to-r from-white to-blue-50 hover:from-blue-50 hover:to-indigo-50 text-blue-900 px-4 py-3 rounded-2xl shadow-lg border border-blue-200/50 hover:border-blue-300 transition-all duration-300 hover:shadow-xl group min-w-[8rem] sm:min-w-[12rem]"
                aria-haspopup="menu"
                aria-expanded={open}
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                  <img
                    src="/Instigator.jpg"
                    alt="user"
                    className="relative w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-xl shadow-md border-2 border-white"
                  />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white shadow-sm animate-pulse"></div>
                </div>
                
                <div className="flex-1 text-left">
                  <div className="text-sm font-bold text-gray-800 truncate max-w-[6rem] sm:max-w-[10rem]">
                    {displayName || user?.display || user?.username || "ผู้ใช้งาน"}
                  </div>
                  <div className="text-xs text-gray-500 font-medium">
                    Online
                  </div>
                </div>
                
                <svg
                  className={`w-5 h-5 text-blue-600 transition-transform duration-300 ${open ? "rotate-180" : "rotate-0"}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Enhanced Dropdown */}
              {open && (
                <div
                  role="menu"
                  className="absolute right-0 mt-3 w-56 bg-white/95 backdrop-blur-lg shadow-2xl rounded-2xl border border-blue-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50"
                >
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-blue-100">
                    <div className="flex items-center gap-3">
                      <img
                        src="/Instigator.jpg"
                        alt="user"
                        className="w-10 h-10 object-cover rounded-xl shadow-sm border border-blue-200"
                      />
                      <div>
                        <p className="text-sm font-bold text-gray-800 truncate">
                          {displayName || user?.display || user?.username || "ผู้ใช้งาน"}
                        </p>
                        <p className="text-xs text-gray-500 font-medium">
                          เข้าสู่ระบบแล้ว
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-2">
                    <button
                      onClick={logout}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-red-50 text-red-600 font-semibold transition-all duration-200 flex items-center gap-3 group"
                      role="menuitem"
                    >
                      <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      ออกจากระบบ
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Decorative bottom border - full viewport width */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-screen h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400 z-0 pointer-events-none"></div>
      </header>

      <style jsx>{`
        .tabular-nums {
          font-variant-numeric: tabular-nums;
        }
        
        @keyframes animate-in {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .animate-in {
          animation: animate-in 0.2s ease-out;
        }
        
        .fade-in {
          animation-name: fade-in;
        }
        
        .slide-in-from-top-2 {
          animation-name: slide-in-from-top;
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slide-in-from-top {
          from { transform: translateY(-8px); }
          to { transform: translateY(0); }
        }
        
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
        }
        
        /* Enhanced gradient effects */
        .group:hover .animate-gradient-x {
          animation-duration: 1.5s;
        }
      `}</style>
    </>
  );
}