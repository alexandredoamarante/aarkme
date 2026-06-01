import {
  escapeHtml,
  normalizeUsername,
  debounce,
  compressImage,
} from './utils.js';
import { Storage } from './storage.js';
import { SupabaseService } from './supabase-service.js';
import { CONFIG } from './config.js';

/**
 * aarkme Core Application
 */

const STORAGE_KEY = 'aarkme:state:v1';
const MAX_ITEMS = 10;

const categories = {
  movies: {
    label: 'Movies',
    singular: 'movie',
    creator: 'director',
    tag: 'vibe',
    ratio: 'vertical',
    hint: 'Cinema shelf: films, directors, moods, and private mythology.',
  },
  albums: {
    label: 'Albums',
    singular: 'album',
    creator: 'artist',
    tag: 'vibe',
    ratio: 'square',
    hint: 'Records that score the page owner’s inner weather.',
  },
  books: {
    label: 'Books',
    singular: 'book',
    creator: 'author',
    tag: 'genre',
    ratio: 'vertical',
    hint: 'A compact library of obsessions, annotations, and echoes.',
  },
  games: {
    label: 'Games',
    singular: 'game',
    creator: 'studio / developer',
    tag: 'platform',
    ratio: 'vertical',
    hint: 'Playable worlds, favorite systems, and digital folklore.',
  },
};

const themeFields = [
  ['background', 'background', 'color'],
  ['panel', 'panel/card', 'color'],
  ['border', 'border', 'color'],
  ['accent', 'accent', 'color'],
  ['text', 'text', 'color'],
  ['muted', 'muted text', 'color'],
  ['header', 'header', 'color'],
  ['button', 'button', 'color'],
  ['input', 'field', 'color'],
];

const defaultTheme = {
  background: '#050506',
  panel: '#111116',
  border: '#2f2f38',
  accent: '#d8d2c6',
  text: '#f4f0e8',
  muted: '#999489',
  header: '#070708',
  button: '#1b1a1d',
  input: '#0c0c10',
};

const blankItem = () => ({
  title: '',
  creator: '',
  year: '',
  rating: '',
  tag: '',
  note: '',
  cover: '',
  featured: false,
});

const defaultState = () => ({
  version: 1,
  mode: 'public',
  profile: {
    name: 'Nico Vale',
    username: 'nickname',
    bio: 'A compact shrine for films watched after midnight, albums that sound like wet pavement, books with haunted margins, and games that feel like lost rooms.\n\nNo feed. No followers. Just a signal.',
    avatar: '',
  },
  media: {
    movies: makeSlots([
      {
        title: 'Afterimage Motel',
        creator: 'Mira Solace',
        year: '1998',
        rating: '9.4',
        tag: 'neon noir',
        note: 'Feels like a half-remembered broadcast from a city that never dried.',
      },
      {
        title: 'The Glass Orchard',
        creator: 'Theo Wren',
        year: '1977',
        rating: '8.8',
        tag: 'slow gothic',
        note: 'A quiet fever dream with perfect windows, silences, and rain.',
      },
      {
        title: 'Terminal Angels',
        creator: 'Jun Imai',
        year: '2004',
        rating: '9.1',
        tag: 'digital myth',
        note: 'Every frame looks like it was recovered from an abandoned server.',
      },
    ]),
    albums: makeSlots([
      {
        title: 'Static Halo',
        creator: 'Velvet Procession',
        year: '2001',
        rating: '10',
        tag: 'dream goth',
        note: 'A record for empty buses, blue screens, and bedroom halos.',
      },
      {
        title: 'Low Tide Browser',
        creator: 'Moth Index',
        year: '2014',
        rating: '8.9',
        tag: 'humid ambient',
        note: 'Like opening a forgotten folder and finding weather inside.',
      },
      {
        title: 'Pearl Error',
        creator: 'Saint Cache',
        year: '1996',
        rating: '9.2',
        tag: 'trip-hop relic',
        note: 'Dusty, private, cinematic, and a little corrupted.',
      },
    ]),
    books: makeSlots([
      {
        title: 'The Archive of Soft Machines',
        creator: 'E. V. Marlow',
        year: '1986',
        rating: '9.0',
        tag: 'speculative',
        note: 'One of those books that changes the color of the room.',
      },
      {
        title: 'Bedrooms of the Future',
        creator: 'Lina Crest',
        year: '2009',
        rating: '8.7',
        tag: 'essays',
        note: 'Small, exact, and full of internet-age melancholy.',
      },
    ]),
    games: makeSlots([
      {
        title: 'Liminal Harbor',
        creator: 'North Cabinet',
        year: '2018',
        rating: '9.5',
        tag: 'PC',
        note: 'Exploration as memory. The loading screens are basically poetry.',
      },
      {
        title: 'Moon Relay 2',
        creator: 'Signal Salt',
        year: '2003',
        rating: '8.6',
        tag: 'PS2',
        note: 'Menu sounds from another planet and the best artificial night sky.',
      },
    ]),
  },
  theme: { ...defaultTheme },
  collapsedSections: {
    movies: false,
    albums: false,
    books: false,
    games: false,
  },
  savedAt: new Date().toISOString(),
});

const storage = new Storage(STORAGE_KEY, defaultState());
let state = normalizeState(storage.load());
let renderQueued = false;
let isOwner = !new URLSearchParams(window.location.search).has('u'); // True for local, false for public profiles until proven otherwise
let profileId = null; // Supabase profile ID

// Supabase Service Instance
// Always instantiate so it can lazily resolve config at runtime
const supabase = new SupabaseService(CONFIG.supabase);

const profileMount = document.getElementById('profileMount');
const mediaMount = document.getElementById('mediaMount');
const themeControls = document.getElementById('themeControls');
const saveStatus = document.getElementById('saveStatus');
const importFile = document.getElementById('importFile');
const authStatus = document.getElementById('authStatus');
const signInBtn = document.getElementById('signInBtn');
const signOutBtn = document.getElementById('signOutBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const toastContainer = document.getElementById('toastContainer');
const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const loginEmail = document.getElementById('loginEmail');

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function safeText(value, fallback = '') {
  return String(value ?? '').trim() || fallback;
}

function isFilled(item) {
  return Boolean(
    safeText(item.title) ||
    safeText(item.creator) ||
    safeText(item.year) ||
    safeText(item.rating) ||
    safeText(item.tag) ||
    safeText(item.note) ||
    safeText(item.cover) ||
    Boolean(item.featured),
  );
}

function sanitizeString(value, max = 7000) {
  return String(value ?? '').slice(0, max);
}

function normalizeRating(value) {
  const text = String(value ?? '').trim().replace(',', '.');
  if (!text) return '';

  const match = text.match(/^(\d+(\.\d+)?)\/10$/);
  if (match) {
    const num = parseFloat(match[1]);
    if (num >= 0 && num <= 10) return `${num}/10`;
  }

  if (/^\d+(\.\d+)?$/.test(text)) {
    const num = parseFloat(text);
    if (num >= 0 && num <= 10) {
      return `${num}/10`;
    }
  }

  return null;
}

function sanitizeItem(item) {
  const source = isObject(item) ? item : {};
  const rawRating = sanitizeString(source.rating, 24);
  const normalized = normalizeRating(rawRating);

  return {
    id: source.id || undefined, // Keep Supabase ID if present
    slot_index: (typeof source.slot_index === 'number') ? source.slot_index : undefined,
    title: sanitizeString(source.title, 160),
    creator: sanitizeString(source.creator, 160),
    year: sanitizeString(source.year, 24),
    rating: normalized !== null ? normalized : '',
    tag: sanitizeString(source.tag, 80),
    note: sanitizeString(source.note, 420),
    cover: sanitizeString(source.cover, 2500000),
    featured: Boolean(source.featured),
  };
}

function makeSlots(items = []) {
  const cleaned = Array.from({ length: MAX_ITEMS }, () => blankItem());

  if (items.length > 0) {
    console.log('[aarkme] makeSlots processing items:', items.slice(0, 3));
  }

  items.forEach((item, index) => {
    const slotIndex = (isObject(item) && typeof item.slot_index === 'number') ? item.slot_index : index;
    if (slotIndex >= 0 && slotIndex < MAX_ITEMS) {
      cleaned[slotIndex] = { ...blankItem(), ...item };
    }
  });

  return cleaned.map(sanitizeItem);
}

function sanitizeTheme(theme) {
  const source = isObject(theme) ? theme : {};
  const cleaned = { ...defaultTheme };
  Object.keys(defaultTheme).forEach((key) => {
    if (typeof source[key] === 'string' && source[key].trim()) {
      cleaned[key] = source[key].slice(0, 120);
    }
  });
  return cleaned;
}

function normalizeState(raw) {
  const fallback = defaultState();
  const source = isObject(raw) ? raw : fallback;
  const profile = isObject(source.profile) ? source.profile : fallback.profile;
  const media = isObject(source.media) ? source.media : fallback.media;

  return {
    version: 1,
    mode: ['public', 'edit', 'preview'].includes(source.mode) ? source.mode : 'public',
    profileNotFound: Boolean(source.profileNotFound),
    profile: {
      id: profile.id || undefined,
      name: sanitizeString(profile.name, 120) || fallback.profile.name,
      username: normalizeUsername(profile.username || fallback.profile.username) || 'aarkme.user',
      bio: sanitizeString(profile.bio, 1400) || fallback.profile.bio,
      avatar: sanitizeString(profile.avatar, 2500000),
    },
    media: {
      movies: makeSlots(media.movies),
      albums: makeSlots(media.albums),
      books: makeSlots(media.books),
      games: makeSlots(media.games),
    },
    theme: sanitizeTheme(source.theme),
    collapsedSections: {
      movies: Boolean(source.collapsedSections?.movies),
      albums: Boolean(source.collapsedSections?.albums),
      books: Boolean(source.collapsedSections?.books),
      games: Boolean(source.collapsedSections?.games),
    },
    savedAt: sanitizeString(source.savedAt, 80) || new Date().toISOString(),
  };
}

const debouncedSave = debounce(async () => {
  state.savedAt = new Date().toISOString();

  // 1. Always save to LocalStorage
  const localOk = storage.save(state);

  let syncAttempted = false;
  let syncErrorMsg = null;

  // 2. If authenticated and not in a guest view, sync to Supabase
  if (supabase && isOwner) {
    try {
      const user = await supabase.getCurrentUser();
      if (user) {
        syncAttempted = true;

        // Validate Username
        const username = normalizeUsername(state.profile.username);
        if (!username) {
          syncErrorMsg = 'nickname required';
        } else {
          // Sync Profile
          try {
            const profileData = {
              username,
              name: state.profile.name,
              bio: state.profile.bio,
              avatar: state.profile.avatar,
              theme: state.theme,
            };

            const savedProfile = await supabase.saveProfile(profileData);
            if (savedProfile) {
              profileId = savedProfile.id;
              state.profile.id = savedProfile.id;
              // Persist the acquired profileId back to localStorage
              storage.save(state);

              // Sync Media Items
              const syncPromises = [];
              Object.entries(state.media).forEach(([kind, items]) => {
                items.forEach((item, index) => {
                  if (isFilled(item)) {
                    syncPromises.push(supabase.saveMediaItem(profileId, {
                      ...item,
                      kind,
                      slot_index: index,
                    }));
                  } else {
                    syncPromises.push(supabase.deleteMediaItem(profileId, kind, index));
                  }
                });
              });
              await Promise.all(syncPromises);
            } else {
              syncErrorMsg = 'profile sync failed';
            }
          } catch (error) {
            console.error('Supabase sync failure details:', error);
            if (error.code === '23505' && (error.message?.includes('username') || error.detail?.includes('username'))) {
              syncErrorMsg = 'nickname taken';
            } else if (error.code === '42501') {
              syncErrorMsg = 'permission denied';
            } else {
              syncErrorMsg = error.message || error.description || 'sync error';
            }
          }
        }
      }
    } catch (error) {
      console.error('Supabase connection error:', error);
      syncErrorMsg = 'sync error';
    }
  }

  if (localOk) {
    if (syncErrorMsg) {
      announceSaved(`saved locally (${syncErrorMsg.toLowerCase()})`);
    } else if (syncAttempted) {
      announceSaved('synced to cloud');
    } else {
      announceSaved('saved locally');
    }
  }
}, 1000);

function persist({ render = false } = {}) {
  if (!isOwner) return; // Guests can't save
  debouncedSave();
  if (render) queueRender();
}

function announceSaved(message = 'saved locally') {
  if (!saveStatus) return;
  saveStatus.textContent = message;
  saveStatus.classList.add('is-saved');
  setTimeout(() => {
    saveStatus.textContent = supabase ? 'cloud' : 'local';
    saveStatus.classList.remove('is-saved');
  }, 2000);
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showLoading(show) {
  loadingOverlay.hidden = !show;
}

function queueRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    renderApp();
  });
}

function applyTheme() {
  const root = document.documentElement;
  const theme = sanitizeTheme(state.theme);
  Object.entries(theme).forEach(([key, value]) => {
    if (key === 'background') root.style.setProperty('--bg', value);
    else root.style.setProperty(`--${key}`, value);
  });
}

function setMode(mode) {
  state.mode = mode;
  persist({ render: true });
}

function renderApp() {
  state = normalizeState(state);
  applyTheme();
  document.body.classList.remove('mode-edit', 'mode-public', 'mode-preview', 'is-owner');
  document.body.classList.add(`mode-${state.mode}`);
  if (isOwner) document.body.classList.add('is-owner');

  const app = document.getElementById('app');
  if (app) {
    if (state.profileNotFound) app.classList.add('profile-not-found');
    else app.classList.remove('profile-not-found');
  }

  renderProfile();
  renderThemeControls();
  renderMedia();
  updateAuthUI();
}

async function updateAuthUI() {
  if (!supabase || !supabase.client) {
    authStatus.hidden = true;
    signInBtn.hidden = false;
    signOutBtn.hidden = true;
    return;
  }

  try {
    const user = await supabase.getCurrentUser();
    if (user) {
      authStatus.textContent = user.email;
      authStatus.hidden = false;
      signInBtn.hidden = true;
      signOutBtn.hidden = false;
    } else {
      authStatus.hidden = true;
      signInBtn.hidden = false;
      signOutBtn.hidden = true;
    }
  } catch (error) {
    console.error('Auth UI update failed', error);
    authStatus.hidden = true;
    signInBtn.hidden = true;
    signOutBtn.hidden = true;
  }
}

function profileInitials() {
  const name = safeText(state.profile.name, 'aarkme');
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toLowerCase();
}

function avatarHtml() {
  const avatar = safeText(state.profile.avatar);
  const alt = `${safeText(state.profile.name, 'Profile')} avatar`;
  if (avatar) {
    return `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(alt)}" loading="lazy" />`;
  }
  return `<div class="avatar-placeholder" aria-hidden="true">${escapeHtml(profileInitials())}</div>`;
}

function renderProfile() {
  if (state.profileNotFound) {
    profileMount.innerHTML = '';
    return;
  }

  const openStates = {};
  profileMount.querySelectorAll('details').forEach((el, index) => {
    if (el.open) openStates[index] = true;
  });

  const profileEdit = (state.mode === 'edit' && isOwner)
    ? `
      <details class="profile-editor-toggle" aria-label="Edit profile">
        <summary class="tool-summary profile-tool-summary">
          <span>
            <span class="eyebrow">profile editor</span>
            <span class="tool-title">Profile details</span>
          </span>
          <span class="edit-pill">open</span>
        </summary>
        <div class="profile-editor">
          <div class="field-grid two">
            <label class="field">
              <span>Name</span>
              <input type="text" value="${escapeHtml(state.profile.name)}" data-profile-field="name" maxlength="120" autocomplete="off" />
            </label>
            <label class="field">
              <span>Nickname</span>
              <input type="text" value="${escapeHtml(state.profile.username)}" data-profile-field="username" maxlength="32" autocomplete="off" />
            </label>
          </div>
          <label class="field">
            <span>Bio</span>
            <textarea class="bio-editor" data-profile-field="bio" maxlength="1400">${escapeHtml(state.profile.bio)}</textarea>
          </label>
          <div class="editor-tools">
            <label class="file-control">
              <span>profile photo</span>
              <input type="file" accept="image/*" data-image-upload="avatar" aria-label="Upload profile photo" />
            </label>
            <button class="ghost-btn" type="button" data-action="remove-avatar">remove photo</button>
          </div>
        </div>
      </details>
    `
    : '';

  profileMount.innerHTML = `
    <div class="profile-top">
      <div class="avatar-frame">${avatarHtml()}</div>
      <div class="profile-copy">
        <h2 class="profile-name" data-profile-display="name">${escapeHtml(safeText(state.profile.name, 'Untitled profile'))}</h2>
        <p class="profile-handle" data-profile-display="username">@${escapeHtml(normalizeUsername(state.profile.username))}</p>
      </div>
    </div>
    <div class="bio-display" data-profile-display="bio"><p>${escapeHtml(safeText(state.profile.bio, 'A quiet catalog of favorite media.'))}</p></div>
    ${profileEdit}
  `;

  profileMount.querySelectorAll('details').forEach((el, index) => {
    if (openStates[index]) el.open = true;
  });
}

function renderThemeControls() {
  if (!themeControls) return;
  themeControls.innerHTML = themeFields.map(([key, label]) => {
    const value = state.theme[key] || defaultTheme[key];
    return `
      <label class="theme-row">
        <span class="theme-field">
          <span>${escapeHtml(label)}</span>
          <input type="text" value="${escapeHtml(value)}" data-theme-field="${escapeHtml(key)}" aria-label="${escapeHtml(label)} hex value" ${!isOwner ? 'disabled' : ''} />
        </span>
        <input type="color" value="${escapeHtml(toHexColor(value, defaultTheme[key]))}" data-theme-field="${escapeHtml(key)}" aria-label="Pick ${escapeHtml(label)}" ${!isOwner ? 'disabled' : ''} />
      </label>
    `;
  }).join('');
}

function toHexColor(value, fallback) {
  const text = String(value || fallback || '#000000').trim();
  return /^#[0-9a-fA-F]{6}$/.test(text) ? text : fallback;
}

function coverHtml(item, kind, compact = false) {
  const meta = categories[kind];
  const ratio = meta.ratio;
  if (safeText(item.cover)) {
    const altTitle = safeText(item.title, `${meta.singular} cover`);
    return `<div class="cover-wrap ${ratio}"><img src="${escapeHtml(item.cover)}" alt="${escapeHtml(altTitle)} cover" loading="lazy" /></div>`;
  }
  const mark = compact ? meta.singular : meta.label;
  return `
    <div class="cover-wrap ${ratio}" aria-hidden="true">
      <div class="cover-placeholder is-${kind}"><span class="cover-mark">${escapeHtml(mark)}</span></div>
    </div>
  `;
}

function metaLine(item, kind) {
  const meta = categories[kind];
  const parts = [];
  if (safeText(item.creator)) parts.push(item.creator);
  if (safeText(item.year)) parts.push(item.year);
  return parts.join(' · ') || meta.creator;
}

function renderMedia() {
  const openStates = {};
  mediaMount.querySelectorAll('details').forEach((el) => {
    const key = `${el.dataset.kind}:${el.dataset.index}`;
    if (el.open) openStates[key] = true;
  });

  if (state.profileNotFound) {
    mediaMount.innerHTML = `
      <section class="glass-card error-state">
        <p class="eyebrow">404</p>
        <h2>profile not found.</h2>
        <p>the requested username does not exist or has been made private.</p>
        <a href="./" class="solid-btn">go home</a>
      </section>
    `;
    return;
  }

  const publicMode = state.mode === 'public' || state.mode === 'preview';
  const sections = Object.entries(categories)
    .map(([kind, meta]) => renderMediaSection(kind, meta, publicMode))
    .filter(Boolean)
    .join('');

  if (!sections) {
    console.log('[aarkme] Rendering empty shrine. Reason: No sections with filled media items were rendered.');
  }

  mediaMount.innerHTML = sections || `
    <section class="glass-card empty-public">
      <p class="eyebrow">empty shrine</p>
      <h2>This profile is ready for curation.</h2>
      <p>Add movies, albums, books, and games in edit mode. Public view stays clean until the shelves are filled.</p>
    </section>
  `;

  mediaMount.querySelectorAll('details').forEach((el) => {
    const key = `${el.dataset.kind}:${el.dataset.index}`;
    if (openStates[key]) el.open = true;
  });
}

function renderMediaSection(kind, meta, publicMode) {
  const items = state.media[kind] || makeSlots();
  const filled = items.filter(isFilled);

  if (publicMode && filled.length === 0) {
    console.log(`[aarkme] Skipping section ${kind} in public mode. Filled count: 0.`);
    return '';
  }

  let itemsToRender;
  if (publicMode) {
    itemsToRender = filled;
  } else {
    // In edit mode, show filled items + 1 empty slot if less than MAX_ITEMS
    itemsToRender = items.map((item, index) => ({ item, index })).filter(obj => isFilled(obj.item));
    if (itemsToRender.length < MAX_ITEMS) {
      const nextIndex = items.findIndex(item => !isFilled(item));
      if (nextIndex !== -1) {
        itemsToRender.push({ item: items[nextIndex], index: nextIndex });
      }
    }
  }

  const cards = itemsToRender.map((obj) => {
    const item = publicMode ? obj : obj.item;
    const index = publicMode ? items.indexOf(item) : obj.index;
    return publicMode ? renderPublicCard(item, kind) : renderEditorCard(item, kind, index);
  }).join('');

  const canToggle = (state.mode === 'edit' && isOwner) || state.mode === 'preview';
  const isCollapsed = canToggle && Boolean(state.collapsedSections?.[kind]);
  const toggleLabel = isCollapsed ? 'show' : 'hide';

  return `
    <section class="glass-card media-section ${isCollapsed ? 'is-collapsed' : ''}" aria-labelledby="${kind}Title" data-section="${escapeHtml(kind)}">
      <div class="section-head">
        <div>
          <p class="eyebrow">${escapeHtml(meta.singular)} shelf</p>
          <h2 id="${kind}Title">${escapeHtml(meta.label)}</h2>
          <p>${escapeHtml(meta.hint)}</p>
        </div>
        <div class="section-actions">
          ${canToggle ? `<button class="tiny-btn section-toggle" type="button" data-action="toggle-section" data-kind="${escapeHtml(kind)}" aria-expanded="${String(!isCollapsed)}" aria-controls="${kind}Grid">${toggleLabel}</button>` : ''}
        </div>
      </div>
      <div class="media-grid" id="${kind}Grid" ${isCollapsed ? 'hidden' : ''}>
        ${cards}
        ${!publicMode && itemsToRender.length < MAX_ITEMS ? `
          <button class="add-slot-btn" data-action="add-item" data-kind="${kind}" aria-label="Add ${meta.singular}">
            <span class="plus">+</span>
            <span>add ${meta.singular}</span>
          </button>
        ` : ''}
      </div>
    </section>
  `;
}

function renderPublicCard(item, kind) {
  const meta = categories[kind];
  const title = safeText(item.title, `Untitled ${meta.singular}`);
  const rating = safeText(item.rating);
  const tag = safeText(item.tag);
  const note = safeText(item.note);
  return `
    <article class="media-card media-public-card ${item.featured ? 'is-featured' : ''}">
      ${coverHtml(item, kind)}
      <div class="card-copy">
        <h3 class="card-title">${escapeHtml(title)}</h3>
        <p class="card-meta">${escapeHtml(metaLine(item, kind))}</p>
        ${(rating || tag) ? `
          <div class="rating-row">
            ${rating ? `<span class="rating-chip">${escapeHtml(rating)}</span>` : ''}
            ${tag ? `<span class="tag-chip">${escapeHtml(tag)}</span>` : ''}
          </div>
        ` : ''}
        ${note ? `<p class="card-note">${escapeHtml(note)}</p>` : ''}
      </div>
    </article>
  `;
}

function renderEditorCard(item, kind, index) {
  const meta = categories[kind];
  const title = safeText(item.title, `Empty ${meta.singular}`);
  const metaText = isFilled(item) ? metaLine(item, kind) : `Slot ${index + 1} is ready`;
  const note = safeText(item.note, 'Add title, cover, rating, and a short note.');
  const filledClass = isFilled(item) ? 'is-filled' : 'is-empty';

  return `
    <details class="media-card editor-details ${filledClass}" data-kind="${escapeHtml(kind)}" data-index="${index}">
      <summary class="editor-summary" aria-label="Edit ${escapeHtml(meta.singular)} slot ${index + 1}">
        ${coverHtml(item, kind, true)}
        <div class="summary-copy">
          <div class="summary-topline">
            <span class="index-chip">#${String(index + 1).padStart(2, '0')}</span>
            ${item.featured ? '<span class="featured-pill">featured</span>' : ''}
            ${item.rating ? `<span class="rating-chip">${escapeHtml(item.rating)}</span>` : ''}
          </div>
          <h3 class="summary-title" data-preview="title">${escapeHtml(title)}</h3>
          <p class="summary-meta" data-preview="meta">${escapeHtml(metaText)}</p>
          <p class="summary-note" data-preview="note">${escapeHtml(note)}</p>
        </div>
        <span class="edit-pill">edit</span>
      </summary>
      <div class="editor-body">
        <div class="editor-tools">
          <label class="file-control">
            <span>cover</span>
            <input type="file" accept="image/*" data-image-upload="cover" data-kind="${escapeHtml(kind)}" data-index="${index}" aria-label="Upload ${escapeHtml(meta.singular)} cover" />
          </label>
          <button class="ghost-btn" type="button" data-action="remove-cover" data-kind="${escapeHtml(kind)}" data-index="${index}">remove cover</button>
          <button class="ghost-btn" type="button" data-action="clear-item" data-kind="${escapeHtml(kind)}" data-index="${index}">clear slot</button>
          <div class="reorder-tools">
            <button class="tiny-btn ${item.featured ? 'active' : ''}" type="button" data-action="toggle-featured" data-kind="${escapeHtml(kind)}" data-index="${index}" aria-label="Toggle featured" aria-pressed="${item.featured}">★</button>
            <button class="tiny-btn" type="button" data-action="move-up" data-kind="${escapeHtml(kind)}" data-index="${index}" ${index === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
            <button class="tiny-btn" type="button" data-action="move-down" data-kind="${escapeHtml(kind)}" data-index="${index}" ${index === MAX_ITEMS - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
          </div>
        </div>
        <div class="field-grid two">
          <label class="field">
            <span>Title</span>
            <input type="text" value="${escapeHtml(item.title)}" data-media-field="title" data-kind="${escapeHtml(kind)}" data-index="${index}" maxlength="160" autocomplete="off" />
          </label>
          <label class="field">
            <span>${escapeHtml(meta.creator)}</span>
            <input type="text" value="${escapeHtml(item.creator)}" data-media-field="creator" data-kind="${escapeHtml(kind)}" data-index="${index}" maxlength="160" autocomplete="off" />
          </label>
        </div>
        <div class="field-grid two">
          <label class="field">
            <span>Year</span>
            <input type="text" value="${escapeHtml(item.year)}" data-media-field="year" data-kind="${escapeHtml(kind)}" data-index="${index}" maxlength="24" inputmode="numeric" autocomplete="off" />
          </label>
          <label class="field">
            <span>Rating</span>
            <input type="text" value="${escapeHtml(item.rating)}" data-media-field="rating" data-kind="${escapeHtml(kind)}" data-index="${index}" maxlength="24" autocomplete="off" />
          </label>
        </div>
        <label class="field">
          <span>${escapeHtml(meta.tag)}</span>
          <input type="text" value="${escapeHtml(item.tag)}" data-media-field="tag" data-kind="${escapeHtml(kind)}" data-index="${index}" maxlength="80" autocomplete="off" />
        </label>
        <label class="field">
          <span>Note</span>
          <textarea data-media-field="note" data-kind="${escapeHtml(kind)}" data-index="${index}" maxlength="420">${escapeHtml(item.note)}</textarea>
        </label>
      </div>
    </details>
  `;
}

function updateCardPreview(details) {
  if (!details) return;
  const kind = details.dataset.kind;
  const index = Number(details.dataset.index);
  if (!categories[kind] || Number.isNaN(index)) return;
  const item = state.media[kind][index];
  const meta = categories[kind];
  const titleEl = details.querySelector('[data-preview="title"]');
  const metaEl = details.querySelector('[data-preview="meta"]');
  const noteEl = details.querySelector('[data-preview="note"]');
  if (titleEl) titleEl.textContent = safeText(item.title, `Empty ${meta.singular}`);
  if (metaEl) metaEl.textContent = isFilled(item) ? metaLine(item, kind) : `Slot ${index + 1} is ready`;
  if (noteEl) noteEl.textContent = safeText(item.note, 'Add title, cover, rating, and a short note.');
  details.classList.toggle('is-filled', isFilled(item));
  details.classList.toggle('is-empty', !isFilled(item));
}

function updateProfileDisplay() {
  const nameEl = document.querySelector('[data-profile-display="name"]');
  const usernameEl = document.querySelector('[data-profile-display="username"]');
  const bioEl = document.querySelector('[data-profile-display="bio"] p');
  if (nameEl) nameEl.textContent = safeText(state.profile.name, 'Untitled profile');
  if (usernameEl) usernameEl.textContent = `@${normalizeUsername(state.profile.username)}`;
  if (bioEl) bioEl.textContent = safeText(state.profile.bio, 'A quiet catalog of favorite media.');
}

async function handleImageUpload(file, callback, options = {}) {
  if (!isOwner) return;
  if (!file || !file.type.startsWith('image/')) {
    window.alert('Please choose an image file.');
    return;
  }

  // Reject clearly oversized files (5MB limit)
  if (file.size > 5 * 1024 * 1024) {
    window.alert('This file is too large. Please choose an image smaller than 5MB.');
    return;
  }

  try {
    showLoading(true);
    // 1. Compress before anything
    const dataUrl = await compressImage(file);

    // 2. If Supabase is enabled, upload to Storage
    if (supabase) {
      const user = await supabase.getCurrentUser();
      if (user) {
        const bucket = 'aarkme-media';
        const timestamp = Date.now();
        const extension = file.type.split('/')[1] || 'jpg';
        const type = options.type || 'media';
        const path = `${user.id}/${type}-${timestamp}.${extension}`;

        // Convert dataUrl back to blob for upload
        const res = await fetch(dataUrl);
        const blob = await res.blob();

        const publicUrl = await supabase.uploadImage(bucket, path, blob);
        callback(publicUrl);
        return;
      }
    }

    // Fallback or Local Mode: use compressed dataUrl (base64)
    callback(dataUrl);
  } catch (error) {
    console.error('Image upload failed', error);
    showToast('Could not upload image.');
  } finally {
    showLoading(false);
  }
}

function exportJson() {
  const payload = JSON.stringify(normalizeState(state), null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 10);
  const username = normalizeUsername(state.profile.username).replace(/[^a-zA-Z0-9._-]/g, '-');
  const link = document.createElement('a');
  link.href = url;
  link.download = `aarkme-${username}-${stamp}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importJson(file) {
  if (!isOwner) return;
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || '{}'));
      const next = normalizeState(parsed);
      state = next;
      persist({ render: true });
      showToast('Backup imported.');
    } catch (error) {
      console.error(error);
      showToast('Import failed.');
    } finally {
      importFile.value = '';
    }
  };
  reader.onerror = () => showToast('Could not read file.');
  reader.readAsText(file);
}

function copyProfileLink() {
  const username = normalizeUsername(state.profile.username);

  if (!username || username === 'nickname' || username === 'aarkme.user') {
    showToast('Choose a username before sharing your profile.');
    return;
  }

  const url = window.location.origin + "/?u=" + encodeURIComponent(username);
  console.log('[aarkme] Generated share URL:', url);
  const shareData = {
    title: `${state.profile.name} — aarkme`,
    text: `Check out ${state.profile.name}'s media profile on aarkme.`,
    url,
  };

  if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
    navigator.share(shareData)
      .then(() => announceSaved('public profile link copied'))
      .catch(() => copyToClipboard(url));
  } else {
    copyToClipboard(url);
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .then(() => announceSaved('public profile link copied'))
    .catch(() => {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        announceSaved('public profile link copied');
      } catch (err) {
        showToast('Copy failed.');
      }
      document.body.removeChild(textArea);
    });
}

function enterOwnerMode() {
  if (!isOwner) return;
  setMode('edit');
}

function clearItem(kind, index) {
  if (!isOwner) return;
  const item = state.media[kind]?.[index];
  if (!item) return;
  const ok = window.confirm(`Clear ${categories[kind].singular} slot ${index + 1}?`);
  if (!ok) return;
  state.media[kind][index] = blankItem();
  persist({ render: true });
}

function resetDemo() {
  if (!isOwner) return;
  const ok = window.confirm('Reset all local aarkme data to the demo profile? This replaces the current local profile.');
  if (!ok) return;
  state = defaultState();
  state.mode = 'edit';
  persist({ render: true });
}

function moveItem(kind, index, direction) {
  if (!isOwner) return;
  const items = state.media[kind];
  if (!items) return;
  const newIndex = direction === 'up' ? index - 1 : index + 1;
  if (newIndex < 0 || newIndex >= items.length) return;

  [items[index], items[newIndex]] = [items[newIndex], items[index]];
  persist({ render: true });

  requestAnimationFrame(() => {
    const movedItem = document.querySelector(`.editor-details[data-kind="${kind}"][data-index="${newIndex}"]`);
    if (movedItem) movedItem.open = true;
  });
}

async function handleAction(action, target) {
  switch (action) {
    case 'sign-in': {
      if (loginModal) {
        loginModal.hidden = false;
        if (loginEmail) loginEmail.focus();
      }
      break;
    }
    case 'close-login': {
      if (loginModal) loginModal.hidden = true;
      break;
    }
    case 'sign-out': {
      if (supabase) {
        try {
          await supabase.signOut();
          window.location.reload();
        } catch (error) {
          showToast('Sign out failed');
        }
      }
      break;
    }
    case 'enter-owner':
      enterOwnerMode();
      break;
    case 'preview-public':
      setMode('preview');
      break;
    case 'return-editor':
      setMode('edit');
      break;
    case 'view-public':
      setMode('public');
      break;
    case 'export-json':
      exportJson();
      break;
    case 'import-json':
      importFile.click();
      break;
    case 'reset-demo':
      resetDemo();
      break;
    case 'reset-theme': {
      if (!isOwner) return;
      const ok = window.confirm('Reset theme to default colors?');
      if (ok) {
        state.theme = { ...defaultTheme };
        persist({ render: true });
      }
      break;
    }
    case 'toggle-section': {
      const kind = target.dataset.kind;
      if (categories[kind]) {
        state.collapsedSections = { ...state.collapsedSections, [kind]: !Boolean(state.collapsedSections?.[kind]) };
        persist({ render: true });
      }
      break;
    }
    case 'remove-avatar':
      if (!isOwner) return;
      state.profile.avatar = '';
      persist({ render: true });
      break;
    case 'remove-cover': {
      if (!isOwner) return;
      const { kind, index } = target.dataset;
      if (state.media[kind]?.[Number(index)]) {
        state.media[kind][Number(index)].cover = '';
        persist({ render: true });
      }
      break;
    }
    case 'clear-item':
      clearItem(target.dataset.kind, Number(target.dataset.index));
      break;
    case 'add-item': {
      const { kind } = target.dataset;
      const nextIndex = state.media[kind].findIndex(item => !isFilled(item));
      if (nextIndex !== -1) {
        requestAnimationFrame(() => {
          const slot = document.querySelector(`.editor-details[data-kind="${kind}"][data-index="${nextIndex}"]`);
          if (slot) {
            slot.open = true;
            slot.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
      }
      break;
    }
    case 'share-profile':
      copyProfileLink();
      break;
    case 'move-up':
      moveItem(target.dataset.kind, Number(target.dataset.index), 'up');
      break;
    case 'move-down':
      moveItem(target.dataset.kind, Number(target.dataset.index), 'down');
      break;
    case 'toggle-featured': {
      if (!isOwner) return;
      const { kind, index } = target.dataset;
      const numericIndex = Number(index);
      const isCurrentlyFeatured = state.media[kind][numericIndex].featured;

      Object.keys(state.media).forEach((k) => {
        state.media[k].forEach((item) => {
          item.featured = false;
        });
      });

      if (!isCurrentlyFeatured) {
        state.media[kind][numericIndex].featured = true;
      }

      persist({ render: true });
      break;
    }
    default:
      break;
  }
}

async function init() {
  // 1. Initial Render (Local/Demo)
  const initialParams = new URLSearchParams(window.location.search);
  const rawUsername = initialParams.get('u');
  const username = normalizeUsername(rawUsername);

  if (username) {
    console.log('[aarkme] Resolved username:', username);
    state.mode = 'public';
    // Clear state for public loading to avoid showing demo profile
    state.profile.name = 'loading...';
    state.profile.username = username;
    state.profile.bio = '';
    state.profile.avatar = '';
    state.media = { movies: makeSlots(), albums: makeSlots(), books: makeSlots(), games: makeSlots() };
  }

  renderApp();

  // 2. Progressive Enhancement (Supabase)
  if (supabase && supabase.client) {
    const currentUser = await supabase.getCurrentUser();

    if (username) {
      try {
        showLoading(true);
        const profile = await supabase.getProfile(username);
        if (profile) {
          console.log('[aarkme] Fetched profile:', profile);
          profileId = profile.id;
          isOwner = currentUser && currentUser.id === profile.owner_id;
          console.log('[aarkme] Is owner:', isOwner);

          const mediaItems = await supabase.getMediaItems(profile.id);
          console.log('[aarkme] Fetched mediaItems count:', mediaItems.length);

          const kindsFound = [...new Set(mediaItems.map(i => i.kind))];
          console.log('[aarkme] Media kinds found:', kindsFound.join(', '));

          mediaItems.forEach((item, idx) => {
            console.log(`[aarkme] Media Item ${idx}: kind=${item.kind}, slot=${item.slot_index}, filled=${isFilled(item)}, cover=${!!item.cover}`);
          });

          if (mediaItems.length === 0) {
            console.log('[aarkme] Why empty shrine: fetched media list is empty.');
          } else {
            const filledCount = mediaItems.filter(isFilled).length;
            if (filledCount === 0) {
              console.log('[aarkme] Why empty shrine: all fetched rows are completely blank.');
            }
          }

          state = normalizeState({
            ...state,
            profile: {
              ...state.profile,
              ...profile,
              id: profile.id,
              username: profile.username,
            },
            media: {
              movies: makeSlots(mediaItems.filter(i => i.kind === 'movies')),
              albums: makeSlots(mediaItems.filter(i => i.kind === 'albums')),
              books: makeSlots(mediaItems.filter(i => i.kind === 'books')),
              games: makeSlots(mediaItems.filter(i => i.kind === 'games')),
            },
            theme: profile.theme || state.theme,
          });
          state.profile.id = profile.id;
          state.mode = isOwner ? state.mode : 'public';
          renderApp();
        } else {
          console.log('[aarkme] Profile not found in Supabase:', username);
          state.profileNotFound = true;
          isOwner = false;
          renderApp();
        }
      } catch (error) {
        console.error('Could not load profile', error);
        showToast('Profile not found.');
        state.profileNotFound = true;
        isOwner = false;
        renderApp();
      } finally {
        showLoading(false);
      }
    } else if (currentUser) {
      try {
        showLoading(true);
        const profile = await supabase.getProfileByOwnerId(currentUser.id);
        if (profile) {
          profileId = profile.id;
          isOwner = true;

          const mediaItems = await supabase.getMediaItems(profile.id);
          console.log('[aarkme] Owner profile loaded. Media items count:', mediaItems.length);

          // Granular merge: for each slot, prefer cloud item if it is filled.
          const mergedMedia = {};
          Object.keys(categories).forEach(kind => {
            const cloudItems = mediaItems.filter(i => i.kind === kind);
            const localItems = state.media[kind] || makeSlots();

            const slots = makeSlots(); // start with 10 blank slots
            for (let i = 0; i < MAX_ITEMS; i++) {
              const cloudItem = cloudItems.find(ci => ci.slot_index === i);
              const localItem = localItems[i];

              if (cloudItem && isFilled(cloudItem)) {
                slots[i] = sanitizeItem(cloudItem);
              } else if (localItem && isFilled(localItem)) {
                slots[i] = localItem;
              } else {
                slots[i] = cloudItem ? sanitizeItem(cloudItem) : localItem;
              }
            }
            mergedMedia[kind] = slots;
          });

          state = normalizeState({
            ...state,
            profile: {
              ...state.profile,
              ...profile,
              id: profile.id,
              username: profile.username,
            },
            media: mergedMedia,
            theme: profile.theme || state.theme,
          });
          state.profile.id = profile.id;
          renderApp();
        }
      } catch (error) {
        console.error('Could not load owner profile', error);
      } finally {
        showLoading(false);
      }
    }
  } else if (username) {
    // If we have a username but no supabase client, we can't load the cloud profile
    state.profileNotFound = true;
    renderApp();
  }
}

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginEmail.value.trim();
    if (!email) return;

    if (!supabase || !supabase.client) {
      showToast('Supabase is not configured. Check supabase-config.js.');
      return;
    }

    try {
      showLoading(true);
      await supabase.signInWithOtp(email);
      showToast('Magic link sent! Check your email.');
      if (loginModal) loginModal.hidden = true;
    } catch (error) {
      console.error('Sign in error', error);
      showToast(error.message || error.description || 'Failed to send magic link.');
    } finally {
      showLoading(false);
    }
  });
}

document.addEventListener('click', (event) => {
  const actionTarget = event.target.closest('[data-action]');
  if (!actionTarget) return;
  event.preventDefault();
  handleAction(actionTarget.dataset.action, actionTarget);
});

document.addEventListener('input', (event) => {
  if (!isOwner) return;
  const target = event.target;

  if (target.matches('[data-profile-field]')) {
    const field = target.dataset.profileField;
    if (field === 'username') {
      state.profile[field] = normalizeUsername(target.value);
    } else if (field === 'bio') {
      state.profile[field] = target.value.slice(0, 1400);
    } else {
      state.profile[field] = target.value.slice(0, 120);
    }
    updateProfileDisplay();
    persist();
    return;
  }

  if (target.matches('[data-media-field]')) {
    const { kind, index, mediaField } = target.dataset;
    const numericIndex = Number(index);
    if (state.media[kind]?.[numericIndex]) {
      const max = mediaField === 'note' ? 420 : mediaField === 'title' || mediaField === 'creator' ? 160 : mediaField === 'tag' ? 80 : 24;
      let value = target.value.slice(0, max);

      if (mediaField === 'rating') {
        const normalized = normalizeRating(value);
        if (normalized !== null) {
          state.media[kind][numericIndex][mediaField] = normalized;
          target.setCustomValidity('');
        } else if (value.trim() === '') {
          state.media[kind][numericIndex][mediaField] = '';
          target.setCustomValidity('');
        } else {
          state.media[kind][numericIndex][mediaField] = value;
        }
      } else {
        state.media[kind][numericIndex][mediaField] = value;
      }

      updateCardPreview(target.closest('details'));
      persist();
    }
    return;
  }

  if (target.matches('[data-theme-field]')) {
    const field = target.dataset.themeField;
    state.theme[field] = target.value;
    applyTheme();
    persist();
  }
});

document.addEventListener('change', (event) => {
  if (!isOwner) return;
  const target = event.target;

  if (target.matches('[data-media-field="rating"]')) {
    const { kind, index } = target.dataset;
    const numericIndex = Number(index);
    const normalized = normalizeRating(target.value);
    if (normalized !== null) {
      state.media[kind][numericIndex].rating = normalized;
      target.value = normalized;
      target.setCustomValidity('');
    } else if (target.value.trim() !== '') {
      target.setCustomValidity('Please use 0-10 or X/10 format.');
      target.reportValidity();
    } else {
      state.media[kind][numericIndex].rating = '';
      target.setCustomValidity('');
    }
    updateCardPreview(target.closest('details'));
    persist({ render: false });
    return;
  }

  if (target === importFile) {
    importJson(target.files?.[0]);
    return;
  }

  if (target.matches('[data-theme-field]')) {
    const field = target.dataset.themeField;
    state.theme[field] = target.value;
    applyTheme();
    persist({ render: false });
    return;
  }

  if (target.matches('[data-image-upload="avatar"]')) {
    handleImageUpload(target.files?.[0], (dataUrl) => {
      state.profile.avatar = dataUrl;
      persist({ render: true });
    }, { type: 'avatar' });
    return;
  }

  if (target.matches('[data-image-upload="cover"]')) {
    const { kind, index } = target.dataset;
    const numericIndex = Number(index);
    handleImageUpload(target.files?.[0], (dataUrl) => {
      if (state.media[kind]?.[numericIndex]) {
        state.media[kind][numericIndex].cover = dataUrl;
        persist({ render: true });
      }
    }, { type: `cover-${kind}` });
  }
});

document.addEventListener('toggle', (event) => {
  const detail = event.target;
  if (!detail.matches?.('.editor-details') || !detail.open) return;
  const kind = detail.dataset.kind;
  document.querySelectorAll(`.editor-details[data-kind="${CSS.escape(kind)}"]`).forEach((other) => {
    if (other !== detail) other.open = false;
  });
}, true);

window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY || !event.newValue) return;
  try {
    state = normalizeState(JSON.parse(event.newValue));
    renderApp();
  } catch (error) {
    console.warn('Ignored invalid cross-tab state.', error);
  }
});

init();
