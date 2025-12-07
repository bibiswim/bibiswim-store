if (!customElements.get('media-gallery')) {
  customElements.define(
    'media-gallery',
    class MediaGallery extends HTMLElement {
      constructor() {
        super();
        this.elements = {
          liveRegion: this.querySelector('[id^="GalleryStatus"]'),
          viewer: this.querySelector('[id^="GalleryViewer"]'),
          thumbnails: this.querySelector('[id^="GalleryThumbnails"]'),
        };
        this.mql = window.matchMedia('(min-width: 750px)');

        // Load variant images data from embedded JSON for instant switching
        this.variantImageData = this.loadVariantImageData();
        this.preloadVariantImages();

        // On mobile, ensure the active media is scrolled into view on page load
        this.initializeActiveMedia();

        if (!this.elements.thumbnails) return;

        this.elements.viewer.addEventListener('slideChanged', debounce(this.onSlideChanged.bind(this), 500));
        this.elements.thumbnails.querySelectorAll('[data-target]').forEach((mediaToSwitch) => {
          mediaToSwitch
            .querySelector('button')
            .addEventListener('click', this.setActiveMedia.bind(this, mediaToSwitch.dataset.target, false));
        });
        if (this.dataset.desktopLayout.includes('thumbnail') && this.mql.matches) this.removeListSemantic();
      }

      // Load variant image data from embedded JSON script
      loadVariantImageData() {
        const sectionId = this.id.replace('MediaGallery-', '');
        const dataScript = document.getElementById(`VariantImageData-${sectionId}`);
        if (dataScript) {
          try {
            return JSON.parse(dataScript.textContent);
          } catch (e) {
            console.warn('Failed to parse variant image data:', e);
          }
        }
        return null;
      }

      // Preload all variant images for instant display
      preloadVariantImages() {
        if (!this.variantImageData?.variants) return;

        Object.values(this.variantImageData.variants).forEach((variant) => {
          if (variant.imageSrc) {
            const img = new Image();
            img.src = variant.imageSrc;
            // Also preload thumbnail
            if (variant.thumbSrc) {
              const thumb = new Image();
              thumb.src = variant.thumbSrc;
            }
          }
        });
      }

      // Initialize active media on page load (especially for mobile when URL has variant param)
      initializeActiveMedia() {
        if (!this.elements.viewer) return;

        const activeMedia = this.elements.viewer.querySelector('.is-active[data-media-id]');
        if (!activeMedia) return;

        // Also set active thumbnail if exists
        if (this.elements.thumbnails) {
          const activeThumbnail = this.elements.thumbnails.querySelector(
            `[data-target="${activeMedia.dataset.mediaId}"]`
          );
          this.setActiveThumbnail(activeThumbnail);
        }

        // // Immediately scroll to active media on mobile (no delay to prevent flash of wrong image)
        // if (!this.mql.matches) {
        //   activeMedia.parentElement.scrollLeft = activeMedia.offsetLeft;
        // }
      }

      // Get variant image data by variant ID (instant, no API call needed)
      getVariantImageData(variantId) {
        return this.variantImageData?.variants?.[variantId] || null;
      }

      onSlideChanged(event) {
        const thumbnail = this.elements.thumbnails.querySelector(
          `[data-target="${event.detail.currentElement.dataset.mediaId}"]`
        );
        // this.setActiveThumbnail(thumbnail);
      }

      setActiveMedia(mediaId, prepend) {
        const activeMedia =
          this.elements.viewer.querySelector(`[data-media-id="${mediaId}"]`) ||
          this.elements.viewer.querySelector('[data-media-id]');
        if (!activeMedia) {
          return;
        }
        this.elements.viewer.querySelectorAll('[data-media-id]').forEach((element) => {
          element.classList.remove('is-active');
        });
        activeMedia?.classList?.add('is-active');

        if (prepend) {
          activeMedia.parentElement.firstChild !== activeMedia && activeMedia.parentElement.prepend(activeMedia);

          if (this.elements.thumbnails) {
            const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
            activeThumbnail.parentElement.firstChild !== activeThumbnail &&
              activeThumbnail.parentElement.prepend(activeThumbnail);
          }

          if (this.elements.viewer.slider) this.elements.viewer.resetPages();
        }

        this.preventStickyHeader();
        window.setTimeout(() => {
          if (!this.mql.matches || this.elements.thumbnails) {
            activeMedia.parentElement.scrollTo({ left: activeMedia.offsetLeft, behavior: 'instant' });
          }
          const activeMediaRect = activeMedia.getBoundingClientRect();
          // Don't scroll if the image is already in view
          if (activeMediaRect.top > -0.5) return;
          const top = activeMediaRect.top + window.scrollY;
          window.scrollTo({ top: top, behavior: 'smooth' });
        });
        this.playActiveMedia(activeMedia);

        if (!this.elements.thumbnails) return;
        const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
        this.setActiveThumbnail(activeThumbnail);
        this.announceLiveRegion(activeMedia, activeThumbnail.dataset.mediaPosition);
      }

      setActiveThumbnail(thumbnail) {
        if (!this.elements.thumbnails || !thumbnail) return;

        this.elements.thumbnails
          .querySelectorAll('button')
          .forEach((element) => element.removeAttribute('aria-current'));
        thumbnail.querySelector('button').setAttribute('aria-current', true);
        if (this.elements.thumbnails.isSlideVisible(thumbnail, 10)) return;

        // Center the thumbnail in the viewport with instant scroll to prevent pull-back
        const container = this.elements.thumbnails.slider;
        const marginLeft = parseFloat(getComputedStyle(thumbnail).marginLeft) || 0;
        const marginRight = parseFloat(getComputedStyle(thumbnail).marginRight) || 0;

        const scrollLeft =
          thumbnail.offsetLeft - container.offsetWidth / 2 + thumbnail.offsetWidth / 2 + marginLeft - marginRight - 20;

        // Use requestAnimationFrame to ensure smooth scroll without pull-back effect
        requestAnimationFrame(() => {
          this.elements.thumbnails.slider.scrollTo({ left: scrollLeft, behavior: 'auto' });
        });
      }

      announceLiveRegion(activeItem, position) {
        const image = activeItem.querySelector('.product__modal-opener--image img');
        if (!image) return;
        image.onload = () => {
          this.elements.liveRegion.setAttribute('aria-hidden', false);
          this.elements.liveRegion.innerHTML = window.accessibilityStrings.imageAvailable.replace('[index]', position);
          setTimeout(() => {
            this.elements.liveRegion.setAttribute('aria-hidden', true);
          }, 2000);
        };
        image.src = image.src;
      }

      playActiveMedia(activeItem) {
        window.pauseAllMedia();
        const deferredMedia = activeItem.querySelector('.deferred-media');
        if (deferredMedia) deferredMedia.loadContent(false);
      }

      preventStickyHeader() {
        this.stickyHeader = this.stickyHeader || document.querySelector('sticky-header');
        if (!this.stickyHeader) return;
        this.stickyHeader.dispatchEvent(new Event('preventHeaderReveal'));
      }

      removeListSemantic() {
        if (!this.elements.viewer.slider) return;
        this.elements.viewer.slider.setAttribute('role', 'presentation');
        this.elements.viewer.sliderItems.forEach((slide) => slide.setAttribute('role', 'presentation'));
      }

      // Update the variant slot (2nd position) with new variant image
      updateVariantSlot(sectionId, newVariantMediaId, newImageSrc, newImageAlt) {
        // Update main viewer variant slot
        const variantSlot = this.elements.viewer.querySelector('[data-variant-media-slot="true"]');
        if (variantSlot) {
          const newMediaId = `${sectionId}-${newVariantMediaId}`;
          variantSlot.dataset.mediaId = newMediaId;
          variantSlot.id = `Slide-${sectionId}-${newVariantMediaId}`;

          // Update the image inside
          const img = variantSlot.querySelector('img');
          if (img && newImageSrc) {
            img.src = newImageSrc;
            img.srcset = '';
            img.alt = newImageAlt || '';
          }
        }

        // Update thumbnail variant slot
        if (this.elements.thumbnails) {
          const variantThumbSlot = this.elements.thumbnails.querySelector('[data-variant-thumbnail-slot="true"]');
          if (variantThumbSlot) {
            const newMediaId = `${sectionId}-${newVariantMediaId}`;
            variantThumbSlot.dataset.target = newMediaId;

            // Update the thumbnail image
            const thumbImg = variantThumbSlot.querySelector('img');
            if (thumbImg && newImageSrc) {
              // Generate smaller thumbnail URL
              const thumbSrc = newImageSrc.replace(/width=\d+/, 'width=416');
              thumbImg.src = thumbSrc;
              thumbImg.srcset = '';
              thumbImg.alt = newImageAlt || '';
            }

            // Re-bind click event for the updated thumbnail
            const button = variantThumbSlot.querySelector('button');
            if (button) {
              button.onclick = () => this.setActiveMedia(newMediaId, false);
            }
          }
        }
      }
    }
  );
}
