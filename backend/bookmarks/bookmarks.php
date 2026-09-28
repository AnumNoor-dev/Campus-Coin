<?php

session_start();

header("Content-Type: application/json");

require_once "../config/db_connect.php";


if (!isset($_SESSION["user_id"])) {

    echo json_encode([
        "success" => false,
        "message" => "Please login first"
    ]);

    exit;
}


$user_id = $_SESSION["user_id"];

$method = $_SERVER["REQUEST_METHOD"];


/* =========================================
   GET BOOKMARKS
========================================= */

if ($method === "GET") {

    try {

        $stmt = $pdo->prepare("
            SELECT
                bookmark_id,
                item_type,
                item_key,
                title,
                content,
                created_at
            FROM bookmarks
            WHERE user_id = ?
            ORDER BY created_at DESC
        ");

        $stmt->execute([$user_id]);

        echo json_encode([
            "success" => true,
            "bookmarks" => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ]);

    } catch (PDOException $e) {

        echo json_encode([
            "success" => false,
            "message" => "Could not load bookmarks"
        ]);

    }

    exit;
}


/* =========================================
   SAVE BOOKMARK
========================================= */

if ($method === "POST") {

    $data = json_decode(
        file_get_contents("php://input"),
        true
    );

    $item_type = $data["item_type"] ?? "";
    $item_key = trim($data["item_key"] ?? "");
    $title = trim($data["title"] ?? "");
    $content = trim($data["content"] ?? "");


    if (
        !in_array($item_type, ["tip", "insight"]) ||
        $item_key === "" ||
        $title === "" ||
        $content === ""
    ) {

        echo json_encode([
            "success" => false,
            "message" => "Invalid bookmark data"
        ]);

        exit;
    }


    try {

        /* Don't save the same item twice */

        $check = $pdo->prepare("
            SELECT bookmark_id
            FROM bookmarks
            WHERE user_id = ?
              AND item_type = ?
              AND item_key = ?
            LIMIT 1
        ");

        $check->execute([
            $user_id,
            $item_type,
            $item_key
        ]);


        $existing = $check->fetch(PDO::FETCH_ASSOC);


        if ($existing) {

            echo json_encode([
                "success" => true,
                "already_saved" => true,
                "bookmark_id" => $existing["bookmark_id"],
                "message" => "Already saved"
            ]);

            exit;
        }


        $stmt = $pdo->prepare("
            INSERT INTO bookmarks
            (
                user_id,
                item_type,
                item_key,
                title,
                content
            )
            VALUES (?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $user_id,
            $item_type,
            $item_key,
            $title,
            $content
        ]);


        echo json_encode([
            "success" => true,
            "already_saved" => false,
            "bookmark_id" => $pdo->lastInsertId(),
            "message" => "Saved successfully"
        ]);

    } catch (PDOException $e) {

        echo json_encode([
            "success" => false,
            "message" => "Could not save bookmark"
        ]);

    }

    exit;
}


/* =========================================
   DELETE BOOKMARK
========================================= */

if ($method === "DELETE") {

    $data = json_decode(
        file_get_contents("php://input"),
        true
    );

    $bookmark_id =
        $data["bookmark_id"] ?? null;


    if (!$bookmark_id) {

        echo json_encode([
            "success" => false,
            "message" => "Bookmark ID is required"
        ]);

        exit;
    }


    try {

        $stmt = $pdo->prepare("
            DELETE FROM bookmarks
            WHERE bookmark_id = ?
              AND user_id = ?
        ");

        $stmt->execute([
            $bookmark_id,
            $user_id
        ]);


        echo json_encode([
            "success" => true,
            "message" => "Bookmark removed"
        ]);

    } catch (PDOException $e) {

        echo json_encode([
            "success" => false,
            "message" => "Could not remove bookmark"
        ]);

    }

    exit;
}


echo json_encode([
    "success" => false,
    "message" => "Unsupported request"
]);