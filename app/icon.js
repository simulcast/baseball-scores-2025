import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: '#1a2f16',
        borderRadius: '4px',
      }}>
        <div style={{
          display: 'flex',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: '#ffffff',
        }} />
      </div>
    ),
    { ...size },
  );
}
