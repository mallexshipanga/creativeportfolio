let pdfReady = false;
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  pdfReady = true;
} catch (e) {
  console.error("pdf.js failed to load", e);
}

const projectList = document.getElementById('projectList');

const defaultProjects = [
  {
    "file": "creativeprojects/Campus Couture.pdf",
    "title": "Campus Couture: Thematic Photoessay",
    "description": "This is a thematic photoessay I created in May, 2025. The photoessay features three diverse university students’ fashion, exploring how each student uses clothing to express themselves."
  },
  {
    "file": "creativeprojects/Sunflowers.pdf",
    "title": "Sunflowers: Editorial Photoshoot",
    "description": "This is an editorial photoshoot I captured and edited in August, 2026. The photoshoot prominently features sunflowers to encapsulate both creativity and youth. Each photo was used to promote an upcoming creative project on social media."
  }
];

async function setupPdfViewer(viewerEl, file) {
  const canvas = viewerEl.querySelector('.pdf-canvas');
  const errorEl = viewerEl.querySelector('.pdf-error');
  const ctx = canvas.getContext('2d');
  const prevBtn = viewerEl.querySelector('.pdf-prev');
  const nextBtn = viewerEl.querySelector('.pdf-next');
  const countEl = viewerEl.querySelector('.pdf-count');

  if (!pdfReady) {
    errorEl.textContent = "PDF viewer failed to load (pdf.js didn't initialize).";
    errorEl.style.display = 'block';
    return;
  }

  let pdfDoc = null;
  let pageNum = 1;
  let rendering = false;

  function updateButtons() {
    prevBtn.disabled = pageNum <= 1;
    nextBtn.disabled = !pdfDoc || pageNum >= pdfDoc.numPages;
    countEl.textContent = pdfDoc ? (pageNum + " / " + pdfDoc.numPages) : "";
  }

  async function renderPage(num) {
    if (!pdfDoc || rendering) return;
    rendering = true;
    try {
      const page = await pdfDoc.getPage(num);
      const containerWidth = viewerEl.clientWidth || 400;
      const base = page.getViewport({ scale: 1 });
      const scale = containerWidth / base.width;
      const viewport = page.getViewport({ scale });

      const dpr = window.devicePixelRatio || 1;
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = viewport.width + "px";
      canvas.style.height = viewport.height + "px";

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (e) {
      console.error("Failed to render page", num, "of", file, e);
      errorEl.textContent = "Couldn't render page " + num + ": " + e.message;
      errorEl.style.display = 'block';
    } finally {
      rendering = false;
      updateButtons();
    }
  }

  prevBtn.addEventListener('click', () => {
    if (pageNum > 1) { pageNum--; renderPage(pageNum); }
  });
  nextBtn.addEventListener('click', () => {
    if (pdfDoc && pageNum < pdfDoc.numPages) { pageNum++; renderPage(pageNum); }
  });
  window.addEventListener('resize', () => renderPage(pageNum));

  try {
    pdfDoc = await pdfjsLib.getDocument(encodeURI(file)).promise;
    renderPage(pageNum);
  } catch (e) {
    console.error("Failed to load PDF:", file, e);
    errorEl.textContent = "Couldn't load \"" + file + "\": " + e.message;
    errorEl.style.display = 'block';
  }
}

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

function attachShareButtons() {
  const shareIconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`;
  const checkIconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

  document.querySelectorAll('.project-card').forEach((card) => {
    const desc = card.querySelector('.description');
    if (!desc.querySelector('.share-btn')) {
      const shareBtn = document.createElement('button');
      shareBtn.className = 'share-btn';
      shareBtn.setAttribute('aria-label', 'Share project');
      shareBtn.innerHTML = shareIconSvg;
      shareBtn.addEventListener('click', () => {
        const title = card.querySelector('h3').textContent;
        if (navigator.share) {
          navigator.share({ title: title, url: window.location.href }).catch(() => {});
        } else {
          navigator.clipboard.writeText(window.location.href);
          shareBtn.innerHTML = checkIconSvg;
          setTimeout(() => { shareBtn.innerHTML = shareIconSvg; }, 2000);
        }
      });
      desc.appendChild(shareBtn);
    }
  });
}

function renderProjects(projects) {
  projectList.innerHTML = '';
  projects.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'project-card reveal';
    card.innerHTML = `
      <div class="viewer">
        <canvas class="pdf-canvas"></canvas>
        <div class="pdf-error"></div>
        <div class="pdf-controls">
          <button class="pdf-prev" disabled>‹</button>
          <span class="pdf-count"></span>
          <button class="pdf-next" disabled>›</button>
        </div>
      </div>
      <div class="description">
        <h3>${p.title}</h3>
        <p>${p.description}</p>
      </div>
    `;
    projectList.appendChild(card);
    setupPdfViewer(card.querySelector('.viewer'), p.file);
    revealObserver.observe(card);
  });
  attachShareButtons();
}

renderProjects(defaultProjects);

fetch('creativeprojects.json')
  .then((res) => res.json())
  .then((data) => {
    if (data.projects && data.projects.length > 0) {
      renderProjects(data.projects);
    }
  })
  .catch((e) => console.error("Failed to load creativeprojects.json:", e));

const cursor = document.getElementById('custom-cursor');
const hasFinePointer = window.matchMedia('(pointer: fine)').matches;

if (hasFinePointer) {
  document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
    cursor.style.opacity = '1';
  });
  document.addEventListener('mouseleave', () => {
    cursor.style.opacity = '0';
  });
  document.addEventListener('mousedown', () => cursor.classList.add('cursor-active'));
  document.addEventListener('mouseup', () => cursor.classList.remove('cursor-active'));

  document.querySelectorAll('#projects, #about-card').forEach((el) => {
    el.addEventListener('mouseenter', () => cursor.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('cursor-hover'));
  });
} else {
  document.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    if (!touch) return;
    const ripple = document.createElement('div');
    ripple.className = 'tap-ripple';
    ripple.style.left = touch.clientX + 'px';
    ripple.style.top = touch.clientY + 'px';
    document.body.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  }, { passive: true });
}
