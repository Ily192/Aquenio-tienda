// ====================================================================
// 1. CONFIGURACIÓN DE CONEXIÓN CRÍTICA (APPS SCRIPT)
// ====================================================================

// ⚠️ ¡ACCIÓN REQUERIDA! PEGA AQUÍ LA URL COMPLETA DE TU APLICACIÓN WEB 
//    DE GOOGLE APPS SCRIPT (la que termina en /exec o /dev).
const SHEET_JSON_URL = 'https://script.google.com/macros/s/AKfycbwDhizn5GWJpmSdRiL-aImwuZcm3ImvodsjTuYV8ws2VX8Vw5T4h7Hge3LQr1MIje9iQw/exec'; 

// URL base de WhatsApp de Aquenio
const WHATSAPP_BASE_URL = 'https://wa.me/584129878696'; 

// Referencias a los contenedores HTML
const catalogueGrid = document.getElementById('catalogue-grid');
const categoryTabsContainer = document.getElementById('category-tabs');


// ====================================================================
// 2. LÓGICA PRINCIPAL: CARGA Y MANEJO DE JSON
// ====================================================================

/**
 * Función principal: obtiene los datos de la API de Apps Script y renderiza el catálogo.
 */
async function fetchAndRenderCatalogue() {
    console.log("Iniciando solicitud a Apps Script API con URL:", SHEET_JSON_URL);
    
    try {
        const response = await fetch(SHEET_JSON_URL);
        
        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status}: La API no respondió correctamente.`);
        }
        
        // El script de Google ahora devuelve un array de objetos JSON limpio
        const products = await response.json(); 
        
        // Verificación de datos
        if (!Array.isArray(products) || products.length === 0 || products.hasOwnProperty('error')) {
             console.error("Respuesta de API vacía o con error:", products.error || 'Datos no válidos.');
             throw new Error('La API devolvió un conjunto de datos vacío o un error. Verifica tu Apps Script.');
        }

        console.log(`Catálogo cargado exitosamente. Productos encontrados: ${products.length}`);
        
        const categories = getUniqueCategories(products);
        renderCategoryTabs(categories, products);
        renderProducts(products);

    } catch (error) {
        console.error("FALLA DE CONEXIÓN CRÍTICA CON APPS SCRIPT:", error);
        // Mensaje de error final para el cliente, enfocado en el despliegue de la API
        catalogueGrid.innerHTML = `
            <p style="grid-column: 1 / -1; text-align:center; padding: 50px 0; color: var(--oro-rosa); font-weight: 700;">
                ❌ ¡ERROR CRÍTICO! LA API NO CARGÓ LOS DATOS. ❌
                <br><br>Por favor, confirma que el **DESPLIEGUE** de tu Apps Script tenga acceso a **"Cualquiera"**.
            </p>`;
    }
}


// ====================================================================
// 3. FUNCIONES DE PROCESAMIENTO Y RENDERING
// ====================================================================

/**
 * Extrae categorías únicas de los objetos JSON.
 */
function getUniqueCategories(products) {
    // Filtra las categorías vacías y de encabezado
    const categories = new Set(products.map(p => p.Categoria).filter(c => c && c.trim() !== '' && c.trim().toUpperCase() !== 'CATEGORÍA'));
    return ['TODOS', ...Array.from(categories)]; 
}

/**
 * Genera dinámicamente las pestañas de categoría (filtros).
 */
function renderCategoryTabs(categories, products) {
    categoryTabsContainer.innerHTML = '';
    
    const cleanCategories = categories.filter(c => c && c.trim().toUpperCase() !== 'CATEGORÍA'); 

    cleanCategories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'tab-button';
        button.textContent = category.toUpperCase();
        button.setAttribute('data-category', category);

        button.addEventListener('click', () => {
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            const filteredProducts = category === 'TODOS' 
                ? products 
                : products.filter(p => p.Categoria.toUpperCase() === category.toUpperCase());
                
            renderProducts(filteredProducts);
        });
        categoryTabsContainer.appendChild(button);
    });
    
    const todosButton = categoryTabsContainer.querySelector('[data-category="TODOS"]');
    if (todosButton) todosButton.classList.add('active');
}


/**
 * Dibuja las tarjetas de producto utilizando los datos del JSON.
 */
function renderProducts(products) {
    catalogueGrid.innerHTML = ''; 
    
    if (products.length === 0) {
        catalogueGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align:center;">No hay productos disponibles en esta categoría.</p>';
        return;
    }

    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        // Las claves coinciden con las propiedades que definimos en el Apps Script
        const isAvailable = product.Stock > 0;
        
        // 1. Mensaje de Stock
        const stockMessage = isAvailable
            ? `<span class="product-stock">Disponible: ${product.Stock} uds.</span>`
            : `<span class="product-stock out-of-stock">Agotado Temporalmente</span>`;
        
        // 2. Mensaje y Enlace de WhatsApp
        const whatsappText = `¡Hola Aquenio! Me interesa mucho el producto "${product.Nombre_Producto}" (Código: ${product.Codigo}). ¿Podrías darme más detalles o indicarme cómo proceder con la compra?`;
        const whatsappLink = `${WHATSAPP_BASE_URL}?text=${encodeURIComponent(whatsappText)}`;
        
        const buttonClass = isAvailable ? 'whatsapp-button' : 'whatsapp-button out-of-stock-btn';
        const buttonText = isAvailable ? 'Comprar por WhatsApp' : 'Agotado';
        
        const buttonTag = isAvailable 
            ? `<a href="${whatsappLink}" target="_blank" rel="noopener noreferrer" style="text-decoration:none; display: block;"><button class="${buttonClass}">${buttonText}</button></a>`
            : `<button class="${buttonClass}" disabled>${buttonText}</button>`; 
        
        card.innerHTML = `
            <img src="${product.Foto_URL}" alt="${product.Nombre_Producto}" class="product-image" loading="lazy">
            <div class="product-details">
                <h3 class="product-name">${product.Nombre_Producto}</h3>
                <p class="product-category">${product.Categoria}</p>
                <p class="product-code">Cód: ${product.Codigo}</p>
                <p class="product-description">${product.Descripcion}</p>
                <p class="product-price">$${Number(product.Precio).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                <p>${stockMessage}</p>
                ${buttonTag}
            </div>
        `;
        catalogueGrid.appendChild(card);
    });
}

// ====================================================================
// INICIO
// ====================================================================

// Inicializa el proceso al cargar la página
fetchAndRenderCatalogue();

