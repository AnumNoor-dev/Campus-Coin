/* =========================================================
   CAMPUS COIN — REPORTS / ANALYTICS
   Complete working page logic
========================================================= */

const API = {
  profile: "../backend/profile/get_profile.php",
  categories: "../backend/categories/get_categories.php",
  reports: "../backend/reports/get_reports.php",
  insights: "../backend/insights/get_insights.php",
  bookmarks: "../backend/bookmarks/bookmarks.php",
  exportPdf: "../backend/reports/export_pdf.php",
  logout: "../backend/auth/logout.php"
};


let currentReportData = null;
let currentInsightText = "";
let savedInsightKeys = new Set();
let reportLoadToken = 0;


/* =========================================================
   HELPERS
========================================================= */

function money(value) {

  return `Rs. ${Number(
    value || 0
  ).toLocaleString(
    "en-PK",
    {
      maximumFractionDigits: 0
    }
  )}`;

}


function escapeHTML(value) {

  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}


async function getJSON(
  url,
  options = {}
) {

  const response =
    await fetch(
      url,
      {
        credentials:
          "same-origin",

        ...options
      }
    );


  const text =
    await response.text();


  if (
    !text.trim()
  ) {

    throw new Error(
      "Empty server response"
    );

  }


  let data;


  try {

    data =
      JSON.parse(
        text
      );

  }

  catch (error) {

    console.error(
      "Server returned:",
      text
    );


    throw new Error(
      "Invalid JSON response"
    );

  }


  if (
    data.success === false &&
    /not logged in/i.test(
      String(
        data.message || ""
      )
    )
  ) {

    window.location.href =
      "index.html";


    throw new Error(
      "Session expired"
    );

  }


  return data;

}


function animateMoney(
  element,
  target
) {

  if (!element) {
    return;
  }


  const amount =
    Number(
      target || 0
    );


  const start =
    performance.now();


  const duration =
    500;


  function frame(now) {

    const progress =
      Math.min(
        (
          now -
          start
        ) /
        duration,
        1
      );


    const eased =
      1 -
      Math.pow(
        1 -
        progress,
        3
      );


    element.textContent =
      money(
        amount *
        eased
      );


    if (
      progress < 1
    ) {

      requestAnimationFrame(
        frame
      );

    }

    else {

      element.textContent =
        money(
          amount
        );

    }

  }


  requestAnimationFrame(
    frame
  );

}


function todayString() {

  const today =
    new Date();


  return `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(
    2,
    "0"
  )}-${String(
    today.getDate()
  ).padStart(
    2,
    "0"
  )}`;

}


function currentMonthStart() {

  const today =
    new Date();


  return `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(
    2,
    "0"
  )}-01`;

}


function setStatus(
  message = "",
  type = ""
) {

  const box =
    document.getElementById(
      "reportsStatus"
    );


  if (!box) {
    return;
  }


  box.textContent =
    message;


  box.className =
    "reports-status";


  if (message) {

    box.classList.add(
      "show"
    );


    if (type) {

      box.classList.add(
        type
      );

    }

  }

}


function categoryAmount(item) {

  return Number(
    item?.total ??
    item?.amount ??
    item?.total_expense ??
    item?.spent ??
    0
  );

}


function categoryName(item) {

  return (
    item?.category_name ||
    item?.name ||
    item?.category ||
    "Other"
  );

}


function getTotals(data) {

  return (
    data?.totals ||
    data?.summary ||
    {}
  );

}


function getCategoryRows(data) {

  return (
    data?.category_breakdown ||
    data?.categories ||
    data?.category_report ||
    []
  );

}


function getMonthlyRows(data) {

  return (
    data?.monthly_trend ||
    data?.six_month_trend ||
    data?.monthly ||
    []
  );

}


function getWeeklyRows(data) {

  return (
    data?.weekly_summary ||
    data?.weekly ||
    []
  );

}


function getDailyRows(data) {

  return (
    data?.daily_summary ||
    data?.daily ||
    []
  );

}


/* =========================================================
   PROFILE
========================================================= */

async function loadProfile() {

  try {

    const data =
      await getJSON(
        API.profile
      );


    if (!data.success) {
      return;
    }


    const profile =
      data.profile ||
      data.user ||
      {};


    const name =
      profile.name ||
      "Student";


    const nameBox =
      document.getElementById(
        "topbarUserName"
      );


    if (nameBox) {

      nameBox.textContent =
        name;

    }


    const initials =
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(
          0,
          2
        )
        .map(
          part =>
            part[0].toUpperCase()
        )
        .join("");


    const avatar =
      document.getElementById(
        "userAvatar"
      );


    if (avatar) {

      avatar.textContent =
        initials ||
        "CU";

    }

  }

  catch (error) {

    console.error(
      "Profile error:",
      error
    );

  }

}


/* =========================================================
   DEFAULT DATES
========================================================= */

function setDefaultDates() {

  const start =
    document.getElementById(
      "startDateFilter"
    );


  const end =
    document.getElementById(
      "endDateFilter"
    );


  if (
    start &&
    !start.value
  ) {

    start.value =
      currentMonthStart();

  }


  if (
    end &&
    !end.value
  ) {

    end.value =
      todayString();

  }

}


/* =========================================================
   CATEGORY + INCOME SOURCE FILTERS
========================================================= */

async function loadCategories() {

  const categorySelect =
    document.getElementById(
      "reportCategoryFilter"
    );


  const incomeSelect =
    document.getElementById(
      "incomeSourceFilter"
    );


  if (
    !categorySelect ||
    !incomeSelect
  ) {

    return;

  }


  try {

    const data =
      await getJSON(
        API.categories
      );


    if (!data.success) {

      return;

    }


    const categories =
      Array.isArray(
        data.categories
      )
        ? data.categories
        : [];


    categorySelect.innerHTML = `
      <option value="">
        All Expense Categories
      </option>
    `;


    incomeSelect.innerHTML = `
      <option value="">
        All Income Sources
      </option>
    `;


    categories.forEach(
      category => {

        const type =
          String(
            category.type || ""
          ).toLowerCase();


        const option =
          document.createElement(
            "option"
          );


        option.value =
          category.category_id;


        option.textContent =
          category.name;


        if (
          type === "expense"
        ) {

          categorySelect.appendChild(
            option
          );

        }

        else if (
          type === "income"
        ) {

          incomeSelect.appendChild(
            option
          );

        }

      }
    );

  }

  catch (error) {

    console.error(
      "Categories error:",
      error
    );

  }

}


const reportCategoryFilter =
  document.getElementById(
    "reportCategoryFilter"
  );


const incomeSourceFilter =
  document.getElementById(
    "incomeSourceFilter"
  );


reportCategoryFilter
  ?.addEventListener(
    "change",
    () => {

      if (
        reportCategoryFilter.value &&
        incomeSourceFilter
      ) {

        incomeSourceFilter.value =
          "";

      }

    }
  );


incomeSourceFilter
  ?.addEventListener(
    "change",
    () => {

      if (
        incomeSourceFilter.value &&
        reportCategoryFilter
      ) {

        reportCategoryFilter.value =
          "";

      }

    }
  );


/* =========================================================
   REPORT PARAMS
========================================================= */

function reportParams() {

  const startDate =
    document.getElementById(
      "startDateFilter"
    )?.value || "";


  const endDate =
    document.getElementById(
      "endDateFilter"
    )?.value || "";


  const category =
    document.getElementById(
      "reportCategoryFilter"
    )?.value || "";


  const incomeSource =
    document.getElementById(
      "incomeSourceFilter"
    )?.value || "";


  const params =
    new URLSearchParams();


  if (startDate) {

    params.set(
      "start_date",
      startDate
    );

  }


  if (endDate) {

    params.set(
      "end_date",
      endDate
    );

  }


  if (category) {

    params.set(
      "category_id",
      category
    );

  }


  if (incomeSource) {

    params.set(
      "income_source_id",
      incomeSource
    );

  }


  return params;

}


function filtersAreValid() {

  const start =
    document.getElementById(
      "startDateFilter"
    )?.value || "";


  const end =
    document.getElementById(
      "endDateFilter"
    )?.value || "";


  if (
    start &&
    end &&
    start > end
  ) {

    setStatus(
      "Start date cannot be after end date.",
      "error"
    );


    return false;

  }


  return true;

}


/* =========================================================
   LOAD REPORTS
========================================================= */

async function loadReports() {

  if (
    !filtersAreValid()
  ) {

    return;

  }


  const token =
    ++reportLoadToken;


  setStatus(
    "Loading analytics...",
    "loading"
  );


  try {

    const params =
      reportParams();


    const data =
      await getJSON(
        `${API.reports}?${params.toString()}`
      );


    if (
      token !==
      reportLoadToken
    ) {

      return;

    }


    if (!data.success) {

      setStatus(
        data.message ||
        "Report could not load.",
        "error"
      );


      return;

    }


    currentReportData =
      data;


    renderSummary(
      data
    );


    renderMonthlyTrend(
      getMonthlyRows(
        data
      )
    );


    renderCategories(
      getCategoryRows(
        data
      )
    );


    renderWeekly(
      getWeeklyRows(
        data
      )
    );


    renderDaily(
      getDailyRows(
        data
      )
    );


    renderHealthScore(
      getTotals(
        data
      )
    );


    await loadInsight(
      data
    );


    updateSaveInsightButton();


    setStatus("");

  }

  catch (error) {

    console.error(
      "Reports error:",
      error
    );


    setStatus(
      "Could not load analytics. Please refresh and try again.",
      "error"
    );

  }

}


/* =========================================================
   SUMMARY
========================================================= */

function renderSummary(data) {

  const totals =
    getTotals(
      data
    );


  const income =
    Number(
      totals.income ??
      totals.total_income ??
      0
    );


  const expense =
    Number(
      totals.expense ??
      totals.total_expense ??
      0
    );


  const balance =
    Number(
      totals.balance ??
      totals.net_balance ??
      (
        income -
        expense
      )
    );


  animateMoney(
    document.getElementById(
      "reportIncome"
    ),
    income
  );


  animateMoney(
    document.getElementById(
      "reportExpense"
    ),
    expense
  );


  animateMoney(
    document.getElementById(
      "reportBalance"
    ),
    balance
  );


  const rows =
    getCategoryRows(
      data
    );


  const sorted =
    [...rows].sort(
      (
        a,
        b
      ) =>
        categoryAmount(
          b
        ) -
        categoryAmount(
          a
        )
    );


  const top =
    sorted[0];


  const topBox =
    document.getElementById(
      "topCategory"
    );


  if (topBox) {

    topBox.textContent =
      top
        ? categoryName(
            top
          )
        : "—";

  }


  const donutTotal =
    document.getElementById(
      "donutReportTotal"
    );


  if (donutTotal) {

    donutTotal.textContent =
      money(
        expense
      );

  }

}


/* =========================================================
   SIX MONTH CHART
========================================================= */

function normalizeMonth(rawValue) {

  const raw =
    String(
      rawValue || ""
    ).trim();


  if (
    /^\d{4}-\d{2}$/.test(
      raw
    )
  ) {

    return raw;

  }


  if (
    /^\d{2}\/\d{4}$/.test(
      raw
    )
  ) {

    const [
      month,
      year
    ] =
      raw.split("/");


    return `${year}-${month}`;

  }


  return raw;

}


function renderMonthlyTrend(rows) {

  const container =
    document.getElementById(
      "monthlyChart"
    );


  if (!container) {

    return;

  }


  const months =
    [];


  const now =
    new Date();


  for (
    let i = 5;
    i >= 0;
    i--
  ) {

    const date =
      new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1
      );


    const key =
      `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(
        2,
        "0"
      )}`;


    months.push({

      key,

      label:
        date.toLocaleDateString(
          "en-US",
          {
            month: "short"
          }
        ),

      income: 0,

      expense: 0

    });

  }


  (
    rows || []
  ).forEach(
    row => {

      const key =
        normalizeMonth(
          row.month ||
          row.month_year ||
          row.period
        );


      const match =
        months.find(
          item =>
            item.key ===
            key
        );


      if (!match) {

        return;

      }


      match.income =
        Number(
          row.income ??
          row.total_income ??
          0
        );


      match.expense =
        Number(
          row.expense ??
          row.total_expense ??
          0
        );

    }
  );


  const maximum =
    Math.max(
      1,

      ...months.flatMap(
        month => [
          month.income,
          month.expense
        ]
      )
    );


  container.innerHTML =
    "";


  months.forEach(
    (
      month,
      index
    ) => {

      const incomeHeight =
        month.income > 0
          ? Math.max(
              4,
              (
                month.income /
                maximum
              ) *
              100
            )
          : 0;


      const expenseHeight =
        month.expense > 0
          ? Math.max(
              4,
              (
                month.expense /
                maximum
              ) *
              100
            )
          : 0;


      const column =
        document.createElement(
          "div"
        );


      column.className =
        "month-column";


      column.innerHTML = `
        <div class="month-bars">

          <div
            class="month-bar income"
            style="
              height:${incomeHeight}%;
              animation-delay:${index * .05}s
            "
            title="Income: ${escapeHTML(
              money(
                month.income
              )
            )}"
          ></div>


          <div
            class="month-bar expense"
            style="
              height:${expenseHeight}%;
              animation-delay:${index * .05 + .03}s
            "
            title="Expense: ${escapeHTML(
              money(
                month.expense
              )
            )}"
          ></div>

        </div>


        <div class="month-label">
          ${escapeHTML(
            month.label
          )}
        </div>
      `;


      container.appendChild(
        column
      );

    }
  );

}


/* =========================================================
   CATEGORY DONUT
========================================================= */

function renderCategories(rows) {

  const donut =
    document.getElementById(
      "analyticsDonut"
    );


  const list =
    document.getElementById(
      "analyticsCategoryList"
    );


  if (
    !donut ||
    !list
  ) {

    return;

  }


  const sorted =
    [...(rows || [])]
      .filter(
        item =>
          categoryAmount(
            item
          ) > 0
      )
      .sort(
        (
          a,
          b
        ) =>
          categoryAmount(
            b
          ) -
          categoryAmount(
            a
          )
      );


  if (
    !sorted.length
  ) {

    donut.style.background =
      "#edf2ee";


    list.innerHTML = `
      <div class="analytics-category-empty">
        No spending data yet
      </div>
    `;


    return;

  }


  const colors = [
    "#2d8867",
    "#7199df",
    "#e5ac52",
    "#d47770",
    "#8d75cb",
    "#56aaa6",
    "#a9b6bf"
  ];


  const visible =
    sorted.slice(
      0,
      7
    );


  const total =
    visible.reduce(
      (
        sum,
        item
      ) =>
        sum +
        categoryAmount(
          item
        ),
      0
    );


  const segments =
    [];


  let progress =
    0;


  list.innerHTML =
    "";


  visible.forEach(
    (
      item,
      index
    ) => {

      const amount =
        categoryAmount(
          item
        );


      const percentage =
        total > 0
          ? (
              amount /
              total
            ) *
            100
          : 0;


      const start =
        progress;


      const end =
        progress +
        percentage;


      const color =
        colors[
          index %
          colors.length
        ];


      segments.push(
        `${color} ${start}% ${end}%`
      );


      progress =
        end;


      const row =
        document.createElement(
          "div"
        );


      row.className =
        "analytics-category-item";


      row.innerHTML = `
        <span
          class="analytics-category-dot"
          style="--dot-color:${color}"
        ></span>

        <span class="analytics-category-name">
          ${escapeHTML(
            categoryName(
              item
            )
          )}
        </span>

        <strong class="analytics-category-amount">
          ${escapeHTML(
            money(
              amount
            )
          )}
        </strong>
      `;


      list.appendChild(
        row
      );

    }
  );


  donut.style.background =
    `conic-gradient(${segments.join(",")})`;

}


/* =========================================================
   WEEKLY
========================================================= */

function renderWeekly(rows) {

  const container =
    document.getElementById(
      "weeklyBars"
    );


  if (!container) {

    return;

  }


  const cleaned =
    (
      rows || []
    ).map(
      row => ({

        week:
          Number(
            row.week_number ??
            row.week ??
            0
          ),

        total:
          Number(
            row.total ??
            row.amount ??
            0
          )

      })
    );


  if (
    !cleaned.length
  ) {

    container.innerHTML = `
      <div class="weekly-empty">
        Weekly spending will appear here.
      </div>
    `;


    return;

  }


  const maximum =
    Math.max(
      1,
      ...cleaned.map(
        row =>
          row.total
      )
    );


  container.innerHTML =
    "";


  cleaned.forEach(
    row => {

      const percent =
        Math.max(
          3,
          (
            row.total /
            maximum
          ) *
          100
        );


      const item =
        document.createElement(
          "div"
        );


      item.className =
        "week-item";


      item.innerHTML = `
        <span>
          Week ${escapeHTML(
            row.week ||
            "—"
          )}
        </span>

        <div class="week-track">
          <div
            class="week-bar-fill"
            style="width:${percent}%"
          ></div>
        </div>

        <strong>
          ${escapeHTML(
            money(
              row.total
            )
          )}
        </strong>
      `;


      container.appendChild(
        item
      );

    }
  );

}


/* =========================================================
   DAILY
========================================================= */

function renderDaily(rows) {

  const container =
    document.getElementById(
      "dailySummary"
    );


  if (!container) {

    return;

  }


  const cleaned =
    (
      rows || []
    )
      .map(
        row => ({

          date:
            row.date ||
            row.txn_date ||
            "",

          total:
            Number(
              row.total ??
              row.amount ??
              0
            )

        })
      )
      .filter(
        row =>
          row.date
      )
      .sort(
        (
          a,
          b
        ) =>
          String(
            b.date
          ).localeCompare(
            String(
              a.date
            )
          )
      );


  if (
    !cleaned.length
  ) {

    container.innerHTML = `
      <div class="daily-empty">
        No daily spending activity yet.
      </div>
    `;


    return;

  }


  container.innerHTML =
    "";


  cleaned.forEach(
    row => {

      const date =
        new Date(
          `${row.date}T00:00:00`
        );


      const day =
        Number.isNaN(
          date.getTime()
        )
          ? "—"
          : date.getDate();


      const label =
        Number.isNaN(
          date.getTime()
        )
          ? row.date
          : date.toLocaleDateString(
              "en-PK",
              {
                weekday:
                  "short",

                day:
                  "2-digit",

                month:
                  "short"
              }
            );


      const item =
        document.createElement(
          "div"
        );


      item.className =
        "daily-item";


      item.innerHTML = `
        <div class="daily-date-icon">
          ${escapeHTML(
            day
          )}
        </div>

        <div>
          <strong>
            ${escapeHTML(
              label
            )}
          </strong>

          <span>
            Daily spending
          </span>
        </div>

        <span class="daily-amount">
          ${escapeHTML(
            money(
              row.total
            )
          )}
        </span>
      `;


      container.appendChild(
        item
      );

    }
  );

}


/* =========================================================
   HEALTH SNAPSHOT
========================================================= */

function renderHealthScore(
  totals
) {

  const income =
    Number(
      totals?.income ??
      totals?.total_income ??
      0
    );


  const expense =
    Number(
      totals?.expense ??
      totals?.total_expense ??
      0
    );


  let score =
    0;


  let label =
    "Waiting for data";


  let description =
    "Track income and spending to build your monthly financial snapshot.";


  if (
    income > 0
  ) {

    const savingsRate =
      (
        (
          income -
          expense
        ) /
        income
      ) *
      100;


    score =
      Math.max(
        0,
        Math.min(
          100,
          Math.round(
            50 +
            savingsRate
          )
        )
      );


    if (
      expense <=
      income *
      .7
    ) {

      label =
        "Spending is within income";


      description =
        "Your selected period shows a positive gap between income and spending.";

    }

    else if (
      expense <=
      income
    ) {

      label =
        "Close to your income level";


      description =
        "Spending is still within income, but the remaining balance is relatively small.";

    }

    else {

      label =
        "Spending is above income";


      description =
        "Your selected period currently shows more spending than income.";

    }

  }

  else if (
    expense > 0
  ) {

    score =
      20;


    label =
      "Income not logged for this period";


    description =
      "Expenses exist in the selected period, but no matching income is included in the current filters.";

  }


  const circle =
    document.getElementById(
      "healthScore"
    );


  const value =
    document.getElementById(
      "healthScoreValue"
    );


  const labelBox =
    document.getElementById(
      "healthLabel"
    );


  const descriptionBox =
    document.getElementById(
      "healthDescription"
    );


  if (circle) {

    circle.style.setProperty(
      "--score",
      score
    );

  }


  if (value) {

    value.textContent =
      String(
        score
      );

  }


  if (labelBox) {

    labelBox.textContent =
      label;

  }


  if (descriptionBox) {

    descriptionBox.textContent =
      description;

  }

}


/* =========================================================
   INSIGHT
========================================================= */

function localInsightFromReport(
  data
) {

  const totals =
    getTotals(
      data
    );


  const income =
    Number(
      totals.income ??
      0
    );


  const expense =
    Number(
      totals.expense ??
      0
    );


  const balance =
    Number(
      totals.balance ??
      (
        income -
        expense
      )
    );


  const categories =
    [
      ...getCategoryRows(
        data
      )
    ].sort(
      (
        a,
        b
      ) =>
        categoryAmount(
          b
        ) -
        categoryAmount(
          a
        )
    );


  const top =
    categories[0];


  if (
    income === 0 &&
    expense === 0
  ) {

    return "No transactions were found for the selected period. Add or adjust transactions to generate a useful spending summary.";

  }


  const pieces =
    [];


  if (top) {

    pieces.push(
      `${categoryName(
        top
      )} is the highest expense category at ${money(
        categoryAmount(
          top
        )
      )}.`
    );

  }


  if (
    balance >= 0
  ) {

    pieces.push(
      `Income is ${money(
        income
      )} and spending is ${money(
        expense
      )}, leaving a balance of ${money(
        balance
      )}.`
    );

  }

  else {

    pieces.push(
      `Spending is ${money(
        expense
      )}, which is ${money(
        Math.abs(
          balance
        )
      )} above the income included in this report.`
    );

  }


  return pieces.join(
    " "
  );

}


function extractInsight(data) {

  if (!data) {

    return "";

  }


  return String(
    data.summary_text ??
    data.summary ??
    data.insight_text ??
    data.insight?.summary_text ??
    data.insight?.summary ??
    data.insight?.message ??
    data.message_text ??
    ""
  ).trim();

}


async function loadInsight(
  reportData
) {

  const box =
    document.getElementById(
      "reportInsightText"
    );


  if (!box) {

    return;

  }


  const fallback =
    localInsightFromReport(
      reportData
    );


  currentInsightText =
    fallback;


  box.textContent =
    fallback;


  try {

    const params =
      reportParams();


    const data =
      await getJSON(
        `${API.insights}?${params.toString()}`
      );


    if (!data.success) {

      return;

    }


    const text =
      extractInsight(
        data
      );


    if (text) {

      currentInsightText =
        text;


      box.textContent =
        text;

    }

  }

  catch (error) {

    console.info(
      "Insight endpoint unavailable; using local report summary."
    );

  }

}


/* =========================================================
   SAVED INSIGHTS
========================================================= */

function currentInsightKey() {

  const start =
    document.getElementById(
      "startDateFilter"
    )?.value ||
    "current";


  const end =
    document.getElementById(
      "endDateFilter"
    )?.value ||
    "current";


  const category =
    document.getElementById(
      "reportCategoryFilter"
    )?.value ||
    "all-expense";


  const incomeSource =
    document.getElementById(
      "incomeSourceFilter"
    )?.value ||
    "all-income";


  return `report_${start}_${end}_${category}_${incomeSource}`;

}


async function loadSavedInsights() {

  try {

    const data =
      await getJSON(
        API.bookmarks
      );


    if (!data.success) {

      return;

    }


    savedInsightKeys =
      new Set(
        (
          data.bookmarks ||
          []
        )
          .filter(
            item =>
              item.item_type ===
              "insight"
          )
          .map(
            item =>
              String(
                item.item_key
              )
          )
      );

  }

  catch (error) {

    console.error(
      "Saved insights error:",
      error
    );

  }

}


function updateSaveInsightButton() {

  const button =
    document.getElementById(
      "saveInsightButton"
    );


  if (!button) {

    return;

  }


  const saved =
    savedInsightKeys.has(
      currentInsightKey()
    );


  button.classList.toggle(
    "saved",
    saved
  );


  button.disabled =
    saved;


  button.textContent =
    saved
      ? "✓ Saved"
      : "◇ Save Insight";

}


async function saveCurrentInsight() {

  const button =
    document.getElementById(
      "saveInsightButton"
    );


  if (
    !button ||
    !currentInsightText ||
    button.disabled
  ) {

    return;

  }


  const key =
    currentInsightKey();


  const start =
    document.getElementById(
      "startDateFilter"
    )?.value || "";


  const end =
    document.getElementById(
      "endDateFilter"
    )?.value || "";


  const original =
    button.textContent;


  button.disabled =
    true;


  button.textContent =
    "Saving...";


  try {

    const result =
      await getJSON(
        API.bookmarks,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              item_type:
                "insight",

              item_key:
                key,

              title:
                start &&
                end
                  ? `Spending Insight — ${start} to ${end}`
                  : "Monthly Spending Insight",

              content:
                currentInsightText

            })
        }
      );


    if (
      !result.success
    ) {

      button.disabled =
        false;


      button.textContent =
        original;


      return;

    }


    savedInsightKeys.add(
      key
    );


    updateSaveInsightButton();

  }

  catch (error) {

    console.error(
      "Save insight error:",
      error
    );


    button.disabled =
      false;


    button.textContent =
      original;

  }

}


document
  .getElementById(
    "saveInsightButton"
  )
  ?.addEventListener(
    "click",
    saveCurrentInsight
  );


document
  .getElementById(
    "exploreTipsButton"
  )
  ?.addEventListener(
    "click",
    () => {

      window.location.href =
        "tips.html";

    }
  );


/* =========================================================
   APPLY FILTERS
========================================================= */

document
  .getElementById(
    "applyReportFilters"
  )
  ?.addEventListener(
    "click",
    async () => {

      const button =
        document.getElementById(
          "applyReportFilters"
        );


      if (!button) {

        return;

      }


      const original =
        button.textContent;


      button.disabled =
        true;


      button.textContent =
        "Loading...";


      await loadReports();


      button.disabled =
        false;


      button.textContent =
        original;

    }
  );


/* =========================================================
   ANALYTICS TABS
========================================================= */

document
  .querySelectorAll(
    ".analytics-tab"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          document
            .querySelectorAll(
              ".analytics-tab"
            )
            .forEach(
              item =>
                item.classList.remove(
                  "active"
                )
            );


          button.classList.add(
            "active"
          );


          const view =
            button.dataset.view;


          let target =
            document.getElementById(
              "overviewSection"
            );


          if (
            view === "monthly"
          ) {

            target =
              document.getElementById(
                "monthlySection"
              );

          }


          if (
            view === "categories"
          ) {

            target =
              document.getElementById(
                "categorySection"
              );

          }


          target?.scrollIntoView({
            behavior:
              "smooth",

            block:
              "start"
          });

        }
      );

    }
  );


/* =========================================================
   EXPORT MODAL
========================================================= */

const exportModal =
  document.getElementById(
    "exportModal"
  );


function openExportModal() {

  exportModal
    ?.classList.add(
      "open"
    );


  exportModal
    ?.setAttribute(
      "aria-hidden",
      "false"
    );

}


function closeExportModal() {

  exportModal
    ?.classList.remove(
      "open"
    );


  exportModal
    ?.setAttribute(
      "aria-hidden",
      "true"
    );

}


document
  .getElementById(
    "exportReportButton"
  )
  ?.addEventListener(
    "click",
    openExportModal
  );


document
  .getElementById(
    "closeExportModal"
  )
  ?.addEventListener(
    "click",
    closeExportModal
  );


exportModal
  ?.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        exportModal
      ) {

        closeExportModal();

      }

    }
  );


/* =========================================================
   EXPORT PDF
========================================================= */

document
  .getElementById(
    "exportPdfButton"
  )
  ?.addEventListener(
    "click",
    () => {

      if (
        !filtersAreValid()
      ) {

        return;

      }


      const params =
        reportParams();


      const query =
        params.toString();


      closeExportModal();


      window.location.href =
        query
          ? `${API.exportPdf}?${query}`
          : API.exportPdf;

    }
  );


/* =========================================================
   EXPORT IMAGE
========================================================= */

function selectedText(id) {

  const select =
    document.getElementById(
      id
    );


  if (!select) {

    return "";

  }


  return (
    select.options[
      select.selectedIndex
    ]?.textContent
      ?.trim() ||
    ""
  );

}


function fitText(
  ctx,
  text,
  maxWidth
) {

  let output =
    String(
      text || ""
    );


  if (
    ctx.measureText(
      output
    ).width <=
    maxWidth
  ) {

    return output;

  }


  while (
    output.length > 3 &&
    ctx.measureText(
      `${output}...`
    ).width >
    maxWidth
  ) {

    output =
      output.slice(
        0,
        -1
      );

  }


  return `${output}...`;

}


function downloadReportImage() {

  if (
    !currentReportData
  ) {

    setStatus(
      "Load the report before exporting an image.",
      "error"
    );


    return;

  }


  const totals =
    getTotals(
      currentReportData
    );


  const income =
    Number(
      totals.income ??
      totals.total_income ??
      0
    );


  const expense =
    Number(
      totals.expense ??
      totals.total_expense ??
      0
    );


  const balance =
    Number(
      totals.balance ??
      totals.net_balance ??
      (
        income -
        expense
      )
    );


  const categories =
    getCategoryRows(
      currentReportData
    ).slice(
      0,
      8
    );


  const startDate =
    document.getElementById(
      "startDateFilter"
    )?.value || "";


  const endDate =
    document.getElementById(
      "endDateFilter"
    )?.value || "";


  const expenseFilter =
    selectedText(
      "reportCategoryFilter"
    ) ||
    "All Expense Categories";


  const incomeFilter =
    selectedText(
      "incomeSourceFilter"
    ) ||
    "All Income Sources";


  const width =
    1200;


  const height =
    720 +
    categories.length *
    58;


  const scale =
    2;


  const canvas =
    document.createElement(
      "canvas"
    );


  canvas.width =
    width *
    scale;


  canvas.height =
    height *
    scale;


  const ctx =
    canvas.getContext(
      "2d"
    );


  if (!ctx) {

    return;

  }


  ctx.scale(
    scale,
    scale
  );


  /* BACKGROUND */

  ctx.fillStyle =
    "#f5f8f5";


  ctx.fillRect(
    0,
    0,
    width,
    height
  );


  /* HEADER */

  ctx.fillStyle =
    "#1f6b52";


  ctx.fillRect(
    0,
    0,
    width,
    160
  );


  ctx.fillStyle =
    "#ffffff";


  ctx.font =
    "700 42px Arial";


  ctx.fillText(
    "Campus Coin",
    60,
    67
  );


  ctx.font =
    "700 24px Arial";


  ctx.fillText(
    "Financial Report",
    60,
    108
  );


  ctx.font =
    "16px Arial";


  ctx.fillStyle =
    "#dbeee4";


  ctx.fillText(
    `${startDate || "Start"} to ${endDate || "End"}`,
    60,
    138
  );


  /* FILTER BOX */

  ctx.fillStyle =
    "#ffffff";


  ctx.fillRect(
    50,
    190,
    1100,
    105
  );


  ctx.fillStyle =
    "#183c2e";


  ctx.font =
    "700 18px Arial";


  ctx.fillText(
    "Applied Filters",
    75,
    225
  );


  ctx.font =
    "15px Arial";


  ctx.fillStyle =
    "#60756a";


  ctx.fillText(
    fitText(
      ctx,
      `Expense Category: ${expenseFilter}`,
      470
    ),
    75,
    258
  );


  ctx.fillText(
    fitText(
      ctx,
      `Income Source: ${incomeFilter}`,
      470
    ),
    590,
    258
  );


  /* SUMMARY CARDS */

  const cards = [

    {
      label:
        "Total Income",

      value:
        money(
          income
        )
    },

    {
      label:
        "Total Spending",

      value:
        money(
          expense
        )
    },

    {
      label:
        "Net Balance",

      value:
        money(
          balance
        )
    }

  ];


  cards.forEach(
    (
      card,
      index
    ) => {

      const x =
        50 +
        index *
        375;


      ctx.fillStyle =
        "#ffffff";


      ctx.fillRect(
        x,
        325,
        350,
        125
      );


      ctx.fillStyle =
        "#718279";


      ctx.font =
        "15px Arial";


      ctx.fillText(
        card.label,
        x + 24,
        363
      );


      ctx.fillStyle =
        "#183c2e";


      ctx.font =
        "700 26px Arial";


      ctx.fillText(
        card.value,
        x + 24,
        408
      );

    }
  );


  /* CATEGORY TABLE */

  ctx.fillStyle =
    "#183c2e";


  ctx.font =
    "700 23px Arial";


  ctx.fillText(
    "Category-wise Expenses",
    50,
    510
  );


  let y =
    548;


  ctx.fillStyle =
    "#1f6b52";


  ctx.fillRect(
    50,
    y,
    1100,
    44
  );


  ctx.fillStyle =
    "#ffffff";


  ctx.font =
    "700 15px Arial";


  ctx.fillText(
    "Category",
    72,
    y + 28
  );


  ctx.fillText(
    "Amount",
    940,
    y + 28
  );


  y +=
    44;


  if (
    !categories.length
  ) {

    ctx.fillStyle =
      "#ffffff";


    ctx.fillRect(
      50,
      y,
      1100,
      58
    );


    ctx.fillStyle =
      "#73857b";


    ctx.font =
      "15px Arial";


    ctx.fillText(
      "No expense data for the selected filters.",
      72,
      y + 35
    );

  }

  else {

    categories.forEach(
      (
        category,
        index
      ) => {

        ctx.fillStyle =
          index % 2 === 0
            ? "#ffffff"
            : "#f0f6f2";


        ctx.fillRect(
          50,
          y,
          1100,
          58
        );


        ctx.fillStyle =
          "#264b3a";


        ctx.font =
          "15px Arial";


        ctx.fillText(
          fitText(
            ctx,
            categoryName(
              category
            ),
            720
          ),
          72,
          y + 35
        );


        ctx.font =
          "700 15px Arial";


        ctx.fillText(
          money(
            categoryAmount(
              category
            )
          ),
          940,
          y + 35
        );


        y +=
          58;

      }
    );

  }


  /* FOOTER */

  ctx.fillStyle =
    "#75877d";


  ctx.font =
    "14px Arial";


  ctx.fillText(
    `Generated by Campus Coin • ${new Date().toLocaleDateString("en-PK")}`,
    50,
    height - 45
  );


  canvas.toBlob(
    blob => {

      if (!blob) {

        return;

      }


      const url =
        URL.createObjectURL(
          blob
        );


      const link =
        document.createElement(
          "a"
        );


      link.href =
        url;


      link.download =
        `CampusCoin_Report_${startDate || "current"}_${endDate || ""}.png`;


      document.body.appendChild(
        link
      );


      link.click();


      link.remove();


      URL.revokeObjectURL(
        url
      );

    },
    "image/png"
  );

}


document
  .getElementById(
    "exportImageButton"
  )
  ?.addEventListener(
    "click",
    () => {

      closeExportModal();


      downloadReportImage();

    }
  );


/* =========================================================
   PRINT
========================================================= */

document
  .getElementById(
    "printReportButton"
  )
  ?.addEventListener(
    "click",
    () => {

      closeExportModal();


      setTimeout(
        () =>
          window.print(),
        120
      );

    }
  );


/* =========================================================
   PAGE SEARCH
========================================================= */

const pageSearchData = [

  {
    title:
      "Dashboard",

    detail:
      "Monthly overview",

    icon:
      "⌂",

    url:
      "dashboard.html",

    keywords:
      "home balance overview"
  },


  {
    title:
      "Transactions",

    detail:
      "Income and expense records",

    icon:
      "↕",

    url:
      "transactions.html",

    keywords:
      "transaction income expense records"
  },


  {
    title:
      "Categories",

    detail:
      "Manage personal categories",

    icon:
      "◫",

    url:
      "categories.html",

    keywords:
      "category categories income expense manage"
  },


  {
    title:
      "Analytics",

    detail:
      "Reports and spending trends",

    icon:
      "⌁",

    url:
      "reports.html",

    keywords:
      "analytics reports charts spending"
  },


  {
    title:
      "Budgets",

    detail:
      "Monthly category limits",

    icon:
      "◎",

    url:
      "budgets.html",

    keywords:
      "budget limits category"
  },


  {
    title:
      "Saving Tips",

    detail:
      "Personalized saving opportunities",

    icon:
      "✦",

    url:
      "tips.html",

    keywords:
      "tips saving advice"
  },


  {
    title:
      "Saved",

    detail:
      "Bookmarked tips and insights",

    icon:
      "◇",

    url:
      "bookmarks.html",

    keywords:
      "saved bookmarks insights"
  },


  {
    title:
      "Profile",

    detail:
      "Account and money goals",

    icon:
      "○",

    url:
      "profile.html",

    keywords:
      "profile account academic allowance goal"
  }

];


const analyticsSearch =
  document.getElementById(
    "analyticsSearch"
  );


const analyticsSearchResults =
  document.getElementById(
    "analyticsSearchResults"
  );


function closeSearchResults() {

  analyticsSearchResults
    ?.classList.remove(
      "open"
    );

}


function renderSearchResults() {

  if (
    !analyticsSearch ||
    !analyticsSearchResults
  ) {

    return;

  }


  const query =
    analyticsSearch.value
      .trim()
      .toLowerCase();


  if (!query) {

    analyticsSearchResults.innerHTML =
      "";


    closeSearchResults();


    return;

  }


  const matches =
    pageSearchData.filter(
      page =>
        `${
          page.title
        } ${
          page.detail
        } ${
          page.keywords
        }`
          .toLowerCase()
          .includes(
            query
          )
    );


  if (
    !matches.length
  ) {

    analyticsSearchResults.innerHTML = `
      <div class="reports-search-empty">
        No matching Campus Coin page found.
      </div>
    `;


    analyticsSearchResults.classList.add(
      "open"
    );


    return;

  }


  analyticsSearchResults.innerHTML =
    matches
      .map(
        page => `
          <button
            class="reports-search-item"
            type="button"
            data-search-url="${escapeHTML(
              page.url
            )}"
          >

            <span class="reports-search-icon">
              ${escapeHTML(
                page.icon
              )}
            </span>

            <span>

              <strong>
                ${escapeHTML(
                  page.title
                )}
              </strong>

              <small>
                ${escapeHTML(
                  page.detail
                )}
              </small>

            </span>

            <span>
              →
            </span>

          </button>
        `
      )
      .join("");


  analyticsSearchResults.classList.add(
    "open"
  );


  analyticsSearchResults
    .querySelectorAll(
      "[data-search-url]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            window.location.href =
              button.dataset.searchUrl;

          }
        );

      }
    );

}


analyticsSearch
  ?.addEventListener(
    "input",
    renderSearchResults
  );


analyticsSearch
  ?.addEventListener(
    "keydown",
    event => {

      if (
        event.key ===
        "Enter"
      ) {

        const first =
          analyticsSearchResults
            ?.querySelector(
              "[data-search-url]"
            );


        if (first) {

          window.location.href =
            first.dataset.searchUrl;

        }

      }


      if (
        event.key ===
        "Escape"
      ) {

        closeSearchResults();

      }

    }
  );


document.addEventListener(
  "click",
  event => {

    if (
      analyticsSearchResults &&
      analyticsSearch &&
      !analyticsSearchResults.contains(
        event.target
      ) &&
      !analyticsSearch.contains(
        event.target
      )
    ) {

      closeSearchResults();

    }

  }
);


document.addEventListener(
  "keydown",
  event => {

    if (
      (
        event.ctrlKey ||
        event.metaKey
      ) &&
      event.key
        .toLowerCase() ===
        "k"
    ) {

      event.preventDefault();


      analyticsSearch
        ?.focus();

    }

  }
);


/* =========================================================
   MOBILE SIDEBAR
========================================================= */

const sidebar =
  document.getElementById(
    "sidebar"
  );


const mobileMenuButton =
  document.getElementById(
    "mobileMenuButton"
  );


mobileMenuButton
  ?.addEventListener(
    "click",
    event => {

      event.stopPropagation();


      sidebar
        ?.classList.toggle(
          "mobile-open"
        );

    }
  );


document.addEventListener(
  "click",
  event => {

    if (
      window.innerWidth <=
        960 &&
      sidebar?.classList.contains(
        "mobile-open"
      ) &&
      !sidebar.contains(
        event.target
      ) &&
      !mobileMenuButton
        ?.contains(
          event.target
        )
    ) {

      sidebar.classList.remove(
        "mobile-open"
      );

    }

  }
);


document
  .querySelectorAll(
    ".sidebar .nav-item"
  )
  .forEach(
    link => {

      link.addEventListener(
        "click",
        () => {

          if (
            window.innerWidth <=
            960
          ) {

            sidebar
              ?.classList.remove(
                "mobile-open"
              );

          }

        }
      );

    }
  );


window.addEventListener(
  "resize",
  () => {

    if (
      window.innerWidth >
      960
    ) {

      sidebar
        ?.classList.remove(
          "mobile-open"
        );

    }

  }
);


/* =========================================================
   DARK MODE
========================================================= */

const themeToggle =
  document.getElementById(
    "themeToggle"
  );


function applyTheme(theme) {

  const dark =
    theme ===
    "dark";


  document.body.classList.toggle(
    "dark-theme",
    dark
  );


  if (themeToggle) {

    themeToggle.textContent =
      dark
        ? "☾"
        : "☼";


    themeToggle.setAttribute(
      "aria-label",
      dark
        ? "Switch to light mode"
        : "Switch to dark mode"
    );

  }

}


applyTheme(
  localStorage.getItem(
    "campusCoinTheme"
  ) ||
  "light"
);


themeToggle
  ?.addEventListener(
    "click",
    () => {

      const dark =
        !document.body.classList.contains(
          "dark-theme"
        );


      const theme =
        dark
          ? "dark"
          : "light";


      localStorage.setItem(
        "campusCoinTheme",
        theme
      );


      applyTheme(
        theme
      );

    }
  );


/* =========================================================
   LOGOUT
========================================================= */

document
  .getElementById(
    "logoutButton"
  )
  ?.addEventListener(
    "click",
    async () => {

      try {

        await fetch(
          API.logout,
          {
            credentials:
              "same-origin"
          }
        );

      }

      catch (error) {

        console.error(
          "Logout request failed:",
          error
        );

      }


      window.location.href =
        "index.html";

    }
  );


/* =========================================================
   ESCAPE
========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key !==
      "Escape"
    ) {

      return;

    }


    closeExportModal();


    closeSearchResults();


    sidebar
      ?.classList.remove(
        "mobile-open"
      );

  }
);


/* =========================================================
   START
========================================================= */

async function startReportsPage() {

  setDefaultDates();


  await Promise.allSettled([

    loadProfile(),

    loadCategories(),

    loadSavedInsights()

  ]);


  await loadReports();

}


startReportsPage();