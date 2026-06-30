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
  SlidersHorizontal,
  CheckCircle2,
  Check,
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
  Clock,
  Bell,
  ChevronDown,
  GraduationCap,
  Bookmark,
  Flame,
  MessageSquare,
  Trophy,
  Sparkles,
  Plus,
  Award,
  PenSquare,
  Trash2,
  HelpCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Folder,
  ClipboardList,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { apiFetch, getApiUrl, getDownloadUrlWithToken } from '../../utils/api';
import { useQuery } from '@tanstack/react-query';
import { ThemeToggleButton } from '../ThemeToggle';
import { toast } from 'sonner';
import { initializePushNotifications } from '../../utils/pushManager';

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

const parseDurationToSeconds = (durationStr: string | null | undefined): number => {
  if (!durationStr) return 0;
  const parts = durationStr.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
};

export default function VideoPlayer() {
  const navigate = useNavigate();
  const params = useParams();
  const { courseSlug, programSlug, lessonSlug } = params;
  const activeSlug = programSlug || courseSlug;

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

  // New state variables for verifying full data flow
  const [lesson, setLesson] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [syllabus, setSyllabus] = useState<any>(null);

  // Sync legacy state currentLesson with lesson
  useEffect(() => {
    if (currentLesson !== lesson) {
      setLesson(currentLesson);
    }
  }, [currentLesson]);

  useEffect(() => {
    if (lesson !== currentLesson) {
      setCurrentLesson(lesson);
    }
  }, [lesson]);

  console.log("programSlug", programSlug);
  console.log("courseSlug", courseSlug);
  console.log("lessonSlug", lessonSlug);
  console.log("activeSlug", activeSlug);

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
  const [playAttempted, setPlayAttempted] = useState(false);
  const cachedUser = useMemo(() => {
    const cached = localStorage.getItem('user');
    try {
      return cached ? JSON.parse(cached) : null;
    } catch (_) {
      return null;
    }
  }, []);

  const [user, setUser] = useState<any>(cachedUser);
  const userId = user?._id || user?.id || cachedUser?._id || cachedUser?.id || '';
  const instituteId = user?.institute?._id || user?.institute || cachedUser?.institute?._id || cachedUser?.institute || '';

  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [mobileLessonsOpen, setMobileLessonsOpen] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`trineo_expanded_subjects_${userId}`);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`trineo_expanded_units_${userId}`);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  const [expandedLessons, setExpandedLessons] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`trineo_expanded_lessons_${userId}`);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    if (userId) {
      localStorage.setItem(`trineo_expanded_lessons_${userId}`, JSON.stringify(expandedLessons));
    }
  }, [expandedLessons, userId]);

  useEffect(() => {
    if (userId) {
      localStorage.setItem(`trineo_expanded_subjects_${userId}`, JSON.stringify(expandedSubjects));
    }
  }, [expandedSubjects, userId]);

  useEffect(() => {
    if (userId) {
      localStorage.setItem(`trineo_expanded_units_${userId}`, JSON.stringify(expandedUnits));
    }
  }, [expandedUnits, userId]);

  // Auto-expand current lesson's subject and unit
  useEffect(() => {
    if (!currentLesson?._id || !subjects || !subjects.length) return;
    let foundSubjectId = '';
    let foundUnitId = '';
    
    for (const subject of subjects) {
      if (subject.units) {
        for (const unit of subject.units) {
          if (unit.lessons) {
            const hasLesson = unit.lessons.some((l: any) => l._id === currentLesson._id || (l.contents && l.contents.some((c: any) => c._id === currentLesson._id)));
            if (hasLesson) {
              foundSubjectId = subject._id;
              foundUnitId = unit._id;
              break;
            }
          }
        }
      }
      if (foundSubjectId) break;
    }
    
    if (foundSubjectId) {
      setExpandedSubjects(prev => {
        if (prev[foundSubjectId] === true) return prev;
        return { ...prev, [foundSubjectId]: true };
      });
    }
    if (foundUnitId) {
      setExpandedUnits(prev => {
        if (prev[foundUnitId] === true) return prev;
        return { ...prev, [foundUnitId]: true };
      });
    }
  }, [currentLesson?._id, subjects]);

  const [lessonCompletedModalOpen, setLessonCompletedModalOpen] = useState(false);
  const [learningModeFullscreen, setLearningModeFullscreen] = useState(false);
  const [isAllExpanded, setIsAllExpanded] = useState(true);

  const handleToggleExpandAll = () => {
    const nextVal = !isAllExpanded;
    setIsAllExpanded(nextVal);
    
    const newSubjects: Record<string, boolean> = {};
    const newUnits: Record<string, boolean> = {};
    
    subjects.forEach((s: any) => {
      newSubjects[s._id] = nextVal;
      if (s.units) {
        s.units.forEach((u: any) => {
          newUnits[u._id] = nextVal;
        });
      }
    });
    
    setExpandedSubjects(newSubjects);
    setExpandedUnits(newUnits);
  };

  const currentIndex = lessons.findIndex((l: any) => l._id === currentLesson?._id);
  const nextContent = currentIndex !== -1 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  const remainingTimeText = useMemo(() => {
    if (currentIndex === -1) return 'N/A';
    const remainingLessonsCount = lessons.length - currentIndex;
    const minutes = remainingLessonsCount * 10;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }, [lessons, currentIndex]);

  const activeHierarchy = useMemo(() => {
    if (!currentLesson?._id || !subjects) return null;
    for (const subject of subjects) {
      if (subject.units) {
        for (const unit of subject.units) {
          if (unit.lessons) {
            for (const lesson of unit.lessons) {
              if (lesson._id === currentLesson._id) {
                return {
                  subjectName: subject.subjectName || subject.name || 'Subject',
                  unitName: unit.name || unit.title || 'Unit'
                };
              }
              if (lesson.contents) {
                const hasContent = lesson.contents.some((c: any) => c._id === currentLesson._id);
                if (hasContent) {
                  return {
                    subjectName: subject.subjectName || subject.name || 'Subject',
                    unitName: unit.name || unit.title || 'Unit'
                  };
                }
              }
            }
          }
        }
      }
    }
    return null;
  }, [currentLesson?._id, subjects]);

  const [activeTab, setActiveTab] = useState<'materials' | 'live-classes'>('materials');
  // Default active tab on mount
  useEffect(() => {
    setActiveTab('materials');
  }, []);

  // Static watermark — centered, higher opacity for visibility
  const watermarkStyle = { opacity: 0.25, rotate: '-8deg' };

  // Advanced Anti-Piracy DRM States
  const [isBlackedOut, setIsBlackedOut] = useState(false);
  const [provider, setProvider] = useState<'youtube' | 'hls'>('youtube');
  const wasPlayingBeforeBlackout = useRef(false);
  const [ipAddress, setIpAddress] = useState('127.0.0.1');
  const [sessionId, setSessionId] = useState('N/A');

  // Security Counter State
  const [violationCount, setViolationCount] = useState(0);
  const [cooldownTimeRemaining, setCooldownTimeRemaining] = useState(0);
  const [securityLockActive, setSecurityLockActive] = useState(false);
  const [securityLockRemaining, setSecurityLockRemaining] = useState(0);

  // Sync global security lock states
  useEffect(() => {
    const requiresManualResume = localStorage.getItem('trineo_lock_requires_manual_resume') === 'true';
    const lockUntil = parseInt(localStorage.getItem('trineo_security_lock_until') || '0', 10);
    const serverTimeOffset = protectionManagerRef.current ? (protectionManagerRef.current as any).serverTimeOffset || 0 : 0;
    const isLockActive = requiresManualResume || (Date.now() + serverTimeOffset) < lockUntil;

    setSecurityLockActive(isBlackedOut && isLockActive);
    setSecurityLockRemaining(cooldownTimeRemaining);
  }, [isBlackedOut, cooldownTimeRemaining]);


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
  const [autoNext, setAutoNext] = useState<boolean>(() => {
    const saved = localStorage.getItem(`autoNext_${userId}`);
    return saved === 'true';
  });

  // Save autoNext on change
  useEffect(() => {
    if (userId) {
      localStorage.setItem(`autoNext_${userId}`, autoNext.toString());
    }
  }, [autoNext, userId]);

  // Course level Study Materials fetched from backend
  const [courseMaterials, setCourseMaterials] = useState<any[]>([]);
  const [liveClasses, setLiveClasses] = useState<any[]>([]);
  const [liveClassesLoading, setLiveClassesLoading] = useState(false);

  // Local learning tools states
  const [notes, setNotes] = useState<any[]>([]);
  const [noteText, setNoteText] = useState('');
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [discussionText, setDiscussionText] = useState('');

  const { data: securityStatusRes } = useQuery({
    queryKey: ['status', userId],
    queryFn: () => apiFetch('/security/status', { ignoreAuthError: true }),
    refetchInterval: 5000,
    enabled: !!userId,
  });

  // Load notes and discussions whenever courseId changes
  useEffect(() => {
    if (courseId && userId) {
      try {
        const savedNotes = localStorage.getItem(`notes_${userId}_${courseId}`);
        setNotes(savedNotes ? JSON.parse(savedNotes) : []);
      } catch (e) {
        setNotes([]);
      }
      try {
        const savedDiscs = localStorage.getItem(`discussions_${userId}_${courseId}`);
        setDiscussions(savedDiscs ? JSON.parse(savedDiscs) : []);
      } catch (e) {
        setDiscussions([]);
      }
    } else {
      setNotes([]);
      setDiscussions([]);
    }
  }, [courseId, userId]);

  // Lesson issue reporting
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState('Playback bug');
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Advanced DRM Heuristics: Security Logging to Backend Audit System
  const reportSecurityViolation = async (eventType: string, details: string): Promise<{ success: boolean; action?: string; message?: string; penaltyUntil?: string; serverTime?: string } | null> => {
    console.log("[SECURITY] reportSecurityViolation called with eventType:", eventType, "details:", details);
    const localAudit = {
      _id: `local-${Date.now()}`,
      eventType,
      details,
      createdAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      deviceFingerprint: navigator.userAgent
    };

    try {
      const res = await apiFetch('/security/audit', {
        method: 'POST',
        body: JSON.stringify({
          eventType,
          details,
          deviceFingerprint: navigator.userAgent
        })
      });
      console.log("[SECURITY] reportSecurityViolation API response:", res);
      if (res) {
        console.log("[SECURITY] reportSecurityViolation details:", {
          penaltyUntil: res.penaltyUntil,
          serverTime: res.serverTime,
          remainingSeconds: (res as any).remainingSeconds,
          securityLockActive: !!res.penaltyUntil,
          securityLockRemaining: (res as any).remainingSeconds
        });
      }
      return res;
    } catch (e) {
      console.error('[DRM Audit Failure]', e);
      try {
        const existing = JSON.parse(localStorage.getItem('trineo_security_audit') || '[]');
        localStorage.setItem('trineo_security_audit', JSON.stringify([localAudit, ...existing].slice(0, 50)));
      } catch (_err) {}
      return null;
    }
  };

  // Sync refs for the ProtectionManager callback
  const isPlayingRef = useRef(false);
  const providerRef = useRef<'youtube' | 'hls'>('youtube');
  const ipAddressRef = useRef(ipAddress);
  const sessionIdRef = useRef(sessionId);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    providerRef.current = provider;
  }, [provider]);

  useEffect(() => {
    ipAddressRef.current = ipAddress;
  }, [ipAddress]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Centralized ProtectionManager Integration
  useEffect(() => {
    if (!user) return;

    if (protectionManagerRef.current) {
      console.log("[SECURITY] Stopping previous ProtectionManager instance before starting new one");
      protectionManagerRef.current.stop();
    }

    const manager = new ProtectionManager({
      userId: userId,
      email: user.email || '',
      ipAddress: ipAddressRef.current,
      sessionId: sessionIdRef.current,
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
        console.log("[SECURITY] onStateChange callback:", { suspicious, type, details });
        setIsBlackedOut(suspicious);
      },
      onViolationCountChange: (count) => {
        console.log("[SECURITY] onViolationCountChange callback:", count);
        setViolationCount(count);
      },
      onCooldownTimeChange: (timeRemaining) => {
        console.log("[SECURITY] onCooldownTimeChange callback:", timeRemaining);
        setCooldownTimeRemaining(timeRemaining);
      },
      onTerminateSession: (reason) => {
        console.log("[SECURITY] onTerminateSession callback:", reason);
        setIsPlaying(false);
      },
      reportViolation: async (type, details) => {
        console.log("[SECURITY] options.reportViolation callback triggered with type:", type);
        const finalType = (type === 'screenshot' || type === 'PrintScreen' || type === 'screenshot_attempt')
          ? 'screenshot'
          : type;
        return reportSecurityViolation(finalType, details);
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
  }, [user]);

  // Synchronize React Query security status to ProtectionManager instance
  useEffect(() => {
    if (!securityStatusRes || !protectionManagerRef.current) return;
    const manager = protectionManagerRef.current;
    
    if (securityStatusRes.penaltyActive && securityStatusRes.penaltyUntil) {
      manager.syncSecurityStatus(
        securityStatusRes.violationCount || 0,
        securityStatusRes.penaltyUntil,
        securityStatusRes.serverTime || null
      );
    } else {
      console.log("[SECURITY] Server says no active penalty. Clearing stale local lock.");
      localStorage.removeItem('trineo_security_lock_until');
      localStorage.setItem('trineo_lock_requires_manual_resume', 'false');
      manager.recoverFromViolation();
      
      if (securityStatusRes.violationCount > 0) {
        manager.syncSecurityStatus(securityStatusRes.violationCount, null, null);
      }
    }
    
    if (securityStatusRes.forceLogout) {
      manager.terminateSession('exceeded');
    }
    if (securityStatusRes.accountLocked) {
      manager.terminateSession('locked');
    }
  }, [securityStatusRes]);



  // Watermark is static — no movement effect needed

  // 2. Active Session Heartbeat (shortened to 5 seconds) and user fetch
  useEffect(() => {
    initializePushNotifications().catch(err => console.error('Push init failed:', err));

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
        const currentSlug = programSlug || courseSlug;
        if (!currentSlug || currentSlug === 'undefined') {
          setError('Course not found.');
          console.log("API endpoint: not called (courseSlug/programSlug is undefined or 'undefined')");
          return;
        }

        const isObjectId = (val: string) => /^[0-9a-fA-F]{24}$/.test(val);
        const url = isObjectId(currentSlug) ? `/courses/${currentSlug}` : `/courses/slug/${currentSlug}`;
        console.log("API endpoint being called", url);

        const courseData = await apiFetch(url);
        console.log("Raw API response", courseData);
        console.log("Parsed course object", courseData);

        const subjectsData = courseData?.subjects || [];
        const unitsData: any[] = [];
        const lessonsData: any[] = [];

        subjectsData.forEach((s: any, sIdx: number) => {
          if (s.units) {
            s.units.forEach((u: any, uIdx: number) => {
              unitsData.push(u);
              if (u.lessons) {
                u.lessons.forEach((l: any, lIdx: number) => {
                  // For backward compatibility with legacy groupings
                  l.moduleOrder = u.displayOrder || (uIdx + 1);
                  l.moduleTitle = u.name || u.title || `Module ${uIdx + 1}`;
                  lessonsData.push(l);
                });
              }
            });
          }
        });

        console.log("Parsed subjects", subjectsData);
        console.log("Parsed units", unitsData);
        console.log("Parsed lessons", lessonsData);

        let selectedLesson = null;
        if (lessonSlug && lessonSlug !== 'undefined') {
          selectedLesson = lessonsData.find((l: any) => l.slug === lessonSlug) || null;
        }
        if (!selectedLesson) {
          const firstPlayable = lessonsData.find((l: any) => !l.isLocked) || lessonsData[0];
          selectedLesson = firstPlayable || null;
        }
        console.log("Lesson Response", selectedLesson);

        setCourse(courseData);
        setSubjects(subjectsData);
        setUnits(unitsData);
        setLessons(lessonsData);
        setSyllabus(subjectsData);
        setLesson(selectedLesson);
      } catch (err: any) {
        setError(err.message || 'Failed to load video playlist');
        console.error("Failed to load course details", err);
      } finally {
        setLoading(false);
      }
    };

    const currentSlug = programSlug || courseSlug;
    if (currentSlug && currentSlug !== 'undefined') {
      loadCourseDetails();
    } else {
      setError('Course not found.');
      setLoading(false);
    }
  }, [courseSlug, programSlug, lessonSlug]);

  useEffect(() => {
    if (!lessons.length) return;
    let selectedLesson = null;
    if (lessonSlug && lessonSlug !== 'undefined') {
      selectedLesson = lessons.find((l: any) => l.slug === lessonSlug) || null;
    }
    if (!selectedLesson) {
      const firstPlayable = lessons.find((l: any) => !l.isLocked) || lessons[0];
      selectedLesson = firstPlayable || null;
    }
    setLesson(selectedLesson);
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
    setPlayAttempted(false);
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
            const savedTime = localStorage.getItem(`resume_${userId}_${currentLesson?._id}`);
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
                localStorage.setItem(`completed_${userId}_${currentLesson._id}`, 'true');
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
              } else {
                setLessonCompletedModalOpen(true);
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
              localStorage.setItem(`completed_${userId}_${currentLesson._id}`, 'true');
            }

            // Save resume state
            if (Math.floor(current) % 2 === 0) {
              localStorage.setItem(`resume_${userId}_${currentLesson?._id}`, current.toString());
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
  }, [activeVideoId, provider, currentLesson, autoNext, lessons, userId]);

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
    const savedTime = localStorage.getItem(`resume_${userId}_${currentLesson?._id}`);
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
        localStorage.setItem(`completed_${userId}_${currentLesson._id}`, 'true');
      }

      // Save resume state
      if (Math.floor(current) % 2 === 0) {
        localStorage.setItem(`resume_${userId}_${currentLesson?._id}`, current.toString());
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
        localStorage.setItem(`completed_${userId}_${currentLesson._id}`, 'true');
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
      } else {
        setLessonCompletedModalOpen(true);
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
  }, [activeVideoId, provider, currentLesson, autoNext, lessons, userId]);

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
    setPlayAttempted(true);
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


  const openDownload = async (downloadUrl: string, fileName?: string, materialId?: string) => {
    const url = await getDownloadUrlWithToken(downloadUrl);
    console.log("ANDROID PDF CLICK");
    console.log("window.AndroidApp =", window.AndroidApp);
    console.log("Calling openPdf()");
    if (window.AndroidApp?.openPdf) {
      window.AndroidApp.openPdf(url, fileName || 'Document.pdf', materialId || 'unknown');
    } else {
      window.open(url, '_blank');
    }
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
          courseTitle: course?.title || course?.name || '',
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

  const contents = lessons;
  const currentContent = currentLesson;
  const setCurrentContent = setCurrentLesson;

  const completedCount = contents.filter(c => c.completed || localStorage.getItem(`completed_${userId}_${c._id}`) === 'true').length;
  const totalItems = contents.length;
  const overallProgress = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

  const handleSaveNote = () => {
    if (!noteText.trim()) return;
    const newNote = {
      id: Date.now(),
      text: noteText,
      timestamp: currentTime,
      contentId: currentContent?._id,
      contentTitle: currentContent?.title || 'Lecture'
    };
    const updated = [newNote, ...notes];
    setNotes(updated);
    localStorage.setItem(`notes_${userId}_${courseId}`, JSON.stringify(updated));
    setNoteText('');
    toast.success('Note saved!', { description: `Attached at ${formatTime(currentTime)}` });
  };

  const handleDeleteNote = (id: number) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    localStorage.setItem(`notes_${userId}_${courseId}`, JSON.stringify(updated));
    toast.success('Note deleted.');
  };

  const handlePostDiscussion = () => {
    if (!discussionText.trim()) return;
    const newComment = {
      id: Date.now(),
      userName: user?.name || 'Student',
      userAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'student'}`,
      text: discussionText,
      timestamp: new Date().toISOString(),
      lessonTitle: currentContent?.title || 'General'
    };
    const updated = [newComment, ...discussions];
    setDiscussions(updated);
    localStorage.setItem(`discussions_${userId}_${courseId}`, JSON.stringify(updated));
    setDiscussionText('');
    toast.success('Comment posted successfully!');
  };

  const handleTriggerCertificate = () => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });
    toast.success('Certificate unlocked!', { description: 'Opening your official BCA Module Completion Certificate...' });
  };

  console.log("[UI STATE]", {
    securityLockActive,
    securityLockRemaining,
    isBlackedOut,
  });

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950 flex flex-col text-slate-900 dark:text-slate-100 select-none font-sans transition-colors duration-200">
      {/* Fullscreen Mode Exit Banner */}
      {learningModeFullscreen && (
        <div className="fixed top-4 right-4 z-[60] animate-in fade-in duration-300">
          <Button
            onClick={() => setLearningModeFullscreen(false)}
            className="bg-slate-900/75 dark:bg-black/70 backdrop-blur-md text-white border border-white/10 hover:bg-slate-800 rounded-full font-bold px-4 py-2 text-xs flex items-center gap-1.5 touch-btn shadow-lg"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Exit Fullscreen Mode</span>
          </Button>
        </div>
      )}

      {/* Top Header */}
      {!learningModeFullscreen && (
        <header className="min-h-16 h-16 border-b border-slate-200/60 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md flex items-center justify-between gap-4 px-6 flex-shrink-0 z-40 shadow-sm">
        {/* Desktop Header Content (>=1024px) */}
        <div className="hidden lg:flex items-center justify-between w-full">
          {/* Back button & Logo / Brand */}
          <div className="flex items-center gap-3.5">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-slate-600 border-slate-200 hover:bg-slate-50 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-800/50 rounded-full cursor-pointer pr-4 transition-colors"
              onClick={() => {
                if (window.history.state && window.history.state.idx > 0) {
                  navigate(-1);
                } else {
                  navigate('/student');
                }
              }}
            >
              <ChevronLeft className="w-4.5 h-4.5" />
              <span className="font-semibold text-xs">Back</span>
            </Button>
            <div className="h-5 w-px bg-slate-200 dark:bg-zinc-800 mx-1" />
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/student')}>
              <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-purple-600/20">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight leading-none bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-700 bg-clip-text text-transparent">Trineo Stream</span>
                <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">LMS Student Panel</span>
              </div>
            </div>
          </div>

          {/* Action icons & user profile */}
          <div className="flex items-center gap-4">
            <ThemeToggleButton />
            
            <Button
              variant="ghost"
              size="icon"
              className="relative h-10 w-10 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800"
              onClick={() => navigate('/student')}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-purple-600 rounded-full ring-2 ring-white dark:ring-zinc-900 animate-pulse"></span>
            </Button>

            <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-zinc-800">
              <Avatar className="w-9 h-9 border border-purple-100 dark:border-zinc-800 shadow-sm">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'student'}`} />
                <AvatarFallback className="bg-purple-100 text-purple-700">ST</AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col text-left">
                <div className="text-sm font-semibold leading-none text-slate-900 dark:text-zinc-100">{user?.name || 'Student'}</div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">Active Student</div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile/Tablet Header Content (<1024px) */}
        <div className="flex lg:hidden items-center justify-between w-full px-2 h-full">
          <button 
            onClick={() => {
              if (window.history.state && window.history.state.idx > 0) {
                navigate(-1);
              } else {
                navigate('/student');
              }
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-zinc-200 active:opacity-70 h-10 px-2 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5 text-slate-500" />
            <span>Back</span>
          </button>
          
          <div className="flex-1 text-center px-2 min-w-0">
            <h1 className="text-xs font-black text-slate-800 dark:text-zinc-100 truncate leading-snug">
              {currentContent?.title || 'Select a Lesson'}
            </h1>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              {course?.title || 'BCA'}
            </p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/30 dark:text-indigo-400 px-3 py-1.5 rounded-full">
              {overallProgress}% Progress
            </span>
          </div>
        </div>
      </header>
      )}

      {/* Main Learning Experience Content */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50 dark:bg-zinc-950/40">
        <div className="max-w-[1600px] mx-auto w-full p-0 lg:p-8 space-y-4 lg:space-y-6 pb-[calc(72px+env(safe-area-inset-bottom))] lg:pb-8">
          
          {/* Header Block with Metadata & Large Course Title */}
          <div className="hidden lg:block bg-white/95 dark:bg-zinc-900/90 border border-slate-200/50 dark:border-zinc-800/80 rounded-[24px] p-6 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                    {course?.title || 'BCA'}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">·</span>
                  <span className="text-xs text-slate-500 dark:text-zinc-400 font-semibold truncate max-w-[200px]">
                    Subject: {currentContent?.subjectName || 'C Programming'}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50 leading-tight">
                  {course?.title || 'BCA Curriculum'}
                </h1>
              </div>

              {/* Metadata Details (Inline Grid) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-8 text-xs shrink-0 bg-slate-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
                <div className="space-y-0.5">
                  <div className="text-slate-400 font-medium uppercase tracking-wider text-[9px]">Instructor</div>
                  <div className="font-bold text-slate-700 dark:text-zinc-200 truncate">{course?.instructor || 'Faculty Lead'}</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-slate-400 font-medium uppercase tracking-wider text-[9px]">Total Lessons</div>
                  <div className="font-bold text-slate-700 dark:text-zinc-200">{lessons.length} topics</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-slate-400 font-medium uppercase tracking-wider text-[9px]">Total Duration</div>
                  <div className="font-bold text-slate-700 dark:text-zinc-200">{course?.duration || '12 hours'}</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-slate-400 font-medium uppercase tracking-wider text-[9px]">Completion</div>
                  <div className="font-bold text-purple-600 dark:text-purple-400">{overallProgress}% Complete</div>
                </div>
              </div>
            </div>

            {/* Overall Course Progress Bar */}
            <div className="space-y-1 pt-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500">Learning Progress</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-2.5 bg-slate-100 dark:bg-zinc-800 [&>div]:bg-gradient-to-r [&>div]:from-purple-600 [&>div]:to-indigo-600 rounded-full" />
            </div>
          </div>



          {/* Main Grid Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column (Video Section & Tabs) */}
            <div className={`${theaterMode ? 'lg:col-span-12' : 'lg:col-span-9'} space-y-4 lg:space-y-6`}>
              
              {/* Video Player Card */}
              <div
                ref={playerContainerRef}
                className={learningModeFullscreen 
                  ? "fixed inset-0 bg-black z-50 flex flex-col justify-center items-center w-screen h-screen select-none"
                  : "sticky top-0 lg:relative z-30 bg-background lg:bg-black w-full aspect-video lg:rounded-[24px] border-b lg:border border-slate-200/80 dark:border-zinc-800 shadow-lg overflow-hidden group cursor-none transition-all duration-300"
                }
                style={learningModeFullscreen 
                  ? { cursor: controlsVisible ? 'default' : 'none' } 
                  : { cursor: controlsVisible ? 'default' : 'none', aspectRatio: '16 / 9' }
                }
                onContextMenu={(e) => e.preventDefault()}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => isPlaying && setControlsVisible(false)}
                onTouchStart={handlePlayerTouchStart}
                onTouchMove={handlePlayerTouchMove}
                onTouchEnd={handlePlayerTouchEnd}
              >
                {/* Floating Lesson Title Overlay */}
                {currentContent && (
                  <div className="absolute top-4 left-4 z-30 pointer-events-none transition-opacity duration-300 opacity-90 group-hover:opacity-100">
                    <div className="bg-slate-900/75 dark:bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-white text-[11px] font-semibold tracking-wide shadow-md flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping"></span>
                      <span>{currentContent.title}</span>
                    </div>
                  </div>
                )}

                {error && (course?.isLocked || currentLesson?.isLocked || playAttempted) ? (
                  <>
                    {/* Desktop Fallback Overlay */}
                    <div className="absolute inset-0 hidden lg:flex flex-col items-center justify-center bg-black/90 p-6 text-center z-30">
                      <Lock className="w-16 h-16 text-purple-500 mb-4" />
                      <h3 className="text-xl font-bold mb-2 text-white">Topic Unavailable</h3>
                      <p className="text-muted-foreground max-w-sm mb-4">{error}</p>
                      <Button 
                        className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm shadow-purple-600/10 rounded-xl"
                        onClick={() => navigate('/student/courses')}
                      >
                        View Batch Catalog
                      </Button>
                    </div>

                    {/* Mobile Fallback Overlay (styled per mockup) */}
                    <div className="absolute inset-0 flex lg:hidden flex-col items-center justify-center bg-gradient-to-br from-indigo-50/70 via-slate-50 to-purple-50/70 dark:from-zinc-900 dark:to-zinc-950 p-6 text-center z-30">
                      <svg width="150" height="100" viewBox="0 0 150 100" fill="none" className="mx-auto mb-3 drop-shadow-sm">
                        <path d="M15 60C15 35 42 18 80 18C118 18 145 35 145 60C145 72 131 80 80 80C29 80 15 72 15 60Z" fill="#EEE5FF" className="dark:fill-purple-950/30" />
                        <circle cx="125" cy="65" r="9" fill="#FFFFFF" className="dark:fill-zinc-800" />
                        <polygon points="123,62 129,65 123,68" fill="#8B5CF6" />
                        <circle cx="35" cy="67" r="7" fill="#EEE5FF" className="dark:fill-purple-950/20" />
                        <path d="M33 67H37" stroke="#8B5CF6" strokeWidth="1.5" />
                        <rect x="57" y="44" width="36" height="28" rx="8" fill="url(#lockGrad)" />
                        <path d="M64 44V34C64 29.5 67.5 26 72 26C76.5 26 80 29.5 80 34V44" stroke="url(#lockGrad)" strokeWidth="4.5" strokeLinecap="round" />
                        <circle cx="75" cy="57" r="2.5" fill="#312E81" />
                        <path d="M75 59V64" stroke="#312E81" strokeWidth="2" strokeLinecap="round" />
                        <defs>
                          <linearGradient id="lockGrad" x1="57" y1="26" x2="93" y2="72" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#8B5CF6" />
                            <stop offset="100%" stopColor="#6366F1" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <h3 className="text-base font-black text-slate-800 dark:text-zinc-100 mb-1">Topic Unavailable</h3>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-semibold mb-4">This video is currently unavailable.</p>
                      <Button 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs h-10 px-5 flex items-center gap-1.5 shadow-md shadow-indigo-500/10 border-0"
                        onClick={() => navigate('/student/courses')}
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>View Batch Catalog</span>
                      </Button>
                    </div>
                  </>
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
                      <span className="text-xs opacity-90">ID: {userId} · IP: {ipAddress}</span>
                    </div>
                  </div>
                )}

                {/* PDF Content Viewer */}
                {currentContent?.type === 'pdf' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 p-6 text-center z-20 text-white select-text">
                    <FileText className="w-14 h-14 text-purple-500 mb-3 animate-pulse" />
                    <h3 className="text-lg font-bold mb-1">{currentContent.title}</h3>
                    <p className="text-xs text-slate-400 max-w-sm mb-4">
                      {currentContent.description || 'This PDF notes file is ready to read.'}
                    </p>
                    <div className="flex gap-3">
                      {currentContent.attachmentUrl && (
                        <Button 
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 rounded-xl"
                          onClick={() => openDownload(`/content/${currentContent._id}/download`)}
                        >
                          <Download className="w-3.5 h-3.5" /> Download PDF
                        </Button>
                      )}
                      <Button 
                        size="sm"
                        variant="outline"
                        className="border-slate-700 hover:bg-slate-800 text-white rounded-xl"
                        onClick={async () => {
                          try {
                            await apiFetch('/progress/update', {
                              method: 'POST',
                              body: JSON.stringify({
                                contentId: currentContent._id,
                                progress: 100
                              })
                            });
                            toast.success('Marked as completed!');
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                      >
                        Mark as Completed
                      </Button>
                    </div>
                  </div>
                )}

                {/* YouTube Player Container */}
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

                {/* Pure Black Security Overlay */}
                <div 
                  className="absolute inset-0 bg-black z-50 flex flex-col items-center justify-center text-center transition-all duration-200 ease-in-out p-6 text-white"
                  style={{
                    opacity: isBlackedOut ? 1 : 0,
                    pointerEvents: isBlackedOut ? 'auto' : 'none',
                    visibility: isBlackedOut ? 'visible' : 'hidden'
                  }}
                >
                  {cooldownTimeRemaining === 0 && localStorage.getItem('trineo_lock_requires_manual_resume') !== 'true' ? (
                    <div className="flex flex-col items-center justify-center animate-in fade-in duration-300">
                      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-3">
                        <Pause className="w-5 h-5 text-white fill-white" />
                      </div>
                      <h3 className="text-base font-bold text-white mb-1">LMS Paused</h3>
                      <p className="text-xs text-gray-400">Click video or focus window to resume playback</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300 max-w-md">
                      {/* Pulsing Shield Icon */}
                      <div className="relative mb-5 flex justify-center">
                        <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse"></div>
                        <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center relative" style={{ boxShadow: '0 0 40px rgba(239,68,68,0.15)' }}>
                          <ShieldAlert className="w-7 h-7 text-red-500" />
                        </div>
                      </div>

                      {/* Dynamic Title */}
                      <h3 className="text-xl font-extrabold text-red-500 mb-1.5 tracking-tight">
                        {violationCount >= 3 
                          ? '🚫 Account Security Lock' 
                          : '🛡 Security Violation Detected'}
                      </h3>
                      <p className="text-sm text-gray-400 mb-5 px-6 leading-relaxed">
                        {violationCount >= 3 
                          ? 'Your session has been terminated due to repeated screen capture attempts.' 
                          : 'Video access temporarily suspended.'}
                      </p>

                      {/* Attempt Badge */}
                      <div className="px-5 py-2.5 rounded-full bg-card/45 backdrop-blur-xl border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.25)] text-sm text-red-400 font-bold tracking-widest uppercase flex items-center gap-2 mb-5 justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                        Attempt {violationCount >= 3 ? 3 : violationCount || 1} of 3
                      </div>

                      {violationCount >= 3 ? (
                        <div className="flex flex-col items-center gap-3 animate-in fade-in duration-300">
                          <p className="text-xs text-gray-400 max-w-[300px] leading-relaxed">
                            For content protection, your session has been terminated. Contact your institute administrator for assistance.
                          </p>
                        </div>
                      ) : cooldownTimeRemaining > 0 ? (
                        <div className="flex flex-col items-center gap-3 animate-in fade-in duration-300">
                          {/* MM:SS Countdown */}
                          <div className="text-[0.65rem] text-red-500 font-bold uppercase tracking-[0.15em]">
                            Time Remaining
                          </div>
                          <div className="text-4xl font-black text-white tracking-wider tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {String(Math.floor(cooldownTimeRemaining / 60)).padStart(2, '0')}:{String(cooldownTimeRemaining % 60).padStart(2, '0')}
                          </div>
                          <div className="mt-1 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                            <p className="text-[0.7rem] text-gray-400 max-w-[300px] leading-relaxed">
                              {violationCount === 2 
                                ? 'Do not attempt screenshots or screen recording. One more violation will terminate your session.' 
                                : 'Do not attempt screenshots or screen recording. Repeated violations may result in account logout.'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
                          <p className="text-xs text-gray-400 max-w-xs leading-relaxed px-4">
                            Penalty period has ended. Click below to restore playback.
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
                            className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/20 px-7 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02]"
                          >
                            Resume Topic
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Secure Overlay Center Play Button */}
                {!isPlaying && (!error || (!(course?.isLocked || currentLesson?.isLocked) && !playAttempted)) && !isBlackedOut && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10 transition-opacity">
                    <button
                      onClick={togglePlay}
                      className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center hover:scale-110 transition-transform shadow-2xl animate-pulse"
                    >
                      <Play className="w-8 h-8 text-white fill-white ml-1" />
                    </button>
                  </div>
                )}

                {/* Custom Player Controls */}
                {!error && (
                  <div 
                    className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2 sm:p-4 transition-opacity duration-300 z-20 ${
                      controlsVisible && !isBlackedOut 
                        ? 'opacity-100 pointer-events-auto' 
                        : 'opacity-0 pointer-events-none'
                    }`}
                    style={{ pointerEvents: isBlackedOut ? 'none' : undefined }}
                  >
                    {/* Netflix-style overlay header */}
                    <div className="flex justify-between items-center text-[9px] sm:text-[11px] text-white/75 font-semibold mb-1.5 sm:mb-2 px-0.5">
                      <div className="flex items-center gap-1.5 truncate max-w-[48%]">
                        <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-purple-400 font-extrabold bg-purple-50/50 px-1.5 py-0.5 rounded">Current Lesson</span>
                        <span className="truncate">{currentContent?.title}</span>
                      </div>
                      {nextContent && (
                        <div className="flex items-center gap-1.5 truncate max-w-[48%] justify-end">
                          <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-slate-300 font-extrabold bg-white/10 px-1.5 py-0.5 rounded">Next Lesson</span>
                          <span className="truncate text-white/90">{nextContent.title}</span>
                        </div>
                      )}
                    </div>

                    {/* Progress Seek bar */}
                    <div 
                      className="h-1 sm:h-1.5 w-full bg-white/20 hover:h-2 rounded-full cursor-pointer transition-all mb-2 sm:mb-3 relative group/scrub"
                      onClick={handleProgressSeek}
                    >
                      <div 
                        className="h-full bg-purple-600 rounded-full relative" 
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

                        {/* Volume slider container (hidden on mobile/tablet) */}
                        <div className="hidden md:flex items-center gap-1 sm:gap-2 group/volume">
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
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`hidden lg:inline-flex text-white hover:bg-white/10 h-8 px-2 flex items-center gap-1 rounded-md text-xs sm:text-sm font-semibold transition-all ${autoNext ? 'text-purple-400 bg-purple-500/10' : 'opacity-65'}`}
                          onClick={() => setAutoNext(prev => !prev)}
                          title="Auto-Next Lesson"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          <span className="hidden xs:inline">Auto Next</span>
                        </Button>

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
                                        selectedQuality === q ? 'text-purple-400 font-semibold' : 'text-slate-400'
                                      }`}
                                    >
                                      <span>{formatQualityLabel(q)}</span>
                                      {selectedQuality === q && <CheckCircle2 className="w-3.5 h-3.5" />}
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
                                <ChevronLeft className="w-3.5 h-3.5 rotate-180 opacity-50" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {provider === 'hls' && document.pictureInPictureEnabled && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="hidden lg:inline-flex text-white hover:bg-white/10 h-8 w-8 sm:h-10 sm:w-10"
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
                          className={`hidden lg:inline-flex text-white hover:bg-white/10 h-8 w-8 sm:h-10 sm:w-10 ${theaterMode ? 'text-purple-400 bg-purple-500/10' : ''}`}
                          onClick={() => setTheaterMode(!theaterMode)}
                          title="Theater Mode"
                        >
                          <Tv className="w-4 h-4 sm:w-5 sm:h-5" />
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          className={`text-white hover:bg-white/10 h-8 w-8 sm:h-10 sm:w-10 ${learningModeFullscreen ? 'text-purple-400 bg-purple-500/10' : ''}`}
                          onClick={() => setLearningModeFullscreen(!learningModeFullscreen)}
                          title="Fullscreen Learning Mode"
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

                {/* Thin persistent progress bar at bottom of video container on mobile when controls are NOT visible */}
                {!error && !isBlackedOut && !controlsVisible && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20 z-20 block lg:hidden">
                    <div 
                      className="h-full bg-purple-600 transition-all duration-150" 
                      style={{ width: `${videoProgress}%` }}
                    />
                  </div>
                )}

                {/* Brightness Dimming Layer Overlay */}
                <div 
                  className="absolute inset-0 bg-black pointer-events-none z-[19] transition-opacity duration-150" 
                  style={{ opacity: 1 - brightness }}
                />

                {/* Gesture HUD Indicator */}
                {hudVisible && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-in fade-in duration-200">
                    <div className="bg-black/85 backdrop-blur-xl px-5 py-3 rounded-2xl flex items-center gap-3 border border-white/10 text-white shadow-2xl scale-100 transform transition-all">
                      {hudType === 'volume' ? (
                        <>
                          {volume === 0 ? <VolumeX className="w-5 h-5 text-purple-400" /> : <Volume2 className="w-5 h-5 text-purple-400" />}
                          <span className="text-sm font-bold uppercase tracking-wider">Volume {hudValue}%</span>
                        </>
                      ) : (
                        <>
                          <Sun className="w-5 h-5 text-purple-400 animate-pulse" />
                          <span className="text-sm font-bold uppercase tracking-wider">Brightness {hudValue}%</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Double Tap Seek Feedback Ripples */}
                {doubleTapFeedback === 'rewind' && (
                  <div className="absolute inset-y-0 left-0 w-[40%] bg-gradient-to-r from-white/10 to-transparent flex flex-col items-center justify-center text-white pointer-events-none z-30 animate-in slide-in-from-left fade-in duration-300">
                    <div className="bg-black/50 backdrop-blur-md p-4 rounded-full flex flex-col items-center justify-center">
                      <ChevronsLeft className="w-7 h-7 text-purple-500 animate-pulse" />
                      <span className="text-[10px] font-black mt-1 uppercase tracking-widest">-10s</span>
                    </div>
                  </div>
                )}

                {doubleTapFeedback === 'forward' && (
                  <div className="absolute inset-y-0 right-0 w-[40%] bg-gradient-to-l from-white/10 to-transparent flex flex-col items-center justify-center text-white pointer-events-none z-30 animate-in slide-in-from-right fade-in duration-300">
                    <div className="bg-black/50 backdrop-blur-md p-4 rounded-full flex flex-col items-center justify-center">
                      <ChevronsRight className="w-7 h-7 text-purple-500 animate-pulse" />
                      <span className="text-[10px] font-black mt-1 uppercase tracking-widest">+10s</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Lesson Summary Card (<1024px) */}
              <div className="block lg:hidden bg-card border border-border/40 rounded-2xl p-4 shadow-sm space-y-3 mt-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center shrink-0">
                    <SlidersHorizontal className="w-5 h-5 text-indigo-650 dark:text-indigo-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-black text-sm text-slate-800 dark:text-zinc-100 leading-tight">
                      {currentContent?.title || 'Select a Lesson'}
                    </h4>
                    <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
                      {currentContent?.youtubeDuration || currentContent?.duration || '10:00'} • Topic {currentIndex !== -1 ? currentIndex + 1 : 1} of {lessons.length}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-1.5 pt-1.5 border-t border-slate-100 dark:border-zinc-850">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-muted-foreground">Progress</span>
                    <span className="font-black text-indigo-600 dark:text-indigo-400">{overallProgress}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-1.5 bg-slate-100 dark:bg-zinc-800 [&>div]:bg-indigo-600 rounded-full" />
                </div>
              </div>

              {/* Mobile Course Content Drawer Trigger (<1024px) */}
              <div className="block lg:hidden w-full mt-3">
                <Sheet open={mobileLessonsOpen} onOpenChange={setMobileLessonsOpen}>
                  <SheetTrigger asChild>
                    <div className="w-full bg-card border border-border/40 rounded-2xl p-4 flex flex-col cursor-pointer hover:border-primary/20 transition-all shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div className="min-w-0 text-left">
                            <h4 className="font-black text-sm text-slate-800 dark:text-zinc-100 leading-tight">
                              Course Content
                            </h4>
                            <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
                              {lessons.length} Lessons Available
                            </p>
                          </div>
                        </div>
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      </div>
                      <div className="text-[10px] text-indigo-650 dark:text-indigo-400 font-bold uppercase tracking-wider mt-2.5 w-full text-center border-t border-slate-150/40 dark:border-zinc-850 pt-2 flex items-center justify-center gap-1 select-none">
                        <span>▼</span> Expand Topics
                      </div>
                    </div>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[80vh] rounded-t-[32px] p-0 flex flex-col overflow-hidden border-slate-200/50 bg-white dark:bg-zinc-950 shadow-2xl">
                    {/* Drag Handle */}
                    <div className="w-12 h-1 bg-slate-200 dark:bg-zinc-800 rounded-full mx-auto my-3 shrink-0" />

                    <SheetHeader className="px-5 pb-4 pt-1 border-b border-slate-100 dark:border-zinc-850 flex-shrink-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <SheetTitle className="text-base font-black text-slate-800 dark:text-zinc-100">Course Content</SheetTitle>
                          <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">{contents.length} learning items</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-9 px-4 border-slate-200 text-indigo-650 dark:border-zinc-800 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-zinc-850 font-bold rounded-full gap-1 flex items-center shadow-none bg-white"
                            onClick={handleToggleExpandAll}
                          >
                            <span>{isAllExpanded ? 'Collapse All' : 'Expand All'}</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-9 h-9 rounded-full border-slate-200 hover:bg-slate-50 text-slate-700 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-850 shrink-0 flex items-center justify-center bg-white dark:bg-zinc-900 shadow-none"
                            onClick={() => setMobileLessonsOpen(false)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </SheetHeader>

                    <ScrollArea className="flex-1 overflow-y-auto">
                      <div className="p-5 space-y-4 box-border overflow-x-hidden pb-12 bg-white dark:bg-zinc-950">
                        {course?.subjects?.map((subject: any) => {
                          const isSubjectExpanded = expandedSubjects[subject._id] !== false;
                          const subjectInitial = (subject.subjectName || 'C').charAt(0).toUpperCase();
                          return (
                            <div key={subject._id} className="space-y-2">
                              {/* Subject Row */}
                              <button
                                type="button"
                                className="w-full text-left flex items-center justify-between py-2 hover:text-indigo-600 transition-colors"
                                onClick={() => setExpandedSubjects(prev => ({ ...prev, [subject._id]: !prev[subject._id] }))}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="text-purple-650 font-black text-lg shrink-0">•</span>
                                  <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 text-xs font-black flex items-center justify-center shrink-0">
                                    {subjectInitial}
                                  </div>
                                  <span className="truncate text-xs font-black text-slate-800 dark:text-zinc-200 uppercase tracking-wide">
                                    {subject.subjectName}
                                  </span>
                                </div>
                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isSubjectExpanded ? 'rotate-180' : ''}`} />
                              </button>
                              
                                                     {isSubjectExpanded && subject.units?.map((unit: any) => {
                                const isUnitExpanded = expandedUnits[unit._id] !== false;
                                return (
                                  <div key={unit._id} className="pl-3 space-y-2.5">
                                    {/* Unit Header Card */}
                                    <button
                                      type="button"
                                      className="w-full text-left flex items-center justify-between p-3 bg-slate-50/50 dark:bg-zinc-900/50 rounded-2xl border border-slate-100 dark:border-zinc-800/80 hover:border-primary/20 transition-all"
                                      onClick={() => setExpandedUnits(prev => ({ ...prev, [unit._id]: !prev[unit._id] }))}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <Folder className="w-4 h-4 text-slate-400 shrink-0" />
                                        <span className="truncate text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wide">
                                          {unit.name}
                                        </span>
                                      </div>
                                      <span className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 text-[10px] font-black px-2.5 py-0.5 rounded-full shrink-0">
                                        {unit.lessons?.length || 0} {unit.lessons?.length === 1 ? 'Topic' : 'Topics'}
                                      </span>
                                    </button>
                                    
                                    {/* Lessons List inside Unit */}
                                    {isUnitExpanded && (
                                      <div className="space-y-2 pl-1">
                                        {unit.lessons?.map((lesson: any) => {
                                          const isLessonExpanded = expandedLessons[lesson._id] !== false;
                                          const lessonVideos = lesson.videos || lesson.contents?.filter((c: any) => c.type === 'video') || [];
                                          const completedCount = lessonVideos.filter((v: any) => v.completed || localStorage.getItem(`completed_${userId}_${v._id}`) === 'true').length;

                                          return (
                                            <div key={lesson._id} className="space-y-1">
                                              <button
                                                type="button"
                                                className="w-full text-left flex items-center justify-between p-2.5 bg-slate-55 dark:bg-zinc-900/10 rounded-xl hover:bg-slate-50/40 transition-colors"
                                                onClick={() => setExpandedLessons(prev => ({ ...prev, [lesson._id]: !prev[lesson._id] }))}
                                              >
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                  <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${isLessonExpanded ? 'rotate-90' : ''}`} />
                                                  <span className="truncate text-xs font-bold text-slate-750 dark:text-zinc-350">
                                                    {lesson.title}
                                                  </span>
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-medium shrink-0 font-sans">
                                                  {completedCount} / {lessonVideos.length} Completed
                                                </span>
                                              </button>

                                              {isLessonExpanded && (
                                                <div className="space-y-2 pl-2 border-l border-slate-100 dark:border-zinc-800/80 ml-1.5 mt-1">
                                                  {lessonVideos.map((content: any, contentIdx: number) => {
                                                    const isSelected = currentContent?._id === content._id;
                                                    const isLocked = content.isLocked;
                                                    const isCompleted = content.completed || localStorage.getItem(`completed_${userId}_${content._id}`) === 'true';

                                                    const resumeTime = parseFloat(localStorage.getItem(`resume_${userId}_${content._id}`) || '0');
                                                    const contentDurSec = content.durationSeconds || (content.videoAssetId && typeof content.videoAssetId === 'object' ? content.videoAssetId.durationSeconds : 0) || parseDurationToSeconds(content.youtubeDuration || content.duration);
                                                    const itemProgressPercent = resumeTime && contentDurSec ? Math.min(100, Math.round((resumeTime / contentDurSec) * 100)) : 0;

                                                    return (
                                                      <div
                                                        key={content._id}
                                                        onClick={() => {
                                                          if (!isLocked) {
                                                            setCurrentContent(content);
                                                            setMobileLessonsOpen(false);
                                                          }
                                                        }}
                                                        className={`w-full p-3 rounded-xl cursor-pointer border transition-all flex items-center justify-between gap-3 shadow-sm ${
                                                          isSelected
                                                            ? 'bg-purple-50/10 dark:bg-purple-950/10 border-purple-200 dark:border-purple-900/60'
                                                            : isLocked
                                                            ? 'opacity-55 cursor-not-allowed border-transparent text-slate-400'
                                                            : 'bg-white dark:bg-zinc-900 border-border/40 hover:border-primary/20 text-slate-650 dark:text-zinc-400'
                                                        }`}
                                                      >
                                                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                                          <div className="flex-shrink-0">
                                                            {isLocked ? (
                                                              <div className="w-5 h-5 rounded-full border border-slate-200 dark:border-zinc-700 flex items-center justify-center bg-slate-50 dark:bg-zinc-800">
                                                                <Lock className="w-2.5 h-2.5 text-slate-400" />
                                                              </div>
                                                            ) : isCompleted ? (
                                                              <div className="w-5 h-5 rounded-full border border-green-500 bg-green-50 dark:bg-green-950/20 flex items-center justify-center">
                                                                <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                                                              </div>
                                                            ) : isSelected ? (
                                                              <div className="w-5 h-5 rounded-full border border-purple-600 bg-purple-50 dark:bg-purple-950/20 flex items-center justify-center">
                                                                <Play className="w-2 h-2 text-purple-650 dark:text-purple-400 fill-current animate-pulse" />
                                                              </div>
                                                            ) : (
                                                              <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-zinc-700 flex items-center justify-center bg-white dark:bg-zinc-900" />
                                                            )}
                                                          </div>

                                                          <div className="min-w-0 flex-1 text-left">
                                                            <span className={`block text-xs font-black truncate leading-tight ${isSelected ? 'text-purple-750 dark:text-purple-300 font-bold' : 'text-slate-800 dark:text-zinc-250'}`}>
                                                              {content.title}
                                                            </span>
                                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                              <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-0.5">
                                                                <Clock className="w-3 h-3 text-slate-450" />
                                                                {content.youtubeDuration || content.duration || '10:00'}
                                                              </span>
                                                              <span className={`text-[8px] font-black uppercase rounded px-1.5 py-0.5 tracking-wider leading-none ${
                                                                isCompleted
                                                                  ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400'
                                                                  : isSelected
                                                                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                                                                  : 'bg-indigo-50/70 text-indigo-650 dark:bg-indigo-950/20 dark:text-indigo-400'
                                                              }`}>
                                                                {isCompleted ? 'COMPLETED' : isSelected ? 'PLAYING' : 'UPCOMING'}
                                                              </span>
                                                            </div>
                                                          </div>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                        {(!unit.lessons || unit.lessons.length === 0) && (
                                          <p className="text-[10px] text-slate-400 italic pl-6 py-1">No topics configured in this unit.</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}

                        {/* Stay on track card */}
                        <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/10 dark:to-purple-950/10 rounded-2xl p-4 flex items-center gap-4 border border-indigo-100/40 dark:border-indigo-900/10 mt-6 shadow-none">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                            <ClipboardList className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div className="min-w-0 text-left">
                            <h4 className="text-xs font-black text-slate-800 dark:text-zinc-150">Stay on track!</h4>
                            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 leading-relaxed">
                              Complete the upcoming lessons to unlock your progress.
                            </p>
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  </SheetContent>
                </Sheet>
              </div>

              {/* Mobile-only Collapsible Resources (Accordion) (<1024px) */}
              <div className="block lg:hidden space-y-4 px-4 sm:px-0">
                <Accordion type="multiple" defaultValue={['topic-resources', 'batch-resources']} className="w-full space-y-3 border-0">
                  {/* Topic Resources Accordion Item */}
                  <AccordionItem value="topic-resources" className="border border-border/40 bg-card rounded-2xl px-4 overflow-hidden shadow-sm">
                    <AccordionTrigger className="hover:no-underline py-3.5">
                      <div className="flex items-center gap-2">
                        <Folder className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300">Topic Resources</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-1 space-y-3">
                      {currentLesson?.attachmentUrl ? (
                        <Card className="border border-border/40 bg-card rounded-2xl shadow-sm overflow-hidden">
                          <CardContent className="p-3.5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5 text-indigo-650 dark:text-indigo-400" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-black text-xs text-slate-700 dark:text-zinc-200 truncate">{currentLesson.attachmentName || 'Class Notes'}</h4>
                                <p className="text-[10px] text-muted-foreground font-semibold truncate">PDF Notes</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 text-[11px] font-bold flex items-center gap-1.5 shrink-0 rounded-xl bg-indigo-50/50 hover:bg-indigo-50 border-indigo-200 text-indigo-650 dark:border-indigo-900/60 dark:text-indigo-400 dark:hover:bg-zinc-800 px-3 shadow-none"
                              onClick={() => openDownload(`/content/${currentLesson._id}/download`)}
                            >
                              <Download className="w-3.5 h-3.5" /> Download
                            </Button>
                          </CardContent>
                        </Card>
                      ) : null}

                      {!currentLesson?.attachmentUrl ? (
                        <div className="p-4 text-center text-xs text-muted-foreground font-semibold italic">
                          No topic resources available.
                        </div>
                      ) : null}
                    </AccordionContent>
                  </AccordionItem>

                  {/* Batch Resources Accordion Item */}
                  <AccordionItem value="batch-resources" className="border border-border/40 bg-card rounded-2xl px-4 overflow-hidden shadow-sm">
                    <AccordionTrigger className="hover:no-underline py-3.5">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300">Batch Resources & Study Materials</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 pt-1 space-y-3">
                      {courseMaterials.map((material) => (
                        <Card key={material._id} className="border border-border/40 bg-card rounded-2xl shadow-sm overflow-hidden">
                          <CardContent className="p-3.5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5 text-indigo-650 dark:text-indigo-400" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-black text-xs text-slate-700 dark:text-zinc-200 truncate">{material.title || material.originalName}</h4>
                                <p className="text-[10px] text-muted-foreground font-semibold truncate">{material.description || 'PDF Document'}</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 text-[11px] font-bold flex items-center gap-1.5 shrink-0 rounded-xl bg-indigo-50/50 hover:bg-indigo-50 border-indigo-200 text-indigo-650 dark:border-indigo-900/60 dark:text-indigo-400 dark:hover:bg-zinc-800 px-3 shadow-none"
                              onClick={() => openDownload(material.downloadUrl, material.title || material.originalName, material._id)}
                            >
                              <Download className="w-3.5 h-3.5" /> Download
                            </Button>
                          </CardContent>
                        </Card>
                      ))}

                      {courseMaterials.length === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground font-semibold italic">
                          No batch resources available.
                        </div>
                      ) : null}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {/* Streaming Protection Badge */}
                <div className="flex items-center justify-center h-[36px] mt-2 pb-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-300 font-bold border border-indigo-100 dark:border-indigo-900/50 h-[32px] shadow-none">
                    <span>🛡</span> Protected Streaming Active
                  </div>
                </div>
              </div>

              {/* Lesson Info */}
              <div className="hidden lg:block space-y-3 bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 p-5 rounded-[24px] shadow-sm">
                <div className="flex flex-col gap-1.5">
                  <h2 className="text-xl md:text-2xl font-bold break-words leading-tight text-slate-800 dark:text-zinc-50">
                    {currentContent?.title || currentLesson?.title || 'Select a Lesson'}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 truncate font-medium">
                    Batch Module: {course?.title}
                  </p>
                </div>

                <div className="hidden lg:flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs text-slate-400 font-medium">
                  <span className="hover:text-purple-600 transition-colors cursor-pointer">
                    {course?.title || 'Batch'}
                  </span>
                  {activeHierarchy ? (
                    <>
                      {activeHierarchy.subjectName && (
                        <>
                          <ChevronRight className="w-3 h-3 shrink-0" />
                          <span className="truncate">{activeHierarchy.subjectName}</span>
                        </>
                      )}
                      {activeHierarchy.unitName && (
                        <>
                          <ChevronRight className="w-3 h-3 shrink-0" />
                          <span className="truncate">{activeHierarchy.unitName}</span>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <ChevronRight className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        {currentLesson?.moduleTitle || currentLesson?.unitName || 'Module 1'}
                      </span>
                    </>
                  )}
                  <ChevronRight className="w-3 h-3 shrink-0" />
                  <span className="font-semibold text-slate-700 dark:text-zinc-200 truncate">
                    {currentContent?.title || currentLesson?.title || 'Topic'}
                  </span>
                </div>
              </div>

              {/* Tabs Selector (hidden on mobile) */}
              <div className="hidden lg:flex border-b border-slate-200 dark:border-zinc-800 gap-6 mt-4 overflow-x-auto no-scrollbar scrollbar-none pb-0.5">
                {[
                  { id: 'materials', label: '📂 Resources' },
                  { id: 'live-classes', label: '🎥 Live Classes' }
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`pb-3 text-xs sm:text-sm font-semibold relative transition-colors cursor-pointer shrink-0 ${
                        isActive 
                          ? 'text-purple-600 dark:text-purple-400 font-bold' 
                          : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200'
                      }`}
                    >
                      {tab.label}
                      {tab.id === 'materials' && (currentLesson?.attachmentUrl || courseMaterials.length > 0) && (
                        <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded-full">
                          {(currentLesson?.attachmentUrl ? 1 : 0) + courseMaterials.length}
                        </span>
                      )}
                      {isActive && (
                        <motion.div
                          layoutId="activeTabUnderline"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tab Contents (hidden on mobile) */}
              <div className="pt-2 hidden lg:block">
                {/* 1. Materials Tab */}
                {activeTab === 'materials' && (
                  <div className="space-y-4">
                    {/* Sticky Security Alert Banner inside Materials tab */}
                    <div className="hidden lg:flex p-4 bg-purple-500/5 dark:bg-purple-950/10 border border-purple-500/15 dark:border-purple-900/40 rounded-[20px] flex items-start gap-3.5 shadow-sm">
                      <ShieldAlert className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <h4 className="font-bold text-slate-800 dark:text-zinc-100 mb-0.5">OTT Anti-Piracy Streaming Active</h4>
                        <p className="text-slate-400 leading-relaxed font-medium">
                          This premium educational stream is protected by real-time DRM. Taking screenshots, triggering print requests, or running background screen recording tools (Zoom, OBS, Snipping Tool) is strictly prohibited. Capture attempts will instantly pause/black out the stream and can lead to immediate force-logout and permanent account suspension.
                        </p>
                      </div>
                    </div>

                    {/* Compact badge for mobile/tablet */}
                    <div className="flex lg:hidden justify-center py-1">
                      <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-semibold border border-purple-200 dark:border-purple-900/50">
                        <span>🛡</span> Protected Streaming Active
                      </div>
                    </div>

                    {/* Desktop Materials Section (>=1024px) */}
                    <div className="hidden lg:block space-y-6">
                      {/* Lesson attachments */}
                      <div className="space-y-3">
                        <h3 className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-zinc-100">
                          <FileText className="w-4 h-4 text-purple-500" />
                          Class Study Materials & Attachments
                        </h3>
                        
                        {currentLesson?.isLocked ? (
                          <Card className="p-8 text-center border border-dashed border-slate-200/80 bg-muted/10 rounded-[20px] flex flex-col items-center">
                            <Lock className="w-10 h-10 text-purple-500 mb-2 opacity-80 animate-pulse" />
                            <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">🔒 Topic Locked</p>
                            <p className="text-xs text-slate-400 mt-1 font-medium">
                              {currentLesson.lockReason || 'Please contact your institute for access.'}
                            </p>
                          </Card>
                        ) : currentLesson?.attachmentUrl ? (
                          <Card className="border border-slate-200/50 dark:border-zinc-800 bg-white dark:bg-zinc-900/45 hover:border-purple-50/30 hover:bg-slate-50/20 dark:hover:bg-zinc-900/80 transition-all rounded-lg lg:rounded-[20px] shadow-sm">
                            <CardContent className="p-3 lg:p-4 flex flex-row items-center justify-between gap-2 lg:gap-4">
                              <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                                <div className="w-9 h-9 lg:w-12 lg:h-12 rounded-lg lg:rounded-xl bg-purple-50 dark:bg-purple-950/20 flex items-center justify-center flex-shrink-0">
                                  <FileText className="w-5.5 h-5.5 lg:w-6 lg:h-6 text-purple-500" />
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-semibold text-xs lg:text-sm text-slate-700 dark:text-zinc-200 truncate">{currentLesson.attachmentName || 'Download Topic Notes'}</h4>
                                  <p className="text-[10px] lg:text-xs text-slate-400 font-medium truncate">PDF Resource</p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 shrink-0 rounded-lg lg:rounded-xl font-semibold shadow-sm h-8 lg:h-9 text-[11px] lg:text-xs px-2.5 lg:px-4"
                                onClick={() => openDownload(`/content/${currentLesson._id}/download`)}
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Download</span>
                              </Button>
                            </CardContent>
                          </Card>
                        ) : (
                          <Card className="p-8 text-center border border-dashed border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 rounded-[20px]">
                            <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                            <p className="text-sm font-semibold text-slate-500">No attachments uploaded for this topic.</p>
                            <p className="text-xs text-slate-400 mt-1 font-medium">Faculty reference sheets will show here when available.</p>
                          </Card>
                        )}
                      </div>

                      {/* Course materials */}
                      {courseMaterials.length > 0 && (
                        <div className="space-y-3 mt-4 pt-4 border-t border-slate-200 dark:border-zinc-800">
                          <h3 className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-zinc-100">
                            <FileText className="w-4 h-4 text-purple-500" />
                            General Batch Study Materials
                          </h3>
                          <div className="grid gap-3">
                            {courseMaterials.map((material) => (
                              <Card key={material._id} className="border border-slate-200/50 dark:border-zinc-800 bg-white dark:bg-zinc-900/45 hover:border-purple-50/30 transition-all rounded-lg lg:rounded-[20px] shadow-sm">
                                <CardContent className="p-3 lg:p-4 flex flex-row items-center justify-between gap-2 lg:gap-4">
                                  <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                                    <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-purple-50 dark:bg-purple-950/20 flex items-center justify-center flex-shrink-0">
                                      <FileText className="w-5.5 h-5.5 lg:w-5 lg:h-5 text-purple-500" />
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="font-semibold text-xs lg:text-sm text-slate-700 dark:text-zinc-200 truncate">{material.title || material.originalName}</h4>
                                      <p className="text-[10px] lg:text-xs text-slate-400 truncate font-medium">{material.description || 'PDF Resource'}</p>
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 lg:h-9 text-[11px] lg:text-xs flex items-center gap-1.5 shrink-0 rounded-lg lg:rounded-xl hover:bg-purple-50 border-slate-200 text-slate-600 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 px-2.5 lg:px-4"
                                    onClick={() => openDownload(material.downloadUrl, material.title || material.originalName, material._id)}
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Download</span>
                                  </Button>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}



                {/* 3. Live Classes Tab */}
                {activeTab === 'live-classes' && (
                  <div className="space-y-4">
                    {!course?.isPurchased ? (
                      <Card className="p-8 text-center border border-dashed border-slate-200/80 bg-white dark:bg-zinc-900/30 rounded-[20px]">
                        <Lock className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-semibold text-slate-500">Live Classes Locked</p>
                        <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed">Please activate access for this batch to view the scheduled live classes calendar and join virtual classrooms.</p>
                      </Card>
                    ) : (
                      <div className="space-y-6">
                        {/* Upcoming Classes */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            Upcoming & Live Lectures
                          </h4>
                          <div className="grid gap-3">
                            {liveClasses.filter(c => new Date(c.endTime) > new Date() && c.status !== 'cancelled').sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).map((lc) => {
                              const isLive = lc.status === 'live' || (new Date(lc.startTime) <= new Date() && new Date(lc.endTime) >= new Date());
                              return (
                                <Card key={lc._id} className={`border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-[20px] hover:border-purple-500/25 transition-all shadow-sm ${isLive ? 'ring-2 ring-red-500/20 border-red-500/40' : ''}`}>
                                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="min-w-0 space-y-1.5">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-bold text-sm text-slate-800 dark:text-zinc-100">{lc.title}</h4>
                                        {isLive ? (
                                          <Badge className="bg-red-500/15 text-red-500 border border-red-500/30 text-[9px] uppercase font-black tracking-wider animate-pulse rounded-md">Live Now</Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-purple-600 border-purple-500/30 bg-purple-50 text-[9px] uppercase rounded-md font-semibold">Upcoming</Badge>
                                        )}
                                        {lc.hasAttended && (
                                          <Badge className="bg-green-500/15 text-green-500 border-green-500/30 text-[9px] uppercase font-semibold rounded-md">Attended</Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-slate-500 leading-relaxed font-medium">{lc.description || 'No description provided.'}</p>
                                      <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5 flex-wrap">
                                        <span>Faculty: {lc.facultyId?.name || 'Instructor'}</span>
                                        <span>·</span>
                                        <span>Start: {new Date(lc.startTime).toLocaleString()}</span>
                                        <span>·</span>
                                        <span>End: {new Date(lc.endTime).toLocaleTimeString()}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2.5 shrink-0 self-stretch sm:self-auto justify-end">
                                      <Badge variant="secondary" className="px-2 py-0.5 text-[10px] rounded-md">{lc.platform}</Badge>
                                      <Button
                                        size="sm"
                                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 min-h-8 rounded-xl font-semibold shadow-sm"
                                        onClick={async () => {
                                          try {
                                            const res = await apiFetch(`/live-classes/${lc._id}/join`, { method: 'POST' });
                                            if (res.meetingUrl) {
                                              toast.success('Attendance recorded!', { description: 'Opening lecture window...' });
                                              window.open(res.meetingUrl, '_blank');
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
                              <p className="text-xs text-slate-400 text-center py-4 font-medium italic">No upcoming live classes scheduled for this batch.</p>
                            )}
                          </div>
                        </div>

                        {/* Past Classes */}
                        <div className="space-y-3 pt-2">
                          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <History className="w-4 h-4" />
                            Completed Lectures History
                          </h4>
                          <div className="grid gap-2">
                            {liveClasses.filter(c => new Date(c.endTime) <= new Date() || c.status === 'completed' || c.status === 'cancelled').sort((a, b) => new Date(b.endTime).getTime() - new Date(a.startTime).getTime()).map((lc) => (
                              <Card key={lc._id} className="border border-slate-200/50 dark:border-zinc-800 bg-slate-50/20 dark:bg-zinc-900/30 opacity-75 rounded-[16px]">
                                <CardContent className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                  <div className="min-w-0 space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h5 className="font-bold text-xs text-slate-700 dark:text-zinc-300">{lc.title}</h5>
                                      <Badge variant="outline" className={lc.status === 'cancelled' ? 'text-red-500 border-red-500/20 bg-red-500/5 text-[9px] rounded-md' : 'text-slate-400 border-slate-200 dark:border-zinc-800 text-[9px] rounded-md bg-slate-50 dark:bg-zinc-800'}>
                                        {lc.status === 'cancelled' ? 'Cancelled' : 'Completed'}
                                      </Badge>
                                      {lc.hasAttended && (
                                        <Badge className="bg-green-500/15 text-green-500 border-green-500/30 text-[9px] uppercase font-semibold rounded-md">Attended</Badge>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-medium">Instructor: {lc.facultyId?.name || 'N/A'} · Held: {new Date(lc.startTime).toLocaleString()}</p>
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0 self-stretch sm:self-auto justify-end text-[11px] text-slate-400 font-semibold">
                                    <span>{lc.platform}</span>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            {liveClasses.filter(c => new Date(c.endTime) <= new Date() || c.status === 'completed' || c.status === 'cancelled').length === 0 && (
                              <p className="text-[11px] text-slate-400 text-center py-2 italic font-medium">No past live classes recorded for this batch.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}


              </div>



            </div>

            {/* Right Column (Syllabus Sidebar & Cards) */}
            {!theaterMode && (
              <div className="hidden lg:block lg:col-span-3 space-y-6">
                
                {/* Syllabus Sidebar Card */}
                <Card className="border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-[24px] shadow-sm flex flex-col h-[580px] overflow-hidden">
                  <div className="p-4 border-b border-slate-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 flex items-center justify-between gap-3 flex-shrink-0">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100">Batch Syllabus</h3>
                      <p className="text-[10px] text-slate-400 font-medium">{contents.length} learning items</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[10px] h-7 px-2 border-slate-200 text-slate-600 hover:text-purple-600 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-purple-400 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-all font-semibold rounded-lg"
                      onClick={handleToggleExpandAll}
                    >
                      {isAllExpanded ? 'Collapse All' : 'Expand All'}
                    </Button>
                  </div>

                  <ScrollArea className="flex-1 w-full overflow-x-hidden">
                    <div className="w-full p-4 space-y-3 box-border overflow-x-hidden">
                      {course?.subjects?.map((subject: any) => {
                        const isSubjectExpanded = expandedSubjects[subject._id] !== false;
                        return (
                          <div key={subject._id} className="space-y-1">
                            <button
                              type="button"
                              className="w-full text-left font-bold text-[11px] text-slate-700 dark:text-zinc-300 uppercase tracking-wider flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-zinc-800/60 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                              onClick={() => setExpandedSubjects(prev => ({ ...prev, [subject._id]: !prev[subject._id] }))}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-purple-600 font-bold text-base leading-none shrink-0">•</span>
                                <span className="truncate">{subject.subjectName}</span>
                              </div>
                              <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${isSubjectExpanded ? 'rotate-90' : ''}`} />
                            </button>
                            
                            {isSubjectExpanded && subject.units?.map((unit: any) => {
                              const isUnitExpanded = expandedUnits[unit._id] !== false;
                              return (
                                <div key={unit._id} className="pl-3 mt-1.5 space-y-1">
                                  <button
                                    type="button"
                                    className="w-full text-left font-semibold text-[11px] text-slate-500 dark:text-zinc-400 flex items-center justify-between py-1 hover:text-slate-900 dark:hover:text-zinc-200 transition-colors"
                                    onClick={() => setExpandedUnits(prev => ({ ...prev, [unit._id]: !prev[unit._id] }))}
                                  >
                                    <span className="truncate">{unit.name}</span>
                                    <ChevronRight className={`w-3 h-3 text-slate-400 transition-transform shrink-0 ${isUnitExpanded ? 'rotate-90' : ''}`} />
                                  </button>
                                  
                                  {isUnitExpanded && (
                                    <div className="space-y-1.5 mt-1 pl-2">
                                      {unit.lessons?.map((lesson: any) => {
                                        const isLessonExpanded = expandedLessons[lesson._id] !== false;
                                        const lessonVideos = lesson.videos || lesson.contents?.filter((c: any) => c.type === 'video') || [];
                                        const completedCount = lessonVideos.filter((v: any) => v.completed || localStorage.getItem(`completed_${userId}_${v._id}`) === 'true').length;

                                        return (
                                          <div key={lesson._id} className="space-y-1">
                                            <button
                                              type="button"
                                              className="w-full text-left font-bold text-[10px] text-slate-550 dark:text-zinc-450 flex items-center justify-between py-1 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors"
                                              onClick={() => setExpandedLessons(prev => ({ ...prev, [lesson._id]: !prev[lesson._id] }))}
                                            >
                                              <span className="truncate flex items-center gap-1">
                                                <ChevronRight className={`w-2.5 h-2.5 text-slate-400 transition-transform shrink-0 ${isLessonExpanded ? 'rotate-90' : ''}`} />
                                                {lesson.title}
                                              </span>
                                              <span className="text-[9px] text-slate-400 font-medium shrink-0 font-sans">
                                                {completedCount} / {lessonVideos.length} Completed
                                              </span>
                                            </button>

                                            {isLessonExpanded && (
                                              <div className="space-y-1 pl-2.5 border-l border-slate-100 dark:border-zinc-800/80 ml-1.5">
                                                {lessonVideos.map((content: any, contentIdx: number) => {
                                                  const isSelected = currentContent?._id === content._id;
                                                  const isLocked = content.isLocked;
                                                  const isCompleted = content.completed || localStorage.getItem(`completed_${userId}_${content._id}`) === 'true';

                                                  // Status calculation
                                                  let statusText = 'Upcoming';
                                                  let statusColor = 'text-slate-400';
                                                  if (isCompleted) {
                                                    statusText = 'Completed';
                                                    statusColor = 'text-green-500 font-bold';
                                                  } else if (isSelected) {
                                                    statusText = 'Current';
                                                    statusColor = 'text-purple-600 dark:text-purple-400 font-bold';
                                                  }

                                                  const resumeTime = parseFloat(localStorage.getItem(`resume_${userId}_${content._id}`) || '0');
                                                  const contentDurSec = content.durationSeconds || (content.videoAssetId && typeof content.videoAssetId === 'object' ? content.videoAssetId.durationSeconds : 0) || parseDurationToSeconds(content.youtubeDuration || content.duration);
                                                  const itemProgressPercent = resumeTime && contentDurSec ? Math.min(100, Math.round((resumeTime / contentDurSec) * 100)) : 0;

                                                  return (
                                                    <div
                                                      key={content._id}
                                                      onClick={() => {
                                                        if (!isLocked) setCurrentContent(content);
                                                      }}
                                                      className={`w-full p-2.5 rounded-xl cursor-pointer border transition-all flex flex-col gap-1 text-[11px] ${
                                                        isSelected
                                                          ? 'bg-purple-50/40 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/60 shadow-sm'
                                                          : isLocked
                                                          ? 'opacity-55 cursor-not-allowed border-transparent text-slate-400'
                                                          : 'bg-transparent border-transparent text-slate-650 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800/40 hover:border-slate-200/50 dark:hover:border-zinc-800'
                                                      }`}
                                                    >
                                                      <div className="flex items-start justify-between gap-3">
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                          <div className="flex-shrink-0">
                                                            {isLocked ? (
                                                              <Lock className="w-3.5 h-3.5 text-slate-400" />
                                                            ) : isCompleted ? (
                                                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 fill-green-500/10" />
                                                            ) : isSelected ? (
                                                              <PlayCircle className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 animate-pulse" />
                                                            ) : (
                                                              <Circle className="w-3.5 h-3.5 text-slate-400" />
                                                            )}
                                                          </div>
                                                          <span className={`truncate font-medium ${isSelected ? 'text-purple-700 dark:text-purple-300 font-semibold' : 'text-slate-700 dark:text-zinc-300'}`}>
                                                            {content.title}
                                                          </span>
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 font-medium shrink-0">
                                                          {content.youtubeDuration || content.duration || '10:00'}
                                                        </span>
                                                      </div>

                                                      <div className="flex items-center justify-between text-[9px] uppercase tracking-wider mt-0.5">
                                                        <span className={statusColor}>{statusText}</span>
                                                        {itemProgressPercent > 0 && !isCompleted && (
                                                          <span className="text-slate-400 font-medium">Progress: {itemProgressPercent}%</span>
                                                        )}
                                                      </div>

                                                      {itemProgressPercent > 0 && !isCompleted && (
                                                        <Progress value={itemProgressPercent} className="h-1 bg-slate-100 dark:bg-zinc-800 rounded-full mt-1" />
                                                      )}
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                      {(!unit.lessons || unit.lessons.length === 0) && (
                                        <p className="text-[10px] text-slate-400 italic pl-6 py-1">No topics configured in this unit.</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </Card>

              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation (Previous / Next Lesson) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 px-4 h-[72px] flex items-center justify-between gap-3 shadow-lg pb-[env(safe-area-inset-bottom)]">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 rounded-2xl border border-slate-200 dark:border-zinc-800 text-xs font-bold h-11 flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 bg-white"
          onClick={() => {
            const currentIndex = lessons.findIndex(l => l._id === currentLesson?._id);
            if (currentIndex > 0) {
              const prevLesson = lessons[currentIndex - 1];
              setCurrentLesson(prevLesson);
              toast.success(`Playing previous: ${prevLesson.title}`);
            }
          }}
          disabled={lessons.findIndex(l => l._id === currentLesson?._id) <= 0}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Previous Lesson</span>
        </Button>
        <Button
          size="sm"
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold h-11 flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/10 border-0"
          onClick={() => {
            const currentIndex = lessons.findIndex(l => l._id === currentLesson?._id);
            if (currentIndex !== -1 && currentIndex < lessons.length - 1) {
              const nextLesson = lessons[currentIndex + 1];
              if (!nextLesson.isLocked) {
                setCurrentLesson(nextLesson);
                toast.success(`Playing next: ${nextLesson.title}`);
              }
            }
          }}
          disabled={lessons.findIndex(l => l._id === currentLesson?._id) === lessons.length - 1}
        >
          <span>Next Lesson</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Report Issue Dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-md w-[92vw] rounded-2xl border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-0 overflow-hidden shadow-2xl">
          <div className="h-1.5 w-full bg-gradient-to-r from-purple-600 to-indigo-600" />
          <form onSubmit={submitReport} className="px-6 pt-5 pb-6 space-y-5">
            <DialogHeader className="space-y-1">
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-zinc-100">
                <Flag className="w-4 h-4 text-purple-600" />
                Report an Issue
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 leading-relaxed font-medium">
                Tell us what went wrong so we can fix it.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Issue Type</label>
              <div className="grid grid-cols-2 gap-2">
                {['Playback bug', 'Content issue', 'UI bug', 'Other'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setReportType(type)}
                    className={`text-xs px-3 py-2 rounded-xl border text-left transition-all font-medium ${
                      reportType === type
                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                        : 'border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/40 text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</label>
              <div className="relative rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/50 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500/20 transition-all">
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Describe the bug, where it happened, and what you expected to see."
                  rows={4}
                  className="w-full bg-transparent text-sm p-3 resize-none focus:outline-none text-slate-700 dark:text-zinc-100 placeholder:text-slate-400"
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-semibold text-slate-400 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingReport || !reportDescription.trim()}
                className="flex-1 h-10 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {isSubmittingReport ? 'Sending...' : 'Submit Report'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Global Security Lock Overlay — blocks all interaction on the video player page */}
      {securityLockActive && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'rgba(0, 0, 0, 0.95)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
          color: 'white'
        }}>
          <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300 max-w-md text-center p-6 bg-slate-950/90 border border-red-500/20 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.6),0_0_80px_rgba(239,68,68,0.08)]">
            {/* Pulsing Shield Icon */}
            <div className="relative mb-5 flex justify-center">
              <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse"></div>
              <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center relative" style={{ boxShadow: '0 0 40px rgba(239,68,68,0.15)' }}>
                <ShieldAlert className="w-7 h-7 text-red-500" />
              </div>
            </div>

            {/* Dynamic Title */}
            <h3 className="text-xl font-extrabold text-red-500 mb-1.5 tracking-tight">
              {violationCount >= 3 
                ? '🚫 Account Security Lock' 
                : '🛡 Security Violation Detected'}
            </h3>
            <p className="text-sm text-gray-400 mb-5 px-6 leading-relaxed">
              {violationCount >= 3 
                ? 'Your session has been terminated due to repeated screen capture attempts.' 
                : 'Video access temporarily suspended due to a screen capture violation.'}
            </p>

            {/* Attempt Badge */}
            <div className="px-5 py-2.5 rounded-full bg-slate-900 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.25)] text-sm text-red-400 font-bold tracking-widest uppercase flex items-center gap-2 mb-5 justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
              Attempt {violationCount >= 3 ? 3 : violationCount || 1} of 3
            </div>

            {violationCount >= 3 ? (
              <div className="flex flex-col items-center gap-3 animate-in fade-in duration-300">
                <p className="text-xs text-gray-400 max-w-[300px] leading-relaxed">
                  For content protection, your session has been terminated. Contact your institute administrator for assistance.
                </p>
              </div>
            ) : securityLockRemaining > 0 ? (
              <div className="flex flex-col items-center gap-3 animate-in fade-in duration-300">
                {/* MM:SS Countdown */}
                <div className="text-[0.65rem] text-red-500 font-bold uppercase tracking-[0.15em]">
                  Time Remaining
                </div>
                <div className="text-4xl font-black text-white tracking-wider tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {String(Math.floor(securityLockRemaining / 60)).padStart(2, '0')}:{String(securityLockRemaining % 60).padStart(2, '0')}
                </div>
                <div className="mt-1 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[0.7rem] text-gray-400 max-w-[300px] leading-relaxed">
                    {violationCount === 2 
                      ? 'Do not attempt screenshots or screen recording. One more violation will terminate your session.' 
                      : 'Do not attempt screenshots or screen recording. Repeated violations may result in account logout.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
                <p className="text-xs text-gray-400 max-w-xs leading-relaxed px-4">
                  Penalty period has ended. Click below to restore access.
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
                  className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/20 px-7 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02]"
                >
                  Resume Topic
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Lesson Completion Modal Overlay */}
      {lessonCompletedModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-sm border-border bg-card shadow-2xl rounded-3xl overflow-hidden text-center p-6 space-y-6">
            <div className="space-y-2">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-inner animate-bounce">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black tracking-tight text-foreground">Lecture Completed!</h3>
              <p className="text-xs text-muted-foreground leading-relaxed px-2">
                Great job! You have completed <strong>{currentContent?.title}</strong>. Ready to progress to the next topic?
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {nextContent ? (
                <Button 
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold py-2.5 rounded-xl text-xs touch-btn"
                  onClick={() => {
                    setLessonCompletedModalOpen(false);
                    setCurrentLesson(nextContent);
                  }}
                >
                  Start Next Lesson
                </Button>
              ) : (
                <Button 
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold py-2.5 rounded-xl text-xs touch-btn"
                  onClick={() => {
                    setLessonCompletedModalOpen(false);
                    navigate('/student');
                  }}
                >
                  Back to Dashboard
                </Button>
              )}
              <Button 
                variant="ghost" 
                className="text-xs font-semibold rounded-xl text-muted-foreground touch-btn"
                onClick={() => setLessonCompletedModalOpen(false)}
              >
                Replay Lesson
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
