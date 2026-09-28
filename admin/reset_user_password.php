<?php
header("Content-Type: application/json");
session_start();
require "../backend/config/db_connect.php";

if (!isset($_SESSION["is_admin"])) {
    echo json_encode([
        "success" => false,
        "message" => "Admin not logged in"
    ]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

$user_id = $data["user_id"] ?? "";
$new_password = $data["new_password"] ?? "";

if ($user_id === "" || strlen($new_password) < 6) {
    echo json_encode([
        "success" => false,
        "message" => "Valid user and password required"
    ]);
    exit;
}

$password_hash = password_hash($new_password, PASSWORD_DEFAULT);

$stmt = $pdo->prepare("
    UPDATE users
    SET password_hash = ?
    WHERE user_id = ?
");

$stmt->execute([$password_hash, $user_id]);

echo json_encode([
    "success" => true,
    "message" => "User password reset successfully"
]);
?>