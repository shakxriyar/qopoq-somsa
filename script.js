import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCZdqBBYEoIXAqln8a9c801AT3G_I_ys4U",
    authDomain: "shsh-120cf.firebaseapp.com",
    databaseURL: "https://shsh-120cf-default-rtdb.firebaseio.com",
    projectId: "shsh-120cf",
    storageBucket: "shsh-120cf.firebasestorage.app",
    messagingSenderId: "897260945183",
    appId: "1:897260945183:web:6e6fd385b1718ed00afa2a",
    measurementId: "G-NDYE872XCD"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const productsRef = ref(db, 'products');

const BOT_TOKEN = "8740580495:AAGLyL1oeM-Pu96tFzwvb5Y63uJaPWmGgEI"; 
const ADMIN_ID = "8030496668"; 
const KURYER_ID = "7312694067"; 

window.products = [];
window.cart = JSON.parse(localStorage.getItem('burger_cart_blue_final')) || [];
window.isAdmin = false;
let clicks = 0;

// Admin panelni ochish
window.handleAdmin = () => {
    clicks++;
    if (clicks === 3) {
        const password = prompt("Admin parolini kiriting:");
        if (password === "7777") {
            window.isAdmin = true;
            document.getElementById('admin-box').style.display = 'block';
            window.renderMenu();
        }
        clicks = 0;
    }
    setTimeout(() => { clicks = 0; }, 2000);
};

// Firebase'dan ma'lumot olish
onValue(productsRef, (snapshot) => {
    const data = snapshot.val();
    window.products = [];
    if (data) {
        Object.keys(data).forEach(key => {
            window.products.push({ fKey: key, ...data[key] });
        });
    }
    window.renderMenu();
});

// MENYUNI CHIZISH (XATO TUZATILGAN VARIANT)[cite: 2, 3]
window.renderMenu = function(data = window.products) {
    const menu = document.getElementById('menuList');
    if (!menu) return;

    if (data.length === 0) {
        menu.innerHTML = `<p style="color:#ffcc00; text-align:center; width:100%; font-size: 1.2rem;">Hozircha taomlar mavjud emas.</p>`;
        return;
    }

    // Bu yerda 'reveal active' klasslari ko'rinishni ta'minlaydi
    menu.innerHTML = data.map((p, index) => `
        <div class="item reveal active" style="opacity: 1 !important; visibility: visible !important; transform: translateY(0) !important;">
            ${window.isAdmin ? `<button class="admin-del" style="position:absolute; top:10px; right:10px; background:red; color:white; border:none; border-radius:50%; width:30px; height:30px; cursor:pointer; z-index:100;" onclick="removeProduct('${p.fKey}')">&times;</button>` : ''}
            <img src="${p.img}" alt="${p.name}" style="width:100%; display:block;" onerror="this.src='https://via.placeholder.com/300?text=Rasm+Topilmadi'">
            <h3>${p.name}</h3>
            <div class="price">${Number(p.price).toLocaleString()} so'm</div>
            <button class="button" onclick="addToCart(${p.id})">Savatga qo'shish</button>
        </div>
    `).join('');
};

// TAOM QO'SHISH FUNKSIYASI
window.addProduct = () => {
    const name = document.getElementById('p-name').value;
    const price = document.getElementById('p-price').value;
    const img = document.getElementById('p-img').value;

    if (name && price && img) {
        const newProduct = {
            id: Date.now(),
            name: name,
            price: parseInt(price),
            img: img
        };

        push(productsRef, newProduct).then(() => {
            alert("Taom muvaffaqiyatli qo'shildi!");
            document.getElementById('p-name').value = '';
            document.getElementById('p-price').value = '';
            document.getElementById('p-img').value = '';
        }).catch(err => alert("Xatolik: " + err.message));
    } else {
        alert("Iltimos, hamma kataklarni to'ldiring!");
    }
};

window.removeProduct = (fKey) => {
    if(confirm("Haqiqatan ham o'chirmoqchimisiz?")) {
        remove(ref(db, 'products/' + fKey));
    }
};

// Savat funksiyalari
window.addToCart = function(id) {
    const p = window.products.find(x => x.id === id);
    if (!p) return;
    const item = window.cart.find(x => x.id === id);
    if(item) item.qty++; else window.cart.push({...p, qty: 1});
    window.updateCart();
};

window.updateCart = function() {
    localStorage.setItem('burger_cart_blue_final', JSON.stringify(window.cart));
    const badge = document.getElementById('cart-badge');
    if(badge) badge.innerText = window.cart.reduce((s, i) => s + i.qty, 0);
    
    let total = 0;
    const cartList = document.getElementById('cart-list');
    if(cartList) {
        cartList.innerHTML = window.cart.map(i => {
            total += i.price * i.qty;
            return `<div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #333; padding-bottom:5px;">
                <span>${i.name} (x${i.qty})</span>
                <span style="color:#ffcc00">${(i.price * i.qty).toLocaleString()} so'm</span>
            </div>`;
        }).join('');
    }
    const totalEl = document.getElementById('total-price');
    if(totalEl) totalEl.innerText = total.toLocaleString() + " so'm";
};

window.checkout = function() {
    if (window.cart.length === 0) return alert("Savat bo'sh!");
    const tel = prompt("Telefon raqamingiz:");
    const manzil = prompt("Manzilingiz:");
    if (!tel || !manzil) return alert("Ma'lumotlarni to'ldiring!");

    let text = `📦 YANGI BUYURTMA:\n📞 Tel: ${tel}\n📍 Manzil: ${manzil}\n\n`;
    let jami = 0;
    window.cart.forEach(i => {
        text += `• ${i.name} (${i.qty} dona)\n`;
        jami += i.price * i.qty;
    });
    text += `\n💰 JAMI: ${jami.toLocaleString()} so'm`;

    [ADMIN_ID, KURYER_ID].forEach(id => {
        fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: id, text: text })
        });
    });

    alert("Buyurtmangiz qabul qilindi!");
    window.cart = [];
    window.updateCart();
    window.toggleCart();
};

window.toggleCart = () => document.getElementById('cartPanel').classList.toggle('active');
window.closeAdmin = () => {
    window.isAdmin = false;
    document.getElementById('admin-box').style.display = 'none';
    window.renderMenu();
};

window.updateCart();

window.updateCart = function() {
    localStorage.setItem('burger_cart_blue_final', JSON.stringify(window.cart));
    
    const badge = document.getElementById('cart-badge');
    if(badge) badge.innerText = window.cart.reduce((s, i) => s + i.qty, 0);
    
    let total = 0;
    const cartList = document.getElementById('cart-list');
    
    if(cartList) {
        if(window.cart.length === 0) {
            cartList.innerHTML = `<p style="color:#666; text-align:center; margin-top:20px;">Savat bo'sh</p>`;
        } else {
            cartList.innerHTML = window.cart.map(i => {
                total += i.price * i.qty;
                return `
                    <div class="cart-item">
                        <div style="display:flex; flex-direction:column;">
                            <span style="font-weight:bold;">${i.name}</span>
                            <span style="font-size:0.8rem; color:#aaa;">${i.qty} dona x ${i.price.toLocaleString()}</span>
                        </div>
                        <span class="item-price">${(i.price * i.qty).toLocaleString()} so'm</span>
                    </div>`;
            }).join('');
        }
    }
    
    const totalEl = document.getElementById('total-price');
    if(totalEl) totalEl.innerText = total.toLocaleString() + " so'm";
};
