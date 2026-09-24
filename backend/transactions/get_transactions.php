<?php
header("Content-Type: application/json");
session_start();
require "../config/db_connect.php";

if (!isset($_SESSION["user_id"])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit;
}

$stmt = $pdo->prepare("
    SELECT t.*, c.name AS category_name 
    FROM transactions t 
    JOIN categories c ON t.category_id = c.category_id 
    WHERE t.user_id = ? 
    ORDER BY t.txn_date DESC
");
$stmt->execute([$_SESSION["user_id"]]);
$transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode(["success" => true, "transactions" => $transactions]);
?>