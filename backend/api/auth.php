<?php
require_once __DIR__ . '/../config/cors.php';

// Настройки сессии
session_set_cookie_params([
    'lifetime' => 86400, // 24 часа
    'path' => '/',
    'domain' => 'localhost',
    'secure' => false,
    'httponly' => true,
    'samesite' => 'Lax'
]);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function isAdmin() {
    return isset($_SESSION['user']) && 
           isset($_SESSION['user']['role']) && 
           $_SESSION['user']['role'] === 'admin';
}

function isLoggedIn() {
    return isset($_SESSION['user']);
}

function setUserSession($user) {
    $_SESSION['user'] = $user;
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['role'] = $user['role'];
    
    // Логируем установку сессии
    error_log("Session set for user: " . $user['username'] . " with role: " . $user['role']);
}

function getUserSession() {
    return $_SESSION['user'] ?? null;
}

function logout() {
    // Очищаем все данные сессии
    $_SESSION = array();
    
    // Удаляем cookie сессии
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    
    // Уничтожаем сессию
    session_destroy();
}
?>