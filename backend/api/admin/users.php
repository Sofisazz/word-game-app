<?php
// backend/api/admin/users.php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../auth.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

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
            // Получение списка пользователей
            $stmt = $pdo->query("
                SELECT id, username, email, display_name, created_at, last_activity,avatar, role
                FROM users 
                ORDER BY created_at DESC
            ");
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'users' => $users]);
            break;
            
        case 'DELETE':
            // Удаление пользователя
            $userId = $_GET['user_id'] ?? null;
            
            if (!$userId) {
                http_response_code(400);
                echo json_encode(['error' => 'ID пользователя не указан']);
                exit;
            }
            
            // Получаем текущего пользователя
            $currentUser = getUserSession();
            
            // Не позволяем удалить самого себя
            if ($userId == $currentUser['id']) {
                http_response_code(400);
                echo json_encode(['error' => 'Нельзя удалить себя']);
                exit;
            }
            
            // Начинаем транзакцию
            $pdo->beginTransaction();
            
            // Удаляем пользователя
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
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Ошибка: ' . $e->getMessage()]);
}
?>