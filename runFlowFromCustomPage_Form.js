window.openCustomPage = function(primaryControl, pageName) {
  var formContext = primaryControl;
  var id = formContext.data.entity.getId().replace(/[{}]/g, "");

  var pageInput = {
    pageType: "custom",
    name: pageName,                 // logical Name of your custom page
    parameters: { recordId: id }    
  };

  var navOpts = { target: 2, position: 1, width: { value: 50, unit: "%" }, title: "Please wait..." };

  return Xrm.Navigation.navigateTo(pageInput, navOpts).then(function () {
    // after the dialog closes, refresh the form so BPF/fields update
    formContext.data.refresh(false);
  });
};

