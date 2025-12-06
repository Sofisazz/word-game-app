<?php
// Включите заголовки CORS в самом начале
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

// Обработка preflight запросов
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Отключите вывод ошибок на экран (для продакшена)
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

// Логируем ошибки в файл
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/php_errors.log');

// Начнем буферизацию вывода, чтобы ловить случайные выводы
ob_start();

try {
    // Проверяем наличие файлов
    $config_path = __DIR__ . '/../config/database.php';
    $cors_path = __DIR__ . '/../config/cors.php';
    $auth_path = __DIR__ . '/auth.php';
    
    error_log("Checking files existence:");
    error_log("database.php: " . (file_exists($config_path) ? "EXISTS" : "MISSING"));
    error_log("cors.php: " . (file_exists($cors_path) ? "EXISTS" : "MISSING"));
    error_log("auth.php: " . (file_exists($auth_path) ? "EXISTS" : "MISSING"));
    
    if (!file_exists($config_path)) {
        throw new Exception('Database config file not found: ' . $config_path);
    }
    if (!file_exists($cors_path)) {
        throw new Exception('CORS config file not found: ' . $cors_path);
    }
    if (!file_exists($auth_path)) {
        throw new Exception('Auth file not found: ' . $auth_path);
    }
    
    require_once $config_path;
    require_once $cors_path;
    require_once $auth_path;
    
    error_log("All files loaded successfully");
    
    // Логируем запрос
    error_log("=== LOGIN REQUEST START ===");
    error_log("Request method: " . $_SERVER['REQUEST_METHOD']);
    error_log("Input data: " . file_get_contents('php://input'));
    
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Method not allowed', 405);
    }
    
    $input = file_get_contents('php://input');
    if (empty($input)) {
        throw new Exception('No input data', 400);
    }
    
    $data = json_decode($input, true);
    if (!$data) {
        throw new Exception('Invalid JSON data', 400);
    }
    
    error_log("Parsed data: " . print_r($data, true));
    
    if (!isset($data['username']) || !isset($data['password'])) {
        throw new Exception('Missing username or password', 400);
    }
    
    $username = trim($data['username']);
    $password = $data['password'];
    
    error_log("Processing login for: $username");
    
    // Проверка на админ-доступ
    if ($username === 'admin' && $password === 'admin') {
        error_log("Admin login successful");
        $adminUser = [
            'id' => 0,
            'username' => 'admin',
            'email' => 'admin@system.com',
            'role' => 'admin'
        ];
        
        echo json_encode([
            'success' => true,
            'message' => 'Admin login successful',
            'user' => $adminUser
        ]);
        exit;
    }
    
    // Обычная проверка пользователей из БД
    $database = new Database();
    $db = $database->getConnection();
    
    $query = "SELECT id, username, email, avatar, password_hash, role FROM users WHERE username = :username OR email = :username";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':username', $username);
    $stmt->execute();
    
    if ($stmt->rowCount() === 0) {
        error_log("User not found: $username");
        throw new Exception('Invalid credentials', 401);
    }
    
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    error_log("User found: " . $user['username']);
    
    if (!password_verify($password, $user['password_hash'])) {
        error_log("Invalid password for: $username");
        throw new Exception('Invalid credentials', 401);
    }
    
    // Устанавливаем сессию для обычного пользователя
    $userSession = [
        'id' => $user['id'],
        'username' => $user['username'],
        'email' => $user['email'],
        'avatar' => $user['avatar'] ?? null,
        'role' => $user['role'] ?? 'user'
    ];
    
    error_log("User login successful: " . $userSession['username']);
    
    // Начинаем сессию только если нужно
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_role'] = $user['role'] ?? 'user';
    
    // Очищаем буфер вывода
    ob_end_clean();
    
    echo json_encode([
        'success' => true,
        'message' => 'Login successful',
        'user' => $userSession
    ]);
    
} catch (Exception $e) {
    // Очищаем буфер вывода
    ob_end_clean();
    
    $code = $e->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 500;
    }
    
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
    
    error_log("Login error: " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine());
}

error_log("=== LOGIN REQUEST END ===");
?>