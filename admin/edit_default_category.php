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

$category_id = $data["category_id"] ?? "";
$name = trim($data["name"] ?? "");
$type = $data["type"] ?? "";

if ($category_id === "" || $name === "" || !in_array($type, ["income", "expense"])) {
    echo json_encode([
        "success" => false,
        "message" => "Valid category data required"
    ]);
    exit;
}

$stmt = $pdo->prepare("
    UPDATE categories
    SET name = ?, type = ?
    WHERE category_id = ?
      AND is_default = 1
");

$stmt->execute([$name, $type, $category_id]);

echo json_encode([
    "success" => true,
    "message" => "Default category updated successfully"
]);
?>