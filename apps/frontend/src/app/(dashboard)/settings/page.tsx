'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Bell,
  Shield,
  Store,
  Palette,
  Database,
  CreditCard,
  HelpCircle,
  ChevronRight,
  Save,
  Camera,
} from 'lucide-react';
import { Button, Card, Input, Badge } from '@/components/ui';
import { useAuthStore } from '@/stores';

const settingsSections = [
  { id: 'profile', name: 'Profile', icon: User, description: 'Your personal information' },
  { id: 'notifications', name: 'Notifications', icon: Bell, description: 'Email and push preferences' },
  { id: 'security', name: 'Security', icon: Shield, description: 'Password and 2FA settings' },
  { id: 'store', name: 'Store Settings', icon: Store, description: 'Business information' },
  { id: 'appearance', name: 'Appearance', icon: Palette, description: 'Theme and display options' },
  { id: 'data', name: 'Data & Export', icon: Database, description: 'Backup and export data' },
  { id: 'billing', name: 'Billing', icon: CreditCard, description: 'Subscription and payments' },
  { id: 'help', name: 'Help & Support', icon: HelpCircle, description: 'Get help and contact us' },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('profile');
  const { user } = useAuthStore();

  const renderProfileSection = () => (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="flex items-center gap-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full rounded-2xl object-cover" />
            ) : (
              <span className="text-white text-3xl font-bold">
                {user?.first_name?.[0] || 'U'}
              </span>
            )}
          </div>
          <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm hover:bg-gray-50">
            <Camera className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{user?.full_name || 'User'}</h3>
          <p className="text-gray-500">{user?.email}</p>
          <Badge variant="gold" className="mt-2">{user?.role || 'Employee'}</Badge>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input label="First Name" defaultValue={user?.first_name || ''} />
        <Input label="Last Name" defaultValue={user?.last_name || ''} />
        <Input label="Email" type="email" defaultValue={user?.email || ''} />
        <Input label="Phone" type="tel" defaultValue={user?.phone || ''} />
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-200">
        <Button leftIcon={<Save className="w-4 h-4" />}>Save Changes</Button>
      </div>
    </div>
  );

  const renderAppearanceSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Theme</h3>
        <div className="grid grid-cols-3 gap-4">
          {['Light', 'Dark', 'System'].map((theme) => (
            <button
              key={theme}
              className={`
                p-4 rounded-xl border-2 text-center transition-all
                ${theme === 'Light' 
                  ? 'border-amber-500 bg-amber-50' 
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <div className={`
                w-12 h-8 mx-auto mb-2 rounded-lg
                ${theme === 'Light' ? 'bg-white border border-gray-200' : ''}
                ${theme === 'Dark' ? 'bg-gray-800' : ''}
                ${theme === 'System' ? 'bg-gradient-to-r from-white to-gray-800' : ''}
              `} />
              <span className="text-sm font-medium text-gray-900">{theme}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Accent Color</h3>
        <div className="flex gap-3">
          {['#b8860b', '#2563eb', '#7c3aed', '#059669', '#dc2626'].map((color) => (
            <button
              key={color}
              className={`
                w-10 h-10 rounded-xl transition-transform hover:scale-110
                ${color === '#b8860b' ? 'ring-2 ring-offset-2 ring-amber-500' : ''}
              `}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation */}
        <Card padding="sm" className="lg:col-span-1 h-fit">
          <nav className="space-y-1">
            {settingsSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all
                  ${activeSection === section.id
                    ? 'bg-amber-50 text-amber-700'
                    : 'text-gray-600 hover:bg-gray-50'
                  }
                `}
              >
                <section.icon className={`w-5 h-5 ${activeSection === section.id ? 'text-amber-600' : ''}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{section.name}</p>
                  <p className="text-xs text-gray-400 truncate">{section.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            ))}
          </nav>
        </Card>

        {/* Content */}
        <Card className="lg:col-span-3">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            {settingsSections.find((s) => s.id === activeSection)?.name}
          </h2>
          
          {activeSection === 'profile' && renderProfileSection()}
          {activeSection === 'appearance' && renderAppearanceSection()}
          
          {!['profile', 'appearance'].includes(activeSection) && (
            <div className="py-12 text-center text-gray-400">
              <HelpCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>This section is coming soon</p>
            </div>
          )}
        </Card>
      </div>
    </motion.div>
  );
}
