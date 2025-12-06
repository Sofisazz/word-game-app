<?php
require_once '../config/database.php';
require_once __DIR__ . '/../config/cors.php';

header('Content-Type: application/json');

// Включим логирование для отладки
error_log("=== UPDATE PROFILE START ===");
error_log("Request data: " . file_get_contents('php://input'));

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
error_log("Parsed data: " . print_r($data, true));

if (!isset($data['user_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'User ID is required']);
    exit;
}

$user_id = (int)$data['user_id'];
$display_name = $data['display_name'] ?? null;
$avatar = $data['avatar'] ?? null; // Добавляем аватар

$database = new Database();
$db = $database->getConnection();

try {
    // Обновляем данные пользователя
    $update_fields = [];
    $params = [':user_id' => $user_id];
    
    if ($display_name !== null && trim($display_name) !== '') {
        $update_fields[] = 'display_name = :display_name';
        $params[':display_name'] = trim($display_name);
    }
    
    if ($avatar !== null && trim($avatar) !== '') {
        $update_fields[] = 'avatar = :avatar';
        $params[':avatar'] = trim($avatar);
    }
    
    // Если есть что обновлять
    if (!empty($update_fields)) {
        $query = "UPDATE users SET " . implode(', ', $update_fields) . " WHERE id = :user_id";
        error_log("Update query: " . $query);
        error_log("Update params: " . print_r($params, true));
        
        $stmt = $db->prepare($query);
        $stmt->execute($params);
        
        error_log("Rows affected: " . $stmt->rowCount());
    }
    
    // Получаем обновленные данные пользователя
    $user_query = "SELECT id, username, email, display_name, avatar, role FROM users WHERE id = :user_id";
    $user_stmt = $db->prepare($user_query);
    $user_stmt->execute([':user_id' => $user_id]);
    $user = $user_stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit;
    }
    
    // Формируем полный URL для аватарки (если она есть)
    if (!empty($user['avatar'])) {
        // Проверяем, есть ли уже полный URL
        if (strpos($user['avatar'], 'http://') === false && strpos($user['avatar'], 'https://') === false) {
            // Добавляем только если это относительный путь
            $user['avatar'] = 'http://localhost' . $user['avatar'];
        }
    }
    
    error_log("Updated user data: " . print_r($user, true));
    
    echo json_encode([
        'success' => true,
        'message' => 'Profile updated successfully',
        'user' => $user
    ]);
    
} catch (PDOException $e) {
    error_log("Database error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}

error_log("=== UPDATE PROFILE END ===");
?>