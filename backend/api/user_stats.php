<?php
// backend/api/stats.php
require_once '../config/cors.php';
require_once '../config/database.php';

header('Content-Type: application/json');

// Функция для расчета уровня на основе общего XP (ваша новая система)
function calculateLevel($total_xp) {
    $base_xp = 250; // XP для 2 уровня
    $level = 1;
    $current_level_xp = 0;
    $next_level_xp = $base_xp;
    
    // Рассчитываем уровень на основе общего XP
    while ($total_xp >= $next_level_xp) {
        $level++;
        $current_level_xp = $next_level_xp;
        $next_level_xp = $current_level_xp + ($base_xp + ($level - 2) * 100); // Увеличиваем на 100 XP за каждый уровень
    }
    
    // Для 1 уровня
    if ($level == 1) {
        $current_level_xp = 0;
        $next_level_xp = $base_xp;
    }
    
    $current_xp_in_level = $total_xp - $current_level_xp;
    $xp_needed = $next_level_xp - $current_level_xp;
    
    return [
        'level' => $level,
        'total_xp' => $total_xp,
        'current_xp' => $current_xp_in_level,
        'next_level_xp' => $xp_needed,
        'current_level_max_xp' => $current_level_xp,
        'next_level_total_xp' => $next_level_xp
    ];
}

try {
    $database = new Database();
    $pdo = $database->getConnection();
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    if ($method === 'GET') {
        $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
        
        if ($user_id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid user ID']);
            exit;
        }
        
        // Создаем базовую статистику если ее нет
        $check_stmt = $pdo->prepare("SELECT id FROM user_stats WHERE user_id = ?");
        $check_stmt->execute([$user_id]);
        
        if ($check_stmt->rowCount() === 0) {
            $insert_stmt = $pdo->prepare("INSERT INTO user_stats (user_id, total_games_played, total_correct_answers, total_xp, level) VALUES (?, 0, 0, 0, 1)");
            $insert_stmt->execute([$user_id]);
        }

        // Получаем статистику пользователя
        $stats_query = "SELECT 
            us.*,
            (SELECT COUNT(*) FROM user_achievements ua WHERE ua.user_id = us.user_id) as achievements_count,
            (SELECT COUNT(*) FROM word_progress wp WHERE wp.user_id = us.user_id AND wp.times_correct >= 2) as words_learned
        FROM user_stats us 
        WHERE us.user_id = ?";
        
        $stats_stmt = $pdo->prepare($stats_query);
        $stats_stmt->execute([$user_id]);
        $stats = $stats_stmt->fetch(PDO::FETCH_ASSOC);

        if (!$stats) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'User stats not found']);
            exit;
        }

        // Получаем достижения пользователя
        $achievements_query = "SELECT 
            a.id, a.name, a.description, a.icon, a.xp_reward, a.badge, a.image_url
        FROM achievements a
        INNER JOIN user_achievements ua ON a.id = ua.achievement_id
        WHERE ua.user_id = ?";
        
        $achievements_stmt = $pdo->prepare($achievements_query);
        $achievements_stmt->execute([$user_id]);
        $achievements = $achievements_stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Рассчитываем уровень по новой системе
        $total_xp = $stats['total_xp'] ?? 0;
        $level_info = calculateLevel($total_xp);
        
        echo json_encode([
            'success' => true,
            'data' => [
                'stats' => $stats,
                'level_info' => $level_info,
                'achievements' => $achievements
            ]
        ]);
        
    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>