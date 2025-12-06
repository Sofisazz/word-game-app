<?php
// backend/api/admin/word_sets.php

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/cors.php';

// Пропускаем проверку auth.php для тестирования

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// ВРЕМЕННО: отключаем проверку администратора для тестирования
// if (!isAdmin()) {
//     http_response_code(403);
//     echo json_encode(['error' => 'Доступ запрещен']);
//     exit;
// }

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
            
        case 'POST':
            // Создание нового набора слов
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Валидация
            if (empty($input['name'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Название набора обязательно']);
                exit;
            }
            
            // ВРЕМЕННО: пропускаем проверку сессии
            // if (!isset($_SESSION['user_id']) || $_SESSION['user_id'] <= 0) {
            //     http_response_code(401);
            //     echo json_encode(['error' => 'Пользователь не авторизован']);
            //     exit;
            // }
            
            // Проверяем, не существует ли уже набор с таким названием
            $stmt = $pdo->prepare("SELECT id FROM word_sets WHERE name = ?");
            $stmt->execute([$input['name']]);
            if ($stmt->fetch()) {
                http_response_code(409);
                echo json_encode(['error' => 'Набор с таким названием уже существует']);
                exit;
            }
            
            // ВРЕМЕННО: используем фиксированный user_id
            $user_id = 1; // Используйте ID существующего пользователя в вашей базе
            
            // Проверяем, существует ли пользователь с таким ID
            $stmt = $pdo->prepare("SELECT id FROM users WHERE id = ?");
            $stmt->execute([$user_id]);
            if (!$stmt->fetch()) {
                // Если пользователь не существует, делаем created_by NULL
                $user_id = null;
            }
            
            // Вставляем новый набор
            $stmt = $pdo->prepare("
                INSERT INTO word_sets (name, description, created_by) 
                VALUES (?, ?, ?)
            ");
            
            $description = $input['description'] ?? null;
            
            $stmt->execute([
                trim($input['name']),
                $description,
                $user_id
            ]);
            
            $set_id = $pdo->lastInsertId();
            
            // Получаем созданный набор с подсчетом слов
            $stmt = $pdo->prepare("
                SELECT ws.*, 0 as word_count 
                FROM word_sets ws 
                WHERE ws.id = ?
            ");
            $stmt->execute([$set_id]);
            $new_set = $stmt->fetch(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'message' => 'Набор успешно создан',
                'set' => $new_set,
                'set_id' => $set_id
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
            
            // ВРЕМЕННО: пропускаем проверку администратора
            
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