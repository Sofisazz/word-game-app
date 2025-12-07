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
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../auth.php';


error_log("=== WORDS.PHP ACCESS ATTEMPT ===");
error_log("Session ID: " . session_id());
error_log("Session data: " . print_r($_SESSION, true));
error_log("isLoggedIn() returns: " . (isLoggedIn() ? 'true' : 'false'));
error_log("isAdmin() returns: " . (isAdmin() ? 'true' : 'false'));



$database = new Database();
$pdo = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':

            $setId = $_GET['set_id'] ?? null;
            
            if (!$setId) {
                http_response_code(400);
                echo json_encode(['error' => 'ID набора не указан']);
                exit;
            }
            
            $stmt = $pdo->prepare("SELECT * FROM words WHERE word_set_id = ? ORDER BY id");
            $stmt->execute([$setId]);
            $words = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'words' => $words]);
            break;
            
        case 'POST':

            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['set_id']) || !isset($input['original_word']) || !isset($input['translation'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Не все обязательные поля заполнены']);
                exit;
            }
            
            $stmt = $pdo->prepare("
                INSERT INTO words (word_set_id, original_word, translation, example_sentence) 
                VALUES (?, ?, ?, ?)
            ");
            $stmt->execute([
                $input['set_id'],
                $input['original_word'],
                $input['translation'],
                $input['example_sentence'] ?? null 
            ]);
            
            echo json_encode(['success' => true, 'word_id' => $pdo->lastInsertId()]);
            break;
            
        case 'PUT':
 
            $wordId = $_GET['word_id'] ?? null;
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$wordId) {
                http_response_code(400);
                echo json_encode(['error' => 'ID слова не указан']);
                exit;
            }
            
            if (!isset($input['original_word']) || !isset($input['translation'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Не все обязательные поля заполнены']);
                exit;
            }
            
            $stmt = $pdo->prepare("
                UPDATE words 
                SET original_word = ?, translation = ?, example_sentence = ? 
                WHERE id = ?
            ");
            $stmt->execute([
                $input['original_word'],
                $input['translation'],
                $input['example_sentence'] ?? null,
                $wordId
            ]);
            
            echo json_encode(['success' => true]);
            break;
            
        case 'DELETE':
          
            $wordId = $_GET['word_id'] ?? null;
            
            if (!$wordId) {
                http_response_code(400);
                echo json_encode(['error' => 'ID слова не указан']);
                exit;
            }
            
            $stmt = $pdo->prepare("DELETE FROM words WHERE id = ?");
            $stmt->execute([$wordId]);
            
            echo json_encode(['success' => true]);
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