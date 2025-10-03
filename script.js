// ====================================================================
// 1. CONFIGURACIÓN DE AQUEÑO
// ====================================================================

// UTILIZANDO LA URL DE PUBLICACIÓN DE TU HOJA 'CATALOGO WEB'
// Nota: Esta URL es la más confiable para evitar errores de permisos.
// Si tu catálogo deja de actualizarse, debes republicar la hoja en la web
// (Archivo > Compartir > Publicar en la web).
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQpBzcXwpv5ELk1kknmNkPBAJJToK92NLOiXV5EeG2u6KKjzeg0lCggeJ3ddwUZCnraVbfnstCKK834/pub?gid=2141987590&single=true&output=csv'; 

// URL base de WhatsApp de Aquenio
const WHATSAPP_BASE_URL = 'https://wa.me/584129878696'; 

// Referencias a los contenedores HTML
const catalogueGrid = document.getElementById('catalogue-grid');
const categoryTabsContainer = document.getElementById('category-tabs');

// ====================================================================
// 2. LÓGICA PRINCIPAL Y CONTROL DE FLUJO
// ====================================================================

/**
 * Función principal: obtiene los datos, los procesa y renderiza el catálogo.
 */
async function fetchAndRenderCatalogue() {
    try {
        const response = await fetch(SHEET_CSV_URL);
        
        // Verifica si la respuesta HTTP es exitosa (código 200)
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}. Verifica que la URL del Sheets sea correcta y esté publicada.`);
        }
        
        const csvData = await response.text();
        const products = parseCSV(csvData); 
        
        if (products.length === 0) {
             // Esto se activa si solo hay encabezados o si el contenido está vacío
             throw new Error('La hoja de cálculo está vacía o no se encontraron productos válidos.');
        }

        const categories = getUniqueCategories(products);
        renderCategoryTabs(categories, products);
        renderProducts(products);

    } catch (error) {
        console.error("Error crítico al obtener el catálogo:", error);
        // Mensaje de error mejorado para el usuario final
        catalogueGrid.innerHTML = `
            <p style="grid-column: 1 / -1; text-align:center; padding: 50px 0; color: var(--oro-rosa); font-weight: 600;">
                ¡Oh no! No pudimos cargar el catálogo de Aquenio.
                <br>La causa más común es que la hoja de Google Sheets no está publicada correctamente.
                <br>Por favor, revisa **Archivo > Compartir > Publicar en la web** para tu pestaña "Catalogo Web".
            </p>`;
    }
}

// ====================================================================
// 3. PROCESAMIENTO DE DATOS (ORDEN DE COLUMNAS DEL USUARIO)
// ====================================================================
// Orden: 0: Código | 1: Nombre | 2: Descripción | 3: Categoría | 4: Precio | 5: Cantidad | 6: Foto URL

/**
 * Parsea el texto CSV en un array de objetos JavaScript.
 * Se enfoca en el orden de las columnas del usuario para una máxima fiabilidad.
 */
function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length <= 1) return []; // Solo la línea de encabezado o menos
    
    const products = [];
    
    for (let i = 1; i < lines.length; i++) {
        // Regex robusta para manejar comas dentro de descripciones entre comillas
        const data = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
        
        // Debe tener 7 o más columnas para ser un producto completo
        if (data.length >= 7) { 
            const product = {};
            
            // Función auxiliar para limpiar espacios y despojar las comillas
            const clean = (val) => val ? val.trim().replace(/"/g, '') : '';
            
            // Mapeo fijo por índice para robustez:
            product.Codigo = clean(data[0]); 
            product.Nombre_Producto = clean(data[1]); 
            product.Descripcion = clean(data[2]);
            product.Categoria = clean(data[3]); 
            
            // Conversión de precio a número
            product.Precio = parseFloat(clean(data[4]).replace(/[$.]/g, '').replace(/,/g, '')) || 0; 
            
            // Conversión de stock a entero
            product.Stock = parseInt(clean(data[5])) || 0; 
            
            product.Foto_URL = clean(data[6]); 

            // Filtro de calidad: Solo productos con nombre y una URL de foto real
            if (product.Nombre_Producto && product.Foto_URL.startsWith('http')) { 
                 products.push(product);
            }
        }
    }
    return products;
}

// ====================================================================
// 4. RENDERING (PESTAÑAS Y PRODUCTOS)
// ====================================================================

/**
 * Extrae categorías únicas, filtrando valores vacíos.
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
    
    categories.forEach(category => {
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
 * Dibuja las tarjetas de producto en el contenedor de mosaico.
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
                <p class="product-price">$${product.Precio.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
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
