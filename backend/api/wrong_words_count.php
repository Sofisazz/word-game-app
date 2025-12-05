<?php
// backend/api/wrong_words_count.php

header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/auth.php';

// Проверка авторизации
$auth = new Auth();
$user_id = $auth->validateToken();

if (!$user_id) {
    http_response_code(401);
    echo json_encode(["message" => "Не авторизован"]);
    exit();
}

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $query = "SELECT COUNT(*) as count FROM wrong_answers WHERE user_id = :user_id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode([
            "count" => (int)$result['count'],
            "success" => true
        ]);
        
    } catch (PDOException $e) {
        error_log("Database error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            "message" => "Ошибка базы данных",
            "success" => false,
            "count" => 0
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode(["message" => "Метод не поддерживается"]);
}
?>