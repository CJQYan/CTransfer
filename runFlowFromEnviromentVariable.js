// envVarFlow.js

let _busy = false; // double-click guard

// Enable-rule helper (optional: wire to a Ribbon enable rule)
function isFlowButtonEnabled() { return !_busy; }

/**
 * Command handler:
 *  - looks up env var by Schema Name
 *  - POSTs to the HTTP Request-triggered flow URL in the env var
 *  - waits for the flow's Response action and shows its message
 * @param {Xrm.Events.EventContext} executionContext
 * @param {string} schemaName  Environment Variable Definition "Schema Name" that holds the Flow URL
 */
async function runFlowFromEnvVar(executionContext, schemaName) {
  if (_busy) return; // hard guard
  _busy = true;
  Xrm.Utility.showProgressIndicator("Running flow...");

  try {
    const flowUrl = await resolveEnvVarUrl(schemaName);
    const body = buildPayload(executionContext);

    const res = await fetchWithTimeout(flowUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" }, // keep CORS-simple
      body: JSON.stringify(body)
    }, 90000); // 90s client timeout — adjust as needed

    // If your flow ends with a "Response" action, it returns here.
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Flow returned ${res.status} ${res.statusText}\n${txt}`);
    }

    // Try JSON first, then fallback to text
    let replyText;
    const raw = await res.text();
    try {
      const j = JSON.parse(raw);
      replyText = j.message ?? j.result ?? JSON.stringify(j);
    } catch {
      replyText = raw || "Flow completed.";
    }

    await Xrm.Navigation.openAlertDialog({ text: String(replyText).slice(0, 4000) });

  } catch (err) {
    const msg = err?.message ?? String(err);
    await Xrm.Navigation.openErrorDialog({ message: `Failed to run flow.\n${msg}` });
  } finally {
    Xrm.Utility.closeProgressIndicator();
    _busy = false;
    try {
      const formContext = executionContext?.getFormContext?.();
      formContext?.ui?.refreshRibbon?.(true);
    } catch {}
  }
}

// --- helpers ---

async function resolveEnvVarUrl(schemaName) {
  if (!schemaName) throw new Error("No schema name provided.");
  // Get Definition
  const defRes = await Xrm.WebApi.retrieveMultipleRecords(
    "environmentvariabledefinition",
    `?$select=environmentvariabledefinitionid,schemaname,defaultvalue&$filter=schemaname eq '${schemaName}'`
  );
  if (!defRes.entities?.length) throw new Error(`Environment variable not found: ${schemaName}`);
  const def = defRes.entities[0];

  // Get Value (if set)
  const valRes = await Xrm.WebApi.retrieveMultipleRecords(
    "environmentvariablevalue",
    `?$select=value&$filter=_environmentvariabledefinitionid_value eq ${def.environmentvariabledefinitionid}&$top=1`
  );
  const resolved = valRes.entities?.[0]?.value ?? def.defaultvalue ?? "";
  if (!resolved) throw new Error(`Environment variable '${schemaName}' has no value/default.`);
  return resolved; // should be your Flow's HTTP URL
}

function buildPayload(executionContext) {
  const gc = Xrm.Utility.getGlobalContext();
  const userId = gc.userSettings.userId.replace(/[{}]/g, "");
  const orgUrl = gc.getClientUrl();

  // If run from a form, include record context
  const formContext = executionContext?.getFormContext?.();
  const entityName = formContext?.data?.entity?.getEntityName?.();
  const recordId = (formContext?.data?.entity?.getId?.() || "").replace(/[{}]/g, "");

  return {
    userId,                        // AAD object in Dataverse format (GUID)
    orgUrl,                        // e.g., https://org.crm.dynamics.com
    entityName: entityName || null,
    recordId: recordId || null,
    // Add anything else you want your flow to receive:
    timestamp: new Date().toISOString()
  };
}

function fetchWithTimeout(url, options, timeoutMs) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout after ${timeoutMs} ms`)), timeoutMs);
    fetch(url, options).then(
      res => { clearTimeout(t); resolve(res); },
      err => { clearTimeout(t); reject(err); }
    );
  });
}

// Expose for ribbon
window.runFlowFromEnvVar = runFlowFromEnvVar;
window.isFlowButtonEnabled = isFlowButtonEnabled;
