// Job Case Files — simple CRM for tracking job applications.
// Reads/writes public.jobs_master via the Supabase anon key (see config.js).

(function () {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window;

  const grid = document.getElementById("grid");
  const emptyState = document.getElementById("emptyState");
  const statusBanner = document.getElementById("statusBanner");
  const tabs = document.getElementById("tabs");
  const cardTemplate = document.getElementById("cardTemplate");

  let jobs = [];
  let activeFilter = "all";

  function showBanner(message) {
    statusBanner.textContent = message;
    statusBanner.hidden = false;
  }

  function hideBanner() {
    statusBanner.hidden = true;
  }

  if (!SUPABASE_URL || SUPABASE_URL.startsWith("YOUR_") || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.startsWith("YOUR_")) {
    showBanner("Supabase isn't configured yet — add your project URL and anon key to config.js.");
    emptyState.hidden = false;
    emptyState.textContent = "Waiting on config.js.";
    return;
  }

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  async function loadJobs() {
    const { data, error } = await supabase
      .from("jobs_master")
      .select("id, title, company, url, description, application_status, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      showBanner("Couldn't load jobs from Supabase: " + error.message);
      return;
    }

    hideBanner();
    jobs = data || [];
    render();
  }

  function statusLabel(status) {
    const labels = {
      new: "New",
      contacted: "Applied",
      replied: "Replied",
      offer: "Offer",
      rejected: "Rejected",
      ignored: "Ignored"
    };
    return labels[status] || status;
  }

  function render() {
    const filtered = activeFilter === "all"
      ? jobs
      : jobs.filter((job) => (job.application_status || "new") === activeFilter);

    grid.innerHTML = "";

    if (filtered.length === 0) {
      emptyState.hidden = false;
      emptyState.textContent =
        activeFilter === "all"
          ? "No cases in this drawer yet."
          : `No jobs marked "${statusLabel(activeFilter)}" yet.`;
      return;
    }

    emptyState.hidden = true;

    for (const job of filtered) {
      grid.appendChild(buildCard(job));
    }
  }

  function buildCard(job) {
    const node = cardTemplate.content.firstElementChild.cloneNode(true);
    const status = job.application_status || "new";

    node.dataset.status = status;
    node.dataset.id = job.id;

    node.querySelector(".card__title").textContent = job.title || "Untitled role";
    node.querySelector(".card__company").textContent = job.company || "Unknown company";
    node.querySelector(".card__description").textContent = job.description || "No description available.";
    node.querySelector(".card__badge").textContent = statusLabel(status);

    // Grab buttons
    const applyBtn = node.querySelector(".card__apply");
    const viewBtn = node.querySelector(".card__view");
    const ignoreBtn = node.querySelector(".card__ignore");

    // -----------------------------------------------------
    // Apply Button Logic
    // -----------------------------------------------------
    if (status === "contacted") {
      applyBtn.textContent = "Applied";
      applyBtn.disabled = true;
    } else if (!job.url) {
      applyBtn.textContent = "No link";
      applyBtn.disabled = true;
    } else {
      applyBtn.addEventListener("click", () => handleApply(job, node, applyBtn));
    }

    // Disable Apply if already ignored or rejected
    if (status === "ignored" || status === "rejected") {
      applyBtn.disabled = true;
    }

    // -----------------------------------------------------
    // View Job Button Logic (Opens New Tab Safely)
    // -----------------------------------------------------
    if (!job.url) {
      viewBtn.disabled = true;
    } else {
      viewBtn.addEventListener("click", () => {
        window.open(job.url, "_blank", "noopener,noreferrer");
      });
    }

    // -----------------------------------------------------
    // Not Interested (Ignore) Button Logic
    // -----------------------------------------------------
    if (status === "ignored") {
      ignoreBtn.textContent = "Ignored";
      ignoreBtn.disabled = true;
    } else {
      ignoreBtn.addEventListener("click", () => handleIgnore(job, node, ignoreBtn));
    }

    return node;
  }

  // Action: Apply
  async function handleApply(job, cardEl, buttonEl) {
    window.open(job.url, "_blank", "noopener");

    buttonEl.disabled = true;
    buttonEl.textContent = "Marking...";

    const { error } = await supabase
      .from("jobs_master")
      .update({ application_status: "contacted" })
      .eq("id", job.id);

    if (error) {
      console.error(error);
      showBanner("Opened the link, but couldn't update its status: " + error.message);
      buttonEl.disabled = false;
      buttonEl.textContent = "Apply";
      return;
    }

    job.application_status = "contacted";
    cardEl.dataset.status = "contacted";
    cardEl.querySelector(".card__badge").textContent = statusLabel("contacted");
    buttonEl.textContent = "Applied";
    
    const ignoreBtn = cardEl.querySelector(".card__ignore");
    if(ignoreBtn) ignoreBtn.disabled = false; // Optional reset

    if (activeFilter !== "all" && activeFilter !== "contacted") {
      render();
    }
  }

  // Action: Not Interested
  async function handleIgnore(job, cardEl, buttonEl) {
    buttonEl.disabled = true;
    buttonEl.textContent = "Updating...";

    const { error } = await supabase
      .from("jobs_master")
      .update({ application_status: "ignored" })
      .eq("id", job.id);

    if (error) {
      console.error(error);
      showBanner("Couldn't update status: " + error.message);
      buttonEl.disabled = false;
      buttonEl.textContent = "Not Interested";
      return;
    }

    job.application_status = "ignored";
    cardEl.dataset.status = "ignored";
    cardEl.querySelector(".card__badge").textContent = statusLabel("ignored");
    buttonEl.textContent = "Ignored";
    
    const applyBtn = cardEl.querySelector(".card__apply");
    if(applyBtn) applyBtn.disabled = true;

    // Remove from UI immediately if user is viewing a tab where this job no longer belongs
    if (activeFilter !== "all" && activeFilter !== "ignored") {
      render();
    }
  }

  // Tab Filtering
  tabs.addEventListener("click", (event) => {
    const btn = event.target.closest(".tab");
    if (!btn) return;

    tabs.querySelectorAll(".tab").forEach((t) => t.classList.remove("is-active"));
    btn.classList.add("is-active");
    activeFilter = btn.dataset.status;
    render();
  });

  // Initialize
  loadJobs();
})();
