<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../auth.php';

if (!isAdmin()) {
    http_response_code(403);
    echo json_encode(['error' => 'Доступ запрещен']);
    exit;
}


$database = new Database();
$pdo = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':

            $stmt = $pdo->query("
                SELECT id, username, email, display_name, created_at, last_activity, role
                FROM users 
                WHERE role != 'admin'
                ORDER BY created_at DESC
            ");
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            
            error_log("📋 Отправляем пользователей: " . count($users));
            foreach ($users as $user) {
                error_log("👤 " . $user['username'] . " - роль: " . $user['role']);
            }
            
            echo json_encode(['success' => true, 'users' => $users]);
            break;
            
        case 'DELETE':
          
            $userId = $_GET['user_id'] ?? null;
            
            if (!$userId) {
                http_response_code(400);
                echo json_encode(['error' => 'ID пользователя не указан']);
                exit;
            }
            

            $checkStmt = $pdo->prepare("SELECT role FROM users WHERE id = ?");
            $checkStmt->execute([$userId]);
            $user = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$user) {
                http_response_code(404);
                echo json_encode(['error' => 'Пользователь не найден']);
                exit;
            }
            
            if ($user['role'] === 'admin') {
                http_response_code(403);
                echo json_encode(['error' => 'Нельзя удалить администратора']);
                exit;
            }
            

            $pdo->beginTransaction();
            
 
            $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            
            $pdo->commit();
            
            echo json_encode(['success' => true, 'message' => 'Пользователь удален']);
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Метод не поддерживается']);
    }
    
} catch (PDOException $e) {
    if (isset($pdo)) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => 'Ошибка базы данных: ' . $e->getMessage()]);
}
?>