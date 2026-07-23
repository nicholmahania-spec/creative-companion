export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  timestamp: string; // ISO string
  metadata?: Record<string, unknown>;
}