// Modern Lightbox Gallery with zoom functionality
// Similar to chuck-s.co implementation

class ProductLightbox {
  constructor() {
    this.lightbox = null;
    this.currentIndex = 0;
    this.images = [];
    this.isZoomed = false;
    this.startX = 0;
    this.startY = 0;
    this.scale = 1;
    this.initialDistance = 0;
    this.touchStartTime = 0;

    this.init();
  }

  init() {
    this.createLightbox();
    this.bindEvents();
  }

  createLightbox() {
    // Create lightbox container
    this.lightbox = document.createElement('div');
    this.lightbox.className = 'product-lightbox color-ocean-breeze gradient';
    this.lightbox.innerHTML = `
      <div class="product-lightbox__overlay"></div>
      <button class="product-lightbox__close" aria-label="Close">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      <button class="product-lightbox__nav product-lightbox__nav--prev" aria-label="Previous image">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <button class="product-lightbox__nav product-lightbox__nav--next" aria-label="Next image">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
      <div class="product-lightbox__container">
        <div class="product-lightbox__image-wrapper">
          <img class="product-lightbox__image" src="" alt="" />
        </div>
      </div>
      <div class="product-lightbox__counter"></div>
      <div class="product-lightbox__thumbnails"></div>
    `;
    document.body.appendChild(this.lightbox);

    // Cache elements
    this.overlay = this.lightbox.querySelector('.product-lightbox__overlay');
    this.closeBtn = this.lightbox.querySelector('.product-lightbox__close');
    this.prevBtn = this.lightbox.querySelector('.product-lightbox__nav--prev');
    this.nextBtn = this.lightbox.querySelector('.product-lightbox__nav--next');
    this.container = this.lightbox.querySelector('.product-lightbox__container');
    this.imageWrapper = this.lightbox.querySelector('.product-lightbox__image-wrapper');
    this.image = this.lightbox.querySelector('.product-lightbox__image');
    this.counter = this.lightbox.querySelector('.product-lightbox__counter');
    this.thumbnailsContainer = this.lightbox.querySelector('.product-lightbox__thumbnails');
  }

  bindEvents() {
    // Close events
    this.closeBtn.addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', () => this.close());

    // Prevent scroll on lightbox container and image
    this.lightbox.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        e.stopPropagation();
      },
      { passive: false }
    );

    // Prevent all touch scrolling on the lightbox to stop background page scroll
    this.lightbox.addEventListener(
      'touchmove',
      (e) => {
        e.preventDefault();
        e.stopPropagation();
      },
      { passive: false }
    );

    // Navigation
    this.prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.prev();
    });
    this.nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.next();
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!this.lightbox.classList.contains('is-open')) return;
      if (e.key === 'Escape') this.close();
      if (e.key === 'ArrowLeft') this.prev();
      if (e.key === 'ArrowRight') this.next();
    });

    // Touch/swipe events for mobile
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let isSwiping = false;

    this.container.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length === 2) {
          // Pinch zoom start
          this.initialDistance = this.getDistance(e.touches[0], e.touches[1]);
          return;
        }
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        this.touchStartTime = Date.now();
        isSwiping = true;
      },
      { passive: true }
    );

    this.container.addEventListener(
      'touchmove',
      (e) => {
        if (e.touches.length === 2) {
          // Pinch zoom
          const currentDistance = this.getDistance(e.touches[0], e.touches[1]);
          const newScale = Math.max(1, Math.min(3, this.scale * (currentDistance / this.initialDistance)));
          this.image.style.transform = `scale(${newScale})`;
          this.isZoomed = newScale > 1;
          return;
        }
        if (!isSwiping) return;
        touchEndX = e.touches[0].clientX;
      },
      { passive: true }
    );

    this.container.addEventListener(
      'touchend',
      (e) => {
        if (e.touches.length > 0) return;

        // Reset scale on pinch end
        if (this.initialDistance > 0) {
          const computedScale = parseFloat(this.image.style.transform.replace('scale(', '').replace(')', '')) || 1;
          this.scale = computedScale;
          this.initialDistance = 0;

          // If scale is close to 1, reset
          if (this.scale < 1.1) {
            this.resetZoom();
          }
          return;
        }

        // Handle swipe
        if (!isSwiping || this.isZoomed) {
          isSwiping = false;
          return;
        }

        const touchDuration = Date.now() - this.touchStartTime;
        const diffX = touchStartX - touchEndX;
        const threshold = 50;

        if (Math.abs(diffX) > threshold && touchDuration < 500) {
          if (diffX > 0) {
            this.next();
          } else {
            this.prev();
          }
        }
        isSwiping = false;
      },
      { passive: true }
    );

    // Double tap to zoom on mobile
    let lastTap = 0;
    this.image.addEventListener('touchend', (e) => {
      const currentTime = Date.now();
      const tapLength = currentTime - lastTap;
      if (tapLength < 300 && tapLength > 0) {
        e.preventDefault();
        this.toggleZoom(e);
      }
      lastTap = currentTime;
    });

    // Click to zoom on desktop
    this.image.addEventListener('click', (e) => {
      if (window.innerWidth >= 750) {
        this.toggleZoom(e);
      }
    });

    // Pan when zoomed
    let isPanning = false;
    let panStartX = 0;
    let panStartY = 0;
    let currentTranslateX = 0;
    let currentTranslateY = 0;

    this.imageWrapper.addEventListener('mousedown', (e) => {
      if (!this.isZoomed) return;
      isPanning = true;
      panStartX = e.clientX - currentTranslateX;
      panStartY = e.clientY - currentTranslateY;
      this.imageWrapper.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isPanning || !this.isZoomed) return;
      currentTranslateX = e.clientX - panStartX;
      currentTranslateY = e.clientY - panStartY;
      this.image.style.transform = `scale(${this.scale}) translate(${currentTranslateX / this.scale}px, ${
        currentTranslateY / this.scale
      }px)`;
    });

    document.addEventListener('mouseup', () => {
      isPanning = false;
      this.imageWrapper.style.cursor = this.isZoomed ? 'grab' : 'zoom-in';
    });
  }

  getDistance(touch1, touch2) {
    return Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
  }

  toggleZoom(e) {
    if (this.isZoomed) {
      this.resetZoom();
    } else {
      this.scale = 2;
      this.isZoomed = true;
      this.image.style.transform = `scale(${this.scale})`;
      this.imageWrapper.style.cursor = 'grab';
    }
  }

  resetZoom() {
    this.scale = 1;
    this.isZoomed = false;
    this.image.style.transform = 'scale(1)';
    this.imageWrapper.style.cursor = 'zoom-in';
  }

  open(images, startIndex = 0) {
    this.images = images;
    this.currentIndex = startIndex;

    // Build thumbnails
    this.buildThumbnails();

    // Show lightbox
    this.lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    // Load current image
    this.showImage(this.currentIndex);

    // Update nav visibility
    this.updateNavigation();
  }

  close() {
    this.lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
    this.resetZoom();
  }

  prev() {
    if (this.currentIndex > 0) {
      this.resetZoom();
      this.currentIndex--;
      this.showImage(this.currentIndex);
      this.updateNavigation();
    }
  }

  next() {
    if (this.currentIndex < this.images.length - 1) {
      this.resetZoom();
      this.currentIndex++;
      this.showImage(this.currentIndex);
      this.updateNavigation();
    }
  }

  showImage(index) {
    const imageData = this.images[index];
    this.image.style.opacity = '0';

    // Load high-res image
    const highResSrc = imageData.src.replace(/width=\d+/, 'width=2000');

    const tempImg = new Image();
    tempImg.onload = () => {
      this.image.src = highResSrc;
      this.image.alt = imageData.alt || '';
      setTimeout(() => {
        this.image.style.opacity = '1';
      }, 50);
    };
    tempImg.src = highResSrc;

    // Update counter
    this.counter.textContent = `${index + 1} / ${this.images.length}`;

    // Update active thumbnail
    this.thumbnailsContainer.querySelectorAll('.product-lightbox__thumb').forEach((thumb, i) => {
      thumb.classList.toggle('is-active', i === index);
    });
  }

  buildThumbnails() {
    if (this.images.length <= 1) {
      this.thumbnailsContainer.style.display = 'none';
      return;
    }

    this.thumbnailsContainer.style.display = 'flex';
    this.thumbnailsContainer.innerHTML = this.images
      .map((img, i) => {
        const thumbSrc = img.src.replace(/width=\d+/, 'width=100');
        return `<button class="product-lightbox__thumb ${i === this.currentIndex ? 'is-active' : ''}" data-index="${i}">
        <img src="${thumbSrc}" alt="" />
      </button>`;
      })
      .join('');

    // Bind thumbnail clicks
    this.thumbnailsContainer.querySelectorAll('.product-lightbox__thumb').forEach((thumb) => {
      thumb.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(thumb.dataset.index);
        this.resetZoom();
        this.currentIndex = index;
        this.showImage(index);
        this.updateNavigation();
      });
    });
  }

  updateNavigation() {
    this.prevBtn.style.display = this.currentIndex === 0 ? 'none' : 'flex';
    this.nextBtn.style.display = this.currentIndex === this.images.length - 1 ? 'none' : 'flex';
  }
}

// Initialize lightbox
const productLightbox = new ProductLightbox();

// Helper function to collect images from gallery and open lightbox
function openProductLightbox(clickedImage) {
  const gallery = clickedImage.closest('media-gallery') || clickedImage.closest('.product__media-list')?.parentElement;
  if (!gallery) {
    // Fallback: just open single image
    productLightbox.open([{ src: clickedImage.src, alt: clickedImage.alt }], 0);
    return;
  }

  // Collect all images from the gallery
  const mediaItems = gallery.querySelectorAll('[data-media-id] img');
  const images = [];
  let startIndex = 0;

  mediaItems.forEach((img, i) => {
    // Get the high-res URL
    const src = img.src || img.currentSrc;
    if (src) {
      images.push({ src, alt: img.alt });
      if (img === clickedImage || img.src === clickedImage.src) {
        startIndex = images.length - 1;
      }
    }
  });

  if (images.length > 0) {
    productLightbox.open(images, startIndex);
  }
}

// Bind to product images
function initProductImageZoom() {
  // For image magnify on hover (old behavior, can keep as fallback)
  const hoverImages = document.querySelectorAll('.image-magnify-hover');
  hoverImages.forEach((image) => {
    if (image.dataset.lightboxBound) return;
    image.dataset.lightboxBound = 'true';
    image.style.cursor = 'zoom-in';
    image.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      openProductLightbox(image);
    };
  });

  // For lightbox click behavior
  const lightboxImages = document.querySelectorAll('.image-magnify-lightbox, .product__modal-opener--image img');
  lightboxImages.forEach((image) => {
    if (image.dataset.lightboxBound) return;
    image.dataset.lightboxBound = 'true';
    image.style.cursor = 'zoom-in';
    image.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      openProductLightbox(image);
    };
  });
}

// Initialize on DOM ready and after variant changes
document.addEventListener('DOMContentLoaded', initProductImageZoom);
document.addEventListener('variant:change', initProductImageZoom);

// Watch for dynamic content changes
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length) {
      initProductImageZoom();
    }
  });
});

// Start observing after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const productMedia = document.querySelector('media-gallery, .product__media-list');
  if (productMedia) {
    observer.observe(productMedia, { childList: true, subtree: true });
  }
});

// Re-export for potential external use
window.productLightbox = productLightbox;
window.openProductLightbox = openProductLightbox;
window.initProductImageZoom = initProductImageZoom;
