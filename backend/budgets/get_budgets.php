<?php
header("Content-Type: application/json");
session_start();
require "../config/db_connect.php";

if (!isset($_SESSION["user_id"])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit;
}

$month_year = $_GET["month_year"] ?? date("m/Y");   // default current month

$stmt = $pdo->prepare("
    SELECT b.budget_id, b.category_id, c.name AS category_name, b.monthly_limit, b.month_year,
           COALESCE(SUM(t.amount), 0) AS spent
    FROM budgets b
    JOIN categories c ON b.category_id = c.category_id
    LEFT JOIN transactions t ON t.category_id = b.category_id 
        AND t.user_id = b.user_id 
        AND t.type = 'expense'
        AND DATE_FORMAT(t.txn_date, '%m/%Y') = b.month_year
    WHERE b.user_id = ? AND b.month_year = ?
    GROUP BY b.budget_id
");
$stmt->execute([$_SESSION["user_id"], $month_year]);
$budgets = $stmt->fetchAll(PDO::FETCH_ASSOC);

// add percentage used + alert flag
foreach ($budgets as &$b) {
    $b["percent_used"] = $b["monthly_limit"] > 0 ? round(($b["spent"] / $b["monthly_limit"]) * 100, 1) : 0;
    $b["alert"] = $b["percent_used"] >= 80;
}

echo json_encode(["success" => true, "budgets" => $budgets]);
?>