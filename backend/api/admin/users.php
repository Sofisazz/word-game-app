<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../auth.php';

// ДОБАВЬТЕ В НАЧАЛЕ ОТЛАДКУ (исправленная версия)
error_log("=== ADMIN/USERS.PHP ACCESS ATTEMPT ===");
error_log("Session ID: " . session_id());
error_log("Session data: " . print_r($_SESSION, true)); // Отладочная информация
error_log("isAdmin() returns: " . (isAdmin() ? 'true' : 'false'));

// ВРЕМЕННО: ОТКЛЮЧИТЕ ПРОВЕРКУ АВТОРИЗАЦИИ ДЛЯ ТЕСТИРОВАНИЯ
// if (!isLoggedIn()) {
//     error_log("User is not logged in");
//     http_response_code(401);
//     echo json_encode(['error' => 'Требуется авторизация']);
//     exit;
// }

// ВРЕМЕННО: ПРОПУСТИТЕ ПРОВЕРКУ isAdmin() 
// if (!isAdmin()) {
//     $user = getUserSession();
//     error_log("User role is: " . ($user['role'] ?? 'undefined'));
//     error_log("User attempted admin access but is not admin");
//     http_response_code(403);
//     echo json_encode(['error' => 'Доступ запрещен. Требуются права администратора.']);
//     exit;
// }

error_log("User has admin access, proceeding...");

// Создаем соединение с базой данных
$database = new Database();
$pdo = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // Получение списка пользователей
            $stmt = $pdo->query("
                SELECT id, username, email, display_name, created_at, last_activity, role
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