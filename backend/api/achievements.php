<?php
// backend/api/achievements.php
require_once '../config/cors.php';
require_once '../config/database.php';

session_start();
header('Content-Type: application/json');

try {
    $database = new Database();
    $pdo = $database->getConnection();
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    if ($method === 'GET') {
        // Проверяем, авторизован ли пользователь через сессию
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Пользователь не авторизован']);
            return;
        }
        
        $user_id = $_SESSION['user_id'];
        
        // Получаем ВСЕ достижения
        $query = "SELECT * FROM achievements ORDER BY id";
        $stmt = $pdo->prepare($query);
        $stmt->execute();
        $allAchievements = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Получаем ТОЛЬКО те достижения, которые действительно есть у пользователя
        $user_query = "SELECT achievement_id FROM user_achievements WHERE user_id = ?";
        $user_stmt = $pdo->prepare($user_query);
        $user_stmt->execute([$user_id]);
        $user_achievements = $user_stmt->fetchAll(PDO::FETCH_COLUMN, 0);
        
        $user_achievements_ids = array_map('intval', $user_achievements ?: []);
        
        // Форматируем достижения
        $formatted_achievements = [];
        foreach ($allAchievements as $achievement) {
            $is_unlocked = in_array((int)$achievement['id'], $user_achievements_ids);
            
            $formatted_achievements[] = [
                'id' => (int)$achievement['id'],
                'name' => $achievement['name'] ?? '',
                'description' => $achievement['description'] ?? '',
                'icon' => !empty($achievement['icon']) ? $achievement['icon'] : '🏆',
                'condition_type' => $achievement['condition_type'] ?? '',
                'condition_value' => isset($achievement['condition_value']) ? (int)$achievement['condition_value'] : 0,
                'xp_reward' => isset($achievement['xp_reward']) ? (int)$achievement['xp_reward'] : 0,
                'badge' => $achievement['badge'] ?? '',
                'image_url' => $achievement['image_url'] ?? ''
            ];
        }
        
        echo json_encode([
            'success' => true,
            'data' => $formatted_achievements,
            'user_achievements' => $user_achievements_ids
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