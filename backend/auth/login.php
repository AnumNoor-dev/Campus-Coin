<?php
header("Content-Type: application/json");
session_start();
require "../config/db_connect.php";

$data = json_decode(file_get_contents("php://input"), true);
$email = trim($data["email"] ?? "");
$password = $data["password"] ?? "";

$stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if ($user && password_verify($password, $user["password_hash"])) {
    $_SESSION["user_id"] = $user["user_id"];
    $_SESSION["name"] = $user["name"];
    echo json_encode(["success" => true, "message" => "Login successful", "name" => $user["name"]]);
} else {
    echo json_encode(["success" => false, "message" => "Invalid email or password"]);
}
?>