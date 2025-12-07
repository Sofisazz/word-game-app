<?php
require_once '../config/cors.php';
require_once '../config/database.php';

header('Content-Type: application/json');

function getXpForNextLevel($current_level) {
    $base_xp = 250;
    return $base_xp + ($current_level - 1) * 100;
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $user_id = $data['user_id'] ?? 0;
        $xp_earned = $data['xp_earned'] ?? 0;
        
        if ($user_id <= 0 || $xp_earned <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid data']);
            exit;
        }
        
        $database = new Database();
        $pdo = $database->getConnection();
        

        $pdo->beginTransaction();
        
 
        $stmt = $pdo->prepare("SELECT total_xp, level FROM user_stats WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $user_data = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user_data) {
  
            $insert_stmt = $pdo->prepare("INSERT INTO user_stats (user_id, total_xp, level) VALUES (?, ?, 1)");
            $insert_stmt->execute([$user_id, $xp_earned]);
            $new_total_xp = $xp_earned;
            $new_level = 1;
        } else {
            $current_total_xp = $user_data['total_xp'];
            $current_level = $user_data['level'];
            $new_total_xp = $current_total_xp + $xp_earned;
            $new_level = $current_level;
            
   
            $xp_needed_for_next_level = getXpForNextLevel($current_level);
            $xp_in_current_level = $new_total_xp;
            

            for ($i = 1; $i < $current_level; $i++) {
                $xp_in_current_level -= getXpForNextLevel($i);
            }
            
          
            while ($xp_in_current_level >= $xp_needed_for_next_level && $xp_needed_for_next_level > 0) {
                $new_level++;
                $xp_in_current_level -= $xp_needed_for_next_level;
                $xp_needed_for_next_level = getXpForNextLevel($new_level);
            }
            
      
            $update_stmt = $pdo->prepare("UPDATE user_stats SET total_xp = ?, level = ? WHERE user_id = ?");
            $update_stmt->execute([$new_total_xp, $new_level, $user_id]);
        }
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'XP updated successfully',
            'data' => [
                'new_total_xp' => $new_total_xp,
                'new_level' => $new_level,
                'xp_earned' => $xp_earned
            ]
        ]);
        
    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    }
    
} catch (Exception $e) {
    if (isset($pdo)) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>