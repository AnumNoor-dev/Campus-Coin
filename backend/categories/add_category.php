<?php
header("Content-Type: application/json");
session_start();
require "../config/db_connect.php";

if (!isset($_SESSION["user_id"])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$name = trim($data["name"] ?? "");
$type = trim($data["type"] ?? "");

if (!$name || !in_array($type, ["income", "expense"])) {
    echo json_encode(["success" => false, "message" => "Valid name and type (income/expense) required"]);
    exit;
}

$stmt = $pdo->prepare("INSERT INTO categories (user_id, name, type) VALUES (?, ?, ?)");
$stmt->execute([$_SESSION["user_id"], $name, $type]);

echo json_encode(["success" => true, "category_id" => $pdo->lastInsertId()]);
?>