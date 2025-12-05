<?php
// backend/api/wrong_words.php

header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/auth.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode([
        "message" => "Не авторизован",
        "session" => $_SESSION ?? []
    ]);
    exit();
}

$user_id = (int)$_SESSION['user_id'];
error_log("Wrong words API: User authenticated with ID: " . $user_id);

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];
$uri = $_SERVER['REQUEST_URI'];
$uri_parts = explode('/', trim($uri, '/'));
$endpoint = end($uri_parts);

// Убираем параметры из endpoint
$endpoint = strtok($endpoint, '?');

switch ($method) {
    case 'GET':
        if (strpos($uri, 'check/') !== false) {
            $parts = explode('check/', $uri);
            $word_id = end($parts);
            checkWord($db, $user_id, $word_id);
        } else {
            getUserWrongWords($db, $user_id);
        }
        break;
        
    case 'POST':
        addWrongWord($db, $user_id);
        break;
        
    case 'PUT':
        if (is_numeric($endpoint)) {
            updateWrongWord($db, $user_id, $endpoint);
        } else {
            http_response_code(400);
            echo json_encode(["message" => "Неверный ID"]);
        }
        break;
        
    case 'DELETE':
        if ($endpoint === 'clear_all') {
            clearAllWrongWords($db, $user_id);
        } else if (is_numeric($endpoint)) {
            deleteWrongWord($db, $user_id, $endpoint);
        } else {
            http_response_code(400);
            echo json_encode(["message" => "Неверный запрос"]);
        }
        break;
        
    default:
        http_response_code(405);
        echo json_encode(["message" => "Метод не поддерживается"]);
}

function getUserWrongWords($db, $user_id) {
    try {
        error_log("Getting wrong words for user_id: " . $user_id);
        
        $query = "
            SELECT wa.id, wa.word_id, wa.mistakes, wa.last_practice, wa.created_at,
                   w.original_word, w.translation, w.example_sentence
            FROM wrong_answers wa
            LEFT JOIN words w ON wa.word_id = w.id
            WHERE wa.user_id = :user_id
            ORDER BY wa.mistakes DESC, wa.last_practice ASC
        ";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        
        $wrong_words = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        error_log("Fetched " . count($wrong_words) . " wrong words");
        
        echo json_encode($wrong_words);
        
    } catch (PDOException $e) {
        error_log("Database error in getUserWrongWords: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            "message" => "Ошибка базы данных: " . $e->getMessage()
        ]);
    }
}

function addWrongWord($db, $user_id) {
    $data = json_decode(file_get_contents("php://input"));
    
    if (!isset($data->word_id)) {
        http_response_code(400);
        echo json_encode(["message" => "Не указан word_id"]);
        return;
    }
    
    try {
        // Проверяем, существует ли уже запись
        $check_query = "SELECT id, mistakes FROM wrong_answers 
                       WHERE user_id = :user_id AND word_id = :word_id";
        $check_stmt = $db->prepare($check_query);
        $check_stmt->bindParam(':user_id', $user_id);
        $check_stmt->bindParam(':word_id', $data->word_id);
        $check_stmt->execute();
        
        if ($check_stmt->rowCount() > 0) {
            // Увеличиваем счетчик ошибок
            $row = $check_stmt->fetch(PDO::FETCH_ASSOC);
            $new_mistakes = $row['mistakes'] + 1;
            
            $update_query = "UPDATE wrong_answers 
                            SET mistakes = :mistakes, last_practice = NOW() 
                            WHERE id = :id";
            $update_stmt = $db->prepare($update_query);
            $update_stmt->bindParam(':mistakes', $new_mistakes);
            $update_stmt->bindParam(':id', $row['id']);
            $update_stmt->execute();
            
            echo json_encode([
                "message" => "Счетчик ошибок обновлен",
                "mistakes" => $new_mistakes
            ]);
        } else {
            // Добавляем новую запись
            $insert_query = "INSERT INTO wrong_answers (user_id, word_id, mistakes, created_at, last_practice) 
                            VALUES (:user_id, :word_id, 1, NOW(), NOW())";
            $insert_stmt = $db->prepare($insert_query);
            $insert_stmt->bindParam(':user_id', $user_id);
            $insert_stmt->bindParam(':word_id', $data->word_id);
            $insert_stmt->execute();
            
            http_response_code(201);
            echo json_encode([
                "message" => "Слово добавлено в список для повторения",
                "id" => $db->lastInsertId()
            ]);
        }
        
    } catch (PDOException $e) {
        error_log("Error in addWrongWord: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(["message" => "Ошибка базы данных: " . $e->getMessage()]);
    }
}

function updateWrongWord($db, $user_id, $wrong_word_id) {
    $data = json_decode(file_get_contents("php://input"));
    
    try {
        $query = "SELECT mistakes FROM wrong_answers 
                  WHERE id = :id AND user_id = :user_id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':id', $wrong_word_id);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();
        
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(["message" => "Запись не найдена"]);
            return;
        }
        
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $current_mistakes = $row['mistakes'];
        
        if (isset($data->action) && $data->action === 'increment') {
            $new_mistakes = $current_mistakes + 1;
        } else {
            $new_mistakes = isset($data->mistakes) ? $data->mistakes : $current_mistakes;
        }
        
        $update_query = "UPDATE wrong_answers 
                        SET mistakes = :mistakes, last_practice = NOW() 
                        WHERE id = :id AND user_id = :user_id";
        $update_stmt = $db->prepare($update_query);
        $update_stmt->bindParam(':mistakes', $new_mistakes);
        $update_stmt->bindParam(':id', $wrong_word_id);
        $update_stmt->bindParam(':user_id', $user_id);
        $update_stmt->execute();
        
        echo json_encode([
            "message" => "Счетчик ошибок обновлен",
            "mistakes" => $new_mistakes
        ]);
        
    } catch (PDOException $e) {
        error_log("Error in updateWrongWord: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(["message" => "Ошибка базы данных: " . $e->getMessage()]);
    }
}

function deleteWrongWord($db, $user_id, $wrong_word_id) {
    try {
        $query = "DELETE FROM wrong_answers 
                  WHERE id = :id AND user_id = :user_id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':id', $wrong_word_id);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            echo json_encode(["message" => "Слово удалено из списка для повторения"]);
        } else {
            http_response_code(404);
            echo json_encode(["message" => "Запись не найдена"]);
        }
        
    } catch (PDOException $e) {
        error_log("Error in deleteWrongWord: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(["message" => "Ошибка базы данных: " . $e->getMessage()]);
    }
}

function clearAllWrongWords($db, $user_id) {
    try {
        $query = "DELETE FROM wrong_answers WHERE user_id = :user_id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();
        
        $deleted_count = $stmt->rowCount();
        
        echo json_encode([
            "message" => "Все слова удалены из списка для повторения",
            "deleted_count" => $deleted_count
        ]);
        
    } catch (PDOException $e) {
        error_log("Error in clearAllWrongWords: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(["message" => "Ошибка базы данных: " . $e->getMessage()]);
    }
}

function checkWord($db, $user_id, $word_id) {
    try {
        $query = "SELECT COUNT(*) as count FROM wrong_answers 
                  WHERE user_id = :user_id AND word_id = :word_id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->bindParam(':word_id', $word_id);
        $stmt->execute();
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode([
            "exists" => $result['count'] > 0
        ]);
        
    } catch (PDOException $e) {
        error_log("Error in checkWord: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(["message" => "Ошибка базы данных: " . $e->getMessage()]);
    }
}
?>