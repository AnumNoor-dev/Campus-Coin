<?php
header("Content-Type: application/json");
session_start();
require "../config/db_connect.php";

if (!isset($_SESSION["user_id"])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

$category_id = $data["category_id"] ?? null;
$amount = $data["amount"] ?? null;
$type = $data["type"] ?? "";
$description = trim($data["description"] ?? "");
$txn_date = $data["txn_date"] ?? date("Y-m-d");
$is_recurring = !empty($data["is_recurring"]) ? 1 : 0;

if (!$category_id || !$amount || !in_array($type, ["income", "expense"])) {
    echo json_encode([
        "success" => false,
        "message" => "category_id, amount, and valid type required"
    ]);
    exit;
}

$recurring_frequency = null;
$next_occurrence_date = null;
$recurring_active = 0;

if ($is_recurring === 1) {
    $recurring_frequency = "monthly";
    $next_occurrence_date = date(
        "Y-m-d",
        strtotime("+1 month", strtotime($txn_date))
    );
    $recurring_active = 1;
}

$stmt = $pdo->prepare("
    INSERT INTO transactions (
        user_id,
        category_id,
        amount,
        type,
        description,
        txn_date,
        is_recurring,
        recurring_frequency,
        next_occurrence_date,
        recurring_active
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
");

$stmt->execute([
    $_SESSION["user_id"],
    $category_id,
    $amount,
    $type,
    $description,
    $txn_date,
    $is_recurring,
    $recurring_frequency,
    $next_occurrence_date,
    $recurring_active
]);

echo json_encode([
    "success" => true,
    "transaction_id" => $pdo->lastInsertId()
]);
?>
