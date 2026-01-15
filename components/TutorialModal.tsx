import React, { useState, useEffect, useRef } from 'react';
import deviceImage from '../res/tutorial/device.png?url';
import exportImage from '../res/tutorial/export.png?url';
import copypasteVideo from '../res/tutorial/copypaste.mov?url';

interface TutorialStep {
  type: 'image' | 'video' | 'text';
  content: string; // path to image/video or text content
  title?: string;
  description?: string;
}

interface TutorialModalProps {
  visible: boolean;
  onClose: () => void;
  onSkip: () => void;
}

const TutorialModal: React.FC<TutorialModalProps> = ({ visible, onClose, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const steps: TutorialStep[] = [
    {
      type: 'image',
      content: deviceImage,
      title: 'Navigate with the Click Wheel',
      description: 'Use the <strong>click wheel</strong> to scroll through menus, press the <strong>center button</strong> to select, and the <strong>top button</strong> to go back.'
    },
    {
      type: 'video',
      content: copypasteVideo,
      title: 'Copy & Paste Assets',
      description: 'Copy your favorite assets from <strong>Photopea</strong> or any image editor and <strong>paste them directly</strong> into the theme editor.'
    },
    {
      type: 'image',
      content: exportImage,
      title: 'Export Your Theme',
      description: 'Export your theme as a <strong>ZIP file</strong>. Just place it in the <strong>themes/ folder</strong> and it\'s ready to use!'
    },
    {
      type: 'text',
      content: 'Visit the Gallery',
      title: 'Discover Community Themes',
      description: 'Explore the <strong>/gallery</strong> to find more <strong>community-driven themes</strong> and get inspired by what others have created.'
    }
  ];

  const totalSteps = steps.length;

  useEffect(() => {
    if (!visible) return;
    
    if (currentStep === 1 && videoRef.current) {
      // Autoplay video on step 2
      videoRef.current.currentTime = 0; // Reset to start
      videoRef.current.play().catch(err => {
        console.warn('Video autoplay failed:', err);
      });
    } else if (videoRef.current) {
      // Pause video when leaving step 2
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [visible, currentStep]);

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  if (!visible) return null;

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === totalSteps - 1;

  const handleGalleryClick = () => {
    onClose();
    window.open('/gallery', '_blank');
  };

  return (
    <>
      <style>{`
        .tutorial-description strong {
          font-weight: 600;
          color: #FFFFFF;
        }
      `}</style>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        style={{ zIndex: 9999 }}
      >
        <div className={`relative w-full bg-[#1a1a1a] border border-[#3a3a3a] rounded-xl shadow-2xl overflow-hidden flex flex-col ${
          currentStep === 0 ? 'max-w-3xl max-h-[95vh]' : 'max-w-2xl max-h-[90vh]'
        }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#3a3a3a] bg-[#222222] flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3C7FD5] to-[#2a5fa0] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-mono)' }}>
                Welcome to Theme Editor
              </h2>
              <p className="text-xs text-[#999999]" style={{ fontFamily: 'var(--font-body)' }}>
                Step {currentStep + 1} of {totalSteps}
              </p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="px-3 py-1.5 text-xs font-medium text-[#999999] hover:text-white transition-colors"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Skip
          </button>
        </div>

        {/* Content */}
        <div className={`p-4 flex-1 overflow-y-auto min-h-0`}>
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: 'var(--font-mono)' }}>
              {currentStepData.title}
            </h3>
            {currentStepData.description && (
              <p 
                className="text-[#CCCCCC] text-sm leading-relaxed tutorial-description" 
                style={{ fontFamily: 'var(--font-body)' }}
                dangerouslySetInnerHTML={{ __html: currentStepData.description }}
              />
            )}
          </div>

          <div className={`flex items-center justify-center bg-[#0f0f0f] rounded-lg border border-[#2a2a2a] ${
            currentStep === 0 
              ? 'w-full' 
              : 'min-h-[280px] max-h-[400px] overflow-hidden'
          }`}>
            {currentStepData.type === 'image' && (
              <img
                src={currentStepData.content}
                alt={currentStepData.title}
                className={`${
                  currentStep === 0
                    ? 'w-full h-auto block'
                    : 'max-w-full max-h-full object-contain'
                }`}
                style={currentStep === 0 ? { 
                  objectFit: 'contain',
                  maxHeight: 'calc(95vh - 240px)'
                } : undefined}
              />
            )}
            {currentStepData.type === 'video' && (
              <video
                ref={videoRef}
                src={currentStepData.content}
                className="max-w-full max-h-full object-contain"
                autoPlay
                loop
                muted
                playsInline
              />
            )}
            {currentStepData.type === 'text' && (
              <div className="text-center p-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#3C7FD5] to-[#2a5fa0] flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h4 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-mono)' }}>
                  {currentStepData.content}
                </h4>
                <button
                  onClick={handleGalleryClick}
                  className="inline-block mt-4 px-5 py-2.5 bg-gradient-to-r from-[#3C7FD5] to-[#2a5fa0] text-white font-bold rounded-lg hover:from-[#4a8fe5] hover:to-[#3a6fb0] transition-all shadow-lg text-sm"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  Visit Gallery →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer with navigation */}
        <div className="flex items-center justify-between p-4 border-t border-[#3a3a3a] bg-[#222222] flex-shrink-0">
          {/* Step indicators */}
          <div className="flex items-center gap-2">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-6 bg-[#3C7FD5]'
                    : 'bg-[#4a4a4a] hover:bg-[#5a5a5a]'
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="px-4 py-2 border border-[#4a4a4a] bg-[#2a2a2a] text-[#CCCCCC] font-medium rounded-lg hover:border-[#3C7FD5] hover:text-white transition-all text-sm"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Previous
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-gradient-to-r from-[#3C7FD5] to-[#2a5fa0] text-white font-bold rounded-lg hover:from-[#4a8fe5] hover:to-[#3a6fb0] transition-all shadow-lg text-sm"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {isLastStep ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default TutorialModal;
