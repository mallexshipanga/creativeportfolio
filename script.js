if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const defaultPortfolioData = {
  slideshow: [
    'creativeprojects/01.pdf',
    'creativeprojects/02.pdf',
    'creativeprojects/03.pdf'
  ],
  projects: [
    {
      file: 'creativeprojects/Campus Couture.pdf',
      title: 'Campus Couture: Thematic Photoessay',
      description:
        "This is a thematic photoessay I created in May 2025. The photoessay features three diverse university students' fashion, exploring how each student uses clothing to express themselves."
    },
    {
      file: 'creativeprojects/Flower Boy.pdf',
      title: 'Flower Boy: Editorial Photoshoot',
      description:
        'This is an editorial photoshoot I captured and edited in August 2026. The photoshoot prominently features sunflowers to encapsulate both creativity and youth. Each photo was used to promote an upcoming creative project on social media.'
    }
  ]
};

const state = {
  data: defaultPortfolioData,
  pdfDocs: {},
  currentPages: {},
  numPages: {},
  renderTasks: {}, // Track active render tasks to cancel overlaps
  modal: {
    pdfDoc: null,
    title: '',
    renderTask: null
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

  projects.forEach((proj, idx) => {
    state.currentPages[idx] = 1;

    const card = document.createElement('article');
    card.className = 'project-card black-card';

    card.innerHTML = `
      <div class="project-preview-wrapper" id="preview-wrapper-${idx}" style="cursor: pointer;">
        <canvas id="project-canvas-${idx}" class="project-canvas"></canvas>
        <div class="preview-overlay">
          <span>Click to View Full Project</span>
        </div>
      </div>
      <div class="project-info">
        <h3 class="project-title"></h3>
        <p class="project-desc"></p>
        <div class="project-actions">
          <button class="btn-secondary prev-btn" data-index="${idx}" aria-label="Previous Page">&lsaquo;</button>
          <span class="page-indicator" id="page-indicator-${idx}">Loading PDF...</span>
          <button class="btn-secondary next-btn" data-index="${idx}" aria-label="Next Page">&rsaquo;</button>
        </div>
      </div>
    `;

    // Safely set text content without relying solely on string concatenation
    card.querySelector('.project-title').textContent = proj.title;
    card.querySelector('.project-desc').textContent = proj.description;

    projectListContainer.appendChild(card);

    const previewWrapper = document.getElementById(`preview-wrapper-${idx}`);
    previewWrapper.addEventListener('click', () => {
      if (state.pdfDocs[idx]) {
        openModal(proj, idx);
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
  });
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

  // Cancel ongoing render task for this canvas if fast switching occurs
  if (state.renderTasks[idx]) {
    state.renderTasks[idx].cancel();
  }

  try {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });
    const context = canvas.getContext('2d');

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderTask = page.render({
      canvasContext: context,
      viewport: viewport
    });

    state.renderTasks[idx] = renderTask;
    await renderTask.promise;

    if (indicatorEl) {
      indicatorEl.textContent = `Page ${pageNum} of ${pdfDoc.numPages}`;
    }

    const prevBtn = document.querySelector(`.prev-btn[data-index="${idx}"]`);
    const nextBtn = document.querySelector(`.next-btn[data-index="${idx}"]`);

    if (prevBtn) prevBtn.disabled = pageNum === 1;
    if (nextBtn) nextBtn.disabled = pageNum === pdfDoc.numPages;
  } catch (err) {
    if (err?.name !== 'RenderingCancelledException') {
      console.error(`Error rendering page ${pageNum}:`, err);
    }
  }
}

function changePage(idx, direction) {
  const totalPages = state.numPages[idx] || 1;
  let currentPage = state.currentPages[idx] || 1;

  currentPage += direction;
  if (currentPage < 1) currentPage = 1;
  if (currentPage > totalPages) currentPage = totalPages;

  state.currentPages[idx] = currentPage;
  renderProjectCanvas(idx, currentPage);
}

function initModalListeners() {
  const modal = document.getElementById('pdfModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const overlay = document.getElementById('modalOverlay');

  if (!modal) return;

  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (overlay) overlay.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (modal.getAttribute('aria-hidden') === 'false' && e.key === 'Escape') {
      closeModal();
    }
  });
}

function openModal(project, idx) {
  const modal = document.getElementById('pdfModal');
  const modalTitle = document.getElementById('modalTitle');

  state.modal.pdfDoc = state.pdfDocs[idx];

  if (modalTitle) modalTitle.textContent = project.title;
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  renderModalCanvas(1);
}

async function renderModalCanvas(pageNum = 1) {
  const pdfDoc = state.modal.pdfDoc;
  if (!pdfDoc) return;

  const modalBody = document.querySelector('.modal-body');
  if (!modalBody) return;

  if (state.modal.renderTask) {
    state.modal.renderTask.cancel();
  }

  modalBody.innerHTML = '<canvas id="modalPdfCanvas"></canvas>';
  const canvas = document.getElementById('modalPdfCanvas');

  try {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });
    const context = canvas.getContext('2d');

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderTask = page.render({
      canvasContext: context,
      viewport: viewport
    });

    state.modal.renderTask = renderTask;
    await renderTask.promise;
  } catch (err) {
    if (err?.name !== 'RenderingCancelledException') {
      console.error('Error rendering modal page:', err);
    }
  }
}

function closeModal() {
  const modal = document.getElementById('pdfModal');
  if (!modal) return;

  if (state.modal.renderTask) {
    state.modal.renderTask.cancel();
    state.modal.renderTask = null;
  }

  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  state.modal.pdfDoc = null;
}
