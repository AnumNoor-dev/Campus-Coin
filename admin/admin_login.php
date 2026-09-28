<?php
header("Content-Type: application/json");
session_start();
require "../backend/config/db_connect.php";

$data = json_decode(file_get_contents("php://input"), true);
$email = trim($data["email"] ?? "");
$password = $data["password"] ?? "";

// simple hardcoded admin check (competition ke liye kaafi hai)
$ADMIN_EMAIL = "admin@campuscoin.com";
$ADMIN_PASSWORD = "admin123";

if ($email === $ADMIN_EMAIL && $password === $ADMIN_PASSWORD) {
    $_SESSION["is_admin"] = true;
    echo json_encode(["success" => true, "message" => "Admin login successful"]);
} else {
    echo json_encode(["success" => false, "message" => "Invalid admin credentials"]);
}
?>