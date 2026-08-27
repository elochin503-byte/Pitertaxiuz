import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Car, Compass, Zap } from 'lucide-react';
import { OrderLocation } from '../types';
import { SPB_LOCATIONS } from '../../server/db';

interface MapProps {
  from?: OrderLocation | null;
  to?: OrderLocation | null;
  onSelectLocation?: (loc: OrderLocation, type: 'from' | 'to') => void;
  tripProgress?: number; // 0 to 100
  carStatusText?: string;
  isDriving?: boolean;
}

export const InteractiveSPBMap: React.FC<MapProps> = ({
  from,
  to,
  onSelectLocation,
  tripProgress = 0,
  carStatusText,
  isDriving = false
}) => {
  // Normalize coordinates to SVG viewport 800 x 500
  // SPB bounds: Lat approx 59.78 to 60.08, Lng approx 30.15 to 30.55
  const latMin = 59.78, latMax = 60.08;
  const lngMin = 30.15, lngMax = 30.55;

  const toSvgX = (lng: number) => {
    return Math.max(30, Math.min(770, ((lng - lngMin) / (lngMax - lngMin)) * 740 + 30));
  };

  const toSvgY = (lat: number) => {
    // Invert Y because SVG coordinates go top to bottom
    return Math.max(30, Math.min(470, ((latMax - lat) / (latMax - latMin)) * 440 + 30));
  };

  const fromX = from ? toSvgX(from.lng) : 380;
  const fromY = from ? toSvgY(from.lat) : 220;
  const toX = to ? toSvgX(to.lng) : 480;
  const toY = to ? toSvgY(to.lat) : 280;

  // Calculate car position along the line based on tripProgress
  const carX = fromX + (toX - fromX) * (tripProgress / 100);
  const carY = fromY + (toY - fromY) * (tripProgress / 100);

  // Compute angle of the road for car heading
  const angle = Math.atan2(toY - fromY, toX - fromX) * (180 / Math.PI);

  return (
    <div className="relative w-full h-[320px] md:h-[380px] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl select-none group">
      {/* Map SVG Canvas */}
      <svg className="w-full h-full" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="waterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Map Background Land Grid */}
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#334155" strokeWidth="0.5" strokeOpacity="0.3" />
        </pattern>
        <rect width="800" height="500" fill="#0b1329" />
        <rect width="800" height="500" fill="url(#grid)" />

        {/* Gulf of Finland & Neva River Delta */}
        <path
          d="M 0 160 Q 120 180 200 240 Q 280 290 350 250 Q 420 220 540 260 Q 640 290 800 280 L 800 500 L 0 500 Z"
          fill="#0c1b38"
          opacity="0.6"
        />
        {/* Neva River main curve */}
        <path
          d="M 50 180 Q 180 200 300 240 T 460 220 T 620 270 T 800 290"
          fill="none"
          stroke="#1d4ed8"
          strokeWidth="24"
          strokeLinecap="round"
          opacity="0.45"
        />
        {/* Neva River inner bright water flow */}
        <path
          d="M 50 180 Q 180 200 300 240 T 460 220 T 620 270 T 800 290"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="10"
          strokeLinecap="round"
          opacity="0.7"
        />

        {/* Vasilyevsky Island outline */}
        <ellipse cx="280" cy="220" rx="45" ry="25" fill="#111e38" stroke="#1e293b" strokeWidth="1.5" />
        {/* Petrogradskaya side outline */}
        <ellipse cx="360" cy="180" rx="55" ry="30" fill="#111e38" stroke="#1e293b" strokeWidth="1.5" />

        {/* Ring Road (KAD) & Major Highways */}
        <ellipse cx="400" cy="250" rx="350" ry="210" fill="none" stroke="#334155" strokeWidth="2.5" strokeDasharray="8 6" opacity="0.6" />
        <line x1="400" y1="40" x2="400" y2="460" stroke="#1e293b" strokeWidth="2" strokeDasharray="4 4" />
        <line x1="50" y1="250" x2="750" y2="250" stroke="#1e293b" strokeWidth="2" strokeDasharray="4 4" />

        {/* Metro Stations Nodes */}
        {SPB_LOCATIONS.map((loc, idx) => {
          const x = toSvgX(loc.lng);
          const y = toSvgY(loc.lat);
          const isFrom = from?.address === loc.address;
          const isTo = to?.address === loc.address;

          return (
            <g
              key={idx}
              className="cursor-pointer transition-transform hover:scale-125"
              onClick={() => {
                if (onSelectLocation) {
                  if (!from) onSelectLocation(loc, 'from');
                  else if (!to) onSelectLocation(loc, 'to');
                  else onSelectLocation(loc, 'to');
                }
              }}
            >
              {/* Pulse ripple for selected points */}
              {(isFrom || isTo) && (
                <circle cx={x} cy={y} r="16" fill={isFrom ? '#22c55e' : '#ef4444'} opacity="0.3" className="animate-ping" />
              )}
              {/* Outer halo */}
              <circle
                cx={x}
                cy={y}
                r={isFrom || isTo ? '9' : '5'}
                fill={isFrom ? '#22c55e' : isTo ? '#ef4444' : '#64748b'}
                stroke="#0f172a"
                strokeWidth="2"
              />
              {/* Inner core */}
              <circle cx={x} cy={y} r={isFrom || isTo ? '4' : '2'} fill="#ffffff" />
              {/* Station label */}
              <text
                x={x}
                y={y - 12}
                textAnchor="middle"
                fill={isFrom ? '#4ade80' : isTo ? '#f87171' : '#94a3b8'}
                fontSize={isFrom || isTo ? '11' : '9'}
                fontWeight={isFrom || isTo ? 'bold' : 'normal'}
                className="pointer-events-none drop-shadow"
              >
                {loc.metroStation}
              </text>
            </g>
          );
        })}

        {/* Active Route Polyline connecting From and To */}
        {from && to && (
          <g>
            {/* Background route glow */}
            <line
              x1={fromX}
              y1={fromY}
              x2={toX}
              y2={toY}
              stroke="#eab308"
              strokeWidth="8"
              strokeLinecap="round"
              opacity="0.3"
              filter="url(#glow)"
            />
            {/* Animated dashed line */}
            <line
              x1={fromX}
              y1={fromY}
              x2={toX}
              y2={toY}
              stroke="url(#routeGrad)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="6 6"
              className="animate-[dash_2s_linear_infinite]"
            />
          </g>
        )}

        {/* Moving Taxi Vehicle representation on route */}
        {from && to && (
          <g transform={`translate(${carX}, ${carY}) rotate(${angle})`}>
            {/* Car Glow Shadow */}
            <circle cx="0" cy="0" r="14" fill="#eab308" opacity="0.4" className="animate-pulse" />
            {/* Car body */}
            <rect x="-10" y="-6" width="20" height="12" rx="3" fill="#facc15" stroke="#000" strokeWidth="1.5" />
            {/* Windshield */}
            <rect x="-3" y="-4" width="6" height="8" rx="1" fill="#1e293b" />
            {/* Taxi roof sign */}
            <rect x="-2" y="-1" width="4" height="2" fill="#ef4444" />
          </g>
        )}
      </svg>

      {/* Overlay Badges */}
      <div className="absolute top-3 left-3 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 text-xs text-slate-200">
        <Compass className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: '12s' }} />
        <span className="font-semibold text-emerald-400">Sankt-Peterburg</span>
        <span className="text-slate-400">| Jonli xarita</span>
      </div>

      {carStatusText && (
        <div className="absolute bottom-3 left-3 right-3 bg-slate-900/95 backdrop-blur-md p-2.5 rounded-xl border border-slate-700 flex items-center justify-between text-xs text-white shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium text-slate-200">{carStatusText}</p>
              <p className="text-[11px] text-slate-400">Yo‘l tezligi: ~45 km/s</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-20 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                style={{ width: `${tripProgress}%` }}
              />
            </div>
            <span className="font-mono text-emerald-400 font-bold">{Math.round(tripProgress)}%</span>
          </div>
        </div>
      )}

      {/* Quick metro selector chips at the bottom if not driving */}
      {!carStatusText && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] text-slate-400 bg-slate-900/90 px-2 py-1 rounded-lg shrink-0 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" /> Tezkor tanlash:
          </span>
          {SPB_LOCATIONS.slice(0, 5).map((loc, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (onSelectLocation) {
                  if (!from) onSelectLocation(loc, 'from');
                  else onSelectLocation(loc, 'to');
                }
              }}
              className="text-[11px] whitespace-nowrap bg-slate-800/90 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 transition"
            >
              {loc.metroStation}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
