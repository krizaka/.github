run "greets" {
  command = plan

  assert {
    condition     = output.greeting == "hello krizaka"
    error_message = "unexpected greeting"
  }
}
