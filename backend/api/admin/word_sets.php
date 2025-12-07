<?php


require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/cors.php';



if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}


$database = new Database();
$pdo = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];


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

            $input = json_decode(file_get_contents('php://input'), true);
            
  
            if (empty($input['name'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Название набора обязательно']);
                exit;
            }
            

            $stmt = $pdo->prepare("SELECT id FROM word_sets WHERE name = ?");
            $stmt->execute([$input['name']]);
            if ($stmt->fetch()) {
                http_response_code(409);
                echo json_encode(['error' => 'Набор с таким названием уже существует']);
                exit;
            }
            
      
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

            $setId = $_GET['set_id'] ?? null;
            
            if (!$setId) {
                http_response_code(400);
                echo json_encode(['error' => 'ID набора не указан']);
                exit;
            }
            
         
            $stmt = $pdo->prepare("SELECT id FROM word_sets WHERE id = ?");
            $stmt->execute([$setId]);
            if (!$stmt->fetch()) {
                http_response_code(404);
                echo json_encode(['error' => 'Набор не найден']);
                exit;
            }
            
  
            $pdo->beginTransaction();
            
            try {
           
                $stmt = $pdo->prepare("SELECT id FROM words WHERE word_set_id = ?");
                $stmt->execute([$setId]);
                $wordIds = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
                
       
                if (!empty($wordIds) && tableExists($pdo, 'word_progress')) {
         
                    $placeholders = implode(',', array_fill(0, count($wordIds), '?'));
                    
                    $stmt = $pdo->prepare("
                        DELETE FROM word_progress 
                        WHERE word_id IN ($placeholders)
                    ");
                    $stmt->execute($wordIds);
                }
                
     
                $stmt = $pdo->prepare("DELETE FROM words WHERE word_set_id = ?");
                $stmt->execute([$setId]);
                
     
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
            
            
            $stmt = $pdo->prepare("SELECT id FROM word_sets WHERE name = ? AND id != ?");
            $stmt->execute([$input['name'], $setId]);
            if ($stmt->fetch()) {
                http_response_code(409);
                echo json_encode(['error' => 'Набор с таким названием уже существует']);
                exit;
            }
            
    
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