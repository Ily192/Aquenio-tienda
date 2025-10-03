// ====================================================================
// 🔗 CONFIGURACIÓN DE PRODUCCIÓN (Google Sheets API v4)
// ====================================================================

// Tus credenciales verificadas. Usa la CLAVE API que comienza con AIzaSy.
const SHEET_ID = "1yj-uxy_puPfjcOZbqjeUBuMjRCwHsjSh6UNNEEmikvk"; 
const API_KEY = "AIzaSyCZS-GAGD2ErO1ELvT0I7_KguW_83MSBl4"; 
const RANGE = "Catalogo!A2:G"; // Rango de datos (inicia en A2 para omitir encabezados)
const SHEET_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(RANGE)}?key=${API_KEY}`;

// WhatsApp de contacto
const WHATSAPP_BASE_URL = "https://wa.me/584129878696";

// Contenedores HTML
const catalogueGrid = document.getElementById("catalogue-grid");
const categoryTabsContainer = document.getElementById("category-tabs");


// ====================================================================
// 🛠️ 1. FUNCIONES CRÍTICAS DE LIMPIEZA Y CORRECCIÓN DE URL
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


/**
 * Mapea la matriz de valores de la API a un array de objetos con limpieza de datos.
 * Asume el orden: 0: Código | 1: Nombre | 2: Descrip. | 3: Categoría | 4: Precio | 5: Stock | 6: Foto URL
 */
function mapSheetDataToProducts(rows) {
    return rows.map(row => {
        // CRÍTICO: Conversión de URL de Drive
        const cleanedDriveUrl = convertDriveUrl(row[6]); 

        // LIMPIEZA DE DATOS: Asegurar números válidos
        const rawPrice = String(row[4] || '0').replace(/[$.]/g, '').replace(/,/g, '.');
        const rawStock = String(row[5] || '0');
        
        return {
            Codigo: String(row[0] || '').trim(),
            Nombre_Producto: String(row[1] || '').trim(),
            Descripcion: String(row[2] || '').trim(),
            Categoria: String(row[3] || '').trim(),
            Precio: parseFloat(rawPrice) || 0, // Asegura que Precio es un número
            Stock: parseInt(rawStock) || 0, // Asegura que Stock es un entero
            Foto_URL: cleanedDriveUrl 
        };
    }).filter(product => 
        product.Nombre_Producto && 
        product.Foto_URL && 
        product.Foto_URL.startsWith('http')
    ); // Filtro estricto
}


// ====================================================================
// 2. LÓGICA DE CARGA E INICIALIZACIÓN
// ====================================================================

async function fetchCatalogue() {
    const res = await fetch(SHEET_URL);
    
    if (!res.ok) {
        const errorData = await res.json();
        console.error("Detalles del Error (JSON):", errorData);
        throw new Error(`Error HTTP ${res.status}: ${errorData.error.message}`);
    }
    
    const data = await res.json();
    const rows = data.values || [];

    // Usamos la función de mapeo robusta
    return mapSheetDataToProducts(rows);
}

async function init() {
    try {
        const products = await fetchCatalogue();
        const categories = getUniqueCategories(products);
        renderCategoryTabs(categories, products);
        renderProducts(products);
    } catch (err) {
        catalogueGrid.innerHTML = `<p style="color:red; text-align:center; grid-column: 1 / -1;">❌ Error cargando catálogo: ${err.message}</p>`;
        console.error("FALLA CRÍTICA DE INICIALIZACIÓN:", err);
    }
}


// ====================================================================
// 3. RENDERING (Se mantiene la lógica original)
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
    const todosButton = categoryTabsContainer.querySelector('[data-category="TODOS"]');
    if (todosButton) todosButton.classList.add("active");
}

function renderProducts(products) {
    catalogueGrid.innerHTML = "";
    if (products.length === 0) {
        catalogueGrid.innerHTML = "<p style='grid-column: 1 / -1; text-align:center;'>No hay productos disponibles en este momento.</p>";
        return;
    }

    products.forEach(product => {
        const isAvailable = product.Stock > 0;
        const whatsappText = `Hola, me interesa "${product.Nombre_Producto}" (Código: ${product.Codigo}).`;
        const whatsappLink = `${WHATSAPP_BASE_URL}?text=${encodeURIComponent(whatsappText)}`;

        const card = document.createElement("div");
        card.className = "product-card";
        
        // Mensaje de stock más detallado
        const stockMessage = isAvailable
            ? `<span class="product-stock">Disponible: ${product.Stock} uds.</span>`
            : `<span class="product-stock out-of-stock">Agotado Temporalmente</span>`;
        
        card.innerHTML = `
            <img src="${product.Foto_URL}" alt="${product.Nombre_Producto}" class="product-image" loading="lazy">
            <div class="product-details">
                <h3 class="product-name">${product.Nombre_Producto}</h3>
                <p class="product-category">${product.Categoria}</p>
                <p class="product-code">Cód: ${product.Codigo}</p>
                <p class="product-description">${product.Descripcion}</p>
                <p class="product-price">$${Number(product.Precio).toLocaleString("es-VE", { minimumFractionDigits: 2 })}</p>
                <p>${stockMessage}</p>
                ${isAvailable 
                    ? `<a href="${whatsappLink}" target="_blank" rel="noopener noreferrer" style="text-decoration:none; display: block;"><button class="whatsapp-button">Comprar por WhatsApp</button></a>`
                    : `<button class="whatsapp-button" disabled>Agotado</button>`}
            </div>
        `;
        catalogueGrid.appendChild(card);
    });
}

// Inicialización del catálogo
init();
