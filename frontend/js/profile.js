/* =========================================================
   CAMPUS COIN — PROFILE PAGE
========================================================= */

const API = {
  profile: "../backend/profile/get_profile.php",
  update: "../backend/profile/update_profile.php",
  logout: "../backend/auth/logout.php"
};

let currentProfile = {};
let toastTimer = null;


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


function getInitials(name) {

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
        part =>
          part[0]
            .toUpperCase()
      )
      .join("") ||
    "CU"
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
      "Invalid server response:",
      text
    );


    throw new Error(
      "Invalid server response"
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


function showToast(
  message,
  icon = "✓"
) {

  const toast =
    document.getElementById(
      "profileToast"
    );


  const text =
    document.getElementById(
      "profileToastText"
    );


  const iconBox =
    document.getElementById(
      "profileToastIcon"
    );


  if (!toast) {

    return;

  }


  if (text) {

    text.textContent =
      message;

  }


  if (iconBox) {

    iconBox.textContent =
      icon;

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
      2400
    );

}


function showFormMessage(
  message = "",
  type = ""
) {

  const box =
    document.getElementById(
      "profileFormMessage"
    );


  if (!box) {

    return;

  }


  box.textContent =
    message;


  box.className =
    "profile-form-message";


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


function setAcademicYear(
  value
) {

  const select =
    document.getElementById(
      "academicYear"
    );


  if (!select) {

    return;

  }


  const safeValue =
    String(
      value || ""
    );


  if (
    safeValue &&
    ![
      ...select.options
    ].some(
      option =>
        option.value ===
        safeValue
    )
  ) {

    const option =
      document.createElement(
        "option"
      );


    option.value =
      safeValue;


    option.textContent =
      safeValue;


    select.appendChild(
      option
    );

  }


  select.value =
    safeValue;

}


function normalizeProfile(
  profile
) {

  return {

    name:
      profile?.name ||
      "",

    email:
      profile?.email ||
      "",

    academicYear:
      profile?.academic_year ||
      profile?.academicYear ||
      "",

    allowance:
      Number(
        profile?.monthly_allowance_baseline ??
        profile?.monthly_allowance ??
        0
      ),

    savingsGoal:
      Number(
        profile?.monthly_savings_goal ??
        profile?.savings_goal ??
        0
      )

  };

}


/* =========================================================
   PROFILE UI
========================================================= */

function syncIdentityUI(
  name,
  email
) {

  const displayName =
    name ||
    "Student";


  const initials =
    getInitials(
      displayName
    );


  setText(
    "profileHeroName",
    displayName
  );


  setText(
    "profileHeroEmail",
    email ||
    "Campus Coin account"
  );


  setText(
    "topbarUserName",
    displayName
  );


  setText(
    "userAvatar",
    initials
  );


  setText(
    "profileLargeAvatar",
    initials
  );


  setText(
    "securityEmail",
    email ||
    "Email not available"
  );


  const sharedDropdown =
    document.getElementById(
      "ccGlobalAccountDropdown"
    );


  if (sharedDropdown) {

    const nameBox =
      sharedDropdown.querySelector(
        ".cc-account-profile strong"
      );


    const emailBox =
      sharedDropdown.querySelector(
        ".cc-account-profile small"
      );


    const avatarBox =
      sharedDropdown.querySelector(
        ".cc-account-avatar"
      );


    if (nameBox) {

      nameBox.textContent =
        displayName;

    }


    if (emailBox) {

      emailBox.textContent =
        email ||
        "Campus Coin account";

    }


    if (avatarBox) {

      avatarBox.textContent =
        initials;

    }

  }

}


function updateMoneyPreview() {

  const allowance =
    Math.max(
      0,
      Number(
        document
          .getElementById(
            "monthlyAllowance"
          )
          ?.value ||
        0
      )
    );


  const goal =
    Math.max(
      0,
      Number(
        document
          .getElementById(
            "savingsGoal"
          )
          ?.value ||
        0
      )
    );


  const spendingRoom =
    Math.max(
      allowance -
      goal,
      0
    );


  const percent =
    allowance > 0
      ? Math.round(
          (
            goal /
            allowance
          ) *
          100
        )
      : 0;


  setText(
    "allowancePreview",
    money(
      allowance
    )
  );


  setText(
    "goalPreview",
    money(
      goal
    )
  );


  setText(
    "spendingRoomPreview",
    money(
      spendingRoom
    )
  );


  setText(
    "goalPercent",
    `${percent}%`
  );


  const fill =
    document.getElementById(
      "goalProgressFill"
    );


  if (fill) {

    fill.style.width =
      `${Math.min(
        Math.max(
          percent,
          0
        ),
        100
      )}%`;

  }

}


function updateCompletion() {

  const values = [

    document
      .getElementById(
        "profileName"
      )
      ?.value
      ?.trim(),

    document
      .getElementById(
        "profileEmail"
      )
      ?.value
      ?.trim(),

    document
      .getElementById(
        "academicYear"
      )
      ?.value,

    document
      .getElementById(
        "monthlyAllowance"
      )
      ?.value,

    document
      .getElementById(
        "savingsGoal"
      )
      ?.value

  ];


  const completed =
    values.filter(
      value =>
        String(
          value ?? ""
        )
          .trim() !==
        ""
    ).length;


  const percentage =
    Math.round(
      (
        completed /
        values.length
      ) *
      100
    );


  setText(
    "profileCompletionText",
    `${percentage}%`
  );


  const fill =
    document.getElementById(
      "profileCompletionFill"
    );


  if (fill) {

    fill.style.width =
      `${percentage}%`;

  }

}


function populateProfile(
  profile
) {

  const normalized =
    normalizeProfile(
      profile
    );


  const nameInput =
    document.getElementById(
      "profileName"
    );


  const emailInput =
    document.getElementById(
      "profileEmail"
    );


  const allowanceInput =
    document.getElementById(
      "monthlyAllowance"
    );


  const goalInput =
    document.getElementById(
      "savingsGoal"
    );


  if (nameInput) {

    nameInput.value =
      normalized.name;

  }


  if (emailInput) {

    emailInput.value =
      normalized.email;

  }


  setAcademicYear(
    normalized.academicYear
  );


  if (allowanceInput) {

    allowanceInput.value =
      normalized.allowance > 0
        ? normalized.allowance
        : "";

  }


  if (goalInput) {

    goalInput.value =
      normalized.savingsGoal > 0
        ? normalized.savingsGoal
        : "";

  }


  syncIdentityUI(
    normalized.name,
    normalized.email
  );


  updateMoneyPreview();


  updateCompletion();

}


async function loadProfile() {

  try {

    const data =
      await getJSON(
        API.profile
      );


    if (!data.success) {

      throw new Error(
        data.message ||
        "Could not load profile"
      );

    }


    currentProfile =
      data.profile ||
      data.user ||
      data.data ||
      {};


    populateProfile(
      currentProfile
    );

  }

  catch (error) {

    console.error(
      "Profile load error:",
      error
    );


    showToast(
      "Could not load profile",
      "!"
    );

  }

}


/* =========================================================
   LIVE INPUTS
========================================================= */

function updateLiveIdentity() {

  const name =
    document
      .getElementById(
        "profileName"
      )
      ?.value
      ?.trim() ||
    "Student";


  const email =
    document
      .getElementById(
        "profileEmail"
      )
      ?.value
      ?.trim() ||
    "";


  syncIdentityUI(
    name,
    email
  );


  updateCompletion();

}


document
  .getElementById(
    "profileName"
  )
  ?.addEventListener(
    "input",
    updateLiveIdentity
  );


document
  .getElementById(
    "monthlyAllowance"
  )
  ?.addEventListener(
    "input",
    () => {

      updateMoneyPreview();

      updateCompletion();

    }
  );


document
  .getElementById(
    "savingsGoal"
  )
  ?.addEventListener(
    "input",
    () => {

      updateMoneyPreview();

      updateCompletion();

    }
  );


document
  .getElementById(
    "academicYear"
  )
  ?.addEventListener(
    "change",
    updateCompletion
  );


/* =========================================================
   SAVE PROFILE
========================================================= */

async function saveProfile() {

  const name =
    document
      .getElementById(
        "profileName"
      )
      ?.value
      ?.trim() ||
    "";


  const academicYear =
    document
      .getElementById(
        "academicYear"
      )
      ?.value ||
    "";


  const allowance =
    Number(
      document
        .getElementById(
          "monthlyAllowance"
        )
        ?.value ||
      0
    );


  const savingsGoal =
    Number(
      document
        .getElementById(
          "savingsGoal"
        )
        ?.value ||
      0
    );


  if (!name) {

    showFormMessage(
      "Please enter your name.",
      "error"
    );


    return;

  }


  if (
    allowance < 0 ||
    savingsGoal < 0
  ) {

    showFormMessage(
      "Money values cannot be negative.",
      "error"
    );


    return;

  }


  const submitButton =
    document.getElementById(
      "profileSubmitButton"
    );


  const topButton =
    document.getElementById(
      "profileSaveTop"
    );


  const oldSubmit =
    submitButton
      ?.innerHTML ||
    "";


  const oldTop =
    topButton
      ?.textContent ||
    "";


  if (submitButton) {

    submitButton.disabled =
      true;


    submitButton.innerHTML =
      "<span>Saving...</span>";

  }


  if (topButton) {

    topButton.disabled =
      true;


    topButton.textContent =
      "Saving...";

  }


  showFormMessage("");


  try {

    const result =
      await getJSON(
        API.update,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              name,

              academic_year:
                academicYear,

              monthly_allowance_baseline:
                allowance,

              monthly_allowance:
                allowance,

              monthly_savings_goal:
                savingsGoal,

              savings_goal:
                savingsGoal

            })
        }
      );


    if (!result.success) {

      showFormMessage(
        result.message ||
        "Could not update profile.",
        "error"
      );


      return;

    }


    currentProfile = {

      ...currentProfile,

      name,

      academic_year:
        academicYear,

      monthly_allowance_baseline:
        allowance,

      monthly_allowance:
        allowance,

      monthly_savings_goal:
        savingsGoal,

      savings_goal:
        savingsGoal

    };


    const email =
      document
        .getElementById(
          "profileEmail"
        )
        ?.value
        ?.trim() ||
      currentProfile.email ||
      "";


    currentProfile.email =
      email;


    populateProfile(
      currentProfile
    );


    showFormMessage(
      result.message ||
      "Profile updated successfully.",
      "success"
    );


    showToast(
      "Profile updated successfully"
    );

  }

  catch (error) {

    console.error(
      "Profile update error:",
      error
    );


    showFormMessage(
      "Could not connect to the server.",
      "error"
    );


    showToast(
      "Profile update failed",
      "!"
    );

  }

  finally {

    if (submitButton) {

      submitButton.disabled =
        false;


      submitButton.innerHTML =
        oldSubmit;

    }


    if (topButton) {

      topButton.disabled =
        false;


      topButton.textContent =
        oldTop;

    }

  }

}


document
  .getElementById(
    "profileForm"
  )
  ?.addEventListener(
    "submit",
    event => {

      event.preventDefault();

      saveProfile();

    }
  );


document
  .getElementById(
    "profileSaveTop"
  )
  ?.addEventListener(
    "click",
    () => {

      document
        .getElementById(
          "profileForm"
        )
        ?.requestSubmit();

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
      window.innerWidth <= 960 &&
      sidebar
        ?.classList.contains(
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


function applyTheme(
  theme
) {

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

      const theme =
        document.body.classList.contains(
          "dark-theme"
        )
          ? "light"
          : "dark";


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
   LOGOUT + ESCAPE
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


document.addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
      "Escape"
    ) {

      sidebar
        ?.classList.remove(
          "mobile-open"
        );

    }

  }
);


/* =========================================================
   START
========================================================= */

loadProfile();