<?php
header("Content-Type: application/json");
session_start();
require "../backend/config/db_connect.php";

if (!isset($_SESSION["is_admin"])) {
    echo json_encode(["success" => false, "message" => "Admin not logged in"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

$content_id = $data["content_id"] ?? "";
$title = trim($data["title"] ?? "");
$content = trim($data["content"] ?? "");

if ($content_id === "" || $title === "" || $content === "") {
    echo json_encode(["success" => false, "message" => "All fields required"]);
    exit;
}

$stmt = $pdo->prepare("
    UPDATE admin_content
    SET title = ?, content = ?
    WHERE content_id = ?
");

$stmt->execute([$title, $content, $content_id]);

echo json_encode([
    "success" => true,
    "message" => "Content updated successfully"
]);
?>