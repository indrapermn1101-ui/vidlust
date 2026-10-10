import type { ProjectSettings } from '../types';

// Deterministic PRNG (mulberry32)
export function rng(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function loopPhase(time: number, duration: number) {
  // 0..2PI seamless
  const p = (time % duration) / duration;
  return p * Math.PI * 2;
}

// Mode transparan: lewati pengecatan background agar alpha tetap 0.
// drawFrame sudah clearRect di awal, jadi cukup skip fill background.
function isAlpha(s: ProjectSettings) {
  return s.bgMode === 'transparent';
}

function drawText(ctx: CanvasRenderingContext2D, s: ProjectSettings, w: number, h: number) {
  if (!s.showText || !s.text.trim()) return;
  const fontSize = Math.round(Math.min(w, h) * 0.07);
  ctx.save();
  ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // pill background
  const tw = ctx.measureText(s.text).width;
  const pad = fontSize * 0.6;
  const bx = w / 2 - tw / 2 - pad;
  const by = h / 2 - fontSize * 0.75 - pad * 0.4;
  const bw = tw + pad * 2;
  const bh = fontSize * 1.5 + pad * 0.4;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(ctx, bx, by, bw, bh, bh / 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(s.text, w / 2, h / 2);
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  s: ProjectSettings,
  timeSec: number,
) {
  const w = s.width;
  const h = s.height;
  const t = timeSec * s.speed;
  ctx.clearRect(0, 0, w, h);

  switch (s.templateId) {
    case 'geo-loop': return drawGeoLoop(ctx, s, w, h, t);
    case 'particle-flow': return drawParticles(ctx, s, w, h, t);
    case 'gradient-waves': return drawWaves(ctx, s, w, h, t);
    case 'blob-character': return drawBlob(ctx, s, w, h, t);
    case 'infographic-bars': return drawInfographic(ctx, s, w, h, t);
    case 'neon-grid': return drawNeonGrid(ctx, s, w, h, t);
    case 'confetti-burst': return drawConfetti(ctx, s, w, h, t);
    case 'aurora': return drawAurora(ctx, s, w, h, t);
    case 'doodle-lines': return drawDoodle(ctx, s, w, h, t);
    case 'logo-reveal': return drawLogoReveal(ctx, s, w, h, t);
    case 'lower-third': return drawLowerThird(ctx, s, w, h, t);
    case 'kinetic-text': return drawKinetic(ctx, s, w, h, t);
    case 'flow-field': return drawFlowField(ctx, s, w, h, t);
    case 'mesh-gradient': return drawMesh(ctx, s, w, h, t);
    case 'tech-hud': return drawTechHud(ctx, s, w, h, t);
    case 'donut-stats': return drawDonuts(ctx, s, w, h, t);
    case 'pop-elements': return drawPopElements(ctx, s, w, h, t);
    case 'light-dust': return drawLightDust(ctx, s, w, h, t);
    default: return drawGeoLoop(ctx, s, w, h, t);
  }
}

function drawGeoLoop(ctx: CanvasRenderingContext2D, s: ProjectSettings, w: number, h: number, t: number) {
  const phase = loopPhase(t, 8);
  // bg
  if (!isAlpha(s)) {
    const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, s.background);
  g.addColorStop(1, shade(s.background, -18));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  }

  const cx = w / 2, cy = h / 2;
  const R = Math.min(w, h);
  const rand = rng(s.seed);
  const shapes = Math.round(14 * s.density) + 6;

  for (let i = 0; i < shapes; i++) {
    const rr = rand();
    const angle = (i / shapes) * Math.PI * 2 + phase * (i % 2 === 0 ? 1 : -1) * 0.6;
    const dist = (0.12 + rr * 0.38) * R;
    const x = cx + Math.cos(angle) * dist * (w / R) * 1.1;
    const y = cy + Math.sin(angle) * dist * (h / R) * 1.1;
    const size = (0.03 + rr * 0.09) * R;
    const rot = angle + phase * 0.5;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = 0.75;
    const kind = i % 4;
    if (kind === 0) {
      ctx.fillStyle = i % 3 === 0 ? s.primary : s.secondary;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 1) {
      ctx.fillStyle = s.accent;
      ctx.fillRect(-size / 2, -size / 2, size, size);
    } else if (kind === 2) {
      ctx.strokeStyle = s.primary;
      ctx.lineWidth = Math.max(2, R * 0.006);
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.7, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = s.secondary;
      ctx.beginPath();
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2;
        const px = Math.cos(a) * size * 0.7;
        const py = Math.sin(a) * size * 0.7;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  // center ring pulse
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = s.accent;
  ctx.lineWidth = R * 0.01;
  ctx.beginPath();
  ctx.arc(cx, cy, R * (0.18 + 0.03 * Math.sin(phase * 2)), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  drawText(ctx, s, w, h);
}

function drawParticles(ctx: CanvasRenderingContext2D, s: ProjectSettings, w: number, h: number, t: number) {
  const phase = loopPhase(t, 10);
  if (!isAlpha(s)) {
    ctx.fillStyle = s.background;
    ctx.fillRect(0, 0, w, h);
  }

  const rand = rng(s.seed + 7);
  const N = Math.round(Math.min(260, (w * h) / 9000) * s.density);
  const cols = [s.primary, s.secondary, s.accent, '#ffffff'];

  for (let i = 0; i < N; i++) {
    const bx = rand() * w;
    const by = rand() * h;
    const spd = 0.2 + rand() * 0.8;
    const amp = 20 + rand() * 80;
    // seamless drift using sin/cos of phase
    const x = (bx + Math.cos(phase * spd + i) * amp + w) % w;
    const y = (by + Math.sin(phase * spd + i * 1.7) * amp * 0.7 + h) % h;
    const r = (1.5 + rand() * 5) * (Math.min(w, h) / 1080 + 0.5);
    ctx.save();
    ctx.globalAlpha = 0.25 + rand() * 0.65;
    ctx.fillStyle = cols[i % cols.length];
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // glow
    ctx.globalAlpha *= 0.25;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // vignette (skip saat alpha agar tidak menggelapkan piksel transparan)
  if (!isAlpha(s)) {
  const vg = ctx.createRadialGradient(w/2, h/2, Math.min(w,h)*0.3, w/2, h/2, Math.max(w,h)*0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(0,0,w,h);
  }

  drawText(ctx, s, w, h);
}

function drawWaves(ctx: CanvasRenderingContext2D, s: ProjectSettings, w: number, h: number, t: number) {
  const phase = loopPhase(t, 12);
  if (!isAlpha(s)) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, s.background);
  g.addColorStop(0.55, shade(s.background, 12));
  g.addColorStop(1, shade(s.primary, -30));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  }

  const layers = 5;
  for (let L = 0; L < layers; L++) {
    ctx.save();
    ctx.globalAlpha = 0.32 + (L / layers) * 0.45;
    ctx.beginPath();
    ctx.moveTo(0, h);
    const yBase = h * (0.35 + L * 0.12);
    const amp = h * (0.04 + L * 0.015);
    for (let x = 0; x <= w; x += Math.max(4, w / 160)) {
      const y =
        yBase +
        Math.sin((x / w) * Math.PI * (2 + L * 0.6) + phase + L) * amp +
        Math.sin((x / w) * Math.PI * 5 - phase * 1.3) * amp * 0.35;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    const lg = ctx.createLinearGradient(0, yBase - 100, 0, h);
    if (L % 2 === 0) {
      lg.addColorStop(0, s.primary);
      lg.addColorStop(1, s.secondary);
    } else {
      lg.addColorStop(0, s.secondary);
      lg.addColorStop(1, s.accent);
    }
    ctx.fillStyle = lg;
    ctx.fill();
    ctx.restore();
  }
  drawText(ctx, s, w, h);
}

function drawBlob(ctx: CanvasRenderingContext2D, s: ProjectSettings, w: number, h: number, t: number) {
  const phase = loopPhase(t, 4);
  // bg with soft dots pattern
  if (!isAlpha(s)) {
    ctx.fillStyle = s.background;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = s.primary;
  const gap = Math.min(w, h) / 12;
  for (let x = gap/2; x < w; x += gap) {
    for (let y = gap/2; y < h; y += gap) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI*2);
      ctx.fill();
    }
  }
  ctx.restore();

  const groundY = h * 0.78;
  // ground shadow (skip saat alpha)
  if (!isAlpha(s)) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(w/2, groundY + h*0.04, w*0.18, h*0.03, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
  }

  const bounce = Math.abs(Math.sin(phase)) ;
  const by = groundY - bounce * h * 0.12;
  const squash = 1 - bounce * 0.08;

  const bx = w/2 + Math.sin(phase*0.5)*w*0.05;
  const R = Math.min(w,h)*0.18;

  // body
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(1/squash, squash);
  const bg = ctx.createLinearGradient(0, -R, 0, R);
  bg.addColorStop(0, s.primary);
  bg.addColorStop(1, s.secondary);
  ctx.fillStyle = bg;
  // blob path (wobbly circle)
  ctx.beginPath();
  for (let a = 0; a <= Math.PI*2 + 0.1; a += 0.12) {
    const wob = 1 + 0.08*Math.sin(a*3 + phase*2);
    const px = Math.cos(a)*R*wob;
    const py = Math.sin(a)*R*wob;
    if (a === 0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
  }
  ctx.closePath();
  ctx.fill();
  // eyes
  const eyeY = -R*0.15;
  const eyeDX = R*0.32;
  const blink = (Math.sin(phase*2) > 0.96) ? 0.1 : 1;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(-eyeDX, eyeY, R*0.22, R*0.26*blink, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(eyeDX, eyeY, R*0.22, R*0.26*blink, 0, 0, Math.PI*2); ctx.fill();
  if (blink > 0.5) {
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath(); ctx.arc(-eyeDX + R*0.05, eyeY, R*0.1, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(eyeDX - R*0.05, eyeY, R*0.1, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-eyeDX + R*0.02, eyeY - R*0.04, R*0.035, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(eyeDX - R*0.08, eyeY - R*0.04, R*0.035, 0, Math.PI*2); ctx.fill();
  }
  // smile
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = Math.max(3, R*0.04);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, R*0.15, R*0.28, Math.PI*0.15, Math.PI*0.85);
  ctx.stroke();
  // cheeks
  ctx.fillStyle = s.accent;
  ctx.globalAlpha = 0.7;
  ctx.beginPath(); ctx.arc(-R*0.55, R*0.18, R*0.12, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(R*0.55, R*0.18, R*0.12, 0, Math.PI*2); ctx.fill();
  ctx.restore();

  // floating mini blobs
  const rand = rng(s.seed);
  for (let i = 0; i < 6; i++) {
    const fx = rand()*w;
    const fy = (rand()*h*0.6 + Math.sin(phase + i)*20 + h) % h;
    const fr = R*(0.12+rand()*0.15);
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = i%2===0 ? s.accent : s.secondary;
    ctx.beginPath(); ctx.arc(fx, fy*0.7, fr, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // custom text at top instead of center for this template
  if (s.showText && s.text.trim()) {
    ctx.save();
    ctx.font = `800 ${Math.round(Math.min(w,h)*0.06)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 12;
    ctx.fillText(s.text, w/2, h*0.14);
    ctx.restore();
  }
}

function drawInfographic(ctx: CanvasRenderingContext2D, s: ProjectSettings, w: number, h: number, t: number) {
  const phase = loopPhase(t, 8);
  const prog = (phase / (Math.PI*2)); // 0..1
  if (!isAlpha(s)) {
  ctx.fillStyle = s.background;
  ctx.fillRect(0,0,w,h);
  }

  const pad = w*0.08;
  const chartW = w - pad*2;
  const chartH = h*0.52;
  const chartY = h*0.22;

  // card
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundRect(ctx, pad*0.6, h*0.12, w-pad*1.2, h*0.72, 24);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  const bars = 7;
  const gap = chartW / bars;
  const rand = rng(s.seed + 3);
  const vals: number[] = [];
  for (let i=0;i<bars;i++) vals.push(0.3+rand()*0.7);

  for (let i=0;i<bars;i++) {
    const eased = easeInOut(Math.min(1, Math.max(0, prog*1.6 - i*0.08)));
    const bh = chartH * vals[i] * eased;
    const bx = pad + i*gap + gap*0.18;
    const bw = gap*0.64;
    const by = chartY + chartH - bh;
    const g = ctx.createLinearGradient(0, by, 0, by+bh);
    g.addColorStop(0, s.primary);
    g.addColorStop(1, s.secondary);
    ctx.fillStyle = g;
    roundRect(ctx, bx, by, bw, Math.max(4,bh), 10);
    ctx.fill();
    // value dot on top
    if (eased > 0.9) {
      ctx.fillStyle = s.accent;
      ctx.beginPath();
      ctx.arc(bx+bw/2, by-12, 6, 0, Math.PI*2);
      ctx.fill();
    }
  }
  // trend line
  ctx.save();
  ctx.strokeStyle = s.accent;
  ctx.lineWidth = Math.max(3, w*0.004);
  ctx.beginPath();
  for (let i=0;i<bars;i++) {
    const eased = easeInOut(Math.min(1, Math.max(0, prog*1.6 - i*0.08)));
    const bh = chartH * vals[i] * eased;
    const x = pad + i*gap + gap*0.5;
    const y = chartY + chartH - bh - 22;
    if (i===0) ctx.moveTo(x,y); else {
      const px = pad + (i-1)*gap + gap*0.5;
      const pyv = chartY + chartH - chartH*vals[i-1]*easeInOut(Math.min(1, Math.max(0, prog*1.6-(i-1)*0.08))) - 22;
      ctx.bezierCurveTo(px+gap*0.4, pyv, x-gap*0.4, y, x, y);
    }
  }
  ctx.stroke();
  ctx.restore();

  drawText(ctx, s, w, h);
}

function drawNeonGrid(ctx: CanvasRenderingContext2D, s: ProjectSettings, w: number, h: number, t: number) {
  const phase = loopPhase(t, 6);
  // sky (skip saat alpha)
  if (!isAlpha(s)) {
  const sky = ctx.createLinearGradient(0,0,0,h);
  sky.addColorStop(0, '#0b0620');
  sky.addColorStop(0.5, shade(s.background, -40));
  sky.addColorStop(0.62, s.background);
  sky.addColorStop(1, '#050310');
  ctx.fillStyle = sky;
  ctx.fillRect(0,0,w,h);
  }

  const horizon = h*0.55;
  // sun
  const sunR = Math.min(w,h)*0.22;
  const sunX = w/2, sunY = horizon - sunR*0.25;
  const sunG = ctx.createLinearGradient(0, sunY-sunR, 0, sunY+sunR);
  sunG.addColorStop(0, s.accent);
  sunG.addColorStop(0.5, s.primary);
  sunG.addColorStop(1, s.secondary);
  ctx.save();
  ctx.fillStyle = sunG;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(sunX-sunR, sunY, sunR*2, sunR*0.2);
  // sun stripes
  ctx.fillStyle = '#0b0620';
  for (let i=0;i<5;i++) {
    const sy = sunY - sunR*0.6 + i*sunR*0.22 + Math.sin(phase)*2;
    ctx.fillRect(sunX-sunR, sy, sunR*2, sunR*0.045);
  }
  ctx.restore();

  // grid
  ctx.save();
  ctx.strokeStyle = s.primary;
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = Math.max(1, w*0.0015);
  // horizontal lines moving toward viewer (loop)
  const lines = 14;
  for (let i=0;i<lines;i++) {
    const p = ((i/lines) + (phase/(Math.PI*2))) % 1;
    const y = horizon + Math.pow(p, 2.2) * (h-horizon);
    ctx.globalAlpha = 0.15 + p*0.7;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  // vertical perspective
  ctx.globalAlpha = 0.55;
  for (let i=-10;i<=10;i++) {
    ctx.beginPath();
    ctx.moveTo(w/2 + i*w*0.06, horizon);
    ctx.lineTo(w/2 + i*w*0.22, h);
    ctx.stroke();
  }
  ctx.restore();

  // stars
  const rand = rng(s.seed+11);
  ctx.save();
  ctx.fillStyle = '#fff';
  for (let i=0;i<60*s.density;i++) {
    const x = rand()*w;
    const y = rand()*horizon*0.9;
    const twk = 0.3+0.7*Math.abs(Math.sin(phase*2+i));
    ctx.globalAlpha = twk*0.9;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.restore();

  drawText(ctx, s, w, h);
}

function drawConfetti(ctx: CanvasRenderingContext2D, s: ProjectSettings, w: number, h: number, t: number) {
  const phase = loopPhase(t, 6);
  const prog = phase / (Math.PI * 2); // 0..1 loop
  if (!isAlpha(s)) {
    ctx.fillStyle = s.background;
    ctx.fillRect(0, 0, w, h);
  }

  const rand = rng(s.seed + 21);
  const N = Math.round(90 * s.density) + 30;
  const cols = [s.primary, s.secondary, s.accent, '#ffffff', '#fbbf24'];
  // confetti jatuh dari atas, wrap seamless: y = (y0 + prog*h*(1+speed)) % (h+40) - 20
  for (let i = 0; i < N; i++) {
    const x0 = rand() * w;
    const y0 = rand() * (h + 80) - 40;
    const fallSpeed = 0.5 + rand() * 1.2;
    const sway = 30 + rand() * 60;
    const y = (((y0 + prog * h * fallSpeed * 1.5) % (h + 80)) + h + 80) % (h + 80) - 40;
    const x = (x0 + Math.sin(phase * (0.8 + fallSpeed * 0.4) + i * 1.3) * sway + w) % w;
    const rot = phase * (1 + fallSpeed) + i;
    const cw = (6 + rand() * 10) * (Math.min(w, h) / 900);
    const ch = cw * (0.5 + rand() * 0.8);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = cols[i % cols.length];
    if (i % 3 === 0) {
      ctx.beginPath();
      ctx.arc(0, 0, cw * 0.55, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
    }
    ctx.restore();
  }
  drawText(ctx, s, w, h);
}

function drawAurora(ctx: CanvasRenderingContext2D, s: ProjectSettings, w: number, h: number, t: number) {
  const phase = loopPhase(t, 14);
  // night sky (skip saat alpha, bintang tetap tampil sebagai sparkle)
  if (!isAlpha(s)) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#020617');
  sky.addColorStop(0.6, shade(s.background, -20));
  sky.addColorStop(1, '#000000');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  }
  // stars
  const rand = rng(s.seed + 31);
  ctx.save();
  for (let i = 0; i < 110 * s.density; i++) {
    const x = rand() * w;
    const y = rand() * h * 0.55;
    ctx.globalAlpha = 0.25 + 0.65 * Math.abs(Math.sin(phase + i));
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.restore();
  // aurora bands
  const bands = 4;
  for (let b = 0; b < bands; b++) {
    ctx.save();
    ctx.globalAlpha = 0.35 + b * 0.08;
    ctx.beginPath();
    const yBase = h * (0.22 + b * 0.09);
    ctx.moveTo(0, h * 0.6);
    for (let x = 0; x <= w; x += Math.max(4, w / 180)) {
      const y =
        yBase +
        Math.sin((x / w) * Math.PI * 2 + phase * (1 + b * 0.25) + b * 2) * h * 0.07 +
        Math.sin((x / w) * Math.PI * 5 - phase * 0.7) * h * 0.02;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    // glow thickness
    ctx.lineWidth = h * (0.10 - b * 0.015);
    ctx.strokeStyle = b % 2 === 0 ? s.primary : b % 3 === 0 ? s.accent : s.secondary;
    ctx.shadowColor = ctx.strokeStyle as string;
    ctx.shadowBlur = 40;
    ctx.stroke();
    ctx.restore();
  }
  // mountains silhouette
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += w / 24) {
    const r = rng(s.seed + x);
    const y = h * (0.78 + r() * 0.12);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  drawText(ctx, s, w, h);
}

function drawDoodle(ctx: CanvasRenderingContext2D, s: ProjectSettings, w: number, h: number, t: number) {
  const phase = loopPhase(t, 9);
  const prog = phase / (Math.PI * 2);
  // paper bg
  if (!isAlpha(s)) {
    ctx.fillStyle = s.background;
    ctx.fillRect(0, 0, w, h);
  }
  // subtle grid paper (skip saat alpha agar bersih)
  if (!isAlpha(s)) {
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  const gap = Math.min(w, h) / 16;
  for (let x = 0; x < w; x += gap) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += gap) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.restore();
  }

  const rand = rng(s.seed + 41);
  const strokes = Math.round(5 * s.density) + 3;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < strokes; i++) {
    const yBase = h * (0.2 + (i / strokes) * 0.6);
    const amp = h * (0.03 + rand() * 0.05);
    const col = [s.primary, s.secondary, s.accent][i % 3];
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(3, Math.min(w, h) * 0.008);
    ctx.globalAlpha = 0.95;
    // draw-on effect: only reveal portion based on prog, staggered per stroke
    const reveal = Math.min(1, Math.max(0, prog * (strokes * 0.6) - i * 0.35));
    if (reveal <= 0) continue;
    ctx.beginPath();
    const steps = 60;
    const upto = Math.floor(steps * reveal);
    for (let k = 0; k <= upto; k++) {
      const x = (k / steps) * w * 0.8 + w * 0.1;
      const y = yBase + Math.sin((k / steps) * Math.PI * (2 + (i % 3)) + i) * amp + Math.sin(phase + i) * 4;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // pen tip
    if (reveal < 1 && upto > 0) {
      const x = (upto / steps) * w * 0.8 + w * 0.1;
      const y = yBase + Math.sin((upto / steps) * Math.PI * (2 + (i % 3)) + i) * amp;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(x, y, ctx.lineWidth * 1.1, 0, Math.PI * 2); ctx.fill();
    }
    // doodle shapes: star / circle at end of some strokes
    if (reveal > 0.98 && i % 2 === 0) {
      const ex = w * 0.9;
      ctx.save();
      ctx.translate(ex - i * 8, yBase);
      ctx.rotate(phase * (i % 2 === 0 ? 1 : -1));
      ctx.strokeStyle = col;
      ctx.beginPath();
      ctx.arc(0, 0, 14 + (i % 3) * 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
  drawText(ctx, s, w, h);
}

function drawLogoReveal(ctx: CanvasRenderingContext2D, s: ProjectSettings, w: number, h: number, t: number) {
  const phase = loopPhase(t, 8);
  if (!isAlpha(s)) {
    const g = ctx.createRadialGradient(w/2, h/2, 10, w/2, h/2, Math.max(w,h)*0.7);
    g.addColorStop(0, shade(s.background, 22));
    g.addColorStop(1, s.background);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  const cx = w/2, cy = h/2;
  const R = Math.min(w,h);
  const pulse = 1 + 0.035 * Math.sin(phase * 2);

  // ring luar berputar (dash)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(phase * 0.5);
  ctx.strokeStyle = s.accent;
  ctx.lineWidth = Math.max(2, R * 0.008);
  ctx.setLineDash([R * 0.09, R * 0.05]);
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.30 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // ring kedua kontra-rotasi
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-phase * 0.8);
  ctx.strokeStyle = s.secondary;
  ctx.lineWidth = Math.max(1.5, R * 0.005);
  ctx.setLineDash([R * 0.03, R * 0.07]);
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.24 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // emblem
  const er = R * 0.17 * pulse;
  const eg = ctx.createLinearGradient(cx - er, cy - er, cx + er, cy + er);
  eg.addColorStop(0, s.primary);
  eg.addColorStop(1, s.secondary);
  ctx.save();
  ctx.fillStyle = eg;
  ctx.shadowColor = s.primary;
  ctx.shadowBlur = R * 0.05;
  ctx.beginPath();
  ctx.arc(cx, cy, er, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // huruf monogram dari teks
  const letter = (s.text.trim()[0] || 'V').toUpperCase();
  ctx.save();
  ctx.font = `800 ${Math.round(er * 1.05)}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(letter, cx, cy + er * 0.05);
  ctx.restore();

  // partikel orbit
  const rand = rng(s.seed + 51);
  for (let i = 0; i < 8; i++) {
    const a = phase * (i % 2 === 0 ? 1 : -1) * 0.9 + rand() * Math.PI * 2;
    const rr = R * (0.27 + (i % 3) * 0.035);
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = i % 2 === 0 ? s.accent : '#ffffff';
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, R * 0.008 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // kilau menyapu (periodik, seamless karena fungsi prog loop)
  const prog = phase / (Math.PI * 2);
  const sx = (prog * 1.8 - 0.4) * w;
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.translate(sx, 0);
  ctx.rotate(0.35);
  const sh = ctx.createLinearGradient(0, 0, w * 0.12, 0);
  sh.addColorStop(0, 'rgba(255,255,255,0)');
  sh.addColorStop(0.5, '#ffffff');
  sh.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(-w * 0.06, -h * 0.3, w * 0.12, h * 1.6);
  ctx.restore();

  if (s.showText && s.text.trim()) {
    ctx.save();
    ctx.font = `700 ${Math.round(R * 0.045)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.92;
    ctx.fillText(s.text.toUpperCase(), cx, cy + R * 0.38);
    ctx.restore();
  }
}

function drawLowerThird(ctx: CanvasRenderingContext2D, s: ProjectSettings, w: number, h: number, t: number) {
  const phase = loopPhase(t, 9);
  const prog = phase / (Math.PI * 2);
  if (!isAlpha(s)) {
    ctx.fillStyle = s.background;
    ctx.fillRect(0, 0, w, h);
  }
  // pola diagonal halus (skip saat alpha)
  if (!isAlpha(s)) {
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let x = -h; x < w + h; x += 46) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + h * 0.4, h); ctx.stroke();
    }
    ctx.restore();
  }
  // envelope: masuk 0–0.15, tahan, keluar 0.8–1 (seamless karena 0 & 1 tersembunyi)
  const env = prog < 0.15 ? easeInOut(prog / 0.15) : prog > 0.8 ? easeInOut((1 - prog) / 0.2) : 1;
  if (env <= 0.01) return;
  const parts = (s.text || 'NAMA ANDA|Jabatan / Perusahaan').split('|');
  const main = (parts[0] || 'NAMA ANDA').trim().toUpperCase() || 'NAMA ANDA';
  const sub = (parts[1] || 'Jabatan / Perusahaan').trim() || 'Jabatan / Perusahaan';

  const pad = w * 0.07;
  const bw = w * 0.55, bh = h * 0.17;
  const bx = pad - (1 - env) * w * 0.65;
  const by = h * 0.68;
  const R = Math.min(w, h);

  ctx.save();
  ctx.globalAlpha = env;
  // kartu
  ctx.fillStyle = 'rgba(10,10,25,0.82)';
  roundRect(ctx, bx, by, bw, bh, 14);
  ctx.fill();
  // aksen kiri
  ctx.fillStyle = s.accent;
  roundRect(ctx, bx, by, Math.max(6, w * 0.008), bh, 7);
  ctx.fill();
  // garis bawah animasi
  ctx.fillStyle = s.primary;
  roundRect(ctx, bx + 24, by + bh - 8, (bw - 48) * env, 4, 2);
  ctx.fill();
  // teks
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = `800 ${Math.round(R * 0.052)}px Inter, system-ui, sans-serif`;
  ctx.fillText(main.slice(0, 28), bx + 28, by + bh * 0.44);
  ctx.globalAlpha = env * 0.75;
  ctx.fillStyle = s.secondary;
  ctx.font = `500 ${Math.round(R * 0.032)}px Inter, system-ui, sans-serif`;
  ctx.fillText(sub.slice(0, 42), bx + 28, by + bh * 0.74);
  ctx.restore();
}

function drawKinetic(ctx: CanvasRenderingContext2D, s: ProjectSettings, w: number, h: number, t: number) {
  const phase = loopPhase(t, 7);
  if (!isAlpha(s)) {
    ctx.fillStyle = s.background;
    ctx.fillRect(0, 0, w, h);
  }
  const words = (s.text.trim() || 'MOTION GRAPHIC LOOP').split(/\s+/).slice(0, 8);
  const R = Math.min(w, h);
  const base = Math.min(R * 0.11, (w * 0.9) / Math.max(1, ...words.map((x) => x.length)) * 1.15);
  const cols = [s.primary, '#ffffff', s.secondary, s.accent];
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lineH = base * 1.25;
  const y0 = h / 2 - ((words.length - 1) * lineH) / 2;
  words.forEach((word, i) => {
    const sway = Math.sin(phase * 1.4 - i * 0.85);
    const y = y0 + i * lineH + sway * R * 0.02;
    const sc = 1 + 0.10 * Math.max(0, Math.sin(phase * 1.4 - i * 0.85 + 0.6));
    ctx.save();
    ctx.translate(w / 2 + Math.cos(phase - i * 0.7) * R * 0.012, y);
    ctx.rotate(sway * 0.045);
    ctx.scale(sc, sc);
    ctx.globalAlpha = 0.55 + 0.45 * Math.max(0, Math.sin(phase * 1.4 - i * 0.85 + 1.2));
    ctx.font = `900 ${Math.round(base)}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = cols[i % cols.length];
    ctx.fillText(word.toUpperCase().slice(0, 16), 0, 0);
    ctx.restore();
  });
  ctx.restore();
}

function backOut(u: number) {
  const c = 1.70158;
  const v = Math.min(1, Math.max(0, u)) - 1;
  return 1 + (c + 1) * v * v * v + c * v * v;
}

function drawFlowField(ctx: CanvasRenderingContext2D, s: ProjectSettings, w: number, h: number, t: number) {
  const phase = loopPhase(t, 12);
  if (!isAlpha(s)) {
    ctx.fillStyle = s.background;
    ctx.fillRect(0, 0, w, h);
  }
  const rand = rng(s.seed + 61);
  const N = Math.round(Math.min(520, (w * h) / 5200) * s.density) + 60;
  const cols = [s.primary, s.secondary, s.accent];
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < N; i++) {
    const bx = rand() * w;
    const by = rand() * h;
    // offset aliran murni fungsi posisi + fase → deterministik & seamless
    const ox = Math.sin(bx * 0.004 + phase + i * 0.13) * 46 + Math.cos(by * 0.003 - phase * 0.6) * 30;
    const oy = Math.cos(by * 0.004 - phase * 0.8 + i * 0.07) * 46 + Math.sin(bx * 0.003 + phase * 0.5) * 30;
    const eps = 0.06;
    const ox2 = Math.sin(bx * 0.004 + phase + eps + i * 0.13) * 46 + Math.cos(by * 0.003 - (phase + eps) * 0.6) * 30;
    const oy2 = Math.cos(by * 0.004 - (phase + eps) * 0.8 + i * 0.07) * 46 + Math.sin(bx * 0.003 + (phase + eps) * 0.5) * 30;
    ctx.strokeStyle = cols[i % cols.length];
    ctx.globalAlpha = 0.28 + (i % 5) * 0.12;
    ctx.lineWidth = Math.max(1, Math.min(w, h) * 0.0022);
    ctx.beginPath();
    ctx.moveTo(bx + ox - ox2 * 2.2, by + oy - oy2 * 2.2);
    ctx.lineTo(bx + ox, by + oy);
    ctx.stroke();
  }
  ctx.restore();
  drawText(ctx, s, w, h);
}

function drawMesh(ctx: CanvasRenderingContext2D, s: ProjectSettings, w: number, h: number, t: number) {
  const phase = loopPhase(t, 14);
  if (!isAlpha(s)) {
    ctx.fillStyle = s.background;
    ctx.fillRect(0, 0, w, h);
  }
  const cols = [s.primary, s.secondary, s.accent, s.primary, s.secondary];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const cx = w * (0.5 + 0.34 * Math.sin(phase * (0.5 + i * 0.13) + i * 2.1));
    const cy = h * (0.5 + 0.34 * Math.cos(phase * (0.4 + i * 0.11) + i * 1.3));
    const r = Math.min(w, h) * (0.32 + 0.08 * Math.sin(phase + i * 1.7));
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, cols[i]);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = isAlpha(s) ? 0.75 : 0.55;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  drawText(ctx, s, w, h);
}

function drawTechHud(ctx: CanvasRenderingContext2D, s: ProjectSettings, w: number, h: number, t: number) {
  const phase = loopPhase(t, 10);
  if (!isAlpha(s)) {
    ctx.fillStyle = s.background;
    ctx.fillRect(0, 0, w, h);
  } else {
    // grid samar tetap membantu nuansa HUD pada alpha
    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.strokeStyle = s.primary;
    ctx.lineWidth = 1;
    const gap = Math.min(w, h) / 14;
    for (let x = 0; x < w; x += gap) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += gap) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.restore();
  }
  const cx = w / 2, cy = h / 2;
  const R = Math.min(w, h);
  const lw = Math.max(1.5, R * 0.004);

  // ring berputar
  [[0.30, 1, s.primary, 0.09], [0.23, -1.4, s.secondary, 0.05]].forEach(([rr, dir, col, dash]) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(phase * (dir as number));
    ctx.strokeStyle = col as string;
    ctx.lineWidth = lw;
    ctx.setLineDash([R * (dash as number), R * 0.04]);
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(0, 0, R * (rr as number), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
  // inti + persen berdenyut
  const pct = 62 + Math.round(18 * Math.sin(phase * 1.5));
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = s.accent;
  ctx.font = `800 ${Math.round(R * 0.075)}px Inter, system-ui, sans-serif`;
  ctx.fillText(`${pct}%`, cx, cy);
  ctx.fillStyle = s.primary;
  ctx.globalAlpha = 0.8;
  ctx.font = `600 ${Math.round(R * 0.022)}px Inter, system-ui, sans-serif`;
  ctx.fillText('SYS.ONLINE', cx, cy + R * 0.07);
  ctx.restore();

  // garis pindai ping-pong (seamless)
  const sy = cy + Math.sin(phase) * R * 0.36;
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = s.accent;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(w * 0.08, sy);
  ctx.lineTo(w * 0.92, sy);
  ctx.stroke();
  ctx.restore();

  // braket sudut
  ctx.save();
  ctx.strokeStyle = s.secondary;
  ctx.lineWidth = lw * 1.4;
  const m = w * 0.045, L = Math.min(w, h) * 0.07;
  [[m, m, 1, 1], [w - m, m, -1, 1], [m, h - m, 1, -1], [w - m, h - m, -1, -1]].forEach(([x, y, dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo((x as number) + L * (dx as number), y as number);
    ctx.lineTo(x as number, y as number);
    ctx.lineTo(x as number, (y as number) + L * (dy as number));
    ctx.stroke();
  });
  ctx.restore();

  // bilah statistik kiri-kanan
  const rand = rng(s.seed + 71);
  for (let side = 0; side < 2; side++) {
    for (let i = 0; i < 8; i++) {
      const v = 0.25 + 0.65 * Math.abs(Math.sin(phase * (0.7 + (i % 3) * 0.3) + i * 1.9 + rand() * 3));
      const bw = w * 0.035;
      const bh = h * 0.30 * v;
      const bx = side === 0 ? w * 0.10 + (i % 4) * bw * 1.7 : w * 0.90 - (i % 4) * bw * 1.7 - bw;
      const by = h * 0.72 - bh + Math.floor(i / 4) * h * 0.05;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = i % 3 === 2 ? s.accent : s.primary;
      ctx.fillRect(bx, by, bw, Math.max(3, bh));
      ctx.restore();
    }
  }
  drawText(ctx, s, w, h);
}

function drawDonuts(ctx: CanvasRenderingContext2D, s: ProjectSettings, w: number, h: number, t: number) {
  const phase = loopPhase(t, 10);
  if (!isAlpha(s)) {
    ctx.fillStyle = s.background;
    ctx.fillRect(0, 0, w, h);
  }
  const R = Math.min(w, h);
  const pad = w * 0.07;
  // kartu panel (dipertahankan juga pada alpha agar terbaca sebagai UI)
  ctx.save();
  ctx.fillStyle = isAlpha(s) ? 'rgba(10,10,28,0.85)' : 'rgba(255,255,255,0.06)';
  roundRect(ctx, pad * 0.6, h * 0.12, w - pad * 1.2, h * 0.76, 26);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  const cols = [s.primary, s.secondary, s.accent];
  const labels = ['SALES', 'USERS', 'ADS'];
  const n = 3;
  const slot = (w - pad * 2) / n;
  for (let i = 0; i < n; i++) {
    const cx = pad + slot * i + slot / 2;
    const cy = h * 0.42;
    const r = Math.min(slot, h * 0.4) * 0.30;
    const v = 0.45 + 0.30 * Math.sin(phase + i * 2.1) + i * 0.08; // berdenyut, seamless
    // track
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = Math.max(8, R * 0.022);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    // nilai
    ctx.strokeStyle = cols[i];
    ctx.shadowColor = cols[i];
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(0.97, Math.max(0.05, v)));
    ctx.stroke();
    ctx.restore();
    // angka + label
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${Math.round(R * 0.05)}px Inter, system-ui, sans-serif`;
    ctx.fillText(`${Math.round(v * 100)}%`, cx, cy + R * 0.018);
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = cols[i];
    ctx.font = `600 ${Math.round(R * 0.024)}px Inter, system-ui, sans-serif`;
    ctx.fillText(labels[i], cx, cy + r + R * 0.055);
    ctx.restore();
  }
  // bilah mini
  for (let i = 0; i < 12; i++) {
    const v = 0.3 + 0.6 * Math.abs(Math.sin(phase * 1.2 + i * 0.9));
    const bw = (w - pad * 2) / 12 * 0.55;
    const bh = h * 0.10 * v;
    const bx = pad + ((w - pad * 2) / 12) * i + bw * 0.25;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = i % 2 === 0 ? s.primary : s.secondary;
    roundRect(ctx, bx, h * 0.80 - bh, bw, Math.max(3, bh), 4);
    ctx.fill();
    ctx.restore();
  }
  drawText(ctx, s, w, h);
}

function drawPopElements(ctx: CanvasRenderingContext2D, s: ProjectSettings, w: number, h: number, t: number) {
  const phase = loopPhase(t, 8);
  const prog = phase / (Math.PI * 2);
  if (!isAlpha(s)) {
    ctx.fillStyle = s.background;
    ctx.fillRect(0, 0, w, h);
  }
  const R = Math.min(w, h);
  const cols = [s.primary, s.secondary, s.accent, '#ffffff'];
  const items: { x: number; y: number; kind: number }[] = [
    { x: 0.20, y: 0.30, kind: 0 }, { x: 0.50, y: 0.22, kind: 1 }, { x: 0.78, y: 0.32, kind: 2 },
    { x: 0.28, y: 0.70, kind: 3 }, { x: 0.55, y: 0.74, kind: 4 }, { x: 0.80, y: 0.68, kind: 5 },
  ];
  items.forEach((it, i) => {
    // tiap elemen hidup 45% siklus, staggered → selalu kembali 0 sebelum wrap
    const local = Math.min(1, Math.max(0, (prog - i * 0.09) / 0.45));
    if (local <= 0 || local >= 1) return;
    const env = local < 0.75 ? 1 : 1 - (local - 0.75) / 0.25;
    const sc = backOut(local / 0.55) * R * 0.045;
    const x = it.x * w + Math.sin(phase * 2 + i) * 6;
    const y = it.y * h;
    ctx.save();
    ctx.globalAlpha = env;
    ctx.translate(x, y);
    ctx.strokeStyle = cols[i % cols.length];
    ctx.fillStyle = cols[i % cols.length];
    ctx.lineWidth = Math.max(3, R * 0.008);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (it.kind === 0) { // panah kanan
      ctx.beginPath(); ctx.moveTo(-sc, -sc * 0.6); ctx.lineTo(0, 0); ctx.lineTo(-sc, sc * 0.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-sc * 1.4, 0); ctx.lineTo(sc * 0.5, 0); ctx.stroke();
    } else if (it.kind === 1) { // ring
      ctx.beginPath(); ctx.arc(0, 0, sc, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, sc * 0.25, 0, Math.PI * 2); ctx.fill();
    } else if (it.kind === 2) { // bintang
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const rad = k % 2 === 0 ? sc : sc * 0.45;
        const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
        if (k === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
        else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath(); ctx.fill();
    } else if (it.kind === 3) { // centang
      ctx.beginPath(); ctx.moveTo(-sc, 0); ctx.lineTo(-sc * 0.2, sc * 0.6); ctx.lineTo(sc, -sc * 0.6); ctx.stroke();
    } else if (it.kind === 4) { // garis
      ctx.beginPath(); ctx.moveTo(-sc * 1.2, 0); ctx.lineTo(sc * 1.2, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(-sc * 1.2, 0, sc * 0.18, 0, Math.PI * 2); ctx.fill();
    } else { // plus
      ctx.beginPath(); ctx.moveTo(-sc * 0.7, 0); ctx.lineTo(sc * 0.7, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -sc * 0.7); ctx.lineTo(0, sc * 0.7); ctx.stroke();
    }
    ctx.restore();
  });
  drawText(ctx, s, w, h);
}

function drawLightDust(ctx: CanvasRenderingContext2D, s: ProjectSettings, w: number, h: number, t: number) {
  const phase = loopPhase(t, 16);
  if (!isAlpha(s)) {
    ctx.fillStyle = s.background;
    ctx.fillRect(0, 0, w, h);
  }
  const R = Math.min(w, h);
  // blob cahaya besar, sangat lembut
  const rand = rng(s.seed + 81);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const cx = w * (0.5 + 0.3 * Math.sin(phase * 0.4 + i * 1.9));
    const cy = h * (0.5 + 0.3 * Math.cos(phase * 0.3 + i * 2.4));
    const r = R * (0.25 + (i % 2) * 0.12);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    const col = [s.primary, s.secondary, s.accent, '#ffffff'][i % 4];
    g.addColorStop(0, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // debu melayang (drift sinusoidal → seamless)
  const N = Math.round(70 * s.density) + 20;
  for (let i = 0; i < N; i++) {
    const bx = rand() * w;
    const by = rand() * h;
    const x = (bx + Math.sin(phase * 0.7 + i * 1.7) * 40 + w) % w;
    const y = (by + Math.cos(phase * 0.55 + i * 1.3) * h * 0.07 + Math.sin(phase * 0.3 + i * 0.5) * 24 + h * 2) % h;
    const tw = 0.25 + 0.75 * Math.abs(Math.sin(phase * 1.2 + i * 2.3));
    const r = (0.8 + (i % 4) * 0.9) * (R / 900 + 0.4);
    ctx.globalAlpha = tw * 0.8;
    ctx.fillStyle = i % 4 === 3 ? '#ffffff' : s.accent;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.6, r), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  drawText(ctx, s, w, h);
}

function easeInOut(x: number) {
  return x < 0.5 ? 2*x*x : 1 - Math.pow(-2*x+2, 2)/2;
}

function shade(hex: string, amt: number): string {
  try {
    const c = hex.replace('#','');
    const n = c.length === 3 ? c.split('').map(ch=>ch+ch).join('') : c;
    const num = parseInt(n, 16);
    let r = (num>>16) & 255, g = (num>>8) & 255, b = num & 255;
    r = Math.min(255, Math.max(0, r+amt));
    g = Math.min(255, Math.max(0, g+amt));
    b = Math.min(255, Math.max(0, b+amt));
    return `#${((r<<16)|(g<<8)|b).toString(16).padStart(6,'0')}`;
  } catch { return hex; }
}
