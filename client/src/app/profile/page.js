"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";
import { motion } from "framer-motion";
import { 
  HiOutlineUser, 
  HiOutlineEnvelope, 
  HiOutlineCalendar, 
  HiOutlineArrowRightOnRectangle,
  HiOutlineShieldCheck
} from "react-icons/hi2";
import { APP_NAME } from "@/lib/constants";

export default function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
        </div>
        <Footer />
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      <Navbar />

      <main className="flex-1 mt-24 mb-12 max-w-4xl mx-auto w-full px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">
              Your Profile
            </h1>
            <p className="text-[var(--text-secondary)] mt-1">
              Manage your account and learning preferences
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Sidebar / Identity */}
            <div className="md:col-span-1">
              <div className="glass-card p-8 text-center sticky top-28">
                <div 
                  className="w-24 h-24 rounded-3xl mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold shadow-xl"
                  style={{
                    background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
                  }}
                >
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">
                  {user.name}
                </h2>
                <p className="text-sm text-[var(--text-muted)] mb-6">
                  {APP_NAME} Member
                </p>
                
                <button
                  onClick={handleLogout}
                  className="btn btn-secondary w-full flex items-center justify-center gap-2 text-sm"
                >
                  <HiOutlineArrowRightOnRectangle className="w-5 h-5" />
                  Sign Out
                </button>
              </div>
            </div>

            {/* Main Info */}
            <div className="md:col-span-2 space-y-6">
              <div className="glass-card p-8">
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 border-b border-[var(--glass-border)] pb-4">
                  Account Details
                </h3>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[rgba(37,99,235,0.1)] flex items-center justify-center text-[var(--primary)] shrink-0">
                      <HiOutlineUser className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Full Name</p>
                      <p className="text-[var(--text-primary)] font-medium">{user.name}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[rgba(139,92,246,0.1)] flex items-center justify-center text-[var(--accent)] shrink-0">
                      <HiOutlineEnvelope className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Email Address</p>
                      <p className="text-[var(--text-primary)] font-medium">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[rgba(16,185,129,0.1)] flex items-center justify-center text-[var(--success)] shrink-0">
                      <HiOutlineShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Account Status</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
                        <p className="text-[var(--text-primary)] font-medium">Verified Account</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preferences Placeholder */}
              <div className="glass-card p-8 opacity-75 grayscale-[0.5]">
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">
                  Platform Preferences
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Preference settings (Dark Mode, Voice Over, Notifications) are coming soon to the {APP_NAME} profile dashboard.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
