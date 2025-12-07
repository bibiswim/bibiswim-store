// Modern Lightbox Gallery with zoom functionality
// Similar to chuck-s.co implementation

class ProductLightbox {
  constructor() {
    this.lightbox = null;
    this.currentIndex = 0;
    this.images = [];
    this.isZoomed = false;
    this.scale = 1;
    this.minScale = 1;
    this.maxScale = 3;

    // Pan/translate state
    this.translateX = 0;
    this.translateY = 0;

    // Touch/mouse tracking
    this.initialDistance = 0;
    this.touchStartTime = 0;
    this.isPanning = false;
    this.panStartX = 0;
    this.panStartY = 0;
    this.lastPanX = 0;
    this.lastPanY = 0;

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

    // Prevent background scroll when lightbox is open
    this.lightbox.addEventListener(
      'touchmove',
      (e) => {
        // Always prevent default to stop background scroll
        // We handle panning manually via transforms
        e.preventDefault();
      },
      { passive: false }
    );

    // Prevent wheel scroll on background
    this.lightbox.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
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

    // ============ TOUCH EVENTS ============
    let touchStartX = 0;
    let touchStartY = 0;
    let lastTouchX = 0;
    let lastTouchY = 0;
    let isSwiping = false;
    let initialPinchScale = 1;

    this.container.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length === 2) {
          // Pinch zoom start
          this.initialDistance = this.getDistance(e.touches[0], e.touches[1]);
          initialPinchScale = this.scale;
          this.isPanning = false;
          return;
        }

        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        lastTouchX = touchStartX;
        lastTouchY = touchStartY;
        this.touchStartTime = Date.now();

        if (this.isZoomed) {
          // Start panning
          this.isPanning = true;
          this.panStartX = touchStartX - this.translateX;
          this.panStartY = touchStartY - this.translateY;
        } else {
          isSwiping = true;
        }
      },
      { passive: true }
    );

    this.container.addEventListener(
      'touchmove',
      (e) => {
        if (e.touches.length === 2) {
          // Pinch zoom
          const currentDistance = this.getDistance(e.touches[0], e.touches[1]);
          const newScale = Math.max(
            this.minScale,
            Math.min(this.maxScale, initialPinchScale * (currentDistance / this.initialDistance))
          );

          // Calculate pinch center
          const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

          this.zoomToPoint(newScale, centerX, centerY);
          return;
        }

        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;

        if (this.isPanning && this.isZoomed) {
          // Pan the zoomed image
          this.translateX = currentX - this.panStartX;
          this.translateY = currentY - this.panStartY;
          this.constrainPan();
          this.applyTransform();
        } else if (isSwiping) {
          lastTouchX = currentX;
          lastTouchY = currentY;
        }
      },
      { passive: true }
    );

    this.container.addEventListener(
      'touchend',
      (e) => {
        if (e.touches.length > 0) return;

        // Reset pinch state
        if (this.initialDistance > 0) {
          this.initialDistance = 0;

          // If scale is close to 1, reset completely
          if (this.scale < 1.1) {
            this.resetZoom();
          }
          return;
        }

        // Handle swipe for navigation (only when not zoomed)
        if (isSwiping && !this.isZoomed) {
          const touchDuration = Date.now() - this.touchStartTime;
          const diffX = touchStartX - lastTouchX;
          const threshold = 50;

          if (Math.abs(diffX) > threshold && touchDuration < 500) {
            if (diffX > 0) {
              this.next();
            } else {
              this.prev();
            }
          }
        }

        isSwiping = false;
        this.isPanning = false;
      },
      { passive: true }
    );

    // Double tap to zoom on mobile
    let lastTap = 0;
    let lastTapX = 0;
    let lastTapY = 0;

    this.image.addEventListener('touchend', (e) => {
      const currentTime = Date.now();
      const tapLength = currentTime - lastTap;
      const touch = e.changedTouches[0];

      if (tapLength < 300 && tapLength > 0) {
        e.preventDefault();
        e.stopPropagation();
        this.toggleZoom(touch.clientX, touch.clientY);
      }

      lastTap = currentTime;
      lastTapX = touch.clientX;
      lastTapY = touch.clientY;
    });

    // ============ MOUSE EVENTS ============
    // Click to zoom on desktop
    this.image.addEventListener('click', (e) => {
      // Only toggle zoom if we weren't just panning
      if (!this.wasPanning && window.innerWidth >= 750) {
        this.toggleZoom(e.clientX, e.clientY);
      }
      this.wasPanning = false;
    });

    // Mouse pan when zoomed
    this.imageWrapper.addEventListener('mousedown', (e) => {
      if (!this.isZoomed) return;
      e.preventDefault();
      this.isPanning = true;
      this.panStartX = e.clientX - this.translateX;
      this.panStartY = e.clientY - this.translateY;
      this.imageWrapper.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isPanning || !this.isZoomed) return;

      this.wasPanning = true;
      this.translateX = e.clientX - this.panStartX;
      this.translateY = e.clientY - this.panStartY;
      this.constrainPan();
      this.applyTransform();
    });

    document.addEventListener('mouseup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.imageWrapper.style.cursor = this.isZoomed ? 'grab' : 'zoom-in';
      }
    });
  }

  getDistance(touch1, touch2) {
    return Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
  }

  // Get image bounds relative to container
  getImageBounds() {
    const containerRect = this.container.getBoundingClientRect();
    const imageRect = this.image.getBoundingClientRect();

    // Get the base (unscaled) dimensions
    // Since we use CSS transform, getBoundingClientRect gives us scaled dimensions
    // We need to divide by current scale to get base dimensions
    const baseWidth = imageRect.width / this.scale;
    const baseHeight = imageRect.height / this.scale;

    return {
      containerWidth: containerRect.width,
      containerHeight: containerRect.height,
      imageWidth: this.image.naturalWidth || baseWidth,
      imageHeight: this.image.naturalHeight || baseHeight,
      displayWidth: baseWidth,
      displayHeight: baseHeight,
      containerCenterX: containerRect.width / 2,
      containerCenterY: containerRect.height / 2,
    };
  }

  // Apply transform to image with optional animation
  applyTransform(animate = false) {
    if (animate) {
      this.image.style.transition = 'transform 0.3s ease-out';
      setTimeout(() => {
        this.image.style.transition = '';
      }, 300);
    }
    this.image.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
  }

  // Constrain pan to keep image within reasonable bounds
  constrainPan() {
    const bounds = this.getImageBounds();
    const scaledWidth = bounds.displayWidth * this.scale;
    const scaledHeight = bounds.displayHeight * this.scale;

    // Calculate max pan distances - allow panning when zoomed image is larger than container
    const maxPanX = Math.max(0, (scaledWidth - bounds.containerWidth) / 2);
    const maxPanY = Math.max(0, (scaledHeight - bounds.containerHeight) / 2);

    // Constrain translate values
    this.translateX = Math.max(-maxPanX, Math.min(maxPanX, this.translateX));
    this.translateY = Math.max(-maxPanY, Math.min(maxPanY, this.translateY));
  }

  // Zoom to a specific point (for click/tap zoom)
  zoomToPoint(newScale, pointX, pointY) {
    const oldScale = this.scale;
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
    this.isZoomed = this.scale > 1;

    if (this.scale === oldScale) return;

    // Get image position
    const imageRect = this.image.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();

    // Calculate the point relative to image center
    const imageCenterX = imageRect.left + imageRect.width / 2;
    const imageCenterY = imageRect.top + imageRect.height / 2;

    // Calculate offset from center to click point
    const offsetX = pointX - imageCenterX;
    const offsetY = pointY - imageCenterY;

    // Adjust translate to zoom toward the point
    const scaleRatio = this.scale / oldScale;
    this.translateX = this.translateX - offsetX * (scaleRatio - 1);
    this.translateY = this.translateY - offsetY * (scaleRatio - 1);

    this.constrainPan();
    this.applyTransform();

    // Update cursor
    this.imageWrapper.style.cursor = this.isZoomed ? 'grab' : 'zoom-in';
  }

  toggleZoom(clientX, clientY) {
    if (this.isZoomed) {
      this.resetZoom(true);
    } else {
      // Zoom in to 2x centered on click/tap position
      const targetScale = 2;

      // Get image rect (need to get it before scaling)
      const imageRect = this.image.getBoundingClientRect();

      // Calculate where user clicked relative to image center
      const imageCenterX = imageRect.left + imageRect.width / 2;
      const imageCenterY = imageRect.top + imageRect.height / 2;

      // Offset from center to click point
      const offsetX = clientX - imageCenterX;
      const offsetY = clientY - imageCenterY;

      // Set scale
      this.scale = targetScale;
      this.isZoomed = true;

      // Calculate translate to center the clicked point
      // When we scale, we want the clicked point to stay in the same screen position
      // So we need to translate by the offset * (scale - 1)
      this.translateX = -offsetX * (this.scale - 1);
      this.translateY = -offsetY * (this.scale - 1);

      this.constrainPan();
      this.applyTransform(true);

      this.imageWrapper.style.cursor = 'grab';
    }
  }

  resetZoom(animate = false) {
    this.scale = 1;
    this.isZoomed = false;
    this.translateX = 0;
    this.translateY = 0;

    if (animate) {
      this.image.style.transition = 'transform 0.3s ease-out';
      setTimeout(() => {
        this.image.style.transition = '';
      }, 300);
    }

    this.image.style.transform = 'translate(0px, 0px) scale(1)';
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
