<?php
require_once 'config.php';
require_once __DIR__ . '/../config/cors.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

if (isset($_SESSION['user'])) {
    echo json_encode([
        'success' => true,
        'user' => $_SESSION['user']
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'No active session'
    ]);
}
?>