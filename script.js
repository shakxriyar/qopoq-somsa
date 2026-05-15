import { initializeApp }   from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getDatabase, ref, push, set,
    onValue, remove, get, update
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

/* ══════════════════════════════════════════
   FIREBASE CONFIG
══════════════════════════════════════════ */
const firebaseConfig = {
    apiKey:            "AIzaSyCZdqBBYEoIXAqln8a9c801AT3G_I_ys4U",
    authDomain:        "shsh-120cf.firebaseapp.com",
    databaseURL:       "https://shsh-120cf-default-rtdb.firebaseio.com",
    projectId:         "shsh-120cf",
    storageBucket:     "shsh-120cf.firebasestorage.app",
    messagingSenderId: "897260945183",
    appId:             "1:897260945183:web:6e6fd385b1718ed00afa2a"
};

const app         = initializeApp(firebaseConfig);
const db          = getDatabase(app);
const productsRef = ref(db, 'products');
const salesRef    = ref(db, 'popularity');
const ordersRef   = ref(db, 'orders');

const BOT_TOKEN  = "8271852367:AAGKDNXPaVU-HKZjLaGfCgoKK1DI421XbzY";
const ADMIN_ID   = "8030496668";
const KURYER1_ID = "7312694067";
const KURYER2_ID = "111";

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
function isGPSCoords(str) {
    return /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/.test((str || '').trim());
}

function getMapLink(coords) {
    const parts = coords.split(',').map(s => s.trim());
    return `https://maps.google.com/maps?q=${parts[0]},${parts[1]}`;
}

async function sendTelegram(chatId, text) {
    try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
        });
    } catch(e) { console.warn('Telegram xato:', e); }
}

/* ══════════════════════════════════════════
   STATE
══════════════════════════════════════════ */
window.products     = [];
window.cart         = JSON.parse(localStorage.getItem('qopoq_cart_v3')) || [];
window.isAdmin      = false;
window.popularity   = {};

let adminClicks   = 0;
let modalProdId   = null;
let modalQty      = 1;

/* ══════════════════════════════════════════
   FIREBASE LISTENERS
══════════════════════════════════════════ */
onValue(productsRef, snap => {
    const data = snap.val();
    window.products = [];
    if (data) {
        Object.keys(data).forEach(key => {
            window.products.push({ fKey: key, ...data[key] });
        });
    }
    window.renderMenu();
});

onValue(salesRef, snap => {
    window.popularity = snap.val() || {};
    window.renderMenu();
});

// Real-time orders listener for site admin panel
onValue(ordersRef, snap => {
    const data = snap.val() || {};
    window.allOrders = data;
    renderSiteOrders();
});

/* ══════════════════════════════════════════
   RENDER MENU
══════════════════════════════════════════ */
window.renderMenu = function(data = window.products) {
    const menu = document.getElementById('menuList');
    if (!menu) return;

    if (data.length === 0) {
        menu.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:80px 20px;color:var(--muted);">
                <div style="font-size:3rem;opacity:.2;margin-bottom:14px;">🥟</div>
                <p style="letter-spacing:3px;text-transform:uppercase;font-size:.85rem;">
                    Hozircha taomlar mavjud emas
                </p>
            </div>`;
        return;
    }

    menu.innerHTML = data.map((p, i) => {
        const count    = window.popularity[p.id] || 0;
        const popLabel = count > 0 ? `🔥 ${count} buyurtma` : '🆕 Yangi';
        const delay    = (i % 6) * 70;
        const delBtn   = window.isAdmin
            ? `<button class="admin-del"
                       onclick="event.stopPropagation(); removeProduct('${p.fKey}')"
                       title="O'chirish">×</button>`
            : '';

        return `
        <div class="item" style="animation-delay:${delay}ms"
             onclick="openProductModal(${p.id})">
            ${delBtn}
            <div class="item-img-wrap">
                <img src="${p.img}" alt="${p.name}"
                     onerror="this.src='https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500&q=80'">
                <span class="item-pop">${popLabel}</span>
            </div>
            <div class="item-body">
                <h3>${p.name}</h3>
                <div class="price">${Number(p.price).toLocaleString()} so'm</div>
                <button class="button"
                        onclick="event.stopPropagation(); quickAdd(${p.id})">
                    Savatga
                </button>
            </div>
        </div>`;
    }).join('');
};

/* ══════════════════════════════════════════
   PRODUCT MODAL
══════════════════════════════════════════ */
window.openProductModal = function(id) {
    const p = window.products.find(x => x.id === id);
    if (!p) return;

    modalProdId = id;
    modalQty    = 1;

    document.getElementById('modal-img').src  = p.img;
    document.getElementById('modal-name').textContent = p.name;
    document.getElementById('modal-price').textContent = Number(p.price).toLocaleString() + " so'm";
    document.getElementById('modal-desc').textContent  =
        p.desc || "Xorazmning an'anaviy mashhur taomi. Sifatli mahalliy ingredientlardan tayyorlangan, to'yimli va mazali.";

    const count = window.popularity[p.id] || 0;
    document.getElementById('modal-sales').textContent =
        count > 0 ? `${count} marta buyurtma` : 'Yangi mahsulot';

    const badge = document.getElementById('modal-badge');
    if      (count > 100) badge.textContent = '🔥 Top Seller';
    else if (count > 30)  badge.textContent = '⭐ Mashhur';
    else                  badge.textContent = '';

    document.getElementById('modal-qty').textContent   = 1;
    document.getElementById('modal-total').textContent = Number(p.price).toLocaleString() + " so'm";

    document.getElementById('productModal').classList.add('open');
    document.body.style.overflow = 'hidden';
};

window.closeModal = function() {
    document.getElementById('productModal').classList.remove('open');
    document.body.style.overflow = '';
};

window.closeModalOutside = function(e) {
    if (e.target.id === 'productModal') closeModal();
};

window.changeModalQty = function(delta) {
    modalQty = Math.max(1, modalQty + delta);
    const p  = window.products.find(x => x.id === modalProdId);
    document.getElementById('modal-qty').textContent = modalQty;
    if (p) {
        document.getElementById('modal-total').textContent =
            (Number(p.price) * modalQty).toLocaleString() + " so'm";
    }
};

window.addModalToCart = function() {
    if (!modalProdId) return;
    const p = window.products.find(x => x.id === modalProdId);
    if (!p) return;

    const existing = window.cart.find(x => x.id === modalProdId);
    if (existing) existing.qty += modalQty;
    else window.cart.push({ ...p, qty: modalQty });

    window.updateCart();
    closeModal();
    toast(`✅ ${p.name} savatga qo'shildi!`);
};

/* ══════════════════════════════════════════
   CART
══════════════════════════════════════════ */
window.quickAdd = function(id) {
    const p = window.products.find(x => x.id === id);
    if (!p) return;
    const item = window.cart.find(x => x.id === id);
    if (item) item.qty++;
    else window.cart.push({ ...p, qty: 1 });
    window.updateCart();
    toast(`✅ ${p.name} savatga qo'shildi!`);
};

window.changeQty = function(id, delta) {
    const item = window.cart.find(x => x.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) window.cart = window.cart.filter(x => x.id !== id);
    window.updateCart();
};

window.updateCart = function() {
    localStorage.setItem('qopoq_cart_v3', JSON.stringify(window.cart));

    const badge = document.getElementById('cart-badge');
    if (badge) badge.textContent = window.cart.reduce((s, i) => s + i.qty, 0);

    const cartList = document.getElementById('cart-list');
    const totalEl  = document.getElementById('total-price');
    if (!cartList) return;

    if (window.cart.length === 0) {
        cartList.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-basket"></i>
                <span>Savat bo'sh</span>
                <span class="cart-empty-sub">Menyudan taom qo'shing</span>
            </div>`;
        if (totalEl) totalEl.textContent = '0 so\'m';
        return;
    }

    let total = 0;
    cartList.innerHTML = window.cart.map(i => {
        total += i.price * i.qty;
        return `
        <div class="cart-item">
            <div class="cart-iinfo">
                <span class="cart-iname">${i.name}</span>
                <span class="cart-iprice">${(i.price * i.qty).toLocaleString()} so'm</span>
            </div>
            <div class="ci-ctrl">
                <button class="cib" onclick="changeQty(${i.id}, -1)">−</button>
                <span class="ciq">${i.qty}</span>
                <button class="cib" onclick="changeQty(${i.id}, 1)">+</button>
            </div>
        </div>`;
    }).join('');

    if (totalEl) totalEl.textContent = total.toLocaleString() + " so'm";
};

window.toggleCart = function() {
    const panel    = document.getElementById('cartPanel');
    const backdrop = document.getElementById('cart-backdrop');
    const isOpen   = panel.classList.contains('active');
    panel.classList.toggle('active');
    backdrop.classList.toggle('open');
    document.body.style.overflow = isOpen ? '' : 'hidden';
};

/* ══════════════════════════════════════════
   CHECKOUT — MODAL FLOW
══════════════════════════════════════════ */
window.checkout = function() {
    if (window.cart.length === 0) { toast("⚠️ Savat bo'sh!", 'warn'); return; }
    orderShowStep(1);
    document.getElementById('orderOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
};

window.closeOrderModal = function() {
    document.getElementById('orderOverlay').classList.remove('open');
    document.body.style.overflow = '';
};

window.orderOverlayClose = function(e) {
    if (e.target.id === 'orderOverlay') window.closeOrderModal();
};

function orderShowStep(n) {
    [1, 2, 3].forEach(i => {
        const s = document.getElementById('ostep-' + i);
        const d = document.getElementById('odot-' + i);
        if (!s || !d) return;
        s.classList.toggle('hidden', i !== n);
        d.classList.remove('active', 'done');
        if (i === n)  d.classList.add('active');
        if (i < n)    d.classList.add('done');
    });
}

window.orderGoBack = function(fromStep) {
    orderShowStep(fromStep - 1);
};

window.formatTelInput = function(el) {
    let v = el.value.replace(/[^\d+]/g, '');
    // Ensure always starts with +998
    if (v === '' || v === '+') { el.value = '+998'; return; }
    if (!v.startsWith('+998')) {
        if (v.startsWith('+')) v = '+998' + v.slice(1).replace(/\D/g,'');
        else if (v.startsWith('998')) v = '+' + v;
        else if (v.startsWith('0')) v = '+998' + v.slice(1);
        else v = '+998' + v.replace(/\D/g,'');
    }
    // Limit to +998 XX XXX XX XX (13 chars)
    if (v.length > 13) v = v.slice(0, 13);
    el.value = v;
};

window.initTelPrefix = function(el) {
    if (!el.value || el.value.trim() === '') {
        el.value = '+998';
    }
};

window.orderStep1Next = function() {
    const tel = document.getElementById('order-tel').value.trim();
    if (tel.length < 7) {
        toast("⚠️ To'g'ri telefon raqam kiriting!", 'warn');
        document.getElementById('order-tel').focus();
        return;
    }
    orderShowStep(2);
    setTimeout(() => document.getElementById('order-manzil').focus(), 100);
};

window.orderStep2Next = function() {
    const manzil = document.getElementById('order-manzil').value.trim();
    if (!manzil) {
        toast("⚠️ Manzilni kiriting!", 'warn');
        document.getElementById('order-manzil').focus();
        return;
    }
    const tel  = document.getElementById('order-tel').value.trim();
    let jami   = 0;
    window.cart.forEach(i => { jami += i.price * i.qty; });

    document.getElementById('ocr-tel').textContent    = tel;
    document.getElementById('ocr-manzil').textContent = manzil;
    document.getElementById('ocr-total').textContent  = jami.toLocaleString() + " so'm";
    orderShowStep(3);
};

window.getGPS = function() {
    if (!navigator.geolocation) {
        toast("⚠️ GPS qurilmangizda qo'llab-quvvatlanmaydi.", 'warn');
        return;
    }
    const btn = document.querySelector('.order-gps-btn');
    if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aniqlanmoqda...';

    navigator.geolocation.getCurrentPosition(
        pos => {
            const lat = pos.coords.latitude.toFixed(6);
            const lng = pos.coords.longitude.toFixed(6);
            document.getElementById('order-manzil').value = `${lat},${lng}`;
            if (btn) btn.innerHTML = '<i class="fas fa-check"></i> GPS manzil olindi';
            setTimeout(() => {
                if (btn) btn.innerHTML = '<i class="fas fa-crosshairs"></i> GPS lokatsiyani olish';
            }, 2500);
        },
        () => {
            toast("⚠️ GPS aniqlab bo'lmadi, qo'lda kiriting.", 'warn');
            if (btn) btn.innerHTML = '<i class="fas fa-crosshairs"></i> GPS lokatsiyani olish';
        }
    );
};

window.sendOrder = async function() {
    const tel    = document.getElementById('order-tel').value.trim();
    const manzil = document.getElementById('order-manzil').value.trim();
    const isGPS  = isGPSCoords(manzil);
    const mapLink = isGPS ? getMapLink(manzil) : null;

    let jami = 0;
    const items = window.cart.map(i => {
        jami += i.price * i.qty;
        return { name: i.name, qty: i.qty, price: i.price };
    });

    const orderNum = Date.now();
    const shortId  = '#' + String(orderNum).slice(-5);

    const orderData = {
        id:        orderNum,
        shortId,
        tel,
        manzil,
        isGPS,
        lat:       isGPS ? parseFloat(manzil.split(',')[0]) : null,
        lng:       isGPS ? parseFloat(manzil.split(',')[1]) : null,
        mapLink:   mapLink || null,
        items:     JSON.stringify(items),
        total:     jami,
        status:    'yangi',
        courier:   null,
        createdAt: orderNum
    };

    await push(ordersRef, orderData);

    // Popularity update
    for (const i of items) {
        const pRef = ref(db, 'popularity/' + i.id);
        const snap = await get(pRef);
        await set(pRef, (snap.val() || 0) + i.qty);
    }

    // Build Telegram message
    const itemsText = items.map(i =>
        `• ${i.name} × ${i.qty} = ${(i.price * i.qty).toLocaleString()} so'm`
    ).join('\n');

    const locationText = isGPS && mapLink
        ? `📍 <b>Lokatsiya (GPS):</b> <a href="${mapLink}">Xaritada ko'rish</a>`
        : `📍 <b>Manzil:</b> ${manzil}`;

    const msg =
`🥟 <b>YANGI BUYURTMA — QOPOQ SOMSA</b>
━━━━━━━━━━━━━━━━━━━━━
🆔 Buyurtma: <b>${shortId}</b>
📞 <b>Telefon:</b> ${tel}
${locationText}
━━━━━━━━━━━━━━━━━━━━━
🍽 <b>Taomlar:</b>
${itemsText}
━━━━━━━━━━━━━━━━━━━━━
💰 <b>JAMI: ${jami.toLocaleString()} so'm</b>
━━━━━━━━━━━━━━━━━━━━━
👉 Admin panelda kuryer tayinlang`;

    // Send to admin
    await sendTelegram(ADMIN_ID, msg);

    // Reset
    document.getElementById('order-tel').value    = '';
    document.getElementById('order-manzil').value = '';
    window.cart = [];
    window.updateCart();
    window.closeOrderModal();

    const panel    = document.getElementById('cartPanel');
    const backdrop = document.getElementById('cart-backdrop');
    if (panel?.classList.contains('active')) {
        panel.classList.remove('active');
        backdrop?.classList.remove('open');
        document.body.style.overflow = '';
    }
    toast("🎉 Buyurtmangiz qabul qilindi! Tez orada bog'lanamiz.");
};

/* ══════════════════════════════════════════
   SITE ADMIN ORDERS PANEL (real-time)
══════════════════════════════════════════ */
window.allOrders = {};

function statusLabel(s) {
    const map = {
        yangi:      { text: '🆕 Yangi',       cls: 'st-new' },
        tayinlandi: { text: '🚴 Tayinlandi',   cls: 'st-assigned' },
        yetkazildi: { text: '✅ Yetkazildi',   cls: 'st-done' },
        bekor:      { text: '❌ Bekor',        cls: 'st-cancel' }
    };
    return map[s] || { text: s, cls: '' };
}

function renderSiteOrders() {
    const container = document.getElementById('site-orders-list');
    if (!container) return;

    const orders = Object.entries(window.allOrders || {})
        .map(([k, v]) => ({ _key: k, ...v }))
        .sort((a, b) => b.createdAt - a.createdAt);

    if (orders.length === 0) {
        container.innerHTML = `<div class="so-empty"><i class="fas fa-inbox"></i><span>Hozircha buyurtmalar yo'q</span></div>`;
        return;
    }

    container.innerHTML = orders.map(o => {
        const items = JSON.parse(o.items || '[]');
        const st    = statusLabel(o.status);
        const loc   = o.isGPS && o.mapLink
            ? `<a href="${o.mapLink}" target="_blank" class="so-map-link"><i class="fas fa-map-marker-alt"></i> Xaritada ko'rish</a>`
            : `<span class="so-addr"><i class="fas fa-map-marker-alt"></i> ${o.manzil}</span>`;
        const time = new Date(o.createdAt).toLocaleString('uz-UZ');
        const courierName = o.courier === 'kuryer1' ? '🧑 Kuryer 1' : o.courier === 'kuryer2' ? '🧑 Kuryer 2' : '—';

        return `
        <div class="so-card" data-key="${o._key}" data-status="${o.status}">
            <div class="so-card-head">
                <div class="so-id-info">
                    <span class="so-id">${o.shortId || ('#' + String(o.id).slice(-5))}</span>
                    <span class="so-time">${time}</span>
                </div>
                <span class="so-status ${st.cls}">${st.text}</span>
            </div>
            <div class="so-card-body">
                <div class="so-row"><i class="fas fa-phone-alt"></i><span>${o.tel}</span></div>
                <div class="so-row">${loc}</div>
                <div class="so-items">
                    ${items.map(i => `<span class="so-item">${i.name} ×${i.qty}</span>`).join('')}
                </div>
                <div class="so-total"><i class="fas fa-coins"></i> ${Number(o.total).toLocaleString()} so'm</div>
            </div>
            <div class="so-card-foot">
                <div class="so-courier-info">
                    <span class="so-clbl">Kuryer:</span>
                    <span class="so-cval">${courierName}</span>
                </div>
                ${o.status === 'yangi' || o.status === 'tayinlandi' ? `
                <div class="so-actions">
                    <button class="so-btn so-k1 ${o.courier==='kuryer1'?'active':''}" onclick="assignCourier('${o._key}','kuryer1')">
                        <i class="fas fa-motorcycle"></i> Kuryer 1
                    </button>
                    <button class="so-btn so-k2 ${o.courier==='kuryer2'?'active':''}" onclick="assignCourier('${o._key}','kuryer2')">
                        <i class="fas fa-motorcycle"></i> Kuryer 2
                    </button>
                    <button class="so-btn so-done" onclick="markDone('${o._key}')">
                        <i class="fas fa-check"></i> Yetkazildi
                    </button>
                    <button class="so-btn so-cancel" onclick="cancelOrder('${o._key}')">
                        <i class="fas fa-times"></i> Bekor
                    </button>
                </div>` : ''}
            </div>
        </div>`;
    }).join('');

    // update badge
    const newCount = orders.filter(o => o.status === 'yangi').length;
    const badge = document.getElementById('site-orders-badge');
    if (badge) {
        badge.textContent = newCount;
        badge.style.display = newCount > 0 ? 'flex' : 'none';
    }
}

window.assignCourier = async function(key, courier) {
    const order = window.allOrders[key];
    if (!order) return;

    await update(ref(db, 'orders/' + key), {
        courier,
        status: 'tayinlandi'
    });

    // Send Telegram to courier
    const items = JSON.parse(order.items || '[]');
    const itemsText = items.map(i => `• ${i.name} × ${i.qty} = ${(i.price * i.qty).toLocaleString()} so'm`).join('\n');
    const locationText = order.isGPS && order.mapLink
        ? `📍 <b>Lokatsiya (GPS):</b> <a href="${order.mapLink}">Xaritada ko'rish</a>`
        : `📍 <b>Manzil:</b> ${order.manzil}`;

    const courierName = courier === 'kuryer1' ? 'Kuryer 1' : 'Kuryer 2';
    const courierId   = courier === 'kuryer1' ? KURYER1_ID : KURYER2_ID;

    const courierMsg =
`🚴 <b>YANGI BUYURTMA SIZGA TAYINLANDI!</b>
━━━━━━━━━━━━━━━━━━━━━
🆔 Buyurtma: <b>${order.shortId || ('#' + String(order.id).slice(-5))}</b>
📞 <b>Mijoz:</b> ${order.tel}
${locationText}
━━━━━━━━━━━━━━━━━━━━━
🍽 <b>Taomlar:</b>
${itemsText}
━━━━━━━━━━━━━━━━━━━━━
💰 <b>JAMI: ${Number(order.total).toLocaleString()} so'm</b>
━━━━━━━━━━━━━━━━━━━━━
✅ Yetkazib bering!`;

    await sendTelegram(courierId, courierMsg);

    // Notify admin
    const adminMsg = `✅ <b>${order.shortId || ('#'+String(order.id).slice(-5))}</b> buyurtma <b>${courierName}</b>ga tayinlandi.`;
    await sendTelegram(ADMIN_ID, adminMsg);

    toast(`✅ Buyurtma ${courierName}ga tayinlandi va xabar yuborildi!`);
};

window.markDone = async function(key) {
    await update(ref(db, 'orders/' + key), { status: 'yetkazildi' });
    const order = window.allOrders[key];
    if (order) {
        const courierId = order.courier === 'kuryer1' ? KURYER1_ID : KURYER2_ID;
        await sendTelegram(courierId,
            `✅ <b>${order.shortId||('#'+String(order.id).slice(-5))}</b> buyurtma yetkazildi deb belgilandi.`);
    }
    toast("✅ Buyurtma yetkazildi deb belgilandi.");
};

window.cancelOrder = async function(key) {
    if (!confirm("Buyurtmani bekor qilmoqchimisiz?")) return;
    await update(ref(db, 'orders/' + key), { status: 'bekor' });
    toast("❌ Buyurtma bekor qilindi.");
};

/* ══════════════════════════════════════════
   SITE ORDERS PANEL TOGGLE
══════════════════════════════════════════ */
window.toggleSiteOrders = function() {
    const panel = document.getElementById('site-orders-panel');
    if (!panel) return;
    panel.classList.toggle('open');
};

/* ══════════════════════════════════════════
   SEARCH / FILTER
══════════════════════════════════════════ */
window.filterItems = function() {
    const q = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    if (!q) { window.renderMenu(window.products); return; }
    window.renderMenu(window.products.filter(p => p.name.toLowerCase().includes(q)));
};

/* ══════════════════════════════════════════
   ADMIN / COURIER REDIRECT (3-CLICKS)
══════════════════════════════════════════ */
window.handleAdmin = function() {
    adminClicks++;
    if (adminClicks === 3) {
        const pw = prompt("🔐 Maxfiy parolni kiriting:");
        if (pw === "7777") {
            window.location.href = "admin.html";
        } else if (pw === "1111" || pw === "2222") {
            window.location.href = "courier.html";
        } else if (pw !== null) {
            toast("❌ Noto'g'ri parol!", 'warn');
        }
        adminClicks = 0;
    }
    clearTimeout(window._adminClickTimer);
    window._adminClickTimer = setTimeout(() => { adminClicks = 0; }, 2200);
};

window.closeAdmin = function() {
    window.isAdmin = false;
    document.getElementById('admin-box').style.display = 'none';
    window.renderMenu();
};

window.addProduct = function() {
    const name  = document.getElementById('p-name').value.trim();
    const price = document.getElementById('p-price').value;
    const img   = document.getElementById('p-img').value.trim();
    const desc  = document.getElementById('p-desc').value.trim();

    if (!name || !price || !img) {
        toast("⚠️ Iltimos, yulduzcha (*) maydonlarni to'ldiring!", 'warn');
        return;
    }

    const newProd = {
        id:    Date.now(),
        name, price: parseInt(price), img,
        desc:  desc || "Xorazmning an'anaviy mashhur taomi.",
        createdAt: Date.now()
    };

    push(productsRef, newProd)
        .then(() => {
            toast("✅ Taom muvaffaqiyatli qo'shildi!");
            ['p-name','p-price','p-img','p-desc'].forEach(id => {
                document.getElementById(id).value = '';
            });
        })
        .catch(err => toast("❌ Xatolik: " + err.message, 'warn'));
};

window.removeProduct = function(fKey) {
    if (confirm("Haqiqatan ham bu taomni o'chirmoqchimisiz?")) {
        remove(ref(db, 'products/' + fKey))
            .then(() => toast("🗑️ Taom o'chirildi."))
            .catch(err => toast("❌ " + err.message, 'warn'));
    }
};

function initAdminDrag() {
    const box    = document.getElementById('admin-box');
    const header = document.getElementById('admin-drag-header');
    if (!box || !header || box._dragInit) return;
    box._dragInit = true;

    let active = false, ox = 0, oy = 0;

    const start = (cx, cy) => {
        active    = true;
        const r   = box.getBoundingClientRect();
        box.style.left      = r.left + 'px';
        box.style.top       = r.top  + 'px';
        box.style.transform = 'none';
        ox = cx - r.left;
        oy = cy - r.top;
    };
    const move = (cx, cy) => {
        if (!active) return;
        const maxX = window.innerWidth  - box.offsetWidth;
        const maxY = window.innerHeight - box.offsetHeight;
        box.style.left = Math.min(Math.max(0, cx - ox), maxX) + 'px';
        box.style.top  = Math.min(Math.max(0, cy - oy), maxY) + 'px';
    };
    const end = () => { active = false; };

    header.addEventListener('mousedown',  e => { start(e.clientX, e.clientY); e.preventDefault(); });
    header.addEventListener('touchstart', e => { start(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    document.addEventListener('mousemove',  e => move(e.clientX, e.clientY));
    document.addEventListener('touchmove',  e => move(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    document.addEventListener('mouseup',  end);
    document.addEventListener('touchend', end);
}

/* ══════════════════════════════════════════
   CONTACT FORM
══════════════════════════════════════════ */
window.sendContactMsg = function() {
    const name  = document.getElementById('msg-name')?.value.trim();
    const phone = document.getElementById('msg-phone')?.value.trim();
    const text  = document.getElementById('msg-text')?.value.trim();

    if (!name || !phone || !text) {
        toast("⚠️ Iltimos, barcha maydonlarni to'ldiring!", 'warn');
        return;
    }

    const msg = `📬 YANGI HABAR — QOPOQ SOMSA\n👤 Ism: ${name}\n📞 Tel: ${phone}\n💬 Habar: ${text}`;

    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ chat_id: ADMIN_ID, text: msg })
    })
    .then(() => {
        toast("✅ Habaring yuborildi!");
        ['msg-name','msg-phone','msg-text'].forEach(id => {
            document.getElementById(id).value = '';
        });
    })
    .catch(() => toast("⚠️ Habar yuborishda xatolik!", 'warn'));
};

/* ══════════════════════════════════════════
   TOAST
══════════════════════════════════════════ */
window.toast = function(msg, type = 'ok') {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.style.borderColor = type === 'warn'
        ? 'rgba(255,180,0,.38)'
        : 'rgba(200,164,90,.3)';
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 3000);
};

/* ══════════════════════════════════════════
   KEYBOARD
══════════════════════════════════════════ */
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        if (document.getElementById('orderOverlay')?.classList.contains('open')) {
            window.closeOrderModal();
        } else if (document.getElementById('productModal')?.classList.contains('open')) {
            closeModal();
        } else if (document.getElementById('cartPanel')?.classList.contains('active')) {
            window.toggleCart();
        }
    }
});

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
window.updateCart();
