import React, { useState, useEffect, useRef } from 'react';
import { useDashboardStore } from '../../../shared/store/dashboardStore';
import { Card } from '../../../shared/components/Card';
import { Badge } from '../../../shared/components/Badge';
import { 
  Upload, Play, Pause, RefreshCw, AlertTriangle, 
  Check, ShieldAlert, Cpu, Sliders 
} from 'lucide-react';

const PREDEFINED_FEEDS = [
  { id: 'feed_a', name: 'Gate A Main Turnstiles', url: 'https://assets.mixkit.co/videos/preview/mixkit-people-walking-in-a-crowded-street-34190-large.mp4', defaultCount: 68 },
  { id: 'feed_b', name: 'VIP Lounge Entry', url: 'https://assets.mixkit.co/videos/preview/mixkit-people-in-a-lobby-34298-large.mp4', defaultCount: 15 },
  { id: 'feed_c', name: 'South Stand Exit Bottleneck', url: 'https://assets.mixkit.co/videos/preview/mixkit-crowd-of-people-cross-a-street-in-japan-34284-large.mp4', defaultCount: 92 },
  { id: 'feed_d', name: 'Plaza North Concourse', url: 'https://assets.mixkit.co/videos/preview/mixkit-concourse-of-a-train-station-with-people-34293-large.mp4', defaultCount: 45 }
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

export const CCTVScannerManager: React.FC = () => {
  const { zones } = useDashboardStore();
  
  // Selected Zone
  const [selectedZoneCode, setSelectedZoneCode] = useState<string>('ZONE_A');
  const selectedZone = zones.find(z => z.code === selectedZoneCode) || zones[0];
  
  // Video and Feed State
  const [feedSource, setFeedSource] = useState<string>('feed_a');
  const [videoSrc, setVideoSrc] = useState<string>(PREDEFINED_FEEDS[0].url);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isSimulationMode, setIsSimulationMode] = useState<boolean>(false);
  const [customFileName, setCustomFileName] = useState<string | null>(null);
  
  // CV overlay states
  const [detectedCount, setDetectedCount] = useState<number>(PREDEFINED_FEEDS[0].defaultCount);
  const [simulatedSpeed, setSimulatedSpeed] = useState<number>(1.4);
  const [anomalousState, setAnomalousState] = useState<'safe' | 'fight' | 'gathering'>('safe');
  
  // UI Telemetry injection inputs
  const [inputDensity, setInputDensity] = useState<number>(45);
  const [isInjecting, setIsInjecting] = useState<boolean>(false);
  const [injectionProgress, setInjectionProgress] = useState<number>(0);
  const [injectionPhase, setInjectionPhase] = useState<string>('');
  const [injectionSuccess, setInjectionSuccess] = useState<boolean>(false);
  
  // Incident Reporting State
  const [isReportingIncident, setIsReportingIncident] = useState<boolean>(false);
  const [reportSuccess, setReportSuccess] = useState<boolean>(false);
  
  // Computer Vision mode toggle
  const [isCvMode, setIsCvMode] = useState<boolean>(true);


  // Threshold Override states (local slider states per zone)
  const [warningThresholds, setWarningThresholds] = useState<Record<string, number>>({});
  const [criticalThresholds, setCriticalThresholds] = useState<Record<string, number>>({});
  const [savingThresholdZoneId, setSavingThresholdZoneId] = useState<string | null>(null);
  const [savedSuccessZoneId, setSavedSuccessZoneId] = useState<string | null>(null);

  // Refs for HTML5 elements
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // Initialize threshold values from store when zones load
  useEffect(() => {
    const warningMap: Record<string, number> = {};
    const criticalMap: Record<string, number> = {};
    zones.forEach(z => {
      warningMap[z.id] = z.warningThreshold;
      criticalMap[z.id] = z.criticalThreshold;
    });
    setWarningThresholds(warningMap);
    setCriticalThresholds(criticalMap);
  }, [zones]);

  // Handle feed changes
  const handleFeedChange = (feedId: string) => {
    setFeedSource(feedId);
    setIsSimulationMode(false);
    setCustomFileName(null);
    const feed = PREDEFINED_FEEDS.find(f => f.id === feedId);
    if (feed) {
      setVideoSrc(feed.url);
      setDetectedCount(feed.defaultCount);
      setInputDensity(Math.min(100, Math.round((feed.defaultCount / selectedZone.capacity) * 10000)));
      if (videoRef.current) {
        videoRef.current.load();
        if (isPlaying) videoRef.current.play().catch(() => {});
      }
    }
  };

  // Custom mp4 upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setFeedSource('custom');
      setIsSimulationMode(false);
      setCustomFileName(file.name);
      
      // Seed some random counts for custom files
      const randomCount = Math.floor(Math.random() * 60) + 30;
      setDetectedCount(randomCount);
      setInputDensity(Math.min(100, Math.round((randomCount / selectedZone.capacity) * 10000)));
      
      if (videoRef.current) {
        videoRef.current.load();
        if (isPlaying) videoRef.current.play().catch(() => {});
      }
    }
  };

  // Toggle Video Playback
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // Handle video loading errors (fallback to Pure Canvas simulation)
  const handleVideoError = () => {
    console.warn('[CCTVScanner] Video stream unavailable. Falling back to high-tech canvas vector simulation.');
    setIsSimulationMode(true);
  };

  // Canvas CV Overlay animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let scanlineY = 0;
    let scanDirection = 1;
    
    // Seed particle array representing tracked subjects
    const particles: Particle[] = [];
    const maxParticles = Math.min(150, detectedCount);
    for (let i = 0; i < maxParticles; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        size: Math.random() * 4 + 4,
        id: Math.floor(Math.random() * 9000) + 1000,
        label: Math.random() > 0.92 ? 'VIP' : 'PERSON'
      });
    }

    const drawCVOverlay = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Determine dimensions
      const w = canvas.width;
      const h = canvas.height;

      // 1. Draw Simulated Background if video is unavailable / errored out
      if (isSimulationMode) {
        ctx.fillStyle = '#0b0f19'; // deep slate
        ctx.fillRect(0, 0, w, h);
        
        // Draw decorative grid
        ctx.strokeStyle = 'rgba(79, 70, 229, 0.07)';
        ctx.lineWidth = 1;
        const gridSize = 30;
        for (let x = 0; x < w; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
      }

      // 2. Draw Scanning Target HUD corner brackets
      ctx.strokeStyle = anomalousState === 'safe' ? 'rgba(79, 70, 229, 0.35)' : 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 2;
      const bracketLen = 20;
      const margin = 15;

      // Top Left Bracket
      ctx.beginPath();
      ctx.moveTo(margin, margin + bracketLen);
      ctx.lineTo(margin, margin);
      ctx.lineTo(margin + bracketLen, margin);
      ctx.stroke();

      // Top Right Bracket
      ctx.beginPath();
      ctx.moveTo(w - margin - bracketLen, margin);
      ctx.lineTo(w - margin, margin);
      ctx.lineTo(w - margin, margin + bracketLen);
      ctx.stroke();

      // Bottom Left Bracket
      ctx.beginPath();
      ctx.moveTo(margin, h - margin - bracketLen);
      ctx.lineTo(margin, h - margin);
      ctx.lineTo(margin + bracketLen, h - margin);
      ctx.stroke();

      // Bottom Right Bracket
      ctx.beginPath();
      ctx.moveTo(w - margin - bracketLen, h - margin);
      ctx.lineTo(w - margin, h - margin);
      ctx.lineTo(w - margin, h - margin - bracketLen);
      ctx.stroke();

      // 3. Move and Draw Particle Bounding Boxes (subjects)
      particles.forEach((p, idx) => {
        // Move particles
        p.x += p.vx * (anomalousState === 'fight' ? 2.5 : simulatedSpeed);
        p.y += p.vy * (anomalousState === 'fight' ? 2.5 : simulatedSpeed);

        // Boundary bounce
        if (p.x < 30 || p.x > w - 30) p.vx *= -1;
        if (p.y < 30 || p.y > h - 30) p.vy *= -1;

        // Bounding box dimensions
        const boxW = p.size * 2.8;
        const boxH = p.size * 5.2;

        // Choose color based on state and category
        let color = 'rgba(16, 185, 129, 0.6)'; // safe green
        let label = p.label;

        if (anomalousState === 'fight' && idx < 12) {
          // Altercation highlight
          color = 'rgba(239, 68, 68, 0.8)'; // pulsing red
          label = 'FIGHT / CONFLICT';
        } else if (anomalousState === 'gathering' && idx < 30) {
          // Clustering highlight
          color = 'rgba(245, 158, 11, 0.7)'; // warning amber
          label = 'CROWD_POOL';
        } else if (p.label === 'VIP') {
          color = 'rgba(14, 165, 233, 0.75)'; // VIP Sky blue
        }

        // Draw bounding box
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x - boxW/2, p.y - boxH/2, boxW, boxH);

        // Draw small label above box
        ctx.fillStyle = color;
        ctx.font = '7px monospace';
        ctx.fillText(`${label} #${p.id}`, p.x - boxW/2, p.y - boxH/2 - 4);
      });

      // 4. Draw horizontal scanning laser line
      scanlineY += scanDirection * 1.8;
      if (scanlineY > h - 25) {
        scanlineY = h - 25;
        scanDirection = -1;
      } else if (scanlineY < 25) {
        scanlineY = 25;
        scanDirection = 1;
      }

      ctx.strokeStyle = anomalousState === 'fight' 
        ? 'rgba(239, 68, 68, 0.35)' 
        : 'rgba(79, 70, 229, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(15, scanlineY);
      ctx.lineTo(w - 15, scanlineY);
      ctx.stroke();

      // Laser glowing overlay
      const gradient = ctx.createLinearGradient(0, scanlineY - 4, 0, scanlineY + 4);
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(0.5, anomalousState === 'fight' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(79, 70, 229, 0.08)');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(15, scanlineY - 4, w - 30, 8);

      // 5. HUD System Info overlay in top-left
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(20, 20, 140, 52);
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(20, 20, 140, 52);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '8px monospace';
      ctx.fillText(`CAM FEED: ${selectedZoneCode}_CCTV_01`, 26, 32);
      ctx.fillText(`ANALYST: COGNITIVE_V3`, 26, 42);
      
      ctx.fillStyle = anomalousState === 'fight' ? '#ef4444' : '#10b981';
      ctx.fillText(`HUD: ${anomalousState === 'fight' ? 'CRIT_ALARM' : 'STABLE'}`, 26, 52);
      ctx.fillStyle = '#64748b';
      ctx.fillText(`FPS: 30 / LATENCY: 12ms`, 26, 62);

      // 6. Highlight anomalous zones in red/yellow flash if incident
      if (anomalousState === 'fight') {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.05)';
        ctx.fillRect(0, 0, w, h);
        
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, w, h);

        // Blinking incident text in center
        if (Math.floor(Date.now() / 400) % 2 === 0) {
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText('CRITICAL INCIDENT FLAGGED: ALC_FIGHT_DETECTED', w / 2 - 130, 35);
        }
      } else if (anomalousState === 'gathering') {
        if (Math.floor(Date.now() / 600) % 2 === 0) {
          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText('ANOMALY FLAGGED: RAPID_CROWD_GATHERING', w / 2 - 120, 35);
        }
      }

      // Loop
      animationRef.current = requestAnimationFrame(drawCVOverlay);
    };

    // Trigger loop
    drawCVOverlay();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [detectedCount, selectedZoneCode, isSimulationMode, anomalousState, simulatedSpeed]);

  // Adjust telemetry speeds/counts based on incident triggers
  const triggerNormalState = () => {
    setAnomalousState('safe');
    setSimulatedSpeed(1.4);
    setDetectedCount(feedSource === 'custom' ? 55 : PREDEFINED_FEEDS.find(f => f.id === feedSource)?.defaultCount || 50);
  };

  const triggerFightState = () => {
    setAnomalousState('fight');
    setSimulatedSpeed(3.8); // high movement speed (running/struggling)
    setDetectedCount(prev => Math.min(120, Math.max(35, prev)));
  };

  const triggerGatheringState = () => {
    setAnomalousState('gathering');
    setSimulatedSpeed(0.6); // slow movement speed (congestion)
    setDetectedCount(prev => Math.min(150, Math.max(80, prev + 25))); // increase count
  };

  // Inject Telemetry Feed: call PATCH /api/zones/code/{code}/density?density={density} or POST /api/zones/code/{code}/analyze-feed
  const handleTelemetryInjection = async () => {
    setIsInjecting(true);
    setInjectionSuccess(false);
    setInjectionProgress(15);

    if (isCvMode) {
      setInjectionPhase('Downloading / Streaming CCTV buffer...');
      try {
        // Step 1: Trigger CV analysis request
        const resPromise = fetch(`http://localhost:8000/api/zones/code/${selectedZoneCode}/analyze-feed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ video_url: videoSrc })
        });

        // Step 2: Simulate analysis progress steps for smooth UI feedback while API works
        await new Promise(r => setTimeout(r, 600));
        setInjectionProgress(45);
        setInjectionPhase('Processing frames via OpenCV image decoders...');

        await new Promise(r => setTimeout(r, 600));
        setInjectionProgress(75);
        setInjectionPhase('Executing object detection classification (counting subjects)...');

        await new Promise(r => setTimeout(r, 500));
        setInjectionProgress(90);
        setInjectionPhase('Calculating optical flow velocity vectors...');

        // Step 3: Resolve the API response
        const res = await resPromise;
        if (!res.ok) {
          throw new Error('API failed to run video analysis.');
        }

        const data = await res.json();
        
        // Update states based on real CV results
        setDetectedCount(data.detected_count);
        setInputDensity(Math.round(data.density));
        
        // Set speed velocity estimation
        if (data.movement_speed === 'normal') {
          setSimulatedSpeed(1.5);
        } else if (data.movement_speed === 'slow') {
          setSimulatedSpeed(0.8);
        } else {
          setSimulatedSpeed(0.2);
        }

        // Set anomaly trigger state
        setAnomalousState(data.anomaly);

        setInjectionProgress(100);
        setInjectionPhase(data.anomaly !== 'safe' 
          ? `Analysis Completed! Flagged anomaly: ${data.anomaly.toUpperCase()}`
          : 'Analysis Completed! Safe status synchronized.'
        );
        setInjectionSuccess(true);

        // Auto-clear success message after 4s
        setTimeout(() => {
          setInjectionSuccess(false);
          setIsInjecting(false);
        }, 4000);

      } catch (err: any) {
        console.error(err);
        setInjectionPhase(`Error: ${err.message || 'Server unresponsive'}`);
        setTimeout(() => setIsInjecting(false), 5000);
      }
    } else {
      setInjectionPhase('Injecting manual density override...');
      try {
        await new Promise(r => setTimeout(r, 400));
        setInjectionProgress(50);
        setInjectionPhase('Syncing manual inputs...');

        const res = await fetch(`http://localhost:8000/api/zones/code/${selectedZoneCode}/density?density=${inputDensity}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!res.ok) {
          throw new Error('API request failed to inject telemetry.');
        }

        await new Promise(r => setTimeout(r, 400));
        setInjectionProgress(100);
        setInjectionPhase('Manual telemetry synchronized successfully!');
        setInjectionSuccess(true);
        
        setTimeout(() => {
          setInjectionSuccess(false);
          setIsInjecting(false);
        }, 4000);

      } catch (err: any) {
        console.error(err);
        setInjectionPhase(`Error: ${err.message || 'Server unresponsive'}`);
        setTimeout(() => setIsInjecting(false), 5000);
      }
    }
  };


  // Report incident: call POST /api/zones/code/{code}/unusual-activity
  const handleIncidentReport = async () => {
    if (anomalousState === 'safe') return;

    setIsReportingIncident(true);
    setReportSuccess(false);

    const activityType = anomalousState === 'fight' ? 'fight' : 'rapid_gathering';
    const details = activityType === 'fight' 
      ? 'Surveillance Camera detected 2 active combatants near Sector corridor entrance. Crowd dispersing rapidly.'
      : 'Surveillance Camera detected dense pooling of individuals exceeding 20 persons within 60 seconds.';

    try {
      const res = await fetch(`http://localhost:8000/api/zones/code/${selectedZoneCode}/unusual-activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          activity_type: activityType,
          details: details,
          severity: 'high'
        })
      });

      if (!res.ok) {
        throw new Error('API request failed to submit incident.');
      }

      setReportSuccess(true);
      
      // Auto-clear success badge
      setTimeout(() => {
        setReportSuccess(false);
        setIsReportingIncident(false);
      }, 3000);

    } catch (err) {
      console.error(err);
      setIsReportingIncident(false);
    }
  };

  // Update Threshold Override: call PATCH /api/zones/{zone_id}/thresholds
  const handleSaveThreshold = async (zoneId: string) => {
    setSavingThresholdZoneId(zoneId);
    setSavedSuccessZoneId(null);

    const warning = warningThresholds[zoneId];
    const critical = criticalThresholds[zoneId];

    try {
      const res = await fetch(`http://localhost:8000/api/zones/${zoneId}/thresholds`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          warning_threshold: warning,
          critical_threshold: critical
        })
      });

      if (!res.ok) {
        throw new Error('Failed to update capacity thresholds.');
      }

      setSavedSuccessZoneId(zoneId);
      setTimeout(() => setSavedSuccessZoneId(null), 3000);

    } catch (err) {
      console.error(err);
      alert(`Error updating threshold: ${(err as any).message}`);
    } finally {
      setSavingThresholdZoneId(null);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden select-none bg-cyber-bg">
      {/* HUD Header */}
      <div className="bg-cyber-card border-b border-cyber-border py-3 px-6 flex justify-between items-center shrink-0 shadow-sm relative z-10">
        <div className="flex items-center gap-2.5">
          <Cpu className="h-5 w-5 text-cyber-primary" />
          <div>
            <h1 className="font-orbitron font-extrabold text-sm tracking-wider uppercase text-cyber-text flex items-center gap-2">
              Surveillance Scanner & Diagnostics Hub
            </h1>
            <p className="text-[10px] font-mono text-cyber-muted tracking-widest uppercase">
              tactical cctv telemetry injection & threshold configurations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={selectedZone.riskLevel === 'critical' ? 'red' : selectedZone.riskLevel === 'warning' ? 'amber' : 'green'} className="text-[10px] font-mono uppercase px-2">
            Selected: {selectedZone.code} ({selectedZone.riskLevel})
          </Badge>
        </div>
      </div>

      {/* Main Grid split */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 p-5 min-h-0 overflow-y-auto lg:overflow-hidden">
        
        {/* Left Side: CCTV Live HUD scanning and telemetry inputs (7 cols) */}
        <div className="lg:col-span-7 h-full flex flex-col min-h-0 overflow-hidden gap-4">
          <Card 
            title="AI Surveillance Stream" 
            subtitle="Live Object Tracking & Telemetry Simulator"
            className="flex-1 flex flex-col min-h-0 overflow-hidden relative"
          >
            {/* Control bar: Zone Select and video file selector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 shrink-0">
              {/* Zone Dropdown */}
              <div>
                <label className="text-[9px] font-mono text-cyber-muted uppercase block mb-1">Target Zone Sector</label>
                <select 
                  value={selectedZoneCode}
                  onChange={(e) => setSelectedZoneCode(e.target.value)}
                  className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-xs font-mono text-cyber-text focus:outline-none focus:border-cyber-primary"
                >
                  {zones.map(z => (
                    <option key={z.id} value={z.code}>{z.code} - {z.name}</option>
                  ))}
                </select>
              </div>

              {/* Predefined feed selection */}
              <div>
                <label className="text-[9px] font-mono text-cyber-muted uppercase block mb-1">CCTV Stream Feed</label>
                <select 
                  value={feedSource}
                  onChange={(e) => handleFeedChange(e.target.value)}
                  className="w-full bg-cyber-bg border border-cyber-border rounded px-2 py-1 text-xs font-mono text-cyber-text focus:outline-none focus:border-cyber-primary"
                >
                  {PREDEFINED_FEEDS.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                  {customFileName && <option value="custom">Custom: {customFileName.substring(0, 15)}...</option>}
                </select>
              </div>

              {/* Local File Uploader */}
              <div>
                <label className="text-[9px] font-mono text-cyber-muted uppercase block mb-1">Upload Crowd Video</label>
                <div className="relative">
                  <input 
                    type="file" 
                    id="video-uploader"
                    accept="video/*" 
                    onChange={handleFileUpload} 
                    className="hidden" 
                  />
                  <label 
                    htmlFor="video-uploader"
                    className="w-full bg-cyber-bg border border-dashed border-cyber-border hover:border-cyber-primary rounded px-2 py-1 text-xs font-mono text-cyber-muted hover:text-cyber-primary flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Upload size={12} />
                    <span>Upload .mp4 / .mov</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Main Video Area with Canvas HUD Overlay */}
            <div className="flex-1 bg-slate-950 border border-cyber-border rounded-xl relative overflow-hidden flex items-center justify-center min-h-[220px]">
              {/* HTML5 Video element */}
              {!isSimulationMode && (
                <video
                  ref={videoRef}
                  src={videoSrc}
                  loop
                  muted
                  autoPlay
                  onError={handleVideoError}
                  className="w-full h-full object-cover"
                />
              )}

              {/* High-tech Canvas overlay */}
              <canvas
                ref={canvasRef}
                width={640}
                height={360}
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
              />

              {/* Errored stream HUD indicator */}
              {isSimulationMode && (
                <div className="absolute top-4 right-4 flex items-center gap-1 bg-cyber-warning/10 border border-cyber-warning/30 px-2 py-0.5 rounded text-[8px] font-mono text-cyber-warning tracking-wider z-20 animate-pulse">
                  <AlertTriangle size={10} />
                  <span>PREVIEW FALLBACK: VECTOR SIM</span>
                </div>
              )}

              {/* Camera metadata tags on corner */}
              <div className="absolute bottom-4 left-4 z-20 flex gap-2">
                <button
                  onClick={togglePlay}
                  className="bg-black/60 hover:bg-black/80 text-white border border-white/20 p-1 rounded-md backdrop-blur transition-all active:scale-90 cursor-pointer"
                  title={isPlaying ? 'Pause Feed' : 'Play Feed'}
                >
                  {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                </button>
                <div className="bg-black/60 border border-white/20 px-2.5 py-0.5 rounded text-[9px] font-mono text-white/90 backdrop-blur flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyber-danger animate-pulse"></span>
                  <span>LIVE CAM SCANNER // {selectedZoneCode}</span>
                </div>
              </div>
            </div>

            {/* Bottom HUD: Live CV Telemetry outputs */}
            <div className="grid grid-cols-4 gap-2 border border-cyber-border/60 bg-cyber-bg/40 p-2.5 rounded-lg mt-3 shrink-0 font-mono text-[10px]">
              <div>
                <span className="text-cyber-muted block uppercase">Detected Count:</span>
                <span className="text-sm font-bold font-orbitron text-cyber-text">{detectedCount} pax</span>
              </div>
              <div>
                <span className="text-cyber-muted block uppercase">CV Flow Velocity:</span>
                <span className="text-sm font-bold font-orbitron text-cyber-primary">{simulatedSpeed.toFixed(1)} m/s</span>
              </div>
              <div>
                <span className="text-cyber-muted block uppercase">Confidence Index:</span>
                <span className="text-sm font-bold font-orbitron text-cyber-success">98.4%</span>
              </div>
              <div>
                <span className="text-cyber-muted block uppercase">Anomalous Activity:</span>
                <span className={`text-sm font-bold font-orbitron uppercase flex items-center gap-1 ${
                  anomalousState === 'fight' ? 'text-cyber-danger animate-pulse' : anomalousState === 'gathering' ? 'text-cyber-warning' : 'text-cyber-success'
                }`}>
                  {anomalousState === 'fight' ? 'FIGHT DETECTED' : anomalousState === 'gathering' ? 'RAPID GATHER' : 'NONE (SAFE)'}
                </span>
              </div>
            </div>
          </Card>

          {/* Telemetry Injector Controls */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 shrink-0">
            
            {/* Sub-panel 1: Inject Density Telemetry (7/12 width) */}
            <div className="md:col-span-7 bg-cyber-card border border-cyber-border rounded-xl p-4 flex flex-col gap-3 shadow-sm">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-orbitron font-bold uppercase tracking-wider text-cyber-text flex items-center gap-1.5">
                  <Cpu size={14} className="text-cyber-primary" />
                  Telemetry Feed Injector
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-cyber-muted uppercase">CV Engine:</span>
                  <button
                    onClick={() => setIsCvMode(!isCvMode)}
                    disabled={isInjecting}
                    className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded border transition-all cursor-pointer ${
                      isCvMode
                        ? 'border-cyber-primary bg-cyber-primary/15 text-cyber-primary font-bold shadow-glow-primary'
                        : 'border-cyber-border text-cyber-muted hover:border-cyber-border-glow'
                    }`}
                  >
                    {isCvMode ? 'ON (OpenCV/YOLO)' : 'OFF (Manual)'}
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  {isCvMode ? (
                    <div className="text-[10px] font-mono text-cyber-muted py-1 flex items-center gap-2 bg-cyber-bg/30 px-3 rounded-lg border border-cyber-border/40 min-h-[34px]">
                      <Cpu size={12} className="text-cyber-primary animate-pulse shrink-0" />
                      <span>Processing raw MP4 frames to calculate crowd count & flow metrics.</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-[10px] font-mono mb-1 text-cyber-muted">
                        <span>SIMULATED CROWD DENSITY:</span>
                        <span className="font-bold text-cyber-primary">{inputDensity}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={inputDensity}
                        onChange={(e) => setInputDensity(Number(e.target.value))}
                        disabled={isInjecting}
                        className="w-full h-1.5 bg-cyber-border rounded-lg appearance-none cursor-pointer accent-cyber-primary"
                      />
                    </>
                  )}
                </div>
                
                <button
                  onClick={handleTelemetryInjection}
                  disabled={isInjecting}
                  className="bg-cyber-primary text-white font-orbitron text-xs font-bold uppercase px-4 py-2 rounded-lg hover:bg-cyber-primary/95 transition-all shadow-glow active:scale-[0.97] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {isInjecting ? 'SCANNING...' : isCvMode ? 'RUN CV ANALYTICS' : 'INJECT FEED'}
                </button>
              </div>


              {/* Progress HUD overlay */}
              {isInjecting && (
                <div className="mt-1 border border-cyber-border-glow bg-cyber-bg p-2 rounded flex flex-col gap-1.5 font-mono text-[9px]">
                  <div className="flex justify-between text-cyber-muted">
                    <span>{injectionPhase}</span>
                    <span className="font-bold">{injectionProgress}%</span>
                  </div>
                  <div className="w-full bg-cyber-border h-1 rounded-full overflow-hidden">
                    <div 
                      className="bg-cyber-primary h-full transition-all duration-300"
                      style={{ width: `${injectionProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {injectionSuccess && (
                <div className="border border-cyber-success/35 bg-cyber-success/5 p-2 rounded text-[10px] font-mono text-cyber-success flex items-center gap-1.5 animate-pulse">
                  <Check size={12} />
                  <span>Success: Synchronized {inputDensity}% density feed into {selectedZoneCode} model buffer.</span>
                </div>
              )}
            </div>

            {/* Sub-panel 2: Incident Simulation Triggers (5/12 width) */}
            <div className="md:col-span-5 bg-cyber-card border border-cyber-border rounded-xl p-4 flex flex-col gap-3 shadow-sm justify-between">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-orbitron font-bold uppercase tracking-wider text-cyber-text flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-cyber-danger" />
                  Incident Simulator
                </h3>
              </div>

              {/* State selectors */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={triggerNormalState}
                  className={`text-[9px] font-mono uppercase py-1 border rounded transition-all cursor-pointer ${
                    anomalousState === 'safe' 
                      ? 'border-cyber-success bg-cyber-success/15 text-cyber-success font-bold' 
                      : 'border-cyber-border text-cyber-muted hover:border-cyber-border-glow hover:text-cyber-text'
                  }`}
                >
                  Normal
                </button>
                <button
                  onClick={triggerGatheringState}
                  className={`text-[9px] font-mono uppercase py-1 border rounded transition-all cursor-pointer ${
                    anomalousState === 'gathering' 
                      ? 'border-cyber-warning bg-cyber-warning/15 text-cyber-warning font-bold' 
                      : 'border-cyber-border text-cyber-muted hover:border-cyber-border-glow hover:text-cyber-text'
                  }`}
                >
                  Gathering
                </button>
                <button
                  onClick={triggerFightState}
                  className={`text-[9px] font-mono uppercase py-1 border rounded transition-all cursor-pointer ${
                    anomalousState === 'fight' 
                      ? 'border-cyber-danger bg-cyber-danger/15 text-cyber-danger font-bold' 
                      : 'border-cyber-border text-cyber-muted hover:border-cyber-border-glow hover:text-cyber-text'
                  }`}
                >
                  Fight / Conflict
                </button>
              </div>

              {/* Action trigger button */}
              <button
                onClick={handleIncidentReport}
                disabled={anomalousState === 'safe' || isReportingIncident}
                className={`w-full font-orbitron text-xs font-bold uppercase py-2 rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer ${
                  anomalousState === 'safe'
                    ? 'bg-cyber-border text-cyber-muted cursor-not-allowed opacity-50'
                    : anomalousState === 'fight'
                      ? 'bg-cyber-danger text-white hover:bg-cyber-danger/95 shadow-glow-danger'
                      : 'bg-cyber-warning text-white hover:bg-cyber-warning/95 shadow-glow-warning'
                }`}
              >
                {isReportingIncident ? 'REPORTING...' : reportSuccess ? 'REPORT SENT' : 'REPORT INCIDENT TO HQ'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Capacity Overrides sliders for all 8 zones (5 cols) */}
        <div className="lg:col-span-5 h-full flex flex-col min-h-0 overflow-hidden">
          <Card 
            title="Capacity Boundaries Config" 
            subtitle="Set Segment Alarm Threshold Limits"
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
              {zones.map((zone) => {
                const zoneWarning = warningThresholds[zone.id] ?? zone.warningThreshold;
                const zoneCritical = criticalThresholds[zone.id] ?? zone.criticalThreshold;
                const isSaving = savingThresholdZoneId === zone.id;
                const isSaved = savedSuccessZoneId === zone.id;

                return (
                  <div 
                    key={zone.id} 
                    className="border border-cyber-border/50 bg-cyber-bg/20 p-3.5 rounded-xl hover:border-cyber-border-glow transition-all flex flex-col gap-3 relative group"
                  >
                    {/* Zone Info header */}
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-bold text-cyber-primary">{zone.code}</span>
                        <span className="text-[10px] font-sans text-cyber-muted mt-0.5">{zone.name}</span>
                      </div>
                      
                      {/* Current telemetry badge */}
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-end font-mono text-[9px]">
                          <span className="text-cyber-muted">DENSITY:</span>
                          <span className={`font-bold ${
                            zone.currentDensity >= zoneCritical ? 'text-cyber-danger' : zone.currentDensity >= zoneWarning ? 'text-cyber-warning' : 'text-cyber-success'
                          }`}>
                            {Math.round(zone.currentDensity)}%
                          </span>
                        </div>
                        <Badge variant={zone.riskLevel === 'critical' ? 'red' : zone.riskLevel === 'warning' ? 'amber' : 'green'} className="text-[8px] py-0">
                          {zone.riskLevel}
                        </Badge>
                      </div>
                    </div>

                    {/* Sldiers layout */}
                    <div className="grid grid-cols-2 gap-3.5 mt-1 font-mono text-[10px]">
                      {/* Warning Slider */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-cyber-muted">
                          <span>WARNING:</span>
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

                      {/* Critical Slider */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-cyber-muted">
                          <span>CRITICAL:</span>
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
                    <div className="flex justify-between items-center border-t border-cyber-border/30 pt-2 mt-1 select-none">
                      <div className="flex items-center gap-1 text-[8px] font-mono text-cyber-muted">
                        <Sliders size={10} />
                        <span>Warning must be less than Critical</span>
                      </div>
                      
                      <button
                        onClick={() => handleSaveThreshold(zone.id)}
                        disabled={isSaving || zoneWarning >= zoneCritical}
                        className={`text-[9px] font-mono uppercase px-2.5 py-1 rounded border flex items-center gap-1 transition-all active:scale-[0.95] cursor-pointer ${
                          isSaved
                            ? 'border-cyber-success bg-cyber-success/15 text-cyber-success font-bold'
                            : zoneWarning >= zoneCritical
                              ? 'border-cyber-border text-cyber-muted cursor-not-allowed opacity-40'
                              : 'border-cyber-primary/45 bg-cyber-primary/5 text-cyber-primary hover:bg-cyber-primary hover:text-white hover:border-transparent'
                        }`}
                      >
                        {isSaving ? (
                          <RefreshCw size={10} className="animate-spin" />
                        ) : isSaved ? (
                          <Check size={10} />
                        ) : (
                          <Sliders size={10} />
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
