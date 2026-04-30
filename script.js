// Firebase modullarini import qilish - Sayt qoidalariga ko'ra to'liq formatda
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Siz taqdim etgan Firebase konfiguratsiyasi
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

// Firebase-ni ishga tushirish
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Formadan xabar yuborish funksiyasini Firebase bilan integratsiya qilish
window.sendContactMsg = function() {
    // Saytdagi mavjud ID lar orqali qiymatlarni olish
    const name = document.getElementById('msg-name').value;
    const phone = document.getElementById('msg-phone').value;
    const message = document.getElementById('msg-text').value;
    const submitBtn = document.querySelector('.footer-form .button');

    // Barcha maydonlar to'ldirilganligini tekshirish
    if(!name || !phone || !message) {
        alert("Iltimos, barcha maydonlarni to'ldiring!");
        return;
    }

    // Tugmani vaqtincha faolsizlantirish (Luxury stiliga mos animatsiya uchun)
    if(submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "YUBORILMOQDA...";
    }

    // 1. Firebase Realtime Database'ga saqlash
    const messagesRef = ref(database, 'messages');
    const newMessageRef = push(messagesRef);

    set(newMessageRef, {
        username: name,
        phone: phone,
        message: message,
        timestamp: new Date().toISOString()
    })
    .then(() => {
        // 2. Telegramga ham yuborish (Sizning mavjud Telegram kodingiz bilan birga ishlaydi)
        const BOT_TOKEN = "8740580495:AAGLyL1oeM-Pu96tFzwvb5Y63uJaPWmGgEI"; 
        const CHAT_ID = "8030496668"; 
        const text = `📬 YANGI HABAR (Firebase + Aloqa):\n\n👤 Ism: ${name}\n📞 Tel: ${phone}\n💬 Habar: ${message}`;

        return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: CHAT_ID, text: text })
        });
    })
    .then(() => {
        // Muvaffaqiyatli yakunlanganda
        alert("Habaringiz Firebase bazasiga saqlandi va Telegramga yuborildi!");
        
        // Formani tozalash
        document.getElementById('msg-name').value = '';
        document.getElementById('msg-phone').value = '';
        document.getElementById('msg-text').value = '';
    })
    .catch((error) => {
        console.error("Xatolik:", error);
        alert("Xatolik yuz berdi. Iltimos qayta urinib ko'ring.");
    })
    .finally(() => {
        // Tugmani asl holatiga qaytarish
        if(submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = "YUBORISH";
        }
    });
};
    // Eski CHAT_ID bitta edi, endi biz massiv (list) ko'rinishida qilamiz
const BOT_TOKEN = "8740580495:AAGLyL1oeM-Pu96tFzwvb5Y63uJaPWmGgEI"; // O'z joyida qoladi
const ADMIN_ID = "8030496668"; // Bu sizning ID ingiz (Admin)
const KURYER_ID = "7312694067"; // Kuryerning Telegram ID raqamini yozing; 

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

    window.renderMenu = function(data = window.products) {
        const menu = document.getElementById('menuList');
        menu.innerHTML = data.map(p => `
            <div class="item">
                ${window.isAdmin ? `<button style="position:absolute; top:15px; right:15px; background:#ff4b2b; color:white; border:none; border-radius:50%; width:35px; height:35px; cursor:pointer; z-index:100; font-weight:bold;" onclick="removeProduct('${p.fKey}')">&times;</button>` : ''}
                <img src="${p.img}" onerror="this.src='https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=500'">
                <h3>${p.name}</h3>
                <div class="price">${p.price.toLocaleString()} so'm</div>
                <button class="button" onclick="addToCart(${p.id})">Savatga qo'shish</button>
            </div>
        `).join('');
    };

    window.addToCart = function(id) {
        const p = window.products.find(x => x.id === id);
        const item = window.cart.find(x => x.id === id);
        if(item) item.qty++; else window.cart.push({...p, qty: 1});
        window.updateCart();
    };

    window.updateQty = function(id, delta) {
        const item = window.cart.find(x => x.id === id);
        if(item) {
            item.qty += delta;
            if(item.qty <= 0) window.cart = window.cart.filter(x => x.id !== id);
            window.updateCart();
        }
    };

    window.updateCart = function() {
        localStorage.setItem('burger_cart_blue_final', JSON.stringify(window.cart));
        document.getElementById('cart-badge').innerText = window.cart.reduce((s, i) => s + i.qty, 0);
        let total = 0;
        document.getElementById('cart-list').innerHTML = window.cart.map(i => {
            total += i.price * i.qty;
            return `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <div><b>${i.name}</b><br><small>${i.price.toLocaleString()} so'm</small></div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <button onclick="updateQty(${i.id}, -1)" style="background:var(--accent); border:none; width:25px; height:25px; border-radius:5px; cursor:pointer;">-</button>
                    <span>${i.qty}</span>
                    <button onclick="updateQty(${i.id}, 1)" style="background:var(--accent); border:none; width:25px; height:25px; border-radius:5px; cursor:pointer;">+</button>
                </div>
            </div>`;
        }).join('');
        document.getElementById('total-price').innerText = total.toLocaleString() + " so'm";
    };

    window.checkout = function() {
    if (window.cart.length === 0) return alert("Savat bo'sh!");
    const tel = prompt("Telefon raqamingiz:");
    const manzil = prompt("Manzilni kiriting:");
    if (!tel || !manzil) return alert("Ma'lumotlar to'liq emas!");

    let text = `🔵 YANGI BUYURTMA:\n📞 Tel: ${tel}\n📍 Manzil: ${manzil}\n\n`;
    let jami = 0;
    window.cart.forEach(i => {
        text += `• ${i.name} (${i.qty} dona)\n`;
        jami += i.price * i.qty;
    });
    text += `\n💰 JAMI: ${jami.toLocaleString()} so'm`;

    // Ikkala ID ga yuborish uchun ID larni ro'yxatga olamiz
    const ids = [ADMIN_ID, KURYER_ID];

    // Har bir ID ga xabar yuborish
    ids.forEach(id => {
        fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: id, text: text })
        });
    });

    alert("Buyurtma qabul qilindi! Admin va Kuryerga xabar yuborildi.");
    window.cart = []; 
    window.updateCart(); 
    window.toggleCart();
};
    window.filterItems = () => {
        const q = document.getElementById('searchInput').value.toLowerCase();
        window.renderMenu(window.products.filter(p => p.name.toLowerCase().includes(q)));
    };

    window.toggleCart = () => document.getElementById('cartPanel').classList.toggle('active');

    window.handleAdmin = () => {
        clicks++;
        if(clicks === 3) {
            if(prompt("Admin paroli:") === "7777") {
                window.isAdmin = true;
                document.getElementById('admin-box').style.display = 'block';
                window.renderMenu();
            }
            clicks = 0;
        }
        setTimeout(() => clicks = 0, 2000);
    };

    window.addProduct = () => {
        const n = document.getElementById('p-name').value, p = parseInt(document.getElementById('p-price').value), i = document.getElementById('p-img').value;
        if(n && p && i) {
            set(push(productsRef), { id: Date.now(), name: n, price: p, img: i }).then(() => {
                alert("Taom menyuga qo'shildi!");
                document.getElementById('p-name').value = '';
                document.getElementById('p-price').value = '';
                document.getElementById('p-img').value = '';
            });
        }
    };

    window.removeProduct = (fKey) => { if(confirm("O'chirilsinmi?")) remove(ref(db, 'products/' + fKey)); };
    window.closeAdmin = () => { window.isAdmin = false; document.getElementById('admin-box').style.display = 'none'; window.renderMenu(); };

    window.updateCart();
    // Firebase onValue funksiyasidan oldin buni qo'shing
const cachedProducts = JSON.parse(localStorage.getItem('cached_menu'));
if (cachedProducts) {
    window.products = cachedProducts;
  window.renderMenu = function(data = window.products) {
    const menu = document.getElementById('menuList');
    menu.innerHTML = data.map(p => `
        <div class="item">
            ${window.isAdmin ? `<button class="admin-del" onclick="removeProduct('${p.fKey}')">&times;</button>` : ''}
            <img src="${p.img}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=200'">
            <h3>${p.name}</h3>
            <div class="price">${p.price.toLocaleString()} so'm</div>
            <button class="button" onclick="addToCart(${p.id})">Savatga qo'shish</button>
        </div>
    `).join('');
};
}

// Firebase onValue ichini esa bunday o'zgartiring:
onValue(productsRef, (snapshot) => {
    const data = snapshot.val();
    window.products = [];
    if (data) {
        Object.keys(data).forEach(key => {
            window.products.push({ fKey: key, ...data[key] });
        });
        // Ma'lumot kelganidan keyin keshni yangilaymiz
        localStorage.setItem('cached_menu', JSON.stringify(window.products));
    }
    window.renderMenu();
});
// Admin panelni surish funksiyasi
const adminBox = document.getElementById("admin-box");
const dragHeader = document.getElementById("admin-drag-header");

let isDragging = false;
let currentX;
let currentY;
let initialX;
let initialY;
let xOffset = 0;
let yOffset = 0;

dragHeader.addEventListener("mousedown", dragStart);
document.addEventListener("mousemove", drag);
document.addEventListener("mouseup", dragEnd);

function dragStart(e) {
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;
    if (e.target === dragHeader || dragHeader.contains(e.target)) {
        isDragging = true;
    }
}

function drag(e) {
    if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        xOffset = currentX;
        yOffset = currentY;
        // Transformni markazdan siljitish uchun translate qo'shamiz
        adminBox.style.transform = `translate(calc(-50% + ${currentX}px), calc(-50% + ${currentY}px))`;
    }
}

function dragEnd() {
    isDragging = false;
}
    // Formadan Telegramga habar yuborish funksiyasi
    function sendContactMsg() {
        const name = document.getElementById('msg-name').value;
        const phone = document.getElementById('msg-phone').value;
        const message = document.getElementById('msg-text').value;

        if(!name || !phone || !message) {
            alert("Iltimos, barcha maydonlarni to'ldiring!");
            return;
        }

        // Script ichidagi mavjud BOT_TOKEN va CHAT_ID dan foydalanadi
        const BOT_TOKEN = "8740580495:AAGLyL1oeM-Pu96tFzwvb5Y63uJaPWmGgEI"; 
        const CHAT_ID = "8030496668"; 

        const text = `📬 YANGI HABAR (Aloqa):\n\n👤 Ism: ${name}\n📞 Tel: ${phone}\n💬 Habar: ${message}`;

        fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: CHAT_ID, text: text })
        }).then(() => {
            alert("Habaringiz muvaffaqiyatli yuborildi!");
            document.getElementById('msg-name').value = '';
            document.getElementById('msg-phone').value = '';
            document.getElementById('msg-text').value = '';
        }).catch(() => {
            alert("Xatolik yuz berdi. Keyinroq qayta urinib ko'ring.");
        });
    }

    window.renderMenu = function(data = window.products) {
    const menu = document.getElementById('menuList');
    menu.innerHTML = data.map((p, index) => `
        <div class="item reveal" style="transition-delay: ${index * 100}ms">
            ${window.isAdmin ? `<button class="admin-del" onclick="removeProduct('${p.fKey}')">&times;</button>` : ''}
            <img src="${p.img}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=200'">
            <h3>${p.name}</h3>
            <div class="price">${p.price.toLocaleString()} so'm</div>
            <button class="button" onclick="addToCart(${p.id})">Savatga qo'shish</button>
        </div>
    `).join('');
    
    // Kartochkalar chizilgandan so'ng ularni faollashtirish
    setTimeout(handleReveal, 100);
};
function handleReveal() {
    const reveals = document.querySelectorAll(".reveal");
    
    reveals.forEach((el) => {
        const windowHeight = window.innerHeight;
        const elementTop = el.getBoundingClientRect().top;
        const elementVisible = 100;
        
        if (elementTop < windowHeight - elementVisible) {
            el.classList.add("active");
        }
    });
}

// Sahifa yuklanganda va skrol qilinganda tekshirish
window.addEventListener("scroll", handleReveal);
window.addEventListener("load", handleReveal);
