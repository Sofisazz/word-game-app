<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../auth.php';

// Проверка прав администратора
if (!isAdmin()) {
    http_response_code(403);
    echo json_encode(['error' => 'Доступ запрещен']);
    exit;
}

try {
    // Создаем соединение с базой данных
    $database = new Database();
    $pdo = $database->getConnection();
    
    if (!$pdo) {
        throw new Exception("Не удалось подключиться к базе данных");
    }
    
    // 1. Общее количество пользователей
    $stmt = $pdo->query("SELECT COUNT(*) as total_users FROM users");
    $totalUsers = $stmt->fetch()['total_users'];
    
    // 2. Активные пользователи (за последние 7 дней)
    $stmt = $pdo->query("SELECT COUNT(*) as active_users FROM users WHERE last_activity > DATE_SUB(NOW(), INTERVAL 7 DAY)");
    $activeUsers = $stmt->fetch()['active_users'];
    
    // 3. Очень активные пользователи (за последние 24 часа)
    $stmt = $pdo->query("SELECT COUNT(*) as very_active_users FROM users WHERE last_activity > DATE_SUB(NOW(), INTERVAL 1 DAY)");
    $veryActiveUsers = $stmt->fetch()['very_active_users'];
    
    // 4. Новые пользователи (за последние 7 дней)
    $stmt = $pdo->query("SELECT COUNT(*) as new_users FROM users WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)");
    $newUsers = $stmt->fetch()['new_users'];
    
    // 5. Общее количество слов
    $stmt = $pdo->query("SELECT COUNT(*) as total_words FROM words");
    $totalWords = $stmt->fetch()['total_words'];
    
    // 6. Количество наборов слов
    $stmt = $pdo->query("SELECT COUNT(*) as total_sets FROM word_sets");
    $totalSets = $stmt->fetch()['total_sets'];
    
    // 7. Игровые сессии
    $totalSessions = 0;
    $recentActivity = [];
    
    // Проверяем наличие таблицы game_results
    $has_game_results = false;
    try {
        $test_stmt = $pdo->query("SELECT 1 FROM game_results LIMIT 1");
        $has_game_results = true;
    } catch (PDOException $e) {
        $has_game_results = false;
    }
    
    if ($has_game_results) {
        // Общее количество сессий
        $stmt = $pdo->query("SELECT COUNT(*) as total_sessions FROM game_results");
        $totalSessions = $stmt->fetch()['total_sessions'];
        
        // Популярные игры
        $stmt = $pdo->query("
            SELECT game_type, COUNT(*) as count 
            FROM game_results 
            GROUP BY game_type 
            ORDER BY count DESC
        ");
        $popularGames = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // ПОСЛЕДНЯЯ АКТИВНОСТЬ - КАЖДЫЙ ПОЛЬЗОВАТЕЛЬ ТОЛЬКО ОДИН РАЗ
        try {
            // Находим колонку с датой
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
                // Берем последнюю активность каждого пользователя
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
                // Если не нашли колонку с датой, используем текущее время
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
            // Если не удалось получить активность
            $recentActivity = [];
        }
    } else {
        // Если нет таблицы game_results, используем last_activity из users
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
    
    // 8. Статистика по дням (активность за последние 7 дней)
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