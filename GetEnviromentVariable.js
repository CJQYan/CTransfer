let _envVarBusy = false; // shared guard

function isEnvVarDialogEnabled() {
  // Ribbon enable rule: button enabled only when not busy
  return !_envVarBusy;
}

/**
 * @param {Xrm.Events.EventContext} executionContext
 * @param {string} schemaName
 */
async function showEnvVarDialog(executionContext, schemaName) {
  // guard against double-clicks
  if (_envVarBusy) {
    return Xrm.Navigation.openAlertDialog({ text: "Already running — please wait." });
  }
  _envVarBusy = true;
  try {
    Xrm.Utility.showProgressIndicator("Reading environment variable...");

    const formContext = executionContext?.getFormContext?.();

    const defQuery = "?$select=environmentvariabledefinitionid,schemaname,defaultvalue" +
                     "&$filter=schemaname eq '" + encodeURIComponent(schemaName) + "'";
    const defResult = await Xrm.WebApi.retrieveMultipleRecords("environmentvariabledefinition", defQuery);
    if (!defResult.entities?.length) {
      return Xrm.Navigation.openAlertDialog({ text: `Environment variable not found: ${schemaName}` });
    }
    const def = defResult.entities[0];
    const defId = def.environmentvariabledefinitionid;
    let resolved = def.defaultvalue || "";

    const valQuery = "?$select=value,environmentvariablevalueid&$filter=_environmentvariabledefinitionid_value eq " + defId + "&$top=1";
    const valResult = await Xrm.WebApi.retrieveMultipleRecords("environmentvariablevalue", valQuery);
    if (valResult.entities?.length && valResult.entities[0].value) {
      resolved = valResult.entities[0].value;
    }

    await Xrm.Navigation.openAlertDialog({ text: `Schema: ${schemaName}\nValue: ${resolved || "(empty)"}` });

  } catch (err) {
    const msg = err?.message ?? JSON.stringify(err);
    await Xrm.Navigation.openErrorDialog({ message: `Failed to read environment variable.\n${msg}` });
  } finally {
    Xrm.Utility.closeProgressIndicator();
    _envVarBusy = false;

    // Refresh ribbon
    try {
      const formContext = executionContext?.getFormContext?.();
      if (formContext?.ui?.refreshRibbon) formContext.ui.refreshRibbon(true);
      else if (Xrm?.Page?.ui?.refreshRibbon) Xrm.Page.ui.refreshRibbon();
    } catch(_) {}
  }
}

// Expose for ribbon
window.showEnvVarDialog = showEnvVarDialog;
window.isEnvVarDialogEnabled = isEnvVarDialogEnabled;


