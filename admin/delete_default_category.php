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

if ($category_id === "") {
    echo json_encode([
        "success" => false,
        "message" => "Category ID is required"
    ]);
    exit;
}

$check = $pdo->prepare("
    SELECT COUNT(*)
    FROM transactions
    WHERE category_id = ?
");
$check->execute([$category_id]);

if ($check->fetchColumn() > 0) {
    echo json_encode([
        "success" => false,
        "message" => "Category is being used and cannot be deleted"
    ]);
    exit;
}

$stmt = $pdo->prepare("
    DELETE FROM categories
    WHERE category_id = ?
      AND is_default = 1
");

$stmt->execute([$category_id]);

echo json_encode([
    "success" => true,
    "message" => "Default category deleted successfully"
]);
?>