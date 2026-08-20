(function () {
  "use strict";

  const data = window.VOTER_GUIDE_DATA;
  const $ = (selector) => document.querySelector(selector);
  const partyIds = Object.keys(data.parties);
  const partyState = { selected: partyIds[0] };
  const feedState = { district: "all" };
  const compareState = { district: null, selectedCandidateIds: [], topic: "all" };

  function sourceLinks(position) {
    return position.sources.map((source) => `<a class="source-link" href="${source.url}" target="_blank" rel="noopener noreferrer">${source.label} ↗</a>`).join("");
  }

  function evidenceMarkup(position) {
    return `<details class="evidence-details"><summary>Προτάσεις και τεκμηρίωση</summary><div class="evidence-content"><span>Ημερομηνία: ${position.updated} · Τεκμηρίωση: ${position.evidence}</span><ul>${position.actions.map((action) => `<li>${action}</li>`).join("")}</ul><div class="source-links">${sourceLinks(position)}</div></div></details>`;
  }

  function showView(view) {
    const allowed = ["parties", "statements", "match"];
    const current = allowed.includes(view) ? view : "parties";
    $("#viewParties").classList.toggle("hidden", current !== "parties");
    $("#viewStatements").classList.toggle("hidden", current !== "statements");
    $("#viewMatch").classList.toggle("hidden", current !== "match");
    document.querySelectorAll("[data-view]").forEach((button) => {
      const active = button.dataset.view === current;
      button.classList.toggle("active", active);
      button.setAttribute("aria-current", active ? "page" : "false");
    });
    const titles = { parties: "Θέσεις κομμάτων", statements: "Τελευταίες δηλώσεις υποψηφίων", match: "Σύγκριση υποψηφίων" };
    document.title = `${titles[current]} — Η δική μου επιλογή`;
  }

  function viewFromHash() {
    const value = location.hash.replace("#", "");
    return ["parties", "statements", "match"].includes(value) ? value : "parties";
  }

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
    const positions = (data.partyPositionIds[partyId] || []).map((id) => data.positions[id]);
    $("#partyDetail").innerHTML = `<div class="detail-kicker">Επίσημες κομματικές θέσεις</div><h3 class="detail-title">${data.parties[partyId]}</h3><div class="detail-party">Οι θέσεις δεν αποδίδονται αυτομάτως σε κανέναν υποψήφιο.</div><h4 class="positions-title">Δημόσιες θέσεις και προτάσεις</h4>${positions.map((position) => `<section class="position-card"><div class="position-meta"><span>${position.pillar}</span><span class="attribution-badge party">Θέση ${data.parties[partyId]}</span></div><h4>${position.issue}</h4><p class="compact-stance">${position.stance}</p>${evidenceMarkup(position)}</section>`).join("")}`;
  }

  $("#partyList").addEventListener("click", (event) => { const button = event.target.closest("[data-party]"); if (!button) return; partyState.selected = button.dataset.party; renderPartyList(); });

  function personalEntries() {
    return data.candidates.flatMap((candidate) => (candidate.positions || []).map((positionId) => ({ candidate, positionId, position: data.positions[positionId] })));
  }

  function dateValue(value) {
    const full = String(value).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (full) return new Date(Number(full[3]), Number(full[2]) - 1, Number(full[1])).getTime();
    const year = String(value).match(/(20\d{2})/);
    return year ? new Date(Number(year[1]), 0, 1).getTime() : 0;
  }

  function renderFeedFilters() {
    const options = [["all", "Όλη η Δυτική Μακεδονία"], ...Object.entries(data.districts).map(([id, district]) => [id, district.label])];
    $("#statementDistricts").innerHTML = options.map(([id, label]) => `<button type="button" class="filter-chip ${feedState.district === id ? "active" : ""}" data-feed-district="${id}">${label}</button>`).join("");
  }

  function renderStatementFeed() {
    const entries = personalEntries().filter(({candidate}) => feedState.district === "all" || candidate.district === feedState.district).sort((a, b) => dateValue(b.position.updated) - dateValue(a.position.updated));
    const districtLabel = feedState.district === "all" ? "τη Δυτική Μακεδονία" : `την περιφέρεια ${data.districts[feedState.district].label}`;
    $("#feedMeta").textContent = `${entries.length} ${entries.length === 1 ? "τεκμηριωμένη δήλωση" : "τεκμηριωμένες δηλώσεις"} για ${districtLabel}`;
    $("#statementFeed").innerHTML = entries.length ? entries.map(({candidate, position}) => `<article class="feed-card"><div class="feed-date">${position.updated}</div><div class="feed-content"><div class="position-meta"><span>${data.districts[candidate.district].label}</span><span>${data.parties[candidate.party]}</span></div><h2>${candidate.name}</h2><div class="feed-topic">${position.pillar} · ${position.issue}</div><p>${position.stance}</p>${evidenceMarkup(position)}</div></article>`).join("") : `<div class="empty-state">Δεν υπάρχουν ακόμη τεκμηριωμένες προσωπικές δηλώσεις για αυτή την περιφέρεια.</div>`;
  }

  $("#statementDistricts").addEventListener("click", (event) => { const button = event.target.closest("[data-feed-district]"); if (!button) return; feedState.district = button.dataset.feedDistrict; renderFeedFilters(); renderStatementFeed(); });

  function districtCandidates(key) { return data.candidates.filter((candidate) => candidate.district === key); }
  function eligibleCandidates(key) { return districtCandidates(key).filter((candidate) => candidate.positions && candidate.positions.length); }
  function selectedCandidates() {
    return compareState.selectedCandidateIds.map((id) => data.candidates.find((candidate) => candidate.id === id)).filter(Boolean);
  }

  function comparisonTopics() {
    const pillars = selectedCandidates().flatMap((candidate) => candidate.positions.map((id) => data.positions[id].pillar));
    return [...new Set(pillars)].sort((a, b) => a.localeCompare(b, "el"));
  }

  function renderMatchDistricts() {
    $("#matchDistrictGrid").innerHTML = Object.entries(data.districts).map(([key, district]) => {
      const eligible = eligibleCandidates(key).length;
      return `<button class="district-card" type="button" data-match-district="${key}"><strong>${district.label}</strong><span>${eligible} ${eligible === 1 ? "πρόσωπο με" : "πρόσωπα με"} διαθέσιμες προσωπικές θέσεις</span><i aria-hidden="true">→</i></button>`;
    }).join("");
  }

  function selectMatchDistrict(key) {
    compareState.district = key;
    compareState.selectedCandidateIds = [];
    compareState.topic = "all";
    const district = data.districts[key];
    const all = districtCandidates(key);
    const eligible = eligibleCandidates(key);
    $("#matchDistrictTitle").textContent = district.label;
    $("#matchDistrictMeta").textContent = `${district.seats} ${district.seats === 1 ? "έδρα" : "έδρες"} · ιστορικό δείγμα εκλογών Ιουνίου 2023`;
    $("#matchCoverage").innerHTML = `<strong>${eligible.length} από ${all.length} πρόσωπα διαθέτουν καταχωρισμένη προσωπική θέση.</strong><span>${all.length - eligible.length} δεν εμφανίζονται στον επιλογέα, επειδή δεν υπάρχει ακόμη διαθέσιμη προσωπική τεκμηρίωση στο πιλοτικό αρχείο.</span>`;
    $("#matchWorkspace").classList.remove("hidden");
    renderCandidatePicker();
    renderComparison();
    $("#matchWorkspace").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderCandidatePicker() {
    const candidates = eligibleCandidates(compareState.district).sort((a, b) => a.name.localeCompare(b.name, "el"));
    const atLimit = compareState.selectedCandidateIds.length >= 3;
    $("#compareSelectionCount").textContent = `${compareState.selectedCandidateIds.length}/3 επιλεγμένοι`;
    $("#compareCandidatePicker").innerHTML = candidates.length ? candidates.map((candidate) => {
      const selected = compareState.selectedCandidateIds.includes(candidate.id);
      const disabled = atLimit && !selected;
      return `<button class="compare-candidate-option ${selected ? "active" : ""}" type="button" data-compare-candidate="${candidate.id}" aria-pressed="${selected}" ${disabled ? "disabled" : ""}><span class="compare-check" aria-hidden="true">${selected ? "✓" : "+"}</span><span><strong>${candidate.name}</strong><small>${data.parties[candidate.party]} · ${candidate.positions.length} ${candidate.positions.length === 1 ? "θέση" : "θέσεις"}</small></span></button>`;
    }).join("") : `<div class="empty-state">Δεν υπάρχουν ακόμη πρόσωπα με καταχωρισμένες προσωπικές θέσεις σε αυτή την περιφέρεια.</div>`;

    const count = compareState.selectedCandidateIds.length;
    $("#compareCandidateNotice").textContent = count < 2
      ? `Επίλεξε ${2 - count} ακόμη ${2 - count === 1 ? "υποψήφιο" : "υποψηφίους"} για να ανοίξει η παράλληλη σύγκριση.`
      : count === 3 ? "Έχεις επιλέξει το μέγιστο των τριών υποψηφίων." : "Μπορείς να προσθέσεις ακόμη έναν υποψήφιο.";
  }

  function toggleComparedCandidate(candidateId) {
    const selectedIndex = compareState.selectedCandidateIds.indexOf(candidateId);
    if (selectedIndex >= 0) compareState.selectedCandidateIds.splice(selectedIndex, 1);
    else if (compareState.selectedCandidateIds.length < 3) compareState.selectedCandidateIds.push(candidateId);
    const topics = comparisonTopics();
    if (compareState.topic !== "all" && !topics.includes(compareState.topic)) compareState.topic = "all";
    renderCandidatePicker();
    renderComparison();
  }

  function comparisonPositionMarkup(position) {
    return `<article class="comparison-position"><div class="position-meta"><span>${position.updated}</span></div><h4>${position.issue}</h4><p>${position.stance}</p>${evidenceMarkup(position)}</article>`;
  }

  function renderComparison() {
    const candidates = selectedCandidates();
    const ready = candidates.length >= 2;
    $("#compareTopicStep").classList.toggle("hidden", !ready);
    if (!ready) {
      $("#comparisonMatrix").innerHTML = `<div class="comparison-placeholder"><strong>Η σύγκριση δεν έχει ανοίξει ακόμη.</strong><span>Επίλεξε τουλάχιστον δύο υποψηφίους από την ίδια εκλογική περιφέρεια.</span></div>`;
      return;
    }

    const topics = comparisonTopics();
    $("#compareTopics").innerHTML = [["all", "Όλα τα θέματα"], ...topics.map((topic) => [topic, topic])].map(([id, label]) => `<button type="button" class="filter-chip ${compareState.topic === id ? "active" : ""}" data-compare-topic="${id}">${label}</button>`).join("");
    const visibleTopics = compareState.topic === "all" ? topics : [compareState.topic];
    const headerCells = candidates.map((candidate) => `<th scope="col"><strong>${candidate.name}</strong><span>${data.parties[candidate.party]}</span></th>`).join("");
    const rows = visibleTopics.map((topic) => {
      const cells = candidates.map((candidate) => {
        const positions = candidate.positions.map((id) => data.positions[id]).filter((position) => position.pillar === topic);
        return `<td>${positions.length ? positions.map(comparisonPositionMarkup).join("") : `<div class="comparison-gap"><strong>Δεν υπάρχει καταχωρισμένη θέση</strong><span>Δεν έχει εντοπιστεί προσωπική τεκμηρίωση για αυτή τη θεματική στο πιλοτικό αρχείο.</span></div>`}</td>`;
      }).join("");
      return `<tr><th scope="row">${topic}</th>${cells}</tr>`;
    }).join("");
    $("#comparisonMatrix").innerHTML = `<div class="comparison-scroll" tabindex="0" aria-label="Πίνακας σύγκρισης υποψηφίων"><table class="comparison-table"><thead><tr><th scope="col">Θεματική</th>${headerCells}</tr></thead><tbody>${rows}</tbody></table></div><p class="comparison-footnote">Οι στήλες ακολουθούν τη σειρά με την οποία επέλεξες τα πρόσωπα. Δεν αποτελούν κατάταξη.</p>`;
  }

  $("#matchDistrictGrid").addEventListener("click", (event) => { const button = event.target.closest("[data-match-district]"); if (button) selectMatchDistrict(button.dataset.matchDistrict); });
  $("#compareCandidatePicker").addEventListener("click", (event) => { const button = event.target.closest("[data-compare-candidate]"); if (button && !button.disabled) toggleComparedCandidate(button.dataset.compareCandidate); });
  $("#compareTopics").addEventListener("click", (event) => { const button = event.target.closest("[data-compare-topic]"); if (!button) return; compareState.topic = button.dataset.compareTopic; renderComparison(); });
  $("#changeMatchDistrict").addEventListener("click", () => $("#viewMatch .finder").scrollIntoView({ behavior: "smooth" }));
  $("#compareReset").addEventListener("click", () => { compareState.selectedCandidateIds = []; compareState.topic = "all"; renderCandidatePicker(); renderComparison(); });

  renderPartyList(); renderFeedFilters(); renderStatementFeed(); renderMatchDistricts(); showView(viewFromHash());
})();
