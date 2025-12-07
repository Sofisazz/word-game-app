<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../auth.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if (!isAdmin()) {
    http_response_code(403);
    echo json_encode(['error' => 'Доступ запрещен']);
    exit;
}

$user_id = $_GET['user_id'] ?? null;

if (!$user_id || !is_numeric($user_id)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid user ID']);
    exit;
}

$database = new Database();
$pdo = $database->getConnection();

try {

    $user_query = "SELECT id, username, email, display_name, created_at, last_activity, role FROM users WHERE id = ?";
    $user_stmt = $pdo->prepare($user_query);
    $user_stmt->execute([$user_id]);
    $user = $user_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit;
    }


    $stats_query = "SELECT * FROM user_stats WHERE user_id = ?";
    $stats_stmt = $pdo->prepare($stats_query);
    $stats_stmt->execute([$user_id]);
    $stats = $stats_stmt->fetch(PDO::FETCH_ASSOC);


    $words_query = "SELECT COUNT(*) as learned_words FROM word_progress WHERE user_id = ? AND times_correct >= 2";
    $words_stmt = $pdo->prepare($words_query);
    $words_stmt->execute([$user_id]);
    $words_data = $words_stmt->fetch(PDO::FETCH_ASSOC);


    $achievements_query = "SELECT COUNT(*) as achievements_count FROM user_achievements WHERE user_id = ?";
    $achievements_stmt = $pdo->prepare($achievements_query);
    $achievements_stmt->execute([$user_id]);
    $achievements_data = $achievements_stmt->fetch(PDO::FETCH_ASSOC);


    $report = [
        'user_info' => $user,
        'statistics' => $stats ?: [
            'total_games_played' => 0,
            'total_correct_answers' => 0,
            'total_xp' => 0,
            'level' => 1
        ],
        'learned_words' => $words_data['learned_words'] ?? 0,
        'achievements_count' => $achievements_data['achievements_count'] ?? 0,
        'report_generated' => date('Y-m-d H:i:s')
    ];


    header('Content-Type: application/json');
    header('Content-Disposition: attachment; filename="user_report_' . $user['username'] . '.json"');
    echo json_encode($report, JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
?>