export function createNavigation({ state, srcPanel, applyTransform }) {
  const fitPadding = 24;
  let navNodes = [];
  let navIndex = 0;

  function fitDiagram() {
    const iframe = state.iframeRef;
    const svg = iframe?.contentDocument?.querySelector('svg');
    if (!iframe || !svg) {
      return;
    }

    svg.style.transform = 'none';
    const svgRect = svg.getBoundingClientRect();
    if (!svgRect.width || !svgRect.height || !iframe.clientWidth || !iframe.clientHeight) {
      return;
    }

    const availableWidth = Math.max(iframe.clientWidth - fitPadding * 2, 1);
    const availableHeight = Math.max(iframe.clientHeight - fitPadding * 2, 1);
    const scale = Math.min(availableWidth / svgRect.width, availableHeight / svgRect.height, 1);

    state.scale = scale;
    state.panX = (iframe.clientWidth - svgRect.width * scale) / 2 - svgRect.left;
    state.panY = (iframe.clientHeight - svgRect.height * scale) / 2 - svgRect.top;
    applyTransform();
  }

  function rebuildNavNodes() {
    navNodes = [];
    navIndex = 0;

    const svg = state.iframeRef?.contentDocument?.querySelector('svg');
    if (!svg) {
      return;
    }

    navNodes = [...svg.querySelectorAll('g.node')];
    navIndex = 0;

    if (navNodes.length) {
      highlightCurrentNode();
    }
  }

  function highlightCurrentNode() {
    const svg = state.iframeRef?.contentDocument?.querySelector('svg');
    if (!svg) {
      return;
    }

    svg
      .querySelectorAll('g.node.selected-node')
      .forEach((n) => n.classList.remove('selected-node'));

    const node = navNodes[navIndex];
    if (node) {
      node.classList.add('selected-node');
    }
  }

  function centerCurrentNode() {
    const iframe = state.iframeRef;
    const node = navNodes[navIndex];
    if (!iframe || !node) {
      return;
    }

    const nodeRect = node.getBoundingClientRect();
    const nodeCenterY = nodeRect.top + nodeRect.height / 2;
    const viewportCenterY = iframe.clientHeight / 2;
    const deltaY = viewportCenterY - nodeCenterY;

    const nodeCenterX = nodeRect.left + nodeRect.width / 2;
    const viewportCenterX = iframe.clientWidth / 2;
    const deltaX = viewportCenterX - nodeCenterX;

    state.panX += deltaX;
    state.panY += deltaY;

    applyTransform();
  }

  function setupKeyboardNav() {
    window.addEventListener('keydown', (e) => {
      if (document.activeElement === srcPanel) {
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!navNodes.length) {
          rebuildNavNodes();
        }
        navIndex = Math.min(navIndex + 1, navNodes.length - 1);
        highlightCurrentNode();
        centerCurrentNode();
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!navNodes.length) {
          rebuildNavNodes();
        }
        navIndex = Math.max(navIndex - 1, 0);
        highlightCurrentNode();
        centerCurrentNode();
      }
    });
  }

  return {
    fitDiagram,
    rebuildNavNodes,
    setupKeyboardNav,
  };
}
