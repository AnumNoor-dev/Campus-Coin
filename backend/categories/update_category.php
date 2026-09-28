<?php
header("Content-Type: application/json");
session_start();
require "../config/db_connect.php";

if (!isset($_SESSION["user_id"])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$category_id = $data["category_id"] ?? null;
$name = trim($data["name"] ?? "");
$type = trim($data["type"] ?? "");

if (!$category_id || !$name || !in_array($type, ["income", "expense"])) {
    echo json_encode(["success" => false, "message" => "category_id, valid name, and type required"]);
    exit;
}

$stmt = $pdo->prepare("UPDATE categories SET name = ?, type = ? WHERE category_id = ? AND user_id = ?");
$stmt->execute([$name, $type, $category_id, $_SESSION["user_id"]]);

echo json_encode(["success" => true, "message" => "Category updated"]);
?>