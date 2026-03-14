import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: '#1a2f16',
        borderRadius: '32px',
      }}>
        {/* Diamond shape */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '80px',
          height: '80px',
          backgroundColor: '#2d5a27',
          transform: 'rotate(45deg)',
        }}>
          <div style={{
            display: 'flex',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            transform: 'rotate(-45deg)',
          }} />
        </div>
      </div>
    ),
    { ...size },
  );
}
