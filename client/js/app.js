const state = {
    products: [],
    cart: [],
    user: null
};

function formatPrice(cents, currency = "eur") {
    const value = (cents / 100).toFixed(2);
    const symbol = currency === "eur" ? "€" : currency.toUpperCase();
    return `${value} ${symbol}`;
}

function findCartItem(id) {
    return state.cart.find((item) => item.id === id) || null;
}

function addToCart(productId) {
    const product = state.products.find((p) => p.id === productId);
    if (!product) return;

    const existing = findCartItem(productId);
    const currentQty = existing ? existing.quantity : 0;

    if (currentQty >= product.stock) {
        alert(`Désolé, il ne reste plus que ${product.stock} exemplaires de ce produit.`);
        return;
    }

    if (existing) {
        existing.quantity += 1;
    } else {
        state.cart.push({ id: productId, quantity: 1 });
    }
    renderCart();
}

function updateQuantity(productId, delta) {
    const item = findCartItem(productId);
    const product = state.products.find((p) => p.id === productId);
    if (!item || !product) return;

    if (delta > 0 && item.quantity >= product.stock) {
        alert(`Désolé, il ne reste plus que ${product.stock} exemplaires de ce produit.`);
        return;
    }

    item.quantity += delta;
    if (item.quantity <= 0) {
        state.cart = state.cart.filter((i) => i.id !== productId);
    }
    renderCart();
}

function removeFromCart(productId) {
    state.cart = state.cart.filter((item) => item.id !== productId);
    renderCart();
}

function calculateCartTotal() {
    return state.cart.reduce((total, item) => {
        const product = state.products.find((p) => p.id === item.id);
        if (!product) return total;
        return total + product.price * item.quantity;
    }, 0);
}

function updateAuthUI() {
    const authSection = document.getElementById("auth-section");
    const loginForm = document.getElementById("login-form");
    const userInfo = document.getElementById("user-info");
    const userEmail = document.getElementById("user-email");
    const userRole = document.getElementById("user-role");
    const productsSection = document.getElementById("products-section");
    const cartSection = document.getElementById("cart-section");

    if (!authSection || !loginForm || !userInfo || !productsSection || !cartSection) {
        return;
    }

    if (!state.user) {
        loginForm.classList.remove("hidden");
        userInfo.classList.add("hidden");
        productsSection.classList.add("hidden"); // Cacher les produits si non connecté
        cartSection.classList.add("hidden"); // Cacher le panier si non connecté
    } else {
        loginForm.classList.add("hidden");
        userInfo.classList.remove("hidden");
        productsSection.classList.remove("hidden"); // Afficher les produits si connecté
        // cartSection reste caché par défaut, affiché seulement si le panier n'est pas vide
        userEmail.textContent = state.user.email;
        userRole.textContent = state.user.role === "admin" ? "Propriétaire" : "Client";
        renderCart();
    }
}

function renderProducts() {
    const container = document.getElementById("products");
    container.innerHTML = "";

    state.products.forEach((product) => {
        const card = document.createElement("div");
        card.className = "product-card";

        const img = document.createElement("img");
        img.src = product.image || "https://via.placeholder.com/300x200?text=Produit";
        img.alt = product.name;

        const content = document.createElement("div");
        content.className = "product-card-content";

        const title = document.createElement("div");
        title.className = "product-title";
        title.textContent = product.name;

        const desc = document.createElement("div");
        desc.className = "product-description";
        desc.textContent = product.description;

        const footer = document.createElement("div");
        footer.className = "product-footer";

        const priceStockRow = document.createElement("div");
        priceStockRow.className = "price-stock-row";

        const price = document.createElement("div");
        price.className = "product-price";
        price.textContent = formatPrice(product.price, product.currency);

        const stock = document.createElement("div");
        stock.className = "product-stock";
        stock.textContent = `En stock: ${product.stock}`;
        if (product.stock <= 0) {
            stock.classList.add("out-of-stock");
            stock.textContent = "Rupture de stock";
        }

        priceStockRow.appendChild(price);
        priceStockRow.appendChild(stock);

        const button = document.createElement("button");
        button.className = "button-primary";
        button.textContent = product.stock > 0 ? "Ajouter au panier" : "Indisponible";
        button.disabled = product.stock <= 0;
        button.addEventListener("click", () => addToCart(product.id));

        footer.appendChild(priceStockRow);
        footer.appendChild(button);

        content.appendChild(title);
        content.appendChild(desc);
        content.appendChild(footer);

        card.appendChild(img);
        card.appendChild(content);

        container.appendChild(card);
    });
}

function renderCart() {
    const cartSection = document.getElementById("cart-section");
    const countEl = document.getElementById("cart-count");
    const itemsContainer = document.getElementById("cart-items");
    const totalEl = document.getElementById("cart-total");

    const count = state.cart.reduce((acc, item) => acc + item.quantity, 0);
    countEl.textContent = String(count);

    if (state.cart.length === 0) {
        cartSection.classList.add("hidden");
        itemsContainer.innerHTML = "<p>Votre panier est vide.</p>";
        totalEl.textContent = "0,00 €";
        return;
    }

    cartSection.classList.remove("hidden");
    itemsContainer.innerHTML = "";

    state.cart.forEach((item) => {
        const product = state.products.find((p) => p.id === item.id);
        if (!product) return;

        const line = document.createElement("div");
        line.className = "cart-item";

        const info = document.createElement("div");
        info.className = "cart-item-info";
        info.innerHTML = `<strong>${product.name}</strong><span>${formatPrice(
      product.price,
      product.currency
    )}</span>`;

        const actions = document.createElement("div");
        actions.className = "cart-item-actions";

        const quantity = document.createElement("div");
        quantity.className = "cart-item-quantity";

        const minus = document.createElement("button");
        minus.textContent = "-";
        minus.addEventListener("click", () => updateQuantity(item.id, -1));

        const qty = document.createElement("span");
        qty.textContent = String(item.quantity);

        const plus = document.createElement("button");
        plus.textContent = "+";
        plus.addEventListener("click", () => updateQuantity(item.id, 1));

        quantity.appendChild(minus);
        quantity.appendChild(qty);
        quantity.appendChild(plus);

        const remove = document.createElement("button");
        remove.className = "remove-button"; // Nouvelle classe pour le style
        remove.textContent = "Supprimer";
        remove.addEventListener("click", () => removeFromCart(item.id));

        actions.appendChild(quantity);
        actions.appendChild(remove);

        line.appendChild(info);
        line.appendChild(actions);

        itemsContainer.appendChild(line);
    });

    const total = calculateCartTotal();
    totalEl.textContent = formatPrice(total, "eur");
}

async function loadProducts() {
    try {
        const response = await fetch("/api/products");
        if (!response.ok) {
            throw new Error("Erreur lors du chargement des produits");
        }
        const data = await response.json();
        state.products = Array.isArray(data) ? data : [];
        renderProducts();
    } catch (error) {
        console.error(error);
        const container = document.getElementById("products");
        container.innerHTML = "<p>Impossible de charger les produits.</p>";
    }
}

async function handleCheckout() {
    if (state.cart.length === 0) {
        alert("Votre panier est vide.");
        return;
    }

    try {
        const response = await fetch("/api/checkout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ items: state.cart })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Erreur lors de la création de la session de paiement");
        }

        const data = await response.json();
        if (data && data.url) {
            window.location.href = data.url;
        } else {
            alert("Réponse inattendue du serveur de paiement.");
        }
    } catch (error) {
        console.error(error);
        alert("Impossible de démarrer le paiement: " + error.message);
    }
}

function setupEvents() {
    const cartButton = document.getElementById("cart-button");
    const cartSection = document.getElementById("cart-section");
    const checkoutButton = document.getElementById("checkout-button");
    const logoutButton = document.getElementById("logout-button"); // Peut être null si non connecté

    if (cartButton) {
        cartButton.addEventListener("click", () => {
            cartSection.classList.toggle("hidden");
        });
    }

    if (checkoutButton) {
        checkoutButton.addEventListener("click", handleCheckout);
    }

    if (logoutButton) {
        logoutButton.addEventListener("click", async() => {
            try {
                await fetch("/api/logout", {
                    method: "POST"
                });
            } catch (error) {
                console.error(error);
            }
            state.user = null;
            state.cart = [];
            renderCart();
            updateAuthUI();
        });
    }
}

async function init() {
    setupEvents();
    updateAuthUI(); // Met à jour l'UI d'abord
    try {
        const response = await fetch("/api/me");
        if (response.ok) {
            const data = await response.json();
            state.user = data;
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des infos utilisateur:", error);
    }
    await loadProducts(); // Charge les produits après avoir potentiellement mis à jour l'utilisateur
    updateAuthUI(); // Met à jour l'UI une seconde fois pour s'assurer que tout est correct
    renderCart();
}

document.addEventListener("DOMContentLoaded", () => {
    init();
});