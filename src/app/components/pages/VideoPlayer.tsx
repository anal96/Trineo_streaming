import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { motion } from 'motion/react';
import Hls from 'hls.js';
import { ProtectionManager } from '../../utils/ProtectionManager';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
  ChevronLeft,
  Lock,
  CheckCircle2,
  Circle,
  FileText,
  Download,
  PlayCircle,
  Flag,
  Maximize2,
  SkipForward,
  Tv,
  ShieldAlert,
  Sun,
  ChevronsLeft,
  ChevronsRight,
  X,
  ChevronRight,
  Calendar,
  History,
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { apiFetch, getApiUrl } from '../../utils/api';
import { ThemeToggleButton } from '../ThemeToggle';
import { toast } from 'sonner';

const xorEncryptDecrypt = (str: string, key: string): string => {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  return result;
};

const decryptVideoId = (encryptedBase64: string, userId: string, lessonId: string): string => {
  if (!encryptedBase64) return '';
  const key = `${userId}_${lessonId}`;
  try {
    const decodedBinary = atob(encryptedBase64);
    return xorEncryptDecrypt(decodedBinary, key);
  } catch (e) {
    console.error('[DRM Decrypt Failure]', e);
    return '';
  }
};

const YOUTUBE_VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

const extractYouTubeVideoId = (value: string): string => {
  if (!value) return '';

  const trimmed = value.trim();
  if (YOUTUBE_VIDEO_ID_PATTERN.test(trimmed)) return trimmed;

  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.replace(/^www\./, '');

    if (hostname === 'youtu.be') {
      const candidate = parsed.pathname.split('/').filter(Boolean)[0] || '';
      return YOUTUBE_VIDEO_ID_PATTERN.test(candidate) ? candidate : '';
    }

    if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
      const fromSearch = parsed.searchParams.get('v') || '';
      if (YOUTUBE_VIDEO_ID_PATTERN.test(fromSearch)) return fromSearch;

      const embedMatch = parsed.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
      if (embedMatch) return embedMatch[1];

      const shortsMatch = parsed.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
      if (shortsMatch) return shortsMatch[1];
    }
  } catch (_e) {
    return '';
  }

  return '';
};

export default function VideoPlayer() {
  const navigate = useNavigate();
  const { courseSlug, lessonSlug } = useParams();
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const blackOverlayRef = useRef<HTMLDivElement>(null);
  const recoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const protectionManagerRef = useRef<ProtectionManager | null>(null);

  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const courseId = course?._id || '';
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<string>('default');
  const [videoProgress, setVideoProgress] = useState(0); 
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [theaterMode, setTheaterMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [mobileLessonsOpen, setMobileLessonsOpen] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  const [activeTab, setActiveTab] = useState<'lessons' | 'materials' | 'info' | 'live-classes'>('lessons');
  // Default active tab on mount (lessons on mobile, materials on desktop)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth >= 768) {
        setActiveTab('materials');
      }
    }
  }, []);

  // Static watermark — centered, higher opacity for visibility
  const watermarkStyle = { opacity: 0.25, rotate: '-8deg' };

  // Security Counter State
  const [violationCount, setViolationCount] = useState(0);
  const [cooldownTimeRemaining, setCooldownTimeRemaining] = useState(0);

  // Advanced Anti-Piracy DRM States
  const [isBlackedOut, setIsBlackedOut] = useState(false);
  const [provider, setProvider] = useState<'youtube' | 'hls'>('youtube');
  const wasPlayingBeforeBlackout = useRef(false);
  const [ipAddress, setIpAddress] = useState('127.0.0.1');
  const [sessionId, setSessionId] = useState('N/A');


  // Brightness Control (value 0.1 to 1.0)
  const [brightness, setBrightness] = useState(1.0);

  // Gesture HUD Overlay States
  const [hudVisible, setHudVisible] = useState(false);
  const [hudType, setHudType] = useState<'volume' | 'brightness'>('volume');
  const [hudValue, setHudValue] = useState(0); // 0 to 100
  const [doubleTapFeedback, setDoubleTapFeedback] = useState<'rewind' | 'forward' | null>(null);
  
  const hudTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const doubleTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Touch & Swipe gesture refs
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const touchStartVolumeRef = useRef<number>(1);
  const touchStartBrightnessRef = useRef<number>(1);
  const lastTapRef = useRef<number>(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSwipingRef = useRef<boolean>(false);

  // Auto-Next Lesson toggle state
  const [autoNext, setAutoNext] = useState(() => {
    const saved = localStorage.getItem('autoNext');
    return saved === null ? true : saved === 'true';
  });

  // Save autoNext on change
  useEffect(() => {
    localStorage.setItem('autoNext', autoNext.toString());
  }, [autoNext]);

  // Course level Study Materials fetched from backend
  const [courseMaterials, setCourseMaterials] = useState<any[]>([]);
  const [liveClasses, setLiveClasses] = useState<any[]>([]);
  const [liveClassesLoading, setLiveClassesLoading] = useState(false);

  // Lesson issue reporting
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState('Playback bug');
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Advanced DRM Heuristics: Security Logging to Backend Audit System
  const reportSecurityViolation = async (eventType: string, details: string) => {
    const localAudit = {
      _id: `local-${Date.now()}`,
      eventType,
      details,
      createdAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      deviceFingerprint: navigator.userAgent
    };

    try {
      await apiFetch('/security/audit', {
        method: 'POST',
        body: JSON.stringify({
          eventType,
          details,
          deviceFingerprint: navigator.userAgent
        })
      });
    } catch (e) {
      console.error('[DRM Audit Failure]', e);
      try {
        const existing = JSON.parse(localStorage.getItem('trineo_security_audit') || '[]');
        localStorage.setItem('trineo_security_audit', JSON.stringify([localAudit, ...existing].slice(0, 50)));
      } catch (_err) {}
    }
  };

  // Sync refs for the ProtectionManager callback
  const isPlayingRef = useRef(false);
  const providerRef = useRef<'youtube' | 'hls'>('youtube');

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    providerRef.current = provider;
  }, [provider]);

  // Centralized ProtectionManager Integration
  useEffect(() => {
    if (!user) return;

    const manager = new ProtectionManager({
      userId: user.user_id || user.id || user._id || '',
      email: user.email || '',
      ipAddress: ipAddress,
      sessionId: sessionId,
      getCurrentPlaybackState: () => {
        return {
          isPlaying: isPlayingRef.current,
          provider: providerRef.current
        };
      },
      pausePlayer: () => {
        if (providerRef.current === 'youtube') {
          if (playerRef.current && playerRef.current.pauseVideo) {
            try { playerRef.current.pauseVideo(); } catch (e) {}
          }
        } else {
          if (videoRef.current) {
            try { videoRef.current.pause(); } catch (e) {}
          }
        }
        setIsPlaying(false);
      },
      resumePlayer: () => {
        if (providerRef.current === 'youtube') {
          if (playerRef.current && playerRef.current.playVideo) {
            try {
              playerRef.current.playVideo();
              setIsPlaying(true);
            } catch (e) {}
          }
        } else {
          if (videoRef.current) {
            videoRef.current.play().then(() => {
              setIsPlaying(true);
            }).catch(e => console.error(e));
          }
        }
      },
      onStateChange: (suspicious, type, details) => {
        setIsBlackedOut(suspicious);
      },
      onViolationCountChange: (count) => {
        setViolationCount(count);
      },
      onCooldownTimeChange: (timeRemaining) => {
        setCooldownTimeRemaining(timeRemaining);
      },
      onTerminateSession: (reason) => {
        setIsPlaying(false);
      },
      reportViolation: (type, details) => {
        const finalType = (type === 'screenshot' || type === 'PrintScreen' || type === 'screenshot_attempt')
          ? 'screenshot'
          : type;
        reportSecurityViolation(finalType, details);
      }
    });

    protectionManagerRef.current = manager;
    manager.start();

    // [TEMP DISABLED] Right-Click Context Menu block — re-enable for production
    const handleContextMenu = (_e: MouseEvent) => {
      // e.preventDefault(); // temporarily allowing right-click
    };
    window.addEventListener('contextmenu', handleContextMenu);

    // Prevent direct drag-and-drop downloading
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener('dragstart', handleDragStart);

    return () => {
      manager.stop();
      protectionManagerRef.current = null;
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('dragstart', handleDragStart);
    };
  }, [user, ipAddress, sessionId]);

  // Watermark is static — no movement effect needed

  // 2. Active Session Heartbeat (shortened to 5 seconds) and user fetch
  useEffect(() => {
    const cachedUser = localStorage.getItem('user');
    if (cachedUser) setUser(JSON.parse(cachedUser));

    const runHeartbeat = async () => {
      try {
        const res = await apiFetch('/auth/heartbeat');
        if (res.ipAddress) setIpAddress(res.ipAddress);
        if (res.sessionId) setSessionId(res.sessionId);
      } catch (err: any) {
        if (err.message && err.message.includes('Session invalidated')) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/');
        }
      }
    };
    runHeartbeat();
    const heartbeat = setInterval(runHeartbeat, 5000);

    return () => {
      clearInterval(heartbeat);
    };
  }, [navigate]);


  // Load YouTube Player API script dynamically if not present
  useEffect(() => {
    if ((window as any).YT) return;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
  }, []);

  // Fetch course & lessons
  useEffect(() => {
    const loadCourseDetails = async () => {
      setLoading(true);
      setError('');
      try {
        if (!courseSlug || courseSlug === 'undefined') {
          setError('Course not found.');
          return;
        }
        const data = await apiFetch(`/courses/slug/${courseSlug}`);
        setCourse(data);
        setLessons(data.lessons || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load video playlist');
      } finally {
        setLoading(false);
      }
    };
    if (courseSlug && courseSlug !== 'undefined') {
      loadCourseDetails();
    } else {
      setError('Course not found.');
      setLoading(false);
    }
  }, [courseSlug]);

  useEffect(() => {
    if (!lessons.length) return;
    const selectedLesson = lessonSlug
      ? lessons.find((l: any) => l.slug === lessonSlug)
      : null;
    const firstPlayable = lessons.find((l: any) => !l.isLocked) || lessons[0];
    setCurrentLesson(selectedLesson || firstPlayable || null);
  }, [lessonSlug, lessons]);

  // Fetch course study materials
  useEffect(() => {
    const loadStudyMaterials = async () => {
      try {
        if (!courseId) return;
        const data = await apiFetch(`/materials?courseId=${courseId}`);
        setCourseMaterials(data || []);
      } catch (err) {
        console.error('Failed to load study materials:', err);
      }
    };
    const fetchLiveClasses = async () => {
      setLiveClassesLoading(true);
      try {
        if (!courseId) return;
        const data = await apiFetch(`/live-classes/course/${courseId}`);
        setLiveClasses(data || []);
      } catch (err) {
        console.error('Failed to load course live classes:', err);
      } finally {
        setLiveClassesLoading(false);
      }
    };
    if (courseId) {
      loadStudyMaterials();
      fetchLiveClasses();
    }
  }, [courseId]);



  // Helper to load user synchronously from state or localStorage
  const getCurrentUser = () => {
    if (user) return user;
    const cachedUser = localStorage.getItem('user');
    if (cachedUser) {
      try {
        return JSON.parse(cachedUser);
      } catch (e) {}
    }
    return null;
  };

  // Fetch YouTube Watch Token/Video ID
  useEffect(() => {
    if (!currentLesson) return;

    // Reset player state
    setIsPlaying(false);
    setVideoProgress(0);
    setCurrentTime(0);
    setActiveVideoId(null);

    // Enforce hierarchical content access management locks
    if (course?.isLocked) {
      setError(course.lockReason || '🔒 Course Locked. Please contact your institute for access.');
      return;
    } else if (currentLesson.isLocked) {
      setError(currentLesson.lockReason || '🔒 Lesson Locked');
      return;
    } else {
      setError('');
    }

    const fetchWatchVideoId = async () => {
      try {
        const data = await apiFetch(`/videos/watch/${currentLesson._id}`);
        setProvider(data.videoProvider || 'youtube');
        if (data.youtubeVideoId) {
          const currentUser = getCurrentUser();
          const rawVideoId = data.isEncrypted && currentUser
            ? decryptVideoId(data.youtubeVideoId, currentUser._id, currentLesson._id)
            : data.youtubeVideoId;
          const normalizedVideoId = extractYouTubeVideoId(rawVideoId);

          if (!normalizedVideoId) {
            setError('This video is currently unavailable.');
            return;
          }

          if (data.isEncrypted && currentUser) {
            setActiveVideoId(normalizedVideoId);
          } else {
            setActiveVideoId(normalizedVideoId);
          }
        } else {
          setError('This video is currently unavailable.');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to authorize video watch access.');
      }
    };

    fetchWatchVideoId();
  }, [currentLesson, course, user]);

  // Initialize YT.Player & handle state change / time updates
  useEffect(() => {
    if (!activeVideoId || provider !== 'youtube') return;
    if (!YOUTUBE_VIDEO_ID_PATTERN.test(activeVideoId)) {
      setError('This video is currently unavailable.');
      return;
    }

    let player: any = null;
    let timeInterval: any = null;

    const initPlayer = () => {
      const container = document.getElementById('youtube-iframe-holder');
      if (!container) return;

      // Clean standard children
      container.innerHTML = '';

      // Establish closed Shadow DOM boundary to encapsulate the iframe
      let shadowRoot = (container as any).__shadowRoot__;
      if (!shadowRoot) {
        shadowRoot = container.attachShadow({ mode: 'closed' });
        (container as any).__shadowRoot__ = shadowRoot;
      }
      
      shadowRoot.innerHTML = '';

      // Set up locked-down element styling inside the Closed Shadow DOM boundary
      const style = document.createElement('style');
      style.textContent = `
        #youtube-player-el, iframe {
          width: 100%;
          height: 100%;
          border: none;
        }
      `;
      shadowRoot.appendChild(style);

      const playerEl = document.createElement('div');
      playerEl.id = 'youtube-player-el';
      shadowRoot.appendChild(playerEl);

      player = new (window as any).YT.Player(playerEl, {
        height: '100%',
        width: '100%',
        videoId: activeVideoId,
        playerVars: {
          controls: 0,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          showinfo: 0,
          disablekb: 1,
          fs: 0,
          autohide: 1,
          origin: window.location.origin
        },
        events: {
          onReady: (event: any) => {
            playerRef.current = event.target;
            
            // Set initial volume & speed
            event.target.setVolume(isMuted ? 0 : volume * 100);
            event.target.setPlaybackRate(playbackSpeed);
            
            const total = event.target.getDuration() || 0;
            setDuration(total);

            // Populate initial dynamic qualities if loaded immediately
            if (event.target.getAvailableQualityLevels) {
              const qualities = event.target.getAvailableQualityLevels();
              setAvailableQualities(qualities || []);
            }

            // Apply auto-resume memory
            const savedTime = localStorage.getItem(`resume_${currentLesson?._id}`);
            if (savedTime) {
              event.target.seekTo(parseFloat(savedTime), true);
              setCurrentTime(parseFloat(savedTime));
              setVideoProgress(total > 0 ? (parseFloat(savedTime) / total) * 100 : 0);
            }
          },
          onStateChange: (event: any) => {
            const state = event.data;
            if (state === 1) {
              const lockUntil = parseInt(localStorage.getItem('trineo_security_lock_until') || '0', 10);
              const requiresManualResume = localStorage.getItem('trineo_lock_requires_manual_resume') === 'true';
              if (requiresManualResume || Date.now() < lockUntil) {
                try { event.target.pauseVideo(); } catch (e) {}
                setIsPlaying(false);
                setIsBlackedOut(true);
                return;
              }
              setIsPlaying(true);
              setIsBlackedOut(false);
            } else if (state === 2) {
              setIsPlaying(false);
            } else if (state === 0) {
              setIsPlaying(false);
              // Mark completed!
              if (currentLesson?._id) {
                localStorage.setItem(`completed_${currentLesson._id}`, 'true');
              }
              // Auto-Next Lesson Trigger
              if (autoNext) {
                const currentIndex = lessons.findIndex(l => l._id === currentLesson._id);
                if (currentIndex !== -1 && currentIndex < lessons.length - 1) {
                  const nextLesson = lessons[currentIndex + 1];
                  if (!nextLesson.isLocked) {
                    setCurrentLesson(nextLesson);
                    toast.success(`Playing next: ${nextLesson.title}`);
                  }
                }
              }
            }
          }
        }
      });
    };

    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer();
    } else {
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    }

    // Time polling loop (250ms)
    timeInterval = setInterval(() => {
      if (player && player.getCurrentTime && player.getDuration) {
        try {
          const current = player.getCurrentTime();
          const total = player.getDuration() || 0;
          if (total > 0) {
            setCurrentTime(current);
            setDuration(total);
            setVideoProgress((current / total) * 100);

            // Mark completed if >= 90% watched
            if (current / total >= 0.9 && currentLesson?._id) {
              localStorage.setItem(`completed_${currentLesson._id}`, 'true');
            }

            // Save resume state
            if (Math.floor(current) % 2 === 0) {
              localStorage.setItem(`resume_${currentLesson?._id}`, current.toString());
            }

            // Dynamically fetch qualities if they cued after onReady
            if (player.getAvailableQualityLevels && availableQualities.length === 0) {
              const qualities = player.getAvailableQualityLevels();
              if (qualities && qualities.length > 0) {
                setAvailableQualities(qualities);
              }
            }
          }
        } catch (e) {}
      }
    }, 250);

    return () => {
      clearInterval(timeInterval);
      if (player && player.destroy) {
        player.destroy();
      }
      playerRef.current = null;
    };
  }, [activeVideoId, provider, currentLesson, autoNext, lessons]);

  // Initialize HLS Player (hls.js) & handle events
  useEffect(() => {
    if (!activeVideoId || provider !== 'hls') return;

    let hls: Hls | null = null;
    const video = videoRef.current;
    if (!video) return;

    // Reset progress/time states
    setIsPlaying(false);
    setVideoProgress(0);
    setCurrentTime(0);

    const streamUrl = getApiUrl(`/videos/stream/${activeVideoId}/playlist.m3u8`);

    // Memory resume logic for HLS
    const savedTime = localStorage.getItem(`resume_${currentLesson?._id}`);
    const onLoadedMetadata = () => {
      const total = video.duration || 0;
      setDuration(total);
      if (savedTime) {
        const parsed = parseFloat(savedTime);
        video.currentTime = parsed;
        setCurrentTime(parsed);
        setVideoProgress(total > 0 ? (parsed / total) * 100 : 0);
      }
    };
    video.addEventListener('loadedmetadata', onLoadedMetadata);

    if (Hls.isSupported()) {
      hls = new Hls({
        maxMaxBufferLength: 10,
      });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const levels = hls?.levels || [];
        setAvailableQualities(levels.map((lvl, index) => `${lvl.height || index}p`));
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls?.recoverMediaError();
              break;
            default:
              setError('Failed to load video stream');
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
    }

    const handleTimeUpdate = () => {
      const current = video.currentTime;
      const total = video.duration || 0;
      setCurrentTime(current);
      setVideoProgress(total > 0 ? (current / total) * 100 : 0);

      // Mark completed if >= 90% watched
      if (total > 0 && current / total >= 0.9 && currentLesson?._id) {
        localStorage.setItem(`completed_${currentLesson._id}`, 'true');
      }

      // Save resume state
      if (Math.floor(current) % 2 === 0) {
        localStorage.setItem(`resume_${currentLesson?._id}`, current.toString());
      }
    };

    const handleDurationChange = () => {
      setDuration(video.duration || 0);
    };

    const handlePlay = () => {
      const lockUntil = parseInt(localStorage.getItem('trineo_security_lock_until') || '0', 10);
      const requiresManualResume = localStorage.getItem('trineo_lock_requires_manual_resume') === 'true';
      if (requiresManualResume || Date.now() < lockUntil) {
        if (videoRef.current) {
          try { videoRef.current.pause(); } catch (e) {}
        }
        setIsPlaying(false);
        setIsBlackedOut(true);
        return;
      }
      setIsPlaying(true);
      setIsBlackedOut(false);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      // Mark completed!
      if (currentLesson?._id) {
        localStorage.setItem(`completed_${currentLesson._id}`, 'true');
      }
      // Auto-Next Lesson Trigger
      if (autoNext) {
        const currentIndex = lessons.findIndex(l => l._id === currentLesson._id);
        if (currentIndex !== -1 && currentIndex < lessons.length - 1) {
          const nextLesson = lessons[currentIndex + 1];
          if (!nextLesson.isLocked) {
            setCurrentLesson(nextLesson);
            toast.success(`Playing next: ${nextLesson.title}`);
          }
        }
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    // Apply volume/mute state on load
    video.muted = isMuted;
    video.volume = volume;
    video.playbackRate = playbackSpeed;

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      if (hls) {
        hls.destroy();
      }
      hlsRef.current = null;
    };
  }, [activeVideoId, provider, currentLesson, autoNext, lessons]);

  // Periodic watch progress reporter (updates DB every 5 seconds of play)
  useEffect(() => {
    if (!isPlaying || !currentLesson) return;

    const progressTimer = setInterval(async () => {
      if (provider === 'youtube' && !playerRef.current) return;
      if (provider === 'hls' && !videoRef.current) return;
      
      const current = currentTime;
      const total = duration;
      
      if (!total || total === 0) return;

      const percentage = Math.round((current / total) * 100);

      try {
        await apiFetch('/progress/update', {
          method: 'POST',
          body: JSON.stringify({
            lessonId: currentLesson._id,
            progress: percentage
          })
        });
      } catch (err) {
        console.error('Failed to sync watch history progress:', err);
      }
    }, 5000);

    return () => clearInterval(progressTimer);
  }, [isPlaying, currentLesson, currentTime, duration, provider]);

  // Handle Play/Pause
  const togglePlay = () => {
    const lockUntil = parseInt(localStorage.getItem('trineo_security_lock_until') || '0', 10);
    const requiresManualResume = localStorage.getItem('trineo_lock_requires_manual_resume') === 'true';
    if (requiresManualResume || Date.now() < lockUntil) {
      toast.error('Playback is suspended due to security lock.');
      return;
    }

    setControlsVisible(true);
    if (provider === 'youtube') {
      if (!playerRef.current) return;
      if (isPlaying) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        playerRef.current.playVideo();
        setIsPlaying(true);
      }
    } else {
      if (!videoRef.current) return;
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch(e => console.error(e));
        setIsPlaying(true);
      }
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') return;
      if (provider === 'youtube' && !playerRef.current) return;
      if (provider === 'hls' && !videoRef.current) return;

      switch(e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'KeyF':
          e.preventDefault();
          playerContainerRef.current?.requestFullscreen();
          break;
        case 'ArrowRight':
          e.preventDefault();
          const nextTime = Math.min(currentTime + 10, duration);
          if (provider === 'youtube') {
            playerRef.current.seekTo(nextTime, true);
          } else {
            videoRef.current.currentTime = nextTime;
          }
          setCurrentTime(nextTime);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          const prevTime = Math.max(currentTime - 10, 0);
          if (provider === 'youtube') {
            playerRef.current.seekTo(prevTime, true);
          } else {
            videoRef.current.currentTime = prevTime;
          }
          setCurrentTime(prevTime);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTime, duration, provider]);

  // Seek by an offset (used in double-tap gestures)
  const seekOffset = (offset: number) => {
    if (duration === 0) return;
    if (provider === 'youtube' && !playerRef.current) return;
    if (provider === 'hls' && !videoRef.current) return;

    const targetSeconds = Math.max(0, Math.min(duration, currentTime + offset));
    if (provider === 'youtube') {
      playerRef.current.seekTo(targetSeconds, true);
    } else {
      videoRef.current.currentTime = targetSeconds;
    }
    setCurrentTime(targetSeconds);
    setVideoProgress((targetSeconds / duration) * 100);
  };

  // Touch handlers for Volume & Brightness swipes and Double-Tap seeking
  const handlePlayerTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    // Only capture single finger touches
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    
    // Save starting swipe coordinates
    touchStartPosRef.current = { x: touchX, y: touchY };
    
    // Store current volume & brightness values
    touchStartVolumeRef.current = volume;
    touchStartBrightnessRef.current = brightness;
    isSwipingRef.current = false;

    // Double tap detection
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // It's a double tap!
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      
      const width = rect.width;
      if (touchX < width * 0.4) {
        // Rewind 10s
        seekOffset(-10);
        setDoubleTapFeedback('rewind');
        if (doubleTapTimeoutRef.current) clearTimeout(doubleTapTimeoutRef.current);
        doubleTapTimeoutRef.current = setTimeout(() => setDoubleTapFeedback(null), 600);
      } else if (touchX > width * 0.6) {
        // Forward 10s
        seekOffset(10);
        setDoubleTapFeedback('forward');
        if (doubleTapTimeoutRef.current) clearTimeout(doubleTapTimeoutRef.current);
        doubleTapTimeoutRef.current = setTimeout(() => setDoubleTapFeedback(null), 600);
      }
      
      lastTapRef.current = 0; // reset
    } else {
      // Single tap candidate
      lastTapRef.current = now;
    }
    
    // Always trigger handleMouseMove to show controls on touch
    handleMouseMove();
  };

  const handlePlayerTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartPosRef.current) return;
    
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    
    const diffX = touchX - touchStartPosRef.current.x;
    const diffY = touchStartPosRef.current.y - touchY; // positive means swiping UP
    
    // Detect vertical swipe (drag distance threshold > 15px and predominantly vertical)
    if (!isSwipingRef.current && Math.abs(diffY) > 15 && Math.abs(diffY) > Math.abs(diffX)) {
      isSwipingRef.current = true;
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
    }
    
    if (isSwipingRef.current) {
      // Prevent screen scrolling
      if (e.cancelable) e.preventDefault();
      
      const width = rect.width;
      const height = rect.height;
      
      // Determine left side (brightness) vs right side (volume)
      if (touchStartPosRef.current.x < width * 0.5) {
        // Left side: Brightness
        const brightnessDelta = diffY / height;
        const newBrightness = Math.max(0.1, Math.min(1.0, touchStartBrightnessRef.current + brightnessDelta));
        setBrightness(newBrightness);
        setHudType('brightness');
        setHudValue(Math.round(newBrightness * 100));
        setHudVisible(true);
      } else {
        // Right side: Volume
        const volumeDelta = diffY / height;
        const newVolume = Math.max(0, Math.min(1.0, touchStartVolumeRef.current + volumeDelta));
        setVolume(newVolume);
        setIsMuted(newVolume === 0);
        
        if (provider === 'youtube') {
          if (playerRef.current && playerRef.current.setVolume) {
            playerRef.current.setVolume(newVolume * 100);
          }
        } else {
          if (videoRef.current) {
            videoRef.current.volume = newVolume;
            videoRef.current.muted = newVolume === 0;
          }
        }
        
        setHudType('volume');
        setHudValue(Math.round(newVolume * 100));
        setHudVisible(true);
      }
      
      handleMouseMove(); // keep controls visible or reset timer
    }
  };

  const handlePlayerTouchEnd = () => {
    touchStartPosRef.current = null;
    
    // Hide volume/brightness HUD after a delay
    if (isSwipingRef.current) {
      if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
      hudTimeoutRef.current = setTimeout(() => {
        setHudVisible(false);
      }, 1000);
    } else {
      // If we didn't swipe, and this is a single tap, schedule control toggling
      if (lastTapRef.current > 0) {
        if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = setTimeout(() => {
          setControlsVisible(prev => !prev);
          lastTapRef.current = 0;
        }, 300);
      }
    }
    
    isSwipingRef.current = false;
  };

  // Idle timeout for controls (Netflix style)
  const handleMouseMove = () => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setControlsVisible(false);
    }, 3000);
  };

  // Handle Progress Bar Seek
  const handleProgressSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration === 0) return;
    if (provider === 'youtube' && !playerRef.current) return;
    if (provider === 'hls' && !videoRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const targetSeconds = percentage * duration;

    if (provider === 'youtube') {
      playerRef.current.seekTo(targetSeconds, true);
    } else {
      videoRef.current.currentTime = targetSeconds;
    }

    setVideoProgress(percentage * 100);
    setCurrentTime(targetSeconds);
  };

  // Handle Volume Change
  const handleVolumeToggle = () => {
    if (provider === 'youtube' && !playerRef.current) return;
    if (provider === 'hls' && !videoRef.current) return;

    const newMuted = !isMuted;
    if (provider === 'youtube') {
      if (newMuted) {
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
        playerRef.current.setVolume(volume * 100);
      }
    } else {
      videoRef.current.muted = newMuted;
    }
    setIsMuted(newMuted);
  };


  const openDownload = (downloadUrl: string) => {
    const token = localStorage.getItem('token');
    const url = token
      ? `${getApiUrl(downloadUrl)}?token=${encodeURIComponent(token)}`
      : getApiUrl(downloadUrl);
    window.open(url, '_blank');
  };

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();

    const description = reportDescription.trim();
    if (!description) {
      toast.error('Please describe the bug before sending it.');
      return;
    }

    setIsSubmittingReport(true);
    try {
      await reportSecurityViolation(
        'user_report',
        JSON.stringify({
          reportType,
          description,
          courseId,
          courseTitle: course?.title || '',
          lessonId: currentLesson?._id || '',
          lessonTitle: currentLesson?.title || '',
          page: window.location.pathname,
        })
      );
      toast.success('Thanks. Your report was sent.');
      setReportOpen(false);
      setReportDescription('');
      setReportType('Playback bug');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const formatQualityLabel = (q: string) => {
    switch (q) {
      case 'highres': return '1080p HD+';
      case 'hd1080': return '1080p HD';
      case 'hd720': return '720p HD';
      case 'large': return '480p';
      case 'medium': return '360p';
      case 'small': return '240p';
      case 'tiny': return '144p';
      case 'default':
      case 'auto':
        return 'Auto';
      default: return q;
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const moduleGroups = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    lessons.forEach((lesson) => {
      const key = `${lesson.moduleOrder || 1}-${lesson.moduleTitle || 'Module 1'}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(lesson);
    });
    return Object.entries(grouped).sort((a, b) => Number(a[0].split('-')[0]) - Number(b[0].split('-')[0]));
  }, [lessons]);

  useEffect(() => {
    if (currentLesson?._id) {
      const el = document.getElementById(`lesson-${currentLesson._id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      const moduleKey = `${currentLesson?.moduleOrder || 1}-${currentLesson?.moduleTitle || 'Module 1'}`;
      setExpandedModules((curr) => ({ ...curr, [moduleKey]: true }));
    }
  }, [currentLesson?._id]);

  useEffect(() => {
    if (!courseSlug || courseSlug === 'undefined' || !currentLesson?.slug || currentLesson.slug === 'undefined') return;
    if (lessonSlug === currentLesson.slug) return;
    navigate(`/course/${courseSlug}/lesson/${currentLesson.slug}`, { replace: true });
  }, [courseSlug, lessonSlug, currentLesson?.slug, navigate]);

  useEffect(() => {
    if (!lessons.length) return;
    const next: Record<string, boolean> = {};
    lessons.forEach((lesson: any) => {
      const key = `${lesson.moduleOrder || 1}-${lesson.moduleTitle || 'Module 1'}`;
      if (next[key] === undefined) next[key] = true;
    });
    setExpandedModules((curr) => ({ ...next, ...curr }));
  }, [lessons.length]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col text-foreground select-none items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          <div className="text-sm font-semibold text-muted-foreground animate-pulse">Loading class workspace...</div>
        </div>
      </div>
    );
  }

  if (course?.isLocked) {
    return (
      <div className="min-h-screen bg-background flex flex-col text-foreground select-none">
        {/* Top Header */}
        <header className="min-h-12 sm:min-h-14 h-12 sm:h-14 border-b border-border bg-card/80 backdrop-blur-xl flex items-center justify-between gap-2 px-2.5 sm:px-6 flex-shrink-0 z-40">
          <div className="flex items-center min-w-0 flex-1">
            <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 shrink-0" onClick={() => navigate('/student')}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="ml-1.5 sm:ml-4 min-w-0">
              <h1 className="font-semibold text-sm sm:text-base truncate">{course?.title || 'Course Locked'}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{course?.instructor || 'Instructor'}</p>
            </div>
          </div>
          <ThemeToggleButton />
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-background">
          <div className="max-w-md p-8 rounded-2xl bg-card border border-border/80 shadow-xl flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Lock className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold mb-4">🔒 Course Locked</h2>
            <p className="text-muted-foreground mb-6">
              {course.lockReason || 'Please contact your institute for access.'}
            </p>
            <Button 
              className="bg-primary hover:bg-[#1f5fa7] text-white shadow-sm shadow-primary/10 px-6 py-2 rounded-xl"
              onClick={() => navigate('/student')}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col text-foreground select-none">
      {/* Top Header */}
      <header className="min-h-12 sm:min-h-14 h-12 sm:h-14 border-b border-border bg-card/80 backdrop-blur-xl flex items-center justify-between gap-2 px-2.5 sm:px-6 flex-shrink-0 z-40">
        <div className="flex items-center min-w-0 flex-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 shrink-0" onClick={() => navigate('/student')}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="ml-1.5 sm:ml-4 min-w-0">
            <h1 className="font-semibold text-sm sm:text-base truncate">{course?.title || 'Loading course...'}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{course?.instructor || 'Instructor'}</p>
          </div>
        </div>
        <ThemeToggleButton />
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-background min-h-0">
        {/* Video + lesson content — fills space beside curriculum sidebar */}
        <div className={`flex-1 min-w-0 min-h-0 flex flex-col overflow-y-auto ${theaterMode ? '' : 'md:border-r border-border/80'}`}>
          {/* OTT player stage: full column width, 16:9, capped height on desktop */}
          <div className={`w-full shrink-0 bg-black flex items-center justify-center transition-colors duration-300 ${theaterMode ? 'md:max-h-[60vh]' : 'md:bg-transparent md:p-6 md:max-h-[calc(60vh+3rem)]'}`}>
            <div
              ref={playerContainerRef}
              className={`relative w-full aspect-video bg-black overflow-hidden group cursor-none md:max-h-[60vh] transition-all duration-300 ${theaterMode ? 'max-w-none' : 'md:max-w-4xl lg:max-w-5xl md:rounded-2xl md:border md:border-border/80 md:shadow-lg'}`}
              style={{ cursor: controlsVisible ? 'default' : 'none', aspectRatio: '16 / 9' }}
              onContextMenu={(e) => e.preventDefault()}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => isPlaying && setControlsVisible(false)}
              onTouchStart={handlePlayerTouchStart}
              onTouchMove={handlePlayerTouchMove}
              onTouchEnd={handlePlayerTouchEnd}
            >
              {error ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-6 text-center z-30">
                  <Lock className="w-16 h-16 text-primary mb-4" />
                  <h3 className="text-xl font-bold mb-2">Lesson Unavailable</h3>
                  <p className="text-muted-foreground max-w-sm mb-4">{error}</p>
                  <Button 
                    className="bg-primary hover:bg-[#1f5fa7] text-white shadow-sm shadow-primary/10"
                    onClick={() => navigate('/student/courses')}
                  >
                    View Course Catalog
                  </Button>
                </div>
              ) : null}

              {/* Static Centered Watermark Overlay */}
              {user && !error && (
                <div className="absolute inset-0 pointer-events-none select-none z-20 flex items-center justify-center">
                  <div
                    className="text-xs flex flex-col font-medium tracking-wide pointer-events-none leading-tight text-center max-w-[90%] break-words"
                    style={{
                      rotate: watermarkStyle.rotate,
                      color: `rgba(255, 255, 255, ${watermarkStyle.opacity})`,
                    }}
                  >
                    <span className="font-semibold">{user.name} · {user.email}</span>
                    <span className="text-xs opacity-90">ID: {user.user_id || user._id} · IP: {ipAddress}</span>
                  </div>
                </div>
              )}

              {/* YouTube Player Container with absolute click blocker (hidden during security blackout) */}
              {provider === 'youtube' && (
                <div 
                  className="absolute inset-0 w-full h-full overflow-hidden"
                  style={{
                    display: isBlackedOut ? 'none' : 'block',
                    visibility: isBlackedOut ? 'hidden' : 'visible',
                    opacity: isBlackedOut ? 0 : 1,
                    pointerEvents: isBlackedOut ? 'none' : 'auto'
                  }}
                >
                  <div className="absolute inset-0 w-full h-full">
                    <div id="youtube-iframe-holder" className="absolute inset-0 w-full h-full [&>*]:!w-full [&>*]:!h-full" />
                  </div>
                  {/* Transparent click blocker to overlay the YouTube frame and capture play/pause clicks */}
                  <div 
                    className="absolute inset-0 z-10 cursor-pointer"
                    onClick={togglePlay}
                  />
                </div>
              )}

              {/* HLS HTML5 Video Player Container */}
              {provider === 'hls' && (
                <div 
                  className="absolute inset-0 w-full h-full overflow-hidden"
                  style={{
                    display: isBlackedOut ? 'none' : 'block',
                    visibility: isBlackedOut ? 'hidden' : 'visible',
                    opacity: isBlackedOut ? 0 : 1,
                    pointerEvents: isBlackedOut ? 'none' : 'auto'
                  }}
                >
                  <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover cursor-pointer"
                    playsInline
                    onClick={togglePlay}
                  />
                </div>
              )}

              {/* Pure Black Security Overlay (Full Solid Black Backdrop covering 100% of the area above all elements with smooth 200ms transition) */}
              <div 
                className="absolute inset-0 bg-black z-50 flex flex-col items-center justify-center text-center transition-all duration-200 ease-in-out p-6 text-white"
                style={{
                  opacity: isBlackedOut ? 1 : 0,
                  pointerEvents: isBlackedOut ? 'auto' : 'none',
                  visibility: isBlackedOut ? 'visible' : 'hidden'
                }}
              >
                <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300 max-w-md">
                  <div className="relative mb-4 flex justify-center">
                    <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse"></div>
                    <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center relative">
                      <ShieldAlert className="w-6 h-6 text-red-500" />
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-red-500 mb-2">⚠ Security Violation Detected</h3>
                  <p className="text-sm text-gray-300 mb-4 px-4">
                    Screenshot or screen-recording attempt detected. Playback has been suspended.
                  </p>

                  {violationCount > 0 && (
                    <div className="px-5 py-2.5 rounded-full bg-card/45 backdrop-blur-xl border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.35)] text-sm text-red-400 font-bold tracking-widest uppercase flex items-center gap-2 mb-4 justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                      Attempt {violationCount}/3
                    </div>
                  )}

                  {cooldownTimeRemaining > 0 ? (
                    <div className="flex flex-col items-center gap-2 animate-in fade-in duration-300">
                      <div className="text-xs text-red-500 font-semibold uppercase tracking-wider">
                        Penalty Lock Active
                      </div>
                      <div className="text-3xl font-black text-white tracking-wider">
                        {cooldownTimeRemaining}s
                      </div>
                      <p className="text-xs text-gray-400 max-w-[250px]">
                        Please wait {cooldownTimeRemaining} seconds before continuing.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
                      <p className="text-xs text-gray-400 max-w-xs leading-relaxed px-4">
                        Lock timer expired. Click below to restore playback.
                      </p>
                      <Button
                        onClick={() => {
                          if (protectionManagerRef.current) {
                            protectionManagerRef.current.recoverFromViolation();
                          } else {
                            localStorage.removeItem('trineo_security_lock_until');
                            localStorage.setItem('trineo_lock_requires_manual_resume', 'false');
                            setIsBlackedOut(false);
                          }
                        }}
                        className="bg-primary hover:bg-[#1f5fa7] text-white shadow-sm shadow-primary/10 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all"
                      >
                        Resume Lesson
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Secure Overlay Center Play Button */}
              {!isPlaying && !error && !isBlackedOut && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/45 z-10 transition-opacity">
                  <button
                    onClick={togglePlay}
                    className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-white/10 backdrop-blur-2xl border-2 sm:border-4 border-white/20 flex items-center justify-center hover:scale-110 transition-transform shadow-2xl"
                  >
                    <Play className="w-7 h-7 sm:w-10 sm:h-10 text-white fill-white ml-0.5 sm:ml-1" />
                  </button>
                </div>
              )}

              {/* Custom Player Controls (Netflix Hover Style - completely hidden during security lockout) */}
              {!error && (
                <div 
                  className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2 sm:p-4 transition-opacity duration-300 z-20 ${
                    controlsVisible && !isBlackedOut 
                      ? 'opacity-100 pointer-events-auto' 
                      : 'opacity-0 pointer-events-none'
                  }`}
                  style={{ pointerEvents: isBlackedOut ? 'none' : undefined }}
                >
                  {/* Progress Seek bar */}
                  <div 
                    className="h-1 sm:h-1.5 w-full bg-white/20 hover:h-2 rounded-full cursor-pointer transition-all mb-2 sm:mb-3 relative group/scrub"
                    onClick={handleProgressSeek}
                  >
                    <div 
                        className="h-full bg-primary rounded-full relative" 
                      style={{ width: `${videoProgress}%` }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/scrub:opacity-100 shadow-lg scale-150 transition-all"></div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2 text-white text-xs sm:text-sm">
                    <div className="flex flex-wrap items-center gap-0.5 sm:gap-3 min-w-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-white hover:bg-white/10 h-8 w-8 sm:h-10 sm:w-10"
                        onClick={() => {
                          const currentIndex = lessons.findIndex(l => l._id === currentLesson?._id);
                          if (currentIndex > 0) {
                            const prevLesson = lessons[currentIndex - 1];
                            setCurrentLesson(prevLesson);
                          }
                        }}
                        disabled={lessons.findIndex(l => l._id === currentLesson?._id) <= 0}
                      >
                        <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 rotate-180 fill-white" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-white hover:bg-white/10 h-8 w-8 sm:h-10 sm:w-10"
                        onClick={togglePlay}
                      >
                        {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-white" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />}
                      </Button>
                      
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-white hover:bg-white/10 h-8 w-8 sm:h-10 sm:w-10"
                        onClick={() => {
                          const currentIndex = lessons.findIndex(l => l._id === currentLesson._id);
                          if (currentIndex !== -1 && currentIndex < lessons.length - 1) {
                            const nextLesson = lessons[currentIndex + 1];
                            if (!nextLesson.isLocked) setCurrentLesson(nextLesson);
                          }
                        }}
                        disabled={lessons.findIndex(l => l._id === currentLesson?._id) === lessons.length - 1}
                      >
                        <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
                      </Button>

                      <div className="flex items-center gap-1 sm:gap-2 group/volume">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-white hover:bg-white/10 h-8 w-8 sm:h-10 sm:w-10"
                          onClick={handleVolumeToggle}
                        >
                          {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                        </Button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={isMuted ? 0 : volume}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setVolume(val);
                            setIsMuted(val === 0);
                            if (provider === 'youtube') {
                              if (playerRef.current && playerRef.current.setVolume) {
                                playerRef.current.setVolume(val * 100);
                              }
                            } else {
                              if (videoRef.current) {
                                videoRef.current.volume = val;
                                videoRef.current.muted = val === 0;
                              }
                            }
                          }}
                          className="hidden sm:block sm:w-0 sm:opacity-0 sm:group-hover/volume:w-20 sm:group-hover/volume:opacity-100 transition-all duration-300 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                        />
                      </div>
                      <span className="ml-1 sm:ml-2 font-medium tracking-wide text-xs sm:text-sm whitespace-nowrap">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
                      {/* Auto Play Next Lesson Toggle */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`text-white hover:bg-white/10 h-8 px-2 flex items-center gap-1 rounded-md text-xs sm:text-sm font-semibold transition-all ${autoNext ? 'text-primary bg-primary/10' : 'opacity-65'}`}
                        onClick={() => setAutoNext(prev => !prev)}
                        title="Auto-Next Lesson"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span className="hidden xs:inline">Auto Next</span>
                      </Button>

                      {/* Settings menu */}
                      <div className="relative group/settings">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-white hover:bg-white/10 h-8 w-8 sm:h-10 sm:w-10"
                          onClick={() => setSettingsOpen((v) => !v)}
                          aria-expanded={settingsOpen}
                          aria-label="Player settings"
                        >
                          <Settings className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ${settingsOpen ? 'rotate-90' : ''}`} />
                        </Button>
                        <div className={`absolute bottom-full right-0 pb-2 sm:pb-4 z-50 ${settingsOpen ? 'block' : 'hidden sm:group-hover/settings:block'}`}>
                          <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-lg sm:rounded-xl p-1.5 sm:p-2 min-w-[120px] sm:min-w-[160px] shadow-2xl animate-in slide-in-from-bottom-2 fade-in">
                            <div className="text-[10px] sm:text-xs font-bold text-white/50 mb-1 sm:mb-2 px-2 sm:px-3 pt-1 sm:pt-2 uppercase tracking-wider">Quality</div>
                            {availableQualities.length === 0 ? (
                              <div className="text-[10px] sm:text-xs text-white/40 px-2 sm:px-3 py-0.5 sm:py-1 mb-1 sm:mb-2">Auto-Managed</div>
                            ) : (
                              <div className="max-h-24 sm:max-h-32 overflow-y-auto mb-1 sm:mb-2 space-y-0.5 sm:space-y-1 pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                {['default', ...availableQualities].map((q) => (
                                  <button 
                                    key={q}
                                    onClick={() => {
                                      setSelectedQuality(q);
                                      if (provider === 'youtube') {
                                        if (playerRef.current && playerRef.current.setPlaybackQuality) {
                                          playerRef.current.setPlaybackQuality(q);
                                        }
                                      } else {
                                        if (hlsRef.current) {
                                          if (q === 'default' || q === 'auto') {
                                            hlsRef.current.currentLevel = -1;
                                          } else {
                                            const idx = availableQualities.indexOf(q);
                                            if (idx !== -1) {
                                              hlsRef.current.currentLevel = idx;
                                            }
                                          }
                                        }
                                      }
                                    }}
                                    className={`w-full text-left px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs hover:bg-white/10 rounded-md sm:rounded-lg flex items-center justify-between transition-colors ${
                                      selectedQuality === q ? 'text-primary font-semibold' : 'text-slate-600'
                                    }`}
                                  >
                                    <span>{formatQualityLabel(q)}</span>
                                    {selectedQuality === q && <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                                  </button>
                                ))}
                              </div>
                            )}

                            <div className="my-1 sm:my-2 border-t border-white/10"></div>

                            <div className="text-[10px] sm:text-xs font-bold text-white/50 mb-1 sm:mb-2 px-2 sm:px-3 pt-1 sm:pt-2 uppercase tracking-wider">Speed</div>
                            <button 
                              className="w-full text-left px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm hover:bg-white/10 rounded-md sm:rounded-lg text-white/80 flex items-center justify-between"
                              onClick={() => {
                                const speeds = [0.5, 1, 1.25, 1.5, 2];
                                const nextSpeed = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
                                setPlaybackSpeed(nextSpeed);
                                if (provider === 'youtube') {
                                  if (playerRef.current && playerRef.current.setPlaybackRate) {
                                    playerRef.current.setPlaybackRate(nextSpeed);
                                  }
                                } else {
                                  if (videoRef.current) {
                                    videoRef.current.playbackRate = nextSpeed;
                                  }
                                }
                              }}
                            >
                              {playbackSpeed === 1 ? 'Normal' : `${playbackSpeed}x`}
                              <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 rotate-180 opacity-50" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Picture-in-Picture Button */}
                      {provider === 'hls' && document.pictureInPictureEnabled && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-white hover:bg-white/10 h-8 w-8 sm:h-10 sm:w-10"
                          onClick={async () => {
                            if (!videoRef.current) return;
                            try {
                              if (document.pictureInPictureElement) {
                                await document.exitPictureInPicture();
                              } else {
                                await videoRef.current.requestPictureInPicture();
                              }
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          title="Picture-in-Picture"
                        >
                          <Maximize className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </Button>
                      )}

                      <Button
                        size="icon"
                        variant="ghost"
                        className={`hidden sm:inline-flex text-white hover:bg-white/10 h-8 w-8 sm:h-10 sm:w-10 ${theaterMode ? 'text-primary bg-primary/10' : ''}`}
                        onClick={() => setTheaterMode(!theaterMode)}
                        title="Theater Mode"
                      >
                        <Tv className="w-4 h-4 sm:w-5 sm:h-5" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-white hover:bg-white/10 h-8 w-8 sm:h-10 sm:w-10"
                        onClick={() => playerContainerRef.current?.requestFullscreen()}
                      >
                        <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Brightness Dimming Layer Overlay (z-[19] so it is above video but below controls) */}
              <div 
                className="absolute inset-0 bg-black pointer-events-none z-[19] transition-opacity duration-150" 
                style={{ opacity: 1 - brightness }}
              />

              {/* Gesture HUD Indicator (z-30, center overlay) */}
              {hudVisible && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-in fade-in duration-200">
                  <div className="bg-black/85 backdrop-blur-xl px-5 py-3 rounded-2xl flex items-center gap-3 border border-white/10 text-white shadow-2xl scale-100 transform transition-all">
                    {hudType === 'volume' ? (
                      <>
                        {volume === 0 ? <VolumeX className="w-5 h-5 text-primary" /> : <Volume2 className="w-5 h-5 text-primary" />}
                        <span className="text-sm font-bold uppercase tracking-wider">Volume {hudValue}%</span>
                      </>
                    ) : (
                      <>
                        <Sun className="w-5 h-5 text-primary animate-pulse" />
                        <span className="text-sm font-bold uppercase tracking-wider">Brightness {hudValue}%</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Double Tap Seek Feedback Ripples (z-30) */}
              {doubleTapFeedback === 'rewind' && (
                <div className="absolute inset-y-0 left-0 w-[40%] bg-gradient-to-r from-white/10 to-transparent flex flex-col items-center justify-center text-white pointer-events-none z-30 animate-in slide-in-from-left fade-in duration-300">
                  <div className="bg-black/50 backdrop-blur-md p-4 rounded-full flex flex-col items-center justify-center">
                    <ChevronsLeft className="w-7 h-7 text-primary animate-pulse" />
                    <span className="text-[10px] font-black mt-1 uppercase tracking-widest">-10s</span>
                  </div>
                </div>
              )}

              {doubleTapFeedback === 'forward' && (
                <div className="absolute inset-y-0 right-0 w-[40%] bg-gradient-to-l from-white/10 to-transparent flex flex-col items-center justify-center text-white pointer-events-none z-30 animate-in slide-in-from-right fade-in duration-300">
                  <div className="bg-black/50 backdrop-blur-md p-4 rounded-full flex flex-col items-center justify-center">
                    <ChevronsRight className="w-7 h-7 text-primary animate-pulse" />
                    <span className="text-[10px] font-black mt-1 uppercase tracking-widest">+10s</span>
                  </div>
                </div>
              )}
            </div>
          </div>

            {/* Lesson information and tabs */}
            <div className="w-full max-w-none px-4 py-3 sm:px-6 sm:py-4 space-y-3">
              {/* Desktop Header Layout */}
              <div className="hidden md:flex justify-between items-start w-full">
                <div className="min-w-0">
                  <h2 className="text-xl md:text-2xl font-bold break-words leading-tight">{currentLesson?.title || 'Select a Lesson'}</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">Course module: {course?.title}</p>
                </div>
              </div>

              {/* Mobile Title Layout */}
              <div className="md:hidden space-y-1">
                <h2 className="text-lg font-bold break-words leading-tight">{currentLesson?.title || 'Select a Lesson'}</h2>
                <p className="text-xs text-muted-foreground">Course module: {course?.title}</p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80 truncate max-w-[40vw] sm:max-w-none">{course?.title || 'Course'}</span>
                <ChevronRight className="w-3 h-3 shrink-0" />
                <span className="truncate max-w-[32vw] sm:max-w-none">{currentLesson?.moduleTitle || 'Module'}</span>
                <ChevronRight className="w-3 h-3 shrink-0" />
                <span className="font-semibold text-foreground truncate max-w-[40vw] sm:max-w-none">{currentLesson?.title || 'Lesson'}</span>
              </div>

              {/* Tabs selector */}
              <div className="flex border-b border-border/60 gap-4 mt-0 overflow-x-auto no-scrollbar scrollbar-none">
                {/* Mobile-only Lessons Tab */}
                <button
                  onClick={() => setActiveTab('lessons')}
                  className={`md:hidden pb-2 text-sm font-semibold relative transition-colors ${
                    activeTab === 'lessons' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Lessons
                  {activeTab === 'lessons' && (
                    <motion.div
                      layoutId="activeTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>

                {/* Materials Tab */}
                <button
                  onClick={() => setActiveTab('materials')}
                  className={`pb-2 text-sm font-semibold relative transition-colors ${
                    activeTab === 'materials' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Materials
                  {(currentLesson?.attachmentUrl || courseMaterials.length > 0) && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-primary/10 text-primary rounded-full">
                      {(currentLesson?.attachmentUrl ? 1 : 0) + courseMaterials.length}
                    </span>
                  )}
                  {activeTab === 'materials' && (
                    <motion.div
                      layoutId="activeTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>

                {/* Info Tab */}
                <button
                  onClick={() => setActiveTab('info')}
                  className={`pb-2 text-sm font-semibold relative transition-colors ${
                    activeTab === 'info' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Info
                  {activeTab === 'info' && (
                    <motion.div
                      layoutId="activeTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
 
                {/* Live Classes Tab */}
                <button
                  onClick={() => setActiveTab('live-classes')}
                  className={`pb-2 text-sm font-semibold relative transition-colors ${
                    activeTab === 'live-classes' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Live Classes
                  {liveClasses.filter(c => new Date(c.endTime) > new Date() && c.status !== 'cancelled').length > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-red-500/10 text-red-500 rounded-full animate-pulse">
                      {liveClasses.filter(c => new Date(c.endTime) > new Date() && c.status !== 'cancelled').length}
                    </span>
                  )}
                  {activeTab === 'live-classes' && (
                    <motion.div
                      layoutId="activeTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  className="pb-2 text-sm font-semibold relative transition-colors text-muted-foreground hover:text-foreground flex items-center gap-1.5"
                >
                  <Flag className="w-3.5 h-3.5" />
                  Report
                </button>
              </div>

              {/* Tab Contents - Only render active tab content */}
              <div className="pt-1">
                {/* 1. Lessons tab (Mobile only) */}
                {activeTab === 'lessons' && (
                  <div className="md:hidden space-y-4">
                    {/* Navigation controls card */}
                    {(() => {
                      const currentIndex = lessons.findIndex(l => l._id === currentLesson?._id);
                      const prev = currentIndex > 0 ? lessons[currentIndex - 1] : null;
                      const next = currentIndex !== -1 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
                      return (
                        <div className="grid grid-cols-2 gap-3 mb-2">
                          <Button 
                            variant="outline" 
                            className="h-11 text-xs gap-1 rounded-xl bg-card border-border/50 shadow-sm"
                            disabled={!prev}
                            onClick={() => prev && setCurrentLesson(prev)}
                          >
                            <ChevronLeft className="w-4 h-4" /> Previous
                          </Button>
                          <Button 
                            variant="outline" 
                            className="h-11 text-xs gap-1 rounded-xl bg-card border-border/50 shadow-sm"
                            disabled={!next || next.isLocked}
                            onClick={() => next && setCurrentLesson(next)}
                          >
                            Next <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })()}

                    {moduleGroups.map(([moduleKey, moduleLessons]) => {
                      const [moduleOrder, ...moduleNameParts] = moduleKey.split('-');
                      const moduleName = moduleNameParts.join('-');
                      const total = moduleLessons.length;
                      const completed = moduleLessons.filter((lesson: any) => localStorage.getItem(`completed_${lesson._id}`) === 'true' || currentLesson?._id === lesson._id).length;
                      const isExpanded = expandedModules[moduleKey] !== false;
                      
                      return (
                        <div key={moduleKey} className="space-y-2">
                          <button
                            className="w-full text-left px-3 py-2.5 rounded-xl border border-border/40 bg-muted/20 flex flex-col gap-1 transition-all hover:bg-muted/30"
                            onClick={() => setExpandedModules((curr) => ({ ...curr, [moduleKey]: !curr[moduleKey] }))}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="text-[10px] font-semibold text-primary uppercase tracking-wide">Module {moduleOrder}</div>
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <span>{completed}/{total} completed</span>
                                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              </div>
                            </div>
                            <div className="text-sm font-semibold truncate w-full pr-4">{moduleName}</div>
                            <Progress value={total ? (completed / total) * 100 : 0} className="h-1 mt-1" />
                          </button>
                          
                          {isExpanded && moduleLessons.sort((a: any, b: any) => a.order - b.order).map((item: any) => {
                            const isSelected = currentLesson?._id === item._id;
                            const isLocked = item.isLocked;
                            const isCompleted = localStorage.getItem(`completed_${item._id}`) === 'true';
                            const resume = Number(localStorage.getItem(`resume_${item._id}`) || '0');
                            const status = isSelected ? 'Playing' : isCompleted ? 'Completed' : resume > 0 ? 'In Progress' : 'Not Started';
                            
                            return (
                              <Card
                                key={item._id}
                                id={`mobile-tab-lesson-${item._id}`}
                                className={`w-full min-h-[64px] box-border cursor-pointer transition-all overflow-hidden border-border/30 bg-card/35 backdrop-blur-xl ${
                                  isSelected ? 'border-primary bg-primary/5 shadow-[inset_0_0_0_1px_rgba(40,107,189,0.12)]' : isLocked ? 'opacity-65 cursor-not-allowed hover:bg-transparent' : 'hover:border-border/80 hover:bg-muted/10'
                                }`}
                                onClick={() => {
                                  if (!isLocked) setCurrentLesson(item);
                                }}
                              >
                                <div className="w-full p-3.5 flex items-start gap-3 min-w-0 box-border">
                                  <div className="mt-0.5 flex-shrink-0">
                                    {isLocked ? (
                                      <Lock className="w-4 h-4 text-muted-foreground" />
                                    ) : isCompleted ? (
                                      <CheckCircle2 className="w-4 h-4 text-green-500 fill-green-500/10" />
                                    ) : isSelected ? (
                                      <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                                      </div>
                                    ) : (
                                      <Circle className="w-4 h-4 text-primary/60" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0 w-full">
                                    <h4 className={`block w-full text-sm font-semibold leading-snug ${isSelected ? 'text-primary' : ''}`} style={{ display: '-webkit-box', overflow: 'hidden', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 }}>
                                      {item.title}
                                    </h4>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                                      <span>{item.duration && item.duration !== '0:00' ? item.duration : '10:00'}</span>
                                      <span className={isCompleted ? 'text-green-500 font-medium' : isSelected ? 'text-primary font-medium' : ''}>{status}</span>
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. Materials tab */}
                {activeTab === 'materials' && (
                  <div className="space-y-4">
                    {/* Sticky Security Alert Banner inside Materials tab */}
                    <div className="p-4 bg-primary/5 border border-primary/15 rounded-2xl flex items-start gap-3.5">
                      <ShieldAlert className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <h4 className="font-bold text-foreground mb-0.5">OTT Anti-Piracy Streaming Active</h4>
                        <p className="text-muted-foreground leading-relaxed">
                          This premium educational stream is protected by real-time DRM. Taking screenshots, triggering print requests, or running background screen recording tools (Zoom, OBS, Snipping Tool) is strictly prohibited. Capture attempts will instantly pause/black out the stream and can lead to immediate force-logout and permanent account suspension.
                        </p>
                      </div>
                    </div>

                    {/* Lesson attachments */}
                    <div className="space-y-3">
                      <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
                        <FileText className="w-4 h-4 text-primary" />
                        Class Study Materials & Attachments
                      </h3>
                      
                      {currentLesson?.isLocked ? (
                        <Card className="p-8 text-center border border-dashed border-border/80 bg-muted/10 rounded-2xl flex flex-col items-center">
                          <Lock className="w-10 h-10 text-primary mb-2 opacity-80 animate-pulse" />
                          <p className="text-sm font-semibold text-foreground">🔒 Lesson Locked</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {currentLesson.lockReason || 'Please contact your institute for access.'}
                          </p>
                        </Card>
                      ) : currentLesson?.attachmentUrl ? (
                        <Card className="border-border/50 bg-card hover:border-primary/20 transition-all">
                          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-6 h-6 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-semibold text-sm truncate">{currentLesson.attachmentName || 'Download Lesson Notes'}</h4>
                                <p className="text-xs text-muted-foreground">Attached resource for: {currentLesson.title}</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              className="bg-primary hover:bg-[#1f5fa7] text-white flex items-center gap-1.5 shrink-0 self-stretch sm:self-auto justify-center"
                              onClick={() => window.open(currentLesson.attachmentUrl, '_blank')}
                            >
                              <Download className="w-4 h-4" />
                              Download Attachment
                            </Button>
                          </CardContent>
                        </Card>
                      ) : (
                        <Card className="p-8 text-center border border-dashed border-border/80 bg-muted/10 rounded-2xl">
                          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                          <p className="text-sm font-medium text-muted-foreground">No PDF notes or reference attachments uploaded for this lesson.</p>
                          <p className="text-xs text-muted-foreground/60 mt-1">Faculty reference sheets and student notes will show here when available.</p>
                        </Card>
                      )}
                    </div>

                    {/* Course materials */}
                    {courseMaterials.length > 0 && (
                      <div className="space-y-3 mt-4 pt-4 border-t border-border/40">
                        <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
                          <FileText className="w-4 h-4 text-primary" />
                          General Course Study Materials
                        </h3>
                        <div className="grid gap-3">
                          {courseMaterials.map((material) => (
                            <Card key={material._id} className="border-border/50 bg-card hover:border-primary/20 transition-all">
                              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <FileText className="w-5 h-5 text-primary" />
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="font-semibold text-sm truncate">{material.title || material.originalName}</h4>
                                    <p className="text-xs text-muted-foreground truncate">{material.description || 'No description provided.'}</p>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-9 text-xs flex items-center gap-1.5 shrink-0 self-stretch sm:self-auto justify-center"
                                  onClick={() => openDownload(material.downloadUrl)}
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  Download PDF
                                </Button>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Info tab */}
                {activeTab === 'info' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl border border-border/40 bg-card/30 backdrop-blur-md space-y-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Course Info</span>
                        <h3 className="text-base font-bold text-foreground">{course?.title || 'Loading course...'}</h3>
                        <p className="text-xs text-muted-foreground">{course?.description || 'No course description available.'}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 py-2 border-y border-border/40 text-xs">
                        <div>
                          <div className="text-muted-foreground font-medium">Instructor</div>
                          <div className="font-semibold text-foreground mt-0.5">{course?.instructor || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground font-medium">Total Duration</div>
                          <div className="font-semibold text-foreground mt-0.5">{course?.duration || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground font-medium">Price</div>
                          <div className="font-semibold text-foreground mt-0.5">{course?.price ? `$${course.price}` : 'Free'}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground font-medium">Last Updated</div>
                          <div className="font-semibold text-foreground mt-0.5">
                            {course?.createdAt ? new Date(course.createdAt).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                      </div>

                      {currentLesson && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Current Lesson</span>
                          {currentLesson.isLocked ? (
                            <div className="p-3.5 bg-muted/20 border border-border/50 rounded-xl flex items-center gap-2">
                              <Lock className="w-4 h-4 text-primary animate-pulse" />
                              <span className="text-xs font-semibold text-muted-foreground">🔒 Lesson Locked: {currentLesson.lockReason || 'Access not active.'}</span>
                            </div>
                          ) : (
                            <>
                              <h4 className="text-sm font-semibold text-foreground">{currentLesson.title}</h4>
                              <p className="text-xs text-muted-foreground">
                                {currentLesson.description || 'No description provided for this lesson.'}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                                <span className="px-2 py-0.5 bg-muted rounded-full font-medium">Module {currentLesson.moduleOrder}</span>
                                <span>Order: {currentLesson.order}</span>
                                <span>Duration: {currentLesson.duration && currentLesson.duration !== '0:00' ? currentLesson.duration : '10:00'}</span>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. Live Classes tab */}
                {activeTab === 'live-classes' && (
                  <div className="space-y-4">
                    {!course?.isPurchased ? (
                      <Card className="p-8 text-center border border-dashed border-border/80 bg-muted/10 rounded-2xl">
                        <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-medium text-muted-foreground">Live Classes Locked</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Please activate access for this course to view the scheduled live classes calendar and join virtual classrooms.</p>
                      </Card>
                    ) : (
                      <div className="space-y-6">
                        {/* Upcoming Classes */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            Upcoming & Live Lectures
                          </h4>
                          <div className="grid gap-3">
                            {liveClasses.filter(c => new Date(c.endTime) > new Date() && c.status !== 'cancelled').sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).map((lc) => {
                              const isLive = lc.status === 'live' || (new Date(lc.startTime) <= new Date() && new Date(lc.endTime) >= new Date());
                              return (
                                <Card key={lc._id} className={`border-border/50 bg-card hover:border-primary/15 transition-all ${isLive ? 'border-primary/45 shadow-sm' : ''}`}>
                                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="min-w-0 space-y-1.5">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-semibold text-sm text-foreground">{lc.title}</h4>
                                        {isLive ? (
                                          <Badge className="bg-red-500/15 text-red-500 border border-red-500/30 text-[9px] uppercase font-black tracking-wider animate-pulse">Live Now</Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-blue-500 border-blue-500/30 text-[9px] uppercase">Upcoming</Badge>
                                        )}
                                        {lc.hasAttended && (
                                          <Badge className="bg-green-500/15 text-green-500 border border-green-500/30 text-[9px] uppercase font-semibold">Attended</Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground leading-relaxed">{lc.description || 'No description provided.'}</p>
                                      <div className="text-[11px] text-muted-foreground/85 flex items-center gap-1.5 flex-wrap">
                                        <span>Faculty: {lc.facultyId?.name || 'Instructor'}</span>
                                        <span>·</span>
                                        <span>Start: {new Date(lc.startTime).toLocaleString()}</span>
                                        <span>·</span>
                                        <span>End: {new Date(lc.endTime).toLocaleTimeString()}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2.5 shrink-0 self-stretch sm:self-auto justify-end">
                                      <Badge variant="secondary" className="px-2 py-0.5 text-[11px]">{lc.platform}</Badge>
                                      <Button
                                        size="sm"
                                        className="bg-primary hover:bg-[#1f5fa7] text-white text-xs h-8 min-h-8"
                                        onClick={async () => {
                                          try {
                                            const res = await apiFetch(`/live-classes/${lc._id}/join`, { method: 'POST' });
                                            if (res.meetingUrl) {
                                              toast.success('Attendance recorded!', { description: 'Opening lecture window...' });
                                              window.open(res.meetingUrl, '_blank');
                                              // Refetch course-specific live classes to refresh "Attended" badge
                                              const refreshed = await apiFetch(`/live-classes/course/${courseId}`);
                                              setLiveClasses(refreshed || []);
                                            }
                                          } catch (err: any) {
                                            toast.error('Failed to join live class', { description: err.message });
                                          }
                                        }}
                                      >
                                        Join Class
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                            {liveClasses.filter(c => new Date(c.endTime) > new Date() && c.status !== 'cancelled').length === 0 && (
                              <p className="text-xs text-muted-foreground text-center py-4">No upcoming live classes scheduled for this course.</p>
                            )}
                          </div>
                        </div>

                        {/* Past Classes */}
                        <div className="space-y-3 pt-2">
                          <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <History className="w-4 h-4" />
                            Completed Lectures History
                          </h4>
                          <div className="grid gap-2">
                            {liveClasses.filter(c => new Date(c.endTime) <= new Date() || c.status === 'completed' || c.status === 'cancelled').sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()).map((lc) => (
                              <Card key={lc._id} className="border-border/60 bg-muted/10 opacity-70">
                                <CardContent className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                  <div className="min-w-0 space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h5 className="font-semibold text-xs text-foreground">{lc.title}</h5>
                                      <Badge variant="outline" className={lc.status === 'cancelled' ? 'text-red-500 border-red-500/20 bg-red-500/5' : 'text-green-500 border-green-500/20 bg-green-500/5'}>
                                        {lc.status === 'cancelled' ? 'Cancelled' : 'Completed'}
                                      </Badge>
                                      {lc.hasAttended && (
                                        <Badge className="bg-green-500/15 text-green-500 border-green-500/30 text-[9px] uppercase font-semibold">Attended</Badge>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">Instructor: {lc.facultyId?.name || 'N/A'} · Held: {new Date(lc.startTime).toLocaleString()}</p>
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0 self-stretch sm:self-auto justify-end text-[11px] text-muted-foreground">
                                    <span>{lc.platform}</span>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            {liveClasses.filter(c => new Date(c.endTime) <= new Date() || c.status === 'completed' || c.status === 'cancelled').length === 0 && (
                              <p className="text-[11px] text-muted-foreground text-center py-2">No past live classes recorded for this course.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
        </div>
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-md w-[92vw] rounded-2xl border-border bg-card p-0 overflow-hidden shadow-2xl">
          <div className="h-1 w-full bg-gradient-to-r from-primary via-blue-400 to-primary/40" />
          <form onSubmit={submitReport} className="px-6 pt-5 pb-6 space-y-5">
            <DialogHeader className="space-y-1">
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Flag className="w-4 h-4 text-primary" />
                Report an Issue
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                Tell us what went wrong so we can fix it.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">Issue Type</label>
              <div className="grid grid-cols-2 gap-2">
                {['Playback bug', 'Content issue', 'UI bug', 'Other'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setReportType(type)}
                    className={`text-xs px-3 py-2 rounded-xl border text-left transition-all font-medium ${
                      reportType === type
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/50 bg-muted/10 text-muted-foreground hover:border-border hover:bg-muted/20'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">Description</label>
              <div className="relative rounded-xl border border-border bg-muted/5 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Describe the bug, where it happened, and what you expected to see."
                  rows={5}
                  className="w-full bg-transparent text-sm p-3 resize-none focus:outline-none text-foreground placeholder:text-muted-foreground/40"
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="flex-1 h-10 rounded-xl border border-border/60 text-sm font-semibold text-muted-foreground hover:bg-muted/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingReport || !reportDescription.trim()}
                className="flex-1 h-10 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm shadow-primary/20"
              >
                {isSubmittingReport ? 'Sending...' : 'Submit Report'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

        {/* Right Side: Sidebar Playlist (~25–30% on tablet/desktop) */}
        <aside className={`${theaterMode ? 'hidden' : 'hidden md:flex'} md:flex-none md:w-[28%] md:min-w-[240px] md:max-w-[320px] lg:w-[26%] lg:min-w-[280px] lg:max-w-[360px] border-t md:border-t-0 md:border-l border-border bg-card/60 backdrop-blur-2xl flex-shrink-0 flex-col overflow-x-hidden min-h-0`}>
          <div className="p-4 border-b border-border bg-card/45">
            <h3 className="font-semibold text-lg">Course Lessons</h3>
            <p className="text-xs text-muted-foreground">{lessons.length} classes available</p>
          </div>

          <ScrollArea className="flex-1 w-full overflow-x-hidden">
            <div className="w-full p-4 space-y-3 box-border overflow-x-hidden">
              {moduleGroups.map(([moduleKey, moduleLessons]) => {
                const [moduleOrder, ...moduleNameParts] = moduleKey.split('-');
                const moduleName = moduleNameParts.join('-');
                const total = moduleLessons.length;
                const completed = moduleLessons.filter((lesson: any) => Number(localStorage.getItem(`resume_${lesson._id}`) || '0') > 0 || currentLesson?._id === lesson._id).length;
                return (
                  <div key={moduleKey} className="space-y-2">
                    <button
                      className="w-full text-left px-2 py-2 rounded-lg border border-border/40 bg-muted/20"
                      onClick={() => setExpandedModules((curr) => ({ ...curr, [moduleKey]: !curr[moduleKey] }))}
                    >
                      <div className="text-[10px] font-semibold text-primary uppercase tracking-wide">Module {moduleOrder}</div>
                      <div className="text-sm font-semibold truncate">{moduleName}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">{completed}/{total} completed</div>
                      <Progress value={total ? (completed / total) * 100 : 0} className="h-1 mt-1" />
                    </button>
                    {expandedModules[moduleKey] !== false && moduleLessons.sort((a: any, b: any) => a.order - b.order).map((item: any) => {
                      const isSelected = currentLesson?._id === item._id;
                      const isLocked = item.isLocked;
                      const resume = Number(localStorage.getItem(`resume_${item._id}`) || '0');
                      const status = isSelected ? 'Current' : resume > 0 ? 'In Progress' : 'Not Started';
                      return (
                        <Card
                          key={item._id}
                          id={`lesson-${item._id}`}
                          className={`w-full min-h-[72px] box-border cursor-pointer transition-all overflow-hidden border-border/30 bg-card/35 backdrop-blur-xl ${
                            isSelected ? 'border-primary bg-primary/5 shadow-[inset_0_0_0_1px_rgba(40,107,189,0.12)]' : isLocked ? 'opacity-65 cursor-not-allowed hover:bg-transparent' : 'hover:border-border/80 hover:bg-muted/10'
                          }`}
                          onClick={() => {
                            if (!isLocked) setCurrentLesson(item);
                          }}
                        >
                          <div className="w-full p-4 flex items-start gap-3 min-w-0 box-border">
                            <div className="mt-1">
                              {isLocked ? <Lock className="w-4 h-4 text-muted-foreground" /> : isSelected ? (
                                <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-primary"></div></div>
                              ) : <Circle className="w-4 h-4 text-primary/60" />}
                            </div>
                            <div className="flex-1 min-w-0 w-full">
                              <h4 className={`block w-full text-sm font-semibold leading-snug ${isSelected ? 'text-primary' : ''}`} style={{ display: '-webkit-box', overflow: 'hidden', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 }}>
                                {item.title}
                              </h4>
                              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                                <span>{item.duration && item.duration !== '0:00' ? item.duration : '10:00'}</span>
                                <span>{status}</span>
                                {isSelected && <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 px-1 py-0 h-4">Playing</Badge>}
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </aside>
      </div>

      <div className="md:hidden fixed bottom-4 right-4 z-40 pb-[env(safe-area-inset-bottom)]">
        <Sheet open={mobileLessonsOpen} onOpenChange={setMobileLessonsOpen}>
          <SheetTrigger asChild>
            <Button className="rounded-full px-4 shadow-lg shadow-slate-950/10">
              <FileText className="w-4 h-4" />
              Lessons
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[92vw] max-w-[380px] p-0 overflow-x-hidden">
            <SheetHeader className="border-b border-border px-4 py-4">
              <SheetTitle>Course Lessons</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-5rem)] overflow-x-hidden">
              <div className="p-4 space-y-2 box-border overflow-x-hidden">
                {lessons.map((item) => {
                  const isSelected = currentLesson?._id === item._id;
                  const isLocked = item.isLocked;

                  return (
                    <Card
                      key={item._id}
                      className={`w-full min-h-[72px] box-border cursor-pointer overflow-hidden transition-all border-border/30 bg-card/35 ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-[inset_0_0_0_1px_rgba(40,107,189,0.12)]'
                          : isLocked
                            ? 'opacity-65 cursor-not-allowed'
                            : 'hover:border-border/80 hover:bg-muted/10'
                      }`}
                      onClick={() => {
                        if (!isLocked) {
                          setCurrentLesson(item);
                          setMobileLessonsOpen(false);
                        }
                      }}
                    >
                      <div className="w-full p-4 flex items-start gap-3 min-w-0 box-border">
                        <div className="mt-1 flex-shrink-0">
                          {isLocked ? (
                            <Lock className="w-4 h-4 text-muted-foreground" />
                          ) : isSelected ? (
                            <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            </div>
                          ) : (
                            <Circle className="w-4 h-4 text-primary/60" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 w-full">
                          <h4
                            className={`block w-full text-sm font-semibold leading-snug ${isSelected ? 'text-primary' : ''}`}
                            style={{
                              display: '-webkit-box',
                              overflow: 'hidden',
                              WebkitBoxOrient: 'vertical',
                              WebkitLineClamp: 2,
                            }}
                          >
                            {item.title}
                          </h4>
                          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mt-1 min-w-0">
                            <span className="shrink-0">{item.duration && item.duration !== '0:00' ? item.duration : '10:00'}</span>
                            {isSelected && (
                              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 px-1 py-0 h-4 shrink-0">
                                Playing
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-md w-[92vw] rounded-2xl border-border bg-card p-0 overflow-hidden shadow-2xl">
          <div className="h-1 w-full bg-gradient-to-r from-primary via-blue-400 to-primary/40" />
          <form onSubmit={submitReport} className="px-6 pt-5 pb-6 space-y-5">
            <DialogHeader className="space-y-1">
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Flag className="w-4 h-4 text-primary" />
                Report an Issue
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                Tell us what went wrong so we can fix it.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">Issue Type</label>
              <div className="grid grid-cols-2 gap-2">
                {['Playback bug', 'Content issue', 'UI bug', 'Other'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setReportType(type)}
                    className={`text-xs px-3 py-2 rounded-xl border text-left transition-all font-medium ${
                      reportType === type
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/50 bg-muted/10 text-muted-foreground hover:border-border hover:bg-muted/20'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">Description</label>
              <div className="relative rounded-xl border border-border bg-muted/5 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Describe the bug, where it happened, and what you expected to see."
                  rows={5}
                  className="w-full bg-transparent text-sm p-3 resize-none focus:outline-none text-foreground placeholder:text-muted-foreground/40"
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="flex-1 h-10 rounded-xl border border-border/60 text-sm font-semibold text-muted-foreground hover:bg-muted/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingReport || !reportDescription.trim()}
                className="flex-1 h-10 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm shadow-primary/20"
              >
                {isSubmittingReport ? 'Sending...' : 'Submit Report'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
