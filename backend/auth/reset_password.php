<?php
header("Content-Type: application/json");
require "../config/db_connect.php";

$data = json_decode(file_get_contents("php://input"), true);
$token = trim($data["token"] ?? "");
$new_password = $data["password"] ?? "";

if (!$token || !$new_password) {
    echo json_encode(["success" => false, "message" => "Token and new password are required"]);
    exit;
}

if (strlen($new_password) < 8) {
    echo json_encode(["success" => false, "message" => "Password must be at least 8 characters"]);
    exit;
}

$token_hash = hash("sha256", $token);

$stmt = $pdo->prepare("SELECT user_id FROM users WHERE reset_token_hash = ? AND reset_token_expires_at > NOW()");
$stmt->execute([$token_hash]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    echo json_encode(["success" => false, "message" => "Reset link is invalid or expired"]);
    exit;
}

$password_hash = password_hash($new_password, PASSWORD_DEFAULT);

$update = $pdo->prepare("UPDATE users SET password_hash = ?, reset_token_hash = NULL, reset_token_expires_at = NULL WHERE user_id = ?");
$update->execute([$password_hash, $user["user_id"]]);

echo json_encode(["success" => true, "message" => "Password reset successfully"]);
?>
