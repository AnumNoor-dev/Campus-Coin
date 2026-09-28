/* =========================================================
   CAMPUS COIN — ADMIN DIRECT ROUTING
   Opens the requested Admin Dashboard section from Sitemap
========================================================= */

(function () {

  const validAdminPages = [
    "overview",
    "users",
    "categories",
    "content"
  ];


  function openRequestedAdminPage() {

    const params =
      new URLSearchParams(
        window.location.search
      );


    let requestedPage =
      params.get("section") ||
      "overview";


    if (
      !validAdminPages.includes(
        requestedPage
      )
    ) {

      requestedPage =
        "overview";

    }


    /*
      Use the existing Admin sidebar button.
      admin.js already knows how to open these sections.
    */

    const navigationButton =
      document.querySelector(
        `[data-admin-page="${requestedPage}"]`
      );


    if (navigationButton) {

      navigationButton.click();

    }


    /*
      Usage Statistics lives inside Overview,
      so scroll directly to the statistics cards.
    */

    const focus =
      params.get("focus");


    if (
      requestedPage === "overview" &&
      focus === "stats"
    ) {

      setTimeout(
        () => {

          const statsArea =
            document.querySelector(
              ".admin-stat-grid"
            );


          statsArea?.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });

        },
        350
      );

    }

  }


  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      openRequestedAdminPage
    );

  }

  else {

    openRequestedAdminPage();

  }

})();