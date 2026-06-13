import { apiFetch } from './api';

export type ProtectionType = 'focus_lost' | 'visibility_hidden' | 'fullscreen_interruption' | 'screen_recording' | 'devtools_open' | 'none';

const LOCAL_AUDIT_KEY = 'trineo_security_audit';

const persistLocalAudit = (entry: Record<string, any>) => {
  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_AUDIT_KEY) || '[]');
    const next = [
      {
        _id: `local-${Date.now()}`,
        createdAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
        ...entry
      },
      ...existing
    ].slice(0, 50);
    localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify(next));
  } catch (_e) {}
};

export interface ProtectionManagerOptions {
  userId: string;
  email: string;
  ipAddress: string;
  sessionId: string;
  onStateChange: (isSuspicious: boolean, type: ProtectionType, details: string) => void;
  onViolationCountChange: (count: number) => void;
  onCooldownTimeChange?: (timeRemaining: number) => void;
  onTerminateSession: (reason: string) => void;
  getCurrentPlaybackState: () => { isPlaying: boolean; provider: 'youtube' | 'hls' };
  pausePlayer: () => void;
  resumePlayer: () => void;
  reportViolation: (type: string, details: string) => void;
}

export class ProtectionManager {
  private options: ProtectionManagerOptions;
  private isSuspicious: boolean = false;
  private activeType: ProtectionType = 'none';
  private devToolsInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private wasPlayingBeforeViolation: boolean = false;

  // Cooldown Penalty Timer Properties
  private cooldownActive: boolean = false;
  private cooldownTimeRemaining: number = 0;
  private cooldownInterval: NodeJS.Timeout | null = null;

  constructor(options: ProtectionManagerOptions) {
    this.options = options;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Initialize violation count in localStorage if not present
    if (!localStorage.getItem('trineo_violation_count')) {
      localStorage.setItem('trineo_violation_count', '0');
    }

    // Notify initial count
    this.options.onViolationCountChange(this.getViolationCount());

    // 1. Listen for Window Blur and Focus
    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('focus', this.handleFocus);

    // 2. Listen for Visibility Change
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // 3. Listen for Fullscreen Changes
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', this.handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', this.handleFullscreenChange);

    // 4. Hijack Screen Capture permission prompts (getDisplayMedia)
    this.hijackScreenCapture();

    // 5. Docked DevTools Dimension Checker
    this.startDevToolsCheck();

    // 6. Keyboard shortcut monitoring
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    // 7. Mouse interaction monitoring for eager recovery
    window.addEventListener('mousemove', this.handleInteraction);
    window.addEventListener('mousedown', this.handleInteraction);

    // Check if there is an active lock remaining
    const lockUntil = parseInt(localStorage.getItem('trineo_security_lock_until') || '0', 10);
    const requiresManualResume = localStorage.getItem('trineo_lock_requires_manual_resume') === 'true';

    if (requiresManualResume || lockUntil > Date.now()) {
      this.isSuspicious = true;
      this.activeType = 'focus_lost';
      this.options.pausePlayer();
      this.options.onStateChange(true, 'focus_lost', 'Restored security lock from storage');
      this.startCooldown();
    } else {
      // Initial check in case it starts out-of-focus
      this.evaluateState(false);
    }
  }

  public stop() {
    if (!this.isRunning) return;
    this.isRunning = false;

    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('focus', this.handleFocus);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('mozfullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('MSFullscreenChange', this.handleFullscreenChange);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousemove', this.handleInteraction);
    window.removeEventListener('mousedown', this.handleInteraction);

    if (this.devToolsInterval) {
      clearInterval(this.devToolsInterval);
      this.devToolsInterval = null;
    }

    this.clearCooldown();
  }

  public getViolationCount(): number {
    return parseInt(localStorage.getItem('trineo_violation_count') || '0', 10);
  }

  private handleInteraction = () => {
    const lockUntil = parseInt(localStorage.getItem('trineo_security_lock_until') || '0', 10);
    const requiresManualResume = localStorage.getItem('trineo_lock_requires_manual_resume') === 'true';
    const hasActiveLock = requiresManualResume || Date.now() < lockUntil;

    if (this.isSuspicious && document.hasFocus() && !hasActiveLock) {
      this.evaluateState();
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    // PrintScreen Key
    if (e.key === 'PrintScreen') {
      e.preventDefault();
      this.options.reportViolation('screenshot', 'PrintScreen screenshot attempt blocked.');
      this.triggerImmediateViolation('focus_lost', 'PrintScreen screenshot shortcut blocked.');
    }
    
    // Windows Snipping Tool (Win/Meta + Shift + S) or MacOS standard screenshot shortcuts (Cmd/Meta + Shift + 3/4/5)
    const isMetaShiftCombo = (e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'S' || e.key === 's' || e.key === '3' || e.key === '4' || e.key === '5');
    if (isMetaShiftCombo) {
      e.preventDefault();
      this.options.reportViolation('screenshot', 'System screenshot shortcut blocked.');
      this.triggerImmediateViolation('focus_lost', 'System screenshot shortcut blocked.');
    }

    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      this.options.reportViolation('playback_anomaly', 'HTML page saving blocked.');
      this.triggerImmediateViolation('focus_lost', 'HTML page saving blocked.');
    }
    if (e.ctrlKey && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      this.options.reportViolation('screenshot', 'Page print shortcut blocked.');
      this.triggerImmediateViolation('focus_lost', 'Page print shortcut blocked.');
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    const lockUntil = parseInt(localStorage.getItem('trineo_security_lock_until') || '0', 10);
    const requiresManualResume = localStorage.getItem('trineo_lock_requires_manual_resume') === 'true';
    const hasActiveLock = requiresManualResume || Date.now() < lockUntil;

    if (!hasActiveLock) {
      this.evaluateState();
    }
  };

  private handleBlur = () => {
    this.options.reportViolation('screenshot', 'Playback paused: Screen focus lost (possible screenshot or snip tool capture threat).');
    this.evaluateState();
  };

  private handleFocus = () => {
    const lockUntil = parseInt(localStorage.getItem('trineo_security_lock_until') || '0', 10);
    const requiresManualResume = localStorage.getItem('trineo_lock_requires_manual_resume') === 'true';
    const hasActiveLock = requiresManualResume || Date.now() < lockUntil;

    if (!hasActiveLock) {
      this.evaluateState();
    }
  };

  private handleVisibilityChange = () => {
    if (document.hidden) {
      this.options.reportViolation('screenshot', 'Tab hidden (visibilitychange flagged)');
    }
    this.evaluateState();
  };

  private handleFullscreenChange = () => {
    if (document.fullscreenElement === null && !document.hasFocus()) {
      this.options.reportViolation('screenshot', 'Fullscreen exited while document lacks focus');
    }
    this.evaluateState();
  };

  private hijackScreenCapture() {
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
      const self = this;
      navigator.mediaDevices.getDisplayMedia = function(options) {
        self.options.reportViolation('screen_recording', 'Unauthorized display sharing API block.');
        self.triggerImmediateViolation('screen_recording', 'Unauthorized getDisplayMedia API access blocked.');
        return Promise.reject(new Error('Screen capture is strictly prohibited.'));
      };
    }
  }

  private startDevToolsCheck() {
    this.devToolsInterval = setInterval(() => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      const lockUntil = parseInt(localStorage.getItem('trineo_security_lock_until') || '0', 10);
      const requiresManualResume = localStorage.getItem('trineo_lock_requires_manual_resume') === 'true';
      const hasActiveLock = requiresManualResume || Date.now() < lockUntil;

      if (widthThreshold || heightThreshold) {
        this.options.reportViolation('devtools_open', 'Docked developer tools inspect panel detected.');
        this.triggerImmediateViolation('devtools_open', 'DevTools window size anomaly detected.');
      } else {
        if (this.activeType === 'devtools_open' && !hasActiveLock) {
          this.evaluateState();
        }
      }
    }, 1500);
  }

  private triggerImmediateViolation(type: ProtectionType, details: string) {
    if (!this.isSuspicious || this.activeType !== type) {
      const playback = this.options.getCurrentPlaybackState();
      this.wasPlayingBeforeViolation = playback.isPlaying;
      
      // Pause playback immediately
      this.options.pausePlayer();

      this.isSuspicious = true;
      this.activeType = type;

      // Increment attempt counter for direct active violation
      this.incrementViolationCount(type, details);

      this.options.onStateChange(true, type, details);
    }
  }

  private incrementViolationCount(type: string, details: string) {
    let count = this.getViolationCount();
    count += 1;
    localStorage.setItem('trineo_violation_count', count.toString());

    this.options.onViolationCountChange(count);
    this.logAudit(type, details, count);

    if (count === 1) {
      // 60 seconds penalty
      localStorage.setItem('trineo_security_lock_until', (Date.now() + 60000).toString());
      localStorage.setItem('trineo_lock_requires_manual_resume', 'true');
      this.startCooldown();
    } else if (count === 2) {
      // 60 seconds penalty
      localStorage.setItem('trineo_security_lock_until', (Date.now() + 60000).toString());
      localStorage.setItem('trineo_lock_requires_manual_resume', 'true');
      this.startCooldown();
    } else if (count === 3) {
      // Force exit to /student
      try {
        this.options.pausePlayer();
      } catch (e) {}
      window.location.href = '/student';
    } else if (count >= 4) {
      // Force logout
      this.terminateSession();
    }
  }

  private startCooldown() {
    this.clearCooldown();

    this.cooldownActive = true;

    const updateTime = () => {
      const lockUntil = parseInt(localStorage.getItem('trineo_security_lock_until') || '0', 10);
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((lockUntil - now) / 1000));
      
      this.cooldownTimeRemaining = remaining;
      this.options.onCooldownTimeChange?.(remaining);

      if (remaining <= 0) {
        if (this.cooldownInterval) {
          clearInterval(this.cooldownInterval);
          this.cooldownInterval = null;
        }
      }
    };

    updateTime();
    this.cooldownInterval = setInterval(updateTime, 1000);
  }

  private clearCooldown() {
    this.cooldownActive = false;
    this.cooldownTimeRemaining = 0;
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
      this.cooldownInterval = null;
    }
    this.options.onCooldownTimeChange?.(0);
  }

  private async logAudit(eventType: string, details: string, attempt: number) {
    const token = localStorage.getItem('token');
    const deviceFingerprint = navigator.userAgent;

    // Map custom types to fit the Mongoose eventType enum values
    let mappedType = 'screenshot';
    if (eventType === 'devtools_open') {
      mappedType = 'devtools_open';
    } else if (eventType === 'screen_recording') {
      mappedType = 'screen_recording';
    } else if (eventType === 'playback_anomaly') {
      mappedType = 'playback_anomaly';
    }

    const payload = {
      eventType: mappedType,
      details: JSON.stringify({
        userId: this.options.userId,
        email: this.options.email,
        ipAddress: this.options.ipAddress,
        sessionId: this.options.sessionId,
        timestamp: new Date().toISOString(),
        deviceFingerprint,
        violationType: eventType,
        attemptNumber: attempt,
        additionalInfo: details
      }),
      deviceFingerprint
    };

    try {
      await apiFetch('/security/audit', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.error('[DRM Audit Fetch Failed]', e);
      persistLocalAudit({
        eventType: mappedType,
        details: payload.details,
        deviceFingerprint
      });
    }
  }

  private terminateSession() {
    this.isRunning = false;
    this.clearCooldown();
    
    // Immediately stop playback
    try {
      this.options.pausePlayer();
    } catch (e) {}

    // Clear session details
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('trineo_violation_count');
    localStorage.removeItem('trineo_security_lock_until');
    localStorage.removeItem('trineo_lock_requires_manual_resume');

    // Invalidate session on heartbeat server
    apiFetch('/auth/logout', {
      method: 'POST'
    }).catch(() => {});

    // Notify player
    this.options.onTerminateSession('Security violations exceeded. Session terminated.');

    // Redirect to login page
    window.location.href = '/login?violation=exceeded';
  }

  public recoverFromViolation() {
    localStorage.removeItem('trineo_security_lock_until');
    localStorage.setItem('trineo_lock_requires_manual_resume', 'false');
    this.cooldownActive = false;
    this.cooldownTimeRemaining = 0;
    this.clearCooldown();
    
    this.isSuspicious = false;
    this.evaluateState(false);
  }

  public evaluateState(shouldIncrement: boolean = true) {
    let nextSuspicious = false;
    let nextType: ProtectionType = 'none';
    let details = '';

    const lockUntil = parseInt(localStorage.getItem('trineo_security_lock_until') || '0', 10);
    const requiresManualResume = localStorage.getItem('trineo_lock_requires_manual_resume') === 'true';

    if (requiresManualResume || Date.now() < lockUntil) {
      nextSuspicious = true;
      nextType = 'focus_lost';
      details = 'Active security lock penalty active';
    } else if (document.hidden) {
      nextSuspicious = true;
      nextType = 'visibility_hidden';
      details = 'Document tab is hidden';
    } else if (!document.hasFocus()) {
      nextSuspicious = true;
      nextType = 'focus_lost';
      details = 'Window focus is lost (Snipping Tool or focus capture overlay active)';
    } else {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      if (widthThreshold || heightThreshold) {
        nextSuspicious = true;
        nextType = 'devtools_open';
        details = 'DevTools dimension anomaly detected';
      }
    }

    if (this.isSuspicious !== nextSuspicious || this.activeType !== nextType) {
      if (nextSuspicious) {
        const playback = this.options.getCurrentPlaybackState();
        if (!this.isSuspicious) {
          this.wasPlayingBeforeViolation = playback.isPlaying;
        }
        
        // Pause playback instantly
        this.options.pausePlayer();

        // Increment count only if:
        // 1. shouldIncrement is true
        // 2. We are NOT already inside an active penalty cooldown or awaiting manual resume
        const isCooldownRunning = Date.now() < lockUntil;
        if (!isCooldownRunning && !requiresManualResume) {
          const isDevTools = nextType === 'devtools_open';
          const isBlurDuringPlayback = nextType === 'focus_lost' && this.wasPlayingBeforeViolation;
          const isVisibilityHiddenDuringPlayback = nextType === 'visibility_hidden' && this.wasPlayingBeforeViolation;

          if (shouldIncrement && (isDevTools || isBlurDuringPlayback || isVisibilityHiddenDuringPlayback)) {
            this.incrementViolationCount(nextType, details);
          }
        }
      } else {
        // Recover and resume playback if it was playing before
        if (this.wasPlayingBeforeViolation) {
          try {
            this.options.resumePlayer();
          } catch (e) {}
        }
      }

      this.isSuspicious = nextSuspicious;
      this.activeType = nextType;
      this.options.onStateChange(nextSuspicious, nextType, details);
    }
  }
}
