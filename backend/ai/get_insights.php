<?php
header("Content-Type: application/json");
session_start();
require "../config/db_connect.php";

if (!isset($_SESSION["user_id"])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit;
}

$user_id = $_SESSION["user_id"];

// current vs previous month expense by category
$stmt = $pdo->prepare("
    SELECT c.name AS category_name, DATE_FORMAT(t.txn_date, '%Y-%m') AS month, SUM(t.amount) AS total
    FROM transactions t
    JOIN categories c ON t.category_id = c.category_id
    WHERE t.user_id = ? AND t.type = 'expense'
      AND t.txn_date >= DATE_SUB(CURDATE(), INTERVAL 2 MONTH)
    GROUP BY c.category_id, month
");
$stmt->execute([$user_id]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

$thisMonth = date("Y-m");
$lastMonth = date("Y-m", strtotime("-1 month"));

$current = []; $previous = [];
foreach ($rows as $r) {
    if ($r["month"] === $thisMonth) $current[$r["category_name"]] = (float)$r["total"];
    if ($r["month"] === $lastMonth) $previous[$r["category_name"]] = (float)$r["total"];
}

$insights = [];
foreach ($current as $cat => $amt) {
    if (isset($previous[$cat]) && $previous[$cat] > 0) {
        $change = round((($amt - $previous[$cat]) / $previous[$cat]) * 100);
        if ($change >= 20) {
            $insights[] = "Tumne is mahine $cat par pichle mahine se {$change}% zyada kharch kiya.";
        } elseif ($change <= -20) {
            $insights[] = "Shabash! Tumne $cat par pichle mahine se " . abs($change) . "% kam kharch kiya.";
        }
    }
}

if (empty($insights)) {
    $insights[] = "Abhi tumhara kharch pattern stable hai — koi bada badlav nahi.";
}

echo json_encode(["success" => true, "insights" => $insights]);
?>