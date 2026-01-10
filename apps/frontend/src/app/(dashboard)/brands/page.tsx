'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, ExternalLink, Tag } from 'lucide-react';
import { Button, Card, Input, Badge } from '@/components/ui';
import { brandsAPI } from '@/lib/api';

export default function BrandsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: brandsData, isLoading } = useQuery({
    queryKey: ['brands', searchQuery],
    queryFn: async () => {
      const response = await brandsAPI.getBrands({ search: searchQuery || undefined });
      return response.data;
    },
  });

  const brands = brandsData?.results || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brands</h1>
          <p className="text-gray-500 mt-1">Manage product brands and manufacturers</p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />}>Add Brand</Button>
      </div>

      {/* Search */}
      <Card padding="sm">
        <div className="flex gap-4">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Search brands..."
              variant="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Brands Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 animate-pulse">
              <div className="w-16 h-16 bg-gray-200 rounded-xl mb-4" />
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : brands.length === 0 ? (
        <Card className="py-16">
          <div className="text-center">
            <Tag className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No brands found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery ? 'Try a different search term' : 'Add your first brand to get started'}
            </p>
            {!searchQuery && (
              <Button leftIcon={<Plus className="w-4 h-4" />}>Add Brand</Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {brands.map((brand: any, index: number) => (
            <motion.div
              key={brand.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card hover className="group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-xl bg-amber-50 flex items-center justify-center">
                    {brand.logo ? (
                      <img src={brand.logo} alt={brand.name} className="w-10 h-10 object-contain" />
                    ) : (
                      <Tag className="w-6 h-6 text-amber-600" />
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </button>
                    <button className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{brand.name}</h3>
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                  {brand.description || 'No description'}
                </p>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <Badge variant="gold">{brand.products_count || 0} Products</Badge>
                  {brand.website && (
                    <a
                      href={brand.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-600 hover:text-amber-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
