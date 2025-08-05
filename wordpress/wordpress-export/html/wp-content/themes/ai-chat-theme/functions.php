<?php
function ai_chat_theme_setup() {
    // Suport pentru title tag
    add_theme_support('title-tag');
}
add_action('after_setup_theme', 'ai_chat_theme_setup');

function ai_chat_theme_scripts() {
    // Încarcă CSS-ul temei
    wp_enqueue_style('ai-chat-style', get_stylesheet_uri(), array(), '1.0.0');
}
add_action('wp_enqueue_scripts', 'ai_chat_theme_scripts');
?>