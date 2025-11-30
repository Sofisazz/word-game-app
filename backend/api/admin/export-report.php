<?php
// backend/api/admin/export-report.php

header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../auth.php';

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

error_log("=== EXPORT REPORT START ===");
error_log("Exporting report for user_id: $user_id");

$database = new Database();
$pdo = $database->getConnection();

try {
    // 1. Получаем основную информацию о пользователе
    $user_query = "SELECT id, username, email, display_name, created_at, last_activity, role FROM users WHERE id = ?";
    $user_stmt = $pdo->prepare($user_query);
    $user_stmt->execute([$user_id]);
    $user = $user_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        error_log("User not found: $user_id");
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit;
    }

    error_log("User found: " . $user['username']);

    // 2. Получаем статистику пользователя из user_stats
    $stats_query = "SELECT * FROM user_stats WHERE user_id = ?";
    $stats_stmt = $pdo->prepare($stats_query);
    $stats_stmt->execute([$user_id]);
    $stats = $stats_stmt->fetch(PDO::FETCH_ASSOC);

    if ($stats) {
        error_log("User stats found: " . print_r($stats, true));
    } else {
        error_log("No user stats found for user: $user_id");
    }

    // 3. Получаем количество выученных слов из word_progress
    $words_query = "
        SELECT COUNT(*) as learned_words 
        FROM word_progress 
        WHERE user_id = ? AND times_correct >= 2
    ";
    $words_stmt = $pdo->prepare($words_query);
    $words_stmt->execute([$user_id]);
    $words_data = $words_stmt->fetch(PDO::FETCH_ASSOC);

    error_log("Learned words: " . ($words_data['learned_words'] ?? 0));

    // 4. Получаем достижения
    $achievements_query = "SELECT COUNT(*) as achievements_count FROM user_achievements WHERE user_id = ?";
    $achievements_stmt = $pdo->prepare($achievements_query);
    $achievements_stmt->execute([$user_id]);
    $achievements_data = $achievements_stmt->fetch(PDO::FETCH_ASSOC);

    error_log("Achievements count: " . ($achievements_data['achievements_count'] ?? 0));

    // 5. Получаем общую статистику из game_results
    $game_stats_query = "
        SELECT 
            COUNT(*) as total_games,
            SUM(correct_answers) as total_correct,
            SUM(xp_earned) as total_xp,
            AVG(correct_answers) as avg_score
        FROM game_results 
        WHERE user_id = ?
    ";
    $game_stats_stmt = $pdo->prepare($game_stats_query);
    $game_stats_stmt->execute([$user_id]);
    $game_stats = $game_stats_stmt->fetch(PDO::FETCH_ASSOC);

    error_log("Game stats: " . print_r($game_stats, true));

    // 6. Если в user_stats нет данных, но есть в game_results - создаем запись
    if (!$stats && $game_stats['total_games'] > 0) {
        error_log("Creating user_stats from game_results data");
        $total_xp = $game_stats['total_xp'] ?? 0;
        $level = max(1, floor($total_xp / 100) + 1);
        
        $insert_stats = $pdo->prepare("
            INSERT INTO user_stats (user_id, total_games_played, total_correct_answers, total_xp, level)
            VALUES (?, ?, ?, ?, ?)
        ");
        $result = $insert_stats->execute([
            $user_id,
            $game_stats['total_games'] ?? 0,
            $game_stats['total_correct'] ?? 0,
            $total_xp,
            $level
        ]);
        
        if ($result) {
            error_log("Successfully created user_stats");
            // Получаем обновленную статистику
            $stats_stmt->execute([$user_id]);
            $stats = $stats_stmt->fetch(PDO::FETCH_ASSOC);
        } else {
            error_log("Failed to create user_stats");
        }
    }

    // Формируем отчет
    $report = [
        'user_info' => $user,
        'statistics' => $stats ?: [
            'total_games_played' => 0,
            'total_correct_answers' => 0,
            'total_xp' => 0,
            'level' => 1
        ],
        'game_statistics' => $game_stats ?: [
            'total_games' => 0,
            'total_correct' => 0,
            'total_xp' => 0,
            'avg_score' => 0
        ],
        'learned_words' => $words_data['learned_words'] ?? 0,
        'achievements_count' => $achievements_data['achievements_count'] ?? 0,
        'report_generated' => date('Y-m-d H:i:s')
    ];

    error_log("Final report: " . print_r($report, true));
    error_log("=== EXPORT REPORT END ===");

    echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    error_log("Database error in export report: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    error_log("Server error in export report: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
?>