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

$name = trim($data["name"] ?? "");
$type = $data["type"] ?? "";

if ($name === "" || !in_array($type, ["income", "expense"])) {
    echo json_encode([
        "success" => false,
        "message" => "Valid category name and type required"
    ]);
    exit;
}

$stmt = $pdo->prepare("
    INSERT INTO categories (user_id, name, type, is_default)
    VALUES (NULL, ?, ?, 1)
");

$stmt->execute([$name, $type]);

echo json_encode([
    "success" => true,
    "message" => "Default category added successfully"
]);
?>