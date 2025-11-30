<?php
// backend/api/achievements.php
require_once '../config/cors.php';
require_once '../config/database.php';

header('Content-Type: application/json');

try {
    $database = new Database();
    $pdo = $database->getConnection();
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    if ($method === 'GET') {
        $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
        
        $query = "SELECT * FROM achievements ORDER BY id";
        
        $stmt = $pdo->prepare($query);
        $stmt->execute();
        $achievements = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $user_achievements_ids = [];
        
        if ($user_id > 0) {
            $user_query = "SELECT achievement_id FROM user_achievements WHERE user_id = ?";
            $user_stmt = $pdo->prepare($user_query);
            $user_stmt->execute([$user_id]);
            $user_achievements = $user_stmt->fetchAll(PDO::FETCH_COLUMN, 0);
            $user_achievements_ids = $user_achievements ?: [];
        }
        
        $formatted_achievements = [];
        foreach ($achievements as $achievement) {
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