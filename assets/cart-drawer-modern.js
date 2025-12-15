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
    this.eventsBound = false;

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
    // Re-query and rebind non-delegated events
    this.rebindNonDelegatedEvents();

    // Check empty state
    const itemsForm = this.querySelector('#CartDrawerModernForm');
    if (!itemsForm || itemsForm.querySelectorAll('[data-cart-item]').length === 0) {
      this.classList.add('is-empty');
    } else {
      this.classList.remove('is-empty');
    }
  }

  bindEvents() {
    // Prevent duplicate event binding for delegated events
    if (this.eventsBound) {
      // Only rebind non-delegated events after refresh
      this.rebindNonDelegatedEvents();
      return;
    }
    this.eventsBound = true;

    // Close drawer events (non-delegated, will be rebound)
    this.rebindNonDelegatedEvents();

    // Escape key to close (only bind once)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Quantity buttons - delegated event (only bind once)
    this.addEventListener('click', (e) => {
      const minusBtn = e.target.closest('[data-quantity-minus]');
      const plusBtn = e.target.closest('[data-quantity-plus]');
      const removeBtn = e.target.closest('[data-remove-item]');

      if (minusBtn) {
        e.preventDefault();
        this.handleQuantityChange(minusBtn, -1);
      } else if (plusBtn) {
        e.preventDefault();
        this.handleQuantityChange(plusBtn, 1);
      } else if (removeBtn) {
        e.preventDefault();
        this.handleRemoveItem(removeBtn);
      }
    });

    // Quantity input change - delegated event (only bind once)
    this.addEventListener('change', (e) => {
      if (e.target.matches('[data-quantity-input]')) {
        this.handleQuantityInput(e.target);
      }
    });

    // Cart note toggle - delegated
    this.addEventListener('click', (e) => {
      const noteToggle = e.target.closest('[data-cart-note-toggle]');
      if (noteToggle) {
        const wrapper = this.querySelector('[data-cart-note-wrapper]');
        wrapper?.classList.toggle('is-open');
      }
    });

    // Cart note save (delegated with debounce)
    let noteTimeout;
    this.addEventListener('input', (e) => {
      if (e.target.matches('[data-cart-note]')) {
        clearTimeout(noteTimeout);
        noteTimeout = setTimeout(() => {
          this.updateCartNote(e.target.value);
        }, 500);
      }
    });

    // Recommendation forms - delegated
    this.addEventListener('submit', (e) => {
      const form = e.target.closest('.cart-drawer-modern__recommendation-form');
      if (form) {
        this.handleRecommendationSubmit(e, form);
      }
    });
  }

  rebindNonDelegatedEvents() {
    // Re-query elements
    this.overlay = this.querySelector('[data-cart-drawer-overlay]');
    this.closeButtons = this.querySelectorAll('[data-cart-drawer-close]');
    this.loadingOverlay = this.querySelector('[data-cart-loading]');
    this.itemsContainer = this.querySelector('[data-cart-items]');
    this.cartCountEl = this.querySelector('[data-cart-count]');
    this.subtotalEl = this.querySelector('[data-cart-subtotal]');
    this.shippingProgressEl = this.querySelector('[data-shipping-progress]');

    // Close button events
    this.closeButtons.forEach((btn) => {
      btn.addEventListener('click', () => this.close());
    });

    // Overlay click
    this.overlay?.addEventListener('click', () => this.close());
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
        body: formData,
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

    // Prevent the change event from also firing when we update the input
    input.dataset.skipChange = 'true';

    const currentQty = parseInt(input.value);
    const newQty = Math.max(0, currentQty + change);

    input.value = newQty;

    // Clear the flag after a short delay
    setTimeout(() => {
      delete input.dataset.skipChange;
    }, 100);

    if (newQty === 0) {
      this.removeItem(line, itemEl);
    } else {
      this.updateQuantity(line, newQty, itemEl);
    }
  }

  async handleQuantityInput(input) {
    if (this.isUpdating) return;

    // Skip if this change was triggered by a button click
    if (input.dataset.skipChange === 'true') {
      return;
    }

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
    this.showLoading();
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
      this.hideLoading();
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
    // Re-query the element in case DOM was updated
    this.shippingProgressEl = this.querySelector('[data-shipping-progress]');

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
    // Use store's money format from data attribute
    const moneyFormat = this.dataset.moneyFormat || '{{amount}}';
    const currencyCode = this.dataset.currencyCode || '';
    const amount = (cents / 100).toFixed(2);

    // Replace Shopify money format placeholders
    let formatted = moneyFormat
      .replace('{{amount}}', amount)
      .replace('{{amount_no_decimals}}', Math.round(cents / 100))
      .replace('{{amount_with_comma_separator}}', amount.replace('.', ','))
      .replace(
        '{{amount_no_decimals_with_comma_separator}}',
        Math.round(cents / 100)
          .toString()
          .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      );

    // Remove trailing currency code (e.g., " MYR", " USD")
    if (currencyCode) {
      formatted = formatted.replace(new RegExp('\\s*' + currencyCode + '\\s*$', 'i'), '');
    }

    return formatted;
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

// Recently Viewed Products - Load from localStorage
function loadRecentlyViewedProducts() {
  const recentlyViewedContainer = document.getElementById('cart-recently-viewed');
  const recommendationsList = document.getElementById('cart-recommendations');
  const cartDrawer = document.querySelector('cart-drawer-modern');

  if (!recentlyViewedContainer || !recommendationsList) return;

  // Get recently viewed products from localStorage
  const recentlyViewed = JSON.parse(localStorage.getItem('recently_viewed_products') || '[]');

  let productsToShow = [];

  // Use recently viewed if available, otherwise use fallback collection
  if (recentlyViewed.length > 0) {
    productsToShow = recentlyViewed.slice(0, 4);
  } else if (cartDrawer && cartDrawer.dataset.fallbackProducts) {
    // Use fallback collection products
    try {
      const fallbackProducts = JSON.parse(cartDrawer.dataset.fallbackProducts);
      productsToShow = fallbackProducts.slice(0, 4);
    } catch (e) {
      console.error('Error parsing fallback products:', e);
    }
  }

  // Hide container if no products to show
  if (productsToShow.length === 0) {
    recentlyViewedContainer.style.display = 'none';
    return;
  }

  // Show the container
  recentlyViewedContainer.style.display = 'block';

  // Build HTML for each product with variant and quantity info
  const html = productsToShow
    .map((product) => {
      const quantity = product.quantity || 1;
      const variantInfo =
        product.variantTitle && product.variantTitle !== 'Default Title'
          ? `<span class="cart-drawer-modern__recommendation-variant">${product.variantTitle}</span>`
          : '';
      const quantityInfo =
        quantity > 1 ? `<span class="cart-drawer-modern__recommendation-quantity">Qty: ${quantity}</span>` : '';

      return `
    <div class="cart-drawer-modern__recommendation-item">
      <a href="${product.url}" class="cart-drawer-modern__recommendation-image-link">
        <img 
          src="${product.image}"
          alt="${product.title}"
          class="cart-drawer-modern__recommendation-image"
          loading="lazy"
          width="100"
          height="100"
        >
      </a>
      <div class="cart-drawer-modern__recommendation-details">
        <a href="${product.url}" class="cart-drawer-modern__recommendation-title">
          ${product.title}
        </a>
        ${variantInfo}
        <p class="cart-drawer-modern__recommendation-price">
          ${product.price}${quantityInfo ? ` × ${quantity}` : ''}
        </p>
      </div>
      <form class="cart-drawer-modern__recommendation-form" action="/cart/add" method="post">
        <input type="hidden" name="id" value="${product.variantId}">
        <input type="hidden" name="quantity" value="${quantity}">
        <button 
          type="submit" 
          name="add" 
          class="cart-drawer-modern__recommendation-add"
          ${!product.available ? 'disabled' : ''}
        >
          ${product.available ? 'ADD' : 'SOLD OUT'}
        </button>
      </form>
    </div>
  `;
    })
    .join('');

  recommendationsList.innerHTML = html;
}

// Run when DOM is loaded
document.addEventListener('DOMContentLoaded', loadRecentlyViewedProducts);

// Track product views - call this on product pages
window.trackProductView = function (productData) {
  const recentlyViewed = JSON.parse(localStorage.getItem('recently_viewed_products') || '[]');

  // Remove if already exists
  const filtered = recentlyViewed.filter((p) => p.id !== productData.id);

  // Add to beginning
  filtered.unshift(productData);

  // Keep only last 10
  const trimmed = filtered.slice(0, 10);

  localStorage.setItem('recently_viewed_products', JSON.stringify(trimmed));
};
