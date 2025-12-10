
<?php

require_once '../config/database.php';
require_once '../config/cors.php';


$database = new Database();
$db = $database->getConnection();

$user = new User($db);

$data = json_decode(file_get_contents("php://input"));


if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!empty($data->user_id) && !empty($data->word_id)) {
        $query = "INSERT INTO wrong_answers (user_id, word_id, mistakes, last_practice) 
                  VALUES (:user_id, :word_id, 1, NOW())
                  ON DUPLICATE KEY UPDATE 
                  mistakes = mistakes + 1, 
                  last_practice = NOW()";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':user_id', $data->user_id);
        $stmt->bindParam(':word_id', $data->word_id);
        
        if ($stmt->execute()) {
            http_response_code(200);
            echo json_encode(["success" => true, "message" => "Wrong answer saved"]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Failed to save wrong answer"]);
        }
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!empty($_GET['user_id'])) {
        $query = "SELECT wa.*, w.original_word, w.translation, w.example_sentence 
                  FROM wrong_answers wa
                  JOIN words w ON wa.word_id = w.id
                  WHERE wa.user_id = :user_id
                  ORDER BY wa.mistakes DESC, wa.last_practice ASC";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':user_id', $_GET['user_id']);
        $stmt->execute();
        
        $wrongAnswers = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $wrongAnswers[] = $row;
        }
        
        http_response_code(200);
        echo json_encode(["success" => true, "data" => $wrongAnswers]);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    if (!empty($data->user_id) && !empty($data->word_id)) {
        $query = "DELETE FROM wrong_answers 
                  WHERE user_id = :user_id AND word_id = :word_id";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':user_id', $data->user_id);
        $stmt->bindParam(':word_id', $data->word_id);
        
        if ($stmt->execute()) {
            http_response_code(200);
            echo json_encode(["success" => true, "message" => "Word removed from practice"]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Failed to remove word"]);
        }
    }
}
?>