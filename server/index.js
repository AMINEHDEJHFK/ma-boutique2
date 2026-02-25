const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

dotenv.config();

const app = express();

// Important pour Vercel/Heroku : Faire confiance au proxy pour avoir le bon protocole (https)
app.set('trust proxy', 1);

const PORT = process.env.PORT || 4000;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// === PRODUITS EN DUR POUR VERCEL (Sans base de données) ===
const PRODUCTS_DB = [{
        id: "prod-1",
        name: "Veste en Jean Vintage",
        description: "Une veste en jean classique, style vintage des années 90.",
        price: 4500,
        currency: "eur",
        image: "https://images.unsplash.com/photo-1576871333019-220ef346ddbb?w=800&q=80",
        stock: 10
    },
    {
        id: "prod-2",
        name: "Sneakers Premium",
        description: "Baskets confortables et élégantes pour toutes les occasions.",
        price: 8900,
        currency: "eur",
        image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
        stock: 5
    },
    {
        id: "prod-3",
        name: "Sac à Main en Cuir",
        description: "Sac à main artisanal en cuir véritable, finition soignée.",
        price: 12000,
        currency: "eur",
        image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80",
        stock: 3
    },
    {
        id: "prod-4",
        name: "Montre Minimaliste",
        description: "Design épuré et mécanisme de précision pour un look sophistiqué.",
        price: 15000,
        currency: "eur",
        image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80",
        stock: 7
    },
    {
        id: "prod-5",
        name: "Lunettes de Soleil",
        description: "Protection UV totale avec une monture élégante et légère.",
        price: 3500,
        currency: "eur",
        image: "https://images.unsplash.com/photo-1511499767390-90342f568952?w=800&q=80",
        stock: 12
    },
    {
        id: "prod-6",
        name: "Appareil Photo Vintage",
        description: "Capturez vos moments avec ce style argentique intemporel.",
        price: 25000,
        currency: "eur",
        image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80",
        stock: 2
    },
    {
        id: "prod-7",
        name: "Casque Audio Sans Fil",
        description: "Son haute fidélité avec réduction de bruit active.",
        price: 19900,
        currency: "eur",
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
        stock: 8
    },
    {
        id: "prod-8",
        name: "Plante Décorative Monstera",
        description: "Apportez une touche de nature à votre intérieur avec cette magnifique plante.",
        price: 2500,
        currency: "eur",
        image: "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=800&q=80",
        stock: 15
    },
    {
        id: "prod-9",
        name: "Enceinte Bluetooth",
        description: "Un son puissant et portable pour toutes vos aventures.",
        price: 7900,
        currency: "eur",
        image: "https://images.unsplash.com/photo-1608156639585-b3a032ef9689?w=800&q=80",
        stock: 10
    },
    {
        id: "prod-10",
        name: "Cahier de Notes en Cuir",
        description: "Parfait pour vos croquis, pensées et projets créatifs.",
        price: 1800,
        currency: "eur",
        image: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=800&q=80",
        stock: 20
    }
];

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

                    // Simulation de mise à jour (pour Vercel sans DB)
                    const product = PRODUCTS_DB.find(p => p.id === productId);
                    if (product) {
                        product.stock -= quantity;
                        console.log(`Nouveau stock temporaire pour ${product.name}: ${product.stock}`);
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

// Route pour lister les produits (depuis la liste en dur)
app.get("/api/products", requireAuth, (req, res) => {
    res.json(PRODUCTS_DB);
});

app.post("/api/checkout", requireAuth, async(req, res) => {
    const { items } = req.body;
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) return res.status(500).json({ error: "Clé Stripe manquante" });
    const stripe = require("stripe")(stripeSecretKey);

    try {
        const metadata = {};
        const lineItems = [];

        for (const item of items) {
            const product = PRODUCTS_DB.find(p => p.id === item.id);
            if (!product) continue;

            // Vérification du stock (simulé)
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