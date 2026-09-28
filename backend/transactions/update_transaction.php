<?php
header("Content-Type: application/json");
session_start();
require "../config/db_connect.php";

if (!isset($_SESSION["user_id"])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$transaction_id = $data["transaction_id"] ?? null;
$category_id = $data["category_id"] ?? null;
$amount = $data["amount"] ?? null;
$type = $data["type"] ?? "";
$description = trim($data["description"] ?? "");
$txn_date = $data["txn_date"] ?? null;
$is_recurring = $data["is_recurring"] ?? 0;

if (!$transaction_id || !$category_id || !$amount || !in_array($type, ["income", "expense"]) || !$txn_date) {
    echo json_encode(["success" => false, "message" => "All fields required"]);
    exit;
}

$history = $pdo->prepare("
    INSERT INTO transaction_history
    (
        transaction_id, user_id, category_id, amount,
        type, description, txn_date, is_recurring, action_type
    )
    SELECT
        transaction_id, user_id, category_id, amount,
        type, description, txn_date, is_recurring, 'updated'
    FROM transactions
    WHERE transaction_id = ? AND user_id = ?
");

$history->execute([
    $transaction_id,
    $_SESSION["user_id"]
]);

$stmt = $pdo->prepare("UPDATE transactions SET category_id = ?, amount = ?, type = ?, description = ?, txn_date = ?, is_recurring = ? WHERE transaction_id = ? AND user_id = ?");
$stmt->execute([$category_id, $amount, $type, $description, $txn_date, $is_recurring, $transaction_id, $_SESSION["user_id"]]);

echo json_encode(["success" => true, "message" => "Transaction updated"]);
?>