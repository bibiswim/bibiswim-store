/**
 * Modern Cart Drawer - JavaScript
 * Inspired by Chuck's design with smooth animations and modern UX
 */

class CartDrawerModern extends HTMLElement {
  constructor() {
    super();

    this.drawer = this;
    this.overlay = this.querySelector('[data-cart-drawer-overlay]');
    this.closeButtons = this.querySelectorAll('[data-cart-drawer-close]');
    this.loadingOverlay = this.querySelector('[data-cart-loading]');
    this.itemsContainer = this.querySelector('[data-cart-items]');
    this.cartCountEl = this.querySelector('[data-cart-count]');
    this.subtotalEl = this.querySelector('[data-cart-subtotal]');
    this.shippingProgressEl = this.querySelector('[data-shipping-progress]');

    this.isOpen = false;
    this.isUpdating = false;
    this.activeElement = null;

    this.bindEvents();
    this.setupHeaderCartIcon();
  }

  // Required for compatibility with product-form.js
  setActiveElement(element) {
    this.activeElement = element;
  }

  // Required for compatibility with product-form.js
  getSectionsToRender() {
    return [
      {
        id: 'cart-drawer',
        section: 'cart-drawer',
        selector: '.cart-drawer-modern__container',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section',
      },
    ];
  }

  // Required for compatibility with product-form.js
  renderContents(parsedState) {
    this.getSectionsToRender().forEach((section) => {
      const sectionElement = section.selector
        ? document.querySelector(section.selector)
        : document.getElementById(section.id);

      if (sectionElement && parsedState.sections && parsedState.sections[section.id]) {
        const html = parsedState.sections[section.id];
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newContent = doc.querySelector(section.selector);
        if (newContent) {
          sectionElement.innerHTML = newContent.innerHTML;
        }
      }
    });

    // Re-bind events after updating content
    this.rebindAfterRender();

    // Open the drawer
    setTimeout(() => this.open(), 100);
  }

  rebindAfterRender() {
    this.overlay = this.querySelector('[data-cart-drawer-overlay]');
    this.closeButtons = this.querySelectorAll('[data-cart-drawer-close]');
    this.loadingOverlay = this.querySelector('[data-cart-loading]');
    this.itemsContainer = this.querySelector('[data-cart-items]');
    this.cartCountEl = this.querySelector('[data-cart-count]');
    this.subtotalEl = this.querySelector('[data-cart-subtotal]');
    this.shippingProgressEl = this.querySelector('[data-shipping-progress]');

    // Re-bind close buttons
    this.closeButtons.forEach((btn) => {
      btn.addEventListener('click', () => this.close());
    });

    // Re-bind overlay click
    this.overlay?.addEventListener('click', () => this.close());

    // Re-bind recommendation forms
    this.bindRecommendationForms();

    // Check empty state
    const itemsForm = this.querySelector('#CartDrawerModernForm');
    if (!itemsForm || itemsForm.querySelectorAll('[data-cart-item]').length === 0) {
      this.classList.add('is-empty');
    } else {
      this.classList.remove('is-empty');
    }
  }

  bindEvents() {
    // Close drawer events
    this.overlay?.addEventListener('click', () => this.close());
    this.closeButtons.forEach((btn) => {
      btn.addEventListener('click', () => this.close());
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Quantity buttons
    this.addEventListener('click', (e) => {
      const minusBtn = e.target.closest('[data-quantity-minus]');
      const plusBtn = e.target.closest('[data-quantity-plus]');
      const removeBtn = e.target.closest('[data-remove-item]');

      if (minusBtn) {
        this.handleQuantityChange(minusBtn, -1);
      } else if (plusBtn) {
        this.handleQuantityChange(plusBtn, 1);
      } else if (removeBtn) {
        this.handleRemoveItem(removeBtn);
      }
    });

    // Quantity input change
    this.addEventListener('change', (e) => {
      if (e.target.matches('[data-quantity-input]')) {
        this.handleQuantityInput(e.target);
      }
    });

    // Cart note toggle
    const noteToggle = this.querySelector('[data-cart-note-toggle]');
    noteToggle?.addEventListener('click', () => {
      const wrapper = this.querySelector('[data-cart-note-wrapper]');
      wrapper?.classList.toggle('is-open');
    });

    // Cart note save (debounced)
    const noteTextarea = this.querySelector('[data-cart-note]');
    if (noteTextarea) {
      let noteTimeout;
      noteTextarea.addEventListener('input', () => {
        clearTimeout(noteTimeout);
        noteTimeout = setTimeout(() => {
          this.updateCartNote(noteTextarea.value);
        }, 500);
      });
    }

    // Recommendation add to cart forms
    this.bindRecommendationForms();
  }

  bindRecommendationForms() {
    const recommendationForms = this.querySelectorAll('.cart-drawer-modern__recommendation-form');
    recommendationForms.forEach((form) => {
      form.addEventListener('submit', (e) => this.handleRecommendationSubmit(e, form));
    });
  }

  async handleRecommendationSubmit(e, form) {
    e.preventDefault();
    
    const submitBtn = form.querySelector('.cart-drawer-modern__recommendation-add');
    const originalText = submitBtn.textContent;
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'ADDING...';
    this.showLoading();

    try {
      const formData = new FormData(form);
      
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to add item');
      }

      const item = await response.json();
      
      // Refresh the drawer to show the new item
      await this.refreshDrawer();
      
      // Update header cart count
      const cartResponse = await fetch('/cart.js');
      const cart = await cartResponse.json();
      this.updateHeaderCartCount(cart.item_count);

    } catch (error) {
      console.error('Error adding item:', error);
      submitBtn.textContent = 'ERROR';
      setTimeout(() => {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }, 2000);
    } finally {
      this.hideLoading();
    }
  }

  setupHeaderCartIcon() {
    const cartIcon = document.querySelector('#cart-icon-bubble');
    if (!cartIcon) return;

    cartIcon.addEventListener('click', (e) => {
      e.preventDefault();
      this.open();
    });

    cartIcon.setAttribute('role', 'button');
    cartIcon.setAttribute('aria-haspopup', 'dialog');
    cartIcon.setAttribute('aria-controls', 'CartDrawerModern');
  }

  open() {
    if (this.isOpen) return;

    this.isOpen = true;
    this.classList.add('is-open');
    document.body.classList.add('cart-drawer-open');

    // Focus management
    const firstFocusable = this.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    setTimeout(() => firstFocusable?.focus(), 100);

    // Trap focus within drawer
    this.trapFocus();
  }

  close() {
    if (!this.isOpen) return;

    this.isOpen = false;
    this.classList.remove('is-open');
    document.body.classList.remove('cart-drawer-open');

    // Return focus to cart icon
    const cartIcon = document.querySelector('#cart-icon-bubble');
    cartIcon?.focus();
  }

  trapFocus() {
    const focusableElements = this.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    this.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          lastFocusable.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          firstFocusable.focus();
          e.preventDefault();
        }
      }
    });
  }

  showLoading() {
    this.loadingOverlay?.classList.add('is-visible');
    this.isUpdating = true;
  }

  hideLoading() {
    this.loadingOverlay?.classList.remove('is-visible');
    this.isUpdating = false;
  }

  async handleQuantityChange(button, change) {
    if (this.isUpdating) return;

    const line = parseInt(button.dataset.line);
    const itemEl = button.closest('[data-cart-item]');
    const input = itemEl?.querySelector('[data-quantity-input]');

    if (!input) return;

    const currentQty = parseInt(input.value);
    const newQty = Math.max(0, currentQty + change);

    input.value = newQty;

    if (newQty === 0) {
      this.removeItem(line, itemEl);
    } else {
      this.updateQuantity(line, newQty, itemEl);
    }
  }

  async handleQuantityInput(input) {
    if (this.isUpdating) return;

    const line = parseInt(input.dataset.line);
    const itemEl = input.closest('[data-cart-item]');
    const newQty = parseInt(input.value) || 0;

    if (newQty === 0) {
      this.removeItem(line, itemEl);
    } else {
      this.updateQuantity(line, newQty, itemEl);
    }
  }

  async handleRemoveItem(button) {
    if (this.isUpdating) return;

    const line = parseInt(button.dataset.line);
    const itemEl = button.closest('[data-cart-item]');

    this.removeItem(line, itemEl);
  }

  async removeItem(line, itemEl) {
    itemEl?.classList.add('is-loading');
    this.showLoading();

    try {
      const response = await fetch('/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          line: line,
          quantity: 0,
        }),
      });

      const cart = await response.json();

      // Animate item out
      if (itemEl) {
        itemEl.style.opacity = '0';
        itemEl.style.transform = 'translateX(20px)';
        setTimeout(() => {
          this.updateCartUI(cart);
        }, 200);
      } else {
        this.updateCartUI(cart);
      }

      // Update header cart icon
      this.updateHeaderCartCount(cart.item_count);
    } catch (error) {
      console.error('Error removing item:', error);
      itemEl?.classList.remove('is-loading');
    } finally {
      this.hideLoading();
    }
  }

  async updateQuantity(line, quantity, itemEl) {
    itemEl?.classList.add('is-loading');

    // Update minus button state
    const minusBtn = itemEl?.querySelector('[data-quantity-minus]');
    if (minusBtn) {
      minusBtn.disabled = quantity <= 1;
    }

    try {
      const response = await fetch('/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          line: line,
          quantity: quantity,
        }),
      });

      const cart = await response.json();
      this.updateCartUI(cart);
      this.updateHeaderCartCount(cart.item_count);
    } catch (error) {
      console.error('Error updating quantity:', error);
    } finally {
      itemEl?.classList.remove('is-loading');
    }
  }

  async updateCartNote(note) {
    try {
      await fetch('/cart/update.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ note }),
      });
    } catch (error) {
      console.error('Error updating cart note:', error);
    }
  }

  updateCartUI(cart) {
    // Update cart count in drawer
    if (this.cartCountEl) {
      this.cartCountEl.textContent = cart.item_count > 0 ? `(${cart.item_count})` : '';
    }

    // Update subtotal
    if (this.subtotalEl) {
      this.subtotalEl.textContent = this.formatMoney(cart.total_price);
    }

    // Update shipping progress
    this.updateShippingProgress(cart.total_price);

    // Handle empty cart state
    if (cart.item_count === 0) {
      this.classList.add('is-empty');
      this.refreshDrawer();
    } else {
      // Update line prices
      cart.items.forEach((item, index) => {
        const itemEl = this.querySelector(`[data-cart-item]:nth-child(${index + 1})`);
        if (itemEl) {
          const linePrice = itemEl.querySelector('[data-line-price]');
          if (linePrice) {
            linePrice.textContent = this.formatMoney(item.final_line_price);
          }
        }
      });
    }
  }

  updateShippingProgress(totalPrice) {
    if (!this.shippingProgressEl) return;

    const threshold = parseInt(this.shippingProgressEl.dataset.threshold) || 15000; // Default $150.00 in cents
    const progress = Math.min((totalPrice / threshold) * 100, 100);
    const remaining = Math.max(threshold - totalPrice, 0);

    const progressBar = this.shippingProgressEl.querySelector('.cart-drawer-modern__progress-fill');
    const textEl = this.shippingProgressEl.querySelector(
      '.cart-drawer-modern__shipping-text, .cart-drawer-modern__shipping-success'
    );

    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }

    if (textEl) {
      if (remaining > 0) {
        textEl.outerHTML = `
          <p class="cart-drawer-modern__shipping-text">
            Spend <strong>${this.formatMoney(remaining)}</strong> more for FREE shipping!
          </p>
        `;
      } else {
        textEl.outerHTML = `
          <p class="cart-drawer-modern__shipping-success">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            You've unlocked FREE shipping!
          </p>
        `;
      }
    }
  }

  updateHeaderCartCount(count) {
    const cartIcon = document.querySelector('#cart-icon-bubble');
    if (!cartIcon) return;

    const countBubble = cartIcon.querySelector('.cart-count-bubble');
    if (countBubble) {
      if (count > 0) {
        countBubble.innerHTML = `
          <span aria-hidden="true">${count < 100 ? count : '99+'}</span>
          <span class="visually-hidden">${count} items</span>
        `;
        countBubble.style.display = '';
      } else {
        countBubble.style.display = 'none';
      }
    }

    // Update cart icon (full/empty)
    const iconWrapper = cartIcon.querySelector('.svg-wrapper');
    if (iconWrapper) {
      // This would require having both icons available
      // For now, we'll just update the count
    }
  }

  formatMoney(cents) {
    // Simple money formatting - adjust for your currency
    const amount = (cents / 100).toFixed(2);
    return `$${amount}`;
  }

  async refreshDrawer() {
    try {
      const response = await fetch('/?section_id=cart-drawer');
      const html = await response.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const newDrawer = doc.querySelector('cart-drawer-modern');

      if (newDrawer) {
        this.innerHTML = newDrawer.innerHTML;
        this.bindEvents();
      }
    } catch (error) {
      console.error('Error refreshing drawer:', error);
    }
  }

  // Method to be called when items are added to cart
  async onCartUpdated() {
    await this.refreshDrawer();
    this.open();
  }
}

// Register custom element
customElements.define('cart-drawer-modern', CartDrawerModern);

// Global function to open cart drawer (can be called from product forms)
window.openCartDrawer = function () {
  const drawer = document.querySelector('cart-drawer-modern');
  if (drawer) {
    drawer.onCartUpdated();
  }
};

// Listen for cart updates from other parts of the site
document.addEventListener('cart:updated', () => {
  const drawer = document.querySelector('cart-drawer-modern');
  if (drawer) {
    drawer.onCartUpdated();
  }
});
