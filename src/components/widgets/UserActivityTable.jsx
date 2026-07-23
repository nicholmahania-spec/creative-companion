import React from 'react';
import { useUserActivity } from '@/lib/hooks/useUserActivity';
import { useAppStore } from '@/store/useAppStore';

export function UserActivityTable() {
  const { currentProjectId } = useAppStore();
  const { activities, loading, error } = useUserActivity(currentProjectId || '');

  if (loading) {
    return (
      <div className="user-activity-loading">
        <div className="skeleton-loader"></div>
        <div className="skeleton-loader"></div>
        <div className="skeleton-loader"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-activity-error">
        <p>Error loading activity: {error}</p>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="user-activity-empty">
        <p>No recent activity found.</p>
      </div>
    );
  }

  return (
    <div className="user-activity-table">
      <h3 className="user-activity-title">User Activity</h3>
      <table className="activity-table">
        <thead>
          <tr>
            <th className="text-left">Time</th>
            <th className="text-left">Action</th>
            <th className="text-left">Details</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((activity) => (
            <tr key={activity.id}>
              <td className="activity-time">
                {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </td>
              <td className="activity-action">
                {formatActivityType(activity.action)}
              </td>
              <td className="activity-details">
                {activity.metadata ? formatActivityDetails(activity.metadata) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatActivityType(action: string): string {
  // Convert snake_case to Title Case
  return action
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatActivityDetails(metadata: Record<string, unknown>): string {
  if (!metadata || Object.keys(metadata).length === 0) {
    return '-';
  }

  // Format common metadata fields
  if (metadata.projectName) {
    return `Project: ${metadata.projectName}`;
  }

  if (metadata.taskTitle) {
    return `Task: ${metadata.taskTitle}`;
  }

  if (metadata.boardName) {
    return `Board: ${metadata.boardName}`;
  }

  // Fallback: show first key-value pair
  const [firstKey, firstValue] = Object.entries(metadata)[0] || [];
  if (firstKey && firstValue !== undefined) {
    return `${firstKey}: ${String(firstValue)}`;
  }

  return '-';
}