document.addEventListener('DOMContentLoaded', () => {
  const projects = [
    {
      id: 'proj-1',
      title: 'Sunflowers: Editorial Photoshoot',
      description: 'This is an editorial photoshoot I captured and edited in August 2026. The photoshoot prominently features sunflowers to encapsulate both creativity and youth. Each photo was used to promote an upcoming creative project on social media.',
      images: [
        'https://picsum.photos/800/1000?random=1',
        'https://picsum.photos/800/1000?random=2',
        'https://picsum.photos/800/1000?random=3'
      ]
    },
    {
      id: 'proj-2',
      title: 'Media Technology & Visual Design',
      description: 'A selection of editorial layouts, visual typography, and digital graphics produced for contemporary publications.',
      images: [
        'https://picsum.photos/800/1000?random=4',
        'https://picsum.photos/800/1000?random=5'
      ]
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

  const projectStates = {};

  function renderProjects() {
    if (!projectList) return;
    projectList.innerHTML = '';

    projects.forEach(project => {
      projectStates[project.id] = {
        currentIndex: 0,
        images: project.images || []
      };

      const card = document.createElement('article');
      card.className = 'project-card';
      card.id = project.id;

      card.innerHTML = `
        <h3>${project.title}</h3>
        <p>${project.description}</p>
        <div class="project-preview-wrapper" tabindex="0" role="button" aria-label="Open preview of ${project.title}">
          <img class="project-canvas" id="img-${project.id}" src="${project.images[0]}" alt="${project.title}" style="max-width:100%; height:auto; display:block; border-radius:8px;">
          <div class="preview-overlay">Click to Expand</div>
        </div>
        <div class="pdf-pagination-controls">
          <button class="pdf-page-btn prev-btn" aria-label="Previous Image" ${project.images.length <= 1 ? 'disabled' : ''}>&lsaquo;</button>
          <span class="pdf-page-indicator">Page <span class="current-page">1</span> of <span class="total-pages">${project.images.length}</span></span>
          <button class="pdf-page-btn next-btn" aria-label="Next Image" ${project.images.length <= 1 ? 'disabled' : ''}>&rsaquo;</button>
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
        changeProjectImage(project.id, -1);
      });

      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        changeProjectImage(project.id, 1);
      });
    });
  }

  function changeProjectImage(projectId, delta) {
    const state = projectStates[projectId];
    if (!state || !state.images.length) return;

    let newIndex = state.currentIndex + delta;
    if (newIndex < 0) newIndex = state.images.length - 1;
    if (newIndex >= state.images.length) newIndex = 0;

    state.currentIndex = newIndex;

    const imgEl = document.getElementById(`img-${projectId}`);
    if (imgEl) {
      imgEl.src = state.images[newIndex];
    }

    const card = document.getElementById(projectId);
    if (card) {
      card.querySelector('.current-page').textContent = state.currentIndex + 1;
    }
  }

  let activeModalProject = null;
  let activeModalIndex = 0;

  function openModal(project) {
    if (!pdfModal) return;

    activeModalProject = project;
    activeModalIndex = projectStates[project.id] ? projectStates[project.id].currentIndex : 0;

    modalTitle.textContent = project.title;
    pdfModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    renderModalImage();
  }

  function closeModal() {
    if (!pdfModal) return;
    pdfModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    activeModalProject = null;
  }

  function renderModalImage() {
    if (!activeModalProject) return;

    const modalBody = document.querySelector('.modal-body');
    const images = activeModalProject.images;

    modalBody.innerHTML = `
      <img src="${images[activeModalIndex]}" alt="${activeModalProject.title}" style="max-width:100%; max-height:70vh; object-fit:contain; display:block; margin:0 auto; border-radius:8px;">
    `;

    modalPageNum.textContent = `Page ${activeModalIndex + 1} of ${images.length}`;
    modalPrevPage.disabled = images.length <= 1;
    modalNextPage.disabled = images.length <= 1;
  }

  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (modalOverlay) modalOverlay.addEventListener('click', closeModal);

  if (modalPrevPage) {
    modalPrevPage.addEventListener('click', () => {
      if (!activeModalProject) return;
      activeModalIndex = (activeModalIndex - 1 + activeModalProject.images.length) % activeModalProject.images.length;
      renderModalImage();
    });
  }

  if (modalNextPage) {
    modalNextPage.addEventListener('click', () => {
      if (!activeModalProject) return;
      activeModalIndex = (activeModalIndex + 1) % activeModalProject.images.length;
      renderModalImage();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (!pdfModal || pdfModal.getAttribute('aria-hidden') === 'true') return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowLeft' && activeModalProject) {
      activeModalIndex = (activeModalIndex - 1 + activeModalProject.images.length) % activeModalProject.images.length;
      renderModalImage();
    }
    if (e.key === 'ArrowRight' && activeModalProject) {
      activeModalIndex = (activeModalIndex + 1) % activeModalProject.images.length;
      renderModalImage();
    }
  });

  renderProjects();
});
