<?php
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
            // Получение всех наборов слов
            $stmt = $pdo->query("
                SELECT ws.*, COUNT(w.id) as word_count 
                FROM word_sets ws 
                LEFT JOIN words w ON ws.id = w.word_set_id 
                GROUP BY ws.id 
                ORDER BY ws.name ASC
            ");
            $sets = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true, 
                'sets' => $sets,
                'total' => count($sets)
            ]);
            break;
            
        case 'DELETE':
            // Удаление набора слов
            $setId = $_GET['set_id'] ?? null;
            
            if (!$setId) {
                http_response_code(400);
                echo json_encode(['error' => 'ID набора не указан']);
                exit;
            }
            
            // Начинаем транзакцию
            $pdo->beginTransaction();
            
            try {
                // Удаляем слова из набора
                $stmt = $pdo->prepare("DELETE FROM words WHERE word_set_id = ?");
                $stmt->execute([$setId]);
                
                // Удаляем сам набор
                $stmt = $pdo->prepare("DELETE FROM word_sets WHERE id = ?");
                $stmt->execute([$setId]);
                
                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'Набор удален']);
                
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Метод не поддерживается']);
            break;
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Ошибка базы данных: ' . $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Ошибка сервера: ' . $e->getMessage()]);
}
?>