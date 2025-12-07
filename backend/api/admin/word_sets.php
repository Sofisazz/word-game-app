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

// Функция для проверки существования таблицы
function tableExists($pdo, $tableName) {
    try {
        $result = $pdo->query("SELECT 1 FROM information_schema.tables 
                              WHERE table_schema = DATABASE() 
                              AND table_name = '$tableName'");
        return $result->fetch() !== false;
    } catch (PDOException $e) {
        return false;
    }
}

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
            
            // Проверяем, не существует ли уже набор с таким названием
            $stmt = $pdo->prepare("SELECT id FROM word_sets WHERE name = ?");
            $stmt->execute([$input['name']]);
            if ($stmt->fetch()) {
                http_response_code(409);
                echo json_encode(['error' => 'Набор с таким названием уже существует']);
                exit;
            }
            
            // Вставляем новый набор
            $stmt = $pdo->prepare("
                INSERT INTO word_sets (name, description) 
                VALUES (?, ?)
            ");
            
            $description = $input['description'] ?? null;
            
            $stmt->execute([
                trim($input['name']),
                $description
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
            
            // Проверяем, существует ли набор
            $stmt = $pdo->prepare("SELECT id FROM word_sets WHERE id = ?");
            $stmt->execute([$setId]);
            if (!$stmt->fetch()) {
                http_response_code(404);
                echo json_encode(['error' => 'Набор не найден']);
                exit;
            }
            
            // Начинаем транзакцию
            $pdo->beginTransaction();
            
            try {
                // 1. Получаем ID всех слов из этого набора
                $stmt = $pdo->prepare("SELECT id FROM words WHERE word_set_id = ?");
                $stmt->execute([$setId]);
                $wordIds = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
                
                // 2. Если есть прогресс по этим словам, удаляем его
                if (!empty($wordIds) && tableExists($pdo, 'word_progress')) {
                    // Создаем строку с ID слов для IN запроса
                    $placeholders = implode(',', array_fill(0, count($wordIds), '?'));
                    
                    $stmt = $pdo->prepare("
                        DELETE FROM word_progress 
                        WHERE word_id IN ($placeholders)
                    ");
                    $stmt->execute($wordIds);
                }
                
                // 3. Удаляем слова из набора
                $stmt = $pdo->prepare("DELETE FROM words WHERE word_set_id = ?");
                $stmt->execute([$setId]);
                
                // 4. Удаляем сам набор
                $stmt = $pdo->prepare("DELETE FROM word_sets WHERE id = ?");
                $stmt->execute([$setId]);
                
                $pdo->commit();
                echo json_encode([
                    'success' => true, 
                    'message' => 'Набор успешно удален',
                    'deleted_words' => count($wordIds)
                ]);
                
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;
            
        case 'PUT':
            // Обновление набора слов
            $setId = $_GET['set_id'] ?? null;
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$setId) {
                http_response_code(400);
                echo json_encode(['error' => 'ID набора не указан']);
                exit;
            }
            
            if (empty($input['name'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Название набора обязательно']);
                exit;
            }
            
            // Проверяем, не существует ли другой набор с таким названием
            $stmt = $pdo->prepare("SELECT id FROM word_sets WHERE name = ? AND id != ?");
            $stmt->execute([$input['name'], $setId]);
            if ($stmt->fetch()) {
                http_response_code(409);
                echo json_encode(['error' => 'Набор с таким названием уже существует']);
                exit;
            }
            
            // Обновляем набор
            $stmt = $pdo->prepare("
                UPDATE word_sets 
                SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ");
            
            $description = $input['description'] ?? null;
            
            $stmt->execute([
                trim($input['name']),
                $description,
                $setId
            ]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Набор успешно обновлен'
            ]);
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