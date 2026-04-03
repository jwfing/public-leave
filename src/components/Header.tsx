'use client';

import { useAuth } from '@/hooks/useAuth';

export function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
      <h1 className="text-xl font-bold text-gray-900">请假管理</h1>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{user?.user_metadata?.full_name ?? user?.email}</span>
        <button
          onClick={signOut}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-200"
        >
          退出
        </button>
      </div>
    </header>
  );
}
