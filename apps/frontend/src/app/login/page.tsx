'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Input } from '@/components/ui';
import { authAPI, setAccessToken, setRefreshToken } from '@/lib/api';
import { useAuthStore } from '@/stores';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await authAPI.login(data.email, data.password);
      const { access, refresh, user } = response.data;
      
      setAccessToken(access);
      setRefreshToken(refresh);
      setUser(user);
      
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-charcoal-900 items-center justify-center p-12">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center mb-8">
            <span className="text-white font-bold text-2xl">T</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Welcome to <span className="text-primary-500">Trap</span>
          </h1>
          <p className="text-lg text-charcoal-300 mb-8">
            Enterprise-grade inventory management for luxury streetwear. 
            Track your stock, manage invoices, and grow your business.
          </p>
          <div className="flex items-center gap-4 p-4 bg-charcoal-800 rounded-xl">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full bg-primary-600 border-2 border-charcoal-900 flex items-center justify-center"
                >
                  <span className="text-white text-xs font-medium">{i}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-white font-medium">Trusted by 100+ brands</p>
              <p className="text-charcoal-400 text-sm">Managing $10M+ inventory</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl">T</span>
            </div>
            <span className="text-2xl font-bold text-charcoal-900">Trap</span>
          </div>

          <h2 className="text-2xl font-bold text-charcoal-900 mb-2">
            Sign in to your account
          </h2>
          <p className="text-charcoal-500 mb-8">
            Enter your credentials to access the inventory system
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Email"
              type="email"
              placeholder="you@company.com"
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-charcoal-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-charcoal-600">
                  Remember me
                </span>
              </label>
              <a
                href="/forgot-password"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              size="lg"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="w-full"
            >
              Sign In
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-charcoal-500">
            Don&apos;t have an account?{' '}
            <a
              href="/register"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Contact admin
            </a>
          </p>
        </motion.div>
      </div>
    </main>
  );
}
