'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Leave, LeaveInsert } from '@/lib/types';

export function useLeaves() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchLeaves = useCallback(async () => {
    const { data, error } = await supabase
      .from('leaves')
      .select('*')
      .order('start_date', { ascending: true });

    if (!error && data) {
      setLeaves(data as Leave[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchLeaves();

    const channel = supabase
      .channel('leaves-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leaves' },
        () => {
          fetchLeaves();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchLeaves]);

  const addLeave = async (leave: LeaveInsert) => {
    const { error } = await supabase.from('leaves').insert(leave);
    if (error) throw error;
  };

  const deleteLeave = async (id: string) => {
    const { error } = await supabase.from('leaves').delete().eq('id', id);
    if (error) throw error;
  };

  return { leaves, loading, addLeave, deleteLeave };
}
