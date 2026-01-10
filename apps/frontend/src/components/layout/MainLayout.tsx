'use client';

import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div 
      className="min-h-screen flex"
      style={{ background: '#f8f9fa', backgroundImage: 'none' }}
    >
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen lg:min-w-0">
        <Header />
        <main 
          className="flex-1 p-6 overflow-auto"
          style={{ background: '#f8f9fa' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
