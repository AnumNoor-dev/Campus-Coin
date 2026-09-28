/* =========================================================
   CAMPUS COIN — MANAGE CATEGORIES
========================================================= */

const API = {

  profile:
    "../backend/profile/get_profile.php",

  categories:
    "../backend/categories/get_categories.php",

  add:
    "../backend/categories/add_category.php",

  update:
    "../backend/categories/update_category.php",

  delete:
    "../backend/categories/delete_category.php",

  logout:
    "../backend/auth/logout.php"

};


let allCategories = [];

let currentFilter =
  "all";

let editingCategoryId =
  null;

let deletingCategoryId =
  null;

let toastTimer =
  null;


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


  try {

    return JSON.parse(
      text
    );

  }

  catch (error) {

    console.error(
      "Server response:",
      text
    );


    throw new Error(
      "Invalid server response"
    );

  }

}


function getInitials(name) {

  return String(
    name || "Campus Coin"
  )
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0,2)
    .map(
      word =>
        word[0]
          .toUpperCase()
    )
    .join("") ||
    "CU";

}


function isDefaultCategory(
  category
) {

  /*
    is_default can arrive as:
    1, "1", true
  */

  return (
    Number(
      category.is_default ||
      0
    ) === 1 ||
    category.is_default === true
  );

}


function normalizeType(type) {

  return String(
    type || ""
  )
    .trim()
    .toLowerCase();

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


    const initials =
      getInitials(name);


    const nameBox =
      document.getElementById(
        "topbarUserName"
      );


    const avatar =
      document.getElementById(
        "userAvatar"
      );


    if (nameBox) {

      nameBox.textContent =
        name;

    }


    if (avatar) {

      avatar.textContent =
        initials;

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
   LOAD CATEGORIES
========================================================= */

async function loadCategories() {

  const grid =
    document.getElementById(
      "categoryGrid"
    );


  grid.innerHTML = `
    <div class="category-loading">

      <div class="category-loader"></div>

      <strong>
        Loading categories...
      </strong>

      <span>
        Preparing your category library.
      </span>

    </div>
  `;


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


    allCategories =
      Array.isArray(
        data.categories
      )
        ? data.categories
        : [];


    allCategories.sort(
      (a, b) => {

        const typeA =
          normalizeType(
            a.type
          );


        const typeB =
          normalizeType(
            b.type
          );


        if (
          typeA !== typeB
        ) {

          return typeA.localeCompare(
            typeB
          );

        }


        return String(
          a.name || ""
        ).localeCompare(
          String(
            b.name || ""
          )
        );

      }
    );


    updateSummary();

    renderCategories();

  }

  catch (error) {

    console.error(
      "Categories error:",
      error
    );


    grid.innerHTML = `
      <div class="category-empty">

        <div class="category-empty-icon">
          !
        </div>

        <strong>
          Categories could not be loaded
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

function updateSummary() {

  const expenses =
    allCategories.filter(
      category =>
        normalizeType(
          category.type
        ) === "expense"
    );


  const income =
    allCategories.filter(
      category =>
        normalizeType(
          category.type
        ) === "income"
    );


  const personal =
    allCategories.filter(
      category =>
        !isDefaultCategory(
          category
        )
    );


  setText(
    "totalCategoryCount",
    allCategories.length
  );


  setText(
    "expenseCategoryCount",
    expenses.length
  );


  setText(
    "incomeCategoryCount",
    income.length
  );


  setText(
    "personalCategoryCount",
    personal.length
  );

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
   FILTER
========================================================= */

function filteredCategories() {

  const search =
    document
      .getElementById(
        "categorySearch"
      )
      ?.value
      .trim()
      .toLowerCase() ||
    "";


  return allCategories.filter(
    category => {

      const type =
        normalizeType(
          category.type
        );


      const personal =
        !isDefaultCategory(
          category
        );


      if (
        currentFilter === "expense" &&
        type !== "expense"
      ) {

        return false;

      }


      if (
        currentFilter === "income" &&
        type !== "income"
      ) {

        return false;

      }


      if (
        currentFilter === "personal" &&
        !personal
      ) {

        return false;

      }


      if (search) {

        const searchable =
          `${
            category.name || ""
          } ${type} ${
            personal
              ? "personal mine"
              : "default system"
          }`
            .toLowerCase();


        if (
          !searchable.includes(
            search
          )
        ) {

          return false;

        }

      }


      return true;

    }
  );

}


/* =========================================================
   RENDER
========================================================= */

function renderCategories() {

  const grid =
    document.getElementById(
      "categoryGrid"
    );


  const categories =
    filteredCategories();


  if (!categories.length) {

    const hasAny =
      allCategories.length > 0;


    grid.innerHTML = `
      <div class="category-empty">

        <div class="category-empty-icon">
          ◫
        </div>

        <strong>
          ${
            hasAny
              ? "No matching categories"
              : "No categories found"
          }
        </strong>

        <span>
          ${
            hasAny
              ? "Try another search or filter."
              : "Create your first personal category."
          }
        </span>

      </div>
    `;


    return;

  }


  grid.innerHTML =
    "";


  categories.forEach(
    (category, index) => {

      const type =
        normalizeType(
          category.type
        );


      const defaultCategory =
        isDefaultCategory(
          category
        );


      const card =
        document.createElement(
          "article"
        );


      card.className =
        `category-card ${
          type === "income"
            ? "income"
            : "expense"
        }`;


      card.style.animationDelay =
        `${index * .04}s`;


      card.innerHTML = `
        <div class="category-card-top">

          <div class="category-card-name">

            <div class="category-card-icon">
              ${
                type === "income"
                  ? "↙"
                  : "↗"
              }
            </div>

            <div>

              <strong>
                ${escapeHTML(
                  category.name ||
                  "Untitled"
                )}
              </strong>

              <span>
                ${
                  type === "income"
                    ? "Income category"
                    : "Expense category"
                }
              </span>

            </div>

          </div>


          <span
            class="category-badge ${
              defaultCategory
                ? "default"
                : ""
            }"
          >
            ${
              defaultCategory
                ? "System Default"
                : "My Category"
            }
          </span>

        </div>


        <p class="category-card-description">

          ${
            defaultCategory
              ? `Built into Campus Coin and available for your ${type} transactions.`
              : `A personal ${type} category created for your own student finance tracking.`
          }

        </p>


        <div class="category-card-footer">

          ${
            defaultCategory
              ? `
                <span class="category-lock-text">
                  🔒 Protected category
                </span>
              `
              : `
                <span class="category-lock-text">
                  ✦ Personal
                </span>

                <div class="category-actions">

                  <button
                    class="category-edit-button"
                    type="button"
                    data-edit-category="${
                      category.category_id
                    }"
                  >
                    Edit
                  </button>

                  <button
                    class="category-remove-button"
                    type="button"
                    data-delete-category="${
                      category.category_id
                    }"
                  >
                    Delete
                  </button>

                </div>
              `
          }

        </div>
      `;


      grid.appendChild(
        card
      );

    }
  );


  attachCategoryActions();

}


/* =========================================================
   ACTION LISTENERS
========================================================= */

function attachCategoryActions() {

  document
    .querySelectorAll(
      "[data-edit-category]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            openEditCategory(
              button.dataset
                .editCategory
            );

          }
        );

      }
    );


  document
    .querySelectorAll(
      "[data-delete-category]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            openDeleteModal(
              button.dataset
                .deleteCategory
            );

          }
        );

      }
    );

}


/* =========================================================
   FILTER BUTTONS
========================================================= */

document
  .querySelectorAll(
    ".category-filter"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          document
            .querySelectorAll(
              ".category-filter"
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


          currentFilter =
            button.dataset.filter;


          renderCategories();

        }
      );

    }
  );


/* SEARCH */

document
  .getElementById(
    "categorySearch"
  )
  ?.addEventListener(
    "input",
    renderCategories
  );


/* =========================================================
   ADD / EDIT MODAL
========================================================= */

const categoryModal =
  document.getElementById(
    "categoryModal"
  );


function resetCategoryForm() {

  document
    .getElementById(
      "categoryForm"
    )
    ?.reset();


  const expense =
    document.querySelector(
      'input[name="categoryType"][value="expense"]'
    );


  if (expense) {

    expense.checked =
      true;

  }


  const message =
    document.getElementById(
      "categoryFormMessage"
    );


  if (message) {

    message.className =
      "category-form-message";


    message.textContent =
      "";

  }

}


function openAddCategory() {

  editingCategoryId =
    null;


  resetCategoryForm();


  setText(
    "categoryModalTitle",
    "Add a category"
  );


  setText(
    "categorySaveButtonText",
    "Add Category"
  );


  categoryModal
    ?.classList
    .add(
      "open"
    );


  setTimeout(
    () => {

      document
        .getElementById(
          "categoryName"
        )
        ?.focus();

    },
    100
  );

}


function openEditCategory(id) {

  const category =
    allCategories.find(
      item =>
        String(
          item.category_id
        ) ===
        String(id)
    );


  if (
    !category ||
    isDefaultCategory(
      category
    )
  ) {

    return;

  }


  editingCategoryId =
    category.category_id;


  resetCategoryForm();


  setText(
    "categoryModalTitle",
    "Edit category"
  );


  setText(
    "categorySaveButtonText",
    "Save Changes"
  );


  const name =
    document.getElementById(
      "categoryName"
    );


  if (name) {

    name.value =
      category.name ||
      "";

  }


  const type =
    normalizeType(
      category.type
    );


  const radio =
    document.querySelector(
      `input[name="categoryType"][value="${type}"]`
    );


  if (radio) {

    radio.checked =
      true;

  }


  categoryModal
    ?.classList
    .add(
      "open"
    );


  setTimeout(
    () => {

      name?.focus();

    },
    100
  );

}


function closeCategoryModal() {

  categoryModal
    ?.classList
    .remove(
      "open"
    );


  editingCategoryId =
    null;

}


document
  .getElementById(
    "openCategoryModal"
  )
  ?.addEventListener(
    "click",
    openAddCategory
  );


document
  .getElementById(
    "closeCategoryModal"
  )
  ?.addEventListener(
    "click",
    closeCategoryModal
  );


categoryModal
  ?.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        categoryModal
      ) {

        closeCategoryModal();

      }

    }
  );


/* =========================================================
   DUPLICATE CHECK
========================================================= */

function duplicateExists(
  name,
  type
) {

  const normalizedName =
    String(name)
      .trim()
      .toLowerCase();


  return allCategories.some(
    category => {

      if (
        editingCategoryId &&
        String(
          category.category_id
        ) ===
        String(
          editingCategoryId
        )
      ) {

        return false;

      }


      return (
        String(
          category.name ||
          ""
        )
          .trim()
          .toLowerCase() ===
          normalizedName &&

        normalizeType(
          category.type
        ) === type
      );

    }
  );

}


/* =========================================================
   SAVE CATEGORY
========================================================= */

document
  .getElementById(
    "categoryForm"
  )
  ?.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const name =
        document
          .getElementById(
            "categoryName"
          )
          .value
          .trim();


      const type =
        document.querySelector(
          'input[name="categoryType"]:checked'
        )
          ?.value ||
        "";


      const message =
        document.getElementById(
          "categoryFormMessage"
        );


      if (
        !name ||
        ![
          "income",
          "expense"
        ].includes(type)
      ) {

        showFormMessage(
          "Enter a category name and choose a valid type.",
          "error"
        );

        return;

      }


      if (
        name.length < 2
      ) {

        showFormMessage(
          "Category name should contain at least 2 characters.",
          "error"
        );

        return;

      }


      if (
        duplicateExists(
          name,
          type
        )
      ) {

        showFormMessage(
          `A ${type} category with this name already exists.`,
          "error"
        );

        return;

      }


      const button =
        document.getElementById(
          "categorySaveButton"
        );


      const oldHTML =
        button.innerHTML;


      button.disabled =
        true;


      button.innerHTML =
        `<span>Saving...</span>`;


      try {

        const editing =
          Boolean(
            editingCategoryId
          );


        const url =
          editing
            ? API.update
            : API.add;


        const body = {

          name:
            name,

          type:
            type

        };


        if (editing) {

          body.category_id =
            editingCategoryId;

        }


        const result =
          await getJSON(
            url,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify(
                  body
                )
            }
          );


        if (!result.success) {

          showFormMessage(
            result.message ||
            "Could not save category.",
            "error"
          );

          return;

        }


        showFormMessage(
          editing
            ? "Category updated successfully."
            : "Category added successfully.",
          "success"
        );


        showToast(
          editing
            ? "Category updated"
            : "Category added"
        );


        await loadCategories();


        setTimeout(
          closeCategoryModal,
          420
        );

      }

      catch (error) {

        console.error(
          "Save category error:",
          error
        );


        showFormMessage(
          "Could not connect to the server.",
          "error"
        );

      }

      finally {

        button.disabled =
          false;


        button.innerHTML =
          oldHTML;

      }

    }
  );


function showFormMessage(
  text,
  type
) {

  const message =
    document.getElementById(
      "categoryFormMessage"
    );


  if (!message) {
    return;
  }


  message.textContent =
    text;


  message.className =
    `category-form-message show ${type}`;

}


/* =========================================================
   DELETE
========================================================= */

const deleteModal =
  document.getElementById(
    "deleteCategoryModal"
  );


function openDeleteModal(id) {

  const category =
    allCategories.find(
      item =>
        String(
          item.category_id
        ) ===
        String(id)
    );


  if (
    !category ||
    isDefaultCategory(
      category
    )
  ) {

    return;

  }


  deletingCategoryId =
    category.category_id;


  setText(
    "deleteCategoryName",
    category.name ||
    "Category"
  );


  deleteModal
    ?.classList
    .add(
      "open"
    );

}


function closeDeleteModal() {

  deleteModal
    ?.classList
    .remove(
      "open"
    );


  deletingCategoryId =
    null;

}


document
  .getElementById(
    "cancelDeleteCategory"
  )
  ?.addEventListener(
    "click",
    closeDeleteModal
  );


deleteModal
  ?.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        deleteModal
      ) {

        closeDeleteModal();

      }

    }
  );


document
  .getElementById(
    "confirmDeleteCategory"
  )
  ?.addEventListener(
    "click",
    async () => {

      if (!deletingCategoryId) {

        return;

      }


      const button =
        document.getElementById(
          "confirmDeleteCategory"
        );


      const oldText =
        button.textContent;


      button.disabled =
        true;


      button.textContent =
        "Deleting...";


      try {

        const result =
          await getJSON(
            API.delete,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({
                  category_id:
                    deletingCategoryId
                })
            }
          );


        if (!result.success) {

          showToast(
            result.message ||
            "Category could not be deleted.",
            "!"
          );

          return;

        }


        closeDeleteModal();


        showToast(
          "Category deleted"
        );


        await loadCategories();

      }

      catch (error) {

        console.error(
          "Delete category error:",
          error
        );


        showToast(
          "This category could not be deleted. It may already be used by a transaction.",
          "!"
        );

      }

      finally {

        button.disabled =
          false;


        button.textContent =
          oldText;

      }

    }
  );


/* =========================================================
   TOAST
========================================================= */

function showToast(
  message,
  icon = "✓"
) {

  const toast =
    document.getElementById(
      "categoryToast"
    );


  if (!toast) {
    return;
  }


  setText(
    "categoryToastText",
    message
  );


  setText(
    "categoryToastIcon",
    icon
  );


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
      2400
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
      window.innerWidth <= 960 &&
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

      sidebar
        ?.classList
        .remove(
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


function applyTheme() {

  const dark =
    localStorage.getItem(
      "campusCoinTheme"
    ) === "dark";


  document.body.classList.toggle(
    "dark-theme",
    dark
  );


  if (themeToggle) {

    themeToggle.textContent =
      dark
        ? "☾"
        : "☼";

  }

}


applyTheme();


themeToggle
  ?.addEventListener(
    "click",
    () => {

      const dark =
        document.body
          .classList
          .toggle(
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
   CTRL / CMD + K
========================================================= */

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
          "categorySearch"
        )
        ?.focus();

    }

  }
);


/* =========================================================
   ESC
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


    closeCategoryModal();

    closeDeleteModal();


    sidebar
      ?.classList
      .remove(
        "mobile-open"
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

      catch (error) {}


      window.location.href =
        "index.html";

    }
  );


/* =========================================================
   START
========================================================= */

async function startCategoriesPage() {

  await Promise.allSettled([

    loadProfile(),

    loadCategories()

  ]);

}


startCategoriesPage();