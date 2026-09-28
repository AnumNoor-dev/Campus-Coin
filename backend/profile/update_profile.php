<?php
header("Content-Type: application/json");
session_start();
require "../config/db_connect.php";

if (!isset($_SESSION["user_id"])) {
    echo json_encode(["success" => false, "message" => "Login required"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

$name = trim($data["name"] ?? "");
$academic_year = trim($data["academic_year"] ?? "");
$monthly_allowance = $data["monthly_allowance_baseline"] ?? 0;
$monthly_savings_goal = $data["monthly_savings_goal"] ?? 0;

if ($name === "") {
    echo json_encode(["success" => false, "message" => "Name is required"]);
    exit;
}

if (!is_numeric($monthly_allowance) || $monthly_allowance < 0) {
    echo json_encode(["success" => false, "message" => "Invalid monthly allowance"]);
    exit;
}

if (!is_numeric($monthly_savings_goal) || $monthly_savings_goal < 0) {
    echo json_encode(["success" => false, "message" => "Invalid savings goal"]);
    exit;
}

$stmt = $pdo->prepare("UPDATE users SET name = ?, academic_year = ?, monthly_allowance_baseline = ?, monthly_savings_goal = ? WHERE user_id = ?");
$stmt->execute([
    $name,
    $academic_year,
    number_format((float)$monthly_allowance, 2, '.', ''),
    number_format((float)$monthly_savings_goal, 2, '.', ''),
    $_SESSION["user_id"]
]);

$_SESSION["name"] = $name;

echo json_encode(["success" => true, "message" => "Profile updated successfully"]);
?>
