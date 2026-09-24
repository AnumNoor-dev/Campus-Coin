<?php
$host = "127.0.0.1";
$db   = "campus_coin_db";
$user = "root";       // XAMPP default
$pass = "";           // XAMPP default (empty)

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die(json_encode(["success" => false, "message" => "DB connection failed"]));
}
?>