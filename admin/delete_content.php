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

if ($content_id === "") {
    echo json_encode(["success" => false, "message" => "Content ID required"]);
    exit;
}

$stmt = $pdo->prepare("
    DELETE FROM admin_content
    WHERE content_id = ?
");

$stmt->execute([$content_id]);

echo json_encode([
    "success" => true,
    "message" => "Content deleted successfully"
]);
?>