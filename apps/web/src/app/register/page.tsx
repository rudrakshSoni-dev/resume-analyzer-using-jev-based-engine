'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { Panel, Button, Input, ErrorText, Caption } from '@/components/ui';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Register the user (does not set cookie)
      await api.register({ email, password });
      
      // 2. Immediately log in to get the cookie
      await api.login({ email, password });
      
      router.replace('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F4F4F0]">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold uppercase tracking-widest text-black">JEV Analyzer</h1>
        </div>
        
        <Panel>
          <h2 className="text-xl font-bold uppercase mb-6 text-black border-b-2 border-black pb-2">Register</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold uppercase mb-1 text-black">Email</label>
              <Input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold uppercase mb-1 text-black">Password</label>
              <Input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <Caption>must be at least 8 characters.</Caption>
            </div>

            {error && <ErrorText>{error}</ErrorText>}

            <Button type="submit" className="w-full mt-6" disabled={loading}>
              {loading ? 'registering...' : 'Register'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">already have an account?</span>{' '}
            <Link href="/login" className="font-bold text-black hover:underline">
              log in
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  );
}
