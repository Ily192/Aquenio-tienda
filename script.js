// ====================================================================
// CONFIGURACIÓN DE GOOGLE SHEETS Y WHATSAPP
// ¡ESTE CÓDIGO YA ESTÁ CONFIGURADO CON TUS DATOS!
// ====================================================================

// El ID de tu Google Sheet (la cadena corta de tu URL de edición)
const SHEET_ID = '1BA_-hmC9Hei4P0yeRv97eP47_nOe0J_v35zDkVHKAYU'; 

// El GID de la pestaña 'Catalogo Web' (identificador numérico)
const GID = '2141987590'; 

// URL base de WhatsApp de Aquenio
const WHATSAPP_BASE_URL = 'https://wa.me/584129878696'; 

// URL que solicita los datos en formato CSV de forma robusta por ID y GID.
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`; 

// ====================================================================
// LÓGICA DE CATÁLOGO (NO MODIFICAR)
// ====================================================================

const catalogueGrid = document.getElementById('catalogue-grid');
const categoryTabsContainer = document.getElementById('category-tabs');

async function fetchAndRenderCatalogue() {
    try {
        const response = await fetch(SHEET_CSV_URL);
        const csvData = await response.text();
        const products = parseCSV(csvData); 
        
        if (products.length === 0) {
             throw new Error('No se encontraron productos válidos en el Sheets.');
        }

        const categories = getUniqueCategories(products);
        renderCategoryTabs(categories, products);
        renderProducts(products);

    } catch (error) {
        console.error("Error al obtener los datos del catálogo:", error);
        catalogueGrid.innerHTML = `
            <p style="grid-column: 1 / -1; text-align:center; padding: 50px 0; color: var(--oro-rosa);">
                ¡Oh no! No pudimos cargar el catálogo.
                <br>Por favor, asegúrate de que tu hoja de Google Sheets esté publicada en la web (Archivo > Compartir > Publicar en la web).
            </p>`;
    }
}

// Orden de columnas: 0: Código | 1: Nombre | 2: Descripción | 3: Categoría | 4: Precio | 5: Cantidad | 6: Foto URL
function parseCSV(csvText) {
    // Manejo básico para limpiar el texto y dividir por línea.
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length <= 1) return []; 
    
    const products = [];
    
    for (let i = 1; i < lines.length; i++) {
        // Usa regex para manejar comas dentro de comillas (si las hay en descripciones)
        const data = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
        
        if (data.length >= 7) { 
            const product = {};
            
            // Función auxiliar para limpiar y despojar las comillas
            const clean = (val) => val ? val.trim().replace(/"/g, '') : '';
            
            product.Codigo = clean(data[0]); 
            product.Nombre_Producto = clean(data[1]); 
            product.Descripcion = clean(data[2]);
            product.Categoria = clean(data[3]); 
            
            // Conversión de precio a número (asumiendo formato simple)
            product.Precio = parseFloat(clean(data[4]).replace(/[$.]/g, '').replace(/,/g, '')) || 0; 
            
            // Conversión de stock a entero
            product.Stock = parseInt(clean(data[5])) || 0; 
            
            product.Foto_URL = clean(data[6]); 

            // Solo agregamos productos con nombre y una URL de foto válida
            if (product.Nombre_Producto && product.Foto_URL.startsWith('http')) { 
                 products.push(product);
            }
        }
    }
    return products;
}

function getUniqueCategories(products) {
    const categories = new Set(products.map(p => p.Categoria).filter(c => c && c.trim() !== ''));
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

fetchAndRenderCatalogue();
