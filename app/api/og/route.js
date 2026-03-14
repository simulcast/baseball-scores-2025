import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fetchGameMeta } from '../../../src/utils/fetchGameMeta';
import { formatInning, formatGameTime } from '../../../src/utils/formatGameDisplay';

// Node.js runtime required for fs access to load local font files
export const runtime = 'nodejs';

// Theme colors from ThemeRegistry.js
const COLORS = {
  bg: '#1a2f16',
  cardStart: '#2d5a27',
  cardEnd: '#1d3a19',
  chipLive: '#8b4513',
  chipFinal: '#2d5a27',
  chipPreview: '#555',
  white: '#ffffff',
  whiteDim: 'rgba(255,255,255,0.7)',
  whiteFaint: 'rgba(255,255,255,0.3)',
  divider: 'rgba(255,255,255,0.2)',
};

// Load Inter fonts from local TTF files at module init (Satori requires TTF, not WOFF2)
const fontsDir = join(process.cwd(), 'public', 'fonts');
let fonts;
try {
  fonts = [
    { name: 'Inter', data: readFileSync(join(fontsDir, 'Inter-Regular.ttf')), style: 'normal', weight: 400 },
    { name: 'Inter', data: readFileSync(join(fontsDir, 'Inter-Bold.ttf')), style: 'normal', weight: 700 },
  ];
} catch {
  fonts = [];
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');

    // Validate gameId if present
    if (gameId && !/^\d+$/.test(gameId)) {
      return await renderGenericImage();
    }

    const game = gameId ? await fetchGameMeta(gameId) : null;

    if (!game) {
      return await renderGenericImage();
    }

    return await renderGameImage(game);
  } catch (error) {
    console.error('OG image generation failed:', error);
    return renderFallbackImage();
  }
}

// ─── Game scoreboard card ────────────────────────────────────────

async function renderGameImage(game) {
  const isLive = game.status === 'Live' || game.status === 'In Progress';
  const isFinal = game.status === 'Final';
  const isPreview = game.status === 'Preview';

  const chipLabel = isPreview
    ? formatGameTime(game.gameDate)
    : isLive
      ? formatInning(game)
      : isFinal
        ? 'Final'
        : game.status;

  const chipColor = isLive ? COLORS.chipLive : isFinal ? COLORS.chipFinal : COLORS.chipPreview;

  const cacheMaxAge = isLive ? 60 : 86400;

  // fonts loaded at module level

  return new ImageResponse(
    (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: COLORS.bg,
        padding: '40px',
      }}>
        {/* Card */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          width: '1000px',
          border: `6px solid ${COLORS.white}`,
          background: `linear-gradient(145deg, ${COLORS.cardStart}, ${COLORS.cardEnd})`,
          padding: '40px',
        }}>

          {/* Status chip */}
          <div style={{
            display: 'flex',
            marginBottom: '24px',
          }}>
            <div style={{
              display: 'flex',
              backgroundColor: chipColor,
              color: COLORS.white,
              padding: '6px 16px',
              fontSize: '22px',
              fontWeight: 700,
            }}>
              {chipLabel}
            </div>
          </div>

          {/* Team rows */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}>
            <div style={{
              display: 'flex',
              fontSize: '36px',
              fontWeight: 500,
              color: isLive || isFinal ? COLORS.white : COLORS.whiteDim,
            }}>
              {game.awayTeam.name}
            </div>
            <div style={{
              display: 'flex',
              fontSize: '44px',
              fontWeight: 700,
              color: isLive || isFinal ? COLORS.white : COLORS.whiteDim,
            }}>
              {isPreview ? '' : game.awayScore}
            </div>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: isLive ? '24px' : '0',
          }}>
            <div style={{
              display: 'flex',
              fontSize: '36px',
              fontWeight: 500,
              color: isLive || isFinal ? COLORS.white : COLORS.whiteDim,
            }}>
              {game.homeTeam.name}
            </div>
            <div style={{
              display: 'flex',
              fontSize: '44px',
              fontWeight: 700,
              color: isLive || isFinal ? COLORS.white : COLORS.whiteDim,
            }}>
              {isPreview ? '' : game.homeScore}
            </div>
          </div>

          {/* Live indicators: divider + diamond + counts */}
          {isLive && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Divider */}
              <div style={{
                display: 'flex',
                width: '100%',
                height: '1px',
                backgroundColor: COLORS.divider,
                marginBottom: '24px',
              }} />

              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '40px',
              }}>
                {/* Baseball diamond */}
                {renderDiamond(game.runners)}

                {/* Count indicators */}
                {renderCountIndicator('BALLS', game.balls, 4)}
                {renderCountIndicator('STRIKES', game.strikes, 3)}
                {renderCountIndicator('OUTS', game.outs, 3)}
              </div>
            </div>
          )}
        </div>

        {/* Branding */}
        <div style={{
          display: 'flex',
          marginTop: '24px',
          fontSize: '22px',
          color: COLORS.whiteDim,
          fontWeight: 500,
        }}>
          Baseball Scores
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts,
      headers: {
        'Cache-Control': `public, max-age=${cacheMaxAge}`,
      },
    },
  );
}

// ─── Baseball diamond ────────────────────────────────────────────

function renderDiamond(runners = []) {
  const baseSize = 16;
  const onColor = COLORS.white;
  const offColor = COLORS.whiteFaint;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <div style={{
        display: 'flex',
        fontSize: '12px',
        color: COLORS.whiteDim,
        marginBottom: '8px',
      }}>
        BASES
      </div>
      <div style={{
        display: 'flex',
        position: 'relative',
        width: '52px',
        height: '52px',
      }}>
        {/* 2nd base (top center) */}
        <div style={{
          display: 'flex',
          position: 'absolute',
          top: '0px',
          left: '18px',
          width: `${baseSize}px`,
          height: `${baseSize}px`,
          backgroundColor: runners[1] ? onColor : offColor,
          transform: 'rotate(45deg)',
        }} />
        {/* 3rd base (middle left) */}
        <div style={{
          display: 'flex',
          position: 'absolute',
          top: '18px',
          left: '0px',
          width: `${baseSize}px`,
          height: `${baseSize}px`,
          backgroundColor: runners[2] ? onColor : offColor,
          transform: 'rotate(45deg)',
        }} />
        {/* 1st base (middle right) */}
        <div style={{
          display: 'flex',
          position: 'absolute',
          top: '18px',
          right: '0px',
          width: `${baseSize}px`,
          height: `${baseSize}px`,
          backgroundColor: runners[0] ? onColor : offColor,
          transform: 'rotate(45deg)',
        }} />
      </div>
    </div>
  );
}

// ─── Count indicator dots ────────────────────────────────────────

function renderCountIndicator(label, count, total) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <div style={{
        display: 'flex',
        fontSize: '12px',
        color: COLORS.whiteDim,
        marginBottom: '8px',
      }}>
        {label}
      </div>
      <div style={{
        display: 'flex',
        gap: '6px',
      }}>
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: i < count ? COLORS.white : COLORS.whiteFaint,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Generic branded image (no game) ─────────────────────────────

async function renderGenericImage() {
  // fonts loaded at module level

  // Generate sine wave bars for ambient sound wave motif
  const barCount = 48;
  const bars = Array.from({ length: barCount }, (_, i) => {
    const t = i / barCount;
    // Composite sine waves for organic, ambient feel
    const h = Math.abs(Math.sin(t * Math.PI * 3) * 0.7 + Math.sin(t * Math.PI * 7 + 1) * 0.3);
    return Math.max(4, h * 60);
  });

  return new ImageResponse(
    (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: COLORS.bg,
      }}>
        <div style={{
          display: 'flex',
          fontSize: '64px',
          fontWeight: 700,
          color: COLORS.white,
          marginBottom: '16px',
        }}>
          Baseball Scores
        </div>
        <div style={{
          display: 'flex',
          fontSize: '28px',
          color: COLORS.whiteDim,
          marginBottom: '32px',
        }}>
          ambient soundtracks for the national pastime
        </div>
        {/* Sound wave motif */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          height: '64px',
        }}>
          {bars.map((h, i) => (
            <div
              key={i}
              style={{
                width: '6px',
                height: `${h}px`,
                backgroundColor: COLORS.whiteFaint,
                borderRadius: '3px',
              }}
            />
          ))}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts,
      headers: {
        'Cache-Control': 'public, max-age=86400',
      },
    },
  );
}

// ─── Fallback (render error) ─────────────────────────────────────

function renderFallbackImage() {
  return new ImageResponse(
    (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: COLORS.bg,
        color: COLORS.white,
        fontSize: '48px',
      }}>
        Baseball Scores
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
