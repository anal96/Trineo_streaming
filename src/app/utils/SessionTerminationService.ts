import { QueryClient } from '@tanstack/react-query';
import Hls from 'hls.js';
import { cancelAllPendingRequests } from './api';

interface TerminationRegistry {
  hls?: Hls | null;
  videoElement?: HTMLVideoElement | null;
  protectionManager?: { stop: () => void } | null;
  cancelHeartbeat?: () => void;
  queryClient?: QueryClient;
}

const registry: TerminationRegistry = {};
let terminating = false;

export const SessionTerminationService = {
  registerHls(hls: Hls | null) {
    registry.hls = hls;
  },
  registerVideoElement(video: HTMLVideoElement | null) {
    registry.videoElement = video;
  },
  registerProtectionManager(manager: { stop: () => void } | null) {
    registry.protectionManager = manager;
  },
  registerCancelHeartbeat(cancel: () => void) {
    registry.cancelHeartbeat = cancel;
  },
  registerQueryClient(client: QueryClient) {
    registry.queryClient = client;
  },
  
  terminate(reason: 'account_locked' | 'exceeded' | 'admin_terminated' | 'session_expired' | 'devtools_open' | 'platform_changed') {
    if (terminating) return;
    terminating = true;

    console.warn(`[SECURITY] SessionTerminationService: Commencing termination sequence. Reason: ${reason}`);

    // 1. Pause Video Element
    if (registry.videoElement) {
      try { registry.videoElement.pause(); } catch (_) {}
    }

    // 2. Cancel Heartbeats & Polling Intervals
    if (registry.cancelHeartbeat) {
      try { registry.cancelHeartbeat(); } catch (_) {}
    }

    // 3. Cancel Active Fetch HTTP Requests
    try {
      cancelAllPendingRequests();
    } catch (_) {}

    // 4. Cancel React Query queries and clear cache
    if (registry.queryClient) {
      try {
        registry.queryClient.cancelQueries();
        registry.queryClient.clear();
      } catch (_) {}
    }

    // 5. Teardown HLS Player
    if (registry.hls) {
      try {
        registry.hls.stopLoad();
        registry.hls.detachMedia();
        registry.hls.destroy();
      } catch (_) {}
      registry.hls = null;
    }

    // 6. Remove media sources and buffers
    if (registry.videoElement) {
      try {
        registry.videoElement.removeAttribute('src');
        registry.videoElement.load();
      } catch (_) {}
    }

    // 7. Remove Keyboard and Window protection listeners
    if (registry.protectionManager) {
      try { registry.protectionManager.stop(); } catch (_) {}
      registry.protectionManager = null;
    }

    // 8. Delete Credentials & Storage Values
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('trineo_violation_count');
    localStorage.removeItem('trineo_security_lock_until');
    localStorage.removeItem('trineo_lock_requires_manual_resume');
    sessionStorage.clear();

    // 9. Synchronize all other open browser tabs
    try {
      localStorage.setItem('TRINEO_SESSION_TERMINATED', JSON.stringify({
        reason,
        timestamp: Date.now()
      }));
    } catch (_) {}

    // 10. Replace history state & redirect (prevents back button)
    let redirectReason = 'exceeded';
    if (reason === 'account_locked') redirectReason = 'account_locked';
    else if (reason === 'admin_terminated') redirectReason = 'admin_terminated';
    else if (reason === 'session_expired') redirectReason = 'session_expired';
    else if (reason === 'devtools_open') redirectReason = 'devtools_open';
    else if (reason === 'platform_changed') redirectReason = 'platform_changed';

    window.location.replace(`/security-lock?reason=${redirectReason}`);
  }
};

// Global cross-tab synchronization listener
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'TRINEO_SESSION_TERMINATED' && e.newValue) {
      try {
        const data = JSON.parse(e.newValue);
        SessionTerminationService.terminate(data.reason);
      } catch (_) {}
    }
  });
}
