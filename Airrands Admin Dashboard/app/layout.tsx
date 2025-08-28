import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from './providers';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Airrands Admin",
  description: "Admin dashboard for Airrands delivery platform",
};

export default function RootLayout({ children,}: { children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className + " bg-gradient-to-br from-[#FFF6E9] to-[#EDF2F7] min-h-screen"}>
        <Providers>
          {/* Top Navigation Bar */}
          <nav className="w-full flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-lg shadow-md border-b border-[#E2E8F0] sticky top-0 z-20">
            <div className="flex items-center gap-2">
              <svg className="w-8 h-8 text-[#E89C31] drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="8" fill="#E89C31" />
                <text x="10" y="15" textAnchor="middle" fontSize="10" fill="#FFF6E9" fontWeight="bold">A</text>
              </svg>
              <span className="ml-2 text-xl font-extrabold text-[#2D3748] tracking-tight">Airrands Admin</span>
            </div>
            <div className="flex items-center gap-4">
              {/* Placeholder for user avatar */}
              <div className="w-10 h-10 rounded-full bg-[#E2E8F0] flex items-center justify-center text-[#2D3748] font-bold text-lg shadow-inner">
                <svg className="w-6 h-6 text-[#A0AEC0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
          </nav>
          <main className="pt-8 pb-12 px-4 sm:px-8 max-w-7xl mx-auto w-full">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
