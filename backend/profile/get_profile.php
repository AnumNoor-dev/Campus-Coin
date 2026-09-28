<?php
header("Content-Type: application/json");
session_start();
require "../config/db_connect.php";

if (!isset($_SESSION["user_id"])) {
    echo json_encode(["success" => false, "message" => "Login required"]);
    exit;
}

$stmt = $pdo->prepare("SELECT user_id, name, email, academic_year, monthly_allowance_baseline, monthly_savings_goal FROM users WHERE user_id = ?");
$stmt->execute([$_SESSION["user_id"]]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    echo json_encode(["success" => false, "message" => "User not found"]);
    exit;
}

echo json_encode(["success" => true, "profile" => $user]);
?>
