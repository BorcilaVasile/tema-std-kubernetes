<?php
$server_ip = getenv('SERVER_IP') ?: ($_SERVER['SERVER_ADDR'] ?? 'localhost');
$iframe_ai_url = "http://{$server_ip}:100";
$iframe_chat_url = "http://{$server_ip}:90";
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?php bloginfo('name'); ?> - <?php bloginfo('description'); ?></title>
    <?php wp_head(); ?>
</head>

<body <?php body_class(); ?>>
    <header class="site-header">
        <div class="container">
            <h1 class="site-title">📚 BookShelf - Librăria Digitală</h1>
            <p class="site-description">Prima librărie cu recomandări AI și suport live pentru iubitorii de cărți!</p>
        </div>
    </header>

    <main class="container" style="padding: 3rem 0;">
        
        <!-- Secțiunea de introducere -->
        <div style="text-align: center; margin-bottom: 4rem;">
            <h2 style="font-size: 2.5rem; margin-bottom: 1rem;">📖 Descoperă lumea cărților cu AI!</h2>
            <p style="font-size: 1.2rem; color: #666; max-width: 600px; margin: 0 auto;">
                Analizează conținutul cărților cu inteligență artificială sau vorbește cu specialiștii noștri pentru recomandări personalizate!
            </p>
        </div>

        <!-- Cărțile noastre recomandate -->
        <div style="background: #fff; padding: 2rem; border-radius: 12px; margin: 2rem 0; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
            <h3 style="text-align: center; margin-bottom: 2rem;">📚 Cărțile lunii</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem;">
                <div style="text-align: center;">
                    <h4>🔥 "Sapiens" - Yuval Noah Harari</h4>
                    <p>O scurtă istorie a omenirii - bestseller internațional</p>
                    <strong>45 RON</strong>
                </div>
                <div style="text-align: center;">
                    <h4>🧠 "Thinking, Fast and Slow" - Daniel Kahneman</h4>
                    <p>Psihologia deciziilor și gândirea umană</p>
                    <strong>52 RON</strong>
                </div>
                <div style="text-align: center;">
                    <h4>🌟 "Atomic Habits" - James Clear</h4>
                    <p>Ghidul pentru construirea obiceiurilor bune</p>
                    <strong>38 RON</strong>
                </div>
            </div>
        </div>

        <!-- Secțiunea AI pentru analizarea cărților -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 3rem 2rem; border-radius: 12px; margin: 3rem 0;">
            <div style="text-align: center; margin-bottom: 2rem;">
                <h3 style="font-size: 2rem; margin-bottom: 1rem;">🤖 Analizează Cărți cu AI - Primul în România!</h3>
                <p style="font-size: 1.1rem; opacity: 0.9;">
                    Încarcă pagini din cărți, recenzii, sau documente PDF și lasă inteligența artificială să îți ofere insights valoroase despre conținut!
                </p>
            </div>
            
            <div style="background: rgba(255,255,255,0.1); padding: 1.5rem; border-radius: 8px; margin: 2rem 0;">
                <h4>✨ Cum funcționează analiza AI?</h4>
                <ol style="margin: 1rem 0;">
                    <li><strong>Încarcă</strong> - Poze cu pagini, PDF-uri, sau text despre cărți</li>
                    <li><strong>AI analizează</strong> - Azure Form Recognizer extrage și procesează informația</li>
                    <li><strong>Primești insights</strong> - Rezumate, teme principale, și recomandări</li>
                </ol>
            </div>
            
            <div style="border: 2px dashed rgba(255,255,255,0.3); border-radius: 8px; overflow: hidden; height: 500px;">
                <iframe src="<?php echo htmlspecialchars($iframe_ai_url); ?>"
                        width="100%" 
                        height="100%" 
                        frameborder="0"
                        title="Aplicația AI pentru analizarea cărților"></iframe>
            </div>
        </div>

        <!-- Secțiunea Chat pentru recomandări -->
        <div style="background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%); color: white; padding: 3rem 2rem; border-radius: 12px; margin: 3rem 0;">
            <div style="text-align: center; margin-bottom: 2rem;">
                <h3 style="font-size: 2rem; margin-bottom: 1rem;">💬 Chat cu Librarii Experți</h3>
                <p style="font-size: 1.1rem; opacity: 0.9;">
                    Cauti o carte anume? Vrei recomandări bazate pe preferințe? 
                    Librarii noștri sunt online pentru a te ghida în lumea cărților!
                </p>
            </div>
            
            <div style="background: rgba(255,255,255,0.1); padding: 1.5rem; border-radius: 8px; margin: 2rem 0;">
                <h4>📖 Serviciile noastre de consultanță:</h4>
                <ul style="margin: 1rem 0;">
                    <li><strong>Program:</strong> Luni-Duminică, 09:00-21:00</li>
                    <li><strong>Răspuns:</strong> În mai puțin de 2 minute</li>
                    <li><strong>Specialitate:</strong> Recomandări personalizate pe genuri</li>
                    <li><strong>Bonus:</strong> Rezumate și review-uri exclusive</li>
                </ul>
            </div>
            
            <div style="border: 2px dashed rgba(255,255,255,0.3); border-radius: 8px; overflow: hidden; height: 500px;">
                <iframe src="<?php echo htmlspecialchars($iframe_chat_url); ?>" 
                        width="100%" 
                        height="100%" 
                        frameborder="0"
                        title="Chat cu Librarii Experți">
                    <p style="text-align: center; padding: 2rem;">
                        Se încarcă chat-ul cu librarii... <br>
                        <a href="/chat/" style="color: white;">Accesează chat-ul direct →</a>
                    </p>
                </iframe>
            </div>
        </div>

        <!-- Footer info -->
        <div style="text-align: center; margin: 3rem 0; padding: 2rem; background: #f8f9fa; border-radius: 8px;">
            <h4>📍 BookShelf - Librăria Digitală</h4>
            <p>Bd. Literaturii nr. 15, București | 📞 0721.BOOK.AI | 🌐 www.bookshelf-ai.ro</p>
            <p><em>Prima librărie din România cu analize AI pentru cărți și consultanță live!</em></p>
        </div>

    </main>

    <?php wp_footer(); ?>
</body>
</html>