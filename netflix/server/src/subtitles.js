// Tiny sample WebVTT subtitle generator. In production these files would be
// authored / auto-transcribed and stored alongside the media on the CDN.

const PHRASES = {
  en: [
    'Welcome to the stream.',
    'In the beginning, there was light.',
    'Adaptive bitrate is switching now.',
    'You are watching this in HLS.',
    'Subtitles are rendered from WebVTT.',
    'Press F for fullscreen.',
    'Thanks for watching!',
  ],
  es: [
    'Bienvenido a la transmisión.',
    'Al principio, había luz.',
    'La calidad adaptativa está cambiando.',
    'Estás viendo esto en HLS.',
    'Los subtítulos vienen de WebVTT.',
    'Pulsa F para pantalla completa.',
    '¡Gracias por ver!',
  ],
  fr: [
    'Bienvenue dans le flux.',
    'Au commencement était la lumière.',
    'Le débit adaptatif change maintenant.',
    'Vous regardez ceci en HLS.',
    'Les sous-titres proviennent de WebVTT.',
    'Appuyez sur F pour le plein écran.',
    'Merci d\'avoir regardé !',
  ],
};

const pad = (n) => String(n).padStart(2, '0');
const ts = (sec) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec - Math.floor(sec)) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}.${String(ms).padStart(3, '0')}`;
};

export function generateVtt(lang = 'en') {
  const lines = PHRASES[lang] ?? PHRASES.en;
  let out = 'WEBVTT\n\n';
  lines.forEach((text, i) => {
    const start = i * 8 + 1;
    const end = start + 6;
    out += `${i + 1}\n${ts(start)} --> ${ts(end)}\n${text}\n\n`;
  });
  return out;
}
