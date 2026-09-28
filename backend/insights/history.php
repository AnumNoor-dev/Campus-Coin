<?php
header("Content-Type: application/json");
session_start();
require "../config/db_connect.php";

if (!isset($_SESSION["user_id"])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit;
}

$user_id = $_SESSION["user_id"];

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    $stmt = $pdo->prepare("
        SELECT insight_id, month_year, summary_text, tip_text, created_at
        FROM insight_history
        WHERE user_id = ?
        ORDER BY created_at DESC
    ");
    $stmt->execute([$user_id]);

    echo json_encode([
        "success" => true,
        "insights" => $stmt->fetchAll(PDO::FETCH_ASSOC)
    ]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

$month_year = trim($data["month_year"] ?? "");
$summary_text = trim($data["summary_text"] ?? "");
$tip_text = trim($data["tip_text"] ?? "");

if ($month_year === "" || $summary_text === "") {
    echo json_encode([
        "success" => false,
        "message" => "Month and summary are required"
    ]);
    exit;
}

$stmt = $pdo->prepare("
    INSERT INTO insight_history (user_id, month_year, summary_text, tip_text)
    VALUES (?, ?, ?, ?)
");

$stmt->execute([$user_id, $month_year, $summary_text, $tip_text]);

echo json_encode([
    "success" => true,
    "message" => "Insight saved successfully"
]);
?>
