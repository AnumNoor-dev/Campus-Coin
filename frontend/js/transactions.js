const API = {
  profile: "../backend/profile/get_profile.php",
  categories: "../backend/categories/get_categories.php",
  transactions: "../backend/transactions/get_transactions.php",
  add: "../backend/transactions/add_transaction.php",
  update: "../backend/transactions/update_transaction.php",
  delete: "../backend/transactions/delete_transaction.php",
  logout: "../backend/auth/logout.php"
};

let allTransactions = [];
let allCategories = [];
let activeTypeFilter = "all";
let transactionToDelete = null;

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-PK", {
    maximumFractionDigits: 0
  })}`;
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

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showNotice(message, type = "error") {
  const notice = document.getElementById("transactionNotice");

  notice.textContent = message;
  notice.className = `notice show ${type}`;
}

function clearNotice() {
  const notice = document.getElementById("transactionNotice");

  notice.textContent = "";
  notice.className = "notice";
}

async function loadProfile() {
  try {
    const data = await getJSON(API.profile);

    if (!data.success || !data.profile) return;

    const name = data.profile.name || "Student";

    document.getElementById("topbarUserName").textContent = name;

    const initials = name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join("");

    document.getElementById("userAvatar").textContent =
      initials || "CU";

  } catch (error) {
    console.error("Profile:", error);
  }
}

async function loadCategories() {
  try {
    const data = await getJSON(API.categories);

    if (!data.success) return;

    allCategories = data.categories || [];

    renderCategoryFilter();
    renderFormCategories();

  } catch (error) {
    console.error("Categories:", error);
  }
}

function renderCategoryFilter() {
  const filter = document.getElementById("categoryFilter");

  filter.innerHTML =
    `<option value="">All Categories</option>`;

  allCategories.forEach(category => {
    const option = document.createElement("option");

    option.value = category.category_id;
    option.textContent = category.name;

    filter.appendChild(option);
  });
}

function renderFormCategories() {
  const select =
    document.getElementById("transactionCategory");

  const selectedType =
    document.getElementById("transactionType").value;

  select.innerHTML =
    `<option value="">Select category</option>`;

  allCategories
    .filter(category => category.type === selectedType)
    .forEach(category => {
      const option = document.createElement("option");

      option.value = category.category_id;
      option.textContent = category.name;

      select.appendChild(option);
    });
}

async function loadTransactions() {
  try {
    const data = await getJSON(API.transactions);

    if (!data.success) {
      showEmpty();
      return;
    }

    allTransactions =
      data.transactions ||
      data.data ||
      [];

    updateSummary();
    applyFilters();

  } catch (error) {
    console.error("Transactions:", error);
    showEmpty();
  }
}

function updateSummary() {
  let income = 0;
  let expense = 0;

  allTransactions.forEach(item => {
    const amount = Number(item.amount || 0);

    if (item.type === "income") {
      income += amount;
    } else {
      expense += amount;
    }
  });

  document.getElementById("summaryIncome").textContent =
    money(income);

  document.getElementById("summaryExpense").textContent =
    money(expense);

  document.getElementById("summaryCount").textContent =
    allTransactions.length;
}

function applyFilters() {
  const search = document
    .getElementById("transactionSearch")
    .value
    .trim()
    .toLowerCase();

  const category =
    document.getElementById("categoryFilter").value;

  const date =
    document.getElementById("dateFilter").value;

  const filtered = allTransactions.filter(item => {
    const matchesType =
      activeTypeFilter === "all" ||
      item.type === activeTypeFilter;

    const matchesCategory =
      !category ||
      String(item.category_id) === String(category);

    const itemDate =
      item.txn_date ||
      item.date ||
      "";

    const matchesDate =
      !date ||
      itemDate === date;

    const text = `
      ${item.description || ""}
      ${item.category_name || ""}
      ${item.type || ""}
    `.toLowerCase();

    const matchesSearch =
      !search ||
      text.includes(search);

    return (
      matchesType &&
      matchesCategory &&
      matchesDate &&
      matchesSearch
    );
  });

  renderTransactions(filtered);
}

function renderTransactions(transactions) {
  const body =
    document.getElementById("transactionsTableBody");

  const empty =
    document.getElementById("transactionsEmpty");

  const table =
    document.querySelector(".transactions-table");

  if (!transactions.length) {
    body.innerHTML = "";
    table.style.display = "none";
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");
  table.style.display = "table";

  body.innerHTML = "";

  transactions.forEach(item => {
    const row = document.createElement("tr");

    const date =
      item.txn_date ||
      item.date ||
      "-";

    const category =
      item.category_name ||
      findCategoryName(item.category_id);

    const type =
      item.type || "expense";

    const description =
      item.description ||
      category ||
      "Transaction";

    row.innerHTML = `
      <td>
        ${formatDate(date)}
      </td>

      <td>
        <div class="transaction-description">

          <div class="transaction-table-icon">
            ${type === "income" ? "↙" : "↗"}
          </div>

          <div>
            <strong>
              ${escapeHTML(description)}
            </strong>

            ${
              Number(item.is_recurring) === 1
                ? "<small>↻ Recurring monthly</small>"
                : "<small>One-time transaction</small>"
            }
          </div>

        </div>
      </td>

      <td>
        <span class="category-badge">
          ${escapeHTML(category)}
        </span>
      </td>

      <td>
        <span class="type-badge ${type}">
          ${type === "income" ? "Income" : "Expense"}
        </span>
      </td>

      <td>
        <span class="transaction-amount ${type}">
          ${type === "income" ? "+" : "-"}${money(item.amount)}
        </span>
      </td>

      <td>
        <div class="table-actions">

          <button
            class="table-action-button edit"
            type="button"
            title="Edit transaction"
            data-edit="${item.transaction_id}"
          >
            ✎
          </button>

          <button
            class="table-action-button delete"
            type="button"
            title="Delete transaction"
            data-delete="${item.transaction_id}"
          >
            ✕
          </button>

        </div>
      </td>
    `;

    body.appendChild(row);
  });

  attachRowActions();
}

function findCategoryName(categoryId) {
  const category = allCategories.find(
    item =>
      String(item.category_id) ===
      String(categoryId)
  );

  return category?.name || "Other";
}

function formatDate(date) {
  if (!date) return "-";

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function showEmpty() {
  const body =
    document.getElementById("transactionsTableBody");

  body.innerHTML = "";

  document.querySelector(".transactions-table").style.display =
    "none";

  document
    .getElementById("transactionsEmpty")
    .classList
    .remove("hidden");
}

const transactionModal =
  document.getElementById("transactionModal");

function openTransactionModal() {
  resetForm();

  transactionModal.classList.add("open");

  setTimeout(() => {
    document
      .getElementById("transactionDescription")
      .focus();
  }, 100);
}

function closeTransactionModal() {
  transactionModal.classList.remove("open");
  clearNotice();
}

document
  .getElementById("openTransactionModal")
  .addEventListener("click", openTransactionModal);

document
  .getElementById("emptyAddButton")
  .addEventListener("click", openTransactionModal);

document
  .getElementById("closeTransactionModal")
  .addEventListener("click", closeTransactionModal);

transactionModal.addEventListener("click", event => {
  if (event.target === transactionModal) {
    closeTransactionModal();
  }
});

document
  .querySelectorAll(".type-option")
  .forEach(button => {

    button.addEventListener("click", () => {

      document
        .querySelectorAll(".type-option")
        .forEach(item =>
          item.classList.remove("active")
        );

      button.classList.add("active");

      document.getElementById("transactionType").value =
        button.dataset.type;

      renderFormCategories();

    });

  });

function resetForm() {
  document.getElementById("transactionForm").reset();

  document.getElementById("transactionId").value = "";

  document.getElementById("transactionType").value =
    "expense";

  document.getElementById("transactionModalTitle").textContent =
    "Add Transaction";

  document.getElementById("saveTransactionButton").innerHTML =
    `<span>Save Transaction</span><span>→</span>`;

  document
    .querySelectorAll(".type-option")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.type === "expense"
      );
    });

  document.getElementById("transactionDate").value =
    new Date().toISOString().split("T")[0];

  renderFormCategories();

  clearNotice();
}

document
  .getElementById("transactionForm")
  .addEventListener("submit", async event => {

    event.preventDefault();
    clearNotice();

    const transactionId =
      document.getElementById("transactionId").value;

    const payload = {
      category_id:
        document.getElementById("transactionCategory").value,

      amount:
        Number(
          document.getElementById("transactionAmount").value
        ),

      type:
        document.getElementById("transactionType").value,

      description:
        document
          .getElementById("transactionDescription")
          .value
          .trim(),

      txn_date:
        document.getElementById("transactionDate").value,

      is_recurring:
        document.getElementById("isRecurring").checked
          ? 1
          : 0
    };

    if (
      !payload.category_id ||
      !payload.amount ||
      !payload.description ||
      !payload.txn_date
    ) {
      showNotice(
        "Please complete all transaction details."
      );
      return;
    }

    if (transactionId) {
      payload.transaction_id = transactionId;
    }

    const button =
      document.getElementById("saveTransactionButton");

    const original =
      button.innerHTML;

    button.disabled = true;

    button.innerHTML = `
      <span class="spinner"></span>
      <span>Saving...</span>
    `;

    try {
      const result = await getJSON(
        transactionId
          ? API.update
          : API.add,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify(payload)
        }
      );

      if (!result.success) {
        showNotice(
          result.message ||
          "Could not save transaction."
        );

        return;
      }

      showNotice(
        transactionId
          ? "Transaction updated successfully."
          : "Transaction added successfully.",
        "success"
      );

      await loadTransactions();

      setTimeout(() => {
        closeTransactionModal();
      }, 550);

    } catch (error) {
      console.error(error);

      showNotice(
        "Could not connect to the server."
      );

    } finally {
      button.disabled = false;
      button.innerHTML = original;
    }

  });

function attachRowActions() {
  document
    .querySelectorAll("[data-edit]")
    .forEach(button => {

      button.addEventListener("click", () => {
        editTransaction(
          button.dataset.edit
        );
      });

    });

  document
    .querySelectorAll("[data-delete]")
    .forEach(button => {

      button.addEventListener("click", () => {
        openDeleteModal(
          button.dataset.delete
        );
      });

    });
}

function editTransaction(id) {
  const item = allTransactions.find(
    transaction =>
      String(transaction.transaction_id) ===
      String(id)
  );

  if (!item) return;

  resetForm();

  document.getElementById("transactionId").value =
    item.transaction_id;

  document.getElementById("transactionType").value =
    item.type;

  document
    .querySelectorAll(".type-option")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.type === item.type
      );
    });

  renderFormCategories();

  document.getElementById("transactionCategory").value =
    item.category_id;

  document.getElementById("transactionDescription").value =
    item.description || "";

  document.getElementById("transactionAmount").value =
    item.amount;

  document.getElementById("transactionDate").value =
    item.txn_date ||
    item.date ||
    "";

  document.getElementById("isRecurring").checked =
    Number(item.is_recurring) === 1;

  document.getElementById("transactionModalTitle").textContent =
    "Edit Transaction";

  document.getElementById("saveTransactionButton").innerHTML =
    `<span>Update Transaction</span><span>→</span>`;

  transactionModal.classList.add("open");
}


/* =========================
   DELETE
========================= */

const deleteModal =
  document.getElementById("deleteModal");

function openDeleteModal(id) {
  transactionToDelete = id;
  deleteModal.classList.add("open");
}

function closeDeleteModal() {
  transactionToDelete = null;
  deleteModal.classList.remove("open");
}

document
  .getElementById("cancelDelete")
  .addEventListener("click", closeDeleteModal);

deleteModal.addEventListener("click", event => {
  if (event.target === deleteModal) {
    closeDeleteModal();
  }
});

document
  .getElementById("confirmDelete")
  .addEventListener("click", async () => {

    if (!transactionToDelete) return;

    const button =
      document.getElementById("confirmDelete");

    const original =
      button.textContent;

    button.disabled = true;
    button.textContent = "Deleting...";

    try {
      const result = await getJSON(
        API.delete,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            transaction_id:
              transactionToDelete
          })
        }
      );

      if (result.success) {
        closeDeleteModal();
        await loadTransactions();
      }

    } catch (error) {
      console.error(
        "Delete error:",
        error
      );
    } finally {
      button.disabled = false;
      button.textContent = original;
    }

  });

document
  .querySelectorAll(".transaction-tab")
  .forEach(button => {

    button.addEventListener("click", () => {

      document
        .querySelectorAll(".transaction-tab")
        .forEach(item =>
          item.classList.remove("active")
        );

      button.classList.add("active");

      activeTypeFilter =
        button.dataset.filter;

      applyFilters();

    });

  });

document
  .getElementById("transactionSearch")
  .addEventListener("input", applyFilters);

document
  .getElementById("categoryFilter")
  .addEventListener("change", applyFilters);

document
  .getElementById("dateFilter")
  .addEventListener("change", applyFilters);

document
  .getElementById("clearFilters")
  .addEventListener("click", () => {

    activeTypeFilter = "all";

    document
      .querySelectorAll(".transaction-tab")
      .forEach(button =>
        button.classList.toggle(
          "active",
          button.dataset.filter === "all"
        )
      );

    document.getElementById("categoryFilter").value = "";
    document.getElementById("dateFilter").value = "";
    document.getElementById("transactionSearch").value = "";

    applyFilters();

  });


/* =========================
   MOBILE SIDEBAR
========================= */

/* =========================
   MOBILE SIDEBAR
========================= */

const sidebar =
  document.getElementById("sidebar");

const mobileMenuButton =
  document.getElementById("mobileMenuButton");


mobileMenuButton.addEventListener("click", () => {

  sidebar.classList.toggle("mobile-open");

});


document.addEventListener("click", event => {

  if (
    window.innerWidth <= 960 &&
    sidebar.classList.contains("mobile-open") &&
    !sidebar.contains(event.target) &&
    !mobileMenuButton.contains(event.target)
  ) {

    sidebar.classList.remove("mobile-open");

  }

});


document
  .querySelectorAll(".sidebar .nav-item")
  .forEach(link => {

    link.addEventListener("click", () => {

      if (window.innerWidth <= 960) {

        sidebar.classList.remove("mobile-open");

      }

    });

  });
const themeToggle =
  document.getElementById("themeToggle");

if (
  localStorage.getItem("campusCoinTheme") ===
  "dark"
) {
  document.body.classList.add("dark-theme");
  themeToggle.textContent = "☾";
}

themeToggle.addEventListener("click", () => {

  const dark =
    document.body.classList.toggle(
      "dark-theme"
    );

  themeToggle.textContent =
    dark ? "☾" : "☼";

  localStorage.setItem(
    "campusCoinTheme",
    dark ? "dark" : "light"
  );

});

document
  .getElementById("logoutButton")
  .addEventListener("click", async () => {

    try {
      await fetch(API.logout, {
        credentials: "same-origin"
      });
    } catch (error) {}

    window.location.href =
      "index.html";

  });


async function startTransactionsPage() {
  await Promise.all([
    loadProfile(),
    loadCategories()
  ]);

  await loadTransactions();

  document.getElementById("transactionDate").value =
    new Date().toISOString().split("T")[0];
}

startTransactionsPage();