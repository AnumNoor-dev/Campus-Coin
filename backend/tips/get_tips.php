<?php

header("Content-Type: application/json");

session_start();

require "../config/db_connect.php";


/* =========================================================
   AUTH
========================================================= */

if (!isset($_SESSION["user_id"])) {

    echo json_encode([
        "success" => false,
        "message" => "Not logged in"
    ]);

    exit;
}


$user_id =
    $_SESSION["user_id"];


$current_month =
    date("m/Y");


try {


    /* =====================================================
       USER TIP PREFERENCES
       pinned / dismissed
    ====================================================== */

    $stmt =
        $pdo->prepare("
            SELECT
                tip_key,
                status
            FROM tip_preferences
            WHERE user_id = ?
        ");


    $stmt->execute([
        $user_id
    ]);


    $preferences = [];


    foreach (
        $stmt->fetchAll(
            PDO::FETCH_ASSOC
        ) as $row
    ) {

        $preferences[
            $row["tip_key"]
        ] =
            $row["status"];

    }



    /* =====================================================
       CURRENT MONTH SPENDING
    ====================================================== */

    $stmt =
        $pdo->prepare("
            SELECT
                t.category_id,
                c.name AS category_name,
                SUM(t.amount) AS spent

            FROM transactions t

            JOIN categories c
              ON c.category_id = t.category_id

            WHERE t.user_id = ?
              AND t.type = 'expense'
              AND YEAR(t.txn_date) = YEAR(CURDATE())
              AND MONTH(t.txn_date) = MONTH(CURDATE())

            GROUP BY
                t.category_id,
                c.name
        ");


    $stmt->execute([
        $user_id
    ]);


    $current_spending =
        $stmt->fetchAll(
            PDO::FETCH_ASSOC
        );



    /* =====================================================
       PREVIOUS 3 MONTH AVERAGE
    ====================================================== */

    $stmt =
        $pdo->prepare("
            SELECT
                category_id,
                SUM(amount) / 3 AS average_spending

            FROM transactions

            WHERE user_id = ?
              AND type = 'expense'
              AND txn_date >= DATE_FORMAT(
                    DATE_SUB(
                        CURDATE(),
                        INTERVAL 3 MONTH
                    ),
                    '%Y-%m-01'
                  )
              AND txn_date < DATE_FORMAT(
                    CURDATE(),
                    '%Y-%m-01'
                  )

            GROUP BY category_id
        ");


    $stmt->execute([
        $user_id
    ]);


    $history = [];


    foreach (
        $stmt->fetchAll(
            PDO::FETCH_ASSOC
        ) as $row
    ) {

        $history[
            $row["category_id"]
        ] =
            (float)
            $row["average_spending"];

    }



    /* =====================================================
       CURRENT MONTH BUDGETS
    ====================================================== */

    $stmt =
        $pdo->prepare("
            SELECT
                category_id,
                monthly_limit

            FROM budgets

            WHERE user_id = ?
              AND month_year = ?
        ");


    $stmt->execute([
        $user_id,
        $current_month
    ]);


    $budgets = [];


    foreach (
        $stmt->fetchAll(
            PDO::FETCH_ASSOC
        ) as $row
    ) {

        $budgets[
            $row["category_id"]
        ] =
            (float)
            $row["monthly_limit"];

    }



    /* =====================================================
       PERSONALIZED TIPS
    ====================================================== */

    $personalized_tips = [];


    foreach (
        $current_spending
        as $row
    ) {

        $category_id =
            $row["category_id"];


        $category_name =
            $row["category_name"];


        $spent =
            (float)
            $row["spent"];



        /* ===============================================
           BUDGET-BASED TIP
        =============================================== */

        if (
            isset(
                $budgets[
                    $category_id
                ]
            ) &&
            $budgets[
                $category_id
            ] > 0
        ) {

            $limit =
                $budgets[
                    $category_id
                ];


            $percent_used =
                (
                    $spent /
                    $limit
                ) * 100;


            if (
                $percent_used >= 80
            ) {

                $tip_key =
                    "budget_" .
                    $category_id;


                /*
                  Dismissed tips should not
                  appear again.
                */

                if (
                    (
                        $preferences[
                            $tip_key
                        ] ?? ""
                    ) !== "dismissed"
                ) {

                    $potential_saving =
                        max(
                            0,
                            $spent -
                            (
                                $limit *
                                0.80
                            )
                        );


                    $personalized_tips[] = [

                        "tip_key" =>
                            $tip_key,

                        "category_id" =>
                            $category_id,

                        "category_name" =>
                            $category_name,

                        "type" =>
                            "budget",

                        "source" =>
                            "personalized",

                        "title" =>
                            "Watch your " .
                            $category_name .
                            " budget",

                        "message" =>
                            "You have used " .
                            round(
                                $percent_used
                            ) .
                            "% of this month's budget. Try to keep the remaining spending lower.",

                        "potential_saving" =>
                            round(
                                $potential_saving,
                                2
                            ),

                        "is_pinned" =>
                            (
                                (
                                    $preferences[
                                        $tip_key
                                    ] ?? ""
                                ) === "pinned"
                            ),

                        "is_dismissed" =>
                            false

                    ];

                }

            }

        }



        /* ===============================================
           HISTORY-BASED TIP
        =============================================== */

        $average =
            $history[
                $category_id
            ] ?? 0;


        if (
            $average > 0 &&
            $spent >
            (
                $average *
                1.15
            )
        ) {

            $tip_key =
                "history_" .
                $category_id;


            if (
                (
                    $preferences[
                        $tip_key
                    ] ?? ""
                ) !== "dismissed"
            ) {

                $increase =
                    (
                        (
                            $spent -
                            $average
                        ) /
                        $average
                    ) * 100;


                $potential_saving =
                    $spent -
                    $average;


                $personalized_tips[] = [

                    "tip_key" =>
                        $tip_key,

                    "category_id" =>
                        $category_id,

                    "category_name" =>
                        $category_name,

                    "type" =>
                        "history",

                    "source" =>
                        "personalized",

                    "title" =>
                        $category_name .
                        " spending is higher than usual",

                    "message" =>
                        "You are spending about " .
                        round(
                            $increase
                        ) .
                        "% more than your recent 3-month average in this category.",

                    "potential_saving" =>
                        round(
                            $potential_saving,
                            2
                        ),

                    "is_pinned" =>
                        (
                            (
                                $preferences[
                                    $tip_key
                                ] ?? ""
                            ) === "pinned"
                        ),

                    "is_dismissed" =>
                        false

                ];

            }

        }

    }



    /* =====================================================
       RANK PERSONALIZED TIPS BY SAVING IMPACT
    ====================================================== */

    usort(
        $personalized_tips,

        function (
            $a,
            $b
        ) {

            /*
              Pinned tips appear first.
            */

            if (
                $a["is_pinned"] !==
                $b["is_pinned"]
            ) {

                return
                    $a["is_pinned"]
                        ? -1
                        : 1;

            }


            return
                $b[
                    "potential_saving"
                ]
                <=>
                $a[
                    "potential_saving"
                ];

        }
    );


    /*
      Top few personalized opportunities.
    */

    $personalized_tips =
        array_slice(
            $personalized_tips,
            0,
            5
        );



    /* =====================================================
       ADMIN TIP TEMPLATES
    ====================================================== */

    $stmt =
        $pdo->query("
            SELECT
                content_id,
                title,
                content,
                created_at

            FROM admin_content

            WHERE type = 'tip_template'
              AND is_active = 1

            ORDER BY created_at DESC

            LIMIT 3
        ");


    $template_tips = [];


    foreach (
        $stmt->fetchAll(
            PDO::FETCH_ASSOC
        ) as $row
    ) {

        $tip_key =
            "template_" .
            $row["content_id"];


        /*
          Respect student's dismiss choice.
        */

        if (
            (
                $preferences[
                    $tip_key
                ] ?? ""
            ) === "dismissed"
        ) {

            continue;

        }


        $template_tips[] = [

            "tip_key" =>
                $tip_key,

            "category_id" =>
                null,

            "category_name" =>
                null,

            "content_id" =>
                $row[
                    "content_id"
                ],

            "type" =>
                "template",

            "source" =>
                "admin_template",

            "title" =>
                $row["title"],

            "message" =>
                $row["content"],

            /*
              Admin templates are general advice,
              so we do not invent a financial
              saving amount.
            */

            "potential_saving" =>
                0,

            "is_pinned" =>
                (
                    (
                        $preferences[
                            $tip_key
                        ] ?? ""
                    ) === "pinned"
                ),

            "is_dismissed" =>
                false,

            "created_at" =>
                $row[
                    "created_at"
                ]

        ];

    }



    /* =====================================================
       FALLBACK PERSONALIZED MESSAGE
    ====================================================== */

    if (
        empty(
            $personalized_tips
        )
    ) {

        $tip_key =
            "general_on_track";


        if (
            (
                $preferences[
                    $tip_key
                ] ?? ""
            ) !== "dismissed"
        ) {

            $personalized_tips[] = [

                "tip_key" =>
                    $tip_key,

                "category_id" =>
                    null,

                "category_name" =>
                    null,

                "type" =>
                    "general",

                "source" =>
                    "personalized",

                "title" =>
                    "Your spending looks on track",

                "message" =>
                    "No major overspending pattern was found this month. Keep tracking your expenses regularly.",

                "potential_saving" =>
                    0,

                "is_pinned" =>
                    (
                        (
                            $preferences[
                                $tip_key
                            ] ?? ""
                        ) === "pinned"
                    ),

                "is_dismissed" =>
                    false

            ];

        }

    }



    /* =====================================================
       FINAL TIP LIST

       Personalized tips first.
       Admin templates follow them.
    ====================================================== */

    $tips =
        array_merge(
            $personalized_tips,
            $template_tips
        );



    echo json_encode([

        "success" =>
            true,

        "tips" =>
            $tips,

        "personalized_count" =>
            count(
                $personalized_tips
            ),

        "template_count" =>
            count(
                $template_tips
            )

    ]);


}

catch (
    Throwable $e
) {

    http_response_code(
        500
    );


    echo json_encode([

        "success" =>
            false,

        "message" =>
            "Could not generate saving tips"

    ]);

}

?>