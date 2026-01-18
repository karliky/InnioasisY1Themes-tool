import React from 'react';

interface ExportProgressModalProps {
  visible: boolean;
  currentStep: 'optimizing' | 'packaging';
  progress: number; // 0-100
  currentFile?: string;
  totalFiles?: number;
  processedFiles?: number;
  onCancel?: () => void;
}

const ExportProgressModal: React.FC<ExportProgressModalProps> = ({
  visible,
  currentStep,
  progress,
  currentFile,
  totalFiles,
  processedFiles,
  onCancel
}) => {
  if (!visible) return null;

  const stepLabel = currentStep === 'optimizing' 
    ? 'Optimizing Images' 
    : 'Creating ZIP Archive';

  const stepDescription = currentStep === 'optimizing'
    ? 'Resizing and compressing images to device specifications...'
    : 'Packaging optimized assets into ZIP file...';

  return (
    <div style={{
      position: 'fixed',
      left: 0,
      top: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        width: '90%',
        maxWidth: 500,
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 24,
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h2 style={{
          margin: '0 0 8px 0',
          fontSize: 20,
          fontWeight: 600,
          color: '#ffffff'
        }}>
          Exporting Theme
        </h2>
        
        <p style={{
          margin: '0 0 20px 0',
          fontSize: 14,
          color: '#aaaaaa'
        }}>
          {stepDescription}
        </p>

        <div style={{
          marginBottom: 12
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8
          }}>
            <span style={{
              fontSize: 14,
              fontWeight: 500,
              color: '#ffffff'
            }}>
              {stepLabel}
            </span>
            <span style={{
              fontSize: 14,
              color: '#aaaaaa'
            }}>
              {Math.round(progress)}%
            </span>
          </div>
          
          <div style={{
            width: '100%',
            height: 8,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: 4,
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: '#4a9eff',
              transition: 'width 0.3s ease',
              borderRadius: 4
            }} />
          </div>
        </div>

        {currentFile && (
          <p style={{
            margin: '8px 0 0 0',
            fontSize: 12,
            color: '#888888',
            fontFamily: 'monospace',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {currentFile}
          </p>
        )}

        {totalFiles && processedFiles !== undefined && (
          <p style={{
            margin: '8px 0 0 0',
            fontSize: 12,
            color: '#888888'
          }}>
            {processedFiles} / {totalFiles} files processed
          </p>
        )}

        {onCancel && (
          <button
            onClick={onCancel}
            style={{
              marginTop: 20,
              padding: '10px 20px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 6,
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              width: '100%',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default ExportProgressModal;
