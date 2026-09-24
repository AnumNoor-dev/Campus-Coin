<?php
header("Content-Type: application/json");
session_start();
require "../config/db_connect.php";

if (!isset($_SESSION["user_id"])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit;
}

$stmt = $pdo->prepare("SELECT * FROM categories WHERE user_id = ?");
$stmt->execute([$_SESSION["user_id"]]);
$categories = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode(["success" => true, "categories" => $categories]);
?>