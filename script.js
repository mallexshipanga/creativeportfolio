document.addEventListener('DOMContentLoaded', () => {
  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  const projects = [
    {
      id: 'proj-1',
      title: 'Media Technology & Visual Design',
      description: 'A selection of editorial layouts, visual typography, and digital graphics produced for contemporary publications.',
      pdfUrl: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf'
    },
    {
      id: 'proj-2',
      title: 'Feature Writing & Content Strategy',
      description: 'In-depth investigative stories, feature journalism, and multimedia content strategies.',
      pdfUrl: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf'
    }
  ];

  const projectList = document.getElementById('projectList');
  const pdfModal = document.getElementById('pdfModal');
  const modalOverlay = document.getElementById('modalOverlay');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalTitle = document.getElementById('modalTitle');
  const modalPdfCanvas = document.getElementById('modalPdfCanvas');
  const modalLoading = document.getElementById('modalLoading');
  const modalPrevPage = document.getElementById('modalPrevPage');
  const modalNextPage = document.getElementById('modalNextPage');
  const modalPageNum = document.getElementById('modalPageNum');

  let activeModalDoc = null;
  let activeModalPage = 1;
  let activeModalTotalPages = 1;
  let isRenderingModal = false;

  const projectStates = {};

  function renderProjects() {
    if (!projectList) return;
    projectList.innerHTML = '';

    projects.forEach(project => {
      projectStates[project.id] = {
        pdfDoc: null,
        currentPage: 1,
        totalPages: 1,
        isRendering: false
      };

      const card = document.createElement('article');
      card.className = 'project-card';
      card.id = project.id;

      card.innerHTML = `
        <h3>${project.title}</h3>
        <p>${project.description}</p>
        <div class="project-preview-wrapper" tabindex="0" role="button" aria-label="Open fullscreen preview of ${project.title}">
          <canvas class="project-canvas" id="canvas-${project.id}"></canvas>
          <div class="preview-overlay">Click to Expand</div>
        </div>
        <div class="pdf-pagination-controls">
          <button class="pdf-page-btn prev-btn" aria-label="Previous Page" disabled>&lsaquo;</button>
          <span class="pdf-page-indicator">Page <span class="current-page">1</span> of <span class="total-pages">1</span></span>
          <button class="pdf-page-btn next-btn" aria-label="Next Page" disabled>&rsaquo;</button>
        </div>
        <div style="display: flex; gap: 12px; justify-content: center; margin-top: 8px;">
          <a href="${project.pdfUrl}" target="_blank" rel="noopener noreferrer" class="btn-primary">View / Download PDF</a>
        </div>
      `;

      projectList.appendChild(card);

      const previewWrapper = card.querySelector('.project-preview-wrapper');
      const prevBtn = card.querySelector('.prev-btn');
      const nextBtn = card.querySelector('.next-btn');

      previewWrapper.addEventListener('click', () => openModal(project));
      previewWrapper.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(project);
        }
      });

      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        changeProjectPage(project.id, -1);
      });

      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        changeProjectPage(project.id, 1);
      });

      loadProjectPdf(project);
    });
  }

  function loadProjectPdf(project) {
    if (typeof pdfjsLib === 'undefined') return;

    pdfjsLib.getDocument(project.pdfUrl).promise.then(pdfDoc => {
      const state = projectStates[project.id];
      state.pdfDoc = pdfDoc;
      state.totalPages = pdfDoc.numPages;

      const card = document.getElementById(project.id);
      if (card) {
        card.querySelector('.total-pages').textContent = state.totalPages;
      }
      renderProjectPage(project.id, 1);
    }).catch(err => {
      console.error(err);
    });
  }

  function renderProjectPage(projectId, pageNum) {
    const state = projectStates[projectId];
    if (!state || !state.pdfDoc || state.isRendering) return;
    state.isRendering = true;

    state.pdfDoc.getPage(pageNum).then(page => {
      const canvas = document.getElementById(`canvas-${projectId}`);
      if (!canvas) {
        state.isRendering = false;
        return;
      }
      const ctx = canvas.getContext('2d');
      const viewport = page.getViewport({ scale: 1.2 });

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };

      return page.render(renderContext).promise;
    }).then(() => {
      state.currentPage = pageNum;
      state.isRendering = false;

      const card = document.getElementById(projectId);
      if (card) {
        card.querySelector('.current-page').textContent = state.currentPage;
        const prevBtn = card.querySelector('.prev-btn');
        const nextBtn = card.querySelector('.next-btn');
        prevBtn.disabled = state.currentPage <= 1;
        nextBtn.disabled = state.currentPage >= state.totalPages;
      }
    }).catch(err => {
      state.isRendering = false;
      console.error(err);
    });
  }

  function changeProjectPage(projectId, delta) {
    const state = projectStates[projectId];
    if (!state || !state.pdfDoc) return;
    const newPage = state.currentPage + delta;
    if (newPage >= 1 && newPage <= state.totalPages) {
      renderProjectPage(projectId, newPage);
    }
  }

  function openModal(project) {
    if (!pdfModal || typeof pdfjsLib === 'undefined') return;

    modalTitle.textContent = project.title;
    pdfModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    modalLoading.style.display = 'block';

    pdfjsLib.getDocument(project.pdfUrl).promise.then(pdfDoc => {
      activeModalDoc = pdfDoc;
      activeModalTotalPages = pdfDoc.numPages;
      const cardState = projectStates[project.id];
      activeModalPage = cardState ? cardState.currentPage : 1;

      renderModalPage(activeModalPage);
    }).catch(err => {
      modalLoading.style.display = 'none';
      console.error(err);
    });
  }

  function closeModal() {
    if (!pdfModal) return;
    pdfModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    activeModalDoc = null;
  }

  function renderModalPage(pageNum) {
    if (!activeModalDoc || isRenderingModal) return;
    isRenderingModal = true;
    modalLoading.style.display = 'block';

    activeModalDoc.getPage(pageNum).then(page => {
      const ctx = modalPdfCanvas.getContext('2d');
      const viewport = page.getViewport({ scale: 1.5 });

      modalPdfCanvas.height = viewport.height;
      modalPdfCanvas.width = viewport.width;

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };

      return page.render(renderContext).promise;
    }).then(() => {
      activeModalPage = pageNum;
      isRenderingModal = false;
      modalLoading.style.display = 'none';
      modalPageNum.textContent = `Page ${activeModalPage} of ${activeModalTotalPages}`;

      modalPrevPage.disabled = activeModalPage <= 1;
      modalNextPage.disabled = activeModalPage >= activeModalTotalPages;
    }).catch(err => {
      isRenderingModal = false;
      modalLoading.style.display = 'none';
      console.error(err);
    });
  }

  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (modalOverlay) modalOverlay.addEventListener('click', closeModal);

  if (modalPrevPage) {
    modalPrevPage.addEventListener('click', () => {
      if (activeModalPage > 1) renderModalPage(activeModalPage - 1);
    });
  }

  if (modalNextPage) {
    modalNextPage.addEventListener('click', () => {
      if (activeModalPage < activeModalTotalPages) renderModalPage(activeModalPage + 1);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (!pdfModal || pdfModal.getAttribute('aria-hidden') === 'true') return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowLeft' && activeModalPage > 1) renderModalPage(activeModalPage - 1);
    if (e.key === 'ArrowRight' && activeModalPage < activeModalTotalPages) renderModalPage(activeModalPage + 1);
  });

  renderProjects();
});
