<?php
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../auth.php';


error_log("=== STATISTICS.PHP ACCESS ATTEMPT ===");
error_log("Session ID: " . session_id());
error_log("Session data: " . print_r($_SESSION, true));
error_log("isLoggedIn() returns: " . (isLoggedIn() ? 'true' : 'false'));
error_log("isAdmin() returns: " . (isAdmin() ? 'true' : 'false'));


try {

    $database = new Database();
    $pdo = $database->getConnection();
    
    if (!$pdo) {
        throw new Exception("Не удалось подключиться к базе данных");
    }
    

    $stmt = $pdo->query("SELECT COUNT(*) as total_users FROM users");
    $totalUsers = $stmt->fetch()['total_users'];
    

    $stmt = $pdo->query("SELECT COUNT(*) as active_users FROM users WHERE last_activity > DATE_SUB(NOW(), INTERVAL 7 DAY)");
    $activeUsers = $stmt->fetch()['active_users'];
    

    $stmt = $pdo->query("SELECT COUNT(*) as very_active_users FROM users WHERE last_activity > DATE_SUB(NOW(), INTERVAL 1 DAY)");
    $veryActiveUsers = $stmt->fetch()['very_active_users'];
    

    $stmt = $pdo->query("SELECT COUNT(*) as new_users FROM users WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)");
    $newUsers = $stmt->fetch()['new_users'];
    

    $stmt = $pdo->query("SELECT COUNT(*) as total_words FROM words");
    $totalWords = $stmt->fetch()['total_words'];
    

    $stmt = $pdo->query("SELECT COUNT(*) as total_sets FROM word_sets");
    $totalSets = $stmt->fetch()['total_sets'];
    

    $totalSessions = 0;
    $recentActivity = [];
    

    $has_game_results = false;
    try {
        $test_stmt = $pdo->query("SELECT 1 FROM game_results LIMIT 1");
        $has_game_results = true;
    } catch (PDOException $e) {
        $has_game_results = false;
    }
    
    if ($has_game_results) {

        $stmt = $pdo->query("SELECT COUNT(*) as total_sessions FROM game_results");
        $totalSessions = $stmt->fetch()['total_sessions'];
        

        $stmt = $pdo->query("
            SELECT game_type, COUNT(*) as count 
            FROM game_results 
            GROUP BY game_type 
            ORDER BY count DESC
        ");
        $popularGames = $stmt->fetchAll(PDO::FETCH_ASSOC);
        

        try {

            $date_columns = ['completed_at', 'created_at', 'timestamp', 'date'];
            $date_column_found = null;
            
            foreach ($date_columns as $col) {
                try {
                    $test_stmt = $pdo->query("SELECT $col FROM game_results LIMIT 1");
                    $date_column_found = $col;
                    break;
                } catch (PDOException $e) {
                    continue;
                }
            }
            
            if ($date_column_found) {

                $stmt = $pdo->query("
                    SELECT 
                        u.username, 
                        gr.game_type, 
                        gr.$date_column_found as created_at,
                        MAX(gr.$date_column_found) as last_activity
                    FROM game_results gr 
                    JOIN users u ON gr.user_id = u.id 
                    GROUP BY u.id, u.username, gr.game_type
                    ORDER BY last_activity DESC 
                    LIMIT 10
                ");
                $recentActivity = $stmt->fetchAll(PDO::FETCH_ASSOC);
            } else {

                $stmt = $pdo->query("
                    SELECT 
                        u.username, 
                        gr.game_type, 
                        NOW() as created_at
                    FROM game_results gr 
                    JOIN users u ON gr.user_id = u.id 
                    GROUP BY u.id
                    ORDER BY gr.id DESC 
                    LIMIT 10
                ");
                $recentActivity = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }
        } catch (PDOException $e) {

            $recentActivity = [];
        }
    } else {
        $stmt = $pdo->query("
            SELECT 
                username, 
                'система' as game_type, 
                last_activity as created_at
            FROM users 
            WHERE last_activity IS NOT NULL
            ORDER BY last_activity DESC 
            LIMIT 10
        ");
        $recentActivity = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $popularGames = [];
    }
    
    $stmt = $pdo->query("
        SELECT 
            DATE(last_activity) as date,
            COUNT(*) as active_users
        FROM users 
        WHERE last_activity > DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(last_activity)
        ORDER BY date DESC
        LIMIT 7
    ");
    $dailyActivity = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'statistics' => [
            'totalUsers' => (int)$totalUsers,
            'activeUsers' => (int)$activeUsers,
            'veryActiveUsers' => (int)$veryActiveUsers,
            'newUsers' => (int)$newUsers,
            'totalWords' => (int)$totalWords,
            'totalSets' => (int)$totalSets,
            'totalSessions' => (int)$totalSessions
        ],
        'popularGames' => $popularGames ?? [],
        'recentActivity' => $recentActivity,
        'dailyActivity' => $dailyActivity
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Ошибка базы данных: ' . $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>