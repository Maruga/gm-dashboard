import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import ProjectSelector from './components/ProjectSelector';
import Explorer from './components/Explorer';
import Viewer from './components/Viewer';
import Stage from './components/Stage';
import SlotPanel from './components/SlotPanel';
import MediaPanel from './components/MediaPanel';
import Console from './components/Console';
import TopMenu from './components/TopMenu';
import DocToc from './components/DocToc';
import SettingsPanel from './components/SettingsPanel';
import CalendarPanel from './components/CalendarPanel';
import { TelegramFileModal, TelegramTextModal } from './components/TelegramModal';
import TelegramChat from './components/TelegramChat';
import QuickReference from './components/QuickReference';
import NotesPanel from './components/NotesPanel';
import ChecklistPanel from './components/ChecklistPanel';
import InfoPanel from './components/InfoPanel';
import AdventuresPanel from './components/AdventuresPanel';
import RelationsPanel from './components/RelationsPanel';
import RelationsView from './components/RelationsView';
import PanelToolbar from './components/PanelToolbar';
import PanelSearch from './components/PanelSearch';
import ResizeHandle from './components/ResizeHandle';
import { getFileType, FILE_TYPES } from './utils/fileTypes';
import { initTheme } from './themes/themeEngine';

const DEFAULT_PROJECT_STATE = {
  leftWidth: 280,
  rightWidth: 320,
  explorerRatio: 0.6,
  consoleHeight: 200,
  viewerStageRatio: 0.55,
  slotRatios: [0.333, 0.333, 0.334],
  viewerDocument: null,
  slotDocuments: { A: [], B: [], C: [] },
  scrollPositions: { viewer: {}, slotA: {}, slotB: {}, slotC: {} },
  viewerFontSize: 15,
  stageFontSize: 15,
  panelVisibility: { explorer: true, media: true, viewer: true, stage: true, console: true, slotA: true, slotB: true, slotC: true },
  layoutPresets: []
};

export default function App() {
  const [activeProject, setActiveProject] = useState(null); // { path, name }
  const [ready, setReady] = useState(false);
  const [adventuresOpen, setAdventuresOpen] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState(null);

  // Apply saved theme on mount + auto-login Firebase
  useEffect(() => {
    initTheme();
    setReady(true);
    (async () => {
      let u = await window.electronAPI.firebaseGetUser();
      if (!u) u = await window.electronAPI.firebaseAutoLogin();
      if (u) setFirebaseUser(u);
    })();
  }, []);

  // Prevent Electron from navigating to dropped files — Explorer handles its own drops
  useEffect(() => {
    const prevent = e => e.preventDefault();
    document.addEventListener('dragover', prevent);
    document.addEventListener('drop', prevent);
    return () => { document.removeEventListener('dragover', prevent); document.removeEventListener('drop', prevent); };
  }, []);

  const handleProjectOpen = useCallback(async (folderPath, name) => {
    // Add/update in recent projects
    const project = {
      path: folderPath,
      name: name,
      lastOpened: new Date().toISOString()
    };
    await window.electronAPI.addRecentProject(project);
    setActiveProject(project);
  }, []);

  const handleBackToSelector = useCallback(() => {
    setActiveProject(null);
  }, []);

  if (!ready) return null;

  if (!activeProject) {
    return (
      <>
        <ProjectSelector onProjectOpen={handleProjectOpen} onOpenAdventures={() => setAdventuresOpen(true)} />
        {adventuresOpen && (
          <AdventuresPanel
            onClose={() => setAdventuresOpen(false)}
            onProjectOpen={(path, name) => { setAdventuresOpen(false); handleProjectOpen(path, name); }}
          />
        )}
        <BroadcastBanner />
        <UpdateToast />
        <GlobalStyles />
      </>
    );
  }

  return (
    <>
      <Dashboard
        key={activeProject.path}
        projectPath={activeProject.path}
        projectName={activeProject.name}
        onChangeProject={handleBackToSelector}
        firebaseUser={firebaseUser}
        onFirebaseUserChange={setFirebaseUser}
      />
      <UpdateToast />
      <GlobalStyles />
    </>
  );
}

function Dashboard({ projectPath, projectName, onChangeProject, firebaseUser, onFirebaseUserChange }) {
  // Project-scoped state — loaded from store, saved on changes
  const [leftWidth, setLeftWidth] = useState(DEFAULT_PROJECT_STATE.leftWidth);
  const [rightWidth, setRightWidth] = useState(DEFAULT_PROJECT_STATE.rightWidth);
  const [explorerRatio, setExplorerRatio] = useState(DEFAULT_PROJECT_STATE.explorerRatio);
  const [consoleHeight, setConsoleHeight] = useState(DEFAULT_PROJECT_STATE.consoleHeight);
  const [viewerStageRatio, setViewerStageRatio] = useState(DEFAULT_PROJECT_STATE.viewerStageRatio);
  const [slotRatios, setSlotRatios] = useState(DEFAULT_PROJECT_STATE.slotRatios);
  const [currentFile, setCurrentFile] = useState(null);
  const [slotFiles, setSlotFiles] = useState({ A: [], B: [], C: [] });
  const [activeStageSlot, setActiveStageSlot] = useState('A');
  const [slotSelectedIndices, setSlotSelectedIndices] = useState({ A: 0, B: 0, C: 0 });
  const [mediaItems, setMediaItems] = useState([]);
  const [mediaFilter, setMediaFilter] = useState('all');
  const [projectSettings, setProjectSettings] = useState({ projectName: '', startDate: '', calendarType: 'gregoriano', exportExcludes: '' });
  const [players, setPlayers] = useState([]);
  const [telegramConfig, setTelegramConfig] = useState({ botToken: '', configured: false });
  const [calendarData, setCalendarData] = useState({ currentDate: '', events: {} });
  const [settingsOpen, setSettingsOpen] = useState(null); // null=chiuso, stringa=sezione iniziale
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calFile, setCalFile] = useState(null);
  const [viewerTabs, setViewerTabs] = useState([{ type: 'document' }]);
  const [activeViewerTab, setActiveViewerTab] = useState(0);
  const [expandedDirs, setExpandedDirs] = useState({});
  const [docTocPinned, setDocTocPinned] = useState({ viewer: false, stage: false });
  const [scrollVersion, setScrollVersion] = useState(0);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklist, setChecklist] = useState([]);
  const [infoOpen, setInfoOpen] = useState(false);
  const [adventuresOpen, setAdventuresOpen] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);
  const [explorerRefreshKey, setExplorerRefreshKey] = useState(0);
  const [panelVisibility, setPanelVisibility] = useState(DEFAULT_PROJECT_STATE.panelVisibility);
  const [layoutPresets, setLayoutPresets] = useState([]);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [referenceManuals, setReferenceManuals] = useState([]);
  const [referenceScrollPositions, setReferenceScrollPositions] = useState({});
  const [referenceSelectedId, setReferenceSelectedId] = useState(null);
  const [botStatus, setBotStatus] = useState({ running: false, error: null });
  const [telegramLog, setTelegramLog] = useState([]);
  const [telegramFileData, setTelegramFileData] = useState(null);
  const [telegramTextData, setTelegramTextData] = useState(null);
  const [chatMessages, setChatMessages] = useState({});
  const [chatOpen, setChatOpen] = useState(false);
  const [chatFlash, setChatFlash] = useState(false);
  const chatOpenRef = useRef(false);
  const selectedChatRef = useRef(null);
  const [textContextMenu, setTextContextMenu] = useState(null);
  const [overlayImage, setOverlayImage] = useState(null);
  const [overlayVideo, setOverlayVideo] = useState(null);
  const [searchHighlight, setSearchHighlight] = useState(null);
  const [externalSearchQuery, setExternalSearchQuery] = useState(null);
  const externalSearchCounter = useRef(0);
  const [highlightKeywords, setHighlightKeywords] = useState({ enabled: true, defaultColor: 'rgba(201,169,110,0.55)', words: [] });
  const [relationsOpen, setRelationsOpen] = useState(false);
  const [relationsBase, setRelationsBase] = useState({});
  const [relationsSession, setRelationsSession] = useState({});
  const [vistaContent, setVistaContent] = useState(null);
  const [viewerFontSize, setViewerFontSize] = useState(15);
  const [stageFontSize, setStageFontSize] = useState(15);
  const [fullscreenPanel, setFullscreenPanel] = useState(null);
  const [viewerSearchOpen, setViewerSearchOpen] = useState(false);
  const [viewerPdfOutline, setViewerPdfOutline] = useState(null);
  const [stateLoaded, setStateLoaded] = useState(false);
  const [aiConfig, setAiConfig] = useState({
    provider: '',
    apiKey: '',
    openaiImageKey: '',
    model: '',
    configured: false,
    telegramAiEnabled: true,
    telegramAiMode: 'manual',
    commonDocs: [],
    effort: 'medium'
  });
  const [aiChatHistory, setAiChatHistory] = useState([]);

  const aiConfigRef = useRef(aiConfig);
  useEffect(() => { aiConfigRef.current = aiConfig; }, [aiConfig]);
  const playersRef = useRef(players);
  useEffect(() => { playersRef.current = players; }, [players]);

  const mainViewerRef = useRef(null);
  const leftColRef = useRef(null);
  const centerRef = useRef(null);
  const trackIdCounter = useRef(1);
  const saveTimer = useRef(null);
  const scrollMapRef = useRef({});
  const scrollDebounceRef = useRef(null);

  const onScrollChanged = useCallback(() => {
    if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
    scrollDebounceRef.current = setTimeout(() => {
      setScrollVersion(v => v + 1);
    }, 500);
  }, []);

  // Load project state on mount
  useEffect(() => {
    window.electronAPI.getProjectState(projectPath).then(saved => {
      if (saved) {
        setLeftWidth(saved.leftWidth ?? DEFAULT_PROJECT_STATE.leftWidth);
        setRightWidth(saved.rightWidth ?? DEFAULT_PROJECT_STATE.rightWidth);
        setExplorerRatio(saved.explorerRatio ?? DEFAULT_PROJECT_STATE.explorerRatio);
        setConsoleHeight(saved.consoleHeight ?? DEFAULT_PROJECT_STATE.consoleHeight);
        setViewerStageRatio(saved.viewerStageRatio ?? DEFAULT_PROJECT_STATE.viewerStageRatio);
        setSlotRatios(saved.slotRatios ?? DEFAULT_PROJECT_STATE.slotRatios);
        setCurrentFile(saved.viewerDocument ?? null);
        const docs = saved.slotDocuments ?? { A: [], B: [], C: [] };
        // Migrate old format (single file or folder object) to array
        const migrated = {};
        for (const key of ['A', 'B', 'C']) {
          const val = docs[key];
          if (!val) migrated[key] = [];
          else if (Array.isArray(val)) migrated[key] = val;
          else if (val.isFolder) migrated[key] = val.files || [];
          else migrated[key] = [val];
        }
        setSlotFiles(migrated);
        setProjectSettings(saved.settings ?? { projectName: projectName, startDate: '', calendarType: 'gregoriano' });
        setPlayers(saved.players ?? []);
        const savedTg = saved.telegram ?? { botToken: '', configured: false };
        setTelegramConfig(savedTg);
        setTelegramLog(savedTg.sendLog ?? []);
        setChatMessages(savedTg.chat ?? {});
        const savedCal = saved.calendar ?? {};
        const startDate = saved.settings?.startDate || '2000-01-01';
        setCalendarData({
          currentDate: savedCal.currentDate || startDate,
          events: savedCal.events ?? {}
        });
        setActiveStageSlot(saved.activeStageTab ?? 'A');
        setSlotSelectedIndices(saved.slotSelectedIndices ?? { A: 0, B: 0, C: 0 });
        setExpandedDirs(saved.expandedDirs ?? {});
        setDocTocPinned(saved.docTocPinned ?? { viewer: false, stage: false });
        setCalFile(saved.calFile ?? null);
        setViewerTabs(saved.viewerTabs ?? [{ type: 'document' }]);
        setActiveViewerTab(saved.activeViewerTab ?? 0);
        setNotes(saved.notes ?? []);
        setChecklist(saved.checklist ?? []);
        setReferenceManuals(saved.referenceManuals ?? []);
        setReferenceScrollPositions(saved.referenceScrollPositions ?? {});
        setReferenceSelectedId(saved.referenceSelectedId ?? null);
        scrollMapRef.current = saved.scrollPositions ?? {};
        setHighlightKeywords(saved.highlightKeywords ?? { enabled: true, defaultColor: 'rgba(201,169,110,0.55)', words: [] });
        setRelationsBase(saved.relationsBase ?? {});
        setRelationsSession(saved.relationsSession ?? {});
        setVistaContent(saved.vistaContent ?? null);
        setViewerFontSize(saved.viewerFontSize ?? 15);
        setStageFontSize(saved.stageFontSize ?? 15);
        setMediaFilter(saved.mediaFilter ?? 'all');
        setPanelVisibility(saved.panelVisibility ?? DEFAULT_PROJECT_STATE.panelVisibility);
        setLayoutPresets(saved.layoutPresets ?? []);
        setAiConfig(saved.aiConfig ?? { provider: '', apiKey: '', model: '', configured: false, telegramAiEnabled: true, telegramAiMode: 'manual' });
        setAiChatHistory(saved.aiChatHistory ?? []);
        // Restore media items (audio paused, re-resolve URLs)
        const savedMedia = saved.savedMediaItems || saved.savedAudioTracks;
        if (savedMedia && savedMedia.length > 0) {
          let maxId = 0;
          Promise.all(savedMedia.map(async (t) => {
            const url = await window.electronAPI.getFileUrl(t.path);
            const id = t.id || (++maxId);
            if (id > maxId) maxId = id;
            const type = t.type || 'audio'; // backward compat
            return {
              id, type, name: t.name, path: t.path, url,
              ...(type === 'audio' ? { volume: t.volume ?? 0.7, loop: t.loop !== false, rate: t.rate || 1 } : {})
            };
          })).then(items => {
            setMediaItems(items);
            trackIdCounter.current = maxId + 1;
          });
        }
      } else {
        setProjectSettings({ projectName: projectName, startDate: '', calendarType: 'gregoriano' });
        setCalendarData({ currentDate: '2000-01-01', events: {} });
      }
      setStateLoaded(true);
    });
  }, [projectPath]);

  // Save project state (debounced)
  const saveState = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      // We need the latest values — use a function that reads from state
      // Since this is called inside effects that depend on the values, they're captured
    }, 300);
  }, []);

  // Consolidated save — runs whenever any persisted value changes
  const latestState = useRef({});
  useEffect(() => {
    latestState.current = {
      leftWidth, rightWidth, explorerRatio, consoleHeight, viewerStageRatio, slotRatios,
      viewerDocument: currentFile,
      slotDocuments: slotFiles,
      settings: projectSettings,
      players: players,
      telegram: { ...telegramConfig, sendLog: telegramLog, chat: chatMessages },
      calendar: calendarData,
      activeStageTab: activeStageSlot,
      slotSelectedIndices: slotSelectedIndices,
      expandedDirs: expandedDirs,
      docTocPinned: docTocPinned,
      calFile: calFile,
      viewerTabs: viewerTabs,
      activeViewerTab: activeViewerTab,
      notes: notes,
      checklist: checklist,
      referenceManuals: referenceManuals,
      referenceScrollPositions: referenceScrollPositions,
      referenceSelectedId: referenceSelectedId,
      scrollPositions: scrollMapRef.current,
      highlightKeywords: highlightKeywords,
      relationsBase: relationsBase,
      relationsSession: relationsSession,
      vistaContent: vistaContent,
      viewerFontSize: viewerFontSize,
      stageFontSize: stageFontSize,
      mediaFilter: mediaFilter,
      savedMediaItems: mediaItems.map(item => ({
        id: item.id, type: item.type, path: item.path, name: item.name,
        ...(item.type === 'audio' ? { volume: item.volume, loop: item.loop, rate: item.rate } : {})
      })),
      aiConfig: aiConfig,
      aiChatHistory: aiChatHistory,
      panelVisibility: panelVisibility,
      layoutPresets: layoutPresets
    };
  });

  useEffect(() => {
    if (!stateLoaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      window.electronAPI.saveProjectState(projectPath, latestState.current);
    }, 400);
  }, [stateLoaded, projectPath, leftWidth, rightWidth, explorerRatio, consoleHeight, viewerStageRatio, slotRatios, currentFile, slotFiles, projectSettings, players, telegramConfig, calendarData, activeStageSlot, slotSelectedIndices, expandedDirs, docTocPinned, calFile, viewerTabs, activeViewerTab, notes, checklist, mediaItems, mediaFilter, telegramLog, chatMessages, referenceManuals, referenceScrollPositions, referenceSelectedId, highlightKeywords, relationsBase, relationsSession, vistaContent, viewerFontSize, stageFontSize, scrollVersion, aiConfig, aiChatHistory, panelVisibility, layoutPresets]);

  // Save immediately on unmount (project switch)
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      window.electronAPI.saveProjectState(projectPath, latestState.current);
    };
  }, [projectPath]);

  // Media add handler — all media types from Explorer
  const handleMediaAdd = useCallback(async (entry) => {
    const type = getFileType(entry.extension);
    const mediaType = type === FILE_TYPES.AUDIO ? 'audio' : type === FILE_TYPES.IMAGE ? 'image' : type === FILE_TYPES.VIDEO ? 'video' : null;
    if (!mediaType) return;
    const url = await window.electronAPI.getFileUrl(entry.path);
    const newItem = {
      id: trackIdCounter.current++,
      type: mediaType, path: entry.path, name: entry.name, url,
      ...(mediaType === 'audio' ? { volume: 0.7, loop: true, rate: 1, autoPlay: true } : {})
    };
    setMediaItems(prev => {
      if (prev.some(item => item.path === entry.path)) return prev;
      return [...prev, newItem];
    });
  }, []);

  // File actions
  const handleFileOpen = useCallback((entry) => {
    const type = getFileType(entry.extension);
    if (type === FILE_TYPES.AUDIO || type === FILE_TYPES.IMAGE || type === FILE_TYPES.VIDEO) {
      handleMediaAdd(entry);
      return;
    }
    setCurrentFile(entry);
    setActiveViewerTab(0);
  }, [handleMediaAdd]);

  const handleSearchNavigate = useCallback((info) => {
    if (!info) {
      setSearchHighlight(null);
      return;
    }
    const entry = { path: info.path, name: info.name, extension: info.extension };
    setCurrentFile(entry);
    setActiveViewerTab(0);
    setSearchHighlight({ query: info.query, offset: info.offset, line: info.line });
  }, []);

  // Clear highlight state after fade completes (1s hold + 3s fade = 4s)
  useEffect(() => {
    if (!searchHighlight) return;
    const timer = setTimeout(() => setSearchHighlight(null), 5000);
    return () => clearTimeout(timer);
  }, [searchHighlight]);

  const handleSlotAssign = useCallback(async (slot, entry) => {
    let newFiles;
    if (entry.isDirectory) {
      const contents = await window.electronAPI.readDirectory(entry.path);
      newFiles = contents.filter(e => !e.isDirectory).sort((a, b) => a.name.localeCompare(b.name));
    } else {
      newFiles = [entry];
    }
    if (newFiles.length === 0) return;
    setSlotFiles(prev => {
      const existing = prev[slot];
      const existingPaths = new Set(existing.map(f => f.path));
      const toAdd = newFiles.filter(f => !existingPaths.has(f.path));
      if (toAdd.length === 0) return prev;
      return { ...prev, [slot]: [...existing, ...toAdd] };
    });
  }, []);

  const handleSlotClear = useCallback((slot) => {
    setSlotFiles(prev => ({ ...prev, [slot]: [] }));
    setSlotSelectedIndices(prev => ({ ...prev, [slot]: 0 }));
  }, []);

  const handleSlotRemoveFile = useCallback((slot, itemKey) => {
    setSlotFiles(prev => {
      const filtered = prev[slot].filter(f => (f.type === 'snippet' ? f.id : f.path) !== itemKey);
      return { ...prev, [slot]: filtered };
    });
    setSlotSelectedIndices(prev => {
      const remaining = slotFiles[slot].filter(f => (f.type === 'snippet' ? f.id : f.path) !== itemKey);
      const idx = prev[slot];
      return { ...prev, [slot]: Math.min(idx, Math.max(0, remaining.length - 1)) };
    });
  }, [slotFiles]);

  const handleSlotRemoveFiles = useCallback((slot, itemKeys) => {
    const keySet = new Set(itemKeys);
    setSlotFiles(prev => {
      const filtered = prev[slot].filter(f => !keySet.has(f.type === 'snippet' ? f.id : f.path));
      return { ...prev, [slot]: filtered };
    });
    setSlotSelectedIndices(prev => ({ ...prev, [slot]: 0 }));
  }, []);

  const handleSlotFileSelect = useCallback((slot, fileIndex) => {
    setActiveStageSlot(slot);
    setSlotSelectedIndices(prev => ({ ...prev, [slot]: fileIndex }));
  }, []);

  const handleRemoveMediaItem = useCallback((id) => {
    setMediaItems(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleUpdateMediaItem = useCallback((id, updates) => {
    setMediaItems(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const handleClearAllMedia = useCallback(() => {
    setMediaItems([]);
  }, []);

  const handleImageClick = useCallback((filePath) => {
    window.electronAPI.getFileUrl(filePath).then(url => setOverlayImage(url));
  }, []);

  const handleVideoClick = useCallback((filePath) => {
    window.electronAPI.getFileUrl(filePath).then(url => setOverlayVideo(url));
  }, []);

  // Viewer tab logic
  const viewerActiveFile = useMemo(() => {
    const tab = viewerTabs[activeViewerTab];
    if (!tab || tab.type === 'document') return currentFile;
    if (tab.type === 'pg' || tab.type === 'note' || tab.type === 'checklist') return tab.file || null;
    if (tab.type === 'relations') return null;
    return null;
  }, [viewerTabs, activeViewerTab, currentFile]);

  const viewerScrollPrefix = useMemo(() => {
    const tab = viewerTabs[activeViewerTab];
    if (!tab || tab.type === 'document') return undefined;
    if (tab.type === 'pg') return `pg-${tab.playerId}`;
    if (tab.type === 'note') return `note-${tab.noteId}`;
    if (tab.type === 'checklist') return `check-${tab.checkId}`;
    return undefined;
  }, [viewerTabs, activeViewerTab]);

  const handleOpenCharacterSheet = useCallback((pg) => {
    if (!pg.characterSheet) return;
    const existingIdx = viewerTabs.findIndex(t => t.type === 'pg' && t.playerId === pg.id);
    if (existingIdx >= 0) {
      setActiveViewerTab(existingIdx);
      return;
    }
    const fullPath = projectPath + '/' + pg.characterSheet;
    const ext = '.' + pg.characterSheet.split('.').pop().toLowerCase();
    const newTab = {
      type: 'pg',
      playerId: pg.id,
      label: pg.characterName || 'Scheda PG',
      file: { name: pg.characterSheet.split('/').pop(), path: fullPath, extension: ext }
    };
    setViewerTabs(prev => {
      const next = [...prev, newTab];
      setActiveViewerTab(next.length - 1);
      return next;
    });
  }, [viewerTabs, projectPath]);

  const handleOpenNoteSource = useCallback((note) => {
    if (!note.sourcePath) return;
    // Check if already open as a note tab for this path
    const existingIdx = viewerTabs.findIndex(t => t.type === 'note' && t.file?.path === note.sourcePath);
    if (existingIdx >= 0) {
      const existingTab = viewerTabs[existingIdx];
      // Set scroll in map for Viewer effect (works when switching from different tab)
      if (note.sourceScrollTop != null) {
        const key = `note-${existingTab.noteId}:${note.sourcePath}`;
        scrollMapRef.current[key] = note.sourceScrollTop;
      }
      if (existingIdx === activeViewerTab) {
        // Tab already active — effect won't re-fire, so scroll DOM directly
        requestAnimationFrame(() => {
          if (mainViewerRef.current) {
            mainViewerRef.current.scrollTop = note.sourceScrollTop || 0;
          }
        });
      } else {
        // Different tab — switch to it, Viewer effect handles scroll from map
        setActiveViewerTab(existingIdx);
      }
      return;
    }
    const ext = '.' + note.sourcePath.split('.').pop().toLowerCase();
    const name = note.sourcePath.split('/').pop().split('\\').pop();
    const newTab = {
      type: 'note',
      noteId: note.id,
      label: '📝 ' + (note.source || 'Nota'),
      file: { name, path: note.sourcePath, extension: ext }
    };
    // Pre-set scroll position before opening tab
    if (note.sourceScrollTop) {
      const key = `note-${note.id}:${note.sourcePath}`;
      scrollMapRef.current[key] = note.sourceScrollTop;
    }
    setViewerTabs(prev => {
      const next = [...prev, newTab];
      setActiveViewerTab(next.length - 1);
      return next;
    });
  }, [viewerTabs, activeViewerTab]);

  const handleCloseViewerTab = useCallback((index) => {
    if (index === 0) return;
    setViewerTabs(prev => prev.filter((_, i) => i !== index));
    setActiveViewerTab(prev => {
      if (prev === index) return 0;
      if (prev > index) return prev - 1;
      return prev;
    });
  }, []);

  const handleClearViewerTabs = useCallback(() => {
    setViewerTabs([{ type: 'document' }]);
    setActiveViewerTab(0);
    setCurrentFile(null);
  }, []);

  const handleClearStage = useCallback(() => {
    setSlotSelectedIndices({ A: -1, B: -1, C: -1 });
    setCalFile(null);
    setVistaContent(null);
  }, []);

  const handleToggleFullscreen = useCallback((panel) => {
    setFullscreenPanel(prev => prev === panel ? null : panel);
  }, []);

  const handleApplyPreset = useCallback((preset) => {
    setPanelVisibility(preset.panels);
  }, []);

  const handleResetLayout = useCallback(() => {
    setPanelVisibility({ explorer: true, media: true, viewer: true, stage: true, console: true, slotA: true, slotB: true, slotC: true });
  }, []);

  // Open relations in Viewer (new tab each time)
  const handleOpenRelationsViewer = useCallback((pngName) => {
    const newTab = {
      type: 'relations',
      pngName,
      label: `Relazioni: ${pngName}`
    };
    setViewerTabs(prev => {
      const next = [...prev, newTab];
      setActiveViewerTab(next.length - 1);
      return next;
    });
  }, []);

  // Open relations in Stage Vista tab
  const handleOpenRelationsStage = useCallback((pngName) => {
    setVistaContent({ pngName });
    setActiveStageSlot('Vista');
  }, []);

  // Calendar document handler
  const handleOpenCalDoc = useCallback((relPath) => {
    const fullPath = projectPath + '/' + relPath;
    const ext = '.' + relPath.split('.').pop().toLowerCase();
    setCalFile({ name: relPath.split('/').pop(), path: fullPath, extension: ext });
    setActiveStageSlot('Cal');
  }, [projectPath]);

  // Game date navigation
  const changeGameDate = useCallback((delta) => {
    setCalendarData(prev => {
      const [y, m, d] = prev.currentDate.split('-').map(Number);
      const date = new Date(y, m - 1, d + delta);
      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return { ...prev, currentDate: iso };
    });
  }, []);

  const setGameDate = useCallback((iso) => {
    setCalendarData(prev => ({ ...prev, currentDate: iso }));
  }, []);

  const handleResetGameDate = useCallback(() => {
    if (projectSettings.startDate) {
      setCalendarData(prev => ({ ...prev, currentDate: projectSettings.startDate }));
    }
  }, [projectSettings.startDate]);

  const gameDateHasEvents = (calendarData.events[calendarData.currentDate] || []).length > 0;

  // Auto-send eventi Telegram quando la data di gioco cambia
  useEffect(() => {
    if (!botStatus.running || !calendarData.currentDate) return;
    const dayEvents = calendarData.events[calendarData.currentDate] || [];
    const toSend = dayEvents.filter(ev =>
      ev.telegram?.enabled && ev.telegram?.autoSend && !ev.sent &&
      (ev.telegram?.recipients || []).length > 0
    );
    if (toSend.length === 0) return;

    const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    (async () => {
      const now = new Date().toLocaleString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      for (const ev of toSend) {
        const recipients = (ev.telegram.recipients || [])
          .map(pid => players.find(p => p.id === pid))
          .filter(p => p && p.telegramChatId);
        if (recipients.length === 0) continue;

        const text = `📅 *${ev.title}*\n${ev.note || ''}`.trim();
        const linkedFile = ev.linkedDocument ? `${projectPath}/${ev.linkedDocument}` : null;
        const linkedExt = ev.linkedDocument ? ev.linkedDocument.substring(ev.linkedDocument.lastIndexOf('.')).toLowerCase() : '';
        const isImage = IMAGE_EXTS.includes(linkedExt);
        const isHtml = ['.html', '.htm'].includes(linkedExt);

        for (const p of recipients) {
          try {
            await window.electronAPI.telegramSendMessage(p.telegramChatId, text);
            if (linkedFile) {
              if (isImage) {
                await window.electronAPI.telegramSendPhoto(p.telegramChatId, linkedFile, ev.linkedDocument.split('/').pop());
              } else if (isHtml) {
                await window.electronAPI.telegramSendHtmlAsPhoto(p.telegramChatId, linkedFile, ev.linkedDocument.split('/').pop());
              } else {
                await window.electronAPI.telegramSendDocument(p.telegramChatId, linkedFile, ev.linkedDocument.split('/').pop());
              }
            }
            handleTelegramLog({
              date: now, success: true,
              description: `Evento "${ev.title}" auto-inviato${linkedFile ? ' + allegato' : ''}`,
              recipient: p.characterName || p.playerName
            });
          } catch (err) {
            handleTelegramLog({
              date: now, success: false,
              description: `Evento "${ev.title}" — errore auto-invio`,
              recipient: p.characterName || p.playerName,
              error: err.message
            });
          }
        }
        // Marca come inviato
        setCalendarData(prev => ({
          ...prev,
          events: {
            ...prev.events,
            [prev.currentDate]: (prev.events[prev.currentDate] || []).map(e =>
              e.id === ev.id ? { ...e, sent: true } : e
            )
          }
        }));
      }
    })();
  }, [calendarData.currentDate, botStatus.running]); // eslint-disable-line react-hooks/exhaustive-deps

  const stageActiveItem = useMemo(() => {
    if (activeStageSlot === 'Cal') return calFile || null;
    const items = slotFiles[activeStageSlot] || [];
    const idx = slotSelectedIndices[activeStageSlot] || 0;
    return items[idx] || null;
  }, [activeStageSlot, slotFiles, slotSelectedIndices, calFile]);

  // Telegram bot lifecycle
  const handleStartBot = useCallback(async () => {
    const token = telegramConfig.botToken;
    const code = telegramConfig.sessionCode;
    if (!token || !code) return;
    const result = await window.electronAPI.telegramStartBot(token, code, players);
    if (result.success) {
      setBotStatus({ running: true, error: null });
      setTelegramConfig(prev => ({ ...prev, botActive: true, botInfo: result.botInfo }));
    } else {
      setBotStatus({ running: false, error: result.error });
    }
  }, [telegramConfig.botToken, telegramConfig.sessionCode, players]);

  const handleStopBot = useCallback(async () => {
    await window.electronAPI.telegramStopBot();
    setBotStatus({ running: false, error: null });
    setTelegramConfig(prev => ({ ...prev, botActive: false }));
  }, []);

  // Auto-start bot if it was active
  useEffect(() => {
    if (stateLoaded && telegramConfig.botActive && telegramConfig.botToken && telegramConfig.sessionCode) {
      handleStartBot();
    }
  }, [stateLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync session data to main process when players/code change
  useEffect(() => {
    if (botStatus.running && telegramConfig.sessionCode) {
      window.electronAPI.telegramUpdateSession(telegramConfig.sessionCode, players);
    }
  }, [botStatus.running, telegramConfig.sessionCode, players]);

  // Listen for bot events
  useEffect(() => {
    const unsubJoined = window.electronAPI.onTelegramPlayerJoined((data) => {
      setPlayers(prev => prev.map(p => {
        if (p.id !== data.playerId) return p;
        const update = { ...p, telegramChatId: data.chatId };
        if (data.playerName && !p.playerName) update.playerName = data.playerName;
        return update;
      }));
    });
    const unsubLeft = window.electronAPI.onTelegramPlayerLeft((data) => {
      setPlayers(prev => prev.map(p => p.id === data.playerId ? { ...p, telegramChatId: '' } : p));
    });
    const unsubMsg = window.electronAPI.onTelegramMessageReceived((data) => {
      const msg = {
        id: crypto.randomUUID(),
        from: 'player',
        characterName: data.characterName,
        text: data.text,
        timestamp: data.timestamp,
        read: false
      };
      setChatMessages(prev => ({
        ...prev,
        [data.chatId]: [...(prev[data.chatId] || []), msg]
      }));
      // Log in console
      const now = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      setTelegramLog(prev => [...prev, {
        date: now,
        success: true,
        description: `Messaggio da ${data.characterName}: "${data.text.length > 40 ? data.text.substring(0, 40) + '...' : data.text}"`,
        icon: '\u{1F4AC}'
      }]);
      // Notification: flash + beep if chat is closed or on different player
      if (!chatOpenRef.current || selectedChatRef.current !== data.chatId) {
        setChatFlash(true);
        setTimeout(() => setChatFlash(false), 1000);
        // Beep only if chat is closed
        if (!chatOpenRef.current) {
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = 600; gain.gain.value = 0.15;
            osc.start(); osc.stop(ctx.currentTime + 0.05);
          } catch (e) { console.warn('Audio beep failed:', e.message); }
        }
      }
      // Auto mark as read if chat is open on this player
      if (chatOpenRef.current && selectedChatRef.current === data.chatId) {
        setChatMessages(prev => ({
          ...prev,
          [data.chatId]: (prev[data.chatId] || []).map(m => m.from === 'player' && !m.read ? { ...m, read: true } : m)
        }));
      }
      // AI auto-reply for Telegram
      const ai = aiConfigRef.current;
      if (ai.telegramAiEnabled) {
        // Comando /imagine o /immagina — genera immagine
        const isImagineCommand = /^\/(imagine|immagina)\s/.test(data.text);
        if (isImagineCommand) {
          const imagePrompt = data.text.replace(/^\/(imagine|immagina)\s+/, '');
          if (!imagePrompt.trim()) {
            window.electronAPI.telegramSendMessage(data.chatId, 'Descrivi cosa vuoi generare. Es: /imagine un drago rosso');
          } else {
            window.electronAPI.aiGenerateImage(imagePrompt, projectPath).then(result => {
              if (result.error) {
                window.electronAPI.telegramSendMessage(data.chatId, `❌ ${result.error}`);
              } else {
                window.electronAPI.telegramSendPhoto(data.chatId, result.filePath, imagePrompt);
                setChatMessages(prev => ({
                  ...prev,
                  [data.chatId]: [...(prev[data.chatId] || []), {
                    id: crypto.randomUUID(),
                    from: 'gm',
                    text: `🖼️ Immagine generata: ${imagePrompt}`,
                    timestamp: new Date().toISOString(),
                    read: true,
                    isAi: true
                  }]
                }));
              }
            }).catch(() => {});
          }
          return;
        }

        const isAiCommand = /^\/(ai|ia)\s/.test(data.text);
        const shouldReply = ai.telegramAiMode === 'auto' || isAiCommand;
        if (shouldReply) {
          const question = isAiCommand ? data.text.replace(/^\/(ai|ia)\s+/, '') : data.text;
          // Raccogliere documenti autorizzati per questo player
          const player = playersRef.current.find(p => p.id === data.playerId);
          const commonDocs = (ai.commonDocs || []).filter(d => d.active).map(d => d.file);
          const playerDocs = (player?.aiDocuments || []).filter(d => d.active).map(d => d.file);
          const allowedFiles = [...commonDocs, ...playerDocs];
          const aiMessages = [{ role: 'user', content: question }];
          window.electronAPI.aiChat(aiMessages, projectPath, { allowedFiles }).then(result => {
            if (result.response) {
              window.electronAPI.telegramSendReply(data.chatId, result.response);
              setChatMessages(prev => ({
                ...prev,
                [data.chatId]: [...(prev[data.chatId] || []), {
                  id: crypto.randomUUID(),
                  from: 'gm',
                  text: `🤖 ${result.response}`,
                  timestamp: new Date().toISOString(),
                  read: true,
                  isAi: true
                }]
              }));
            }
          }).catch(() => {});
        }
      }
    });
    return () => { unsubJoined(); unsubLeft(); unsubMsg(); };
  }, []);

  // Keep refs in sync for the message listener
  useEffect(() => { chatOpenRef.current = chatOpen; }, [chatOpen]);

  const handleTelegramLog = useCallback((entry) => {
    setTelegramLog(prev => [...prev, entry]);
  }, []);

  const handleDisconnectAllPlayers = useCallback(() => {
    setPlayers(prev => prev.map(p => ({ ...p, telegramChatId: '' })));
  }, []);

  // Chat handlers
  const handleChatSendReply = useCallback(async (chatId, text) => {
    try {
      await window.electronAPI.telegramSendReply(chatId, text);
      const msg = {
        id: crypto.randomUUID(),
        from: 'gm',
        text,
        timestamp: new Date().toISOString(),
        read: true
      };
      setChatMessages(prev => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), msg]
      }));
      // Find player name for log
      const player = players.find(p => p.telegramChatId === chatId);
      const name = player?.characterName || 'Giocatore';
      const now = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      setTelegramLog(prev => [...prev, {
        date: now,
        success: true,
        description: `Risposta a ${name}: "${text.length > 40 ? text.substring(0, 40) + '...' : text}"`,
        icon: '\u{1F4E4}'
      }]);
    } catch (err) {
      const now = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      setTelegramLog(prev => [...prev, { date: now, success: false, description: 'Errore invio risposta', error: err.message }]);
    }
  }, [players]);

  const handleChatMarkRead = useCallback((chatId) => {
    setChatMessages(prev => ({
      ...prev,
      [chatId]: (prev[chatId] || []).map(m => m.from === 'player' && !m.read ? { ...m, read: true } : m)
    }));
  }, []);

  const handleChatSelectedChange = useCallback((chatId) => {
    selectedChatRef.current = chatId;
  }, []);

  // Telegram UI handlers
  const handleTelegramFile = useCallback((entry) => {
    setTelegramFileData({ name: entry.name, extension: entry.extension, path: entry.path });
  }, []);

  const handleAiSaveImage = useCallback(async (imageFullPath) => {
    const destFolder = await window.electronAPI.selectProjectSubfolder(projectPath);
    if (!destFolder) return null;
    const result = await window.electronAPI.copyFile(imageFullPath, destFolder);
    if (result.success) setExplorerRefreshKey(k => k + 1);
    return result;
  }, [projectPath]);

  // Global text selection context menu
  useEffect(() => {
    const handler = (e) => {
      const sel = window.getSelection()?.toString()?.trim();
      if (!sel) return;
      // Don't intercept context menu on inputs/textareas
      const tag = e.target.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      e.preventDefault();
      // Detect source from closest data-source attribute
      const sourceEl = e.target.closest?.('[data-source-name]');
      const source = sourceEl?.getAttribute('data-source-name') || null;
      // Detect source path (full path for reopening)
      const sourcePathEl = e.target.closest?.('[data-source-path]');
      const sourcePath = sourcePathEl?.getAttribute('data-source-path') || null;
      // Capture scrollTop from the nearest scrollable viewer-content
      const scrollEl = e.target.closest?.('.viewer-content');
      const sourceScrollTop = scrollEl ? scrollEl.scrollTop : 0;
      setTextContextMenu({ x: e.clientX, y: e.clientY, text: sel, source, sourcePath, sourceScrollTop });
    };
    document.addEventListener('contextmenu', handler);
    return () => document.removeEventListener('contextmenu', handler);
  }, []);

  useEffect(() => {
    if (!textContextMenu) return;
    const handler = () => setTextContextMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [textContextMenu]);

  const handleSaveAsNote = useCallback((text, source, sourcePath, sourceScrollTop) => {
    const note = {
      id: crypto.randomUUID(),
      text: text,
      timestamp: new Date().toISOString(),
      source: source || null,
      sourcePath: sourcePath || null,
      sourceScrollTop: sourceScrollTop || 0
    };
    setNotes(prev => [note, ...prev]);
    setTextContextMenu(null);
  }, []);

  const handleSaveAsChecklist = useCallback((text, source, sourcePath, sourceScrollTop) => {
    const item = {
      id: crypto.randomUUID(),
      text: text,
      checked: false,
      timestamp: new Date().toISOString(),
      source: source || null,
      sourcePath: sourcePath || null,
      sourceScrollTop: sourceScrollTop || null
    };
    setChecklist(prev => [item, ...prev]);
    setTextContextMenu(null);
  }, []);

  const handleAddSnippetToSlot = useCallback((slot, text, source, sourcePath, sourceScrollTop) => {
    const title = text.length > 50 ? text.substring(0, 50).trimEnd() + '...' : text;
    const snippet = {
      type: 'snippet',
      id: crypto.randomUUID(),
      text,
      title,
      source: source || null,
      sourcePath: sourcePath || null,
      sourceScrollTop: sourceScrollTop || 0
    };
    setSlotFiles(prev => ({
      ...prev,
      [slot]: [...prev[slot], snippet]
    }));
    setTextContextMenu(null);
  }, []);

  const handleOpenChecklistSource = useCallback((item) => {
    if (!item.sourcePath) return;
    const existingIdx = viewerTabs.findIndex(t => t.type === 'checklist' && t.file?.path === item.sourcePath);
    if (existingIdx >= 0) {
      const existingTab = viewerTabs[existingIdx];
      if (item.sourceScrollTop != null) {
        const key = `check-${existingTab.checkId}:${item.sourcePath}`;
        scrollMapRef.current[key] = item.sourceScrollTop;
      }
      if (existingIdx === activeViewerTab) {
        requestAnimationFrame(() => {
          if (mainViewerRef.current) {
            mainViewerRef.current.scrollTop = item.sourceScrollTop || 0;
          }
        });
      } else {
        setActiveViewerTab(existingIdx);
      }
      return;
    }
    const ext = '.' + item.sourcePath.split('.').pop().toLowerCase();
    const name = item.sourcePath.split('/').pop().split('\\').pop();
    const newTab = {
      type: 'checklist',
      checkId: item.id,
      label: '☐ Check',
      file: { name, path: item.sourcePath, extension: ext }
    };
    if (item.sourceScrollTop != null) {
      const key = `check-${item.id}:${item.sourcePath}`;
      scrollMapRef.current[key] = item.sourceScrollTop;
    }
    setViewerTabs(prev => {
      const next = [...prev, newTab];
      setActiveViewerTab(next.length - 1);
      return next;
    });
  }, [viewerTabs, activeViewerTab]);

  const handleOpenSnippetSource = useCallback((snippet) => {
    if (!snippet.sourcePath) return;
    const ext = '.' + snippet.sourcePath.split('.').pop().toLowerCase();
    const name = snippet.sourcePath.split('/').pop().split('\\').pop();
    const file = { name, path: snippet.sourcePath, extension: ext };
    const scrollKey = `viewer:${snippet.sourcePath}`;
    // Set scroll position so it opens at the right spot
    if (snippet.sourceScrollTop != null) {
      scrollMapRef.current[scrollKey] = snippet.sourceScrollTop;
    }
    // Extract a search phrase from snippet text (first non-empty line, strip markdown, max 60 chars)
    const rawLine = (snippet.text || '').split('\n').find(l => l.trim()) || '';
    const cleanPhrase = rawLine.replace(/^#+\s*/, '').replace(/[*_~`>]/g, '').trim();
    const searchPhrase = cleanPhrase.length > 60 ? cleanPhrase.substring(0, 60).replace(/\s+\S*$/, '') : cleanPhrase;
    const alreadyOpen = activeViewerTab === 0 && currentFile?.path === snippet.sourcePath;
    if (!alreadyOpen) {
      setCurrentFile(file);
      setActiveViewerTab(0);
    }
    // Trigger search highlight effect (same as Console search navigation)
    if (searchPhrase) {
      setSearchHighlight({ query: searchPhrase, offset: 0 });
    }
  }, [activeViewerTab, currentFile?.path]);

  // Resize handlers
  const handleLeftResize = useCallback((delta) => {
    setLeftWidth(prev => Math.max(180, Math.min(500, prev + delta)));
  }, []);

  const handleRightResize = useCallback((delta) => {
    setRightWidth(prev => Math.max(200, Math.min(600, prev - delta)));
  }, []);

  const handleExplorerResize = useCallback((delta) => {
    if (!leftColRef.current) return;
    const totalH = leftColRef.current.offsetHeight;
    setExplorerRatio(prev => Math.max(0.15, Math.min(0.85, prev + delta / totalH)));
  }, []);

  const handleConsoleResize = useCallback((delta) => {
    setConsoleHeight(prev => Math.max(80, Math.min(500, prev - delta)));
  }, []);

  const handleViewerStageResize = useCallback((delta) => {
    if (!centerRef.current) return;
    const totalW = centerRef.current.offsetWidth;
    setViewerStageRatio(prev => Math.max(0.2, Math.min(0.8, prev + delta / totalW)));
  }, []);

  const handleSlotResize = useCallback((slotIndex, delta) => {
    setSlotRatios(prev => {
      const newRatios = [...prev];
      const deltaPct = delta / window.innerHeight;
      newRatios[slotIndex] = Math.max(0.1, newRatios[slotIndex] + deltaPct);
      newRatios[slotIndex + 1] = Math.max(0.1, newRatios[slotIndex + 1] - deltaPct);
      return newRatios;
    });
  }, []);

  if (!stateLoaded) return null;

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-main)',
      overflow: 'hidden'
    }}>
      {/* === TOP MENU — fixed bar === */}
      <TopMenu
        onChangeProject={onChangeProject}
        onOpenInfo={() => setInfoOpen(true)}
        onOpenSettings={() => setSettingsOpen('aspetto')}
        onOpenAiDocs={() => setSettingsOpen('aidocs')}
        onOpenCalendar={() => setCalendarOpen(true)}
        onOpenNotes={() => setNotesOpen(v => !v)}
        onOpenChecklist={() => setChecklistOpen(v => !v)}
        gameDate={calendarData.currentDate}
        onPrevDay={() => changeGameDate(-1)}
        onNextDay={() => changeGameDate(1)}
        onSetGameDate={setGameDate}
        hasEvents={gameDateHasEvents}
        players={players}
        onOpenCharacterSheet={handleOpenCharacterSheet}
        calendarEvents={calendarData.events}
        botRunning={botStatus.running}
        chatMessages={chatMessages}
        chatOpen={chatOpen}
        chatFlash={chatFlash}
        onToggleChat={() => setChatOpen(v => !v)}
        onOpenReference={() => setReferenceOpen(v => !v)}
        referenceOpen={referenceOpen}
        highlightEnabled={highlightKeywords.enabled}
        onToggleHighlight={() => setHighlightKeywords(prev => ({ ...prev, enabled: !prev.enabled }))}
        onOpenAdventures={() => setAdventuresOpen(true)}
        onOpenProjectFolder={() => window.electronAPI.openProjectFolder(projectPath)}
        onOpenRelationsOverlay={() => setRelationsOpen(true)}
        relationsHasFile={!!projectSettings.relationsFile && Object.keys(relationsBase).length > 0}
        relationsBase={relationsBase}
        onOpenRelationsViewer={handleOpenRelationsViewer}
        onOpenRelationsStage={handleOpenRelationsStage}
        firebaseUser={firebaseUser}
        onFirebaseUserChange={onFirebaseUserChange}
        panelVisibility={panelVisibility}
        layoutPresets={layoutPresets}
        onApplyPreset={handleApplyPreset}
        onResetLayout={handleResetLayout}
      />

      {/* === MAIN CONTENT below menu === */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

      {/* === LEFT COLUMN === */}
      {(panelVisibility.explorer || panelVisibility.media) && (<div ref={leftColRef} style={{ width: `${leftWidth}px`, display: 'flex', flexDirection: 'column', flexShrink: 0, borderRight: '1px solid var(--border-subtle)' }}>
        {panelVisibility.explorer && (
        <div style={{ height: panelVisibility.media ? `${explorerRatio * 100}%` : '100%', overflow: 'hidden' }}>
          <Explorer
            projectFolder={projectPath}
            activeFilePath={currentFile?.path}
            onFileOpen={handleFileOpen}
            onSlotAssign={handleSlotAssign}
            onMediaAdd={handleMediaAdd}
            expandedDirs={expandedDirs}
            onExpandedDirsChange={setExpandedDirs}
            onTelegramFile={handleTelegramFile}
            hiddenExtensions={projectSettings.hiddenExtensions}
            refreshKey={explorerRefreshKey}
          />
        </div>
        )}
        {panelVisibility.explorer && panelVisibility.media && <ResizeHandle direction="horizontal" onResize={handleExplorerResize} />}
        {panelVisibility.media && (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <MediaPanel
            items={mediaItems}
            filter={mediaFilter}
            onFilterChange={setMediaFilter}
            onRemoveItem={handleRemoveMediaItem}
            onUpdateItem={handleUpdateMediaItem}
            onClearAll={handleClearAllMedia}
            onImageClick={(url) => setOverlayImage(url)}
            onVideoClick={(url) => setOverlayVideo(url)}
            onTelegramFile={handleTelegramFile}
          />
        </div>
        )}
      </div>)}

      {(panelVisibility.explorer || panelVisibility.media) && <ResizeHandle direction="vertical" onResize={handleLeftResize} />}

      {/* === CENTER COLUMN === */}
      <div ref={centerRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Top row: VIEWER + STAGE side by side */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', borderBottom: '1px solid var(--border-subtle)' }}>
          {/* VIEWER */}
          {panelVisibility.viewer && (<div data-source-name={viewerActiveFile?.name || ''} data-source-path={viewerActiveFile?.path || ''} style={{
            width: !panelVisibility.stage || fullscreenPanel === 'viewer' ? '100%' : fullscreenPanel === 'stage' ? '0' : `${viewerStageRatio * 100}%`,
            display: fullscreenPanel === 'stage' ? 'none' : 'flex',
            overflow: 'hidden', flexDirection: 'column'
          }}>
            <div style={{
              padding: '0 12px',
              height: '26px',
              boxSizing: 'border-box',
              fontSize: '11px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              color: 'var(--accent)',
              borderBottom: '1px solid var(--border-subtle)',
              flexShrink: 0,
              background: 'var(--bg-panel)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>Viewer</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PanelToolbar
                  fontSize={viewerFontSize}
                  onFontSizeChange={setViewerFontSize}
                  isFullscreen={fullscreenPanel === 'viewer'}
                  onToggleFullscreen={() => handleToggleFullscreen('viewer')}
                  searchOpen={viewerSearchOpen}
                  onSearchToggle={() => setViewerSearchOpen(v => !v)}
                  isHtmlIframe={viewerActiveFile?.extension === '.url'}
                />
                {(currentFile || viewerTabs.length > 1) && (
                  <span className="close-btn" onClick={handleClearViewerTabs} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', lineHeight: 1 }} title="Svuota viewer">✕</span>
                )}
                <DocToc containerRef={mainViewerRef} pinned={docTocPinned.viewer} onPinnedChange={v => setDocTocPinned(p => ({ ...p, viewer: v }))} contentKey={currentFile?.path || ''} pdfOutline={viewerActiveFile?.extension === '.pdf' ? viewerPdfOutline : null} />
              </div>
            </div>
            {/* Viewer tab bar — hidden if only Document tab */}
            {viewerTabs.length > 1 && (
              <div style={{
                display: 'flex', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0,
                background: 'var(--bg-panel)', overflowX: 'auto'
              }}>
                {viewerTabs.map((tab, idx) => {
                  const isActive = activeViewerTab === idx;
                  const label = tab.type === 'document' ? 'Documento' : tab.label;
                  return (
                    <div
                      key={tab.type === 'pg' ? tab.playerId : tab.type === 'note' ? `note-${tab.noteId}` : tab.type === 'relations' ? `rel-${idx}` : 'doc'}
                      onClick={() => setActiveViewerTab(idx)}
                      style={{
                        padding: '4px 12px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                        borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                        background: isActive ? 'var(--bg-elevated)' : 'transparent',
                        display: 'flex', alignItems: 'center', gap: '6px',
                        flexShrink: 0, transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--accent-dim)'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = isActive ? 'var(--accent)' : 'var(--text-secondary)'; }}
                    >
                      {label}
                      {(tab.type === 'pg' || tab.type === 'note' || tab.type === 'checklist' || tab.type === 'relations') && (
                        <span
                          className="close-btn"
                          onClick={(e) => { e.stopPropagation(); handleCloseViewerTab(idx); }}
                          style={{ fontSize: '10px' }}
                        >✕</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {viewerSearchOpen && !(viewerActiveFile?.extension === '.url' || viewerActiveFile?.extension === '.pdf') && (
              <PanelSearch containerRef={mainViewerRef} onClose={() => setViewerSearchOpen(false)} />
            )}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {viewerTabs[activeViewerTab]?.type === 'relations' ? (
                <RelationsView
                  pngName={viewerTabs[activeViewerTab].pngName}
                  relationsBase={relationsBase}
                  relationsSession={relationsSession}
                  fontSize={viewerFontSize}
                />
              ) : viewerActiveFile ? (
                <Viewer
                  ref={mainViewerRef}
                  currentFile={viewerActiveFile}
                  scrollKeyPrefix={viewerScrollPrefix}
                  searchHighlight={searchHighlight}
                  highlightKeywords={highlightKeywords}
                  onImageClick={handleImageClick}
                  onVideoClick={handleVideoClick}
                  scrollMapRef={scrollMapRef}
                  onScrollChanged={onScrollChanged}
                  fontSize={viewerFontSize}
                  searchOpen={viewerSearchOpen && viewerActiveFile?.extension === '.pdf'}
                  onSearchClose={() => setViewerSearchOpen(false)}
                  onPdfOutlineReady={setViewerPdfOutline}
                />
              ) : (
                <div style={{
                  height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-disabled)', fontSize: '13px', fontStyle: 'italic'
                }}>
                  {viewerTabs[activeViewerTab]?.type === 'pg'
                    ? 'Nessuna scheda configurata per questo personaggio'
                    : 'Seleziona un documento dall\'Explorer'}
                </div>
              )}
            </div>
          </div>)}

          {panelVisibility.viewer && panelVisibility.stage && !fullscreenPanel && <ResizeHandle direction="vertical" onResize={handleViewerStageResize} />}

          {/* STAGE */}
          {panelVisibility.stage && (<div data-source-name={stageActiveItem?.name || ''} data-source-path={stageActiveItem?.path || ''} style={{
            flex: 1, overflow: 'hidden',
            borderLeft: fullscreenPanel ? 'none' : '1px solid var(--border-subtle)',
            display: fullscreenPanel === 'viewer' ? 'none' : undefined
          }}>
            <Stage
              slotFiles={slotFiles}
              activeTab={activeStageSlot}
              selectedIndices={slotSelectedIndices}
              onTabChange={setActiveStageSlot}
              onImageClick={handleImageClick}
              onVideoClick={handleVideoClick}
              calFile={calFile}
              vistaContent={vistaContent}
              relationsBase={relationsBase}
              relationsSession={relationsSession}
              scrollMapRef={scrollMapRef}
              onScrollChanged={onScrollChanged}
              tocPinned={docTocPinned.stage}
              onTocPinnedChange={v => setDocTocPinned(p => ({ ...p, stage: v }))}
              onOpenSnippetSource={handleOpenSnippetSource}
              highlightKeywords={highlightKeywords}
              onClearAll={handleClearStage}
              fontSize={stageFontSize}
              onFontSizeChange={setStageFontSize}
              isFullscreen={fullscreenPanel === 'stage'}
              onToggleFullscreen={() => handleToggleFullscreen('stage')}
            />
          </div>)}
        </div>

        {panelVisibility.console && <ResizeHandle direction="horizontal" onResize={handleConsoleResize} />}

        {/* CONSOLE — full width */}
        {panelVisibility.console && (
        <div style={{ height: `${consoleHeight}px`, overflow: 'hidden', flexShrink: 0 }}>
          <Console projectFolder={projectPath} onOpenFile={handleFileOpen} onSearchNavigate={handleSearchNavigate} externalQuery={externalSearchQuery} telegramLog={telegramLog} onClearLog={() => setTelegramLog([])} aiConfig={aiConfig} aiChatHistory={aiChatHistory} onAiChatHistoryChange={setAiChatHistory} firebaseUser={firebaseUser} onTelegramText={(text) => setTelegramTextData(text)} onTelegramFile={handleTelegramFile} onSaveImage={handleAiSaveImage} botRunning={botStatus.running} />
        </div>
        )}
      </div>

      {(panelVisibility.slotA || panelVisibility.slotB || panelVisibility.slotC) && <ResizeHandle direction="vertical" onResize={handleRightResize} />}

      {/* === RIGHT COLUMN === */}
      {(panelVisibility.slotA || panelVisibility.slotB || panelVisibility.slotC) && (<div style={{ width: `${rightWidth}px`, display: 'flex', flexDirection: 'column', flexShrink: 0, borderLeft: '1px solid var(--border-subtle)' }}>
        {panelVisibility.slotA && (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <SlotPanel label="A" files={slotFiles.A} isActive={activeStageSlot === 'A'} activeFileIndex={slotSelectedIndices.A} onClear={() => handleSlotClear('A')} onRemoveFile={handleSlotRemoveFile} onRemoveFiles={handleSlotRemoveFiles} onFileSelect={handleSlotFileSelect} onFileOpen={handleFileOpen} onOpenSnippetSource={handleOpenSnippetSource} onTelegramFile={handleTelegramFile} />
        </div>
        )}
        {panelVisibility.slotA && panelVisibility.slotB && <ResizeHandle direction="horizontal" onResize={(d) => handleSlotResize(0, d)} />}
        {panelVisibility.slotB && (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <SlotPanel label="B" files={slotFiles.B} isActive={activeStageSlot === 'B'} activeFileIndex={slotSelectedIndices.B} onClear={() => handleSlotClear('B')} onRemoveFile={handleSlotRemoveFile} onRemoveFiles={handleSlotRemoveFiles} onFileSelect={handleSlotFileSelect} onFileOpen={handleFileOpen} onOpenSnippetSource={handleOpenSnippetSource} onTelegramFile={handleTelegramFile} />
        </div>
        )}
        {(panelVisibility.slotA || panelVisibility.slotB) && panelVisibility.slotC && <ResizeHandle direction="horizontal" onResize={(d) => handleSlotResize(1, d)} />}
        {panelVisibility.slotC && (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <SlotPanel label="C" files={slotFiles.C} isActive={activeStageSlot === 'C'} activeFileIndex={slotSelectedIndices.C} onClear={() => handleSlotClear('C')} onRemoveFile={handleSlotRemoveFile} onRemoveFiles={handleSlotRemoveFiles} onFileSelect={handleSlotFileSelect} onFileOpen={handleFileOpen} onOpenSnippetSource={handleOpenSnippetSource} onTelegramFile={handleTelegramFile} />
        </div>
        )}
      </div>)}

      </div>{/* end MAIN CONTENT */}

      {/* === SETTINGS PANEL === */}
      {settingsOpen && (
        <SettingsPanel
          key={settingsOpen}
          projectPath={projectPath}
          defaultProjectName={projectName}
          initialSection={settingsOpen}
          settings={projectSettings}
          onSettingsChange={setProjectSettings}
          players={players}
          onPlayersChange={setPlayers}
          telegram={telegramConfig}
          onTelegramChange={setTelegramConfig}
          botStatus={botStatus}
          onStartBot={handleStartBot}
          onStopBot={handleStopBot}
          onDisconnectAllPlayers={handleDisconnectAllPlayers}
          referenceManuals={referenceManuals}
          onReferenceChange={setReferenceManuals}
          onClose={() => setSettingsOpen(null)}
          onResetGameDate={handleResetGameDate}
          highlightKeywords={highlightKeywords}
          onHighlightChange={setHighlightKeywords}
          onResetAllRelations={() => setRelationsSession({})}
          onOpenInfo={() => { setSettingsOpen(null); setInfoOpen(true); }}
          onExportAdventure={async () => {
            const metadata = {
              name: projectSettings.projectName || projectName,
              system: projectSettings.system || '',
              author: projectSettings.author || '',
              version: projectSettings.adventureVersion || '1.0',
              description: projectSettings.description || '',
              players: projectSettings.players || '',
              duration: projectSettings.duration || '',
              language: projectSettings.language || 'it',
              tags: (projectSettings.tags || '').split(',').map(t => t.trim()).filter(Boolean),
              exportExcludes: projectSettings.exportExcludes || ''
            };
            const result = await window.electronAPI.adventureExport(projectPath, metadata);
            if (result.canceled) return;
            if (result.error) {
              setExportStatus('❌ ' + result.error);
            } else {
              setExportStatus('✅ Pacchetto esportato: ' + result.sizeMB + ' MB');
            }
            setTimeout(() => setExportStatus(null), 4000);
          }}
          onOpenAdventures={() => { setSettingsOpen(null); setAdventuresOpen(true); }}
          aiConfig={aiConfig}
          onAiConfigChange={setAiConfig}
          onClearAiHistory={() => setAiChatHistory([])}
          panelVisibility={panelVisibility}
          onPanelVisibilityChange={setPanelVisibility}
          layoutPresets={layoutPresets}
          onLayoutPresetsChange={setLayoutPresets}
        />
      )}

      {/* === CALENDAR PANEL === */}
      {calendarOpen && (
        <CalendarPanel
          calendarData={calendarData}
          onCalendarChange={setCalendarData}
          gameDate={calendarData.currentDate}
          projectPath={projectPath}
          players={players}
          onOpenCalDoc={handleOpenCalDoc}
          onClose={() => setCalendarOpen(false)}
          botRunning={botStatus.running}
          onLog={handleTelegramLog}
        />
      )}

      {/* === NOTES PANEL === */}
      {notesOpen && (
        <NotesPanel
          notes={notes}
          onNotesChange={setNotes}
          onOpenSource={handleOpenNoteSource}
          onClose={() => setNotesOpen(false)}
        />
      )}

      {/* === CHECKLIST PANEL === */}
      {checklistOpen && (
        <ChecklistPanel
          items={checklist}
          onItemsChange={setChecklist}
          onOpenSource={handleOpenChecklistSource}
          onClose={() => setChecklistOpen(false)}
        />
      )}

      {/* === EXPORT STATUS === */}
      {exportStatus && (
        <div style={{
          position: 'fixed', bottom: '48px', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
          borderRadius: '6px', padding: '8px 20px', zIndex: 4000,
          fontSize: '12px', color: 'var(--text-primary)', boxShadow: '0 4px 12px var(--shadow-dropdown)'
        }}>
          {exportStatus}
        </div>
      )}

      {/* === INFO PANEL === */}
      {infoOpen && (
        <InfoPanel
          onClose={() => setInfoOpen(false)}
          onOpenSettings={() => { setInfoOpen(false); setSettingsOpen('aspetto'); }}
        />
      )}

      {/* === ADVENTURES PANEL === */}
      {adventuresOpen && (
        <AdventuresPanel
          onClose={() => setAdventuresOpen(false)}
          onProjectOpen={(path, name) => { setAdventuresOpen(false); /* already in project */ }}
          projectPath={projectPath}
          projectSettings={projectSettings}
          firebaseUser={firebaseUser}
          onFirebaseUserChange={onFirebaseUserChange}
        />
      )}

      {relationsOpen && (
        <RelationsPanel
          onClose={() => setRelationsOpen(false)}
          projectPath={projectPath}
          projectSettings={projectSettings}
          onUpdateSettings={setProjectSettings}
          relationsBase={relationsBase}
          relationsSession={relationsSession}
          onSetRelationsBase={setRelationsBase}
          onSetRelationsSession={setRelationsSession}
        />
      )}

      {/* === IMAGE OVERLAY === */}
      {overlayImage && (
        <div
          onClick={() => setOverlayImage(null)}
          style={{
            position: 'fixed', inset: 0, background: 'var(--overlay-dark)',
            zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
          }}
        >
          <img src={overlayImage} style={{ maxWidth: '95%', maxHeight: '95%', objectFit: 'contain' }} />
        </div>
      )}

      {/* === VIDEO OVERLAY === */}
      {overlayVideo && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setOverlayVideo(null); }}
          style={{
            position: 'fixed', inset: 0, background: 'var(--overlay-dark)',
            zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
          }}
        >
          <video
            src={overlayVideo} controls autoPlay
            style={{ maxWidth: '90%', maxHeight: '90%' }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* === TEXT CONTEXT MENU === */}
      {textContextMenu && (
        <div style={{
          position: 'fixed', left: textContextMenu.x, top: textContextMenu.y,
          background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '6px',
          padding: '4px 0', zIndex: 1200, minWidth: '220px',
          boxShadow: 'var(--shadow-dropdown)'
        }}>
          <div
            style={{ padding: '6px 16px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--border-default)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            onClick={() => {
              handleSaveAsNote(textContextMenu.text, textContextMenu.source, textContextMenu.sourcePath, textContextMenu.sourceScrollTop);
            }}
          >
            📝 Salva come nota
          </div>
          <div
            style={{ padding: '6px 16px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--border-default)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            onClick={() => {
              handleSaveAsChecklist(textContextMenu.text, textContextMenu.source, textContextMenu.sourcePath, textContextMenu.sourceScrollTop);
            }}
          >
            ☐ Aggiungi a Checklist
          </div>
          <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '2px 0' }} />
          {['A', 'B', 'C'].map(slot => (
            <div
              key={slot}
              style={{ padding: '6px 16px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--border-default)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              onClick={() => {
                handleAddSnippetToSlot(slot, textContextMenu.text, textContextMenu.source, textContextMenu.sourcePath, textContextMenu.sourceScrollTop);
              }}
            >
              📌 Aggiungi a Slot {slot}
            </div>
          ))}
          <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '2px 0' }} />
          <div
            style={{ padding: '6px 16px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--border-default)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            onClick={() => {
              const word = textContextMenu.text.trim();
              if (word) {
                setHighlightKeywords(prev => {
                  if (prev.words.some(w => w.text.toLowerCase() === word.toLowerCase())) return prev;
                  return { ...prev, words: [...prev.words, { text: word, color: prev.defaultColor }] };
                });
              }
              setTextContextMenu(null);
            }}
          >
            🔆 Evidenzia parola
          </div>
          <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '2px 0' }} />
          <div
            style={{ padding: '6px 16px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--border-default)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            onClick={() => {
              externalSearchCounter.current++;
              setExternalSearchQuery({ text: textContextMenu.text.substring(0, 100), _c: externalSearchCounter.current });
              setTextContextMenu(null);
            }}
          >
            🔍 Cerca nei documenti
          </div>
          <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '2px 0' }} />
          <div
            style={{ padding: '6px 16px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--border-default)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            onClick={() => {
              setTelegramTextData(textContextMenu.text);
              setTextContextMenu(null);
            }}
          >
            ✉️ Invia selezione via Telegram
          </div>
        </div>
      )}

      {/* === TELEGRAM MODALS === */}
      {telegramFileData && (
        <TelegramFileModal
          fileName={telegramFileData.name}
          fileExtension={telegramFileData.extension}
          filePath={telegramFileData.path}
          players={players}
          botRunning={botStatus.running}
          gameDate={calendarData.currentDate}
          onLog={handleTelegramLog}
          onClose={() => setTelegramFileData(null)}
        />
      )}
      {telegramTextData && (
        <TelegramTextModal
          selectedText={telegramTextData}
          players={players}
          botRunning={botStatus.running}
          gameDate={calendarData.currentDate}
          onLog={handleTelegramLog}
          onClose={() => setTelegramTextData(null)}
        />
      )}
      {referenceOpen && (
        <QuickReference
          manuals={referenceManuals}
          projectPath={projectPath}
          scrollPositions={referenceScrollPositions}
          onScrollPositionsChange={setReferenceScrollPositions}
          selectedManualId={referenceSelectedId}
          onSelectedChange={setReferenceSelectedId}
          onClose={() => setReferenceOpen(false)}
          highlightKeywords={highlightKeywords}
        />
      )}
      {chatOpen && (
        <TelegramChat
          players={players}
          chatMessages={chatMessages}
          onSendReply={handleChatSendReply}
          onMarkRead={handleChatMarkRead}
          onSelectedChange={handleChatSelectedChange}
          onClearChat={(chatId) => setChatMessages(prev => {
            const next = { ...prev };
            delete next[chatId];
            return next;
          })}
          onClose={() => setChatOpen(false)}
          aiEnabled={aiConfig.telegramAiEnabled && (!!aiConfig.apiKey || !!aiConfig.provider)}
          onAiReply={async (msg, chatId) => {
            // Raccogliere documenti autorizzati per il player di questa chat
            const player = players.find(p => p.telegramChatId === chatId);
            const commonDocs = (aiConfig.commonDocs || []).filter(d => d.active).map(d => d.file);
            const playerDocs = (player?.aiDocuments || []).filter(d => d.active).map(d => d.file);
            const allowedFiles = [...commonDocs, ...playerDocs];
            const aiMessages = [{ role: 'user', content: msg.text }];
            const result = await window.electronAPI.aiChat(aiMessages, projectPath, { allowedFiles });
            if (result.response) {
              await window.electronAPI.telegramSendReply(chatId, result.response);
              setChatMessages(prev => ({
                ...prev,
                [chatId]: [...(prev[chatId] || []), {
                  id: crypto.randomUUID(),
                  from: 'gm',
                  text: `🤖 ${result.response}`,
                  timestamp: new Date().toISOString(),
                  read: true,
                  isAi: true
                }]
              }));
            }
          }}
        />
      )}
    </div>
  );
}

function BroadcastBanner() {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!window.electronAPI?.fetchBroadcast) return;
    let cancelled = false;
    const tryFetch = (delay) => {
      setTimeout(() => {
        if (cancelled) return;
        window.electronAPI.fetchBroadcast().then(d => {
          if (cancelled) return;
          if (d && !d.dismissed) setData(d);
          else if (!d && delay < 5000) tryFetch(delay + 2000);
        });
      }, delay);
    };
    tryFetch(1000);
    return () => { cancelled = true; };
  }, []);

  if (!data) return null;

  const accentColors = {
    info: 'var(--color-info)',
    warning: 'var(--color-warning)',
    error: 'var(--color-danger)'
  };
  const accentColor = accentColors[data.type] || accentColors.info;

  const handleDismiss = () => {
    if (!data.persistent) {
      window.electronAPI.dismissBroadcast(data.id);
    }
    setData(null);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9998,
      background: 'var(--bg-panel)', color: 'var(--text-primary)',
      borderBottom: `3px solid ${accentColor}`,
      padding: '12px 16px', display: 'flex', alignItems: 'center',
      gap: '12px', fontSize: '14px', fontWeight: 500,
      animation: 'slideDown 0.4s ease-out',
      boxShadow: '0 2px 12px rgba(0,0,0,0.5)'
    }}>
      <div style={{ flex: 1 }}>
        {data.title && <strong style={{ marginRight: '8px', color: accentColor }}>{data.title}</strong>}
        <span>{data.message}</span>
        {data.linkUrl && (
          <button
            onClick={() => window.electronAPI.openExternal(data.linkUrl)}
            style={{
              marginLeft: '10px', background: 'var(--bg-elevated)',
              border: `1px solid ${accentColor}`, borderRadius: '4px',
              padding: '3px 12px', color: accentColor, fontSize: '12px',
              cursor: 'pointer', fontWeight: 'bold'
            }}
          >
            {data.linkLabel || data.linkUrl}
          </button>
        )}
      </div>
      <button
        onClick={handleDismiss}
        className="close-btn"
        style={{
          background: 'none', border: 'none', color: 'var(--text-secondary)',
          fontSize: '18px', cursor: 'pointer', padding: '0 4px',
          opacity: 0.8, lineHeight: 1
        }}
      >✕</button>
    </div>
  );
}

function UpdateToast() {
  const [updateReady, setUpdateReady] = useState(null);
  const [downloading, setDownloading] = useState(null); // { version, percent }
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!window.electronAPI) return;
    const unsub1 = window.electronAPI.onUpdateAvailable?.((data) => {
      setDownloading({ version: data.version, percent: 0 });
    });
    const unsub2 = window.electronAPI.onUpdateProgress?.((data) => {
      setDownloading(prev => prev ? { ...prev, percent: data.percent } : null);
    });
    const unsub3 = window.electronAPI.onUpdateDownloaded?.((data) => {
      setDownloading(null);
      setUpdateReady(data.version);
      setDismissed(false);
    });
    return () => { unsub1?.(); unsub2?.(); unsub3?.(); };
  }, []);

  // Show download progress bar
  if (downloading && !updateReady) {
    return (
      <div style={{
        position: 'fixed', bottom: '0', left: '0', right: '0',
        height: '44px', background: 'var(--bg-panel)',
        borderTop: '2px solid var(--accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '12px', zIndex: 9999, fontSize: '13px', fontWeight: 'bold',
        color: 'var(--text-primary)', animation: 'slideUp 0.4s ease-out'
      }}>
        <span style={{ color: 'var(--accent)' }}>
          Scaricando v{downloading.version}… {downloading.percent}%
        </span>
        <div style={{
          width: '200px', height: '6px', borderRadius: '3px',
          background: 'var(--border-subtle)', overflow: 'hidden'
        }}>
          <div style={{
            height: '100%', borderRadius: '3px', background: 'var(--accent)',
            width: `${downloading.percent}%`, transition: 'width 0.3s ease'
          }} />
        </div>
      </div>
    );
  }

  if (!updateReady || dismissed) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '0',
      left: '0',
      right: '0',
      height: '44px',
      background: 'var(--accent)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      zIndex: 9999,
      fontSize: '13px',
      color: 'var(--bg-main)',
      animation: 'slideUp 0.4s ease-out'
    }}>
      <span style={{ fontWeight: 'bold' }}>
        Aggiornamento v{updateReady} pronto.
      </span>
      <button
        onClick={() => window.electronAPI.installUpdate()}
        style={{
          background: 'var(--bg-main)',
          border: '1px solid transparent',
          borderRadius: '4px',
          padding: '4px 12px',
          color: 'var(--accent)',
          fontSize: '12px',
          fontWeight: 'bold',
          cursor: 'pointer',
          transition: 'all 0.15s'
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
      >
        Riavvia e aggiorna
      </button>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'none',
          border: '1px solid rgba(255,255,255,0.4)',
          borderRadius: '4px',
          padding: '4px 12px',
          color: 'inherit',
          fontSize: '12px',
          cursor: 'pointer',
          transition: 'all 0.15s'
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.7)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; }}
      >
        Dopo
      </button>
    </div>
  );
}

function GlobalStyles() {
  return (
    <style>{`
      @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      @keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: var(--scrollbar-track); }
      ::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-hover); }
      .viewer-content h1, .viewer-content h2, .viewer-content h3,
      .viewer-content h4, .viewer-content h5, .viewer-content h6 {
        color: var(--accent); margin: 1.2em 0 0.5em; font-family: 'Georgia', serif;
      }
      .viewer-content h1 { font-size: 1.8em; border-bottom: 1px solid var(--border-default); padding-bottom: 0.3em; }
      .viewer-content h2 { font-size: 1.5em; }
      .viewer-content h3 { font-size: 1.25em; }
      .viewer-content p { margin: 0.6em 0; }
      .viewer-content strong { color: var(--text-code); }
      .viewer-content em { color: var(--accent-dim); }
      .viewer-content a { color: var(--accent); text-decoration: underline; }
      .viewer-content code {
        background: var(--bg-elevated); padding: 2px 6px; border-radius: 3px;
        font-family: 'Courier New', monospace; font-size: 0.9em; color: var(--text-code);
      }
      .viewer-content pre {
        background: var(--bg-input); padding: 12px 16px; border-radius: 6px;
        border: 1px solid var(--border-subtle); overflow-x: auto;
      }
      .viewer-content pre code { background: none; padding: 0; }
      .viewer-content ul, .viewer-content ol { padding-left: 1.5em; margin: 0.5em 0; }
      .viewer-content li { margin: 0.2em 0; }
      .viewer-content hr { border: none; border-top: 1px solid var(--border-default); margin: 1.5em 0; }
      .viewer-content blockquote {
        border-left: 3px solid var(--accent); padding-left: 16px;
        margin: 1em 0; color: var(--accent-dim); font-style: italic;
      }
      .viewer-content table { border-collapse: collapse; width: 100%; margin: 1em 0; }
      .viewer-content th, .viewer-content td { border: 1px solid var(--border-default); padding: 6px 10px; text-align: left; }
      .viewer-content th { background: var(--bg-elevated); color: var(--accent); }
      .viewer-content img { max-width: 100%; border-radius: 4px; }
      .ai-response-md p { margin: 0.3em 0; }
      .ai-response-md strong { color: var(--accent); }
      .ai-response-md em { color: var(--accent-dim); }
      .ai-response-md ul, .ai-response-md ol { padding-left: 1.3em; margin: 0.3em 0; }
      .ai-response-md li { margin: 0.15em 0; }
      .ai-response-md code {
        background: var(--bg-elevated); padding: 1px 4px; border-radius: 2px;
        font-family: 'Courier New', monospace; font-size: 0.9em; color: var(--text-code);
      }
      .ai-response-md pre {
        background: var(--bg-input); padding: 6px 10px; border-radius: 4px;
        border: 1px solid var(--border-subtle); overflow-x: auto; margin: 0.4em 0;
      }
      .ai-response-md pre code { background: none; padding: 0; }
      .ai-response-md h1, .ai-response-md h2, .ai-response-md h3 {
        color: var(--accent); margin: 0.5em 0 0.2em; font-size: 1.1em;
      }
      .ai-response-md blockquote {
        border-left: 2px solid var(--accent); padding-left: 8px;
        margin: 0.3em 0; color: var(--accent-dim); font-style: italic;
      }
      .ai-response-md hr { border: none; border-top: 1px solid var(--border-subtle); margin: 0.5em 0; }
      @keyframes bellPulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.3); opacity: 0.7; }
      }
      .bell-pulse {
        animation: bellPulse 1s ease-in-out 3;
      }
      @keyframes chatFlash {
        0% { box-shadow: 0 0 0 0 var(--accent-a55); }
        50% { box-shadow: 0 0 8px 3px var(--accent-a35); }
        100% { box-shadow: 0 0 0 0 var(--accent-a04); }
      }
      @keyframes timerExpired {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.2; }
      }
      .timer-expired {
        animation: timerExpired 0.5s ease-in-out 10;
        color: var(--color-danger-bright) !important;
      }
      .panel-search-bar {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 3px 8px;
        background: var(--bg-elevated);
        border-bottom: 1px solid var(--border-subtle);
      }
      .panel-search-bar input {
        flex: 1;
        min-width: 80px;
        padding: 2px 6px;
        font-size: 12px;
        background: var(--bg-input);
        border: 1px solid var(--border-default);
        border-radius: 3px;
        color: var(--text-primary);
        outline: none;
      }
      .panel-search-bar input:focus {
        border-color: var(--accent);
      }
      .panel-search-results {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        max-height: 200px;
        overflow-y: auto;
        background: var(--bg-elevated);
        border: 1px solid var(--border-default);
        border-top: none;
        box-shadow: var(--shadow-dropdown);
        z-index: 100;
      }
      .panel-search-results .result-item {
        padding: 4px 8px;
        cursor: pointer;
        border-bottom: 1px solid var(--border-subtle);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .panel-search-results .result-item:hover,
      .panel-search-results .result-item.active {
        background: var(--bg-hover-subtle);
      }
      mark[data-panel-search] {
        background: var(--accent-a30);
        color: inherit;
        padding: 0 1px;
        border-radius: 2px;
      }
      mark[data-panel-search].current {
        background: var(--accent-a55);
      }
      .close-btn {
        cursor: pointer;
        color: var(--text-tertiary);
        font-size: 13px;
        padding: 2px 4px;
        border-radius: 3px;
        transition: all 0.15s;
        user-select: none;
        line-height: 1;
      }
      .close-btn:hover {
        color: var(--color-danger);
        background: color-mix(in srgb, var(--color-danger) 10%, transparent);
      }
    `}</style>
  );
}
