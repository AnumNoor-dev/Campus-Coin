<?php

session_start();

require "../config/db_connect.php";
require "../lib/fpdf/fpdf.php";


if (!isset($_SESSION["user_id"])) {

    die("Not logged in. Please login first.");

}


$user_id =
    $_SESSION["user_id"];


/* =========================================================
   HELPERS
========================================================= */

function validDate($value)
{
    if (!$value) {
        return false;
    }

    $date =
        DateTime::createFromFormat(
            "Y-m-d",
            $value
        );

    return (
        $date &&
        $date->format("Y-m-d") === $value
    );
}


function pdfText($text)
{
    $text =
        (string)($text ?? "");

    $converted =
        @iconv(
            "UTF-8",
            "windows-1252//TRANSLIT//IGNORE",
            $text
        );

    return $converted !== false
        ? $converted
        : $text;
}


function shortText(
    $text,
    $length = 35
) {

    $text =
        trim(
            (string)($text ?? "")
        );

    if (
        function_exists(
            "mb_substr"
        )
    ) {

        if (
            mb_strlen($text) >
            $length
        ) {

            return
                mb_substr(
                    $text,
                    0,
                    $length - 3
                ) . "...";

        }

        return $text;
    }


    if (
        strlen($text) >
        $length
    ) {

        return
            substr(
                $text,
                0,
                $length - 3
            ) . "...";

    }


    return $text;
}


/* =========================================================
   FILTERS
========================================================= */

$start_date =
    $_GET["start_date"] ??
    date("Y-m-01");


$end_date =
    $_GET["end_date"] ??
    date("Y-m-t");


if (!validDate($start_date)) {

    $start_date =
        date("Y-m-01");

}


if (!validDate($end_date)) {

    $end_date =
        date("Y-m-t");

}


if (
    strtotime($start_date) >
    strtotime($end_date)
) {

    $temporary =
        $start_date;

    $start_date =
        $end_date;

    $end_date =
        $temporary;

}


$category_id =
    isset($_GET["category_id"]) &&
    ctype_digit(
        (string)$_GET["category_id"]
    )
        ? (int)$_GET["category_id"]
        : null;


$income_source_id =
    isset($_GET["income_source_id"]) &&
    ctype_digit(
        (string)$_GET["income_source_id"]
    )
        ? (int)$_GET["income_source_id"]
        : null;


/* =========================================================
   USER
========================================================= */

$userStmt =
    $pdo->prepare("
        SELECT name
        FROM users
        WHERE user_id = ?
        LIMIT 1
    ");


$userStmt->execute([
    $user_id
]);


$user =
    $userStmt->fetch(
        PDO::FETCH_ASSOC
    );


$userName =
    $user["name"] ??
    "Student";


/* =========================================================
   WHERE CLAUSE
========================================================= */

$where = [

    "t.user_id = ?",

    "t.txn_date BETWEEN ? AND ?"

];


$params = [

    $user_id,

    $start_date,

    $end_date

];


if ($category_id !== null) {

    $where[] =
        "t.category_id = ?";

    $params[] =
        $category_id;

}


if (
    $income_source_id !== null
) {

    $where[] =
        "t.type = 'income'";

    $where[] =
        "t.category_id = ?";

    $params[] =
        $income_source_id;

}


$whereSql =
    implode(
        " AND ",
        $where
    );


/* =========================================================
   FILTER LABELS
========================================================= */

$categoryName =
    "All expense categories";


if ($category_id !== null) {

    $stmt =
        $pdo->prepare("
            SELECT name
            FROM categories
            WHERE category_id = ?
            LIMIT 1
        ");


    $stmt->execute([
        $category_id
    ]);


    $row =
        $stmt->fetch(
            PDO::FETCH_ASSOC
        );


    if ($row) {

        $categoryName =
            $row["name"];

    }

}


$incomeSourceName =
    "All income sources";


if (
    $income_source_id !== null
) {

    $stmt =
        $pdo->prepare("
            SELECT name
            FROM categories
            WHERE category_id = ?
              AND type = 'income'
            LIMIT 1
        ");


    $stmt->execute([
        $income_source_id
    ]);


    $row =
        $stmt->fetch(
            PDO::FETCH_ASSOC
        );


    if ($row) {

        $incomeSourceName =
            $row["name"];

    }

}


/* =========================================================
   TOTALS
========================================================= */

$totalsStmt =
    $pdo->prepare("
        SELECT
            t.type,
            SUM(t.amount) AS total

        FROM transactions t

        WHERE $whereSql

        GROUP BY t.type
    ");


$totalsStmt->execute(
    $params
);


$totals = [

    "income" => 0,

    "expense" => 0

];


foreach (
    $totalsStmt->fetchAll(
        PDO::FETCH_ASSOC
    ) as $row
) {

    $totals[
        $row["type"]
    ] =
        (float)$row["total"];

}


$balance =
    $totals["income"] -
    $totals["expense"];


/* =========================================================
   CATEGORY-WISE EXPENSES
========================================================= */

$categoryStmt =
    $pdo->prepare("
        SELECT
            c.name AS category_name,
            SUM(t.amount) AS total

        FROM transactions t

        JOIN categories c
          ON c.category_id = t.category_id

        WHERE $whereSql
          AND t.type = 'expense'

        GROUP BY
            t.category_id,
            c.name

        ORDER BY total DESC
    ");


$categoryStmt->execute(
    $params
);


$categoryBreakdown =
    $categoryStmt->fetchAll(
        PDO::FETCH_ASSOC
    );


/* =========================================================
   FILTERED TRANSACTIONS
========================================================= */

$transactionStmt =
    $pdo->prepare("
        SELECT
            t.txn_date,
            c.name AS category_name,
            t.type,
            t.amount,
            t.description

        FROM transactions t

        JOIN categories c
          ON c.category_id = t.category_id

        WHERE $whereSql

        ORDER BY
            t.txn_date DESC,
            t.transaction_id DESC
    ");


$transactionStmt->execute(
    $params
);


$transactions =
    $transactionStmt->fetchAll(
        PDO::FETCH_ASSOC
    );


/* =========================================================
   BUILD PDF
========================================================= */

$pdf =
    new FPDF();


$pdf->SetAutoPageBreak(
    true,
    15
);


$pdf->AddPage();


/* HEADER */

$pdf->SetFont(
    "Arial",
    "B",
    18
);


$pdf->SetTextColor(
    28,
    91,
    67
);


$pdf->Cell(
    0,
    10,
    "Campus Coin - Financial Report",
    0,
    1,
    "C"
);


$pdf->SetTextColor(
    0,
    0,
    0
);


$pdf->SetFont(
    "Arial",
    "",
    10
);


$pdf->Cell(
    0,
    7,
    pdfText(
        "Student: " .
        $userName
    ),
    0,
    1,
    "C"
);


$pdf->Cell(
    0,
    7,
    "Period: " .
    date(
        "d M Y",
        strtotime(
            $start_date
        )
    ) .
    " to " .
    date(
        "d M Y",
        strtotime(
            $end_date
        )
    ),
    0,
    1,
    "C"
);


$pdf->Cell(
    0,
    7,
    "Generated: " .
    date(
        "d M Y"
    ),
    0,
    1,
    "C"
);


$pdf->Ln(5);


/* FILTER INFORMATION */

$pdf->SetFont(
    "Arial",
    "B",
    12
);


$pdf->Cell(
    0,
    8,
    "Applied Filters",
    0,
    1
);


$pdf->SetFont(
    "Arial",
    "",
    10
);


$pdf->Cell(
    55,
    7,
    "Expense Category:",
    0,
    0
);


$pdf->Cell(
    0,
    7,
    pdfText(
        $categoryName
    ),
    0,
    1
);


$pdf->Cell(
    55,
    7,
    "Income Source:",
    0,
    0
);


$pdf->Cell(
    0,
    7,
    pdfText(
        $incomeSourceName
    ),
    0,
    1
);


$pdf->Ln(4);


/* SUMMARY */

$pdf->SetFont(
    "Arial",
    "B",
    13
);


$pdf->Cell(
    0,
    8,
    "Summary",
    0,
    1
);


$pdf->SetFont(
    "Arial",
    "",
    11
);


$pdf->Cell(
    90,
    8,
    "Total Income:",
    0,
    0
);


$pdf->Cell(
    0,
    8,
    "Rs. " .
    number_format(
        $totals["income"],
        2
    ),
    0,
    1
);


$pdf->Cell(
    90,
    8,
    "Total Expense:",
    0,
    0
);


$pdf->Cell(
    0,
    8,
    "Rs. " .
    number_format(
        $totals["expense"],
        2
    ),
    0,
    1
);


$pdf->Cell(
    90,
    8,
    "Net Balance:",
    0,
    0
);


$pdf->Cell(
    0,
    8,
    "Rs. " .
    number_format(
        $balance,
        2
    ),
    0,
    1
);


$pdf->Ln(6);


/* CATEGORY BREAKDOWN */

$pdf->SetFont(
    "Arial",
    "B",
    13
);


$pdf->Cell(
    0,
    8,
    "Category-wise Expenses",
    0,
    1
);


$pdf->SetFont(
    "Arial",
    "B",
    10
);


$pdf->SetFillColor(
    31,
    107,
    82
);


$pdf->SetTextColor(
    255,
    255,
    255
);


$pdf->Cell(
    120,
    8,
    "Category",
    1,
    0,
    "L",
    true
);


$pdf->Cell(
    60,
    8,
    "Amount (Rs.)",
    1,
    1,
    "R",
    true
);


$pdf->SetFont(
    "Arial",
    "",
    10
);


$pdf->SetTextColor(
    0,
    0,
    0
);


if (
    empty(
        $categoryBreakdown
    )
) {

    $pdf->Cell(
        180,
        9,
        "No expense category data for the selected filters.",
        1,
        1,
        "C"
    );

}

else {

    foreach (
        $categoryBreakdown
        as $category
    ) {

        $pdf->Cell(
            120,
            8,
            pdfText(
                shortText(
                    $category[
                        "category_name"
                    ],
                    45
                )
            ),
            1
        );


        $pdf->Cell(
            60,
            8,
            number_format(
                $category[
                    "total"
                ],
                2
            ),
            1,
            1,
            "R"
        );

    }

}


$pdf->Ln(7);


/* TRANSACTIONS */

$pdf->SetFont(
    "Arial",
    "B",
    13
);


$pdf->Cell(
    0,
    8,
    "Transactions",
    0,
    1
);


function transactionHeader($pdf)
{
    $pdf->SetFont(
        "Arial",
        "B",
        9
    );


    $pdf->SetFillColor(
        31,
        107,
        82
    );


    $pdf->SetTextColor(
        255,
        255,
        255
    );


    $pdf->Cell(
        27,
        8,
        "Date",
        1,
        0,
        "C",
        true
    );


    $pdf->Cell(
        38,
        8,
        "Category",
        1,
        0,
        "C",
        true
    );


    $pdf->Cell(
        23,
        8,
        "Type",
        1,
        0,
        "C",
        true
    );


    $pdf->Cell(
        30,
        8,
        "Amount",
        1,
        0,
        "C",
        true
    );


    $pdf->Cell(
        62,
        8,
        "Description",
        1,
        1,
        "C",
        true
    );


    $pdf->SetTextColor(
        0,
        0,
        0
    );


    $pdf->SetFont(
        "Arial",
        "",
        8
    );
}


transactionHeader(
    $pdf
);


if (
    empty(
        $transactions
    )
) {

    $pdf->Cell(
        180,
        9,
        "No transactions found for the selected filters.",
        1,
        1,
        "C"
    );

}

else {

    foreach (
        $transactions
        as $transaction
    ) {

        if (
            $pdf->GetY() > 265
        ) {

            $pdf->AddPage();


            transactionHeader(
                $pdf
            );

        }


        $pdf->Cell(
            27,
            7,
            $transaction[
                "txn_date"
            ],
            1
        );


        $pdf->Cell(
            38,
            7,
            pdfText(
                shortText(
                    $transaction[
                        "category_name"
                    ],
                    20
                )
            ),
            1
        );


        $pdf->Cell(
            23,
            7,
            ucfirst(
                $transaction[
                    "type"
                ]
            ),
            1
        );


        $pdf->Cell(
            30,
            7,
            number_format(
                $transaction[
                    "amount"
                ],
                2
            ),
            1,
            0,
            "R"
        );


        $pdf->Cell(
            62,
            7,
            pdfText(
                shortText(
                    $transaction[
                        "description"
                    ] ??
                    "",
                    32
                )
            ),
            1,
            1
        );

    }

}


/* =========================================================
   DOWNLOAD
========================================================= */

$fileName =
    "CampusCoin_Report_" .
    $start_date .
    "_to_" .
    $end_date .
    ".pdf";


$pdf->Output(
    "D",
    $fileName
);

?>