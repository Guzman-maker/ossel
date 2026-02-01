// OSEL Premium App Logic - Auth Guard
(function () {
    const path = window.location.pathname;
    const isLoginPage = path.endsWith('login.html');
    const isAdminPage = path.endsWith('admin.html') || path.includes('admin');
    const isLogged = localStorage.getItem('osel_user');

    if (!isLogged && !isLoginPage && !isAdminPage) {
        window.location.href = 'login.html';
    }
})();

async function handleLogin(event) {
    event.preventDefault();
    const name = document.getElementById('fullname')?.value || 'Usuario OSEL';
    let phone = document.getElementById('phone').value.replace(/\s/g, ''); // Limpiar espacios
    const password = document.getElementById('password').value;

    try {
        console.log('[OSEL] Intentando login para:', phone);
        // Intentar Login con API real
        const response = await fetch(AppConfig.apiUrl('/api/auth/login'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('osel_user', JSON.stringify(data));
            localStorage.setItem('osel_last_activity', Date.now()); // Para security.js

            if (data.role === 'admin') {
                localStorage.setItem('osel_admin', 'true');
                console.log('[OSEL] Admin detectado, redirigiendo...');
                window.location.href = 'admin.html';
            } else {
                localStorage.removeItem('osel_admin'); // Asegurar limpieza
                window.location.href = 'index.html';
            }
        } else {
            // Si el usuario no existe (401 puede ser contraseña mal o no existe)
            // Solo registramos si el error explícitamente dice que no existe o si es 401 
            // pero el backend dice "Teléfono o contraseña incorrectos"
            if (data.message && data.message.includes('incorrectos')) {
                // Podría ser registro nuevo o contraseña mal. 
                // Para simplificar como pidió el usuario: si no entra, intentamos registrarlo.
                console.log('[OSEL] Usuario no encontrado o error, intentando registro automático...');
                const regResp = await fetch(AppConfig.apiUrl('/api/auth/register'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, phone, password })
                });

                const regData = await regResp.json();
                if (regResp.ok) {
                    localStorage.setItem('osel_user', JSON.stringify(regData));
                    localStorage.setItem('osel_last_activity', Date.now());
                    window.location.href = 'index.html';
                } else {
                    alert(regData.message || 'Error al iniciar sesión o registrarse');
                }
            } else {
                alert(data.message || 'Error en el acceso');
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Error de conexión con el servidor');
    }
}
window.handleLogin = handleLogin;

function logout() {
    // Confirmar que el usuario quiere cerrar sesión
    const confirmar = confirm('¿Estás seguro de que deseas cerrar sesión?');

    if (!confirmar) {
        return; // Usuario canceló
    }

    // Limpiar todos los datos de sesión
    localStorage.removeItem('osel_user');
    localStorage.removeItem('osel_admin');
    localStorage.removeItem('osel_cart'); // Limpiar carrito también

    // Mostrar mensaje de despedida
    alert('¡Sesión cerrada exitosamente! Hasta pronto 👋');

    // Pequeño delay para mejor UX
    setTimeout(() => {
        window.location.href = 'index.html'; // Redirigir al inicio
    }, 100);
}

const state = {
    cart: JSON.parse(localStorage.getItem('osel_cart')) || [],
    location: localStorage.getItem('osel_location') || 'Lázaro Cárdenas',
    clients: JSON.parse(localStorage.getItem('osel_clients')) || [],
    categories: JSON.parse(localStorage.getItem('osel_categories')) || [
        { id: 'vinilica', name: 'Vinílica' },
        { id: 'acrilica', name: 'Acrílica' },
        { id: 'esmalte', name: 'Esmalte' },
        { id: 'impermeabilizante', name: 'Impermeabilizante' },
        { id: 'sellador', name: 'Sellador' },
        { id: 'automotriz', name: 'Automotriz' },
        { id: 'herramientas', name: 'Herramientas' }
    ],
    products: []
};

async function loadProducts() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 seg timeout

        const response = await fetch('/api/products', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
                state.products = data.map(p => ({ ...p, id: p._id }));
                console.log('[OSEL] Catálogo cargado desde servidor');
                if (typeof initShop === 'function') initShop();
                return;
            }
        }
    } catch (err) {
        console.warn('[OSEL] Servidor o Base de Datos no responde, activando modo local');
    }

    // NUEVO: Intentar recuperar del LocalStorage antes que del estático
    const localProducts = JSON.parse(localStorage.getItem('osel_products'));
    if (localProducts && localProducts.length > 0) {
        state.products = localProducts;
        console.log('[OSEL] Recuperados productos existentes del historial local');
        // Renderizar si estamos en index.html
        if (document.getElementById('product-list')) {
            renderProducts(state.products);
        }
    } else {
        // Fallback Estático (solo si no hay nada en ningún lado)
        state.products = [
            {
                id: '1',
                name: "OSEL Total",
                tagline: "Línea Premium",
                category: "vinilica",
                price: 1450,
                image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBfnXk0VKlFz3n2dub8A1yiyiru2Hnvyf-8G7PfUNVzu640TSsOV1WnEIGoCZfTPzwb-myCJAOZ2r6J8qQpmsoW1Y6J1BGOzRnmzfD1OkcLGlSSdtfCzp07GLz9qsUSEya-CXIaNpmRQd82HlX_dinxsIWkIoIVOz2RArcb20Irp3gRb6grRyJGPF9h46z6ddL8rluS18yJtnux7AUPuJX-OXApnn6limWKrvg1EjwLcdScfVGCvliWxpcNBA2wNZBCUbfc_Dblow",
                tags: ["Máximo Cubrimiento", "Lavable"],
                color: "primary",
                usage: "interior",
                finish: "mate",
                points: 25,
                bestSeller: true,
                sku: "OST-VIN-001",
                barcode: "750100000001",
                canjeablePuntos: true,
                puntosRequeridos: 500
            },
            {
                id: 2,
                name: "OSEL Plata",
                tagline: "Elegancia Duradera",
                category: "vinilica",
                price: 980,
                image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAKkB02254KvlWZIUu04ya_6TR2BCIdX4B3p7o_kA5sAjgcEgJslr_iB8_Xt4tV2sm6KXG29bYd3xzr4-HaDZGUbctpmpbjhmX8XYUqwrVjCH2t3jmsO-p7R2bMbA0JOlmjfpEhBM9sf9gJh9bnsXRCTZI_lWBFyjqeSt67ub4LHDvOgzKPK4mJMzl77al-b3wp7d9h52QPX25UNd1pcKFzroxKTaNetmCgbrw32OGeeoIGCjg_9CB-LicqmuqNeH3JfCJ8UBfS5w",
                tags: ["Acabado Satinado", "Bajo Olor"],
                color: "terracotta",
                usage: "interior",
                finish: "satinado",
                points: 15,
                sku: "OSP-VIN-002",
                barcode: "750100000002",
                canjeablePuntos: true,
                puntosRequeridos: 350
            },
            {
                id: 3,
                name: "OSEL Oro",
                tagline: "Máximo Brillo",
                category: "acrilica",
                price: 1220,
                image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBGYD8aPy2PO0K0xqnEuu4Rs-rSuVRVlIuGQxjivIDKCho9ezWGGxuLHmOxFNNA_y9i1MabnodyIRdHDhIwXiONiN6VQkNzjEqkSX12iHq5fbpbKd00ZVFseYKX8aY-efThoKD0XqJOmdB3tt_kw_vFXAU1RalFPWPEjgbnAHyYsmgwtEt_CVki-kKhLq9mVw45XwWMfp1d0ift7cJu7_dVZSl13xknKP4roqawlsYeWNwIJ91OiQEl3BGfvs-fbN4Cf78Kecd2Ng",
                tags: ["Resistencia UV", "Fácil Limpieza"],
                color: "sage",
                usage: "exterior",
                finish: "brillante",
                points: 20,
                sku: "OSO-ACR-003",
                barcode: "750100000003",
                canjeablePuntos: true,
                puntosRequeridos: 450
            },
            {
                id: 4,
                name: "Brocha Profesional",
                tagline: "Herramienta Expert",
                category: "herramientas",
                price: 150,
                image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDBFm8n-ZntUS1LgPkiLrfnqPjbSfQ4s26hcNCagCsZ6b4vvXHcUJNSVeEtONLfyHjbnj-LkIpqum2AyWccYKaUxoIO2i2UKuKvlM7-mrRPcVHijMMirB1OqJZlzV0xEGmWpb4mljUpsDlLlOz4NphWQL0yjPSa7S6OhAbLv3getkSL-WLvPEub1tni7y9Gv6WK1i4ixGwmSJ3xgf05mrtoIep9T-IXlHdNgOH1sD2eT781eL5IgOH9Xc8Xawe58G_fhniugSKPOA",
                tags: ["Cerdas Naturales", "Mango Ergonómico"],
                color: "primary",
                usage: "interior",
                points: 5,
                sku: "BR-PRO-004",
                barcode: "750100000004",
                canjeablePuntos: true,
                puntosRequeridos: 50
            },
            {
                id: 5,
                name: "Rodillo Microfibra",
                tagline: "Acabado Perfecto",
                category: "herramientas",
                price: 220,
                image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBoDFqKBfLdMkrQSHtWvmiLzGU8_iz4eQAyDDDan7Ix1I0RQdnbAHujaoP4dbDy7qsH5u9wwh7sih58g_9VotEC2uX9_trRYHCZC82Go9y9FJrZqQ3kEmpPI0Z9waeNR8N-VMwnn5amli1LPx3ph9vgNzlXwto3qHNOrCQPOV1f7MQA5SS35iLOP8cHbWP8tenGIZxrXquSOYFUOY2UO7s5Km-SdVCvrkqQgoBICEHg-qozZ9GIwrobEi-_IC4UqCfwbXQDETGBAA",
                tags: ["Antigoteo", "Alta Absorción"],
                color: "sage",
                usage: "interior",
                points: 8,
                sku: "RO-MIC-005",
                barcode: "750100000005",
                canjeablePuntos: true,
                puntosRequeridos: 80
            },
            {
                id: 6,
                name: "Imper Osel 5 Años",
                tagline: "Protección Total",
                category: "impermeabilizante",
                price: 2890,
                image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDODWQJZ8lpte1HssiRKmUZKDz1JB21kphbkb70QFsfISlLepDLBSEWvUerKWqKuaJQcCjOY6wVbSQ8zTDdW4WSjeTOfuPha31YL3JgupD9HE6wXhRezCOBeAmGNKD1R2rPod3CbNMmf7LoRajn_DNQwJnjLlbSqBYUlobnHIEv4k_j2IZ2sr_1N6HKmVLxNRyRmRmrGuQQQUHD_eYhwQBfpaw_lVCSdGe4ThbRalsnGqt6joNDK5xb-laoIzuwlPaGgzgecu7ZEA",
                tags: ["Térmico", "Fibratado"],
                color: "terracotta",
                usage: "exterior",
                points: 40,
                sku: "IMP-5Y-006",
                barcode: "750100000006",
                canjeablePuntos: true,
                puntosRequeridos: 1200
            },
            {
                id: 7,
                name: "Sellador Acrílico",
                tagline: "Preparación Pro",
                category: "sellador",
                price: 650,
                image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAZuXzhxxqtjKuu9KM9_T5RaQk8SuFik39ER_GThg7v4lQBU_qKDZLRGzvKsqm9198EPRW9IDLMDjBkOTBbro0-IErzIh759xSTRG9f3PNDGwPxOY42FmjR_iuGmkW3zynI1cnqrZ3hf2kjRZ2mAxON8vJ5bPf_k83m8GAHnEB1-cCCqFKNt95mN3S35ThuIDbLL1WSfYXGkTPReezar0BPvNRB0VGPBLmXXBZWFEbhshQDYroSjHGoOmWjMc6TKnPH1GxKouFADg",
                tags: ["Alta Adherencia", "Concentrado"],
                color: "primary",
                usage: "interior",
                points: 12,
                sku: "SEL-ACR-007",
                barcode: "750100000007",
                canjeablePuntos: false
            },
            {
                id: 8,
                name: "V MOL 1.5 (SHAMPOO DESINCRUSTANTE)",
                tagline: "Shampoo Desincrustante",
                category: "automotriz",
                price: 184,
                image: "https://m.media-amazon.com/images/I/61s+oK+yLFL._AC_SL1000_.jpg",
                tags: ["Desincrustante", "Automotriz", "Lavado"],
                color: "primary",
                usage: "exterior",
                finish: "mate",
                points: 5,
                bestSeller: false,
                sku: "VM-AUTO-008",
                barcode: "750100000008",
                canjeablePuntos: false
            },
            {
                id: 9,
                name: "VONIXX GLAZY LIMPIADOR DE VIDRIOS",
                tagline: "Limpiador de Vidrios",
                category: "automotriz",
                price: 185,
                image: "https://m.media-amazon.com/images/I/51A+-k+yLFL._AC_SL1000_.jpg",
                tags: ["Vidrios", "Automotriz", "Limpieza"],
                color: "primary",
                usage: "exterior",
                finish: "brillante",
                points: 5,
                bestSeller: false
            },
            {
                id: 10,
                name: "VONIXX HIDROCOURO (HIDRATANTE)",
                tagline: "Hidratante de Piel",
                category: "automotriz",
                price: 212,
                image: "https://m.media-amazon.com/images/I/51s+oK+yLFL._AC_SL1000_.jpg",
                tags: ["Piel", "Cuero", "Hidratante", "Interior"],
                color: "terracotta",
                usage: "interior",
                finish: "mate",
                points: 6,
                bestSeller: false
            },
            {
                id: 11,
                name: "VONIXX DELET (LIMPIADOR PLASTICO)",
                tagline: "Limpiador Plásticos y Caucho",
                category: "automotriz",
                price: 195,
                image: "https://m.media-amazon.com/images/I/61A+-k+yLFL._AC_SL1000_.jpg",
                tags: ["Plásticos", "Caucho", "Vinilo", "Automotriz"],
                color: "sage",
                usage: "exterior",
                finish: "mate",
                points: 5,
                bestSeller: false
            }
        ];
        // Si estamos en la página de tienda, inicializar el grid aquí también
        if (typeof initShop === 'function' && document.getElementById('shop-products-grid')) {
            initShop();
        }
        // Si estamos en index.html, renderizar productos
        if (document.getElementById('product-list')) {
            renderProducts(state.products);
        }
    }

    // Asegurar render final para index.html después de cargar productos de cualquier fuente
    if (document.getElementById('product-list')) {
        renderProducts(state.products);
    }
}

// --- Persistence Logic ---
// Load persisted products if available
try {
    const storedProducts = localStorage.getItem('osel_products');
    if (storedProducts) {
        const parsed = JSON.parse(storedProducts);
        // Basic validation
        if (Array.isArray(parsed) && parsed.length > 0) {
            state.products = parsed;
        }
    } else {
        // Initial persistence of hardcoded data
        localStorage.setItem('osel_products', JSON.stringify(state.products));
    }
} catch (e) {
    console.error('Error loading products from storage', e);
}

// ---  FUNCIONES DE RENDERIZADO ---
function renderProducts(products) {
    const container = document.getElementById('product-list');
    if (!container) return;

    console.log('[OSEL] Renderizando', products.length, 'productos en index.html');

    if (!products || products.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 py-10">No hay productos disponibles</p>';
        return;
    }

    container.innerHTML = products.slice(0, 6).map(product => `
        <div class="group relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
            <div class="aspect-square bg-gray-50 dark:bg-gray-700 rounded-xl overflow-hidden mb-4">
                <img src="${product.image}" alt="${product.name}" class="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-300">
            </div>
            <h3 class="font-bold text-lg text-gray-900 dark:text-white mb-1">${product.name}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">${product.tagline || product.category}</p>
            <div class="flex items-center justify-between">
                <span class="text-2xl font-black text-primary dark:text-blue-400">$${product.price.toLocaleString()}</span>
                <a href="producto.html?id=${product.id}" class="px-4 py-2 bg-primary hover:bg-opacity-90 text-white rounded-lg font-bold transition-colors">
                    Ver Detalles
                </a>
            </div>
        </div>
    `).join('');
}

function initShop() {
    const grid = document.getElementById('shop-products-grid');
    if (!grid) return;

    console.log('[OSEL] Inicializando tienda con', state.products.length, 'productos');

    if (!state.products || state.products.length === 0) {
        grid.innerHTML = '<div class="col-span-full py-20 text-center"><p class="text-red-500 font-bold">No hay productos disponibles</p></div>';
        return;
    }

    grid.innerHTML = state.products.map(product => `
        <div class="group relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300">
            <div class="aspect-square bg-gray-50 dark:bg-gray-700 overflow-hidden">
                <img src="${product.image}" alt="${product.name}" class="w-full h-full object-contain p-6 group-hover:scale-110 transition-transform duration-300">
            </div>
            <div class="p-6">
                ${product.bestSeller ? '<span class="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full mb-2">BEST SELLER</span>' : ''}
                <h3 class="font-bold text-xl text-gray-900 dark:text-white mb-2">${product.name}</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">${product.tagline || product.category}</p>
                <div class="flex items-center justify-between mb-4">
                    <span class="text-3xl font-black text-primary dark:text-blue-400">$${product.price.toLocaleString()}</span>
                    ${product.points ? `<span class="text-xs text-gray-500">+${product.points} pts</span>` : ''}
                </div>
                <div class="flex gap-2">
                    <a href="producto.html?id=${product.id}" class="flex-1 px-4 py-3 bg-primary hover:bg-opacity-90 text-white text-center rounded-lg font-bold transition-colors">
                        Ver Detalles
                    </a>
                    <button onclick="addToCart(state.products.find(p => p.id === '${product.id}'), 1)" class="px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold transition-colors">
                        <span class="material-symbols-outlined">add_shopping_cart</span>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Global helper to save products state
function saveProductsState() {
    localStorage.setItem('osel_products', JSON.stringify(state.products));
}

function saveCategoriesState() {
    localStorage.setItem('osel_categories', JSON.stringify(state.categories));
}

function renderCategoryFilters() {
    const container = document.getElementById('filters-categories');
    if (!container) return;

    container.innerHTML = state.categories.map(cat => `
        <label class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-primary transition-colors">
            <input type="checkbox" value="${cat.id}" class="rounded border-gray-300 text-primary focus:ring-primary">
            ${cat.name}
        </label>
    `).join('');

    // Check if persistence needed (first run)
    if (!localStorage.getItem('osel_categories')) {
        saveCategoriesState();
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('[OSEL] DOMContentLoaded fired');
    console.log('[OSEL] Current page:', window.location.pathname);

    // Call loadProducts() to synchronize the catalog with MongoDB
    loadProducts();

    // First-time authentication check - Admin Control
    // Check if user has ever logged in before
    const hasVisited = localStorage.getItem('osel_has_visited');
    const isLoggedIn = localStorage.getItem('osel_user') || localStorage.getItem('osel_admin');

    if (!hasVisited && !isLoggedIn && window.location.pathname !== '/login.html' && !window.location.pathname.includes('login.html')) {
        // First visit and not logged in - redirect to login
        localStorage.setItem('osel_redirect_after_login', window.location.href);
        window.location.href = 'login.html';
        return;
    }

    // Mark as visited after successful login check
    if (isLoggedIn) {
        localStorage.setItem('osel_has_visited', 'true');
    }

    // Initialize location UI if element exists
    updateLocationUI();

    // Initialize main product list (only on index.html)
    if (document.getElementById('product-list')) {
        renderProducts(state.products);
    }

    // Initialize cart
    updateCartIcon();
    if (document.getElementById('cart-items')) {
        renderCart();
    }

    // Check auth/profile
    updateUserProfile();

    // Initialize Shop Logic (only on tienda.html)
    if (document.getElementById('shop-products-grid')) {
        console.log('[OSEL] Shop page detected, calling initShop()');
        initShop();
    } else {
        console.log('[OSEL] Not a shop page, skipping initShop()');
    }

    // Initialize Product Detail Logic (only on producto.html)
    if (document.getElementById('detail-name')) {
        console.log('[OSEL] Product detail page detected');
        initProductDetails();
    }

    // Initialize Checkout Logic (only on checkout.html)
    if (document.getElementById('checkout-items')) {
        console.log('[OSEL] Checkout page detected');
        initCheckout();
    }

    // Initialize Cart Page Logic (only on carrito.html)
    if (document.getElementById('cart-page-items')) {
        console.log('[OSEL] Cart page detected');
        renderCartPage();
    }

    // GSAP Animations (Premium Feel)
    // Only animate if elements exist (avoids errors on pages without header)
    if (document.querySelector("header h1")) {
        gsap.from("nav", { y: -100, duration: 1, ease: "power4.out" });
        gsap.from("header h1", { y: 50, opacity: 0, duration: 1, delay: 0.5 });
        gsap.from("header p", { y: 30, opacity: 0, duration: 1, delay: 0.7 });
        gsap.from("header button", { y: 20, opacity: 0, duration: 1, delay: 0.9, stagger: 0.1 });
    }

    console.log('[OSEL] Initialization complete');
});

function updateUserProfile() {
    const user = localStorage.getItem('osel_user');

    // Selectors for Profile Image containers/buttons
    // 1. Index Nav: Button with person icon
    // 2. Rewards Header: Div with background image
    const indexProfileBtn = document.querySelector("nav button[onclick*='login.html']");
    // ^ Note: The existing button has onclick='login.html' hardcoded, so the user logic is mainly visual for now if we want to show avatar. 
    // But request specifically asked for rewards page blank icon.

    const rewardsProfileSection = document.getElementById('user-profile-section');
    const rewardsProfileImg = document.getElementById('user-profile-img');

    if (!user) {
        // --- Not Logged In ---

        // Rewards Page Logic
        if (rewardsProfileSection && rewardsProfileImg) {
            // "White/Blank" appearance
            rewardsProfileImg.style.backgroundImage = 'none';
            rewardsProfileImg.style.backgroundColor = 'white'; // Explicit white
            rewardsProfileImg.className = "h-full w-full rounded-full flex items-center justify-center bg-white";
            rewardsProfileImg.innerHTML = '<span class="material-symbols-outlined text-slate-300 text-2xl">person</span>';

            // Redirect to login
            rewardsProfileSection.onclick = () => window.location.href = 'login.html';
        }

    } else {
        // --- Logged In (Hypothetical) ---
        // For now user hasn't asked to implement full login state visual, just the "not registered" state.
        // But if they were logged in, we'd put their image back.
    }
}


// --- Product Rendering & Search ---
// --- Product Rendering & Search ---
function renderProducts(productsToRender) {
    const list = document.getElementById('product-list');
    const searchResults = document.getElementById('search-results');

    if (!list) return;

    if (productsToRender.length === 0) {
        list.innerHTML = `<div class="w-full text-center py-10 text-slate-400 italic">No encontramos productos con ese nombre.</div>`;
        if (searchResults) searchResults.innerHTML = `<div class="col-span-full text-center py-10 text-slate-400 italic">No encontramos productos.</div>`;
        return;
    }

    // Template for horizontal scroll card
    const createCard = (p) => `
        <div class="flex-none w-[380px] product-glass-card rounded-[2.5rem] p-10 group transition-all duration-500 hover:translate-y-[-12px] hover:shadow-2xl">
            <div class="relative h-72 mb-10 flex items-center justify-center">
                <div class="absolute inset-0 bg-gradient-to-b from-slate-200/50 to-transparent rounded-full blur-3xl opacity-30"></div>
                <img alt="${p.name}" class="relative z-10 h-full w-auto object-contain drop-shadow-2xl transition-transform duration-700 group-hover:scale-110" src="${p.image}" />
            </div>
            <div class="space-y-6">
                <div class="flex justify-between items-start">
                    <div>
                        <p class="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">${p.tagline}</p>
                        <h3 class="text-3xl font-black text-slate-900">${p.name}</h3>
                    </div>
                    <span class="text-2xl font-serif italic text-primary">$${p.price} MXN</span>
                </div>
                <div class="flex flex-wrap gap-2">
                    ${p.tags.map(t => `<span class="px-3 py-1 rounded-full bg-slate-100 text-[9px] text-slate-500 uppercase font-black tracking-widest">${t}</span>`).join('')}
                </div>
                <button onclick="addToCart(${p.id})" class="elegant-button w-full py-5 rounded-2xl bg-${p.color} text-white font-bold text-xs uppercase tracking-[0.2em] shadow-lg mt-4" style="background-color: var(--${p.color}, #2C3E50)">
                    Agregar al Carrito
                </button>
            </div>
        </div>
    `;

    // Render Main List
    list.innerHTML = productsToRender.map(createCard).join('');

    // Render Search Results (Grid format)
    if (searchResults) {
        const createGridCard = (p) => `
            <div class="bg-white rounded-2xl p-4 flex gap-4 items-center shadow-sm hover:shadow-md transition-shadow cursor-pointer" onclick="window.location.href='#products-section'; toggleSearch();">
                <img src="${p.image}" class="h-20 w-auto object-contain">
                <div>
                    <h4 class="font-bold text-slate-900">${p.name}</h4>
                    <p class="text-sm text-slate-500">$${p.price}</p>
                    <button onclick="event.stopPropagation(); addToCart(${p.id})" class="text-xs text-primary font-bold mt-1 hover:underline">Agregar +</button>
                </div>
            </div>
        `;
        searchResults.innerHTML = productsToRender.map(createGridCard).join('');
    }
}

// ... existing code ...

// --- Auth & Admin Logic ---
// --- Auth & Admin Logic ---
function handleLogin(event) {
    event.preventDefault();

    // 1. Sanitize Inputs (XSS Protection)
    // Note: If Security lib isn't loaded (e.g., in unit tests), fallback to raw.
    const rawName = document.getElementById('fullname').value.trim();
    const rawPhone = document.getElementById('phone').value.trim();
    const fullname = (typeof Security !== 'undefined') ? Security.sanitize(rawName) : rawName;
    const phone = (typeof Security !== 'undefined') ? Security.sanitize(rawPhone) : rawPhone;

    // 2. Validate Inputs
    if (typeof Security !== 'undefined') {
        if (!Security.validateInput(fullname, 'text') || !Security.validateInput(phone, 'phone')) {
            Security.trackLoginAttempt(false);
            alert("Acceso Denegado: Datos inválidos o caracteres sospechosos.");
            return;
        }
    }

    // Admin Credentials
    // Normalize inputs: lowercase name, remove spaces from phone
    if (fullname.toLowerCase() === 'eurelio' && phone.replace(/\s+/g, '') === '7531749441') {
        localStorage.setItem('osel_admin', 'true');
        localStorage.setItem('osel_has_visited', 'true');

        // Security Audit
        if (typeof Security !== 'undefined') {
            Security.trackLoginAttempt(true); // Reset attempts
            Security.audit('ADMIN_LOGIN', `Admin acceded via IP Local`);
        }

        alert("Bienvenido al Panel Maestro, Administrador.");

        const redirectUrl = localStorage.getItem('osel_redirect_after_login');
        localStorage.removeItem('osel_redirect_after_login');
        window.location.href = redirectUrl || 'admin.html';
        return;
    }

    // Normal User Login
    if (fullname && phone) {
        // Create session user
        const user = {
            name: fullname,
            phone: phone,
            avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDkccDGc8_5fdCpAQz2h8f7ZEnfSEW0NUSbfr43fNCgZ-QPeiu5jaR5bkr6OQJCZ8fHATzJlE2h8iRUv3Pp1i2uekZT6M7p6LPFCF3vALXSv1XYl_ro5YlChQEdBL0XASjxjhL4s6i4ETQqbPMv-W-N962oy4aA7VU7hl9qWIWN4sbxos1kVKTL4XP-Xo2Ii4AwvJaH-sca3WZGlcNr5bwMUzDGwx5X4tHve1o-iDTqcAHWDNIPzbl6JHW6la06znJFn8WGfZBsgQ"
        };
        localStorage.setItem('osel_user', JSON.stringify(user));
        localStorage.setItem('osel_has_visited', 'true');

        // Security Audit
        if (typeof Security !== 'undefined') {
            Security.trackLoginAttempt(true);
            Security.audit('USER_LOGIN', `User ${fullname} logged in`);
        }

        // Track user for Admin (Register if new)
        let clients = JSON.parse(localStorage.getItem('osel_clients')) || [];
        const existingClient = clients.find(c => c.name === fullname || c.phone === phone);

        if (!existingClient) {
            // Register new client
            clients.push({
                id: Date.now(),
                name: fullname,
                phone: phone, // Added phone storage
                email: "N/A", // Legacy field fallback
                points: 0,
                joined: new Date().toLocaleDateString()
            });
            localStorage.setItem('osel_clients', JSON.stringify(clients));
            alert(`¡Bienvenido a OSEL, ${fullname}! Tu registro ha sido exitoso.`);
            if (typeof Security !== 'undefined') Security.audit('NEW_REGISTRATION', `User ${fullname} registered`);
        } else {
            alert(`¡Hola de nuevo, ${fullname}!`);
        }

        // Redirect
        const redirectUrl = localStorage.getItem('osel_redirect_after_login');
        localStorage.removeItem('osel_redirect_after_login');
        window.location.href = redirectUrl || 'index.html';
    } else {
        if (typeof Security !== 'undefined') Security.trackLoginAttempt(false);
        alert("Por favor ingresa tu Nombre Completo y Número de Teléfono.");
    }
}

// --- Social Login (Google & Apple) ---
function handleSocialLogin(provider) {
    // Show loading message
    const message = provider === 'google' ? 'Conectando con Google...' : 'Conectando con Apple...';

    // Create a loading overlay
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px 40px; border-radius: 12px; z-index: 9999; font-weight: bold;';
    loadingDiv.textContent = message;
    document.body.appendChild(loadingDiv);

    // Simulate authentication delay
    setTimeout(() => {
        // Create simulated user based on provider
        const user = {
            name: provider === 'google' ? 'Usuario Google' : 'Usuario Apple',
            email: provider === 'google' ? 'usuario@gmail.com' : 'usuario@icloud.com',
            provider: provider,
            avatar: provider === 'google'
                ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuDkccDGc8_5fdCpAQz2h8f7ZEnfSEW0NUSbfr43fNCgZ-QPeiu5jaR5bkr6OQJCZ8fHATzJlE2h8iRUv3Pp1i2uekZT6M7p6LPFCF3vALXSv1XYl_ro5YlChQEdBL0XASjxjhL4s6i4ETQqbPMv-W-N962oy4aA7VU7hl9qWIWN4sbxos1kVKTL4XP-Xo2Ii4AwvJaH-sca3WZGlcNr5bwMUzDGwx5X4tHve1o-iDTqcAHWDNIPzbl6JHW6la06znJFn8WGfZBsgQ'
                : 'https://lh3.googleusercontent.com/aida-public/AB6AXuCTBvRrg8MTCev7r5vOIErtcrwhxuoFsBPjoQJFTkGfAbVy7OXbmEkiHJJ_zlbZaFXa9HEE-V4s8UxTxXPGj6PKTBzdjDd5ustF4jS0VAk4o4AVOKyTTaieGo8vVSMy4yM8ePF1jTrAESmbsuRn94Lfx9Ge5z7P83dSR1oexOKNkt7NnZAUz1j46HOYE8w6qp3nCO2l23cJcWCKlWmwWFFW2rRNqNgMxi6u5rXXCk14Iaoljf4wzl3o4ktr_Dvzeedq5rWUy9MNcA'
        };

        // Save user data
        localStorage.setItem('osel_user', JSON.stringify(user));
        localStorage.setItem('osel_has_visited', 'true');

        // Remove loading message
        document.body.removeChild(loadingDiv);

        // Show success and redirect
        alert(`¡Bienvenido! Has iniciado sesión con ${provider === 'google' ? 'Google' : 'Apple'}`);

        // Check if there's a redirect URL saved
        const redirectUrl = localStorage.getItem('osel_redirect_after_login');
        localStorage.removeItem('osel_redirect_after_login');
        window.location.href = redirectUrl || 'index.html';
    }, 1500); // Simulate API call delay
}


function handleSearch(query) {
    const term = query.toLowerCase().trim();
    if (!term) {
        // Reset to all products logic if needed, or clear results
        document.getElementById('search-results').innerHTML = '';
        return;
    }

    const filtered = state.products.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.tags.some(t => t.toLowerCase().includes(term))
    );

    // Render only in the search overlay results container
    const searchResults = document.getElementById('search-results');
    if (searchResults) {
        if (filtered.length === 0) {
            searchResults.innerHTML = `<div class="col-span-full text-center py-4 text-slate-400">No hay coincidencias</div>`;
        } else {
            const createGridCard = (p) => `
            <div class="bg-white rounded-2xl p-4 flex gap-4 items-center shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <img src="${p.image}" class="h-20 w-auto object-contain">
                <div>
                    <h4 class="font-bold text-slate-900">${p.name}</h4>
                    <p class="text-sm text-slate-500">$${p.price}</p>
                    <button onclick="event.stopPropagation(); addToCart(${p.id}); toggleSearch();" class="text-xs text-primary font-bold mt-1 hover:underline">Agregar +</button>
                </div>
            </div>
            `;
            searchResults.innerHTML = filtered.map(createGridCard).join('');
        }
    }
}

function toggleSearch() {
    const overlay = document.getElementById('search-overlay');
    const input = document.getElementById('search-input');

    if (overlay.classList.contains('hidden')) {
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.remove('opacity-0', 'pointer-events-none'), 10);
        setTimeout(() => input.focus(), 300);
        handleSearch(''); // Clear previous results or show init state
    } else {
        overlay.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }
}

// --- Cart Logic ---
function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    const backdrop = document.getElementById('cart-backdrop');

    if (sidebar.classList.contains('translate-x-full')) {
        sidebar.classList.remove('translate-x-full');
        backdrop.classList.remove('hidden');
        setTimeout(() => backdrop.classList.remove('opacity-0'), 10);
    } else {
        sidebar.classList.add('translate-x-full');
        backdrop.classList.add('opacity-0');
        setTimeout(() => backdrop.classList.add('hidden'), 300);
    }
}

function addToCart(productId, qty = 1) {
    const product = state.products.find(p => p.id == productId);
    if (!product) return;

    const existing = state.cart.find(item => item.id == productId);

    // Validar Stock
    const currentQty = existing ? existing.qty : 0;
    if (currentQty + qty > (product.stock || 0)) {
        alert(`Lo sentimos, solo hay ${product.stock} unidades disponibles de este producto.`);
        return;
    }

    if (existing) {
        existing.qty += qty;
    } else {
        state.cart.push({ ...product, qty: qty });
    }

    saveCart();
    updateCartIcon();
    renderCart();

    // Open cart to show feedback
    const sidebar = document.getElementById('cart-sidebar');
    if (sidebar.classList.contains('translate-x-full')) {
        toggleCart();
    }
}

function removeFromCart(productId) {
    state.cart = state.cart.filter(item => item.id != productId);
    saveCart();
    updateCartIcon();
    renderCart();
    renderCartPage(); // Update cart page if present
}

function updateQty(productId, change) {
    const item = state.cart.find(p => p.id == productId);
    if (!item) return;

    item.qty += change;
    if (item.qty <= 0) {
        removeFromCart(productId);
    } else {
        saveCart();
        renderCart();
        updateCartIcon();
    }
}

function saveCart() {
    localStorage.setItem('osel_cart', JSON.stringify(state.cart));
}

function updateCartIcon() {
    const count = state.cart.reduce((acc, item) => acc + item.qty, 0);
    const badge = document.getElementById('cart-count');
    if (!badge) return; // Element doesn't exist on this page
    badge.innerText = count;
    if (count > 0) badge.classList.remove('hidden');
    else badge.classList.add('hidden');
}

function renderCart() {
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');

    if (!container || !totalEl) return; // Elements don't exist on this page

    if (state.cart.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-center space-y-4">
                <span class="material-symbols-outlined text-6xl text-slate-200">shopping_bag</span>
                <p class="text-slate-400">Tu bolsa está vacía.</p>
                <button onclick="toggleCart(); scrollToProducts()" class="text-primary font-bold text-sm hover:underline">Ir a comprar</button>
            </div>`;
        totalEl.innerText = "$0.00";
        return;
    }

    let total = 0;
    container.innerHTML = state.cart.map(item => {
        total += item.price * item.qty;
        return `
        <div class="flex gap-4 items-center">
            <div class="h-20 w-20 bg-slate-50 dark:bg-gray-800 rounded-xl flex items-center justify-center p-2 border border-gray-100 dark:border-gray-700">
                <img src="${item.image}" class="h-full w-auto object-contain">
            </div>
            <div class="flex-1">
                <h4 class="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">${item.name}</h4>
                <p class="text-xs text-slate-500 dark:text-slate-400 mb-2">$${item.price}</p>
                <div class="flex items-center gap-3">
                    <button onclick="updateQty('${item.id}', -1)" class="size-6 rounded-full bg-slate-100 dark:bg-gray-700 flex items-center justify-center text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-gray-600">-</button>
                    <span class="text-sm font-medium w-4 text-center text-slate-900 dark:text-white">${item.qty}</span>
                    <button onclick="updateQty('${item.id}', 1)" class="size-6 rounded-full bg-slate-100 dark:bg-gray-700 flex items-center justify-center text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-gray-600">+</button>
                </div>
            </div>
            <button onclick="removeFromCart('${item.id}')" class="text-slate-300 dark:text-gray-500 hover:text-red-500 transition-colors">
                <span class="material-symbols-outlined text-lg">delete</span>
            </button>
        </div>
        `;
    }).join('');

    totalEl.innerText = `$${total.toLocaleString()}`;
    const btn = document.getElementById('checkout-btn');
    if (btn) btn.disabled = false;
}

function startCheckout() {
    if (state.cart.length === 0) return;
    window.location.href = 'checkout.html';
}

function renderCartPage() {
    const container = document.getElementById('cart-page-items');
    const countEl = document.getElementById('cart-page-count');
    const subtotalEl = document.getElementById('cart-page-subtotal');
    const taxEl = document.getElementById('cart-page-tax');
    const totalEl = document.getElementById('cart-page-total');
    const checkoutBtn = document.getElementById('checkout-btn');

    if (!container) return; // Not on cart page

    const itemCount = state.cart.reduce((acc, item) => acc + item.qty, 0);

    // Update count
    if (countEl) {
        countEl.innerText = itemCount === 0 ? '0 Artículos' : `${itemCount} Artículo${itemCount > 1 ? 's' : ''}`;
    }

    // Empty state
    if (state.cart.length === 0) {
        container.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-3xl p-16 text-center border border-gray-100 dark:border-gray-700 shadow-sm">
                <span class="material-symbols-outlined text-8xl text-gray-200 dark:text-gray-600 mb-6">shopping_cart</span>
                <h3 class="text-2xl font-bold text-gray-900 dark:text-white mb-3">Tu carrito está vacío</h3>
                <p class="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">¡Comienza a agregar productos increíbles para tu proyecto!</p>
                <button onclick="window.location.href='tienda.html'"
                    class="px-8 py-4 bg-primary text-white font-bold rounded-xl hover:bg-blue-600 transition-all inline-flex items-center gap-2 shadow-lg shadow-primary/20">
                    <span class="material-symbols-outlined">store</span>
                    Ir a la Tienda
                </button>
            </div>
        `;

        if (subtotalEl) subtotalEl.innerText = '$0.00';
        if (taxEl) taxEl.innerText = '$0.00';
        if (totalEl) totalEl.innerText = '$0.00';
        if (checkoutBtn) checkoutBtn.disabled = true;
        return;
    }

    // Render items
    let subtotal = 0;
    container.innerHTML = state.cart.map(item => {
        const itemTotal = item.price * item.qty;
        subtotal += itemTotal;

        return `
            <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm transition-all duration-300">
                <div class="flex gap-6 items-center">
                    <div class="h-24 w-24 bg-gray-50 dark:bg-gray-700 rounded-xl flex items-center justify-center p-2 border border-gray-100 dark:border-gray-600 shrink-0">
                        <img src="${item.image}" class="h-full w-auto object-contain">
                    </div>
                    <div class="flex-1 min-w-0">
                        <h3 class="font-bold text-gray-900 dark:text-white text-lg mb-1 truncate">${item.name}</h3>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">${item.category} ${item.finish ? '• ' + item.finish : ''}</p>
                        <div class="flex items-center gap-4">
                            <div class="flex items-center gap-3 bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-600">
                                <button onclick="updateCartPageQty('${item.id}', -1)" class="size-7 rounded-full bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 flex items-center justify-center text-gray-600 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-500 hover:border-primary transition-all">
                                    <span class="material-symbols-outlined text-sm">remove</span>
                                </button>
                                <span class="text-sm font-bold w-8 text-center text-gray-900 dark:text-white">${item.qty}</span>
                                <button onclick="updateCartPageQty('${item.id}', 1)" class="size-7 rounded-full bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 flex items-center justify-center text-gray-600 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-500 hover:border-primary transition-all">
                                    <span class="material-symbols-outlined text-sm">add</span>
                                </button>
                            </div>
                            <span class="text-sm text-gray-500 dark:text-gray-400">$${item.price.toLocaleString()} c/u</span>
                        </div>
                    </div>
                    <div class="text-right shrink-0">
                        <p class="text-2xl font-black text-primary mb-3">$${itemTotal.toLocaleString()}</p>
                        <button onclick="removeFromCart('${item.id}')" class="text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1 text-sm font-medium ml-auto">
                            <span class="material-symbols-outlined text-lg">delete</span>
                            Eliminar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Calculate totals
    const tax = subtotal * 0.16; // 16% IVA
    const total = subtotal + tax;

    if (subtotalEl) subtotalEl.innerText = `$${subtotal.toLocaleString()}`;
    if (taxEl) taxEl.innerText = `$${tax.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (totalEl) totalEl.innerText = `$${total.toLocaleString()}`;
    if (checkoutBtn) checkoutBtn.disabled = false;
}

function updateCartPageQty(productId, change) {
    const item = state.cart.find(i => i.id == productId);
    if (!item) return;

    item.qty += change;
    if (item.qty < 1) {
        removeFromCart(productId);
    } else {
        saveCart();
        renderCartPage();
        updateCartIcon();
    }
}

// --- Navigation & Location ---
function selectLocation(locName, element) {
    state.location = locName;
    localStorage.setItem('osel_location', locName);
    updateLocationUI();

    // Toggle active class in dropdown (visual only, list is re-rendered statically in HTML for now, 
    // but in real app we'd querySelectorAll and update classes)
    document.getElementById('location-dropdown').style.display = 'none'; // Force hide hover
    setTimeout(() => document.getElementById('location-dropdown').style.display = '', 100); // Reset
}

function updateLocationUI() {
    const locText = document.getElementById('current-location');
    const heroLocText = document.getElementById('selected-region-text');
    if (locText) locText.innerText = state.location;
    if (heroLocText) heroLocText.innerText = state.location;
}

// --- Calculadora de Pintura ---
let manosSeleccionadas = 2; // Default 2 manos

window.setManos = function (numManos) {
    manosSeleccionadas = numManos;

    // Update UI - remove active from all, add to selected
    document.querySelectorAll('.manos-btn').forEach(btn => {
        btn.classList.remove('active', 'border-primary', 'bg-primary/10', 'text-primary');
        btn.classList.add('border-gray-200');
    });

    const selectedBtn = document.querySelector(`[data-manos="${numManos}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active', 'border-primary', 'bg-primary/10', 'text-primary');
        selectedBtn.classList.remove('border-gray-200');
    }

    calcularPintura();
}

function calcularPintura() {
    const metrosInput = document.getElementById('calc-metros');
    const resultDiv = document.getElementById('calc-result');

    if (!metrosInput || !resultDiv) return;

    const metros = parseFloat(metrosInput.value) || 0;

    if (metros <= 0) {
        resultDiv.innerHTML = '0.0 L';
        return;
    }

    // Cálculo: (m² × manos) / rendimiento
    // Rendimiento estándar: 10 m²/litro
    const rendimiento = 10;
    const litrosNecesarios = (metros * manosSeleccionadas) / rendimiento;

    // Format with 1 decimal
    resultDiv.innerHTML = `${litrosNecesarios.toFixed(1)} L`;

    // Add visual feedback
    resultDiv.classList.add('animate-pulse');
    setTimeout(() => resultDiv.classList.remove('animate-pulse'), 300);
}

// Initialize calculator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const metrosInput = document.getElementById('calc-metros');
    if (metrosInput) {
        metrosInput.addEventListener('input', calcularPintura);
        // Also trigger on change for better UX
        metrosInput.addEventListener('change', calcularPintura);
    }
});


// --- Shop Logic (tienda.html) ---
let shopFilters = {
    categories: [],
    priceMax: 5000,
    usage: null,
    finish: null,
    sort: 'relevancia',
    search: '',
    page: 1,
    itemsPerPage: 12
};

function initShop() {
    console.log('[OSEL Shop] initShop called');
    renderCategoryFilters();
    const grid = document.getElementById('shop-products-grid');
    console.log('[OSEL Shop] Grid element found:', grid !== null);

    if (!grid) {
        console.warn('[OSEL Shop] Grid element not found! Shop will not initialize.');
        return;
    }

    // 1. Category Checkboxes
    // Specific selector for dynamic categories and generic selector for others if needed.
    // We prioritize the #filters-categories container to avoid grabbing complex labels like in "Rewards"
    const categoryInputs = document.querySelectorAll('#filters-categories input[type="checkbox"]');
    console.log('[OSEL Shop] Found', categoryInputs.length, 'category checkboxes');

    categoryInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            const catId = e.target.value;
            if (e.target.checked) {
                shopFilters.categories.push(catId);
            } else {
                shopFilters.categories = shopFilters.categories.filter(c => c !== catId);
            }
            console.log('[OSEL Shop] Categories updated:', shopFilters.categories);
            renderShopProducts();
        });
    });

    // Also handle other checkboxes (Herramientas, etc) if they should act as categories?
    // For simplicity, let's treat the static checkboxes in other sections as categories too,
    // BUT we must be careful.
    // Let's add specific listeners for the static sections if they exist.
    const staticSections = document.querySelectorAll('aside div.space-y-4 input[type="checkbox"]');
    staticSections.forEach(input => {
        // Skip if it's already in the category container or is the rewards checkbox (complex html)
        if (input.closest('#filters-categories') || input.closest('.pb-10')) return;

        input.addEventListener('change', (e) => {
            const label = e.target.parentElement.textContent.trim().toLowerCase();
            if (e.target.checked) {
                shopFilters.categories.push(label);
            } else {
                shopFilters.categories = shopFilters.categories.filter(c => c !== label);
            }
            renderShopProducts();
        });
    });

    // 2. Price Range
    const priceRange = document.querySelector('input[type="range"]');
    const priceTextContainer = document.querySelector('aside input[type="range"] + div');
    if (priceRange && priceTextContainer) {
        const priceText = priceTextContainer.querySelectorAll('span')[1]; // Get second span (max price)
        priceRange.addEventListener('input', (e) => {
            shopFilters.priceMax = parseInt(e.target.value);
            if (priceText) priceText.innerText = `Max: $${shopFilters.priceMax.toLocaleString()}`;
            renderShopProducts();
        });
    }

    // 3. Sort Select
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            shopFilters.sort = e.target.value;
            renderShopProducts();
        });
    }

    // 4. Search Bar
    const shopSearch = document.getElementById('shop-search');
    if (shopSearch) {
        shopSearch.addEventListener('input', (e) => {
            shopFilters.search = e.target.value.toLowerCase();
            renderShopProducts();
        });
    }

    // 5. Reset Button
    const resetBtn = document.getElementById('shop-reset-filters');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            console.log('[OSEL Shop] Reset button clicked - Restoring all products');

            // Reset filters object to INITIAL STATE
            shopFilters = {
                categories: [],
                priceMax: 5000,
                usage: null,
                finish: null,
                sort: 'relevancia',
                search: '',
                page: 1,
                itemsPerPage: 12
            };

            // Reset UI Checkboxes
            const allCheckboxes = document.querySelectorAll('aside input[type="checkbox"]');
            allCheckboxes.forEach(input => input.checked = false);

            // Reset UI Radios
            const allRadios = document.querySelectorAll('aside input[type="radio"]');
            allRadios.forEach(input => input.checked = false);

            // Reset Price Range
            const priceRange = document.querySelector('input[type="range"]');
            const priceTextContainer = document.querySelector('aside input[type="range"] + div');
            if (priceRange) priceRange.value = 5000;
            if (priceTextContainer) {
                const priceText = priceTextContainer.querySelectorAll('span')[1];
                if (priceText) priceText.innerText = "Max: $5,000+";
            }

            // Reset Search Input
            const shopSearch = document.getElementById('shop-search');
            if (shopSearch) shopSearch.value = '';

            // Reset Sort Select
            const sortSelect = document.getElementById('sort-select');
            if (sortSelect) sortSelect.selectedIndex = 0;

            // Force re-render with ALL products
            console.log('[OSEL Shop] Rendering all products after reset');
            renderShopProducts();
        });
    }

    // Initial render
    console.log('[OSEL Shop] Calling initial renderShopProducts');
    renderShopProducts();
}

// Helper for Pagination
window.changePage = function (newPage) {
    shopFilters.page = newPage;
    renderShopProducts();
    const grid = document.getElementById('shop-products-grid');
    if (grid) {
        const yOffset = -100; // Offset for sticky header
        const y = grid.getBoundingClientRect().top + window.scrollY + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
    }
}

function renderShopProducts() {
    console.log('[OSEL Shop] renderShopProducts called');
    const grid = document.getElementById('shop-products-grid');

    if (!grid) return;

    let filtered = [...state.products];

    // Filter by Price
    filtered = filtered.filter(p => p.price <= shopFilters.priceMax);

    // Filter by Search
    if (shopFilters.search) {
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(shopFilters.search) ||
            p.category.toLowerCase().includes(shopFilters.search) ||
            (p.sku && p.sku.toLowerCase().includes(shopFilters.search)) ||
            (p.barcode && p.barcode.includes(shopFilters.search))
        );
    }

    // Filter by Category
    if (shopFilters.categories.length > 0) {
        filtered = filtered.filter(p => {
            return shopFilters.categories.some(catId =>
                p.category === catId ||
                p.category?.toLowerCase() === catId.toLowerCase() ||
                p.name?.toLowerCase().includes(catId.toLowerCase())
            );
        });
    }

    // Sort
    if (shopFilters.sort === 'price_asc') {
        filtered.sort((a, b) => a.price - b.price);
    } else if (shopFilters.sort === 'price_desc') {
        filtered.sort((a, b) => b.price - a.price);
    } else if (shopFilters.sort === 'newest') {
        filtered.sort((a, b) => b.id - a.id); // Assuming higher ID is newer
    } else {
        // Relevancia: Default sort (Best Sellers first, then ID)
        filtered.sort((a, b) => (b.bestSeller === true) - (a.bestSeller === true) || a.id - b.id);
    }

    // Update Counter
    const counter = document.getElementById('products-count');
    // Also try legacy selector if ID not found yet (just in case)
    const legacyCounter = document.querySelector('main p.text-sm.font-medium span');

    if (counter) counter.innerText = filtered.length;
    else if (legacyCounter) legacyCounter.innerText = filtered.length;

    // --- Pagination Logic ---
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / shopFilters.itemsPerPage) || 1;

    // Safety check for page number
    if (shopFilters.page > totalPages) shopFilters.page = 1;
    if (shopFilters.page < 1) shopFilters.page = 1;

    const start = (shopFilters.page - 1) * shopFilters.itemsPerPage;
    const end = start + shopFilters.itemsPerPage;
    const paginatedItems = filtered.slice(start, end);

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full py-20 text-center">
                <span class="material-symbols-outlined text-6xl text-slate-200 mb-4">search_off</span>
                <p class="text-slate-400 font-bold">No encontramos productos con esos filtros.</p>
                <button onclick="document.getElementById('shop-reset-filters').click()" class="text-primary text-sm font-bold mt-2 hover:underline">Limpiar filtros</button>
            </div>
        `;
        return;
    }

    // Render Cards
    const cardsHtml = paginatedItems.map(p => `
        <div onclick="window.location.href='producto.html?id=${p.id}'" class="cursor-pointer bg-white dark:bg-background-dark rounded-xl overflow-hidden product-card-shadow border border-gray-100 dark:border-gray-800 group transition-all duration-300">
            <div class="aspect-[4/5] bg-gray-50 dark:bg-gray-900 relative p-6 flex items-center justify-center overflow-hidden">
                <img src="${p.image}" alt="${p.name}" loading="lazy" class="object-contain w-full h-full transform group-hover:scale-110 transition-transform duration-500">
                ${p.bestSeller ? `
                    <div class="absolute top-4 left-4">
                        <span class="bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded">Best Seller</span>
                    </div>
                ` : ''}
            </div>
            <div class="p-6">
                <div class="flex justify-between items-start mb-1">
                    <h3 class="text-lg font-bold text-gray-900 dark:text-white leading-tight line-clamp-2">${p.name}</h3>
                    <span class="text-primary text-xs font-bold whitespace-nowrap">+${p.points || 0} Pts</span>
                </div>
                <p class="text-xs font-medium text-gray-500 mb-4 uppercase tracking-wider">${p.category} ${p.finish ? `• ${p.finish}` : ''}</p>
                <div class="flex items-center justify-between mt-auto">
                    <p class="text-xl font-extrabold text-gray-900 dark:text-white">$${p.price.toLocaleString()} <span class="text-sm font-medium text-gray-400">MXN</span></p>
                    <button onclick="event.stopPropagation(); addToCart(${p.id})" class="bg-primary hover:bg-opacity-90 text-white rounded-lg px-4 py-2 text-sm font-bold transition-all flex items-center gap-2">
                        <span class="material-symbols-outlined text-lg">add_shopping_cart</span>
                        Añadir
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    // Pagination Controls
    let paginationHtml = '';
    if (totalPages > 1) {
        paginationHtml = `
            <div class="col-span-full flex flex-col items-center gap-4 mt-8 pt-8 border-t border-gray-100 dark:border-gray-800">
                 <div class="text-xs text-slate-400 font-bold uppercase tracking-widest">
                    Mostrando ${start + 1} - ${Math.min(end, totalItems)} de ${totalItems} productos
                 </div>
                 <div class="flex items-center gap-2">
                    <button onclick="changePage(${shopFilters.page - 1})" ${shopFilters.page === 1 ? 'disabled' : ''} 
                        class="h-10 px-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-white hover:shadow-sm dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center bg-slate-50 dark:bg-gray-800/50">
                        <span class="material-symbols-outlined text-lg">chevron_left</span>
                        <span class="font-bold text-sm ml-1">Anterior</span>
                    </button>
                    
                    <div class="flex items-center gap-1 px-2">
                        ${Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            // Logic to show pages around current page could be complex, simplifying for standard use
            // Showing simple 1..N items would be too much for 5000 products (400 pages).
            // Let's just show current page context.
            let pNum = i + 1;
            // Simple offset logic: if page > 3, shift. (Simplification: Just show Prev/Next + Text is enough for now)
            return '';
        }).join('')}
                        <span class="text-sm font-bold text-slate-900 dark:text-white bg-white dark:bg-gray-700 px-4 py-2 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600">
                            Página ${shopFilters.page} de ${totalPages}
                        </span>
                    </div>

                    <button onclick="changePage(${shopFilters.page + 1})" ${shopFilters.page === totalPages ? 'disabled' : ''}
                        class="h-10 px-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-white hover:shadow-sm dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center bg-slate-50 dark:bg-gray-800/50">
                        <span class="font-bold text-sm mr-1">Siguiente</span>
                        <span class="material-symbols-outlined text-lg">chevron_right</span>
                    </button>
                 </div>
            </div>
        `;
    }

    grid.innerHTML = cardsHtml + paginationHtml;
}

// --- Product Detail Logic ---
let currentDetailQty = 1;

function initProductDetails() {
    console.log('[OSEL Detail] initProductDetails called');
    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get('id'));

    if (!id) {
        console.warn('[OSEL Detail] No ID found in URL');
        // window.location.href = 'tienda.html'; // Optional redirect
        return;
    }

    const product = state.products.find(p => p.id === id);
    if (!product) {
        console.warn('[OSEL Detail] Product not found for ID:', id);
        const bread = document.getElementById('breadcrumb-current');
        if (bread) bread.innerText = "Producto no encontrado";
        return;
    }

    // Populate data
    const set = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text; };

    set('breadcrumb-current', product.name);
    set('detail-name', product.name);
    set('detail-tagline', product.tagline || (product.category + ' Premium'));
    set('detail-category', product.category);
    set('detail-price', `$${product.price.toLocaleString()} MXN`);

    const pointsEl = document.getElementById('detail-points');
    if (pointsEl) pointsEl.innerHTML = `+${product.points || 0} Puntos OSEL <span class="font-normal text-slate-500">en esta compra</span>`;

    // Images
    const imgEl = document.getElementById('detail-image');
    if (imgEl) imgEl.src = product.image;

    const thumbEl = document.getElementById('thumb-1');
    if (thumbEl) thumbEl.src = product.image;

    // Specs
    set('spec-usage', product.usage || '--');
    set('spec-finish', product.finish || '--');
    set('spec-color', capitalizeFirst(product.color || '--'));
    set('spec-category', product.category);

    // Add to Cart Action
    const addBtn = document.getElementById('detail-add-btn');
    if (addBtn) {
        addBtn.onclick = () => {
            addToCart(product.id, currentDetailQty);
        };
    }

    // Related Products (Random selection excluding current)
    const relatedGrid = document.getElementById('related-products-grid');
    if (relatedGrid) {
        const related = state.products
            .filter(p => p.id !== id)
            .sort(() => 0.5 - Math.random())
            .slice(0, 4);

        relatedGrid.innerHTML = related.map(p => `
            <div onclick="window.location.href='producto.html?id=${p.id}'" class="group cursor-pointer">
                <div class="aspect-square bg-white dark:bg-white/5 rounded-2xl overflow-hidden border border-[#f5f4f0] dark:border-white/10 mb-4 p-8 relative">
                    <img src="${p.image}" class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500">
                    <button onclick="event.stopPropagation(); addToCart(${p.id})" class="absolute bottom-4 right-4 bg-white shadow-md rounded-full p-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
                        <span class="material-symbols-outlined text-black">add_shopping_cart</span>
                    </button>
                </div>
                <p class="font-bold text-[#181711] dark:text-white truncate">${p.name}</p>
                <p class="text-sm text-[#8a8360] font-medium">$${p.price.toLocaleString()} MXN</p>
            </div>
        `).join('');
    }
}

function updateDetailQty(change) {
    currentDetailQty += change;
    if (currentDetailQty < 1) currentDetailQty = 1;
    const qtyEl = document.getElementById('detail-qty');
    if (qtyEl) qtyEl.innerText = currentDetailQty;
}

function capitalizeFirst(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// --- Checkout Logic ---
function initCheckout() {
    console.log('[OSEL Checkout] Initializing...');

    // 1. Check for Stripe success return
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
        finalizeStripeOrder();
        // Do not redirect or empty cart again if already on success state
    }

    const container = document.getElementById('checkout-items');
    if (!container) return;

    if (state.cart.length === 0 && !urlParams.get('success')) {
        window.location.href = 'carrito.html'; // Redirect validation
        return;
    }

    let subtotal = 0;
    container.innerHTML = state.cart.map(item => {
        subtotal += item.price * item.qty;
        return `
            <div class="flex gap-4 items-center mb-4">
                <div class="h-16 w-16 bg-slate-50 rounded-lg flex items-center justify-center p-1 border border-gray-100">
                    <img src="${item.image}" class="h-full w-auto object-contain">
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-slate-800 text-xs truncate">${item.name}</h4>
                    <p class="text-xs text-slate-500">Cant: ${item.qty}</p>
                </div>
                <span class="font-bold text-sm text-slate-900">$${(item.price * item.qty).toLocaleString()}</span>
            </div>
        `;
    }).join('');

    // Totals
    const ship = 0; // Free for now
    const total = subtotal + ship;

    document.getElementById('checkout-subtotal').innerText = `$${subtotal.toLocaleString()}`;
    document.getElementById('checkout-total').innerText = `$${total.toLocaleString()}`;
}

// --- Checkout Logic ---
async function initCheckout() {
    // Render list (checkout.html logic)
    const container = document.getElementById('checkout-items');
    const subtotalEl = document.getElementById('checkout-subtotal');
    const totalEl = document.getElementById('checkout-total');

    if (!container) return; // Guard clause if not on checkout page

    if (state.cart.length === 0) {
        window.location.href = 'carrito.html';
        return;
    }

    let total = 0;
    container.innerHTML = state.cart.map(item => {
        total += item.price * item.qty;
        return `
            <div class="flex items-center gap-4 py-2 border-b border-gray-50 last:border-0">
                <div class="h-12 w-12 bg-gray-50 rounded-lg p-1">
                    <img src="${item.image}" class="h-full w-full object-contain">
                </div>
                <div class="flex-1">
                    <p class="text-xs font-bold text-slate-800 line-clamp-1">${item.name}</p>
                    <p class="text-xs text-gray-500">Cant: ${item.qty}</p>
                </div>
                <span class="text-sm font-bold text-slate-700">$${(item.price * item.qty).toLocaleString()}</span>
            </div>
        `;
    }).join('');

    if (subtotalEl) subtotalEl.innerText = `$${total.toLocaleString()}`;
    if (totalEl) totalEl.innerText = `$${total.toLocaleString()}`;

    // Inicializar Stripe si aplica
    if (typeof initStripeElements === 'function') {
        initStripeElements();
    }
}








// ===== REWARDS POINTS SYSTEM =====

// Add Points for Purchase (call this when checkout is completed)
function awardPointsForPurchase(cartItems) {
    let totalPoints = 0;

    cartItems.forEach(item => {
        const basePoints = item.points || 10; // Default 10 points if not specified
        totalPoints += basePoints * item.qty;
    });

    const currentPoints = parseInt(localStorage.getItem('osel_user_points') || '0');
    const newPoints = currentPoints + totalPoints;

    localStorage.setItem('osel_user_points', newPoints.toString());

    console.log(`[REWARDS] Awarded ${totalPoints} points! New balance: ${newPoints}`);

    return { awarded: totalPoints, newBalance: newPoints };
}

// Simulate Purchase Completion (for testing)
function simulateCheckout() {
    if (state.cart.length === 0) {
        alert('Tu carrito está vacío');
        return;
    }

    const pointsInfo = awardPointsForPurchase(state.cart);

    // Save Order for Admin History
    const currentUser = JSON.parse(localStorage.getItem('osel_user')) || { name: 'Invitado', phone: '0000000000' };
    const newOrder = {
        id: Date.now(),
        client: currentUser.name,
        phone: currentUser.phone,
        date: new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        total: state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0),
        items: state.cart,
        status: 'Completado'
    };

    const orders = JSON.parse(localStorage.getItem('osel_orders')) || [];
    orders.push(newOrder);
    localStorage.setItem('osel_orders', JSON.stringify(orders));

    // Clear cart after purchase
    state.cart = [];
    saveCart();
    updateCartIcon();
    renderCart();
    renderCartPage();

    alert(`¡Compra completada exitosamente!\n\nHas ganado ${pointsInfo.awarded} puntos.\nBalance total: ${pointsInfo.newBalance} puntos\n\n¡Visita la sección de Recompensas para canjearlos!`);
}

// Get User Points
function getUserPoints() {
    return parseInt(localStorage.getItem('osel_user_points') || '0');
}

// Add Test Points (for development/testing)
function addTestPoints(points = 500) {
    const current = getUserPoints();
    const newTotal = current + points;
    localStorage.setItem('osel_user_points', newTotal.toString());
    console.log(`[REWARDS] Added ${points} test points. New balance: ${newTotal}`);
    alert(`Se agregaron ${points} puntos de prueba.\nBalance total: ${newTotal} puntos`);
}

// Expose for console testing
window.simulateCheckout = simulateCheckout;
window.addTestPoints = addTestPoints;
window.getUserPoints = getUserPoints;


function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
}
window.toggleMobileMenu = toggleMobileMenu;

function toggleFilters() {
    const sidebar = document.getElementById('shop-sidebar');
    if (sidebar) {
        sidebar.classList.toggle('hidden');
    }
}
window.toggleFilters = toggleFilters;

// --- ESTRATEGIA STRIPE ELEMENTS (PAGO EN SITIO) ---
let stripe;
let elements;
let paymentElement;

async function initStripeElements() {
    const paymentContainer = document.getElementById('payment-element');
    if (!paymentContainer) return;

    console.log('[OSEL] Inicializando Stripe Elements...');
    stripe = Stripe('pk_test_51SH9WpHfOF8W8gGoFpuNOrSLE5ekk3WaLFmaN4SlsqxRzkyxSjYCUqEIz79i3eAzRTnb5NYnWO4UFvLfh0cyeDKk00Ad08Fn9m');

    // 1. Obtener clientSecret inicial (o manejarlo al confirmar)
    // Para que el formulario salga de inmediato, necesitamos un intent
    try {
        const items = state.cart;
        if (items.length === 0) return;

        const response = await fetch('/api/payment/create-payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items,
                customer_details: { name: 'Cliente Osel', email: 'vuelo@test.com', phone: '0000' } // Placeholder
            })
        });

        const { clientSecret } = await response.json();

        elements = stripe.elements({ clientSecret, appearance: { theme: 'stripe' } });
        paymentElement = elements.create('payment');
        paymentElement.mount('#payment-element');

        console.log('[OSEL] Payment Element montado.');
    } catch (err) {
        console.error('[OSEL] Error al montar Elements:', err);
    }
}

// Reemplazar la función processOrder existente o modificarla
async function processOrder() {
    console.log('[OSEL] Procesando orden con Elements...');

    // 1. Validar campos
    const email = document.getElementById('checkout-email')?.value;
    const name = document.getElementById('checkout-name')?.value;
    const phone = document.getElementById('checkout-phone')?.value;
    const street = document.getElementById('checkout-street')?.value;
    const ext = document.getElementById('checkout-num-ext')?.value;
    const col = document.getElementById('checkout-colonia')?.value;
    const city = document.getElementById('checkout-city')?.value;
    const zip = document.getElementById('checkout-zip')?.value;

    if (!email || !name || !phone || !street || !ext || !col || !city || !zip) {
        alert("⚠️ Por favor completa todos los campos de envío.");
        return;
    }

    const btn = document.getElementById('pay-button');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span> Procesando pago...`;
    }

    try {
        // En un flujo real con Elements, solemos disparar esto antes o actualizarlo aquí.
        // Confirmar el pago con Stripe
        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/checkout.html?success=true`,
                receipt_email: email,
            },
        });

        if (error) {
            const messageContainer = document.getElementById('payment-message');
            if (messageContainer) {
                messageContainer.textContent = error.message;
                messageContainer.classList.remove('hidden');
            }
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<span class="material-symbols-outlined">credit_card</span> Pagar e Introducir Tarjeta`;
            }
        }
    } catch (err) {
        console.error('[OSEL] Error crítico:', err);
        alert("Ocurrió un error inesperado al procesar el pago.");
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `Reintentar Pago`;
        }
    }
}

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[OSEL] Inicializando aplicación...');

    // Cargar productos primero
    await loadProducts();

    // Si estamos en checkout, inicializar Stripe y el resumen
    if (window.location.pathname.includes('checkout.html')) {
        initCheckout();
    }

    // Actualizar íconos del carrito
    updateCartIcon();

    console.log('[OSEL] Aplicación lista');
});

window.processOrder = processOrder;
