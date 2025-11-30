<?php
require_once '../config/database.php';
require_once '../cors.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['user_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'User ID is required']);
    exit;
}

$user_id = $data['user_id'];
$display_name = $data['display_name'] ?? null;

$database = new Database();
$db = $database->getConnection();

try {
    // Обновляем только display_name
    if ($display_name !== null) {
        $query = "UPDATE users SET display_name = :display_name WHERE id = :user_id";
        $stmt = $db->prepare($query);
        $stmt->execute([
            ':display_name' => $display_name,
            ':user_id' => $user_id
        ]);
    }
    
    // Получаем обновленные данные пользователя
    $user_query = "SELECT id, username, email, display_name, avatar FROM users WHERE id = :user_id";
    $user_stmt = $db->prepare($user_query);
    $user_stmt->execute([':user_id' => $user_id]);
    $user = $user_stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'message' => 'Profile updated successfully',
        'user' => $user
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>