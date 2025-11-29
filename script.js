// Wholesale Medical Shop — fully responsive, Admin hidden for normal users
// Data: localStorage (no backend). Real-time across same device tabs via BroadcastChannel/storage.

const $ = (s, p=document)=>p.querySelector(s);
const $$ = (s, p=document)=>[...p.querySelectorAll(s)];
const uid = (p='')=> p + Math.random().toString(36).slice(2,8) + Date.now().toString(36).slice(-4);
const toNum = (v)=> isNaN(parseFloat(v))? 0 : parseFloat(v);

const LS = {
  store: 'mw_store',
  items: 'mw_items',
  orders: 'mw_orders',
  cart: 'mw_cart',
  pin: 'mw_pin',
  logo: 'mw_logo',
  session: 'mw_admin_session',
  customer: 'mw_customer'
};

const bc = 'BroadcastChannel' in window ? new BroadcastChannel('mw_orders') : null;
function broadcastOrders(){ try{ localStorage.setItem('mw_orders_ping', String(Date.now())); }catch(e){} bc?.postMessage({type:'orders'}); }

let store = get(LS.store, null);
let items = get(LS.items, null);
let orders = get(LS.orders, []);
let cart = get(LS.cart, []);
let adminPin = get(LS.pin, '1234');
let logoData = localStorage.getItem(LS.logo);
let adminLogged = get(LS.session, false);
let customer = get(LS.customer, {name:'', phone:'', biz:'', gstin:''});

function get(k, d=null){ try{ const v = localStorage.getItem(k); return v? JSON.parse(v) : d; }catch(e){ return d; } }
function set(k, v){ localStorage.setItem(k, JSON.stringify(v)); }

const currency = ()=> store?.currency || '₹';
const fmt = (n)=> `${currency()} ${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;

// Defaults
function initDefaults(){
  if(!store){
    store = {
      name: 'MedWholesale',
      currency: '₹',
      phone: '99999 99999',
      email: '',
      gstin: '',
      hours: 'Mon–Sat 10AM–8PM',
      address: 'Your store address',
      city: 'Your city',
      pincode: '000000',
      delivery: 'yes',
      shipFee: 0,
      map: '',
      invoice: { prefix: 'MW-', next: 1, split: 'no', sign: 'yes', bank: '', terms: 'Goods once sold will not be taken back.' }
    };
    set(LS.store, store);
  }
  if(!items){
    items = [
      {id: uid('P'), name:'Paracetamol 650mg', category:'Medicines', price:45, stock:200, gst:12, hsn:'3004', pack:'15x10', sku:'PCM650', desc:'Analgesic & Antipyretic', img:''},
      {id: uid('P'), name:'Surgical Gloves (M)', category:'Surgical', price:180, stock:120, gst:12, hsn:'4015', pack:'Box of 50', sku:'GLV-M', desc:'Disposable latex gloves', img:''},
      {id: uid('P'), name:'Syringe 5ml', category:'Consumables', price:6, stock:1000, gst:12, hsn:'9018', pack:'Single', sku:'SYR-5', desc:'Sterile syringes', img:''}
    ];
    set(LS.items, items);
  }
  if(!cart){ cart = []; set(LS.cart, cart); }
}
initDefaults();

// Brand / header / footer / map
function renderBrand(){
  $('#storeName').textContent = store.name;
  $('#storeGstin').textContent = store.gstin || '—';
  $('#footName').textContent = store.name;
  $('#footHours').textContent = store.hours || '';
  $('#footAddress').textContent = store.address || '';
  $('#footPhone').textContent = store.phone || '';
  $('#footGstin').textContent = store.gstin || '—';

  $('#homeGstin') && ($('#homeGstin').textContent = store.gstin || '—');
  $('#homePhone') && ($('#homePhone').textContent = store.phone || '—');
  $('#homeAddress') && ($('#homeAddress').textContent = `${store.address||''}, ${store.city||''} ${store.pincode?'- '+store.pincode:''}`);

  $('#hqPhone') && ($('#hqPhone').textContent = store.phone || 'Phone');
  $('#hqHours') && ($('#hqHours').textContent = store.hours || '');

  const img = $('#logoImg');
  if(logoData){ img.src = logoData; img.classList.remove('hidden'); $('.logo-placeholder')?.classList.add('hidden'); } 
  else { img.classList.add('hidden'); $('.logo-placeholder')?.classList.remove('hidden'); }

  // Map
  const mapWrap = $('#mapWrap');
  if(store.map){
    $('#mapFrame').src = store.map;
    mapWrap?.classList.remove('hidden');
  }else{
    mapWrap?.classList.add('hidden');
  }

  // Call button
  const callBtn = $('#ctaCallBtn');
  if(callBtn){
    const digits = (store.phone||'').replace(/\D/g,'');
    callBtn.href = digits ? `tel:${digits}` : '#';
  }
}

// Navigation (desktop + mobile tab bar)
function showSection(id){
  $$('.section').forEach(s=>s.classList.add('hidden'));
  $('#'+id)?.classList.remove('hidden');
  // active states
  $$('.nav.desktop a').forEach(a=>a.classList.remove('active'));
  $(`.nav.desktop a[data-section="${id}"]`)?.classList.add('active');
  $$('.bottom-nav .bn-link').forEach(a=>a.classList.remove('active'));
  $(`.bottom-nav .bn-link[data-section="${id}"]`)?.classList.add('active');

  if(id==='cart'){ renderCustomerOrdersList(); }
}
document.addEventListener('click', (e)=>{
  const t = e.target.closest('[data-section]');
  if(t){ e.preventDefault(); showSection(t.dataset.section); }
});

// Admin visibility helper
function updateAdminUI(){
  $$('.admin-only').forEach(el=> el.classList.toggle('hidden', !adminLogged));
  const label = adminLogged ? 'Manage' : 'Admin';
  $('#adminNav') && ($('#adminNav').textContent = label);
  $('#bnAdminNav') && ($('#bnAdminNav').querySelector('.bn-t').textContent = label);
}

// Secret Admin access (desktop + mobile)
const ADMIN_TAP_TARGET_ID = 'brandingArea';
const MOBILE_TAP_COUNT = 5;
const TAP_WINDOW_MS = 1500;
const LONGPRESS_MS = 800;

function openAdminLogin(){
  showSection('adminPanel');
  $('#adminPinInput')?.focus();
}

document.addEventListener('keydown', (e)=>{
  if ((e.key==='a' || e.key==='A') && e.altKey) openAdminLogin();
});

(function setupMobileTapToAdmin(){
  const target = document.getElementById(ADMIN_TAP_TARGET_ID);
  if(!target) return;
  let tapCount = 0, tapTimer = null, longPressTimer = null;

  target.addEventListener('click', ()=>{
    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(()=> tapCount=0, TAP_WINDOW_MS);
    if(tapCount>=MOBILE_TAP_COUNT){
      tapCount=0; clearTimeout(tapTimer); openAdminLogin();
    }
  });
  target.addEventListener('pointerdown', ()=>{
    clearTimeout(longPressTimer);
    longPressTimer = setTimeout(()=> openAdminLogin(), LONGPRESS_MS);
  });
  target.addEventListener('pointerup', ()=> clearTimeout(longPressTimer));
  target.addEventListener('pointerleave', ()=> clearTimeout(longPressTimer));
})();

// Categories / Products
function categories(){
  return [...new Set(items.map(i=>i.category).filter(Boolean))];
}
function renderCategoryFilter(){
  const sel = $('#categoryFilter');
  if(!sel) return;
  sel.innerHTML = `<option value="">All Categories</option>` + categories().map(c=>`<option>${c}</option>`).join('');
}
// Better looking placeholder
function placeholderImg(name='Img', w=400, h=300){
  // Gradient SVG
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e0f2fe"/><stop offset="100%" stop-color="#bae6fd"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#0369a1" font-family="sans-serif" font-weight="bold" font-size="20">${name}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function productCard(p){
  const img = p.img || placeholderImg(p.name);
  return `
    <div class="product hover-lift">
      <img src="${img}" alt="${p.name}">
      <div class="meta">
        <h4>${p.name}</h4>
        <div class="muted small">${p.category || ''}${p.pack? ' · '+p.pack:''}</div>
      </div>
      <div class="price">${fmt(p.price)}</div>
      <div class="stock small">${p.stock>0? `${p.stock} in stock` : 'Out of stock'}</div>
      <button class="btn primary addBtn" data-id="${p.id}" ${p.stock<=0?'disabled':''}>Add to Cart</button>
    </div>
  `;
}
let currentSort = '';
function sortItems(list){
  switch(currentSort){
    case 'price-asc': return list.sort((a,b)=>a.price-b.price);
    case 'price-desc': return list.sort((a,b)=>b.price-a.price);
    case 'name-asc': return list.sort((a,b)=>a.name.localeCompare(b.name));
    case 'stock-desc': return list.sort((a,b)=> (b.stock>0)-(a.stock>0) || b.stock-a.stock );
    default: return list;
  }
}
function renderProducts(){
  const grid = $('#productGrid'); if(!grid) return;
  const q = ($('#searchInput')?.value||'').toLowerCase();
  const cat = $('#categoryFilter')?.value||'';
  let list = items.slice();
  if(cat) list = list.filter(i=>i.category===cat);
  if(q) list = list.filter(i=>
    i.name.toLowerCase().includes(q) ||
    (i.category||'').toLowerCase().includes(q) ||
    (i.desc||'').toLowerCase().includes(q) ||
    (i.hsn||'').toLowerCase().includes(q)
  );
  list = sortItems(list);
  grid.innerHTML = list.map(productCard).join('');
  $('#noProducts')?.classList.toggle('hidden', list.length>0);
  $$('.addBtn', grid).forEach(b=>b.addEventListener('click', ()=>{ 
    addToCart(b.dataset.id,1);
    // Simple click feedback
    const orig = b.textContent; b.textContent = 'Added!'; setTimeout(()=>b.textContent=orig, 800);
  }));
}
$('#searchInput')?.addEventListener('input', renderProducts);
$('#categoryFilter')?.addEventListener('change', renderProducts);
$('#sortSelect')?.addEventListener('change', (e)=>{ currentSort = e.target.value; renderProducts(); });

// Home helpers
function initHome(){
  $('#homeSearchForm')?.addEventListener('submit', (e)=>{
    e.preventDefault();
    const q = $('#homeSearchInput').value.trim();
    $('#searchInput') && ($('#searchInput').value = q);
    showSection('products'); renderProducts();
    window.scrollTo({top:0, behavior:'smooth'});
  });
  renderHomeTiles();
  renderHomeStats();
}
function renderHomeTiles(){
  const wrap = $('#catTiles'); if(!wrap) return;
  const cats = categories();
  wrap.innerHTML = cats.slice(0,10).map(c=>`<button class="tile" data-cat="${c}">${emojiForCat(c)} ${c}</button>`).join('') +
                   `<button class="tile" data-cat="">All Products →</button>`;
  $$('.tile', wrap).forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const cat = btn.dataset.cat || '';
      const sel = $('#categoryFilter'); if(sel){ sel.value = cat; }
      showSection('products'); renderProducts();
      window.scrollTo({top:0, behavior:'smooth'});
    });
  });
}
function emojiForCat(c){
  const s=c.toLowerCase();
  if(s.includes('med')) return '💊';
  if(s.includes('surg')) return '🧤';
  if(s.includes('consum')) return '🧪';
  if(s.includes('diag') || s.includes('device')) return '🩺';
  return '📦';
}
function renderHomeStats(){
  $('#countItems') && ($('#countItems').textContent = items.length);
  $('#countCats') && ($('#countCats').textContent = categories().length);
  $('#countOrders') && ($('#countOrders').textContent = orders.length);
}

// Cart
function updateCartBadge(){
  const count = cart.reduce((a,c)=>a+c.qty,0);
  $('#cartCount') && ($('#cartCount').textContent = count);
  $('#bnCartCount') && ($('#bnCartCount').textContent = count);
}
function addToCart(id, qty=1){
  const p = items.find(x=>x.id===id);
  if(!p || p.stock<=0) return;
  const ex = cart.find(c=>c.id===id);
  if(ex) ex.qty = Math.min(ex.qty+qty, p.stock);
  else cart.push({id, name:p.name, price:p.price, qty, img:p.img, gst:p.gst||0, hsn:p.hsn||'', pack:p.pack||''});
  set(LS.cart, cart);
  updateCartBadge();
}
function renderCart(){
  const list = $('#cartList'); const empty = $('#cartEmpty'); const checkout = $('#checkoutBox');
  if(!list || !empty || !checkout) return;
  list.innerHTML = '';
  if(cart.length===0){ empty.classList.remove('hidden'); checkout.classList.add('hidden'); return; }
  empty.classList.add('hidden'); checkout.classList.remove('hidden');

  cart.forEach(c=>{
    const p = items.find(i=>i.id===c.id);
    const img = c.img || p?.img || placeholderImg(c.name,120,120);
    const row = document.createElement('div');
    row.className = 'rowItem';
    row.innerHTML = `
      <img class="item-thumb" src="${img}">
      <div style="flex:1">
        <h4>${c.name}</h4>
        <div class="muted small">${fmt(c.price)} · GST ${c.gst||0}%</div>
      </div>
      <div class="qty">
        <button class="btn secondary small" data-act="dec">-</button>
        <input type="number" min="1" value="${c.qty}">
        <button class="btn secondary small" data-act="inc">+</button>
        <button class="btn danger small" data-act="rem">×</button>
      </div>
    `;
    const inp = $('input', row);
    $('[data-act="dec"]', row).addEventListener('click', ()=>{ c.qty=Math.max(1,c.qty-1); set(LS.cart,cart); renderCart(); updateCartBadge(); });
    $('[data-act="inc"]', row).addEventListener('click', ()=>{
      const max = (items.find(i=>i.id===c.id)?.stock)||999;
      c.qty = Math.min(max, c.qty+1); set(LS.cart,cart); renderCart(); updateCartBadge();
    });
    $('[data-act="rem"]', row).addEventListener('click', ()=>{ cart=cart.filter(x=>x.id!==c.id); set(LS.cart,cart); updateCartBadge(); renderCart(); });
    inp.addEventListener('change', ()=>{
      let v = parseInt(inp.value||'1'); if(isNaN(v)||v<1) v=1;
      const max = (items.find(i=>i.id===c.id)?.stock)||999;
      c.qty = Math.min(max, v); set(LS.cart,cart); renderCart(); updateCartBadge();
    });
    list.appendChild(row);
  });

  recalcSummary();
}
$('#clearCartBtn')?.addEventListener('click', ()=>{
  if(cart.length && confirm('Clear all items in cart?')){ cart=[]; set(LS.cart,cart); updateCartBadge(); renderCart(); }
});

// Totals with GST
function calcTotals(cartList, discount=0, extra=0, shipping=0){
  let sub = 0, gstAmt = 0;
  cartList.forEach(c=>{
    const line = c.price * c.qty; sub += line;
    gstAmt += line * (Number(c.gst||0)/100);
  });
  const disc = Math.min(discount||0, sub + gstAmt);
  const total = Math.max(0, sub + gstAmt + extra + shipping - disc);
  return { sub, gst: gstAmt, discount: disc, extra: extra||0, shipping: shipping||0, total };
}
function recalcSummary(){
  const ordType = $('input[name="ordType"]:checked')?.value || 'Pickup';
  const shipping = ordType==='Delivery' && store.delivery==='yes' ? Math.max(0, Number(store.shipFee||0)) : 0;
  const disc = Math.max(0, toNum($('#orderDiscount')?.value));
  const extra = Math.max(0, toNum($('#orderExtra')?.value));
  const totals = calcTotals(cart, disc, extra, shipping);
  $('#sumSub') && ($('#sumSub').textContent = fmt(totals.sub));
  $('#sumGst') && ($('#sumGst').textContent = fmt(totals.gst));
  $('#sumShip') && ($('#sumShip').textContent = fmt(totals.shipping));
  $('#sumDisc') && ($('#sumDisc').textContent = fmt(totals.discount));
  $('#sumExtra') && ($('#sumExtra').textContent = fmt(totals.extra));
  $('#sumGrand') && ($('#sumGrand').textContent = fmt(totals.total));
  $('#shipRow')?.classList.toggle('hidden', !(ordType==='Delivery' && store.delivery==='yes' && totals.shipping>0));
  $('#taxSummary') && ($('#taxSummary').textContent = `GST Total: ${fmt(totals.gst.toFixed(2))}`);
}

// Checkout
function setupCheckout(){
  $('#custName') && ($('#custName').value = customer.name||'');
  $('#custPhone') && ($('#custPhone').value = customer.phone||'');
  $('#custBiz') && ($('#custBiz').value = customer.biz||'');
  $('#custGstin') && ($('#custGstin').value = customer.gstin||'');

  const d = new Date(), yyyy=d.getFullYear(), mm=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0');
  $('#pickupDate') && ($('#pickupDate').min = `${yyyy}-${mm}-${dd}`);

  $$('input[name="ordType"]').forEach(r=>{
    r.addEventListener('change', ()=>{
      const isDel = $('input[name="ordType"]:checked').value==='Delivery';
      const delFields = $('#deliveryFields');
      if(isDel) { delFields.classList.remove('hidden'); } else { delFields.classList.add('hidden'); }
      recalcSummary();
    });
  });
  ['orderDiscount','orderExtra','pickupDate','pickupTime','addrLine','addrArea','addrCity','addrPin'].forEach(id=>{
    $('#'+id)?.addEventListener('input', recalcSummary);
  });

  $('#checkoutForm')?.addEventListener('submit', (e)=>{
    e.preventDefault();
    if(cart.length===0) return;

    const name = $('#custName').value.trim();
    const phoneRaw = $('#custPhone').value.trim();
    const phone = phoneRaw.replace(/\D/g,'');
    const biz = $('#custBiz').value.trim();
    const cgstin = $('#custGstin').value.trim().toUpperCase();
    const ordType = $('input[name="ordType"]:checked').value;
    const addr = {
      line: $('#addrLine').value.trim(),
      area: $('#addrArea').value.trim(),
      city: $('#addrCity').value.trim(),
      pin: $('#addrPin').value.trim()
    };
    const date = $('#pickupDate').value || '';
    const time = $('#pickupTime').value || '';
    const notes = $('#orderNotes').value.trim();
    const disc = Math.max(0, toNum($('#orderDiscount').value));
    const extra = Math.max(0, toNum($('#orderExtra').value));
    const shipping = ordType==='Delivery' && store.delivery==='yes' ? Math.max(0, Number(store.shipFee||0)) : 0;

    if(!name){ alert('Please enter customer name.'); return; }
    if(phone.length!==10){ alert('Please enter exactly 10-digit mobile number.'); return; }
    if(ordType==='Delivery' && store.delivery!=='yes'){ alert('Delivery is disabled in settings. Choose Pickup.'); return; }
    if(ordType==='Delivery' && (!addr.line || !addr.city || !addr.pin)){ alert('Please enter full delivery address (line, city, pincode).'); return; }

    const totals = calcTotals(cart, disc, extra, shipping);

    // Stock check
    const lookup = Object.fromEntries(items.map(i=>[i.id,i]));
    for(const c of cart){
      if(!lookup[c.id] || c.qty > lookup[c.id].stock){ alert(`Not enough stock for ${c.name}.`); return; }
    }

    const order = {
      id: uid('ORD-').toUpperCase(),
      createdAt: new Date().toISOString(),
      customer: {name, phone, biz, gstin: cgstin},
      type: ordType,
      address: addr,
      schedule: {date, time},
      notes,
      items: cart.map(c=>({id:c.id, name:c.name, price:c.price, qty:c.qty, gst:c.gst||0, hsn:c.hsn||'', pack:c.pack||''})),
      amounts: totals,
      status: 'Pending',
      invoiceNo: null
    };

    // Reduce stock
    order.items.forEach(oi=>{ lookup[oi.id].stock -= oi.qty; });
    set(LS.items, items);

    orders.unshift(order);
    set(LS.orders, orders);
    broadcastOrders();

    // Save customer
    customer = {name, phone, biz, gstin: cgstin};
    set(LS.customer, customer);

    // Clear cart
    cart = []; set(LS.cart, cart); updateCartBadge(); renderProducts(); renderCart();

    const s = $('#orderSuccess');
    s.classList.remove('hidden');
    s.innerHTML = `
      <div><strong>Order Placed Successfully! 🎉</strong><br>Reference: <strong>${order.id}</strong></div>
      <div style="margin-top:8px; font-size:14px">${order.type} | Total: <strong>${fmt(order.amounts.total)}</strong></div>
    `;
    // Scroll to success
    s.scrollIntoView({behavior:'smooth'});
    renderCustomerOrdersList();
  });
}

// Customer orders (Cart page history)
function getOrdersByPhone(phone){
  const d = (phone||'').replace(/\D/g,'');
  return orders.filter(o=> (o.customer?.phone||'').replace(/\D/g,'')===d).sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));
}
$('#custOrdersForm')?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const digits = ($('#custOrdersPhone').value||'').replace(/\D/g,'');
  if(digits.length!==10){ alert('Enter exactly 10 digits.'); return; }
  customer.phone = digits; set(LS.customer, customer);
  renderCustomerOrdersList();
});
function renderCustomerOrdersList(){
  $('#custOrdersPhone') && ($('#custOrdersPhone').value = customer.phone||'');
  const list = $('#custOrdersList'); const empty = $('#custNoOrders');
  if(!list || !empty) return;
  list.innerHTML = '';
  const data = getOrdersByPhone(customer.phone);
  if(!data.length){ empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  data.forEach(o=>{
    const div = document.createElement('div');
    div.className = 'order';
    const itemsText = o.items.map(i=>`${i.name} x${i.qty}`).join(', ');
    div.innerHTML = `
      <div class="top">
        <div><strong>${o.id}</strong><br><small class="muted">${new Date(o.createdAt).toLocaleString()}</small></div>
        <div><strong>${fmt(o.amounts.total)}</strong><br><span class="status-pill">${o.status}</span></div>
      </div>
      <div class="items small muted" style="margin:8px 0">${itemsText}</div>
      <div class="actions">
        <button class="btn secondary small block" data-act="inv">View Invoice</button>
      </div>
    `;
    $('[data-act="inv"]', div).addEventListener('click', ()=> printInvoice(o));
    list.appendChild(div);
  });
}

// Admin
let orderFilter = {status:'', query:''};
function renderAdminState(){
  $('#adminLoginBox')?.classList.toggle('hidden', adminLogged);
  $('#adminArea')?.classList.toggle('hidden', !adminLogged);
  updateAdminUI();
}
$('#adminLoginForm')?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const pin = $('#adminPinInput').value.trim();
  if(pin === adminPin){
    adminLogged = true; set(LS.session, true);
    $('#adminLoginMsg').textContent = '';
    renderAdminState(); renderOrders(); renderItemsManage(); fillSettings(); fillInvoiceForm();
  } else $('#adminLoginMsg').textContent = 'Wrong PIN';
});
$('#adminLogoutBtn')?.addEventListener('click', ()=>{
  adminLogged=false; set(LS.session,false); renderAdminState();
});

$$('.tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    if(btn.id==='adminLogoutBtn') return;
    $$('.tab-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
    $$('.tab').forEach(t=>t.classList.add('hidden')); $('#'+btn.dataset.tab).classList.remove('hidden');
    if(btn.dataset.tab==='ordersTab') renderOrders();
    if(btn.dataset.tab==='itemsTab') renderItemsManage();
    if(btn.dataset.tab==='settingsTab') fillSettings();
    if(btn.dataset.tab==='invoiceTab') fillInvoiceForm();
  });
});

function matchOrd(o){
  const q = (orderFilter.query||'').toLowerCase();
  const sOK = orderFilter.status ? o.status===orderFilter.status : true;
  const qOK = q? `${o.id} ${o.customer.name} ${o.customer.phone}`.toLowerCase().includes(q) : true;
  return sOK && qOK;
}
function renderOrders(){
  const wrap = $('#ordersList'); if(!wrap) return;
  wrap.innerHTML = '';
  const list = orders.filter(matchOrd);
  if(!list.length){ $('#noOrders')?.classList.remove('hidden'); return; }
  $('#noOrders')?.classList.add('hidden');
  list.forEach(o=>{
    const div = document.createElement('div');
    div.className = 'order';
    const itemsText = o.items.map(i=>`${i.name} x${i.qty}`).join(', ');
    div.innerHTML = `
      <div class="top">
        <div><strong>${o.id}</strong><br><small class="muted">${new Date(o.createdAt).toLocaleString()}</small></div>
        <div><small>${o.type}</small> · ${o.customer.name} (${o.customer.phone})</div>
        <div><strong>${fmt(o.amounts.total)}</strong></div>
        <div><span class="status-pill">${o.status}</span></div>
      </div>
      <div class="items small muted" style="margin:8px 0">${itemsText}</div>
      ${o.notes? `<div class="muted small">Note: ${o.notes}</div>`:''}
      <div class="actions" style="margin-top:12px; display:flex; gap:8px">
        <select class="statusSel" style="padding:4px; border-radius:4px">
          ${['Pending','Confirmed','Preparing','Ready','Out for delivery','Delivered','Picked Up','Cancelled'].map(s=>`<option ${s===o.status?'selected':''}>${s}</option>`).join('')}
        </select>
        <button class="btn secondary small" data-act="inv">${o.invoiceNo? 'Print' : 'Gen Inv'}</button>
        <button class="btn danger small" data-act="del">Del</button>
      </div>
    `;
    $('.statusSel', div).addEventListener('change', (e)=>{
      o.status = e.target.value; set(LS.orders, orders); renderOrders(); renderCustomerOrdersList(); broadcastOrders();
    });
    $('[data-act="inv"]', div).addEventListener('click', ()=>{
      if(!o.invoiceNo){ generateInvoiceNumber(o); set(LS.orders, orders); renderOrders(); }
      printInvoice(o);
    });
    $('[data-act="del"]', div).addEventListener('click', ()=>{
      if(o.status==='Cancelled' || o.status==='Delivered' || o.status==='Picked Up'){
        if(confirm('Delete this order?')){ orders = orders.filter(x=>x.id!==o.id); set(LS.orders, orders); renderOrders(); renderCustomerOrdersList(); broadcastOrders(); }
      }else alert('Only Delivered/Picked Up/Cancelled orders can be deleted.');
    });
    wrap.appendChild(div);
  });
}
$('#orderSearch')?.addEventListener('input', (e)=>{ orderFilter.query=e.target.value.trim(); renderOrders(); });
$('#orderStatusFilter')?.addEventListener('change', (e)=>{ orderFilter.status=e.target.value; renderOrders(); });
$('#exportOrdersBtn')?.addEventListener('click', ()=>{
  if(!orders.length){ alert('No orders to export.'); return; }
  const rows = [['ID','Created','Type','Customer','Phone','Total','Status','Invoice']];
  orders.forEach(o=> rows.push([o.id, new Date(o.createdAt).toLocaleString(), o.type, o.customer.name, o.customer.phone, o.amounts.total, o.status, o.invoiceNo||'']));
  downloadCSV(rows, 'orders.csv');
});
function downloadCSV(rows, name){
  const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=name; a.click(); URL.revokeObjectURL(url);
}

// Items
$('#addItemForm')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const name = $('#itemName').value.trim();
  const category = $('#itemCategory').value.trim();
  const price = toNum($('#itemPrice').value);
  const stock = parseInt($('#itemStock').value);
  const gst = parseInt($('#itemGst').value||'0');
  const hsn = $('#itemHsn').value.trim();
  const pack = $('#itemPack').value.trim();
  const sku = $('#itemSku').value.trim();
  const desc = $('#itemDesc').value.trim();
  const file = $('#itemImage')?.files?.[0];

  if(!name || !category || isNaN(price) || isNaN(stock)){ alert('Fill name, category, price, stock.'); return; }

  let dataUrl = '';
  if(file){ dataUrl = await fileToDataURL(file); }

  items.unshift({id: uid('P'), name, category, price, stock, gst, hsn, pack, sku, desc, img:dataUrl});
  set(LS.items, items);
  $('#addItemForm').reset();
  $('#addItemMsg').textContent = 'Item added!';
  $('#addItemMsg').classList.remove('hidden');
  setTimeout(()=>$('#addItemMsg').classList.add('hidden'), 2000);
  renderCategoryFilter(); renderProducts(); renderItemsManage(); renderHomeTiles(); renderHomeStats();
});
function renderItemsManage(){
  const box = $('#itemsList'); if(!box) return;
  box.innerHTML = '';
  if(items.length===0){ $('#noItems')?.classList.remove('hidden'); return; }
  $('#noItems')?.classList.add('hidden');
  items.forEach(it=>{
    const row = document.createElement('div');
    row.className = 'itemRow order'; // reuse order card style
    row.style.display='grid'; row.style.gridTemplateColumns='1fr 80px 80px 80px auto'; row.style.gap='8px'; row.style.alignItems='center';
    row.innerHTML = `
      <div><strong>${it.name}</strong><br><small class="muted">${it.category||''}</small></div>
      <div><input type="number" step="0.01" value="${it.price}" title="Price" style="width:100%"></div>
      <div><input type="number" step="1" value="${it.stock}" title="Stock" style="width:100%"></div>
      <div><input type="number" step="1" value="${it.gst||0}" title="GST %" style="width:100%"></div>
      <div style="display:flex;gap:6px;justify-content:flex-end">
        <button class="btn secondary small" data-act="save">Save</button>
        <button class="btn danger small" data-act="del">Del</button>
      </div>
    `;
    const [pI, sI, gI] = $$('input', row);
    $('[data-act="save"]', row).addEventListener('click', ()=>{
      const p=toNum(pI.value), s=parseInt(sI.value), g=parseInt(gI.value||'0');
      if(isNaN(p)||isNaN(s)||isNaN(g)){ alert('Invalid values'); return; }
      it.price=p; it.stock=s; it.gst=g; set(LS.items, items); renderProducts();
    });
    $('[data-act="del"]', row).addEventListener('click', ()=>{
      if(confirm('Delete this item?')){ items=items.filter(x=>x.id!==it.id); set(LS.items, items); renderItemsManage(); renderProducts(); renderHomeTiles(); renderHomeStats(); }
    });
    box.appendChild(row);
  });
}
$('#exportItemsBtn')?.addEventListener('click', ()=>{
  if(!items.length){ alert('No items to export.'); return; }
  const rows = [['ID','Name','Category','Price','Stock','GST%','HSN','Pack','SKU']];
  items.forEach(i=> rows.push([i.id,i.name,i.category,i.price,i.stock,i.gst||0,i.hsn||'',i.pack||'',i.sku||'']));
  downloadCSV(rows,'items.csv');
});
function fileToDataURL(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); }); }

// Settings
function fillSettings(){
  $('#setName') && ($('#setName').value = store.name||'');
  $('#setCurrency') && ($('#setCurrency').value = store.currency||'₹');
  $('#setPhone') && ($('#setPhone').value = store.phone||'');
  $('#setEmail') && ($('#setEmail').value = store.email||'');
  $('#setGstin') && ($('#setGstin').value = store.gstin||'');
  $('#setHours') && ($('#setHours').value = store.hours||'');
  $('#setAddress') && ($('#setAddress').value = store.address||'');
  $('#setCity') && ($('#setCity').value = store.city||'');
  $('#setPincode') && ($('#setPincode').value = store.pincode||'');
  $('#setDelivery') && ($('#setDelivery').value = store.delivery||'yes');
  $('#setShipFee') && ($('#setShipFee').value = store.shipFee||0);
  $('#setMap') && ($('#setMap').value = store.map||'');
}
$('#settingsForm')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  store.name = $('#setName').value.trim()||store.name;
  store.currency = $('#setCurrency').value.trim()||store.currency;
  store.phone = $('#setPhone').value.trim();
  store.email = $('#setEmail').value.trim();
  store.gstin = ($('#setGstin').value||'').trim().toUpperCase();
  store.hours = $('#setHours').value.trim();
  store.address = $('#setAddress').value.trim();
  store.city = $('#setCity').value.trim();
  store.pincode = $('#setPincode').value.trim();
  store.delivery = $('#setDelivery').value;
  store.shipFee = toNum($('#setShipFee').value);
  store.map = $('#setMap').value.trim();

  const pinVal = $('#setPin')?.value.trim();
  if(pinVal){ adminPin = pinVal; set(LS.pin, adminPin); $('#setPin').value=''; }

  const file = $('#setLogo')?.files?.[0];
  if(file){ logoData = await fileToDataURL(file); localStorage.setItem(LS.logo, logoData); }

  set(LS.store, store);
  renderBrand(); fillSettings(); renderHomeTiles(); renderHomeStats();
  renderAdminState();

  const m = $('#settingsMsg'); if(m){ m.textContent='Settings saved.'; m.classList.remove('hidden'); setTimeout(()=>m.classList.add('hidden'), 1800); }
});

// Invoice template
function fillInvoiceForm(){
  $('#invPrefix') && ($('#invPrefix').value = store.invoice?.prefix || 'MW-');
  $('#invNext') && ($('#invNext').value = store.invoice?.next || 1);
  $('#invSplit') && ($('#invSplit').value = store.invoice?.split || 'no');
  $('#invSign') && ($('#invSign').value = store.invoice?.sign || 'yes');
  $('#invBank') && ($('#invBank').value = store.invoice?.bank || '');
  $('#invTerms') && ($('#invTerms').value = store.invoice?.terms || '');
}
$('#invoiceForm')?.addEventListener('submit', (e)=>{
  e.preventDefault();
  store.invoice = {
    prefix: $('#invPrefix').value.trim()||'MW-',
    next: parseInt($('#invNext').value)||1,
    split: $('#invSplit').value,
    sign: $('#invSign').value,
    bank: $('#invBank').value.trim(),
    terms: $('#invTerms').value.trim()||'Goods once sold will not be taken back.'
  };
  set(LS.store, store); fillInvoiceForm();
  const m = $('#invoiceMsg'); if(m){ m.textContent='Invoice template saved.'; m.classList.remove('hidden'); setTimeout(()=>m.classList.add('hidden'), 1800); }
});
function generateInvoiceNumber(order){
  const pre = store.invoice?.prefix || 'MW-';
  let next = store.invoice?.next || 1;
  order.invoiceNo = `${pre}${next}`;
  store.invoice.next = next + 1;
  set(LS.store, store);
}
function printInvoice(order){
  if(!order.invoiceNo) generateInvoiceNumber(order); set(LS.orders, orders);
  let rows = '', taxable=0, gstTotal=0;
  order.items.forEach(i=>{
    const line = i.price * i.qty, ga = line * (Number(i.gst||0)/100);
    taxable += line; gstTotal += ga;
    rows += `<tr>
      <td>${i.name}${i.pack? ' ('+i.pack+')':''}</td>
      <td>${i.hsn||''}</td>
      <td style="text-align:center">${i.qty}</td>
      <td style="text-align:right">${fmt(i.price)}</td>
      <td style="text-align:center">${i.gst||0}%</td>
      <td style="text-align:right">${fmt(ga)}</td>
      <td style="text-align:right">${fmt(line+ga)}</td>
    </tr>`;
  });
  const disc = order.amounts.discount||0, extra = order.amounts.extra||0, ship = order.amounts.shipping||0;
  const grand = order.amounts.total || (taxable+gstTotal+extra+ship-disc);
  let gstSplitHtml=''; if((store.invoice?.split||'no')==='yes'){ const half=gstTotal/2;
    gstSplitHtml = `<tr><td colspan="6" style="text-align:right">CGST</td><td style="text-align:right">${fmt(half)}</td></tr>
                    <tr><td colspan="6" style="text-align:right">SGST</td><td style="text-align:right">${fmt(half)}</td></tr>`;
  }
  const w = window.open('', '_blank');
  w.document.write(`
<html><head><title>Invoice ${order.invoiceNo}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;padding:18px;color:#111}
  h1,h2,h3,h4{margin:4px 0}
  .row{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
  .box{border:1px solid #ddd;border-radius:8px;padding:10px;margin:8px 0}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th,td{border:1px solid #ddd;padding:8px;font-size:13px}
  th{background:#f7f9fc}
  .muted{color:#64748b}
</style>
</head>
<body>
  <div class="row">
    <div style="flex:1">
      <h2>${store.name}</h2>
      <div>${store.address||''}</div>
      <div>${store.city||''} - ${store.pincode||''}</div>
      <div>${store.phone||''}${store.email? ' | '+store.email:''}</div>
      <div><strong>GSTIN:</strong> ${store.gstin||'—'}</div>
    </div>
    <div class="box" style="min-width:240px">
      <h3>Tax Invoice</h3>
      <div><strong>Invoice #:</strong> ${order.invoiceNo}</div>
      <div><strong>Date:</strong> ${new Date().toLocaleString()}</div>
      <div><strong>Order ID:</strong> ${order.id}</div>
    </div>
  </div>

  <div class="row">
    <div class="box" style="flex:1">
      <strong>Bill To:</strong><br>
      ${order.customer.biz? order.customer.biz+'<br>':''}
      ${order.customer.name}<br>
      ${order.customer.phone}<br>
      ${order.customer.gstin? 'GSTIN: '+order.customer.gstin : ''}
    </div>
    <div class="box" style="flex:1">
      <strong>${order.type==='Delivery'?'Ship To:':'Pickup:'}</strong><br>
      ${order.type==='Delivery'
        ? `${order.address.line||''} ${order.address.area||''}<br>${order.address.city||''} - ${order.address.pin||''}`
        : `${store.address||''}, ${store.city||''} - ${store.pincode||''}`
      }<br>
      ${order.schedule.date? 'Preferred: '+order.schedule.date+' ':''}${order.schedule.time||''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th><th>HSN</th><th>Qty</th><th>Rate</th><th>GST%</th><th>GST Amt</th><th>Amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr><td colspan="6" style="text-align:right">Subtotal</td><td style="text-align:right">${fmt(taxable)}</td></tr>
      <tr><td colspan="6" style="text-align:right">GST Total</td><td style="text-align:right">${fmt(gstTotal)}</td></tr>
      ${gstSplitHtml}
      ${ship? `<tr><td colspan="6" style="text-align:right">Shipping</td><td style="text-align:right">${fmt(ship)}</td></tr>`:''}
      ${extra? `<tr><td colspan="6" style="text-align:right">Extra</td><td style="text-align:right">${fmt(extra)}</td></tr>`:''}
      ${disc? `<tr><td colspan="6" style="text-align:right">Discount</td><td style="text-align:right">- ${fmt(disc)}</td></tr>`:''}
      <tr><td colspan="6" style="text-align:right"><strong>Total</strong></td><td style="text-align:right"><strong>${fmt(grand)}</strong></td></tr>
    </tfoot>
  </table>

  ${store.invoice?.bank ? `<div class="box"><strong>Bank Details:</strong><br>${store.invoice.bank.replace(/\n/g,'<br>')}</div>`:''}
  ${store.invoice?.terms ? `<div class="box"><strong>Terms & Notes:</strong><br>${store.invoice.terms.replace(/\n/g,'<br>')}</div>`:''}
  ${store.invoice?.sign==='yes' ? `<div style="margin-top:40px;text-align:right"><div class="muted">Authorised Signatory</div></div>`:''}

  <script>window.print();</script>
</body></html>
  `);
  w.document.close();
}

// Same-device live updates
window.addEventListener('storage', (e)=>{
  if(e.key===LS.orders || e.key==='mw_orders_ping'){
    orders = get(LS.orders, []); if(adminLogged) renderOrders();
    renderHomeStats();
  }
});
bc && (bc.onmessage = (ev)=>{ if(ev.data?.type==='orders'){ orders = get(LS.orders, []); if(adminLogged) renderOrders(); renderHomeStats(); }});

// Init
function init(){
  renderBrand();
  renderCategoryFilter();
  renderProducts();
  renderCart();
  setupCheckout();
  renderAdminState();
  renderCustomerOrdersList();
  updateCartBadge();

  initHome();
  updateAdminUI(); // Admin hidden by default

  if(adminLogged){
    renderOrders();
    renderItemsManage();
    fillSettings();
    fillInvoiceForm();
  }
}
init();