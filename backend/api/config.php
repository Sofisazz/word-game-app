<?php
// Подключаем CORS из config папки
$cors_path = __DIR__ . '/../config/cors.php';
if (file_exists($cors_path)) {
    require_once $cors_path;
} else {
    // Если файл не найден, устанавливаем CORS заголовки прямо здесь
    header('Access-Control-Allow-Origin: http://localhost:3001');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Allow-Credentials: true');
    
    if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}
?>