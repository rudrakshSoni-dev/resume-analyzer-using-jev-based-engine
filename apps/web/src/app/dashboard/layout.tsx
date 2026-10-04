'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    api.me()
      .then((user) => setEmail(user.email))
      .catch(() => {
        // middleware should catch this, but just in case
        router.push('/login');
      });
  }, [router]);

  const handleLogout = async () => {
    try {
      await api.logout();
      router.push('/login');
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F0]">
      <header className="bg-white border-b-2 border-black px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="font-bold uppercase tracking-widest text-black text-xl">
          JEV <span className="text-[#FFC107]">Analyzer</span>
        </h1>
        
        <div className="flex items-center gap-6">
          <span className="text-sm font-bold text-gray-600 lowercase">{email || 'loading...'}</span>
          <Button variant="secondary" onClick={handleLogout} className="!py-1.5 !px-4 !text-sm">
            LOG OUT
          </Button>
        </div>
      </header>
      
      <main className="max-w-5xl mx-auto p-6 md:p-12">
        {children}
      </main>
    </div>
  );
}
