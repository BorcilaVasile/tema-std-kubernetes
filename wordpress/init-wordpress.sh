#!/bin/bash

echo "🚀 Inițializare BookShelf WordPress pentru Kubernetes..."

# Așteaptă MySQL să fie disponibil
echo "⏳ Așteptăm MySQL să fie disponibil..."

MAX_TRIES=30
COUNT=0
until wp db check --path=/var/www/html --allow-root 2>/dev/null; do
    COUNT=$((COUNT+1))
    if [ $COUNT -ge $MAX_TRIES ]; then
        echo "⚠️ MySQL nu a răspuns după $MAX_TRIES încercări, continuăm oricum..."
        break
    fi
    echo "Încercare $COUNT/$MAX_TRIES..."
    sleep 2
done

echo "✅ MySQL disponibil!"

# Verifică dacă WordPress e instalat
if ! wp core is-installed --path=/var/www/html --allow-root 2>/dev/null; then
    echo "🔧 Instalare WordPress automată..."
    wp core install \
        --url="${WORDPRESS_HOME:-http://localhost}" \
        --title="BookShelf - Librăria Digitală" \
        --admin_user=admin \
        --admin_password=admin123 \
        --admin_email=admin@bookshelf.local \
        --path=/var/www/html \
        --allow-root \
        --skip-email
    
    echo "✅ WordPress instalat cu succes!"
fi

# Activare temă
if [ -d "/var/www/html/wp-content/themes/ai-chat-theme" ]; then
    echo "🎨 Activez tema ai-chat-theme..."
    wp theme activate ai-chat-theme --path=/var/www/html --allow-root
    echo "✅ Tema ai-chat-theme activată!"
fi

# Configurări suplimentare
echo "⚙️ Configurare opțiuni WordPress..."
wp option update blogname "BookShelf - Librăria Digitală" --path=/var/www/html --allow-root
wp option update blogdescription "Prima librărie cu recomandări AI și suport live" --path=/var/www/html --allow-root

# Actualizează URL-ul WordPress la fiecare pornire (important pentru Kubernetes)
SITE_URL="${WORDPRESS_HOME:-http://localhost}"
echo "🌐 Setare URL WordPress: $SITE_URL"
wp option update siteurl "$SITE_URL" --path=/var/www/html --allow-root
wp option update home "$SITE_URL" --path=/var/www/html --allow-root

# Setează permisiuni finale
chown -R www-data:www-data /var/www/html

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ BookShelf WordPress gata pentru Kubernetes!"
echo "═══════════════════════════════════════════════════════════"
echo "   🌐 CMS: Port 80"
echo "   👤 Admin: admin / admin123"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Pornește Apache
exec "$@"