<?php
header("Content-Type: application/json");
require "../config/db_connect.php";

$data = json_decode(file_get_contents("php://input"), true);

$name = trim($data["name"] ?? "");
$email = trim($data["email"] ?? "");
$password = $data["password"] ?? "";
$academic_year = trim($data["academic_year"] ?? "");
$savings_goal = $data["monthly_savings_goal"] ?? 0;

if (!$name || !$email || !$password) {
    echo json_encode(["success" => false, "message" => "All fields required"]);
    exit;
}

// check email already exists
$check = $pdo->prepare("SELECT user_id FROM users WHERE email = ?");
$check->execute([$email]);
if ($check->fetch()) {
    echo json_encode(["success" => false, "message" => "Email already registered"]);
    exit;
}

// generate UUID (v4-style)
function generateUUID() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

$user_id = generateUUID();
$password_hash = password_hash($password, PASSWORD_DEFAULT);

$stmt = $pdo->prepare("INSERT INTO users (user_id, name, email, password_hash, academic_year, monthly_savings_goal) VALUES (?, ?, ?, ?, ?, ?)");
$stmt->execute([$user_id, $name, $email, $password_hash, $academic_year, $savings_goal]);

echo json_encode(["success" => true, "message" => "Registered successfully", "user_id" => $user_id]);
?>