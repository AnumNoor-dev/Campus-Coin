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

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    $stmt = $pdo->query("
        SELECT *
        FROM admin_content
        ORDER BY created_at DESC
    ");

    echo json_encode([
        "success" => true,
        "items" => $stmt->fetchAll(PDO::FETCH_ASSOC)
    ]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

$type = $data["type"] ?? "";
$title = trim($data["title"] ?? "");
$content = trim($data["content"] ?? "");

if (!in_array($type, ["announcement", "tip_template"]) || $title === "" || $content === "") {
    echo json_encode([
        "success" => false,
        "message" => "Valid content data required"
    ]);
    exit;
}

$stmt = $pdo->prepare("
    INSERT INTO admin_content (type, title, content)
    VALUES (?, ?, ?)
");

$stmt->execute([$type, $title, $content]);

echo json_encode([
    "success" => true,
    "message" => "Content added successfully"
]);
?>