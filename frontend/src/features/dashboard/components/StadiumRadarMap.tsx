import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Shape, Line, Circle, Star, Group, Text } from 'react-konva';
import { useDashboardStore } from '../../../shared/store/dashboardStore';
import { Badge } from '../../../shared/components/Badge';
import { Eye, Crosshair } from 'lucide-react';

interface RadarMapProps {
  className?: string;
}

// Coordinate configuration
const CENTER_X = 200;
const CENTER_Y = 200;
const RADAR_RADIUS = 180;
const ZONE_OUTER_R = 150;
const ZONE_INNER_R = 95;

// Sector degree bounds (45-degree slices centered around directional bisectors)
const SECTORS_CONFIG = [
  { code: 'ZONE_C', name: 'VIP East Lounge', start: -22.5, end: 22.5, angle: 0 },
  { code: 'ZONE_D', name: 'Lower Deck South', start: 22.5, end: 67.5, angle: 45 },
  { code: 'ZONE_E', name: 'Upper Deck West', start: 67.5, end: 112.5, angle: 90 },
  { code: 'ZONE_F', name: 'Gate F Plaza', start: 112.5, end: 157.5, angle: 135 },
  { code: 'ZONE_G', name: 'Food Court West', start: 157.5, end: 202.5, angle: 180 },
  { code: 'ZONE_H', name: 'Press & Media Deck', start: 202.5, end: 247.5, angle: 225 },
  { code: 'ZONE_A', name: 'Gate A Entrance', start: 247.5, end: 292.5, angle: 270 },
  { code: 'ZONE_B', name: 'North Concourse', start: 292.5, end: 337.5, angle: 315 },
];

export const StadiumRadarMap: React.FC<RadarMapProps> = ({ className = '' }) => {
  const { zones, emergencyMode, vipMovements, routes } = useDashboardStore();
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [sweepAngle, setSweepAngle] = useState(0);
  const [pulseScale, setPulseScale] = useState(1);
  const animationFrameId = useRef<number | null>(null);

  // 1. SONAR continuous sweep animation
  useEffect(() => {
    const animateSweep = () => {
      setSweepAngle((prev) => (prev + 0.8) % 360);
      animationFrameId.current = requestAnimationFrame(animateSweep);
    };
    animationFrameId.current = requestAnimationFrame(animateSweep);
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, []);

  // 2. VIP/Security target breathing pulse animation
  useEffect(() => {
    let growing = true;
    const interval = setInterval(() => {
      setPulseScale((prev) => {
        if (growing) {
          if (prev >= 1.25) {
            growing = false;
            return prev - 0.02;
          }
          return prev + 0.02;
        } else {
          if (prev <= 0.85) {
            growing = true;
            return prev + 0.02;
          }
          return prev - 0.02;
        }
      });
    }, 40);
    return () => clearInterval(interval);
  }, []);

  const getZoneColor = (code: string, isHovered: boolean) => {
    const zone = zones.find((z) => z.code === code);
    if (!zone) return { fill: 'rgba(16, 185, 129, 0.04)', stroke: '#10b981' };

    const isCritical = emergencyMode || zone.riskLevel === 'critical';
    const isWarning = zone.riskLevel === 'warning';

    if (isCritical) {
      return {
        fill: isHovered ? 'rgba(239, 68, 68, 0.16)' : 'rgba(239, 68, 68, 0.06)',
        stroke: isHovered ? '#31d7c6' : '#fb5a67',
      };
    }
    if (isWarning) {
      return {
        fill: isHovered ? 'rgba(245, 158, 11, 0.16)' : 'rgba(245, 158, 11, 0.05)',
        stroke: isHovered ? '#31d7c6' : '#f6c453',
      };
    }
    return {
      fill: isHovered ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.04)',
      stroke: isHovered ? '#31d7c6' : '#34d399',
    };
  };

  const degToRad = (degrees: number) => (degrees * Math.PI) / 180;

  return (
    <div className={`cyber-panel h-full flex flex-col relative overflow-hidden min-h-[400px] ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(49,215,198,0.11),transparent_48%)] pointer-events-none"></div>
      
      <div className="absolute top-4 left-5 z-10 flex flex-col font-mono text-[9px] text-cyber-muted gap-0.5 pointer-events-none select-none">
        <div className="flex items-center gap-1.5 text-cyber-primary font-bold text-[11px] tracking-wider uppercase font-orbitron">
          <Eye size={12} className="animate-pulse" />
          <span>Live Stadium Radar</span>
        </div>
        <span>8 sectors / CCTV telemetry / VIP route pins</span>
        <span>Status integrity: online</span>
      </div>

      <div className="absolute top-4 right-5 z-10 flex gap-2 pointer-events-none select-none">
        <Badge variant={emergencyMode ? 'red' : 'cyan'} pulse className="text-[9px] font-orbitron uppercase">
          {emergencyMode ? 'EVACUATION ACTIVE' : 'RADAR SWEEP ACTIVE'}
        </Badge>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex items-center justify-center relative p-8 pt-14">
        <Stage width={400} height={400} className="w-[360px] h-[360px]">
          <Layer>
            
            {/* 1. Radar Grid Concentric Background Lines */}
            <Circle x={CENTER_X} y={CENTER_Y} radius={RADAR_RADIUS} stroke="rgba(49, 215, 198, 0.15)" strokeWidth={1} />
            <Circle x={CENTER_X} y={CENTER_Y} radius={ZONE_OUTER_R} stroke="rgba(49, 215, 198, 0.12)" strokeWidth={1} />
            <Circle x={CENTER_X} y={CENTER_Y} radius={ZONE_INNER_R} stroke="rgba(49, 215, 198, 0.16)" strokeWidth={1} strokeDasharray={[4, 4]} />
            <Circle x={CENTER_X} y={CENTER_Y} radius={45} stroke="rgba(49, 215, 198, 0.13)" strokeWidth={1} strokeDasharray={[2, 2]} />
            
            {/* Axis crosshair lines */}
            <Line points={[CENTER_X - RADAR_RADIUS, CENTER_Y, CENTER_X + RADAR_RADIUS, CENTER_Y]} stroke="rgba(49, 215, 198, 0.10)" strokeWidth={1} />
            <Line points={[CENTER_X, CENTER_Y - RADAR_RADIUS, CENTER_X, CENTER_Y + RADAR_RADIUS]} stroke="rgba(49, 215, 198, 0.10)" strokeWidth={1} />

            {/* 2. Concentric Sonar Scanner Sweeper */}
            <Shape
              sceneFunc={(context, shape) => {
                context.beginPath();
                context.moveTo(CENTER_X, CENTER_Y);
                // Draw 60-degree radar sonar wedge
                const startSweepRad = degToRad(sweepAngle - 60);
                const endSweepRad = degToRad(sweepAngle);
                context.arc(CENTER_X, CENTER_Y, RADAR_RADIUS, startSweepRad, endSweepRad, false);
                context.closePath();
                
                const grad = context.createRadialGradient(CENTER_X, CENTER_Y, 0, CENTER_X, CENTER_Y, RADAR_RADIUS);
                grad.addColorStop(0, 'rgba(49, 215, 198, 0.16)');
                grad.addColorStop(0.8, 'rgba(49, 215, 198, 0.04)');
                grad.addColorStop(1, 'rgba(49, 215, 198, 0.0)');
                
                context.fillStyle = grad;
                context.fillStrokeShape(shape);
              }}
            />

            {/* 3. 8 Interactive Concentric Sectors */}
            {SECTORS_CONFIG.map((sector) => {
              const colors = getZoneColor(sector.code, hoveredZone === sector.code);
              const startRad = degToRad(sector.start);
              const endRad = degToRad(sector.end);
              const midAngleRad = degToRad(sector.angle);
              
              // Centered coordinate calculation inside the sector segment
              const textDist = 120;
              const textX = CENTER_X + textDist * Math.cos(midAngleRad);
              const textY = CENTER_Y + textDist * Math.sin(midAngleRad);

              return (
                <Group key={sector.code}>
                  {/* Dynamic Interactive Segment Shape */}
                  <Shape
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth={hoveredZone === sector.code ? 2.5 : 1.5}
                    shadowColor={colors.stroke}
                    shadowBlur={hoveredZone === sector.code ? 6 : 0}
                    shadowOpacity={0.3}
                    cursor="pointer"
                    onMouseEnter={() => setHoveredZone(sector.code)}
                    onMouseLeave={() => setHoveredZone(null)}
                    onClick={() => {
                      // Emit local simulated click or scrolling logic to focus Zone Card on left panel
                      const element = document.getElementById(`zone-${sector.code}`);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                    sceneFunc={(context, shape) => {
                      context.beginPath();
                      context.arc(CENTER_X, CENTER_Y, ZONE_OUTER_R, startRad, endRad, false);
                      context.lineTo(
                        CENTER_X + ZONE_INNER_R * Math.cos(endRad),
                        CENTER_Y + ZONE_INNER_R * Math.sin(endRad)
                      );
                      context.arc(CENTER_X, CENTER_Y, ZONE_INNER_R, endRad, startRad, true);
                      context.closePath();
                      context.fillStrokeShape(shape);
                    }}
                  />
                  
                  {/* Sector Typography Tag */}
                  <Text
                    x={textX - 25}
                    y={textY - 5}
                    text={sector.code.replace('ZONE_', 'SEC ')}
                    fontFamily="Space Mono, monospace"
                    fontSize={8}
                    fontStyle="bold"
                    fill={colors.stroke}
                    align="center"
                    width={50}
                    listening={false}
                  />
                </Group>
              );
            })}

            {/* 4. Architectural Stadium Center Outline */}
            <Group listening={false}>
              {/* Inner Grass Pitch Ring */}
              <Shape
                fill="rgba(255, 255, 255, 0.08)"
                stroke="rgba(255, 255, 255, 0.25)"
                strokeWidth={1.5}
                sceneFunc={(context, shape) => {
                  context.beginPath();
                  context.ellipse(CENTER_X, CENTER_Y, 65, 40, 0, 0, Math.PI * 2);
                  context.closePath();
                  context.fillStrokeShape(shape);
                }}
              />
              <Shape
                stroke="rgba(49, 215, 198, 0.22)"
                strokeWidth={1}
                sceneFunc={(context, shape) => {
                  context.beginPath();
                  context.ellipse(CENTER_X, CENTER_Y, 52, 28, 0, 0, Math.PI * 2);
                  context.closePath();
                  context.fillStrokeShape(shape);
                }}
              />
              {/* Core target crosshair center dot */}
              <Circle x={CENTER_X} y={CENTER_Y} radius={8} stroke="rgba(49, 215, 198, 0.38)" strokeWidth={1} />
              <Circle x={CENTER_X} y={CENTER_Y} radius={2} fill="#31d7c6" />
            </Group>

            {/* 5. Glowing Route Overlays Flow (renders evacuation egress lines in emergency mode) */}
            {emergencyMode && (
              <Group listening={false}>
                {/* Evacuation egress flow path lines starting from Zone D flowing outwards */}
                <Shape
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray={[4, 4]}
                  sceneFunc={(context, shape) => {
                    context.beginPath();
                    // Line 1: Flow from East (0 rad) down to south egress exit (PI/2 rad)
                    context.moveTo(CENTER_X + 115 * Math.cos(degToRad(30)), CENTER_Y + 115 * Math.sin(degToRad(30)));
                    context.quadraticCurveTo(CENTER_X + 130, CENTER_Y + 130, CENTER_X, CENTER_Y + 175);
                    
                    // Line 2: Flow from West (PI rad) down to south egress exit
                    context.moveTo(CENTER_X + 115 * Math.cos(degToRad(150)), CENTER_Y + 115 * Math.sin(degToRad(150)));
                    context.quadraticCurveTo(CENTER_X - 130, CENTER_Y + 130, CENTER_X, CENTER_Y + 175);
                    context.fillStrokeShape(shape);
                  }}
                />
                <Circle x={CENTER_X} y={CENTER_Y + 175} radius={5} fill="#ef4444" />
                <Text
                  x={CENTER_X - 50}
                  y={CENTER_Y + 185}
                  text="PRIMARY EGRESS"
                  fontFamily="Space Mono, monospace"
                  fontSize={7}
                  fontStyle="bold"
                  fill="#ef4444"
                  align="center"
                  width={100}
                />
              </Group>
            )}

            {/* 6. Active VIP Target Pins and Security Convoy Telemetry */}
            {vipMovements
              .filter(vip => vip.movementStatus === 'active')
              .map((vip, index) => {
                const route = routes.find(r => r.id === vip.primaryRouteId);
                const zone = zones.find(z => z.id === route?.fromZoneId);
                if (!zone) return null;
                
                const sector = SECTORS_CONFIG.find(s => s.code === zone.code);
                if (!sector) return null;
                
                const baseRadius = 120;
                const radius = baseRadius + (index * 15);
                const midAngleRad = degToRad(sector.angle);
                
                const x = CENTER_X + radius * Math.cos(midAngleRad);
                const y = CENTER_Y + radius * Math.sin(midAngleRad);
                
                return (
                  <Group key={vip.id} x={x} y={y} listening={false}>
                    <Circle radius={10 * pulseScale} stroke="#0ea5e9" strokeWidth={0.8} opacity={0.6} />
                    <Circle radius={16 * pulseScale} stroke="#0ea5e9" strokeWidth={0.5} opacity={0.3} />
                    <Star
                      numPoints={5}
                      innerRadius={3}
                      outerRadius={6}
                      fill="#0ea5e9"
                      stroke="#ffffff"
                      strokeWidth={0.5}
                    />
                    <Text
                      x={-40}
                      y={18}
                      text={vip.vipName.split(' ')[0]}
                      fontFamily="Space Mono, monospace"
                      fontSize={8}
                      fontStyle="bold"
                      fill="#0ea5e9"
                      align="center"
                      width={80}
                    />
                  </Group>
                );
              })
            }

            {/* Security Team Alpha Indicator - located inside South Deck segment (Zone D) */}
            <Group x={CENTER_X + 120 * Math.cos(degToRad(50))} y={CENTER_Y + 120 * Math.sin(degToRad(50))} listening={false}>
              <Circle radius={8 * pulseScale} stroke="#10b981" strokeWidth={0.8} opacity={0.6} />
              <Circle radius={3} fill="#10b981" stroke="#ffffff" strokeWidth={0.5} />
            </Group>

          </Layer>
        </Stage>
      </div>

      {/* Bottom map diagnostics coordinates */}
      <div className="border-t border-white/10 p-3 bg-black/20 flex items-center justify-between font-mono text-[9px] text-cyber-muted pointer-events-none select-none">
        <div className="flex items-center gap-1.5">
          <Crosshair size={10} className="text-cyber-primary" />
          <span>DEC-MATRIX FEED: OK</span>
        </div>
        <div className="flex items-center gap-3">
          <span>LAT: 33.7490 deg N</span>
          <span>LON: 84.3880 deg W</span>
          <span className="text-cyber-primary">CCTV LINKS STABLE</span>
        </div>
      </div>

    </div>
  );
};
export default StadiumRadarMap;
