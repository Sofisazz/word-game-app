<?php
require_once '../config/database.php';
require_once '../cors.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$set_id = $_GET['set_id'] ?? null;

if (!$set_id || !is_numeric($set_id)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid set ID']);
    exit;
}

$database = new Database();
$db = $database->getConnection();

try {
    $stmt = $db->prepare("SELECT id, original_word, translation, example_sentence FROM words WHERE word_set_id = ?");
    $stmt->execute([$set_id]);
    $words = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'data' => $words]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>