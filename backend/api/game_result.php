<?php


header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config/database.php';
function getLevelProgress($total_xp) {
    $base_xp = 250;
    $level = 1;
    $xp_accumulated = 0;
    
 
    while (true) {
        $xp_for_next_level = $base_xp + ($level - 1) * 100;
        
        if ($total_xp < ($xp_accumulated + $xp_for_next_level)) {
            break;
        }
        
        $xp_accumulated += $xp_for_next_level;
        $level++;
    }
    

    $current_xp_in_level = $total_xp - $xp_accumulated;
    
    
    $next_level_xp_required = $base_xp + ($level - 1) * 100;
    
 
    $xp_needed_for_next_level = max(0, $next_level_xp_required - $current_xp_in_level);
    

    $progress_percentage = $next_level_xp_required > 0 ? 
        round(max(0, min(100, $current_xp_in_level / $next_level_xp_required * 100)), 1) : 0;
    
    return [
        'level' => $level,
        'total_xp' => $total_xp,
        'current_xp' => max(0, $current_xp_in_level),
        'next_level_xp' => $next_level_xp_required,
        'current_level_xp_accumulated' => $xp_accumulated,
        'xp_needed' => $xp_needed_for_next_level,
        'progress_percentage' => $progress_percentage
    ];
}

function calculateNewLevel($total_xp) {
    $base_xp = 250;
    $level = 1;
    $xp_accumulated = 0;
    
    while (true) {
        $xp_for_next_level = $base_xp + ($level - 1) * 100;
        
        if ($total_xp < ($xp_accumulated + $xp_for_next_level)) {
            return $level;
        }
        
        $xp_accumulated += $xp_for_next_level;
        $level++;
    }
}

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


    $xp_earned = $correct_answers * 10;
    

    if ($correct_answers === $total_questions && $total_questions > 0) {
        $xp_earned += 50;
        error_log("Perfect game bonus! +50 XP");
    }
    
    error_log("XP earned: $xp_earned");


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


    $checkStmt = $pdo->prepare("SELECT * FROM user_stats WHERE user_id = ?");
    $checkStmt->execute([$user_id]);
    
    if ($checkStmt->rowCount() > 0) {
   
        $currentStats = $checkStmt->fetch(PDO::FETCH_ASSOC);
        $current_total_xp = (int)$currentStats['total_xp'];
        $new_total_xp = $current_total_xp + $xp_earned;
        $new_level = calculateNewLevel($new_total_xp);
        
 
        $perfect_games_increment = ($correct_answers === $total_questions && $total_questions > 0) ? 1 : 0;
        
        
        $stmt = $pdo->prepare("
            UPDATE user_stats 
            SET total_games_played = total_games_played + 1,
                total_correct_answers = total_correct_answers + ?,
                total_xp = total_xp + ?,
                level = ?,
                total_words_learned = total_words_learned + ?,
                perfect_games = perfect_games + ?,
                updated_at = NOW()
            WHERE user_id = ?
        ");
        
        $result = $stmt->execute([
            $correct_answers,
            $xp_earned,
            $new_level,
            $words_learned,
            $perfect_games_increment,
            $user_id
        ]);
        
        error_log("Updating user stats - Old level: {$currentStats['level']}, New level: $new_level, Total XP: $new_total_xp");
    } else {
 
        $new_level = calculateNewLevel($xp_earned);
        
        $stmt = $pdo->prepare("
            INSERT INTO user_stats (
                user_id, 
                total_games_played, 
                total_correct_answers,
                total_xp,
                level, 
                total_words_learned,
                current_streak, 
                best_streak, 
                perfect_games,
                created_at, 
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, NOW(), NOW())
        ");
        
        $result = $stmt->execute([
            $user_id, 
            1, 
            $correct_answers, 
            $xp_earned, 
            $new_level, 
            $words_learned, 
            ($correct_answers === $total_questions && $total_questions > 0) ? 1 : 0 
        ]);
        
        error_log("Creating new user stats - Level: $new_level, Total XP: $xp_earned");
    }

    if ($result) {
        error_log("Successfully updated user_stats");
    } else {
        $errorInfo = $stmt->errorInfo();
        error_log("Failed to update user_stats: " . print_r($errorInfo, true));
    }


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
                    
                    try {
                     
                        $updateStmt = $pdo->prepare("
                            INSERT INTO word_progress (user_id, word_id, times_seen, times_correct, last_reviewed)
                            VALUES (?, ?, 1, 1, NOW())
                            ON DUPLICATE KEY UPDATE
                                times_seen = times_seen + 1,
                                times_correct = times_correct + 1,
                                last_reviewed = NOW()
                        ");
                        $updateStmt->execute([$user_id, $word_id]);
                    } catch (Exception $e) {
                        error_log("Error updating word_progress for correct answer: " . $e->getMessage());
                    }
                    
                } else {
                    $incorrect_count++;
                    error_log("Incorrect answer for word_id: " . $word_id);
                    
                    try {
                        $checkWrong = $pdo->prepare("
                            SELECT id, mistakes FROM wrong_answers 
                            WHERE user_id = ? AND word_id = ?
                        ");
                        $checkWrong->execute([$user_id, $word_id]);
                        
                        if ($row = $checkWrong->fetch(PDO::FETCH_ASSOC)) {
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
                            $insertWrong = $pdo->prepare("
                                INSERT INTO wrong_answers (user_id, word_id, mistakes, created_at, last_practice)
                                VALUES (?, ?, 1, NOW(), NOW())
                            ");
                            $insertWrong->execute([$user_id, $word_id]);
                            error_log("Created wrong_answers record for word_id: " . $word_id);
                        }
                        
           
                        $updateStmt = $pdo->prepare("
                            INSERT INTO word_progress (user_id, word_id, times_seen, times_correct, last_reviewed)
                            VALUES (?, ?, 1, 0, NOW())
                            ON DUPLICATE KEY UPDATE
                                times_seen = times_seen + 1,
                                last_reviewed = NOW()
                        ");
                        $updateStmt->execute([$user_id, $word_id]);
                        
                    } catch (Exception $e) {
                        error_log("Error saving wrong answer: " . $e->getMessage());
                    }
                }
            }
        }
        
        error_log("Total correct: $correct_count, Total incorrect: $incorrect_count");
    }


    error_log("=== CHECKING ACHIEVEMENTS FOR USER $user_id ===");
    
    $newAchievements = [];
    
    try {

        $achievementsQuery = $pdo->prepare("SELECT * FROM achievements");
        $achievementsQuery->execute();
        $allAchievements = $achievementsQuery->fetchAll(PDO::FETCH_ASSOC);
        
        error_log("Total achievements available: " . count($allAchievements));
        

        $userAchievementsQuery = $pdo->prepare("SELECT achievement_id FROM user_achievements WHERE user_id = ?");
        $userAchievementsQuery->execute([$user_id]);
        $userAchievementIds = $userAchievementsQuery->fetchAll(PDO::FETCH_COLUMN, 0);
        
        error_log("User already has achievements: " . print_r($userAchievementIds, true));
        
        
        $fullStatsQuery = $pdo->prepare("
            SELECT 
                total_games_played,
                total_correct_answers,
                total_xp,
                total_words_learned,
                level,
                perfect_games
            FROM user_stats 
            WHERE user_id = ?
        ");
        $fullStatsQuery->execute([$user_id]);
        $userFullStats = $fullStatsQuery->fetch(PDO::FETCH_ASSOC);
        
        if ($userFullStats) {
            error_log("User full stats: " . print_r($userFullStats, true));
            
            foreach ($allAchievements as $achievement) {
                $achievementId = (int)$achievement['id'];

                if (in_array($achievementId, $userAchievementIds)) {
                    error_log("Achievement $achievementId already earned, skipping");
                    continue;
                }
                
                $conditionType = $achievement['condition_type'];
                $conditionValue = (int)$achievement['condition_value'];
                $achieved = false;
                
                switch ($conditionType) {
                    case 'games_played':
                        $currentValue = (int)$userFullStats['total_games_played'];
                        $achieved = ($currentValue >= $conditionValue);
                        error_log("Checking 'games_played': $currentValue >= $conditionValue = " . ($achieved ? 'YES' : 'NO'));
                        break;
                        
                    case 'correct_answers':
                        $currentValue = (int)$userFullStats['total_correct_answers'];
                        $achieved = ($currentValue >= $conditionValue);
                        error_log("Checking 'correct_answers': $currentValue >= $conditionValue = " . ($achieved ? 'YES' : 'NO'));
                        break;
                        
                    case 'words_learned':
                        $currentValue = (int)$userFullStats['total_words_learned'];
                        $achieved = ($currentValue >= $conditionValue);
                        error_log("Checking 'words_learned': $currentValue >= $conditionValue = " . ($achieved ? 'YES' : 'NO'));
                        break;
                        
                    case 'total_xp':
                        $currentValue = (int)$userFullStats['total_xp'];
                        $achieved = ($currentValue >= $conditionValue);
                        error_log("Checking 'total_xp': $currentValue >= $conditionValue = " . ($achieved ? 'YES' : 'NO'));
                        break;
                        
                    case 'perfect_games':
                        $currentValue = (int)$userFullStats['perfect_games'];
                        $achieved = ($currentValue >= $conditionValue);
                        error_log("Checking 'perfect_games': $currentValue >= $conditionValue = " . ($achieved ? 'YES' : 'NO'));
                        break;
                        
                    case 'level':
                        $currentValue = (int)$userFullStats['level'];
                        $achieved = ($currentValue >= $conditionValue);
                        error_log("Checking 'level': $currentValue >= $conditionValue = " . ($achieved ? 'YES' : 'NO'));
                        break;
                        
                    default:
                        error_log("Unknown condition type: $conditionType");
                        continue 2;
                }
                
                if ($achieved) {
                    error_log("User earned achievement: {$achievement['name']} (ID: $achievementId)");
                    
                    $insertAchievement = $pdo->prepare("
                        INSERT INTO user_achievements (user_id, achievement_id, earned_at) 
                        VALUES (?, ?, NOW())
                    ");
                    $insertResult = $insertAchievement->execute([$user_id, $achievementId]);
                    
                    if ($insertResult) {
                        $xpReward = (int)$achievement['xp_reward'];
                        if ($xpReward > 0) {
                            error_log("Adding $xpReward XP for achievement");
                            
             
                            $new_total_xp = (int)$userFullStats['total_xp'] + $xpReward;
                            $new_level = calculateNewLevel($new_total_xp);
                            
                            $updateXp = $pdo->prepare("
                                UPDATE user_stats 
                                SET total_xp = total_xp + ?,
                                    level = ?,
                                    updated_at = NOW()
                                WHERE user_id = ?
                            ");
                            $updateXp->execute([$xpReward, $new_level, $user_id]);
                        }
                        
                        $newAchievements[] = [
                            'id' => $achievementId,
                            'name' => $achievement['name'],
                            'description' => $achievement['description'],
                            'xp_reward' => $xpReward,
                            'icon' => $achievement['icon'] ?? '🏆',
                            'image_url' => $achievement['image_url'] ?? ''
                        ];
                    }
                }
            }
            
            error_log("New achievements earned: " . count($newAchievements));
        }
        
    } catch (Exception $e) {
        error_log("Error checking achievements: " . $e->getMessage());
    }


    $pdo->commit();
    error_log("Transaction committed successfully");


    try {
        $updateActivityStmt = $pdo->prepare("UPDATE users SET last_activity = NOW() WHERE id = ?");
        $updateActivityStmt->execute([$user_id]);
        error_log("Updated last_activity for user ID: $user_id");
    } catch (Exception $e) {
        error_log("Failed to update last_activity: " . $e->getMessage());
    }


$stmt = $pdo->prepare("SELECT * FROM user_stats WHERE user_id = ?");
$stmt->execute([$user_id]);
$user_stats = $stmt->fetch(PDO::FETCH_ASSOC);


if ($user_stats) {
    $total_xp = $user_stats['total_xp'] ?? 0;
    $level_info = getLevelProgress($total_xp); 
} else {
    $level_info = [];
}

    $wrongCountStmt = $pdo->prepare("SELECT COUNT(*) as wrong_count FROM wrong_answers WHERE user_id = ?");
    $wrongCountStmt->execute([$user_id]);
    $wrong_count = $wrongCountStmt->fetch(PDO::FETCH_ASSOC)['wrong_count'];
    
    error_log("Total wrong words in database for user $user_id: $wrong_count");

$response = [
    'success' => true,
    'message' => 'Результат сохранён',
    'xp_earned' => $xp_earned,
    'correct_answers' => $correct_answers,
    'wrong_count' => $wrong_count,
    'user_stats' => $user_stats,
    'level_info' => $level_info  
];

    if (count($newAchievements) > 0) {
        $response['new_achievements'] = $newAchievements;
        $response['message'] = 'Результат сохранён. Получены новые достижения!';
    }

$response['event_data'] = [
    'xp_earned' => $xp_earned,
    'level_info' => $level_info,
    'new_achievements' => $newAchievements ?? []
];
    echo json_encode($response);

} catch (Exception $e) {

    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Game result save error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode(['error' => 'Ошибка сохранения результата: ' . $e->getMessage()]);
}

error_log("=== SAVE GAME RESULT END ===");
?>