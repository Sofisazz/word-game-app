<?php
require_once '../config/database.php';
require_once __DIR__ . '/../../config/cors.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['username']) || !isset($data['email']) || !isset($data['password'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

$username = trim($data['username']);
$email = trim($data['email']);
$password = $data['password'];

if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(['error' => 'Password must be at least 6 characters long']);
    exit;
}

$database = new Database();
$db = $database->getConnection();

$check_query = "SELECT id FROM users WHERE username = :username OR email = :email";
$check_stmt = $db->prepare($check_query);
$check_stmt->bindParam(':username', $username);
$check_stmt->bindParam(':email', $email);
$check_stmt->execute();

if ($check_stmt->rowCount() > 0) {
    http_response_code(409);
    echo json_encode(['error' => 'Username or email already exists']);
    exit;
}

$hashed_password = password_hash($password, PASSWORD_DEFAULT);
$insert_query = "INSERT INTO users (username, email, password_hash) VALUES (:username, :email, :password)";
$insert_stmt = $db->prepare($insert_query);
$insert_stmt->bindParam(':username', $username);
$insert_stmt->bindParam(':email', $email);
$insert_stmt->bindParam(':password', $hashed_password);

if ($insert_stmt->execute()) {
    $user_id = $db->lastInsertId();
    echo json_encode([
        'success' => true,
        'message' => 'User registered successfully',
        'user' => [
            'id' => $user_id,
            'username' => $username,
            'email' => $email
        ]
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to register user']);
}
?>