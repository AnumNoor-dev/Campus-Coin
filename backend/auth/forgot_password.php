<?php
header("Content-Type: application/json");
require "../config/db_connect.php";

$data = json_decode(file_get_contents("php://input"), true);
$email = trim($data["email"] ?? "");

if (!$email) {
    echo json_encode(["success" => false, "message" => "Email is required"]);
    exit;
}

$stmt = $pdo->prepare("SELECT user_id, name, email FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

// Keep the response the same whether the email exists or not.
$message = "If the email is registered, a password reset link has been prepared.";

if (!$user) {
    echo json_encode(["success" => true, "message" => $message]);
    exit;
}

$token = bin2hex(random_bytes(32));
$token_hash = hash("sha256", $token);
$timeStmt = $pdo->query("SELECT DATE_ADD(NOW(), INTERVAL 30 MINUTE)");
$expires_at = $timeStmt->fetchColumn();

$update = $pdo->prepare("UPDATE users SET reset_token_hash = ?, reset_token_expires_at = ? WHERE user_id = ?");
$update->execute([$token_hash, $expires_at, $user["user_id"]]);

// Set this to your real website URL when the project is hosted.
$reset_page = "http://localhost/campus_coin/frontend/reset_password.html";
$reset_link = $reset_page . "?token=" . urlencode($token);

$subject = "Campus Coin - Password Reset";
$body = "Hello " . $user["name"] . ",\n\nUse the link below to reset your Campus Coin password:\n\n" . $reset_link . "\n\nThis link will expire in 30 minutes.\n\nCampus Coin";

$headers = "From: noreply@campuscoin.local\r\n" .
           "Reply-To: noreply@campuscoin.local\r\n" .
           "Content-Type: text/plain; charset=UTF-8";

@mail($user["email"], $subject, $body, $headers);

// Useful for local XAMPP testing. Turn this off before public hosting.
$local_testing = true;

$response = ["success" => true, "message" => $message];
if ($local_testing) {
    $response["reset_link"] = $reset_link;
}

echo json_encode($response);
?>
