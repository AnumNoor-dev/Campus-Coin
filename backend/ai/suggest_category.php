<?php
header("Content-Type: application/json");
session_start();
require "../config/db_connect.php";

if (!isset($_SESSION["user_id"])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$description = strtolower(trim($data["description"] ?? ""));

$rules = [
    "Food"        => ["cafe", "canteen", "lunch", "dinner", "breakfast", "food", "restaurant", "pizza", "burger"],
    "Transport"   => ["uber", "careem", "rickshaw", "bus", "fuel", "petrol", "taxi", "fare"],
    "Academics"   => ["book", "course", "fee", "tuition", "stationery", "printout", "exam"],
    "Subscriptions" => ["netflix", "spotify", "subscription", "youtube premium"],
    "Entertainment" => ["movie", "cinema", "game", "outing"],
];

$suggested = "Other";
foreach ($rules as $category => $keywords) {
    foreach ($keywords as $word) {
        if (str_contains($description, $word)) {
            $suggested = $category;
            break 2;
        }
    }
}

echo json_encode(["success" => true, "suggested_category" => $suggested]);
?>