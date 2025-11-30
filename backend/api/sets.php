<?php
require_once '../config/database.php';
require_once '../cors.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$database = new Database();
$db = $database->getConnection();

try {
    $query = "SELECT ws.*, COUNT(w.id) as word_count 
              FROM word_sets ws 
              LEFT JOIN words w ON ws.id = w.word_set_id 
              GROUP BY ws.id 
              ORDER BY ws.name";
    
    $stmt = $db->prepare($query);
    $stmt->execute();
    
    $sets = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'data' => $sets]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>