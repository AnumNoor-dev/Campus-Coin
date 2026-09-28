<?php

header("Content-Type: application/json");

session_start();

require "../backend/config/db_connect.php";


if (!isset($_SESSION["is_admin"])) {

    echo json_encode([
        "success" => false,
        "message" => "Admin not logged in"
    ]);

    exit;
}


$stmt = $pdo->query("
    SELECT
        user_id,
        name,
        email,
        academic_year,
        monthly_savings_goal,
        monthly_allowance_baseline,
        is_active,
        created_at
    FROM users
    ORDER BY created_at DESC
");


$users =
    $stmt->fetchAll(
        PDO::FETCH_ASSOC
    );


echo json_encode([
    "success" => true,
    "users" => $users
]);

?>