// ---------- FIREBASE INIT & HELPERS (paste at top of script.js) ----------
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref as dbRef, set as dbSet, push as dbPush, onValue, get as dbGet } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

// ----- Put your firebaseConfig here (the one you pasted earlier) -----
const firebaseConfig = {
  apiKey: "AIzaSyD8CN9npChULefpP8lzCFAK3azEMiuBCe8",
  authDomain: "finepharma-4f836.firebaseapp.com",
  databaseURL: "https://finepharma-4f836-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "finepharma-4f836",
  storageBucket: "finepharma-4f836.firebasestorage.app",
  messagingSenderId: "757024425930",
  appId: "1:757024425930:web:a26054a29109a39ff4f133",
  measurementId: "G-DCL5PL6VRC"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

// ---------- DATABASE PATHS ----------
// store global settings here (previously LS.store)
const PATHS = {
  settings: 'site_settings',
  users: 'users',        // per-user profiles: users/{userId}
  orders: 'orders',      // push orders here
  items: 'items'         // optional: products list
};

// ---------- SETTINGS: read live + write ----------
export async function writeSettings(settingsObj){
  // writes full settings object to /site_settings
  await dbSet(dbRef(db, PATHS.settings), settingsObj);
}

// realtime listener: callback(settingsObj)
export function onSettingsChange(callback){
  onValue(dbRef(db, PATHS.settings), snap => {
    const val = snap.exists() ? snap.val() : null;
    callback(val);
  });
}

// one-time read
export async function readSettingsOnce(){
  const snap = await dbGet(dbRef(db, PATHS.settings));
  return snap.exists() ? snap.val() : null;
}

// ---------- USER PROFILE (save & load) ----------
// We'll identify users by email-safe-key (replace '.' with '_')
function emailKey(email){ return email ? email.replace(/\./g,'_') : 'guest'; }

export async function saveUserProfileToCloud(email, profileObj){
  const key = emailKey(email);
  await dbSet(dbRef(db, `${PATHS.users}/${key}`), profileObj);
}

export async function loadUserProfileFromCloud(email){
  const key = emailKey(email);
  const snap = await dbGet(dbRef(db, `${PATHS.users}/${key}`));
  return snap.exists() ? snap.val() : null;
}

// realtime listener for a user (optional)
export function onUserProfileChange(email, callback){
  const key = emailKey(email);
  onValue(dbRef(db, `${PATHS.users}/${key}`), snap => callback(snap.exists()?snap.val():null));
}

// ---------- ORDERS: push new order ----------
export async function pushOrder(orderObj){
  const r = await dbPush(dbRef(db, PATHS.orders), orderObj);
  return r.key; // order key/id in DB
}

// If you want to listen to orders in realtime (admin)
export function onOrdersChange(callback){
  onValue(dbRef(db, PATHS.orders), snap => {
    const v = snap.exists() ? snap.val() : {};
    // convert to array with keys
    const list = Object.entries(v).map(([k,val])=>({ id:k, ...val })).sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
    callback(list);
  });
}

// ---------- STORAGE: upload file (logo/invoice header) ----------
export async function uploadFileAndGetURL(file, path='uploads'){
  const fname = `${path}/${Date.now()}_${file.name}`;
  const r = storageRef(storage, fname);
  const snap = await uploadBytes(r, file);
  const url = await getDownloadURL(r);
  return url;
}

// ---------- END Firebase helpers ----------

// === PROFILE SAVE & LOAD LOGIC ===

// 1. Profile Save Karne Ka Function
async function saveUserProfile() {
  const name = document.getElementById('userNameInput').value;
  const shop = document.getElementById('userShopName').value;
  const phone = document.getElementById('userPhone').value;
  const gstin = document.getElementById('userGstin').value;
  const address = document.getElementById('userAddress').value;

  const userEmail = localStorage.getItem('med_currentUser') || 'guest@example.com';
  const userProfile = { name, shop, phone, gstin, address, updatedAt: new Date().toISOString() };

  try {
    await saveUserProfileToCloud(userEmail, userProfile); // firebase helper
    // optionally still keep local copy for fast UI:
    localStorage.setItem('med_userProfile', JSON.stringify(userProfile));
    updateProfileUI(); // updates UI from localStorage or cloud
    alert("✅ Profile saved to cloud!");
  } catch(err) {
    console.error(err);
    alert("Save failed. Check console.");
  }
}

// 2. UI Update Karne Ka Function (Load hone par aur Save hone par chalega)
async function updateProfileUI(){
  const currentUserEmail = localStorage.getItem('med_currentUser') || 'guest@example.com';
  // try cloud first
  try{
    const cloudData = await loadUserProfileFromCloud(currentUserEmail);
    const storedData = cloudData || JSON.parse(localStorage.getItem('med_userProfile'));
    if(storedData){
      if(document.getElementById('userNameInput')) document.getElementById('userNameInput').value = storedData.name || '';
      if(document.getElementById('userShopName')) document.getElementById('userShopName').value = storedData.shop || '';
      if(document.getElementById('userPhone')) document.getElementById('userPhone').value = storedData.phone || '';
      if(document.getElementById('userGstin')) document.getElementById('userGstin').value = storedData.gstin || '';
      if(document.getElementById('userAddress')) document.getElementById('userAddress').value = storedData.address || '';

      const displayName = storedData.name ? storedData.name : 'Guest User';
      document.getElementById('profileNameDisplay').innerText = displayName;
      document.getElementById('menuUserEmail').innerText = displayName;
    }
    document.getElementById('profileEmailDisplay').innerText = currentUserEmail;
  }catch(err){
    console.error('Profile load failed', err);
    // fallback to old localStorage method
    const storedData = JSON.parse(localStorage.getItem('med_userProfile'));
    if(storedData){
      if(document.getElementById('userNameInput')) document.getElementById('userNameInput').value = storedData.name || '';
      if(document.getElementById('profileNameDisplay')) document.getElementById('profileNameDisplay').innerText = storedData.name || 'Guest User';
    }
  }
}


// 3. Jab Website Load ho, tab purana data wapas lao
document.addEventListener('DOMContentLoaded', () => {
    updateProfileUI();
});
// === 1. SIDEBAR TOGGLE LOGIC ===
function toggleSideMenu() {
  const menu = document.getElementById('sideMenu');
  const overlay = document.getElementById('sideMenuOverlay');
  
  // Check karo class hai ya nahi
  if (menu.classList.contains('open')) {
    menu.classList.remove('open');
    overlay.classList.remove('open');
  } else {
    menu.classList.add('open');
    overlay.classList.add('open');
    
    // Menu khulte hi User Email update karo
    const currentUser = localStorage.getItem('med_currentUser') || 'Guest';
    document.getElementById('menuUserEmail').innerText = currentUser;
  }
}

// === 2. ADMIN LOGS LOGIC (Table mein data dikhana) ===
function loadAdminLogs() {
  const logsBody = document.getElementById('loginLogsBody');
  const logs = JSON.parse(localStorage.getItem('med_loginLogs')) || [];
  
  if (!logsBody) return; // Agar admin page nahi khula to return

  logsBody.innerHTML = ''; // Purana data saaf karo

  // Reverse karke loop chalao taaki latest login upar dikhe
  logs.reverse().forEach(log => {
    const row = `
      <tr>
        <td><strong>${log.email}</strong> <br> <small style="color:gray">${log.type || 'Login'}</small></td>
        <td>${log.time}</td>
        <td style="font-size:12px; color:#666;">${log.device}</td>
      </tr>
    `;
    logsBody.innerHTML += row;
  });
  
  if(logs.length === 0) {
    logsBody.innerHTML = '<tr><td colspan="3" style="text-align:center">No login history found.</td></tr>';
  }
}

// Clear Logs Button ke liye
window.clearLogs = function() {
  if(confirm("Are you sure you want to delete all login history?")) {
    localStorage.removeItem('med_loginLogs');
    loadAdminLogs();
  }
}

// === 3. UPDATED ADMIN UI LOGIC (Aapka purana function update kiya) ===
const originalUpdateAdminUI = updateAdminUI; // Purana function save kiya agar zarurat ho

updateAdminUI = function() {
  // 1. Purana logic run karo (Bottom nav ke liye)
  $$('.admin-only').forEach(el=> el.classList.toggle('hidden', !adminLogged));
  
  const label = adminLogged ? 'Manage Store' : 'Admin Login';
  
  // 2. Mobile Bottom Nav Update
  if($('#bnAdminNav')) {
    $('#bnAdminNav').querySelector('.bn-t').textContent = adminLogged ? 'Manage' : 'Admin';
  }

  // 3. Hamburger Menu Link Update
  const sideLink = document.getElementById('sideAdminLink');
  if(sideLink) {
    if(adminLogged) {
        sideLink.classList.remove('hidden');
        sideLink.innerText = "🛠️ Manage Store";
    } else {
        sideLink.classList.add('hidden'); // Logout hone par menu se gayab kar do
    }
  }
  
  // 4. Agar Admin logged in hai, to Logs Table load karo
  if(adminLogged) {
    loadAdminLogs();
  }
}

// === 4. LOGOUT FUNCTION ===
window.logoutUser = function() {
    // User Data Clear
    localStorage.removeItem('med_isLoggedIn');
    localStorage.removeItem('med_currentUser');
    
    // Admin Data Clear (Agar admin bhi login tha)
    adminLogged = false;
    updateAdminUI();
    
    // Reload Page
    location.reload();
}
// ================= AUTH & LOGIC =================

const loginOverlay = document.getElementById('login-overlay');
const mainWebsite = document.getElementById('main-website');
const formTitle = document.getElementById('form-title');
const submitBtn = document.getElementById('submit-btn');
const switchText = document.getElementById('switch-text');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const rememberCheckbox = document.getElementById('remember-me');

// 1. CHECK LOGIN STATUS ON LOAD
window.addEventListener('DOMContentLoaded', () => {
    const isLoggedIn = localStorage.getItem('med_isLoggedIn');
    
    if (isLoggedIn === 'true') {
        showMainWebsite();
    } else {
        showLoginScreen();
    }
});

function showLoginScreen() {
    loginOverlay.style.display = 'flex';
    mainWebsite.style.display = 'none';
    document.body.classList.add('login-active'); // Locks scroll
}

function showMainWebsite() {
    loginOverlay.style.display = 'none';
    mainWebsite.style.display = 'block';
    document.body.classList.remove('login-active'); // Unlocks scroll
}

// 2. TOGGLE PASSWORD VISIBILITY
window.togglePassword = function() {
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
    } else {
        passwordInput.type = "password";
    }
};

// 3. TOGGLE LOGIN / SIGNUP MODE
let isLoginMode = true;

window.toggleMode = function() {
    isLoginMode = !isLoginMode;
    
    if (isLoginMode) {
        formTitle.innerText = "Welcome Back";
        submitBtn.innerText = "Sign In";
        switchText.innerText = "Don't have an account?";
    } else {
        formTitle.innerText = "Create Account";
        submitBtn.innerText = "Sign Up";
        switchText.innerText = "Already have an account?";
    }
};

// 4. HANDLE FORM SUBMISSION
document.getElementById('auth-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = emailInput.value;
    const password = passwordInput.value;
    
    // Get existing users
    let users = JSON.parse(localStorage.getItem('med_users')) || [];
    // Get login logs
    let loginLogs = JSON.parse(localStorage.getItem('med_loginLogs')) || [];

    if (isLoginMode) {
        // === SIGN IN ===
        const userFound = users.find(user => user.email === email && user.password === password);
        
        if (userFound) {
            // Save Login Log (Tracking)
            const log = {
                email: email,
                time: new Date().toLocaleString(),
                device: navigator.userAgent
            };
            loginLogs.push(log);
            localStorage.setItem('med_loginLogs', JSON.stringify(loginLogs));
            
            // Complete Login
            completeLogin(email);
        } else {
            alert("Incorrect Email or Password! Please Sign Up first.");
        }

    } else {
        // === SIGN UP ===
        const userExists = users.find(user => user.email === email);
        
        if (userExists) {
            alert("This email is already registered. Please Sign In.");
        } else {
            // Create new user
            users.push({ email: email, password: password });
            localStorage.setItem('med_users', JSON.stringify(users));
            
            // Auto-login after signup
            const log = {
                email: email,
                time: new Date().toLocaleString(),
                device: navigator.userAgent,
                type: "New Registration"
            };
            loginLogs.push(log);
            localStorage.setItem('med_loginLogs', JSON.stringify(loginLogs));

            alert("Account created successfully!");
            completeLogin(email);
        }
    }
});

function completeLogin(email) {
    if (rememberCheckbox.checked) {
        localStorage.setItem('med_isLoggedIn', 'true');
    } else {
        // Temporary session (could be handled differently, but keeping consistent for now)
        localStorage.setItem('med_isLoggedIn', 'true'); 
    }
    showMainWebsite();
}
// Wholesale Medical Shop
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
  customer: 'mw_customer',
  editPin: 'mw_edit_pin',
  siteText: 'mw_site_text',
  invHeader: 'mw_inv_header',
  theme: 'mw_theme'
};

const bc = 'BroadcastChannel' in window ? new BroadcastChannel('mw_orders') : null;
function broadcastUpdate(){ 
  try{ localStorage.setItem('mw_update_ping', String(Date.now())); }catch(e){} 
  bc?.postMessage({type:'update'}); 
}

let store = get(LS.store, null);
let items = get(LS.items, null);
let orders = get(LS.orders, []);
let cart = get(LS.cart, []);
let adminPin = get(LS.pin, '1234');
let editPin = get(LS.editPin, '1111');
let logoData = localStorage.getItem(LS.logo);
let invHeaderData = localStorage.getItem(LS.invHeader);
let adminLogged = get(LS.session, false);
let customer = get(LS.customer, {name:'', phone:'', biz:'', gstin:''});
let siteText = get(LS.siteText, {});
let theme = get(LS.theme, {primary:'#06b6d4', bg:'#f0f9ff'});

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
initDefaults();

// ------------------ ADD THIS BLOCK EXACTLY HERE ------------------
onSettingsChange((newSettings) => {
  if(!newSettings) return;

  store = { ...store, ...newSettings };     // merge Firebase → local store
  set(LS.store, store);                     // keep local fallback

  renderBrand();
  renderHomeStats();

  if (adminLogged) renderOrders();
});
// -----------------------------------------------------------------

// Brand / header / footer
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

  const img = $('#logoImg');
  if(logoData){ img.src = logoData; img.classList.remove('hidden'); $('.logo-placeholder')?.classList.add('hidden'); } 
  else { img.classList.add('hidden'); $('.logo-placeholder')?.classList.remove('hidden'); }

  const mapWrap = $('#mapWrap');
  if(store.map){ $('#mapFrame').src = store.map; mapWrap?.classList.remove('hidden'); } else { mapWrap?.classList.add('hidden'); }

  const callBtn = $('#ctaCallBtn');
  if(callBtn){ const digits = (store.phone||'').replace(/\D/g,''); callBtn.href = digits ? `tel:${digits}` : '#'; }

  applySiteText();
  applyTheme();
}

function applySiteText(){
  for(const [id, html] of Object.entries(siteText)){
    const el = document.getElementById(id);
    if(el) el.innerHTML = html;
  }
}
function applyTheme(){
  document.documentElement.style.setProperty('--primary', theme.primary);
  document.documentElement.style.setProperty('--bg', theme.bg);
  // Update pickers if editor open
  const p = $('#themePrimaryVal'), b = $('#themeBgVal');
  if(p) p.value = theme.primary;
  if(b) b.value = theme.bg;
}

// Navigation
function showSection(id){
  $$('.section').forEach(s=>s.classList.add('hidden'));
  $('#'+id)?.classList.remove('hidden');
  $$('.nav.desktop a').forEach(a=>a.classList.remove('active'));
  $(`.nav.desktop a[data-section="${id}"]`)?.classList.add('active');
  $$('.bottom-nav .bn-link').forEach(a=>a.classList.remove('active'));
  $(`.bottom-nav .bn-link[data-section="${id}"]`)?.classList.add('active');

  if(id==='cart'){ renderCustomerOrdersList(); renderCart(); }
}
document.addEventListener('click', (e)=>{
  const t = e.target.closest('[data-section]');
  if(t){ e.preventDefault(); showSection(t.dataset.section); }
});

// Admin visibility
function updateAdminUI(){
  $$('.admin-only').forEach(el=> el.classList.toggle('hidden', !adminLogged));
  const label = adminLogged ? 'Manage' : 'Admin';
  $('#adminNav') && ($('#adminNav').textContent = label);
  $('#bnAdminNav') && ($('#bnAdminNav').querySelector('.bn-t').textContent = label);
}

const ADMIN_TAP_TARGET_ID = 'brandingArea';
const MOBILE_TAP_COUNT = 5;
const TAP_WINDOW_MS = 1500;
function openAdminLogin(){ showSection('adminPanel'); $('#adminPinInput')?.focus(); }
document.addEventListener('keydown', (e)=>{ if ((e.key==='a' || e.key==='A') && e.altKey) openAdminLogin(); });
(function setupMobileTapToAdmin(){
  const target = document.getElementById(ADMIN_TAP_TARGET_ID);
  if(!target) return;
  let tapCount = 0, tapTimer = null;
  target.addEventListener('click', ()=>{
    tapCount++; clearTimeout(tapTimer); tapTimer = setTimeout(()=> tapCount=0, TAP_WINDOW_MS);
    if(tapCount>=MOBILE_TAP_COUNT){ tapCount=0; clearTimeout(tapTimer); openAdminLogin(); }
  });
})();

// Products
function categories(){ return [...new Set(items.map(i=>i.category).filter(Boolean))]; }
function renderCategoryFilter(){
  const sel = $('#categoryFilter'); if(!sel) return;
  sel.innerHTML = `<option value="">All Categories</option>` + categories().map(c=>`<option>${c}</option>`).join('');
}
function placeholderImg(name='Img', w=400, h=300){
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e0f2fe"/><stop offset="100%" stop-color="#bae6fd"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#0369a1" font-family="sans-serif" font-weight="bold" font-size="20">${name}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
function productCard(p){
  const img = p.img || placeholderImg(p.name);
  return `
    <div class="product hover-lift">
      <img src="${img}" alt="${p.name}" loading="lazy">
      <div class="meta"><h4>${p.name}</h4><div class="muted small">${p.category || ''}${p.pack? ' · '+p.pack:''}</div></div>
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
  if(q) list = list.filter(i=>i.name.toLowerCase().includes(q) || (i.category||'').toLowerCase().includes(q));
  list = sortItems(list);
  grid.innerHTML = list.map(productCard).join('');
  $('#noProducts')?.classList.toggle('hidden', list.length>0);
  $$('.addBtn', grid).forEach(b=>b.addEventListener('click', ()=>{ 
    addToCart(b.dataset.id,1); const orig = b.textContent; b.textContent = 'Added!'; setTimeout(()=>b.textContent=orig, 800);
  }));
}
$('#searchInput')?.addEventListener('input', renderProducts);
$('#categoryFilter')?.addEventListener('change', renderProducts);
$('#sortSelect')?.addEventListener('change', (e)=>{ currentSort = e.target.value; renderProducts(); });

// Home
function initHome(){
  $('#homeSearchForm')?.addEventListener('submit', (e)=>{
    e.preventDefault(); const q = $('#homeSearchInput').value.trim();
    $('#searchInput') && ($('#searchInput').value = q);
    showSection('products'); renderProducts(); window.scrollTo({top:0, behavior:'smooth'});
  });
  renderHomeTiles(); renderHomeStats();
}
function renderHomeTiles(){
  const wrap = $('#catTiles'); if(!wrap) return;
  const cats = categories();
  wrap.innerHTML = cats.slice(0,10).map(c=>`<button class="tile" data-cat="${c}">${emojiForCat(c)} ${c}</button>`).join('') + `<button class="tile" data-cat="">All Products →</button>`;
  $$('.tile', wrap).forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const cat = btn.dataset.cat || ''; $('#categoryFilter').value = cat;
      showSection('products'); renderProducts(); window.scrollTo({top:0, behavior:'smooth'});
    });
  });
}
function emojiForCat(c){
  const s=c.toLowerCase();
  if(s.includes('med')) return '💊'; if(s.includes('surg')) return '🧤'; if(s.includes('consum')) return '🧪'; if(s.includes('diag') || s.includes('device')) return '🩺';
  return '📦';
}
function renderHomeStats(){
  $('#countItems') && ($('#countItems').textContent = items.length);
  $('#countCats') && ($('#countCats').textContent = categories().length);
  const activeOrders = orders.filter(o => !o.adminDeleted).length;
  $('#countOrders') && ($('#countOrders').textContent = activeOrders);
}

// Cart
function updateCartBadge(){
  const count = cart.reduce((a,c)=>a+c.qty,0);
  $('#cartCount') && ($('#cartCount').textContent = count); $('#bnCartCount') && ($('#bnCartCount').textContent = count);
}
function addToCart(id, qty=1){
  const p = items.find(x=>x.id===id); if(!p || p.stock<=0) return;
  const ex = cart.find(c=>c.id===id);
  if(ex) ex.qty = Math.min(ex.qty+qty, p.stock);
  else cart.push({id, name:p.name, price:p.price, qty, img:p.img, gst:p.gst||0, hsn:p.hsn||'', pack:p.pack||''});
  set(LS.cart, cart); updateCartBadge();
  if(!$('#cart').classList.contains('hidden')) renderCart();
}
function renderCart(){
  const list = $('#cartList'); const empty = $('#cartEmpty'); const checkout = $('#checkoutBox');
  if(!list || !empty || !checkout) return;
  list.innerHTML = '';
  if(cart.length===0){ empty.classList.remove('hidden'); checkout.classList.add('hidden'); return; }
  empty.classList.add('hidden'); checkout.classList.remove('hidden');
  cart.forEach(c=>{
    const p = items.find(i=>i.id===c.id); const img = c.img || p?.img || placeholderImg(c.name,120,120);
    const row = document.createElement('div'); row.className = 'rowItem';
    row.innerHTML = `<img class="item-thumb" src="${img}"><div style="flex:1"><h4>${c.name}</h4><div class="muted small">${fmt(c.price)} · GST ${c.gst||0}%</div></div>
      <div class="qty"><button class="btn secondary small" data-act="dec">-</button><input type="number" min="1" value="${c.qty}"><button class="btn secondary small" data-act="inc">+</button><button class="btn danger small" data-act="rem">×</button></div>`;
    const inp = $('input', row);
    $('[data-act="dec"]', row).addEventListener('click', ()=>{ c.qty=Math.max(1,c.qty-1); set(LS.cart,cart); renderCart(); updateCartBadge(); });
    $('[data-act="inc"]', row).addEventListener('click', ()=>{ const max = (items.find(i=>i.id===c.id)?.stock)||999; c.qty = Math.min(max, c.qty+1); set(LS.cart,cart); renderCart(); updateCartBadge(); });
    $('[data-act="rem"]', row).addEventListener('click', ()=>{ cart=cart.filter(x=>x.id!==c.id); set(LS.cart,cart); updateCartBadge(); renderCart(); });
    inp.addEventListener('change', ()=>{ let v = parseInt(inp.value||'1'); if(isNaN(v)||v<1) v=1; const max = (items.find(i=>i.id===c.id)?.stock)||999; c.qty = Math.min(max, v); set(LS.cart,cart); renderCart(); updateCartBadge(); });
    list.appendChild(row);
  });
  recalcSummary();
}
$('#clearCartBtn')?.addEventListener('click', ()=>{ if(cart.length && confirm('Clear cart?')){ cart=[]; set(LS.cart,cart); updateCartBadge(); renderCart(); } });
function recalcSummary(){
  const ordType = $('input[name="ordType"]:checked')?.value || 'Pickup';
  const shipping = ordType==='Delivery' && store.delivery==='yes' ? Math.max(0, Number(store.shipFee||0)) : 0;
  let sub = 0, gstAmt = 0;
  cart.forEach(c=>{ const line = c.price * c.qty; sub += line; gstAmt += line * (Number(c.gst||0)/100); });
  const total = sub + gstAmt + shipping;
  $('#sumSub').textContent = fmt(sub); $('#sumGst').textContent = fmt(gstAmt); $('#sumShip').textContent = fmt(shipping); $('#sumGrand').textContent = fmt(total);
  $('#shipRow')?.classList.toggle('hidden', !(ordType==='Delivery' && store.delivery==='yes' && shipping>0));
  $('#taxSummary').textContent = `GST Total: ${fmt(gstAmt.toFixed(2))}`;
  return { sub, gst:gstAmt, shipping, total };
}

// Checkout
function setupCheckout(){
  $('#custName').value = customer.name||''; $('#custPhone').value = customer.phone||''; $('#custBiz').value = customer.biz||''; $('#custGstin').value = customer.gstin||'';
  $$('input[name="ordType"]').forEach(r=>{ r.addEventListener('change', ()=>{ $('#deliveryFields').classList.toggle('hidden', r.value!=='Delivery'); recalcSummary(); }); });
  $('#checkoutForm')?.addEventListener('submit', (e)=>{
    e.preventDefault(); if(cart.length===0) return;
    const name = $('#custName').value.trim(); const phone = $('#custPhone').value.replace(/\D/g,'');
    const ordType = $('input[name="ordType"]:checked').value;
    const addr = { line: $('#addrLine').value.trim(), area: $('#addrArea').value.trim(), city: store.city, pin: store.pincode };
    if(!name || phone.length!==10) return alert('Check Name/Phone');
    if(ordType==='Delivery' && (!addr.line || !addr.area)) return alert('Address required');
    const totals = recalcSummary();
    const lookup = Object.fromEntries(items.map(i=>[i.id,i]));
    for(const c of cart){ if(!lookup[c.id] || c.qty > lookup[c.id].stock){ alert(`Not enough stock for ${c.name}.`); return; } }
    const order = {
      id: uid('ORD-').toUpperCase(), createdAt: new Date().toISOString(),
      customer: {name, phone, biz: $('#custBiz').value, gstin: $('#custGstin').value},
      type: ordType, address: addr, schedule: {date: new Date().toISOString().split('T')[0], time: new Date().toLocaleTimeString()},
      notes: $('#orderNotes').value.trim(),
      items: cart.map(c=>({id:c.id, name:c.name, price:c.price, qty:c.qty, gst:c.gst||0, hsn:c.hsn||'', pack:c.pack||''})),
      amounts: totals, status: 'Pending', invoiceNo: null, adminDeleted: false
    };
    order.items.forEach(oi=>{ lookup[oi.id].stock -= oi.qty; });
    set(LS.items, items); orders.unshift(order); set(LS.orders, orders);
    customer = order.customer; set(LS.customer, customer);
    cart = []; set(LS.cart, cart); updateCartBadge(); renderProducts(); renderCart();
    $('#orderSuccess').classList.remove('hidden'); $('#orderSuccess').innerHTML = `Order <strong>${order.id}</strong> Placed!`; $('#orderSuccess').scrollIntoView({behavior:'smooth'});
    renderCustomerOrdersList(); broadcastUpdate();
  });
}

// Customer Orders
function getOrdersByPhone(phone){
  const d = (phone||'').replace(/\D/g,'');
  return orders.filter(o=> (o.customer?.phone||'').replace(/\D/g,'')===d).sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));
}
$('#custOrdersForm')?.addEventListener('submit', (e)=>{
  e.preventDefault(); const digits = ($('#custOrdersPhone').value||'').replace(/\D/g,'');
  if(digits.length!==10){ alert('Enter exactly 10 digits.'); return; }
  customer.phone = digits; set(LS.customer, customer); renderCustomerOrdersList();
});
function renderCustomerOrdersList(){
  $('#custOrdersPhone').value = customer.phone||'';
  const list = $('#custOrdersList'); list.innerHTML = '';
  const data = getOrdersByPhone(customer.phone);
  $('#custNoOrders').classList.toggle('hidden', data.length>0);
  data.forEach(o=>{
    const div = document.createElement('div'); div.className = 'order';
    div.innerHTML = `<div class="top"><div><strong>${o.id}</strong> ${o.adminDeleted?'<span class="pill">Archived</span>':''}<br><small class="muted">${new Date(o.createdAt).toLocaleString()}</small></div>
      <div><strong>${fmt(o.amounts.total)}</strong><br><span class="status-pill">${o.status}</span></div></div>
      <div class="items small muted" style="margin:8px 0">${o.items.map(i=>`${i.name} x${i.qty}`).join(', ')}</div>
      <div class="actions"><button class="btn secondary small block" data-act="inv">View Invoice</button></div>`;
    $('[data-act="inv"]', div).addEventListener('click', ()=> printInvoice(o)); list.appendChild(div);
  });
}

// Admin
function renderAdminState(){ $('#adminLoginBox').classList.toggle('hidden', adminLogged); $('#adminArea').classList.toggle('hidden', !adminLogged); updateAdminUI(); }
$('#adminLoginForm')?.addEventListener('submit', (e)=>{ e.preventDefault(); if($('#adminPinInput').value===adminPin){ adminLogged=true; set(LS.session,true); renderAdminState(); renderOrders(); renderItemsManage(); fillSettings(); fillInvoiceForm(); } });
$('#adminLogoutBtn')?.addEventListener('click', ()=>{ adminLogged=false; set(LS.session,false); renderAdminState(); });
$$('.tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    if(btn.id==='adminLogoutBtn') return;
    if(btn.id==='siteEditorBtn'){ toggleSiteEditor(); return; }
    $$('.tab-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
    $$('.tab').forEach(t=>t.classList.add('hidden')); $('#'+btn.dataset.tab).classList.remove('hidden');
    if(btn.dataset.tab==='ordersTab') renderOrders();
    if(btn.dataset.tab==='itemsTab') renderItemsManage();
  });
});

// Site Editor & Theme
function toggleSiteEditor(){
  if(prompt('Enter Editor PIN:') === editPin){
    document.body.contentEditable = false;
    $$('.editable-text').forEach(el => el.contentEditable = "true");
    $('#editorControls').classList.remove('hidden');
    alert('Editor Enabled! Change colors or click text to edit.');
  } else alert('Wrong PIN');
}
$('#cancelEditorBtn')?.addEventListener('click', ()=>{
  $$('[contenteditable]').forEach(el=>el.contentEditable="false");
  $('#editorControls').classList.add('hidden'); applySiteText(); applyTheme();
});
$('#saveEditorBtn')?.addEventListener('click', ()=>{
  const editables = $$('.editable-text'), changes = {};
  editables.forEach(el => { if(el.id) changes[el.id] = el.innerHTML; });
  siteText = {...siteText, ...changes}; set(LS.siteText, siteText);
  theme = { primary: $('#themePrimaryVal').value, bg: $('#themeBgVal').value }; set(LS.theme, theme);
  $$('[contenteditable]').forEach(el=>el.contentEditable="false");
  $('#editorControls').classList.add('hidden'); alert('Saved!'); broadcastUpdate(); applyTheme();
});

function renderOrders(){
  const wrap = $('#ordersList'); wrap.innerHTML = '';
  const list = orders.filter(o => !o.adminDeleted);
  $('#noOrders').classList.toggle('hidden', list.length>0);
  list.forEach(o=>{
    const div = document.createElement('div'); div.className = 'order';
    div.innerHTML = `<div class="top"><div><strong>${o.id}</strong><br><small class="muted">${new Date(o.createdAt).toLocaleString()}</small></div>
      <div><small>${o.type}</small> · ${o.customer.name}</div><div><strong>${fmt(o.amounts.total)}</strong></div><div><span class="status-pill">${o.status}</span></div></div>
      <div class="actions" style="margin-top:12px; display:flex; gap:8px">
        <select class="statusSel">${['Pending','Confirmed','Ready','Delivered','Cancelled'].map(s=>`<option ${s===o.status?'selected':''}>${s}</option>`).join('')}</select>
        <button class="btn secondary small" data-act="inv">Inv</button><button class="btn danger small" data-act="del">Del</button>
      </div>`;
    $('.statusSel', div).addEventListener('change', (e)=>{ o.status = e.target.value; set(LS.orders, orders); renderOrders(); broadcastUpdate(); });
    $('[data-act="inv"]', div).addEventListener('click', ()=>{ if(!o.invoiceNo) generateInvoiceNumber(o); printInvoice(o); });
    $('[data-act="del"]', div).addEventListener('click', ()=>{ if(confirm('Delete?')){ o.adminDeleted=true; set(LS.orders, orders); renderOrders(); broadcastUpdate(); } });
    wrap.appendChild(div);
  });
}

// Settings & Invoice Upload
$('#settingsForm')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  store.name = $('#setName').value; store.phone = $('#setPhone').value;
  // handle logo upload to firebase storage
  const file = $('#setLogo')?.files?.[0];
  if(file){
    try{
      const url = await uploadFileAndGetURL(file, 'logos');
      // store.logo = url;    // optional: if you want to show logo from cloud
      localStorage.setItem(LS.logo, url);
    }catch(err){
      console.error('Logo upload failed', err);
      alert('Logo upload failed');
    }
  }
  // write store/settings to realtime DB
  try{
    await writeSettings(store);
    // still keep local copy for offline
    set(LS.store, store);
    renderBrand();
    broadcastUpdate();
    alert('Settings saved to cloud');
  }catch(err){
    console.error(err);
    alert('Could not save settings to cloud');
  }
});
$('#invoiceForm')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const file = $('#invHeaderImg')?.files?.[0]; if(file) localStorage.setItem(LS.invHeader, await fileToDataURL(file));
  store.invoice.bank = $('#invBank').value; store.invoice.terms = $('#invTerms').value;
  set(LS.store, store); alert('Saved');
});
function fillInvoiceForm(){
  $('#invBank').value = store.invoice?.bank || ''; $('#invTerms').value = store.invoice?.terms || '';
}
function generateInvoiceNumber(order){
  const pre = store.invoice?.prefix || 'MW-'; let next = store.invoice?.next || 1;
  order.invoiceNo = `${pre}${next}`; store.invoice.next = next + 1; set(LS.store, store);
}
function printInvoice(order){
  invHeaderData = localStorage.getItem(LS.invHeader);
  const headerHtml = invHeaderData ? `<img src="${invHeaderData}" style="width:100%;max-height:150px;object-fit:contain;margin-bottom:20px">` 
  : `<div style="border-bottom:1px solid #ccc;padding-bottom:10px;margin-bottom:20px"><h2>${store.name}</h2><div>${store.address}</div></div>`;
  
  const rows = order.items.map(i=>`<tr><td>${i.name}</td><td>${i.qty}</td><td>${fmt(i.price)}</td><td>${fmt(i.price*i.qty)}</td></tr>`).join('');
  const w = window.open('','_blank');
  w.document.write(`<html><body style="font-family:sans-serif;padding:20px">
    ${headerHtml}
    <h3>Invoice ${order.invoiceNo}</h3>
    <p>Customer: ${order.customer.name} (${order.customer.phone})</p>
    <table style="width:100%;border-collapse:collapse;margin-top:20px" border="1">
    <thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${rows}</tbody>
    <tfoot><tr><td colspan="3" align="right"><strong>Total</strong></td><td><strong>${fmt(order.amounts.total)}</strong></td></tr></tfoot>
    </table>
    <script>window.print();</script>
  </body></html>`);
  w.document.close();
}
function fileToDataURL(file){ return new Promise((r)=>{ const rd=new FileReader(); rd.onload=()=>r(rd.result); rd.readAsDataURL(file); }); }

// Updates
window.addEventListener('storage', (e)=>{ if(['mw_orders','mw_store','mw_items','mw_site_text','mw_theme'].includes(e.key)){ 
  orders=get(LS.orders,[]); items=get(LS.items,null); store=get(LS.store,null); 
  renderBrand(); renderHomeStats(); if(adminLogged) renderOrders(); 
}});
bc && (bc.onmessage = ()=>{ orders=get(LS.orders,[]); renderHomeStats(); if(adminLogged) renderOrders(); });

// Init
function renderItemsManage(){
  const box = $('#itemsList'); box.innerHTML = '';
  items.forEach(it=>{
    const row = document.createElement('div'); row.className = 'itemRow order';
    row.innerHTML = `<div><strong>${it.name}</strong></div><div>Stock: ${it.stock}</div><button class="btn danger small" data-act="del">Del</button>`;
    $('[data-act="del"]', row).addEventListener('click', ()=>{ if(confirm('Del?')){ items=items.filter(x=>x.id!==it.id); set(LS.items, items); renderItemsManage(); renderProducts(); broadcastUpdate(); } });
    box.appendChild(row);
  });
}
init();