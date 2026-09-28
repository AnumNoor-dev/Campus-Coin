const API = {
  profile: "../backend/profile/get_profile.php",
  bookmarks: "../backend/bookmarks/bookmarks.php",
  logout: "../backend/auth/logout.php"
};

let allBookmarks = [];
let activeFilter = "all";
let bookmarkToRemove = null;


/* =========================================================
   HELPERS
========================================================= */

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


function formatDate(value) {

  if (!value) {
    return "Saved recently";
  }

  const date =
    new Date(
      value.replace(" ", "T")
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Saved recently";
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
   LOAD BOOKMARKS
========================================================= */

async function loadBookmarks() {

  const grid =
    document.getElementById(
      "savedGrid"
    );


  try {

    const data =
      await getJSON(
        API.bookmarks
      );


    if (!data.success) {
      throw new Error(
        data.message ||
        "Could not load bookmarks"
      );
    }


    allBookmarks =
      Array.isArray(
        data.bookmarks
      )
        ? data.bookmarks
        : [];


    updateSummary();
    renderBookmarks();

  }

  catch (error) {

    console.error(
      "Bookmarks error:",
      error
    );


    grid.innerHTML = `
      <div class="saved-empty">

        <div class="saved-empty-icon">
          ◇
        </div>

        <strong>
          We couldn't load your saved items
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

  const tips =
    allBookmarks.filter(
      item =>
        normalizeType(
          item.item_type
        ) === "tip"
    );


  const insights =
    allBookmarks.filter(
      item =>
        normalizeType(
          item.item_type
        ) === "insight"
    );


  document.getElementById(
    "savedTotalCount"
  ).textContent =
    allBookmarks.length;


  document.getElementById(
    "savedTipsCount"
  ).textContent =
    tips.length;


  document.getElementById(
    "savedInsightsCount"
  ).textContent =
    insights.length;

}


function normalizeType(type) {

  const value =
    String(type || "")
      .toLowerCase();


  if (
    value.includes("insight")
  ) {
    return "insight";
  }


  return "tip";
}


/* =========================================================
   FILTERING
========================================================= */

function getFilteredBookmarks() {

  const search =
    document.getElementById(
      "savedSearch"
    )
    ?.value
    .trim()
    .toLowerCase() || "";


  return allBookmarks.filter(
    item => {

      const type =
        normalizeType(
          item.item_type
        );


      if (
        activeFilter !== "all" &&
        type !== activeFilter
      ) {
        return false;
      }


      if (search) {

        const searchable =
          `${
            item.title || ""
          } ${
            item.content || ""
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

function renderBookmarks() {

  const grid =
    document.getElementById(
      "savedGrid"
    );


  const bookmarks =
    getFilteredBookmarks();


  if (!bookmarks.length) {

    const hasBookmarks =
      allBookmarks.length > 0;


    grid.innerHTML = `
      <div class="saved-empty">

        <div class="saved-empty-icon">
          ◇
        </div>

        <strong>
          ${
            hasBookmarks
              ? "Nothing matches this view"
              : "Nothing saved yet"
          }
        </strong>

        <span>
          ${
            hasBookmarks
              ? "Try another filter or search."
              : "Bookmark a useful saving tip or monthly insight and it will appear here."
          }
        </span>

        ${
          !hasBookmarks
            ? `
              <a href="tips.html">
                Explore saving tips
              </a>
            `
            : ""
        }

      </div>
    `;


    return;

  }


  grid.innerHTML =
    "";


  bookmarks.forEach(
    (item, index) => {

      const type =
        normalizeType(
          item.item_type
        );


      const title =
        item.title ||
        (
          type === "insight"
            ? "Monthly spending insight"
            : "Saved saving tip"
        );


      const content =
        item.content ||
        "Saved for later reference.";


      const openLink =
        type === "insight"
          ? "reports.html"
          : "tips.html";


      const card =
        document.createElement(
          "article"
        );


      card.className =
        "saved-card";


      card.style.animationDelay =
        `${index * 0.05}s`;


      card.innerHTML = `
        <div class="saved-card-top">

          <div class="saved-card-type">

            <div
              class="saved-type-icon ${
                type === "insight"
                  ? "insight"
                  : ""
              }"
            >
              ${
                type === "insight"
                  ? "⌁"
                  : "✦"
              }
            </div>

            <span>
              ${
                type === "insight"
                  ? "Monthly insight"
                  : "Saving tip"
              }
            </span>

          </div>


          <span
            class="saved-type-badge ${
              type === "insight"
                ? "insight"
                : ""
            }"
          >
            ${
              type === "insight"
                ? "Insight"
                : "Tip"
            }
          </span>

        </div>


        <h3>
          ${escapeHTML(title)}
        </h3>


        <p>
          ${escapeHTML(content)}
        </p>


        <div class="saved-card-meta">

          <span>
            ${
              escapeHTML(
                formatDate(
                  item.created_at
                )
              )
            }
          </span>

          <span>
            Saved for later
          </span>

        </div>


        <div class="saved-card-actions">

          <a
            href="${openLink}"
            class="saved-open-button"
          >
            Open
            <span>→</span>
          </a>


          <button
            type="button"
            class="saved-remove-card-button"
            data-remove-bookmark="${
              item.bookmark_id
            }"
          >
            ✕ Remove
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
      "[data-remove-bookmark]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            openRemoveModal(
              button.dataset
                .removeBookmark
            );

          }
        );

      }
    );

}


/* =========================================================
   FILTER TABS
========================================================= */

document
  .querySelectorAll(
    ".saved-filter"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          document
            .querySelectorAll(
              ".saved-filter"
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


          activeFilter =
            button.dataset.filter;


          renderBookmarks();

        }
      );

    }
  );


/* =========================================================
   SEARCH
========================================================= */

document
  .getElementById(
    "savedSearch"
  )
  ?.addEventListener(
    "input",
    renderBookmarks
  );


/* =========================================================
   REMOVE MODAL
========================================================= */

const removeModal =
  document.getElementById(
    "removeBookmarkModal"
  );


function openRemoveModal(id) {

  bookmarkToRemove =
    id;


  removeModal.classList.add(
    "open"
  );

}


function closeRemoveModal() {

  bookmarkToRemove =
    null;


  removeModal.classList.remove(
    "open"
  );

}


document
  .getElementById(
    "cancelRemoveBookmark"
  )
  .addEventListener(
    "click",
    closeRemoveModal
  );


removeModal.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      removeModal
    ) {

      closeRemoveModal();

    }

  }
);


/* =========================================================
   REMOVE BOOKMARK
========================================================= */

document
  .getElementById(
    "confirmRemoveBookmark"
  )
  .addEventListener(
    "click",
    async () => {

      if (!bookmarkToRemove) {
        return;
      }


      const button =
        document.getElementById(
          "confirmRemoveBookmark"
        );


      const oldText =
        button.textContent;


      button.disabled =
        true;

      button.textContent =
        "Removing...";


      try {

        const result =
          await getJSON(
            API.bookmarks,
            {
              method: "DELETE",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({
                  bookmark_id:
                    bookmarkToRemove
                })
            }
          );


        if (!result.success) {

          showToast(
            result.message ||
            "Could not remove bookmark",
            "!"
          );

          return;

        }


        allBookmarks =
          allBookmarks.filter(
            item =>
              String(
                item.bookmark_id
              ) !==
              String(
                bookmarkToRemove
              )
          );


        closeRemoveModal();

        updateSummary();
        renderBookmarks();

        showToast(
          "Saved item removed"
        );

      }

      catch (error) {

        console.error(
          "Remove bookmark error:",
          error
        );


        showToast(
          "Could not remove saved item",
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

let toastTimer;


function showToast(
  message,
  icon = "✓"
) {

  const toast =
    document.getElementById(
      "savedToast"
    );


  toast.querySelector(
    "span"
  ).textContent =
    icon;


  document.getElementById(
    "savedToastText"
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
   KEYBOARD
========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Escape"
    ) {

      closeRemoveModal();

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

async function startSavedPage() {

  await Promise.allSettled([
    loadProfile(),
    loadBookmarks()
  ]);

}


startSavedPage();