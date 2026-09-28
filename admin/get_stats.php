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

$total_users = $pdo->query("
    SELECT COUNT(*) FROM users
")->fetchColumn();

$total_transactions = $pdo->query("
    SELECT COUNT(*) FROM transactions
")->fetchColumn();

$total_categories = $pdo->query("
    SELECT COUNT(*) FROM categories
")->fetchColumn();

$active_this_month = $pdo->query("
    SELECT COUNT(DISTINCT user_id)
    FROM transactions
    WHERE DATE_FORMAT(txn_date, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')
")->fetchColumn();

$most_used_category = $pdo->query("
    SELECT c.name, COUNT(t.transaction_id) AS usage_count
    FROM transactions t
    JOIN categories c ON c.category_id = t.category_id
    GROUP BY t.category_id, c.name
    ORDER BY usage_count DESC
    LIMIT 1
")->fetch(PDO::FETCH_ASSOC);

echo json_encode([
    "success" => true,
    "stats" => [
        "total_users" => (int)$total_users,
        "total_transactions" => (int)$total_transactions,
        "total_categories" => (int)$total_categories,
        "active_this_month" => (int)$active_this_month,
        "most_used_category" => $most_used_category ?: null
    ]
]);
?>