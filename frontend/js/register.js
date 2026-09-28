const REGISTER_URL =
  "../backend/auth/register.php";


const form =
  document.getElementById("registerForm");

const notice =
  document.getElementById("registerNotice");

const button =
  document.getElementById("registerButton");


const password =
  document.getElementById("password");

const confirmPassword =
  document.getElementById("confirmPassword");


const strengthBar =
  document.getElementById("strengthBar");

const strengthText =
  document.getElementById("strengthText");



function showNotice(message, type = "error") {

  notice.textContent = message;

  notice.className =
    `notice show ${type}`;

}


function clearNotice() {

  notice.textContent = "";

  notice.className = "notice";

}



function setLoading(loading) {

  if (loading) {

    button.disabled = true;

    button.innerHTML = `
      <span class="spinner"></span>
      <span>Creating your account...</span>
    `;

  } else {

    button.disabled = false;

    button.innerHTML = `
      <span>Create My Campus Coin Account</span>
      <span>→</span>
    `;

  }

}



password.addEventListener(
  "input",
  () => {

    const value = password.value;

    let strength = 0;


    if (value.length >= 6)
      strength++;

    if (/[A-Z]/.test(value))
      strength++;

    if (/[0-9]/.test(value))
      strength++;

    if (/[^A-Za-z0-9]/.test(value))
      strength++;


    const widths =
      ["0%", "25%", "50%", "75%", "100%"];

    strengthBar.style.width =
      widths[strength];


    if (strength <= 1) {

      strengthText.textContent =
        "Weak password";

    }

    else if (strength === 2) {

      strengthText.textContent =
        "Good start";

    }

    else if (strength === 3) {

      strengthText.textContent =
        "Strong password";

    }

    else {

      strengthText.textContent =
        "Excellent password";

    }

  }
);



document
  .getElementById("toggleRegisterPassword")
  .addEventListener(
    "click",
    () => {

      password.type =
        password.type === "password"
          ? "text"
          : "password";

    }
  );



form.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    clearNotice();


    const name =
      document
        .getElementById("name")
        .value
        .trim();


    const email =
      document
        .getElementById("email")
        .value
        .trim();


    const academicYear =
      document
        .getElementById("academicYear")
        .value;


    const savingsGoal =
      Number(
        document
          .getElementById("savingsGoal")
          .value || 0
      );


    if (
      !name ||
      !email ||
      !password.value
    ) {

      showNotice(
        "Please complete all required fields."
      );

      return;

    }


    if (password.value.length < 6) {

      showNotice(
        "Password must contain at least 6 characters."
      );

      return;

    }


    if (
      password.value !==
      confirmPassword.value
    ) {

      showNotice(
        "Passwords do not match."
      );

      return;

    }


    setLoading(true);


    try {

      const response =
        await fetch(
          REGISTER_URL,
          {

            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({

              name: name,

              email: email,

              password:
                password.value,

              academic_year:
                academicYear,

              monthly_savings_goal:
                savingsGoal

            })

          }
        );


      const data =
        await response.json();


      if (!data.success) {

        showNotice(
          data.message ||
          "Registration failed."
        );

        return;

      }


      showNotice(
        "Account created successfully! Redirecting to login...",
        "success"
      );


      setTimeout(
        () => {

          window.location.href =
            "index.html";

        },
        1000
      );

    }

    catch (error) {

      showNotice(
        "Could not connect to the server."
      );

    }

    finally {

      setLoading(false);

    }

  }
);