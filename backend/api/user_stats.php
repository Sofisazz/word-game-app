<?php
require_once '../config/cors.php';
require_once '../config/database.php';

header('Content-Type: application/json');

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
        
  
        $check_stmt = $pdo->prepare("SELECT id FROM user_stats WHERE user_id = ?");
        $check_stmt->execute([$user_id]);
        
        if ($check_stmt->rowCount() === 0) {
            $insert_stmt = $pdo->prepare("INSERT INTO user_stats (user_id, total_games_played, total_correct_answers, total_xp, level) VALUES (?, 0, 0, 0, 1)");
            $insert_stmt->execute([$user_id]);
        }

     
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

        
        $achievements_query = "SELECT 
            a.id, a.name, a.description, a.icon, a.xp_reward, a.badge, a.image_url
        FROM achievements a
        INNER JOIN user_achievements ua ON a.id = ua.achievement_id
        WHERE ua.user_id = ?";
        
        $achievements_stmt = $pdo->prepare($achievements_query);
        $achievements_stmt->execute([$user_id]);
        $achievements = $achievements_stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $total_xp = $stats['total_xp'] ?? 0;
        $level_info = getLevelProgress($total_xp);

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