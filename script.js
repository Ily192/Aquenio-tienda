// ====================================================================
// 1. CONFIGURACIÓN CRÍTICA DE LA CONEXIÓN (SOLUCIÓN API VISUALIZATION)
// ====================================================================

// IDs Confirmados y URL más robusta (Google Visualization API)
const SHEET_ID = '1BA_-hmC9Hei4P0yeRv97eP47_nOe0J_v35zDkVHKAYU'; 
const GID = '2141987590'; 

// Esta URL es la MÁS ROBUSTA. Si falla, el problema es el permiso de la hoja.
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`; 

// URL base de WhatsApp de Aquenio
const WHATSAPP_BASE_URL = 'https://wa.me/584129878696'; 

// Referencias a los contenedores HTML
const catalogueGrid = document.getElementById('catalogue-grid');
const categoryTabsContainer = document.getElementById('category-tabs');


// ====================================================================
// 2. LÓGICA PRINCIPAL CON DIAGNÓSTICO AVANZADO
// ====================================================================

/**
 * Función principal: obtiene los datos, los procesa y renderiza el catálogo.
 */
async function fetchAndRenderCatalogue() {
    console.log("Iniciando solicitud a Google Sheets con URL:", SHEET_CSV_URL); // Diagnóstico
    
    try {
        // Opción crítica: 'no-cache' fuerza una nueva solicitud a Google
        const response = await fetch(SHEET_CSV_URL, {
            cache: 'no-cache', 
        });
        
        // VERIFICACIÓN CRÍTICA DEL ESTADO HTTP
        if (!response.ok) {
            console.error(`ERROR HTTP DETECTADO: Estado ${response.status} ${response.statusText}`);
            throw new Error(`Error HTTP: ${response.status}. La hoja no es accesible públicamente.`);
        }
        
        const csvData = await response.text();
        const products = parseCSV(csvData); 
        
        if (products.length === 0) {
             console.warn("ADVERTENCIA: CSV obtenido, pero no se encontraron productos válidos después de parsear.");
             throw new Error('La hoja está vacía o el formato de datos es incorrecto.');
        }

        console.log(`Catálogo cargado exitosamente. Productos encontrados: ${products.length}`);
        const categories = getUniqueCategories(products);
        renderCategoryTabs(categories, products);
        renderProducts(products);

    } catch (error) {
        console.error("FALLA DE CONEXIÓN O PARSEO:", error);
        // Mensaje de error para el cliente
        catalogueGrid.innerHTML = `
            <p style="grid-column: 1 / -1; text-align:center; padding: 50px 0; color: var(--oro-rosa); font-weight: 700;">
                ❌ NO PUDIMOS CARGAR EL CATÁLOGO (Código: ${error.message || 'CORS'}).
                <br><br>👉 **ACCIÓN REQUERIDA:** La hoja de cálculo no tiene el permiso de lectura correcto. 
                <br>Por favor, **DETENGA** y **REPUBLIQUE** la pestaña "Catalogo Web" en formato CSV inmediatamente.
            </p>`;
    }
}

// ====================================================================
// 3. PROCESAMIENTO DE DATOS Y RENDERING (Se mantiene sólido)
// ====================================================================

// [*** Mantenemos las funciones parseCSV, getUniqueCategories, renderCategoryTabs, y renderProducts ***]
// (El resto del código se pega aquí sin cambios)

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
