import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { UserAction } from '../types/userActivity';

/**
 * Hook to fetch user activity data.
 * If Supabase is configured, it fetches from the user_activity table.
 * Otherwise, returns mock data for development.
 */
export function useUserActivity(userId: string) {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchActivities() {
      if (!isSupabaseConfigured() || !supabase) {
        // Mock data for development
        const mockActivities: UserActivity[] = [
          {
            id: '1',
            userId,
            action: 'created_project',
            timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            metadata: { projectName: 'Website Redesign' }
          },
          {
            id: '2',
            userId,
            action: 'completed_task',
            timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
            metadata: { taskTitle: 'Create logo concepts' }
          },
          {
            id: '3',
            userId,
            action: 'updated_mood_board',
            timestamp: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
            metadata: { boardName: 'Brand Exploration' }
          }
        ];
        if (isMounted) {
          setActivities(mockActivities);
          setLoading(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_activity')
          .select('*')
          .eq('user_id', userId)
          .order('timestamp', { ascending: false });

        if (error) throw error;

        if (isMounted) {
          setActivities(data as UserActivity[]);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      }
    }

    if (userId) {
      fetchActivities();
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [userId]);

  return { activities, loading, error };
}