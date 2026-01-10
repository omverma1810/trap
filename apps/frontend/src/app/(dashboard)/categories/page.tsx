'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Search, ChevronRight, Folder, FolderOpen, Edit2, Trash2 } from 'lucide-react';
import { Button, Card, Input, Badge } from '@/components/ui';
import { categoriesAPI } from '@/lib/api';

export default function CategoriesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await categoriesAPI.getCategories();
      return response.data;
    },
  });

  const categories = categoriesData?.results || [];

  const toggleCategory = (id: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCategories(newExpanded);
  };

  const renderCategory = (category: any, depth: number = 0) => {
    const isExpanded = expandedCategories.has(category.id);
    const hasChildren = category.children && category.children.length > 0;

    return (
      <div key={category.id}>
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={`
            flex items-center gap-3 p-4 rounded-xl transition-all
            hover:bg-gray-50 group cursor-pointer
          `}
          style={{ paddingLeft: `${16 + depth * 24}px` }}
          onClick={() => hasChildren && toggleCategory(category.id)}
        >
          {hasChildren ? (
            <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </motion.div>
          ) : (
            <div className="w-4" />
          )}
          
          {hasChildren ? (
            isExpanded ? (
              <FolderOpen className="w-5 h-5 text-amber-500" />
            ) : (
              <Folder className="w-5 h-5 text-amber-500" />
            )
          ) : (
            <div className="w-5 h-5 rounded bg-amber-100 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
            </div>
          )}
          
          <span className="flex-1 font-medium text-gray-900">{category.name}</span>
          
          <Badge variant="outline" size="sm">{category.products_count || 0}</Badge>
          
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors">
              <Edit2 className="w-3.5 h-3.5 text-gray-500" />
            </button>
            <button className="p-1.5 hover:bg-red-100 rounded-lg transition-colors">
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
            </button>
          </div>
        </motion.div>
        
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {category.children.map((child: any) => renderCategory(child, depth + 1))}
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-500 mt-1">Organize products into hierarchical categories</p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />}>Add Category</Button>
      </div>

      {/* Search */}
      <Card padding="sm">
        <div className="flex gap-4">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Search categories..."
              variant="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Categories Tree */}
      {isLoading ? (
        <Card>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                <div className="w-5 h-5 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded flex-1 max-w-xs" />
              </div>
            ))}
          </div>
        </Card>
      ) : categories.length === 0 ? (
        <Card className="py-16">
          <div className="text-center">
            <Folder className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No categories found</h3>
            <p className="text-gray-500 mb-6">Create categories to organize your products</p>
            <Button leftIcon={<Plus className="w-4 h-4" />}>Add Category</Button>
          </div>
        </Card>
      ) : (
        <Card padding="sm">
          <div className="divide-y divide-gray-100">
            {categories.map((category: any) => renderCategory(category))}
          </div>
        </Card>
      )}
    </motion.div>
  );
}
