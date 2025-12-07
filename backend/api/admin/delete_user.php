<?php
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../auth.php';

error_log("=== DELETE_USER.PHP ACCESS ATTEMPT ===");
error_log("Session ID: " . session_id());
error_log("Session data: " . print_r($_SESSION, true));
error_log("isLoggedIn() returns: " . (isLoggedIn() ? 'true' : 'false'));
error_log("isAdmin() returns: " . (isAdmin() ? 'true' : 'false'));

$user_id = $_GET['user_id'] ?? null; 

if (!$user_id || !is_numeric($user_id)) {
    http_response_code(400);
    echo json_encode(['error' => 'Неверный ID пользователя']);
    exit;
}

$database = new Database();
$pdo = $database->getConnection();

try {
    $pdo->beginTransaction();

    $check_user = $pdo->prepare("SELECT id, username, role FROM users WHERE id = ?");
    $check_user->execute([$user_id]);
    $user = $check_user->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['error' => 'Пользователь не найден']);
        exit;
    }

    if ($user['role'] === 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Нельзя удалять администраторов']);
        exit;
    }

    error_log("Начинаем удаление пользователя ID: $user_id, Имя: " . $user['username']);

    $tables_to_delete = [
        'user_achievements',
        'word_progress', 
        'game_results',
        'user_stats'
    ];

    $deleted_rows = 0;
    foreach ($tables_to_delete as $table) {
        $check_table = $pdo->query("SHOW TABLES LIKE '$table'")->rowCount();
        if ($check_table > 0) {
            $stmt = $pdo->prepare("DELETE FROM $table WHERE user_id = ?");
            $stmt->execute([$user_id]);
            $rows = $stmt->rowCount();
            $deleted_rows += $rows;
            error_log("Удалено из $table: $rows строк для пользователя $user_id");
        } else {
            error_log("Таблица $table не существует, пропускаем");
        }
    }

    error_log("Всего удалено связанных записей: $deleted_rows");

    $delete_user = $pdo->prepare("DELETE FROM users WHERE id = ?");
    $delete_user->execute([$user_id]);

    if ($delete_user->rowCount() > 0) {
        $pdo->commit();
        error_log("Пользователь $user_id успешно удален");
        
        echo json_encode([
            'success' => true,
            'message' => 'Пользователь и все связанные данные успешно удалены',
            'deleted_related_rows' => $deleted_rows
        ]);
    } else {
        throw new Exception('Не удалось удалить пользователя');
    }

} catch (PDOException $e) {
    if (isset($pdo)) {
        $pdo->rollBack();
    }
    error_log("Delete user database error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Ошибка базы данных: ' . $e->getMessage()]);
} catch (Exception $e) {
    if (isset($pdo)) {
        $pdo->rollBack();
    }
    error_log("Delete user error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Ошибка при удалении пользователя: ' . $e->getMessage()]);
}
?>