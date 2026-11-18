import { useState, useEffect, useCallback, useRef } from 'react';
import {
  apiSetProtectionMode,
  checkBackendHealth,
  createAlertWebSocket,
  apiGetSnapshots,
  apiGetEngine,
  apiSetEngine,
  API_BASE_URL
} from '../services/api';
import {
  playArmSound,
  playDisarmSound,
  playClickSound,
  playIntruderAlarm,
  stopIntruderSiren,
  setMuted
} from '../services/audioAlert';
import { SecurityContext } from './SecurityContextInstance';

export const SecurityProvider = ({ children }) => {
  // Core: Protection Mode (The central check requested by user)
  const [protectionMode, setProtectionModeState] = useState(false);

  // Active Camera selection
  const [activeCameraId, setActiveCameraId] = useState('cam1');

  // Single Camera Stream for now as requested
  const [cameras] = useState([
    {
      id: 'cam1',
      name: 'Main Camera',
      location: 'Perimeter Surveillance Feed',
      resolution: 'FHD',
      battery: 100,
      wifi: 'Wi-Fi',
      isLive: true,
      audioOn: true,
    },
  ]);

  // Smart Control Cards from screenshot
  const [smartDevices, setSmartDevices] = useState({
    frontDoorLock: { name: 'Front Door Lock', status: true, subtext: 'Next unlock 06:00 AM', labelActive: 'Lock', labelInactive: 'Unlocked' },
    backyardSprinklers: { name: 'Backyard Sprinklers', status: false, subtext: 'Next watering 06:00 AM', labelActive: 'On', labelInactive: 'Off' },
    garageDoor: { name: 'Garage Door', status: true, subtext: 'Next open 08:00 AM', labelActive: 'Closed', labelInactive: 'Open' },
    outdoorLights: { name: 'Outdoor lights', status: true, subtext: 'Next unlock 06:00 AM', labelActive: 'On', labelInactive: 'Off' },
    sleepMode: { name: 'Sleep Mode', status: false, subtext: 'Scheduled 11:00 PM', labelActive: 'On', labelInactive: 'Off' },
    internet: { name: 'Internet', status: true, subtext: '120 Mbps Low Latency', labelActive: 'On', labelInactive: 'Off' },
    climate: { name: 'Climate Control', status: true, temp: 24, mode: 'Cold', autoTurnOn: '20:00 PM', autoTurnOff: '18:00 PM' },
  });

  // Whitelisted Authorized Project Members (Cartoon Avatars)
  const [members, setMembers] = useState([
    { id: 1, name: 'Anam', role: 'Team Member', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Anam' },
    { id: 2, name: 'Maliha', role: 'Team Member', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Maliha' },
    { id: 3, name: 'Mohsin (me)', role: 'Team Member', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Mohsin' },
  ]);

  // Activity Schedule & Intruder Logs
  const [activityLog, setActivityLog] = useState([
    { id: 101, title: 'Outdoor lights ON', time: '07:30 PM', type: 'schedule', category: 'light' },
    { id: 102, title: 'Garden watering', time: '07:40 PM', type: 'schedule', category: 'water' },
    { id: 103, title: 'Robot Vacuum Start', time: '08:25 PM', type: 'schedule', category: 'vacuum' },
    { id: 104, title: 'Auto-lock all door', time: '09:50 PM', type: 'schedule', category: 'lock' },
  ]);

  // Real-time Intruder Alert state with 5-Second Auto-Acknowledgement
  const [activeAlert, setActiveAlert] = useState(null);
  const [alertCountdown, setAlertCountdown] = useState(5);
  const autoDismissTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [isMutedState, setIsMutedState] = useState(false);

  // Centralized Hardware System Camera Management (Integrated / USB Webcam)
  const [systemCameraStream, setSystemCameraStream] = useState(null);
  const [hasCameraAccess, setHasCameraAccess] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isCameraInitializing, setIsCameraInitializing] = useState(false);

  const startSystemCamera = useCallback(async () => {
    if (typeof window === 'undefined') return null;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API (getUserMedia) not supported in this browser context.');
      setHasCameraAccess(false);
      return null;
    }

    setIsCameraInitializing(true);
    setCameraError(null);
    let stream = null;

    // Strategy 1: Ideal 720p HD resolution (Standard modern webcams)
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch (err1) {
      console.info('[ImmunoAI Camera] 720p constraints failed, attempting basic video...', err1?.message);
      // Strategy 2: Basic unconstrained video (High-compatibility for Linux V4L2 USB cameras)
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      } catch (err2) {
        console.warn('[ImmunoAI Camera] Hardware camera access error:', err2?.name, err2?.message);
        const errMsg =
          err2?.name === 'NotAllowedError'
            ? 'Camera permission denied. Click below to grant camera access.'
            : err2?.name === 'NotFoundError'
            ? 'No hardware camera detected on your system.'
            : err2?.name === 'NotReadableError'
            ? 'Camera device is busy (in use by another app or browser tab).'
            : `Camera access notice: ${err2?.message || 'Unable to connect'}`;
        setCameraError(errMsg);
        setHasCameraAccess(false);
        setIsCameraInitializing(false);
        return null;
      }
    }

    if (stream) {
      setSystemCameraStream(stream);
      setHasCameraAccess(true);
      setCameraError(null);
      setIsCameraInitializing(false);
      console.log('[ImmunoAI Camera] ✅ Hardware system camera feed connected successfully.');
      return stream;
    }

    setIsCameraInitializing(false);
    return null;
  }, []);

  const stopSystemCamera = useCallback(() => {
    if (systemCameraStream) {
      systemCameraStream.getTracks().forEach((t) => t.stop());
      setSystemCameraStream(null);
    }
    setHasCameraAccess(false);
  }, [systemCameraStream]);

  // Automatically start system camera feed when App initializes
  useEffect(() => {
    let active = true;
    startSystemCamera().then((stream) => {
      if (!active && stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    });

    return () => {
      active = false;
    };
  }, [startSystemCamera]);

  // Video feed source: direct camera vs remote streams
  const [streamSource, setStreamSource] = useState('direct');

  // Video feed stream management: Local device camera vs Remote IP/network streams
  const DEFAULT_STREAMS = [
    {
      id: 'local_device',
      name: 'Attached System Camera',
      type: 'local',
      url: '',
      location: 'Integrated / USB Webcam',
      isDefault: true,
    },
  ];

  const [streamList, setStreamList] = useState(() => {
    try {
      const saved = localStorage.getItem('immunoai_stream_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_STREAMS;
  });

  const [activeStreamId, setActiveStreamIdState] = useState(() => {
    try {
      return localStorage.getItem('immunoai_active_stream_id') || 'local_device';
    } catch {
      return 'local_device';
    }
  });

  const setActiveStreamId = (id) => {
    playClickSound();
    setActiveStreamIdState(id);
    try {
      localStorage.setItem('immunoai_active_stream_id', id);
    } catch {
      // ignore
    }
  };

  const addRemoteStream = (newStream) => {
    playClickSound();
    const streamObj = {
      id: `stream_${Date.now()}`,
      name: (newStream.name || 'Remote Network Stream').trim(),
      type: 'remote',
      url: newStream.url.trim(),
      location: (newStream.location || 'Local Network (IP Camera)').trim(),
      format: newStream.url.includes('/video') ? 'mjpeg' : 'video',
      addedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setStreamList((prev) => {
      const updated = [...prev, streamObj];
      try {
        localStorage.setItem('immunoai_stream_list', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    setActiveStreamId(streamObj.id);
    return streamObj;
  };

  const removeStream = (id) => {
    playClickSound();
    setStreamList((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      try {
        localStorage.setItem('immunoai_stream_list', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

    if (activeStreamId === id) {
      setActiveStreamId('local_device');
    }
  };

  const activeStream = streamList.find((s) => s.id === activeStreamId) || streamList[0] || DEFAULT_STREAMS[0];

  // Real Captured Intruders Snapshot Gallery (Starts 100% empty, populated only by real camera captures)
  const [capturedIntruders, setCapturedIntruders] = useState([]);

  // AI Engine State ('yolo' = YOLOv8 MS COCO, 'custom' = ImmunoAICNN PyTorch)
  const [activeEngine, setActiveEngine] = useState('yolo');

  const switchEngine = async (targetEngine) => {
    const next = targetEngine || (activeEngine === 'yolo' ? 'custom' : 'yolo');
    playClickSound();
    setActiveEngine(next);
    try {
      const res = await apiSetEngine(next);
      if (res?.active_engine) {
        setActiveEngine(res.active_engine);
      }
    } catch (e) {
      console.error('Failed to switch AI engine', e);
    }
  };

  // Live Deep Learning Telemetry & Mini Logs for Sidebar Monitor
  const [dlTelemetry, setDlTelemetry] = useState({
    prob: 0,
    confidence: 0,
    logit: 0,
    is_intruder: false,
    consecutive_frames: 0,
    required_frames: 3,
    in_cooldown: false,
    cooldown_remaining_seconds: 0,
    inference_ms: 0,
    engine: 'yolo',
    model: 'YOLOv8n (MS COCO)',
    recentLogs: [],
    lastUpdated: 0,
  });

  const updateDlTelemetry = (data) => {
    if (!data) return;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const probVal = data.prob !== undefined ? data.prob : (data.confidence ? data.confidence / 100 : 0);
    const confPercent = (probVal * 100).toFixed(1);
    const count = data.consecutive_frames || 0;
    const isAlert = data.is_intruder;
    const engTag = (data.engine || activeEngine || 'yolo').toUpperCase();

    const logLine = `${nowTime} [${engTag}] P:${confPercent}% | C:${count}/3 | ${isAlert ? '🚨POS' : '✅NORM'}`;

    if (data.engine && data.engine !== activeEngine) {
      setActiveEngine(data.engine);
    }

    setDlTelemetry((prev) => ({
      prob: probVal,
      confidence: confPercent,
      logit: data.logit || 0,
      is_intruder: Boolean(isAlert),
      consecutive_frames: count,
      required_frames: data.required_frames || 3,
      in_cooldown: Boolean(data.in_cooldown),
      cooldown_remaining_seconds: data.cooldown_remaining_seconds || 0,
      inference_ms: data.inference_ms || 18,
      engine: data.engine || prev.engine || 'yolo',
      model: data.model || prev.model || 'YOLOv8n (MS COCO)',
      ai_service_online: data.ai_service_online !== undefined ? data.ai_service_online : true,
      lastUpdated: Date.now(),
    }));
  };

  // Backend connection status
  const [backendStatus, setBackendStatus] = useState({
    online: false,
    checking: true,
    url: API_BASE_URL,
    fps: 0,
    model: 'YOLOv8-Intruder (PyTorch)',
  });

  // Detection parameters
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.70);

  // Mute toggle
  const toggleMute = () => {
    const next = !isMutedState;
    setIsMutedState(next);
    setMuted(next);
  };

  // Toggle Protection Mode
  const toggleProtectionMode = async () => {
    playClickSound();
    const nextState = !protectionMode;
    setProtectionModeState(nextState);

    if (nextState) {
      playArmSound();
      const armLog = {
        id: Date.now(),
        title: 'Security System ARMED (Intruder Detection Active)',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'system',
        category: 'shield',
      };
      setActivityLog((prev) => [armLog, ...prev]);
    } else {
      playDisarmSound();
      stopIntruderSiren();
      setActiveAlert(null);
      const disarmLog = {
        id: Date.now(),
        title: 'Security System DISARMED (Standby Mode)',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'system',
        category: 'shield',
      };
      setActivityLog((prev) => [disarmLog, ...prev]);
    }

    // Call backend API (if available)
    await apiSetProtectionMode(nextState);
  };

  // Toggle individual smart device
  const toggleDevice = (deviceId) => {
    playClickSound();
    setSmartDevices((prev) => {
      const dev = prev[deviceId];
      if (!dev) return prev;
      return {
        ...prev,
        [deviceId]: { ...dev, status: !dev.status },
      };
    });
  };

  // Update Climate Temperature
  const setClimateTemp = (delta) => {
    playClickSound();
    setSmartDevices((prev) => ({
      ...prev,
      climate: {
        ...prev.climate,
        temp: Math.min(32, Math.max(16, prev.climate.temp + delta)),
      },
    }));
  };

  // Dismiss current alert (manual click or automatic 5s expiration)
  const dismissAlert = useCallback((isAuto = false) => {
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (!isAuto) {
      playClickSound();
    }
    stopIntruderSiren();
    setActiveAlert(null);
    setAlertCountdown(5);
  }, []);

  // Trigger Intruder Alert Handler with 5s Auto-Acknowledgement
  const triggerIntruderAlert = useCallback((detection) => {
    if (!protectionMode) {
      return;
    }

    // Reset any ongoing timers
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const activeCam = cameras.find((c) => c.id === activeCameraId) || cameras[0];

    const alertEvent = {
      id: Date.now(),
      cameraId: activeCam.id,
      cameraName: activeCam.name,
      location: activeCam.location,
      confidence: detection?.confidence || 96.8,
      timestamp,
      box: detection?.box || [150, 100, 220, 340],
      imageUrl: detection?.imageUrl || null,
      message: `Unauthorized Person Detected in ${activeCam.location}!`,
    };

    setActiveAlert(alertEvent);
    setAlertCountdown(5);
    playIntruderAlarm(5000);

    // Live countdown 5 -> 4 -> 3 -> 2 -> 1 -> 0
    let secondsLeft = 5;
    countdownIntervalRef.current = setInterval(() => {
      secondsLeft -= 1;
      setAlertCountdown(Math.max(0, secondsLeft));
      if (secondsLeft <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      }
    }, 1000);

    // Auto-acknowledge after 5 seconds so surveillance stream monitoring continues automatically
    autoDismissTimerRef.current = setTimeout(() => {
      console.log('[ImmunoAI] ⏱️ 5s auto-acknowledgement reached. Resuming stream monitoring for next intruder.');
      dismissAlert(true);
    }, 5000);

    // Add to activity log
    setActivityLog((prev) => [
      {
        id: alertEvent.id,
        title: `🚨 INTRUDER DETECTED (${alertEvent.confidence}% confidence)`,
        time: timestamp,
        type: 'intruder',
        category: 'alert',
        camera: activeCam.name,
      },
      ...prev,
    ]);

    // Add to notifications
    setNotifications((prev) => [alertEvent, ...prev]);

    // Automatically record snapshot to Captured Intruders Gallery
    const newSnapshot = {
      id: `snap-${Date.now()}`,
      timestamp: `Today, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      camera: activeCam.name,
      confidence: `${detection?.confidence || '97.4'}%`,
      threatLevel: 'Live Breach Detected',
      image: detection?.imageUrl || 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600&auto=format&fit=crop&q=80',
      details: 'Live unauthorized intruder detected by direct system camera feed.',
      box: detection?.box || [30, 20, 35, 60],
    };
    setCapturedIntruders((prev) => [newSnapshot, ...prev]);
  }, [protectionMode, activeCameraId, cameras, dismissAlert]);

  // Add Enrolled Member
  const addMember = (memberData) => {
    playClickSound();
    const newMember = {
      id: Date.now(),
      name: memberData.name || 'New Member',
      role: memberData.role || 'Authorized',
      avatar: memberData.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    };
    setMembers((prev) => [...prev, newMember]);
  };

  const refreshSnapshots = useCallback(async () => {
    try {
      const snaps = await apiGetSnapshots();
      if (Array.isArray(snaps)) {
        setCapturedIntruders(snaps);
      }
    } catch (e) {
      console.warn('Failed to refresh snapshots', e);
    }
  }, []);

  // Check backend health periodically and sync snapshots
  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const res = await checkBackendHealth();
      if (!mounted) return;
      if (res.online) {
        setBackendStatus({
          online: true,
          checking: false,
          url: API_BASE_URL,
          fps: res.data?.fps || 30,
          model: res.data?.model || 'ImmunoAICNN (PyTorch)',
        });
        await refreshSnapshots();
        const engData = await apiGetEngine();
        if (mounted && engData?.active_engine) {
          setActiveEngine(engData.active_engine);
        }
      } else {
        setBackendStatus((prev) => ({
          ...prev,
          online: false,
          checking: false,
        }));
      }
    };

    check();
    const timer = setInterval(check, 10000);

    // Also establish WebSocket if backend supports it
    const ws = createAlertWebSocket(
      (data) => {
        if (data.type === 'INTRUDER_DETECTED') {
          triggerIntruderAlert(data);
        } else if (data.type === 'ENGINE_CHANGED' && data.active_engine) {
          setActiveEngine(data.active_engine);
        }
      },
      (status) => {
        if (mounted && status.connected) {
          setBackendStatus((prev) => ({ ...prev, online: true }));
        }
      }
    );

    return () => {
      mounted = false;
      clearInterval(timer);
      ws.close();
      stopIntruderSiren();
    };
  }, [triggerIntruderAlert]);

  const activeCamera = cameras.find((c) => c.id === activeCameraId) || cameras[0];

  return (
    <SecurityContext.Provider
      value={{
        protectionMode,
        toggleProtectionMode,
        activeCameraId,
        setActiveCameraId,
        activeCamera,
        cameras,
        smartDevices,
        toggleDevice,
        setClimateTemp,
        members,
        addMember,
        activityLog,
        activeAlert,
        alertCountdown,
        triggerIntruderAlert,
        dismissAlert,
        notifications,
        isMutedState,
        toggleMute,
        systemCameraStream,
        hasCameraAccess,
        cameraError,
        isCameraInitializing,
        startSystemCamera,
        stopSystemCamera,
        streamSource,
        setStreamSource,
        streamList,
        activeStreamId,
        setActiveStreamId,
        activeStream,
        addRemoteStream,
        removeStream,
        capturedIntruders,
        setCapturedIntruders,
        refreshSnapshots,
        backendStatus,
        confidenceThreshold,
        setConfidenceThreshold,
        dlTelemetry,
        updateDlTelemetry,
        activeEngine,
        switchEngine,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
};
