// Expose globally (important for Commanding)
window.openCustomPage = function(primaryControl, pageName) {
  try {
    if (!pageName) throw new Error("Missing pageName parameter");

    // Resolve context (form or grid)
    var formContext = primaryControl;
    var id = null, entity = null;

    if (formContext && formContext.data && formContext.data.entity) {
      // Form
      id = formContext.data.entity.getId();
      entity = formContext.data.entity.getEntityName();
    } else if (formContext && formContext.getGrid) {
      // Grid (expect exactly one selected row)
      var sel = formContext.getGrid().getSelectedRows();
      if (sel.getLength() !== 1) {
        return Xrm.Navigation.openAlertDialog({ text: "Select exactly one row, then try again." });
      }
      var row = sel.get(0);
      id = row.getId();
      entity = row.getEntity().getEntityName ? row.getEntity().getEntityName() : row.getEntityName();
    } else {
      return Xrm.Navigation.openAlertDialog({ text: "Could not resolve form/grid context." });
    }

    id = id ? id.replace(/[{}]/g, "") : null;

    var pageInput = {
      pageType: "custom",
      name: pageName,                         // MUST be the page's logical Name
      parameters: { recordId: id, entityName: entity }
    };

    var navOpts = { target: 2, position: 1, width: { value: 50, unit: "%" }, title: "Please wait..." };

    Xrm.Navigation.navigateTo(pageInput, navOpts).then(
      function () {
        // After dialog closes: refresh
        if (formContext.data && formContext.data.refresh) formContext.data.refresh(false);
        else if (formContext.getGrid) formContext.getGrid().refresh();
      },
      function (error) {
        Xrm.Navigation.openErrorDialog({ message: "navigateTo failed: " + (error?.message || JSON.stringify(error)) });
      }
    );
  } catch (e) {
    Xrm.Navigation.openErrorDialog({ message: e.message || String(e) });
  }
};
