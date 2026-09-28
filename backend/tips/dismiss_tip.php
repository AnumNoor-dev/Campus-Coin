<?php
header("Content-Type: application/json");
session_start();
require "../config/db_connect.php";

if (!isset($_SESSION["user_id"])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$tip_key = trim($data["tip_key"] ?? "");

if ($tip_key === "") {
    echo json_encode(["success" => false, "message" => "Tip key is required"]);
    exit;
}

$stmt = $pdo->prepare("
    INSERT INTO tip_preferences (user_id, tip_key, status)
    VALUES (?, ?, 'dismissed')
    ON DUPLICATE KEY UPDATE status = 'dismissed'
");

$stmt->execute([$_SESSION["user_id"], $tip_key]);

echo json_encode([
    "success" => true,
    "message" => "Tip dismissed successfully"
]);
?>
