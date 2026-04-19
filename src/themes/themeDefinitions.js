// ─── Theme Definitions ───
// Each theme is a flat object: { 'css-var-name': 'value' }
// Applied via document.documentElement.style.setProperty('--name', value)

const DARK_GOLD = {
  // Backgrounds
  '--bg-main': '#1a1714',
  '--bg-panel': '#1e1b16',
  '--bg-elevated': '#252018',
  '--bg-input': '#141210',
  '--bg-hover-subtle': '#222018',
  '--bg-hover-strong': '#2a2520',

  // Borders
  '--border-subtle': '#2a2520',
  '--border-default': '#3a3530',
  '--border-danger': '#3a2020',

  // Text
  '--text-primary': '#d4c5a9',
  '--text-bright': '#e8dcc0',
  '--text-code': '#e0d0b0',
  '--text-secondary-light': '#9a8a6a',
  '--text-secondary': '#8a7a60',
  '--text-tertiary': '#6a5a40',
  '--text-disabled': '#4a4035',
  '--text-muted-alt': '#5a4a30',

  // Accent
  '--accent': '#c9a96e',
  '--accent-hover': '#e8c97a',
  '--accent-dim': '#b89a5e',

  // Accent with alpha
  '--accent-a04': 'rgba(201,169,110,0.04)',
  '--accent-a08': 'rgba(201,169,110,0.08)',
  '--accent-a10': 'rgba(201,169,110,0.10)',
  '--accent-a12': 'rgba(201,169,110,0.12)',
  '--accent-a15': 'rgba(201,169,110,0.15)',
  '--accent-a30': 'rgba(201,169,110,0.30)',
  '--accent-a35': 'rgba(201,169,110,0.35)',
  '--accent-a55': 'rgba(201,169,110,0.55)',

  // Semantic
  '--color-danger': '#c96e6e',
  '--color-danger-bg': '#5a2020',
  '--color-danger-bright': '#ff6b6b',
  '--color-success': '#6a9a6a',
  '--color-success-alt': '#6baa5d',
  '--color-success-bright': '#6bff6b',
  '--color-info': '#6e9ec9',
  '--color-ai': '#b47ed0',
  '--color-warning': '#e0a040',

  // Dice
  '--dice-d4': '#8a7a5a',
  '--dice-d6': '#9a8a65',
  '--dice-d8': '#a89a70',
  '--dice-d10': '#b8a87a',
  '--dice-d12': '#c5b585',
  '--dice-d20': '#d4c490',
  '--dice-d100': '#e2d4a0',

  // Shadows & overlays
  '--shadow-dropdown': '0 8px 24px rgba(0,0,0,0.5)',
  '--shadow-panel': '0 12px 40px rgba(0,0,0,0.6)',
  '--overlay-light': 'rgba(0,0,0,0.6)',
  '--overlay-medium': 'rgba(0,0,0,0.7)',
  '--overlay-dark': 'rgba(0,0,0,0.9)',
  '--bg-frosted': 'rgba(30,27,22,0.95)',
  '--bg-glow-faint': 'rgba(255,255,255,0.02)',
  '--bg-glow-subtle': 'rgba(255,255,255,0.03)',

  // Scrollbar
  '--scrollbar-track': 'transparent',
  '--scrollbar-thumb': '#3a3530',
  '--scrollbar-hover': '#5a4a3a',

  // Chat GM bubble
  '--chat-gm-bg': '#2a2a1e',
  '--chat-gm-border': '#3a3a2a',

  // Font scale
  '--font-size-scale': '1',
};

const DARK_BLUE = {
  '--bg-main': '#12151a',
  '--bg-panel': '#161a21',
  '--bg-elevated': '#1e2430',
  '--bg-input': '#0e1116',
  '--bg-hover-subtle': '#1a1e28',
  '--bg-hover-strong': '#242a36',

  '--border-subtle': '#1e2430',
  '--border-default': '#2a3240',
  '--border-danger': '#2a1e20',

  '--text-primary': '#c8d0dc',
  '--text-bright': '#e0e8f0',
  '--text-code': '#d0d8e4',
  '--text-secondary-light': '#7a8a9a',
  '--text-secondary': '#607080',
  '--text-tertiary': '#455565',
  '--text-disabled': '#354050',
  '--text-muted-alt': '#3a4a5a',

  '--accent': '#5b8dd9',
  '--accent-hover': '#7aa8f0',
  '--accent-dim': '#4a78c0',

  '--accent-a04': 'rgba(91,141,217,0.04)',
  '--accent-a08': 'rgba(91,141,217,0.08)',
  '--accent-a10': 'rgba(91,141,217,0.10)',
  '--accent-a12': 'rgba(91,141,217,0.12)',
  '--accent-a15': 'rgba(91,141,217,0.15)',
  '--accent-a30': 'rgba(91,141,217,0.30)',
  '--accent-a35': 'rgba(91,141,217,0.35)',
  '--accent-a55': 'rgba(91,141,217,0.55)',

  '--color-danger': '#c96e6e',
  '--color-danger-bg': '#3a1a1a',
  '--color-danger-bright': '#ff6b6b',
  '--color-success': '#6a9a6a',
  '--color-success-alt': '#6baa5d',
  '--color-success-bright': '#6bff6b',
  '--color-info': '#5b8dd9',
  '--color-ai': '#a876d9',
  '--color-warning': '#e0a040',

  '--dice-d4': '#5a6a8a',
  '--dice-d6': '#657a95',
  '--dice-d8': '#708aa0',
  '--dice-d10': '#7a9ab0',
  '--dice-d12': '#85a5b8',
  '--dice-d20': '#90b5c8',
  '--dice-d100': '#a0c5d8',

  '--shadow-dropdown': '0 8px 24px rgba(0,0,0,0.6)',
  '--shadow-panel': '0 12px 40px rgba(0,0,0,0.7)',
  '--overlay-light': 'rgba(0,0,0,0.6)',
  '--overlay-medium': 'rgba(0,0,0,0.7)',
  '--overlay-dark': 'rgba(0,0,0,0.9)',
  '--bg-frosted': 'rgba(22,26,33,0.95)',
  '--bg-glow-faint': 'rgba(255,255,255,0.02)',
  '--bg-glow-subtle': 'rgba(255,255,255,0.03)',

  '--scrollbar-track': 'transparent',
  '--scrollbar-thumb': '#2a3240',
  '--scrollbar-hover': '#3a4a5a',

  '--chat-gm-bg': '#1e2230',
  '--chat-gm-border': '#2a3242',

  '--font-size-scale': '1',
};

const DARK_GREEN = {
  '--bg-main': '#131a14',
  '--bg-panel': '#172018',
  '--bg-elevated': '#1e2a20',
  '--bg-input': '#0e1410',
  '--bg-hover-subtle': '#1a2218',
  '--bg-hover-strong': '#243026',

  '--border-subtle': '#1e2a20',
  '--border-default': '#2a3a2e',
  '--border-danger': '#2a1e1e',

  '--text-primary': '#b8ccb8',
  '--text-bright': '#d0e8d0',
  '--text-code': '#c0d8c0',
  '--text-secondary-light': '#7a9a7a',
  '--text-secondary': '#608060',
  '--text-tertiary': '#456545',
  '--text-disabled': '#354535',
  '--text-muted-alt': '#3a4a3a',

  '--accent': '#6daa6d',
  '--accent-hover': '#88cc88',
  '--accent-dim': '#5a9a5a',

  '--accent-a04': 'rgba(109,170,109,0.04)',
  '--accent-a08': 'rgba(109,170,109,0.08)',
  '--accent-a10': 'rgba(109,170,109,0.10)',
  '--accent-a12': 'rgba(109,170,109,0.12)',
  '--accent-a15': 'rgba(109,170,109,0.15)',
  '--accent-a30': 'rgba(109,170,109,0.30)',
  '--accent-a35': 'rgba(109,170,109,0.35)',
  '--accent-a55': 'rgba(109,170,109,0.55)',

  '--color-danger': '#c96e6e',
  '--color-danger-bg': '#3a1a1a',
  '--color-danger-bright': '#ff6b6b',
  '--color-success': '#6daa6d',
  '--color-success-alt': '#7abb7a',
  '--color-success-bright': '#6bff6b',
  '--color-info': '#6e9ec9',
  '--color-ai': '#b47ed0',
  '--color-warning': '#d4a840',

  '--dice-d4': '#5a7a5a',
  '--dice-d6': '#658a65',
  '--dice-d8': '#709a70',
  '--dice-d10': '#7aaa7a',
  '--dice-d12': '#85b585',
  '--dice-d20': '#90c490',
  '--dice-d100': '#a0d4a0',

  '--shadow-dropdown': '0 8px 24px rgba(0,0,0,0.5)',
  '--shadow-panel': '0 12px 40px rgba(0,0,0,0.6)',
  '--overlay-light': 'rgba(0,0,0,0.6)',
  '--overlay-medium': 'rgba(0,0,0,0.7)',
  '--overlay-dark': 'rgba(0,0,0,0.9)',
  '--bg-frosted': 'rgba(23,32,24,0.95)',
  '--bg-glow-faint': 'rgba(255,255,255,0.02)',
  '--bg-glow-subtle': 'rgba(255,255,255,0.03)',

  '--scrollbar-track': 'transparent',
  '--scrollbar-thumb': '#2a3a2e',
  '--scrollbar-hover': '#3a4a3e',

  '--chat-gm-bg': '#1e2a1e',
  '--chat-gm-border': '#2a3a2a',

  '--font-size-scale': '1',
};

const DARK_RED = {
  '--bg-main': '#1a1214',
  '--bg-panel': '#1e1618',
  '--bg-elevated': '#2a1e20',
  '--bg-input': '#140e10',
  '--bg-hover-subtle': '#221a1c',
  '--bg-hover-strong': '#302428',

  '--border-subtle': '#2a1e20',
  '--border-default': '#3a2a2e',
  '--border-danger': '#4a2020',

  '--text-primary': '#d4bfbf',
  '--text-bright': '#e8cccc',
  '--text-code': '#d8c4c4',
  '--text-secondary-light': '#9a7a7a',
  '--text-secondary': '#806060',
  '--text-tertiary': '#654545',
  '--text-disabled': '#4a3535',
  '--text-muted-alt': '#5a3a3a',

  '--accent': '#c95555',
  '--accent-hover': '#e06868',
  '--accent-dim': '#b04848',

  '--accent-a04': 'rgba(201,85,85,0.04)',
  '--accent-a08': 'rgba(201,85,85,0.08)',
  '--accent-a10': 'rgba(201,85,85,0.10)',
  '--accent-a12': 'rgba(201,85,85,0.12)',
  '--accent-a15': 'rgba(201,85,85,0.15)',
  '--accent-a30': 'rgba(201,85,85,0.30)',
  '--accent-a35': 'rgba(201,85,85,0.35)',
  '--accent-a55': 'rgba(201,85,85,0.55)',

  '--color-danger': '#c95555',
  '--color-danger-bg': '#4a2020',
  '--color-danger-bright': '#ff6b6b',
  '--color-success': '#6a9a6a',
  '--color-success-alt': '#6baa5d',
  '--color-success-bright': '#6bff6b',
  '--color-info': '#6e9ec9',
  '--color-ai': '#b47ed0',
  '--color-warning': '#e0a040',

  '--dice-d4': '#8a5a5a',
  '--dice-d6': '#9a6565',
  '--dice-d8': '#a87070',
  '--dice-d10': '#b87a7a',
  '--dice-d12': '#c58585',
  '--dice-d20': '#d49090',
  '--dice-d100': '#e2a0a0',

  '--shadow-dropdown': '0 8px 24px rgba(0,0,0,0.5)',
  '--shadow-panel': '0 12px 40px rgba(0,0,0,0.6)',
  '--overlay-light': 'rgba(0,0,0,0.6)',
  '--overlay-medium': 'rgba(0,0,0,0.7)',
  '--overlay-dark': 'rgba(0,0,0,0.9)',
  '--bg-frosted': 'rgba(30,22,24,0.95)',
  '--bg-glow-faint': 'rgba(255,255,255,0.02)',
  '--bg-glow-subtle': 'rgba(255,255,255,0.03)',

  '--scrollbar-track': 'transparent',
  '--scrollbar-thumb': '#3a2a2e',
  '--scrollbar-hover': '#4a3a3e',

  '--chat-gm-bg': '#2a1e1e',
  '--chat-gm-border': '#3a2a2a',

  '--font-size-scale': '1',
};

const DARK_PURPLE = {
  '--bg-main': '#14121a',
  '--bg-panel': '#18161e',
  '--bg-elevated': '#221e2a',
  '--bg-input': '#100e16',
  '--bg-hover-subtle': '#1c1a24',
  '--bg-hover-strong': '#2a2634',

  '--border-subtle': '#221e2a',
  '--border-default': '#322a3a',
  '--border-danger': '#2a1e20',

  '--text-primary': '#c8bfdc',
  '--text-bright': '#e0d5f0',
  '--text-code': '#d0c8e0',
  '--text-secondary-light': '#8a7a9a',
  '--text-secondary': '#706080',
  '--text-tertiary': '#554565',
  '--text-disabled': '#403550',
  '--text-muted-alt': '#4a3a5a',

  '--accent': '#9b6ed9',
  '--accent-hover': '#b888f0',
  '--accent-dim': '#8858c0',

  '--accent-a04': 'rgba(155,110,217,0.04)',
  '--accent-a08': 'rgba(155,110,217,0.08)',
  '--accent-a10': 'rgba(155,110,217,0.10)',
  '--accent-a12': 'rgba(155,110,217,0.12)',
  '--accent-a15': 'rgba(155,110,217,0.15)',
  '--accent-a30': 'rgba(155,110,217,0.30)',
  '--accent-a35': 'rgba(155,110,217,0.35)',
  '--accent-a55': 'rgba(155,110,217,0.55)',

  '--color-danger': '#c96e6e',
  '--color-danger-bg': '#3a1a1a',
  '--color-danger-bright': '#ff6b6b',
  '--color-success': '#6a9a6a',
  '--color-success-alt': '#6baa5d',
  '--color-success-bright': '#6bff6b',
  '--color-info': '#6e9ec9',
  '--color-ai': '#b47ed0',
  '--color-warning': '#e0a040',

  '--dice-d4': '#6a5a8a',
  '--dice-d6': '#756595',
  '--dice-d8': '#8070a0',
  '--dice-d10': '#8a7ab0',
  '--dice-d12': '#9585b8',
  '--dice-d20': '#a090c8',
  '--dice-d100': '#b0a0d8',

  '--shadow-dropdown': '0 8px 24px rgba(0,0,0,0.5)',
  '--shadow-panel': '0 12px 40px rgba(0,0,0,0.6)',
  '--overlay-light': 'rgba(0,0,0,0.6)',
  '--overlay-medium': 'rgba(0,0,0,0.7)',
  '--overlay-dark': 'rgba(0,0,0,0.9)',
  '--bg-frosted': 'rgba(24,22,30,0.95)',
  '--bg-glow-faint': 'rgba(255,255,255,0.02)',
  '--bg-glow-subtle': 'rgba(255,255,255,0.03)',

  '--scrollbar-track': 'transparent',
  '--scrollbar-thumb': '#322a3a',
  '--scrollbar-hover': '#42384a',

  '--chat-gm-bg': '#221e2a',
  '--chat-gm-border': '#322a3a',

  '--font-size-scale': '1',
};

const LIGHT_CLASSIC = {
  '--bg-main': '#f5f3ef',
  '--bg-panel': '#eae7e0',
  '--bg-elevated': '#ffffff',
  '--bg-input': '#ffffff',
  '--bg-hover-subtle': '#e8e5de',
  '--bg-hover-strong': '#ddd8d0',

  '--border-subtle': '#d8d4cc',
  '--border-default': '#c0bab0',
  '--border-danger': '#e0b0b0',

  '--text-primary': '#333333',
  '--text-bright': '#222222',
  '--text-code': '#444444',
  '--text-secondary-light': '#777777',
  '--text-secondary': '#888888',
  '--text-tertiary': '#999999',
  '--text-disabled': '#bbbbbb',
  '--text-muted-alt': '#aaaaaa',

  '--accent': '#8b6914',
  '--accent-hover': '#a37a18',
  '--accent-dim': '#7a5c10',

  '--accent-a04': 'rgba(139,105,20,0.04)',
  '--accent-a08': 'rgba(139,105,20,0.08)',
  '--accent-a10': 'rgba(139,105,20,0.10)',
  '--accent-a12': 'rgba(139,105,20,0.12)',
  '--accent-a15': 'rgba(139,105,20,0.15)',
  '--accent-a30': 'rgba(139,105,20,0.25)',
  '--accent-a35': 'rgba(139,105,20,0.30)',
  '--accent-a55': 'rgba(139,105,20,0.40)',

  '--color-danger': '#c04040',
  '--color-danger-bg': '#f0d0d0',
  '--color-danger-bright': '#d03030',
  '--color-success': '#3a8a3a',
  '--color-success-alt': '#4a9a4a',
  '--color-success-bright': '#2a7a2a',
  '--color-info': '#2a6aaa',
  '--color-ai': '#7a3fa0',
  '--color-warning': '#c08030',

  '--dice-d4': '#a09070',
  '--dice-d6': '#90805a',
  '--dice-d8': '#887050',
  '--dice-d10': '#7a6040',
  '--dice-d12': '#705530',
  '--dice-d20': '#604520',
  '--dice-d100': '#503818',

  '--shadow-dropdown': '0 4px 16px rgba(0,0,0,0.12)',
  '--shadow-panel': '0 8px 32px rgba(0,0,0,0.15)',
  '--overlay-light': 'rgba(0,0,0,0.3)',
  '--overlay-medium': 'rgba(0,0,0,0.4)',
  '--overlay-dark': 'rgba(0,0,0,0.7)',
  '--bg-frosted': 'rgba(234,231,224,0.95)',
  '--bg-glow-faint': 'rgba(0,0,0,0.02)',
  '--bg-glow-subtle': 'rgba(0,0,0,0.04)',

  '--scrollbar-track': 'transparent',
  '--scrollbar-thumb': '#c0bab0',
  '--scrollbar-hover': '#a09890',

  '--chat-gm-bg': '#e8e4dc',
  '--chat-gm-border': '#d0ccc4',

  '--font-size-scale': '1',
};

const LIGHT_BLUE = {
  '--bg-main': '#f0f4f8',
  '--bg-panel': '#e4eaf0',
  '--bg-elevated': '#ffffff',
  '--bg-input': '#ffffff',
  '--bg-hover-subtle': '#e8ecf2',
  '--bg-hover-strong': '#d8e0ea',

  '--border-subtle': '#d0d8e2',
  '--border-default': '#b8c4d2',
  '--border-danger': '#e0b0b0',

  '--text-primary': '#2c3e50',
  '--text-bright': '#1a2530',
  '--text-code': '#3a4a5a',
  '--text-secondary-light': '#607080',
  '--text-secondary': '#708090',
  '--text-tertiary': '#8898a8',
  '--text-disabled': '#a8b4c0',
  '--text-muted-alt': '#98a8b8',

  '--accent': '#2563a8',
  '--accent-hover': '#3078c0',
  '--accent-dim': '#1a5290',

  '--accent-a04': 'rgba(37,99,168,0.04)',
  '--accent-a08': 'rgba(37,99,168,0.08)',
  '--accent-a10': 'rgba(37,99,168,0.10)',
  '--accent-a12': 'rgba(37,99,168,0.12)',
  '--accent-a15': 'rgba(37,99,168,0.15)',
  '--accent-a30': 'rgba(37,99,168,0.25)',
  '--accent-a35': 'rgba(37,99,168,0.30)',
  '--accent-a55': 'rgba(37,99,168,0.40)',

  '--color-danger': '#c04040',
  '--color-danger-bg': '#f0d0d0',
  '--color-danger-bright': '#d03030',
  '--color-success': '#3a8a3a',
  '--color-success-alt': '#4a9a4a',
  '--color-success-bright': '#2a7a2a',
  '--color-info': '#2563a8',
  '--color-ai': '#6e3a9d',
  '--color-warning': '#c08030',

  '--dice-d4': '#708aa0',
  '--dice-d6': '#607a90',
  '--dice-d8': '#506a80',
  '--dice-d10': '#405a70',
  '--dice-d12': '#354e62',
  '--dice-d20': '#2a4050',
  '--dice-d100': '#1a3040',

  '--shadow-dropdown': '0 4px 16px rgba(0,0,0,0.10)',
  '--shadow-panel': '0 8px 32px rgba(0,0,0,0.12)',
  '--overlay-light': 'rgba(0,0,0,0.3)',
  '--overlay-medium': 'rgba(0,0,0,0.4)',
  '--overlay-dark': 'rgba(0,0,0,0.7)',
  '--bg-frosted': 'rgba(228,234,240,0.95)',
  '--bg-glow-faint': 'rgba(0,0,0,0.02)',
  '--bg-glow-subtle': 'rgba(0,0,0,0.04)',

  '--scrollbar-track': 'transparent',
  '--scrollbar-thumb': '#b8c4d2',
  '--scrollbar-hover': '#98a8b8',

  '--chat-gm-bg': '#e0e8f0',
  '--chat-gm-border': '#c8d4e0',

  '--font-size-scale': '1',
};

const HIGH_CONTRAST = {
  '--bg-main': '#000000',
  '--bg-panel': '#0a0a0a',
  '--bg-elevated': '#1a1a1a',
  '--bg-input': '#000000',
  '--bg-hover-subtle': '#141414',
  '--bg-hover-strong': '#222222',

  '--border-subtle': '#333333',
  '--border-default': '#555555',
  '--border-danger': '#551111',

  '--text-primary': '#ffffff',
  '--text-bright': '#ffffff',
  '--text-code': '#f0f0f0',
  '--text-secondary-light': '#cccccc',
  '--text-secondary': '#bbbbbb',
  '--text-tertiary': '#999999',
  '--text-disabled': '#666666',
  '--text-muted-alt': '#777777',

  '--accent': '#ffcc00',
  '--accent-hover': '#ffe040',
  '--accent-dim': '#ddaa00',

  '--accent-a04': 'rgba(255,204,0,0.06)',
  '--accent-a08': 'rgba(255,204,0,0.10)',
  '--accent-a10': 'rgba(255,204,0,0.12)',
  '--accent-a12': 'rgba(255,204,0,0.15)',
  '--accent-a15': 'rgba(255,204,0,0.18)',
  '--accent-a30': 'rgba(255,204,0,0.30)',
  '--accent-a35': 'rgba(255,204,0,0.35)',
  '--accent-a55': 'rgba(255,204,0,0.55)',

  '--color-danger': '#ff4444',
  '--color-danger-bg': '#440000',
  '--color-danger-bright': '#ff2222',
  '--color-success': '#44cc44',
  '--color-success-alt': '#55dd55',
  '--color-success-bright': '#44ff44',
  '--color-info': '#4488ff',
  '--color-ai': '#c879ff',
  '--color-warning': '#ffaa00',

  '--dice-d4': '#aa9944',
  '--dice-d6': '#bbaa55',
  '--dice-d8': '#ccbb66',
  '--dice-d10': '#ddcc77',
  '--dice-d12': '#ddcc88',
  '--dice-d20': '#eedd99',
  '--dice-d100': '#ffeeaa',

  '--shadow-dropdown': '0 4px 16px rgba(0,0,0,0.8)',
  '--shadow-panel': '0 8px 32px rgba(0,0,0,0.9)',
  '--overlay-light': 'rgba(0,0,0,0.7)',
  '--overlay-medium': 'rgba(0,0,0,0.8)',
  '--overlay-dark': 'rgba(0,0,0,0.95)',
  '--bg-frosted': 'rgba(10,10,10,0.95)',
  '--bg-glow-faint': 'rgba(255,255,255,0.03)',
  '--bg-glow-subtle': 'rgba(255,255,255,0.05)',

  '--scrollbar-track': 'transparent',
  '--scrollbar-thumb': '#555555',
  '--scrollbar-hover': '#777777',

  '--chat-gm-bg': '#1a1a00',
  '--chat-gm-border': '#333300',

  '--font-size-scale': '1',
};

export const THEMES = {
  'dark-gold': DARK_GOLD,
  'dark-blue': DARK_BLUE,
  'dark-green': DARK_GREEN,
  'dark-red': DARK_RED,
  'dark-purple': DARK_PURPLE,
  'light-classic': LIGHT_CLASSIC,
  'light-blue': LIGHT_BLUE,
  'high-contrast': HIGH_CONTRAST,
};

export const THEME_LIST = [
  { id: 'dark-gold', name: 'Dark Gold', group: 'dark' },
  { id: 'dark-blue', name: 'Dark Blue', group: 'dark' },
  { id: 'dark-green', name: 'Dark Green', group: 'dark' },
  { id: 'dark-red', name: 'Dark Red', group: 'dark' },
  { id: 'dark-purple', name: 'Dark Purple', group: 'dark' },
  { id: 'light-classic', name: 'Light Classic', group: 'light' },
  { id: 'light-blue', name: 'Light Blue', group: 'light' },
  { id: 'high-contrast', name: 'High Contrast', group: 'dark' },
];

export const DEFAULT_THEME = 'dark-gold';
