import { useRef, useState, useEffect } from 'react';
import {
  Maximize2,
  Camera,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Play,
} from 'lucide-react';
import { useSecurity } from '../context/useSecurity';
import { apiDetectFrame } from '../services/api';

export const LiveStreamPlayer = () => {
  const {
    protectionMode,
    activeAlert,
    alertCountdown,
    dismissAlert,
    triggerIntruderAlert,
    updateDlTelemetry,
    dlTelemetry,
    backendStatus,
    activeStream,
    systemCameraStream,
    hasCameraAccess,
    cameraError,
    isCameraInitializing,
    startSystemCamera,
  } = useSecurity();

  const [remoteStreamError, setRemoteStreamError] = useState(false);
  const [liveBox, setLiveBox] = useState(null);

  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteImgRef = useRef(null);
  const canvasRef = useRef(null);

  // Guarantee that whenever systemCameraStream changes, videoRef has srcObject attached and plays
  useEffect(() => {
    const video = videoRef.current;
    if (video && systemCameraStream && (!activeStream || activeStream.type === 'local')) {
      video.muted = true;
      video.defaultMuted = true;
      if (video.srcObject !== systemCameraStream) {
        video.srcObject = systemCameraStream;
      }
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((e) => console.warn('Webcam play notice:', e.message));
      }
    }
  }, [systemCameraStream, activeStream?.id, hasCameraAccess]);

  // Frame Capture Loop: sends base64 image string to backend when Protection Mode is ON
  useEffect(() => {
    if (!protectionMode) return;

    let isSending = false;
    const interval = setInterval(async () => {
      if (isSending) return;
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let sourceEl = null;
        const isRemote = activeStream?.type === 'remote';

        if (isRemote) {
          sourceEl = remoteVideoRef.current || remoteImgRef.current;
        } else if (hasCameraAccess && video && video.readyState >= 2) {
          sourceEl = video;
        }

        if (sourceEl) {
          const w = sourceEl.videoWidth || sourceEl.naturalWidth || 640;
          const h = sourceEl.videoHeight || sourceEl.naturalHeight || 360;
          if (w && canvas.width !== w) canvas.width = w;
          if (h && canvas.height !== h) canvas.height = h;
          ctx.drawImage(sourceEl, 0, 0, canvas.width, canvas.height);
        } else {
          // Fallback test frame if hardware/remote camera is not yet ready
          ctx.fillStyle = '#121418';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#64748b';
          ctx.font = '16px monospace';
          ctx.fillText(`IMMUNOAI FEED: ${(activeStream?.name || 'STANDBY').toUpperCase()}`, 20, 40);
        }

        let base64Image = null;
        try {
          base64Image = canvas.toDataURL('image/jpeg', 0.70);
        } catch {
          // If canvas tainted due to CORS on remote stream, proxy it through backend
          if (isRemote && activeStream?.url) {
            try {
              const pRes = await fetch(`/api/stream/proxy-snapshot?url=${encodeURIComponent(activeStream.url)}`);
              if (pRes.ok) {
                const blob = await pRes.blob();
                base64Image = await new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result);
                  reader.readAsDataURL(blob);
                });
              }
            } catch {
              // ignore
            }
          }
        }

        if (!base64Image) return;

        isSending = true;
        const res = await apiDetectFrame(base64Image);

        // Update Sidebar Live Monitor & Log to Browser Console
        if (res) {
          updateDlTelemetry(res);
          if (res.is_intruder && res.box) {
            setLiveBox({
              x: res.box[0],
              y: res.box[1],
              w: res.box[2],
              h: res.box[3],
              label: (res.consecutive_frames ?? 0) >= 3 ? 'INTRUDER' : (res.engine === 'yolo' ? 'TARGET ACQUIRED' : 'ANALYZING'),
              confidence: res.confidence,
              isConfirmed: (res.consecutive_frames ?? 0) >= 3,
              frames: res.consecutive_frames ?? 0,
            });
          } else {
            setLiveBox(null);
          }

          console.log(
            `%c[ImmunoAI DL]%c [${(res.engine || 'yolo').toUpperCase()}] Conf: ${(res.confidence ?? 0)}% | Logit: ${res.logit ?? 'N/A'} | Frames: ${res.consecutive_frames ?? 0}/3 | Latency: ${res.inference_ms ?? 0}ms`,
            'color: #f97316; font-weight: bold;',
            'color: #22c55e; font-weight: 500;'
          );
        }

        // Fail-safe immediate alert trigger if confirmed by 3 continuous frames
        if (res?.alert_triggered && res?.new_incident) {
          triggerIntruderAlert(res.new_incident);
        }
      } catch (err) {
        console.warn('Frame detection dispatch notice:', err?.message);
      } finally {
        isSending = false;
      }
    }, 500); // 500ms (~2 FPS): 3 continuous frames = 1.5s fast detection window!

    return () => clearInterval(interval);
  }, [protectionMode, hasCameraAccess, triggerIntruderAlert]);

  // Clear live box if protection mode disarmed
  useEffect(() => {
    if (!protectionMode) {
      setLiveBox(null);
    }
  }, [protectionMode]);

  const handleDismissAlert = () => {
    dismissAlert();
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Active displayed bounding boxes (live tracking box + confirmed alert boxes)
  const displayBoxes =
    activeAlert && protectionMode
      ? [
          {
            x: activeAlert.box?.[0] ?? 35,
            y: activeAlert.box?.[1] ?? 25,
            w: activeAlert.box?.[2] ?? 25,
            h: activeAlert.box?.[3] ?? 50,
            label: 'INTRUDER CONFIRMED',
            confidence: activeAlert.confidence || '97.2',
            trackingId: activeAlert.id ? String(activeAlert.id).slice(-4) : 'ALERT',
            isConfirmed: true,
          },
        ]
      : protectionMode && liveBox
      ? [
          {
            x: liveBox.x,
            y: liveBox.y,
            w: liveBox.w,
            h: liveBox.h,
            label: `${liveBox.label} (${liveBox.frames}/3)`,
            confidence: liveBox.confidence,
            trackingId: 'SCAN',
            isConfirmed: liveBox.isConfirmed,
          },
        ]
      : [];

  return (
    <div className="stream-card-wrapper" ref={containerRef}>
      {/* Hidden canvas used to extract base64 frame string for the Python model */}
      <canvas ref={canvasRef} width={640} height={360} style={{ display: 'none' }} />

      {/* Stream Container */}
      <div className={`stream-player-container ${activeAlert ? 'alert-active' : ''}`}>
        {/* Local Hardware Video Element */}
        {(!activeStream || activeStream.type === 'local') && (
          <video
            ref={videoRef}
            className="stream-media"
            autoPlay
            playsInline
            muted
            onLoadedMetadata={() => {
              if (videoRef.current) {
                videoRef.current.play().catch(() => {});
              }
            }}
            style={{ display: hasCameraAccess ? 'block' : 'none' }}
          />
        )}

        {/* Remote Stream Video / MJPEG Element */}
        {activeStream?.type === 'remote' && (
          (activeStream.url.includes('/video') || activeStream.url.includes('.mjpg')) ? (
            <img
              ref={remoteImgRef}
              src={activeStream.url}
              alt={activeStream.name}
              className="stream-media remote-stream-media"
              crossOrigin="anonymous"
              onError={() => setRemoteStreamError(true)}
              onLoad={() => setRemoteStreamError(false)}
            />
          ) : (
            <video
              ref={remoteVideoRef}
              src={activeStream.url}
              className="stream-media remote-stream-media"
              autoPlay
              loop
              muted
              playsInline
              crossOrigin="anonymous"
              onError={() => setRemoteStreamError(true)}
              onPlay={() => setRemoteStreamError(false)}
            />
          )
        )}

        {/* Fallback backdrop while camera is connecting or when camera is offline */}
        {((!activeStream || activeStream.type === 'local') ? !hasCameraAccess : remoteStreamError) && (
          <div className="stream-poster-viewport direct-camera-backdrop">
            <img
              src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&auto=format&fit=crop&q=85"
              alt="Direct System Camera Feed"
              className="stream-media poster-img"
            />
            <div className="stream-lens-overlay"></div>

            {/* Interactive System Camera Activation Card */}
            {(!activeStream || activeStream.type === 'local') && !hasCameraAccess && (
              <div className="camera-activation-overlay">
                <div className="camera-activation-card">
                  <div className="camera-activation-icon">
                    <Camera size={26} className="text-orange" />
                  </div>
                  <h4>{isCameraInitializing ? 'Connecting System Camera...' : 'System Camera Awaiting Activation'}</h4>
                  <p>
                    {cameraError || 'Allow browser camera access to monitor your room with deep learning intruder defense.'}
                  </p>
                  <button
                    type="button"
                    className="camera-activate-action-btn"
                    onClick={startSystemCamera}
                    disabled={isCameraInitializing}
                  >
                    {isCameraInitializing ? (
                      <span>Connecting...</span>
                    ) : (
                      <>
                        <Play size={13} fill="currentColor" />
                        <span>Activate System Camera</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {activeStream?.type === 'remote' && remoteStreamError && (
              <div className="remote-stream-error-notice">
                <span>Connecting to remote stream: {activeStream.url}</span>
              </div>
            )}
          </div>
        )}

        {/* Real-Time Deep Learning Detection Bounding Box Overlay */}
        <div className="stream-detection-layer">
          {displayBoxes.map((box, index) => (
            <div
              key={index}
              className={`bounding-box ${box.isConfirmed ? 'intruder-box' : 'live-tracking-box'}`}
              style={{
                left: `${box.x}%`,
                top: `${box.y}%`,
                width: `${box.w}%`,
                height: `${box.h}%`,
              }}
            >
              <div className="box-corner tl"></div>
              <div className="box-corner tr"></div>
              <div className="box-corner bl"></div>
              <div className="box-corner br"></div>

              {/* Tag Header */}
              <div className={`box-tag ${box.isConfirmed ? 'intruder' : 'tracking'}`}>
                <span className={box.isConfirmed ? 'pulse-danger' : 'pulse-warning'}></span>
                <strong>{box.label}</strong>
                <span className="box-conf">{box.confidence}%</span>
              </div>

              {/* Tracking ID */}
              <div className="box-tracking-id">
                <span>ID: #{box.trackingId}</span>
              </div>
            </div>
          ))}

          {/* Standby Watermark when Protection Mode is OFF */}
          {!protectionMode && (
            <div className="standby-watermark">
              <ShieldCheck size={18} className="text-muted" />
              <div>
                <strong>Protection Mode Standby</strong>
                <p>Toggle "Protection Mode" ON to activate real-time intruder detection</p>
              </div>
            </div>
          )}

          {/* AI Server Offline Helper Banner (Shows helpful guidance instead of an ugly crash) */}
          {protectionMode && dlTelemetry?.ai_service_online === false && (
            <div className="ai-offline-watermark">
              <AlertTriangle size={18} className="text-amber" />
              <div>
                <strong>AI Inference Server Offline (Port 5001)</strong>
                <p>Start Python server: <code>cd server/ai_service/mini_server && python server.py</code></p>
              </div>
            </div>
          )}

          {/* Active Intruder Alert Banner Overlay with 5s Countdown */}
          {activeAlert && (
            <div className="stream-alert-banner">
              <div className="alert-banner-left">
                <div className="alert-siren-icon">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h4 className="alert-banner-title">INTRUDER CONFIRMED IN CAMERA FEED</h4>
                  <p className="alert-banner-sub">
                    Confidence: <strong>{activeAlert.confidence}%</strong> • Tracked at{' '}
                    {activeAlert.timestamp} •{' '}
                    <span className="instream-countdown-text">
                      Auto-acknowledges in {alertCountdown}s
                    </span>
                  </p>
                </div>
              </div>
              <button className="dismiss-alert-btn" onClick={handleDismissAlert} type="button">
                Acknowledge Threat ({alertCountdown}s)
              </button>
            </div>
          )}
        </div>

        {/* Top Bar: Only Live Badge (Clean - FHD, 100%, Wifi, On removed per instructions) */}
        <div className="stream-top-bar">
          <div className="stream-badges-left">
            <div className="badge-pill live-badge">
              <span className="live-dot"></span>
              <span>Live • {activeStream?.name || 'Attached Camera'}</span>
            </div>
          </div>

          <div className="stream-badges-right">
            <button
              className="badge-pill toggleable icon-only-badge"
              onClick={toggleFullscreen}
              title="Fullscreen"
              type="button"
            >
              <Maximize2 size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Stream Bottom Controls: Direct Camera status info */}
      <div className="stream-bottom-controls">
        <div className="stream-camera-status-info">
          <Camera size={14} className="text-orange" />
          <span className="camera-status-text">
            {backendStatus?.online
              ? 'Live Camera Stream • Backend Connected (30 FPS)'
              : hasCameraAccess
              ? 'Direct System Camera • Hardware Connected'
              : 'Direct System Camera • Standby Feed Active'}
          </span>
        </div>
      </div>
    </div>
  );
};
