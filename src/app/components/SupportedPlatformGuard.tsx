import React, { useEffect } from 'react';
import { Button } from './ui/button';
import { SessionTerminationService } from '../utils/SessionTerminationService';
import { apiFetch, clearLocalStorageKeepingTheme } from '../utils/api';

export default function SupportedPlatformGuard({ children }: { children: React.ReactNode }) {
  const ua = navigator.userAgent.toLowerCase();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    let user: any = null;
    try {
      user = JSON.parse(userStr);
    } catch (_) {
      return;
    }
    const isStudent = user && user.role === 'student';
    if (!isStudent) return;

    // Detect if running inside the official Android App
    const freshUa = navigator.userAgent.toLowerCase();
    const isAndroidApp = freshUa.includes('trineoandroid') || freshUa.includes('trineostreamandroid') || (window as any).AndroidApp;

    // 1. Detect keyboard shortcuts (F12, Ctrl+Shift+I/J/C) - Desktop browsers only
    const handleDevToolsKeys = (e: KeyboardEvent) => {
      const isF12 = e.key === 'F12' || e.code === 'F12';
      const isInspect = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c');
      if (isF12 || isInspect) {
        e.preventDefault();
        
        console.log("[SECURITY] F12 pressed");
        console.log("[SECURITY] Reporting DevTools violation");
        console.log("[SECURITY] Terminating session");

        // Log violation on backend
        apiFetch('/security/audit', {
          method: 'POST',
          body: JSON.stringify({
            eventType: 'devtools',
            details: `DevTools hotkey (${e.key}) pressed.`
          }),
          ignoreAuthError: true
        }).catch(() => {});

        // Terminate session instantly
        SessionTerminationService.terminate('devtools_open');
      }
    };

    if (!isAndroidApp) {
      window.addEventListener('keydown', handleDevToolsKeys, true);
    }

    // 2. Periodically monitor layout bounds and console print checks - Desktop browsers only
    const threshold = 160;
    let interval: any = null;
    if (!isAndroidApp) {
      interval = setInterval(() => {
        // Bounds check: detects docked DevTools and Chrome device emulation toolbar
        const widthDiff = window.outerWidth - window.innerWidth;
        const heightDiff = window.outerHeight - window.innerHeight;
        if (widthDiff > threshold || heightDiff > threshold) {
          console.warn("[SECURITY] DevTools or Device Emulation viewport violation.");
          SessionTerminationService.terminate('devtools_open');
          return;
        }

        // toString console check: detects undocked/separate window DevTools
        let devtoolsOpen = false;
        const devObject = /./;
        devObject.toString = function() {
          devtoolsOpen = true;
          return '';
        };
        console.log(devObject);

        if (devtoolsOpen) {
          console.warn("[SECURITY] DevTools window active via console check.");
          SessionTerminationService.terminate('devtools_open');
        }
      }, 1000);
    }

    // 3. Dynamic Platform & Viewport Emulation change detector
    const handlePlatformOrDevToolsChange = () => {
      // Dimension/bounds checks are only run on desktop to prevent false positives inside WebView (soft keyboard, rotation)
      if (!isAndroidApp) {
        const wDiff = window.outerWidth - window.innerWidth;
        const hDiff = window.outerHeight - window.innerHeight;
        if (wDiff > threshold || hDiff > threshold) {
          console.warn("[SECURITY] DevTools or Device Emulation bounds violation on viewport change.");
          SessionTerminationService.terminate('devtools_open');
          return;
        }
      }

      // Read fresh user agent and app state
      const freshUa = navigator.userAgent.toLowerCase();
      const freshIsApp = freshUa.includes('trineoandroid') || freshUa.includes('trineostreamandroid') || (window as any).AndroidApp;
      const freshIsWindows = freshUa.includes('windows');
      const freshIsSupportedStudent = freshIsWindows || freshIsApp;

      if (!freshIsSupportedStudent) {
        console.warn("[SECURITY] Platform changed dynamically to an unsupported state. Terminating session...");
        SessionTerminationService.terminate('platform_changed');
      }
    };

    if (!isAndroidApp) {
      window.addEventListener('resize', handlePlatformOrDevToolsChange);
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handlePlatformOrDevToolsChange);
      }
    }

    // Call once initially to validate platform on mount
    handlePlatformOrDevToolsChange();

    return () => {
      window.removeEventListener('keydown', handleDevToolsKeys, true);
      window.removeEventListener('resize', handlePlatformOrDevToolsChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handlePlatformOrDevToolsChange);
      }
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);
  
  // 1. Android WebView App detection
  const isApp = ua.includes('trineoandroid') || ua.includes('trineostreamandroid') || (window as any).AndroidApp;
  
  // 2. Platform OS checks
  const isWindows = ua.includes('windows');
  const isAndroid = ua.includes('android');
  
  // Touch points check for iPad Safari Desktop mode
  const isTouchMac = (ua.includes('macintosh') || ua.includes('mac os') || ua.includes('mac os x')) && 
                     (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
  const isIPad = ua.includes('ipad') || ua.includes('ipod') || isTouchMac;
  const isIPhone = ua.includes('iphone');
  const isChromeOS = ua.includes('cros') || ua.includes('chromeos');
  const isLinux = ua.includes('linux') && !isAndroid && !isChromeOS;
  const isMac = (ua.includes('macintosh') || ua.includes('mac os') || ua.includes('mac os x')) && !isIPad;

  let os = 'Unknown';
  if (isIPhone) os = 'iPhone';
  else if (isIPad) os = 'iPad';
  else if (isChromeOS) os = 'ChromeOS';
  else if (isWindows) os = 'Windows';
  else if (isAndroid) os = 'Android';
  else if (isMac) os = 'macOS';
  else if (isLinux) os = 'Linux';

  // Retrieve user role from localStorage
  const userStr = localStorage.getItem('user');
  let user: any = null;
  try {
    user = userStr ? JSON.parse(userStr) : null;
  } catch (e) {}

  const isStudent = user ? user.role === 'student' : true;
  
  // Check if student platform is allowed: Windows browser or official app
  const isSupportedStudent = isWindows || isApp;
  
  // Check if admin/owner platform is allowed: Windows, macOS, Linux, or Android browser/app
  const isSupportedAdmin = isWindows || isMac || isLinux || isAndroid || isApp;

  // Let macOS logins go through to the login page (since they could be admin)
  // If they are a logged-in student, block them.
  const isBlocked = isStudent 
    ? (!isSupportedStudent && (!isMac || !!user)) 
    : !isSupportedAdmin;

  // If blocked, render the professional full-screen page
  if (isBlocked) {
    const apkUrl = localStorage.getItem('trineo_apk_url') || '';
    const isAndroidBrowser = isAndroid && !isApp;

    return (
      <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#06060f] text-white p-6 select-none font-sans">
        <div className="max-w-md w-full text-center space-y-8 bg-[#0a0a1a] border border-white/[0.08] p-8 rounded-[32px] shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-black tracking-tight text-white/95">This device isn't supported</h1>
            <p className="text-sm text-white/40 leading-relaxed px-4">
              Students can access Trineo Stream only from:
            </p>
          </div>
          
          <div className="py-4 px-6 bg-white/[0.02] border border-white/[0.04] rounded-2xl space-y-3 text-left w-fit mx-auto">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-emerald-400">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
              <span>✅ Windows PC</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm font-semibold text-emerald-400">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
              <span>✅ Official Trineo Android App</span>
            </div>
          </div>
          
          <p className="text-xs text-white/30 font-medium">
            Your current platform ({os}) is restricted. Please switch to a supported device.
          </p>
          
          <div className="flex flex-col gap-3 pt-2">
            {isAndroidBrowser && (
              <Button 
                onClick={() => {
                  window.location.href = 'trineostream://open';
                }}
                className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-bold h-11 rounded-xl shadow-lg shadow-purple-500/20"
              >
                Open in Trineo App
              </Button>
            )}
            
            {apkUrl && (
              <Button 
                onClick={() => window.open(apkUrl, '_blank')}
                className="w-full bg-white/10 hover:bg-white/15 text-white text-xs font-bold h-11 rounded-xl"
              >
                Download Android App
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={() => {
                clearLocalStorageKeepingTheme();
                window.location.href = '/login';
              }}
              className="w-full border-white/[0.08] hover:bg-white/[0.04] text-xs font-bold h-11 rounded-xl"
            >
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
