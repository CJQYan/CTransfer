function onLoad(executionContext) {
  var formContext = executionContext.getFormContext();
  formContext.data.process.addOnPreStageChange(onPreStageChange);
}
function onPreStageChange(executionContext) {
  var args = executionContext.getEventArgs();
  if ((args.getDirection?.().toLowerCase() || "") === "next") {
    args.preventDefault();
    Xrm.Navigation.openAlertDialog({ text: "Next Stage is disabled on this form." });
  }
}

