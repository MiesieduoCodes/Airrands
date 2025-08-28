'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface Stats {
  totalRunners: number;
  totalSellers: number;
  pendingRunners: number;
  pendingSellers: number;
  totalPayments: number;
  pendingPayments: number;
  pendingVerifications: number;
  totalVerifications: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalRunners: 0,
    totalSellers: 0,
    pendingRunners: 0,
    pendingSellers: 0,
    totalPayments: 0,
    pendingPayments: 0,
    pendingVerifications: 0,
    totalVerifications: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch runners
        const runnersSnapshot = await getDocs(collection(db, 'runners'));
        const pendingRunnersSnapshot = await getDocs(
          query(collection(db, 'runners'), where('status', '==', 'pending'))
        );

        // Fetch sellers
        const sellersSnapshot = await getDocs(collection(db, 'sellers'));
        const pendingSellersSnapshot = await getDocs(
          query(collection(db, 'sellers'), where('status', '==', 'pending'))
        );

        // Fetch payments
        const paymentsSnapshot = await getDocs(collection(db, 'payments'));
        const pendingPaymentsSnapshot = await getDocs(
          query(collection(db, 'payments'), where('status', '==', 'pending'))
        );

        // Fetch verifications
        const verificationsSnapshot = await getDocs(collection(db, 'verification'));
        const pendingVerificationsSnapshot = await getDocs(
          query(collection(db, 'verification'), where('status', '==', 'pending'))
        );

        setStats({
          totalRunners: runnersSnapshot.size,
          totalSellers: sellersSnapshot.size,
          pendingRunners: pendingRunnersSnapshot.size,
          pendingSellers: pendingSellersSnapshot.size,
          totalPayments: paymentsSnapshot.size,
          pendingPayments: pendingPaymentsSnapshot.size,
          totalVerifications: verificationsSnapshot.size,
          pendingVerifications: pendingVerificationsSnapshot.size,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Total Runners',
      value: stats.totalRunners,
      change: `${stats.pendingRunners} pending`,
      changeType: 'increase',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    },
    {
      title: 'Total Sellers',
      value: stats.totalSellers,
      change: `${stats.pendingSellers} pending`,
      changeType: 'increase',
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    },
    {
      title: 'Pending Verifications',
      value: stats.pendingVerifications,
      change: `${stats.totalVerifications} total`,
      changeType: 'increase',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
      title: 'Total Payments',
      value: stats.totalPayments,
      change: `${stats.pendingPayments} pending`,
      changeType: 'increase',
      icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gradient-to-br from-[#FFF6E9] to-[#EDF2F7]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E89C31]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF6E9] to-[#EDF2F7] py-8 px-4 sm:px-8 relative overflow-hidden">
      {/* Animated background shapes */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#E89C31] opacity-20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#2D3748] opacity-10 rounded-full blur-3xl animate-pulse" />
      </div>
      <div className="relative z-10">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-extrabold text-[#2D3748] tracking-tight drop-shadow-sm">Dashboard</h1>
          <p className="text-lg text-[#718096]">Welcome to the admin dashboard</p>
      </div>

        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        {statCards.map((card) => (
          <div
            key={card.title}
              className="backdrop-blur-lg bg-white/70 shadow-2xl rounded-2xl border border-[#E2E8F0] hover:shadow-[#E89C31]/30 hover:scale-[1.03] transition-all duration-200 group cursor-pointer"
          >
              <div className="p-6 flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-[#FFF6E9] rounded-xl flex items-center justify-center group-hover:bg-[#E89C31]/20 transition-colors duration-200">
                    <svg
                      className="w-7 h-7 text-[#E89C31]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={card.icon}
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-6 w-0 flex-1">
                  <dl>
                    <dt className="text-base font-semibold text-[#2D3748] truncate">
                      {card.title}
                    </dt>
                    <dd>
                      <div className="text-2xl font-bold text-[#2D3748]">
                        {card.value}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="bg-[#EDF2F7] px-6 py-3 rounded-b-2xl">
              <div className="text-sm">
                  <span className="text-[#48BB78] font-medium">
                  {card.change}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="backdrop-blur-lg bg-white/70 shadow-2xl rounded-2xl border border-[#E2E8F0] p-8">
            <h3 className="text-xl font-bold text-[#2D3748] mb-6">
            Quick Actions
          </h3>
            <div className="space-y-4">
            <a
              href="/dashboard/verifications"
                className="block w-full text-left px-5 py-3 text-base font-semibold text-[#2D3748] hover:bg-[#E89C31]/10 rounded-xl transition-colors duration-200"
            >
              Review Pending Verifications ({stats.pendingVerifications})
            </a>
            <a
              href="/dashboard/runners"
                className="block w-full text-left px-5 py-3 text-base font-semibold text-[#2D3748] hover:bg-[#E89C31]/10 rounded-xl transition-colors duration-200"
            >
              Review Pending Runners ({stats.pendingRunners})
            </a>
            <a
              href="/dashboard/sellers"
                className="block w-full text-left px-5 py-3 text-base font-semibold text-[#2D3748] hover:bg-[#E89C31]/10 rounded-xl transition-colors duration-200"
            >
              Review Pending Sellers ({stats.pendingSellers})
            </a>
            <a
              href="/dashboard/payments"
                className="block w-full text-left px-5 py-3 text-base font-semibold text-[#2D3748] hover:bg-[#E89C31]/10 rounded-xl transition-colors duration-200"
            >
              Review Pending Payments ({stats.pendingPayments})
            </a>
          </div>
        </div>

          <div className="backdrop-blur-lg bg-white/70 shadow-2xl rounded-2xl border border-[#E2E8F0] p-8 flex flex-col items-center justify-center min-h-[220px]">
            <h3 className="text-xl font-bold text-[#2D3748] mb-6">
            Recent Activity
          </h3>
            <div className="text-base text-[#718096] flex flex-col items-center">
              <svg className="w-16 h-16 mb-2 text-[#E89C31]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="10" stroke="#E89C31" strokeWidth="2" fill="#FFF6E9" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h4m0 0h4m-4 0v4m0-4V8" stroke="#E89C31" />
              </svg>
            <p>No recent activity to display.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 