export const getPlatformInfo = (userAgent = '', headers = {}) => {
  const ua = userAgent.toLowerCase();
  
  // 1. App Webview / Custom headers detection
  const hasAppHeader = String(headers['x-trineo-app'] || '').toLowerCase() === 'android';
  const hasAppUA = ua.includes('trineoandroid') || ua.includes('trineostreamandroid');
  const isAndroidApp = hasAppHeader || hasAppUA;

  // 2. Platform OS checks
  const isWindows = ua.includes('windows');
  const isAndroid = ua.includes('android');
  
  // Touch Mac check for iPad Safari Desktop Mode
  const isTouchMac = (ua.includes('macintosh') || ua.includes('mac os') || ua.includes('mac os x')) && 
                     (ua.includes('mobile') || ua.includes('touch') || (ua.includes('safari') && !ua.includes('version/')));
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

  let appType = 'Web';
  if (isAndroidApp) {
    appType = 'Android App';
  } else if (isAndroid) {
    appType = 'Android Browser';
  } else if (isWindows) {
    appType = 'Windows Web';
  } else if (isMac) {
    appType = 'macOS Web';
  } else if (isLinux) {
    appType = 'Linux Web';
  } else if (isChromeOS) {
    appType = 'ChromeOS Web';
  }

  // Future:
  // Validate Android app version and enforce minimum supported version.

  return {
    platform: os,
    appType,
    isAndroidApp,
    isWindows,
    isAndroid,
    isMac,
    isLinux,
    isIPhone,
    isIPad,
    isChromeOS
  };
};

export const isPlatformAllowed = (role, platformInfo) => {
  if (role === 'student') {
    // Students ONLY allowed on Windows or the Official Android App
    return platformInfo.isWindows || platformInfo.isAndroidApp;
  } else {
    // Admins/Owners allowed on Windows, macOS, Linux, and Android (App & Browser)
    return platformInfo.isWindows || platformInfo.isMac || platformInfo.isLinux || platformInfo.isAndroid;
  }
};
