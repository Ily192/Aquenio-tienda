// ====================================================================
// 🔗 CONFIGURACIÓN
// ====================================================================
const SHEET_ID = "1yj-uxy_puPfjcOZbqjeUBuMjRCwHsjSh6UNNEEmikvk"; 
const API_KEY = "AIzaSyCZS-GAGD2ErO1ELvT0I7_KguW_83MSBl4"; 
const RANGE = "Catalogo!A2:G"; // Ajusta si tu hoja tiene otro nombre
const SHEET_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(RANGE)}?key=${API_KEY}`;

// WhatsApp de contacto
const WHATSAPP_BASE_URL = "https://wa.me/584129878696";

// Contenedores
const catalogueGrid = document.getElementById("catalogue-grid");
const categoryTabsContainer = document.getElementById("category-tabs");


// ====================================================================
// 🛠️ FUNCIÓN CRÍTICA: CORRECCIÓN DE URL DE DRIVE
// ====================================================================

/**
 * Convierte una URL de Google Drive (de compartir) a una URL de visualización directa.
 * Esto es necesario para que las imágenes se muestren en la etiqueta <img>.
 * @param {string} url La URL de Google Drive original.
 * @returns {string} La URL transformada, o la original si no es de Drive.
 */
function convertDriveUrl(url) {
    if (!url || typeof url !== 'string') return '';
    
    // Busca el ID del archivo en el formato /file/d/FILE_ID/view
    const viewRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\//;
    const viewMatch = url.match(viewRegex);
    
    if (viewMatch && viewMatch[1]) {
        // Devuelve el endpoint de descarga directa (uc?export=view)
        return `https://drive.google.com/uc?export=view&id=${viewMatch[1]}`;
    }

    // Si no es un enlace de Drive reconocible, retorna la URL original.
    return url;
}


// ====================================================================
// 1. Traer datos desde Sheets (LOGICA DE MAPEO MEJORADA)
// ====================================================================
async function fetchCatalogue() {
    const res = await fetch(SHEET_URL);
    if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
    const data = await res.json();
    const rows = data.values || [];

    // Mapeo de filas a objetos con correcciones de URL y parseo
    return rows.map(row => {
        
        // 1. LIMPIEZA DE DATOS: Aseguramos que Precio y Stock sean números válidos
        const rawPrice = String(row[4] || '0').replace(/[$.]/g, '').replace(/,/g, '.');
        const rawStock = String(row[5] || '0');
        
        // 2. CORRECCIÓN DE IMAGEN: Usamos la función para Drive
        const photoUrl = convertDriveUrl(row[6]); 

        return {
            Codigo: row[0],
            Nombre_Producto: row[1],
            Descripcion: row[2],
            Categoria: row[3],
            Precio: parseFloat(rawPrice) || 0, // Más robusto
            Stock: parseInt(rawStock) || 0, // Más robusto
            Foto_URL: photoUrl // ¡Usamos la URL corregida!
        };
    });
}

// ====================================================================
// 2. Renderizar catálogo (LOGICA ORIGINAL CONSERVADA)
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
        
        // Mensaje de stock detallado
        const stockMessage = isAvailable 
            ? `Disponible: ${product.Stock} uds.` 
            : "Agotado Temporalmente";

        const card = document.createElement("div");
        card.className = "product-card";
        card.innerHTML = `
            <img src="${product.Foto_URL}" alt="${product.Nombre_Producto}" class="product-image" loading="lazy">
            <div class="product-details">
                <h3>${product.Nombre_Producto}</h3>
                <p>${product.Categoria}</p>
                <p>Cód: ${product.Codigo}</p>
                <p>${product.Descripcion}</p>
                <p class="product-price">$${Number(product.Precio).toLocaleString("es-VE", { minimumFractionDigits: 2 })}</p>
                <p class="${isAvailable ? 'product-stock' : 'product-stock out-of-stock'}">${stockMessage}</p>
                ${isAvailable 
                    ? `<a href="${whatsappLink}" target="_blank" rel="noopener noreferrer"><button class="whatsapp-button">Comprar por WhatsApp</button></a>`
                    : `<button class="whatsapp-button" disabled>Agotado</button>`}
            </div>
        `;
        catalogueGrid.appendChild(card);
    });
}

// ====================================================================
// 3. Inicialización
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
