export function refreshList({ diagramsSelect, nameInput, storage }) {
  diagramsSelect.innerHTML = '';
  Object.keys(storage.diagrams).forEach((k) => {
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = k;
    diagramsSelect.appendChild(opt);
  });
  diagramsSelect.value = storage.current;
  nameInput.value = storage.current;
}

function downloadJson(filename, data) {
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function createBackupFilename() {
  return `mermaid-local-editor-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

export function setupUI({
  src,
  diagramsSelect,
  nameInput,
  storage,
  state,
  render,
  load,
  fitDiagram,
}) {
  document.getElementById('save').onclick = () => {
    const name = nameInput.value.trim();
    if (!name) {
      return;
    }

    storage.setCurrent(name);
    storage.updateCurrent({
      src: src.value,
      view: { scale: state.scale, panX: state.panX, panY: state.panY },
    });
    refreshList({ diagramsSelect, nameInput, storage });
  };

  document.getElementById('new').onclick = () => {
    const name = prompt('Enter diagram name');
    if (!name) {
      return;
    }

    storage.create(name);
    load(name);
  };

  document.getElementById('del').onclick = () => {
    if (!confirm(`Delete diagram "${storage.current}"?`)) {
      return;
    }

    storage.deleteCurrent();
    load(storage.current);
  };

  document.getElementById('resetView').onclick = () => {
    fitDiagram();
  };

  document.getElementById('exportSvg').onclick = () => {
    if (!state.iframeRef) {
      return;
    }

    const svg = state.iframeRef.contentDocument?.querySelector('svg');
    if (!svg) {
      return;
    }

    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${storage.current}.svg`;
    a.click();

    URL.revokeObjectURL(url);
  };

  document.getElementById('backupJson').onclick = () => {
    storage.updateCurrent({
      src: src.value,
      view: { scale: state.scale, panX: state.panX, panY: state.panY },
    });
    downloadJson(createBackupFilename(), storage.createBackup());
  };

  const restoreJsonInput = document.getElementById('restoreJsonInput');
  document.getElementById('restoreJson').onclick = () => {
    restoreJsonInput.value = '';
    restoreJsonInput.click();
  };

  restoreJsonInput.onchange = async () => {
    const [file] = restoreJsonInput.files;
    if (!file) {
      return;
    }

    try {
      const backup = JSON.parse(await file.text());
      const summary = storage.validateBackup(backup);
      const shouldRestore = confirm(
        `Restore ${summary.diagramCount} diagram(s) and replace all current diagrams?`
      );
      if (!shouldRestore) {
        return;
      }

      load(storage.restoreBackup(backup));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(`Could not restore Mermaid backup: ${message}`);
    } finally {
      restoreJsonInput.value = '';
    }
  };

  diagramsSelect.onchange = () => load(diagramsSelect.value);

  let renderTimer;
  let saveTimer;
  src.addEventListener('input', () => {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => render(), 200);

    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (storage.diagrams[storage.current]) {
        storage.updateCurrent({ src: src.value });
      }
    }, 300);
  });

  const toolbar = document.getElementById('srcPanel');
  const toggleToolbarBtn = document.getElementById('toggleToolbar');

  let toolbarCollapsed = localStorage.getItem('toolbar-collapsed') === '1';

  function applyToolbarState() {
    toolbar.classList.toggle('collapsed', toolbarCollapsed);
    toggleToolbarBtn.textContent = toolbarCollapsed ? '☰' : '✕';
    toggleToolbarBtn.title = toolbarCollapsed ? 'Show toolbar' : 'Hide toolbar';
  }

  toggleToolbarBtn.onclick = () => {
    toolbarCollapsed = !toolbarCollapsed;
    localStorage.setItem('toolbar-collapsed', toolbarCollapsed ? '1' : '0');
    applyToolbarState();
  };

  applyToolbarState();
  refreshList({ diagramsSelect, nameInput, storage });
}
