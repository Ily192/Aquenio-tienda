// ** PASO CLAVE: Reemplaza esta URL con la URL CSV de tu Google Sheet publicada **
// (Archivo > Compartir > Publicar en la web > Selecciona Hoja 'Catalogo Web' > Formato: Valores separados por comas (.csv))
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQpBzcXwpv5ELk1kknmNkPBAJJToK92NLOiXV5EeG2u6KKjzeg0lCggeJ3ddwUZCnraVbfnstCKK834/pub?gid=2141987590&single=true&output=csv'; 

// URL de WhatsApp proporcionada por el usuario
const WHATSAPP_BASE_URL = 'https://wa.me/584129878696'; 

const catalogueGrid = document.getElementById('catalogue-grid');
const categoryTabsContainer = document.getElementById('category-tabs');

// Función principal para obtener y mostrar los productos
async function fetchAndRenderCatalogue() {
    try {
        const response = await fetch(SHEET_CSV_URL);
        const csvData = await response.text();
        const products = parseCSV(csvData); // Convierte el CSV en un array de objetos
        
        // La hoja de Google Sheets debe estar Publicada en la Web como CSV
        if (products.length === 0) {
             throw new Error('No se encontraron datos en el Sheets. Asegúrate de que esté publicado correctamente.');
        }

        const categories = getUniqueCategories(products);
        renderCategoryTabs(categories, products);
        
        // Mostrar todos los productos al cargar
        renderProducts(products);

    } catch (error) {
        console.error("Error al obtener los datos del catálogo:", error);
        catalogueGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align:center; padding: 50px 0; color: var(--oro-rosa);">¡Oh no! No pudimos cargar el catálogo. Por favor, verifica la URL de tu Google Sheets publicada y la consola para detalles.</p>';
    }
}

// Función para parsear el CSV con el nuevo orden de columnas: 
// 0: Código | 1: Nombre | 2: Descripción | 3: Categoría | 4: Precio | 5: Cantidad | 6: Foto URL
function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length <= 1) return []; // Solo la línea de encabezado o vacía
    
    // Los encabezados se ignoran en el código, pero se usan los índices fijos
    const products = [];

    // Empieza desde la segunda línea (índice 1)
    for (let i = 1; i < lines.length; i++) {
        // Usa una expresión regular simple para manejar comas dentro de comillas (si existen)
        const data = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
        
        // Verificación: debe tener al menos 7 columnas
        if (data.length >= 7) { 
            const product = {};
            
            // Asignación basada en la estructura de TU Google Sheet
            product.Codigo = data[0].trim().replace(/"/g, ''); 
            product.Nombre_Producto = data[1].trim().replace(/"/g, ''); 
            product.Descripcion = data[2].trim().replace(/"/g, '');
            product.Categoria = data[3].trim().replace(/"/g, ''); 
            product.Precio = parseFloat(data[4].trim().replace(/[$.]/g, '').replace(/,/g, '')) || 0; // Limpia formato de moneda
            product.Stock = parseInt(data[5].trim().replace(/"/g, '')) || 0; 
            product.Foto_URL = data[6].trim().replace(/"/g, ''); // Columna G: Foto URL

            // Solo agregamos si hay un nombre de producto y una URL de foto válida
            if (product.Nombre_Producto && product.Foto_URL.startsWith('http')) { 
                 products.push(product);
            }
        }
    }
    return products;
}

// Función para extraer categorías únicas (mantiene la lógica)
function getUniqueCategories(products) {
    const categories = new Set(products.map(p => p.Categoria).filter(c => c && c.trim() !== ''));
    return ['TODOS', ...Array.from(categories)]; // 'TODOS' va primero
}

// Función para generar las pestañas de categoría (mantiene la lógica)
function renderCategoryTabs(categories, products) {
    categoryTabsContainer.innerHTML = '';
    
    // Filtra las categorías vacías que puedan venir del sheets
    const cleanCategories = categories.filter(c => c && c.trim().toUpperCase() !== 'CATEGORÍA'); 

    cleanCategories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'tab-button';
        button.textContent = category.toUpperCase();
        button.setAttribute('data-category', category);

        // Evento de click para filtrar
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
    
    // Marcar la pestaña 'TODOS' como activa por defecto
    const todosButton = categoryTabsContainer.querySelector('[data-category="TODOS"]');
    if (todosButton) todosButton.classList.add('active');
}


// Función para renderizar las tarjetas de producto en el mosaico
function renderProducts(products) {
    catalogueGrid.innerHTML = ''; // Limpia el contenido anterior
    
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
            ? `<span class="product-stock">Disponible: ${product.Stock} unidades</span>`
            : `<span class="product-stock out-of-stock">Agotado Temporalmente</span>`;
        
        // 2. Mensaje y Enlace de WhatsApp
        // Mensaje personalizado para el cliente
        const whatsappText = `¡Hola Aquenio! Me interesa mucho el producto "${product.Nombre_Producto}" (Código: ${product.Codigo}). ¿Podrías darme más detalles o indicarme cómo proceder con la compra?`;
        // Codifica el mensaje para la URL
        const whatsappLink = `${WHATSAPP_BASE_URL}?text=${encodeURIComponent(whatsappText)}`;
        
        const buttonClass = isAvailable ? 'whatsapp-button' : 'whatsapp-button out-of-stock-btn';
        const buttonText = isAvailable ? 'Comprar por WhatsApp' : 'Agotado';
        
        // Si está agotado, el botón no es un enlace real, sino solo texto (no-clicable en CSS)
        const buttonTag = isAvailable 
            ? `<a href="${whatsappLink}" target="_blank" rel="noopener noreferrer" style="text-decoration:none; display: block;"><button class="${buttonClass}">${buttonText}</button></a>`
            : `<button class="${buttonClass}" disabled>${buttonText}</button>`; // Botón inactivo
        
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

// Inicia el proceso al cargar la página
fetchAndRenderCatalogue();