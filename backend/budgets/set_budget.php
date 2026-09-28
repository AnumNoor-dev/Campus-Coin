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
$monthly_limit = $data["monthly_limit"] ?? null;
$month_year = trim($data["month_year"] ?? "");   // format: "09/2026"

if (!$category_id || !$monthly_limit || !$month_year) {
    echo json_encode(["success" => false, "message" => "category_id, monthly_limit, month_year required"]);
    exit;
}

// check if budget already exists for this category+month -> update instead of duplicate
$check = $pdo->prepare("SELECT budget_id FROM budgets WHERE user_id = ? AND category_id = ? AND month_year = ?");
$check->execute([$_SESSION["user_id"], $category_id, $month_year]);
$existing = $check->fetch();

if ($existing) {
    $stmt = $pdo->prepare("UPDATE budgets SET monthly_limit = ? WHERE budget_id = ?");
    $stmt->execute([$monthly_limit, $existing["budget_id"]]);
    echo json_encode(["success" => true, "message" => "Budget updated", "budget_id" => $existing["budget_id"]]);
} else {
    $stmt = $pdo->prepare("INSERT INTO budgets (user_id, category_id, monthly_limit, month_year) VALUES (?, ?, ?, ?)");
    $stmt->execute([$_SESSION["user_id"], $category_id, $monthly_limit, $month_year]);
    echo json_encode(["success" => true, "message" => "Budget set", "budget_id" => $pdo->lastInsertId()]);
}
?>