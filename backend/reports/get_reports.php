<?php
header("Content-Type: application/json");
session_start();
require "../config/db_connect.php";

if (!isset($_SESSION["user_id"])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit;
}

$user_id = $_SESSION["user_id"];

try {
    $start_date = $_GET["start_date"] ?? date("Y-m-01");
    $end_date = $_GET["end_date"] ?? date("Y-m-t");
    $category_id = $_GET["category_id"] ?? "";

    $where = ["t.user_id = ?", "t.txn_date BETWEEN ? AND ?"];
    $params = [$user_id, $start_date, $end_date];

    if ($category_id !== "") {
        $where[] = "t.category_id = ?";
        $params[] = $category_id;
    }

    $where_sql = implode(" AND ", $where);

    $stmt = $pdo->prepare("
        SELECT c.name AS category_name, SUM(t.amount) AS total
        FROM transactions t
        JOIN categories c ON c.category_id = t.category_id
        WHERE $where_sql AND t.type = 'expense'
        GROUP BY t.category_id, c.name
        ORDER BY total DESC
    ");
    $stmt->execute($params);
    $category_breakdown = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $stmt = $pdo->prepare("
        SELECT DATE_FORMAT(txn_date, '%Y-%m') AS month, type, SUM(amount) AS total
        FROM transactions
        WHERE user_id = ?
          AND txn_date >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 5 MONTH), '%Y-%m-01')
        GROUP BY DATE_FORMAT(txn_date, '%Y-%m'), type
        ORDER BY month ASC
    ");
    $stmt->execute([$user_id]);

    $monthly_trend = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $month = $row["month"];

        if (!isset($monthly_trend[$month])) {
            $monthly_trend[$month] = [
                "month" => $month,
                "income" => 0,
                "expense" => 0
            ];
        }

        $monthly_trend[$month][$row["type"]] = (float)$row["total"];
    }
    $monthly_trend = array_values($monthly_trend);

    $stmt = $pdo->prepare("
        SELECT t.type, SUM(t.amount) AS total
        FROM transactions t
        WHERE $where_sql
        GROUP BY t.type
    ");
    $stmt->execute($params);

    $totals = ["income" => 0, "expense" => 0];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $totals[$row["type"]] = (float)$row["total"];
    }
    $totals["balance"] = $totals["income"] - $totals["expense"];

    $stmt = $pdo->prepare("
        SELECT txn_date AS date, SUM(amount) AS total
        FROM transactions
        WHERE user_id = ?
          AND type = 'expense'
          AND YEAR(txn_date) = YEAR(CURDATE())
          AND MONTH(txn_date) = MONTH(CURDATE())
        GROUP BY txn_date
        ORDER BY txn_date ASC
    ");
    $stmt->execute([$user_id]);
    $daily_summary = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $stmt = $pdo->prepare("
        SELECT
            FLOOR((DAY(txn_date) - 1) / 7) + 1 AS week_number,
            SUM(amount) AS total
        FROM transactions
        WHERE user_id = ?
          AND type = 'expense'
          AND YEAR(txn_date) = YEAR(CURDATE())
          AND MONTH(txn_date) = MONTH(CURDATE())
        GROUP BY FLOOR((DAY(txn_date) - 1) / 7) + 1
        ORDER BY week_number ASC
    ");
    $stmt->execute([$user_id]);
    $weekly_summary = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "success" => true,
        "filters" => [
            "start_date" => $start_date,
            "end_date" => $end_date,
            "category_id" => $category_id
        ],
        "category_breakdown" => $category_breakdown,
        "monthly_trend" => $monthly_trend,
        "daily_summary" => $daily_summary,
        "weekly_summary" => $weekly_summary,
        "totals" => $totals
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Could not load reports"
    ]);
}
