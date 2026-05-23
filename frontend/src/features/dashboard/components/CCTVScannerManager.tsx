import React, { useState, useEffect, useRef } from 'react';
import { useDashboardStore } from '../../../shared/store/dashboardStore';
import { Card } from '../../../shared/components/Card';
import { Badge } from '../../../shared/components/Badge';
import { 
  Upload, Play, Pause, RefreshCw, AlertTriangle, 
  Check, ShieldAlert, Cpu, Sliders, Volume2, VolumeX,
  ShieldCheck, Zap
} from 'lucide-react';
import { API_BASE_URL } from '../../../shared/config/api';

const CHANNELS = [
  { id: 'cam_1', zoneCode: 'ZONE_A', name: 'Gate A Entrance', defaultUrl: '/ved1.mp4', label: 'CAM_01_A' },
  { id: 'cam_2', zoneCode: 'ZONE_C', name: 'VIP East Lounge', defaultUrl: '/ved2.mp4', label: 'CAM_03_C' },
  { id: 'cam_3', zoneCode: 'ZONE_D', name: 'Lower Deck South', defaultUrl: '/ved3.mp4', label: 'CAM_04_D' },
  { id: 'cam_4', zoneCode: 'ZONE_F', name: 'Gate F Plaza', defaultUrl: '/ved4.mp4', label: 'CAM_06_F' }
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  id: number;
  label: string;
}

// Child Component for individual CCTV Stream Card
interface CCTVCameraFeedProps {
  index: number;
  channel: typeof CHANNELS[0];
  zone: any;
  videoUrl: string;
  isPlaying: boolean;
  isMuted: boolean;
  customFileName: string | null;
  isScanning: boolean;
  scanProgress: number;
  scanPhase: string;
  scanSuccess: boolean;
  detectedCount: number;
  simulatedSpeed: number;
  anomalousState: 'safe' | 'fight' | 'gathering';
  isSelected: boolean;
  onSelect: () => void;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRunScan: () => void;
  onTriggerState: (state: 'safe' | 'fight' | 'gathering') => void;
}

const CCTVCameraFeed: React.FC<CCTVCameraFeedProps> = ({
  index,
  channel,
  zone,
  videoUrl,
  isPlaying,
  isMuted,
  customFileName,
  isScanning,
  scanProgress,
  scanPhase,
  scanSuccess,
  detectedCount,
  simulatedSpeed,
  anomalousState,
  isSelected,
  onSelect,
  onTogglePlay,
  onToggleMute,
  onFileUpload,
  onRunScan,
  onTriggerState
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [videoError, setVideoError] = useState<boolean>(false);

  // Sync play/pause state with video element
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  // Sync mute state
  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = isMuted;
  }, [isMuted]);

  // Canvas particle overlay rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let scanlineY = 0;
    let scanDirection = 1;

    // Seed particles representing tracked crowd members
    const particles: Particle[] = [];
    const maxParticles = Math.min(120, detectedCount);
    for (let i = 0; i < maxParticles; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 1.0,
        vy: (Math.random() - 0.5) * 1.0,
        size: Math.random() * 2.5 + 2.5,
        id: Math.floor(Math.random() * 9000) + 1000,
        label: Math.random() > 0.95 ? 'VIP' : 'PERSON'
      });
    }

    const drawOverlay = () => {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      // Draw vector grid background if video is errored or unavailable
      if (videoError) {
        ctx.fillStyle = '#070a13';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
        ctx.lineWidth = 1;
        const gridSize = 25;
        for (let x = 0; x < w; x += gridSize) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += gridSize) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
      }

      // Draw corner brackets
      ctx.strokeStyle = anomalousState === 'safe'
        ? 'rgba(0, 240, 255, 0.4)'
        : anomalousState === 'fight'
          ? 'rgba(255, 0, 85, 0.6)'
          : 'rgba(255, 183, 0, 0.6)';
      ctx.lineWidth = 1.5;
      const bracketLen = 14;
      const m = 12;

      // Top Left
      ctx.beginPath(); ctx.moveTo(m, m + bracketLen); ctx.lineTo(m, m); ctx.lineTo(m + bracketLen, m); ctx.stroke();
      // Top Right
      ctx.beginPath(); ctx.moveTo(w - m - bracketLen, m); ctx.lineTo(w - m, m); ctx.lineTo(w - m, m + bracketLen); ctx.stroke();
      // Bottom Left
      ctx.beginPath(); ctx.moveTo(m, h - m - bracketLen); ctx.lineTo(m, h - m); ctx.lineTo(m + bracketLen, h - m); ctx.stroke();
      // Bottom Right
      ctx.beginPath(); ctx.moveTo(w - m - bracketLen, h - m); ctx.lineTo(w - m, h - m); ctx.lineTo(w - m, h - m - bracketLen); ctx.stroke();

      // Bounding boxes for tracked particles
      particles.forEach((p, idx) => {
        if (isPlaying) {
          p.x += p.vx * (anomalousState === 'fight' ? 2.6 : simulatedSpeed);
          p.y += p.vy * (anomalousState === 'fight' ? 2.6 : simulatedSpeed);

          if (p.x < 20 || p.x > w - 20) p.vx *= -1;
          if (p.y < 20 || p.y > h - 20) p.vy *= -1;
        }

        const boxW = p.size * 2.6;
        const boxH = p.size * 4.6;

        let color = 'rgba(0, 255, 102, 0.55)'; // Neon Green
        let label = p.label;

        if (anomalousState === 'fight' && idx < 12) {
          color = 'rgba(255, 0, 85, 0.8)'; // Neon Red
          label = 'ALERT: FIGHT';
        } else if (anomalousState === 'gathering' && idx < 22) {
          color = 'rgba(255, 183, 0, 0.8)'; // Amber
          label = 'CROWD_POOL';
        } else if (p.label === 'VIP') {
          color = 'rgba(0, 162, 255, 0.8)'; // Cyan
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x - boxW/2, p.y - boxH/2, boxW, boxH);

        // Bounding box crosshair
        ctx.strokeStyle = color.replace('0.55', '0.2').replace('0.8', '0.2');
        ctx.beginPath();
        ctx.moveTo(p.x - 2, p.y); ctx.lineTo(p.x + 2, p.y);
        ctx.moveTo(p.x, p.y - 2); ctx.lineTo(p.x, p.y + 2);
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.font = '6px monospace';
        ctx.fillText(`${label} #${p.id}`, p.x - boxW/2, p.y - boxH/2 - 2);
      });

      // Draw scanner laser line
      scanlineY += scanDirection * 1.4;
      if (scanlineY > h - 16) { scanlineY = h - 16; scanDirection = -1; }
      else if (scanlineY < 16) { scanlineY = 16; scanDirection = 1; }

      ctx.strokeStyle = anomalousState === 'fight' 
        ? 'rgba(255, 0, 85, 0.25)' 
        : 'rgba(0, 240, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(12, scanlineY);
      ctx.lineTo(w - 12, scanlineY);
      ctx.stroke();

      const grad = ctx.createLinearGradient(0, scanlineY - 3, 0, scanlineY + 3);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.5, anomalousState === 'fight' ? 'rgba(255, 0, 85, 0.05)' : 'rgba(0, 240, 255, 0.04)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(12, scanlineY - 3, w - 24, 6);

      // Flash notifications for incident states
      if (anomalousState === 'fight') {
        ctx.fillStyle = 'rgba(255, 0, 85, 0.03)';
        ctx.fillRect(0, 0, w, h);
        if (Math.floor(Date.now() / 400) % 2 === 0) {
          ctx.fillStyle = '#ff0055';
          ctx.font = 'bold 8px monospace';
          ctx.fillText('CRITICAL: ALTERCATION DETECTED', w / 2 - 75, 20);
        }
      } else if (anomalousState === 'gathering') {
        if (Math.floor(Date.now() / 600) % 2 === 0) {
          ctx.fillStyle = '#ffb700';
          ctx.font = 'bold 8px monospace';
          ctx.fillText('WARNING: CROWD POOL DETECTED', w / 2 - 70, 20);
        }
      }

      animationRef.current = requestAnimationFrame(drawOverlay);
    };

    drawOverlay();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [detectedCount, anomalousState, isPlaying, simulatedSpeed, videoError]);

  return (
    <div 
      onClick={onSelect}
      className={`relative group bg-slate-950 border rounded-xl overflow-hidden cursor-pointer transition-all flex flex-col ${
        isSelected 
          ? 'border-cyber-primary shadow-[0_0_15px_rgba(0,240,255,0.25)] ring-1 ring-cyber-primary/50' 
          : 'border-cyber-border hover:border-cyber-primary/50 hover:shadow-[0_0_8px_rgba(0,240,255,0.1)]'
      }`}
    >
      {/* Video Container */}
      <div className="relative aspect-[16/9] w-full bg-black overflow-hidden flex items-center justify-center select-none">
        {!videoError && (
          <video
            ref={videoRef}
            src={videoUrl}
            loop
            muted={isMuted}
            autoPlay
            playsInline
            onError={() => setVideoError(true)}
            className="w-full h-full object-cover opacity-80"
          />
        )}

        {/* Bounding box vector overlays */}
        <canvas
          ref={canvasRef}
          width={480}
          height={270}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
        />

        {/* Video stream title overlay */}
        <div className="absolute top-3 left-3 z-20 flex flex-col bg-slate-900/85 backdrop-blur-md border border-cyber-border/40 px-2 py-0.5 rounded font-mono text-[9px] text-cyber-text tracking-wide shadow-md">
          <span className="text-[7px] text-cyber-muted uppercase">CHANNEL: {channel.label}</span>
          <span className="font-bold">{channel.name}</span>
        </div>

        {/* Camera state indicators */}
        <div className="absolute top-3 right-3 z-20 flex gap-1.5 items-center">
          {isScanning ? (
            <span className="bg-cyber-primary/20 border border-cyber-primary/60 px-2 py-0.5 rounded text-[8px] font-mono text-cyber-primary tracking-wider animate-pulse flex items-center gap-1 shadow-glow">
              <Cpu size={8} className="animate-spin" />
              SCANNING
            </span>
          ) : zone.riskLevel === 'critical' ? (
            <span className="bg-cyber-danger/20 border border-cyber-danger/60 px-2 py-0.5 rounded text-[8px] font-mono text-cyber-danger tracking-wider animate-pulse flex items-center gap-1 shadow-glow-danger">
              <AlertTriangle size={8} />
              CRITICAL
            </span>
          ) : zone.riskLevel === 'warning' ? (
            <span className="bg-cyber-warning/20 border border-cyber-warning/60 px-2 py-0.5 rounded text-[8px] font-mono text-cyber-warning tracking-wider flex items-center gap-1 shadow-glow-warning">
              <AlertTriangle size={8} />
              WARNING
            </span>
          ) : (
            <span className="bg-cyber-success/15 border border-cyber-success/40 px-2 py-0.5 rounded text-[8px] font-mono text-cyber-success tracking-wider flex items-center gap-1">
              <ShieldCheck size={8} />
              STABLE
            </span>
          )}
        </div>

        {/* Bottom Metadata overlay */}
        <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2">
          <div className="bg-black/75 backdrop-blur-sm border border-white/10 px-2 py-0.5 rounded text-[8px] font-mono text-white/95 flex items-center gap-1.5 shadow-sm">
            <span className={`h-1 w-1 rounded-full ${isPlaying ? 'bg-cyber-success animate-pulse' : 'bg-cyber-muted'}`}></span>
            <span>{isPlaying ? 'LIVE STREAM' : 'FEED PAUSED'}</span>
          </div>
          {customFileName && (
            <div className="bg-cyber-vip/15 border border-cyber-vip/40 px-2 py-0.5 rounded text-[8px] font-mono text-cyber-vip truncate max-w-[120px]">
              {customFileName}
            </div>
          )}
        </div>

        {/* HUD Scan progress overlay */}
        {isScanning && (
          <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[1px] flex flex-col justify-center items-center p-4 z-20 font-mono text-[9px] text-cyber-primary">
            <div className="border border-cyber-primary/40 bg-slate-900/90 rounded-lg p-3 w-5/6 max-w-[200px] flex flex-col gap-2 shadow-glow">
              <div className="flex justify-between items-center border-b border-cyber-primary/20 pb-1 text-[7px] text-cyber-muted">
                <span>{channel.label} SCAN</span>
                <span className="animate-spin"><RefreshCw size={8} /></span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="truncate max-w-[120px] text-cyber-text">{scanPhase}</span>
                <span>{scanProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div className="bg-cyber-primary h-full transition-all duration-300" style={{ width: `${scanProgress}%` }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Scan success indicator */}
        {scanSuccess && !isScanning && (
          <div className="absolute inset-0 bg-slate-950/40 flex justify-center items-center z-20 font-mono text-[9px] text-cyber-success pointer-events-none">
            <span className="bg-slate-900/90 border border-cyber-success/50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-glow-success animate-bounce">
              <Check size={12} />
              <span>YOLO ANALYSIS COMPLETED</span>
            </span>
          </div>
        )}

        {/* Interactive Controls Overlay on Hover */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-3 pt-8 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex justify-between items-center gap-2">
          <div className="flex gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
              className="bg-slate-900 hover:bg-cyber-primary hover:text-slate-950 border border-cyber-border text-cyber-text p-1.5 rounded transition-all active:scale-90"
              title={isPlaying ? 'Pause Feed' : 'Play Feed'}
            >
              {isPlaying ? <Pause size={10} /> : <Play size={10} />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
              className="bg-slate-900 hover:bg-cyber-primary hover:text-slate-950 border border-cyber-border text-cyber-text p-1.5 rounded transition-all active:scale-90"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX size={10} /> : <Volume2 size={10} />}
            </button>
          </div>

          <div className="flex gap-1.5 items-center">
            {/* Custom file upload overlay triggers */}
            <input 
              type="file" 
              id={`video-uploader-${index}`}
              accept="video/*" 
              onChange={onFileUpload} 
              className="hidden" 
            />
            <label 
              htmlFor={`video-uploader-${index}`}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 hover:bg-cyber-primary hover:text-slate-950 border border-cyber-border text-cyber-text p-1.5 rounded transition-all active:scale-90 cursor-pointer"
              title="Upload custom crowd video file"
            >
              <Upload size={10} />
            </label>

            <button
              onClick={(e) => { e.stopPropagation(); onRunScan(); }}
              disabled={isScanning}
              className="bg-cyber-primary/10 border border-cyber-primary/40 hover:bg-cyber-primary text-cyber-primary hover:text-slate-950 text-[8px] font-mono uppercase px-2.5 py-1 rounded font-bold transition-all disabled:opacity-50 flex items-center gap-1 shadow-glow"
              title="Execute YOLO object detection"
            >
              <Cpu size={8} />
              <span>SCAN</span>
            </button>
          </div>
        </div>
      </div>

      {/* Card Info footer */}
      <div className="p-3 bg-cyber-card/90 border-t border-cyber-border/40 font-mono text-[9px] flex justify-between items-center">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1">
            <span className="text-cyber-muted uppercase">DENSITY:</span>
            <span className={`font-bold font-orbitron ${
              zone.currentDensity >= zone.criticalThreshold 
                ? 'text-cyber-danger animate-pulse' 
                : zone.currentDensity >= zone.warningThreshold 
                  ? 'text-cyber-warning' 
                  : 'text-cyber-success'
            }`}>
              {Math.round(zone.currentDensity)}%
            </span>
          </div>
          <div className="flex items-center gap-1 text-[7px] text-cyber-muted uppercase">
            <span>PEOPLE: {detectedCount} pax</span>
            <span>•</span>
            <span>SPEED: {simulatedSpeed.toFixed(1)} m/s</span>
          </div>
        </div>

        <div className="flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onTriggerState('safe'); }}
            className={`text-[7px] uppercase px-1 border rounded transition-colors ${
              anomalousState === 'safe' 
                ? 'border-cyber-success bg-cyber-success/15 text-cyber-success font-bold' 
                : 'border-cyber-border text-cyber-muted hover:border-cyber-border-glow'
            }`}
          >
            SAFE
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onTriggerState('gathering'); }}
            className={`text-[7px] uppercase px-1 border rounded transition-colors ${
              anomalousState === 'gathering' 
                ? 'border-cyber-warning bg-cyber-warning/15 text-cyber-warning font-bold' 
                : 'border-cyber-border text-cyber-muted hover:border-cyber-border-glow'
            }`}
          >
            POOL
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onTriggerState('fight'); }}
            className={`text-[7px] uppercase px-1 border rounded transition-colors ${
              anomalousState === 'fight' 
                ? 'border-cyber-danger bg-cyber-danger/15 text-cyber-danger font-bold' 
                : 'border-cyber-border text-cyber-muted hover:border-cyber-border-glow'
            }`}
          >
            FIGHT
          </button>
        </div>
      </div>
    </div>
  );
};


export const CCTVScannerManager: React.FC = () => {
  const { zones } = useDashboardStore();
  
  // Grid Channel Playback & Scanner state arrays
  const [selectedChannelIndex, setSelectedChannelIndex] = useState<number>(0);
  const [videoUrls, setVideoUrls] = useState<string[]>(CHANNELS.map(c => c.defaultUrl));
  const [isPlayings, setIsPlayings] = useState<boolean[]>([true, true, true, true]);
  const [isMuteds, setIsMuteds] = useState<boolean[]>([true, true, true, true]);
  const [customFileNames, setCustomFileNames] = useState<(string | null)[]>([null, null, null, null]);
  
  // CV analytical state arrays
  const [detectedCounts, setDetectedCounts] = useState<number[]>([68, 15, 92, 45]);
  const [simulatedSpeeds, setSimulatedSpeeds] = useState<number[]>([1.4, 1.2, 0.6, 1.5]);
  const [anomalousStates, setAnomalousStates] = useState<('safe' | 'fight' | 'gathering')[]>(['safe', 'safe', 'safe', 'safe']);

  // Scanning progress states per index
  const [isScannings, setIsScannings] = useState<boolean[]>([false, false, false, false]);
  const [scanProgresses, setScanProgresses] = useState<number[]>([0, 0, 0, 0]);
  const [scanPhases, setScanPhases] = useState<string[]>(['', '', '', '']);
  const [scanSuccesses, setScanSuccesses] = useState<boolean[]>([false, false, false, false]);
  
  // Real-time scheduling states
  const [globalRealtimeScan, setGlobalRealtimeScan] = useState<boolean>(true);

  // Manual input override slider state
  const [inputDensity, setInputDensity] = useState<number>(45);
  const [isManualInjecting, setIsManualInjecting] = useState<boolean>(false);
  const [manualInjectPhase, setManualInjectPhase] = useState<string>('');
  const [manualInjectProgress, setManualInjectProgress] = useState<number>(0);
  const [manualInjectSuccess, setManualInjectSuccess] = useState<boolean>(false);

  // Incident reporting state
  const [isReportingIncident, setIsReportingIncident] = useState<boolean>(false);
  const [reportSuccess, setReportSuccess] = useState<boolean>(false);

  // Threshold local configurations map
  const [warningThresholds, setWarningThresholds] = useState<Record<string, number>>({});
  const [criticalThresholds, setCriticalThresholds] = useState<Record<string, number>>({});
  const [savingThresholdZoneId, setSavingThresholdZoneId] = useState<string | null>(null);
  const [savedSuccessZoneId, setSavedSuccessZoneId] = useState<string | null>(null);

  // Consolidated terminal logs state
  const [yoloLogs, setYoloLogs] = useState<Array<{ time: string; text: string; label: string; type: 'info' | 'success' | 'warning' | 'danger' }>>([
    { time: new Date().toLocaleTimeString(), text: 'AI surveillance core engine initialized. Port RTSP connections verified.', label: 'SYSTEM', type: 'info' },
    { time: new Date().toLocaleTimeString(), text: 'Loaded 4 live channel streams concurrently in 2x2 multi-screen matrix.', label: 'SOC_CORE', type: 'info' },
    { time: new Date().toLocaleTimeString(), text: 'Real-time staggered scheduler standby. YOLOv8x-Tactical detection ready.', label: 'YOLO_CORE', type: 'success' }
  ]);

  // Sync thresholds map on load
  useEffect(() => {
    const warnMap: Record<string, number> = {};
    const critMap: Record<string, number> = {};
    zones.forEach(z => {
      warnMap[z.id] = z.warningThreshold;
      critMap[z.id] = z.criticalThreshold;
    });
    setWarningThresholds(warnMap);
    setCriticalThresholds(critMap);
  }, [zones]);

  const addYoloLog = (time: string, text: string, label: string, type: 'info' | 'success' | 'warning' | 'danger') => {
    setYoloLogs(prev => {
      const next = [...prev, { time, text, label, type }];
      if (next.length > 25) next.shift();
      return next;
    });
  };

  // Channel custom file upload handler
  const handleFileUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrls(prev => { const n = [...prev]; n[index] = url; return n; });
      setCustomFileNames(prev => { const n = [...prev]; n[index] = file.name; return n; });
      setIsPlayings(prev => { const n = [...prev]; n[index] = true; return n; });

      const randCount = Math.floor(Math.random() * 50) + 40;
      setDetectedCounts(prev => { const n = [...prev]; n[index] = randCount; return n; });

      const ch = CHANNELS[index];
      addYoloLog(new Date().toLocaleTimeString(), `Switched stream input to local upload: ${file.name}`, ch.label, 'info');
    }
  };

  // Toggle playback state
  const handleTogglePlay = (index: number) => {
    setIsPlayings(prev => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  // Toggle mute state
  const handleToggleMute = (index: number) => {
    setIsMuteds(prev => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  // Trigger simulated incident states
  const handleTriggerState = (index: number, state: 'safe' | 'fight' | 'gathering') => {
    const ch = CHANNELS[index];
    setAnomalousStates(prev => { const n = [...prev]; n[index] = state; return n; });
    
    if (state === 'safe') {
      setSimulatedSpeeds(prev => { const n = [...prev]; n[index] = 1.4; return n; });
      setDetectedCounts(prev => { const n = [...prev]; n[index] = 45; return n; });
      addYoloLog(new Date().toLocaleTimeString(), `Heuristic parser: Manual override reset to NORMAL crowd behavior.`, ch.label, 'success');
    } else if (state === 'gathering') {
      setSimulatedSpeeds(prev => { const n = [...prev]; n[index] = 0.5; return n; });
      setDetectedCounts(prev => { const n = [...prev]; n[index] = 110; return n; });
      addYoloLog(new Date().toLocaleTimeString(), `ALERT: Heavy density pooling detected near bottlenecks. Potential stampede risk rising.`, ch.label, 'warning');
    } else if (state === 'fight') {
      setSimulatedSpeeds(prev => { const n = [...prev]; n[index] = 3.6; return n; });
      setDetectedCounts(prev => { const n = [...prev]; n[index] = 78; return n; });
      addYoloLog(new Date().toLocaleTimeString(), `CRITICAL WARNING: Aggressive optical flow vectors flagged. Active physical altercation detected.`, ch.label, 'danger');
    }
  };

  // Scan single camera feed using backend API
  const handleSingleScan = async (index: number) => {
    if (isScannings[index]) return;
    
    const channel = CHANNELS[index];
    const videoUrl = videoUrls[index];

    setIsScannings(prev => { const n = [...prev]; n[index] = true; return n; });
    setScanSuccesses(prev => { const n = [...prev]; n[index] = false; return n; });
    setScanProgresses(prev => { const n = [...prev]; n[index] = 15; return n; });
    setScanPhases(prev => { const n = [...prev]; n[index] = 'Connecting stream buffer...'; return n; });

    addYoloLog(new Date().toLocaleTimeString(), `Manual scan request. Querying telemetry analyzer API...`, channel.label, 'info');

    try {
      // POST Request to backend endpoint
      const resPromise = fetch(`${API_BASE_URL}/api/zones/code/${channel.zoneCode}/analyze-feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_url: videoUrl })
      });

      await new Promise(r => setTimeout(r, 500));
      setScanProgresses(prev => { const n = [...prev]; n[index] = 45; return n; });
      setScanPhases(prev => { const n = [...prev]; n[index] = 'Decoding frames (H264)...'; return n; });

      await new Promise(r => setTimeout(r, 450));
      setScanProgresses(prev => { const n = [...prev]; n[index] = 75; return n; });
      setScanPhases(prev => { const n = [...prev]; n[index] = 'YOLO inference active...'; return n; });

      await new Promise(r => setTimeout(r, 400));
      setScanProgresses(prev => { const n = [...prev]; n[index] = 90; return n; });
      setScanPhases(prev => { const n = [...prev]; n[index] = 'Evaluating crowd speed...'; return n; });

      const res = await resPromise;
      if (!res.ok) throw new Error('API video analysis failed');
      const data = await res.json();

      setScanProgresses(prev => { const n = [...prev]; n[index] = 100; return n; });
      setScanPhases(prev => { const n = [...prev]; n[index] = 'Synchronized!'; return n; });
      setScanSuccesses(prev => { const n = [...prev]; n[index] = true; return n; });

      setDetectedCounts(prev => { const n = [...prev]; n[index] = data.detected_count; return n; });
      setAnomalousStates(prev => { const n = [...prev]; n[index] = data.anomaly; return n; });
      setSimulatedSpeeds(prev => {
        const n = [...prev];
        n[index] = data.movement_speed === 'normal' ? 1.4 : data.movement_speed === 'slow' ? 0.7 : 0.2;
        return n;
      });

      const logType = data.anomaly !== 'safe' ? 'danger' : 'success';
      addYoloLog(
        new Date().toLocaleTimeString(),
        `Scan succeeded. Count: ${data.detected_count} pax, Density: ${Math.round(data.density)}%, Anomaly: ${data.anomaly.toUpperCase()}`,
        channel.label,
        logType
      );

      setTimeout(() => {
        setIsScannings(prev => { const n = [...prev]; n[index] = false; return n; });
        setScanSuccesses(prev => { const n = [...prev]; n[index] = false; return n; });
      }, 3000);

    } catch (err: any) {
      console.error(err);
      setScanPhases(prev => { const n = [...prev]; n[index] = 'Server error'; return n; });
      addYoloLog(new Date().toLocaleTimeString(), `API scan failed: ${err.message || 'Server unresponsive'}`, channel.label, 'danger');
      setTimeout(() => {
        setIsScannings(prev => { const n = [...prev]; n[index] = false; return n; });
      }, 4000);
    }
  };

  // Staggered Real-Time CCTV Scanning Loop
  useEffect(() => {
    if (!globalRealtimeScan) return;

    let currentIndex = 0;
    const triggerNextScan = () => {
      // Find the next active channel index that is not currently scanning
      let count = 0;
      while (isScannings[currentIndex] && count < CHANNELS.length) {
        currentIndex = (currentIndex + 1) % CHANNELS.length;
        count++;
      }

      if (count < CHANNELS.length) {
        handleSingleScan(currentIndex);
        currentIndex = (currentIndex + 1) % CHANNELS.length;
      }
    };

    // Staggered scans: Trigger next scan every 8 seconds
    const interval = setInterval(triggerNextScan, 8000);

    // Run first scan immediately
    const initialDelay = setTimeout(triggerNextScan, 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialDelay);
    };
  }, [globalRealtimeScan]);

  // Periodic visual YOLO inference console decoration logs (keep dashboard feeling alive)
  useEffect(() => {
    const logInterval = setInterval(() => {
      const activeChannels = CHANNELS.filter((_, i) => isPlayings[i] && !isScannings[i]);
      if (activeChannels.length === 0) return;

      const randomChan = activeChannels[Math.floor(Math.random() * activeChannels.length)];
      const index = CHANNELS.findIndex(c => c.id === randomChan.id);
      
      const objects = ['backpack', 'umbrella', 'mobile phone', 'water bottle'];
      const randomObj = objects[Math.floor(Math.random() * objects.length)];
      const confidence = (Math.random() * 4 + 94).toFixed(1);

      const logs = [
        `YOLOv8x: Frame batch processed. Latency: ${Math.floor(Math.random() * 5 + 9)}ms. GPU temp: 64C.`,
        `Tracker: Class "person" bounding boxes aligned. Count: ${detectedCounts[index]} pax.`,
        `YOLOv8x: Detected 1 ${randomObj} (confidence ${confidence}%).`,
        `AI Egress: Flow velocity estimated at ${simulatedSpeeds[index].toFixed(1)} m/s.`,
        `System: Multiplexer buffer synced. RTSP frame stream stable at 30.0 fps.`
      ];

      addYoloLog(
        new Date().toLocaleTimeString(), 
        logs[Math.floor(Math.random() * logs.length)], 
        randomChan.label, 
        'info'
      );
    }, 4500);

    return () => clearInterval(logInterval);
  }, [isPlayings, isScannings, detectedCounts, simulatedSpeeds]);

  // Global manual trigger to scan all cameras sequentially
  const handleScanAll = async () => {
    addYoloLog(new Date().toLocaleTimeString(), `Manual override: Global sequential YOLOv8x scanning triggered...`, 'SYSTEM', 'warning');
    for (let i = 0; i < CHANNELS.length; i++) {
      if (!isScannings[i]) {
        handleSingleScan(i);
        // Stagger execution slightly
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  };

  // Selected Zone reference object
  const selectedChannel = CHANNELS[selectedChannelIndex];
  const selectedZone = zones.find(z => z.code === selectedChannel.zoneCode) || zones[0];

  // Manual slider density injector
  const handleManualTelemetryInjection = async () => {
    setIsManualInjecting(true);
    setManualInjectSuccess(false);
    setManualInjectProgress(20);
    setManualInjectPhase('Packaging telemetry payload...');

    try {
      await new Promise(r => setTimeout(r, 400));
      setManualInjectProgress(60);
      setManualInjectPhase('PATCH request sending...');

      const res = await fetch(`${API_BASE_URL}/api/zones/code/${selectedChannel.zoneCode}/density?density=${inputDensity}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) throw new Error('API manual telemetry injection failed');

      setManualInjectProgress(100);
      setManualInjectPhase('State synchronized!');
      setManualInjectSuccess(true);
      addYoloLog(
        new Date().toLocaleTimeString(),
        `Manual injection success: Override ${selectedChannel.zoneCode} density bounds to ${inputDensity}%`,
        'SYSTEM',
        'warning'
      );

      setTimeout(() => {
        setIsManualInjecting(false);
        setManualInjectSuccess(false);
      }, 3500);

    } catch (err: any) {
      console.error(err);
      setManualInjectPhase(`Error: ${err.message || 'Server unresponsive'}`);
      setTimeout(() => setIsManualInjecting(false), 4000);
    }
  };

  // Manual incident reporter
  const handleIncidentReport = async () => {
    const curState = anomalousStates[selectedChannelIndex];
    if (curState === 'safe') return;

    setIsReportingIncident(true);
    setReportSuccess(false);

    const activityType = curState === 'fight' ? 'fight' : 'rapid_gathering';
    const details = activityType === 'fight'
      ? `Command Center CCTV manual report: physical altercation flagged by operator. High security deployment advised.`
      : `Command Center CCTV manual report: rapid compression of crowd detected exceeding segment bounds.`;

    try {
      const res = await fetch(`${API_BASE_URL}/api/zones/code/${selectedChannel.zoneCode}/unusual-activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_type: activityType,
          details: details,
          severity: 'high'
        })
      });

      if (!res.ok) throw new Error('API incident submission failed');

      setReportSuccess(true);
      addYoloLog(
        new Date().toLocaleTimeString(),
        `INCIDENT REPORT SUBMITTED TO HQ: ${activityType.replace('_', ' ').toUpperCase()} in ${selectedChannel.zoneCode}`,
        'SYSTEM',
        'danger'
      );

      setTimeout(() => {
        setReportSuccess(false);
        setIsReportingIncident(false);
      }, 3000);

    } catch (err) {
      console.error(err);
      setIsReportingIncident(false);
    }
  };

  // Capacity boundaries save sliders handler
  const handleSaveThreshold = async (zoneId: string) => {
    setSavingThresholdZoneId(zoneId);
    setSavedSuccessZoneId(null);

    const warning = warningThresholds[zoneId];
    const critical = criticalThresholds[zoneId];

    try {
      const res = await fetch(`${API_BASE_URL}/api/zones/${zoneId}/thresholds`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warning_threshold: warning,
          critical_threshold: critical
        })
      });

      if (!res.ok) throw new Error('Failed to update capacity limits.');

      setSavedSuccessZoneId(zoneId);
      addYoloLog(
        new Date().toLocaleTimeString(),
        `Updated alarm thresholds for Zone ID ${zoneId.substring(0, 8)}... to Warn:${warning}% / Crit:${critical}%`,
        'SYSTEM',
        'info'
      );
      setTimeout(() => setSavedSuccessZoneId(null), 3000);

    } catch (err: any) {
      console.error(err);
      alert(`Error updating capacity threshold: ${err.message}`);
    } finally {
      setSavingThresholdZoneId(null);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden select-none bg-cyber-bg">
      {/* HUD Page Header */}
      <div className="bg-cyber-card border-b border-cyber-border py-3.5 px-6 flex justify-between items-center shrink-0 shadow-md relative z-10">
        <div className="flex items-center gap-3">
          <Cpu className="h-5 w-5 text-cyber-primary animate-pulse" />
          <div>
            <h1 className="font-orbitron font-extrabold text-sm tracking-wider uppercase text-cyber-text flex items-center gap-2">
              Tactical Surveillance Operations Control
            </h1>
            <p className="text-[10px] font-mono text-cyber-muted tracking-widest uppercase">
              Stadium CCTV camera multi-screen matrix & YOLOv8x real-time diagnostics
            </p>
          </div>
        </div>

        {/* Global Scheduler Control */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 border border-cyber-border bg-slate-950 px-3 py-1 rounded-lg">
            <span className="text-[9px] font-mono text-cyber-muted uppercase tracking-wider">AI Scan Engine:</span>
            <button
              onClick={() => setGlobalRealtimeScan(!globalRealtimeScan)}
              className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded border transition-all cursor-pointer ${
                globalRealtimeScan
                  ? 'border-cyber-primary bg-cyber-primary/10 text-cyber-primary font-bold shadow-glow'
                  : 'border-cyber-border text-cyber-muted hover:border-cyber-border-glow'
              }`}
            >
              {globalRealtimeScan ? 'ACTIVE REAL-TIME' : 'PAUSED (MANUAL)'}
            </button>
          </div>

          <button
            onClick={handleScanAll}
            className="bg-cyber-primary text-slate-950 font-orbitron font-bold text-xs uppercase px-4 py-1.5 rounded-lg hover:bg-cyber-primary/90 transition-all shadow-glow active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
          >
            <Zap size={12} />
            Scan All Feeds
          </button>
        </div>
      </div>

      {/* Main Split Layout Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 p-5 min-h-0 overflow-y-auto lg:overflow-hidden">
        
        {/* Left Columns (7/12): Surveillance streams, logs and overlays */}
        <div className="lg:col-span-7 h-full flex flex-col min-h-0 overflow-hidden gap-4">
          
          {/* 2x2 CCTV Grid Container */}
          <div className="flex-1 grid grid-cols-2 gap-4 min-h-0 overflow-hidden">
            {CHANNELS.map((channel, i) => {
              const zone = zones.find(z => z.code === channel.zoneCode) || zones[0];
              return (
                <CCTVCameraFeed
                  key={channel.id}
                  index={i}
                  channel={channel}
                  zone={zone}
                  videoUrl={videoUrls[i]}
                  isPlaying={isPlayings[i]}
                  isMuted={isMuteds[i]}
                  customFileName={customFileNames[i]}
                  isScanning={isScannings[i]}
                  scanProgress={scanProgresses[i]}
                  scanPhase={scanPhases[i]}
                  scanSuccess={scanSuccesses[i]}
                  detectedCount={detectedCounts[i]}
                  simulatedSpeed={simulatedSpeeds[i]}
                  anomalousState={anomalousStates[i]}
                  isSelected={selectedChannelIndex === i}
                  onSelect={() => setSelectedChannelIndex(i)}
                  onTogglePlay={() => handleTogglePlay(i)}
                  onToggleMute={() => handleToggleMute(i)}
                  onFileUpload={(e) => handleFileUpload(i, e)}
                  onRunScan={() => handleSingleScan(i)}
                  onTriggerState={(state) => handleTriggerState(i, state)}
                />
              );
            })}
          </div>

          {/* Unified YOLO Diagnostics Console */}
          <div className="border border-cyber-primary/20 bg-black/75 rounded-xl p-3 font-mono text-[9px] h-[100px] overflow-hidden flex flex-col justify-end text-cyber-primary/95 shrink-0 shadow-inner">
            <div className="text-cyber-muted uppercase tracking-wider text-[8px] border-b border-cyber-border/30 pb-1 mb-1.5 flex justify-between select-none">
              <span className="flex items-center gap-1">
                <Cpu size={10} className="text-cyber-primary animate-pulse" />
                Unified YOLOv8x Real-Time Inference Console
              </span>
              <span className="animate-pulse text-cyber-primary flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-cyber-primary animate-pulse"></span>
                {globalRealtimeScan ? 'SCANNER RUNNING' : 'STANDBY'}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto pr-0.5 flex flex-col gap-0.5 text-[8px] font-mono scrollbar-thin">
              {yoloLogs.slice(-15).map((log, i) => {
                let colorClass = 'text-cyber-primary';
                if (log.type === 'success') colorClass = 'text-cyber-success';
                if (log.type === 'warning') colorClass = 'text-cyber-warning';
                if (log.type === 'danger') colorClass = 'text-cyber-danger';
                return (
                  <div key={i} className="flex gap-1.5 items-start leading-tight">
                    <span className="text-cyber-muted shrink-0">[{log.time}]</span>
                    <span className="text-cyber-vip font-bold shrink-0">{log.label}:</span>
                    <span className={`${colorClass} flex-1 truncate`}>{log.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Controller bar for Selected Camera */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 shrink-0">
            {/* Manual Density Override Injector */}
            <div className="md:col-span-7 bg-cyber-card border border-cyber-border rounded-xl p-4 flex flex-col gap-3 shadow-sm relative">
              <h3 className="text-xs font-orbitron font-bold uppercase tracking-wider text-cyber-text flex items-center gap-1.5">
                <Sliders size={14} className="text-cyber-primary" />
                Active Feed Telemetry Injector
              </h3>
              <p className="text-[9px] font-mono text-cyber-muted uppercase mt-[-4px]">
                Target: {selectedChannel.label} ({selectedZone.name})
              </p>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-[9px] font-mono mb-1 text-cyber-muted">
                    <span>OVERRIDE DENSITY LIMIT:</span>
                    <span className="font-bold text-cyber-primary">{inputDensity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={inputDensity}
                    onChange={(e) => setInputDensity(Number(e.target.value))}
                    disabled={isManualInjecting}
                    className="w-full h-1 bg-cyber-border rounded-lg appearance-none cursor-pointer accent-cyber-primary"
                  />
                </div>

                <button
                  onClick={handleManualTelemetryInjection}
                  disabled={isManualInjecting}
                  className="bg-cyber-primary text-slate-950 font-orbitron text-[10px] font-bold uppercase px-3.5 py-2 rounded-lg hover:bg-cyber-primary/95 transition-all shadow-glow active:scale-[0.97] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {isManualInjecting ? 'INJECTING...' : 'INJECT OVERRIDE'}
                </button>
              </div>

              {isManualInjecting && (
                <div className="border border-cyber-primary/30 bg-slate-950 p-2 rounded flex flex-col gap-1 font-mono text-[8px] mt-1">
                  <div className="flex justify-between text-cyber-primary animate-pulse">
                    <span>{manualInjectPhase}</span>
                    <span>{manualInjectProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div className="bg-cyber-primary h-full transition-all duration-300" style={{ width: `${manualInjectProgress}%` }}></div>
                  </div>
                </div>
              )}

              {manualInjectSuccess && (
                <div className="border border-cyber-success/35 bg-cyber-success/5 p-2 rounded text-[9px] font-mono text-cyber-success flex items-center gap-1 mt-1 animate-pulse">
                  <Check size={10} />
                  <span>Override synced: Set {selectedChannel.zoneCode} density to {inputDensity}%.</span>
                </div>
              )}
            </div>

            {/* Selected Camera Incident Reporter */}
            <div className="md:col-span-5 bg-cyber-card border border-cyber-border rounded-xl p-4 flex flex-col gap-3 shadow-sm justify-between">
              <h3 className="text-xs font-orbitron font-bold uppercase tracking-wider text-cyber-text flex items-center gap-1.5">
                <ShieldAlert size={14} className="text-cyber-danger" />
                Local Incident Simulator
              </h3>

              <div className="text-[9px] font-mono text-cyber-muted uppercase mt-[-5px]">
                Status: {anomalousStates[selectedChannelIndex] !== 'safe' ? (
                  <span className="text-cyber-danger font-bold animate-pulse">INCIDENT ACTIVE ({anomalousStates[selectedChannelIndex].toUpperCase()})</span>
                ) : 'STABLE'}
              </div>

              <button
                onClick={handleIncidentReport}
                disabled={anomalousStates[selectedChannelIndex] === 'safe' || isReportingIncident}
                className={`w-full font-orbitron text-[10px] font-bold uppercase py-2.5 rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer ${
                  anomalousStates[selectedChannelIndex] === 'safe'
                    ? 'bg-cyber-border/40 text-cyber-muted cursor-not-allowed opacity-50 border border-transparent'
                    : anomalousStates[selectedChannelIndex] === 'fight'
                      ? 'bg-cyber-danger text-white hover:bg-cyber-danger/95 shadow-glow-danger'
                      : 'bg-cyber-warning text-white hover:bg-cyber-warning/95 shadow-glow-warning'
                }`}
              >
                {isReportingIncident ? 'SENDING INCIDENT...' : reportSuccess ? 'REPORT FILED' : 'REPORT INCIDENT TO HQ'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (5/12): Capacity Config limits sliders for all 8 zones */}
        <div className="lg:col-span-5 h-full flex flex-col min-h-0 overflow-hidden">
          <Card 
            title="Alarm Configuration Panel" 
            subtitle="Configure Alert Density Boundaries"
            className="flex-1 flex flex-col min-h-0 overflow-hidden shadow-lg border border-cyber-border"
          >
            <div className="flex-1 flex flex-col gap-3.5 overflow-y-auto pr-1">
              {zones.map((zone) => {
                const zoneWarning = warningThresholds[zone.id] ?? zone.warningThreshold;
                const zoneCritical = criticalThresholds[zone.id] ?? zone.criticalThreshold;
                const isSaving = savingThresholdZoneId === zone.id;
                const isSaved = savedSuccessZoneId === zone.id;
                const isZoneMatchedToStream = CHANNELS.some(c => c.zoneCode === zone.code);

                return (
                  <div 
                    key={zone.id} 
                    className={`border p-3 rounded-xl hover:border-cyber-primary/40 transition-all flex flex-col gap-2 relative ${
                      isZoneMatchedToStream 
                        ? 'border-cyber-primary/30 bg-cyber-primary/5' 
                        : 'border-cyber-border/50 bg-cyber-bg/25'
                    }`}
                  >
                    {/* Zone ID and Density */}
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-cyber-primary">{zone.code}</span>
                          {isZoneMatchedToStream && (
                            <span className="text-[7px] font-mono uppercase bg-cyber-primary/20 text-cyber-primary px-1 rounded flex items-center gap-0.5">
                              <Cpu size={6} /> LIVE FEED
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] font-sans text-cyber-muted mt-0.5">{zone.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-end font-mono text-[8px] leading-tight">
                          <span className="text-cyber-muted uppercase">DENSITY:</span>
                          <span className={`font-bold text-xs ${
                            zone.currentDensity >= zoneCritical ? 'text-cyber-danger' : zone.currentDensity >= zoneWarning ? 'text-cyber-warning' : 'text-cyber-success'
                          }`}>
                            {Math.round(zone.currentDensity)}%
                          </span>
                        </div>
                        <Badge variant={zone.riskLevel === 'critical' ? 'red' : zone.riskLevel === 'warning' ? 'amber' : 'green'} className="text-[7px] py-0 px-1 font-mono uppercase">
                          {zone.riskLevel}
                        </Badge>
                      </div>
                    </div>

                    {/* Sliders grid */}
                    <div className="grid grid-cols-2 gap-3.5 mt-0.5 font-mono text-[9px]">
                      {/* Warning Limit */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-cyber-muted">
                          <span>WARN LIMIT:</span>
                          <span className="font-bold text-cyber-warning">{zoneWarning}%</span>
                        </div>
                        <input
                          type="range"
                          min="30"
                          max="90"
                          value={zoneWarning}
                          onChange={(e) => setWarningThresholds({
                            ...warningThresholds,
                            [zone.id]: Number(e.target.value)
                          })}
                          className="w-full h-1 bg-cyber-border rounded-lg appearance-none cursor-pointer accent-cyber-warning"
                        />
                      </div>

                      {/* Critical Limit */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-cyber-muted">
                          <span>CRIT LIMIT:</span>
                          <span className="font-bold text-cyber-danger">{zoneCritical}%</span>
                        </div>
                        <input
                          type="range"
                          min="40"
                          max="100"
                          value={zoneCritical}
                          onChange={(e) => setCriticalThresholds({
                            ...criticalThresholds,
                            [zone.id]: Number(e.target.value)
                          })}
                          className="w-full h-1 bg-cyber-border rounded-lg appearance-none cursor-pointer accent-cyber-danger"
                        />
                      </div>
                    </div>

                    {/* Bottom Status & Save Action */}
                    <div className="flex justify-between items-center border-t border-cyber-border/20 pt-2 mt-1 select-none">
                      <span className="text-[7px] font-mono text-cyber-muted">
                        * Warn must be lower than Crit
                      </span>
                      
                      <button
                        onClick={() => handleSaveThreshold(zone.id)}
                        disabled={isSaving || zoneWarning >= zoneCritical}
                        className={`text-[8px] font-mono uppercase px-2 py-0.5 rounded border flex items-center gap-1 transition-all active:scale-[0.95] cursor-pointer ${
                          isSaved
                            ? 'border-cyber-success bg-cyber-success/10 text-cyber-success font-bold'
                            : zoneWarning >= zoneCritical
                              ? 'border-cyber-border text-cyber-muted cursor-not-allowed opacity-35'
                              : 'border-cyber-primary/45 bg-cyber-primary/5 text-cyber-primary hover:bg-cyber-primary hover:text-slate-950 hover:border-transparent shadow-sm'
                        }`}
                      >
                        {isSaving ? (
                          <RefreshCw size={8} className="animate-spin" />
                        ) : isSaved ? (
                          <Check size={8} />
                        ) : (
                          <Sliders size={8} />
                        )}
                        <span>{isSaving ? 'SAVING' : isSaved ? 'UPDATED' : 'APPLY'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default CCTVScannerManager;
