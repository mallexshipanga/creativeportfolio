const defaultPortfolioData = {
  "projects": [
    {
      "id": "sunflowers",
      "title": "Sunflowers: Editorial Photoshoot",
      "description": "This is an editorial photoshoot I captured and edited in August 2026. The photoshoot prominently features sunflowers to encapsulate both creativity and youth. Each photo was used to promote an upcoming creative project on social media.",
      "images": [
        "images/sunflowers-1.jpg",
        "images/sunflowers-2.jpg",
        "images/sunflowers-3.jpg"
      ]
    },
    {
      "id": "media-tech",
      "title": "Media Technology & Visual Design",
      "description": "A selection of editorial layouts, visual typography, and digital graphics produced for contemporary publications.",
      "images": [
        "images/media-tech-1.jpg",
        "images/media-tech-2.jpg"
      ]
    }
  ]
};

const state = {
  data: defaultPortfolioData,
  currentProjectImageIndices: {},
  modal: {
    images: [],
    currentIndex: 0,
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
    console.info('Using embedded default portfolio data.');
  }
}

function initProjects() {
  const projectListContainer = document.getElementById('projectList');
  const projects = state.data.projects || [];

  projectListContainer.innerHTML = '';

  projects.forEach((proj, idx) => {
    state.currentProjectImageIndices[idx] = 0;
    const images = proj.images || [];

    const card = document.createElement('article');
    card.className = 'project-card black-card';

    card.innerHTML = `
      <div class="project-preview-wrapper" id="preview-wrapper-${idx}">
        <img id="project-img-${idx}" class="project-canvas" src="${images[0] || ''}" alt="${escapeHtml(proj.title)}" style="width:100%; height:auto; display:block; border-radius:8px; object-fit:contain;">
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
          <span class="page-indicator" id="page-indicator-${idx}">Page 1 of ${images.length}</span>
          <button class="btn-secondary next-btn" data-index="${idx}">
            &rsaquo;
          </button>
        </div>
      </div>
    `;

    projectListContainer.appendChild(card);

    const previewWrapper = document.getElementById(`preview-wrapper-${idx}`);
    previewWrapper.addEventListener('click', () => {
      openModal(proj, state.currentProjectImageIndices[idx]);
    });

    const prevBtn = card.querySelector('.prev-btn');
    const nextBtn = card.querySelector('.next-btn');

    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      changeInlineImage(idx, -1);
    });

    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      changeInlineImage(idx, 1);
    });
  });
}

function changeInlineImage(projectIdx, direction) {
  const proj = state.data.projects[projectIdx];
  if (!proj || !proj.images || proj.images.length === 0) return;

  let newIndex = state.currentProjectImageIndices[projectIdx] + direction;
  if (newIndex < 0) newIndex = proj.images.length - 1;
  if (newIndex >= proj.images.length) newIndex = 0;

  state.currentProjectImageIndices[projectIdx] = newIndex;

  const imgEl = document.getElementById(`project-img-${projectIdx}`);
  const indicatorEl = document.getElementById(`page-indicator-${projectIdx}`);

  if (imgEl) imgEl.src = proj.images[newIndex];
  if (indicatorEl) indicatorEl.textContent = `Page ${newIndex + 1} of ${proj.images.length}`;
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

function openModal(project, initialIndex = 0) {
  const modal = document.getElementById('pdfModal');
  const modalTitle = document.getElementById('modalTitle');

  state.modal.images = project.images || [];
  state.modal.currentIndex = initialIndex;
  state.modal.title = project.title;

  if (modalTitle) modalTitle.textContent = project.title;
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  renderModalPage();
}

function renderModalPage() {
  const images = state.modal.images;
  const index = state.modal.currentIndex;
  const pageNumDisplay = document.getElementById('modalPageNum');
  const modalCanvas = document.getElementById('modalPdfCanvas');
  const modalContainer = modalCanvas ? modalCanvas.parentElement : document.querySelector('.modal-body');

  if (modalContainer) {
    modalContainer.innerHTML = `<img src="${images[index]}" alt="${escapeHtml(state.modal.title)}" style="max-width:100%; max-height:75vh; object-fit:contain; display:block; margin:0 auto; border-radius:8px;">`;
  }

  if (pageNumDisplay) {
    pageNumDisplay.textContent = `Page ${index + 1} of ${images.length}`;
  }
}

function changeModalPage(direction) {
  const images = state.modal.images;
  if (!images || images.length === 0) return;

  let newIndex = state.modal.currentIndex + direction;
  if (newIndex < 0) newIndex = images.length - 1;
  if (newIndex >= images.length) newIndex = 0;

  state.modal.currentIndex = newIndex;
  renderModalPage();
}

function closeModal() {
  const modal = document.getElementById('pdfModal');
  if (!modal) return;
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  state.modal.images = [];
  state.modal.currentIndex = 0;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
