const $ = (id) => document.getElementById(id);
const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const ADDRESS_FIELDS = [
  ['firstName', 'First name'],
  ['lastName', 'Last name'],
  ['company', 'Company'],
  ['address1', 'Address 1'],
  ['address2', 'Address 2'],
  ['city', 'City'],
  ['province', 'Province / state'],
  ['postalCode', 'Postal code'],
  ['countryCode', 'Country code (ISO-3166)'],
  ['phone', 'Phone'],
  ['customerId', 'Customer id'],
];

const state = {
  cartId: null,
  cart: null,
  catalog: [],
  shippingOptions: [],
  creditSources: [],
  carts: [],
  activeTab: 'items',
  cartFilter: 'all',
  regionFilter: '',
  customerFilter: '',
};

// ---------- HTTP ----------

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = data?.error;
    const msg = err
      ? `${err.code}${err.field ? ` (${err.field})` : ''}: ${err.message}`
      : `HTTP ${res.status}`;
    toast(msg, true);
    const e = new Error(msg);
    e.payload = err;
    throw e;
  }
  return data;
}

function toast(msg, isError = false) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  t.classList.toggle('bg-red-600', isError);
  t.classList.toggle('bg-emerald-600', !isError);
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 3000);
}

// ---------- Helpers ----------

function fmt(amount, ccy) {
  if (amount == null || Number.isNaN(amount)) return '—';
  const code = (ccy ?? 'EUR').toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${code}`;
  }
}

function shortDate(s) {
  if (!s) return '—';
  try {
    const d = new Date(s);
    return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return s;
  }
}

function collectForm(root) {
  const out = {};
  qsa('[data-field]', root).forEach((el) => {
    const f = el.dataset.field;
    if (el.type === 'checkbox') out[f] = el.checked;
    else if (el.type === 'number') out[f] = el.value === '' ? undefined : Number(el.value);
    else out[f] = el.value === '' ? undefined : el.value;
  });
  return out;
}

function fillForm(root, data) {
  qsa('[data-field]', root).forEach((el) => {
    const v = data?.[el.dataset.field];
    if (el.type === 'checkbox') el.checked = !!v;
    else el.value = v == null ? '' : v;
  });
}

function clearForm(root) {
  qsa('[data-field]', root).forEach((el) => {
    if (el.type === 'checkbox') el.checked = el.defaultChecked;
    else el.value = '';
  });
}

function safeJson(s) {
  if (!s || !s.trim()) return undefined;
  try {
    return JSON.parse(s);
  } catch {
    return s; // pass through; backend stores as text
  }
}

// ---------- Reference data ----------

async function loadCatalog() {
  state.catalog = await api('GET', '/queries/product-catalog');
  renderCatalog();
}

async function loadShippingOptions() {
  const q = state.regionFilter ? `?regionId=${encodeURIComponent(state.regionFilter)}` : '';
  state.shippingOptions = await api('GET', `/queries/shipping-options${q}`);
  renderShippingOptionPicker();
}

async function loadCreditSources() {
  const q = state.customerFilter ? `?customerId=${encodeURIComponent(state.customerFilter)}` : '';
  state.creditSources = await api('GET', `/queries/credit-sources${q}`);
  renderCreditSourcePicker();
}

// ---------- Catalog render ----------

function renderCatalog() {
  const ul = $('catalog');
  ul.innerHTML = '';
  for (const p of state.catalog) {
    const li = document.createElement('li');
    li.className = 'flex items-center gap-2 p-2 border border-slate-100 rounded hover:bg-slate-50';
    li.innerHTML = `
      <img src="${p.thumbnail ?? ''}" class="w-10 h-10 object-cover rounded bg-slate-200" />
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium truncate">${p.name}</div>
        <div class="text-xs text-slate-500 truncate">${p.variantSku ?? ''} · ${fmt(p.unitPrice ?? p.price, p.currencyCode)}</div>
        ${p.inStock ? '' : '<div class="text-xs text-amber-600">out of stock</div>'}
      </div>
      <button class="bg-slate-900 text-white text-xs px-2 py-1 rounded hover:bg-slate-700 disabled:opacity-30"
              ${state.cartId && p.inStock ? '' : 'disabled'}>Add</button>
    `;
    li.querySelector('button').addEventListener('click', () => addCatalogItem(p));
    ul.appendChild(li);
  }
}

function renderShippingOptionPicker() {
  const sel = $('shipping-option');
  if (!sel) return;
  sel.innerHTML = state.shippingOptions
    .map(
      (o) =>
        `<option value="${o.id}">${o.name} — ${fmt(o.amount, o.currencyCode)}${
          o.providerName ? ` · ${o.providerName}` : ''
        }</option>`,
    )
    .join('');
}

function renderCreditSourcePicker() {
  const sel = $('credit-source');
  if (!sel) return;
  if (state.creditSources.length === 0) {
    sel.innerHTML = '<option value="">No matching sources</option>';
    return;
  }
  sel.innerHTML = state.creditSources
    .map(
      (c) =>
        `<option value="${c.id}">${c.reference}: ${c.referenceId} — ${fmt(c.amount, c.currencyCode)} (${c.customerId ?? 'any'})</option>`,
    )
    .join('');
}

// ---------- Cart load/render ----------

async function refreshCart() {
  if (!state.cartId) {
    state.cart = null;
    renderCart();
    return;
  }
  try {
    state.cart = await api('GET', `/queries/cart/${state.cartId}?includeDeleted=true`);
  } catch (e) {
    state.cartId = null;
    state.cart = null;
  }
  renderCart();
}

function renderCart() {
  const has = !!state.cart;
  $('cart-empty').classList.toggle('hidden', has);
  $('cart-meta').classList.toggle('hidden', !has);
  $('tab-bar').classList.toggle('hidden', !has);
  $('totals-bar').classList.toggle('hidden', !has);
  qsa('[data-tab-content]').forEach((el) => el.classList.toggle('hidden', !has));
  if (!has) {
    renderCatalog();
    return;
  }

  // Header
  $('active-cart-id').textContent = state.cart.id;
  $('active-cart-ccy').textContent = state.cart.currencyCode;
  $('active-cart-status').innerHTML = state.cart.deletedAt
    ? `<span class="text-red-600">deleted</span>`
    : `<span class="text-emerald-600">active</span>`;
  $('active-cart-created').textContent = shortDate(state.cart.createdAt);
  $('active-cart-updated').textContent = shortDate(state.cart.updatedAt);
  $('btn-restore-cart').classList.toggle('hidden', !state.cart.deletedAt);
  $('btn-delete-cart').classList.toggle('hidden', !!state.cart.deletedAt);

  selectTab(state.activeTab);
  renderItems();
  renderAddresses();
  renderShipping();
  renderCredits();
  renderTax();
  renderSettings();
  renderRaw();
  renderTotals();
  renderCatalog();
}

function selectTab(name) {
  state.activeTab = name;
  qsa('#tab-bar button').forEach((b) => {
    const active = b.dataset.tab === name;
    b.classList.toggle('border-slate-900', active);
    b.classList.toggle('font-medium', active);
    b.classList.toggle('border-transparent', !active);
    b.classList.toggle('text-slate-500', !active);
  });
  qsa('[data-tab-content]').forEach((el) => {
    el.classList.toggle('hidden', el.id !== `tab-${name}`);
  });
}

// ---------- Items tab ----------

function renderItems() {
  const ul = $('line-items');
  ul.innerHTML = '';
  if (state.cart.lineItems.length === 0) {
    ul.innerHTML = '<li class="text-sm text-slate-400 py-2">No items.</li>';
    return;
  }
  for (const li of state.cart.lineItems) {
    const row = document.createElement('li');
    row.className = 'py-2';
    const snapshot = [li.variantSku, li.variantTitle, li.productTitle].filter(Boolean).join(' · ');
    row.innerHTML = `
      <div class="flex items-center gap-3">
        <img src="${li.thumbnail ?? ''}" class="w-12 h-12 object-cover rounded bg-slate-200" />
        <div class="flex-1 min-w-0">
          <input class="font-medium text-sm w-full bg-transparent" data-edit="title" value="${li.title}" />
          <div class="text-xs text-slate-500 truncate">${snapshot || '—'}</div>
        </div>
        <input type="number" min="1" value="${li.quantity}" data-edit="quantity" class="w-14 border border-slate-300 rounded px-2 py-1 text-sm" />
        <input type="number" step="0.01" value="${li.unitPrice}" data-edit="unitPrice" class="w-20 border border-slate-300 rounded px-2 py-1 text-sm" />
        <button class="bg-slate-900 text-white text-xs px-2 py-1 rounded save">Save</button>
        <button class="text-red-600 text-xs hover:underline rm">Remove</button>
      </div>
      <div class="text-xs text-slate-400 ml-15 mt-1 font-mono">${li.id}</div>
    `;
    const get = (k) => row.querySelector(`[data-edit="${k}"]`).value;
    row.querySelector('.save').addEventListener('click', async () => {
      const patch = { id: li.id, title: get('title'), quantity: Number(get('quantity')), unitPrice: Number(get('unitPrice')) };
      await api('POST', '/commands/line-item/update', { id: state.cartId, lineItems: [patch] });
      toast('Line item updated');
      await refreshCart();
    });
    row.querySelector('.rm').addEventListener('click', async () => {
      await api('POST', '/commands/line-item/remove', { id: state.cartId, lineItems: [{ id: li.id }] });
      toast('Line item removed');
      await refreshCart();
    });
    ul.appendChild(row);
  }
}

async function addCatalogItem(p) {
  if (!state.cartId) return;
  await api('POST', '/commands/line-item/add', {
    id: state.cartId,
    lineItems: [
      {
        title: p.name,
        quantity: 1,
        unitPrice: p.unitPrice ?? p.price,
        thumbnail: p.thumbnail,
        productId: p.productId,
        variantId: p.variantId,
        productTitle: p.productTitle,
        variantTitle: p.variantTitle,
        variantSku: p.variantSku,
      },
    ],
  });
  toast(`Added ${p.name}`);
  await refreshCart();
}

async function addCustomLineItem() {
  const data = collectForm($('custom-li-form'));
  if (!data.title || !data.quantity || data.unitPrice == null) {
    toast('title, quantity and unitPrice are required', true);
    return;
  }
  await api('POST', '/commands/line-item/add', { id: state.cartId, lineItems: [data] });
  clearForm($('custom-li-form'));
  toast('Line item added');
  await refreshCart();
}

// ---------- Addresses tab ----------

function buildAddressForm(formEl, kind) {
  formEl.innerHTML = '';
  for (const [key, label] of ADDRESS_FIELDS) {
    const div = document.createElement('div');
    div.innerHTML = `
      <label class="text-xs text-slate-500">${label}</label>
      <input data-field="${key}" class="w-full border rounded px-2 py-1" />
    `;
    formEl.appendChild(div);
  }
  const btn = document.createElement('button');
  btn.type = 'submit';
  btn.className = 'mt-2 w-full bg-slate-900 text-white text-sm px-3 py-2 rounded hover:bg-slate-700';
  btn.textContent = `Save ${kind} address`;
  formEl.appendChild(btn);
  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = collectForm(formEl);
    const payload = { id: state.cartId };
    if (kind === 'shipping') payload.shippingAddress = data;
    else payload.billingAddress = data;
    await api('POST', `/commands/cart/set-${kind}-address`, payload);
    toast(`${kind} address saved`);
    await refreshCart();
  });
}

function renderAddresses() {
  fillForm($('form-shipping-address'), state.cart.shippingAddress ?? {});
  fillForm($('form-billing-address'), state.cart.billingAddress ?? {});
}

// ---------- Shipping tab ----------

function renderShipping() {
  const ul = $('shipping-methods');
  ul.innerHTML = '';
  if (state.cart.shippingMethods.length === 0) {
    ul.innerHTML = '<li class="text-sm text-slate-400">No shipping methods.</li>';
    return;
  }
  for (const sm of state.cart.shippingMethods) {
    const li = document.createElement('li');
    li.className = 'border border-slate-200 rounded p-2 flex items-center justify-between text-sm';
    li.innerHTML = `
      <div>
        <div class="font-medium">${sm.name} · ${fmt(sm.amount, state.cart.currencyCode)}</div>
        <div class="text-xs text-slate-400 font-mono">${sm.id}${sm.shippingOptionId ? ` · ${sm.shippingOptionId}` : ''}</div>
        <div class="text-xs text-slate-500">${sm.taxLines.length} tax line(s) · ${sm.adjustments.length} adjustment(s)</div>
      </div>
      <button class="text-red-600 text-xs hover:underline">Remove</button>
    `;
    li.querySelector('button').addEventListener('click', async () => {
      await api('POST', '/commands/shipping-method/remove', {
        id: state.cartId,
        shippingMethods: [{ id: sm.id }],
      });
      toast('Shipping method removed');
      await refreshCart();
    });
    ul.appendChild(li);
  }
}

async function addShippingFromOption() {
  const optId = $('shipping-option').value;
  const opt = state.shippingOptions.find((o) => o.id === optId);
  if (!opt) return;
  await api('POST', '/commands/shipping-method/add', {
    id: state.cartId,
    shippingMethods: [
      { name: opt.name, amount: opt.amount, shippingOptionId: opt.id },
    ],
  });
  toast(`Added ${opt.name}`);
  await refreshCart();
}

async function addCustomShipping() {
  const data = collectForm($('custom-sm-form'));
  if (!data.name || data.amount == null) {
    toast('name and amount are required', true);
    return;
  }
  await api('POST', '/commands/shipping-method/add', { id: state.cartId, shippingMethods: [data] });
  clearForm($('custom-sm-form'));
  toast('Shipping method added');
  await refreshCart();
}

// ---------- Credits tab ----------

function renderCredits() {
  const ul = $('credit-lines');
  ul.innerHTML = '';
  if (state.cart.creditLines.length === 0) {
    ul.innerHTML = '<li class="text-sm text-slate-400">No credit lines.</li>';
    return;
  }
  for (const c of state.cart.creditLines) {
    const li = document.createElement('li');
    li.className = 'border border-slate-200 rounded p-2 flex items-center justify-between text-sm';
    li.innerHTML = `
      <div>
        <div class="font-medium">${c.reference ?? '—'}: ${c.referenceId ?? '—'}</div>
        <div class="text-xs text-slate-400 font-mono">${c.id}</div>
        <div class="text-emerald-700 text-sm">${fmt(c.amount, state.cart.currencyCode)}</div>
      </div>
      <button class="text-red-600 text-xs hover:underline">Remove</button>
    `;
    li.querySelector('button').addEventListener('click', async () => {
      await api('POST', '/commands/credit-line/remove', {
        id: state.cartId,
        creditLines: [{ id: c.id }],
      });
      toast('Credit line removed');
      await refreshCart();
    });
    ul.appendChild(li);
  }
}

async function addCreditFromSource() {
  const id = $('credit-source').value;
  const src = state.creditSources.find((c) => c.id === id);
  if (!src) return;
  await api('POST', '/commands/credit-line/add', {
    id: state.cartId,
    creditLines: [{ amount: src.amount, reference: src.reference, referenceId: src.referenceId }],
  });
  toast('Credit line added');
  await refreshCart();
}

async function addCustomCredit() {
  const data = collectForm($('custom-cl-form'));
  if (data.amount == null) {
    toast('amount is required', true);
    return;
  }
  await api('POST', '/commands/credit-line/add', { id: state.cartId, creditLines: [data] });
  clearForm($('custom-cl-form'));
  toast('Credit line added');
  await refreshCart();
}

// ---------- Tax & Discounts tab ----------

function buildTaxRowEditor(rows, kind) {
  // kind: 'tax' or 'adj'
  const wrap = document.createElement('div');
  wrap.className = 'space-y-1';

  function addRow(initial = {}) {
    const row = document.createElement('div');
    row.className = 'flex flex-wrap items-center gap-1 text-xs';
    row.dataset.entryId = initial.id ?? '';
    if (kind === 'tax') {
      row.innerHTML = `
        <input data-f="code" placeholder="code (e.g. VAT)" value="${initial.code ?? ''}" class="border rounded px-1.5 py-0.5 w-24" />
        <input data-f="rate" type="number" step="0.01" placeholder="rate %" value="${initial.rate ?? ''}" class="border rounded px-1.5 py-0.5 w-20" />
        <input data-f="description" placeholder="description" value="${initial.description ?? ''}" class="border rounded px-1.5 py-0.5 flex-1" />
        <input data-f="providerId" placeholder="providerId" value="${initial.providerId ?? ''}" class="border rounded px-1.5 py-0.5 w-24" />
        <button class="text-red-600 hover:underline">×</button>
      `;
    } else {
      row.innerHTML = `
        <input data-f="amount" type="number" step="0.01" placeholder="amount" value="${initial.amount ?? ''}" class="border rounded px-1.5 py-0.5 w-20" />
        <input data-f="code" placeholder="code (e.g. SUMMER10)" value="${initial.code ?? ''}" class="border rounded px-1.5 py-0.5 w-32" />
        <input data-f="description" placeholder="description" value="${initial.description ?? ''}" class="border rounded px-1.5 py-0.5 flex-1" />
        <input data-f="promotionId" placeholder="promotionId" value="${initial.promotionId ?? ''}" class="border rounded px-1.5 py-0.5 w-24" />
        <button class="text-red-600 hover:underline">×</button>
      `;
    }
    row.querySelector('button').addEventListener('click', (e) => {
      e.preventDefault();
      row.remove();
    });
    wrap.appendChild(row);
  }

  rows.forEach(addRow);

  const addBtn = document.createElement('button');
  addBtn.className = 'text-xs text-blue-600 hover:underline';
  addBtn.textContent = '+ Add row';
  addBtn.addEventListener('click', (e) => {
    e.preventDefault();
    addRow({});
  });

  return { wrap, addBtn };
}

function readEditorRows(wrap) {
  return qsa(':scope > div', wrap).map((row) => {
    const out = {};
    if (row.dataset.entryId) out.id = row.dataset.entryId;
    qsa('[data-f]', row).forEach((inp) => {
      const f = inp.dataset.f;
      const v = inp.value;
      if (v === '') return;
      if (inp.type === 'number') out[f] = Number(v);
      else out[f] = v;
    });
    return out;
  });
}

function renderTax() {
  // Line items
  const liWrap = $('li-tax-list');
  liWrap.innerHTML = '';
  if (state.cart.lineItems.length === 0) {
    liWrap.innerHTML = '<div class="text-sm text-slate-400">No line items yet.</div>';
  }
  for (const li of state.cart.lineItems) {
    const card = document.createElement('div');
    card.className = 'border border-slate-200 rounded p-3';
    card.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <div>
          <div class="text-sm font-medium">${li.title}</div>
          <div class="text-xs text-slate-400 font-mono">${li.id}</div>
        </div>
        <div class="text-xs text-slate-500">qty ${li.quantity} · ${fmt(li.unitPrice, state.cart.currencyCode)}</div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <div class="text-xs font-semibold uppercase text-slate-500 mb-1">Tax lines</div>
          <div data-tax-editor></div>
          <div class="flex items-center gap-2 mt-1"><span data-add-row></span><button data-save-tax class="text-xs bg-slate-900 text-white px-2 py-0.5 rounded">Save tax lines</button></div>
        </div>
        <div>
          <div class="text-xs font-semibold uppercase text-slate-500 mb-1">Adjustments</div>
          <div data-adj-editor></div>
          <div class="flex items-center gap-2 mt-1"><span data-add-adj></span><button data-save-adj class="text-xs bg-slate-900 text-white px-2 py-0.5 rounded">Save adjustments</button></div>
        </div>
      </div>
    `;

    const taxEd = buildTaxRowEditor(li.taxLines, 'tax');
    card.querySelector('[data-tax-editor]').appendChild(taxEd.wrap);
    card.querySelector('[data-add-row]').appendChild(taxEd.addBtn);
    card.querySelector('[data-save-tax]').addEventListener('click', async () => {
      const taxLines = readEditorRows(taxEd.wrap);
      await api('POST', '/commands/line-item/set-tax-lines', {
        id: state.cartId,
        lineItems: [{ id: li.id, taxLines }],
      });
      toast('Tax lines saved');
      await refreshCart();
    });

    const adjEd = buildTaxRowEditor(li.adjustments, 'adj');
    card.querySelector('[data-adj-editor]').appendChild(adjEd.wrap);
    card.querySelector('[data-add-adj]').appendChild(adjEd.addBtn);
    card.querySelector('[data-save-adj]').addEventListener('click', async () => {
      const adjustments = readEditorRows(adjEd.wrap);
      await api('POST', '/commands/line-item/set-adjustments', {
        id: state.cartId,
        lineItems: [{ id: li.id, adjustments }],
      });
      toast('Adjustments saved');
      await refreshCart();
    });

    liWrap.appendChild(card);
  }

  // Shipping methods
  const smWrap = $('sm-tax-list');
  smWrap.innerHTML = '';
  if (state.cart.shippingMethods.length === 0) {
    smWrap.innerHTML = '<div class="text-sm text-slate-400">No shipping methods yet.</div>';
  }
  for (const sm of state.cart.shippingMethods) {
    const card = document.createElement('div');
    card.className = 'border border-slate-200 rounded p-3';
    card.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <div>
          <div class="text-sm font-medium">${sm.name}</div>
          <div class="text-xs text-slate-400 font-mono">${sm.id}</div>
        </div>
        <div class="text-xs text-slate-500">${fmt(sm.amount, state.cart.currencyCode)}</div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <div class="text-xs font-semibold uppercase text-slate-500 mb-1">Tax lines</div>
          <div data-tax-editor></div>
          <div class="flex items-center gap-2 mt-1"><span data-add-row></span><button data-save-tax class="text-xs bg-slate-900 text-white px-2 py-0.5 rounded">Save tax lines</button></div>
        </div>
        <div>
          <div class="text-xs font-semibold uppercase text-slate-500 mb-1">Adjustments</div>
          <div data-adj-editor></div>
          <div class="flex items-center gap-2 mt-1"><span data-add-adj></span><button data-save-adj class="text-xs bg-slate-900 text-white px-2 py-0.5 rounded">Save adjustments</button></div>
        </div>
      </div>
    `;

    const taxEd = buildTaxRowEditor(sm.taxLines, 'tax');
    card.querySelector('[data-tax-editor]').appendChild(taxEd.wrap);
    card.querySelector('[data-add-row]').appendChild(taxEd.addBtn);
    card.querySelector('[data-save-tax]').addEventListener('click', async () => {
      const taxLines = readEditorRows(taxEd.wrap);
      await api('POST', '/commands/shipping-method/set-tax-lines', {
        id: state.cartId,
        shippingMethods: [{ id: sm.id, taxLines }],
      });
      toast('Tax lines saved');
      await refreshCart();
    });

    const adjEd = buildTaxRowEditor(sm.adjustments, 'adj');
    card.querySelector('[data-adj-editor]').appendChild(adjEd.wrap);
    card.querySelector('[data-add-adj]').appendChild(adjEd.addBtn);
    card.querySelector('[data-save-adj]').addEventListener('click', async () => {
      const adjustments = readEditorRows(adjEd.wrap);
      await api('POST', '/commands/shipping-method/set-adjustments', {
        id: state.cartId,
        shippingMethods: [{ id: sm.id, adjustments }],
      });
      toast('Adjustments saved');
      await refreshCart();
    });

    smWrap.appendChild(card);
  }
}

// ---------- Settings tab ----------

function renderSettings() {
  const c = state.cart;
  fillForm($('form-cart-settings'), {
    email: c.email,
    locale: c.locale,
    customerId: c.customerId,
    regionId: c.regionId,
    salesChannelId: c.salesChannelId,
    metadata: c.metadata == null ? '' : typeof c.metadata === 'string' ? c.metadata : JSON.stringify(c.metadata, null, 2),
  });
}

// ---------- Raw tab ----------

function renderRaw() {
  $('raw-cart').textContent = JSON.stringify(state.cart, null, 2);
}

// ---------- Totals ----------

function renderTotals() {
  const c = state.cart;
  $('totals-items').textContent = fmt(c.itemTotal, c.currencyCode);
  $('totals-shipping').textContent = fmt(c.shippingTotal, c.currencyCode);
  $('totals-subtotal').textContent = fmt(c.subtotal, c.currencyCode);
  $('totals-tax').textContent = fmt(c.taxTotal, c.currencyCode);
  $('totals-discount').textContent = fmt(c.discountTotal, c.currencyCode);
  $('totals-credits').textContent = fmt(c.creditLineTotal, c.currencyCode);
  $('totals-grand').textContent = fmt(c.total, c.currencyCode);
}

// ---------- Switcher ----------

async function refreshSwitcher() {
  const path =
    state.cartFilter === 'deleted'
      ? '/queries/carts/deleted'
      : state.cartFilter === 'active'
      ? '/queries/carts?deleted=false'
      : '/queries/carts';
  state.carts = await api('GET', path);
  const ul = $('cart-list');
  ul.innerHTML = '';
  if (state.carts.length === 0) {
    ul.innerHTML = '<li class="text-xs text-slate-400 px-1 py-2">No carts.</li>';
    return;
  }
  for (const c of state.carts) {
    const isDeleted = !!c.deletedAt;
    const isActive = c.id === state.cartId;
    const li = document.createElement('li');
    li.className = `shrink-0 w-56 border rounded p-2 cursor-pointer transition ${
      isActive
        ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
        : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50'
    }`;
    li.innerHTML = `
      <div class="flex items-center justify-between mb-1">
        <span class="font-mono text-xs truncate ${isDeleted ? 'line-through text-slate-400' : 'text-slate-700'}">${c.id}</span>
        <span class="text-xs uppercase ${isDeleted ? 'text-red-500' : 'text-emerald-600'}">${isDeleted ? 'deleted' : 'active'}</span>
      </div>
      <div class="text-xs text-slate-500">
        ${c.itemCount} item${c.itemCount === 1 ? '' : 's'} · ${fmt(c.total, c.currencyCode)} · ${c.currencyCode?.toUpperCase() ?? ''}
      </div>
      <div class="text-xs text-slate-400 truncate">${c.email ?? '—'}</div>
      ${isDeleted ? '<button class="restore mt-1 text-xs text-emerald-600 hover:underline">Restore</button>' : ''}
    `;
    li.addEventListener('click', () => loadCart(c.id));
    if (isDeleted) {
      li.querySelector('.restore').addEventListener('click', async (e) => {
        e.stopPropagation();
        await api('POST', '/commands/cart/restore', { id: c.id });
        toast('Cart restored');
        await refreshSwitcher();
        await loadCart(c.id);
      });
    }
    ul.appendChild(li);
  }
}

// ---------- Cart lifecycle ----------

async function loadCart(id) {
  state.cartId = id;
  await refreshCart();
  await refreshSwitcher();
}

async function newCart() {
  const data = collectForm($('new-cart-form'));
  const cart = await api('POST', '/commands/cart/create', {
    currencyCode: data.currencyCode,
    email: data.email,
    locale: data.locale,
  });
  toast('Cart created');
  await loadCart(cart.id);
}

async function deleteCurrentCart() {
  if (!state.cartId) return;
  if (!confirm(`Soft-delete cart ${state.cartId}?`)) return;
  await api('POST', '/commands/cart/delete', { id: state.cartId });
  toast('Cart deleted');
  await refreshCart();
  await refreshSwitcher();
}

async function restoreCurrentCart() {
  if (!state.cartId) return;
  await api('POST', '/commands/cart/restore', { id: state.cartId });
  toast('Cart restored');
  await refreshCart();
  await refreshSwitcher();
}

async function saveCartSettings(e) {
  e.preventDefault();
  const data = collectForm($('form-cart-settings'));
  data.id = state.cartId;
  data.metadata = safeJson(data.metadata);
  await api('POST', '/commands/cart/update', data);
  toast('Cart settings saved');
  await refreshCart();
}

// ---------- Wire up ----------

function wireEvents() {
  qsa('#tab-bar button').forEach((b) => b.addEventListener('click', () => selectTab(b.dataset.tab)));

  $('btn-new-cart').addEventListener('click', newCart);
  $('btn-load').addEventListener('click', () => {
    const id = $('load-id').value.trim();
    if (id) loadCart(id);
  });
  $('cart-filter').addEventListener('change', async (e) => {
    state.cartFilter = e.target.value;
    await refreshSwitcher();
  });

  $('btn-add-custom-li').addEventListener('click', addCustomLineItem);
  $('btn-add-shipping').addEventListener('click', addShippingFromOption);
  $('btn-add-custom-sm').addEventListener('click', addCustomShipping);
  $('btn-add-credit').addEventListener('click', addCreditFromSource);
  $('btn-add-custom-cl').addEventListener('click', addCustomCredit);

  $('region-filter').addEventListener('change', async (e) => {
    state.regionFilter = e.target.value;
    await loadShippingOptions();
  });
  $('customer-filter').addEventListener('input', async (e) => {
    state.customerFilter = e.target.value.trim();
    await loadCreditSources();
  });

  $('btn-delete-cart').addEventListener('click', deleteCurrentCart);
  $('btn-restore-cart').addEventListener('click', restoreCurrentCart);
  $('form-cart-settings').addEventListener('submit', saveCartSettings);

  buildAddressForm($('form-shipping-address'), 'shipping');
  buildAddressForm($('form-billing-address'), 'billing');
}

(async function init() {
  wireEvents();
  await loadCatalog();
  await loadShippingOptions();
  await loadCreditSources();
  await refreshSwitcher();
  renderCart();
})();
