// ====================================================================
// 🔗 CONFIGURACIÓN
// ====================================================================
const SHEET_ID = "1yj-uxy_puPfjcOZbqjeUBuMjRCwHsjSh6UNNEEmikvk"; 
const API_KEY = "AIzaSyCZS-GAGD2ErO1ELvT0I7_KguW_83MSBl4"; 
const RANGE = "Catalogo!A2:G";
const SHEET_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(RANGE)}?key=${API_KEY}`;
const WHATSAPP_BASE_URL = "https://wa.me/584126540256";

const catalogueGrid = document.getElementById("catalogue-grid");
const categoryTabsContainer = document.getElementById("category-tabs");

// ====================================================================
// 🛠️ FUNCIÓN: CORREGIR URL DE GOOGLE DRIVE
// ====================================================================
function convertDriveUrl(url) {
    if (!url || typeof url !== "string") return "";
    const match = url.match(/\/file\/d\/([^/]+)\//);
    if (match) {
        return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
    return url;
}

// ====================================================================
// 1. OBTENER DATOS DEL CATÁLOGO
// ====================================================================
async function fetchCatalogue() {
    const res = await fetch(SHEET_URL);
    if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
    const data = await res.json();
    const rows = data.values || [];

    return rows.map(row => {
        const rawPrice = String(row[4] || "0").replace(/[$.]/g, "").replace(/,/g, ".");
        const rawStock = String(row[5] || "0");
        const photoUrl = convertDriveUrl(row[6]);

        return {
            Codigo: row[0],
            Nombre_Producto: row[1],
            Descripcion: row[2],
            Categoria: row[3],
            Precio: parseFloat(rawPrice) || 0,
            Stock: parseInt(rawStock) || 0,
            Foto_URL: photoUrl
        };
    });
}

// ====================================================================
// 2. RENDERIZADO DE TABS Y PRODUCTOS
// ====================================================================
function getUniqueCategories(products) {
    const categories = new Set(products.map(p => p.Categoria).filter(c => c && c.trim() !== ""));
    return ["TODOS", ...Array.from(categories)];
}

function renderCategoryTabs(categories, products) {
    categoryTabsContainer.innerHTML = "";
    categories.forEach(category => {
        const button = document.createElement("button");
        button.className = "tab-button";
        button.textContent = category.toUpperCase();
        button.dataset.category = category;

        button.addEventListener("click", () => {
            document.querySelectorAll(".tab-button").forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");
            const filtered = category === "TODOS"
                ? products
                : products.filter(p => p.Categoria.toUpperCase() === category.toUpperCase());
            renderProducts(filtered);
        });

        categoryTabsContainer.appendChild(button);
    });
    categoryTabsContainer.querySelector('[data-category="TODOS"]').classList.add("active");
}

function renderProducts(products) {
    catalogueGrid.innerHTML = "";
    if (products.length === 0) {
        catalogueGrid.innerHTML = "<p style='grid-column: 1 / -1; text-align:center;'>No hay productos.</p>";
        return;
    }

    products.forEach(product => {
        const isAvailable = product.Stock > 0;
        const whatsappText = `Hola, me interesa "${product.Nombre_Producto}" (Código: ${product.Codigo}).`;
        const whatsappLink = `${WHATSAPP_BASE_URL}?text=${encodeURIComponent(whatsappText)}`;

        const card = document.createElement("div");
        card.className = "product-card bg-white rounded-xl overflow-hidden shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-1 text-center p-4";

        card.innerHTML = `
            <img src="${product.Foto_URL}" alt="${product.Nombre_Producto}" class="w-full h-72 object-cover block rounded-md" loading="lazy">
            <div class="product-details p-4">
                <p class="text-oro-rosa font-semibold uppercase text-xs mb-1">${product.Categoria}</p>
                <h3 class="font-semibold text-lg mt-1 mb-1">${product.Nombre_Producto}</h3>
                <p class="text-gray-400 text-sm mb-3">Cód: ${product.Codigo}</p>
                <p class="text-gray-600 text-sm mb-4 line-clamp-3">${product.Descripcion}</p>
                <p class="text-xl text-gray-800 font-bold mb-2">$${Number(product.Precio).toLocaleString("es-VE", { minimumFractionDigits: 2 })}</p>
                <p class="product-stock ${isAvailable ? "text-green-600" : "out-of-stock"}">
                    ${isAvailable ? `Disponible: ${product.Stock} uds.` : "Agotado Temporalmente"}
                </p>
                ${isAvailable 
                    ? `<a href="${whatsappLink}" target="_blank" rel="noopener noreferrer" class="block mt-4">
                          <button class="whatsapp-button py-3 px-5 w-full font-semibold uppercase text-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 448 512">
                              <path d="M380.9 97.1C339-1.3 243.2-32.2 146.3 9.9 64.3 44.7 9.5 125.7.3 219.9c-1.5 17.7-1.2 35.7.9 53.2L0 480l207.8-54.6c18.3 3.7 36.9 5.6 55.6 5.6 96.1 0 180.4-55.2 217.5-140.4 41.3-93.6 15.1-201.5-55-273.5zM256 392c-15.7 0-31.2-2.3-46.3-6.9l-8.1-2.5-123.4 32.4 32.9-119.5-2.6-8.3c-4.7-15.2-7.1-31-7.1-46.8 0-86.1 70.1-156.1 156.1-156.1 41.7 0 80.9 16.2 110.4 45.7 29.4 29.4 45.7 68.6 45.7 110.4 0 86.1-70 156.1-156.1 156.1z"/>
                            </svg>
                            Comprar por WhatsApp
                          </button>
                       </a>`
                    : `<button class="whatsapp-button out-of-stock-btn py-3 px-5 w-full font-semibold uppercase text-sm" disabled>
                          Agotado
                       </button>`}
            </div>
        `;
        catalogueGrid.appendChild(card);
    });
}

// ====================================================================
// 3. INICIALIZACIÓN
// ====================================================================
async function init() {
    try {
        const products = await fetchCatalogue();
        const categories = getUniqueCategories(products);
        renderCategoryTabs(categories, products);
        renderProducts(products);
    } catch (err) {
        catalogueGrid.innerHTML = `<p style="color:red; text-align:center; grid-column: 1 / -1;">❌ Error cargando catálogo: ${err.message}</p>`;
        console.error("FALLA DE INICIALIZACIÓN:", err);
    }
}
init();

