import React, { useState } from 'react';
import { LoadedTheme } from '../types';

interface AIGeneratorModalProps {
  onClose: () => void;
  defaultBlankTheme?: LoadedTheme;
}

interface StyleConfig {
  styleRef: string;
  iconShape: string;
  colorPalette: string;
}

const DEFAULT_CONFIG: StyleConfig = {
  styleRef: '',
  iconShape: '',
  colorPalette: '',
};

const STYLE_REF_PLACEHOLDER = 'Warcraft 3 / Blizzard';
const ICON_SHAPE_PLACEHOLDER = 'circular';
const COLOR_PALETTE_PLACEHOLDER = 'Grayscale / neutral colors only (no bright colors)';

const STYLE_RULES = (styleRef: string, iconShape: string, colorPalette: string) => `STYLE RULES (VERY IMPORTANT):

Icons must be ${iconShape}, no square frame

Each icon inside a soft gray circle with subtle gradient shading

Metallic / stone / ${styleRef} UI style shading

Soft inner shadow and highlight to create depth

Symbol centered inside the circle

Minimalistic but with ${styleRef} style volume

Background must be pure white (#FFFFFF), flat, no texture, no shadow, no gradient

No background elements, only the ${iconShape} icon

All icons must share the exact same style, lighting, and circle design

Clean edges for easy cutout

Slight blur / glow like classic ${styleRef} UI icons

${colorPalette}

High resolution, sharp, UI icon style

No text`;

const COMPOSITION = (styleRef: string) => `COMPOSITION:

White background

One icon per image

Circle centered

Symbol centered

Consistent size and proportions

Style reference: ${styleRef} UI icons, ${styleRef} settings icons, metallic fantasy UI, soft gradients, embossed symbols`;

function buildStaticPrompt(config: StyleConfig): string {
  const styleRef = config.styleRef.trim() || STYLE_REF_PLACEHOLDER;
  const iconShape = config.iconShape.trim() || ICON_SHAPE_PLACEHOLDER;
  const colorPalette = config.colorPalette.trim() || COLOR_PALETTE_PLACEHOLDER;

  return `Create a set of consistent UI icons in ${styleRef} interface style.

${STYLE_RULES(styleRef, iconShape, colorPalette)}

ICON LIST:

shutdown → power button symbol

shuffleOn → crossed arrows shuffle symbol

equalizer_normal → 3 vertical sliders equalizer icon

fileExtensionOn → document / file page icon

keyLockOn → lock with keyhole icon

keyToneOn → key + sound waves icon

keyVibrationOn → button with vibration waves icon

wallpaper → folded page / panel / background icon

${COMPOSITION(styleRef)}`;
}

function buildDynamicPrompt(config: StyleConfig): string {
  const styleRef = config.styleRef.trim() || STYLE_REF_PLACEHOLDER;
  const iconShape = config.iconShape.trim() || ICON_SHAPE_PLACEHOLDER;
  const colorPalette = config.colorPalette.trim() || COLOR_PALETTE_PLACEHOLDER;

  return `Create a set of consistent UI icons in ${styleRef} interface style. These icons have multiple states — generate one image per state, keeping the same base symbol across all states of the same group.

${STYLE_RULES(styleRef, iconShape, colorPalette)}

ICON LIST (grouped by feature — one image per line):

[timedShutdown — power button with countdown indicator]
timedShutdown_off → power button, no timer active
timedShutdown_10 → power button with "10" label
timedShutdown_20 → power button with "20" label
timedShutdown_30 → power button with "30" label
timedShutdown_60 → power button with "60" label
timedShutdown_90 → power button with "90" label
timedShutdown_120 → power button with "120" label

[shuffle — crossed arrows symbol]
shuffleOn → crossed arrows, active / lit state
shuffleOff → crossed arrows, dimmed / inactive state

[repeat — looping arrows symbol]
repeatOff → loop arrows, off / dimmed state
repeatAll → loop arrows, all tracks active state
repeatOne → loop arrows with "1" badge, single track state

[fileExtension — document / file icon]
fileExtensionOn → file page icon, active state
fileExtensionOff → file page icon, dimmed / inactive state

[keyLock — lock icon]
keyLockOn → closed lock, locked state
keyLockOff → open lock, unlocked state

[keyTone — key + sound waves]
keyToneOn → key with sound waves, tone on state
keyToneOff → key with muted waves, tone off state

[keyVibration — button with vibration waves]
keyVibrationOn → button with vibration lines, vibration on state
keyVibrationOff → button with no vibration lines, vibration off state

[backlight — light bulb or brightness symbol]
backlight_10 → bulb / brightness icon with "10" label
backlight_15 → bulb / brightness icon with "15" label
backlight_30 → bulb / brightness icon with "30" label
backlight_45 → bulb / brightness icon with "45" label
backlight_60 → bulb / brightness icon with "60" label
backlight_120 → bulb / brightness icon with "120" label
backlight_always → bulb / brightness icon with "∞" or "always" label

[displayBattery — battery icon]
displayBatteryOn → battery icon, display on state
displayBatteryOff → battery icon, dimmed / display off state

${COMPOSITION(styleRef)}`;
}

const DYNAMIC_GROUPS = [
  {
    emoji: '⏱',
    name: 'timedShutdown',
    description: 'Time variation',
    variations: [
      { key: 'timedShutdown_off', file: 'Timed shutdown_001@1x.png', label: 'Off' },
      { key: 'timedShutdown_10', file: 'Timed shutdown_002@1x.png', label: '10 min' },
      { key: 'timedShutdown_20', file: 'Timed shutdown_003@1x.png', label: '20 min' },
      { key: 'timedShutdown_30', file: 'Timed shutdown_004@1x.png', label: '30 min' },
      { key: 'timedShutdown_60', file: 'Timed shutdown_005@1x.png', label: '60 min' },
      { key: 'timedShutdown_90', file: 'Timed shutdown_006@1x.png', label: '90 min' },
      { key: 'timedShutdown_120', file: 'Timed shutdown_007@1x.png', label: '120 min' },
    ],
  },
  {
    emoji: '🔀',
    name: 'shuffle',
    description: 'ON / OFF',
    variations: [
      { key: 'shuffleOn', file: 'Shuffle_on@1x.png', label: 'ON' },
      { key: 'shuffleOff', file: 'Shuffle_off@1x.png', label: 'OFF' },
    ],
  },
  {
    emoji: '🔁',
    name: 'repeat',
    description: 'Mode variation',
    variations: [
      { key: 'repeatOff', file: 'Repeat_off@1x.png', label: 'Off' },
      { key: 'repeatAll', file: 'Repeat_all@1x.png', label: 'All' },
      { key: 'repeatOne', file: 'Repeat_one@1x.png', label: 'One' },
    ],
  },
  {
    emoji: '📄',
    name: 'fileExtension',
    description: 'ON / OFF',
    variations: [
      { key: 'fileExtensionOn', file: 'file_ext_on.png', label: 'ON' },
      { key: 'fileExtensionOff', file: 'file_ext_off.png', label: 'OFF' },
    ],
  },
  {
    emoji: '🔒',
    name: 'keyLock',
    description: 'ON / OFF',
    variations: [
      { key: 'keyLockOn', file: 'Key lock_on@1x.png', label: 'ON' },
      { key: 'keyLockOff', file: 'Key lock_off@1x.png', label: 'OFF' },
    ],
  },
  {
    emoji: '🔊',
    name: 'keyTone',
    description: 'ON / OFF',
    variations: [
      { key: 'keyToneOn', file: 'Key tone_on@1x.png', label: 'ON' },
      { key: 'keyToneOff', file: 'Key tone_off@1x.png', label: 'OFF' },
    ],
  },
  {
    emoji: '📳',
    name: 'keyVibration',
    description: 'ON / OFF',
    variations: [
      { key: 'keyVibrationOn', file: 'Key vibration_on@1x.png', label: 'ON' },
      { key: 'keyVibrationOff', file: 'Key vibration_off@1x.png', label: 'OFF' },
    ],
  },
  {
    emoji: '💡',
    name: 'backlight',
    description: 'Time variation',
    variations: [
      { key: 'backlight_10', file: 'Backlight_001@1x.png', label: '10 s' },
      { key: 'backlight_15', file: 'Backlight_002@1x.png', label: '15 s' },
      { key: 'backlight_30', file: 'Backlight_003@1x.png', label: '30 s' },
      { key: 'backlight_45', file: 'Backlight_004@1x.png', label: '45 s' },
      { key: 'backlight_60', file: 'Backlight_005@1x.png', label: '60 s' },
      { key: 'backlight_120', file: 'Backlight_006@1x.png', label: '120 s' },
      { key: 'backlight_always', file: 'Backlight_007@1x.png', label: 'Always' },
    ],
  },
  {
    emoji: '🔋',
    name: 'displayBattery',
    description: 'ON / OFF',
    variations: [
      { key: 'displayBatteryOn', file: 'Display battery_on@1x.png', label: 'ON' },
      { key: 'displayBatteryOff', file: 'Display battery_off@1x.png', label: 'OFF' },
    ],
  },
];

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#1A1A1A',
  border: '1px solid #3A3A3A',
  color: '#CCCCCC',
  padding: '6px 10px',
  fontSize: '11px',
  fontFamily: 'var(--font-body)',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '10px',
  fontFamily: 'var(--font-mono)',
  color: '#888888',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  marginBottom: '5px',
};

const SectionHeading: React.FC<{ children: React.ReactNode; icon: React.ReactNode }> = ({ children, icon }) => (
  <h3
    className="text-[11px] font-bold text-[#C0C0C0] uppercase tracking-[0.15em] pb-2 mb-4 flex items-center gap-2"
    style={{ borderBottom: '1px solid #3C7FD5', fontFamily: 'var(--font-mono)' }}
  >
    {icon}
    {children}
  </h3>
);

const CopyIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

function PromptBox({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = prompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative" style={{ border: '1px solid #3A3A3A', background: '#141414' }}>
      <pre
        className="text-[11px] text-[#BBBBBB] p-4 whitespace-pre-wrap leading-relaxed"
        style={{ fontFamily: 'var(--font-mono)', maxHeight: '260px', overflowY: 'auto' }}
      >
        {prompt}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase transition-all"
        style={{
          fontFamily: 'var(--font-mono)',
          background: copied ? '#1e3a1e' : '#2A2A2A',
          border: `1px solid ${copied ? '#3a7a3a' : '#444444'}`,
          color: copied ? '#6dbf6d' : '#999999',
        }}
      >
        {copied ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
      </button>
    </div>
  );
}

const AIGeneratorModal: React.FC<AIGeneratorModalProps> = ({ onClose, defaultBlankTheme }) => {
  const [config, setConfig] = useState<StyleConfig>(DEFAULT_CONFIG);

  const staticPrompt = buildStaticPrompt(config);
  const dynamicPrompt = buildDynamicPrompt(config);

  const setField = (field: keyof StyleConfig) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setConfig((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative flex flex-col overflow-hidden"
        style={{
          width: '860px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          background: '#1E1E1E',
          border: '1px solid #3A3A3A',
          boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid #3A3A3A', background: '#252525' }}
        >
          <div className="flex items-center gap-3">
            <img
              src="/magicai.png"
              alt="AI"
              className="w-8 h-8 object-contain shrink-0"
              style={{ filter: 'invert(1)', mixBlendMode: 'screen' }}
            />
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>
                Generate AI Images
              </h2>
              <p className="text-[11px] text-[#888888]" style={{ fontFamily: 'var(--font-body)' }}>
                Create icon sets for your theme using AI image generators
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#777777] hover:text-white transition-colors p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto no-scrollbar" style={{ padding: '24px' }}>

          {/* Intro */}
          <div className="mb-6 p-4" style={{ background: '#2A2A2A', border: '1px solid #3A3A3A' }}>
            <p className="text-xs text-[#CCCCCC] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
              Use an AI image generator (we recommend Nano Banana in Google AI Studio) to create a consistent icon set for your theme.
              Configure the style below, then copy the prompt for each section and paste it into your generator of choice.
            </p>
          </div>

          {/* Style configuration */}
          <section className="mb-8">
            <SectionHeading icon={
              <svg className="w-4 h-4 text-[#3C7FD5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            }>
              Style Configuration
            </SectionHeading>

            <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <div>
                <label style={labelStyle}>Style Reference</label>
                <input
                  type="text"
                  value={config.styleRef}
                  onChange={setField('styleRef')}
                  placeholder={STYLE_REF_PLACEHOLDER}
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#3C7FD5')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#3A3A3A')}
                />
                <p className="mt-1 text-[10px] text-[#555555]" style={{ fontFamily: 'var(--font-body)' }}>
                  Sets the overall art style throughout both prompts
                </p>
              </div>
              <div>
                <label style={labelStyle}>Icon Shape</label>
                <input
                  type="text"
                  value={config.iconShape}
                  onChange={setField('iconShape')}
                  placeholder={ICON_SHAPE_PLACEHOLDER}
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#3C7FD5')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#3A3A3A')}
                />
                <p className="mt-1 text-[10px] text-[#555555]" style={{ fontFamily: 'var(--font-body)' }}>
                  e.g. circular, square, rounded square
                </p>
              </div>
              <div>
                <label style={labelStyle}>Color Palette</label>
                <input
                  type="text"
                  value={config.colorPalette}
                  onChange={setField('colorPalette')}
                  placeholder={COLOR_PALETTE_PLACEHOLDER}
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#3C7FD5')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#3A3A3A')}
                />
                <p className="mt-1 text-[10px] text-[#555555]" style={{ fontFamily: 'var(--font-body)' }}>
                  e.g. Vibrant colors with gold accents
                </p>
              </div>
            </div>
          </section>

          {/* ── Static Icons ── */}
          <section className="mb-8">
            <SectionHeading icon={
              <svg className="w-4 h-4 text-[#3C7FD5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }>
              Static Icons — Settings View
            </SectionHeading>

            <p className="text-[11px] text-[#999999] mb-4" style={{ fontFamily: 'var(--font-body)' }}>
              These icons are fixed — each one has a single image. Below is a real example generated with Nano Banana for the Settings view:
            </p>
            <div className="overflow-hidden mb-2" style={{ border: '1px solid #3A3A3A', background: '#141414' }}>
              <img
                src="/settings-icons-gemini.jpg"
                alt="Example icons generated with Nano Banana for the Settings view"
                className="w-full object-contain"
                style={{ maxHeight: '320px' }}
              />
            </div>
            <p className="text-[10px] text-[#555555] mb-4 italic" style={{ fontFamily: 'var(--font-body)' }}>
              Real output generated with Gemini using the prompt below
            </p>

            <p className="text-[11px] text-[#999999] mb-2" style={{ fontFamily: 'var(--font-body)' }}>
              Generated prompt — copy and paste into your AI generator:
            </p>
            <PromptBox prompt={staticPrompt} />
          </section>

          {/* ── Dynamic Icons ── */}
          <section>
            <SectionHeading icon={
              <svg className="w-4 h-4 text-[#3C7FD5]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            }>
              Dynamic Icons — Variations
            </SectionHeading>

            <p className="text-[11px] text-[#999999] mb-4" style={{ fontFamily: 'var(--font-body)' }}>
              These icons have <span className="text-[#5A9FFF]">multiple states</span> — you need one image per state.
              Reference images are from the <span className="text-[#AAAAAA] font-medium">Default blank</span> theme:
            </p>

            <div className="space-y-4 mb-6">
              {DYNAMIC_GROUPS.map((group) => (
                <div
                  key={group.name}
                  className="p-4"
                  style={{ background: '#252525', border: '1px solid #333333' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">{group.emoji}</span>
                    <span className="text-xs font-bold text-[#CCCCCC]" style={{ fontFamily: 'var(--font-mono)' }}>
                      {group.name}
                    </span>
                    <span className="text-[10px] text-[#666666]" style={{ fontFamily: 'var(--font-body)' }}>
                      — {group.description}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {group.variations.map((v) => {
                      const imgUrl = defaultBlankTheme?.assetUrlForFile(v.file);
                      return (
                        <div key={v.key} className="flex flex-col items-center gap-1">
                          <div
                            className="w-14 h-14 flex items-center justify-center"
                            style={{ background: '#1A1A1A', border: '1px solid #3A3A3A' }}
                          >
                            {imgUrl ? (
                              <img src={imgUrl} alt={v.key} className="w-10 h-10 object-contain" />
                            ) : (
                              <svg className="w-5 h-5 text-[#444444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                              </svg>
                            )}
                          </div>
                          <span
                            className="text-[9px] text-[#666666] text-center leading-tight"
                            style={{ fontFamily: 'var(--font-mono)', maxWidth: '56px' }}
                          >
                            {v.key}
                          </span>
                          <span className="text-[9px] text-[#444444] text-center" style={{ fontFamily: 'var(--font-body)' }}>
                            {v.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-[#999999] mb-2" style={{ fontFamily: 'var(--font-body)' }}>
              Generated prompt — copy and paste into your AI generator:
            </p>
            <PromptBox prompt={dynamicPrompt} />
          </section>

        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end px-6 py-3 shrink-0"
          style={{ borderTop: '1px solid #3A3A3A', background: '#252525' }}
        >
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold uppercase transition-all"
            style={{
              fontFamily: 'var(--font-mono)',
              background: '#3A3A3A',
              border: '1px solid #555555',
              color: '#AAAAAA',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#3C7FD5';
              (e.currentTarget as HTMLButtonElement).style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#555555';
              (e.currentTarget as HTMLButtonElement).style.color = '#AAAAAA';
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIGeneratorModal;
