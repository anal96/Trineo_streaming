import { apiFetch } from './api';
import { SessionTerminationService } from './SessionTerminationService';

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

  private serverTimeOffset: number = 0;
  private isReportingViolation: boolean = false;
  private isDispatchingStorage: boolean = false;

  private getAdjustedNow(): number {
    return Date.now() + this.serverTimeOffset;
  }



  constructor(options: ProtectionManagerOptions) {
    this.options = options;
    console.error("PROTECTION MANAGER CREATED");
    console.trace("PROTECTION MANAGER CREATED");
  }

  public start() {
    console.log("[SECURITY] ProtectionManager.start() invoked");
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

    // 4. Keyboard shortcut monitoring
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    // 5. Mouse interaction monitoring for eager recovery
    window.addEventListener('mousemove', this.handleInteraction);
    window.addEventListener('mousedown', this.handleInteraction);

    // 6. Storage event listener for multi-tab sync
    window.addEventListener('storage', this.handleStorageChange);

    // 7. Hijack Screen Capture permission prompts (getDisplayMedia)
    this.hijackScreenCapture();

    // Check active lock on startup
    const lockUntil = parseInt(localStorage.getItem('trineo_security_lock_until') || '0', 10);
    const requiresManualResume = localStorage.getItem('trineo_lock_requires_manual_resume') === 'true';

    if (requiresManualResume || this.getAdjustedNow() < lockUntil) {
      this.isSuspicious = true;
      this.activeType = 'focus_lost';
      this.options.pausePlayer();
      this.options.onStateChange(true, 'focus_lost', 'Restored security lock from storage');
      this.cooldownTimeRemaining = Math.max(0, Math.ceil((lockUntil - this.getAdjustedNow()) / 1000));
      this.startCooldown();
    } else {
      this.evaluateState();
    }
  }

  public stop() {
    console.log("[SECURITY] ProtectionManager.stop() invoked");
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
    window.removeEventListener('storage', this.handleStorageChange);

    // Restore getDisplayMedia to original state if hijacked
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      const current = navigator.mediaDevices.getDisplayMedia as any;
      if (current.isHijacked && current.original) {
        navigator.mediaDevices.getDisplayMedia = current.original;
      }
    }

    this.clearCooldown();
  }

  public getViolationCount(): number {
    return parseInt(localStorage.getItem('trineo_violation_count') || '0', 10);
  }

  private handleInteraction = () => {
    const lockUntil = parseInt(localStorage.getItem('trineo_security_lock_until') || '0', 10);
    const requiresManualResume = localStorage.getItem('trineo_lock_requires_manual_resume') === 'true';
    const hasActiveLock = requiresManualResume || this.getAdjustedNow() < lockUntil;

    if (this.isSuspicious && document.hasFocus() && !hasActiveLock) {
      console.log("[SECURITY] Interaction recovery evaluated", {
        lockUntil: lockUntil > 0 ? new Date(lockUntil).toISOString() : 'none',
        adjustedNow: new Date(this.getAdjustedNow()).toISOString(),
        requiresManualResume,
        hasActiveLock
      });
      this.evaluateState();
    }
  };

  private handleKeyDown = async (e: KeyboardEvent) => {
    // Ignore key repeat events to prevent duplicate triggering
    if (e.repeat) return;

    console.log("[SECURITY] KeyDown detected:", { key: e.key, code: e.code, keyCode: e.keyCode, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, metaKey: e.metaKey });
    // PrintScreen Key
    if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
      console.log('[SECURITY] PRINTSCREEN DETECTED in KeyDown');
      console.log('[SECURITY] CALLING handleScreenshotViolation() from KeyDown');
      e.preventDefault();
      await this.handleScreenshotViolation('PrintScreen screenshot attempt blocked.');
    }
    
    // Windows Snipping Tool (Win/Meta + Shift + S) or MacOS standard screenshot shortcuts (Cmd/Meta + Shift + 3/4/5)
    const isMetaShiftCombo = (e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'S' || e.key === 's' || e.key === '3' || e.key === '4' || e.key === '5');
    if (isMetaShiftCombo) {
      console.log("[SECURITY] System screenshot shortcut combination detected");
      e.preventDefault();
      await this.handleScreenshotViolation('System screenshot shortcut blocked.');
    }

    if (e.ctrlKey && e.key === 's') {
      console.log("[SECURITY] Page save combination detected");
      e.preventDefault();
      await this.options.reportViolation('playback_anomaly', 'HTML page saving blocked.');
    }
    if (e.ctrlKey && (e.key === 'p' || e.key === 'P')) {
      console.log("[SECURITY] Print shortcut detected");
      e.preventDefault();
      await this.handleScreenshotViolation('Page print shortcut blocked.');
    }
  };

  private handleKeyUp = async (e: KeyboardEvent) => {
    console.log("[SECURITY] KeyUp detected:", { key: e.key, code: e.code });

    if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
      console.log('[SECURITY] PRINTSCREEN DETECTED in KeyUp');
      console.log('[SECURITY] CALLING handleScreenshotViolation() from KeyUp');
      e.preventDefault();
      await this.handleScreenshotViolation('PrintScreen screenshot attempt blocked.');
    }

    const lockUntil = parseInt(localStorage.getItem('trineo_security_lock_until') || '0', 10);
    const requiresManualResume = localStorage.getItem('trineo_lock_requires_manual_resume') === 'true';
    const hasActiveLock = requiresManualResume || this.getAdjustedNow() < lockUntil;

    if (!hasActiveLock) {
      this.evaluateState();
    }
  };

  private async handleScreenshotViolation(details: string) {
    const now = Date.now();
    const lastReportedTime = parseInt(localStorage.getItem('trineo_last_reported_violation') || '0', 10);

    // Rate limit reporting: ignore if reported within last 2 seconds or already lock active or request pending
    if (now - lastReportedTime < 2000 || this.cooldownActive || this.isReportingViolation) {
      console.log("[SECURITY] Screenshot violation ignored (cooldownActive, isReportingViolation, or duplicate event within 2s)");
      return;
    }

    this.isReportingViolation = true;
    localStorage.setItem('trineo_last_reported_violation', now.toString());

    console.log("[SECURITY] Screenshot violation detected");
    this.options.pausePlayer();
    
    // Increment local count
    let count = this.getViolationCount() + 1;
    localStorage.setItem('trineo_violation_count', count.toString());
    this.options.onViolationCountChange(count);

    console.log("[SECURITY] Reporting violation to backend");
    try {
      const res = await this.options.reportViolation('screenshot', details);
      if (res) {
        console.log("[SECURITY] Backend response received:", res);
        if (res.action === 'session_terminated' || res.action === 'account_locked') {
          SessionTerminationService.terminate(res.action === 'account_locked' ? 'account_locked' : 'exceeded');
        } else if (res.action === 'warning_shown' || res.action === 'warning_shown_level2' || res.action === 'alert_logged') {
          if ((res as any).serverTime) {
            this.serverTimeOffset = new Date((res as any).serverTime).getTime() - Date.now();
            console.log("[SECURITY] serverTimeOffset updated:", this.serverTimeOffset);
          }

          this.options.onStateChange(true, 'focus_lost', res.message || 'Screenshot warning.');
          const serverPenaltyUntil = res.penaltyUntil ? new Date(res.penaltyUntil).getTime() : (this.getAdjustedNow() + 60000);
          localStorage.setItem('trineo_security_lock_until', serverPenaltyUntil.toString());
          localStorage.setItem('trineo_lock_requires_manual_resume', 'true');
          
          // Dispatch event for multi-tab sync locally
          this.isDispatchingStorage = true;
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'trineo_security_lock_until',
            newValue: serverPenaltyUntil.toString()
          }));
          this.isDispatchingStorage = false;

          this.cooldownTimeRemaining = Math.max(0, Math.ceil((serverPenaltyUntil - this.getAdjustedNow()) / 1000));
          
          console.log("[SECURITY] handleScreenshotViolation lock set:", {
            penaltyUntil: new Date(serverPenaltyUntil).toISOString(),
            serverTime: new Date(this.getAdjustedNow()).toISOString(),
            remainingSeconds: this.cooldownTimeRemaining,
            securityLockActive: true
          });

          this.startCooldown();
        }
      } else {
        console.warn("[SECURITY] Backend violation report returned null or failed");
      }
    } catch (e) {
      console.error("[SECURITY] Error reporting screenshot violation:", e);
    } finally {
      this.isReportingViolation = false;
    }
  }

  private handleBlur = () => {
    // Simply pause locally, do not report/log screenshot exceptions on focus loss
    this.evaluateState();
  };

  private handleFocus = () => {
    const lockUntil = parseInt(localStorage.getItem('trineo_security_lock_until') || '0', 10);
    const requiresManualResume = localStorage.getItem('trineo_lock_requires_manual_resume') === 'true';
    const hasActiveLock = requiresManualResume || this.getAdjustedNow() < lockUntil;

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
      const current = navigator.mediaDevices.getDisplayMedia as any;
      if (current.isHijacked) {
        return;
      }
      const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
      const self = this;
      const hijacked = async function(options?: DisplayMediaStreamOptions) {
        const now = Date.now();
        const lastReportedTime = parseInt(localStorage.getItem('trineo_last_reported_violation') || '0', 10);

        if (now - lastReportedTime < 2000 || self.cooldownActive || self.isReportingViolation) {
          return Promise.reject(new Error('Screen capture is strictly prohibited.'));
        }

        self.isReportingViolation = true;
        localStorage.setItem('trineo_last_reported_violation', now.toString());

        // Pause player immediately
        self.options.pausePlayer();

        // Increment local count
        let count = self.getViolationCount() + 1;
        localStorage.setItem('trineo_violation_count', count.toString());
        self.options.onViolationCountChange(count);

        try {
          const res = await self.options.reportViolation('screen_recording', 'Unauthorized display sharing API block.');
          if (res) {
            if (res.action === 'session_terminated' || res.action === 'account_locked') {
              SessionTerminationService.terminate(res.action === 'account_locked' ? 'account_locked' : 'exceeded');
            } else {
              self.options.onStateChange(true, 'screen_recording', res.message || 'Screen recording blocked.');
              const serverPenaltyUntil = (res as any).penaltyUntil ? new Date((res as any).penaltyUntil).getTime() : (self.getAdjustedNow() + 60000);
              localStorage.setItem('trineo_security_lock_until', serverPenaltyUntil.toString());
              localStorage.setItem('trineo_lock_requires_manual_resume', 'true');

              // Dispatch event for multi-tab sync locally
              self.isDispatchingStorage = true;
              window.dispatchEvent(new StorageEvent('storage', {
                key: 'trineo_security_lock_until',
                newValue: serverPenaltyUntil.toString()
              }));
              self.isDispatchingStorage = false;

              // Use server time to calculate remaining seconds (immune to clock manipulation)
              if ((res as any).serverTime) {
                self.serverTimeOffset = new Date((res as any).serverTime).getTime() - Date.now();
              }
              self.cooldownTimeRemaining = Math.max(0, Math.ceil((serverPenaltyUntil - self.getAdjustedNow()) / 1000));
              self.startCooldown();
            }
          }
        } catch (e) {
          console.error("[SECURITY] Error reporting screen capture violation:", e);
        } finally {
          self.isReportingViolation = false;
        }
        return Promise.reject(new Error('Screen capture is strictly prohibited.'));
      };
      (hijacked as any).isHijacked = true;
      (hijacked as any).original = originalGetDisplayMedia;
      navigator.mediaDevices.getDisplayMedia = hijacked;
    }
  }

  // Sync security status from server on page load
  public syncSecurityStatus(violationCount: number, penaltyUntil: string | Date | null, serverTime?: string | Date | null) {
    if (serverTime) {
      this.serverTimeOffset = new Date(serverTime).getTime() - Date.now();
      console.log("[SECURITY] syncSecurityStatus serverTimeOffset adjusted:", this.serverTimeOffset);
    }

    const penaltyMs = penaltyUntil ? new Date(penaltyUntil).getTime() : 0;
    const remaining = penaltyMs ? Math.max(0, Math.ceil((penaltyMs - this.getAdjustedNow()) / 1000)) : 0;

    console.error("SYNC STATUS");
    console.log({
      violationCount,
      penaltyUntil,
      serverTime,
      adjustedNow: this.getAdjustedNow(),
      remainingSeconds: remaining
    });

    if (violationCount > 0) {
      localStorage.setItem('trineo_violation_count', violationCount.toString());
      this.options.onViolationCountChange(violationCount);
    }

    if (penaltyUntil) {
      console.log("[SECURITY] syncSecurityStatus lock evaluation:", {
        penaltyUntil: new Date(penaltyMs).toISOString(),
        serverTime: serverTime ? new Date(serverTime).toISOString() : 'none',
        remainingSeconds: remaining,
        securityLockActive: remaining > 0
      });

      if (remaining > 0) {
        localStorage.setItem('trineo_security_lock_until', penaltyMs.toString());
        localStorage.setItem('trineo_lock_requires_manual_resume', 'true');
        this.cooldownTimeRemaining = remaining;
        this.isSuspicious = true;
        this.activeType = 'focus_lost';
        this.options.pausePlayer();
        this.options.onStateChange(true, 'focus_lost', 'Server-side penalty active');
        this.startCooldown();
      }
    }
  }

  // Handle storage changes from other tabs for multi-tab sync
  private handleStorageChange = (e: StorageEvent) => {
    // Skip self-dispatched events to prevent re-entrant loops within the same tab
    if (this.isDispatchingStorage) {
      console.log("[SECURITY] handleStorageChange skipped (self-dispatch)");
      return;
    }

    console.log("[SECURITY] handleStorageChange event received:", {
      key: e.key,
      newValue: e.newValue,
      oldValue: e.oldValue
    });

    if (e.key === 'trineo_security_lock_until' && e.newValue) {
      // Only process if we're not already managing a cooldown on this tab
      if (this.cooldownActive) {
        console.log("[SECURITY] handleStorageChange skipped (cooldown already active on this tab)");
        return;
      }

      const lockUntil = parseInt(e.newValue, 10);
      const remaining = Math.max(0, Math.ceil((lockUntil - this.getAdjustedNow()) / 1000));

      console.log("[SECURITY] handleStorageChange evaluation:", {
        penaltyUntil: new Date(lockUntil).toISOString(),
        serverTime: new Date(this.getAdjustedNow()).toISOString(),
        remainingSeconds: remaining,
        securityLockActive: remaining > 0
      });

      if (remaining > 0) {
        this.isSuspicious = true;
        this.activeType = 'focus_lost';
        this.options.pausePlayer();
        this.options.onStateChange(true, 'focus_lost', 'Security penalty synced from another tab');
        this.cooldownTimeRemaining = remaining;
        this.startCooldown();
      }
    }
    if (e.key === 'trineo_security_lock_until' && !e.newValue) {
      console.log("[SECURITY] handleStorageChange cleared, calling recoverFromViolation()");
      // Lock was cleared in another tab
      this.recoverFromViolation();
    }
  };

  private startCooldown() {
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
      this.cooldownInterval = null;
    }
    this.cooldownActive = true;

    console.error("START COOLDOWN");
    console.trace("START COOLDOWN");
    console.log(this.cooldownTimeRemaining);

    console.log("[SECURITY] startCooldown() triggered. remainingSeconds:", this.cooldownTimeRemaining);

    // Emit initial value immediately
    this.options.onCooldownTimeChange?.(this.cooldownTimeRemaining);

    // Strictly decrement by 1 per second — immune to system clock manipulation
    this.cooldownInterval = setInterval(() => {
      console.log("[SECURITY] startCooldown tick before decrement. remainingSeconds:", this.cooldownTimeRemaining);
      this.cooldownTimeRemaining = Math.max(0, this.cooldownTimeRemaining - 1);
      
      console.log("[SECURITY] startCooldown tick after decrement. remainingSeconds:", this.cooldownTimeRemaining);

      this.options.onCooldownTimeChange?.(this.cooldownTimeRemaining);

      if (this.cooldownTimeRemaining <= 0) {
        console.log("[SECURITY] startCooldown countdown hit 0. Triggering recoverFromViolation()");
        this.clearCooldown();
        // Auto-recover when penalty expires
        this.recoverFromViolation();
      }
    }, 1000);
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

  public terminateSession(reason?: string) {
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

    // Clear sessionStorage
    sessionStorage.clear();

    // Invalidate session on heartbeat server
    apiFetch('/auth/logout', {
      method: 'POST'
    }).catch(() => {});

    // Notify player
    this.options.onTerminateSession('Security violations exceeded. Session terminated.');

    // Redirect to security lock page
    const finalReason = reason === 'locked' ? 'locked' : 'exceeded';
    window.location.href = `/security-lock?reason=${finalReason}`;
  }

  public recoverFromViolation() {
    console.error("RECOVER FROM VIOLATION");
    console.trace("RECOVER FROM VIOLATION");
    console.log("[SECURITY] recoverFromViolation() called");
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
    const lockActive = requiresManualResume || this.getAdjustedNow() < lockUntil;

    if (lockActive) {
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
