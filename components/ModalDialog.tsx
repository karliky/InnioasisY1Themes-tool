import React from 'react';

interface ModalDialogProps {
  W: number;
  H: number;
  visible: boolean;
  title: string;
  message: string;
  options: string[];
  selectedIndex: number;
  onSelect: (option: string) => void;
  dialogConfig: any;
  colors: { text_primary: string; text_selected: string };
  resolveBackgroundStyle: (val?: string) => React.CSSProperties | undefined;
}

const ModalDialog: React.FC<ModalDialogProps> = ({
  W,
  H,
  visible,
  title,
  message,
  options,
  selectedIndex,
  onSelect,
  dialogConfig,
  colors,
  resolveBackgroundStyle
}) => {
  if (!visible) return null;

  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: W * 0.75,
        maxWidth: 380,
        backgroundColor: dialogConfig.dialogBackgroundColor || 'rgba(0,0,0,0.85)',
        color: dialogConfig.dialogTextColor || colors.text_primary,
        borderRadius: 14,
        padding: 18,
        boxShadow: '0 10px 32px rgba(0,0,0,0.45)',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: dialogConfig.dialogTextColor || colors.text_selected }}>
          {title}
        </div>
        <div style={{ fontSize: 16, lineHeight: 1.4, color: dialogConfig.dialogTextColor || colors.text_selected }}>
          {message}
        </div>
        <div style={{
          display: 'flex',
          justifyContent: options.length > 1 ? 'space-evenly' : 'center',
          gap: 12,
          flexWrap: 'wrap',
          width: '100%'
        }}>
          {options.map((option, idx) => {
            const selected = idx === selectedIndex;
            const backgroundStyle = resolveBackgroundStyle(selected ? dialogConfig.dialogOptionSelectedBackground : dialogConfig.dialogOptionBackground) || { backgroundColor: selected ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.08)' };
            const color = selected ? (dialogConfig.dialogOptionSelectedTextColor || colors.text_selected) : (dialogConfig.dialogOptionTextColor || colors.text_primary);
            return (
              <button
                key={option}
                onClick={() => onSelect(option)}
                style={{
                  minWidth: 96,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.12)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 16,
                  color,
                  ...backgroundStyle
                }}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ModalDialog;
