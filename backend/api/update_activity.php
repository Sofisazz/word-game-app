<?php
require_once 'config.php';
require_once 'config/database.php';
require_once 'auth.php';

if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authorized']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$userId = $data['user_id'] ?? $_SESSION['user']['id'] ?? null;

if (!$userId) {
    http_response_code(400);
    echo json_encode(['error' => 'User ID required']);
    exit;
}

try {
    $database = new Database();
    $pdo = $database->getConnection();
    
    $stmt = $pdo->prepare("UPDATE users SET last_activity = NOW() WHERE id = ?");
    $stmt->execute([$userId]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Activity updated',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>