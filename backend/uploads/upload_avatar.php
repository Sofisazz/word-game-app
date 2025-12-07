<?php
require_once '../config/database.php';
require_once '../cors.php';

error_log("Upload avatar called");
error_log("POST data: " . print_r($_POST, true));
error_log("FILES data: " . print_r($_FILES, true));

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

if (!isset($_POST['user_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'User ID is required']);
    exit;
}

$user_id = $_POST['user_id'];

$upload_dir = __DIR__ . '/../uploads/avatars/';

if (!file_exists($upload_dir)) {
    mkdir($upload_dir, 0777, true);
}

if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'File upload failed']);
    exit;
}

$file = $_FILES['avatar'];
$allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
$max_size = 2 * 1024 * 1024;


$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime_type = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mime_type, $allowed_types)) {
    http_response_code(400);
    echo json_encode(['error' => 'Only JPG, PNG, GIF and WebP images are allowed']);
    exit;
}


if ($file['size'] > $max_size) {
    http_response_code(400);
    echo json_encode(['error' => 'File size must be less than 2MB']);
    exit;
}

$file_extension = pathinfo($file['name'], PATHINFO_EXTENSION);
$filename = 'avatar_' . $user_id . '_' . time() . '.' . $file_extension;
$filepath = $upload_dir . $filename;

if (!move_uploaded_file($file['tmp_name'], $filepath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save file']);
    exit;
}

$database = new Database();
$db = $database->getConnection();

try {
    $avatar_url = '/backend/uploads/avatars/' . $filename;
    
    $update_query = "UPDATE users SET avatar = :avatar WHERE id = :user_id";
    $update_stmt = $db->prepare($update_query);
    $update_stmt->execute([
        ':avatar' => $avatar_url,
        ':user_id' => $user_id
    ]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Avatar uploaded successfully',
        'avatar_url' => $avatar_url
    ]);
    
} catch (PDOException $e) {
    unlink($filepath);
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>