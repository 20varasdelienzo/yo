const locales = {
  en: { tag: 'en-US', title: 'Anthropology of the Americas', sections: 'Sections', languages: 'Language' },
  es: { tag: 'es', title: 'Antropología de las Américas', sections: 'Secciones', languages: 'Idioma' },
  de: { tag: 'de', title: 'Anthropologie der Amerikas', sections: 'Abschnitte', languages: 'Sprache' }
};
const requestedLanguage = new URLSearchParams(location.search).get('lang');
const language = Object.hasOwn(locales, requestedLanguage) ? requestedLanguage : 'en';
const locale = locales[language];
const translations = JSON.parse(document.querySelector('#translations').textContent);

document.documentElement.lang = locale.tag;
document.title = 'Joaquín Molina — ' + locale.title;
if (language !== 'en') {
  const copy = translations[language];
  for (const image of document.querySelectorAll('[data-alt]')) {
    image.alt = copy[image.dataset.alt];
  }
  for (const node of document.querySelectorAll('[data-i18n]')) {
    // Only use the translations embedded in this page.
    node.innerHTML = copy[node.dataset.i18n];
  }
  document.querySelector('meta[name="description"]').content =
    'Joaquín Molina — ' + locale.title + '. ' + copy.heroDeck;
}
for (const nav of document.querySelectorAll('[data-label]')) {
  nav.setAttribute('aria-label', locale[nav.dataset.label]);
}
const languageLinks = document.querySelectorAll('.language-nav a');
for (const link of languageLinks) {
  link.dataset.destination = link.getAttribute('href');
  if (link.hreflang === locale.tag) link.setAttribute('aria-current', 'page');
  else link.removeAttribute('aria-current');
}
const followSection = () => {
  for (const link of languageLinks) {
    link.setAttribute('href', link.dataset.destination + location.hash);
  }
};
followSection();
window.addEventListener('hashchange', followSection);

const reduction = window.matchMedia('(prefers-reduced-motion: reduce)');
const headingTargets = [...document.querySelectorAll('[data-assemble]')];
const originalHeadings = headingTargets.map(heading => heading.textContent);
const clamp = value => Math.max(0, Math.min(1, value));
let frame = 0;

function assemble(heading, text) {
  const spoken = document.createElement('span');
  spoken.className = 'visually-hidden';
  spoken.textContent = text;
  const visible = document.createElement('span');
  visible.setAttribute('aria-hidden', 'true');
  const characters = Array.from(text).filter(character => !/\s/u.test(character)).length;
  let index = 0;
  for (const segment of text.split(/(\s+)/u)) {
    if (!segment) continue;
    if (/^\s+$/u.test(segment)) {
      visible.append(document.createTextNode(segment));
      continue;
    }
    const word = document.createElement('span');
    word.className = 'letter-word';
    for (const character of segment) {
      const letter = document.createElement('span');
      letter.className = 'letter';
      letter.textContent = character;
      letter.style.setProperty('--delay', .46 * index / Math.max(1, characters - 1));
      letter.style.setProperty('--drift', index % 2 ? '.035em' : '-.035em');
      word.append(letter);
      index += 1;
    }
    visible.append(word);
  }
  heading.replaceChildren(spoken, visible);
  heading.classList.add('assembled');
}

const map = document.querySelector('.route-map');
const canvas = map.querySelector('canvas');
const context = canvas.getContext('2d');
const stops = [...map.querySelectorAll('.map-stop')].map(stop => ({
  x: Number.parseFloat(stop.style.getPropertyValue('--x')) / 100,
  y: Number.parseFloat(stop.style.getPropertyValue('--y')) / 100
}));

function drawRoute(bounds, progress) {
  if (!context || !bounds.width || !bounds.height) return;
  const density = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.round(bounds.width * density);
  const height = Math.round(bounds.height * density);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  context.setTransform(density, 0, 0, density, 0, 0);
  context.clearRect(0, 0, bounds.width, bounds.height);
  context.strokeStyle = '#8e3d2e';
  context.lineWidth = 1.15;
  context.lineCap = 'round';
  context.beginPath();

  const points = stops.map(({ x, y }) => ({ x: x * bounds.width, y: y * bounds.height }));
  context.moveTo(points[0].x, points[0].y);
  const segments = points.length - 1;
  for (let i = 0; i < segments; i += 1) {
    const fraction = clamp(progress * segments - i);
    if (!fraction) break;
    const start = points[i];
    const end = points[i + 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const bend = i === segments - 1 ? .24 : .16;
    const controlX = (start.x + end.x) / 2 - dy * bend;
    const controlY = (start.y + end.y) / 2 - dx * bend;
    const steps = Math.ceil(fraction * 32);
    for (let step = 1; step <= steps; step += 1) {
      const t = fraction * step / steps;
      const remaining = 1 - t;
      context.lineTo(
        remaining ** 2 * start.x + 2 * remaining * t * controlX + t ** 2 * end.x,
        remaining ** 2 * start.y + 2 * remaining * t * controlY + t ** 2 * end.y
      );
    }
  }
  context.stroke();
}

function render() {
  frame = 0;
  const viewport = window.innerHeight;
  const scrollMax = document.documentElement.scrollHeight - viewport;
  const mapBounds = map.getBoundingClientRect();
  const reveal = reduction.matches ? [] : headingTargets.map(heading => {
    const { top } = heading.getBoundingClientRect();
    return clamp((viewport * .94 - top) / (viewport * .39));
  });
  headingTargets.forEach((heading, i) => {
    if (reveal[i] !== undefined) heading.style.setProperty('--reveal', reveal[i]);
  });
  document.documentElement.style.setProperty('--page-progress', scrollMax > 0 ? clamp(window.scrollY / scrollMax) : 0);
  drawRoute(mapBounds, reduction.matches ? 1 : clamp((viewport * .99 - mapBounds.top) / (viewport * .62)));
}
function requestFrame() {
  if (!frame) frame = requestAnimationFrame(render);
}
function setMotion() {
  headingTargets.forEach((heading, i) => {
    if (reduction.matches) {
      heading.classList.remove('assembled');
      heading.textContent = originalHeadings[i];
    } else if (!heading.classList.contains('assembled')) {
      assemble(heading, originalHeadings[i]);
    }
  });
  requestFrame();
}

setMotion();
window.addEventListener('scroll', requestFrame, { passive: true });
window.addEventListener('resize', requestFrame);
document.addEventListener('toggle', requestFrame, true);
reduction.addEventListener('change', setMotion);
