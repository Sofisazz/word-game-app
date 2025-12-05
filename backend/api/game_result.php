<?php
// backend/api/game_result.php

header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config/database.php';

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
$total_questions = (int)($input['total_questions'] ?? 5);
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
        INSERT INTO game_results (user_id, game_type, score, total_questions, correct_answers, words_learned, time_spent, xp_earned)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    
    $result = $stmt->execute([
        $user_id, 
        $game_type, 
        $correct_answers,
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
        $errorInfo = $stmt->errorInfo();
        error_log("Failed to insert into game_results: " . print_r($errorInfo, true));
        throw new Exception("Failed to save game result: " . $errorInfo[2]);
    }

    // 2. Обновляем или создаем запись в user_stats
    // Проверим, существует ли запись для пользователя
    $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM user_stats WHERE user_id = ?");
    $checkStmt->execute([$user_id]);
    $userStatsExists = $checkStmt->fetchColumn() > 0;

    if ($userStatsExists) {
        // Обновляем существующую запись
        $stmt = $pdo->prepare("
            UPDATE user_stats 
            SET total_games_played = total_games_played + 1,
                total_correct_answers = total_correct_answers + ?,  -- Используем правильное имя поля с опечаткой
                total_xp = total_xp + ?,                            -- В таблице это total_xp
                total_words_learned = total_words_learned + ?,    -- В таблице total_words_learned
                level = FLOOR((total_xp + ?) / 100) + 1,
                updated_at = NOW()
            WHERE user_id = ?
        ");
        
        $result = $stmt->execute([
            $correct_answers,
            $xp_earned,
            $words_learned,
            $xp_earned,
            $user_id
        ]);
    } else {
        // Создаем новую запись
        $stmt = $pdo->prepare("
            INSERT INTO user_stats (
                user_id, 
                total_games_played, 
                total_correct_answers,   -- Используем правильное имя поля с опечаткой
                total_xp,                -- В таблице это total_xp
                level, 
                total_words_learned,    -- В таблице total_words_learned
                current_stress, 
                key_stream, 
                perfect_games,
                created_at, 
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, NOW(), NOW())
        ");
        
        $result = $stmt->execute([
            $user_id, 
            1, // total_games_played
            $correct_answers, // total_correct_answers
            $xp_earned, // total_xp
            1, // level
            $words_learned // total_words_learned
        ]);
    }

    if ($result) {
        error_log("Successfully updated user_stats");
    } else {
        $errorInfo = $stmt->errorInfo();
        error_log("Failed to update user_stats: " . print_r($errorInfo, true));
        // Не прерываем выполнение, только логируем ошибку
    }

    // 3. Обновляем прогресс по словам и сохраняем неправильные ответы
    if (isset($input['results']) && is_array($input['results'])) {
        error_log("Processing word results: " . count($input['results']) . " words");
        
        $correct_count = 0;
        $incorrect_count = 0;
        
        foreach ($input['results'] as $index => $result) {
            if (isset($result['word_id']) && isset($result['is_correct'])) {
                $word_id = (int)$result['word_id'];
                $is_correct = (bool)$result['is_correct'];
                
                if ($is_correct) {
                    $correct_count++;
                    error_log("Correct answer for word_id: " . $word_id);
                    
                    // Обновляем word_progress для правильных ответов
                    try {
                        $updateStmt = $pdo->prepare("
                            INSERT INTO word_progress (user_id, word_id, times_scored, times_bcorrect, last_reviewed)
                            VALUES (?, ?, 1, 1, NOW())
                            ON DUPLICATE KEY UPDATE
                                times_scored = times_scored + 1,
                                times_bcorrect = times_bcorrect + 1,
                                last_reviewed = NOW()
                        ");
                        $updateStmt->execute([$user_id, $word_id]);
                    } catch (Exception $e) {
                        error_log("Error updating word_progress for correct answer: " . $e->getMessage());
                    }
                    
                } else {
                    $incorrect_count++;
                    error_log("Incorrect answer for word_id: " . $word_id);
                    
                    // Сохраняем неправильный ответ в таблицу wrong_answers
                    try {
                        // Проверяем, есть ли уже запись для этого слова
                        $checkWrong = $pdo->prepare("
                            SELECT id, mistakes FROM wrong_answers 
                            WHERE user_id = ? AND word_id = ?
                        ");
                        $checkWrong->execute([$user_id, $word_id]);
                        
                        if ($row = $checkWrong->fetch(PDO::FETCH_ASSOC)) {
                            // Обновляем существующую запись
                            $new_mistakes = $row['mistakes'] + 1;
                            $updateWrong = $pdo->prepare("
                                UPDATE wrong_answers 
                                SET mistakes = ?, 
                                    last_practice = NOW()
                                WHERE id = ?
                            ");
                            $updateWrong->execute([$new_mistakes, $row['id']]);
                            error_log("Updated wrong_answers for word_id: " . $word_id . ", new mistakes: " . $new_mistakes);
                        } else {
                            // Создаем новую запись
                            $insertWrong = $pdo->prepare("
                                INSERT INTO wrong_answers (user_id, word_id, mistakes, created_at, last_practice)
                                VALUES (?, ?, 1, NOW(), NOW())
                            ");
                            $insertWrong->execute([$user_id, $word_id]);
                            error_log("Created wrong_answers record for word_id: " . $word_id);
                        }
                        
                        // Также обновляем word_progress для неправильных ответов
                        $updateStmt = $pdo->prepare("
                            INSERT INTO word_progress (user_id, word_id, times_scored, times_bcorrect, last_reviewed)
                            VALUES (?, ?, 1, 0, NOW())
                            ON DUPLICATE KEY UPDATE
                                times_scored = times_scored + 1,
                                last_reviewed = NOW()
                        ");
                        $updateStmt->execute([$user_id, $word_id]);
                        
                    } catch (Exception $e) {
                        error_log("Error saving wrong answer: " . $e->getMessage());
                        // Не прерываем выполнение, продолжаем со следующими словами
                    }
                }
            }
        }
        
        error_log("Total correct: $correct_count, Total incorrect: $incorrect_count");
        
    } else {
        error_log("No word results provided");
    }

    $pdo->commit();
    error_log("Transaction committed successfully");

    // Получаем обновленные данные пользователя
    $stmt = $pdo->prepare("SELECT * FROM user_stats WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $user_stats = $stmt->fetch(PDO::FETCH_ASSOC);

    // Получаем количество слов в wrong_answers для отладки
    $wrongCountStmt = $pdo->prepare("SELECT COUNT(*) as wrong_count FROM wrong_answers WHERE user_id = ?");
    $wrongCountStmt->execute([$user_id]);
    $wrong_count = $wrongCountStmt->fetch(PDO::FETCH_ASSOC)['wrong_count'];
    
    error_log("Total wrong words in database for user $user_id: $wrong_count");

    echo json_encode([
        'success' => true,
        'message' => 'Результат сохранён',
        'xp_earned' => $xp_earned,
        'correct_answers' => $correct_answers,
        'wrong_count' => $wrong_count, // Добавляем для отладки
        'user_stats' => $user_stats
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