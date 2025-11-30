<?php
// backend/api/user/save-game-result.php

header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../auth.php';

// Включим логирование
error_log("=== SAVE GAME RESULT START ===");
error_log("Request method: " . $_SERVER['REQUEST_METHOD']);
error_log("Input data: " . file_get_contents('php://input'));

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    error_log("No input data received");
    http_response_code(400);
    echo json_encode(['error' => 'No input data']);
    exit;
}

error_log("Parsed input: " . print_r($input, true));

if (!isset($input['user_id']) || !isset($input['correct_answers'])) {
    error_log("Missing required fields: user_id or correct_answers");
    http_response_code(400);
    echo json_encode(['error' => 'Недостаточно данных']);
    exit;
}

$user_id = (int)$input['user_id'];
$game_type = $input['game_type'] ?? 'unknown';
$correct_answers = (int)$input['correct_answers'];
$total_questions = (int)$input['total_questions'];
$time_spent = (int)($input['time_spent'] ?? 0);
$words_learned = (int)($input['words_learned'] ?? $correct_answers);

error_log("Processing game result for user: $user_id, correct: $correct_answers, total: $total_questions");

$database = new Database();
$pdo = $database->getConnection();

try {
    $pdo->beginTransaction();

    // Рассчитываем XP
    $xp_earned = $correct_answers * 10;
    error_log("XP earned: $xp_earned");

    // 1. Сохраняем в game_results
    $stmt = $pdo->prepare("
        INSERT INTO game_results (user_id, game_type, score, total_questions, correct_answers, words_learned, time_spent, xp_earned, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    
    $result = $stmt->execute([
        $user_id, 
        $game_type, 
        $correct_answers, // score
        $total_questions, 
        $correct_answers, 
        $words_learned, 
        $time_spent, 
        $xp_earned
    ]);

    if ($result) {
        error_log("Successfully inserted into game_results");
        $game_result_id = $pdo->lastInsertId();
        error_log("Game result ID: $game_result_id");
    } else {
        error_log("Failed to insert into game_results");
        throw new Exception("Failed to save game result");
    }

    // 2. Обновляем или создаем запись в user_stats
    $stmt = $pdo->prepare("
        INSERT INTO user_stats (user_id, total_games_played, total_correct_answers, total_xp, level)
        VALUES (?, 1, ?, ?, 1)
        ON DUPLICATE KEY UPDATE
            total_games_played = total_games_played + 1,
            total_correct_answers = total_correct_answers + ?,
            total_xp = total_xp + ?,
            level = FLOOR((total_xp + ?) / 100) + 1
    ");
    
    $result = $stmt->execute([
        $user_id, 
        $correct_answers, 
        $xp_earned,
        $correct_answers,
        $xp_earned,
        $xp_earned
    ]);

    if ($result) {
        error_log("Successfully updated user_stats");
    } else {
        error_log("Failed to update user_stats");
    }

    // 3. Обновляем прогресс по словам
    if (isset($input['results']) && is_array($input['results'])) {
        error_log("Updating word progress for " . count($input['results']) . " words");
        foreach ($input['results'] as $index => $result) {
            if (isset($result['word_id'])) {
                $times_correct = $result['is_correct'] ? 1 : 0;
                $stmt = $pdo->prepare("
                    INSERT INTO word_progress (user_id, word_id, times_correct, last_practiced)
                    VALUES (?, ?, ?, NOW())
                    ON DUPLICATE KEY UPDATE
                        times_correct = times_correct + VALUES(times_correct),
                        last_practiced = NOW()
                ");
                $word_result = $stmt->execute([$user_id, $result['word_id'], $times_correct]);
                
                if ($word_result) {
                    error_log("Updated word progress for word_id: " . $result['word_id']);
                } else {
                    error_log("Failed to update word progress for word_id: " . $result['word_id']);
                }
            }
        }
    } else {
        error_log("No word results provided");
    }

    $pdo->commit();
    error_log("Transaction committed successfully");

    echo json_encode([
        'success' => true,
        'message' => 'Результат сохранён',
        'xp_earned' => $xp_earned,
        'correct_answers' => $correct_answers
    ]);

} catch (Exception $e) {
    $pdo->rollBack();
    error_log("Game result save error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode(['error' => 'Ошибка сохранения результата: ' . $e->getMessage()]);
}

error_log("=== SAVE GAME RESULT END ===");
?>