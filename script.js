import { initializeApp }   from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getDatabase, ref, push, set,
    onValue, remove, get
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
const salesRef    = ref(db, 'popularity'); // tracks how many times each product was ordered

const BOT_TOKEN  = "8271852367:AAGKDNXPaVU-HKZjLaGfCgoKK1DI421XbzY";
const ADMIN_ID   = "8030496668";
const KURYER_ID  = "7312694067";

/* ══════════════════════════════════════════
   STATE
══════════════════════════════════════════ */
window.products     = [];
window.cart         = JSON.parse(localStorage.getItem('qopoq_cart_v3')) || [];
window.isAdmin      = false;
window.popularity   = {};   // { productId: count }

let adminClicks   = 0;
let modalProdId   = null;   // currently opened product in modal
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

    // Badge
    const badge = document.getElementById('cart-badge');
    if (badge) badge.textContent = window.cart.reduce((s, i) => s + i.qty, 0);

    // Cart list
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
   CHECKOUT
══════════════════════════════════════════ */
window.checkout = function() {
    if (window.cart.length === 0) { toast("⚠️ Savat bo'sh!", 'warn'); return; }

    const tel    = prompt("📞 Telefon raqamingiz (masalan: +998 90 123 45 67):");
    if (!tel) return;
    const manzil = prompt("📍 Yetkazib berish manzilingiz:");
    if (!manzil) return;

    let msg  = `🥟 YANGI BUYURTMA — QOPOQ SOMSA\n`;
    msg     += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg     += `📞 Telefon: ${tel}\n`;
    msg     += `📍 Manzil:  ${manzil}\n`;
    msg     += `━━━━━━━━━━━━━━━━━━━━━\n`;

    let jami = 0;
    window.cart.forEach(i => {
        msg  += `• ${i.name} × ${i.qty} = ${(i.price * i.qty).toLocaleString()} so'm\n`;
        jami += i.price * i.qty;

        // increment popularity counter
        const pRef = ref(db, 'popularity/' + i.id);
        get(pRef).then(snap => {
            set(pRef, (snap.val() || 0) + i.qty);
        });
    });

    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💰 JAMI: ${jami.toLocaleString()} so'm`;

    [ADMIN_ID, KURYER_ID].forEach(cid => {
        fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ chat_id: cid, text: msg })
        });
    });

    window.cart = [];
    window.updateCart();
    window.toggleCart();
    toast("🎉 Buyurtmangiz qabul qilindi! Tez orada bog'lanamiz.");
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
   ADMIN
══════════════════════════════════════════ */
window.handleAdmin = function() {
    adminClicks++;
    if (adminClicks === 3) {
        const pw = prompt("🔐 Admin parolini kiriting:");
        if (pw === "7777") {
            window.isAdmin = true;
            document.getElementById('admin-box').style.display = 'block';
            initAdminDrag();
            window.renderMenu();
            toast("✅ Admin panelga kirdingiz.");
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

/* ── Admin panel drag (mouse + touch) ── */
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
function toast(msg, type = 'ok') {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.style.borderColor = type === 'warn'
        ? 'rgba(255,180,0,.38)'
        : 'rgba(200,164,90,.3)';
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 3000);
}

/* ══════════════════════════════════════════
   KEYBOARD SHORTCUTS
══════════════════════════════════════════ */
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        if (document.getElementById('productModal')?.classList.contains('open')) {
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
