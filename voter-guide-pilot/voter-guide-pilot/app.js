(function () {
  "use strict";

  const data = window.VOTER_GUIDE_DATA;
  const $ = (selector) => document.querySelector(selector);
  const partyIds = Object.keys(data.parties);
  const partyState = { selected: partyIds[0], answers: new Map() };
  const candidateState = { district: null, party: "all", query: "", selected: null, answers: new Map() };

  function positionMarkup(positionId, ownerId, ownerLabel, value, scope) {
    const position = data.positions[positionId];
    const sources = position.sources.map((source) => `<a class="source-link" href="${source.url}" target="_blank" rel="noopener noreferrer">${source.label} ↗</a>`).join("");
    return `<section class="position-card">
      <div class="position-meta"><span>${position.pillar}</span><span class="attribution-badge ${scope}">${ownerLabel}</span></div>
      <h4>${position.issue}</h4>
      <p class="compact-stance">${position.stance}</p>
      <details class="evidence-details"><summary>Πώς τεκμηριώνεται</summary><div class="evidence-content"><span>Τελευταία ενημέρωση: ${position.updated} · Τεκμηρίωση: ${position.evidence}</span><ul>${position.actions.map((action) => `<li>${action}</li>`).join("")}</ul><div class="source-links">${sources}</div></div></details>
      <fieldset class="agreement">
        <legend>Πόσο συμφωνείς;</legend>
        <div class="rating-scale" role="radiogroup" aria-label="Βαθμός συμφωνίας από 1 έως 5">
          ${[1,2,3,4,5].map((rating) => `<label><input data-${scope}-answer="${positionId}" data-owner="${ownerId}" type="radio" name="answer-${scope}-${ownerId}-${positionId}" value="${rating}" ${value === rating ? "checked" : ""} /><span>${rating}</span></label>`).join("")}
        </div>
        <div class="range-labels"><span>1 · Δεν συμφωνώ</span><span>5 · Συμφωνώ απόλυτα</span></div>
      </fieldset>
    </section>`;
  }

  function showView(view) {
    const current = view === "candidates" ? "candidates" : "parties";
    $("#viewParties").classList.toggle("hidden", current !== "parties");
    $("#viewCandidates").classList.toggle("hidden", current !== "candidates");
    document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === current));
    document.title = current === "parties" ? "Θέσεις κομμάτων — Η δική μου επιλογή" : "Θέσεις υποψηφίων — Η δική μου επιλογή";
  }

  function viewFromHash() { return location.hash === "#candidates" ? "candidates" : "parties"; }

  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => {
    const nextHash = `#${button.dataset.view}`;
    if (location.hash === nextHash) showView(button.dataset.view);
    else location.hash = nextHash;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }));
  window.addEventListener("hashchange", () => showView(viewFromHash()));

  function renderPartyList() {
    $("#partyList").innerHTML = partyIds.map((id) => `<button type="button" class="candidate-item ${id === partyState.selected ? "active" : ""}" data-party="${id}"><span class="candidate-name">${data.parties[id]}</span><span class="candidate-party">${(data.partyPositionIds[id] || []).length} τεκμηριωμένες θέσεις</span></button>`).join("");
    renderPartyDetail();
  }

  function renderPartyDetail() {
    const partyId = partyState.selected;
    const positionIds = data.partyPositionIds[partyId] || [];
    $("#partyDetail").innerHTML = `<div class="detail-kicker">Επίσημες κομματικές θέσεις</div><h3 class="detail-title">${data.parties[partyId]}</h3><div class="detail-party">Οι θέσεις δεν αποδίδονται αυτομάτως σε κανέναν υποψήφιο.</div><h4 class="positions-title">Δημόσιες θέσεις και προτάσεις</h4>${positionIds.map((id) => positionMarkup(id, partyId, `Θέση ${data.parties[partyId]}`, partyState.answers.get(id), "party")).join("")}`;
  }

  function renderPartyResults() {
    const scored = partyIds.map((partyId) => {
      const answered = (data.partyPositionIds[partyId] || []).map((id) => partyState.answers.get(id)).filter((value) => value !== undefined);
      if (!answered.length) return null;
      return { partyId, count: answered.length, score: answered.reduce((sum, value) => sum + value, 0) / answered.length };
    }).filter(Boolean).sort((a, b) => b.score - a.score);
    $("#partyResultsBody").innerHTML = scored.length ? `<div class="result-list">${scored.map(({partyId, count, score}) => `<div class="result-row"><div><strong>${data.parties[partyId]}</strong><small>${count} ${count === 1 ? "θέση" : "θέσεις"}</small></div><div class="result-bar" aria-label="Μέση συμφωνία ${score.toFixed(1)} στα 5"><i style="width:${score / 5 * 100}%"></i></div><div class="result-score">${score.toFixed(1).replace('.', ',')}/5</div></div>`).join("")}</div>` : `<p class="empty-results">Μόλις αξιολογήσεις μία θέση, η προσωπική σου εικόνα θα εμφανιστεί εδώ.</p>`;
  }

  $("#partyList").addEventListener("click", (event) => { const button = event.target.closest("[data-party]"); if (!button) return; partyState.selected = button.dataset.party; renderPartyList(); });
  $("#partyDetail").addEventListener("change", (event) => { const input = event.target.closest("[data-party-answer]"); if (!input) return; partyState.answers.set(input.dataset.partyAnswer, Number(input.value)); renderPartyResults(); });
  $("#partyResetAnswers").addEventListener("click", () => { partyState.answers.clear(); renderPartyDetail(); renderPartyResults(); });

  function districtCandidates(key) { return data.candidates.filter((candidate) => candidate.district === key); }
  function hasPersonalEvidence(candidate) { return Boolean(candidate.positions && candidate.positions.length); }
  function candidateAnswerKey(candidateId, positionId) { return `${candidateId}::${positionId}`; }

  function renderDistricts() {
    $("#districtGrid").innerHTML = Object.entries(data.districts).map(([key, district]) => `<button class="district-card" type="button" data-district="${key}"><strong>${district.label}</strong><span>${districtCandidates(key).length} πρόσωπα στο πιλοτικό σύνολο</span><i aria-hidden="true">→</i></button>`).join("");
  }

  function selectDistrict(key) {
    candidateState.district = key; candidateState.party = "all"; candidateState.query = "";
    $("#candidateSearch").value = "";
    const candidates = districtCandidates(key);
    candidateState.selected = (candidates.find(hasPersonalEvidence) || candidates[0])?.id;
    const district = data.districts[key];
    $("#districtTitle").textContent = district.label;
    $("#districtMeta").textContent = `${district.seats} ${district.seats === 1 ? "έδρα" : "έδρες"} · ιστορικό δείγμα εκλογών Ιουνίου 2023`;
    const ids = [...new Set(candidates.map((candidate) => candidate.party))];
    $("#partyFilter").innerHTML = `<option value="all">Όλα τα κόμματα</option>${ids.map((id) => `<option value="${id}">${data.parties[id]}</option>`).join("")}`;
    $("#partyFilter").value = "all";
    $("#candidateWorkspace").classList.remove("hidden");
    $("#candidateResults").classList.remove("hidden");
    renderCandidates(); renderCandidateResults();
    $("#candidateWorkspace").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function filteredCandidates() {
    return districtCandidates(candidateState.district).filter((candidate) => (candidateState.party === "all" || candidate.party === candidateState.party) && candidate.name.toLocaleLowerCase("el").includes(candidateState.query.toLocaleLowerCase("el")));
  }

  function renderCandidates() {
    const candidates = filteredCandidates();
    $("#candidateCount").textContent = `${candidates.length} ${candidates.length === 1 ? "υποψήφιος" : "υποψήφιοι"} στο δείγμα`;
    if (!candidates.some((candidate) => candidate.id === candidateState.selected)) candidateState.selected = candidates[0]?.id || null;
    $("#candidateList").innerHTML = candidates.map((candidate) => `<button type="button" class="candidate-item ${candidate.id === candidateState.selected ? "active" : ""}" data-candidate="${candidate.id}">${hasPersonalEvidence(candidate) ? '<span class="evidence-dot" title="Υπάρχει προσωπική τεκμηριωμένη θέση"></span>' : ""}<span class="candidate-name">${candidate.name}</span><span class="candidate-party">${data.parties[candidate.party]}</span></button>`).join("") || `<div class="empty-state">Δεν βρέθηκε υποψήφιος με αυτά τα φίλτρα.</div>`;
    renderCandidateDetail();
  }

  function renderCandidateDetail() {
    const candidate = data.candidates.find((item) => item.id === candidateState.selected);
    if (!candidate) { $("#candidateDetail").innerHTML = `<div class="empty-state">Επίλεξε ένα πρόσωπο από τον κατάλογο.</div>`; return; }
    const links = (candidate.links || []).map((link) => `<a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.label} ↗</a>`).join("");
    const positionIds = candidate.positions || [];
    $("#candidateDetail").innerHTML = `<div class="detail-kicker">Ιστορική υποψηφιότητα · Ιούνιος 2023</div><h3 class="detail-title">${candidate.name}</h3><div class="detail-party">${data.parties[candidate.party]} · ${data.districts[candidate.district].label}</div>${links ? `<div class="social-links">${links}</div>` : `<div class="social-links"><span class="detail-party">Δεν έχουν προστεθεί ακόμη επαληθευμένοι σύνδεσμοι.</span></div>`}<h4 class="positions-title">Προσωπικές δημόσιες θέσεις</h4>${positionIds.length ? positionIds.map((id) => positionMarkup(id, candidate.id, "Προσωπική δημόσια θέση", candidateState.answers.get(candidateAnswerKey(candidate.id, id)), "personal")).join("") : `<div class="evidence-notice"><strong>Δεν έχει εντοπιστεί ακόμη επαρκώς τεκμηριωμένη προσωπική θέση.</strong><span>Οι επίσημες θέσεις του κόμματος παρουσιάζονται στο ξεχωριστό πεδίο «Κόμματα» του επάνω μενού.</span></div>`}`;
  }

  function renderCandidateResults() {
    if (!candidateState.district) return;
    const scored = districtCandidates(candidateState.district).map((candidate) => {
      const answered = (candidate.positions || []).map((id) => candidateState.answers.get(candidateAnswerKey(candidate.id, id))).filter((value) => value !== undefined);
      if (!answered.length) return null;
      return { candidate, count: answered.length, score: answered.reduce((sum, value) => sum + value, 0) / answered.length };
    }).filter(Boolean).sort((a, b) => b.score - a.score);
    $("#candidateResultsBody").innerHTML = scored.length ? `<div class="result-list">${scored.map(({candidate, count, score}) => `<div class="result-row"><div><strong>${candidate.name}</strong><small>${data.parties[candidate.party]} · ${count} ${count === 1 ? "θέση" : "θέσεις"}</small></div><div class="result-bar" aria-label="Μέση συμφωνία ${score.toFixed(1)} στα 5"><i style="width:${score / 5 * 100}%"></i></div><div class="result-score">${score.toFixed(1).replace('.', ',')}/5</div></div>`).join("")}</div>` : `<p class="empty-results">Μόλις αξιολογήσεις μία προσωπική θέση, η εικόνα σου θα εμφανιστεί εδώ.</p>`;
  }

  $("#districtGrid").addEventListener("click", (event) => { const button = event.target.closest("[data-district]"); if (button) selectDistrict(button.dataset.district); });
  $("#candidateList").addEventListener("click", (event) => { const button = event.target.closest("[data-candidate]"); if (!button) return; candidateState.selected = button.dataset.candidate; renderCandidates(); });
  $("#candidateDetail").addEventListener("change", (event) => { const input = event.target.closest("[data-personal-answer]"); if (!input) return; candidateState.answers.set(candidateAnswerKey(input.dataset.owner, input.dataset.personalAnswer), Number(input.value)); renderCandidateResults(); });
  $("#partyFilter").addEventListener("change", (event) => { candidateState.party = event.target.value; renderCandidates(); });
  $("#candidateSearch").addEventListener("input", (event) => { candidateState.query = event.target.value.trim(); renderCandidates(); });
  $("#changeDistrict").addEventListener("click", () => $("#viewCandidates .finder").scrollIntoView({ behavior: "smooth" }));
  $("#candidateResetAnswers").addEventListener("click", () => { candidateState.answers.clear(); renderCandidateDetail(); renderCandidateResults(); });

  const dialog = $("#privacyDialog");
  $("#privacyButton").addEventListener("click", () => dialog.showModal());
  $("#dialogClose").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });

  renderPartyList(); renderPartyResults(); renderDistricts(); showView(viewFromHash());
})();
