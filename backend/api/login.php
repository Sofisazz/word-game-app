<?php
require_once 'config.php';
require_once __DIR__ . '/../config/cors.php';

// Исправьте путь к database.php
require_once __DIR__ . '/../config/database.php';
require_once 'auth.php';

// Логируем запрос
error_log("Login attempt: " . ($_POST['username'] ?? 'unknown'));

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['username']) || !isset($data['password'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing username or password']);
    exit;
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
    
    setUserSession($adminUser);
    
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

$query = "SELECT id, username, email, password_hash, role FROM users WHERE username = :username OR email = :username";
$stmt = $db->prepare($query);
$stmt->bindParam(':username', $username);
$stmt->execute();

if ($stmt->rowCount() === 0) {
    error_log("User not found: $username");
    http_response_code(401);
    echo json_encode(['error' => 'Invalid credentials']);
    exit;
}

$user = $stmt->fetch(PDO::FETCH_ASSOC);
error_log("User found: " . $user['username']);

if (!password_verify($password, $user['password_hash'])) {
    error_log("Invalid password for: $username");
    http_response_code(401);
    echo json_encode(['error' => 'Invalid credentials']);
    exit;
}

// Устанавливаем сессию для обычного пользователя
$userSession = [
    'id' => $user['id'],
    'username' => $user['username'],
    'email' => $user['email'],
    'role' => $user['role'] ?? 'user'
];

error_log("User login successful: " . $userSession['username']);
setUserSession($userSession);

echo json_encode([
    'success' => true,
    'message' => 'Login successful',
    'user' => $userSession
]);
?>