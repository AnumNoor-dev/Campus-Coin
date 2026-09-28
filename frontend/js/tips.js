/* =========================================================
   CAMPUS COIN — SAVING TIPS
========================================================= */

const API = {
  profile: "../backend/profile/get_profile.php",
  tips: "../backend/tips/get_tips.php",
  pin: "../backend/tips/pin_tip.php",
  dismiss: "../backend/tips/dismiss_tip.php",
  bookmarks: "../backend/bookmarks/bookmarks.php",
  logout: "../backend/auth/logout.php"
};


let allTips = [];
let currentFilter = "all";
let savedTipKeys = new Set();
let toastTimer;


/* =========================================================
   HELPERS
========================================================= */

function money(value) {

  return `Rs. ${Number(value || 0).toLocaleString(
    "en-PK",
    {
      maximumFractionDigits: 0
    }
  )}`;

}


function escapeHTML(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


async function getJSON(
  url,
  options = {}
) {

  const response =
    await fetch(
      url,
      {
        credentials: "same-origin",
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

    return JSON.parse(text);

  }

  catch (error) {

    console.error(
      "Server response:",
      text
    );

    throw new Error(
      "Invalid JSON response"
    );

  }

}


function tipText(tip) {

  return (
    tip.tip ||
    tip.message ||
    tip.text ||
    tip.content ||
    tip.description ||
    "Keep tracking your spending to discover more saving opportunities."
  );

}


function tipTitle(tip) {

  if (tip.title) {
    return tip.title;
  }


  const text =
    tipText(tip);


  if (text.length <= 55) {
    return text;
  }


  return "A smarter spending opportunity";

}


function tipSaving(tip) {

  return Number(
    tip.potential_saving ||
    tip.saving_potential ||
    tip.estimated_saving ||
    0
  );

}


function tipKey(
  tip,
  index = 0
) {

  if (tip.tip_key) {
    return String(
      tip.tip_key
    );
  }


  if (tip.id) {
    return String(
      tip.id
    );
  }


  if (tip.tip_id) {
    return String(
      tip.tip_id
    );
  }


  const generated =
    tipText(tip)
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "_"
      )
      .replace(
        /^_|_$/g,
        ""
      )
      .slice(0, 70);


  return (
    generated ||
    `tip_${index}`
  );

}


/* =========================================================
   TOAST
========================================================= */

function showToast(
  message,
  icon = "✓"
) {

  const toast =
    document.getElementById(
      "tipToast"
    );


  if (!toast) {
    return;
  }


  const text =
    document.getElementById(
      "tipToastText"
    );


  const iconBox =
    document.getElementById(
      "tipToastIcon"
    );


  if (text) {
    text.textContent = message;
  }


  if (iconBox) {
    iconBox.textContent = icon;
  }


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


    const name =
      data.profile?.name ||
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
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
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
        initials || "CU";

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
   LOAD SAVED BOOKMARKS
========================================================= */

async function loadSavedTips() {

  try {

    const data =
      await getJSON(
        API.bookmarks
      );


    if (!data.success) {
      return;
    }


    const bookmarks =
      Array.isArray(
        data.bookmarks
      )
        ? data.bookmarks
        : [];


    savedTipKeys =
      new Set(
        bookmarks
          .filter(
            item =>
              item.item_type ===
              "tip"
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
      "Saved tips error:",
      error
    );

  }

}


/* =========================================================
   LOAD TIPS
========================================================= */

async function loadTips() {

  const grid =
    document.getElementById(
      "tipsGrid"
    );


  try {

    const data =
      await getJSON(
        API.tips
      );


    if (!data.success) {

      throw new Error(
        data.message ||
        "Unable to load tips"
      );

    }


    const tips =
      Array.isArray(
        data.tips
      )
        ? data.tips
        : [];


    allTips =
      tips.map(
        (tip, index) => {

          const key =
            tipKey(
              tip,
              index
            );


          return {

            ...tip,

            _key: key,

            _pinned:
              Boolean(
                tip.pinned ||
                tip.is_pinned ||
                tip.status ===
                  "pinned"
              ),

            _dismissed:
              Boolean(
                tip.dismissed ||
                tip.is_dismissed ||
                tip.status ===
                  "dismissed"
              ),

            _saved:
              savedTipKeys.has(
                String(key)
              )

          };

        }
      );


    updateSummary();

    renderFeatured();

    renderTips();

  }

  catch (error) {

    console.error(
      "Tips error:",
      error
    );


    if (grid) {

      grid.innerHTML = `
        <div class="tips-empty">

          <strong>
            We couldn't load your saving tips.
          </strong>

          <span>
            Refresh the page and try again.
          </span>

        </div>
      `;

    }

  }

}


/* =========================================================
   SUMMARY
========================================================= */

function updateSummary() {

  const activeTips =
    allTips.filter(
      tip =>
        !tip._dismissed
    );


  const potential =
    activeTips.reduce(
      (sum, tip) =>
        sum +
        tipSaving(tip),
      0
    );


  const pinned =
    activeTips.filter(
      tip =>
        tip._pinned
    ).length;


  const activeBox =
    document.getElementById(
      "activeTipsCount"
    );


  const savingBox =
    document.getElementById(
      "savingPotential"
    );


  const pinnedBox =
    document.getElementById(
      "pinnedCount"
    );


  if (activeBox) {

    activeBox.textContent =
      activeTips.length;

  }


  if (savingBox) {

    savingBox.textContent =
      money(potential);

  }


  if (pinnedBox) {

    pinnedBox.textContent =
      pinned;

  }

}


/* =========================================================
   CREATE FEATURED SAVE BUTTON AUTOMATICALLY
========================================================= */

function ensureFeaturedSaveButton() {

  let button =
    document.getElementById(
      "featuredSaveButton"
    );


  if (button) {
    return button;
  }


  const actions =
    document.querySelector(
      ".featured-actions"
    );


  const dismiss =
    document.getElementById(
      "featuredDismissButton"
    );


  if (!actions) {
    return null;
  }


  button =
    document.createElement(
      "button"
    );


  button.id =
    "featuredSaveButton";


  /*
    Reuse existing pin styling,
    so no extra CSS is required.
  */

  button.className =
    "featured-pin-button";


  button.type =
    "button";


  button.textContent =
    "◇ Save";


  button.disabled =
    true;


  if (dismiss) {

    actions.insertBefore(
      button,
      dismiss
    );

  }

  else {

    actions.appendChild(
      button
    );

  }


  return button;

}


/* =========================================================
   FEATURED TIP
========================================================= */

function renderFeatured() {

  const available =
    allTips
      .filter(
        tip =>
          !tip._dismissed
      )
      .sort(
        (a, b) =>
          tipSaving(b) -
          tipSaving(a)
      );


  const tip =
    available[0];


  const title =
    document.getElementById(
      "featuredTitle"
    );


  const text =
    document.getElementById(
      "featuredText"
    );


  const impact =
    document.getElementById(
      "featuredImpact"
    );


  const pinButton =
    document.getElementById(
      "featuredPinButton"
    );


  const dismissButton =
    document.getElementById(
      "featuredDismissButton"
    );


  const saveButton =
    ensureFeaturedSaveButton();


  if (!tip) {

    if (title) {

      title.textContent =
        "You're building good money habits";

    }


    if (text) {

      text.textContent =
        "Keep adding transactions and Campus Coin will continue looking for useful saving opportunities.";

    }


    if (impact) {

      impact.textContent =
        "On track";

    }


    if (pinButton) {
      pinButton.disabled = true;
    }


    if (dismissButton) {
      dismissButton.disabled = true;
    }


    if (saveButton) {
      saveButton.disabled = true;
    }


    return;

  }


  if (title) {

    title.textContent =
      tipTitle(tip);

  }


  if (text) {

    text.textContent =
      tipText(tip);

  }


  const saving =
    tipSaving(tip);


  if (impact) {

    impact.textContent =
      saving > 0
        ? `Save up to ${money(
            saving
          )}`
        : "Smart saving";

  }


  /* PIN */

  if (pinButton) {

    pinButton.disabled =
      false;


    pinButton.textContent =
      tip._pinned
        ? "◆ Pinned"
        : "◇ Pin this tip";


    pinButton.onclick =
      () => pinTip(tip);

  }


  /* SAVE */

  if (saveButton) {

    saveButton.disabled =
      false;


    saveButton.textContent =
      tip._saved
        ? "◆ Saved"
        : "◇ Save";


    if (tip._saved) {

      saveButton.style.background =
        "#cfe9ad";

      saveButton.style.color =
        "#17513d";

    }

    else {

      saveButton.style.background =
        "";

      saveButton.style.color =
        "";

    }


    saveButton.onclick =
      () => saveTip(tip);

  }


  /* DISMISS */

  if (dismissButton) {

    dismissButton.disabled =
      false;


    dismissButton.onclick =
      () => dismissTip(tip);

  }

}


/* =========================================================
   FILTER TIPS
========================================================= */

function filteredTips() {

  const search =
    document
      .getElementById(
        "tipSearch"
      )
      ?.value
      .trim()
      .toLowerCase() ||
    "";


  return allTips.filter(
    tip => {

      if (tip._dismissed) {
        return false;
      }


      if (
        currentFilter ===
          "pinned" &&
        !tip._pinned
      ) {

        return false;

      }


      if (
        currentFilter ===
          "high" &&
        tipSaving(tip) <= 0
      ) {

        return false;

      }


      if (search) {

        const searchable =
          `${
            tipTitle(tip)
          } ${
            tipText(tip)
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
   RENDER TIPS
========================================================= */

function renderTips() {

  const grid =
    document.getElementById(
      "tipsGrid"
    );


  if (!grid) {
    return;
  }


  const tips =
    filteredTips();


  if (!tips.length) {

    grid.innerHTML = `
      <div class="tips-empty">

        <strong>
          No tips in this view
        </strong>

        <span>
          Try another filter or keep tracking your spending.
        </span>

      </div>
    `;


    return;

  }


  grid.innerHTML =
    "";


  tips.forEach(
    (tip, index) => {

      const saving =
        tipSaving(tip);


      const highImpact =
        saving > 0;


      const card =
        document.createElement(
          "article"
        );


      card.className =
        "tip-card";


      card.style.animationDelay =
        `${index * 0.05}s`;


      card.innerHTML = `
        <div class="tip-card-top">

          <div class="tip-category">

            <div class="tip-card-icon">
              ✦
            </div>

            <span>
              Personalized saving tip
            </span>

          </div>


          <span class="tip-impact ${
            highImpact
              ? "high"
              : ""
          }">

            ${
              highImpact
                ? "High impact"
                : "Smart habit"
            }

          </span>

        </div>


        <h3>
          ${escapeHTML(
            tipTitle(tip)
          )}
        </h3>


        <p>
          ${escapeHTML(
            tipText(tip)
          )}
        </p>


        <div class="tip-saving">

          <span>
            Potential impact
          </span>

          <strong>

            ${
              saving > 0
                ? money(saving)
                : "Habit based"
            }

          </strong>

        </div>


        <div class="tip-card-actions">


          <button
            type="button"
            class="tip-action pin ${
              tip._pinned
                ? "pinned"
                : ""
            }"
            data-pin="${escapeHTML(
              tip._key
            )}"
          >

            ${
              tip._pinned
                ? "◆ Pinned"
                : "◇ Pin"
            }

          </button>


          <button
            type="button"
            class="tip-action pin ${
              tip._saved
                ? "pinned"
                : ""
            }"
            data-save="${escapeHTML(
              tip._key
            )}"
          >

            ${
              tip._saved
                ? "◆ Saved"
                : "◇ Save"
            }

          </button>


          <button
            type="button"
            class="tip-action dismiss"
            data-dismiss="${escapeHTML(
              tip._key
            )}"
          >
            ✕ Dismiss
          </button>


        </div>
      `;


      grid.appendChild(
        card
      );

    }
  );


  attachTipButtons();

}


/* =========================================================
   ATTACH CARD BUTTONS
========================================================= */

function attachTipButtons() {

  /* PIN */

  document
    .querySelectorAll(
      "[data-pin]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const tip =
              allTips.find(
                item =>
                  item._key ===
                  button.dataset.pin
              );


            if (tip) {
              pinTip(tip);
            }

          }
        );

      }
    );


  /* SAVE */

  document
    .querySelectorAll(
      "[data-save]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const tip =
              allTips.find(
                item =>
                  item._key ===
                  button.dataset.save
              );


            if (tip) {
              saveTip(tip);
            }

          }
        );

      }
    );


  /* DISMISS */

  document
    .querySelectorAll(
      "[data-dismiss]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const tip =
              allTips.find(
                item =>
                  item._key ===
                  button.dataset.dismiss
              );


            if (tip) {
              dismissTip(tip);
            }

          }
        );

      }
    );

}


/* =========================================================
   PIN TIP
========================================================= */

async function pinTip(tip) {

  if (tip._pinned) {

    showToast(
      "This tip is already pinned"
    );

    return;

  }


  try {

    const result =
      await getJSON(
        API.pin,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              tip_key:
                tip._key
            })
        }
      );


    if (!result.success) {

      showToast(
        result.message ||
        "Could not pin tip",
        "!"
      );

      return;

    }


    tip._pinned =
      true;


    updateSummary();

    renderFeatured();

    renderTips();


    showToast(
      "Tip pinned successfully"
    );

  }

  catch (error) {

    console.error(
      "Pin error:",
      error
    );


    showToast(
      "Could not pin this tip",
      "!"
    );

  }

}


/* =========================================================
   SAVE TIP TO BOOKMARKS
========================================================= */

async function saveTip(tip) {

  if (
    tip._saved ||
    savedTipKeys.has(
      String(
        tip._key
      )
    )
  ) {

    tip._saved =
      true;


    renderFeatured();

    renderTips();


    showToast(
      "This tip is already saved"
    );


    return;

  }


  try {

    const result =
      await getJSON(
        API.bookmarks,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              item_type:
                "tip",

              item_key:
                tip._key,

              title:
                tipTitle(tip),

              content:
                tipText(tip)

            })
        }
      );


    if (!result.success) {

      showToast(
        result.message ||
        "Could not save tip",
        "!"
      );

      return;

    }


    savedTipKeys.add(
      String(
        tip._key
      )
    );


    tip._saved =
      true;


    renderFeatured();

    renderTips();


    showToast(
      result.already_saved
        ? "Already in Saved"
        : "Tip saved successfully"
    );

  }

  catch (error) {

    console.error(
      "Save tip error:",
      error
    );


    showToast(
      "Could not save this tip",
      "!"
    );

  }

}


/* =========================================================
   DISMISS TIP
========================================================= */

async function dismissTip(tip) {

  try {

    const result =
      await getJSON(
        API.dismiss,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              tip_key:
                tip._key
            })
        }
      );


    if (!result.success) {

      showToast(
        result.message ||
        "Could not dismiss tip",
        "!"
      );

      return;

    }


    tip._dismissed =
      true;


    updateSummary();

    renderFeatured();

    renderTips();


    showToast(
      "Tip dismissed"
    );

  }

  catch (error) {

    console.error(
      "Dismiss error:",
      error
    );


    showToast(
      "Could not dismiss this tip",
      "!"
    );

  }

}


/* =========================================================
   FILTER BUTTONS
========================================================= */

document
  .querySelectorAll(
    ".tips-filter"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          document
            .querySelectorAll(
              ".tips-filter"
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


          renderTips();

        }
      );

    }
  );


/* =========================================================
   SEARCH
========================================================= */

document
  .getElementById(
    "tipSearch"
  )
  ?.addEventListener(
    "input",
    renderTips
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


if (
  sidebar &&
  mobileMenuButton
) {

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

              sidebar.classList.remove(
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
        window.innerWidth > 960
      ) {

        sidebar.classList.remove(
          "mobile-open"
        );

      }

    }
  );

}


/* =========================================================
   DARK MODE
========================================================= */

const themeToggle =
  document.getElementById(
    "themeToggle"
  );


if (themeToggle) {

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

}


/* =========================================================
   ESC KEY
========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Escape" &&
      sidebar
    ) {

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

async function startTipsPage() {

  /*
    First load bookmarks so we already know
    which tips are saved.
  */

  await Promise.allSettled([
    loadProfile(),
    loadSavedTips()
  ]);


  await loadTips();

}


startTipsPage();