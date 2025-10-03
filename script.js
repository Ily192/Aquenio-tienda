// 🔗 CONFIGURACIÓN
const SHEET_ID = "1BA_-hmC9Hei4P0yeRv97eP47_nOe0J_v35zDkVHKAYU"; 
const API_KEY = "AIzaSyBzVhQvORVV_iCSGSqsq550Cx8JoFe8hVU";     
const RANGE = "Catalogo Web!A2:G"; // Ajusta si tu hoja tiene otro nombre
const SHEET_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(RANGE)}?key=${API_KEY}`;

// WhatsApp de contacto
const WHATSAPP_BASE_URL = "https://wa.me/584129878696";

// Contenedores
const catalogueGrid = document.getElementById("catalogue-grid");
const categoryTabsContainer = document.getElementById("category-tabs");

// ===============================
// 1. Traer datos desde Sheets
// ===============================
async function fetchCatalogue() {
  const res = await fetch(SHEET_URL);
  if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
  const data = await res.json();
  const rows = data.values || [];

  // Mapeo de filas a objetos
  return rows.map(row => ({
    Codigo: row[0],
    Nombre_Producto: row[1],
    Descripcion: row[2],
    Categoria: row[3],
    Precio: parseFloat(row[4]) || 0,
    Stock: parseInt(row[5]) || 0,
    Foto_URL: row[6]
  }));
}

// ===============================
// 2. Renderizar catálogo
// ===============================
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
    card.className = "product-card";
    card.innerHTML = `
      <img src="${product.Foto_URL}" alt="${product.Nombre_Producto}" class="product-image" loading="lazy">
      <div class="product-details">
        <h3>${product.Nombre_Producto}</h3>
        <p>${product.Categoria}</p>
        <p>Cód: ${product.Codigo}</p>
        <p>${product.Descripcion}</p>
        <p>$${Number(product.Precio).toLocaleString("es-VE", { minimumFractionDigits: 2 })}</p>
        <p>${isAvailable ? `Disponible: ${product.Stock} uds.` : "Agotado"}</p>
        ${isAvailable 
          ? `<a href="${whatsappLink}" target="_blank"><button class="whatsapp-button">Comprar por WhatsApp</button></a>`
          : `<button class="whatsapp-button" disabled>Agotado</button>`}
      </div>
    `;
    catalogueGrid.appendChild(card);
  });
}

// ===============================
// 3. Inicialización
// ===============================
async function init() {
  try {
    const products = await fetchCatalogue();
    const categories = getUniqueCategories(products);
    renderCategoryTabs(categories, products);
    renderProducts(products);
  } catch (err) {
    catalogueGrid.innerHTML = `<p style="color:red; text-align:center;">❌ Error cargando catálogo: ${err.message}</p>`;
    console.error(err);
  }
}

init();
