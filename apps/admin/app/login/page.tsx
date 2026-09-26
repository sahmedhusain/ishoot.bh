'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Input, Button, Card } from '@ishoot/ui';
import { Lock, Mail, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState('producer@ishoot.bh');
  const [password, setPassword] = React.useState('••••••••');
  const [loading, setLoading] = React.useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Instant local-first login into workspace
    setTimeout(() => {
      router.push('/dashboard');
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#050807] relative overflow-hidden">
      {/* Background Ambient Radial Glow */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-[#014842]/30 via-[#09937F]/10 to-transparent blur-3xl pointer-events-none" />

      <Card className="relative z-10 w-full max-w-md p-8 sm:p-10 bg-[#0B1210] border border-[#09937F]/30 shadow-2xl rounded-3xl space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-[#014842] border border-[#09937F]/50 shadow-lg shadow-[#014842]/50">
            <span className="w-4 h-4 rounded-full bg-[#09937F]" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight font-display">
            ishoot<span className="text-[#09937F]">.</span> Admin
          </h1>
          <p className="text-xs text-[#9EADA9] tracking-wider uppercase">
            Executive Studio Workspace
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#9EADA9]">Staff Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-[#9EADA9]" />
              <Input
                type="email"
                required
                className="pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#9EADA9]">Security Key</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-[#9EADA9]" />
              <Input
                type="password"
                required
                className="pl-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            variant="primary"
            size="lg"
            className="w-full gap-2 mt-4"
          >
            <span>{loading ? 'Authenticating...' : 'Enter Workspace'}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <div className="text-center text-[11px] text-[#9EADA9]/60">
          Cinema Operations Portal • Protected by Supabase Auth & RBAC
        </div>
      </Card>
    </div>
  );
}
