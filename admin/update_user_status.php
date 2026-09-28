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
$is_active = $data["is_active"] ?? null;

if ($user_id === "" || !in_array($is_active, [0, 1], true)) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid user data"
    ]);
    exit;
}

$stmt = $pdo->prepare("
    UPDATE users
    SET is_active = ?
    WHERE user_id = ?
");

$stmt->execute([$is_active, $user_id]);

echo json_encode([
    "success" => true,
    "message" => $is_active == 1
        ? "User enabled successfully"
        : "User disabled successfully"
]);
?>