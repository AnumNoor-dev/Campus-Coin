/* =========================================================
   CAMPUS COIN — SHARED STUDENT UI
   Account dropdown + notifications + profile search
   + categories navigation + global font-size controls
========================================================= */

(() => {
  "use strict";

  const API = {
    profile: "../backend/profile/get_profile.php",
    budgets: "../backend/budgets/get_budgets.php",
    logout: "../backend/auth/logout.php"
  };

  const FONT_STORAGE_KEY = "campusCoinFontSize";
  const FONT_LEVELS = ["small", "normal", "large"];

  let profileData = null;


  /* =======================================================
     HELPERS
  ======================================================= */

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


    let data;


    try {

      data =
        JSON.parse(
          text
        );

    }

    catch (error) {

      console.error(
        "Invalid JSON response:",
        text
      );


      throw new Error(
        "Invalid JSON response"
      );

    }


    if (
      data.success === false &&
      /not logged in|login first|session/i.test(
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


  function initials(name) {

    return (
      String(
        name ||
        "Campus Coin"
      )
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(
          0,
          2
        )
        .map(
          word =>
            word[0]
              .toUpperCase()
        )
        .join("") ||
      "CU"
    );

  }


  function currentPageName() {

    return (
      window.location.pathname
        .split("/")
        .pop()
        .toLowerCase() ||
      "dashboard.html"
    );

  }


  function closeAllSharedDropdowns() {

    document
      .querySelectorAll(
        ".cc-shared-dropdown.cc-open"
      )
      .forEach(
        dropdown => {

          dropdown.classList.remove(
            "cc-open"
          );


          dropdown.setAttribute(
            "aria-hidden",
            "true"
          );

        }
      );


    document
      .querySelectorAll(
        ".user-menu.cc-menu-open"
      )
      .forEach(
        menu => {

          menu.classList.remove(
            "cc-menu-open"
          );


          menu.setAttribute(
            "aria-expanded",
            "false"
          );

        }
      );

  }



  /* =======================================================
     PROFILE DATA
  ======================================================= */

  async function getProfile() {

    if (profileData) {

      return profileData;

    }


    try {

      const data =
        await getJSON(
          API.profile
        );


      if (data.success) {

        profileData =
          data.profile ||
          data.user ||
          {};

      }

    }

    catch (error) {

      console.error(
        "Shared profile error:",
        error
      );

    }


    return (
      profileData ||
      {}
    );

  }



  /* =======================================================
     GLOBAL FONT-SIZE ACCESSIBILITY
  ======================================================= */

  function normalizeFontLevel(
    level
  ) {

    return FONT_LEVELS.includes(
      level
    )
      ? level
      : "normal";

  }


  function applyFontLevel(
    level
  ) {

    const safeLevel =
      normalizeFontLevel(
        level
      );


    const root =
      document.documentElement;


    root.classList.remove(
      "cc-font-small",
      "cc-font-normal",
      "cc-font-large"
    );


    root.classList.add(
      `cc-font-${safeLevel}`
    );


    root.dataset.ccFontSize =
      safeLevel;


    localStorage.setItem(
      FONT_STORAGE_KEY,
      safeLevel
    );


    document
      .querySelectorAll(
        "[data-cc-font-level]"
      )
      .forEach(
        button => {

          const active =
            button.dataset
              .ccFontLevel ===
            safeLevel;


          button.classList.toggle(
            "cc-active",
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

  }


  function setupFontControls() {

    const savedLevel =
      normalizeFontLevel(
        localStorage.getItem(
          FONT_STORAGE_KEY
        )
      );


    applyFontLevel(
      savedLevel
    );


    if (
      document.getElementById(
        "ccFontControls"
      )
    ) {

      return;

    }


    const actions =
      document.querySelector(
        ".topbar-actions"
      ) ||
      document.querySelector(
        ".profile-topbar-actions"
      );


    if (!actions) {

      return;

    }


    const controls =
      document.createElement(
        "div"
      );


    controls.id =
      "ccFontControls";


    controls.className =
      "cc-font-controls";


    controls.setAttribute(
      "role",
      "group"
    );


    controls.setAttribute(
      "aria-label",
      "Text size"
    );


    controls.innerHTML = `
      <button
        type="button"
        class="cc-font-button"
        data-cc-font-level="small"
        aria-label="Use smaller text"
        aria-pressed="false"
        title="Smaller text"
      >
        A−
      </button>

      <button
        type="button"
        class="cc-font-button"
        data-cc-font-level="normal"
        aria-label="Use default text size"
        aria-pressed="false"
        title="Default text size"
      >
        A
      </button>

      <button
        type="button"
        class="cc-font-button"
        data-cc-font-level="large"
        aria-label="Use larger text"
        aria-pressed="false"
        title="Larger text"
      >
        A+
      </button>
    `;


    const themeButton =
      actions.querySelector(
        "#themeToggle"
      );


    if (themeButton) {

      actions.insertBefore(
        controls,
        themeButton
      );

    }

    else {

      actions.prepend(
        controls
      );

    }


    controls
      .querySelectorAll(
        "[data-cc-font-level]"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            () => {

              applyFontLevel(
                button.dataset
                  .ccFontLevel
              );

            }
          );

        }
      );


    applyFontLevel(
      savedLevel
    );

  }



  /* =======================================================
     SHARED ACCOUNT DROPDOWN
  ======================================================= */

  async function setupAccountDropdown() {

    /*
      Profile page already has its own
      account dropdown.
    */

    if (
      document.getElementById(
        "accountDropdown"
      )
    ) {

      return;

    }


    const userMenu =
      document.querySelector(
        ".user-menu"
      );


    const actions =
      document.querySelector(
        ".topbar-actions"
      );


    if (
      !userMenu ||
      !actions
    ) {

      return;

    }


    const profile =
      await getProfile();


    const name =
      profile.name ||
      document.getElementById(
        "topbarUserName"
      )?.textContent?.trim() ||
      "Student";


    const email =
      profile.email ||
      "Campus Coin account";


    const avatar =
      initials(
        name
      );


    const nameBox =
      document.getElementById(
        "topbarUserName"
      );


    const avatarBox =
      document.getElementById(
        "userAvatar"
      );


    if (nameBox) {

      nameBox.textContent =
        name;

    }


    if (avatarBox) {

      avatarBox.textContent =
        avatar;

    }


    userMenu.setAttribute(
      "role",
      "button"
    );


    if (
      !userMenu.hasAttribute(
        "tabindex"
      )
    ) {

      userMenu.tabIndex =
        0;

    }


    userMenu.setAttribute(
      "aria-haspopup",
      "menu"
    );


    userMenu.setAttribute(
      "aria-expanded",
      "false"
    );


    const dropdown =
      document.createElement(
        "div"
      );


    dropdown.id =
      "ccGlobalAccountDropdown";


    dropdown.className =
      "cc-shared-dropdown";


    dropdown.setAttribute(
      "aria-hidden",
      "true"
    );


    dropdown.innerHTML = `
      <div class="cc-account-profile">

        <div class="cc-account-avatar">
          ${escapeHTML(
            avatar
          )}
        </div>

        <div>

          <strong>
            ${escapeHTML(
              name
            )}
          </strong>

          <small>
            ${escapeHTML(
              email
            )}
          </small>

        </div>

      </div>


      <div class="cc-dropdown-divider"></div>


      <a
        href="profile.html"
        class="cc-dropdown-link"
      >

        <span class="cc-dropdown-link-icon">
          ○
        </span>

        <div>

          <strong>
            My Profile
          </strong>

          <small>
            Account and money goals
          </small>

        </div>

        <span>→</span>

      </a>


      <a
        href="bookmarks.html"
        class="cc-dropdown-link"
      >

        <span class="cc-dropdown-link-icon">
          ◇
        </span>

        <div>

          <strong>
            Saved
          </strong>

          <small>
            Tips and insights
          </small>

        </div>

        <span>→</span>

      </a>


      <a
        href="budgets.html"
        class="cc-dropdown-link"
      >

        <span class="cc-dropdown-link-icon">
          ◎
        </span>

        <div>

          <strong>
            Budgets
          </strong>

          <small>
            Monthly category limits
          </small>

        </div>

        <span>→</span>

      </a>


      <div class="cc-dropdown-divider"></div>


      <button
        type="button"
        class="cc-dropdown-logout"
        id="ccGlobalLogout"
      >

        <span>↪</span>

        Logout

      </button>
    `;


    actions.appendChild(
      dropdown
    );


    function closeMenu() {

      dropdown.classList.remove(
        "cc-open"
      );


      dropdown.setAttribute(
        "aria-hidden",
        "true"
      );


      userMenu.classList.remove(
        "cc-menu-open"
      );


      userMenu.setAttribute(
        "aria-expanded",
        "false"
      );

    }


    function toggleMenu(
      event
    ) {

      event?.stopPropagation();


      const shouldOpen =
        !dropdown.classList.contains(
          "cc-open"
        );


      closeAllSharedDropdowns();


      if (shouldOpen) {

        dropdown.classList.add(
          "cc-open"
        );


        dropdown.setAttribute(
          "aria-hidden",
          "false"
        );


        userMenu.classList.add(
          "cc-menu-open"
        );


        userMenu.setAttribute(
          "aria-expanded",
          "true"
        );

      }

    }


    userMenu.addEventListener(
      "click",
      toggleMenu
    );


    userMenu.addEventListener(
      "keydown",
      event => {

        if (
          event.key === "Enter" ||
          event.key === " "
        ) {

          event.preventDefault();


          toggleMenu(
            event
          );

        }

      }
    );


    document
      .getElementById(
        "ccGlobalLogout"
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


    document.addEventListener(
      "click",
      event => {

        if (
          !dropdown.contains(
            event.target
          ) &&
          !userMenu.contains(
            event.target
          )
        ) {

          closeMenu();

        }

      }
    );

  }



  /* =======================================================
     NOTIFICATIONS
  ======================================================= */

  function currentMonth() {

    const now =
      new Date();


    return `${String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    )}/${now.getFullYear()}`;

  }


  async function setupNotifications() {

    /*
      Profile page already has its own
      notification dropdown.
    */

    if (
      document.getElementById(
        "notificationDropdown"
      )
    ) {

      return;

    }


    const button =
      document.querySelector(
        ".notification-button"
      );


    const actions =
      document.querySelector(
        ".topbar-actions"
      );


    if (
      !button ||
      !actions
    ) {

      return;

    }


    button.setAttribute(
      "aria-haspopup",
      "true"
    );


    button.setAttribute(
      "aria-expanded",
      "false"
    );


    let dot =
      button.querySelector(
        ".notification-dot"
      );


    if (!dot) {

      dot =
        document.createElement(
          "span"
        );


      dot.className =
        "notification-dot";


      button.appendChild(
        dot
      );

    }


    dot.classList.add(
      "cc-hidden"
    );


    const dropdown =
      document.createElement(
        "div"
      );


    dropdown.id =
      "ccGlobalNotificationDropdown";


    dropdown.className =
      "cc-shared-dropdown cc-notification-dropdown";


    dropdown.setAttribute(
      "aria-hidden",
      "true"
    );


    dropdown.innerHTML = `
      <div class="cc-notification-head">

        <div>

          <span class="section-kicker">
            NOTIFICATIONS
          </span>

          <strong>
            Budget alerts
          </strong>

        </div>

        <a href="budgets.html">
          View budgets
        </a>

      </div>


      <div
        class="cc-notification-list"
        id="ccNotificationList"
      >

        <div class="cc-notification-empty">
          Checking your budgets...
        </div>

      </div>
    `;


    actions.appendChild(
      dropdown
    );


    async function loadNotifications() {

      const list =
        document.getElementById(
          "ccNotificationList"
        );


      if (!list) {

        return;

      }


      list.innerHTML = `
        <div class="cc-notification-empty">
          Checking your budgets...
        </div>
      `;


      try {

        const data =
          await getJSON(
            `${API.budgets}?month_year=${encodeURIComponent(
              currentMonth()
            )}`
          );


        const budgets =
          Array.isArray(
            data.budgets
          )
            ? data.budgets
            : [];


        const alerts =
          budgets
            .filter(
              budget =>
                Number(
                  budget.percent_used ||
                  0
                ) >= 80
            )
            .sort(
              (
                a,
                b
              ) =>
                Number(
                  b.percent_used ||
                  0
                ) -
                Number(
                  a.percent_used ||
                  0
                )
            );


        if (!alerts.length) {

          dot.classList.add(
            "cc-hidden"
          );


          list.innerHTML = `
            <div class="cc-notification-empty">

              <strong>
                You're all caught up
              </strong>

              <br><br>

              No category is currently near
              its monthly budget.

            </div>
          `;


          return;

        }


        dot.classList.remove(
          "cc-hidden"
        );


        list.innerHTML =
          "";


        alerts.forEach(
          budget => {

            const percentage =
              Math.round(
                Number(
                  budget.percent_used ||
                  0
                )
              );


            const category =
              budget.category_name ||
              "Category";


            const danger =
              percentage >=
              100;


            const item =
              document.createElement(
                "div"
              );


            item.className =
              `cc-notification-item ${
                danger
                  ? "danger"
                  : ""
              }`;


            item.innerHTML = `
              <div class="cc-notification-icon">
                ${
                  danger
                    ? "!"
                    : "◎"
                }
              </div>

              <div>

                <strong>
                  ${
                    danger
                      ? `${escapeHTML(
                          category
                        )} is over budget`
                      : `${escapeHTML(
                          category
                        )} is near its limit`
                  }
                </strong>

                <p>
                  You've used ${percentage}% of this
                  month's ${escapeHTML(
                    category
                  )} budget.
                </p>

              </div>
            `;


            list.appendChild(
              item
            );

          }
        );

      }

      catch (error) {

        console.error(
          "Shared notification error:",
          error
        );


        dot.classList.add(
          "cc-hidden"
        );


        list.innerHTML = `
          <div class="cc-notification-empty">
            Budget alerts could not be loaded.
          </div>
        `;

      }

    }


    button.addEventListener(
      "click",
      async event => {

        event.stopPropagation();


        const shouldOpen =
          !dropdown.classList.contains(
            "cc-open"
          );


        closeAllSharedDropdowns();


        if (shouldOpen) {

          dropdown.classList.add(
            "cc-open"
          );


          dropdown.setAttribute(
            "aria-hidden",
            "false"
          );


          button.setAttribute(
            "aria-expanded",
            "true"
          );


          await loadNotifications();

        }

      }
    );


    document.addEventListener(
      "click",
      event => {

        if (
          !dropdown.contains(
            event.target
          ) &&
          !button.contains(
            event.target
          )
        ) {

          dropdown.classList.remove(
            "cc-open"
          );


          dropdown.setAttribute(
            "aria-hidden",
            "true"
          );


          button.setAttribute(
            "aria-expanded",
            "false"
          );

        }

      }
    );


    await loadNotifications();

  }



  /* =======================================================
     PROFILE QUICK SEARCH
  ======================================================= */

  function setupProfileSearch() {

    if (
      !document.body.classList.contains(
        "profile-page"
      )
    ) {

      return;

    }


    const searchBox =
      document.querySelector(
        ".profile-search-box"
      );


    const input =
      searchBox?.querySelector(
        "input"
      );


    if (
      !searchBox ||
      !input
    ) {

      return;

    }


    input.readOnly =
      false;


    input.value =
      "";


    input.placeholder =
      "Search Campus Coin pages...";


    const pages = [

      {
        title:
          "Dashboard",

        detail:
          "Overview and monthly balance",

        icon:
          "⌂",

        url:
          "dashboard.html",

        keywords:
          "home dashboard balance overview"
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
          "Manage personal income and expense categories",

        icon:
          "◫",

        url:
          "categories.html",

        keywords:
          "categories category income expense manage personal"
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
          "saved bookmarks insight"
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


    const results =
      document.createElement(
        "div"
      );


    results.className =
      "cc-search-results";


    searchBox.appendChild(
      results
    );


    function closeSearch() {

      results.classList.remove(
        "cc-open"
      );

    }


    function renderSearch() {

      const query =
        input.value
          .trim()
          .toLowerCase();


      if (!query) {

        results.innerHTML =
          "";


        closeSearch();


        return;

      }


      const matches =
        pages.filter(
          page => {

            const text =
              `${page.title} ${page.detail} ${page.keywords}`
                .toLowerCase();


            return text.includes(
              query
            );

          }
        );


      if (!matches.length) {

        results.innerHTML = `
          <div class="cc-search-empty">
            No matching Campus Coin page found.
          </div>
        `;


        results.classList.add(
          "cc-open"
        );


        return;

      }


      results.innerHTML =
        matches
          .map(
            page => `
              <button
                type="button"
                class="cc-search-item"
                data-url="${escapeHTML(
                  page.url
                )}"
              >

                <span class="cc-search-icon">
                  ${escapeHTML(
                    page.icon
                  )}
                </span>

                <div>

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

                </div>

                <span>→</span>

              </button>
            `
          )
          .join("");


      results.classList.add(
        "cc-open"
      );


      results
        .querySelectorAll(
          "[data-url]"
        )
        .forEach(
          button => {

            button.addEventListener(
              "click",
              () => {

                window.location.href =
                  button.dataset.url;

              }
            );

          }
        );

    }


    input.addEventListener(
      "input",
      renderSearch
    );


    input.addEventListener(
      "keydown",
      event => {

        if (
          event.key ===
          "Enter"
        ) {

          const first =
            results.querySelector(
              "[data-url]"
            );


          if (first) {

            window.location.href =
              first.dataset.url;

          }

        }


        if (
          event.key ===
          "Escape"
        ) {

          closeSearch();


          input.blur();

        }

      }
    );


    document.addEventListener(
      "click",
      event => {

        if (
          !searchBox.contains(
            event.target
          )
        ) {

          closeSearch();

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


          input.focus();

        }

      }
    );

  }



  /* =======================================================
     GLOBAL CATEGORIES NAV ITEM
  ======================================================= */

  function setupCategoriesNavigation() {

    const sidebarNav =
      document.querySelector(
        ".sidebar-nav"
      );


    if (!sidebarNav) {

      return;

    }


    let categoriesLink =
      sidebarNav.querySelector(
        'a[href="categories.html"]'
      );


    if (!categoriesLink) {

      const transactionsLink =
        sidebarNav.querySelector(
          'a[href="transactions.html"]'
        );


      if (!transactionsLink) {

        return;

      }


      categoriesLink =
        document.createElement(
          "a"
        );


      categoriesLink.href =
        "categories.html";


      categoriesLink.className =
        "nav-item";


      categoriesLink.innerHTML = `
        <span class="nav-icon">
          ◫
        </span>

        <span>
          Categories
        </span>
      `;


      transactionsLink
        .insertAdjacentElement(
          "afterend",
          categoriesLink
        );

    }


    if (
      currentPageName() ===
      "categories.html"
    ) {

      sidebarNav
        .querySelectorAll(
          ".nav-item"
        )
        .forEach(
          item =>
            item.classList.remove(
              "active"
            )
        );


      categoriesLink
        .classList.add(
          "active"
        );

    }

  }



  /* =======================================================
     ESCAPE / GLOBAL CLOSE
  ======================================================= */

  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key ===
        "Escape"
      ) {

        closeAllSharedDropdowns();

      }

    }
  );



  /* =======================================================
     START
  ======================================================= */

  async function startSharedUI() {

    setupCategoriesNavigation();

    setupFontControls();

    setupProfileSearch();


    await Promise.allSettled([

      setupAccountDropdown(),

      setupNotifications()

    ]);

  }


  startSharedUI();

})();