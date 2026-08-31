pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const defaultPortfolioData = {
  "projects": [
    {
      "file": "creativeprojects/Campus_Couture.pdf",
      "title": "Campus Couture: Thematic Photoessay",
      "description": "This is a thematic photoessay I created in May 2025. The photoessay features three diverse university students’ fashion, exploring how each student uses clothing to express themselves."
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
  modal: {
    pdfDoc: null,
    currentPage: 1,
    totalPages: 0,
    fileUrl: ''
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
    console.info('Using embedded default portfolio data.');
  }
}

async function renderPdfPageToCanvas(pdfUrl, canvas, pageNum = 1, targetWidth = 800) {
  try {
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(pageNum);

    const context = canvas.getContext('2d');
    const viewport = page.getViewport({ scale: 1 });

    const scale = targetWidth / viewport.width;
    const scaledViewport = page.getViewport({ scale: Math.max(scale, 1.5) });

    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;

    const renderContext = {
      canvasContext: context,
      viewport: scaledViewport
    };

    await page.render(renderContext).promise;
    return pdf.numPages;
  } catch (error) {
    console.error(`Error rendering PDF (${pdfUrl}):`, error);
    const ctx = canvas.getContext('2d');
    canvas.width = 600;
    canvas.height = 400;
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Preview Unavailable', canvas.width / 2, canvas.height / 2);
    return 0;
  }
}

function initProjects() {
  const projectListContainer = document.getElementById('projectList');
  const projects = state.data.projects || [];

  projectListContainer.innerHTML = '';

  projects.forEach((proj, idx) => {
    const card = document.createElement('article');
    card.className = 'project-card black-card';

    card.innerHTML = `
      <div class="project-preview-wrapper" id="preview-wrapper-${idx}">
        <canvas id="project-canvas-${idx}" class="project-canvas"></canvas>
        <div class="preview-overlay">
          <span>Click to View Full Project</span>
        </div>
      </div>
      <div class="project-info">
        <h3>${escapeHtml(proj.title)}</h3>
        <p>${escapeHtml(proj.description)}</p>
        <div class="project-actions">
          <button class="btn-primary view-btn" data-file="${proj.file}" data-title="${escapeHtml(proj.title)}">
            View PDF
          </button>
          <a href="${proj.file}" target="_blank" rel="noopener" class="btn-secondary">
            Download ↗
          </a>
        </div>
      </div>
    `;

    projectListContainer.appendChild(card);

    const canvas = document.getElementById(`project-canvas-${idx}`);
    renderPdfPageToCanvas(proj.file, canvas, 1, 600);

    const previewWrapper = document.getElementById(`preview-wrapper-${idx}`);
    previewWrapper.addEventListener('click', () => {
      openModal(proj.file, proj.title);
    });

    const viewBtn = card.querySelector('.view-btn');
    viewBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openModal(proj.file, proj.title);
    });
  });
}

function initModalListeners() {
  const modal = document.getElementById('pdfModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const overlay = document.getElementById('modalOverlay');
  const prevBtn = document.getElementById('modalPrevPage');
  const nextBtn = document.getElementById('modalNextPage');

  if (!modal) return;

  closeModalBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (modal.getAttribute('aria-hidden') === 'false') {
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowLeft') changeModalPage(-1);
      if (e.key === 'ArrowRight') changeModalPage(1);
    }
  });

  prevBtn.addEventListener('click', () => changeModalPage(-1));
  nextBtn.addEventListener('click', () => changeModalPage(1));
}

async function openModal(pdfUrl, title) {
  const modal = document.getElementById('pdfModal');
  const modalTitle = document.getElementById('modalTitle');
  const downloadBtn = document.getElementById('modalDownloadBtn');
  const loading = document.getElementById('modalLoading');

  modalTitle.textContent = title;
  downloadBtn.href = pdfUrl;
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  loading.style.display = 'block';

  try {
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    state.modal.pdfDoc = await loadingTask.promise;
    state.modal.totalPages = state.modal.pdfDoc.numPages;
    state.modal.currentPage = 1;
    state.modal.fileUrl = pdfUrl;

    await renderModalPage(state.modal.currentPage);
  } catch (err) {
    console.error('Failed to load PDF in modal:', err);
  } finally {
    loading.style.display = 'none';
  }
}

async function renderModalPage(pageNum) {
  if (!state.modal.pdfDoc) return;

  const canvas = document.getElementById('modalPdfCanvas');
  const pageNumDisplay = document.getElementById('modalPageNum');
  const prevBtn = document.getElementById('modalPrevPage');
  const nextBtn = document.getElementById('modalNextPage');

  const page = await state.modal.pdfDoc.getPage(pageNum);
  const context = canvas.getContext('2d');
  
  const viewport = page.getViewport({ scale: 1.5 });
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: context, viewport }).promise;

  pageNumDisplay.textContent = `Page ${pageNum} of ${state.modal.totalPages}`;
  prevBtn.disabled = pageNum <= 1;
  nextBtn.disabled = pageNum >= state.modal.totalPages;
}

function changeModalPage(direction) {
  const newPage = state.modal.currentPage + direction;
  if (newPage >= 1 && newPage <= state.modal.totalPages) {
    state.modal.currentPage = newPage;
    renderModalPage(newPage);
  }
}

function closeModal() {
  const modal = document.getElementById('pdfModal');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  state.modal.pdfDoc = null;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
