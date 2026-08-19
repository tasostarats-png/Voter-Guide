(function () {
  "use strict";
  const data = window.VOTER_GUIDE_DATA;
  const state = { district: null, party: "all", query: "", selected: null, answers: new Map() };
  const $ = (selector) => document.querySelector(selector);

  const districtGrid = $("#districtGrid");
  const workspace = $("#workspace");
  const results = $("#results");
  const candidateList = $("#candidateList");
  const candidateDetail = $("#candidateDetail");
  const partyFilter = $("#partyFilter");
  const search = $("#candidateSearch");

  function districtCandidates(key) { return data.candidates.filter((c) => c.district === key); }
  function hasPersonalEvidence(candidate) { return Boolean(candidate.positions && candidate.positions.length); }
  function candidatePositionIds(candidate) {
    return [...(candidate.positions || []), ...(data.partyPositionIds[candidate.party] || [])];
  }
  function answerKey(candidateId, positionId) { return `${candidateId}::${positionId}`; }

  function renderDistricts() {
    districtGrid.innerHTML = Object.entries(data.districts).map(([key, district]) => {
      const count = districtCandidates(key).length;
      return `<button class="district-card" type="button" data-district="${key}">
        <strong>${district.label}</strong><span>${count} πρόσωπα στο πιλοτικό σύνολο</span><i aria-hidden="true">→</i>
      </button>`;
    }).join("");
  }

  function selectDistrict(key) {
    state.district = key; state.party = "all"; state.query = "";
    search.value = "";
    const candidates = districtCandidates(key);
    state.selected = (candidates.find(hasPersonalEvidence) || candidates[0])?.id;
    const district = data.districts[key];
    $("#districtTitle").textContent = district.label;
    $("#districtMeta").textContent = `${district.seats} ${district.seats === 1 ? "έδρα" : "έδρες"} · ιστορικό δείγμα εκλογών Ιουνίου 2023`;
    populateParties(candidates);
    workspace.classList.remove("hidden");
    results.classList.remove("hidden");
    renderCandidates(); renderResults();
    workspace.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function populateParties(candidates) {
    const partyIds = [...new Set(candidates.map((c) => c.party))];
    partyFilter.innerHTML = `<option value="all">Όλα τα κόμματα</option>` + partyIds.map((id) => `<option value="${id}">${data.parties[id]}</option>`).join("");
    partyFilter.value = "all";
  }

  function filteredCandidates() {
    return districtCandidates(state.district).filter((candidate) => {
      const partyMatch = state.party === "all" || candidate.party === state.party;
      const queryMatch = candidate.name.toLocaleLowerCase("el").includes(state.query.toLocaleLowerCase("el"));
      return partyMatch && queryMatch;
    });
  }

  function renderCandidates() {
    const candidates = filteredCandidates();
    $("#candidateCount").textContent = `${candidates.length} ${candidates.length === 1 ? "υποψήφιος" : "υποψήφιοι"} στο δείγμα`;
    if (!candidates.some((c) => c.id === state.selected)) state.selected = candidates[0]?.id || null;
    candidateList.innerHTML = candidates.map((candidate) => `<button type="button" class="candidate-item ${candidate.id === state.selected ? "active" : ""}" data-candidate="${candidate.id}">
      ${hasPersonalEvidence(candidate) ? '<span class="evidence-dot" title="Υπάρχει προσωπική τεκμηριωμένη θέση"></span>' : ""}
      <span class="candidate-name">${candidate.name}</span><span class="candidate-party">${data.parties[candidate.party]}</span>
    </button>`).join("") || `<div class="empty-state">Δεν βρέθηκε υποψήφιος με αυτά τα φίλτρα.</div>`;
    renderDetail();
  }

  function renderDetail() {
    const candidate = data.candidates.find((c) => c.id === state.selected);
    if (!candidate) { candidateDetail.innerHTML = `<div class="empty-state">Επίλεξε ένα πρόσωπο από τον κατάλογο.</div>`; return; }
    const links = (candidate.links || []).map((link) => `<a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.label} ↗</a>`).join("");
    const positionIds = candidatePositionIds(candidate);
    const hasPersonal = hasPersonalEvidence(candidate);
    candidateDetail.innerHTML = `
      <div class="detail-kicker">Ιστορική υποψηφιότητα · Ιούνιος 2023</div>
      <h3 class="detail-title">${candidate.name}</h3>
      <div class="detail-party">${data.parties[candidate.party]} · ${data.districts[candidate.district].label}</div>
      ${links ? `<div class="social-links">${links}</div>` : `<div class="social-links"><span class="detail-party">Δεν έχουν προστεθεί ακόμη επαληθευμένοι σύνδεσμοι.</span></div>`}
      <h4 class="positions-title">Τεκμηριωμένες δημόσιες δηλώσεις και θέσεις</h4>
      ${!hasPersonal ? `<div class="evidence-notice"><strong>Δεν έχουν εντοπιστεί δύο επαρκώς τεκμηριωμένες προσωπικές δηλώσεις.</strong><span>Παρακάτω εμφανίζονται οι επίσημες θέσεις του κόμματος με το οποίο ήταν υποψήφιο το πρόσωπο το 2023. Δεν παρουσιάζονται ως προσωπικές δηλώσεις.</span></div>` : ""}
      ${positionIds.map((id) => renderPosition(id, candidate)).join("")}`;
  }

  function renderPosition(id, candidate) {
    const position = data.positions[id];
    const key = answerKey(candidate.id, id);
    const answer = state.answers.get(key);
    const value = answer === undefined ? null : answer;
    const isParty = position.attribution === "party";
    const attribution = isParty ? `Θέση ${data.parties[position.party]} · όχι προσωπική δήλωση` : "Προσωπική δημόσια θέση";
    const sources = position.sources.map((source) => `<a class="source-link" href="${source.url}" target="_blank" rel="noopener noreferrer">${source.label} ↗</a>`).join("");
    return `<section class="position-card">
      <div class="position-meta"><span>${position.pillar}</span><span class="attribution-badge ${isParty ? "party" : "personal"}">${attribution}</span></div>
      <h4>${position.issue}</h4>
      <p class="compact-stance">${position.stance}</p>
      <details class="evidence-details"><summary>Πώς τεκμηριώνεται</summary><div class="evidence-content"><span>Τελευταία ενημέρωση: ${position.updated} · Τεκμηρίωση: ${position.evidence}</span><ul>${position.actions.map((action) => `<li>${action}</li>`).join("")}</ul><div class="source-links">${sources}</div></div></details>
      <fieldset class="agreement">
        <legend>Πόσο συμφωνείς;</legend>
        <div class="rating-scale" role="radiogroup" aria-label="Βαθμός συμφωνίας από 1 έως 5">
          ${[1,2,3,4,5].map((rating) => `<label><input data-answer="${id}" data-candidate-answer="${candidate.id}" type="radio" name="answer-${candidate.id}-${id}" value="${rating}" ${value === rating ? "checked" : ""} /><span>${rating}</span></label>`).join("")}
        </div>
        <div class="range-labels"><span>1 · Δεν συμφωνώ</span><span>5 · Συμφωνώ απόλυτα</span></div>
      </fieldset>
    </section>`;
  }

  function renderResults() {
    const scored = districtCandidates(state.district).map((candidate) => {
      const answered = candidatePositionIds(candidate).map((id) => state.answers.get(answerKey(candidate.id, id))).filter((value) => value !== undefined);
      if (!answered.length) return null;
      return { candidate, count: answered.length, score: answered.reduce((sum, value) => sum + value, 0) / answered.length };
    }).filter(Boolean).sort((a, b) => b.score - a.score);

    $("#resultsBody").innerHTML = scored.length ? `<div class="result-list">${scored.map(({candidate, count, score}) => `<div class="result-row">
      <div><strong>${candidate.name}</strong><small>${data.parties[candidate.party]} · ${count} ${count === 1 ? "θέση" : "θέσεις"}</small></div>
      <div class="result-bar" aria-label="Μέση συμφωνία ${score.toFixed(1)} στα 5"><i style="width:${score / 5 * 100}%"></i></div><div class="result-score">${score.toFixed(1).replace('.', ',')}/5</div>
    </div>`).join("")}</div>` : `<p class="empty-results">Μόλις μετακινήσεις έναν δείκτη συμφωνίας, η προσωπική σου εικόνα θα εμφανιστεί εδώ.</p>`;
  }

  districtGrid.addEventListener("click", (event) => { const button = event.target.closest("[data-district]"); if (button) selectDistrict(button.dataset.district); });
  candidateList.addEventListener("click", (event) => { const button = event.target.closest("[data-candidate]"); if (!button) return; state.selected = button.dataset.candidate; renderCandidates(); });
  candidateDetail.addEventListener("change", (event) => { const input = event.target.closest("[data-answer]"); if (!input) return; state.answers.set(answerKey(input.dataset.candidateAnswer, input.dataset.answer), Number(input.value)); renderResults(); });
  partyFilter.addEventListener("change", () => { state.party = partyFilter.value; renderCandidates(); });
  search.addEventListener("input", () => { state.query = search.value.trim(); renderCandidates(); });
  $("#changeDistrict").addEventListener("click", () => document.querySelector(".finder").scrollIntoView({ behavior: "smooth" }));
  $("#resetAnswers").addEventListener("click", () => { state.answers.clear(); renderDetail(); renderResults(); });

  const dialog = $("#privacyDialog");
  $("#privacyButton").addEventListener("click", () => dialog.showModal());
  $("#dialogClose").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });

  renderDistricts();
})();
