import { apiFetch } from './api';

export type ProtectionType = 'focus_lost' | 'visibility_hidden' | 'fullscreen_interruption' | 'screen_recording' | 'devtools_open' | 'none';

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
  reportViolation: (type: string, details: string) => Promise<{ success: boolean; action?: string; message?: string } | null>;
}

export class ProtectionManager {
  private options: ProtectionManagerOptions;
  private isSuspicious: boolean = false;
  private activeType: ProtectionType = 'none';
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

    // 5. Keyboard shortcut monitoring
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    // 6. Mouse interaction monitoring for eager recovery
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
      this.evaluateState();
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

  private handleKeyDown = async (e: KeyboardEvent) => {
    // PrintScreen Key
    if (e.key === 'PrintScreen') {
      e.preventDefault();
      await this.handleScreenshotViolation('PrintScreen screenshot attempt blocked.');
    }
    
    // Windows Snipping Tool (Win/Meta + Shift + S) or MacOS standard screenshot shortcuts (Cmd/Meta + Shift + 3/4/5)
    const isMetaShiftCombo = (e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'S' || e.key === 's' || e.key === '3' || e.key === '4' || e.key === '5');
    if (isMetaShiftCombo) {
      e.preventDefault();
      await this.handleScreenshotViolation('System screenshot shortcut blocked.');
    }

    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      await this.options.reportViolation('playback_anomaly', 'HTML page saving blocked.');
    }
    if (e.ctrlKey && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      await this.handleScreenshotViolation('Page print shortcut blocked.');
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

  private async handleScreenshotViolation(details: string) {
    this.options.pausePlayer();
    
    // Increment local count
    let count = this.getViolationCount() + 1;
    localStorage.setItem('trineo_violation_count', count.toString());
    this.options.onViolationCountChange(count);

    const res = await this.options.reportViolation('screenshot', details);
    if (res) {
      if (res.action === 'session_terminated') {
        this.terminateSession();
      } else if (res.action === 'warning_shown') {
        this.options.onStateChange(true, 'focus_lost', res.message || 'Screenshot warning.');
        localStorage.setItem('trineo_security_lock_until', (Date.now() + 10000).toString());
        localStorage.setItem('trineo_lock_requires_manual_resume', 'true');
        this.startCooldown();
      } else if (res.action === 'alert_logged') {
        this.options.onStateChange(true, 'focus_lost', res.message || 'Screenshot attempt logged.');
        localStorage.setItem('trineo_security_lock_until', (Date.now() + 60000).toString());
        localStorage.setItem('trineo_lock_requires_manual_resume', 'true');
        this.startCooldown();
      }
    }
  }

  private handleBlur = () => {
    // Simply pause locally, do not report/log screenshot exceptions on focus loss
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
    // Simply pause locally on hidden tab
    this.evaluateState();
  };

  private handleFullscreenChange = () => {
    this.evaluateState();
  };

  private hijackScreenCapture() {
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
      const self = this;
      navigator.mediaDevices.getDisplayMedia = async function(options) {
        // Pause player immediately
        self.options.pausePlayer();

        // Increment local count
        let count = self.getViolationCount() + 1;
        localStorage.setItem('trineo_violation_count', count.toString());
        self.options.onViolationCountChange(count);

        const res = await self.options.reportViolation('screen_recording', 'Unauthorized display sharing API block.');
        if (res && res.action === 'playback_paused') {
          self.options.onStateChange(true, 'screen_recording', res.message || 'Screen recording blocked.');
        } else if (res && res.action === 'session_terminated') {
          self.terminateSession();
        }
        return Promise.reject(new Error('Screen capture is strictly prohibited.'));
      };
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

  public terminateSession() {
    this.isRunning = false;
    this.clearCooldown();
    
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
    this.evaluateState();
  }

  public evaluateState() {
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
      details = 'Window focus is lost (LMS paused)';
    }

    if (this.isSuspicious !== nextSuspicious || this.activeType !== nextType) {
      if (nextSuspicious) {
        const playback = this.options.getCurrentPlaybackState();
        if (!this.isSuspicious) {
          this.wasPlayingBeforeViolation = playback.isPlaying;
        }
        
        // Pause playback instantly
        this.options.pausePlayer();
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
