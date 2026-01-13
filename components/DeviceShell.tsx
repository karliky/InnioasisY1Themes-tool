import React from 'react';

export const METALLIC_COLORS: Record<string, {
    base: string;
    highlight: string;
    shadow: string;
    border: string;
    accent: string;
    gradient: string;
}> = {
    black: {
        base: '#1a1a1a',
        highlight: '#3a3a3a',
        shadow: '#0a0a0a',
        border: '#2a2a2a',
        accent: '#4a4a4a',
        gradient: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 30%, #0f0f0f 60%, #1a1a1a 100%)'
    },
    silver: {
        base: '#c0c0c0',
        highlight: '#f0f0f0',
        shadow: '#808080',
        border: '#d0d0d0',
        accent: '#e8e8e8',
        gradient: 'linear-gradient(135deg, #e8e8e8 0%, #c0c0c0 25%, #a0a0a0 50%, #c0c0c0 75%, #d8d8d8 100%)'
    },
    yellow: {
        base: '#d4af37',
        highlight: '#f4d03f',
        shadow: '#b8860b',
        border: '#daa520',
        accent: '#ffd700',
        gradient: 'linear-gradient(135deg, #ffd700 0%, #d4af37 30%, #b8860b 60%, #d4af37 100%)'
    },
    teal: {
        base: '#40e0d0',
        highlight: '#60f0e0',
        shadow: '#20c0b0',
        border: '#50d0c0',
        accent: '#70f0e0',
        gradient: 'linear-gradient(135deg, #60f0e0 0%, #40e0d0 25%, #20c0b0 50%, #40e0d0 75%, #50d0c0 100%)'
    },
    blue: {
        base: '#007bff',
        highlight: '#409fff',
        shadow: '#003d99',
        border: '#2080ff',
        accent: '#60b0ff',
        gradient: 'linear-gradient(135deg, #409fff 0%, #007bff 25%, #003d99 50%, #007bff 75%, #2080ff 100%)'
    },
    orange: {
        base: '#ff6a00',
        highlight: '#ff8a30',
        shadow: '#cc4400',
        border: '#ff7a10',
        accent: '#ff9a40',
        gradient: 'linear-gradient(135deg, #ff8a30 0%, #ff6a00 25%, #cc4400 50%, #ff6a00 75%, #ff7a10 100%)'
    }
};

interface DeviceShellProps {
    deviceColor: keyof typeof METALLIC_COLORS;
    scale?: number;
    screenContent: React.ReactNode;
    clickWheel: React.ReactNode;
}

const DeviceShell: React.FC<DeviceShellProps> = ({ deviceColor, scale = 1, screenContent, clickWheel }) => {
    return (
        <div
            className="device-shadow rounded-3xl border-6 flex flex-col items-center justify-start pt-6 ring-1 ring-white/10 overflow-hidden relative"
            style={{
                transform: `scale(${scale})`,
                transformOrigin: 'center center',
                width: '540px',
                height: '800px',
                borderColor: METALLIC_COLORS[deviceColor].border,
                background: METALLIC_COLORS[deviceColor].gradient,
                boxShadow: `
                0 0 0 1px ${METALLIC_COLORS[deviceColor].shadow} inset,
                0 0 20px rgba(0, 0, 0, 0.5),
                0 10px 40px rgba(0, 0, 0, 0.3),
                0 0 60px rgba(0, 0, 0, 0.2),
                inset 0 2px 4px ${METALLIC_COLORS[deviceColor].highlight},
                inset 0 -2px 4px ${METALLIC_COLORS[deviceColor].shadow}
              `,
                position: 'relative'
            }}
        >
            {/* Metallic shine overlay */}
            <div
                className="absolute inset-0 rounded-3xl pointer-events-none"
                style={{
                    background: `linear-gradient(
                  135deg,
                  rgba(255, 255, 255, 0.15) 0%,
                  transparent 20%,
                  transparent 60%,
                  rgba(0, 0, 0, 0.1) 80%,
                  rgba(255, 255, 255, 0.05) 100%
                )`,
                    mixBlendMode: 'overlay'
                }}
            />

            {/* Highlight reflection */}
            <div
                className="absolute top-0 left-1/4 w-1/3 h-1/4 rounded-full pointer-events-none opacity-30"
                style={{
                    background: `radial-gradient(ellipse at center, ${METALLIC_COLORS[deviceColor].highlight}, transparent)`,
                    filter: 'blur(20px)'
                }}
            />

            {/* Subtle metallic texture */}
            <div
                className="absolute inset-0 rounded-3xl pointer-events-none opacity-5"
                style={{
                    backgroundImage: `repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 2px,
                  rgba(255, 255, 255, 0.1) 2px,
                  rgba(255, 255, 255, 0.1) 4px
                )`,
                    mixBlendMode: 'overlay'
                }}
            />

            <div
                className="w-10 h-1 rounded-full mb-3 relative z-10"
                style={{
                    background: `linear-gradient(90deg, ${METALLIC_COLORS[deviceColor].shadow}, ${METALLIC_COLORS[deviceColor].accent}, ${METALLIC_COLORS[deviceColor].shadow})`,
                    boxShadow: `
                  0 0 8px rgba(0, 0, 0, 0.3),
                  inset 0 1px 2px ${METALLIC_COLORS[deviceColor].highlight},
                  inset 0 -1px 2px ${METALLIC_COLORS[deviceColor].shadow}
                `,
                    opacity: 0.6
                }}
            />

            <div
                className="bg-black rounded-lg flex-shrink-0 relative"
                style={{
                    padding: '16px',
                    border: `4px solid ${METALLIC_COLORS[deviceColor].border}`,
                    boxShadow: `
                  0 0 0 1px ${METALLIC_COLORS[deviceColor].shadow} inset,
                  0 0 40px rgba(0, 0, 0, 0.8),
                  inset 0 2px 4px rgba(255, 255, 255, 0.1),
                  inset 0 -2px 4px rgba(0, 0, 0, 0.3)
                `,
                    position: 'relative'
                }}
            >
                {/* Screen bezel highlight */}
                <div
                    className="absolute inset-0 rounded-lg pointer-events-none"
                    style={{
                        border: `1px solid ${METALLIC_COLORS[deviceColor].highlight}`,
                        opacity: 0.3,
                        borderRadius: '0.5rem'
                    }}
                />
                {/* Screen content */}
                {screenContent}
            </div>

            <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0">
                {clickWheel}
            </div>
        </div>
    );
};

export default DeviceShell;
