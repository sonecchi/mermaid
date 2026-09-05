const BACKUP_FORMAT = 'mermaid-local-editor';
const BACKUP_VERSION = 1;
const UNSAFE_DIAGRAM_NAMES = new Set(['__proto__', 'constructor', 'prototype']);

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateBackup(backup) {
  if (!isRecord(backup)) {
    throw new Error('Backup must be a JSON object.');
  }
  if (backup.format !== BACKUP_FORMAT || backup.version !== BACKUP_VERSION) {
    throw new Error('Unsupported Mermaid Local Editor backup format or version.');
  }
  if (!isRecord(backup.diagrams) || Object.keys(backup.diagrams).length === 0) {
    throw new Error('Backup must contain at least one diagram.');
  }
  if (typeof backup.current !== 'string' || !Object.hasOwn(backup.diagrams, backup.current)) {
    throw new Error('Backup current diagram is missing or invalid.');
  }

  const restoredDiagrams = {};
  for (const [name, diagram] of Object.entries(backup.diagrams)) {
    if (UNSAFE_DIAGRAM_NAMES.has(name)) {
      throw new Error(`Backup contains an unsafe diagram name: ${name}`);
    }
    if (!isRecord(diagram) || typeof diagram.src !== 'string' || !isRecord(diagram.view)) {
      throw new Error(`Backup diagram is invalid: ${name}`);
    }

    const { scale, panX, panY } = diagram.view;
    if (
      typeof scale !== 'number' ||
      !Number.isFinite(scale) ||
      scale <= 0 ||
      typeof panX !== 'number' ||
      !Number.isFinite(panX) ||
      typeof panY !== 'number' ||
      !Number.isFinite(panY)
    ) {
      throw new Error(`Backup diagram view is invalid: ${name}`);
    }

    restoredDiagrams[name] = {
      src: diagram.src,
      view: { scale, panX, panY },
    };
  }

  return {
    current: backup.current,
    diagrams: restoredDiagrams,
    diagramCount: Object.keys(restoredDiagrams).length,
  };
}

export function createStorage() {
  let diagrams = JSON.parse(localStorage.getItem('mermaid-diagrams') || '{}');
  let current = localStorage.getItem('mermaid-current') || 'main';

  if (!diagrams[current]) {
    diagrams[current] = {
      src: `flowchart LR\n  UI --> RuntimeBus --> Orchestrator --> Agents`,
      view: { scale: 1, panX: 0, panY: 0 },
    };
  }

  function save() {
    localStorage.setItem('mermaid-diagrams', JSON.stringify(diagrams));
    localStorage.setItem('mermaid-current', current);
  }

  return {
    get diagrams() {
      return diagrams;
    },
    get current() {
      return current;
    },

    setCurrent(name) {
      current = name;
      save();
    },

    updateCurrent(data) {
      diagrams[current] = { ...diagrams[current], ...data };
      save();
    },

    deleteCurrent() {
      delete diagrams[current];
      current = Object.keys(diagrams)[0] || 'main';
      save();
    },

    create(name) {
      diagrams[name] = {
        src: 'flowchart LR\n  A --> B',
        view: { scale: 1, panX: 0, panY: 0 },
      };
      current = name;
      save();
    },

    createBackup() {
      return {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        current,
        diagrams,
      };
    },

    validateBackup(backup) {
      const restored = validateBackup(backup);
      return {
        current: restored.current,
        diagramCount: restored.diagramCount,
      };
    },

    restoreBackup(backup) {
      const restored = validateBackup(backup);
      diagrams = restored.diagrams;
      current = restored.current;
      save();
      return current;
    },
  };
}
