'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Shield,
  Mail,
  Phone,
  Calendar,
} from 'lucide-react';
import { Button, Card, Input, Badge } from '@/components/ui';
import { usersAPI } from '@/lib/api';

const roleColors: Record<string, string> = {
  admin: 'bg-red-50 text-red-700 border-red-200',
  manager: 'bg-amber-50 text-amber-700 border-amber-200',
  employee: 'bg-blue-50 text-blue-700 border-blue-200',
};

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', searchQuery],
    queryFn: async () => {
      // Mock data since API might not be connected
      return {
        results: [
          {
            id: 1,
            first_name: 'Admin',
            last_name: 'User',
            email: 'admin@trap.com',
            role: 'admin',
            is_active: true,
            phone: '+91 98765 43210',
            created_at: '2024-01-01',
          },
          {
            id: 2,
            first_name: 'Store',
            last_name: 'Manager',
            email: 'manager@trap.com',
            role: 'manager',
            is_active: true,
            phone: '+91 98765 43211',
            created_at: '2024-02-15',
          },
          {
            id: 3,
            first_name: 'Sales',
            last_name: 'Employee',
            email: 'employee@trap.com',
            role: 'employee',
            is_active: true,
            phone: '+91 98765 43212',
            created_at: '2024-03-10',
          },
        ],
      };
    },
  });

  const users = usersData?.results || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 mt-1">Manage team members and permissions</p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />}>Add User</Button>
      </div>

      {/* Search & Filter */}
      <Card padding="sm">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 w-full md:max-w-md">
            <Input
              placeholder="Search users..."
              variant="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {['All', 'Admin', 'Manager', 'Employee'].map((role) => (
              <button
                key={role}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${role === 'All'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Users Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 animate-pulse">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user: any, index: number) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card hover className="group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                      <span className="text-white text-xl font-bold">
                        {user.first_name[0]}{user.last_name[0]}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {user.first_name} {user.last_name}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${roleColors[user.role]}`}>
                        <Shield className="w-3 h-3 mr-1" />
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </div>
                  </div>
                  <button className="p-2 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded-lg transition-all">
                    <MoreVertical className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {user.email}
                  </div>
                  {user.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {user.phone}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    Joined {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <Badge variant={user.is_active ? 'success' : 'outline'}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </button>
                    <button className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
