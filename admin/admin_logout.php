<?php

header("Content-Type: application/json");

session_start();

unset($_SESSION["is_admin"]);

echo json_encode([
    "success" => true,
    "message" => "Admin logged out successfully"
]);

?>