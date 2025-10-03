// ====================================================================
// 1. CONFIGURACIÓN CRÍTICA DE LA CONEXIÓN (SOLUCIÓN DE PERMISOS)
// ====================================================================

// ** URL de Publicación que el usuario ya generó **
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQpBzcXwpv5ELk1kknmNkPBAJJToK92NLOiXV5EeG2u6KKjzeg0lCggeJ3ddwUZCnraVbfnstCKK834/pub?gid=2141987590&single=true&output=csv'; 

// URL base de WhatsApp de Aquenio
const WHATSAPP_BASE_URL = 'https://wa.me/584129878696'; 

// Referencias a los contenedores HTML
const catalogueGrid = document.getElementById('catalogue-grid');
const categoryTabsContainer = document.getElementById('category-tabs');


// ====================================================================
// 2. LÓGICA PRINCIPAL (CONTROL DE ERRORES MEJORADO)
// ====================================================================

/**
 * Función principal: obtiene los datos, los procesa y renderiza el catálogo.
 */
async function fetchAndRenderCatalogue() {
    try {
        // Solicitud a la hoja de cálculo. La clave es el manejo estricto de la respuesta.
        const response = await fetch(SHEET_CSV_URL, {
            // Deshabilitar la caché puede ayudar a obtener datos frescos y evitar problemas
            cache: 'no-cache', 
        });
        
        // ** VERIFICACIÓN CRÍTICA DEL ESTADO HTTP **
        if (!response.ok) {
            // Capturamos cualquier código de estado que no sea 200-299
            throw new Error(`Error HTTP: ${response.status}. La URL no está activa.`);
        }
        
        const csvData = await response.text();
        const products = parseCSV(csvData); 
        
        if (products.length === 0) {
             throw new Error('La hoja de cálculo está vacía o el parser no encontró datos válidos.');
        }

        const categories = getUniqueCategories(products);
        renderCategoryTabs(categories, products);
        renderProducts(products);

    } catch (error) {
        console.error("ERROR CRÍTICO DEL CATÁLOGO:", error);
        // Mensaje de error final para el usuario, enfocado en la causa raíz
        catalogueGrid.innerHTML = `
            <p style="grid-column: 1 / -1; text-align:center; padding: 50px 0; color: var(--oro-rosa); font-weight: 700;">
                🚨 ¡ERROR DE CONEXIÓN CRÍTICO! 🚨
                <br><br>No pudimos cargar el catálogo. Por favor, realiza estos pasos **exactamente** en tu Google Sheet:
                <br>1. Ve a **Archivo > Compartir > Publicar en la web**.
                <br>2. Si está publicado, **deten la publicación** y **vuelve a publicarla** como CSV.
                <br>3. Asegúrate de que el nombre del archivo **Aquenio-logo.jpg** esté escrito correctamente.
            </p>`;
    }
}

// ====================================================================
// 3. PROCESAMIENTO DE DATOS (NO SE HA CAMBIADO EL ORDEN)
// ====================================================================

// Orden: 0: Código | 1: Nombre | 2: Descripción | 3: Categoría | 4: Precio | 5: Cantidad | 6: Foto URL
function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length <= 1) return []; 
    
    const products = [];
    
    for (let i = 1; i < lines.length; i++) {
        const data = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
        
        if (data.length >= 7) { 
            const product = {};
            const clean = (val) => val ? val.trim().replace(/"/g, '') : '';
            
            product.Codigo = clean(data[0]); 
            product.Nombre_Producto = clean(data[1]); 
            product.Descripcion = clean(data[2]);
            product.Categoria = clean(data[3]); 
            product.Precio = parseFloat(clean(data[4]).replace(/[$.]/g, '').replace(/,/g, '')) || 0; 
            product.Stock = parseInt(clean(data[5])) || 0; 
            product.Foto_URL = clean(data[6]); 

            if (product.Nombre_Producto && product.Foto_URL.startsWith('http')) { 
                 products.push(product);
            }
        }
    }
    return products;
}

// ... (Las funciones getUniqueCategories, renderCategoryTabs, y renderProducts se mantienen sin cambios ya que son correctas) ...
function getUniqueCategories(products) {
    const categories = new Set(products.map(p => p.Categoria).filter(c => c && c.trim() !== '' && c.trim().toUpperCase() !== 'CATEGORÍA'));
    return ['TODOS', ...Array.from(categories)]; 
}

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
        
        const stockMessage = isAvailable
            ? `<span class="product-stock">Disponible: ${product.Stock} uds.</span>`
            : `<span class="product-stock out-of-stock">Agotado Temporalmente</span>`;
        
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


// INICIO: Inicializa el proceso al cargar la página
fetchAndRenderCatalogue();
