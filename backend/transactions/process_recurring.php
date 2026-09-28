<?php
header("Content-Type: application/json");
session_start();
require "../config/db_connect.php";

if (!isset($_SESSION["user_id"])) {
    echo json_encode([
        "success" => false,
        "message" => "Not logged in"
    ]);
    exit;
}

$user_id = $_SESSION["user_id"];

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("
        SELECT
            transaction_id,
            category_id,
            amount,
            type,
            description,
            next_occurrence_date
        FROM transactions
        WHERE user_id = ?
          AND is_recurring = 1
          AND recurring_active = 1
          AND recurring_frequency = 'monthly'
          AND next_occurrence_date IS NOT NULL
          AND next_occurrence_date <= CURDATE()
        FOR UPDATE
    ");

    $stmt->execute([$user_id]);
    $recurring_transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $created_count = 0;

    foreach ($recurring_transactions as $transaction) {
        $insert = $pdo->prepare("
            INSERT INTO transactions (
                user_id,
                category_id,
                amount,
                type,
                description,
                txn_date,
                is_recurring,
                recurring_frequency,
                next_occurrence_date,
                recurring_active
            )
            VALUES (?, ?, ?, ?, ?, ?, 0, NULL, NULL, 0)
        ");

        $insert->execute([
            $user_id,
            $transaction["category_id"],
            $transaction["amount"],
            $transaction["type"],
            $transaction["description"],
            $transaction["next_occurrence_date"]
        ]);

        $update = $pdo->prepare("
            UPDATE transactions
            SET next_occurrence_date = DATE_ADD(next_occurrence_date, INTERVAL 1 MONTH)
            WHERE transaction_id = ?
              AND user_id = ?
        ");

        $update->execute([
            $transaction["transaction_id"],
            $user_id
        ]);

        $created_count++;
    }

    $pdo->commit();

    echo json_encode([
        "success" => true,
        "created_count" => $created_count,
        "message" => $created_count > 0
            ? "Recurring transactions processed"
            : "No recurring transactions due"
    ]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Could not process recurring transactions"
    ]);
}
?>
