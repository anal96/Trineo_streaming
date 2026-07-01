export type LectureState = 'upcoming' | 'live' | 'completed' | 'cancelled';

/**
 * Computes a single source of truth state for a live lecture class.
 */
export const getLectureState = (lc: {
  status?: string;
  startTime: string | Date;
  endTime: string | Date;
}): LectureState => {
  if (lc.status === 'cancelled') {
    return 'cancelled';
  }
  if (lc.status === 'completed') {
    return 'completed';
  }
  
  const now = Date.now();
  const start = new Date(lc.startTime).getTime();
  const end = new Date(lc.endTime).getTime();
  
  if (now < start) {
    return 'upcoming';
  }
  if (now >= start && now < end) {
    return 'live';
  }
  return 'completed';
};

/**
 * Formats a premium countdown label indicating the time remaining until a lecture starts.
 */
export const getCountdownText = (startTimeStr: string | Date): string => {
  const diffMs = new Date(startTimeStr).getTime() - Date.now();
  if (diffMs <= 0) return 'Starts now';
  
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) {
    return `Starts in ${diffMins}m`;
  }
  const diffHours = Math.floor(diffMins / 60);
  const remainingMins = diffMins % 60;
  if (diffHours < 24) {
    return `Starts in ${diffHours}h ${remainingMins}m`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `Starts in ${diffDays}d`;
};
