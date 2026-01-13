import React from 'react';
import { Song } from '../../types';
import albumCover from '../../res/albumcover.avif?url';

interface NowPlayingViewProps {
  W: number;
  H: number;
  statusBarHeight: number;
  currentSong: Song | null;
  selectedSongIndex: number;
  elapsedTime: number;
  playbackProgress: number;
  colors: { text_primary: string };
  playerConfig: any;
}

const NowPlayingView: React.FC<NowPlayingViewProps> = ({
  W,
  H,
  statusBarHeight,
  currentSong,
  selectedSongIndex,
  elapsedTime,
  playbackProgress,
  colors,
  playerConfig
}) => {
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }}>
      {/* Main content area - album art on left, metadata on right */}
      <div style={{ 
        position: 'absolute', 
        left: 0, 
        top: statusBarHeight, 
        width: W, 
        height: H - statusBarHeight - 60,
        display: 'flex',
        overflow: 'visible'
      }}>
        {/* Left Column: Album Artwork with Reflection */}
        <div style={{
          position: 'relative',
          width: W / 3,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          paddingLeft: 4,
          paddingTop: 12,
          overflow: 'visible'
        }}>
          {/* Album Cover */}
          <div style={{
            position: 'relative',
            width: '140%',
            aspectRatio: '1',
            maxHeight: 'none',
            height: 'auto',
            transform: 'perspective(500px) rotateY(25deg) rotateX(2deg)',
            transformStyle: 'preserve-3d'
          }}>
            <img 
              src={albumCover} 
              alt="Album cover"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: 2,
                display: 'block',
                transform: 'skewY(-2deg)',
                transformOrigin: 'center'
              }}
            />
            
            {/* Reflection Effect */}
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              width: '100%',
              height: '100%',
              transform: 'scaleY(-1) skewY(2deg)',
              backgroundImage: `url(${albumCover})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: 2,
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0) 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0) 100%)',
              filter: 'blur(0.5px)',
              opacity: 0.6,
              pointerEvents: 'none'
            }} />
          </div>
        </div>

        {/* Right Column: Track Metadata */}
        <div style={{
          position: 'relative',
          width: (W * 2) / 3,
          height: '100%',
          paddingLeft: 80,
          paddingRight: 20,
          paddingTop: 30,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          gap: 8
        }}>
          {currentSong ? (
            <>
              {/* Track Title */}
              <div style={{
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 28,
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                padding: '4px 6px',
                borderRadius: 4,
                display: 'inline-block'
              }}>
                {currentSong.title}
              </div>

              {/* Artist Name */}
              <div style={{
                color: '#ffffff',
                fontWeight: 600,
                fontSize: 22,
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%',
                opacity: 0.9,
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                padding: '4px 6px',
                borderRadius: 4,
                display: 'inline-block'
              }}>
                {currentSong.artist}
              </div>

              {/* Album Name */}
              <div style={{
                color: '#ffffff',
                fontWeight: 600,
                fontSize: 20,
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%',
                opacity: 0.85,
                marginTop: 4,
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                padding: '4px 6px',
                borderRadius: 4,
                display: 'inline-block'
              }}>
                {currentSong.album}
              </div>

              {/* Track Position */}
              <div style={{
                color: '#ffffff',
                fontWeight: 600,
                fontSize: 18,
                lineHeight: 1.2,
                opacity: 0.8,
                marginTop: 12,
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                padding: '4px 6px',
                borderRadius: 4,
                display: 'inline-block'
              }}>
                {(() => {
                  const currentTrack = selectedSongIndex + 1;
                  const totalTracks = 5;
                  return `${currentTrack}/${totalTracks}`;
                })()}
              </div>
            </>
          ) : (
            <div style={{
              color: colors.text_primary,
              fontSize: 18,
              opacity: 0.7,
              marginTop: 20
            }}>
              No track selected
            </div>
          )}
        </div>
      </div>

      {/* Bottom Playback Timeline */}
      <div style={{
        position: 'absolute',
        left: 0,
        bottom: 0,
        width: W,
        height: 60,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        paddingLeft: 20,
        paddingRight: 20,
        paddingBottom: 10
      }}>
        {/* Progress Bar */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: 2,
          backgroundColor: playerConfig.progressBackgroundColor || '#ffca71',
          borderRadius: 1,
          marginBottom: 8
        }}>
          {/* Progress Indicator */}
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: `${playbackProgress * 100}%`,
            height: '100%',
            backgroundColor: playerConfig.progressColor || '#2bb7ff',
            borderRadius: 1,
            transition: 'width 0.3s ease'
          }} />
          {/* Current Position Indicator */}
          <div style={{
            position: 'absolute',
            left: `${playbackProgress * 100}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: playerConfig.progressColor || '#2bb7ff',
            border: '1px solid rgba(0,0,0,0.3)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
          }} />
        </div>

        {/* Time Display */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          color: '#ffffff',
          fontSize: 16,
          fontWeight: 600,
          opacity: 0.9
        }}>
          {/* Elapsed Time */}
          <span style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '4px 6px', borderRadius: 4, display: 'inline-block' }}>
            {(() => {
              const minutes = Math.floor(elapsedTime / 60);
              const seconds = Math.floor(elapsedTime % 60);
              return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            })()}
          </span>

          {/* Total Duration */}
          <span style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '4px 6px', borderRadius: 4, display: 'inline-block' }}>
            {currentSong ? (() => {
              const minutes = Math.floor(currentSong.duration / 60);
              const seconds = Math.floor(currentSong.duration % 60);
              return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            })() : '00:00'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default NowPlayingView;
