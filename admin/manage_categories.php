<?php
header("Content-Type: application/json");
session_start();
require "../backend/config/db_connect.php";

if (!isset($_SESSION["is_admin"])) {
    echo json_encode(["success" => false, "message" => "Admin not logged in"]);
    exit;
}

$action = $_GET["action"] ?? "list";

if ($action === "list") {
    $rows = $pdo->query("SELECT * FROM categories")->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(["success" => true, "categories" => $rows]);
} elseif ($action === "delete") {
    $data = json_decode(file_get_contents("php://input"), true);
    $stmt = $pdo->prepare("DELETE FROM categories WHERE category_id = ?");
    $stmt->execute([$data["category_id"]]);
    echo json_encode(["success" => true, "message" => "Deleted"]);
}
?>