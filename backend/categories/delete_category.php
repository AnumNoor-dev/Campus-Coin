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

if (!$category_id) {
    echo json_encode(["success" => false, "message" => "category_id required"]);
    exit;
}

$stmt = $pdo->prepare("DELETE FROM categories WHERE category_id = ? AND user_id = ?");
$stmt->execute([$category_id, $_SESSION["user_id"]]);

echo json_encode(["success" => true, "message" => "Category deleted"]);
?>