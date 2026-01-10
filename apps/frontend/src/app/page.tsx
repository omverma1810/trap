'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/dashboard');
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-charcoal-50">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-xl bg-primary-600 flex items-center justify-center mb-4">
          <span className="text-white font-bold text-2xl">T</span>
        </div>
        <h1 className="text-2xl font-bold text-charcoal-900 mb-2">Trap Inventory</h1>
        <p className="text-charcoal-500">Loading...</p>
      </div>
    </main>
  );
}
