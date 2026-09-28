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

if (!$transaction_id) {
    echo json_encode(["success" => false, "message" => "transaction_id required"]);
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
        type, description, txn_date, is_recurring, 'deleted'
    FROM transactions
    WHERE transaction_id = ? AND user_id = ?
");

$history->execute([
    $transaction_id,
    $_SESSION["user_id"]
]);

$stmt = $pdo->prepare("DELETE FROM transactions WHERE transaction_id = ? AND user_id = ?");
$stmt->execute([$transaction_id, $_SESSION["user_id"]]);

echo json_encode(["success" => true, "message" => "Deleted"]);
?>