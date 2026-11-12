const state = {
  menu: null,
  query: '',
  diets: new Set(),
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const els = {
  search: $('#search'),
  searchClear: $('#search-clear'),
  dietFilters: $('#diet-filters'),
  picks: $('#picks'),
  picksGrid: $('#picks-grid'),
  catnav: $('#catnav'),
  menu: $('#menu'),
  empty: $('#empty'),
  clearFilters: $('#clear-filters'),
  dialog: $('#dish-dialog'),
  dialogClose: $('#dish-close'),
};

let money = null;

start();

async function start() {
  try {
    const response = await fetch('/api/menu');
    if (!response.ok) throw new Error(`The menu request failed (${response.status}).`);
    state.menu = await response.json();
    money = new Intl.NumberFormat(state.menu.currency.locale, {
      style: 'currency',
      currency: state.menu.currency.code,
      maximumFractionDigits: 0,
    });
    paintPage();
    bindControls();
    render();
  } catch (error) {
    renderError(error.message);
  }
}

/* ------------------------------------------------------------------ text */

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
  });
}

function tagBadges(item) {
  if (!item.tags?.length) return '';
  const badges = item.tags
    .map((tag) => {
      const label = state.menu.dietLabels[tag] ?? tag;
      const text = tag === 'spicy' ? '🌶' : label === 'Vegan' ? 'VG' : label === 'Gluten-free' ? 'GF' : 'V';
      return `<span class="badge badge--${tag}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${text}</span>`;
    })
    .join('');
  return ` <span class="badges">${badges}</span>`;
}

function tagList(item) {
  return (item.tags ?? [])
    .map((tag) => {
      const label = state.menu.dietLabels[tag] ?? tag;
      return `<li class="tag tag--${tag}">${escapeHtml(label)}</li>`;
    })
    .join('');
}

/* --------------------------------------------------------------- filtering */

function matches(item) {
  const query = state.query.trim().toLowerCase();
  const category = state.menu.categories.find((entry) => entry.id === item.category);

  const haystack = `${item.name} ${item.description} ${category?.name ?? ''}`.toLowerCase();
  if (query && !haystack.includes(query)) return false;

  for (const diet of state.diets) {
    if (!item.tags?.includes(diet)) return false;
  }

  return true;
}

function visibleItems() {
  return state.menu.items.filter(matches);
}

/* ----------------------------------------------------------------- render */

function paintPage() {
  const { restaurant, currency } = state.menu;
  document.title = `${restaurant.name} — Menu`;

  $$('[data-restaurant-name]').forEach((node) => {
    node.textContent = restaurant.name;
  });
  $('[data-tagline]').textContent = restaurant.tagline;
  $('[data-hours]').textContent = restaurant.hours;
  $('[data-address]').textContent = restaurant.address;
  $('[data-currency-code]').textContent = currency.code;
  $('[data-service-note]').textContent = restaurant.serviceNote;
  $('[data-allergen-note]').textContent = restaurant.allergenNote;
  $('[data-kitchen-note]').textContent = restaurant.kitchenNote;

  const phone = $('[data-phone]');
  phone.textContent = restaurant.phone;
  phone.href = `tel:${restaurant.phone.replace(/[^\d+]/g, '')}`;

  els.dietFilters.innerHTML = Object.entries(state.menu.dietLabels)
    .filter(([tag]) => tag !== 'spicy')
    .map(
      ([tag, label]) =>
        `<button class="chip" type="button" data-diet="${tag}" aria-pressed="false">${escapeHtml(label)}</button>`,
    )
    .join('');
}

function render() {
  const items = visibleItems();
  renderPicks(items);
  renderMenu(items);

  const isEmpty = items.length === 0;
  els.empty.hidden = !isEmpty;
  els.catnav.hidden = isEmpty;
}

function renderPicks(items) {
  const featured = items.filter((item) => item.featured);
  els.picks.hidden = featured.length === 0;
  els.picksGrid.innerHTML = featured
    .map(
      (item) => `
        <button class="pick" type="button" data-item="${item.id}">
          <span class="pick__category">${escapeHtml(categoryName(item.category))}</span>
          <span class="pick__name">${escapeHtml(item.name)}</span>
          <span class="pick__price">${money.format(item.price)}</span>
        </button>`,
    )
    .join('');
}

function renderMenu(items) {
  const sections = state.menu.categories
    .map((category) => {
      const forCategory = items.filter((item) => item.category === category.id);
      if (forCategory.length === 0) return '';
      return `
        <section class="course" id="cat-${category.id}" aria-labelledby="cat-${category.id}-title">
          <header class="course__head">
            <h2 class="course__title" id="cat-${category.id}-title">${escapeHtml(category.name)}</h2>
            <p class="course__blurb">${escapeHtml(category.blurb)}</p>
          </header>
          ${forCategory.map(dishMarkup).join('')}
        </section>`;
    })
    .join('');

  els.menu.innerHTML = sections;
  els.catnav.innerHTML = state.menu.categories
    .filter((category) => items.some((item) => item.category === category.id))
    .map(
      (category, index) =>
        `<a class="catnav__link${index === 0 ? ' is-active' : ''}" href="#cat-${category.id}">${escapeHtml(category.name)}</a>`,
    )
    .join('');
}

function dishMarkup(item) {
  return `
    <article class="dish" data-dish="${item.id}">
      <div class="dish__top">
        <h3 class="dish__name">${escapeHtml(item.name)}${tagBadges(item)}</h3>
        <span class="dish__leader" aria-hidden="true"></span>
        <span class="dish__price">${money.format(item.price)}</span>
      </div>
      <p class="dish__desc">${escapeHtml(item.description)}</p>
      <button class="dish__open" type="button" data-item="${item.id}">
        <span class="sr-only">About the ${escapeHtml(item.name)}</span>
      </button>
    </article>`;
}

function categoryName(id) {
  return state.menu.categories.find((category) => category.id === id)?.name ?? '';
}

/* ---------------------------------------------------------------- actions */

function bindControls() {
  els.search.addEventListener('input', () => {
    state.query = els.search.value;
    els.searchClear.hidden = state.query.length === 0;
    render();
  });

  els.searchClear.addEventListener('click', () => {
    els.search.value = '';
    state.query = '';
    els.searchClear.hidden = true;
    render();
    els.search.focus();
  });

  els.dietFilters.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-diet]');
    if (!chip) return;
    const diet = chip.dataset.diet;
    if (state.diets.has(diet)) state.diets.delete(diet);
    else state.diets.add(diet);

    const pressed = state.diets.has(diet);
    chip.setAttribute('aria-pressed', String(pressed));
    chip.classList.toggle('is-on', pressed);
    render();
  });

  els.clearFilters.addEventListener('click', () => {
    state.diets.clear();
    state.query = '';
    els.search.value = '';
    els.searchClear.hidden = true;
    $$('[data-diet]').forEach((chip) => {
      chip.setAttribute('aria-pressed', 'false');
      chip.classList.remove('is-on');
    });
    render();
  });

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-item]');
    if (trigger) openDish(trigger.dataset.item);
  });

  els.dialogClose.addEventListener('click', () => els.dialog.close());
  els.dialog.addEventListener('click', (event) => {
    if (event.target === els.dialog) els.dialog.close();
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          $$('.catnav__link').forEach((link) => {
            link.classList.toggle('is-active', link.getAttribute('href') === `#${entry.target.id}`);
          });
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );

    const watch = () => $$('.course').forEach((section) => observer.observe(section));
    new MutationObserver(watch).observe(els.menu, { childList: true });
    watch();
  }
}

function openDish(id) {
  const item = state.menu.items.find((entry) => entry.id === id);
  if (!item) return;

  $('#dish-category').textContent = categoryName(item.category);
  $('#dish-name').textContent = item.name;
  $('#dish-price').textContent = money.format(item.price);
  $('#dish-desc').textContent = item.description;
  $('#dish-tags').innerHTML = tagList(item);

  els.dialog.showModal();
}

function renderError(message) {
  els.catnav.hidden = true;
  els.picks.hidden = true;
  els.menu.innerHTML = `
    <div class="notice">
      <p class="notice__title">The menu is taking a moment.</p>
      <p class="notice__body">${escapeHtml(message)}</p>
      <button class="btn" type="button" id="retry">Try again</button>
    </div>`;
  $('#retry').addEventListener('click', () => {
    els.menu.innerHTML = '';
    start();
  });
}
