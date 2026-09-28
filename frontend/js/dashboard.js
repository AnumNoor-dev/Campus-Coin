const API = {
  profile: "../backend/profile/get_profile.php",
  reports: "../backend/reports/get_reports.php",
  transactions: "../backend/transactions/get_transactions.php",
  categories: "../backend/categories/get_categories.php",

  // CORRECT ACTUAL FILE
  addTransaction: "../backend/transactions/add_transaction.php",

  budgets: "../backend/budgets/get_budgets.php",
  tips: "../backend/tips/get_tips.php",
  insights: "../backend/insights/get_insights.php",
  recurring: "../backend/transactions/process_recurring.php",
  logout: "../backend/auth/logout.php"
};

let quickAddCategories = [];
let quickAddType = "expense";
let quickAddSaving = false;


/* =========================================================
   HELPERS
========================================================= */

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-PK", {
    maximumFractionDigits: 0
  })}`;
}


function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


async function getJSON(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options
  });

  const text = await response.text();

  if (!text.trim()) {
    throw new Error("Empty server response");
  }

  let data;

  try {
    data = JSON.parse(text);
  } catch (error) {
    console.error("Server returned:", text);
    throw new Error("Invalid server response");
  }

  if (
    data.success === false &&
    /not logged in|login first|session/i.test(
      String(data.message || "")
    )
  ) {
    window.location.href = "index.html";
    throw new Error("Session expired");
  }

  return data;
}


/* =========================================================
   NUMBER ANIMATION
========================================================= */

function animateNumber(element, value) {
  if (!element) return;

  const target = Number(value || 0);
  const duration = 700;
  const startTime = performance.now();

  function update(now) {
    const progress = Math.min(
      (now - startTime) / duration,
      1
    );

    const current =
      target *
      (1 - Math.pow(1 - progress, 3));

    element.textContent =
      money(current);

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent =
        money(target);
    }
  }

  requestAnimationFrame(update);
}


/* =========================================================
   PROFILE
========================================================= */

async function loadProfile() {
  try {
    const data =
      await getJSON(API.profile);

    if (
      !data.success ||
      !data.profile
    ) {
      return {};
    }

    const profile =
      data.profile;

    const name =
      profile.name ||
      "Student";

    const firstName =
      name.split(" ")[0];

    const initials =
      name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(
          part =>
            part[0].toUpperCase()
        )
        .join("");

    const dashboardName =
      document.getElementById(
        "dashboardUserName"
      );

    const topbarName =
      document.getElementById(
        "topbarUserName"
      );

    const avatar =
      document.getElementById(
        "userAvatar"
      );

    const savingsGoal =
      document.getElementById(
        "savingsGoal"
      );

    if (dashboardName) {
      dashboardName.textContent =
        firstName;
    }

    if (topbarName) {
      topbarName.textContent =
        name;
    }

    if (avatar) {
      avatar.textContent =
        initials ||
        "CU";
    }

    if (savingsGoal) {
      savingsGoal.textContent =
        money(
          profile.monthly_savings_goal ||
          0
        );
    }

    return profile;

  } catch (error) {
    console.error(
      "Profile error:",
      error
    );

    return {};
  }
}


/* =========================================================
   REPORTS
========================================================= */

async function loadReports(profile = {}) {
  try {
    const data =
      await getJSON(
        API.reports
      );

    if (!data.success) {
      return;
    }

    const totals =
      data.totals ||
      {};

    const income =
      Number(
        totals.income ||
        0
      );

    const expense =
      Number(
        totals.expense ||
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

    animateNumber(
      document.getElementById(
        "totalIncome"
      ),
      income
    );

    animateNumber(
      document.getElementById(
        "totalExpense"
      ),
      expense
    );

    animateNumber(
      document.getElementById(
        "remainingBalance"
      ),
      balance
    );

    const donutTotal =
      document.getElementById(
        "donutExpenseTotal"
      );

    if (donutTotal) {
      donutTotal.textContent =
        money(expense);
    }

    renderCategories(
      data.category_breakdown ||
      []
    );

    updateSavingsGoal(
      balance,
      Number(
        profile.monthly_savings_goal ||
        0
      )
    );

  } catch (error) {
    console.error(
      "Reports error:",
      error
    );
  }
}


/* =========================================================
   CATEGORY BREAKDOWN
========================================================= */

function renderCategories(categories) {
  const container =
    document.getElementById(
      "categoryBreakdown"
    );

  const donut =
    document.getElementById(
      "expenseDonut"
    );

  if (
    !container ||
    !donut
  ) {
    return;
  }

  if (
    !Array.isArray(categories) ||
    !categories.length
  ) {
    container.innerHTML = `
      <div
        class="dashboard-empty"
        style="min-height:120px"
      >
        <strong>
          No spending data yet
        </strong>

        <span>
          Categories will appear after you log expenses.
        </span>
      </div>
    `;

    donut.style.background =
      "#edf2ee";

    return;
  }

  const total =
    categories.reduce(
      (sum, item) =>
        sum +
        Number(
          item.total ||
          0
        ),
      0
    );

  const colors = [
    "#2c8b68",
    "#729fe8",
    "#f0b95f",
    "#d97879",
    "#9277d4",
    "#58b4b0",
    "#b3bdc8"
  ];

  const gradient = [];

  let current = 0;

  container.innerHTML = "";

  categories
    .slice(0, 7)
    .forEach(
      (item, index) => {
        const amount =
          Number(
            item.total ||
            0
          );

        const percentage =
          total > 0
            ? (
                amount /
                total
              ) * 100
            : 0;

        const start =
          current;

        const end =
          current +
          percentage;

        gradient.push(
          `${colors[index]} ${start}% ${end}%`
        );

        current =
          end;

        const row =
          document.createElement(
            "div"
          );

        row.className =
          "category-row";

        row.innerHTML = `
          <div>
            <span
              class="category-dot"
              style="background:${colors[index]}"
            ></span>

            ${escapeHTML(
              item.category_name ||
              item.name ||
              "Other"
            )}
          </div>

          <strong>
            ${Math.round(
              percentage
            )}%
          </strong>
        `;

        container.appendChild(
          row
        );
      }
    );

  donut.style.background =
    `conic-gradient(${gradient.join(",")})`;
}


/* =========================================================
   TRANSACTIONS
========================================================= */

async function loadTransactions() {
  const container =
    document.getElementById(
      "recentTransactions"
    );

  if (!container) {
    return;
  }

  try {
    const data =
      await getJSON(
        API.transactions
      );

    if (!data.success) {
      return;
    }

    const transactions =
      data.transactions ||
      data.data ||
      [];

    if (!transactions.length) {
      container.innerHTML = `
        <div class="dashboard-empty">

          <div>
            ↕
          </div>

          <strong>
            No transactions yet
          </strong>

          <span>
            Your latest transactions will appear here.
          </span>

        </div>
      `;

      return;
    }

    container.innerHTML = "";

    transactions
      .slice(0, 5)
      .forEach(
        transaction => {
          const type =
            transaction.type ||
            "expense";

          const amount =
            Number(
              transaction.amount ||
              0
            );

          const description =
            transaction.description ||
            transaction.category_name ||
            "Transaction";

          const category =
            transaction.category_name ||
            transaction.category ||
            type;

          const item =
            document.createElement(
              "div"
            );

          item.className =
            "recent-item";

          item.innerHTML = `
            <div class="recent-left">

              <div class="recent-icon">
                ${
                  type === "income"
                    ? "↙"
                    : "↗"
                }
              </div>

              <div class="recent-copy">

                <strong>
                  ${escapeHTML(
                    description
                  )}
                </strong>

                <span>
                  ${escapeHTML(
                    category
                  )}
                </span>

              </div>

            </div>

            <div class="recent-amount ${type}">
              ${
                type === "income"
                  ? "+"
                  : "-"
              }${money(amount)}
            </div>
          `;

          container.appendChild(
            item
          );
        }
      );

  } catch (error) {
    console.error(
      "Transactions error:",
      error
    );
  }
}


/* =========================================================
   BUDGETS
========================================================= */

async function loadBudgets() {
  try {
    const data =
      await getJSON(
        API.budgets
      );

    if (!data.success) {
      return;
    }

    const budgets =
      data.budgets ||
      data.data ||
      [];

    let totalBudget = 0;
    let totalSpent = 0;

    budgets.forEach(
      item => {
        totalBudget +=
          Number(
            item.monthly_limit ??
            item.limit_amount ??
            item.budget_limit ??
            0
          );

        totalSpent +=
          Number(
            item.spent ??
            item.actual_spending ??
            0
          );
      }
    );

    const percentage =
      totalBudget > 0
        ? Math.min(
            (
              totalSpent /
              totalBudget
            ) * 100,
            100
          )
        : 0;

    const percentageBox =
      document.getElementById(
        "budgetPercentage"
      );

    const spentBox =
      document.getElementById(
        "budgetSpent"
      );

    const limitBox =
      document.getElementById(
        "budgetLimit"
      );

    const progressBar =
      document.getElementById(
        "budgetProgressBar"
      );

    const circle =
      document.getElementById(
        "budgetCircle"
      );

    if (percentageBox) {
      percentageBox.textContent =
        `${Math.round(
          percentage
        )}%`;
    }

    if (spentBox) {
      spentBox.textContent =
        `${money(
          totalSpent
        )} spent`;
    }

    if (limitBox) {
      limitBox.textContent =
        `${money(
          totalBudget
        )} budget`;
    }

    if (progressBar) {
      progressBar.style.width =
        `${percentage}%`;
    }

    if (circle) {
      circle.style.background = `
        conic-gradient(
          #2c8b68 0 ${percentage}%,
          #edf2ee ${percentage}% 100%
        )
      `;

      const circleText =
        circle.querySelector(
          "span"
        );

      if (circleText) {
        circleText.textContent =
          `${Math.round(
            percentage
          )}%`;
      }
    }

  } catch (error) {
    console.error(
      "Budget error:",
      error
    );
  }
}


/* =========================================================
   SAVING TIPS
========================================================= */

async function loadTips() {
  try {
    const data =
      await getJSON(
        API.tips
      );

    if (!data.success) {
      return;
    }

    const tip =
      data.tips?.[0];

    if (!tip) {
      return;
    }

    const title =
      document.getElementById(
        "savingTipTitle"
      );

    const text =
      document.getElementById(
        "savingTipText"
      );

    const pinButton =
      document.getElementById(
        "pinTipButton"
      );

    if (title) {
      title.textContent =
        tip.title ||
        "Smart saving tip";
    }

    if (text) {
      text.textContent =
        tip.message ||
        tip.tip_text ||
        "Keep tracking your spending.";
    }

    if (pinButton) {
      pinButton.onclick =
        () =>
          pinTip(
            tip
          );
    }

  } catch (error) {
    console.error(
      "Tips error:",
      error
    );
  }
}


/* =========================================================
   PIN TIP
========================================================= */

async function pinTip(tip) {
  const button =
    document.getElementById(
      "pinTipButton"
    );

  const tipKey =
    `${
      tip.type ||
      "tip"
    }-${
      tip.category_id ||
      "general"
    }`;

  try {
    const result =
      await getJSON(
        "../backend/tips/pin_tip.php",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              tip_key: tipKey
            })
        }
      );

    if (
      result.success &&
      button
    ) {
      button.textContent =
        "✓";

      button.title =
        "Tip pinned";
    }

  } catch (error) {
    console.error(
      "Pin tip error:",
      error
    );
  }
}


/* =========================================================
   INSIGHTS
========================================================= */

async function loadInsight() {
  try {
    const data =
      await getJSON(
        API.insights
      );

    if (!data.success) {
      return;
    }

    const text =
      data.insight ||
      data.summary ||
      data.summary_text ||
      data.message ||
      data.insights?.[0]
        ?.summary_text;

    const insightBox =
      document.getElementById(
        "insightText"
      );

    if (
      text &&
      insightBox
    ) {
      insightBox.textContent =
        text;
    }

  } catch (error) {
    console.log(
      "Insight not available yet."
    );
  }
}


/* =========================================================
   SAVINGS GOAL
========================================================= */

function updateSavingsGoal(
  balance,
  goal
) {
  const saved =
    Math.max(
      Number(
        balance ||
        0
      ),
      0
    );

  const percentage =
    goal > 0
      ? Math.min(
          (
            saved /
            goal
          ) * 100,
          100
        )
      : 0;

  const savedBox =
    document.getElementById(
      "goalSaved"
    );

  const percentageBox =
    document.getElementById(
      "goalPercentage"
    );

  const progressBar =
    document.getElementById(
      "goalProgressBar"
    );

  if (savedBox) {
    savedBox.textContent =
      `${money(
        saved
      )} saved`;
  }

  if (percentageBox) {
    percentageBox.textContent =
      `${Math.round(
        percentage
      )}%`;
  }

  if (progressBar) {
    progressBar.style.width =
      `${percentage}%`;
  }
}


/* =========================================================
   RECURRING PROCESSING
========================================================= */

async function processRecurring() {
  try {
    await getJSON(
      API.recurring
    );

  } catch (error) {
    console.log(
      "Recurring processing skipped."
    );
  }
}


/* =========================================================
   QUICK ADD
========================================================= */

const quickAddModal =
  document.getElementById(
    "quickAddModal"
  );

const quickAddForm =
  document.getElementById(
    "quickAddForm"
  );

const quickCategory =
  document.getElementById(
    "quickCategory"
  );

const quickAmount =
  document.getElementById(
    "quickAmount"
  );

const quickDate =
  document.getElementById(
    "quickDate"
  );

const quickDescription =
  document.getElementById(
    "quickDescription"
  );

const quickRecurring =
  document.getElementById(
    "quickRecurring"
  );

const quickSaveButton =
  document.getElementById(
    "quickSaveButton"
  );

const quickAddMessage =
  document.getElementById(
    "quickAddMessage"
  );


function todayISO() {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}


function setQuickAddMessage(
  message = "",
  type = ""
) {
  if (!quickAddMessage) {
    return;
  }

  quickAddMessage.textContent =
    message;

  quickAddMessage.className =
    "quick-add-message";

  if (message) {
    quickAddMessage.classList.add(
      "show"
    );

    if (type) {
      quickAddMessage.classList.add(
        type
      );
    }
  }
}


function setQuickAddType(type) {
  quickAddType =
    type === "income"
      ? "income"
      : "expense";

  document
    .querySelectorAll(
      "[data-transaction-type]"
    )
    .forEach(
      button => {
        const active =
          button.dataset.transactionType ===
          quickAddType;

        button.classList.toggle(
          "active",
          active
        );

        button.setAttribute(
          "aria-pressed",
          active
            ? "true"
            : "false"
        );
      }
    );

  renderQuickAddCategories();
}


function renderQuickAddCategories() {
  if (!quickCategory) {
    return;
  }

  const filtered =
    quickAddCategories
      .filter(
        category =>
          String(
            category.type ||
            ""
          ).toLowerCase() ===
          quickAddType
      )
      .sort(
        (a, b) => {
          const defaultA =
            Number(
              a.is_default ||
              0
            );

          const defaultB =
            Number(
              b.is_default ||
              0
            );

          if (
            defaultA !==
            defaultB
          ) {
            return (
              defaultB -
              defaultA
            );
          }

          return String(
            a.name ||
            ""
          ).localeCompare(
            String(
              b.name ||
              ""
            )
          );
        }
      );

  quickCategory.innerHTML =
    '<option value="">Select category</option>';

  filtered.forEach(
    category => {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        category.category_id;

      option.textContent =
        category.name;

      quickCategory.appendChild(
        option
      );
    }
  );

  if (!filtered.length) {
    const option =
      document.createElement(
        "option"
      );

    option.value = "";

    option.textContent =
      `No ${quickAddType} categories found`;

    option.disabled = true;

    quickCategory.appendChild(
      option
    );
  }
}


async function loadQuickAddCategories(
  force = false
) {
  if (
    quickAddCategories.length &&
    !force
  ) {
    renderQuickAddCategories();

    return;
  }

  if (quickCategory) {
    quickCategory.innerHTML =
      '<option value="">Loading categories...</option>';
  }

  try {
    const data =
      await getJSON(
        API.categories
      );

    if (!data.success) {
      throw new Error(
        data.message ||
        "Could not load categories"
      );
    }

    quickAddCategories =
      Array.isArray(
        data.categories
      )
        ? data.categories
        : Array.isArray(
            data.data
          )
          ? data.data
          : [];

    renderQuickAddCategories();

  } catch (error) {
    console.error(
      "Category error:",
      error
    );

    if (quickCategory) {
      quickCategory.innerHTML =
        '<option value="">Could not load categories</option>';
    }

    setQuickAddMessage(
      "Categories could not be loaded.",
      "error"
    );
  }
}


function resetQuickAddForm() {
  quickAddForm?.reset();

  if (quickDate) {
    quickDate.value =
      todayISO();
  }

  setQuickAddType(
    "expense"
  );

  setQuickAddMessage("");
}


async function openQuickAddModal() {
  if (!quickAddModal) {
    return;
  }

  resetQuickAddForm();

  quickAddModal.classList.add(
    "open"
  );

  quickAddModal.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "quick-add-open"
  );

  await loadQuickAddCategories(
    true
  );

  setTimeout(
    () => {
      quickAmount?.focus();
    },
    80
  );
}


function closeQuickAddModal() {
  if (!quickAddModal) {
    return;
  }

  quickAddModal.classList.remove(
    "open"
  );

  quickAddModal.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.classList.remove(
    "quick-add-open"
  );

  setQuickAddMessage("");
}


async function refreshDashboardAfterTransaction() {
  const profile =
    await loadProfile();

  await Promise.allSettled([
    loadReports(profile),
    loadTransactions(),
    loadBudgets(),
    loadTips(),
    loadInsight()
  ]);
}


document
  .querySelectorAll(
    "[data-transaction-type]"
  )
  .forEach(
    button => {
      button.addEventListener(
        "click",
        () => {
          setQuickAddType(
            button.dataset.transactionType
          );
        }
      );
    }
  );


document
  .getElementById(
    "quickAddButton"
  )
  ?.addEventListener(
    "click",
    openQuickAddModal
  );


document
  .getElementById(
    "quickAddClose"
  )
  ?.addEventListener(
    "click",
    closeQuickAddModal
  );


quickAddModal
  ?.addEventListener(
    "click",
    event => {
      if (
        event.target ===
        quickAddModal
      ) {
        closeQuickAddModal();
      }
    }
  );


quickAddForm
  ?.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      if (quickAddSaving) {
        return;
      }

      const categoryId =
        quickCategory?.value ||
        "";

      const amount =
        Number(
          quickAmount?.value ||
          0
        );

      const txnDate =
        quickDate?.value ||
        "";

      const description =
        quickDescription
          ?.value
          ?.trim() ||
        "";

      const isRecurring =
        quickRecurring?.checked
          ? 1
          : 0;

      if (!categoryId) {
        setQuickAddMessage(
          "Please select a category.",
          "error"
        );

        quickCategory?.focus();

        return;
      }

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        setQuickAddMessage(
          "Please enter a valid amount greater than 0.",
          "error"
        );

        quickAmount?.focus();

        return;
      }

      if (!txnDate) {
        setQuickAddMessage(
          "Please select a transaction date.",
          "error"
        );

        quickDate?.focus();

        return;
      }

      quickAddSaving = true;

      const oldButtonHTML =
        quickSaveButton
          ?.innerHTML ||
        "";

      if (quickSaveButton) {
        quickSaveButton.disabled =
          true;

        quickSaveButton.innerHTML =
          "<span>Saving...</span>";
      }

      setQuickAddMessage(
        "Saving transaction...",
        "loading"
      );

      try {
        const result =
          await getJSON(
            API.addTransaction,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({
                  category_id:
                    Number(
                      categoryId
                    ),

                  amount:
                    amount,

                  type:
                    quickAddType,

                  description:
                    description,

                  txn_date:
                    txnDate,

                  is_recurring:
                    isRecurring
                })
            }
          );

        if (!result.success) {
          setQuickAddMessage(
            result.message ||
            "Transaction could not be saved.",
            "error"
          );

          return;
        }

        setQuickAddMessage(
          isRecurring
            ? "Transaction saved and set to repeat monthly."
            : "Transaction saved successfully.",
          "success"
        );

        await refreshDashboardAfterTransaction();

        setTimeout(
          () => {
            closeQuickAddModal();
          },
          700
        );

      } catch (error) {
        console.error(
          "Quick add save error:",
          error
        );

        setQuickAddMessage(
          "Could not save the transaction. Please try again.",
          "error"
        );

      } finally {
        quickAddSaving =
          false;

        if (quickSaveButton) {
          quickSaveButton.disabled =
            false;

          quickSaveButton.innerHTML =
            oldButtonHTML;
        }
      }
    }
  );


/* =========================================================
   INSIGHTS BUTTON
========================================================= */

document
  .getElementById(
    "viewInsightsButton"
  )
  ?.addEventListener(
    "click",
    () => {
      window.location.href =
        "reports.html";
    }
  );


/* =========================================================
   ESCAPE
========================================================= */

document.addEventListener(
  "keydown",
  event => {
    if (
      event.key === "Escape" &&
      quickAddModal
        ?.classList
        .contains(
          "open"
        )
    ) {
      closeQuickAddModal();
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
        ?.classList
        .toggle(
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
      sidebar
        ?.classList
        .contains(
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
      sidebar
        .classList
        .remove(
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
              ?.classList
              .remove(
                "mobile-open"
              );
          }
        }
      );
    }
  );


/* =========================================================
   DARK MODE
========================================================= */

const themeButton =
  document.getElementById(
    "themeToggle"
  );

const savedTheme =
  localStorage.getItem(
    "campusCoinTheme"
  );


if (
  savedTheme ===
  "dark"
) {
  document.body.classList.add(
    "dark-theme"
  );

  if (themeButton) {
    themeButton.textContent =
      "☾";
  }
}


themeButton
  ?.addEventListener(
    "click",
    () => {
      const dark =
        document.body
          .classList
          .toggle(
            "dark-theme"
          );

      themeButton.textContent =
        dark
          ? "☾"
          : "☼";

      localStorage.setItem(
        "campusCoinTheme",
        dark
          ? "dark"
          : "light"
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

      } catch (error) {
        console.log(
          "Logout request finished."
        );
      }

      window.location.href =
        "index.html";
    }
  );


/* =========================================================
   START
========================================================= */

async function startDashboard() {
  await processRecurring();

  const profile =
    await loadProfile();

  await Promise.allSettled([
    loadReports(profile),
    loadTransactions(),
    loadBudgets(),
    loadTips(),
    loadInsight(),
    loadQuickAddCategories()
  ]);
}


startDashboard();