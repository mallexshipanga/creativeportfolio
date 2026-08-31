// Set CDN worker for PDF.js
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const defaultPortfolioData = {
  "slideshow": [
    "creativeprojects/01.pdf",
    "creativeprojects/02.pdf",
    "creativeprojects/03.pdf"
  ],
  "projects": [
    {
      "file": "creativeprojects/Campus Couture.pdf",
      "title": "Campus Couture: Thematic Photoessay",
      "description": "This is a thematic photoessay I created in May 2025. The photoessay features three diverse university students' fashion, exploring how each student uses clothing to express themselves."
    },
    {
      "file": "creativeprojects/Sunflowers.pdf",
      "title": "Sunflowers: Editorial Photoshoot",
      "description": "This is an editorial photoshoot I captured and edited in August 2026. The photoshoot prominently features sunflowers to encapsulate both creativity and youth. Each photo was used to promote an upcoming creative project on social media."
    }
  ]
};

const state = {
  data: defaultPortfolioData,
  pdfDocs: {},
  currentPages: {},
  numPages: {},
  modal: {
    pdfDoc: null,
    currentPage: 1,
    numPages: 1,
    title: ''
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  initProjects();
  initModalListeners();
});

async function loadData() {
  try {
    const response = await fetch('data.json');
    if (response.ok) {
      state.data = await response.json();
    }
  } catch (e) {
    console.info('Using default portfolio data.');
  }
}

async function initProjects() {
  const projectListContainer = document.getElementById('projectList');
  const projects = state.data.projects || [];

  if (!projectListContainer) return;
  projectListContainer.innerHTML = '';

  for (let idx = 0; idx < projects.length; idx++) {
    const proj = projects[idx];
    state.currentPages[idx] = 1;

    const card = document.createElement('article');
    card.className = 'project-card black-card';

    card.innerHTML = `
      <div class="project-preview-wrapper" id="preview-wrapper-${idx}" style="position: relative; cursor: pointer; background: #111; border-radius: 8px; overflow: hidden;">
        <canvas id="project-canvas-${idx}" class="project-canvas" style="width: 100%; height: auto; display: block; border-radius: 8px;"></canvas>
        <div class="preview-overlay">
          <span>Click to View Full Project</span>
        </div>
      </div>
      <div class="project-info">
        <h3>${escapeHtml(proj.title)}</h3>
        <p>${escapeHtml(proj.description)}</p>
        <div class="project-actions">
          <button class="btn-secondary prev-btn" data-index="${idx}">
            &lsaquo;
          </button>
          <span class="page-indicator" id="page-indicator-${idx}">Loading PDF...</span>
          <button class="btn-secondary next-btn" data-index="${idx}">
            &rsaquo;
          </button>
        </div>
      </div>
    `;

    projectListContainer.appendChild(card);

    const previewWrapper = document.getElementById(`preview-wrapper-${idx}`);
    previewWrapper.addEventListener('click', () => {
      if (state.pdfDocs[idx]) {
        openModal(proj, idx, state.currentPages[idx]);
      }
    });

    const prevBtn = card.querySelector('.prev-btn');
    const nextBtn = card.querySelector('.next-btn');

    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      changePage(idx, -1);
    });

    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      changePage(idx, 1);
    });

    loadProjectPdf(idx, proj.file);
  }
}

async function loadProjectPdf(idx, pdfUrl) {
  const indicatorEl = document.getElementById(`page-indicator-${idx}`);
  try {
    const safeUrl = encodeURI(pdfUrl);
    const loadingTask = pdfjsLib.getDocument(safeUrl);
    const pdfDoc = await loadingTask.promise;

    state.pdfDocs[idx] = pdfDoc;
    state.numPages[idx] = pdfDoc.numPages;

    renderProjectCanvas(idx, 1);
  } catch (err) {
    console.error(`Error loading PDF for project ${idx}:`, err);
    if (indicatorEl) indicatorEl.textContent = 'Failed to load PDF';
  }
}

async function renderProjectCanvas(idx, pageNum) {
  const pdfDoc = state.pdfDocs[idx];
  if (!pdfDoc) return;

  const canvas = document.getElementById(`project-canvas-${idx}`);
  const indicatorEl = document.getElementById(`page-indicator-${idx}`);

  if (!canvas) return;

  try {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });
    const context = canvas.getContext('2d');

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };

    await page.render(renderContext).promise;

    if (indicatorEl) {
      indicatorEl.textContent = `Page ${pageNum} of ${pdfDoc.numPages}`;
    }
  } catch (err) {
    console.error(`Error rendering page ${pageNum}:`, err);
  }
}

function changePage(idx, direction) {
  const totalPages = state.numPages[idx] || 1;
  let currentPage = state.currentPages[idx] || 1;

  currentPage += direction;
  if (currentPage < 1) currentPage = totalPages;
  if (currentPage > totalPages) currentPage = 1;

  state.currentPages[idx] = currentPage;
  renderProjectCanvas(idx, currentPage);
}

function initModalListeners() {
  const modal = document.getElementById('pdfModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const overlay = document.getElementById('modalOverlay');
  const prevBtn = document.getElementById('modalPrevPage');
  const nextBtn = document.getElementById('modalNextPage');

  if (!modal) return;

  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (overlay) overlay.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (modal.getAttribute('aria-hidden') === 'false') {
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowLeft') changeModalPage(-1);
      if (e.key === 'ArrowRight') changeModalPage(1);
    }
  });

  if (prevBtn) prevBtn.addEventListener('click', () => changeModalPage(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => changeModalPage(1));
}

function openModal(project, idx, initialPage = 1) {
  const modal = document.getElementById('pdfModal');
  const modalTitle = document.getElementById('modalTitle');

  state.modal.pdfDoc = state.pdfDocs[idx];
  state.modal.currentPage = initialPage;
  state.modal.numPages = state.numPages[idx];
  state.modal.title = project.title;

  if (modalTitle) modalTitle.textContent = project.title;
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  renderModalCanvas();
}

async function renderModalCanvas() {
  const pdfDoc = state.modal.pdfDoc;
  const pageNum = state.modal.currentPage;
  if (!pdfDoc) return;

  const pageNumDisplay = document.getElementById('modalPageNum');
  const modalBody = document.querySelector('.modal-body');

  if (!modalBody) return;
  modalBody.innerHTML = '<canvas id="modalPdfCanvas" style="max-width:100%; max-height:75vh; display:block; margin:0 auto; border-radius:8px;"></canvas>';
  
  const canvas = document.getElementById('modalPdfCanvas');

  try {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });
    const context = canvas.getContext('2d');

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };

    await page.render(renderContext).promise;

    if (pageNumDisplay) {
      pageNumDisplay.textContent = `Page ${pageNum} of ${state.modal.numPages}`;
    }
  } catch (err) {
    console.error('Error rendering modal page:', err);
  }
}

function changeModalPage(direction) {
  const totalPages = state.modal.numPages || 1;
  let currentPage = state.modal.currentPage + direction;

  if (currentPage < 1) currentPage = totalPages;
  if (currentPage > totalPages) currentPage = 1;

  state.modal.currentPage = currentPage;
  renderModalCanvas();
}

function closeModal() {
  const modal = document.getElementById('pdfModal');
  if (!modal) return;
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  state.modal.pdfDoc = null;
  state.modal.currentPage = 1;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
