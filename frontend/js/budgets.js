const API = {
  profile: "../backend/profile/get_profile.php",
  categories: "../backend/categories/get_categories.php",
  budgets: "../backend/budgets/get_budgets.php",
  setBudget: "../backend/budgets/set_budget.php",
  logout: "../backend/auth/logout.php"
};

let allCategories = [];
let allBudgets = [];
let selectedMonth = "";
let editingCategoryId = null;


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

  return JSON.parse(text);
}


function monthInputToBackend(value) {

  if (!value) return "";

  const [year, month] =
    value.split("-");

  return `${month}/${year}`;
}


function prettyMonth(value) {

  if (!value) return "";

  const [year, month] =
    value.split("-");

  const date =
    new Date(
      Number(year),
      Number(month) - 1,
      1
    );

  return date.toLocaleDateString(
    "en-US",
    {
      month: "long",
      year: "numeric"
    }
  );
}


/* =========================================================
   PROFILE
========================================================= */

async function loadProfile() {

  try {

    const data =
      await getJSON(API.profile);

    if (!data.success) return;

    const name =
      data.profile?.name ||
      "Student";

    document.getElementById(
      "topbarUserName"
    ).textContent =
      name;

    const initials =
      name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(part =>
          part[0].toUpperCase()
        )
        .join("");

    document.getElementById(
      "userAvatar"
    ).textContent =
      initials || "CU";

  }

  catch (error) {

    console.error(
      "Profile error:",
      error
    );

  }

}


/* =========================================================
   MONTH
========================================================= */

function setupCurrentMonth() {

  const now =
    new Date();

  selectedMonth =
    `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;

  document.getElementById(
    "budgetMonth"
  ).value =
    selectedMonth;

  updateMonthLabels();

}


function updateMonthLabels() {

  const label =
    prettyMonth(selectedMonth);

  document.getElementById(
    "selectedMonthLabel"
  ).textContent =
    label;

  document.getElementById(
    "modalMonthLabel"
  ).textContent =
    label;

}


function moveMonth(amount) {

  const [year, month] =
    selectedMonth
      .split("-")
      .map(Number);

  const date =
    new Date(
      year,
      month - 1 + amount,
      1
    );

  selectedMonth =
    `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;

  document.getElementById(
    "budgetMonth"
  ).value =
    selectedMonth;

  updateMonthLabels();

  loadBudgets();

}


document
  .getElementById("previousMonth")
  .addEventListener(
    "click",
    () => moveMonth(-1)
  );


document
  .getElementById("nextMonth")
  .addEventListener(
    "click",
    () => moveMonth(1)
  );


document
  .getElementById("budgetMonth")
  .addEventListener(
    "change",
    event => {

      selectedMonth =
        event.target.value;

      updateMonthLabels();

      loadBudgets();

    }
  );


/* =========================================================
   CATEGORIES
========================================================= */

async function loadCategories() {

  try {

    const data =
      await getJSON(
        API.categories
      );

    if (!data.success) return;

    allCategories =
      (data.categories || [])
        .filter(
          category =>
            category.type === "expense"
        );

    renderCategoryOptions();

  }

  catch (error) {

    console.error(
      "Categories error:",
      error
    );

  }

}


function renderCategoryOptions() {

  const select =
    document.getElementById(
      "budgetCategory"
    );

  select.innerHTML =
    `<option value="">Select category</option>`;

  allCategories.forEach(
    category => {

      const option =
        document.createElement(
          "option"
        );

      option.value =
        category.category_id;

      option.textContent =
        category.name;

      select.appendChild(
        option
      );

    }
  );

}


/* =========================================================
   LOAD BUDGETS
========================================================= */

async function loadBudgets() {

  const grid =
    document.getElementById(
      "budgetGrid"
    );

  grid.innerHTML = `
    <div class="budget-loading">

      <div class="budget-loader"></div>

      <strong>
        Loading budgets...
      </strong>

      <span>
        Checking this month's spending progress.
      </span>

    </div>
  `;


  try {

    const monthYear =
      monthInputToBackend(
        selectedMonth
      );

    const data =
      await getJSON(
        `${API.budgets}?month_year=${encodeURIComponent(
          monthYear
        )}`
      );

    if (!data.success) {
      throw new Error(
        data.message ||
        "Unable to load budgets"
      );
    }

    allBudgets =
      data.budgets || [];

    renderSummary();
    renderBudgets();

  }

  catch (error) {

    console.error(
      "Budgets error:",
      error
    );

    grid.innerHTML = `
      <div class="budget-empty">

        <strong>
          Could not load budgets
        </strong>

        <span>
          Refresh the page and try again.
        </span>

      </div>
    `;

  }

}


/* =========================================================
   SUMMARY
========================================================= */

function renderSummary() {

  const totalLimit =
    allBudgets.reduce(
      (sum, budget) =>
        sum +
        Number(
          budget.monthly_limit || 0
        ),
      0
    );


  const totalSpent =
    allBudgets.reduce(
      (sum, budget) =>
        sum +
        Number(
          budget.spent || 0
        ),
      0
    );


  const remaining =
    Math.max(
      totalLimit -
      totalSpent,
      0
    );


  const alerts =
    allBudgets.filter(
      budget =>
        Number(
          budget.percent_used || 0
        ) >= 80
    ).length;


  document.getElementById(
    "totalBudget"
  ).textContent =
    money(totalLimit);


  document.getElementById(
    "totalBudgetSpent"
  ).textContent =
    money(totalSpent);


  document.getElementById(
    "totalBudgetRemaining"
  ).textContent =
    money(remaining);


  document.getElementById(
    "budgetAlertCount"
  ).textContent =
    alerts;


  document.getElementById(
    "budgetCountChip"
  ).textContent =
    `${allBudgets.length} ${
      allBudgets.length === 1
        ? "category"
        : "categories"
    }`;


  const percent =
    totalLimit > 0
      ? Math.round(
          totalSpent /
          totalLimit *
          100
        )
      : 0;


  document.getElementById(
    "overallBudgetPercent"
  ).textContent =
    `${percent}%`;


  document.getElementById(
    "overallSpentText"
  ).textContent =
    `${money(totalSpent)} spent`;


  document.getElementById(
    "overallLimitText"
  ).textContent =
    `${money(totalLimit)} budget`;


  const fill =
    document.getElementById(
      "overallBudgetFill"
    );


  fill.style.width =
    `${Math.min(percent, 100)}%`;


  fill.classList.remove(
    "warning",
    "danger"
  );


  if (percent >= 100) {

    fill.classList.add(
      "danger"
    );

  }

  else if (percent >= 80) {

    fill.classList.add(
      "warning"
    );

  }


  const overview =
    document.getElementById(
      "budgetOverviewText"
    );


  if (!allBudgets.length) {

    overview.textContent =
      "Set your first category budget to start tracking progress.";

  }

  else if (percent >= 100) {

    overview.textContent =
      "Your tracked spending has reached or exceeded the combined monthly budget.";

  }

  else if (percent >= 80) {

    overview.textContent =
      "You're getting close to your overall monthly budget. Check the categories needing attention.";

  }

  else {

    overview.textContent =
      `You've used ${percent}% of your combined category budgets so far.`;

  }

}


/* =========================================================
   RENDER BUDGET CARDS
========================================================= */

function renderBudgets() {

  const grid =
    document.getElementById(
      "budgetGrid"
    );


  const search =
    document.getElementById(
      "budgetSearch"
    )
    ?.value
    .trim()
    .toLowerCase() || "";


  const budgets =
    allBudgets.filter(
      budget => {

        if (!search) {
          return true;
        }

        return String(
          budget.category_name ||
          ""
        )
          .toLowerCase()
          .includes(search);

      }
    );


  if (!budgets.length) {

    grid.innerHTML = `
      <div class="budget-empty">

        <strong>
          ${
            allBudgets.length
              ? "No matching budgets"
              : "No budgets set for this month"
          }
        </strong>

        <span>
          ${
            allBudgets.length
              ? "Try another search."
              : "Create a category limit to start tracking your spending."
          }
        </span>

        ${
          !allBudgets.length
            ? `
              <button
                type="button"
                class="empty-budget-button"
                id="emptyBudgetButton"
              >
                + Set first budget
              </button>
            `
            : ""
        }

      </div>
    `;


    document
      .getElementById(
        "emptyBudgetButton"
      )
      ?.addEventListener(
        "click",
        () => openBudgetModal()
      );


    return;

  }


  grid.innerHTML = "";


  budgets.forEach(
    (budget, index) => {

      const limit =
        Number(
          budget.monthly_limit || 0
        );


      const spent =
        Number(
          budget.spent || 0
        );


      const percent =
        Number(
          budget.percent_used || 0
        );


      const remaining =
        Math.max(
          limit - spent,
          0
        );


      let status =
        "On track";

      let stateClass =
        "";


      if (percent >= 100) {

        status =
          "Over budget";

        stateClass =
          "danger";

      }

      else if (percent >= 80) {

        status =
          "Near limit";

        stateClass =
          "warning";

      }


      const card =
        document.createElement(
          "article"
        );


      card.className =
        "budget-card-item";


      card.style.animationDelay =
        `${index * 0.05}s`;


      card.innerHTML = `
        <div class="budget-card-head">

          <div class="budget-category">

            <div class="budget-category-icon">
              ◎
            </div>

            <div>

              <strong>
                ${escapeHTML(
                  budget.category_name ||
                  "Category"
                )}
              </strong>

              <span>
                ${prettyMonth(selectedMonth)}
              </span>

            </div>

          </div>

          <span
            class="budget-status ${stateClass}"
          >
            ${status}
          </span>

        </div>


        <div class="budget-progress-info">

          <div>

            <span>
              Spent
            </span>

            <strong>
              ${money(spent)}
            </strong>

          </div>


          <div>

            <span>
              Limit
            </span>

            <strong>
              ${money(limit)}
            </strong>

          </div>

        </div>


        <div class="category-progress-track">

          <div
            class="category-progress-fill ${stateClass}"
            style="
              width:${Math.min(
                percent,
                100
              )}%
            "
          ></div>

        </div>


        <div class="budget-card-footer">

          <span>
            ${
              spent > limit
                ? `${money(
                    spent - limit
                  )} over limit`
                : `${money(
                    remaining
                  )} remaining`
            }
          </span>

          <button
            class="edit-budget-button"
            type="button"
            data-edit-budget="${
              budget.category_id
            }"
          >
            Edit limit
          </button>

        </div>
      `;


      grid.appendChild(
        card
      );

    }
  );


  document
    .querySelectorAll(
      "[data-edit-budget]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            editBudget(
              button.dataset.editBudget
            );

          }
        );

      }
    );

}


/* =========================================================
   MODAL
========================================================= */

const budgetModal =
  document.getElementById(
    "budgetModal"
  );


function openBudgetModal(
  categoryId = null
) {

  editingCategoryId =
    categoryId;


  document.getElementById(
    "budgetForm"
  ).reset();


  document.getElementById(
    "budgetNotice"
  ).className =
    "budget-form-notice";


  document.getElementById(
    "budgetModalTitle"
  ).textContent =
    categoryId
      ? "Update budget"
      : "Set a budget";


  document.getElementById(
    "saveBudgetButton"
  ).innerHTML =
    categoryId
      ? `<span>Update Budget</span><span>→</span>`
      : `<span>Save Budget</span><span>→</span>`;


  updateMonthLabels();


  budgetModal.classList.add(
    "open"
  );


  if (categoryId) {

    const existing =
      allBudgets.find(
        item =>
          String(
            item.category_id
          ) ===
          String(categoryId)
      );


    if (existing) {

      document.getElementById(
        "budgetCategory"
      ).value =
        existing.category_id;


      document.getElementById(
        "budgetAmount"
      ).value =
        existing.monthly_limit;

    }

  }


  setTimeout(
    () => {

      if (categoryId) {

        document.getElementById(
          "budgetAmount"
        ).focus();

      }

      else {

        document.getElementById(
          "budgetCategory"
        ).focus();

      }

    },
    100
  );

}


function closeBudgetModal() {

  budgetModal.classList.remove(
    "open"
  );

  editingCategoryId =
    null;

}


document
  .getElementById(
    "openBudgetModal"
  )
  .addEventListener(
    "click",
    () => openBudgetModal()
  );


document
  .getElementById(
    "closeBudgetModal"
  )
  .addEventListener(
    "click",
    closeBudgetModal
  );


budgetModal.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      budgetModal
    ) {

      closeBudgetModal();

    }

  }
);


/* =========================================================
   EDIT
========================================================= */

function editBudget(
  categoryId
) {

  openBudgetModal(
    categoryId
  );

}


/* =========================================================
   SAVE / UPDATE
========================================================= */

document
  .getElementById(
    "budgetForm"
  )
  .addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const categoryId =
        document.getElementById(
          "budgetCategory"
        ).value;


      const amount =
        Number(
          document.getElementById(
            "budgetAmount"
          ).value
        );


      const notice =
        document.getElementById(
          "budgetNotice"
        );


      if (
        !categoryId ||
        !amount ||
        amount <= 0
      ) {

        notice.textContent =
          "Please choose a category and enter a valid budget amount.";

        notice.className =
          "budget-form-notice show error";

        return;

      }


      const button =
        document.getElementById(
          "saveBudgetButton"
        );


      const original =
        button.innerHTML;


      button.disabled =
        true;


      button.innerHTML =
        `<span>Saving...</span>`;


      try {

        const result =
          await getJSON(
            API.setBudget,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({
                  category_id:
                    categoryId,

                  monthly_limit:
                    amount,

                  month_year:
                    monthInputToBackend(
                      selectedMonth
                    )
                })
            }
          );


        if (!result.success) {

          notice.textContent =
            result.message ||
            "Could not save budget.";

          notice.className =
            "budget-form-notice show error";

          return;

        }


        notice.textContent =
          result.message ||
          "Budget saved successfully.";

        notice.className =
          "budget-form-notice show success";


        await loadBudgets();


        showToast(
          editingCategoryId
            ? "Budget updated"
            : "Budget saved"
        );


        setTimeout(
          closeBudgetModal,
          450
        );

      }

      catch (error) {

        console.error(
          "Budget save error:",
          error
        );


        notice.textContent =
          "Could not connect to the server.";

        notice.className =
          "budget-form-notice show error";

      }

      finally {

        button.disabled =
          false;

        button.innerHTML =
          original;

      }

    }
  );


/* =========================================================
   SEARCH
========================================================= */

document
  .getElementById(
    "budgetSearch"
  )
  ?.addEventListener(
    "input",
    renderBudgets
  );


/* =========================================================
   TOAST
========================================================= */

let toastTimer;


function showToast(message) {

  const toast =
    document.getElementById(
      "budgetToast"
    );


  document.getElementById(
    "budgetToastText"
  ).textContent =
    message;


  toast.classList.add(
    "show"
  );


  clearTimeout(
    toastTimer
  );


  toastTimer =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      2200
    );

}


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


mobileMenuButton.addEventListener(
  "click",
  event => {

    event.stopPropagation();

    sidebar.classList.toggle(
      "mobile-open"
    );

  }
);


document.addEventListener(
  "click",
  event => {

    if (
      window.innerWidth <= 960 &&
      sidebar.classList.contains(
        "mobile-open"
      ) &&
      !sidebar.contains(
        event.target
      ) &&
      !mobileMenuButton.contains(
        event.target
      )
    ) {

      sidebar.classList.remove(
        "mobile-open"
      );

    }

  }
);


window.addEventListener(
  "resize",
  () => {

    if (
      window.innerWidth > 960
    ) {

      sidebar.classList.remove(
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


if (
  localStorage.getItem(
    "campusCoinTheme"
  ) === "dark"
) {

  document.body.classList.add(
    "dark-theme"
  );

  themeToggle.textContent =
    "☾";

}


themeToggle.addEventListener(
  "click",
  () => {

    const dark =
      document.body.classList.toggle(
        "dark-theme"
      );


    themeToggle.textContent =
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
   ESC
========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Escape"
    ) {

      closeBudgetModal();

      sidebar.classList.remove(
        "mobile-open"
      );

    }

  }
);


/* =========================================================
   LOGOUT
========================================================= */

document
  .getElementById(
    "logoutButton"
  )
  .addEventListener(
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

      catch (error) {}


      window.location.href =
        "index.html";

    }
  );


/* =========================================================
   START
========================================================= */

async function startBudgetPage() {

  setupCurrentMonth();


  await Promise.allSettled([
    loadProfile(),
    loadCategories()
  ]);


  await loadBudgets();

}


startBudgetPage();