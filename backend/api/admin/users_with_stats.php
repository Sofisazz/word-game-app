<?php
// backend/api/admin/users_with_stats.php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../auth.php';

$database = new Database();
$pdo = $database->getConnection();

try {
    // Запрос для получения всех пользователей с полной статистикой
    $query = "
        SELECT 
            u.id,
            u.username,
            u.email,
            u.display_name,
            u.created_at,
            u.last_activity,
            u.role,
            u.avatar,
            COALESCE(us.total_games_played, 0) as total_games_played,
            COALESCE(us.total_correct_answers, 0) as total_correct_answers,
            COALESCE(us.total_words_learned, 0) as total_words_learned,
            COALESCE(us.total_xp, 0) as total_xp,
            COALESCE(us.level, 1) as level,
            COALESCE(us.current_streak, 0) as current_streak,
            COALESCE(us.best_streak, 0) as best_streak,
            COALESCE(us.perfect_games, 0) as perfect_games,
            (SELECT COUNT(*) FROM word_progress WHERE user_id = u.id AND times_correct >= 2) as learned_words_count,
            (SELECT COUNT(*) FROM user_achievements WHERE user_id = u.id) as achievements_count,
            (SELECT COUNT(*) FROM game_results WHERE user_id = u.id) as total_game_records
        FROM users u
        LEFT JOIN user_stats us ON u.id = us.user_id
        ORDER BY u.created_at DESC
    ";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute();
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Форматируем даты
    foreach ($users as &$user) {
        // Процент правильных ответов
        $totalQuestions = $user['total_games_played'] * 5;
        $user['accuracy_percent'] = $totalQuestions > 0 
            ? round(($user['total_correct_answers'] / $totalQuestions) * 100, 1)
            : 0;
        
        // Средний XP за игру
        $user['average_xp_per_game'] = $user['total_games_played'] > 0
            ? round($user['total_xp'] / $user['total_games_played'])
            : 0;
            
        // Форматируем время последней активности
        if ($user['last_activity'] && $user['last_activity'] !== '0000-00-00 00:00:00') {
            $dateTime = new DateTime($user['last_activity']);
            $now = new DateTime();
            $interval = $dateTime->diff($now);
            
            // Форматируем для отображения
            $formattedTime = $dateTime->format('d.m.Y H:i');
            
            // Добавляем относительное время
            if ($interval->days === 0 && $interval->h === 0 && $interval->i < 1) {
                $user['last_activity_text'] = $formattedTime . ' (только что)';
            } elseif ($interval->days === 0 && $interval->h === 0) {
                $user['last_activity_text'] = $formattedTime . ' (' . $interval->i . ' мин. назад)';
            } elseif ($interval->days === 0) {
                $user['last_activity_text'] = $formattedTime . ' (' . $interval->h . ' ч. назад)';
            } elseif ($interval->days === 1) {
                $user['last_activity_text'] = $formattedTime . ' (вчера)';
            } elseif ($interval->days < 7) {
                $user['last_activity_text'] = $formattedTime . ' (' . $interval->days . ' дн. назад)';
            } else {
                $user['last_activity_text'] = $formattedTime;
            }
        } else {
            $user['last_activity_text'] = 'Никогда';
        }
        
        // Также форматируем дату регистрации
        if ($user['created_at']) {
            $createdDate = new DateTime($user['created_at']);
            $user['created_at_formatted'] = $createdDate->format('d.m.Y H:i');
        }
    }
    
    echo json_encode([
        'success' => true, 
        'users' => $users,
        'total_count' => count($users),
        'generated_at' => date('Y-m-d H:i:s'),
        'current_server_time' => date('Y-m-d H:i:s')
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
?>