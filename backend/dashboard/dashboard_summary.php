<?php
header("Content-Type: application/json");
session_start();
require "../config/db_connect.php";

if (!isset($_SESSION["user_id"])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit;
}

$user_id = $_SESSION["user_id"];
$currentMonth = date("m/Y");

// 1) Greeting name
$userStmt = $pdo->prepare("SELECT name FROM users WHERE user_id = ?");
$userStmt->execute([$user_id]);
$userName = $userStmt->fetch(PDO::FETCH_ASSOC)["name"] ?? "Student";

// 2) Total income / expense / balance (all-time)
$totalsStmt = $pdo->prepare("SELECT type, SUM(amount) AS total FROM transactions WHERE user_id = ? GROUP BY type");
$totalsStmt->execute([$user_id]);
$totalsRaw = $totalsStmt->fetchAll(PDO::FETCH_ASSOC);
$totals = ["income" => 0, "expense" => 0];
foreach ($totalsRaw as $t) { $totals[$t["type"]] = (float)$t["total"]; }
$balance = $totals["income"] - $totals["expense"];

// 3) Top spending category (this month)
$topCatStmt = $pdo->prepare("
    SELECT c.name AS category_name, SUM(t.amount) AS total
    FROM transactions t
    JOIN categories c ON t.category_id = c.category_id
    WHERE t.user_id = ? AND t.type = 'expense'
      AND DATE_FORMAT(t.txn_date, '%m/%Y') = ?
    GROUP BY t.category_id
    ORDER BY total DESC
    LIMIT 1
");
$topCatStmt->execute([$user_id, $currentMonth]);
$topCategory = $topCatStmt->fetch(PDO::FETCH_ASSOC);

// 4) Recent 5 transactions
$recentStmt = $pdo->prepare("
    SELECT t.transaction_id, t.amount, t.type, t.description, t.txn_date, c.name AS category_name
    FROM transactions t
    JOIN categories c ON t.category_id = c.category_id
    WHERE t.user_id = ?
    ORDER BY t.txn_date DESC, t.transaction_id DESC
    LIMIT 5
");
$recentStmt->execute([$user_id]);
$recentTransactions = $recentStmt->fetchAll(PDO::FETCH_ASSOC);

// 5) Budget vs actual (this month)
$budgetStmt = $pdo->prepare("
    SELECT b.category_id, c.name AS category_name, b.monthly_limit,
           COALESCE(SUM(t.amount), 0) AS spent
    FROM budgets b
    JOIN categories c ON b.category_id = c.category_id
    LEFT JOIN transactions t ON t.category_id = b.category_id
        AND t.user_id = b.user_id AND t.type = 'expense'
        AND DATE_FORMAT(t.txn_date, '%m/%Y') = b.month_year
    WHERE b.user_id = ? AND b.month_year = ?
    GROUP BY b.budget_id
");
$budgetStmt->execute([$user_id, $currentMonth]);
$budgetVsActual = $budgetStmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($budgetVsActual as &$b) {
    $b["percent_used"] = $b["monthly_limit"] > 0 ? round(($b["spent"] / $b["monthly_limit"]) * 100, 1) : 0;
}

// 6) Simple saving tip (rule-based, quick win)
$tip = "Achi shuruat hai! Apna pehla transaction add karo.";
if ($totals["expense"] > 0) {
    if ($topCategory) {
        $tip = "Is mahine tumhara sabse zyada kharch '{$topCategory['category_name']}' par hua — ise thoda control karne ki koshish karo.";
    }
    if ($totals["income"] > 0 && $balance > 0) {
        $savingRate = round(($balance / $totals["income"]) * 100);
        if ($savingRate >= 20) {
            $tip = "Shabash! Tum apni income ka {$savingRate}% bacha rahe ho.";
        }
    }
}

echo json_encode([
    "success" => true,
    "greeting_name" => $userName,
    "total_income" => $totals["income"],
    "total_expense" => $totals["expense"],
    "balance" => $balance,
    "top_category" => $topCategory ? $topCategory["category_name"] : "N/A",
    "recent_transactions" => $recentTransactions,
    "budget_vs_actual" => $budgetVsActual,
    "saving_tip" => $tip
]);
?>