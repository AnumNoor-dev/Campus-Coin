/* =========================================================
   CAMPUS COIN — ADMIN PANEL
========================================================= */

const ADMIN_API = {

  stats:
    "../admin/get_stats.php",

  users:
    "../admin/get_users.php",

  status:
    "../admin/update_user_status.php",

  password:
    "../admin/reset_user_password.php",

  categories:
    "../admin/manage_categories.php?action=list",

  addCategory:
    "../admin/add_default_category.php",

  editCategory:
    "../admin/edit_default_category.php",

  deleteCategory:
    "../admin/delete_default_category.php",

  content:
    "../admin/manage_content.php",

  editContent:
    "../admin/edit_content.php",

  deleteContent:
    "../admin/delete_content.php",

  logout:
    "../admin/admin_logout.php"

};


let adminUsers = [];

let adminCategories = [];

let adminContentItems = [];

let categoryFilter =
  "all";

let contentFilter =
  "all";

let editingCategoryId =
  null;

let editingContentId =
  null;

let resettingUserId =
  null;

let pendingConfirmAction =
  null;

let currentAdminPage =
  "overview";

let toastTimer;


/* =========================================================
   HELPERS
========================================================= */

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


  if (!text.trim()) {

    throw new Error(
      "Empty server response"
    );

  }


  const data =
    JSON.parse(
      text
    );


  if (
    data.success === false &&
    String(
      data.message || ""
    )
      .toLowerCase()
      .includes(
        "admin not logged in"
      )
  ) {

    window.location.href =
      "admin_login.html";

    throw new Error(
      "Admin session expired"
    );

  }


  return data;

}


function initials(name) {

  return String(
    name || "Student"
  )
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0,2)
    .map(
      part =>
        part[0].toUpperCase()
    )
    .join("") ||
    "ST";

}


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


function formatDate(value) {

  if (!value) {
    return "—";
  }


  const date =
    new Date(
      String(value)
        .replace(
          " ",
          "T"
        )
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return value;

  }


  return date.toLocaleDateString(
    "en-PK",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );

}


function showToast(
  message,
  icon = "✓"
) {

  const toast =
    document.getElementById(
      "adminToast"
    );


  document.getElementById(
    "adminToastText"
  ).textContent =
    message;


  document.getElementById(
    "adminToastIcon"
  ).textContent =
    icon;


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
      2300
    );

}


/* =========================================================
   PAGE NAVIGATION
========================================================= */

function openAdminPage(page) {

  currentAdminPage =
    page;


  document
    .querySelectorAll(
      "[data-page-section]"
    )
    .forEach(
      section => {

        section.classList.toggle(
          "active",
          section.dataset.pageSection ===
            page
        );

      }
    );


  document
    .querySelectorAll(
      "[data-admin-page]"
    )
    .forEach(
      button => {

        button.classList.toggle(
          "active",
          button.dataset.adminPage ===
            page
        );

      }
    );


  document.getElementById(
    "adminSearch"
  ).value =
    "";


  applyAdminSearch();


  document
    .getElementById(
      "adminSidebar"
    )
    ?.classList.remove(
      "open"
    );


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


document
  .querySelectorAll(
    "[data-admin-page]"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          openAdminPage(
            button.dataset.adminPage
          );

        }
      );

    }
  );


document
  .querySelectorAll(
    "[data-open-admin-page]"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          openAdminPage(
            button.dataset.openAdminPage
          );

        }
      );

    }
  );


/* =========================================================
   STATS
========================================================= */

async function loadStats() {

  try {

    const data =
      await getJSON(
        ADMIN_API.stats
      );


    if (!data.success) {
      return;
    }


    const stats =
      data.stats || {};


    setText(
      "adminTotalUsers",
      stats.total_users ?? 0
    );


    setText(
      "adminTotalTransactions",
      stats.total_transactions ?? 0
    );


    setText(
      "adminTotalCategories",
      stats.total_categories ?? 0
    );


    setText(
      "adminActiveUsers",
      stats.active_this_month ?? 0
    );


    const popular =
      stats.most_used_category;


    if (popular) {

      setText(
        "adminPopularCategory",
        popular.name ||
        "Category"
      );


      setText(
        "adminPopularCategoryText",
        `${Number(
          popular.usage_count || 0
        )} transaction${
          Number(
            popular.usage_count || 0
          ) === 1
            ? ""
            : "s"
        } currently use this category.`
      );

    }

    else {

      setText(
        "adminPopularCategory",
        "No activity yet"
      );


      setText(
        "adminPopularCategoryText",
        "The most-used category will appear after students log transactions."
      );

    }

  }

  catch (error) {

    console.error(
      "Stats error:",
      error
    );

  }

}


function setText(
  id,
  value
) {

  const element =
    document.getElementById(
      id
    );


  if (element) {

    element.textContent =
      value;

  }

}


/* =========================================================
   USERS
========================================================= */

async function loadUsers() {

  const list =
    document.getElementById(
      "adminUserList"
    );


  try {

    const data =
      await getJSON(
        ADMIN_API.users
      );


    if (!data.success) {

      throw new Error(
        data.message ||
        "Users could not load"
      );

    }


    adminUsers =
      Array.isArray(
        data.users
      )
        ? data.users
        : [];


    setText(
      "adminUserCount",
      `${adminUsers.length} user${
        adminUsers.length === 1
          ? ""
          : "s"
      }`
    );


    renderUsers();

  }

  catch (error) {

    console.error(
      "Users error:",
      error
    );


    list.innerHTML = `
      <div class="admin-empty-state">
        Users could not be loaded.
      </div>
    `;

  }

}


function filteredUsers() {

  const query =
    adminSearchValue();


  if (!query) {

    return adminUsers;

  }


  return adminUsers.filter(
    user => {

      const text =
        `${
          user.name || ""
        } ${
          user.email || ""
        } ${
          user.academic_year || ""
        }`
          .toLowerCase();


      return text.includes(
        query
      );

    }
  );

}


function renderUsers() {

  const list =
    document.getElementById(
      "adminUserList"
    );


  const users =
    filteredUsers();


  if (!users.length) {

    list.innerHTML = `
      <div class="admin-empty-state">
        No matching student accounts.
      </div>
    `;

    return;

  }


  list.innerHTML =
    "";


  users.forEach(
    user => {

      const active =
        Number(
          user.is_active ?? 1
        ) === 1;


      const card =
        document.createElement(
          "article"
        );


      card.className =
        "admin-user-card";


      card.innerHTML = `
        <div class="admin-user-avatar">
          ${escapeHTML(
            initials(user.name)
          )}
        </div>


        <div class="admin-user-main">

          <strong>
            ${escapeHTML(
              user.name ||
              "Student"
            )}
          </strong>

          <small>
            ${escapeHTML(
              user.email ||
              "No email"
            )}
          </small>

        </div>


        <div class="admin-user-meta">

          <span>
            Academic year
          </span>

          <strong>
            ${escapeHTML(
              user.academic_year ||
              "Not set"
            )}
          </strong>

        </div>


        <div class="admin-user-goal">

          <span>
            Savings goal
          </span>

          <strong>
            ${money(
              user.monthly_savings_goal
            )}
          </strong>

        </div>


        <div class="admin-user-actions">

          <span
            class="admin-status-badge ${
              active
                ? ""
                : "disabled"
            }"
          >
            ${
              active
                ? "● Active"
                : "● Disabled"
            }
          </span>


          <button
            type="button"
            class="admin-small-button"
            data-reset-user="${
              user.user_id
            }"
          >
            Reset Password
          </button>


          <button
            type="button"
            class="admin-small-button ${
              active
                ? "danger"
                : ""
            }"
            data-user-status="${
              user.user_id
            }"
            data-next-status="${
              active
                ? 0
                : 1
            }"
          >
            ${
              active
                ? "Disable"
                : "Enable"
            }
          </button>

        </div>
      `;


      list.appendChild(
        card
      );

    }
  );


  bindUserActions();

}


function bindUserActions() {

  document
    .querySelectorAll(
      "[data-user-status]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const id =
              button.dataset
                .userStatus;


            const status =
              Number(
                button.dataset
                  .nextStatus
              );


            const user =
              adminUsers.find(
                item =>
                  String(
                    item.user_id
                  ) ===
                  String(id)
              );


            openConfirm(
              status === 1
                ? "Enable student?"
                : "Disable student?",

              status === 1
                ? `${user?.name || "This student"} will be able to log in again.`
                : `${user?.name || "This student"} will no longer be able to log in.`,

              async () => {

                await updateUserStatus(
                  id,
                  status
                );

              }
            );

          }
        );

      }
    );


  document
    .querySelectorAll(
      "[data-reset-user]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            openPasswordModal(
              button.dataset.resetUser
            );

          }
        );

      }
    );

}


async function updateUserStatus(
  userId,
  status
) {

  try {

    const data =
      await getJSON(
        ADMIN_API.status,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              user_id:
                userId,

              is_active:
                status
            })
        }
      );


    if (!data.success) {

      showToast(
        data.message ||
        "Status update failed",
        "!"
      );

      return;

    }


    showToast(
      data.message
    );


    await Promise.all([
      loadUsers(),
      loadStats()
    ]);

  }

  catch (error) {

    console.error(error);


    showToast(
      "Could not update account",
      "!"
    );

  }

}


/* =========================================================
   PASSWORD RESET
========================================================= */

function openPasswordModal(
  userId
) {

  resettingUserId =
    userId;


  const user =
    adminUsers.find(
      item =>
        String(
          item.user_id
        ) ===
        String(
          userId
        )
    );


  setText(
    "resetPasswordUserName",
    user?.name ||
    "this student"
  );


  document.getElementById(
    "adminNewPassword"
  ).value =
    "";


  resetFormMessage(
    "adminPasswordMessage"
  );


  openModal(
    "adminPasswordModal"
  );

}


document
  .getElementById(
    "adminPasswordForm"
  )
  .addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const password =
        document
          .getElementById(
            "adminNewPassword"
          )
          .value;


      if (
        password.length < 6
      ) {

        setFormMessage(
          "adminPasswordMessage",
          "Password must contain at least 6 characters.",
          "error"
        );

        return;

      }


      try {

        const data =
          await getJSON(
            ADMIN_API.password,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({
                  user_id:
                    resettingUserId,

                  new_password:
                    password
                })
            }
          );


        if (!data.success) {

          setFormMessage(
            "adminPasswordMessage",
            data.message ||
            "Password reset failed.",
            "error"
          );

          return;

        }


        closeModal(
          "adminPasswordModal"
        );


        showToast(
          "Password reset successfully"
        );

      }

      catch (error) {

        console.error(error);


        setFormMessage(
          "adminPasswordMessage",
          "Could not reset password.",
          "error"
        );

      }

    }
  );


/* =========================================================
   CATEGORIES
========================================================= */

async function loadAdminCategories() {

  const grid =
    document.getElementById(
      "adminCategoryGrid"
    );


  try {

    const data =
      await getJSON(
        ADMIN_API.categories
      );


    if (!data.success) {

      throw new Error(
        data.message ||
        "Could not load categories"
      );

    }


    adminCategories =
      (
        Array.isArray(
          data.categories
        )
          ? data.categories
          : []
      )
        .filter(
          item =>
            Number(
              item.is_default || 0
            ) === 1
        );


    renderAdminCategories();

  }

  catch (error) {

    console.error(
      "Admin categories:",
      error
    );


    grid.innerHTML = `
      <div class="admin-empty-state">
        Default categories could not be loaded.
      </div>
    `;

  }

}


function filteredAdminCategories() {

  const query =
    adminSearchValue();


  return adminCategories.filter(
    category => {

      const type =
        String(
          category.type || ""
        ).toLowerCase();


      if (
        categoryFilter !== "all" &&
        type !== categoryFilter
      ) {

        return false;

      }


      if (
        query &&
        !`${category.name} ${type}`
          .toLowerCase()
          .includes(query)
      ) {

        return false;

      }


      return true;

    }
  );

}


function renderAdminCategories() {

  const grid =
    document.getElementById(
      "adminCategoryGrid"
    );


  const categories =
    filteredAdminCategories();


  if (!categories.length) {

    grid.innerHTML = `
      <div class="admin-empty-state">
        No matching default categories.
      </div>
    `;

    return;

  }


  grid.innerHTML =
    "";


  categories.forEach(
    category => {

      const type =
        String(
          category.type || ""
        ).toLowerCase();


      const card =
        document.createElement(
          "article"
        );


      card.className =
        `admin-category-card ${
          type === "income"
            ? "income"
            : ""
        }`;


      card.innerHTML = `
        <div class="admin-category-card-head">

          <div class="admin-category-name">

            <div class="admin-category-icon">
              ${
                type === "income"
                  ? "↙"
                  : "↗"
              }
            </div>

            <div>

              <strong>
                ${escapeHTML(
                  category.name
                )}
              </strong>

              <span>
                ${
                  type === "income"
                    ? "Income"
                    : "Expense"
                }
              </span>

            </div>

          </div>


          <span class="admin-system-badge">
            System Default
          </span>

        </div>


        <p>
          Available to every student when
          recording ${escapeHTML(type)}
          transactions.
        </p>


        <div class="admin-card-actions">

          <button
            type="button"
            class="admin-small-button"
            data-edit-admin-category="${
              category.category_id
            }"
          >
            Edit
          </button>


          <button
            type="button"
            class="admin-small-button danger"
            data-delete-admin-category="${
              category.category_id
            }"
          >
            Delete
          </button>

        </div>
      `;


      grid.appendChild(
        card
      );

    }
  );


  bindAdminCategoryActions();

}


document
  .querySelectorAll(
    "[data-admin-category-filter]"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          document
            .querySelectorAll(
              "[data-admin-category-filter]"
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


          categoryFilter =
            button.dataset
              .adminCategoryFilter;


          renderAdminCategories();

        }
      );

    }
  );


function bindAdminCategoryActions() {

  document
    .querySelectorAll(
      "[data-edit-admin-category]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            openCategoryModal(
              button.dataset
                .editAdminCategory
            );

          }
        );

      }
    );


  document
    .querySelectorAll(
      "[data-delete-admin-category]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const id =
              button.dataset
                .deleteAdminCategory;


            const category =
              adminCategories.find(
                item =>
                  String(
                    item.category_id
                  ) ===
                  String(id)
              );


            openConfirm(
              "Delete default category?",

              `${category?.name || "This category"} will be removed for all students. Categories already used by transactions cannot be deleted.`,

              async () => {

                await deleteDefaultCategory(
                  id
                );

              }
            );

          }
        );

      }
    );

}


function openCategoryModal(
  id = null
) {

  editingCategoryId =
    id;


  resetFormMessage(
    "adminCategoryMessage"
  );


  const name =
    document.getElementById(
      "adminCategoryName"
    );


  const type =
    document.getElementById(
      "adminCategoryType"
    );


  if (!id) {

    setText(
      "adminCategoryModalTitle",
      "Add category"
    );


    name.value = "";

    type.value =
      "expense";

  }

  else {

    const category =
      adminCategories.find(
        item =>
          String(
            item.category_id
          ) ===
          String(id)
      );


    setText(
      "adminCategoryModalTitle",
      "Edit category"
    );


    name.value =
      category?.name || "";


    type.value =
      category?.type ||
      "expense";

  }


  openModal(
    "adminCategoryModal"
  );


  setTimeout(
    () =>
      name.focus(),
    100
  );

}


document
  .getElementById(
    "addDefaultCategoryButton"
  )
  .addEventListener(
    "click",
    () =>
      openCategoryModal()
  );


document
  .getElementById(
    "adminCategoryForm"
  )
  .addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const name =
        document
          .getElementById(
            "adminCategoryName"
          )
          .value
          .trim();


      const type =
        document
          .getElementById(
            "adminCategoryType"
          )
          .value;


      if (!name) {

        setFormMessage(
          "adminCategoryMessage",
          "Category name is required.",
          "error"
        );

        return;

      }


      const button =
        document.getElementById(
          "adminCategorySave"
        );


      const old =
        button.textContent;


      button.disabled = true;

      button.textContent =
        "Saving...";


      try {

        const editing =
          Boolean(
            editingCategoryId
          );


        const payload = {
          name,
          type
        };


        if (editing) {

          payload.category_id =
            editingCategoryId;

        }


        const data =
          await getJSON(
            editing
              ? ADMIN_API.editCategory
              : ADMIN_API.addCategory,

            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify(
                  payload
                )
            }
          );


        if (!data.success) {

          setFormMessage(
            "adminCategoryMessage",
            data.message ||
            "Category could not be saved.",
            "error"
          );

          return;

        }


        closeModal(
          "adminCategoryModal"
        );


        showToast(
          data.message ||
          "Category saved"
        );


        await Promise.all([
          loadAdminCategories(),
          loadStats()
        ]);

      }

      catch (error) {

        console.error(error);


        setFormMessage(
          "adminCategoryMessage",
          "Could not save category.",
          "error"
        );

      }

      finally {

        button.disabled =
          false;

        button.textContent =
          old;

      }

    }
  );


async function deleteDefaultCategory(
  id
) {

  try {

    const data =
      await getJSON(
        ADMIN_API.deleteCategory,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              category_id:
                id
            })
        }
      );


    if (!data.success) {

      showToast(
        data.message ||
        "Category could not be deleted.",
        "!"
      );

      return;

    }


    showToast(
      data.message
    );


    await Promise.all([
      loadAdminCategories(),
      loadStats()
    ]);

  }

  catch (error) {

    console.error(error);


    showToast(
      "Could not delete category",
      "!"
    );

  }

}


/* =========================================================
   CONTENT
========================================================= */

async function loadAdminContent() {

  const grid =
    document.getElementById(
      "adminContentGrid"
    );


  try {

    const data =
      await getJSON(
        ADMIN_API.content
      );


    if (!data.success) {

      throw new Error(
        data.message ||
        "Content could not load"
      );

    }


    adminContentItems =
      Array.isArray(
        data.items
      )
        ? data.items
        : [];


    renderAdminContent();

  }

  catch (error) {

    console.error(
      "Content error:",
      error
    );


    grid.innerHTML = `
      <div class="admin-empty-state">
        System content could not be loaded.
      </div>
    `;

  }

}


function filteredAdminContent() {

  const query =
    adminSearchValue();


  return adminContentItems.filter(
    item => {

      if (
        contentFilter !== "all" &&
        item.type !== contentFilter
      ) {

        return false;

      }


      if (query) {

        const text =
          `${
            item.title || ""
          } ${
            item.content || ""
          } ${
            item.type || ""
          }`
            .toLowerCase();


        if (
          !text.includes(
            query
          )
        ) {

          return false;

        }

      }


      return true;

    }
  );

}


function renderAdminContent() {

  const grid =
    document.getElementById(
      "adminContentGrid"
    );


  const items =
    filteredAdminContent();


  if (!items.length) {

    grid.innerHTML = `
      <div class="admin-empty-state">
        No matching announcements or tip templates.
      </div>
    `;

    return;

  }


  grid.innerHTML =
    "";


  items.forEach(
    item => {

      const card =
        document.createElement(
          "article"
        );


      card.className =
        "admin-content-card";


      card.innerHTML = `
        <div class="admin-content-card-head">

          <div class="admin-category-name">

            <div class="admin-content-icon">
              ${
                item.type ===
                "tip_template"
                  ? "✦"
                  : "◇"
              }
            </div>

            <div>

              <h3>
                ${escapeHTML(
                  item.title
                )}
              </h3>

              <span>
                ${escapeHTML(
                  formatDate(
                    item.created_at
                  )
                )}
              </span>

            </div>

          </div>


          <span
            class="admin-content-type ${
              item.type
            }"
          >
            ${
              item.type ===
                "tip_template"
                ? "Tip Template"
                : "Announcement"
            }
          </span>

        </div>


        <p>
          ${escapeHTML(
            item.content
          )}
        </p>


        <div class="admin-card-actions">

          <button
            type="button"
            class="admin-small-button"
            data-edit-admin-content="${
              item.content_id
            }"
          >
            Edit
          </button>


          <button
            type="button"
            class="admin-small-button danger"
            data-delete-admin-content="${
              item.content_id
            }"
          >
            Delete
          </button>

        </div>
      `;


      grid.appendChild(
        card
      );

    }
  );


  bindAdminContentActions();

}


document
  .querySelectorAll(
    "[data-admin-content-filter]"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          document
            .querySelectorAll(
              "[data-admin-content-filter]"
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


          contentFilter =
            button.dataset
              .adminContentFilter;


          renderAdminContent();

        }
      );

    }
  );


function bindAdminContentActions() {

  document
    .querySelectorAll(
      "[data-edit-admin-content]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            openContentModal(
              button.dataset
                .editAdminContent
            );

          }
        );

      }
    );


  document
    .querySelectorAll(
      "[data-delete-admin-content]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const id =
              button.dataset
                .deleteAdminContent;


            const item =
              adminContentItems.find(
                content =>
                  String(
                    content.content_id
                  ) ===
                  String(id)
              );


            openConfirm(
              "Delete system content?",

              `${item?.title || "This item"} will be permanently removed.`,

              async () => {

                await deleteAdminContent(
                  id
                );

              }
            );

          }
        );

      }
    );

}


function openContentModal(
  id = null
) {

  editingContentId =
    id;


  resetFormMessage(
    "adminContentMessage"
  );


  const typeField =
    document.getElementById(
      "adminContentTypeField"
    );


  const type =
    document.getElementById(
      "adminContentType"
    );


  const title =
    document.getElementById(
      "adminContentTitle"
    );


  const body =
    document.getElementById(
      "adminContentBody"
    );


  if (!id) {

    setText(
      "adminContentModalTitle",
      "Add content"
    );


    typeField.style.display =
      "";


    type.value =
      "announcement";


    title.value =
      "";


    body.value =
      "";

  }

  else {

    const item =
      adminContentItems.find(
        content =>
          String(
            content.content_id
          ) ===
          String(id)
      );


    setText(
      "adminContentModalTitle",
      "Edit content"
    );


    /*
      Backend edit_content.php edits
      title + content only, so type
      remains unchanged.
    */

    typeField.style.display =
      "none";


    type.value =
      item?.type ||
      "announcement";


    title.value =
      item?.title ||
      "";


    body.value =
      item?.content ||
      "";

  }


  openModal(
    "adminContentModal"
  );


  setTimeout(
    () =>
      title.focus(),
    100
  );

}


document
  .getElementById(
    "addAdminContentButton"
  )
  .addEventListener(
    "click",
    () =>
      openContentModal()
  );


document
  .getElementById(
    "adminContentForm"
  )
  .addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const type =
        document
          .getElementById(
            "adminContentType"
          )
          .value;


      const title =
        document
          .getElementById(
            "adminContentTitle"
          )
          .value
          .trim();


      const content =
        document
          .getElementById(
            "adminContentBody"
          )
          .value
          .trim();


      if (
        !title ||
        !content
      ) {

        setFormMessage(
          "adminContentMessage",
          "Title and content are required.",
          "error"
        );

        return;

      }


      try {

        const editing =
          Boolean(
            editingContentId
          );


        const payload =
          editing
            ? {
                content_id:
                  editingContentId,

                title,
                content
              }
            : {
                type,
                title,
                content
              };


        const data =
          await getJSON(
            editing
              ? ADMIN_API.editContent
              : ADMIN_API.content,

            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify(
                  payload
                )
            }
          );


        if (!data.success) {

          setFormMessage(
            "adminContentMessage",
            data.message ||
            "Content could not be saved.",
            "error"
          );

          return;

        }


        closeModal(
          "adminContentModal"
        );


        showToast(
          data.message
        );


        await loadAdminContent();

      }

      catch (error) {

        console.error(error);


        setFormMessage(
          "adminContentMessage",
          "Could not save content.",
          "error"
        );

      }

    }
  );


async function deleteAdminContent(
  id
) {

  try {

    const data =
      await getJSON(
        ADMIN_API.deleteContent,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              content_id:
                id
            })
        }
      );


    if (!data.success) {

      showToast(
        data.message ||
        "Delete failed",
        "!"
      );

      return;

    }


    showToast(
      data.message
    );


    await loadAdminContent();

  }

  catch (error) {

    console.error(error);


    showToast(
      "Could not delete content",
      "!"
    );

  }

}


/* =========================================================
   SEARCH
========================================================= */

function adminSearchValue() {

  return document
    .getElementById(
      "adminSearch"
    )
    .value
    .trim()
    .toLowerCase();

}


function applyAdminSearch() {

  if (
    currentAdminPage ===
      "users"
  ) {

    renderUsers();

  }


  if (
    currentAdminPage ===
      "categories"
  ) {

    renderAdminCategories();

  }


  if (
    currentAdminPage ===
      "content"
  ) {

    renderAdminContent();

  }

}


document
  .getElementById(
    "adminSearch"
  )
  .addEventListener(
    "input",
    applyAdminSearch
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


      document
        .getElementById(
          "adminSearch"
        )
        .focus();

    }

  }
);


/* =========================================================
   MODAL HELPERS
========================================================= */

function openModal(id) {

  document
    .getElementById(id)
    ?.classList.add(
      "open"
    );

}


function closeModal(id) {

  document
    .getElementById(id)
    ?.classList.remove(
      "open"
    );

}


document
  .querySelectorAll(
    "[data-close-modal]"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          closeModal(
            button.dataset
              .closeModal
          );

        }
      );

    }
  );


document
  .querySelectorAll(
    ".admin-modal-backdrop"
  )
  .forEach(
    modal => {

      modal.addEventListener(
        "click",
        event => {

          if (
            event.target ===
            modal
          ) {

            modal.classList.remove(
              "open"
            );

          }

        }
      );

    }
  );


function setFormMessage(
  id,
  text,
  type
) {

  const box =
    document.getElementById(
      id
    );


  box.textContent =
    text;


  box.className =
    `admin-form-message show ${type}`;

}


function resetFormMessage(id) {

  const box =
    document.getElementById(
      id
    );


  box.textContent = "";

  box.className =
    "admin-form-message";

}


/* =========================================================
   CONFIRM
========================================================= */

function openConfirm(
  title,
  text,
  action
) {

  setText(
    "adminConfirmTitle",
    title
  );


  setText(
    "adminConfirmText",
    text
  );


  pendingConfirmAction =
    action;


  openModal(
    "adminConfirmModal"
  );

}


document
  .getElementById(
    "adminConfirmAction"
  )
  .addEventListener(
    "click",
    async () => {

      if (
        !pendingConfirmAction
      ) {

        return;

      }


      const action =
        pendingConfirmAction;


      pendingConfirmAction =
        null;


      closeModal(
        "adminConfirmModal"
      );


      await action();

    }
  );


/* =========================================================
   REFRESH
========================================================= */

document
  .getElementById(
    "refreshAdminData"
  )
  .addEventListener(
    "click",
    async () => {

      const button =
        document.getElementById(
          "refreshAdminData"
        );


      const old =
        button.textContent;


      button.disabled =
        true;

      button.textContent =
        "Refreshing...";


      await loadAllAdminData();


      button.disabled =
        false;

      button.textContent =
        old;


      showToast(
        "Admin data refreshed"
      );

    }
  );


/* =========================================================
   MOBILE SIDEBAR
========================================================= */

const adminSidebar =
  document.getElementById(
    "adminSidebar"
  );


const adminMobileMenu =
  document.getElementById(
    "adminMobileMenu"
  );


adminMobileMenu.addEventListener(
  "click",
  event => {

    event.stopPropagation();


    adminSidebar.classList.toggle(
      "open"
    );

  }
);


document.addEventListener(
  "click",
  event => {

    if (
      window.innerWidth <= 900 &&
      adminSidebar.classList.contains(
        "open"
      ) &&
      !adminSidebar.contains(
        event.target
      ) &&
      !adminMobileMenu.contains(
        event.target
      )
    ) {

      adminSidebar.classList.remove(
        "open"
      );

    }

  }
);


/* =========================================================
   DARK MODE
========================================================= */

const adminThemeToggle =
  document.getElementById(
    "adminThemeToggle"
  );


if (
  localStorage.getItem(
    "campusCoinAdminTheme"
  ) === "dark"
) {

  document.body.classList.add(
    "dark-theme"
  );


  adminThemeToggle.textContent =
    "☾";

}


adminThemeToggle.addEventListener(
  "click",
  () => {

    const dark =
      document.body.classList.toggle(
        "dark-theme"
      );


    adminThemeToggle.textContent =
      dark
        ? "☾"
        : "☼";


    localStorage.setItem(
      "campusCoinAdminTheme",
      dark
        ? "dark"
        : "light"
    );

  }
);


/* =========================================================
   FONT SIZE ACCESSIBILITY
========================================================= */

function setAdminFontMode(mode) {

  document.body.classList.remove(
    "font-small",
    "font-large"
  );


  if (
    mode === "small"
  ) {

    document.body.classList.add(
      "font-small"
    );

  }


  if (
    mode === "large"
  ) {

    document.body.classList.add(
      "font-large"
    );

  }


  localStorage.setItem(
    "campusCoinAdminFont",
    mode
  );

}


const savedAdminFont =
  localStorage.getItem(
    "campusCoinAdminFont"
  ) ||
  "default";


setAdminFontMode(
  savedAdminFont
);


document
  .getElementById(
    "adminFontDecrease"
  )
  .addEventListener(
    "click",
    () =>
      setAdminFontMode(
        "small"
      )
  );


document
  .getElementById(
    "adminFontReset"
  )
  .addEventListener(
    "click",
    () =>
      setAdminFontMode(
        "default"
      )
  );


document
  .getElementById(
    "adminFontIncrease"
  )
  .addEventListener(
    "click",
    () =>
      setAdminFontMode(
        "large"
      )
  );


  /* =========================================================
   ADMIN ACCOUNT DROPDOWN
========================================================= */

const adminAccountButton =
  document.getElementById(
    "adminAccountButton"
  );


const adminAccountDropdown =
  document.getElementById(
    "adminAccountDropdown"
  );


function closeAdminAccountDropdown() {

  adminAccountDropdown
    ?.classList.remove(
      "open"
    );


  adminAccountButton
    ?.classList.remove(
      "open"
    );


  adminAccountButton
    ?.setAttribute(
      "aria-expanded",
      "false"
    );

}


adminAccountButton
  ?.addEventListener(
    "click",
    event => {

      event.stopPropagation();


      const opening =
        !adminAccountDropdown
          .classList
          .contains(
            "open"
          );


      closeAdminAccountDropdown();


      if (opening) {

        adminAccountDropdown
          .classList.add(
            "open"
          );


        adminAccountButton
          .classList.add(
            "open"
          );


        adminAccountButton
          .setAttribute(
            "aria-expanded",
            "true"
          );

      }

    }
  );


/* DROPDOWN NAV */

document
  .querySelectorAll(
    "[data-account-page]"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          closeAdminAccountDropdown();


          openAdminPage(
            button.dataset
              .accountPage
          );

        }
      );

    }
  );


/* OUTSIDE CLICK */

document.addEventListener(
  "click",
  event => {

    if (
      adminAccountDropdown &&
      !adminAccountDropdown.contains(
        event.target
      ) &&
      !adminAccountButton
        ?.contains(
          event.target
        )
    ) {

      closeAdminAccountDropdown();

    }

  }
);


/* DROPDOWN LOGOUT */

document
  .getElementById(
    "adminDropdownLogout"
  )
  ?.addEventListener(
    "click",
    async () => {

      try {

        await fetch(
          ADMIN_API.logout,
          {
            credentials:
              "same-origin"
          }
        );

      }

      catch (error) {}


      window.location.href =
        "admin_login.html";

    }
  );

/* =========================================================
   LOGOUT
========================================================= */

document
  .getElementById(
    "adminLogoutButton"
  )
  .addEventListener(
    "click",
    async () => {

      try {

        await fetch(
          ADMIN_API.logout,
          {
            credentials:
              "same-origin"
          }
        );

      }

      catch (error) {}


      window.location.href =
        "admin_login.html";

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


    document
      .querySelectorAll(
        ".admin-modal-backdrop.open"
      )
      .forEach(
        modal =>
          modal.classList.remove(
            "open"
          )
      );


    adminSidebar.classList.remove(
      "open"
    );

  }
);


/* =========================================================
   LOAD ALL
========================================================= */

async function loadAllAdminData() {

  await Promise.allSettled([

    loadStats(),

    loadUsers(),

    loadAdminCategories(),

    loadAdminContent()

  ]);

}


/* =========================================================
   START
========================================================= */

loadAllAdminData();