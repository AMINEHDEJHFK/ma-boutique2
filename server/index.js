const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { Pool } = require("pg");

dotenv.config();

const app = express();

// Important pour Vercel/Heroku : Faire confiance au proxy pour avoir le bon protocole (https)
app.set('trust proxy', 1);

const PORT = process.env.PORT || 4000;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;

const CLIENT_DIR = path.join(__dirname, "..", "client");
app.use(express.static(CLIENT_DIR));

// Pour servir l'index.html sur la racine si express.static ne suffit pas avec Vercel
app.get('/', (req, res) => {
    res.sendFile(path.join(CLIENT_DIR, 'index.html'));
});

// Pour les fichiers HTML spécifiques
app.get('/*.html', (req, res) => {
    res.sendFile(path.join(CLIENT_DIR, req.path));
});

// Initialisation de la base de données PostgreSQL (Supabase)
let pool;
if (DATABASE_URL) {
    // Supabase nécessite SSL en production, mais pas forcément en local si on n'utilise pas SSL
    // Pour être sûr, on force SSL avec rejectUnauthorized: false pour Vercel/Supabase
    pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    // Tenter de se connecter tout de suite pour vérifier si ça marche et logger l'erreur
    pool.connect().then(client => {
        console.log("Connexion DB réussie !");
        client.release();
        initializeDatabase();
    }).catch(err => {
        console.error("ERREUR CRITIQUE DE CONNEXION DB:", err);
    });
} else {
    console.error("ERREUR: DATABASE_URL manquante dans le fichier .env ou sur Vercel !");
}

// Route pour initialiser la DB (FORCE l'ajout des produits)
app.get("/api/init-db", async(req, res) => {
    if (!pool) return res.status(500).json({ error: "Base de données non connectée" });
    try {
        await initializeDatabase(true); // Passer true pour forcer
        res.json({ message: "Base de données initialisée avec succès (produits forcés)." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur lors de l'initialisation: " + err.message });
    }
});

async function initializeDatabase(force = false) {
    if (!pool) return;
    try {
        const client = await pool.connect();
        try {
            // Table des produits avec stock
            await client.query(`CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                price INTEGER NOT NULL,
                currency TEXT NOT NULL,
                image TEXT,
                stock INTEGER DEFAULT 10
            )`);

            // Table des commandes
            await client.query(`CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                customer_email TEXT,
                total_amount INTEGER,
                status TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);

            // Insertion des produits par défaut
            const res = await client.query("SELECT COUNT(*) as count FROM products");
            // Si on force, ou si la table est vide
            if (force || res.rows[0].count === '0' || res.rows[0].count === 0) {
                console.log("Insertion/Mise à jour des produits...");

                const initialProducts = [
                    // --- VÊTEMENTS & MODE (10) ---
                    {
                        id: "mode-1",
                        name: "Veste en Jean Vintage",
                        description: "Une veste en jean classique, style vintage des années 90, robuste et intemporelle.",
                        price: 4500,
                        currency: "eur",
                        image: "https://images.unsplash.com/photo-1576871333019-220ef346ddbb?w=800&q=80",
                        stock: 10
                    },
                    {
                        id: "mode-2",
                        name: "Sneakers Premium Blanches",
                        description: "Baskets minimalistes en cuir vegan, confortables pour toutes les occasions.",
                        price: 8900,
                        currency: "eur",
                        image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80",
                        stock: 15
                    },
                    {
                        id: "mode-3",
                        name: "Sac à Main en Cuir",
                        description: "Sac à main artisanal en cuir véritable, finition soignée et durable.",
                        price: 12000,
                        currency: "eur",
                        image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80",
                        stock: 5
                    },
                    {
                        id: "mode-4",
                        name: "Montre Minimaliste Noire",
                        description: "Design épuré, cadran noir mat, mécanisme de précision quartz.",
                        price: 15000,
                        currency: "eur",
                        image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80",
                        stock: 8
                    },
                    {
                        id: "mode-5",
                        name: "Lunettes de Soleil Aviateur",
                        description: "Protection UV400 avec une monture dorée élégante et légère.",
                        price: 3500,
                        currency: "eur",
                        image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80",
                        stock: 20
                    },
                    {
                        id: "mode-6",
                        name: "T-shirt Coton Bio",
                        description: "T-shirt basique blanc, 100% coton biologique, coupe ajustée.",
                        price: 2500,
                        currency: "eur",
                        image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80",
                        stock: 50
                    },
                    {
                        id: "mode-7",
                        name: "Sweat à Capuche Gris",
                        description: "Sweat confortable et chaud, idéal pour les soirées fraîches.",
                        price: 4900,
                        currency: "eur",
                        image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&q=80",
                        stock: 12
                    },
                    {
                        id: "mode-8",
                        name: "Chemise à Carreaux",
                        description: "Chemise flanelle rouge et noire, style bûcheron moderne.",
                        price: 3900,
                        currency: "eur",
                        image: "https://images.unsplash.com/photo-1553859943-a02c5418b798?w=800&q=80",
                        stock: 10
                    },
                    {
                        id: "mode-9",
                        name: "Bonnet en Laine Mérinos",
                        description: "Bonnet doux et chaud, tricoté en laine mérinos de qualité.",
                        price: 2900,
                        currency: "eur",
                        image: "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=800&q=80",
                        stock: 25
                    },
                    {
                        id: "mode-10",
                        name: "Écharpe Cachemire",
                        description: "Écharpe luxueuse en cachemire beige, douce et élégante.",
                        price: 6500,
                        currency: "eur",
                        image: "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=800&q=80",
                        stock: 7
                    },

                    // --- TECH & GADGETS (10) ---
                    {
                        id: "tech-1",
                        name: "Casque Audio Sans Fil",
                        description: "Son haute fidélité avec réduction de bruit active et 30h d'autonomie.",
                        price: 19900,
                        currency: "eur",
                        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
                        stock: 15
                    },
                    {
                        id: "tech-2",
                        name: "Appareil Photo Rétro",
                        description: "Style argentique avec la technologie numérique moderne.",
                        price: 45000,
                        currency: "eur",
                        image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&q=80",
                        stock: 3
                    },
                    {
                        id: "tech-3",
                        name: "Enceinte Bluetooth Portable",
                        description: "Son puissant à 360°, étanche et résistante aux chocs.",
                        price: 7900,
                        currency: "eur",
                        image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&q=80",
                        stock: 20
                    },
                    {
                        id: "tech-4",
                        name: "Montre Connectée Sport",
                        description: "Suivi cardiaque, GPS, notifications et étanche 50m.",
                        price: 22000,
                        currency: "eur",
                        image: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&q=80",
                        stock: 10
                    },
                    {
                        id: "tech-5",
                        name: "Clavier Mécanique RGB",
                        description: "Switches bleus clicky, rétroéclairage personnalisable.",
                        price: 11000,
                        currency: "eur",
                        image: "https://images.unsplash.com/photo-1587829741301-dc798b91add1?w=800&q=80",
                        stock: 8
                    },
                    {
                        id: "tech-6",
                        name: "Souris Ergonomique",
                        description: "Conçue pour le confort, réduit la fatigue du poignet.",
                        price: 5500,
                        currency: "eur",
                        image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&q=80",
                        stock: 12
                    },
                    {
                        id: "tech-7",
                        name: "Batterie Externe 20000mAh",
                        description: "Charge rapide pour tous vos appareils en déplacement.",
                        price: 3500,
                        currency: "eur",
                        image: "https://images.unsplash.com/photo-1609592424362-94462612d7b1?w=800&q=80",
                        stock: 30
                    },
                    {
                        id: "tech-8",
                        name: "Support Ordinateur Alu",
                        description: "Support pliable en aluminium pour MacBook et PC portables.",
                        price: 4500,
                        currency: "eur",
                        image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&q=80",
                        stock: 18
                    },
                    {
                        id: "tech-9",
                        name: "Lampe de Bureau LED",
                        description: "Lampe moderne avec chargeur sans fil intégré.",
                        price: 5900,
                        currency: "eur",
                        image: "https://images.unsplash.com/photo-1534073828943-ef8010912984?w=800&q=80",
                        stock: 10
                    },
                    {
                        id: "tech-10",
                        name: "Drone Caméra 4K",
                        description: "Drone compact avec caméra stabilisée 4K, facile à piloter.",
                        price: 55000,
                        currency: "eur",
                        image: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80",
                        stock: 2
                    },

                    // --- MAISON & DÉCO (10) ---
                    {
                        id: "deco-1",
                        name: "Plante Monstera Deliciosa",
                        description: "Grande plante d'intérieur facile d'entretien, apporte de la vie.",
                        price: 3500,
                        currency: "eur",
                        image: "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=800&q=80",
                        stock: 10
                    },
                    {
                        id: "deco-2",
                        name: "Vase en Céramique",
                        description: "Vase fait main, design minimaliste et texture brute.",
                        price: 2800,
                        currency: "eur",
                        image: "https://images.unsplash.com/photo-1581783342308-f792ca11df53?w=800&q=80",
                        stock: 8
                    },
                    {
                        id: "deco-3",
                        name: "Bougie Parfumée Soja",
                        description: "Cire de soja naturelle, parfum bois de santal et vanille.",
                        price: 1800,
                        currency: "eur",
                        image: "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=800&q=80",
                        stock: 40
                    },
                    {
                        id: "deco-4",
                        name: "Coussin Velours Bleu",
                        description: "Coussin décoratif doux en velours bleu nuit.",
                        price: 2200,
                        currency: "eur",
                        image: "https://images.unsplash.com/photo-1584100936595-c0654b55a2e6?w=800&q=80",
                        stock: 15
                    },
                    {
                        id: "deco-5",
                        name: "Affiche Art Abstrait",
                        description: "Impression haute qualité encadrée, 50x70cm.",
                        price: 3500,
                        currency: "eur",
                        image: "https://images.unsplash.com/photo-1580130601275-c9f22509689e?w=800&q=80",
                        stock: 20
                    },
                    {
                        id: "deco-6",
                        name: "Tapis Berbère",
                        description: "Tapis style berbère en coton, motifs géométriques noirs et blancs.",
                        price: 8500,
                        currency: "eur",
                        image: "https://images.unsplash.com/photo-1575412619272-5a52d7083693?w=800&q=80",
                        stock: 5
                    },
                    {
                        id: "deco-7",
                        name: "Miroir Rond Doré",
                        description: "Grand miroir mural rond avec cadre fin en laiton.",
                        price: 6900,
                        currency: "eur",
                        image: "https://images.unsplash.com/photo-1618220179428-22790b461013?w=800&q=80",
                        stock: 6
                    },
                    {
                        id: "deco-8",
                        name: "Service à Thé Japonais",
                        description: "Set complet en fonte noire avec 4 tasses.",
                        price: 5500,
                        currency: "eur",
                        image: "https://images.unsplash.com/photo-1533036982928-8d003b8600d3?w=800&q=80",
                        stock: 8
                    },
                    {
                        id: "deco-9",
                        name: "Horloge Murale Bois",
                        description: "Horloge silencieuse en bois naturel, design scandinave.",
                        price: 4200,
                        currency: "eur",
                        image: "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=800&q=80",
                        stock: 12
                    },
                    {
                        id: "deco-10",
                        name: "Panier en Osier Tressé",
                        description: "Panier de rangement pratique et esthétique.",
                        price: 2400,
                        currency: "eur",
                        image: "https://images.unsplash.com/photo-1591123120675-6f7f4a548130?w=800&q=80",
                        stock: 25
                    }
                ];

                for (const p of initialProducts) {
                    await client.query(
                        "INSERT INTO products (id, name, description, price, currency, image, stock) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO UPDATE SET name = $2, description = $3, price = $4, image = $6", [p.id, p.name, p.description, p.price, p.currency, p.image, p.stock]
                    );
                }
                console.log("30 produits variés insérés/mis à jour dans Supabase.");
            }
        } finally {
            client.release();
        }
    } catch (err) {
        console.error("Erreur d'initialisation de la DB:", err);
    }
}

// Pour servir l'index.html sur la racine si express.static ne suffit pas avec Vercel
app.get('/', (req, res) => {
    res.sendFile(path.join(CLIENT_DIR, 'index.html'));
});

// Pour les fichiers HTML spécifiques
app.get('/*.html', (req, res) => {
    res.sendFile(path.join(CLIENT_DIR, req.path));
});

// Initialisation de la base de données SQLite retirée pour Vercel (utilisation de PRODUCTS_DB)

// Middleware Stripe Webhook (AVANT express.json())
app.post("/webhook", express.raw({ type: "application/json" }), async(req, res) => {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeSecretKey || !endpointSecret) {
        return res.status(500).send("Erreur de configuration Stripe");
    }

    const stripe = require("stripe")(stripeSecretKey);
    const sig = req.headers["stripe-signature"];

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        console.log(`Webhook reçu: Session complétée ${session.id}`);

        if (session.metadata) {
            console.log("Metadata de la session:", session.metadata);
            for (const [key, value] of Object.entries(session.metadata)) {
                if (key.startsWith("prod_")) {
                    const productId = value;
                    const quantity = parseInt(session.metadata[`qty_${productId}`]) || 1;

                    console.log(`Mise à jour du stock pour le produit ${productId}: -${quantity}`);

                    if (pool) {
                        pool.query("UPDATE products SET stock = stock - $1 WHERE id = $2", [quantity, productId])
                            .then(() => console.log(`Stock mis à jour avec succès pour ${productId}`))
                            .catch(err => console.error(`Erreur lors de la mise à jour du stock pour ${productId}:`, err.message));
                    }
                }
            }
        } else {
            console.log("Aucune metadata trouvée dans la session.");
        }
    }
    res.json({ received: true });
});

app.use(cors());
app.use(express.json());

app.use(
    session({
        secret: process.env.SESSION_SECRET || "dev-session-secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax",
            maxAge: 1000 * 60 * 60 * 24
        }
    })
);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

function requireAuth(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: "Authentification requise." });
    }
    next();
}

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    passport.use(
        new GoogleStrategy({
                clientID: GOOGLE_CLIENT_ID,
                clientSecret: GOOGLE_CLIENT_SECRET,
                callbackURL: "/auth/google/callback"
            },
            (accessToken, refreshToken, profile, done) => {
                const email = profile.emails && profile.emails[0] ? profile.emails[0].value : "";
                const adminEmail = process.env.ADMIN_EMAIL || "";
                const user = {
                    id: profile.id,
                    email,
                    role: email.toLowerCase() === adminEmail.toLowerCase() ? "admin" : "customer"
                };
                return done(null, user);
            }
        )
    );
}

app.get("/auth/google", (req, res, next) => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return res.status(500).send("Configuration Google OAuth manquante.");
    }
    next();
}, passport.authenticate("google", { scope: ["profile", "email"] }));

app.get("/auth/google/callback", passport.authenticate("google", { failureRedirect: "/" }), (req, res) => {
    res.redirect("/");
});

app.post("/api/logout", (req, res) => {
    req.logout(() => {
        if (req.session) {
            req.session.destroy(() => res.json({ ok: true }));
        } else {
            res.json({ ok: true });
        }
    });
});

app.get("/api/me", (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Non connecté." });
    res.json(req.user);
});

app.get("/api/products", async(req, res) => {
    if (!pool) return res.status(500).json({ error: "Base de données non connectée" });
    try {
        const result = await pool.query("SELECT * FROM products");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur DB" });
    }
});

app.post("/api/checkout", requireAuth, async(req, res) => {
    const { items } = req.body;
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) return res.status(500).json({ error: "Clé Stripe manquante" });
    const stripe = require("stripe")(stripeSecretKey);

    if (!pool) return res.status(500).json({ error: "Base de données non connectée" });

    try {
        const productIds = items.map(i => i.id);
        // PostgreSQL utilise $1, $2... pour les placeholders
        const placeholders = productIds.map((_, i) => `$${i + 1}`).join(",");

        const result = await pool.query(`SELECT * FROM products WHERE id IN (${placeholders})`, productIds);
        const products = result.rows;

        const metadata = {};
        const lineItems = [];

        for (const item of items) {
            const product = products.find(p => p.id === item.id);
            if (!product) continue;

            // Vérification du stock
            if (product.stock < item.quantity) {
                return res.status(400).json({ error: `Stock insuffisant pour ${product.name} (Restant: ${product.stock})` });
            }

            metadata[`prod_${product.id}`] = product.id;
            metadata[`qty_${product.id}`] = item.quantity;

            lineItems.push({
                price_data: {
                    currency: product.currency,
                    product_data: { name: product.name, description: product.description },
                    unit_amount: product.price
                },
                quantity: item.quantity
            });
        }

        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],
            line_items: lineItems,
            metadata: metadata,
            success_url: `${req.protocol}://${req.get("host")}/success.html`,
            cancel_url: `${req.protocol}://${req.get("host")}/cancel.html`
        });
        res.json({ url: session.url });
    } catch (error) {
        console.error("Erreur Stripe/DB:", error);
        res.status(500).json({ error: "Erreur lors du paiement" });
    }
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});

// Export pour Vercel
module.exports = app;